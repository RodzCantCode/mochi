"use client";
// Contenedor cuya altura sigue a su contenido con un muelle: cuando lo de dentro crece o
// encoge, el hueco se abre o se cierra en vez de saltar. En reposo no recorta nada (focos y
// sombras de dentro se ven enteros); solo recorta mientras se mueve. Si lo de dentro ya anima su
// alto (un desplegable), lo sigue al momento y no recorta.
import { forwardRef, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { useSprings, type SpringsHandle } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { SIZING_ATTR, markSizing, useLiveHeight, verticalChrome } from "../internal/useElementSize.js";
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
  // el cambio que llega se sigue al momento, sin muelle (se apunta aquí y se gasta al pintar)
  const follow = useRef(false);
  const h = useLiveHeight(inner, v => {
    const el = outer.current, hd = handle.current;
    if (!el || !hd) return;
    const shown = hd.read().h;
    // lo de dentro ya mueve su alto con un muelle (un desplegable que se abre), o es un píxel:
    // se sigue tal cual. Animarlo otra vez iría detrás y recortaría esquinas y sombras
    if (inner?.querySelector(`[${SIZING_ATTR}]`) || Math.abs(v - shown) <= 1) {
      follow.current = true;
      return;
    }
    // el contenido ha cambiado solo: antes de que se pinte, se sujeta el alto que tenía
    el.style.height = `${(shown + chrome.current).toFixed(2)}px`;
    el.style.overflow = "hidden";
    markSizing(el, true);
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
        markSizing(el, false);
      } else {
        el.style.height = `${(Math.max(0, v) + chrome.current).toFixed(2)}px`;
        el.style.overflow = "hidden";
        markSizing(el, true);
      }
    },
    { immediate: (h !== null && !measured.current) || follow.current },
  );
  useIsoLayoutEffect(() => {
    if (outer.current) chrome.current = verticalChrome(outer.current);
    if (h !== null) measured.current = true;
    follow.current = false;
  });
  return (
    <div ref={mergeRefs(ref, outer)} className={cx("mochi-autoheight", className)} {...rest}>
      <div ref={setInner} className="mochi-autoheight__inner">
        {children}
      </div>
    </div>
  );
});
