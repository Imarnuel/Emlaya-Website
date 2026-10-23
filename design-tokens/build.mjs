#!/usr/bin/env node
// Builds the Emlaya website design tokens from the Figma export and the web type scale.
//
//   node design-tokens/build.mjs
//
// Inputs:  figma-export/*.tsv (Figma snapshot), web-typography.json (web type scale)
// Outputs: dist/tokens.json   (DTCG format, for token tooling)
//          dist/tokens.css    (CSS custom properties + .type-* text style classes)
//          dist/tailwind.css  (Tailwind CSS v4 theme + type-* utilities)
//
// What is taken from Figma, and what is left out, is documented in README.md.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const MODE = "Light"; // the website has no dark mode

// ---------------------------------------------------------------------------
// Read the Figma export

function readTsv(name) {
  const [header, ...lines] = readFileSync(join(root, "figma-export", name), "utf8").trimEnd().split("\n");
  const cols = header.split("\t");
  return lines.map((line) => Object.fromEntries(line.split("\t").map((v, i) => [cols[i], v])));
}

const primitives = readTsv("primitives.tsv");
const semantic = readTsv("semantic.tsv");
const iconSizes = readTsv("icon-size.tsv");
const typography = JSON.parse(readFileSync(join(root, "web-typography.json"), "utf8"));

// ---------------------------------------------------------------------------
// Selection: which Figma variables become web tokens

const EXCLUDED_PRIMITIVE_GROUPS = ["Color/dark neutral/", "Color/dark alpha neutral/"]; // dark mode only
const FONT_ROLES = ["display", "heading", "body", "label"]; // code font left out
const WEIGHT_ROLES = ["display", "heading", "body", "label", "label-bold"];

function isWebPrimitive(row) {
  if (EXCLUDED_PRIMITIVE_GROUPS.some((g) => row.name.startsWith(g))) return false;
  // Mobile type scale primitives are replaced by web-typography.json.
  if (row.name.startsWith("Type/")) return false;
  return true;
}

function isWebSemantic(row) {
  if (row.type === "COLOR") return true;
  const family = row.name.match(/^Type\/font family\/(.+)$/);
  if (family) return FONT_ROLES.includes(family[1]);
  const weight = row.name.match(/^Type\/font weight\/(.+)$/);
  if (weight) return WEIGHT_ROLES.includes(weight[1]);
  return false; // mobile font sizes, line heights and letter spacing
}

// ---------------------------------------------------------------------------
// Naming: Figma design names become kebab-case token names

const slug = (s) => s.trim().toLowerCase().replace(/[\s/]+/g, "-");

function tokenName(figmaName, type) {
  const radius = figmaName.match(/^Border radius\/(.+)$/);
  if (radius) return `radius-${slug(radius[1])}`;
  const name = slug(figmaName);
  return type === "COLOR" && !name.startsWith("color-") ? `color-${name}` : name;
}

const FONT_WEIGHTS = { Regular: 400, Medium: 500, "Semi Bold": 600, Bold: 700 };
const FALLBACK_STACK = "ui-sans-serif, system-ui, sans-serif";
const round = (n, places = 4) => Number(Number(n).toFixed(places));

// ---------------------------------------------------------------------------
// Build the token table: name -> { type, css, dtcg, figma }

const tokens = new Map();
const byFigmaName = new Map();

function add(name, token) {
  if (tokens.has(name)) throw new Error(`Duplicate token name ${name} (${token.figma} and ${tokens.get(name).figma})`);
  tokens.set(name, token);
  byFigmaName.set(token.figma, name);
}

function parseHex(hex) {
  const h = hex.slice(1);
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

function dtcgColor({ r, g, b, a }) {
  const hex = "#" + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
  return { colorSpace: "srgb", components: [r, g, b].map((c) => round(c)), alpha: round(a), hex };
}

for (const row of primitives.filter(isWebPrimitive)) {
  const value = row["Mode 1"];
  const name = tokenName(row.name, row.type);
  if (row.type === "COLOR") {
    add(name, { type: "color", figma: row.name, css: value, rgba: parseHex(value), dtcg: dtcgColor(parseHex(value)) });
  } else {
    // Tailwind has no border width namespace, so border widths are plain variables there.
    add(name, { type: "dimension", figma: row.name, css: `${round(value)}px`, dtcg: { value: round(value), unit: "px" }, rootOnly: name.startsWith("border-width-") });
  }
}

for (const row of primitives.filter((r) => r.name.startsWith("Type/font family/") && !r.name.endsWith("/Font Code"))) {
  byFigmaName.set(row.name, { fontFamily: row["Mode 1"] });
}
for (const row of primitives.filter((r) => r.name.startsWith("Type/font weight/"))) {
  const weight = FONT_WEIGHTS[row["Mode 1"]];
  add(`font-weight-${slug(row["Mode 1"])}`, { type: "fontWeight", figma: row.name, css: String(weight), dtcg: weight });
}

function resolveRef(value) {
  // "@Primitives:Color/neutral/900" or "@Primitives:Color/white@85%"
  const m = value.match(/^@[^:]+:(.+?)(?:@([\d.]+)%)?$/);
  if (!m) return null;
  const target = byFigmaName.get(m[1]);
  if (target === undefined) throw new Error(`Reference to a token that is not part of the web set: ${value}`);
  return { target, opacity: m[2] === undefined ? null : Number(m[2]) };
}

for (const row of semantic.filter(isWebSemantic)) {
  const value = row[MODE];
  const ref = resolveRef(value);
  if (row.type === "COLOR") {
    const name = tokenName(row.name, row.type);
    if (!ref) {
      add(name, { type: "color", figma: row.name, css: value, rgba: parseHex(value), dtcg: dtcgColor(parseHex(value)) });
      continue;
    }
    const base = tokens.get(ref.target);
    if (ref.opacity === null) {
      add(name, { type: "color", figma: row.name, css: `var(--${ref.target})`, rgba: base.rgba, dtcg: `{color.${ref.target.slice(6)}}` });
    } else {
      const rgba = { ...base.rgba, a: base.rgba.a * (ref.opacity / 100) };
      add(name, {
        type: "color",
        figma: row.name,
        css: `color-mix(in srgb, var(--${ref.target}) ${ref.opacity}%, transparent)`,
        rgba,
        dtcg: dtcgColor(rgba),
        note: `${tokens.get(ref.target).figma} at ${ref.opacity}% opacity`,
      });
    }
  } else if (row.name.startsWith("Type/font family/")) {
    const role = row.name.split("/").pop();
    const family = ref.target.fontFamily;
    add(`font-${role}`, { type: "fontFamily", figma: row.name, css: `"${family}", ${FALLBACK_STACK}`, dtcg: [family, "ui-sans-serif", "system-ui", "sans-serif"] });
  } else {
    // Role weights stay out of Tailwind's font-* namespace, where they would clash with the font family classes.
    const role = row.name.split("/").pop();
    add(`font-weight-${role}`, { type: "fontWeight", figma: row.name, css: `var(--${ref.target})`, dtcg: `{fontWeight.${ref.target.slice(12)}}`, rootOnly: true });
  }
}

for (const row of iconSizes) {
  for (const mode of ["16px", "20px", "24px", "32px"]) {
    const kind = row.name === "icon size" ? "icon-size" : "icon-stroke";
    const size = mode.replace("px", "");
    add(`${kind}-${size}`, { type: "dimension", figma: `Icon size/${row.name} (${mode})`, css: `${round(row[mode])}px`, dtcg: { value: round(row[mode]), unit: "px" }, rootOnly: true });
  }
}

// ---------------------------------------------------------------------------
// Web type scale

const { min: vMin, max: vMax } = typography.viewport;
const rem = (px) => `${round(px / typography.rootFontSize)}rem`;

function fluid([minPx, maxPx]) {
  // Linear between the two viewport widths, clamped outside them. The rem term keeps text zoomable.
  const slope = (maxPx - minPx) / (vMax - vMin);
  const intercept = minPx - slope * vMin;
  return `clamp(${rem(minPx)}, ${rem(intercept)} + ${round(slope * 100, 4)}vw, ${rem(maxPx)})`;
}

const textStyles = Object.entries(typography.styles).map(([name, s]) => {
  const isFluid = Array.isArray(s.size);
  return {
    name,
    figma: s.figma,
    fontFamily: `var(--font-${s.font})`,
    fontWeight: `var(--font-weight-${s.weight})`,
    fontSize: isFluid ? fluid(s.size) : rem(s.size),
    lineHeight: isFluid ? String(s.lineHeight) : rem(s.lineHeight),
    letterSpacing: s.letterSpacing === 0 ? "0" : `${s.letterSpacing}em`,
    source: s,
  };
});

// ---------------------------------------------------------------------------
// Outputs

const GROUPS = [
  ["Colour palette (Figma: Primitives)", (n, t) => t.type === "color" && primitives.some((p) => p.name === t.figma)],
  ["Colour roles (Figma: Semantic, light mode)", (n, t) => t.type === "color" && !primitives.some((p) => p.name === t.figma)],
  ["Spacing", (n) => n.startsWith("spacing-")],
  ["Corner radius", (n) => n.startsWith("radius-")],
  ["Border width", (n) => n.startsWith("border-width-")],
  ["Icon sizes", (n) => n.startsWith("icon-")],
  ["Fonts", (n, t) => t.type === "fontFamily" || t.type === "fontWeight"],
];

function grouped() {
  const seen = new Set();
  const out = GROUPS.map(([label, test]) => {
    const entries = [...tokens].filter(([n, t]) => !seen.has(n) && test(n, t));
    entries.forEach(([n]) => seen.add(n));
    return [label, entries];
  });
  const rest = [...tokens].filter(([n]) => !seen.has(n));
  if (rest.length) throw new Error(`Ungrouped tokens: ${rest.map(([n]) => n).join(", ")}`);
  return out;
}

const banner = "/* Generated by design-tokens/build.mjs from the Figma export. Do not edit by hand. */\n";

function cssVariables({ indent = "  ", include = () => true, textStyles: withText = true } = {}) {
  let out = "";
  for (const [label, all] of grouped()) {
    const entries = all.filter(([, t]) => include(t));
    if (!entries.length) continue;
    out += `\n${indent}/* ${label} */\n`;
    for (const [name, t] of entries) out += `${indent}--${name}: ${t.css};\n`;
  }
  if (!withText) return out;
  out += `\n${indent}/* Text styles (web type scale) */\n`;
  for (const s of textStyles) {
    out += `${indent}--text-${s.name}: ${s.fontSize};\n`;
    out += `${indent}--text-${s.name}--line-height: ${s.lineHeight};\n`;
    out += `${indent}--text-${s.name}--letter-spacing: ${s.letterSpacing};\n`;
    out += `${indent}--text-${s.name}--font-weight: ${s.fontWeight};\n`;
  }
  return out;
}

function textStyleBody(s, indent) {
  return [
    `font-family: ${s.fontFamily};`,
    `font-weight: ${s.fontWeight};`,
    `font-size: var(--text-${s.name});`,
    `line-height: var(--text-${s.name}--line-height);`,
    `letter-spacing: var(--text-${s.name}--letter-spacing);`,
  ].map((l) => indent + l).join("\n");
}

// tokens.css: framework-agnostic
let css = banner + ":root {" + cssVariables() + "}\n\n/* Text style classes: one class applies a whole text style. */\n";
for (const s of textStyles) css += `.type-${s.name} {\n${textStyleBody(s, "  ")}\n}\n`;

// tailwind.css: Tailwind v4 theme. Tailwind's default palette, fonts, type scale, radii and
// spacing are removed, so only Emlaya tokens are available as utilities.
let tw = banner + `/* Tailwind CSS v4: @import "tailwindcss"; then @import this file. */\n\n/* static: emit every token as a CSS variable, even if no utility uses it. */\n@theme static {\n`;
for (const ns of ["color", "font", "font-weight", "text", "leading", "tracking", "radius", "spacing"]) tw += `  --${ns}-*: initial;\n`;
tw += cssVariables({ include: (t) => !t.rootOnly }) + "}\n\n";
tw += "/* Tokens without a Tailwind namespace: available as CSS variables only. */\n:root {";
tw += cssVariables({ include: (t) => t.rootOnly, textStyles: false }) + "}\n\n";
tw += "/* Text style utilities: class=\"type-heading-h1\" applies the whole text style. */\n";
for (const s of textStyles) tw += `@utility type-${s.name} {\n${textStyleBody(s, "  ")}\n}\n`;

// tokens.json: DTCG (Design Tokens Community Group) format
const dtcg = { $description: "Emlaya website design tokens. Generated by design-tokens/build.mjs from the Figma export." };
const groupFor = (n, t) =>
  t.type === "color" ? ["color", n.slice(6)]
  : t.type === "fontFamily" ? ["fontFamily", n.slice(5)]
  : t.type === "fontWeight" ? ["fontWeight", n.slice(12)]
  : n.startsWith("spacing-") ? ["spacing", n.slice(8)]
  : n.startsWith("radius-") ? ["radius", n.slice(7)]
  : n.startsWith("border-width-") ? ["borderWidth", n.slice(13)]
  : ["icon", n.slice(5)];
for (const [name, t] of tokens) {
  const [group, key] = groupFor(name, t);
  dtcg[group] ??= {};
  const token = { $type: t.type, $value: t.dtcg, $extensions: { "com.figma": { name: t.figma } } };
  if (t.note) token.$description = t.note;
  dtcg[group][key] = token;
}
dtcg.typography = {};
for (const s of textStyles) {
  const src = s.source;
  const sizes = Array.isArray(src.size) ? src.size : [src.size, src.size];
  dtcg.typography[s.name] = {
    $type: "typography",
    $value: {
      fontFamily: `{fontFamily.${src.font}}`,
      fontWeight: `{fontWeight.${src.weight}}`,
      fontSize: { value: sizes[1], unit: "px" },
      lineHeight: Array.isArray(src.size) ? src.lineHeight : round(src.lineHeight / src.size),
      letterSpacing: { value: src.letterSpacing, unit: "em" },
    },
    $extensions: {
      "com.figma": { name: s.figma },
      "com.emlaya.fluid": Array.isArray(src.size) ? { minSize: sizes[0], maxSize: sizes[1], minViewport: vMin, maxViewport: vMax, unit: "px" } : undefined,
    },
  };
}

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "tokens.css"), css);
writeFileSync(join(root, "dist", "tailwind.css"), tw);
writeFileSync(join(root, "dist", "tokens.json"), JSON.stringify(dtcg, null, 2) + "\n");

const counts = grouped().map(([label, e]) => `${label}: ${e.length}`).join("\n  ");
console.log(`Built ${tokens.size} tokens and ${textStyles.length} text styles\n  ${counts}`);
