"use client";
// Contenedor cuya altura sigue a su contenido con un muelle: cuando lo de dentro crece o
// encoge, el hueco se abre o se cierra en vez de saltar. En reposo no recorta nada (focos y
// sombras de dentro se ven enteros); solo recorta mientras se mueve.
import { forwardRef, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { useSprings, type SpringsHandle } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useLiveHeight, verticalChrome } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { mergeRefs } from "../internal/refs.js";
import { cx } from "../internal/cx.js";

export interface AutoHeightProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const AutoHeight = forwardRef<HTMLDivElement, AutoHeightProps>(function AutoHeight({ children, className, ...rest }, ref) {
  const outer = useRef<HTMLDivElement>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  // relleno y borde propios (con border-box, el alto los incluye)
  const chrome = useRef(0);
  const handle = useRef<SpringsHandle<"h"> | null>(null);
  const h = useLiveHeight(inner, () => {
    // el contenido ha cambiado solo: antes de que se pinte, se sujeta el alto que tenía
    const el = outer.current, hd = handle.current;
    if (!el || !hd) return;
    el.style.height = `${(hd.read().h + chrome.current).toFixed(2)}px`;
    el.style.overflow = "hidden";
  });
  // la primera medida se coloca sin animar (se apunta al pintar, no al renderizar)
  const measured = useRef(false);
  handle.current = useSprings(
    { h: h ?? 0 },
    springs.morph,
    ({ h: v }) => {
      const el = outer.current;
      if (!el || h === null) return;
      if (Math.abs(v - h) < 0.5) {
        el.style.height = "";
        el.style.overflow = "";
      } else {
        el.style.height = `${(Math.max(0, v) + chrome.current).toFixed(2)}px`;
        el.style.overflow = "hidden";
      }
    },
    { immediate: h !== null && !measured.current },
  );
  useIsoLayoutEffect(() => {
    if (outer.current) chrome.current = verticalChrome(outer.current);
    if (h !== null) measured.current = true;
  });
  return (
    <div ref={mergeRefs(ref, outer)} className={cx("mochi-autoheight", className)} {...rest}>
      <div ref={setInner} className="mochi-autoheight__inner">
        {children}
      </div>
    </div>
  );
});
