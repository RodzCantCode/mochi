// Casos límite de las superposiciones para las pruebas de interacción (test/e2e.mjs). No salen
// en el menú del sitio: se abren con #/_cases/<nombre>.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Checkbox, Dialog, Menu, Progress, ProgressRing, RadioGroup, ReorderList, SkeletonSwap, Skeleton, TextField, Tooltip } from "../src/index.js";

/** Un diálogo abierto dentro de otro; el de dentro puede no cerrarse con Esc. */
function Nested({ innerDismissible }: { innerDismissible: boolean }) {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <div className="stage">
      <Button id="open-a" onClick={() => setA(true)}>Open A</Button>
      <Dialog open={a} onOpenChange={setA} title="A">
        <Button id="open-b" onClick={() => setB(true)}>Open B</Button>
        <Dialog open={b} onOpenChange={setB} title="B" dismissible={innerDismissible}>
          <Button id="b-1">b-1</Button> <Button id="b-2">b-2</Button>
        </Dialog>
      </Dialog>
    </div>
  );
}

/** Hoja que no se deja cerrar mientras guarda. */
function Veto() {
  const [open, setOpen] = useState(false);
  return (
    <div className="stage">
      <Button id="open" onClick={() => setOpen(true)}>Open sheet</Button>
      <Dialog open={open} onOpenChange={o => o && setOpen(o)} presentation="sheet" title="Saving" description="Can’t close yet.">
        <p>Content</p>
      </Dialog>
    </div>
  );
}

/** Dos botones que abren el mismo diálogo. */
function TwoOpeners() {
  const [open, setOpen] = useState(false);
  const [which, setWhich] = useState("A");
  const show = (w: string) => {
    setWhich(w);
    setOpen(true);
  };
  return (
    <div className="stage">
      <Button id="btn-a" onClick={() => show("A")}>Edit A</Button>
      <Button id="btn-b" onClick={() => show("B")}>Edit B</Button>
      <Dialog open={open} onOpenChange={setOpen} title={`Edit ${which}`} actions={<Button onClick={() => setOpen(false)}>Close</Button>} />
    </div>
  );
}

/** Un campo con autoFocus dentro del diálogo recibe el foco al abrir. */
function AutoFocus() {
  const [open, setOpen] = useState(false);
  const origin = useRef<HTMLButtonElement>(null);
  return (
    <div className="stage">
      <Button ref={origin} id="open" onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onOpenChange={setOpen} origin={origin} title="Autofocus">
        <Button id="first">First</Button>
        <TextField id="field" label="Name" autoFocus />
      </Dialog>
    </div>
  );
}

/** Menú y tooltip, uno dentro del otro en los dos sentidos: los dos tienen que funcionar. */
function MenuTooltip() {
  const items = [{ id: "a", label: "Archive", onSelect: () => {} }];
  return (
    <div className="stage">
      <Menu items={items}>
        <Tooltip content="More (menu outside)">
          <Button id="mt1" variant="surface" size="sm">
            Menu → Tooltip
          </Button>
        </Tooltip>
      </Menu>
      <Tooltip content="More (tooltip outside)">
        <Menu items={items}>
          <Button id="mt2" variant="surface" size="sm">
            Tooltip → Menu
          </Button>
        </Menu>
      </Tooltip>
    </div>
  );
}

/** Formularios con casillas y radios: reinicio, desactivados y <fieldset disabled>. */
function ChoiceForms() {
  const opts = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ];
  return (
    <div className="stage col form">
      <form id="f1">
        <Checkbox id="c1" name="c1" label="One" />
        <RadioGroup name="r1" label="Radios" defaultValue="a" options={opts} />
        <Checkbox id="c2" name="c2" label="Disabled" defaultChecked disabled />
        <RadioGroup name="r2" label="Disabled group" defaultValue="a" disabled options={opts} />
        <RadioGroup name="r3" label="Disabled choice" defaultValue="a" options={[{ value: "a", label: "Gamma", disabled: true }, { value: "b", label: "Delta" }]} />
        <RadioGroup name="r4" label="Empty value" options={[{ value: "", label: "Any" }, { value: "x", label: "Other" }]} />
        <fieldset disabled>
          <Checkbox id="c3" name="c3" label="In a disabled fieldset" />
        </fieldset>
        <button type="reset" id="reset">Reset</button>
      </form>
    </div>
  );
}

/** Progreso con valores raros: NaN (0/0), max 0 y paso de indeterminado a un valor. */
function ProgressEdges() {
  const [v, setV] = useState<number | null>(Number.NaN);
  return (
    <div className="stage col form">
      <Progress id="p-nan" value={v} label="Upload" showValue />
      <ProgressRing id="r-nan" value={v} aria-label="Upload ring" />
      <Progress id="p-max0" value={0} max={0} label="Nothing" showValue />
      <Progress id="p-files" value={v} max={12} label="Files" showValue formatValue={(x, m) => `${x} of ${m} files`} />
      <div className="row">
        <Button id="to60" size="sm" onClick={() => setV(60)}>60</Button>
        <Button id="to7" size="sm" onClick={() => setV(7)}>7</Button>
        <Button id="toNull" size="sm" onClick={() => setV(null)}>null</Button>
      </div>
    </div>
  );
}

/** El contenido cambia mientras se ve y luego vuelve a cargar: lo que se va es lo último. */
function SkeletonStale() {
  const [loading, setLoading] = useState(false);
  const [n, setN] = useState(1);
  return (
    <div className="stage col form">
      <SkeletonSwap id="sk" loading={loading} skeleton={<Skeleton lines={2} />}>
        <p>content v{n}</p>
      </SkeletonSwap>
      <div className="row">
        <Button id="bump" size="sm" onClick={() => setN(x => x + 1)}>Bump</Button>
        <Button id="load" size="sm" onClick={() => setLoading(l => !l)}>Toggle</Button>
      </div>
      <div style={{ width: 400 }}>
        <Skeleton id="lines" lines={3} width={120} />
      </div>
    </div>
  );
}

/** Lista que cambia desde fuera a mitad de un arrastre: `window.__reorder.append()` y `.remove(id)`. */
function ReorderLive() {
  const [items, setItems] = useState(() => Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, title: `Item ${i}` })));
  const next = useRef(40);
  useEffect(() => {
    (window as unknown as { __reorder: unknown }).__reorder = {
      append: () => setItems(l => [...l, { id: `i${next.current}`, title: `Item ${next.current++}` }]),
      remove: (id: string) => setItems(l => l.filter(t => t.id !== id)),
    };
  }, []);
  return (
    <div className="stage col">
      <ReorderList
        aria-label="Live"
        items={items}
        getKey={t => t.id}
        getLabel={t => t.title}
        onReorder={setItems}
        renderItem={(t, { handle }) => (
          <div className="track">
            {handle}
            <span className="track__title">{t.title}</span>
          </div>
        )}
      />
    </div>
  );
}

const CASES: Record<string, () => ReactNode> = {
  "reorder-live": () => <ReorderLive />,
  "choice-forms": () => <ChoiceForms />,
  "progress-edges": () => <ProgressEdges />,
  "skeleton-stale": () => <SkeletonStale />,
  "menu-tooltip": () => <MenuTooltip />,
  nested: () => <Nested innerDismissible />,
  "nested-locked": () => <Nested innerDismissible={false} />,
  veto: () => <Veto />,
  "two-openers": () => <TwoOpeners />,
  autofocus: () => <AutoFocus />,
};

export function CasePage({ name }: { name: string }) {
  const render = CASES[name];
  return render ? render() : <p className="hint">No hay ningún caso «{name}».</p>;
}
