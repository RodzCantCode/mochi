"use client";
// La lista que se abre desde un botón o un punto: la usan Menu, ContextMenu y Select. La forma
// del botón crece hasta la lista y al cerrar vuelve a él; la opción activa lleva un resaltado
// que se desliza, y el texto que queda encima cambia de color justo por donde pasa (una copia
// recortada). Quien la usa lleva la opción activa y decide qué hace cada tecla.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect.js";
import { useElementSize } from "./useElementSize.js";
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
} from "./overlay.js";
import { MARGIN, placeMenu, type MenuPlacement } from "./placement.js";

export interface PopupRow {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Lo que va a la derecha: un atajo, el check de la opción elegida… */
  trailing?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  /** Opción elegida (en un selector). */
  selected?: boolean;
}
export interface PopupSeparator {
  separator: true;
  id: string;
}
export type PopupEntry = PopupRow | PopupSeparator;
export const isSeparatorEntry = (e: PopupEntry | undefined): e is PopupSeparator => !!e && (e as PopupSeparator).separator === true;

export const ROW = 40;
const SEP = 9;
const PAD = 8;
const RADIUS = 22; // radius-lg

/** Índices de las opciones que se pueden elegir. */
export const enabledOf = (entries: PopupEntry[]) => entries.map((e, i) => (!isSeparatorEntry(e) && !e.disabled ? i : -1)).filter(i => i >= 0);

/**
 * Teclas de moverse por una lista: flechas (dan la vuelta), Inicio/Fin y letras que saltan a
 * la opción que empieza así. Devuelve la opción nueva, o null si la tecla no es de moverse.
 */
export function useListKeys(entries: PopupEntry[]) {
  const typed = useRef({ text: "", at: 0 });
  return (e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean }, active: number): number | null => {
    const enabled = enabledOf(entries);
    if (!enabled.length) return null;
    const pos = enabled.indexOf(active);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const dir = e.key === "ArrowDown" ? 1 : -1;
      return enabled[pos < 0 ? (dir === 1 ? 0 : enabled.length - 1) : (pos + dir + enabled.length) % enabled.length]!;
    }
    if (e.key === "Home" || e.key === "PageUp") return enabled[0]!;
    if (e.key === "End" || e.key === "PageDown") return enabled[enabled.length - 1]!;
    if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = Date.now();
      typed.current = { text: (t - typed.current.at > 600 ? "" : typed.current.text) + e.key.toLowerCase(), at: t };
      const q = typed.current.text;
      const order = q.length > 1 ? enabled : [...enabled.slice(pos + 1), ...enabled.slice(0, pos + 1)];
      return order.find(i => (entries[i] as PopupRow).label.toLowerCase().startsWith(q)) ?? null;
    }
    return null;
  };
}

export interface ListPopupProps {
  id: string;
  open: boolean;
  entries: PopupEntry[];
  active: number;
  onActiveChange: (index: number) => void;
  /** Se ha elegido una opción (clic o Enter). */
  onChoose: (index: number) => void;
  /** Piden cerrar: Esc, clic fuera o Tab. */
  onClose: () => void;
  /** El botón del que sale, o el punto (para un menú contextual). */
  anchor: (() => HTMLElement | null) | null;
  point: { x: number; y: number } | null;
  placement: MenuPlacement;
  minWidth: number;
  role: "menu" | "listbox";
  label?: string;
  labelledBy?: string;
  /**
   * El menú se lleva el foco y lo devuelve al botón al cerrar (antes de ejecutar la opción);
   * el selector lo deja en su botón y lleva él las teclas.
   */
  takeFocus: boolean;
  /** Teclas con la lista enfocada (solo con `takeFocus`). */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/** La lista, montada solo mientras está abierta o cerrándose. */
export function ListPopup(props: ListPopupProps) {
  const [mounted, setMounted] = useState(props.open);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (props.open && !mounted) setMounted(true);
  if (!mounted || !client) return null;
  return createPortal(<Panel {...props} onGone={() => setMounted(false)} />, document.body);
}

type Values = { x: number; y: number; w: number; h: number; r: number; p: number; o: number; g: number; hy: number; hv: number };

function Panel(props: ListPopupProps & { onGone: () => void }) {
  const { id, open, entries, active, onActiveChange, onChoose, onClose, anchor, point, placement, minWidth, role, label, labelledBy, takeFocus, onKeyDown, onGone } = props;
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

  const enabled = enabledOf(entries);
  const tops: number[] = [];
  let acc = PAD;
  for (const e of entries) {
    tops.push(acc);
    acc += isSeparatorEntry(e) ? SEP : ROW;
  }
  const act = entries[active] && !isSeparatorEntry(entries[active]) ? active : -1;
  // el resaltado que se desvanece se queda donde estaba (valor idéntico en los dos renders)
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
  // el botón desaparece mientras la lista es él
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

  useIsoLayoutEffect(() => {
    if (armed && open && takeFocus) shape.current?.focus({ preventScroll: true });
  }, [open, armed]);
  const giveBackFocus = () => {
    if (!takeFocus) return;
    const el = (origin?.el ?? restore.current) as HTMLElement | null;
    if (el && typeof el.focus === "function" && document.contains(el)) el.focus({ preventScroll: true });
  };

  useScrollLock(open);
  useEscapeLayer(open, () => {
    giveBackFocus();
    onClose();
  });

  // la opción activa, siempre a la vista si la lista se desplaza
  useEffect(() => {
    const c = contentEl;
    if (!c || act < 0) return;
    const t = tops[act]!;
    if (t < c.scrollTop + PAD) c.scrollTop = Math.max(0, t - PAD);
    else if (t + ROW > c.scrollTop + c.clientHeight - PAD) c.scrollTop = t + ROW - c.clientHeight + PAD;
  }, [act, contentEl]);

  const downOutside = useRef(false);
  const choose = (i: number) => {
    const e = entries[i];
    if (!e || isSeparatorEntry(e) || e.disabled) return;
    // el foco vuelve antes de ejecutar: si la acción abre un diálogo, sale del mismo botón
    giveBackFocus();
    onChoose(i);
  };

  const row = (e: PopupRow, i: number, live: boolean) => (
    <div
      key={e.id}
      id={live ? `${id}-${e.id}` : undefined}
      role={live ? (role === "menu" ? "menuitem" : "option") : undefined}
      aria-selected={live && role === "listbox" ? !!e.selected : undefined}
      aria-disabled={live && e.disabled ? true : undefined}
      className="mochi-menu__item"
      data-destructive={e.destructive || undefined}
      data-disabled={e.disabled || undefined}
      data-selected={e.selected || undefined}
      style={{ top: tops[i] }}
      onPointerMove={live && !e.disabled ? () => i !== act && onActiveChange(i) : undefined}
      onClick={live ? () => choose(i) : undefined}
    >
      {e.icon !== undefined ? <span className="mochi-menu__icon">{e.icon}</span> : null}
      <span className="mochi-menu__label">{e.label}</span>
      {e.trailing !== undefined ? <span className="mochi-menu__sc">{e.trailing}</span> : null}
    </div>
  );
  const listH = acc + PAD;
  const destructive = act >= 0 && (entries[act] as PopupRow).destructive;

  return (
    <div className="mochi-menu-root" data-state={open ? "open" : "closed"}>
      <div
        className="mochi-menu-catcher"
        // cierra con el clic de un toque que empezó fuera con la lista ya abierta: así ni el toque
        // atraviesa a lo de debajo ni el dedo que la abrió con pulsación larga la cierra al soltar
        onPointerDown={() => (downOutside.current = true)}
        onMouseDown={e => !takeFocus && e.preventDefault()}
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
        role={role}
        tabIndex={-1}
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy}
        aria-activedescendant={takeFocus && act >= 0 ? `${id}-${(entries[act] as PopupRow).id}` : undefined}
        className="mochi-menu"
        data-role={role}
        style={{ opacity: 0 }}
        onKeyDown={e => {
          if (!open || !takeFocus) return;
          if (e.key === "Tab") {
            giveBackFocus();
            onClose();
            return;
          }
          if ((e.key === "Enter" || e.key === " ") && act >= 0) {
            e.preventDefault();
            choose(act);
            return;
          }
          onKeyDown?.(e);
        }}
        onPointerLeave={() => onActiveChange(-1)}
        // si no se lleva el foco (selector), pulsar la lista no se lo quita al campo
        onMouseDown={e => !takeFocus && e.preventDefault()}
      >
        <span ref={reveal} className="mochi-menu__reveal" aria-hidden="true" />
        <div ref={ghostBox} className="mochi-menu__ghost" aria-hidden="true" />
        <div ref={setContentEl} className="mochi-menu__content" style={{ minWidth, maxWidth: vp.w - MARGIN * 2, maxHeight: placed.maxH }}>
          <div className="mochi-menu__list" style={{ height: listH }}>
            <span ref={highlight} className="mochi-menu__highlight" data-destructive={destructive || undefined} aria-hidden="true" />
            {entries.map((e, i) => (isSeparatorEntry(e) ? <div key={e.id} role="separator" className="mochi-menu__sep" style={{ top: tops[i] }} /> : row(e, i, true)))}
            {/* copia en tinta sobre el resaltado, recortada a su forma */}
            <div ref={hiLayer} className="mochi-menu__hi" aria-hidden="true">
              {entries.map((e, i) => (isSeparatorEntry(e) ? null : row(e, i, false)))}
            </div>
            {/* el ancho natural de la lista lo da la fila más larga */}
            <div className="mochi-menu__sizer" aria-hidden="true">
              {entries.map((e, i) => (isSeparatorEntry(e) ? null : <div key={e.id}>{row({ ...e, id: `${e.id}-size` }, i, false)}</div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
