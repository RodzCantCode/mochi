// Unir refs: con React 19 una ref de función puede devolver su limpieza; se respeta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeRefs } from "../../dist/internal/refs.js";

test("la limpieza propia de una ref se llama en vez de pasarle null", () => {
  const log = [];
  const obj = { current: null };
  const merged = mergeRefs(obj, el => {
    log.push(`attach:${el}`);
    return () => log.push("cleanup");
  });
  const cleanup = merged("el");
  assert.equal(obj.current, "el");
  cleanup();
  assert.deepEqual(log, ["attach:el", "cleanup"]);
  assert.equal(obj.current, null);
});

test("una ref de función sin limpieza recibe null al soltarse", () => {
  const seen = [];
  mergeRefs(el => void seen.push(el))("el")();
  assert.deepEqual(seen, ["el", null]);
});

test("React 18 llama con null: también se reparte", () => {
  const seen = [];
  const obj = { current: "x" };
  mergeRefs(obj, el => void seen.push(el))(null);
  assert.deepEqual([obj.current, seen], [null, [null]]);
});
