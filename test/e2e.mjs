// Pruebas de interacción sobre el banco de pruebas compilado, con Playwright.
// Uso: npm run test:e2e   (compila la librería y el banco, los sirve y los recorre)
// Deja capturas en test/out/ para revisarlas a ojo.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";

execSync("npx vite build --logLevel error", { stdio: "inherit" });
const ROOT = "playground-dist";
const OUT = "test/out";
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
}).listen(0);
const URL_ = `http://localhost:${server.address().port}/`;

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const errors = [];
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1500 }, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  await page.goto(URL_);
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  return page;
}
const box = async loc => (await loc.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };

try {
  const page = await open();
  await page.screenshot({ path: `${OUT}/light.png`, fullPage: true });

  // --- interruptor
  const sw = page.locator("#sw-notify");
  const knob = sw.locator(".mochi-switch__knob");
  const k0 = await box(knob);
  await sw.click();
  await sleep(700);
  const k1 = await box(knob);
  check("switch: al pulsar queda encendido", (await sw.getAttribute("aria-checked")) === "true");
  check("switch: la bolita se desplaza a la derecha", k1.x - k0.x > 15, `${k0.x} → ${k1.x}`);
  await sw.focus();
  await page.keyboard.press("Space");
  check("switch: la barra espaciadora lo apaga", (await sw.getAttribute("aria-checked")) === "false");

  // --- pestañas
  const seg = page.locator('[data-demo="segmented"] [role="tablist"]');
  await seg.getByRole("tab", { name: "Week" }).click();
  await sleep(700);
  const ind = await box(seg.locator(".mochi-seg__indicator"));
  const wk = await box(seg.getByRole("tab", { name: "Week" }));
  check("pestañas: al pulsar se selecciona", (await seg.getByRole("tab", { name: "Week" }).getAttribute("aria-selected")) === "true");
  check("pestañas: el indicador acaba justo sobre la pestaña", Math.abs(ind.x - wk.x) < 1.5 && Math.abs(ind.width - wk.width) < 1.5, `ind ${ind.x}/${ind.width} tab ${wk.x}/${wk.width}`);
  await page.keyboard.press("ArrowRight");
  check("pestañas: la flecha selecciona y enfoca la siguiente", (await page.evaluate(() => document.activeElement?.textContent)) === "Month");
  // a mitad de camino el indicador se estira (el borde delantero adelanta al trasero)
  await seg.getByRole("tab", { name: "Day" }).click();
  await sleep(90);
  const mid = await box(seg.locator(".mochi-seg__indicator"));
  check("pestañas: a mitad de camino el indicador se estira", mid.width > wk.width * 1.15, `ancho ${mid.width.toFixed(1)} vs ${wk.width}`);

  // --- slider
  const sl = page.getByRole("slider", { name: "Volume" });
  await sl.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  check("slider: las flechas suben el valor", (await sl.getAttribute("aria-valuenow")) === "43");
  const sb = await box(sl);
  await page.mouse.move(sb.x + sb.width * 0.5, sb.y + sb.height / 2);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 1.6, sb.y + sb.height / 2, { steps: 12 });
  await sleep(50);
  const shapeHeld = await box(sl.locator(".mochi-slider__shape"));
  check("slider: arrastrado más allá del final vale el máximo", (await sl.getAttribute("aria-valuenow")) === "100");
  check("slider: la forma se estira al pasarse", shapeHeld.width > sb.width + 20, `${shapeHeld.width.toFixed(1)} vs ${sb.width}`);
  await page.screenshot({ path: `${OUT}/slider-stretch.png`, clip: { x: sb.x - 40, y: sb.y - 40, width: sb.width * 1.8, height: 130 } });
  await page.mouse.up();
  await sleep(900);
  const shapeRest = await box(sl.locator(".mochi-slider__shape"));
  check("slider: al soltar vuelve a su tamaño", Math.abs(shapeRest.width - sb.width) < 1, `${shapeRest.width.toFixed(1)} vs ${sb.width}`);

  // --- botón
  const btn = page.getByRole("button", { name: "Get started" });
  await btn.click();
  await sleep(150);
  check("botón: pasa a cargando", (await btn.getAttribute("aria-busy")) === "true");
  await sleep(450);
  const bl = await box(btn);
  check("botón: cargando es un círculo", Math.abs(bl.width - bl.height) < 1.5, `${bl.width}×${bl.height}`);
  await page.screenshot({ path: `${OUT}/button-loading.png`, clip: { x: bl.x - 120, y: bl.y - 30, width: 360, height: bl.height + 60 } });
  await sleep(1000);
  check("botón: termina en hecho", (await btn.getAttribute("data-status")) === "success");
  await sleep(1500);
  check("botón: vuelve a su estado normal", (await btn.getAttribute("data-status")) === "idle");

  // --- reproductor
  const toggle = page.locator(".mochi-player__toggle");
  await toggle.click();
  await sleep(800);
  const pl = await box(page.locator(".mochi-player"));
  check("reproductor: se abre", (await toggle.getAttribute("aria-expanded")) === "true" && Math.abs(pl.height - 236) < 1 && Math.abs(pl.width - 344) < 1, `alto ${pl.height}`);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  check("reproductor: play pasa a pausa", await page.getByRole("button", { name: "Pause", exact: true }).isVisible());
  const scrub = page.getByRole("slider", { name: "Seek Night Drive" });
  const t0 = Number(await scrub.getAttribute("aria-valuenow"));
  await scrub.focus();
  await page.keyboard.press("ArrowRight");
  const t1 = Number(await scrub.getAttribute("aria-valuenow"));
  check("reproductor: la flecha adelanta 5 s", t1 - t0 >= 4 && t1 - t0 <= 6, `${t0} → ${t1}`);
  await sleep(400);
  await page.screenshot({ path: `${OUT}/player.png`, clip: { x: pl.x - 30, y: pl.y - 30, width: pl.width + 60, height: pl.height + 60 } });

  // --- gráfica
  const chart = page.locator(".mochi-chart");
  const cb = await box(chart);
  await page.mouse.move(cb.x + cb.width * 0.52, cb.y + cb.height * 0.5);
  await sleep(500);
  const tipOpacity = await page.locator(".mochi-chart__tip").evaluate(e => Number(getComputedStyle(e).opacity));
  const live = await chart.locator('[aria-live="polite"]').textContent();
  check("gráfica: al pasar el puntero aparece el tooltip", tipOpacity > 0.9 && /Mar \d+: \$/.test(live ?? ""), `opacidad ${tipOpacity}, «${live}»`);
  await page.screenshot({ path: `${OUT}/chart-hover.png`, clip: { x: cb.x - 30, y: cb.y - 200, width: cb.width + 60, height: cb.height + 240 } });
  await page.mouse.move(10, 10);

  // --- paleta ⌘K
  await page.keyboard.press("Meta+k");
  await sleep(450);
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  check("paleta: ⌘K la abre con el foco en la búsqueda", (await dialog.isVisible()) && (await page.evaluate(() => document.activeElement?.getAttribute("role"))) === "combobox");
  await page.screenshot({ path: `${OUT}/palette.png` });
  await page.keyboard.type("sa", { delay: 120 });
  await sleep(500);
  const opts = await page.locator('[role="option"]:not([aria-hidden="true"])').allTextContents();
  check("paleta: «sa» deja solo Save changes", opts.length === 1 && opts[0].startsWith("Save changes"), JSON.stringify(opts));
  await page.screenshot({ path: `${OUT}/palette-filtered.png` });
  await page.keyboard.press("Enter");
  await sleep(700);
  check("paleta: Enter la cierra", (await page.locator(".mochi-cmdk-root").count()) === 0);
  const toastText = await page.locator(".mochi-toaster").textContent();
  check("paleta: el comando lanza el aviso", /Changes saved/.test(toastText ?? ""), `«${toastText}»`);
  await page.screenshot({ path: `${OUT}/toast.png` });
  await page.keyboard.press("Meta+k");
  await sleep(300);
  await page.keyboard.press("Escape");
  await sleep(500);
  check("paleta: Esc la cierra", (await page.locator(".mochi-cmdk-root").count()) === 0);

  // --- tema oscuro
  await page.getByRole("tab", { name: "Dark" }).click();
  await sleep(600);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("tema: oscuro cambia el lienzo", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark" && bg === "rgb(15, 15, 14)", bg);
  await page.mouse.move(10, 10);
  await sleep(3500); // que se vaya el aviso
  await page.screenshot({ path: `${OUT}/dark.png`, fullPage: true });
  await page.context().close();

  // --- movimiento reducido: sin animación
  const rm = await open({ reducedMotion: "reduce" });
  const sw2 = rm.locator("#sw-notify");
  await sw2.click();
  await sleep(40);
  const r0 = await box(sw2.locator(".mochi-switch__knob"));
  await sleep(600);
  const r1 = await box(sw2.locator(".mochi-switch__knob"));
  check("movimiento reducido: el switch salta sin animar", Math.abs(r0.x - r1.x) < 0.5, `${r0.x} vs ${r1.x}`);
  await rm.context().close();

  check("sin errores en la consola", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("la prueba terminó sin excepciones", false, e.stack);
} finally {
  await browser.close();
  server.close();
}

let fails = 0;
for (const r of results) {
  if (!r.ok) fails++;
  console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok || !r.detail ? "" : `  →  ${r.detail}`}`);
}
console.log(`\n${results.length - fails}/${results.length} comprobaciones correctas; capturas en ${OUT}/`);
process.exitCode = fails ? 1 : 0;
