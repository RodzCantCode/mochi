// Dónde colocar lo que se abre junto a otra cosa (menú, selector, tooltip) sin salirse de la
// ventana. Funciones puras: se prueban sin navegador.

export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";
export type TooltipSide = "top" | "bottom" | "left" | "right";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Size {
  w: number;
  h: number;
}

export const MARGIN = 8; // con los bordes de la ventana
const MENU_GAP = 6; // entre el botón y el menú
const MIN_LIST = 56; // alto mínimo de una lista (una fila y su relleno)

export interface Placed {
  x: number;
  y: number;
  /** Alto disponible; si la lista es más alta, se desplaza dentro. */
  maxH: number;
  side: "top" | "bottom";
}

/**
 * Dónde va un menú o una lista. Con un botón (`anchor` con tamaño) se abre debajo o encima,
 * alineado a su inicio o su final; con un punto (w = h = 0) se abre hacia abajo y a la derecha
 * del punto. En los dos casos se da la vuelta si no cabe y nunca se sale de la ventana.
 */
export function placeMenu(anchor: Box, size: Size, viewport: Size, placement: MenuPlacement = "bottom-start"): Placed {
  const point = anchor.w === 0 && anchor.h === 0;
  const gap = point ? 2 : MENU_GAP;
  const below = viewport.h - (anchor.y + anchor.h) - gap - MARGIN;
  const above = anchor.y - gap - MARGIN;
  const wantTop = placement.startsWith("top");
  let side: "top" | "bottom" = wantTop ? "top" : "bottom";
  if (side === "bottom" && size.h > below && above > below) side = "top";
  else if (side === "top" && size.h > above && below > above) side = "bottom";
  const maxH = Math.max(MIN_LIST, side === "bottom" ? below : above);
  const h = Math.min(size.h, maxH);
  const y = side === "bottom" ? anchor.y + anchor.h + gap : anchor.y - gap - h;

  const w = Math.min(size.w, viewport.w - MARGIN * 2);
  let x: number;
  if (point) x = anchor.x + w > viewport.w - MARGIN ? anchor.x - w : anchor.x;
  else x = placement.endsWith("end") ? anchor.x + anchor.w - w : anchor.x;
  x = Math.max(MARGIN, Math.min(x, viewport.w - MARGIN - w));
  return { x, y: Math.max(MARGIN, y), maxH, side };
}

/**
 * Dónde va un tooltip: centrado en el lado pedido del elemento, a `gap` px. Si no cabe en ese
 * lado, pasa al contrario; y en el otro eje se corre lo justo para no salirse de la ventana.
 */
export function placeTooltip(anchor: Box, size: Size, viewport: Size, side: TooltipSide = "top", gap = 8): { x: number; y: number; side: TooltipSide } {
  const fits: Record<TooltipSide, boolean> = {
    top: anchor.y - gap - size.h >= MARGIN,
    bottom: anchor.y + anchor.h + gap + size.h <= viewport.h - MARGIN,
    left: anchor.x - gap - size.w >= MARGIN,
    right: anchor.x + anchor.w + gap + size.w <= viewport.w - MARGIN,
  };
  const opposite: Record<TooltipSide, TooltipSide> = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const s = !fits[side] && fits[opposite[side]] ? opposite[side] : side;
  let x: number, y: number;
  if (s === "top" || s === "bottom") {
    x = anchor.x + anchor.w / 2 - size.w / 2;
    y = s === "top" ? anchor.y - gap - size.h : anchor.y + anchor.h + gap;
  } else {
    x = s === "left" ? anchor.x - gap - size.w : anchor.x + anchor.w + gap;
    y = anchor.y + anchor.h / 2 - size.h / 2;
  }
  x = Math.max(MARGIN, Math.min(x, viewport.w - MARGIN - size.w));
  y = Math.max(MARGIN, Math.min(y, viewport.h - MARGIN - size.h));
  return { x, y, side: s };
}
