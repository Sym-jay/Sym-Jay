# readme-gen

Builds the terminal card in the profile README: an ASCII version of the GitHub avatar next to
neofetch-style lines, with Sora (Blot's slime) walking along the bottom.

```bash
npm ci
npm run build:readme   # fetch GitHub stats, then write ../assets/terminal-{dark,light}.svg
```

- `scripts/fetch-data.ts` pulls repos, stars, followers, contributions, merged PRs, releases and
  language share from the GitHub GraphQL API into `data.json`. It uses `GITHUB_TOKEN`, or `gh auth token` locally.
- `scripts/card.ts` turns the avatar into ASCII with `sharp` and writes both card themes. The static
  lines (OS, role, projects, contact) live at the top of that file.
- `npm run sora` refreshes `sora-walk.json` from the Blot repo.

`.github/workflows/readme.yml` runs `build:readme` every day and commits the card when it changes.
