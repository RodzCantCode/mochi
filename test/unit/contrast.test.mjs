// Contraste de cada pareja texto/fondo del sistema en los dos temas (WCAG 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { colors } from "../../dist/tokens.js";

function parse(c) {
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = c.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(",").map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  throw new Error("color no reconocido: " + c);
}
const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
const lum = rgb => {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function ratio(fgName, bgName, theme, base = "canvas") {
  const c = colors[theme];
  const ground = over(parse(c[base]), [255, 255, 255]);
  const bg = over(parse(c[bgName]), ground);
  const fg = over(parse(c[fgName]), bg);
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// [texto, fondo, mínimo]: 4.5 para texto normal, 3 para gráficos, iconos y bordes de foco.
// `accent` es un pastel: va sobre `solid` o lleva texto encima, nunca solo sobre el lienzo claro;
// para eso está `accent-strong`.
const PAIRS = [
  ["on-canvas", "canvas", 4.5], ["on-canvas-muted", "canvas", 4.5],
  ["on-solid", "solid", 4.5], ["on-solid-muted", "solid", 4.5],
  ["on-surface", "surface", 4.5], ["on-surface-muted", "surface", 4.5],
  ["on-thumb", "thumb", 4.5], ["on-thumb-muted", "thumb", 4.5],
  ["on-accent", "accent", 4.5], ["on-fill", "fill", 4.5], ["on-danger", "danger", 4.5],
  ["accent", "solid", 3], ["fill", "surface", 3], ["thumb", "solid", 3],
  ["accent-strong", "canvas", 3], ["accent-strong", "surface", 3],
  ["danger", "canvas", 3], ["danger", "surface", 3],
  ["danger-strong", "canvas", 4.5], ["danger-strong", "surface", 4.5],
  ["focus-ring", "canvas", 3], ["focus-ring", "surface", 3],
];

for (const theme of Object.keys(colors)) {
  test(`contrastes del tema ${theme}`, () => {
    const fails = [];
    for (const [fg, bg, min] of PAIRS) {
      const r = ratio(fg, bg, theme);
      if (r < min) fails.push(`${fg} sobre ${bg}: ${r.toFixed(2)} (mínimo ${min})`);
    }
    assert.deepEqual(fails, []);
  });
}
