"use client";
// Tooltip: una etiqueta pequeña que sale del elemento al pasar el ratón por encima (tras una
// espera corta) o al enfocarlo con el teclado. Solo hay uno en pantalla: si ya se ve y pasas a
// otro elemento, viaja hasta él, cambia de tamaño y cambia el texto con desenfoque, sin espera.
// Se puede pasar el ratón por encima sin que se vaya, Esc lo cierra y en pantallas táctiles no
// aparece (no hay «pasar por encima»).
//
// El globo es un único elemento fuera del árbol de React (lo mueve este archivo con sus propios
// muelles); cada Tooltip pinta su texto dentro con un portal. Así ni un <Suspense> ni desmontar
// el primer Tooltip de la página pueden dejar a los demás sin globo.
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type HTMLAttributes,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Spring, type SpringConfig } from "../motion/spring.js";
import { now } from "../motion/useSprings.js";
import { prefersReducedMotion } from "../motion/reducedMotion.js";
import { springs, swap as SWAP } from "../tokens.js";
import { mergeRefs } from "../internal/refs.js";
import { mergeProps, refOf } from "../internal/slot.js";
import { cx } from "../internal/cx.js";
import { useEscapeLayer } from "../internal/overlay.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { placeTooltip, type TooltipSide } from "../internal/placement.js";

export type { TooltipSide } from "../internal/placement.js";

export interface TooltipProps extends Omit<HTMLAttributes<HTMLElement>, "content" | "children"> {
  /** El texto del tooltip. Corto: una o dos palabras («Copy link»). */
  content: ReactNode;
  /** El elemento que lo lleva. Recibe ref, los manejadores de ratón y foco y lo que llegue de fuera. */
  children: ReactElement;
  /** Lado preferido; si no cabe, pasa al contrario. */
  side?: TooltipSide;
  /** Espera antes de aparecer con el ratón, en ms. */
  delay?: number;
  disabled?: boolean;
  /** Clase del globo mientras es de este tooltip. */
  bubbleClassName?: string;
}

const HIDE_GRACE = 100; // ms para llegar con el ratón al globo sin que se vaya
const WARM = 500; // ms durante los que el siguiente tooltip sale sin espera

// ---------------------------------------------------------------------------------------
// El globo

interface Owner {
  id: string;
  anchor: () => HTMLElement | null;
  side: () => TooltipSide;
  className: () => string | undefined;
  onHover: (over: boolean) => void;
  /** Otro tooltip se ha quedado el globo. */
  onReplaced: () => void;
  /** Su texto ya se ha desvanecido: puede dejar de pintarlo. */
  onLayerGone: () => void;
}
interface Layer {
  owner: Owner;
  el: HTMLSpanElement;
  v: Spring;
}

const SHAPE: SpringConfig = springs.snappy;
let shell: HTMLDivElement | null = null;
let inner: HTMLSpanElement | null = null;
let current: Layer | null = null;
const layers: Layer[] = [];
const geo = { x: new Spring(0, SHAPE), y: new Spring(0, SHAPE), w: new Spring(0, SHAPE), h: new Spring(0, SHAPE), v: new Spring(0, springs.snappy) };
let placedSide: TooltipSide = "top";
let raf = 0;
let warmUntil = 0;

const ORIGIN: Record<TooltipSide, string> = { top: "50% 100%", bottom: "50% 0", left: "100% 50%", right: "0 50%" };
// hacia dónde queda el elemento, para salir de él
const TOWARD: Record<TooltipSide, [number, number]> = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };

function ensureShell() {
  if (shell && shell.isConnected) return;
  shell = document.createElement("div");
  shell.className = "mochi-tooltip";
  shell.setAttribute("role", "tooltip");
  shell.setAttribute("aria-hidden", "true");
  shell.dataset.state = "closed";
  shell.style.opacity = "0";
  inner = document.createElement("span");
  inner.className = "mochi-tooltip__inner";
  shell.appendChild(inner);
  shell.addEventListener("pointerenter", () => current?.owner.onHover(true));
  shell.addEventListener("pointerleave", () => current?.owner.onHover(false));
  document.body.appendChild(shell);
}

function kick() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  raf = 0;
  const t = now();
  let busy = false;
  const val = (s: Spring) => {
    if (s.isSettled(t)) return s.target;
    busy = true;
    return s.value(t);
  };
  const x = val(geo.x), y = val(geo.y), w = val(geo.w), h = val(geo.h);
  const u = Math.min(1, Math.max(0, val(geo.v)));
  if (shell) {
    const [dx, dy] = TOWARD[placedSide];
    const off = (1 - u) * 6;
    shell.style.width = `${Math.max(0, w).toFixed(2)}px`;
    shell.style.height = `${Math.max(0, h).toFixed(2)}px`;
    shell.style.transformOrigin = ORIGIN[placedSide];
    shell.style.transform = `translate(${(x + dx * off).toFixed(2)}px, ${(y + dy * off).toFixed(2)}px) scale(${(0.9 + 0.1 * u).toFixed(4)})`;
    shell.style.opacity = u.toFixed(4);
    const b = (1 - u) * 4;
    shell.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
  }
  // los textos: el que entra, de 0 a 1; los que salen, de 1 a 0 y fuera
  for (const l of [...layers]) {
    const lv = Math.min(1, Math.max(0, val(l.v)));
    l.el.style.opacity = lv.toFixed(4);
    const b = (1 - lv) * 6;
    l.el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
    if (l !== current && lv <= 0.002) dropLayer(l);
  }
  // sin nadie y ya invisible: se van también los textos que quedaran
  if (!current && u <= 0.002) for (const l of [...layers]) dropLayer(l);
  if (busy) kick();
}

function dropLayer(l: Layer) {
  const i = layers.indexOf(l);
  if (i < 0) return;
  layers.splice(i, 1);
  l.el.remove();
  l.owner.onLayerGone();
}

/** Este tooltip se queda el globo; devuelve dónde pintar su texto. */
function acquire(owner: Owner): HTMLSpanElement {
  ensureShell();
  const t = now();
  const reduce = prefersReducedMotion();
  const wasShown = current !== null && geo.v.value(t) > 0.05;
  if (current && current.owner.id !== owner.id) {
    const prev = current;
    prev.el.dataset.leaving = "";
    prev.v.set(0, t, springs.fadeOut);
    if (reduce) prev.v.jump(0, t);
    current = null;
    prev.owner.onReplaced();
  }
  // vuelve el mismo mientras se desvanecía: se recupera su texto
  const revived = layers.find(l => l.owner.id === owner.id);
  const layer: Layer = revived ?? { owner, el: document.createElement("span"), v: new Spring(0, springs.fadeIn) };
  layer.owner = owner;
  if (!revived) {
    layer.el.className = "mochi-tooltip__layer";
    inner!.appendChild(layer.el);
    layers.push(layer);
  }
  delete layer.el.dataset.leaving;
  // si otro texto está saliendo, este entra un poco después: no se leen dos a la vez
  layer.v.set(1, t, springs.fadeIn, wasShown ? SWAP.enterDelay : 0);
  if (reduce || !wasShown) layer.v.jump(1, t);
  current = layer;
  shell!.id = owner.id;
  shell!.className = cx("mochi-tooltip", owner.className());
  shell!.removeAttribute("aria-hidden");
  shell!.dataset.state = "open";
  kick();
  return layer.el;
}

/** Recoloca el globo según su texto (ya pintado) y el elemento. */
function update(id: string) {
  if (!current || current.owner.id !== id || !shell || !inner) return;
  const a = current.owner.anchor();
  if (!a || !a.isConnected) return;
  const r = a.getBoundingClientRect();
  const size = { w: inner.offsetWidth, h: inner.offsetHeight };
  const p = placeTooltip({ x: r.left, y: r.top, w: r.width, h: r.height }, size, { w: window.innerWidth, h: window.innerHeight }, current.owner.side());
  const t = now();
  const reduce = prefersReducedMotion();
  // si no se estaba viendo, aparece en su sitio; si se veía, viaja hasta el nuevo
  const appearing = geo.v.target === 0 || geo.v.value(t) < 0.05;
  placedSide = p.side;
  shell.dataset.side = p.side;
  const target = { x: p.x, y: p.y, w: size.w, h: size.h };
  for (const k of ["x", "y", "w", "h"] as const) {
    if (appearing || reduce) geo[k].jump(target[k], t);
    else if (geo[k].target !== target[k]) geo[k].set(target[k], t, SHAPE);
  }
  if (geo.v.target !== 1) geo.v.set(1, t, springs.snappy);
  if (reduce) geo.v.jump(1, t);
  kick();
}

/** Este tooltip suelta el globo (si era suyo). Con `immediate` se quita sin animar (al desmontarse). */
function release(id: string, immediate = false) {
  const t = now();
  if (current && current.owner.id === id) {
    const l = current;
    current = null;
    l.v.set(0, t, springs.fadeOut);
    geo.v.set(0, t, springs.fadeOut);
    if (immediate || prefersReducedMotion()) {
      geo.v.jump(0, t);
      l.v.jump(0, t);
    }
    warmUntil = Date.now() + WARM;
    if (shell) {
      shell.setAttribute("aria-hidden", "true");
      shell.dataset.state = "closed";
    }
    kick();
  }
  if (immediate) {
    const i = layers.findIndex(x => x.owner.id === id);
    if (i >= 0) layers.splice(i, 1)[0]!.el.remove();
  }
}

const isWarm = () => current !== null || Date.now() < warmUntil;

// ---------------------------------------------------------------------------------------
// Cada tooltip

export const Tooltip = forwardRef<HTMLElement, TooltipProps>(function Tooltip(
  { content, children, side = "top", delay = 500, disabled, bubbleClassName, ...outer },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [layer, setLayer] = useState<HTMLSpanElement | null>(null);
  const id = useId();
  const trigger = useRef<HTMLElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sideRef = useRef(side);
  sideRef.current = side;
  const classRef = useRef(bubbleClassName);
  classRef.current = bubbleClassName;

  const clear = () => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  };
  const show = (instant: boolean) => {
    clear();
    if (disabled) return;
    if (instant || isWarm()) setOpen(true);
    else showTimer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = (later = false) => {
    clear();
    if (later) hideTimer.current = setTimeout(() => setOpen(false), HIDE_GRACE);
    else setOpen(false);
  };
  const hideRef = useRef(hide);
  hideRef.current = hide;
  const clearRef = useRef(clear);
  clearRef.current = clear;

  // lo que el globo sabe de este tooltip (estable: lee lo último con refs)
  const [owner] = useState<Owner>(() => ({
    id,
    anchor: () => trigger.current,
    side: () => sideRef.current,
    className: () => classRef.current,
    onHover: over => (over ? clearRef.current() : hideRef.current(true)),
    onReplaced: () => {
      clearRef.current();
      setOpen(false);
    },
    onLayerGone: () => setLayer(null),
  }));

  useIsoLayoutEffect(() => {
    if (open) setLayer(acquire(owner));
    else release(id);
  }, [open]);
  // con el texto ya pintado (o si cambia), se mide y se recoloca
  useIsoLayoutEffect(() => {
    if (open && layer) update(id);
  });
  useEffect(
    () => () => {
      clearRef.current();
      release(id, true);
    },
    [],
  );
  useEffect(() => {
    if (disabled) hide();
  }, [disabled]);
  // un desplazamiento lo cierra: se quedaría flotando lejos de su elemento
  useEffect(() => {
    if (!open) return;
    const onScroll = () => hideRef.current();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);
  useEscapeLayer(open, () => hide());

  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const props = mergeProps(child.props as Record<string, unknown>, outer as Record<string, unknown>) as Record<string, unknown> & {
    onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
    onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
    onFocus?: (e: FocusEvent<HTMLElement>) => void;
    onBlur?: (e: FocusEvent<HTMLElement>) => void;
    "aria-describedby"?: string;
  };
  const triggerEl = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ...props,
    ref: mergeRefs(refOf(child), ref, (el: unknown) => {
      trigger.current = el as HTMLElement | null;
    }),
    "aria-describedby": cx(props["aria-describedby"], open && id) || undefined,
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      props.onPointerEnter?.(e);
      if (e.pointerType !== "touch") show(false);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      props.onPointerLeave?.(e);
      if (e.pointerType !== "touch") hide(true);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      props.onPointerDown?.(e);
      hide();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      props.onFocus?.(e);
      // solo con el foco de teclado (con ratón o dedo el foco no es «visible»)
      if (e.currentTarget.matches(":focus-visible")) show(true);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      props.onBlur?.(e);
      hide();
    },
  });
  return (
    <>
      {triggerEl}
      {layer ? createPortal(content, layer) : null}
    </>
  );
});
