// Screenshots preview.html (the rendered SVGs on GitHub's light and dark backgrounds)
// after the entrance animations finish. Output: preview-light.png / preview-dark.png.
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const server = await createServer({ root, server: { port: 5181, strictPort: true }, logLevel: "warn" });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 888, height: 7000 }, deviceScaleFactor: 1.5 });
await page.goto("http://localhost:5181/preview.html", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
for (const theme of ["light", "dark"]) {
  await page.locator(`.theme.${theme}`).screenshot({ path: path.join(root, `preview-${theme}.png`) });
}
await browser.close();
await server.close();
