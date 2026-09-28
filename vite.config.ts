// Solo para el banco de pruebas (playground/): la librería se compila con tsc.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "playground",
  plugins: [react()],
  // el banco importa fuentes desde node_modules (fuera de playground/)
  server: { port: 5178, fs: { allow: [".."] } },
  build: { outDir: "../playground-dist", emptyOutDir: true },
});
