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
  LinkButton: h(M.LinkButton, { href: "/plans" }, "See plans"),
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
  Checkbox: h(M.Checkbox, { label: "Terms", defaultChecked: true, name: "terms", error: "Required" }),
  "Checkbox mixta": h(M.Checkbox, { "aria-label": "All", checked: "indeterminate" }),
  RadioGroup: h(M.RadioGroup, { label: "Plan", name: "plan", defaultValue: "a", options: [{ value: "a", label: "A", description: "One" }, { value: "b", label: "B", disabled: true }] }),
  Progress: h(M.Progress, { value: 40, label: "Upload", showValue: true }),
  "Progress indeterminado": h(M.Progress, { "aria-label": "Sync" }),
  ProgressRing: h(M.ProgressRing, { value: 100, "aria-label": "Done" }),
  "ProgressRing indeterminado": h(M.ProgressRing, { size: "sm", "aria-label": "Loading" }),
  Skeleton: h(M.Skeleton, { lines: 3 }),
  SkeletonSwap: h(M.SkeletonSwap, { loading: true, skeleton: h(M.Skeleton, { shape: "circle" }) }, "Content"),
  Popover: h(M.Popover, { label: "Filters", content: "Inside" }, h(M.Button, null, "Filters")),
  Drawer: h(M.Drawer, { open: true, onOpenChange() {}, title: "Menu" }, "Links"),
  ReorderList: h(M.ReorderList, { items: ["a", "b"], getKey: x => x, getLabel: x => x, onReorder() {}, renderItem: (x, { handle }) => h("div", null, handle, x) }),
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

test("SSR: LinkButton es un enlace con la forma del botón y su nombre", () => {
  const html = renderToString(h(M.LinkButton, { href: "/plans", size: "lg" }, "See plans"));
  assert.match(html, /^<a [^>]*href="\/plans"/);
  assert.match(html, /class="mochi-morph mochi-button"/);
  assert.match(html, /data-size="lg"/);
  assert.doesNotMatch(html, /type="button"/);
  assert.match(html, /class="mochi-sr"[^>]*>See plans</);
  // con el enlace del framework (p. ej. Link de Next.js)
  const Link = props => h("a", { ...props, "data-framework": "" });
  assert.match(renderToString(h(M.LinkButton, { href: "/x", as: Link }, "Go")), /^<a [^>]*data-framework=""/);
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

test("SSR: la casilla es un checkbox con su estado, su etiqueta y su valor para formularios", () => {
  const html = renderToString(h(M.Checkbox, { label: "Terms", defaultChecked: true, name: "terms" }));
  assert.match(html, /role="checkbox"/);
  assert.match(html, /aria-checked="true"/);
  const labelledby = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
  assert.ok(labelledby);
  assert.match(html, new RegExp(`<label[^>]*id="${labelledby}"[^>]*>Terms</label>`));
  assert.match(html, /<input[^>]*name="terms"[^>]*checked/);
  assert.match(renderToString(h(M.Checkbox, { "aria-label": "All", checked: "indeterminate" })), /aria-checked="mixed"/);
});

test("SSR: el grupo de radios, con un solo Tab y el valor para formularios", () => {
  const html = renderToString(h(M.RadioGroup, { label: "Plan", name: "plan", defaultValue: "b", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }));
  assert.match(html, /role="radiogroup"/);
  assert.equal(html.match(/role="radio"/g)?.length, 2);
  assert.equal(html.match(/tabindex="0"/g)?.length, 1);
  assert.match(html, /<input type="hidden" name="plan" value="b"/);
});

test("SSR: la barra de progreso anuncia su valor; indeterminada, sin él", () => {
  assert.match(renderToString(h(M.Progress, { value: 40, label: "Upload" })), /role="progressbar"[^>]*aria-valuenow="40"/);
  const ind = renderToString(h(M.Progress, { "aria-label": "Sync" }));
  assert.match(ind, /role="progressbar"/);
  assert.doesNotMatch(ind, /aria-valuenow/);
});

test("SSR: el esqueleto marca el contenedor como ocupado y lo dice", () => {
  const html = renderToString(h(M.SkeletonSwap, { loading: true, skeleton: h(M.Skeleton) }, "Content"));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, />Loading</);
  assert.doesNotMatch(html, /Content/);
});

test("SSR: el botón del panel flotante anuncia que abre un diálogo; el panel no se pinta cerrado", () => {
  const html = renderToString(h(M.Popover, { label: "Filters", content: "Inside" }, h(M.Button, null, "Filters")));
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /Inside/);
});

test("SSR: la lista que se reordena lleva sus filas y un asa con nombre en cada una", () => {
  const html = renderToString(h(M.ReorderList, { "aria-label": "Tracks", items: ["Alpha", "Beta"], getKey: x => x, getLabel: x => x, onReorder() {}, renderItem: (x, { handle }) => h("div", null, handle, x) }));
  assert.match(html, /<ul[^>]*aria-label="Tracks"/);
  assert.equal(html.match(/<li/g)?.length, 2);
  assert.match(html, /aria-label="Reorder Alpha"/);
  assert.match(html, /aria-label="Reorder Beta"/);
});
