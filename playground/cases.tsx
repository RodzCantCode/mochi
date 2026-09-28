// Casos límite de las superposiciones para las pruebas de interacción (test/e2e.mjs). No salen
// en el menú del sitio: se abren con #/_cases/<nombre>.
import { useRef, useState, type ReactNode } from "react";
import { Button, Dialog, TextField } from "../src/index.js";

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

const CASES: Record<string, () => ReactNode> = {
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
