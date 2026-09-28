// Monta los estilos del paquete: dist/styles.css (valores + componentes), dist/tokens.css
// (solo valores, para quien use los componentes a su manera) y dist/tokens.json (la fuente).
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
const tokens = readFileSync("src/styles/tokens.css", "utf8");
const components = readFileSync("src/styles/components.css", "utf8");
writeFileSync("dist/tokens.css", tokens);
writeFileSync("dist/styles.css", `${tokens}\n${components}`);
copyFileSync("tokens/tokens.json", "dist/tokens.json");
console.log("css: dist/styles.css, dist/tokens.css, dist/tokens.json");
