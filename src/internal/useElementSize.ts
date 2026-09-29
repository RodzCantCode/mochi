import { useRef, useState } from "react";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect.js";

/** Tamaño de la caja de un elemento (sin transformaciones), actualizado con ResizeObserver. */
export function useElementSize(el: HTMLElement | null): { width: number; height: number } | null {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useIsoLayoutEffect(() => {
    if (!el) return;
    const read = () => {
      const width = el.offsetWidth, height = el.offsetHeight;
      setSize(prev => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return size;
}

/**
 * Alto de un elemento, medido tras cada render (antes de pintar) y cuando cambia solo (una
 * imagen que carga, una fuente). Así quien anima su altura parte siempre de la buena, sin un
 * fotograma con el alto nuevo antes de empezar.
 */
export function useLiveHeight(el: HTMLElement | null, onResize?: (height: number) => void): number | null {
  const [h, setH] = useState<number | null>(null);
  const last = useRef<number | null>(null);
  const cb = useRef(onResize);
  cb.current = onResize;
  useIsoLayoutEffect(() => {
    if (!el) return;
    const v = el.offsetHeight;
    if (v === last.current) return;
    last.current = v;
    setH(v);
  });
  useIsoLayoutEffect(() => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const v = el.offsetHeight;
      if (v === last.current) return;
      // cambió sin render de React (una imagen, un hijo con su estado): React pintará el alto
      // nuevo más tarde, así que quien anima se entera ya, antes de este fotograma
      cb.current?.(v);
      last.current = v;
      setH(v);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return h;
}

/**
 * Marca de «un muelle está moviendo mi alto» (un desplegable que se abre, un AutoHeight que se
 * adapta). Un AutoHeight de fuera que la ve dentro sigue ese crecimiento al momento en vez de
 * animarlo otra vez: un segundo muelle iría detrás y recortaría lo de dentro (esquinas y sombras).
 */
export const SIZING_ATTR = "data-mochi-sizing";
export function markSizing(el: HTMLElement, on: boolean) {
  if (on === el.hasAttribute(SIZING_ATTR)) return;
  if (on) el.setAttribute(SIZING_ATTR, "");
  else el.removeAttribute(SIZING_ATTR);
}

/** Relleno y borde verticales de un elemento (con box-sizing: border-box, su alto los incluye). */
export function verticalChrome(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  return (
    (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0)
  );
}
