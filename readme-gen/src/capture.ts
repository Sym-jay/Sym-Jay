// In-page half of the renderer: turns #capture (shadcn cards + Bklit charts) into a
// standalone, animated SVG string that GitHub can show through <img>.
import { elementToSVG } from "dom-to-svg";

declare global {
  interface Window {
    __capture: (view: string) => string;
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Browsers inside <img> handle rgb() everywhere; oklch()/color-mix() are newer, so flatten them.
const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", {
  willReadFrequently: true,
})!;
function toRgb(color: string) {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${+(a / 255).toFixed(3)})`;
}
function flattenColors(value: string) {
  let out = "";
  let i = 0;
  const re = /(oklch|oklab|lch|lab|color-mix|color)\(/g;
  for (let m = re.exec(value); m; m = re.exec(value)) {
    let depth = 0;
    let j = m.index + m[1].length;
    for (; j < value.length; j++) {
      if (value[j] === "(") depth++;
      else if (value[j] === ")" && --depth === 0) break;
    }
    out += value.slice(i, m.index) + toRgb(value.slice(m.index, j + 1));
    i = j + 1;
    re.lastIndex = i;
  }
  return out + value.slice(i);
}

// Entrance animations, added after capture. Each mark gets a class and a delay; everything
// runs once and only when the viewer hasn't asked for reduced motion.
const STYLE = `
@media (prefers-reduced-motion: no-preference) {
  .a-card { animation: a-rise .7s cubic-bezier(.2,.7,.2,1) both; }
  .a-fade { animation: a-fade .6s ease-out both; }
  .a-rise { animation: a-rise .6s cubic-bezier(.2,.7,.2,1) both; }
  .a-pop { animation: a-pop .5s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: center; }
  .a-grow { animation: a-grow .8s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: center; }
  .a-draw { stroke-dasharray: 1; animation: a-draw 1.6s cubic-bezier(.65,0,.35,1) both; }
}
@keyframes a-fade { from { opacity: 0 } }
@keyframes a-rise { from { opacity: 0; transform: translateY(6px) } }
@keyframes a-pop { from { opacity: 0; transform: scale(.4) } }
@keyframes a-grow { from { opacity: 0; transform: scaleY(0) } }
@keyframes a-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
`;

function animate(el: Element, cls: string, delayMs: number) {
  el.classList.add(cls);
  if (delayMs) (el as SVGElement).style.animationDelay = `${Math.round(delayMs)}ms`;
}

function addAnimations(svg: SVGSVGElement, view: string) {
  const width = svg.viewBox.baseVal.width;
  const card = svg.querySelector(".a-card-root");
  if (card) animate(card, "a-card", 0);

  // Text inside cards rises in line by line.
  [...svg.querySelectorAll(".a-text")].forEach((el, i) => animate(el, "a-rise", 120 + i * 70));

  const chart = svg.querySelector("svg svg, [data-chart] svg") ?? svg;
  if (view === "heatmap") {
    for (const rect of chart.querySelectorAll("rect")) {
      const w = +(rect.getAttribute("width") ?? 0);
      if (w > 4 && w < 24 && rect.getAttribute("width") === rect.getAttribute("height")) {
        const x = +(rect.getAttribute("x") ?? 0) + +(rect.getAttribute("y") ?? 0) * 0.6;
        animate(rect, "a-pop", 250 + (x / width) * 1100);
      }
    }
  }
  if (view === "activity") {
    for (const path of svg.querySelectorAll("path")) {
      const stroked = path.getAttribute("fill") === "none" && path.getAttribute("stroke");
      if (stroked && !path.getAttribute("stroke-dasharray")) {
        path.setAttribute("pathLength", "1");
        animate(path, "a-draw", 300);
      } else if (!stroked) {
        animate(path, "a-fade", 1100);
      }
    }
  }
  if (view === "languages") {
    [...svg.querySelectorAll("path")].forEach((p, i) => animate(p, "a-fade", 250 + i * 90));
  }
  if (view === "prs-sankey") {
    [...svg.querySelectorAll("path")].forEach((p, i) => animate(p, "a-fade", 500 + i * 60));
    [...svg.querySelectorAll("rect")].forEach((r) => {
      if (+(r.getAttribute("width") ?? 0) <= 10) animate(r, "a-grow", 200);
    });
  }

  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = STYLE;
  svg.prepend(style);
}

// dom-to-svg positions text with dominant-baseline="text-after-edge", which Firefox ignores.
// Re-anchor each line on the alphabetic baseline at the same visual position.
function fixBaselines(svg: SVGSVGElement) {
  for (const text of svg.querySelectorAll<SVGTextElement>('text[dominant-baseline="text-after-edge"]')) {
    const before = text.getBBox().y;
    text.setAttribute("dominant-baseline", "alphabetic");
    const shift = before - text.getBBox().y;
    for (const node of [text, ...text.querySelectorAll("tspan")]) {
      const y = node.getAttribute("y");
      if (y) node.setAttribute("y", String(+(+y + shift).toFixed(2)));
    }
  }
}

function clean(svg: SVGSVGElement) {
  // Hover overlays and similar layers are captured at opacity 0; they only add weight.
  for (const el of [...svg.querySelectorAll("*")]) {
    const s = (el as SVGElement).style;
    const animated = [...el.children].some((c) => c.tagName === "animate" || c.tagName === "set");
    if (!animated && (el.getAttribute("opacity") === "0" || s.opacity === "0")) el.remove();
    else {
      if (s.opacity === "1") s.removeProperty("opacity");
      if (s.transform === "none") {
        s.removeProperty("transform");
        s.removeProperty("transform-origin");
        s.removeProperty("transform-box");
      }
      if (!el.getAttribute("style")) el.removeAttribute("style");
      el.removeAttribute("pointer-events");
    }
  }
  for (const node of [...svg.childNodes]) if (node.nodeType === Node.COMMENT_NODE) node.remove();
  const ids = new Map<string, string>();
  let n = 0;
  for (const el of svg.querySelectorAll("[id]")) {
    const id = el.getAttribute("id")!;
    ids.set(id, `i${n++}`);
    el.setAttribute("id", ids.get(id)!);
  }
  const all = [svg, ...svg.querySelectorAll("*")];
  for (const el of all) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("data-") || attr.name === "aria-owns") {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.name === "class") {
        const keep = [...el.classList].filter((c) => c.startsWith("a-") && c !== "a-text" && c !== "a-card-root");
        if (keep.length) el.setAttribute("class", keep.join(" "));
        else el.removeAttribute("class");
        continue;
      }
      let v = attr.value;
      // Trim coordinate precision in attributes only; never touch text content.
      v = v.replace(/(\d+\.\d{2})\d+/g, "$1");
      v = v.replace(/url\(\s*["']?#([^)"']+)["']?\s*\)/g, (m, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m));
      if (/(oklch|oklab|lch|lab|color-mix|color)\(/.test(v)) v = flattenColors(v);
      if (v !== attr.value) el.setAttribute(attr.name, v);
    }
    if (el.getAttribute("href")?.startsWith("#")) {
      const id = el.getAttribute("href")!.slice(1);
      if (ids.has(id)) el.setAttribute("href", `#${ids.get(id)}`);
    }
  }
  // Drop empty groups left behind by stacking layers.
  let removed = true;
  while (removed) {
    removed = false;
    for (const g of svg.querySelectorAll("g, style")) {
      if (!g.childNodes.length && !(g.tagName === "style" && g.textContent)) {
        g.remove();
        removed = true;
      }
    }
  }
}

window.__capture = (view: string) => {
  const el = document.querySelector("#capture")!;
  // shadcn cards draw their edge with a box-shadow ring, which dom-to-svg skips; use a real border.
  for (const card of el.querySelectorAll<HTMLElement>("[data-slot=card]")) {
    card.classList.add("a-card-root");
    card.style.boxShadow = "none";
    card.style.border = "1px solid var(--border)";
  }
  for (const t of el.querySelectorAll("[data-slot=card-title], [data-slot=card-description], [data-slot=card-content] > *, h1, p, .uppercase")) {
    t.classList.add("a-text");
  }
  // dom-to-svg flattens nested <svg>s (losing their viewBox) and freezes SMIL mid-frame,
  // so Sora is hidden during conversion and spliced back in as the original sprite.
  const sora = el.querySelector<SVGSVGElement>("[data-sora]");
  const origin = el.getBoundingClientRect();
  const soraBox = sora?.getBoundingClientRect();
  if (sora) sora.style.visibility = "hidden";
  const doc = elementToSVG(el);
  if (sora) sora.style.visibility = "";
  const svg = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
  // Attach off-screen so getBBox works while fixing baselines.
  svg.style.position = "absolute";
  svg.style.left = "-10000px";
  document.body.append(svg);
  fixBaselines(svg);
  svg.removeAttribute("style");
  addAnimations(svg, view);
  clean(svg);
  if (sora && soraBox) {
    const sprite = document.createElementNS(SVG_NS, "svg");
    sprite.setAttribute("x", String(Math.round(soraBox.left - origin.left)));
    sprite.setAttribute("y", String(Math.round(soraBox.top - origin.top)));
    sprite.setAttribute("width", String(Math.round(soraBox.width)));
    sprite.setAttribute("height", String(Math.round(soraBox.height)));
    sprite.setAttribute("viewBox", sora.getAttribute("viewBox")!);
    sprite.setAttribute("shape-rendering", "crispEdges");
    sprite.innerHTML = sora.innerHTML;
    animate(sprite, "a-fade", 600);
    svg.append(sprite);
  }
  const { width, height } = svg.viewBox.baseVal;
  // Round up and leave a pixel so the card border is never clipped.
  const w = Math.ceil(width) + 1;
  const h = Math.ceil(height) + 1;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `-0.5 -0.5 ${w} ${h}`);
  svg.setAttribute("role", "img");
  svg.remove();
  return new XMLSerializer().serializeToString(svg);
};
