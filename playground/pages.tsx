// Páginas del sitio de pruebas: una por componente, con sus demos y lo que conviene probar.
import type { ReactNode } from "react";
import { MorphBox, SearchIcon, Swap, TextField } from "../src/index.js";
import { useState } from "react";
import {
  ButtonDemo,
  ChartDemo,
  ContextMenuDemo,
  DeleteDialogDemo,
  MenuDemo,
  MenuEdgesDemo,
  RenameDialogDemo,
  SheetDemo,
  PaletteDemo,
  PlayerDemo,
  SegmentedDemo,
  SignUpDemo,
  SliderDemo,
  SwitchDemo,
  ToastDemo,
} from "./demos.js";

export interface Section {
  title: string;
  /** Qué probar, en una frase. */
  hint?: string;
  wide?: boolean;
  render: (ctx: PageContext) => ReactNode;
}
export interface PageContext {
  openPalette: (open: boolean) => void;
}
export interface Page {
  id: string;
  name: string;
  group: string;
  summary: string;
  /** Lo que se importa para usarlo. */
  imports?: string;
  isNew?: boolean;
  /** Demo de la portada. */
  overview?: (ctx: PageContext) => ReactNode;
  sections: Section[];
}

function MorphDemo() {
  const steps = ["Hello", "A longer label", "✓"];
  const [i, setI] = useState(0);
  return (
    <div className="stage col">
      <MorphBox as="button" type="button" contentKey={i} padding={i === 2 ? "0" : "0 22px"} height={48} width={i === 2 ? 48 : undefined} pressScale={0.965} onClick={() => setI((i + 1) % steps.length)}>
        {steps[i]}
      </MorphBox>
      <span className="hint">
        Swap solo: <Swap id={i}>{["uno", "dos", "tres"][i]}</Swap>
      </span>
    </div>
  );
}

function FieldStates() {
  return (
    <div className="stage col form">
      <TextField label="Name" defaultValue="Ada Lovelace" />
      <TextField label="Search" icon={<SearchIcon size={20} />} placeholder="Projects, people…" />
      <TextField label="Username" defaultValue="ada" valid description="This name is available" />
      <TextField label="Email" defaultValue="ada@" error="Enter a valid email address" />
      <TextField label="Company" disabled defaultValue="Analytical Engines Ltd." />
    </div>
  );
}

export const PAGES: Page[] = [
  {
    id: "button",
    name: "Button",
    group: "Acciones",
    summary: "Normal → cargando (se encoge a círculo) → hecho (el check se dibuja). useButtonStatus lo gestiona solo.",
    imports: "Button, useButtonStatus",
    overview: () => <ButtonDemo />,
    sections: [
      { title: "Estados", hint: "Pulsa «Get started» o «Save»: cargan, terminan y vuelven.", render: () => <ButtonDemo /> },
    ],
  },
  {
    id: "menu",
    name: "Menu",
    group: "Acciones",
    isNew: true,
    summary: "El botón «…» se transforma en el menú y vuelve a ser botón al cerrar. También con clic derecho o pulsación larga, creciendo desde el punto. Se coloca solo para no salirse de la ventana.",
    imports: "Menu, ContextMenu",
    overview: () => <MenuDemo />,
    sections: [
      { title: "Botón", hint: "Ábrelo con clic o con Enter y muévete con flechas o escribiendo la inicial. «Delete» abre la confirmación desde el mismo botón.", render: () => <MenuDemo /> },
      { title: "Contextual", hint: "En el móvil, mantén el dedo medio segundo.", render: () => <ContextMenuDemo /> },
      { title: "Colocación", hint: "Cada uno prefiere un lado; si no cabe, se da la vuelta. Prueba a hacer la ventana pequeña.", render: () => <MenuEdgesDemo /> },
    ],
  },
  {
    id: "switch",
    name: "Switch",
    group: "Controles",
    summary: "Interruptor cuya bolita se estira al cambiar: cada borde va en su propio muelle.",
    imports: "Switch",
    overview: () => <SwitchDemo />,
    sections: [{ title: "Tamaños", hint: "Mantenlo pulsado: la bolita se alarga hacia donde va a ir.", render: () => <SwitchDemo /> }],
  },
  {
    id: "segmented",
    name: "Segmented control",
    group: "Controles",
    summary: "Pestañas con indicador líquido; las etiquetas cambian de color justo por donde pasa.",
    imports: "SegmentedControl",
    overview: () => <SegmentedDemo />,
    sections: [{ title: "Ejemplo", hint: "Salta de «Day» a «Month»: el indicador se estira por el camino. También con flechas.", render: () => <SegmentedDemo /> }],
  },
  {
    id: "slider",
    name: "Slider",
    group: "Controles",
    summary: "Manipulación directa; al pasarte del límite se estira y al soltar vuelve con su velocidad.",
    imports: "Slider, VolumeIcon",
    overview: () => <SliderDemo />,
    sections: [{ title: "Volumen", render: () => <SliderDemo /> }],
  },
  {
    id: "text-field",
    name: "Text field",
    group: "Controles",
    isNew: true,
    summary: "La etiqueta sube al escribir, el anillo marca foco y error, el mensaje entra con desenfoque y «correcto» dibuja un check.",
    imports: "TextField",
    overview: () => <SignUpDemo />,
    sections: [
      { title: "Formulario", hint: "Escribe un correo a medias y sal del campo, o envía vacío: el error aparece y el foco va al primer campo mal.", render: () => <SignUpDemo /> },
      { title: "Estados", hint: "Relleno, con icono, correcto, con error y desactivado.", render: () => <FieldStates /> },
    ],
  },
  {
    id: "dialog",
    name: "Dialog y sheet",
    group: "Superposiciones",
    isNew: true,
    summary: "En pantallas anchas, una ventana que crece desde el botón que la abre y vuelve a él al cerrar. En móvil, una hoja que sube desde abajo y se cierra arrastrándola.",
    imports: "Dialog",
    overview: () => <DeleteDialogDemo />,
    sections: [
      { title: "Confirmación", hint: "Ábrela y ciérrala con Esc, con Cancel o pulsando fuera: vuelve al botón. Delete carga y cierra.", render: () => <DeleteDialogDemo /> },
      { title: "Formulario", hint: "El foco empieza en el campo; Tab no se sale de la ventana. Bórralo todo para ver el error.", render: () => <RenameDialogDemo /> },
      { title: "Hoja", hint: "Arrástrala hacia abajo por la parte de arriba: si la sueltas pronto vuelve, si la lanzas se cierra.", render: () => <SheetDemo /> },
    ],
  },
  {
    id: "palette",
    name: "Command palette",
    group: "Superposiciones",
    summary: "Paleta ⌘K: filtra al escribir, el resaltado se desliza, Enter ejecuta, Esc cierra.",
    imports: "CommandPalette, CommandPaletteTrigger, useCommandK, Kbd",
    overview: ctx => <PaletteDemo setOpen={ctx.openPalette} />,
    sections: [{ title: "Disparadores", hint: "Escribe «sa» y pulsa Enter.", render: ctx => <PaletteDemo setOpen={ctx.openPalette} /> }],
  },
  {
    id: "toast",
    name: "Toast",
    group: "Superposiciones",
    summary: "Aviso en píldora; si llega otro, la píldora se transforma en el nuevo.",
    imports: "Toaster, toast",
    overview: () => <ToastDemo />,
    sections: [{ title: "Avisos", hint: "Pulsa los dos seguidos: el primero se transforma en el segundo.", render: () => <ToastDemo /> }],
  },
  {
    id: "player",
    name: "Media player",
    group: "Contenido",
    summary: "Island compacta que se abre en reproductor: play/pausa que se transforma y barra arrastrable.",
    imports: "MediaPlayer",
    overview: () => <PlayerDemo />,
    sections: [{ title: "Island", hint: "Pulsa la island para abrirla; arrastra la barra.", wide: true, render: () => <PlayerDemo /> }],
  },
  {
    id: "chart",
    name: "Chart card",
    group: "Contenido",
    summary: "La línea se dibuja sola; tooltip con puntero o flechas; la cifra cuenta hasta su valor.",
    imports: "ChartCard, LineChart",
    overview: () => <ChartDemo />,
    sections: [{ title: "Ingresos", hint: "Cambia de periodo y pasa el puntero por la línea.", wide: true, render: () => <ChartDemo /> }],
  },
  {
    id: "morph",
    name: "MorphBox y Swap",
    group: "Base",
    summary: "Las piezas con las que están hechos los demás: una forma que ajusta tamaño y esquinas, y el cambio de contenido con desenfoque.",
    imports: "MorphBox, Swap",
    sections: [{ title: "Forma", hint: "Pulsa para pasar por tres contenidos distintos.", render: () => <MorphDemo /> }],
  },
];

export const GROUPS = ["Acciones", "Controles", "Superposiciones", "Contenido", "Base"];
