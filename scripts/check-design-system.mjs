// Monta cada vista previa del sistema de diseño como lo hace Claude Design (valores compilados,
// fuente, bundle.css, React 18 desde jsDelivr y bundle.js) en claro y en oscuro, y comprueba
// que se renderiza sin errores y con contenido. Deja capturas en design-system/check/.
// Uso: node scripts/build-design-system.mjs && node scripts/check-design-system.mjs
import { chromium } from "playwright";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const P = "design-system/project";
const OUT = "design-system/check";
mkdirSync(OUT, { recursive: true });
const tokens = JSON.parse(readFileSync(join(P, "tokens.json"), "utf8"));

// el tokens.css que compila el sistema: --<nombre>, un bloque por tema, fuentes
const themes = tokens.color.themes.map(t => t.id);
const val = (t, th) => (typeof t.value === "string" ? t.value : t.value[th] ?? t.value[themes[0]]);
const colors = th => tokens.color.tokens.map(t => `--${t.name}: ${val(t, th)};`).join(" ");
const shadows = tokens.shadow.tokens.map(t => `--${t.name}: ${t.value};`).join(" ");
const scales = ["spacing", "radius"].flatMap(f => tokens[f].tokens.map(t => `--${t.name}: ${t.value};`)).join(" ");
const families = Object.entries(tokens.type.families).map(([k, v]) => `--font-${k}: ${v};`).join(" ");
const fontFaces = tokens.type.fonts
  .map(f => `@font-face { font-family: "${f.family}"; src: url("${pathToFileURL(resolve(P, f.file)).href}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; }`)
  .join("\n");
const tokensCss = `${fontFaces}
:root, [data-theme="${themes[0]}"] { ${colors(themes[0])} ${shadows} }
${themes.slice(1).map(th => `[data-theme="${th}"] { ${colors(th)} }`).join("\n")}
:root { ${scales} ${families} }`;

const bundleCss = readFileSync(join(P, "components/bundle.css"), "utf8");
const bundleJs = readFileSync(join(P, "components/bundle.js"), "utf8");
const REACT = "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js";
const REACT_DOM = "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js";

const cards = readdirSync(join(P, "components")).filter(d => !d.includes("."));
const browser = await chromium.launch();
const report = [];
for (const card of cards) {
  const src = readFileSync(join(P, "components", card, "preview.html"), "utf8");
  const marker = src.split("\n")[0];
  const height = Number(/height=(\d+)/.exec(marker)?.[1] ?? 120);
  for (const theme of themes) {
    const inject = `<style>${tokensCss}</style><style>${bundleCss}</style>` +
      `<script src="${REACT}"></script><script src="${REACT_DOM}"></script><script>${bundleJs}</script>`;
    // con función: el bundle minificado puede contener «$&», que un texto de reemplazo interpretaría
    const html = src.replace(/<html([^>]*)>/, (_, a) => `<html${a} data-theme="${theme}">`).replace(/<head>/, () => `<head>${inject}`);
    const file = resolve(OUT, `${card}-${theme}.html`);
    writeFileSync(file, html);
    const page = await browser.newPage({ viewport: { width: card === "Cover" ? 960 : 720, height: Math.max(height, 120) } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => ["error", "warning"].includes(m.type()) && errors.push(`${m.type()}: ${m.text()}`));
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    // un poco de interacción: con React 18 algunos fallos solo salen al abrir o cambiar algo
    for (const sel of ["[data-mochi-accordion-trigger]", '[role="tab"]', '[role="checkbox"]', '[role="radio"]']) {
      const el = page.locator(sel);
      if ((await el.count()) > 1) {
        await el.nth(1).click();
        await page.waitForTimeout(500);
      }
    }
    const inside = await page.evaluate(() => document.querySelectorAll("#root *, .cover *, body > [class^='mochi'] *").length);
    await page.screenshot({ path: join(OUT, `${card}-${theme}.png`) });
    report.push({ card, theme, errors, inside });
    await page.close();
  }
}
await browser.close();

let bad = 0;
for (const r of report) {
  const ok = r.errors.length === 0 && r.inside > 0;
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${r.card} (${r.theme})${ok ? "" : `  →  elementos: ${r.inside}; ${r.errors.join(" | ")}`}`);
}
console.log(`\n${report.length - bad}/${report.length} vistas previas correctas; capturas en ${OUT}/`);
process.exitCode = bad ? 1 : 0;
