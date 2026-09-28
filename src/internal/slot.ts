// Componentes que no pintan nada propio y pasan sus atributos a su hijo (Menu, Tooltip). Si uno
// envuelve a otro, los atributos del de fuera tienen que llegar al botón de dentro.
import { version, type ReactElement, type Ref } from "react";
import { cx } from "./cx.js";

/**
 * Une los atributos del hijo con los que llegan de fuera. Los manejadores (`on…`) se llaman los
 * dos, primero el del hijo; las clases, las descripciones y los estilos se suman; el id, si el
 * hijo ya tiene uno, se queda el suyo; el resto, gana el de fuera.
 */
export function mergeProps(own: Record<string, unknown>, outer: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...own };
  for (const [k, v] of Object.entries(outer)) {
    if (v === undefined) continue;
    const mine = own[k];
    // el id es la identidad del elemento: el que ya tiene no lo cambia quien lo envuelve
    if (k === "id" && mine !== undefined) continue;
    if (/^on[A-Z]/.test(k) && typeof v === "function" && typeof mine === "function") {
      out[k] = (...args: unknown[]) => {
        (mine as (...a: unknown[]) => void)(...args);
        (v as (...a: unknown[]) => void)(...args);
      };
    } else if (k === "className" || k === "aria-describedby" || k === "aria-labelledby") {
      out[k] = cx(mine as string | undefined, v as string) || undefined;
    } else if (k === "style" && typeof mine === "object" && mine && typeof v === "object") {
      out[k] = { ...(mine as object), ...(v as object) };
    } else out[k] = v;
  }
  return out;
}

/** La ref que lleva un elemento (en React 19 es una prop; en 18, un campo del elemento). */
export const refOf = (el: ReactElement): Ref<unknown> | undefined =>
  Number.parseInt(version, 10) >= 19 ? (el.props as { ref?: Ref<unknown> }).ref : (el as unknown as { ref?: Ref<unknown> }).ref;
