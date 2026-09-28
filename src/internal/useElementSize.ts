import { useState } from "react";
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
