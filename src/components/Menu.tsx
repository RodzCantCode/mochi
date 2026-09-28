"use client";
// Menú de acciones. El botón que lo abre (p. ej. «…») se transforma en el menú: su forma crece
// hasta la lista y al cerrar vuelve a ser el botón. Con ContextMenu se abre con clic derecho o
// pulsación larga, creciendo desde el punto pulsado. Se coloca solo para no salirse de la
// ventana (se da la vuelta arriba o a la izquierda). Flechas, Inicio/Fin, letras para saltar,
// Enter para elegir y Esc para cerrar.
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  version,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { useElementSize } from "../internal/useElementSize.js";
import { useControllable } from "../internal/useControllable.js";
import { mergeRefs } from "../internal/refs.js";
import { cx } from "../internal/cx.js";
import {
  classBackground,
  clamp01,
  ghostOf,
  hideOrigin,
  nearRect,
  paintGrow,
  readOrigin,
  showOrigin,
  useEscapeLayer,
  useScrollLock,
  useViewport,
  type Origin,
  type Rect,
} from "../internal/overlay.js";
import { Kbd } from "./CommandPalette.js";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Atajo que se muestra, p. ej. ["mod", "D"]. */
  shortcut?: string[];
  onSelect: () => void;
  /** Acción destructiva (borrar): texto en rojo y resaltado rojo. */
  destructive?: boolean;
  disabled?: boolean;
}
export interface MenuSeparator {
  type: "separator";
  id?: string;
}
export type MenuEntry = MenuItem | MenuSeparator;

export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

const ROW = 40;
const SEP = 9;
const PAD = 8;
const GAP = 6; // entre el botón y el menú
const MARGIN = 8; // con los bordes de la ventana
const RADIUS = 22; // radius-lg

const isSeparator = (e: MenuEntry): e is MenuSeparator => (e as MenuSeparator).type === "separator";

// ---------------------------------------------------------------------------------------
// Colocación

export interface Placed {
  x: number;
  y: number;
  /** Alto disponible; si el menú es más alto, se desplaza dentro. */
  maxH: number;
  side: "top" | "bottom";
}

/**
 * Dónde va el menú. Con un botón (`anchor` con tamaño) se abre debajo o encima, alineado a su
 * inicio o su final; con un punto (w = h = 0) se abre hacia abajo y a la derecha del punto. En
 * los dos casos se da la vuelta si no cabe y nunca se sale de la ventana.
 */
export function placeMenu(
  anchor: { x: number; y: number; w: number; h: number },
  size: { w: number; h: number },
  viewport: { w: number; h: number },
  placement: MenuPlacement = "bottom-start",
): Placed {
  const point = anchor.w === 0 && anchor.h === 0;
  const gap = point ? 2 : GAP;
  const below = viewport.h - (anchor.y + anchor.h) - gap - MARGIN;
  const above = anchor.y - gap - MARGIN;
  const wantTop = placement.startsWith("top");
  let side: "top" | "bottom" = wantTop ? "top" : "bottom";
  if (side === "bottom" && size.h > below && above > below) side = "top";
  else if (side === "top" && size.h > above && below > above) side = "bottom";
  const maxH = Math.max(ROW + PAD * 2, side === "bottom" ? below : above);
  const h = Math.min(size.h, maxH);
  const y = side === "bottom" ? anchor.y + anchor.h + gap : anchor.y - gap - h;

  const w = Math.min(size.w, viewport.w - MARGIN * 2);
  let x: number;
  if (point) x = anchor.x + w > viewport.w - MARGIN ? anchor.x - w : anchor.x;
  else x = placement.endsWith("end") ? anchor.x + anchor.w - w : anchor.x;
  x = Math.max(MARGIN, Math.min(x, viewport.w - MARGIN - w));
  return { x, y: Math.max(MARGIN, y), maxH, side };
}

// ---------------------------------------------------------------------------------------
// Menú con botón

export interface MenuProps {
  items: MenuEntry[];
  /** El botón que lo abre. Recibe ref, onClick, onKeyDown y los atributos ARIA. */
  children: ReactElement;
  placement?: MenuPlacement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Nombre accesible del menú; si no, el del botón. */
  label?: string;
  minWidth?: number;
}

const childRef = (el: ReactElement): Ref<unknown> | undefined =>
  Number.parseInt(version, 10) >= 19 ? (el.props as { ref?: Ref<unknown> }).ref : (el as unknown as { ref?: Ref<unknown> }).ref;

export function Menu({ items, children, placement = "bottom-start", open: openProp, onOpenChange, label, minWidth = 200 }: MenuProps) {
  const [open, setOpen] = useControllable(openProp, false, onOpenChange);
  const trigger = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const autoTriggerId = useId();
  const [focusFirst, setFocusFirst] = useState<"first" | "last" | null>(null);
  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const props = child.props as Record<string, unknown> & {
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  };
  const triggerId = (props.id as string | undefined) ?? autoTriggerId;
  const openWith = (how: "first" | "last" | null) => {
    setFocusFirst(how);
    setOpen(true);
  };
  const triggerEl = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ref: mergeRefs(childRef(child), (el: unknown) => {
      trigger.current = el as HTMLElement | null;
    }),
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      props.onClick?.(e);
      if (e.defaultPrevented) return;
      // con teclado (Enter o espacio) el clic llega con detail 0: se resalta la primera opción
      if (open) setOpen(false);
      else openWith(e.detail === 0 ? "first" : null);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openWith(e.key === "ArrowDown" ? "first" : "last");
      }
    },
  });
  return (
    <>
      {triggerEl}
      <MenuLayer
        id={menuId}
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        anchor={() => trigger.current}
        point={null}
        placement={placement}
        label={label}
        labelledBy={label ? undefined : triggerId}
        minWidth={minWidth}
        focusFirst={focusFirst}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Menú contextual

export interface ContextMenuProps {
  items: MenuEntry[];
  /** La zona donde se abre con clic derecho o pulsación larga. */
  children: ReactElement;
  label?: string;
  disabled?: boolean;
  minWidth?: number;
}

const LONG_PRESS = 480; // ms
const SLOP = 8; // px que se puede mover el dedo antes de cancelar

export function ContextMenu({ items, children, label = "Actions", disabled, minWidth = 200 }: ContextMenuProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const menuId = useId();
  const press = useRef<{ id: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const openedAt = useRef(0);
  const swallowClick = useRef(false);
  const child = Children.only(children);
  useEffect(() => () => clearTimeout(press.current?.timer), []);
  if (!isValidElement(child)) return null;
  const props = child.props as Record<string, ((e: never) => void) | undefined>;
  const call = (name: string, e: unknown) => (props[name] as ((e: unknown) => void) | undefined)?.(e);

  const openAt = (x: number, y: number, byKeyboard: boolean) => {
    openedAt.current = Date.now();
    setKeyboard(byKeyboard);
    setPoint({ x, y });
  };
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const area = cloneElement(child as ReactElement<Record<string, unknown>>, {
    "data-mochi-context": "",
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      call("onContextMenu", e);
      if (disabled || e.defaultPrevented) return;
      e.preventDefault();
      cancelPress();
      if (Date.now() - openedAt.current < 700) return; // ya lo abrió la pulsación larga
      // desde el teclado (Mayús+F10, tecla de menú) no hay posición: debajo del elemento enfocado
      if (e.clientX === 0 && e.clientY === 0) {
        const r = (document.activeElement ?? e.currentTarget).getBoundingClientRect();
        openAt(r.left + 12, r.top + Math.min(r.height, 32), true);
      } else openAt(e.clientX, e.clientY, false);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      call("onPointerDown", e);
      swallowClick.current = false;
      if (disabled || e.pointerType !== "touch") return;
      cancelPress();
      const { pointerId: id, clientX: x, clientY: y } = e;
      press.current = {
        id,
        x,
        y,
        timer: setTimeout(() => {
          press.current = null;
          swallowClick.current = true;
          navigator.vibrate?.(8);
          openAt(x, y, false);
        }, LONG_PRESS),
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      call("onPointerMove", e);
      const p = press.current;
      if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) cancelPress();
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      call("onPointerUp", e);
      cancelPress();
    },
    onPointerCancel: (e: PointerEvent<HTMLElement>) => {
      call("onPointerCancel", e);
      cancelPress();
    },
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      call("onClickCapture", e);
      // el clic que llega al levantar el dedo tras la pulsación larga no cuenta
      if (swallowClick.current) {
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });
  return (
    <>
      {area}
      <MenuLayer
        id={menuId}
        open={point !== null}
        onClose={() => setPoint(null)}
        items={items}
        anchor={null}
        point={point}
        placement="bottom-start"
        label={label}
        minWidth={minWidth}
        focusFirst={keyboard ? "first" : null}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------
// La capa del menú

interface LayerProps {
  id: string;
  open: boolean;
  onClose: () => void;
  items: MenuEntry[];
  anchor: (() => HTMLElement | null) | null;
  point: { x: number; y: number } | null;
  placement: MenuPlacement;
  label?: string;
  /** id del botón que da nombre al menú. */
  labelledBy?: string;
  minWidth: number;
  focusFirst: "first" | "last" | null;
}

function MenuLayer(props: LayerProps) {
  const [mounted, setMounted] = useState(props.open);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (props.open && !mounted) setMounted(true);
  if (!mounted || !client) return null;
  return createPortal(<Panel {...props} onGone={() => setMounted(false)} />, document.body);
}

type Values = { x: number; y: number; w: number; h: number; r: number; p: number; o: number; g: number; hy: number; hv: number };

function Panel({ id, open, onClose, items, anchor, point, placement, label, labelledBy, minWidth, focusFirst, onGone }: LayerProps & { onGone: () => void }) {
  const vp = useViewport();
  // el botón (o el punto) del que sale, leído al abrir y de nuevo al cerrar
  const restore = useRef<Element | null>(null);
  const lastPoint = useRef(point);
  if (point) lastPoint.current = point;
  const [origin] = useState<Origin | null>(() => {
    restore.current = document.activeElement;
    return anchor ? readOrigin(anchor()) : null;
  });
  const originNow = !open && origin ? readOrigin(origin.el) ?? origin : origin;
  const pt = lastPoint.current;
  const anchorRect = originNow ? originNow.rect : { x: pt?.x ?? 0, y: pt?.y ?? 0, w: 0, h: 0, r: 0 };

  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(contentEl);
  const measured = size !== null;
  const placed = placeMenu(anchorRect, size ? { w: size.width, h: size.height } : { w: minWidth, h: ROW }, vp, placement);
  const W = Math.min(size?.width ?? minWidth, vp.w - MARGIN * 2);
  const H = Math.min(size?.height ?? ROW, placed.maxH);
  const to: Rect = { x: placed.x, y: placed.y, w: W, h: H, r: RADIUS };
  // desde un punto crece desde un círculo diminuto
  const from: Rect = originNow ? originNow.rect : { x: anchorRect.x - 6, y: anchorRect.y - 6, w: 12, h: 12, r: 6 };

  const [armed, setArmed] = useState(false);
  useIsoLayoutEffect(() => {
    if (measured && !armed) setArmed(true);
  }, [measured, armed]);
  const shown = open && armed;
  const at = shown ? to : from;

  // opción activa
  const enabled = items.map((e, i) => (!isSeparator(e) && !e.disabled ? i : -1)).filter(i => i >= 0);
  const [active, setActive] = useState(-1);
  const tops: number[] = [];
  let acc = PAD;
  for (const e of items) {
    tops.push(acc);
    acc += isSeparator(e) ? SEP : ROW;
  }
  const act = items[active] && !isSeparator(items[active]!) ? active : -1;
  const lastTop = useRef(tops[enabled[0] ?? 0] ?? PAD);
  if (act >= 0) lastTop.current = tops[act]!;

  const shape = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLSpanElement>(null);
  const ghostBox = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const hiLayer = useRef<HTMLDivElement>(null);
  const surfaceColor = useRef<string | null>(null);
  const toRef = useRef(to);
  toRef.current = to;

  useSprings<keyof Values>(
    {
      x: at.x,
      y: at.y,
      w: at.w,
      h: at.h,
      r: at.r,
      p: shown ? 1.06 : 0,
      o: shown ? 1 : 0,
      g: shown ? 0 : 1,
      hy: lastTop.current,
      hv: act >= 0 ? 1 : 0,
    },
    (key, f, t) => {
      const opening = t > f;
      if (key === "o") return opening ? { config: springs.fadeIn, delay: origin ? 0.06 : 0.02 } : springs.fadeOut;
      if (key === "g") return opening ? { config: springs.fadeIn, delay: 0.12 } : springs.fadeOut;
      if (key === "hv") return opening ? springs.fadeIn : springs.fadeOut;
      if (key === "hy") return springs.snappy;
      return springs.morph;
    },
    v => {
      const el = shape.current;
      if (!el || !measured) return;
      const T = toRef.current;
      const q = origin ? clamp01((v.w - from.w) / Math.max(1, T.w - from.w)) : clamp01(v.o);
      const tint = origin?.background && origin.background !== surfaceColor.current ? origin.background : null;
      paintGrow({ shape: el, shadow: shadow.current, reveal: reveal.current, ghost: ghostBox.current, content: contentEl }, v, {
        to: T,
        tint,
        shadow: q,
        fadeContent: true,
        ghost: origin ? origin.rect : null,
        blur: SWAP.blur,
      });
      const hv = clamp01(v.hv);
      const hl = highlight.current;
      if (hl) {
        hl.style.transform = `translateY(${v.hy.toFixed(3)}px)`;
        hl.style.opacity = hv.toFixed(3);
      }
      const hi = hiLayer.current;
      if (hi && contentEl) {
        const top = v.hy, bottom = Math.max(0, contentEl.scrollHeight - (v.hy + ROW));
        hi.style.clipPath = `inset(${top.toFixed(3)}px ${PAD}px ${bottom.toFixed(3)}px ${PAD}px round 14px)`;
        hi.style.opacity = hv.toFixed(3);
      }
      if (!open && nearRect(v, from) && v.o < 0.002) onGone();
    },
    { immediate: measured && !armed },
  );

  useIsoLayoutEffect(() => {
    if (shape.current && surfaceColor.current === null) surfaceColor.current = classBackground(shape.current);
  }, []);
  // el botón desaparece mientras el menú es él
  useIsoLayoutEffect(() => {
    if (!origin) return;
    hideOrigin(origin.el);
    return () => showOrigin(origin.el);
  }, []);
  useIsoLayoutEffect(() => {
    const gb = ghostBox.current;
    if (!gb || !origin) return;
    gb.replaceChildren(ghostOf(origin.el));
    return () => gb.replaceChildren();
  }, []);

  // foco: al menú al abrir (con la primera o la última opción si se abrió con teclado)
  useIsoLayoutEffect(() => {
    if (!armed) return;
    if (open) {
      shape.current?.focus({ preventScroll: true });
      if (focusFirst) setActive(focusFirst === "first" ? enabled[0] ?? -1 : enabled[enabled.length - 1] ?? -1);
    }
  }, [open, armed]);
  const giveBackFocus = () => {
    const el = (origin?.el ?? restore.current) as HTMLElement | null;
    if (el && typeof el.focus === "function" && document.contains(el)) el.focus({ preventScroll: true });
  };

  useScrollLock(open);
  useEscapeLayer(open, () => {
    giveBackFocus();
    onClose();
  });

  // la opción activa, siempre a la vista si el menú se desplaza
  useEffect(() => {
    const c = contentEl;
    if (!c || act < 0) return;
    const t = tops[act]!;
    if (t < c.scrollTop + PAD) c.scrollTop = Math.max(0, t - PAD);
    else if (t + ROW > c.scrollTop + c.clientHeight - PAD) c.scrollTop = t + ROW - c.clientHeight + PAD;
  }, [act]);

  const downOutside = useRef(false);
  const choose = (i: number) => {
    const e = items[i];
    if (!e || isSeparator(e) || e.disabled) return;
    // el foco vuelve antes de ejecutar: si la acción abre un diálogo, sale del mismo botón
    giveBackFocus();
    onClose();
    e.onSelect();
  };

  // escribir letras salta a la opción que empieza así
  const typed = useRef({ text: "", at: 0 });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const move = (dir: 1 | -1) => {
      if (!enabled.length) return;
      const pos = enabled.indexOf(act);
      const next = pos < 0 ? (dir === 1 ? 0 : enabled.length - 1) : (pos + dir + enabled.length) % enabled.length;
      setActive(enabled[next]!);
    };
    if (e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowUp") move(-1);
    else if (e.key === "Home" || e.key === "PageUp") setActive(enabled[0] ?? -1);
    else if (e.key === "End" || e.key === "PageDown") setActive(enabled[enabled.length - 1] ?? -1);
    else if (e.key === "Enter" || e.key === " ") {
      if (act >= 0) choose(act);
    } else if (e.key === "Tab") {
      giveBackFocus();
      onClose();
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = Date.now();
      typed.current = { text: (t - typed.current.at > 600 ? "" : typed.current.text) + e.key.toLowerCase(), at: t };
      const q = typed.current.text;
      const start = enabled.indexOf(act);
      const order = [...enabled.slice(start + 1), ...enabled.slice(0, start + 1)];
      const hit = (q.length > 1 ? enabled : order).find(i => (items[i] as MenuItem).label.toLowerCase().startsWith(q));
      if (hit !== undefined) setActive(hit);
      else return;
    } else return;
    e.preventDefault();
  };

  const row = (e: MenuItem, i: number, live: boolean) => (
    <div
      key={e.id}
      id={live ? `${id}-${e.id}` : undefined}
      role={live ? "menuitem" : undefined}
      aria-disabled={live && e.disabled ? true : undefined}
      className="mochi-menu__item"
      data-destructive={e.destructive || undefined}
      data-disabled={e.disabled || undefined}
      style={{ top: tops[i] }}
      onPointerMove={live && !e.disabled ? () => i !== act && setActive(i) : undefined}
      onClick={live ? () => choose(i) : undefined}
    >
      <span className="mochi-menu__icon">{e.icon}</span>
      <span className="mochi-menu__label">{e.label}</span>
      {e.shortcut ? (
        <span className="mochi-menu__sc">
          <Kbd keys={e.shortcut} />
        </span>
      ) : null}
    </div>
  );
  const listH = acc + PAD;
  const destructive = act >= 0 && (items[act] as MenuItem).destructive;

  return (
    <div className="mochi-menu-root" data-state={open ? "open" : "closed"}>
      <div
        className="mochi-menu-catcher"
        // cierra con el clic de un toque que empezó fuera con el menú ya abierto: así ni el toque
        // atraviesa a lo de debajo ni el dedo que lo abrió con pulsación larga lo cierra al soltar
        onPointerDown={() => (downOutside.current = true)}
        onClick={() => {
          if (open && downOutside.current) onClose();
          downOutside.current = false;
        }}
        onContextMenu={e => {
          e.preventDefault();
          if (open) onClose();
        }}
      />
      <div ref={shadow} className="mochi-menu__shadow" aria-hidden="true" style={{ opacity: 0 }} />
      <div
        ref={shape}
        id={id}
        role="menu"
        tabIndex={-1}
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy}
        aria-activedescendant={act >= 0 ? `${id}-${(items[act] as MenuItem).id}` : undefined}
        className="mochi-menu"
        style={{ opacity: 0 }}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setActive(-1)}
      >
        <span ref={reveal} className="mochi-menu__reveal" aria-hidden="true" />
        <div ref={ghostBox} className="mochi-menu__ghost" aria-hidden="true" />
        <div ref={setContentEl} className="mochi-menu__content" style={{ minWidth, maxWidth: vp.w - MARGIN * 2, maxHeight: placed.maxH }}>
          <div className="mochi-menu__list" style={{ height: listH }}>
            <span ref={highlight} className="mochi-menu__highlight" data-destructive={destructive || undefined} aria-hidden="true" />
            {items.map((e, i) =>
              isSeparator(e) ? (
                <div key={e.id ?? `sep-${i}`} role="separator" className="mochi-menu__sep" style={{ top: tops[i] }} />
              ) : (
                row(e, i, true)
              ),
            )}
            {/* copia en tinta sobre el resaltado, recortada a su forma */}
            <div ref={hiLayer} className="mochi-menu__hi" aria-hidden="true">
              {items.map((e, i) => (isSeparator(e) ? null : row(e, i, false)))}
            </div>
            {/* el ancho natural del menú lo da la fila más larga */}
            <div className="mochi-menu__sizer" aria-hidden="true">
              {items.map((e, i) => (isSeparator(e) ? null : <div key={i}>{row({ ...e, id: `${e.id}-size` }, i, false)}</div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
