// Piezas comunes de la casilla (Checkbox) y el botón de opción (RadioGroup): el mensaje de
// ayuda o de error bajo la etiqueta y el hundirse al pulsar.
import { useState, type ReactNode, type RefObject } from "react";
import { AlertIcon } from "../icons/index.js";
import { AutoHeight } from "../components/AutoHeight.js";
import { Swap } from "../components/Swap.js";

/** Si `error` marca error y si además trae texto que enseñar (con `true` solo se marca). */
export function readError(error: ReactNode): { invalid: boolean; showsError: boolean } {
  const invalid = error !== undefined && error !== null && error !== false;
  return { invalid, showsError: invalid && error !== true };
}

export const hasContent = (n: ReactNode) => n !== undefined && n !== null && n !== false && n !== "";

/**
 * La ayuda o el error bajo la etiqueta: el texto entra con desenfoque y la fila crece con un
 * muelle, como en TextField. `id` es el que enlaza el control con `aria-describedby`.
 */
export function ChoiceMessage({ id, description, error }: { id: string; description?: ReactNode; error?: ReactNode }) {
  const { showsError } = readError(error);
  const message = showsError ? error : description;
  const has = hasContent(message);
  const key = !has ? "none" : showsError ? `e:${typeof error === "string" ? error : "node"}` : `d:${typeof description === "string" ? description : "node"}`;
  return (
    <AutoHeight className="mochi-choice__msg">
      <div id={id} aria-live="polite">
        <Swap id={key} align="start" enterScale={1} blur={8}>
          {has ? (
            <span className="mochi-choice__msgtext" data-kind={showsError ? "error" : "hint"}>
              {showsError ? <AlertIcon size={16} /> : null}
              <span>{message}</span>
            </span>
          ) : null}
        </Swap>
      </div>
    </AutoHeight>
  );
}

/**
 * Hundirse al pulsar: con el puntero (en el control o en su etiqueta) y con Espacio. Se suelta al
 * levantar, al salir, con cualquier otra tecla y al perder el foco. No se hunde si el control está
 * desactivado, también cuando lo desactiva un <fieldset disabled>.
 */
export function usePress(control: RefObject<HTMLElement | null>, disabled: boolean | undefined) {
  const [pressed, setPressed] = useState(false);
  const set = (on: boolean) => {
    if (on && (disabled || control.current?.matches(":disabled"))) return;
    setPressed(on);
  };
  const release = () => set(false);
  return {
    pressed: pressed && !disabled,
    pointer: {
      onPointerDown: (e: { button: number }) => {
        if (e.button === 0) set(true);
      },
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
    },
    onKeyDown: (key: string) => set(key === " "),
    onKeyUp: release,
    onBlur: release,
  };
}
