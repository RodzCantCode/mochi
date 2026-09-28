// Pruebas del motor de muelles (sobre dist/, tras `npm run build`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { stepResponse, freeResponse, Spring, rubberBand, springs } from "../../dist/motion/index.js";

const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b} (±${eps})`);

test("la respuesta a un escalón empieza en 0 con velocidad 0 y termina en 1", () => {
  for (const [name, s] of Object.entries(springs)) {
    assert.equal(stepResponse(0, s), 0, name);
    close(stepResponse(1e-4, s), 0, 1e-3, `${name} sale sin salto`);
    close(stepResponse(5, s), 1, 1e-6, `${name} llega`);
  }
});

test("ningún muelle rebota más de un 1 %", () => {
  for (const [name, s] of Object.entries(springs)) {
    let peak = 0;
    for (let t = 0; t < 3; t += 0.0005) peak = Math.max(peak, stepResponse(t, s));
    assert.ok(peak < 1.01, `${name} rebota ${((peak - 1) * 100).toFixed(2)} %`);
  }
});

test("la respuesta libre respeta posición y velocidad iniciales", () => {
  for (const s of [springs.morph, springs.fadeIn]) {
    const a = freeResponse(0, 3, -2, s);
    close(a.x, 3, 1e-12, "posición inicial");
    close(a.v, -2, 1e-9, "velocidad inicial");
    const h = 1e-6, b = freeResponse(0.1, 3, -2, s), c = freeResponse(0.1 + h, 3, -2, s);
    close(b.v, (c.x - b.x) / h, 1e-3, "la velocidad es la derivada de la posición");
  }
});

test("cambiar el destino a mitad de camino no da saltos de posición ni de velocidad", () => {
  const sp = new Spring(0, springs.morph);
  sp.set(100, 0);
  const t = 0.12, before = { x: sp.value(t), v: sp.velocity(t) };
  sp.set(-40, t, springs.lead);
  close(sp.value(t), before.x, 1e-9, "posición continua");
  close(sp.velocity(t), before.v, 1e-6, "velocidad continua");
  close(sp.value(10), -40, 1e-6, "llega al nuevo destino");
});

test("un destino con retraso mantiene el valor hasta que empieza", () => {
  const sp = new Spring(0, springs.fadeIn);
  sp.set(1, 0, undefined, 0.2);
  assert.equal(sp.value(0.1), 0);
  assert.ok(sp.value(0.35) > 0.2);
});

test("isSettled solo es cierto al llegar", () => {
  const sp = new Spring(0, springs.snappy);
  sp.set(1, 0);
  assert.equal(sp.isSettled(0.05), false);
  assert.equal(sp.isSettled(2), true);
});

test("setState fija posición y velocidad (soltar tras arrastrar)", () => {
  const sp = new Spring(0, springs.back);
  sp.setState(30, 400, 1);
  sp.set(0, 1);
  close(sp.value(1), 30, 1e-9, "parte de donde estaba");
  close(sp.velocity(1), 400, 1e-6, "con la velocidad del arrastre");
  close(sp.value(4), 0, 1e-4, "vuelve a su sitio");
});

test("el estirón elástico crece cada vez menos y nunca pasa del límite", () => {
  assert.equal(rubberBand(0, 100), 0);
  let prev = 0, prevStep = Infinity;
  for (let d = 10; d <= 1000; d += 10) {
    const r = rubberBand(d, 100), stepSize = r - prev;
    assert.ok(r > prev && r < 100, `rango en ${d}`);
    assert.ok(stepSize < prevStep + 1e-12, `cada vez menos en ${d}`);
    prev = r; prevStep = stepSize;
  }
  assert.equal(rubberBand(-50, 100), -rubberBand(50, 100), "simétrico");
});
