// Piezas comunes de lo que se abre encima de la página (diálogo, hoja, menú): bloquear el
// desplazamiento, cerrar con Esc solo la capa de arriba, retener el foco y leer de dónde sale
// la forma (el botón que la abre) para crecer desde él.
import { useEffect, useRef, useState } from "react";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect.js";

// ---------------------------------------------------------------------------------------
// Desplazamiento bloqueado (con contador: varias capas a la vez)

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const root = document.documentElement;
    if (locks++ === 0) {
      // sin barra de desplazamiento la página se ensancharía: se compensa su hueco
      const bar = window.innerWidth - root.clientWidth;
      saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
      root.style.overflow = "hidden";
      if (bar > 0) root.style.paddingRight = `${bar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        root.style.overflow = saved.overflow;
        root.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}

// ---------------------------------------------------------------------------------------
// Esc cierra solo la capa de arriba

const stack: Array<{ current: () => void }> = [];
let listening = false;
function onKey(e: KeyboardEvent) {
  // quien ya lo gestionó (p. ej. la paleta de comandos en su buscador) lo marca con preventDefault
  if (e.key !== "Escape" || e.defaultPrevented) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.current();
}

/** Registra una capa abierta; Esc llama a `onEscape` de la última que se abrió. */
export function useEscapeLayer(active: boolean, onEscape: () => void) {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const entry = { current: () => ref.current() };
    stack.push(entry);
    if (!listening) {
      document.addEventListener("keydown", onKey);
      listening = true;
    }
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}

// ---------------------------------------------------------------------------------------
// Foco retenido

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest("[inert]"),
  );
}

/** Tab y Mayús+Tab dan la vuelta dentro de `root`. Devuelve true si movió el foco. */
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault: () => void }, root: HTMLElement): boolean {
  if (e.key !== "Tab") return false;
  const list = focusables(root);
  if (!list.length) {
    e.preventDefault();
    root.focus();
    return true;
  }
  const first = list[0]!, last = list[list.length - 1]!;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root || !root.contains(active))) {
    e.preventDefault();
    last.focus();
    return true;
  }
  if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------
// De dónde sale la forma

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export interface Origin {
  el: HTMLElement;
  rect: Rect;
  /** Color de fondo del botón; null si es transparente. */
  background: string | null;
}

export function readOrigin(el: HTMLElement | null | undefined): Origin | null {
  if (!el || typeof window === "undefined" || !el.isConnected) return null;
  const b = el.getBoundingClientRect();
  if (b.width < 1 || b.height < 1) return null;
  const cs = getComputedStyle(el);
  const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, b.height / 2, b.width / 2);
  const bg = cs.backgroundColor;
  const transparent = !bg || bg === "transparent" || /rgba\([^)]*,\s*0\)$/.test(bg);
  return { el, rect: { x: b.left, y: b.top, w: b.width, h: b.height, r }, background: transparent ? null : bg };
}

/** El elemento enfocado, si es un botón o enlace (del que puede salir la forma). */
export function focusedTrigger(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.activeElement;
  return el instanceof HTMLElement && el.matches('button, a[href], [role="button"]') ? el : null;
}

// Ocultar el botón mientras la forma es él. Con contador: un menú y el diálogo que abre pueden
// salir del mismo botón a la vez.
const hidden = new WeakMap<HTMLElement, { count: number; opacity: string }>();
export function hideOrigin(el: HTMLElement) {
  const h = hidden.get(el);
  if (h) h.count++;
  else {
    hidden.set(el, { count: 1, opacity: el.style.opacity });
    el.style.opacity = "0";
  }
}
export function showOrigin(el: HTMLElement) {
  const h = hidden.get(el);
  if (!h) return;
  if (--h.count > 0) return;
  el.style.opacity = h.opacity;
  hidden.delete(el);
}

/** Copia del botón para que su contenido se desvanezca dentro de la forma que crece. */
export function ghostOf(el: HTMLElement): HTMLElement {
  const g = el.cloneNode(true) as HTMLElement;
  g.removeAttribute("id");
  for (const n of Array.from(g.querySelectorAll("[id]"))) n.removeAttribute("id");
  g.setAttribute("aria-hidden", "true");
  g.setAttribute("tabindex", "-1");
  g.setAttribute("inert", "");
  g.style.cssText += ";position:absolute;left:0;top:0;margin:0;opacity:1;transform:none;background:transparent;box-shadow:none;pointer-events:none;";
  return g;
}

/**
 * La parte de la ventana que se ve de verdad. En iOS, al salir el teclado, la ventana no cambia
 * de tamaño pero la parte visible sí (y a veces se desplaza): lo fijo en pantalla se queda
 * debajo del teclado o da un salto. Con esto, una capa se coloca justo sobre la parte visible.
 */
export function useVisualViewport(active: boolean): { top: number; height: number } | null {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useIsoLayoutEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return;
    const read = () =>
      setBox(prev => (prev && prev.top === vv.offsetTop && prev.height === vv.height ? prev : { top: vv.offsetTop, height: vv.height }));
    read();
    vv.addEventListener("resize", read);
    vv.addEventListener("scroll", read);
    return () => {
      vv.removeEventListener("resize", read);
      vv.removeEventListener("scroll", read);
      setBox(null);
    };
  }, [active]);
  return box;
}

/** Tamaño de la ventana, al día al redimensionar. */
export function useViewport() {
  const read = () => (typeof window === "undefined" ? { w: 1024, h: 768 } : { w: window.innerWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(prev => {
      const n = read();
      return n.w === prev.w && n.h === prev.h ? prev : n;
    });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

// ---------------------------------------------------------------------------------------
// Pintar un fotograma de la forma que crece desde el botón

export interface GrowElements {
  shape: HTMLElement;
  shadow?: HTMLElement | null;
  reveal?: HTMLElement | null;
  ghost?: HTMLElement | null;
  content?: HTMLElement | null;
}
export interface GrowFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  /** Tamaño de la copia del tono nuevo (0 a 1,06). */
  p: number;
  /** Visibilidad del contenido. */
  o: number;
  /** Visibilidad de la copia del botón. */
  g: number;
}

/**
 * Coloca la forma en (x, y, w, h, r). El contenido se queda quieto en su sitio final (`to`) y la
 * forma lo va descubriendo. Si el botón era de otro tono (`tint`), ese tono queda debajo y el de
 * la superficie crece desde el centro, para no fundir negro con blanco.
 */
export function paintGrow(
  els: GrowElements,
  v: GrowFrame,
  opts: {
    to: Rect;
    tint: string | null;
    shadow: number;
    fadeContent: boolean;
    ghost: { w: number; h: number } | null;
    blur: number;
    /** Opacidad de la forma entera (1 si no se indica). */
    opacity?: number;
  },
) {
  const { shape, shadow, reveal, ghost, content } = els;
  const w = Math.max(0, v.w), h = Math.max(0, v.h);
  const r = Math.min(v.r, h / 2, w / 2);
  for (const e of [shape, shadow]) {
    if (!e) continue;
    e.style.transform = `translate(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px)`;
    e.style.width = `${w.toFixed(2)}px`;
    e.style.height = `${h.toFixed(2)}px`;
    e.style.borderRadius = `${r.toFixed(2)}px`;
  }
  shape.style.opacity = (opts.opacity ?? 1).toFixed(4);
  // un foco dentro antes de crecer (autoFocus) puede haber desplazado la forma, que recorta
  if (shape.scrollTop) shape.scrollTop = 0;
  if (shape.scrollLeft) shape.scrollLeft = 0;
  if (shadow) shadow.style.opacity = clamp01(opts.shadow).toFixed(3);
  if (reveal) {
    if (opts.tint && v.p < 1) {
      shape.style.background = opts.tint;
      const p = Math.max(0, Math.min(v.p, 1.06));
      reveal.style.display = p > 0.001 ? "block" : "none";
      reveal.style.width = `${w * p}px`;
      reveal.style.height = `${h * p}px`;
      reveal.style.left = `${(w - w * p) / 2}px`;
      reveal.style.top = `${(h - h * p) / 2}px`;
      reveal.style.borderRadius = `${r * p}px`;
    } else {
      if (shape.style.background) shape.style.background = "";
      reveal.style.display = "none";
    }
  }
  if (content) {
    content.style.transform = `translate(${(opts.to.x - v.x).toFixed(2)}px, ${(opts.to.y - v.y).toFixed(2)}px)`;
    const o = opts.fadeContent ? clamp01(v.o) : 1;
    content.style.opacity = o.toFixed(4);
    const b = (1 - o) * opts.blur;
    content.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
  }
  if (ghost && opts.ghost) {
    const g = clamp01(v.g);
    ghost.style.opacity = g.toFixed(4);
    ghost.style.transform = `translate(${((w - opts.ghost.w) / 2).toFixed(2)}px, ${((h - opts.ghost.h) / 2).toFixed(2)}px)`;
    const b = (1 - g) * opts.blur;
    ghost.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
  }
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const nearRect = (v: { x: number; y: number; w: number; h: number }, r: Rect, eps = 0.5) =>
  Math.abs(v.x - r.x) < eps && Math.abs(v.y - r.y) < eps && Math.abs(v.w - r.w) < eps && Math.abs(v.h - r.h) < eps;

/** Color de fondo que tendría `el` sin estilo en línea (el de su clase). */
export function classBackground(el: HTMLElement): string {
  const inline = el.style.background;
  el.style.background = "";
  const bg = getComputedStyle(el).backgroundColor;
  el.style.background = inline;
  return bg;
}
