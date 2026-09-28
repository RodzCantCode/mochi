// Genera el sistema de diseño de Claude Design desde la librería, en design-system/project/:
//   tokens.json            tokens/tokens.json + la fuente Geist + procedencia
//   fonts/                 Geist variable (licencia OFL)
//   README.md              design-system-src/README.md (la guía de marca)
//   components/<C>/…       design-system-src/components (guías y vistas previas)
//   components/bundle.js   la librería como un único script clásico que asigna window.Mochi
//   components/bundle.css  estilos de los componentes + puente de nombres de variables
//   components/index.d.ts  los tipos, como documentación
//   assets/Icons/          los iconos en SVG (se suben como archivos del sistema)
//   design-system.json     el índice (con los ids de design-system-src/uploads.json)
// Uso: npm run build && node scripts/build-design-system.mjs
import { build } from "vite";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const OUT = "design-system/project";
const SRC = "design-system-src";
const NAMESPACE = "Mochi";
// orden de las fichas en el sistema
const CARDS = ["Button", "Switch", "SegmentedControl", "Slider", "MediaPlayer", "ChartCard", "CommandPalette", "Toast", "MorphBox"];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "components"), { recursive: true });

// --- valores -------------------------------------------------------------------------
const tokens = JSON.parse(readFileSync("tokens/tokens.json", "utf8"));
tokens.type.fonts = [{ family: "Geist", file: "fonts/Geist-Variable.woff2", weight: "100 900", style: "normal" }];
tokens.meta = { source: "code", package: pkg.name, version: pkg.version, synced: new Date().toISOString().slice(0, 10) };
writeFileSync(join(OUT, "tokens.json"), JSON.stringify(tokens, null, 2) + "\n");
mkdirSync(join(OUT, "fonts"), { recursive: true });
cpSync("node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", join(OUT, "fonts/Geist-Variable.woff2"));

// --- guía y fichas -------------------------------------------------------------------
cpSync(join(SRC, "README.md"), join(OUT, "README.md"));
for (const name of [...CARDS, "Cover"]) {
  const from = join(SRC, "components", name);
  if (!existsSync(from)) throw new Error(`falta ${from}`);
  cpSync(from, join(OUT, "components", name), { recursive: true });
}

// --- bundle: un script clásico que lee window.React / window.ReactDOM -------------------
const shim = resolve("scripts/ds/jsx-runtime-shim.js");
const res = await build({
  configFile: false,
  logLevel: "error",
  resolve: { alias: [{ find: /^react\/jsx(-dev)?-runtime$/, replacement: shim }] },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    write: false,
    minify: true,
    lib: { entry: resolve("src/index.ts"), formats: ["iife"], name: NAMESPACE, fileName: () => "bundle.js" },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: { globals: { react: "React", "react-dom": "ReactDOM" } },
    },
  },
});
const outputs = (Array.isArray(res) ? res : [res]).flatMap(r => r.output);
const code = outputs.find(o => o.type === "chunk")?.code;
if (!code) throw new Error("no salió el bundle");
const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: NAMESPACE, components: CARDS.map(name => ({ name })) })} */\n`;
const bundle = header + code;
for (const bad of ["</script", "<!--", "eval(", "new Function"]) if (bundle.includes(bad)) throw new Error(`el bundle contiene «${bad}»`);
writeFileSync(join(OUT, "components/bundle.js"), bundle);

// --- bundle.css ----------------------------------------------------------------------
// El sistema compila tokens.json a variables --<nombre>; los componentes usan --mochi-<nombre>.
// El puente hace que lo que se edite en la página del sistema llegue a las vistas previas.
const bridge = [];
for (const t of tokens.color.tokens) bridge.push(`  --mochi-${t.name}: var(--${t.name});`);
for (const fam of ["spacing", "radius", "shadow"]) for (const t of tokens[fam].tokens) bridge.push(`  --mochi-${t.name}: var(--${t.name});`);
for (const key of Object.keys(tokens.type.families)) bridge.push(`  --mochi-font-${key}: var(--font-${key});`);
// estilos de texto y curvas de los muelles: tal cual los genera build-tokens
const own = readFileSync("src/styles/tokens.css", "utf8").split("\n").filter(l => /--mochi-(text|ease|duration)-/.test(l));
const css =
  `/* ${pkg.name} ${pkg.version} — generado por scripts/build-design-system.mjs */\n` +
  `:root,\n[data-theme] {\n${bridge.join("\n")}\n}\n:root {\n${own.join("\n")}\n}\n\n` +
  readFileSync("src/styles/components.css", "utf8");
if (/<\/style/i.test(css)) throw new Error("bundle.css contiene </style");
writeFileSync(join(OUT, "components/bundle.css"), css);

// --- tipos como documentación ----------------------------------------------------------
const dts = [];
const walk = dir => readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
for (const f of walk("dist").filter(f => f.endsWith(".d.ts")).sort()) {
  if (/internal\//.test(f)) continue;
  dts.push(`// ---- ${f.replace(/^dist\//, "")}\n${readFileSync(f, "utf8").trim()}\n`);
}
writeFileSync(join(OUT, "components/index.d.ts"), `// Tipos de ${pkg.name} ${pkg.version}: documentación, no se comprueban.\n\n${dts.join("\n")}`);

// --- iconos en SVG (tinta #0D0D0E: un <img> no hereda color) ----------------------------
const lib = await import(resolve("dist/index.js"));
const ICONS = ["ArrowRightIcon", "CheckIcon", "SearchIcon", "PlusIcon", "UserPlusIcon", "FileIcon", "SaveIcon", "SlidersIcon", "CheckCircleIcon", "CommandIcon", "EnterIcon", "CloseIcon", "VolumeIcon", "PlayIcon", "PauseIcon", "PreviousIcon", "NextIcon"];
mkdirSync(join(OUT, "assets/Icons"), { recursive: true });
const iconFiles = [];
for (const name of ICONS) {
  const svg = renderToStaticMarkup(createElement(lib[name], { size: 24 }))
    .replaceAll("currentColor", "#0D0D0E")
    .replace(' aria-hidden="true"', "")
    .replace(' focusable="false"', "")
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  const file = name.replace(/Icon$/, "").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() + ".svg";
  writeFileSync(join(OUT, "assets/Icons", file), svg + "\n");
  iconFiles.push(file);
}
writeFileSync(
  join(OUT, "assets/Icons/README.md"),
  "Iconos de Mochi en SVG: cuadrícula de 24, trazo de 1,6 px, extremos y uniones redondeados; los de reproducción, rellenos. " +
    "Aquí van dibujados en tinta `#0D0D0E` (el `on-surface` claro) porque una imagen no hereda el color; en código, cada icono es un componente (`SearchIcon`, `VolumeIcon`…) que toma el color del texto.\n",
);

// --- índice (necesita los ids de los iconos subidos) ------------------------------------
// ids de los iconos ya subidos al sistema (versionado: hace falta para regenerar el índice)
const uploadsPath = "design-system-src/uploads.json";
if (existsSync(uploadsPath)) {
  const uploads = JSON.parse(readFileSync(uploadsPath, "utf8")); // { "search.svg": { blob, size, type } }
  const index = {
    v: 3,
    layout: "files",
    createdOnFiles: JSON.parse(readFileSync(uploadsPath, "utf8"))._createdOnFiles ?? { v: 1, at: new Date().toISOString() },
    title: "Mochi",
    namespace: NAMESPACE,
    libraries: [{ name: "react", version: "18" }, { name: "react-dom", version: "18" }],
    sections: {},
    groups: ["Icons"],
    assetGroups: {
      Icons: {
        name: "Icons",
        tile: "s",
        order: iconFiles.filter(f => uploads[f]),
        files: Object.fromEntries(iconFiles.filter(f => uploads[f]).map(f => [f, { name: f, blob: uploads[f].blob, size: uploads[f].size, type: "image/svg+xml" }])),
      },
    },
    blobs: {},
    docs: { readme: "project/README.md", sections: [] },
    lastChange: { by: "Claude", at: new Date().toISOString(), via: "Claude Code", note: `Sistema generado desde ${pkg.name} ${pkg.version}` },
  };
  writeFileSync(join(OUT, "design-system.json"), JSON.stringify(index, null, 2) + "\n");
}

const files = walk(OUT).map(f => f.slice(OUT.length + 1));
console.log(`sistema de diseño: ${files.length} archivos en ${OUT} (bundle ${(bundle.length / 1024).toFixed(0)} kB, ${iconFiles.length} iconos)`);
