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

  // --- casos límite de las superposiciones
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
  await rn.context().close();

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
  await mob.goto(URL_ + "#/menu");
  await sleep(600);
  await mob.getByRole("button", { name: "Project actions" }).first().tap();
  await sleep(700);
  const home = await box(mob.getByRole("link", { name: "Todos" }));
  await mob.touchscreen.tap(home.x + home.width / 2, home.y + home.height / 2);
  await sleep(700);
  check("menú táctil: tocar fuera lo cierra sin pulsar lo de debajo", (await mob.locator(".mochi-menu-root").count()) === 0 && (await mob.evaluate(() => location.hash)) === "#/menu");
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
  check("desarrollo: los botones salen con su tamaño, sin crecer desde 0", widths.length > 0 && Math.min(...widths) > 100, `mínimo ${Math.min(...widths).toFixed(0)} px`);
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
