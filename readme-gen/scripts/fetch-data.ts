// Pulls profile stats from the GitHub GraphQL API and writes data.json.
// Token: GITHUB_TOKEN env var, or `gh auth token` locally.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const LOGIN = "Sym-jay";
const token =
  process.env.GITHUB_TOKEN ?? execSync("gh auth token").toString().trim();

async function gql<T>(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data: T; errors?: unknown };
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

type Repo = {
  name: string;
  isFork: boolean;
  stargazerCount: number;
  releases: { totalCount: number };
  languages: { edges: { size: number; node: { name: string } }[] };
};

const { user } = await gql<{
  user: {
    createdAt: string;
    followers: { totalCount: number };
    repositoriesContributedTo: { totalCount: number };
    contributionsCollection: { contributionCalendar: { totalContributions: number } };
    repositories: { totalCount: number; nodes: Repo[] };
  };
}>(
  `query($login: String!) { user(login: $login) {
     createdAt
     followers { totalCount }
     repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST], includeUserRepositories: false) { totalCount }
     contributionsCollection { contributionCalendar { totalContributions } }
     repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC) {
       totalCount
       nodes { name isFork stargazerCount releases { totalCount }
         languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
     }
  } }`,
  { login: LOGIN },
);

// Merged PRs authored by the user, paged through search.
type PR = { repository: { owner: { login: string } } };
const prs: PR[] = [];
let after: string | null = null;
do {
  const page: {
    search: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: PR[] };
  } = await gql(
    `query($q: String!, $after: String) { search(query: $q, type: ISSUE, first: 100, after: $after) {
       pageInfo { hasNextPage endCursor }
       nodes { ... on PullRequest { repository { owner { login } } } }
     } }`,
    { q: `author:${LOGIN} is:pr is:merged`, after },
  );
  prs.push(...page.search.nodes);
  after = page.search.pageInfo.hasNextPage ? page.search.pageInfo.endCursor : null;
} while (after);

// Language share across the user's own, non-fork repos (the profile repo itself excluded).
const own = user.repositories.nodes.filter((r) => !r.isFork && r.name.toLowerCase() !== LOGIN.toLowerCase());
const bytes = new Map<string, number>();
for (const repo of own) {
  for (const e of repo.languages.edges) bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
}
const total = [...bytes.values()].reduce((a, b) => a + b, 0);
const languages = [...bytes]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([name, size]) => ({ name, share: Math.round((size / total) * 100) }));

const data = {
  createdAt: user.createdAt,
  repos: user.repositories.totalCount,
  contributedTo: user.repositoriesContributedTo.totalCount,
  stars: user.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0),
  releases: own.reduce((a, r) => a + r.releases.totalCount, 0),
  followers: user.followers.totalCount,
  contributions: user.contributionsCollection.contributionCalendar.totalContributions,
  prsMerged: prs.length,
  prsUpstream: prs.filter((p) => p.repository.owner.login.toLowerCase() !== LOGIN.toLowerCase()).length,
  languages,
};

const out = path.resolve(import.meta.dirname, "../data.json");
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(data);
