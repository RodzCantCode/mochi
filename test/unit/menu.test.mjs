// Colocación del menú y del tooltip: se dan la vuelta si no caben y nunca se salen de la ventana.
import { test } from "node:test";
import assert from "node:assert/strict";
import { placeMenu, placeTooltip } from "../../dist/internal/placement.js";

const vp = { w: 1000, h: 800 };
const size = { w: 220, h: 240 };

test("debajo del botón, alineado a su inicio", () => {
  const p = placeMenu({ x: 100, y: 100, w: 40, h: 40 }, size, vp);
  assert.deepEqual([p.x, p.y, p.side], [100, 146, "bottom"]);
});

test("alineado al final del botón", () => {
  const p = placeMenu({ x: 700, y: 100, w: 40, h: 40 }, size, vp, "bottom-end");
  assert.equal(p.x + size.w, 740);
});

test("sin sitio debajo se abre encima", () => {
  const p = placeMenu({ x: 100, y: 700, w: 40, h: 40 }, size, vp);
  assert.equal(p.side, "top");
  assert.equal(p.y + size.h, 694);
});

test("prefiere encima, pero sin sitio arriba se abre debajo", () => {
  const p = placeMenu({ x: 100, y: 30, w: 40, h: 40 }, size, vp, "top-start");
  assert.equal(p.side, "bottom");
});

test("no se sale por la derecha", () => {
  const p = placeMenu({ x: 960, y: 100, w: 30, h: 30 }, size, vp);
  assert.equal(p.x, vp.w - 8 - size.w);
});

test("desde un punto cerca del borde derecho se abre hacia la izquierda", () => {
  const p = placeMenu({ x: 950, y: 100, w: 0, h: 0 }, size, vp);
  assert.equal(p.x, 950 - size.w);
});

test("si no cabe ni arriba ni abajo, elige el lado con más sitio y limita el alto", () => {
  const p = placeMenu({ x: 100, y: 300, w: 40, h: 40 }, { w: 220, h: 900 }, vp);
  assert.equal(p.side, "bottom");
  assert.equal(p.maxH, 800 - 340 - 6 - 8);
});

const tip = { w: 80, h: 28 };

test("tooltip: encima y centrado", () => {
  const p = placeTooltip({ x: 100, y: 200, w: 40, h: 40 }, tip, vp, "top");
  assert.deepEqual([p.x, p.y, p.side], [80, 164, "top"]);
});

test("tooltip: pegado arriba, pasa debajo", () => {
  const p = placeTooltip({ x: 100, y: 10, w: 40, h: 40 }, tip, vp, "top");
  assert.deepEqual([p.y, p.side], [58, "bottom"]);
});

test("tooltip: a la derecha sin sitio, pasa a la izquierda", () => {
  const p = placeTooltip({ x: 950, y: 200, w: 40, h: 40 }, tip, vp, "right");
  assert.deepEqual([p.x, p.side], [950 - 8 - 80, "left"]);
});

test("tooltip: junto al borde izquierdo se corre para no salirse", () => {
  const p = placeTooltip({ x: 0, y: 200, w: 20, h: 20 }, tip, vp, "top");
  assert.equal(p.x, 8);
});
