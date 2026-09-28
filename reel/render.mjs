// Render de index.html con Playwright.
//
//   node render.mjs beats [desfase]   un fotograma por pulso (+ mosaico) en out/beats/
//   node render.mjs at 3.2 4.1 ...    fotogramas sueltos en out/at/
//   node render.mjs check             comprueba que el bucle empalma sin saltos
//   node render.mjs full              4 subfotogramas por fotograma → out/loop.mp4 (60 fps)
//
// Los subfotogramas del render completo van a FRAMES_DIR (por defecto out/frames).
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(".");
const PAGE = pathToFileURL(join(ROOT, "index.html")).href + "?render";
const FPS = 60, SUB = 4, WORKERS = 4;
const FRAMES_DIR = process.env.FRAMES_DIR || join(ROOT, "out", "frames");

async function openPages(n) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1440 }, deviceScaleFactor: 1 });
  const pages = [];
  for (let i = 0; i < n; i++) {
    const p = await ctx.newPage();
    p.on("pageerror", e => { console.error("error en la página:", e.message); process.exitCode = 1; });
    await p.goto(PAGE);
    await p.evaluate(() => window.ready);
    pages.push(p);
  }
  return { browser, pages };
}

async function shoot(page, t, file) {
  await page.evaluate(t => window.seek(t), t);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1440, height: 1440 } });
}

function ffmpeg(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg falló");
}

const [mode = "beats", ...rest] = process.argv.slice(2);
mkdirSync(join(ROOT, "out"), { recursive: true });

if (mode === "beats") {
  // por defecto 0.42 s tras cada pulso: el estado ya se ha asentado
  const off = rest.length ? +rest[0] : 0.42;
  const dir = join(ROOT, "out", "beats");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const { browser, pages } = await openPages(WORKERS);
  const T = await pages[0].evaluate(() => window.T);
  const beats = Math.round(T / 0.5);
  await Promise.all(pages.map(async (p, w) => {
    for (let b = w; b < beats; b += WORKERS) await shoot(p, b * 0.5 + off, join(dir, `b${String(b).padStart(2, "0")}.png`));
  }));
  await browser.close();
  // mosaico: una fila por compás, una columna por pulso
  ffmpeg(["-framerate", "1", "-i", join(dir, "b%02d.png"), "-vf",
    "scale=360:360,tile=4x7:padding=6:color=0x9a968f",
    "-frames:v", "1", join(ROOT, "out", "beats.png")]);
  console.log(`${beats} fotogramas en out/beats, mosaico en out/beats.png`);
}

if (mode === "at") {
  const dir = join(ROOT, "out", "at");
  mkdirSync(dir, { recursive: true });
  const { browser, pages } = await openPages(1);
  for (const s of rest) await shoot(pages[0], +s, join(dir, `t${(+s).toFixed(3)}.png`));
  await browser.close();
  console.log(`fotogramas en out/at: ${rest.join(", ")}`);
}

if (mode === "check") {
  // Empalme: el salto entre el final (T - h) y el principio (0) debe parecerse al
  // salto entre dos subfotogramas normales (0 → h). Se mide en todas las pistas.
  const { browser, pages } = await openPages(1);
  const res = await pages[0].evaluate(() => {
    const h = 1 / 240, T = window.T;
    const a = window.probe(T - h), b = window.probe(0), c = window.probe(h), d = window.probe(T - 2 * h);
    let worst = { i: -1, ratio: 0 };
    let maxJump = 0;
    for (let i = 0; i < a.length; i++) {
      const seam = Math.abs(b[i] - a[i]);
      const accel = Math.abs((c[i] - b[i]) - (a[i] - d[i])); // cambio de velocidad a través del empalme
      const normal = Math.max(Math.abs(c[i] - b[i]), Math.abs(a[i] - d[i]), 1e-6);
      maxJump = Math.max(maxJump, seam);
      const ratio = seam / normal;
      if (seam > 1e-4 && ratio > worst.ratio) worst = { i, ratio, seam, accel, normal };
    }
    return { n: a.length, maxJump, worst };
  });
  await browser.close();
  console.log(`pistas comprobadas: ${res.n}; mayor salto en el empalme: ${res.maxJump.toExponential(2)}`);
  if (res.worst.i >= 0) console.log("peor caso:", res.worst);
  const ok = res.maxJump < 1e-3 || (res.worst.ratio < 2.5);
  console.log(ok ? "OK: el bucle empalma sin saltos" : "FALLO: hay un salto en el empalme");
  if (!ok) process.exitCode = 1;
}

if (mode === "full") {
  rmSync(FRAMES_DIR, { recursive: true, force: true });
  mkdirSync(FRAMES_DIR, { recursive: true });
  const { browser, pages } = await openPages(WORKERS);
  const T = await pages[0].evaluate(() => window.T);
  const frames = Math.round(T * FPS);
  const total = frames * SUB;
  let done = 0;
  const started = Date.now();
  await Promise.all(pages.map(async (p, w) => {
    for (let i = w; i < total; i += WORKERS) {
      // subfotogramas centrados en el instante de cada fotograma
      const f = Math.floor(i / SUB), s = i % SUB;
      const t = (f + (s - (SUB - 1) / 2) / SUB) / FPS;
      await shoot(p, t, join(FRAMES_DIR, `s${String(i).padStart(5, "0")}.png`));
      if (++done % 240 === 0) {
        const el = (Date.now() - started) / 1000;
        console.log(`  ${done}/${total} subfotogramas (${el.toFixed(0)} s, faltan ~${(el / done * (total - done)).toFixed(0)} s)`);
      }
    }
  }));
  await browser.close();
  const audio = join(ROOT, "audio", "mix.wav");
  const out = join(ROOT, "out", "loop.mp4");
  // tmix mezcla cada 4 subfotogramas; select se queda con uno de cada 4 → 60 fps
  const args = ["-framerate", String(FPS * SUB), "-i", join(FRAMES_DIR, "s%05d.png")];
  if (existsSync(audio)) args.push("-i", audio);
  args.push(
    "-vf", `tmix=frames=${SUB}:weights='1 1 1 1',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB),format=yuv420p`,
    "-r", String(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-profile:v", "high",
    "-movflags", "+faststart",
  );
  if (existsSync(audio)) args.push("-c:a", "aac", "-b:a", "320k", "-shortest");
  args.push(out);
  ffmpeg(args);
  console.log(`listo: ${out}`);
}
