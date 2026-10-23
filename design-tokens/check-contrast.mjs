#!/usr/bin/env node
// Contrast check for the website tokens: every text colour on the main backgrounds.
//
//   node design-tokens/check-contrast.mjs          (after build.mjs)
//
// Prints the WCAG 2.x contrast ratio for each pair. Translucent text colours are composited
// over the background first. AA needs 4.5:1 for body text and 3:1 for large text (24px+, or
// 18.66px+ bold) and for icons and other non-text UI.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(root, "dist", "tokens.json"), "utf8"));

function resolve(group, key, seen = new Set()) {
  const token = tokens[group]?.[key];
  if (!token) throw new Error(`Unknown token ${group}.${key}`);
  if (typeof token.$value === "string") {
    const m = token.$value.match(/^\{(\w+)\.(.+)\}$/);
    if (seen.has(token.$value)) throw new Error(`Circular reference at ${group}.${key}`);
    seen.add(token.$value);
    return resolve(m[1], m[2], seen);
  }
  return token.$value;
}

// Fail loudly on any broken reference anywhere in the file.
for (const [group, entries] of Object.entries(tokens)) {
  if (group.startsWith("$")) continue;
  for (const [key, token] of Object.entries(entries)) {
    if (token.$type === "typography") {
      for (const v of Object.values(token.$value)) if (typeof v === "string") resolve(...v.slice(1, -1).split(/\.(.+)/).slice(0, 2));
    } else resolve(group, key);
  }
}

const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const over = (fg, bg) => fg.components.map((c, i) => c * fg.alpha + bg.components[i] * (1 - fg.alpha));
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const backgrounds = ["surface-default", "surface-secondary-default", "background-brand-bold-default", "background-neutral-boldest-default"];
const texts = Object.keys(tokens.color).filter((k) => k.startsWith("text-") || k === "link-default");

const results = [];
for (const bgKey of backgrounds) {
  const bg = resolve("color", bgKey);
  for (const fgKey of texts) {
    const fg = resolve("color", fgKey);
    const r = ratio(over(fg, bg), bg.components);
    results.push({ background: bgKey, text: fgKey, ratio: Math.round(r * 100) / 100, aa: r >= 4.5 ? "AA" : r >= 3 ? "AA large only" : "fails" });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const bgKey of backgrounds) {
    console.log(`\nOn ${bgKey}`);
    for (const r of results.filter((x) => x.background === bgKey)) console.log(`  ${r.text.padEnd(28)} ${r.ratio.toFixed(2).padStart(6)}:1  ${r.aa}`);
  }
}
