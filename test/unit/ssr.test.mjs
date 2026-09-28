// Cada componente se puede renderizar en el servidor (Astro, Next.js) sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import * as M from "../../dist/index.js";

const data = [1, 3, 2, 5].map((value, i) => ({ label: `D${i}`, value }));
const cases = {
  Button: h(M.Button, null, "Get started"),
  "Button cargando": h(M.Button, { status: "loading" }, "Save"),
  Switch: h(M.Switch, { defaultChecked: true, "aria-label": "Wi-Fi" }),
  SegmentedControl: h(M.SegmentedControl, { "aria-label": "Range", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }),
  Slider: h(M.Slider, { "aria-label": "Volume", defaultValue: 30, icon: f => h(M.VolumeIcon, { level: f }) }),
  MediaPlayer: h(M.MediaPlayer, { title: "Night Drive", artist: "Soft Machines", duration: 160, defaultExpanded: true }),
  LineChart: h(M.LineChart, { data }),
  ChartCard: h(M.ChartCard, { label: "Revenue", value: 100, data, ranges: [{ value: "d", label: "Day" }] }),
  CommandPalette: h(M.CommandPalette, { open: true, onOpenChange() {}, commands: [{ id: "a", label: "A", onSelect() {} }] }),
  CommandPaletteTrigger: h(M.CommandPaletteTrigger, { onClick() {} }),
  Toaster: h(M.Toaster),
  MorphBox: h(M.MorphBox, { contentKey: "x" }, "Hello"),
  TextField: h(M.TextField, { label: "Email", defaultValue: "a@b.co", error: "Wrong", valid: false }),
  "TextField contraseña": h(M.TextField, { label: "Password", type: "password", description: "8+" }),
  Dialog: h(M.Dialog, { open: true, onOpenChange() {}, title: "Delete?", actions: h(M.Button, null, "OK") }),
  Menu: h(M.Menu, { items: [{ id: "a", label: "A", onSelect() {} }, { type: "separator" }] }, h(M.Button, { iconOnly: true, "aria-label": "More" }, h(M.MoreIcon))),
  ContextMenu: h(M.ContextMenu, { items: [{ id: "a", label: "A", onSelect() {} }] }, h("div", null, "Area")),
};

for (const [name, el] of Object.entries(cases)) {
  test(`SSR: ${name}`, () => {
    const html = renderToString(el);
    assert.equal(typeof html, "string");
  });
}

test("SSR: el nombre accesible del botón está en el HTML del servidor", () => {
  const html = renderToString(h(M.Button, null, "Get started"));
  assert.match(html, /class="mochi-sr"[^>]*>Get started</);
});

test("SSR: el campo lleva su etiqueta y el error enlazado", () => {
  const html = renderToString(h(M.TextField, { label: "Email", error: "Wrong" }));
  assert.match(html, /<label[^>]*>Email<\/label>/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]+"/);
});

test("SSR: el botón del menú anuncia que abre un menú", () => {
  const html = renderToString(h(M.Menu, { items: [] }, h(M.Button, { iconOnly: true, "aria-label": "More" }, h(M.MoreIcon))));
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
});
