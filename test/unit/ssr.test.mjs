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
  Select: h(M.Select, { label: "Size", defaultValue: "m", options: [{ value: "s", label: "Small" }, { value: "m", label: "Medium" }] }),
  "Select compacto": h(M.Select, { label: "Sort", size: "sm", placeholder: "Sort by", options: [{ value: "a", label: "A" }] }),
  Tooltip: h(M.Tooltip, { content: "Copy" }, h(M.Button, { iconOnly: true, "aria-label": "Copy" }, h(M.CopyIcon))),
  Collapsible: h(M.Collapsible, { title: "Advanced" }, "Hidden content"),
  Accordion: h(M.Accordion, { defaultValue: ["a"] }, h(M.AccordionItem, { value: "a", title: "A" }, "One"), h(M.AccordionItem, { value: "b", title: "B" }, "Two")),
  Tabs: h(M.Tabs, { items: [{ value: "a", label: "A", content: "Panel A" }, { value: "b", label: "B", content: "Panel B" }] }),
  Presence: h(M.Presence, { show: true, collapse: true }, "Hi"),
  "Presence oculto": h(M.Presence, { show: false }, "Hi"),
  PresenceGroup: h(M.PresenceGroup, null, h("div", { key: "a" }, "A"), h("div", { key: "b" }, "B")),
  AutoHeight: h(M.AutoHeight, null, "Content"),
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

test("SSR: el selector es un combobox con su valor y un <select> para formularios", () => {
  const html = renderToString(h(M.Select, { label: "Size", name: "size", defaultValue: "m", options: [{ value: "s", label: "Small" }, { value: "m", label: "Medium" }] }));
  assert.match(html, /role="combobox"/);
  assert.match(html, /Medium/);
  assert.match(html, /<select[^>]*name="size"/);
});

test("SSR: una sección cerrada lleva su contenido, recogido, y lo anuncia", () => {
  const html = renderToString(h(M.Collapsible, { title: "Advanced" }, "Hidden content"));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Hidden content/);
  assert.match(html, /height:0/);
});

test("SSR: el panel de una pestaña se llama como su pestaña", () => {
  const html = renderToString(h(M.Tabs, { items: [{ value: "a", label: "Alpha", content: "Panel A" }] }));
  const labelledby = /role="tabpanel"[^>]*aria-labelledby="([^"]+)"/.exec(html)?.[1] ?? /aria-labelledby="([^"]+)"[^>]*role="tabpanel"/.exec(html)?.[1];
  assert.ok(labelledby);
  assert.match(html, new RegExp(`id="${labelledby}"[^>]*>Alpha<`));
});

test("SSR: Presence sin mostrar no pinta nada", () => {
  assert.equal(renderToString(h(M.Presence, { show: false }, "Hi")), "");
});
