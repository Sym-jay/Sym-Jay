// Renders every view in src/views.tsx, light and dark, to ../assets/<view>-<theme>.svg.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { optimize } from "svgo";
import { createServer } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.resolve(root, "../assets");
const VIEWS = ["hero", "project-clishe", "project-blot", "project-polyphage", "project-wildid", "heatmap", "activity", "languages", "stats", "prs-sankey"];
const only = process.argv.slice(2);

const server = await createServer({ root, server: { port: 5180, strictPort: true }, logLevel: "warn" });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 });
mkdirSync(outDir, { recursive: true });

let failed = false;
for (const view of VIEWS.filter((v) => !only.length || only.includes(v))) {
  for (const theme of ["light", "dark"]) {
    await page.goto(`http://localhost:5180/?view=${view}&theme=${theme}`, { waitUntil: "networkidle" });
    // Let Bklit's own enter animations settle so we capture the final frame.
    await page.waitForTimeout(3000);
    const raw = await page.evaluate((v) => window.__capture(v), view);
    const svg = optimize(raw, {
      multipass: true,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              // Keep the <style> block (animations, reduced-motion query) as written.
              inlineStyles: false,
              minifyStyles: false,
              // Keep per-element animation-delay styles and classes.
              cleanupIds: false,
              // Sora's walk frames start at opacity 0 and are switched on by SMIL <animate>.
              removeHiddenElems: false,
            },
          },
        },
      ],
    }).data;
    const file = path.join(outDir, `${view}-${theme}.svg`);
    writeFileSync(file, svg + "\n");
    const kb = svg.length / 1024;
    if (kb > 100) failed = true;
    console.log(`${kb > 100 ? "TOO BIG" : "ok"}  ${path.relative(process.cwd(), file)}  ${kb.toFixed(1)} KB`);
  }
}

await browser.close();
await server.close();
if (failed) process.exit(1);
