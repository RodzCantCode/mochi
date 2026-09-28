// Pruebas del filtrado de la paleta de comandos y del formato de tiempos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchCommand, formatTime, nearestIndex } from "../../dist/index.js";

const items = ["New project", "Invite teammate", "Search docs", "Save changes", "Settings"].map(label => ({ label }));
const run = q => items.filter(i => matchCommand(q, i)).map(i => i.label);

test("filtra como en la animación: s → 3, sa → 1", () => {
  assert.deepEqual(run(""), items.map(i => i.label));
  assert.deepEqual(run("s"), ["Search docs", "Save changes", "Settings"]);
  assert.deepEqual(run("sa"), ["Save changes"]);
  assert.deepEqual(run("save"), ["Save changes"]);
});

test("sin mayúsculas ni tildes, por palabras y con palabras clave", () => {
  assert.ok(matchCommand("CONFIGURACION", { label: "Configuración" }));
  assert.ok(matchCommand("docs search", { label: "Search docs" }));
  assert.ok(matchCommand("preferences", { label: "Settings", keywords: ["preferences"] }));
  assert.equal(matchCommand("zzz", { label: "Settings" }), false);
});

test("formato de tiempos", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(48.9), "0:48");
  assert.equal(formatTime(160), "2:40");
  assert.equal(formatTime(3725), "1:02:05");
  assert.equal(formatTime(-3), "0:00");
});

test("punto más cercano de la gráfica", () => {
  assert.equal(nearestIndex(0, 12), 0);
  assert.equal(nearestIndex(1, 12), 11);
  assert.equal(nearestIndex(0.52, 12), 6);
  assert.equal(nearestIndex(-0.2, 12), 0);
  assert.equal(nearestIndex(1.4, 12), 11);
  assert.equal(nearestIndex(0.5, 1), 0);
});
