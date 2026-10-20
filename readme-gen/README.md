# readme-gen

Builds the images in the profile README. Each one is a real [shadcn/ui](https://ui.shadcn.com) card or
[Bklit UI](https://bklit.com) chart, rendered in Chromium and converted to a standalone, animated SVG
with light and dark versions.

```bash
npm ci
npx playwright install chromium
npm run build:readme   # fetch GitHub data, then render ../assets/*.svg
```

- `scripts/fetch-data.ts` pulls contributions, merged PRs, languages and releases from the GitHub GraphQL
  API into `src/data.json`. It uses `GITHUB_TOKEN`, or `gh auth token` locally.
- `src/views.tsx` holds one view per image. Open `npm run dev` to see them all, or `?view=<name>&theme=dark` for one.
- `scripts/render.ts` captures each view with `dom-to-svg` (see `src/capture.ts`), adds entrance animations
  that respect `prefers-reduced-motion`, and shrinks the result with SVGO. It fails if any file tops 100 KB.
- `npm run preview:snap` screenshots `preview.html`, which shows every SVG on GitHub's light and dark backgrounds.
- `npm run sora` refreshes `src/vendor/sora-walk.json` from the Blot repo.

`.github/workflows/readme.yml` runs `build:readme` every day and commits the assets when they change.
