// Downloads Sora's walk sprite from the Blot repo and merges its 1x1 rects into
// one path per colour per frame, keeping the SMIL frame animation intact.
import { writeFileSync } from "node:fs";
import path from "node:path";

const url = "https://raw.githubusercontent.com/Sym-jay/Blot/main/assets/sora/orange/walk.svg";
const svg = await (await fetch(url)).text();

// Replace every run of consecutive <rect>s with merged <path>s grouped by fill.
const compacted = svg.replace(/(?:<rect [^>]*\/>)+/g, (run) => {
  const byFill = new Map<string, Map<number, number[]>>();
  for (const m of run.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="(#[0-9A-Fa-f]+)"\/>/g)) {
    const [, x, y, fill] = m;
    const rows = byFill.get(fill) ?? new Map<number, number[]>();
    rows.set(+y, [...(rows.get(+y) ?? []), +x]);
    byFill.set(fill, rows);
  }
  let out = "";
  for (const [fill, rows] of byFill) {
    let d = "";
    for (const [y, xs] of rows) {
      xs.sort((a, b) => a - b);
      let start = xs[0];
      let prev = xs[0];
      for (const x of [...xs.slice(1), Infinity]) {
        if (x === prev + 1) { prev = x; continue; }
        d += `M${start} ${y}h${prev - start + 1}v1h-${prev - start + 1}z`;
        start = prev = x;
      }
    }
    out += `<path fill="${fill}" d="${d}"/>`;
  }
  return out;
});

const inner = compacted.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const viewBox = svg.match(/viewBox="([^"]+)"/)![1];
const out = path.resolve(import.meta.dirname, "../sora-walk.json");
writeFileSync(out, JSON.stringify({ viewBox, inner }) + "\n");
console.log(`sora: ${svg.length} -> ${inner.length} bytes`);
