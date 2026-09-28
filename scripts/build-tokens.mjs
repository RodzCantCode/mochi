// Genera, desde tokens/tokens.json y tokens/motion.json (la fuente única):
//   src/styles/tokens.css  variables CSS --mochi-* con tema claro y oscuro, y curvas linear() de los muelles
//   src/tokens.ts          los mismos valores para JavaScript (web hoy, móvil mañana)
// No edites esos dos archivos a mano: cambia los JSON y ejecuta `npm run tokens`.
import { readFileSync, writeFileSync } from "node:fs";

const T = JSON.parse(readFileSync("tokens/tokens.json", "utf8"));
const M = JSON.parse(readFileSync("tokens/motion.json", "utf8"));
const HEAD = "Generado por scripts/build-tokens.mjs desde tokens/*.json. No editar a mano.";

const themes = T.color.themes.map(t => t.id);
const first = themes[0];
const colorOf = (tok, theme) => (typeof tok.value === "string" ? tok.value : tok.value[theme] ?? tok.value[first]);

// alias "{otro-token}" → var(--mochi-otro-token)
const cssColor = v => v.replace(/^\{([^}]+)\}$/, "var(--mochi-$1)");

// Next.js con el paquete `geist` define --font-geist-sans / --font-geist-mono: se usan si existen
const family = (key, v) => {
  const nextVar = key === "sans" ? "--font-geist-sans" : key === "mono" ? "--font-geist-mono" : null;
  return nextVar ? v.replace(/^"Geist( Mono)?"/, m => `var(${nextVar}, ${m})`) : v;
};

// --- muelles → curvas CSS linear() ------------------------------------------------------
function step(t, { response, damping }) {
  const w0 = (2 * Math.PI) / response;
  if (damping >= 1) { const u = w0 * t; return 1 - Math.exp(-u) * (1 + u); }
  const wd = w0 * Math.sqrt(1 - damping * damping);
  const e = Math.exp(-damping * w0 * t);
  return 1 - e * (Math.cos(wd * t) + ((damping * w0) / wd) * Math.sin(wd * t));
}
function settleTime(s) {
  // primer instante a partir del cual se queda para siempre a menos de 0,1 % del destino
  let last = 0;
  for (let t = 0; t < 4; t += 0.001) if (Math.abs(1 - step(t, s)) > 0.001) last = t;
  return last + 0.001;
}
function linearEasing(s) {
  const d = settleTime(s);
  const n = 48;
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(i === n ? 1 : +step((i / n) * d, s).toFixed(4));
  return { css: `linear(${pts.join(", ")})`, ms: Math.round(d * 1000) };
}

// --- CSS -------------------------------------------------------------------------------
const lines = [];
const decl = (k, v) => `  --mochi-${k}: ${v};`;
const colorBlock = theme => T.color.tokens.map(tok => decl(tok.name, cssColor(colorOf(tok, theme))));

lines.push(`/* ${HEAD} */`, "");
lines.push(":root,", '[data-theme="light"] {', "  color-scheme: light;", ...colorBlock("light"), "}", "");
lines.push('[data-theme="dark"] {', "  color-scheme: dark;", ...colorBlock("dark"), "}", "");
lines.push("/* data-theme=\"system\": sigue la preferencia del sistema operativo */");
lines.push('[data-theme="system"] {', "  color-scheme: light;", ...colorBlock("light"), "}");
lines.push("@media (prefers-color-scheme: dark) {", '  [data-theme="system"] {', "    color-scheme: dark;",
  ...colorBlock("dark").map(l => "  " + l), "  }", "}", "");

lines.push(":root {");
for (const [k, v] of Object.entries(T.type.families)) lines.push(decl(`font-${k}`, family(k, v)));
for (const g of T.type.groups)
  for (const s of g.styles)
    lines.push(decl(`text-${s.name}`, `${s.fontWeight} ${s.fontSize}/${s.lineHeight} var(--mochi-font-${g.family})`));
for (const fam of ["spacing", "radius", "shadow"]) for (const tok of T[fam].tokens) lines.push(decl(tok.name, tok.value));
const kebab = s => s.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
for (const [name, s] of Object.entries(M.springs)) {
  const { css, ms } = linearEasing(s);
  lines.push(decl(`ease-${kebab(name)}`, css), decl(`duration-${kebab(name)}`, `${ms}ms`));
}
lines.push("}", "");
writeFileSync("src/styles/tokens.css", lines.join("\n"));

// --- TypeScript ------------------------------------------------------------------------
const colors = Object.fromEntries(themes.map(th => [th, Object.fromEntries(T.color.tokens.map(tok => [tok.name, colorOf(tok, th)]))]));
const text = Object.fromEntries(T.type.groups.flatMap(g => g.styles.map(s => [s.name, { family: g.family, fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight }])));
const list = fam => Object.fromEntries(T[fam].tokens.map(t => [t.name, t.value]));
const springs = Object.fromEntries(Object.entries(M.springs).map(([k, s]) => [k, { response: s.response, damping: s.damping }]));
const ts = `// ${HEAD}
export const colors = ${JSON.stringify(colors, null, 2)} as const;
export const fontFamilies = ${JSON.stringify(T.type.families, null, 2)} as const;
export const text = ${JSON.stringify(text, null, 2)} as const;
export const space = ${JSON.stringify(list("spacing"), null, 2)} as const;
export const radius = ${JSON.stringify(list("radius"), null, 2)} as const;
export const shadow = ${JSON.stringify(list("shadow"), null, 2)} as const;
export const springs = ${JSON.stringify(springs, null, 2)} as const;
export const swap = ${JSON.stringify({ enterDelay: M.swap.enterDelay, blur: M.swap.blur, enterScale: M.swap.enterScale }, null, 2)} as const;
export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)["light"];
export type SpringName = keyof typeof springs;
`;
writeFileSync("src/tokens.ts", ts);
console.log(`tokens: ${T.color.tokens.length} colores × ${themes.length} temas, ${Object.keys(M.springs).length} muelles → src/styles/tokens.css, src/tokens.ts`);
