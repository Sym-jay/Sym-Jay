// Writes the neofetch-style profile card: ASCII avatar on the left, key/value lines on the
// right, Sora walking along the bottom. Output: ../assets/terminal-{dark,light}.svg.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const data = JSON.parse(readFileSync(path.join(root, "data.json"), "utf8"));
const sora = JSON.parse(readFileSync(path.join(root, "sora-walk.json"), "utf8"));

// Layout, in a 16px monospace grid (9.6px per character, 20px per line).
const CHAR = 9.6;
const LINE = 20;
const PAD = 20;
const ASCII_COLS = 44;
const TEXT_X = PAD + ASCII_COLS * CHAR + 26;
const TEXT_COLS = 58;
const VALUE_COL = 22; // values start at this column within a line
// The portrait uses a finer 9px grid in the same block, so the face has room for detail.
const ASCII_CHAR = 5.4;
const ASCII_LINE = 10.8;
const ASCII_FINE_COLS = Math.floor((ASCII_COLS * CHAR) / ASCII_CHAR);
// Sora walks a strip along the bottom of the card.
const STRIP = 50;
const SORA_SCALE = 2; // sprite units -> px
const SORA_BODY = 28; // sprite units
const SORA_SPEED = 32; // sprite units per second (the original sprite walks at 23)

// ---- right-hand text ------------------------------------------------------------------

type Part = { text: string; cls?: string };
type Line = Part[];

const dots = (n: number): Part => ({ text: ` ${".".repeat(Math.max(1, n))} `, cls: "cc" });

function kv(key: string, value: string): Line {
  const used = 2 + key.length + 1; // ". " + key + ":"
  return [{ text: ". ", cls: "cc" }, { text: key, cls: "key" }, { text: ":" }, dots(VALUE_COL - used - 2), { text: value, cls: "value" }];
}

function pair(k1: string, v1: string, k2: string, v2: string): Line {
  const left = kv(k1, v1);
  const leftLen = left.reduce((a, p) => a + p.text.length, 0);
  const used = 3 + k2.length + 1; // "| " + key + ":"
  const room = TEXT_COLS - Math.max(leftLen, 34) - used - v2.length - 3;
  return [
    ...left,
    { text: " ".repeat(Math.max(1, 34 - leftLen)) },
    { text: "| ", cls: "cc" },
    { text: k2, cls: "key" },
    { text: ":" },
    dots(room),
    { text: v2, cls: "value" },
  ];
}

function header(title: string, top = false): Line {
  const text = top ? title : `- ${title} `;
  return [{ text, cls: top ? "title" : undefined }, { text: ` ${"—".repeat(TEXT_COLS - text.length - 1)}`, cls: "cc" }];
}

const blank: Line = [{ text: ".", cls: "cc" }];

function uptime(since: string) {
  const start = new Date(since);
  const now = new Date();
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  let months = now.getUTCMonth() - start.getUTCMonth();
  let days = now.getUTCDate() - start.getUTCDate();
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const s = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return `${s(years, "year")}, ${s(months, "month")}, ${s(days, "day")}`;
}

const lines: Line[] = [
  header("shyam@sym-jay", true),
  kv("OS", "Arch Linux"),
  kv("Uptime", uptime(data.createdAt)),
  kv("Host", "localhost"),
  kv("Role", "AI & ML engineering student"),
  kv("Location", "India"),
  blank,
  kv("Languages.Code", data.languages.map((l: { name: string; share: number }) => `${l.name} ${l.share}%`).join(", ")),
  kv("Languages.Stack", "Python, TypeScript, Go, Dart, Rust"),
  kv("Frameworks", "PyTorch, FastAPI, Flutter, React"),
  kv("Tools", "Git, Docker, Linux, Ollama"),
  blank,
  header("Projects"),
  kv("Clishe", "plain English to real shell commands"),
  kv("Blot", "warns before you undo a bug fix"),
  kv("Polyphage", "Pareto-optimal PET-eating enzymes"),
  kv("WildID", "marine species ID, 98.47% accurate"),
  blank,
  header("Contact"),
  kv("Email", "shyam.kjay.10a@gmail.com"),
  kv("LinkedIn", "in/shyam-jayasankar-5bb90b292"),
  blank,
  header("GitHub Stats"),
  pair("Repos", `${data.repos} {Contributed: ${data.contributedTo}}`, "Stars", String(data.stars)),
  pair("Contributions", `${data.contributions} this year`, "Followers", String(data.followers)),
  pair("PRs merged", `${data.prsMerged} {Upstream: ${data.prsUpstream}}`, "Releases", String(data.releases)),
];

// Bottom text row: a prompt with a blinking cursor. Sora gets the strip below it.
const ROWS = lines.length + 2;
const HEIGHT = PAD + ROWS * LINE + STRIP + 8;
const WIDTH = Math.ceil(TEXT_X + TEXT_COLS * CHAR + PAD);

// ---- ASCII avatar ---------------------------------------------------------------------

async function asciiAvatar(rows: number) {
  const res = await fetch("https://github.com/Sym-jay.png?size=460");
  const img = Buffer.from(await res.arrayBuffer());
  // Crop the square avatar to the text block's aspect so characters keep proportions.
  const meta = await sharp(img).metadata();
  const aspect = (ASCII_FINE_COLS * ASCII_CHAR) / (rows * ASCII_LINE);
  const cropW = Math.min(meta.width!, Math.round(meta.height! * aspect));
  const left = Math.round((meta.width! - cropW) / 2);
  const cropped = await sharp(img).extract({ left, top: 0, width: cropW, height: meta.height! }).grayscale().png().toBuffer();
  const { data: px } = await sharp(cropped)
    .grayscale()
    .resize(ASCII_FINE_COLS, rows, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // The pale sky stays empty. The figure is dark throughout (hair ~5-15%, face ~20-35%), so its
  // own tonal range is stretched over the ramp; otherwise face and hair both max out the ink.
  const SKY = 0.62;
  const figure = [...px].map((v) => v / 255).filter((v) => v < SKY).sort((a, b) => a - b);
  const lo = figure[Math.floor(figure.length * 0.05)];
  const hi = figure[Math.floor(figure.length * 0.97)];
  const ramp = " .:-=+*#%@"; // few, clearly different densities read better than many similar glyphs
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < ASCII_FINE_COLS; x++) {
      const v = px[y * ASCII_FINE_COLS + x] / 255;
      if (v >= SKY) {
        row += " ";
        continue;
      }
      const ink = 1 - Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
      row += ramp[Math.max(1, Math.round(ink * (ramp.length - 1)))];
    }
    out.push(row.trimEnd());
  }
  return out;
}

// ---- SVG ------------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const themes = {
  dark: { bg: "#161b22", border: "#30363d", text: "#c9d1d9", key: "#ffa657", value: "#a5d6ff", cc: "#616e7f", ascii: "#8b949e" },
  light: { bg: "#f6f8fa", border: "#d0d7de", text: "#24292f", key: "#953800", value: "#0a3069", cc: "#c2cfde", ascii: "#57606a" },
};

function svg(theme: keyof typeof themes, ascii: string[]) {
  const t = themes[theme];
  const y = (i: number) => PAD + 10 + i * LINE;
  const asciiRows = ascii
    .map((row, i) => `<tspan x="${PAD}" y="${(PAD + 9 + i * ASCII_LINE).toFixed(1)}">${esc(row)}</tspan>`)
    .join("\n");
  const textRows = lines
    .map((line, i) => {
      const parts = line.map((p) => (p.cls ? `<tspan class="${p.cls}">${esc(p.text)}</tspan>` : esc(p.text))).join("");
      return `<text x="${TEXT_X}" y="${y(i)}" class="l" style="animation-delay:${200 + i * 45}ms">${parts}</text>`;
    })
    .join("\n");
  const promptY = y(lines.length + 1);
  const prompt = "shyam@sym-jay:~$";
  const cursorX = TEXT_X + (prompt.length + 1) * CHAR;
  // Stretch Sora's walk from its 120-unit stage to the full strip, keeping its pace.
  const walkW = WIDTH - 2 * PAD;
  const stage = walkW / SORA_SCALE;
  const travel = stage - SORA_BODY;
  const dur = ((2 * travel) / SORA_SPEED).toFixed(1);
  const soraInner = sora.inner
    .replace('values="0 0;92 0;0 0"', `values="0 0;${travel.toFixed(1)} 0;0 0"`)
    .replaceAll('dur="8.0s"', `dur="${dur}s"`);
  const groundY = promptY + STRIP - 6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xml:space="preserve" font-family="ConsolasFallback, Consolas, 'SF Mono', Menlo, 'DejaVu Sans Mono', monospace" font-size="16" role="img">
<title>Shyam Jayasankar, AI and ML engineering student. Projects: Clishe, Blot, Polyphage, WildID.</title>
<style>
@font-face { font-family: 'ConsolasFallback'; src: local('Consolas'); size-adjust: 109%; }
text, tspan { white-space: pre; fill: ${t.text}; }
.ascii, .ascii tspan { fill: ${t.ascii}; }
.title { fill: ${t.key}; font-weight: bold; }
.key { fill: ${t.key}; }
.value { fill: ${t.value}; }
.cc { fill: ${t.cc}; }
.cursor { fill: ${t.text}; }
@media (prefers-reduced-motion: no-preference) {
  .ascii { animation: fade 1.6s ease-out both; }
  .l { animation: type .35s steps(6, end) both; }
  .cursor { animation: blink 1.1s steps(1, end) 2.2s infinite both; }
  .sora { animation: fade .8s ease-out 1.8s both; }
}
@keyframes fade { from { opacity: 0 } }
@keyframes type { from { opacity: 0; transform: translateX(-6px) } }
@keyframes blink { 50% { opacity: 0 } }
</style>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="14" fill="${t.bg}" stroke="${t.border}"/>
<text class="ascii" font-size="9">
${asciiRows}
</text>
${textRows}
<text x="${TEXT_X}" y="${promptY}"><tspan class="key">${prompt}</tspan></text>
<rect class="cursor" x="${cursorX}" y="${promptY - 14}" width="9" height="18"/>
<line x1="${PAD}" y1="${groundY}" x2="${WIDTH - PAD}" y2="${groundY}" stroke="${t.cc}" stroke-dasharray="2 6" opacity=".6"/>
<svg class="sora" x="${PAD}" y="${groundY - 20 * SORA_SCALE + 6}" width="${walkW}" height="${20 * SORA_SCALE}" viewBox="0 0 ${stage} 20" shape-rendering="crispEdges">${soraInner}</svg>
</svg>
`;
}

const ascii = await asciiAvatar(Math.floor((ROWS * LINE) / ASCII_LINE));
mkdirSync(path.join(root, "../assets"), { recursive: true });
for (const theme of ["dark", "light"] as const) {
  const file = path.join(root, `../assets/terminal-${theme}.svg`);
  const out = svg(theme, ascii);
  writeFileSync(file, out);
  console.log(`${path.relative(process.cwd(), file)}  ${(out.length / 1024).toFixed(1)} KB  ${WIDTH}x${HEIGHT}`);
}
