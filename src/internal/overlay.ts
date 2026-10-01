// Piezas comunes de lo que se abre encima de la página (diálogo, hoja, menú): bloquear el
// desplazamiento, cerrar con Esc solo la capa de arriba, retener el foco y leer de dónde sale
// la forma (el botón que la abre) para crecer desde él.
import { useEffect, useRef, useState, type RefObject } from "react";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect.js";
import { useElementSize } from "./useElementSize.js";

// ---------------------------------------------------------------------------------------
// Desplazamiento bloqueado (con contador: varias capas a la vez)

let locks = 0;
let saved: { overflow: string; paddingRight: string; release: () => void } | null = null;

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const root = document.documentElement;
    if (locks++ === 0) {
      // sin barra de desplazamiento la página se ensancharía: se compensa su hueco
      const bar = window.innerWidth - root.clientWidth;
      saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight, release: watchKeyboardScroll() };
      root.style.overflow = "hidden";
      if (bar > 0) root.style.paddingRight = `${bar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        root.style.overflow = saved.overflow;
        root.style.paddingRight = saved.paddingRight;
        saved.release();
        saved = null;
      }
    };
  }, [active]);
}

const EDITABLE = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select';
const editableFocused = () => {
  const a = document.activeElement;
  return a instanceof HTMLElement && (a.isContentEditable || a.matches(EDITABLE));
};

/**
 * Safari de iOS desplaza la página al sacar el teclado aunque esté bloqueada; al soltar, la
 * página vuelve a donde la dejó la app. Solo se deshace lo del teclado: lo que se desplazó con
 * un campo enfocado o mientras cambiaba la parte visible, y solo si la parte visible cambió (sin
 * teclado no hay nada que deshacer). Lo que mueve la app (p. ej. `scrollIntoView()` al elegir
 * una orden) se queda: también si lo hace justo antes de soltar, aún sin evento de scroll.
 */
function watchKeyboardScroll(): () => void {
  const vv = window.visualViewport;
  const pos = () => ({ x: window.scrollX, y: window.scrollY });
  let target = pos();
  let seen = target;
  let resized = false;
  let resizedAt = -Infinity;
  const onResize = () => {
    resized = true;
    resizedAt = performance.now();
  };
  const onScroll = () => {
    seen = pos();
    if (!editableFocused() && performance.now() - resizedAt > 500) target = seen;
  };
  vv?.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    vv?.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    const now = pos();
    const unseen = now.x !== seen.x || now.y !== seen.y;
    if (resized && !unseen && (now.x !== target.x || now.y !== target.y)) window.scrollTo(target.x, target.y);
  };
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

/**
 * Mientras se cierra (sale animada) no se puede usar: ni con Tab ni con un lector de pantalla.
 * Va después del efecto que devuelve el foco: si lo tenía dentro, primero sale.
 */
export function useInertWhileClosing(open: boolean, el: RefObject<HTMLElement | null>) {
  useIsoLayoutEffect(() => {
    const e = el.current as (HTMLElement & { inert?: boolean }) | null;
    if (e) e.inert = !open;
  }, [open]);
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
  // un botón de Mochi que está cambiando de tono: manda el tono al que va (el de su copia que crece)
  const toward = el.querySelector<HTMLElement>(":scope > .mochi-morph__reveal");
  const bg = toward ? getComputedStyle(toward).backgroundColor : cs.backgroundColor;
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
  // si el botón está a medio cambiar, la copia es como va a quedar: sin el contenido que sale,
  // sin su tono nuevo creciendo y con el contenido nuevo entero
  for (const n of Array.from(g.querySelectorAll(".mochi-morph__reveal, [data-leaving]"))) n.remove();
  for (const n of Array.from(g.querySelectorAll<HTMLElement>(".mochi-swap__layer"))) {
    n.style.opacity = "";
    n.style.filter = "";
    n.style.transform = "";
  }
  g.setAttribute("aria-hidden", "true");
  g.setAttribute("tabindex", "-1");
  g.setAttribute("inert", "");
  g.style.cssText += ";position:absolute;left:0;top:0;margin:0;opacity:1;transform:none;background:transparent;box-shadow:none;pointer-events:none;";
  return g;
}

/**
 * Al cerrar, el botón puede haber cambiado (su texto, su tono o su ancho, p. ej. «Filters» →
 * «Filters · 2»): la copia se rehace con su aspecto de ahora y, mientras cambie de tamaño, se
 * vuelve a pintar para que la forma aterrice en él y no en como era al abrir.
 */
export function useOriginOnClose(open: boolean, origin: Origin | null, ghostBox: RefObject<HTMLDivElement | null>) {
  // mientras vuelve, cada cambio de tamaño del botón repinta; la copia se rehace con él (con su
  // ancho de ese momento, para que no se recorte)
  const size = useElementSize(!open && origin ? origin.el : null);
  const first = useRef(true);
  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const gb = ghostBox.current;
    if (gb && origin && origin.el.isConnected) gb.replaceChildren(ghostOf(origin.el));
  }, [open, size]);
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

/** Si se cumple una media query (p. ej. "(pointer: coarse)"). En el servidor, false. */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [query]);
  return match;
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
  const sb = opts.tint ? growBlur(v.p) : 0;
  shape.style.filter = sb > 0.05 ? `blur(${sb.toFixed(2)}px)` : "";
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

/**
 * Desenfoque de la forma mientras crece desde un botón de otro tono (negro → blanco): sin él, el
 * aro del tono viejo que rodea al nuevo tiene bordes muy marcados. Sigue a la copia del tono
 * nuevo (p, de 0 a 1,06): nace en el botón sin desenfoque, sube deprisa y se va mientras el tono
 * nuevo acaba de cubrirlo todo. Al cerrar, igual al revés.
 */
const GROW_BLUR = 6;
const growBlur = (p: number) => GROW_BLUR * Math.min(1, Math.max(0, p) / 0.15) * clamp01((1.06 - p) / 0.26);

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
