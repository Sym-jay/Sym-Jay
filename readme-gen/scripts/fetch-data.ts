// Pulls profile stats from the GitHub GraphQL API and writes src/data.json.
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

type Day = { date: string; contributionCount: number };

const calendar = await gql<{
  user: {
    contributionsCollection: {
      contributionCalendar: { totalContributions: number; weeks: { contributionDays: Day[] }[] };
    };
  };
}>(
  `query($login: String!) { user(login: $login) { contributionsCollection {
     contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
  } } }`,
  { login: LOGIN },
);
const cal = calendar.user.contributionsCollection.contributionCalendar;

// Merged PRs authored by the user, paged through search.
type PR = { mergedAt: string; repository: { nameWithOwner: string; owner: { login: string } } };
const prs: PR[] = [];
let after: string | null = null;
do {
  const page: {
    search: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: PR[] };
  } = await gql(
    `query($q: String!, $after: String) { search(query: $q, type: ISSUE, first: 100, after: $after) {
       pageInfo { hasNextPage endCursor }
       nodes { ... on PullRequest { mergedAt repository { nameWithOwner owner { login } } } }
     } }`,
    { q: `author:${LOGIN} is:pr is:merged`, after },
  );
  prs.push(...page.search.nodes);
  after = page.search.pageInfo.hasNextPage ? page.search.pageInfo.endCursor : null;
} while (after);

// Language bytes across the user's own, non-fork public repos.
const repos = await gql<{
  user: {
    repositories: {
      nodes: {
        name: string;
        releases: { totalCount: number };
        languages: { edges: { size: number; node: { name: string; color: string | null } }[] };
      }[];
    };
  };
}>(
  `query($login: String!) { user(login: $login) {
     repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
       nodes { name releases { totalCount } languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
         edges { size node { name color } } } }
     } } }`,
  { login: LOGIN },
);
const langBytes = new Map<string, number>();
let releases = 0;
let releasedRepos = 0;
for (const repo of repos.user.repositories.nodes) {
  if (repo.name.toLowerCase() === LOGIN.toLowerCase()) continue;
  releases += repo.releases.totalCount;
  if (repo.releases.totalCount > 0) releasedRepos += 1;
  for (const e of repo.languages.edges) {
    langBytes.set(e.node.name, (langBytes.get(e.node.name) ?? 0) + e.size);
  }
}
const totalBytes = [...langBytes.values()].reduce((a, b) => a + b, 0);
const languages = [...langBytes]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([name, bytes]) => ({ name, share: Math.round((bytes / totalBytes) * 1000) / 10 }));

// Monthly contributions and merged PRs for the last 12 months.
const days = cal.weeks.flatMap((w) => w.contributionDays);
const months: { month: string; contributions: number; prs: number }[] = [];
const now = new Date();
for (let i = 11; i >= 0; i--) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
  months.push({ month: d.toISOString().slice(0, 7), contributions: 0, prs: 0 });
}
const byMonth = new Map(months.map((m) => [m.month, m]));
for (const day of days) {
  const m = byMonth.get(day.date.slice(0, 7));
  if (m) m.contributions += day.contributionCount;
}
for (const pr of prs) {
  const m = byMonth.get(pr.mergedAt.slice(0, 7));
  if (m) m.prs += 1;
}

// Where merged PRs landed: own repos vs other people's.
const prTargets = new Map<string, number>();
for (const pr of prs) {
  const key = pr.repository.nameWithOwner;
  prTargets.set(key, (prTargets.get(key) ?? 0) + 1);
}
const upstream = prs.filter((p) => p.repository.owner.login.toLowerCase() !== LOGIN.toLowerCase());

const data = {
  totalContributions: cal.totalContributions,
  weeks: cal.weeks.map((w) => w.contributionDays),
  months,
  languages,
  releases,
  releasedRepos,
  prs: {
    merged: prs.length,
    upstream: upstream.length,
    byRepo: [...prTargets].sort((a, b) => b[1] - a[1]).map(([repo, count]) => ({ repo, count })),
  },
};

const out = path.resolve(import.meta.dirname, "../src/data.json");
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(
  `wrote ${out}: ${data.totalContributions} contributions, ${prs.length} merged PRs (${upstream.length} upstream), ${languages.length} languages`,
);
