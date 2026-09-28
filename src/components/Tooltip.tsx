"use client";
// Tooltip: una etiqueta pequeña que sale del elemento al pasar el ratón por encima (tras una
// espera corta) o al enfocarlo con el teclado. Si ya había uno a la vista, viaja hasta el
// siguiente elemento y cambia el texto, sin espera. Se puede pasar el ratón por encima sin que se vaya, Esc lo cierra y en pantallas
// táctiles no aparece (no hay «pasar por encima»).
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  version,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useElementSize } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { mergeRefs } from "../internal/refs.js";
import { cx } from "../internal/cx.js";
import { useEscapeLayer, useViewport } from "../internal/overlay.js";
import { placeTooltip, type TooltipSide } from "../internal/placement.js";
import { Swap } from "./Swap.js";

export type { TooltipSide } from "../internal/placement.js";

export interface TooltipProps {
  /** El texto del tooltip. Corto: una o dos palabras («Copy link»). */
  content: ReactNode;
  /** El elemento que lo lleva. Recibe ref y los manejadores de ratón y foco. */
  children: ReactElement;
  /** Lado preferido; si no cabe, pasa al contrario. */
  side?: TooltipSide;
  /** Espera antes de aparecer con el ratón, en ms. */
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const HIDE_GRACE = 100; // ms para llegar con el ratón al tooltip sin que se vaya
const WARM = 500; // ms durante los que el siguiente tooltip sale sin espera

// estado compartido entre tooltips: si hay uno a la vista (o se acaba de ir), el siguiente no espera
let openCount = 0;
let warmUntil = 0;

const childRef = (el: ReactElement): Ref<unknown> | undefined =>
  Number.parseInt(version, 10) >= 19 ? (el.props as { ref?: Ref<unknown> }).ref : (el as unknown as { ref?: Ref<unknown> }).ref;

export function Tooltip({ content, children, side = "top", delay = 500, disabled, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // tras pulsar, no vuelve a salir hasta que el ratón salga y vuelva a entrar
  const pressed = useRef(false);

  const clear = () => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  };
  const show = (instant: boolean) => {
    clear();
    if (disabled) return;
    if (instant || openCount > 0 || Date.now() < warmUntil) setOpen(true);
    else showTimer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = (later = false) => {
    clear();
    if (later) hideTimer.current = setTimeout(() => setOpen(false), HIDE_GRACE);
    else setOpen(false);
  };
  useEffect(() => clear, []);
  useEffect(() => {
    if (disabled) hide();
  }, [disabled]);
  useEffect(() => {
    if (!open) return;
    openCount++;
    return () => {
      openCount--;
      warmUntil = Date.now() + WARM;
    };
  }, [open]);

  // un desplazamiento lo cierra: se quedaría flotando lejos de su elemento
  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);
  useEscapeLayer(open, () => hide());

  // mientras está abierto, este es el tooltip que se ve
  const owner = useIsOwner(id);
  const onHoverRef = useRef((over: boolean) => (over ? clear() : hide(true)));
  onHoverRef.current = over => (over ? clear() : hide(true));
  useIsoLayoutEffect(() => {
    if (open && trigger.current) setCurrent({ id, content, side, anchor: trigger.current, className, onHover: over => onHoverRef.current(over) });
    else if (!open && current?.id === id) setCurrent(null);
  }, [open, content, side, className]);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);

  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const props = child.props as Record<string, unknown> & {
    onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
    onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
    onFocus?: (e: FocusEvent<HTMLElement>) => void;
    onBlur?: (e: FocusEvent<HTMLElement>) => void;
    "aria-describedby"?: string;
  };
  const triggerEl = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ref: mergeRefs(childRef(child), (el: unknown) => {
      trigger.current = el as HTMLElement | null;
    }),
    "aria-describedby": cx(props["aria-describedby"], open && id) || undefined,
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      props.onPointerEnter?.(e);
      if (e.pointerType === "touch") return;
      pressed.current = false;
      show(false);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      props.onPointerLeave?.(e);
      if (e.pointerType === "touch") return;
      hide(true);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      props.onPointerDown?.(e);
      pressed.current = true;
      hide();
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      props.onFocus?.(e);
      // solo con el foco de teclado (en táctil, tocar también enfoca)
      if (!pressed.current && e.currentTarget.matches(":focus-visible")) show(true);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      props.onBlur?.(e);
      hide();
    },
  });
  return (
    <>
      {triggerEl}
      {owner && client ? createPortal(<Bubble />, document.body) : null}
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Un único tooltip en pantalla: al pasar de un elemento a otro viaja hasta el nuevo, cambia de
// tamaño y cambia el texto con desenfoque, en vez de irse uno y salir otro encima.

interface Current {
  id: string;
  content: ReactNode;
  side: TooltipSide;
  anchor: HTMLElement;
  className?: string;
  onHover: (over: boolean) => void;
}
let current: Current | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
function setCurrent(next: Current | null) {
  current = next;
  emit();
}
// el primer tooltip montado pinta el globo; si se desmonta, lo hereda el siguiente
const owners: string[] = [];
const ownerListeners = new Set<() => void>();
const subscribeOwners = (l: () => void) => {
  ownerListeners.add(l);
  return () => void ownerListeners.delete(l);
};
function useIsOwner(id: string) {
  useEffect(() => {
    owners.push(id);
    ownerListeners.forEach(l => l());
    return () => {
      const i = owners.indexOf(id);
      if (i >= 0) owners.splice(i, 1);
      if (current?.id === id) setCurrent(null);
      ownerListeners.forEach(l => l());
    };
  }, [id]);
  return useSyncExternalStore(subscribeOwners, () => owners[0] === id, () => false);
}

const ORIGIN: Record<TooltipSide, string> = { top: "50% 100%", bottom: "50% 0", left: "100% 50%", right: "0 50%" };
// hacia dónde queda el elemento, para salir de él
const TOWARD: Record<TooltipSide, [number, number]> = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };

function Bubble() {
  const cur = useSyncExternalStore(subscribe, () => current, () => null);
  // el último que se enseñó: mientras se desvanece, sigue en su sitio y con su texto
  const last = useRef<Current | null>(null);
  if (cur) last.current = cur;
  const shown = last.current;
  const vp = useViewport();
  const shape = useRef<HTMLDivElement>(null);
  const [inner, setInner] = useState<HTMLSpanElement | null>(null);
  const size = useElementSize(inner);
  const a = shown?.anchor.isConnected ? shown.anchor.getBoundingClientRect() : null;
  const placed = size && a ? placeTooltip({ x: a.left, y: a.top, w: a.width, h: a.height }, { w: size.width, h: size.height }, vp, shown!.side) : null;
  const visible = cur !== null && placed !== null;
  // si no se estaba viendo, aparece en su sitio (sin viajar desde el anterior)
  const displayed = useRef(false);
  const appearing = visible && !displayed.current;

  const geo = { x: placed?.x ?? 0, y: placed?.y ?? 0, w: size?.width ?? 0, h: size?.height ?? 0 };
  const paint = (g: typeof geo, v: number) => {
    const el = shape.current;
    if (!el || !placed) return;
    const u = Math.min(1, Math.max(0, v));
    const [dx, dy] = TOWARD[placed.side];
    const off = (1 - u) * 6;
    el.style.width = `${Math.max(0, g.w).toFixed(2)}px`;
    el.style.height = `${Math.max(0, g.h).toFixed(2)}px`;
    el.style.transformOrigin = ORIGIN[placed.side];
    el.style.transform = `translate(${(g.x + dx * off).toFixed(2)}px, ${(g.y + dy * off).toFixed(2)}px) scale(${(0.9 + 0.1 * u).toFixed(4)})`;
    el.style.opacity = u.toFixed(4);
    const b = (1 - u) * 4;
    el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
  };
  const g = useSprings(geo, springs.snappy, gv => paint(gv, fade.read().v), { immediate: appearing });
  const fade = useSprings({ v: visible ? 1 : 0 }, (_k, f, t) => (t > f ? springs.snappy : springs.fadeOut), ({ v }) => {
    displayed.current = v > 0.05;
    paint(g.read(), v);
  });

  if (!shown) return null;
  return (
    <div
      ref={shape}
      id={shown.id}
      role="tooltip"
      className={cx("mochi-tooltip", shown.className)}
      data-side={placed?.side ?? shown.side}
      data-state={cur ? "open" : "closed"}
      style={{ opacity: 0 }}
      onPointerEnter={() => cur?.onHover(true)}
      onPointerLeave={() => cur?.onHover(false)}
    >
      <span ref={setInner} className="mochi-tooltip__inner">
        <Swap id={shown.id} blur={6}>
          {shown.content}
        </Swap>
      </span>
    </div>
  );
}
