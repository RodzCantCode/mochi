// Pruebas de interacción sobre el banco de pruebas compilado, con Playwright.
// Uso: npm run test:e2e   (compila la librería y el banco, los sirve y los recorre)
// Deja capturas en test/out/ para revisarlas a ojo.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";

execSync("npx vite build --logLevel error", { stdio: "inherit" });
// también en modo desarrollo: ahí React renderiza dos veces seguidas (StrictMode) y salen fallos
// que la versión compilada no enseña
execSync("npx vite build --logLevel error --mode development --outDir ../test/out/dev --emptyOutDir", {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development" },
});
const ROOT = "playground-dist";
const OUT = "test/out";
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const serve = root =>
  createServer((req, res) => {
    let p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
    if (!existsSync(p)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
  }).listen(0);
const server = serve(ROOT);
const devServer = serve(`${OUT}/dev`);
const URL_ = `http://localhost:${server.address().port}/`;
const DEV_URL = `http://localhost:${devServer.address().port}/`;

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
// nombre del elemento enfocado (los botones de Mochi repiten su texto para lectores de pantalla)
const focusedName = p => p.evaluate(() => { const a = document.activeElement; return a?.getAttribute("aria-label") ?? a?.querySelector(".mochi-sr")?.textContent ?? a?.textContent; });
// el de las casillas y los radios, que se nombran con su etiqueta (aria-labelledby)
const focusedLabel = p => p.evaluate(() => { const id = document.activeElement?.getAttribute("aria-labelledby"); return id ? document.getElementById(id)?.textContent : null; });
// escala en x de un elemento transformado con scale()
const scaleOf = loc => loc.evaluate(e => { const t = getComputedStyle(e).transform; return t === "none" ? 1 : new DOMMatrix(t).a; });
// muestras de algo en cada fotograma durante `ms` (se recogen en la página)
const sampleFrames = (p, fn, ms) =>
  p.evaluate(([src, ms]) => new Promise(done => {
    const f = new Function(`return (${src})()`);
    const out = [], t0 = performance.now();
    const tick = () => { out.push(f()); if (performance.now() - t0 < ms) requestAnimationFrame(tick); else done(out); };
    requestAnimationFrame(tick);
  }), [fn.toString(), ms]);

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

  // al cargar y volver, el botón encoge en su hueco: los de al lado no se mueven
  await page.evaluate(() => {
    const pick = n => [...document.querySelectorAll("button.mochi-morph")].find(e => e.querySelector(".mochi-sr")?.textContent === n);
    const a = pick("Get started"), c = pick("Upgrade");
    const xs = (window.__neighbors = []);
    const t0 = performance.now();
    const tick = () => {
      xs.push([a.getBoundingClientRect().x, c.getBoundingClientRect().x]);
      if (performance.now() - t0 < 2600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await sleep(2700);
  const nb = await page.evaluate(() => window.__neighbors);
  const drift = Math.max(...nb.map(([a, c]) => Math.max(Math.abs(a - nb[0][0]), Math.abs(c - nb[0][1]))));
  check("botón: al cargar y volver no mueve a los de al lado", nb.length > 30 && drift < 0.5, `se movieron ${drift.toFixed(1)} px`);

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

  // --- campo de texto
  await page.goto(URL_ + "#/text-field");
  await sleep(500);
  const email = page.locator('input[name="email"]').first();
  const labelScale = name =>
    page.evaluate(n => {
      const l = [...document.querySelectorAll(".mochi-field__label")].find(x => x.textContent === n);
      return l ? new DOMMatrix(getComputedStyle(l).transform).a : 0;
    }, name);
  check("campo: en reposo la etiqueta ocupa el campo", Math.abs((await labelScale("Email")) - 1) < 0.01);
  await email.click();
  await sleep(450);
  check("campo: al enfocar, la etiqueta sube y se encoge", Math.abs((await labelScale("Email")) - 0.75) < 0.02, String(await labelScale("Email")));
  await page.keyboard.type("ada@");
  await page.locator('input[name="password"]').first().click();
  await sleep(600);
  const described = await email.getAttribute("aria-describedby");
  const msg = described ? await page.locator(`[id="${described}"]`).textContent() : "";
  check("campo: un correo a medias marca error al salir", (await email.getAttribute("aria-invalid")) === "true" && /Enter a valid email/.test(msg ?? ""), `«${msg}»`);
  await page.screenshot({ path: `${OUT}/field-error.png`, clip: await (async () => { const b = await box(email); return { x: b.x - 40, y: b.y - 30, width: b.width + 80, height: 220 }; })() });
  const pw = page.locator('input[name="password"]').first();
  await page.getByRole("button", { name: "Show password" }).first().click();
  check("campo: el ojo muestra la contraseña sin quitar el foco", (await pw.getAttribute("type")) === "text" && (await page.evaluate(() => document.activeElement?.getAttribute("name"))) === "password");
  check("campo: el botón del ojo pasa a llamarse «Hide password»", (await page.getByRole("button", { name: "Hide password" }).count()) === 1);
  await page.goto(URL_ + "#/");
  await page.goto(URL_ + "#/text-field");
  await sleep(400);
  await page.getByRole("button", { name: "Create account" }).click();
  await sleep(300);
  check("campo: enviar vacío lleva el foco al primer campo con error", (await page.evaluate(() => document.activeElement?.getAttribute("name"))) === "email" && (await page.locator('input[name="email"]').first().getAttribute("aria-invalid")) === "true");

  // --- diálogo
  await page.goto(URL_ + "#/dialog");
  await sleep(500);
  const opener = page.getByRole("button", { name: "Delete project" }).first();
  const ob = await box(opener);
  await opener.click();
  await sleep(70);
  const growing = await box(page.locator(".mochi-dialog"));
  await sleep(800);
  const dlg = page.getByRole("alertdialog");
  const db = await box(dlg);
  check("diálogo: crece desde el botón hasta la ventana", growing.width > ob.width - 1 && growing.width < db.width - 20 && db.width > 400, `botón ${ob.width.toFixed(0)}, a los 70 ms ${growing.width.toFixed(0)}, final ${db.width.toFixed(0)}`);
  check("diálogo: el foco entra en la ventana", (await focusedName(page)) === "Cancel");
  await page.keyboard.press("Shift+Tab");
  check("diálogo: Mayús+Tab desde el primero va al último", (await focusedName(page)) === "Delete");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
  check("diálogo: Tab no se sale de la ventana", await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]')));
  await page.screenshot({ path: `${OUT}/dialog.png` });
  await page.keyboard.press("Escape");
  await sleep(900);
  check("diálogo: Esc lo cierra y el foco vuelve al botón", (await page.locator(".mochi-dialog-root").count()) === 0 && (await focusedName(page)) === "Delete project");
  check("diálogo: el botón vuelve a verse", (await opener.evaluate(e => getComputedStyle(e).opacity)) === "1");

  // --- menú
  await page.goto(URL_ + "#/menu");
  await sleep(500);
  const more = page.getByRole("button", { name: "Project actions" }).first();
  await more.click();
  await sleep(700);
  const menu = page.getByRole("menu");
  check("menú: se abre desde el botón", (await menu.isVisible()) && (await more.getAttribute("aria-expanded")) === "true");
  check("menú: el botón se oculta mientras el menú es él", (await more.evaluate(e => getComputedStyle(e).opacity)) === "0");
  await page.screenshot({ path: `${OUT}/menu.png` });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const ad = (await menu.getAttribute("aria-activedescendant")) ?? "";
  check("menú: las flechas mueven la opción activa", ad.endsWith("-duplicate"), ad);
  await page.keyboard.press("Enter");
  await sleep(800);
  check("menú: Enter ejecuta la opción y cierra", (await page.locator(".mochi-menu-root").count()) === 0 && /Project duplicated/.test((await page.locator(".mochi-toaster").textContent()) ?? ""));
  check("menú: el foco vuelve al botón", (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "Project actions");
  await page.keyboard.press("Enter");
  await sleep(500);
  await page.keyboard.type("de", { delay: 60 });
  check("menú: escribir salta a la opción que empieza así", ((await page.getByRole("menu").getAttribute("aria-activedescendant")) ?? "").endsWith("-delete"));
  await page.keyboard.press("Enter");
  await sleep(900);
  check("menú: «Delete» abre la confirmación", await page.getByRole("alertdialog").isVisible());
  await page.keyboard.press("Escape");
  await sleep(1000);
  check("menú: tras menú y diálogo el botón vuelve a verse", (await more.evaluate(e => getComputedStyle(e).opacity)) === "1");
  const area = page.locator(".ctx-area");
  await area.scrollIntoViewIfNeeded();
  const ab = await box(area);
  await page.mouse.click(ab.x + 40, ab.y + 30, { button: "right" });
  await sleep(700);
  const cm = await box(page.getByRole("menu"));
  check("menú contextual: se abre en el punto del clic", Math.abs(cm.x - (ab.x + 40)) < 1 && Math.abs(cm.y - (ab.y + 32)) < 1, `${cm.x},${cm.y} vs ${ab.x + 40},${ab.y + 30}`);
  await page.keyboard.press("Escape");
  await sleep(700);
  const te = page.getByRole("button", { name: "top-end" });
  await te.scrollIntoViewIfNeeded();
  const tb = await box(te);
  await te.click();
  await sleep(700);
  const tm = await box(page.getByRole("menu"));
  check("menú: «top-end» se abre encima y alineado al final", tm.y + tm.height <= tb.y && Math.abs(tm.x + tm.width - (tb.x + tb.width)) < 1);
  check("menú: se llama como su botón, sin repetir el texto", (await page.getByRole("menu", { name: "top-end", exact: true }).count()) === 1);
  await page.mouse.click(8, 8);
  await sleep(700);
  check("menú: un clic fuera lo cierra", (await page.locator(".mochi-menu-root").count()) === 0);

  // --- tooltip
  await page.goto(URL_ + "#/tooltip");
  await sleep(500);
  await page.mouse.move(5, 5);
  const dup = page.getByRole("button", { name: "Duplicate" }).first();
  await dup.hover();
  await sleep(200);
  const early = await page.locator('.mochi-tooltip[data-state="open"]').count();
  await sleep(600);
  const tipEl = page.getByRole("tooltip");
  const tipId = await tipEl.getAttribute("id");
  check("tooltip: espera un poco y aparece al pasar el ratón", early === 0 && (await tipEl.textContent()) === "Duplicate" && (await dup.getAttribute("aria-describedby"))?.includes(tipId), `a los 200 ms: ${early}`);
  await page.getByRole("button", { name: "Share" }).first().hover();
  await sleep(120);
  check("tooltip: al pasar al siguiente viaja y cambia el texto sin esperar", (await page.locator(".mochi-tooltip").count()) === 1 && /Share/.test((await page.locator(".mochi-tooltip").count()) ? await page.locator(".mochi-tooltip .mochi-tooltip__layer:not([data-leaving])").textContent() : ""));
  await page.screenshot({ path: `${OUT}/tooltip.png` });
  await page.mouse.move(5, 5);
  await sleep(600);
  check("tooltip: al salir el ratón se va, y fuera del árbol de accesibilidad", (await page.locator('.mochi-tooltip[data-state="open"]').count()) === 0 && (await page.locator(".mochi-tooltip").getAttribute("aria-hidden")) === "true");
  await page.getByRole("button", { name: "Rename" }).first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await sleep(300);
  check("tooltip: con el foco de teclado sale al momento", (await page.getByRole("tooltip").textContent()) === "Rename");
  await page.keyboard.press("Escape");
  await sleep(400);
  check("tooltip: Esc lo cierra", (await page.locator('.mochi-tooltip[data-state="open"]').count()) === 0);

  // --- selector
  await page.goto(URL_ + "#/select");
  await sleep(500);
  const sizeBox = page.getByRole("combobox", { name: "Size" });
  await sizeBox.click();
  await sleep(600);
  const lb = page.getByRole("listbox");
  const activeId = () => sizeBox.getAttribute("aria-activedescendant");
  const optText = async () => page.locator(`[id="${await activeId()}"]`).textContent();
  check("selector: se abre con la opción elegida activa", (await lb.isVisible()) && (await optText()) === "Medium");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  check("selector: las flechas se saltan la opción desactivada", (await optText()) === "Small", await optText());
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await sleep(700);
  check("selector: Enter elige y cierra, con el foco en el campo", (await page.locator(".mochi-menu-root").count()) === 0 && /Large/.test((await sizeBox.textContent()) ?? "") && (await page.evaluate(() => document.activeElement?.getAttribute("role"))) === "combobox");
  const country = page.getByRole("combobox", { name: "Country" });
  await country.focus();
  await page.keyboard.type("sp", { delay: 60 });
  await sleep(500);
  check("selector: escribir con el campo cerrado lo abre en la opción que empieza así", (await country.getAttribute("aria-expanded")) === "true" && (await page.locator(`[id="${await country.getAttribute("aria-activedescendant")}"]`).textContent()) === "Spain");
  await page.keyboard.press("Escape");
  await sleep(600);
  check("selector: Esc cierra sin cambiar nada", /Choose a country/.test((await country.textContent()) ?? ""));
  await country.click();
  await sleep(600);
  await page.getByRole("option", { name: "Japan" }).click();
  await sleep(700);
  check("selector: al elegir con el ratón el foco sigue en el campo", (await page.evaluate(() => document.activeElement?.getAttribute("role"))) === "combobox");
  check("selector: un clic en una opción la elige", /Japan/.test((await country.textContent()) ?? "") && (await page.locator('select[aria-hidden="true"]').nth(1).inputValue()) === "japan");
  await page.screenshot({ path: `${OUT}/select.png` });
  await sizeBox.focus();
  await page.keyboard.press("Enter");
  await sleep(500);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press(" ");
  await sleep(600);
  await page.keyboard.press("Enter");
  await sleep(500);
  check("selector: tras elegir con espacio, Enter lo vuelve a abrir", (await sizeBox.getAttribute("aria-expanded")) === "true");
  await page.keyboard.press("Escape");
  await sleep(500);

  // --- acordeón
  await page.goto(URL_ + "#/accordion");
  await sleep(500);
  const faq = page.locator(".demo-accordion").first();
  const regionOf = async trigger => page.locator(`[id="${await trigger.getAttribute("aria-controls")}"]`);
  const ship = faq.getByRole("button", { name: "How long does shipping take?" });
  const ret = faq.getByRole("button", { name: "Can I return an item?" });
  const shipRegion = await regionOf(ship);
  const retRegion = await regionOf(ret);
  const hOf = loc => loc.evaluate(e => e.getBoundingClientRect().height);
  const shipOpenH = await hOf(shipRegion);
  await ret.click();
  await sleep(90);
  const midRet = await hOf(retRegion), midShip = await hOf(shipRegion);
  await sleep(900);
  const endRet = await hOf(retRegion);
  check("acordeón: abrir una la despliega con muelle", midRet > 4 && midRet < endRet - 4, `a los 90 ms ${midRet.toFixed(0)} de ${endRet.toFixed(0)}`);
  check("acordeón: y la que estaba abierta se recoge a la vez", midShip < shipOpenH - 4 && midShip > 1, `a los 90 ms ${midShip.toFixed(0)} de ${shipOpenH.toFixed(0)}`);
  check("acordeón: la cerrada queda oculta, pero la búsqueda del navegador la encuentra", (await shipRegion.getAttribute("hidden")) === "until-found" && (await ship.getAttribute("aria-expanded")) === "false" && (await ret.getAttribute("aria-expanded")) === "true");
  await page.screenshot({ path: `${OUT}/accordion.png` });
  await ship.focus();
  await page.keyboard.press("ArrowDown");
  const f1 = await focusedName(page);
  await page.keyboard.press("End");
  const f2 = await focusedName(page);
  await page.keyboard.press("Home");
  const f3 = await focusedName(page);
  check("acordeón: flechas, Inicio y Fin entre cabeceras", f1 === "Can I return an item?" && f2 === "Do you offer gift wrapping?" && f3 === "How long does shipping take?", `${f1} · ${f2} · ${f3}`);
  const settings = page.locator(".demo-accordion").nth(1);
  const team = settings.getByRole("button", { name: "Team" });
  await team.click();
  await sleep(700);
  await settings.getByRole("textbox", { name: "Invite by email" }).fill("ada@example.com");
  await team.click();
  await sleep(900);
  await team.click();
  await sleep(700);
  check("acordeón: lo escrito dentro se conserva al cerrar y abrir", (await settings.getByRole("textbox", { name: "Invite by email" }).inputValue()) === "ada@example.com");
  check("acordeón: una sección desactivada no se abre", (await settings.getByRole("button", { name: "Billing" }).isDisabled()) === true);
  const adv = page.getByRole("button", { name: "Advanced options" });
  const advRegion = page.locator(`[id="${await adv.getAttribute("aria-controls")}"]`);
  await advRegion.evaluate(e => e.dispatchEvent(new Event("beforematch")));
  await sleep(800);
  check("desplegable: si la búsqueda encuentra algo dentro, se abre", (await adv.getAttribute("aria-expanded")) === "true" && (await advRegion.getAttribute("hidden")) === null);

  // --- pestañas con contenido
  await page.goto(URL_ + "#/tabs");
  await sleep(500);
  const tabsCard = page.locator(".tabs-card").first();
  const panelsH = () => tabsCard.locator(".mochi-autoheight").evaluate(e => e.getBoundingClientRect().height);
  const h0 = await panelsH();
  await tabsCard.getByRole("tab", { name: "Activity" }).click();
  await sleep(70);
  const layerX = () =>
    tabsCard.evaluate(c =>
      [...c.querySelectorAll(".mochi-swap__layer")].map(l => ({ leaving: l.hasAttribute("data-leaving"), x: new DOMMatrix(getComputedStyle(l).transform).m41 })),
    );
  const right = await layerX();
  const hMid = await panelsH();
  await sleep(900);
  const h1 = await panelsH();
  check("pestañas: el panel en reposo no lleva transform (lo fijo de dentro sigue a la ventana)", (await tabsCard.locator(".mochi-swap__layer:not([data-leaving])").evaluate(e => getComputedStyle(e).transform)) === "none");
  check("pestañas: hacia la derecha, el panel viejo sale por la izquierda y el nuevo entra por la derecha", right.some(l => l.leaving && l.x < -0.5) && right.some(l => !l.leaving && l.x > 0.5), JSON.stringify(right));
  check("pestañas: la altura se adapta con muelle", hMid > h0 + 2 && hMid < h1 - 2, `${h0.toFixed(0)} → ${hMid.toFixed(0)} → ${h1.toFixed(0)}`);
  const panel = tabsCard.getByRole("tabpanel");
  check("pestañas: el panel se llama como su pestaña", (await page.locator(`[id="${await panel.getAttribute("aria-labelledby")}"]`).textContent()) === "Activity");
  await tabsCard.getByRole("tab", { name: "Overview" }).click();
  await sleep(70);
  const left = await layerX();
  check("pestañas: hacia la izquierda, al revés", left.some(l => l.leaving && l.x > 0.5) && left.some(l => !l.leaving && l.x < -0.5), JSON.stringify(left));
  await sleep(700);

  // --- piezas de movimiento
  await page.goto(URL_ + "#/motion");
  await sleep(500);
  const after = page.getByText("Export the project any time from the menu.");
  const y0 = (await box(after)).y;
  await page.getByRole("button", { name: "Show notice" }).click();
  await sleep(100);
  const yMid = (await box(after)).y;
  await sleep(900);
  const y1 = (await box(after)).y;
  check("Presence: el aviso abre su hueco y lo de debajo se desliza", yMid > y0 + 2 && yMid < y1 - 2, `${y0.toFixed(0)} → ${yMid.toFixed(0)} → ${y1.toFixed(0)}`);
  await page.getByRole("button", { name: "Hide notice" }).click();
  await sleep(1000);
  check("Presence: al quitarlo se va, se desmonta y el hueco se cierra", (await page.getByText("You are offline.").count()) === 0 && Math.abs((await box(after)).y - y0) < 1);
  const nextTask = page.getByText("Pick a cover photo");
  const ty0 = (await box(nextTask)).y;
  await page.getByRole("button", { name: "Remove Send stems to Grace" }).click();
  await sleep(110);
  const tyMid = (await box(nextTask)).y;
  await sleep(900);
  const ty1 = (await box(nextTask)).y;
  check("PresenceGroup: al quitar una fila, las de debajo suben sin saltar", tyMid < ty0 - 2 && tyMid > ty1 + 2 && (await page.getByText("Send stems to Grace").count()) === 0, `${ty0.toFixed(0)} → ${tyMid.toFixed(0)} → ${ty1.toFixed(0)}`);
  await page.getByRole("textbox", { name: "New task" }).fill("Book the studio");
  await page.keyboard.press("Enter");
  await sleep(90);
  const newH = await page.locator(".task-list > li").last().evaluate(e => e.getBoundingClientRect().height);
  await sleep(900);
  const newH1 = await page.locator(".task-list > li").last().evaluate(e => e.getBoundingClientRect().height);
  check("PresenceGroup: la fila nueva abre su hueco", newH < newH1 - 2 && (await page.getByText("Book the studio").count()) === 1, `${newH.toFixed(0)} → ${newH1.toFixed(0)}`);
  // los dos clics seguidos sin esperar a que se quede quieto (Playwright esperaría a que acabe)
  await page.evaluate(() => {
    const btn = n => document.querySelector(`[aria-label="Remove ${n}"]`);
    btn("Mix the second track")?.click();
    setTimeout(() => btn("Pick a cover photo")?.click(), 40);
  });
  await sleep(120);
  const orderMid = await page.locator(".task-list > li").allTextContents();
  const idx = t => orderMid.findIndex(x => x.includes(t));
  check("PresenceGroup: al quitar dos seguidas, las que salen no cambian de orden", idx("Mix") >= 0 && idx("Mix") < idx("Pick") && idx("Pick") < idx("Book"), JSON.stringify(orderMid));
  await sleep(900);
  const card = page.locator(".autoheight-card .mochi-autoheight");
  const ah0 = await hOf(card);
  await page.getByRole("button", { name: "Read more" }).click();
  await sleep(90);
  const ahMid = await hOf(card);
  await sleep(900);
  const ah1 = await hOf(card);
  check("AutoHeight: la tarjeta crece con su texto", ahMid > ah0 + 2 && ahMid < ah1 - 2 && (await card.evaluate(e => e.style.height)) === "", `${ah0.toFixed(0)} → ${ahMid.toFixed(0)} → ${ah1.toFixed(0)}`);

  // --- casilla y botón de opción
  await page.goto(URL_ + "#/checkbox");
  await sleep(600);
  const cbAll = page.getByRole("checkbox", { name: "Back up everything" });
  check("casilla: la de «todas» empieza en mixto", (await cbAll.getAttribute("aria-checked")) === "mixed");
  const cbVideos = page.getByRole("checkbox", { name: "Videos" });
  const vFill = cbVideos.locator(".mochi-choice__fill");
  await cbVideos.click();
  await sleep(50);
  const vMid = await scaleOf(vFill);
  await sleep(800);
  const vEnd = await scaleOf(vFill);
  const vDash = await cbVideos.locator("path").evaluate(e => parseFloat(getComputedStyle(e).strokeDashoffset));
  check("casilla: al marcar, el negro crece desde el centro", vMid > 0.05 && vMid < 0.95 && Math.abs(vEnd - 1) < 0.01, `${vMid.toFixed(2)} → ${vEnd.toFixed(2)}`);
  check("casilla: el check queda dibujado", (await cbVideos.getAttribute("aria-checked")) === "true" && vDash < 0.01, `offset ${vDash}`);
  check("casilla: sin marcar, la marca está oculta", (await page.getByRole("checkbox", { name: "Documents" }).locator("path").evaluate(e => getComputedStyle(e).opacity)) === "0");
  await page.locator("label", { hasText: /^Documents$/ }).click();
  await sleep(300);
  check("casilla: pulsar la etiqueta también marca", (await page.getByRole("checkbox", { name: "Documents" }).getAttribute("aria-checked")) === "true");
  check("casilla: con todas marcadas, la de «todas» deja de estar en mixto", (await cbAll.getAttribute("aria-checked")) === "true");
  await cbAll.focus();
  await page.keyboard.press("Enter");
  await sleep(100);
  check("casilla: Enter no la marca", (await cbAll.getAttribute("aria-checked")) === "true");
  await page.keyboard.press("Space");
  await sleep(100);
  check("casilla: Espacio la desmarca, y con ella a las de dentro", (await cbAll.getAttribute("aria-checked")) === "false" && (await cbVideos.getAttribute("aria-checked")) === "false");
  await page.getByRole("checkbox", { name: "Photos" }).click();
  await sleep(700);
  const dashLen = await cbAll.locator("path").evaluate(e => e.getBBox().width);
  const dashH = await cbAll.locator("path").evaluate(e => e.getBBox().height);
  check("casilla: en mixto, el check se transforma en una raya", (await cbAll.getAttribute("aria-checked")) === "mixed" && dashLen > 6 && dashH < 0.5, `raya ${dashLen.toFixed(1)}×${dashH.toFixed(1)}`);
  await cbAll.click();
  await sleep(100);
  check("casilla: desde mixto, pulsar la marca", (await cbAll.getAttribute("aria-checked")) === "true");
  check("casilla: la desactivada no se puede pulsar", await page.getByRole("checkbox", { name: "Sync over mobile data" }).isDisabled());

  await page.getByRole("checkbox", { name: "Email me product updates" }).focus();
  await page.keyboard.press("Tab");
  check("radio: un solo Tab entra en el grupo, en la elegida", (await focusedLabel(page)) === "Standard");
  const stdFill = page.getByRole("radio", { name: "Standard" }).locator(".mochi-choice__fill");
  await page.keyboard.press("ArrowDown");
  await sleep(60);
  const stdMid = await scaleOf(stdFill);
  check("radio: la flecha elige la siguiente y la enfoca", (await focusedLabel(page)) === "Express" && (await page.getByRole("radio", { name: "Express" }).getAttribute("aria-checked")) === "true");
  check("radio: la que deja de estar elegida se recoge hacia su centro", stdMid > 0.05 && stdMid < 0.95, `escala ${stdMid.toFixed(2)}`);
  await page.keyboard.press("ArrowDown");
  check("radio: las flechas se saltan la desactivada y dan la vuelta", (await focusedLabel(page)) === "Standard" && (await page.getByRole("radio", { name: "Standard" }).getAttribute("aria-checked")) === "true");
  await page.keyboard.press("ArrowUp");
  check("radio: hacia arriba, también", (await focusedLabel(page)) === "Express");
  await page.keyboard.press("Tab");
  check("radio: Tab sale del grupo al siguiente, en su elegida", (await focusedLabel(page)) === "Comfortable");
  await page.locator("label", { hasText: /^Spacious$/ }).click();
  check("radio: pulsar la etiqueta elige", (await page.getByRole("radio", { name: "Spacious" }).getAttribute("aria-checked")) === "true");

  await page.getByRole("button", { name: "Subscribe" }).click();
  await sleep(500);
  const planGroup = page.getByRole("radiogroup", { name: "Plan" });
  const planMsg = await planGroup.evaluate(e => document.getElementById(e.getAttribute("aria-describedby") ?? "")?.textContent);
  check("formulario: sin elegir, el grupo se marca con error y lo explica", (await planGroup.getAttribute("aria-invalid")) === "true" && planMsg === "Choose a plan", planMsg ?? "");
  check("formulario: el foco va a la primera opción", (await focusedLabel(page)) === "Monthly");
  const terms = page.getByRole("checkbox", { name: "I accept the terms of service" });
  check("formulario: la casilla obligatoria también", (await terms.getAttribute("aria-invalid")) === "true");
  await page.screenshot({ path: `${OUT}/choice-error.png`, clip: await box(page.locator('[data-demo="checkbox-formulario"]')) });
  await page.getByRole("radio", { name: "Yearly" }).click();
  await terms.click();
  await page.evaluate(() => {
    const f = document.querySelector('[data-demo="checkbox-formulario"] form');
    f.addEventListener("submit", () => (window.__fd = Object.fromEntries(new FormData(f))), { once: true });
  });
  await page.getByRole("button", { name: "Subscribe" }).click();
  await sleep(300);
  const fd = await page.evaluate(() => window.__fd);
  check("formulario: lo elegido viaja con su nombre", fd?.plan === "yearly" && fd?.terms === "accepted", JSON.stringify(fd));
  check("formulario: al corregirlo, el error se va", (await terms.getAttribute("aria-invalid")) === null && (await planGroup.getAttribute("aria-invalid")) === null);
  await sleep(1500);

  // --- progreso
  await page.goto(URL_ + "#/progress");
  await sleep(600);
  const upBar = page.locator('[data-demo="progress-subida"] .mochi-progress [role="progressbar"]');
  const upRing = page.getByRole("progressbar", { name: "Upload" });
  check("progreso: la barra anuncia su valor", (await upBar.getAttribute("aria-valuenow")) === "0" && (await upBar.getAttribute("aria-valuemax")) === "100");
  // sin dibujar, el check no asoma (Safari pinta un punto en el extremo de un trazo vacío)
  check("progreso: antes de terminar, el check del anillo está oculto", (await upRing.locator(".mochi-ring__check").evaluate(e => getComputedStyle(e).opacity)) === "0");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await sleep(150);
  check("progreso: sin valor, indeterminado (sin aria-valuenow)", (await upBar.getAttribute("aria-valuenow")) === null && (await upRing.getAttribute("aria-valuenow")) === null);
  const trackW = (await box(upBar)).width;
  // [instante, borde izquierdo, lo que se ve del tramo, giro del anillo] en cada fotograma, mientras
  // la demo se prepara (1,6 s)
  const indeterminate = await sampleFrames(page, () => {
    const b = document.querySelector('[data-demo="progress-subida"] .mochi-progress__bar').getBoundingClientRect();
    const t = document.querySelector('[data-demo="progress-subida"] .mochi-progress__track').getBoundingClientRect();
    const a = parseFloat(document.querySelector('[data-demo="progress-subida"] .mochi-ring__arc').style.strokeDashoffset);
    return [performance.now(), b.left - t.left, Math.max(0, Math.min(b.right, t.right) - Math.max(b.left, t.left)), a];
  }, 1300);
  const seen = indeterminate.map(x => x[2]);
  const speeds = indeterminate.slice(1).map((x, i) => (x[1] - indeterminate[i][1]) / (x[0] - indeterminate[i][0])).filter(v => v > 0);
  const median = [...speeds].sort((a, b) => a - b)[Math.floor(speeds.length / 2)];
  check("progreso: lo indeterminado recorre la barra", indeterminate.some(x => x[1] > trackW * 0.5) && indeterminate.some(x => x[1] < trackW * 0.3));
  check("progreso: y va a velocidad constante, sin trompicones", speeds.length > 30 && speeds.every(v => Math.abs(v - median) < median * 0.2), `${Math.min(...speeds).toFixed(2)}–${Math.max(...speeds).toFixed(2)} px/ms`);
  const turns = indeterminate.slice(1).map((x, i) => ((((indeterminate[i][3] - x[3]) % 1) + 1) % 1) / (x[0] - indeterminate[i][0]));
  const turnMedian = [...turns].sort((a, b) => a - b)[Math.floor(turns.length / 2)];
  check("progreso: el anillo gira a ritmo constante", turns.length > 20 && turns.every(v => Math.abs(v - turnMedian) < turnMedian * 0.2), `${Math.min(...turns).toFixed(5)}–${Math.max(...turns).toFixed(5)} vueltas/ms`);
  check("progreso: sale estirándose y se encoge contra el final", seen.some(w => w > 0 && w < trackW * 0.1) && seen.some(w => Math.abs(w - trackW * 0.3) < 2), `se ven de ${Math.min(...seen.filter(w => w > 0)).toFixed(0)} a ${Math.max(...seen).toFixed(0)} px`);
  await page.screenshot({ path: `${OUT}/progress.png`, clip: await box(page.locator('[data-demo="progress-subida"]')) });
  // desde que llega el primer valor, el borde avanza sin saltos
  await page.waitForFunction(() => document.querySelector('[data-demo="progress-subida"] .mochi-progress [role="progressbar"]').hasAttribute("aria-valuenow"), null, { timeout: 4000 });
  // (primero el tramo se transforma en el relleno; se mide cuando ya solo cambia el valor)
  await sleep(800);
  const edge = await sampleFrames(page, () => {
    const b = document.querySelector('[data-demo="progress-subida"] .mochi-progress__bar').getBoundingClientRect();
    const t = document.querySelector('[data-demo="progress-subida"] .mochi-progress__track').getBoundingClientRect();
    return b.right - t.left;
  }, 1500);
  const jumps = edge.slice(1).map((x, i) => x - edge[i]);
  check("progreso: el valor avanza con un muelle, sin saltos", edge.length > 30 && Math.max(...jumps.map(Math.abs)) < trackW * 0.06, `salto máximo ${Math.max(...jumps.map(Math.abs)).toFixed(1)} px de ${trackW.toFixed(0)}`);
  await page.waitForFunction(() => document.querySelector('[data-demo="progress-subida"] .mochi-progress [role="progressbar"]').getAttribute("aria-valuenow") === "100", null, { timeout: 12000 });
  await sleep(1200);
  const doneW = (await box(page.locator('[data-demo="progress-subida"] .mochi-progress__bar'))).width;
  check("progreso: al terminar, la barra llega al final", Math.abs(doneW - trackW) < 1, `${doneW} de ${trackW}`);
  const discR = await upRing.locator(".mochi-ring__disc").evaluate(e => parseFloat(e.getAttribute("r")));
  const ringCheck = await upRing.locator(".mochi-ring__check").evaluate(e => parseFloat(getComputedStyle(e).strokeDashoffset));
  check("progreso: el anillo se llena y se transforma en el check", discR > 11.9 && ringCheck < 0.01 && (await upRing.locator(".mochi-ring__check").evaluate(e => getComputedStyle(e).opacity)) === "1", `r ${discR}, check ${ringCheck}`);
  check("progreso: el texto del valor acaba en 100 %", (await page.locator('[data-demo="progress-subida"] .mochi-progress__value').textContent()) === "100%");
  const storage = page.getByRole("progressbar", { name: "Storage" });
  check("progreso: con formatValue, lo anuncia con su texto", (await storage.getAttribute("aria-valuetext")) === "6.4 of 10 GB");

  // --- esqueleto de carga
  await page.goto(URL_ + "#/skeleton");
  await sleep(300);
  const skSwap = page.locator('[data-demo="skeleton-cambio a contenido"] .mochi-skeleton-swap');
  check("esqueleto: mientras carga, el contenedor está ocupado", (await skSwap.getAttribute("aria-busy")) === "true" && (await skSwap.getByText("Loading").count()) === 1);
  check("esqueleto: el brillo recorre las formas", (await page.locator(".mochi-skeleton").first().evaluate(e => getComputedStyle(e).animationName)) === "mochi-shimmer");
  await sleep(2200);
  const skH1 = await hOf(skSwap);
  check("esqueleto: al llegar, el contenido sustituye al esqueleto", (await skSwap.getAttribute("aria-busy")) === null && (await skSwap.getByText("Ada Lovelace").isVisible()) && (await skSwap.locator(".mochi-skeleton").count()) === 0);
  await page.getByRole("button", { name: "Reload" }).click();
  await sleep(1000);
  const skH0 = await hOf(skSwap);
  const skHs = await sampleFrames(page, () => document.querySelector('[data-demo="skeleton-cambio a contenido"] .mochi-skeleton-swap').getBoundingClientRect().height, 2000);
  const between = skHs.filter(v => v < skH0 - 2 && v > skH1 + 2).length;
  check("esqueleto: la altura se adapta con un muelle", skH0 > skH1 + 20 && between >= 4 && Math.abs(skHs[skHs.length - 1] - skH1) < 1, `${skH0.toFixed(0)} → ${skH1.toFixed(0)}, ${between} fotogramas entre medias`);
  await page.screenshot({ path: `${OUT}/skeleton.png`, clip: await box(page.locator('[data-demo="skeleton-formas"]')) });

  // --- casos límite de casillas, radios, progreso y esqueleto
  await page.goto(URL_ + "#/_cases/choice-forms");
  await sleep(500);
  const formData = () => page.evaluate(() => [...new FormData(document.getElementById("f1")).entries()].map(([k, v]) => `${k}=${v}`).join("&"));
  check("formulario: lo desactivado no viaja (casilla, grupo, opción elegida o fieldset)", (await formData()) === "r1=a", await formData());
  check('radio: sin valor de partida no hay ninguna elegida, aunque una valga ""', (await page.getByRole("radio", { name: "Any" }).getAttribute("aria-checked")) === "false");
  await page.getByRole("checkbox", { name: "One" }).click();
  const radiosGroup = page.getByRole("radiogroup", { name: "Radios" });
  await radiosGroup.getByRole("radio", { name: "Beta" }).click();
  await page.getByRole("radio", { name: "Any" }).click();
  await sleep(200);
  check('formulario: lo elegido viaja, también un valor ""', (await formData()) === "c1=on&r1=b&r4=", await formData());
  await page.click("#reset");
  await sleep(300);
  const afterReset = [
    await page.getByRole("checkbox", { name: "One" }).getAttribute("aria-checked"),
    await radiosGroup.getByRole("radio", { name: "Alpha" }).getAttribute("aria-checked"),
    await page.getByRole("radio", { name: "Any" }).getAttribute("aria-checked"),
  ].join(",");
  check("formulario: al reiniciarlo, vuelve a como empezó y envía lo que se ve", afterReset === "false,true,false" && (await formData()) === "r1=a", `${afterReset} · ${await formData()}`);
  const c3 = page.locator("#c3");
  const c3Label = await box(page.locator("label", { hasText: "In a disabled fieldset" }));
  await page.mouse.move(c3Label.x + 10, c3Label.y + c3Label.height / 2);
  await page.mouse.down();
  await sleep(200);
  const c3Scale = await scaleOf(c3);
  await page.mouse.up();
  check("casilla: en un fieldset desactivado se ve desactivada y no se hunde", Math.abs(c3Scale - 1) < 0.001 && (await c3.evaluate(e => getComputedStyle(e).opacity)) === "0.45", `escala ${c3Scale}`);
  await page.locator("#c1").focus();
  await page.keyboard.down("Space");
  await sleep(200);
  const heldScale = await scaleOf(page.locator("#c1"));
  await page.keyboard.press("Tab");
  await page.keyboard.up("Space");
  await sleep(500);
  check("casilla: con Espacio pulsado y el foco fuera, deja de estar hundida", heldScale < 0.95 && Math.abs((await scaleOf(page.locator("#c1"))) - 1) < 0.001, `${heldScale.toFixed(2)} → ${(await scaleOf(page.locator("#c1"))).toFixed(2)}`);

  await page.goto(URL_ + "#/_cases/progress-edges");
  await sleep(500);
  const valueText = id => page.locator(".mochi-progress", { has: page.locator(id) }).locator(".mochi-progress__value");
  check("progreso: un valor que no es un número (0/0) cuenta como indeterminado", (await page.locator("#p-nan").getAttribute("aria-valuenow")) === null && (await page.locator("#r-nan").getAttribute("aria-valuenow")) === null);
  check("progreso: con max 0, la cifra es 0 %", (await valueText("#p-max0").textContent()) === "0%");
  await page.click("#to60");
  await sleep(1200);
  const nanBar = await box(page.locator("#p-nan .mochi-progress__bar"));
  const nanTrack = await box(page.locator("#p-nan"));
  check("progreso: tras un NaN, un valor bueno se pinta bien", Math.abs(nanBar.x + nanBar.width - nanTrack.x - nanTrack.width * 0.6) < 1 && (await valueText("#p-nan").textContent()) === "60%", `${(nanBar.x + nanBar.width - nanTrack.x).toFixed(0)} de ${nanTrack.width}`);
  await page.click("#toNull");
  await sleep(600);
  await page.click("#to7");
  const texts = await sampleFrames(page, () => [...document.querySelectorAll(".mochi-progress__value")].map(e => e.textContent).join("|"), 700);
  const pct = texts.map(t => parseInt(t.split("|")[0], 10));
  const files = texts.map(t => t.split("|")[2]);
  check("progreso: al llegar un valor, la cifra cuenta desde 0 (no desde el tramo)", pct.every(x => x >= 0 && x <= 7) && pct[pct.length - 1] === 7, pct.join(","));
  check("progreso: con valores enteros, la cifra pasa por enteros", files.every(f => /^\d+ of 12 files$/.test(f)) && files[files.length - 1] === "7 of 12 files", [...new Set(files)].join(" | "));

  await page.goto(URL_ + "#/_cases/skeleton-stale");
  await sleep(400);
  await page.click("#bump");
  await page.click("#bump");
  await sleep(200);
  const leavingText = await page.evaluate(async () => {
    document.getElementById("load").click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.querySelector("#sk .mochi-swap__layer[data-leaving]")?.textContent;
  });
  check("esqueleto: al volver a cargar, lo que se va es lo último que se veía", leavingText === "content v3", leavingText ?? "sin capa");
  const lineW = await page.locator("#lines .mochi-skeleton").evaluateAll(els => els.map(e => e.getBoundingClientRect().width));
  check("esqueleto: con ancho propio, la última línea es más corta", lineW[0] === 120 && lineW[1] === 120 && lineW[2] < 120, JSON.stringify(lineW));

  // --- panel flotante
  await page.goto(URL_ + "#/popover");
  await sleep(500);
  const filters = page.getByRole("button", { name: "Filters" });
  check("panel flotante: el botón anuncia que abre un panel", (await filters.getAttribute("aria-haspopup")) === "dialog" && (await filters.getAttribute("aria-expanded")) === "false");
  const fb = await box(filters);
  await filters.click();
  await sleep(70);
  const pMid = await box(page.getByRole("dialog", { name: "Show" }));
  await sleep(700);
  const pEnd = await box(page.getByRole("dialog", { name: "Show" }));
  check("panel flotante: el botón se transforma en el panel", pMid.width > fb.width + 2 && pMid.width < pEnd.width - 2 && (await filters.evaluate(e => getComputedStyle(e).opacity)) === "0", `${fb.width.toFixed(0)} → ${pMid.width.toFixed(0)} → ${pEnd.width.toFixed(0)}`);
  check("panel flotante: el foco entra en el primer control", (await focusedLabel(page)) === "Photos");
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  await sleep(700);
  check("panel flotante: Tab al salir lo cierra y el foco sigue por la página", (await focusedName(page)) === "Ada Lovelace" && (await page.getByRole("dialog").count()) === 0);
  await page.keyboard.press("Enter");
  await sleep(700);
  check("panel flotante: con teclado, el foco entra en el panel", (await focusedName(page)) === "Message" && (await page.getByRole("dialog", { name: "Ada Lovelace" }).count()) === 1);
  await page.keyboard.press("Escape");
  await sleep(700);
  check("panel flotante: Esc lo cierra y el foco vuelve al botón", (await page.getByRole("dialog").count()) === 0 && (await focusedName(page)) === "Ada Lovelace");
  await filters.click();
  await sleep(600);
  const navTodos = await box(page.getByRole("link", { name: "Todos" }));
  await page.mouse.click(navTodos.x + 10, navTodos.y + navTodos.height / 2);
  await sleep(700);
  check("panel flotante: tocar fuera lo cierra sin pulsar lo de debajo", (await page.getByRole("dialog").count()) === 0 && (await page.evaluate(() => location.hash)) === "#/popover" && (await filters.evaluate(e => getComputedStyle(e).opacity)) === "1");
  await filters.click();
  await sleep(600);
  await page.getByRole("checkbox", { name: "Photos" }).click();
  await page.getByRole("button", { name: "Apply" }).click();
  await sleep(700);
  check("panel flotante: el contenido puede cerrarlo (Apply)", (await page.getByRole("dialog").count()) === 0 && (await page.getByText("Mostrando: Videos").count()) === 1);
  await page.screenshot({ path: `${OUT}/popover.png` });

  // --- panel lateral
  await page.goto(URL_ + "#/drawer");
  await sleep(500);
  const editDetails = page.getByRole("button", { name: "Edit details" });
  await editDetails.click();
  await sleep(80);
  const drawer = page.getByRole("dialog", { name: "Project details" });
  const dwMid = await box(drawer);
  await sleep(800);
  const dwEnd = await box(drawer);
  check("panel lateral: entra deslizándose desde la derecha, de toda la altura", dwMid.x > dwEnd.x + 10 && Math.abs(dwEnd.x + dwEnd.width - 1272) < 1 && Math.abs(dwEnd.height - 1484) < 1, `x ${dwMid.x.toFixed(0)} → ${dwEnd.x.toFixed(0)}, alto ${dwEnd.height}`);
  check("panel lateral: el foco entra en el primer campo", (await page.evaluate(() => document.activeElement?.closest("label, .mochi-field")?.textContent ?? "")).includes("Name"));
  for (let i = 0; i < 9; i++) await page.keyboard.press("Tab");
  check("panel lateral: Tab no se sale del panel", await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')));
  await page.screenshot({ path: `${OUT}/drawer.png` });
  const desc = await box(page.getByText("Changes are shared with everyone on the project."));
  await page.mouse.move(desc.x + 20, desc.y + desc.height / 2);
  await page.mouse.down();
  await page.mouse.move(desc.x + 90, desc.y + desc.height / 2, { steps: 5 });
  await sleep(30);
  const dwDrag = await box(drawer);
  await page.mouse.up();
  await sleep(900);
  const dwBack = await box(drawer);
  check("panel lateral: sigue al arrastre y, soltado pronto, vuelve", dwDrag.x - dwEnd.x > 40 && Math.abs(dwBack.x - dwEnd.x) < 1, `${dwEnd.x.toFixed(0)} → ${dwDrag.x.toFixed(0)} → ${dwBack.x.toFixed(0)}`);
  await page.mouse.move(desc.x + 20, desc.y + desc.height / 2);
  await page.mouse.down();
  await page.mouse.move(desc.x + 260, desc.y + desc.height / 2, { steps: 4 });
  await page.mouse.up();
  await sleep(900);
  check("panel lateral: arrastrado hacia su borde se cierra y el foco vuelve", (await page.getByRole("dialog").count()) === 0 && (await focusedName(page)) === "Edit details");
  await page.getByRole("button", { name: "Open menu" }).click();
  await sleep(800);
  const nav = await box(page.getByRole("dialog", { name: "Mochi" }));
  check("panel lateral: con side=left entra por la izquierda", Math.abs(nav.x - 8) < 1, `x ${nav.x}`);
  await page.mouse.click(1100, 700);
  await sleep(800);
  check("panel lateral: tocar el fondo lo cierra sin pulsar lo de debajo", (await page.getByRole("dialog").count()) === 0 && (await page.evaluate(() => location.hash)) === "#/drawer");
  await page.getByRole("button", { name: "Open menu" }).click();
  await sleep(700);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await sleep(800);
  check("panel lateral: la X lo cierra", (await page.getByRole("dialog").count()) === 0);
  await page.getByRole("button", { name: "Open menu" }).click();
  await sleep(700);
  await page.keyboard.press("Escape");
  await sleep(800);
  check("panel lateral: Esc lo cierra y el foco vuelve", (await page.getByRole("dialog").count()) === 0 && (await focusedName(page)) === "Open menu");

  // --- lista que se reordena
  await page.goto(URL_ + "#/reorder");
  await sleep(500);
  const titles = () => page.locator(".track__title").allTextContents();
  const rowOf = t => page.locator(".mochi-reorder__item", { hasText: t });
  const nd = await box(page.getByRole("button", { name: "Reorder Night Drive" }));
  const gh0 = await box(rowOf("Glass Harbour"));
  await page.mouse.move(nd.x + nd.width / 2, nd.y + nd.height / 2);
  await page.mouse.down();
  await page.mouse.move(nd.x + nd.width / 2, nd.y + nd.height / 2 + 125, { steps: 8 });
  await sleep(60);
  const ghMid = await box(rowOf("Glass Harbour"));
  const ndMid = await box(rowOf("Night Drive"));
  check("reordenar: la fila sigue al puntero y las demás le hacen hueco", ghMid.y < gh0.y - 2 && Math.abs(ndMid.y + ndMid.height / 2 - (nd.y + nd.height / 2 + 125)) < 12, `Glass ${gh0.y.toFixed(0)} → ${ghMid.y.toFixed(0)}`);
  check("reordenar: la fila que se mueve se levanta", (await scaleOf(rowOf("Night Drive"))) > 1.01);
  await page.screenshot({ path: `${OUT}/reorder.png`, clip: await box(page.locator('[data-demo="reorder-lista"]')) });
  await page.mouse.up();
  await sleep(900);
  check("reordenar: al soltar cambia el orden", (await titles()).join(",") === "Glass Harbour,Paper Moons,Night Drive,Afterglow,Soft Machines", (await titles()).join(","));
  check("reordenar: y la fila se asienta en su hueco", Math.abs((await scaleOf(rowOf("Night Drive"))) - 1) < 0.001 && (await rowOf("Night Drive").evaluate(e => e.style.transform)) === "");
  const pm = await box(page.getByRole("button", { name: "Reorder Paper Moons" }));
  await page.mouse.move(pm.x + pm.width / 2, pm.y + pm.height / 2);
  await page.mouse.down();
  await page.mouse.move(pm.x + pm.width / 2, pm.y + pm.height / 2 + 600, { steps: 10 });
  await sleep(60);
  const pastEnd = (await box(rowOf("Paper Moons"))).y - (await box(rowOf("Soft Machines"))).y;
  await page.mouse.up();
  await sleep(900);
  check("reordenar: más allá de la última se resiste y cae la última", pastEnd > 0 && pastEnd < 300 && (await titles())[4] === "Paper Moons", `se pasa ${pastEnd.toFixed(0)} px de 600`);
  await page.getByRole("button", { name: "Reset" }).click();
  await sleep(900);
  await page.getByRole("button", { name: "Reorder Night Drive" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await sleep(400);
  const reorderLive = page.locator('.mochi-reorder ~ [role="status"]');
  check("reordenar: con teclado, cada paso se anuncia", (await reorderLive.textContent()) === "Night Drive, position 3 of 5.", await reorderLive.textContent());
  await page.keyboard.press("Space");
  await sleep(700);
  check("reordenar: Espacio la suelta en su sitio nuevo", (await titles()).join(",") === "Glass Harbour,Paper Moons,Night Drive,Afterglow,Soft Machines" && (await reorderLive.textContent()) === "Dropped Night Drive at position 3 of 5.", (await titles()).join(","));
  check("reordenar: el asa sigue enfocada tras soltar", (await focusedName(page)) === "Reorder Night Drive");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await sleep(700);
  check("reordenar: Esc la devuelve a su sitio", (await titles())[2] === "Night Drive" && (await reorderLive.textContent()) === "Cancelled. Night Drive is back at position 3 of 5.");
  // Afterglow pasa de la cuarta a la primera
  const sm0 = await box(rowOf("Afterglow"));
  await page.getByRole("button", { name: "Sort A–Z" }).click();
  await sleep(90);
  const smMid = await box(rowOf("Afterglow"));
  await sleep(900);
  const smEnd = await box(rowOf("Afterglow"));
  check("reordenar: un cambio de orden desde fuera también se anima", Math.abs(smMid.y - sm0.y) > 4 && Math.abs(smMid.y - smEnd.y) > 4, `${sm0.y.toFixed(0)} → ${smMid.y.toFixed(0)} → ${smEnd.y.toFixed(0)}`);

  // --- Studio, la app de demostración: los componentes juntos, como en un proyecto
  await page.goto(URL_ + "#/");
  await sleep(400);
  await page.getByRole("tab", { name: "Demo" }).click();
  await sleep(250);
  const studioList = page.locator(".studio .mochi-skeleton-swap");
  check("demo: el selector lleva a la app y la lista carga con esqueleto", (await page.evaluate(() => location.hash)) === "#/demo" && (await studioList.getAttribute("aria-busy")) === "true");
  await sleep(1500);
  const rows = page.locator(".studio-project");
  check("demo: después se ven los proyectos", (await rows.count()) === 5 && (await studioList.getAttribute("aria-busy")) === null);
  await page.screenshot({ path: `${OUT}/studio.png` });
  await page.getByRole("textbox", { name: "Search" }).fill("kernel");
  await sleep(900);
  check("demo: buscar filtra la lista", (await rows.count()) === 1 && (await rows.first().textContent()).includes("Kernel Panic"));
  await page.getByRole("textbox", { name: "Search" }).fill("");
  await sleep(900);
  await page.getByRole("button", { name: "Filters" }).click();
  await sleep(600);
  await page.getByRole("checkbox", { name: "Draft" }).click();
  // al cerrar, el panel vuelve al botón tal como queda (negro y «Filters · 2»), no como era
  const landing = sampleFrames(page, () => {
    const g = document.querySelector(".mochi-popover__ghost");
    return g && parseFloat(getComputedStyle(g).opacity) > 0.01 ? g.textContent : null;
  }, 500);
  await page.getByRole("button", { name: "Done" }).click();
  const landed = (await landing).filter(t => t !== null);
  check("panel flotante: al cerrar aterriza en el botón como ha quedado", landed.length > 3 && landed.every(t => t.includes("Filters · 2")), [...new Set(landed)].join(" | "));
  await sleep(900);
  check("demo: el panel de filtros filtra y el botón lo dice", (await rows.count()) === 3 && (await page.getByRole("button", { name: "Filters · 2" }).count()) === 1);
  // el botón pasa de surface a solid: su texto sigue al tono nuevo (antes, negro sobre negro)
  const filtLabel = await page.getByRole("button", { name: "Filters · 2" }).evaluate(e => {
    const l = e.querySelector(".mochi-swap__layer:not([data-leaving])");
    return [getComputedStyle(e).backgroundColor, getComputedStyle(l).color];
  });
  check("botón: al cambiar de variante, el texto cambia de color con él", filtLabel[0] !== filtLabel[1] && filtLabel[1] === "rgb(255, 255, 255)", filtLabel.join(" · "));
  await page.getByRole("button", { name: "Filters · 2" }).click();
  await sleep(600);
  await page.getByRole("button", { name: "Reset" }).click();
  await sleep(900);
  await page.getByRole("button", { name: "Actions for Field Notes" }).click();
  await sleep(600);
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await sleep(800);
  const renameField = page.getByRole("textbox", { name: "Project name" });
  check("demo: renombrar abre la ventana con el nombre", (await renameField.inputValue()) === "Field Notes");
  await renameField.fill("Field Recordings");
  await page.keyboard.press("Enter");
  await sleep(900);
  check("demo: y lo renombra", (await page.getByRole("dialog").count()) === 0 && (await page.locator(".studio-project", { hasText: "Field Recordings" }).count()) === 1);
  await page.getByRole("button", { name: "Actions for Kernel Panic" }).click();
  await sleep(600);
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await sleep(800);
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await sleep(1700);
  check("demo: borrar pide confirmación, lo quita y ofrece deshacer", (await page.locator(".studio-project", { hasText: "Kernel Panic" }).count()) === 0 && (await page.getByRole("button", { name: "Undo" }).count()) === 1);
  await page.getByRole("button", { name: "Undo" }).click();
  await sleep(1000);
  check("demo: deshacer lo devuelve", (await page.locator(".studio-project", { hasText: "Kernel Panic" }).count()) === 1);
  // desde el botón negro, la ventana crece desenfocada mientras queda negro y llega nítida
  const growBlurs = sampleFrames(page, () => {
    const f = document.querySelector('[role="dialog"]')?.style.filter ?? "";
    return f ? parseFloat(f.slice(5)) : 0;
  }, 900);
  await page.getByRole("button", { name: "New project" }).first().click();
  const gb = await growBlurs;
  check("demo: «New project» crece desde el botón negro con los bordes desenfocados y acaba nítido", Math.max(...gb) > 3 && gb[gb.length - 1] === 0, `máx ${Math.max(...gb).toFixed(1)}px, final ${gb[gb.length - 1]}`);
  await page.keyboard.press("Escape");
  await sleep(900);
  await page.keyboard.press("Control+k");
  await sleep(500);
  await page.keyboard.type("new pro");
  await page.keyboard.press("Enter");
  await sleep(900);
  check("demo: ⌘K abre la paleta de la app y crea un proyecto", (await page.getByRole("dialog", { name: "New project" }).count()) === 1 && (await page.evaluate(() => document.activeElement?.closest(".mochi-field")?.textContent ?? "")).includes("Project name"));
  await page.keyboard.type("Demo Tape");
  await page.getByRole("radio", { name: "Band" }).click();
  await page.getByRole("button", { name: "Create" }).click();
  await sleep(1800);
  check("demo: el proyecto nuevo aparece en la lista", (await page.locator(".studio-project", { hasText: "Demo Tape" }).count()) === 1);
  await page.locator(".studio-project__main", { hasText: "Night Drive" }).click();
  await sleep(700);
  check("demo: abrir un proyecto", (await page.getByRole("heading", { name: "Night Drive", level: 1 }).count()) === 1);
  await page.getByRole("tab", { name: "Tracks" }).click();
  await sleep(700);
  await page.getByRole("button", { name: "Play Glass Harbour" }).click();
  await sleep(900);
  check("demo: reproducir una pista saca el reproductor abajo", (await page.locator(".studio-dock .mochi-player-host").count()) === 1 && (await page.getByRole("button", { name: "Pause Glass Harbour" }).count()) === 1);
  await page.getByRole("button", { name: "Reorder Night Drive" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await sleep(800);
  check("demo: las pistas se reordenan", (await page.locator(".studio-track__title").allTextContents()).slice(0, 2).join(",") === "Glass Harbour,Night Drive");
  await page.getByRole("button", { name: "Upload stem" }).click();
  await sleep(300);
  check("demo: subir enseña el progreso sin valor mientras prepara", (await page.getByRole("progressbar", { name: "Preparing stem…" }).getAttribute("aria-valuenow")) === null);
  await page.waitForFunction(() => [...document.querySelectorAll(".studio-track__title")].some(e => e.textContent === "Stem 6"), null, { timeout: 12000 });
  check("demo: y al terminar añade la pista", (await page.locator(".studio-track__title").count()) === 6);
  await page.getByRole("button", { name: "Share" }).click();
  await sleep(700);
  check("demo: compartir abre su panel", (await page.getByRole("dialog", { name: "Share project" }).count()) === 1);
  await page.getByRole("button", { name: "Copy link" }).click();
  await sleep(700);
  check("demo: copiar el enlace lo cierra y avisa", (await page.getByRole("dialog").count()) === 0 && (await page.getByText("Link copied").count()) === 1);
  await page.getByRole("button", { name: "Edit details" }).click();
  await sleep(900);
  const editName = page.getByRole("dialog", { name: "Edit details" }).getByRole("textbox", { name: "Name" });
  await editName.fill("Night Drive (Remix)");
  await page.getByRole("button", { name: "Save" }).click();
  await sleep(900);
  check("demo: el panel lateral edita los detalles", (await page.getByRole("heading", { name: "Night Drive (Remix)", level: 1 }).count()) === 1);
  // abrir una sección de los ajustes dentro de las pestañas: las pestañas siguen su alto sin
  // recortar la tarjeta (esquinas y sombra enteras)
  await page.getByRole("tab", { name: "Settings" }).click();
  await sleep(900);
  const tabClip = sampleFrames(page, () => {
    const item = [...document.querySelectorAll(".studio .mochi-accordion__item")].find(e => e.textContent.startsWith("Delete project"));
    return [document.querySelector(".studio .mochi-tabs__panels").style.overflow, item.querySelector(".mochi-accordion__region").offsetHeight];
  }, 700);
  await page.getByRole("button", { name: "Delete project" }).first().click();
  const tc = await tabClip;
  check("demo: abrir una sección de los ajustes no recorta la tarjeta", new Set(tc.map(x => x[1])).size > 4 && tc.every(x => x[0] !== "hidden"), `${tc.filter(x => x[0] === "hidden").length} fotogramas recortados de ${tc.length}`);
  // cambiar de página: la vieja sale y la nueva entra (dos capas un momento, luego una)
  const pageLayers = sampleFrames(page, () => document.querySelectorAll(".studio > .mochi-swap > .mochi-swap__layer").length, 800);
  await page.getByRole("link", { name: "Settings" }).click();
  const layersSeen = await pageLayers;
  check("demo: al cambiar de página, la vieja se funde en la nueva", Math.max(...layersSeen) === 2 && layersSeen[layersSeen.length - 1] === 1, layersSeen.join(""));
  const emailField = page.getByRole("textbox", { name: "Email" });
  await emailField.fill("ada@");
  await page.getByRole("button", { name: "Save changes" }).click();
  await sleep(600);
  check("demo: en ajustes, un correo mal escrito se marca y se enfoca", (await emailField.getAttribute("aria-invalid")) === "true" && (await page.evaluate(() => document.activeElement?.getAttribute("name"))) === "email");
  await emailField.fill("ada@studio.example");
  await page.getByRole("checkbox", { name: "Weekly digest" }).click();
  check("demo: con todas las avisos marcados, la casilla general deja el mixto", (await page.getByRole("checkbox", { name: "Email me about" }).getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: "Save changes" }).click();
  await sleep(1600);
  check("demo: guardar los ajustes avisa", (await page.getByText("Settings saved").count()) === 1);
  await page.getByRole("link", { name: "Help" }).click();
  await sleep(600);
  await page.getByRole("button", { name: "Search Studio" }).click();
  await sleep(600);
  check("demo: la ayuda abre la paleta", (await page.getByRole("dialog", { name: "Command palette" }).count()) === 1);
  await page.keyboard.press("Escape");
  await sleep(600);
  await page.getByRole("tab", { name: "Lista" }).click();
  await sleep(500);
  check("demo: el selector vuelve a la lista donde estaba", (await page.evaluate(() => location.hash)) === "#/" && (await page.locator('[data-demo="button"]').count()) === 1);

  // --- casos límite de las superposiciones
  await page.goto(URL_ + "#/_cases/menu-tooltip");
  await sleep(500);
  for (const [id, label] of [["mt1", "menú fuera"], ["mt2", "tooltip fuera"]]) {
    await page.mouse.move(5, 5);
    await sleep(400);
    await page.hover(`#${id}`);
    await sleep(800);
    const tipShown = (await page.locator('.mochi-tooltip[data-state="open"]').count()) === 1;
    await page.click(`#${id}`);
    await sleep(600);
    check(`menú y tooltip juntos (${label}): sale el tooltip y se abre el menú`, tipShown && (await page.locator(`#${id}`).getAttribute("aria-expanded")) === "true" && (await page.getByRole("menu").count()) === 1);
    await page.keyboard.press("Escape");
    await sleep(700);
  }
  await page.goto(URL_ + "#/_cases/nested");
  await sleep(400);
  await page.click("#open-a");
  await sleep(800);
  await page.click("#open-b");
  await sleep(800);
  await page.keyboard.press("Tab");
  check("diálogo anidado: Tab recorre el de dentro", await page.evaluate(() => document.activeElement?.closest('[role="dialog"]')?.querySelector(".mochi-dialog__title")?.textContent === "B"));
  await page.goto(URL_ + "#/_cases/nested-locked");
  await sleep(600);
  await page.click("#open-a");
  await sleep(800);
  await page.click("#open-b");
  await sleep(800);
  await page.keyboard.press("Escape");
  await sleep(800);
  check("diálogo anidado: Esc no cierra el de fuera si el de dentro no se deja cerrar", (await page.locator('.mochi-dialog-root[data-state="open"]').count()) === 2);
  await page.goto(URL_ + "#/_cases/two-openers");
  await sleep(600);
  await page.click("#btn-a");
  await sleep(800);
  await page.keyboard.press("Escape");
  await sleep(120);
  await page.click("#btn-b", { force: true });
  await sleep(800);
  await page.keyboard.press("Escape");
  await sleep(900);
  check("diálogo: reabierto desde otro botón mientras se cerraba, vuelve a ese botón", (await focusedName(page)) === "Edit B" && (await page.locator("#btn-a").evaluate(e => getComputedStyle(e).opacity)) === "1");
  await page.goto(URL_ + "#/_cases/autofocus");
  await sleep(500);
  await page.click("#open");
  await sleep(800);
  check("diálogo: un campo con autoFocus recibe el foco", (await page.evaluate(() => document.activeElement?.id)) === "field");
  await page.keyboard.press("Escape");
  await sleep(700);

  // --- tema oscuro
  await page.goto(URL_ + "#/");
  await sleep(500);
  const themeBox = await box(page.getByRole("tablist", { name: "Theme" }));
  const vh = page.viewportSize().height;
  check("tema: el selector va abajo de la columna lateral, no en la barra", themeBox.x < 240 && vh - (themeBox.y + themeBox.height) < 40 && !(await page.locator(".bar").isVisible()), `x ${themeBox.x.toFixed(0)}, a ${(vh - themeBox.y - themeBox.height).toFixed(0)} px del borde`);
  await page.getByRole("tab", { name: "Dark" }).click();
  await sleep(600);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("tema: oscuro cambia el lienzo", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark" && bg === "rgb(15, 15, 14)", bg);
  check("tema: las barras del navegador van del color del lienzo", (await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content)) === bg);
  // en oscuro, el botón principal dentro de una ventana va invertido (claro, texto oscuro)
  await page.goto(URL_ + "#/demo");
  await sleep(1500);
  await page.getByRole("button", { name: "New project" }).first().click();
  await sleep(1000);
  const darkCreate = await page.getByRole("button", { name: "Create" }).evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e.querySelector(".mochi-swap__layer:not([data-leaving])")).color]);
  check("tema oscuro: el botón principal de una ventana va invertido", darkCreate[0] === "rgb(244, 242, 238)" && darkCreate[1] === "rgb(13, 13, 14)", darkCreate.join(" / "));
  await page.keyboard.press("Escape");
  await sleep(900);
  await page.goto(URL_ + "#/");
  await sleep(500);
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
  await rm.goto(URL_ + "#/checkbox");
  await sleep(500);
  const rmBox = rm.getByRole("checkbox", { name: "Videos" });
  await rmBox.click();
  await sleep(40);
  check("movimiento reducido: la casilla se marca sin animar", Math.abs((await scaleOf(rmBox.locator(".mochi-choice__fill"))) - 1) < 0.001);
  await rm.goto(URL_ + "#/progress");
  await sleep(500);
  const rmBar = rm.getByRole("progressbar", { name: "Syncing library" }).locator(".mochi-progress__bar");
  const rb0 = await box(rmBar);
  await sleep(900);
  const rb1 = await box(rmBar);
  check("movimiento reducido: lo indeterminado se queda quieto y respira", Math.abs(rb0.x - rb1.x) < 0.5 && Math.abs(rb0.width - rb1.width) < 0.5 && (await rmBar.evaluate(e => getComputedStyle(e).animationName)) === "mochi-breathe");
  await rm.goto(URL_ + "#/skeleton");
  await sleep(300);
  check("movimiento reducido: el esqueleto no brilla", (await rm.locator(".mochi-skeleton").first().evaluate(e => getComputedStyle(e).animationName)) === "none");
  await rm.context().close();

  // --- alto contraste (colores forzados): el estado se sigue viendo
  const fc = await open({ forcedColors: "active" });
  await fc.goto(URL_ + "#/checkbox");
  await sleep(500);
  const fcFill = await fc.getByRole("radio", { name: "Standard" }).locator(".mochi-choice__fill").evaluate(e => getComputedStyle(e).backgroundColor);
  const fcRing = await fc.getByRole("checkbox", { name: "Videos" }).locator(".mochi-choice__ring").evaluate(e => `${getComputedStyle(e).borderTopStyle} ${getComputedStyle(e).borderTopWidth}`);
  await fc.goto(URL_ + "#/progress");
  await sleep(500);
  const fcBar = await fc.getByRole("progressbar", { name: "Storage" }).locator(".mochi-progress__bar").evaluate(e => getComputedStyle(e).backgroundColor);
  const fcTrack = await fc.getByRole("progressbar", { name: "Storage" }).evaluate(e => getComputedStyle(e).backgroundColor);
  check("alto contraste: la opción elegida, el filo y la barra se ven", fcFill !== "rgba(0, 0, 0, 0)" && /^solid (1|1\.5)px$/.test(fcRing) && fcBar !== fcTrack, `${fcFill} · ${fcRing} · ${fcBar} sobre ${fcTrack}`);
  await fc.context().close();

  // --- la parte visible de la pantalla (en Safari de iOS, la que deja el teclado): se simula
  // sustituyendo window.visualViewport, porque el teclado no se puede simular
  const withVisual = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
    await ctx.addInitScript(() => {
      const vv = new EventTarget();
      Object.assign(vv, { offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, width: innerWidth, height: innerHeight, scale: 1 });
      Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
      window.__vv = vv;
    });
    const pg = await ctx.newPage();
    pg.on("pageerror", e => errors.push(e.message));
    return pg;
  };
  const setVisual = (pg, top, height) =>
    pg.evaluate(([t, h]) => {
      Object.assign(window.__vv, { offsetTop: t, height: h });
      window.__vv.dispatchEvent(new Event("resize"));
    }, [top, height]);

  const vp = await withVisual();
  const vvCtx = vp.context();
  await vp.goto(URL_ + "#/palette");
  await sleep(500);
  await vp.getByRole("button", { name: "Open command palette" }).click();
  await sleep(500);
  await setVisual(vp, 120, 400);
  await sleep(700);
  const vr = await box(vp.locator(".mochi-cmdk-root"));
  const vpanel = await box(vp.getByRole("dialog", { name: "Command palette" }));
  check("paleta: sigue la parte visible cuando sale el teclado", Math.abs(vr.y - 120) < 0.5 && Math.abs(vr.height - 400) < 0.5, `y ${vr.y} alto ${vr.height}`);
  check("paleta: cabe entera encima del teclado", vpanel.y + vpanel.height <= 520 + 0.5, `acaba en ${(vpanel.y + vpanel.height).toFixed(0)}`);
  check("paleta: la página de debajo no se desplaza mientras está abierta", (await vp.evaluate(() => document.documentElement.style.overflow)) === "hidden");
  await vvCtx.close();

  const rn = await withVisual();
  await rn.goto(URL_ + "#/dialog");
  await sleep(500);
  await rn.getByRole("button", { name: "Rename" }).click();
  await sleep(900);
  await setVisual(rn, 0, 440);
  await sleep(900);
  const rs = await box(rn.getByRole("dialog", { name: "Rename project" }));
  const rf = await box(rn.getByRole("textbox", { name: "Project name" }));
  check("hoja: sube con el teclado hasta quedar encima", Math.abs(rs.y + rs.height - 432) < 1 && rf.y + rf.height <= 440, `hoja acaba en ${(rs.y + rs.height).toFixed(0)}, campo en ${(rf.y + rf.height).toFixed(0)}`);
  await setVisual(rn, 0, 780);
  await sleep(900);
  const rs2 = await box(rn.getByRole("dialog", { name: "Rename project" }));
  check("hoja: al irse el teclado vuelve abajo", Math.abs(rs2.y + rs2.height - 772) < 1, `acaba en ${(rs2.y + rs2.height).toFixed(0)}`);
  await rn.keyboard.press("Escape");
  await sleep(900);
  await rn.context().close();

  // teclado en Studio: el título va pegado al borde de arriba de la hoja en cada fotograma (no
  // salta) y, si no cabe, título y botones quedan dentro y se desplaza lo de en medio
  const kb = await withVisual();
  await kb.goto(URL_ + "#/demo");
  await sleep(1800);
  await kb.getByRole("button", { name: "New project" }).first().click();
  await sleep(1000);
  const titleGap = () => kb.evaluate(() => {
    const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
    return document.querySelector('[role="dialog"] .mochi-dialog__title').getBoundingClientRect().top - d.top;
  });
  const gap0 = await titleGap();
  const gaps = sampleFrames(kb, () => {
    const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
    return document.querySelector('[role="dialog"] .mochi-dialog__title').getBoundingClientRect().top - d.top;
  }, 700);
  await setVisual(kb, 0, 360);
  const gs = await gaps;
  check("hoja con teclado: el contenido sube con la hoja, sin saltos", gs.every(g => Math.abs(g - gap0) < 1), `título a ${Math.min(...gs).toFixed(0)}–${Math.max(...gs).toFixed(0)} px del borde (en reposo ${gap0.toFixed(0)})`);
  await sleep(600);
  const kbInside = await kb.evaluate(() => {
    const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
    const all = [...document.querySelectorAll('[role="dialog"] .mochi-dialog__title, [role="dialog"] .mochi-dialog__actions button')].map(e => e.getBoundingClientRect());
    const body = document.querySelector('[role="dialog"] .mochi-dialog__body');
    return all.every(b => b.top >= d.top - 0.5 && b.bottom <= d.bottom + 0.5) && d.bottom <= 360.5 && body.scrollHeight > body.clientHeight;
  });
  check("hoja con teclado: título y botones a la vista; se desplaza lo de en medio", kbInside);
  // se cierra con el teclado abierto: baja entera hasta salir por abajo de la pantalla
  const exits = sampleFrames(kb, () => { const d = document.querySelector('[role="dialog"]'); return d ? d.getBoundingClientRect().top : null; }, 900);
  await kb.getByRole("button", { name: "Cancel" }).click();
  await sleep(80);
  await setVisual(kb, 0, 780);
  const ex = (await exits).filter(y => y !== null);
  check("hoja con teclado: al cerrar baja hasta salir por abajo", ex.length > 2 && ex[ex.length - 1] >= 770, `último borde de arriba en ${ex[ex.length - 1]?.toFixed(0)}`);
  await kb.context().close();

  // iOS desplaza la página con el teclado aunque esté bloqueada: al cerrar vuelve a su sitio
  const sc = await open({ viewport: { width: 390, height: 780 } });
  await sc.goto(URL_ + "#/dialog");
  await sleep(600);
  await sc.getByRole("button", { name: "Rename" }).click();
  await sleep(800);
  const scY0 = await sc.evaluate(() => window.scrollY);
  await sc.evaluate(y => window.scrollTo(0, y + 260), scY0);
  await sc.keyboard.press("Escape");
  await sleep(900);
  const scY1 = await sc.evaluate(() => window.scrollY);
  check("hoja: al cerrarse, la página vuelve a donde estaba", scY1 === scY0, `${scY0} → ${scY1}`);
  await sc.context().close();

  // --- tableta en vertical (iPad, 820 puntos): columna lateral como en escritorio
  const tab = await open({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  for (const h of ["#/", "#/demo"]) {
    await tab.goto(URL_ + h);
    await sleep(900);
    const t = await tab.evaluate(() => ({
      column: getComputedStyle(document.querySelector(".site")).gridTemplateColumns.split(" ").length === 2,
      menu: document.querySelector(".site-menu").getClientRects().length > 0,
      over: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    check(`tableta en vertical (${h}): columna lateral, sin menú y sin salirse`, t.column && !t.menu && !t.over, JSON.stringify(t));
  }
  await tab.context().close();

  // --- hoja en pantalla de móvil
  const mob = await open({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  await mob.goto(URL_ + "#/dialog");
  await sleep(500);
  const del = mob.getByRole("button", { name: "Delete project" }).first();
  await del.click();
  await sleep(800);
  const mb = await box(mob.getByRole("alertdialog"));
  check("hoja: en móvil las ventanas salen desde abajo", Math.abs(mb.y + mb.height - 772) < 1.5 && Math.abs(mb.width - 374) < 1, `y ${mb.y.toFixed(0)} alto ${mb.height.toFixed(0)} ancho ${mb.width.toFixed(0)}`);
  await mob.screenshot({ path: `${OUT}/sheet.png` });
  const grab = await box(mob.locator(".mochi-dialog__grab"));
  await mob.mouse.move(grab.x + grab.width / 2, grab.y + 12);
  await mob.mouse.down();
  await mob.mouse.move(grab.x + grab.width / 2, grab.y + 60, { steps: 4 });
  await sleep(30);
  const dragged = await box(mob.getByRole("alertdialog"));
  check("hoja: sigue al dedo al arrastrarla", dragged.y - mb.y > 40, `${mb.y} → ${dragged.y}`);
  await mob.mouse.move(grab.x + grab.width / 2, grab.y + 260, { steps: 3 });
  await mob.mouse.up();
  await sleep(900);
  check("hoja: arrastrada hacia abajo se cierra", (await mob.locator(".mochi-dialog-root").count()) === 0);
  await mob.goto(URL_ + "#/_cases/veto");
  await sleep(500);
  await mob.click("#open");
  await sleep(900);
  const v0 = await box(mob.locator(".mochi-dialog"));
  const vg = await box(mob.locator(".mochi-dialog__grab"));
  await mob.mouse.move(vg.x + vg.width / 2, vg.y + 12);
  await mob.mouse.down();
  await mob.mouse.move(vg.x + vg.width / 2, vg.y + 220, { steps: 5 });
  await mob.mouse.up();
  await sleep(1200);
  const v1 = await box(mob.locator(".mochi-dialog"));
  check("hoja: si no se deja cerrar, vuelve a su sitio", Math.abs(v1.y - v0.y) < 1.5, `${v0.y} → ${v1.y}`);
  await mob.goto(URL_ + "#/popover");
  await sleep(500);
  await mob.getByRole("button", { name: "Filters" }).tap();
  await sleep(900);
  const popSheet = await box(mob.getByRole("dialog", { name: "Show" }));
  check("panel flotante: en móvil sale como hoja desde abajo", Math.abs(popSheet.y + popSheet.height - 772) < 1.5 && Math.abs(popSheet.width - 374) < 1, `y ${popSheet.y.toFixed(0)} alto ${popSheet.height.toFixed(0)}`);
  await mob.goto(URL_ + "#/drawer");
  await sleep(500);
  await mob.getByRole("button", { name: "Open menu" }).tap();
  await sleep(900);
  const mobNav = await box(mob.getByRole("dialog", { name: "Mochi" }));
  check("panel lateral: en móvil deja ver 48 px de página", Math.abs(mobNav.x - 8) < 1 && Math.abs(mobNav.width - 320) < 1 && Math.abs(mobNav.height - 764) < 1, `x ${mobNav.x} ancho ${mobNav.width} alto ${mobNav.height}`);
  // «Lista» en móvil: los enlaces y el tema van en el panel lateral
  await mob.goto(URL_ + "#/");
  await sleep(600);
  check("lista en móvil: sin tira de enlaces ni tema a la vista", !(await mob.locator(".nav .nav__list").isVisible()) && !(await mob.getByRole("tablist", { name: "Theme" }).first().isVisible()));
  await mob.getByRole("button", { name: "Open navigation" }).tap();
  await sleep(900);
  const listPanel = mob.getByRole("dialog", { name: "Componentes" });
  const themeInPanel = await box(listPanel.getByRole("tablist", { name: "Theme" }));
  const listBox = await box(listPanel);
  check("lista en móvil: el menú abre el panel con los componentes y el tema abajo del todo", (await listPanel.getByRole("link", { name: "Button" }).count()) === 1 && listBox.y + listBox.height - (themeInPanel.y + themeInPanel.height) < 40, `tema a ${(listBox.y + listBox.height - themeInPanel.y - themeInPanel.height).toFixed(0)} px del borde`);
  await listPanel.getByRole("link", { name: "Button" }).tap();
  await sleep(900);
  check("lista en móvil: elegir un componente lo abre y cierra el panel", (await mob.evaluate(() => location.hash)) === "#/button" && (await mob.getByRole("dialog").count()) === 0);
  await mob.goto(URL_ + "#/demo");
  await sleep(1500);
  check("demo en móvil: sin desplazamiento horizontal", await mob.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await mob.getByRole("button", { name: "Open navigation" }).tap();
  await sleep(900);
  const mobStudio = await box(mob.getByRole("dialog", { name: "Studio" }));
  check("demo en móvil: la navegación sale en el panel lateral", Math.abs(mobStudio.x - 8) < 1 && mobStudio.width > 280);
  await mob.getByRole("dialog", { name: "Studio" }).getByRole("link", { name: "Settings" }).tap();
  await sleep(900);
  check("demo en móvil: elegir una sección la abre y cierra el panel", (await mob.evaluate(() => location.hash)) === "#/demo/settings" && (await mob.getByRole("dialog").count()) === 0);
  // página más corta que la pantalla: el sobrante va abajo, no a la fila de la cabecera
  await mob.goto(URL_ + "#/demo/p/field-notes");
  await sleep(1500);
  await mob.getByRole("tab", { name: "Settings" }).tap();
  await sleep(900);
  await mob.getByRole("button", { name: "General" }).tap();
  await sleep(900);
  const shortRows = await mob.evaluate(() => [Math.round(document.querySelector(".nav").getBoundingClientRect().height), parseFloat(getComputedStyle(document.querySelector(".site")).gridTemplateRows), document.documentElement.scrollHeight <= innerHeight]);
  check("móvil: con la página corta, el contenido no baja", shortRows[2] && Math.abs(shortRows[0] - shortRows[1]) < 1, `cabecera ${shortRows[0]}, su fila ${shortRows[1]}, página corta ${shortRows[2]}`);
  await mob.screenshot({ path: `${OUT}/studio-mobile.png` });
  await mob.goto(URL_ + "#/tooltip");
  await sleep(500);
  await mob.getByRole("button", { name: "Duplicate" }).first().tap();
  await sleep(800);
  check("tooltip: en táctil no aparece", (await mob.locator('.mochi-tooltip[data-state="open"]').count()) === 0);
  await mob.goto(URL_ + "#/select");
  await sleep(600);
  const nativeSel = mob.locator(".mochi-select").first();
  check("selector: en táctil manda el selector nativo", (await nativeSel.getAttribute("data-native")) !== null && (await nativeSel.locator(".mochi-select__trigger").getAttribute("aria-hidden")) === "true");
  await nativeSel.locator("select").selectOption("s");
  await sleep(600);
  check("selector: lo elegido en el nativo se ve en el campo", /Small/.test((await nativeSel.locator(".mochi-select__value").textContent()) ?? ""));
  await mob.goto(URL_ + "#/menu");
  await sleep(600);
  await mob.getByRole("button", { name: "Project actions" }).first().tap();
  await sleep(700);
  const home = await box(mob.locator(".nav__brand"));
  await mob.touchscreen.tap(home.x + home.width / 2, home.y + home.height / 2);
  await sleep(700);
  check("menú táctil: tocar fuera lo cierra sin pulsar lo de debajo", (await mob.locator(".mochi-menu-root").count()) === 0 && (await mob.evaluate(() => location.hash)) === "#/menu");
  // colores en móvil: el texto de cada muestra no se sale de ella (se sacaba la página en WebKit)
  await mob.goto(URL_ + "#/colors");
  await sleep(700);
  const swOut = await mob.evaluate(() => [...document.querySelectorAll(".swatch")].filter(sw => { const r = sw.getBoundingClientRect().right; return [...sw.children].some(c => c.getBoundingClientRect().right > r + 0.5); }).length);
  check("colores en móvil: el texto de las muestras no se sale", swOut === 0, `${swOut} muestras con texto fuera`);
  // en táctil, el efecto de pasar el ratón no se queda pegado tras el toque
  await mob.goto(URL_ + "#/accordion");
  await sleep(600);
  const accTrig = mob.locator(".mochi-accordion__trigger").first();
  await accTrig.tap();
  await sleep(900);
  check("táctil: la cabecera del acordeón no se queda resaltada tras tocarla", (await accTrig.evaluate(e => getComputedStyle(e).backgroundColor)) === "rgba(0, 0, 0, 0)");
  // la paleta en táctil: sin teclas que no hay y sin mayúsculas ni correcciones al buscar
  await mob.goto(URL_ + "#/palette");
  await sleep(600);
  await mob.getByRole("button", { name: "Open command palette" }).tap();
  await sleep(700);
  const cmdkTouch = await mob.evaluate(() => {
    const vis = sel => [...document.querySelectorAll(sel)].some(e => e.getClientRects().length > 0);
    const i = document.querySelector(".mochi-cmdk input");
    return { esc: vis(".mochi-cmdk__esc"), sc: vis(".mochi-cmdk__sc"), cap: i.getAttribute("autocapitalize"), cor: i.getAttribute("autocorrect") };
  });
  check("paleta en táctil: sin teclas a la vista y sin mayúsculas ni correcciones", !cmdkTouch.esc && !cmdkTouch.sc && cmdkTouch.cap === "off" && cmdkTouch.cor === "off", JSON.stringify(cmdkTouch));
  await mob.context().close();

  // --- modo desarrollo
  const dev = await open();
  // ancho de «Get started» en cada fotograma desde que carga: no debe crecer desde 0
  await dev.addInitScript(() => {
    const w = (window.__widths = []);
    const t0 = performance.now();
    const tick = () => {
      const el = [...document.querySelectorAll("button.mochi-morph")].find(e => e.textContent?.includes("Get started"));
      if (el) w.push(el.getBoundingClientRect().width);
      if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await dev.goto(DEV_URL);
  await dev.evaluate(() => document.fonts.ready);
  await sleep(600);
  const dseg = dev.locator('[data-demo="segmented"] [role="tablist"]');
  const dRest = await box(dseg.getByRole("tab", { name: "Day" }));
  await dseg.getByRole("tab", { name: "Month" }).click();
  await sleep(90);
  const dMid = await box(dseg.locator(".mochi-seg__indicator"));
  check("desarrollo: el indicador de pestañas también se estira", dMid.width > dRest.width * 1.15, `ancho ${dMid.width.toFixed(1)} vs ${dRest.width.toFixed(1)}`);
  const widths = await dev.evaluate(() => window.__widths);
  await dev.goto(DEV_URL + "#/accordion");
  await sleep(500);
  const dret = dev.getByRole("button", { name: "Can I return an item?" }).first();
  const dRegion = dev.locator(`[id="${await dret.getAttribute("aria-controls")}"]`);
  await dret.click();
  await sleep(90);
  const dMidH = await dRegion.evaluate(e => e.getBoundingClientRect().height);
  await sleep(900);
  const dEndH = await dRegion.evaluate(e => e.getBoundingClientRect().height);
  check("desarrollo: el acordeón también se despliega con muelle", dMidH > 4 && dMidH < dEndH - 4, `${dMidH.toFixed(0)} de ${dEndH.toFixed(0)}`);
  await dev.goto(DEV_URL + "#/tabs");
  await sleep(500);
  await dev.getByRole("tab", { name: "Activity" }).first().click();
  await sleep(70);
  const dLayers = await dev.locator(".tabs-card .mochi-swap__layer").count();
  check("desarrollo: las pestañas también cambian de panel animando", dLayers === 2, `${dLayers} capas`);
  check("desarrollo: los botones salen con su tamaño, sin crecer desde 0", widths.length > 0 && Math.min(...widths) > 100, `mínimo ${Math.min(...widths).toFixed(0)} px`);
  await dev.goto(DEV_URL + "#/checkbox");
  await sleep(500);
  const dBox = dev.getByRole("checkbox", { name: "Videos" });
  await dBox.click();
  await sleep(50);
  const dScale = await scaleOf(dBox.locator(".mochi-choice__fill"));
  check("desarrollo: la casilla también crece desde el centro", dScale > 0.05 && dScale < 0.95, `escala ${dScale.toFixed(2)}`);
  await dev.goto(DEV_URL + "#/progress");
  await sleep(500);
  const dInd = await sampleFrames(dev, () => document.querySelector('[data-demo="progress-estados"] .mochi-progress__bar').getBoundingClientRect().left, 900);
  const dMoves = dInd.slice(1).map((x, i) => x - dInd[i]);
  check("desarrollo: lo indeterminado también avanza sin parar", dMoves.length > 20 && dMoves.filter(d => d > 0).length >= dMoves.length - 2, `${dMoves.filter(d => d <= 0).length} fotogramas sin avanzar`);
  await dev.goto(DEV_URL + "#/reorder");
  await sleep(500);
  const dRow = dev.locator(".mochi-reorder__item", { hasText: "Afterglow" });
  const dRow0 = await box(dRow);
  await dev.getByRole("button", { name: "Sort A–Z" }).click();
  await sleep(90);
  const dRowMid = await box(dRow);
  await sleep(900);
  const dRowEnd = await box(dRow);
  check("desarrollo: la lista también anima el cambio de orden", Math.abs(dRowMid.y - dRow0.y) > 4 && Math.abs(dRowMid.y - dRowEnd.y) > 4, `${dRow0.y.toFixed(0)} → ${dRowMid.y.toFixed(0)} → ${dRowEnd.y.toFixed(0)}`);
  await dev.goto(DEV_URL + "#/popover");
  await sleep(500);
  const dFb = await box(dev.getByRole("button", { name: "Filters" }));
  await dev.getByRole("button", { name: "Filters" }).click();
  await sleep(70);
  const dPop = await box(dev.getByRole("dialog", { name: "Show" }));
  check("desarrollo: el panel flotante también crece desde el botón", dPop.width > dFb.width + 2 && dPop.width < 300, `${dFb.width.toFixed(0)} → ${dPop.width.toFixed(0)}`);
  await dev.keyboard.press("Escape");
  await sleep(600);
  await dev.goto(DEV_URL + "#/demo/p/night-drive");
  await sleep(600);
  await dev.getByRole("tab", { name: "Tracks" }).click();
  await sleep(700);
  await dev.getByRole("button", { name: "Play Paper Moons" }).click();
  await sleep(600);
  await dev.getByRole("button", { name: "Reorder Paper Moons" }).focus();
  await dev.keyboard.press("Space");
  await dev.keyboard.press("ArrowUp");
  await dev.keyboard.press("Space");
  await sleep(800);
  check("desarrollo: la app funciona (reproduce y reordena)", (await dev.locator(".studio-track__title").allTextContents())[1] === "Paper Moons" && (await dev.locator(".studio-dock .mochi-player-host").count()) === 1);
  await dev.goto(DEV_URL + "#/skeleton");
  await dev.waitForFunction(() => !document.querySelector('[data-demo="skeleton-cambio a contenido"] .mochi-skeleton-swap').hasAttribute("aria-busy"), null, { timeout: 4000 });
  const dSk = await dev.locator('[data-demo="skeleton-cambio a contenido"] .mochi-skeleton-swap .mochi-swap__layer').count();
  await sleep(900);
  check("desarrollo: el esqueleto también se funde en el contenido", dSk === 2 && (await dev.getByText("Ada Lovelace").first().isVisible()), `${dSk} capas`);
  await dev.context().close();

  check("sin errores en la consola", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("la prueba terminó sin excepciones", false, e.stack);
} finally {
  await browser.close();
  server.close();
  devServer.close();
}

let fails = 0;
for (const r of results) {
  if (!r.ok) fails++;
  console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok || !r.detail ? "" : `  →  ${r.detail}`}`);
}
console.log(`\n${results.length - fails}/${results.length} comprobaciones correctas; capturas en ${OUT}/`);
process.exitCode = fails ? 1 : 0;
