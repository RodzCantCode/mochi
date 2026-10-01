"use client";
// Lista que se reordena: las filas se cambian de sitio arrastrándolas por su asa. Manipulación
// directa, como el Slider: la fila se levanta y sigue al puntero sin retraso; las demás se apartan
// con un muelle cuando pasa por su mitad; más allá de la primera o la última se resiste; al soltar
// se asienta en su hueco con la velocidad que llevaba. Con teclado, Espacio la coge, las flechas
// la mueven, Espacio la suelta y Esc la devuelve; cada paso se anuncia. Cualquier cambio de orden
// (también desde fuera) se anima: cada fila parte de donde se veía.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useSprings, now, type SpringsHandle } from "../motion/useSprings.js";
import { releaseVelocity, rubberBand } from "../motion/spring.js";
import { prefersReducedMotion } from "../motion/reducedMotion.js";
import { springs } from "../tokens.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";
import { GripIcon } from "../icons/index.js";

export interface ReorderMessages {
  /** Cómo se usa el asa (lo oye un lector de pantalla al llegar a ella). */
  instructions: string;
  /** Nombre del asa de un elemento. */
  handle: (label: string) => string;
  picked: (label: string, position: number, total: number) => string;
  moved: (label: string, position: number, total: number) => string;
  dropped: (label: string, position: number, total: number) => string;
  cancelled: (label: string, position: number, total: number) => string;
}

const MESSAGES: ReorderMessages = {
  instructions: "Press Space to pick up. Use the arrow keys to move, Space to drop and Escape to cancel.",
  handle: l => `Reorder ${l}`,
  picked: (l, p, n) => `Picked up ${l}. Position ${p} of ${n}.`,
  moved: (l, p, n) => `${l}, position ${p} of ${n}.`,
  dropped: (l, p, n) => `Dropped ${l} at position ${p} of ${n}.`,
  cancelled: (l, p, n) => `Cancelled. ${l} is back at position ${p} of ${n}.`,
};

export interface ReorderListProps<T> {
  items: T[];
  /** Clave única y estable de cada elemento. */
  getKey: (item: T) => string | number;
  /** Texto de cada elemento, para el nombre de su asa y los avisos. */
  getLabel: (item: T) => string;
  /** Recibe los elementos en el orden nuevo. */
  onReorder: (items: T[]) => void;
  /** Pinta una fila; pon `handle` (el asa) donde quieras dentro. */
  renderItem: (item: T, api: { handle: ReactNode; dragging: boolean }) => ReactNode;
  /** Nombre accesible de la lista. */
  "aria-label"?: string;
  /** Textos de los avisos y del asa (en inglés por defecto). */
  messages?: Partial<ReorderMessages>;
  className?: string;
}

interface Drag {
  key: string;
  from: number;
  over: number;
  keyboard: boolean;
}
interface Geometry {
  tops: number[];
  heights: number[];
  /** Lo que se aparta cada fila para dejarle hueco: el alto de la que se mueve más el espacio. */
  step: number;
  min: number;
  max: number;
}
interface RowApi {
  el: HTMLLIElement;
  handle: HTMLButtonElement | null;
  springs: SpringsHandle<"y" | "s">;
}

const LIFT = 1.02;
const EDGE = 56; // px del borde del contenedor en los que se desplaza solo
const SCROLL_MAX = 14; // px por fotograma

const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
  for (let e = el?.parentElement ?? null; e; e = e.parentElement) {
    const oy = getComputedStyle(e).overflowY;
    if ((oy === "auto" || oy === "scroll") && e.scrollHeight > e.clientHeight) return e;
  }
  return null;
};
const scrollOf = (c: HTMLElement | null) => (c ? c.scrollTop : window.scrollY);

export function ReorderList<T>({ items, getKey, getLabel, onReorder, renderItem, messages, className, "aria-label": ariaLabel }: ReorderListProps<T>) {
  const msg = { ...MESSAGES, ...messages };
  const keys = items.map(i => String(getKey(i)));
  const instrId = useId();
  const rows = useRef(new Map<string, RowApi>());
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const [announce, setAnnounce] = useState("");
  const geo = useRef<Geometry | null>(null);
  const pointer = useRef<{ id: number; y0: number; lastY: number; lastT: number; v: number; scroll0: number; container: HTMLElement | null; raf: number } | null>(null);
  const focusAfter = useRef<string | null>(null);
  const latest = useRef({ items, keys, onReorder, getLabel, msg });
  latest.current = { items, keys, onReorder, getLabel, msg };

  const labelOf = (key: string) => {
    const i = latest.current.keys.indexOf(key);
    return i >= 0 ? latest.current.getLabel(latest.current.items[i]!) : key;
  };
  const measure = (from: number) => {
    const els = latest.current.keys.map(k => rows.current.get(k)?.el);
    const tops = els.map(e => e?.offsetTop ?? 0);
    const heights = els.map(e => e?.offsetHeight ?? 0);
    const n = tops.length;
    const gap = from < n - 1 ? tops[from + 1]! - (tops[from]! + heights[from]!) : from > 0 ? tops[from]! - (tops[from - 1]! + heights[from - 1]!) : 0;
    geo.current = {
      tops,
      heights,
      step: heights[from]! + gap,
      min: tops[0]! - tops[from]!,
      max: tops[n - 1]! + heights[n - 1]! - (tops[from]! + heights[from]!),
    };
  };
  /** Cuánto se desplaza la fila que se mueve para quedar en el hueco `over`. */
  const slotY = (from: number, over: number) => {
    const g = geo.current!;
    return over > from ? g.tops[over]! + g.heights[over]! - (g.tops[from]! + g.heights[from]!) : g.tops[over]! - g.tops[from]!;
  };
  /**
   * El hueco en el que caería con su centro desplazado `dy`: cuántas de las otras quedan por
   * encima. Justo en la mitad de otra, gana la que ya estaba (en el límite de arriba o de abajo,
   * así cae la primera o la última).
   */
  const overAt = (from: number, dy: number) => {
    const g = geo.current!;
    const center = g.tops[from]! + g.heights[from]! / 2 + dy;
    let n = 0;
    for (let i = 0; i < g.tops.length; i++) {
      if (i === from) continue;
      const mid = g.tops[i]! + g.heights[i]! / 2;
      if (i < from ? mid < center : mid <= center) n++;
    }
    return n;
  };

  const pickUp = (key: string, keyboard: boolean) => {
    const from = latest.current.keys.indexOf(key);
    if (from < 0) return null;
    measure(from);
    const d = { key, from, over: from, keyboard };
    setDrag(d);
    return d;
  };
  const finish = (d: Drag, commit: boolean) => {
    const { items: list, keys: ks, msg: m } = latest.current;
    const n = ks.length;
    const label = labelOf(d.key);
    setDrag(null);
    if (commit && d.over !== d.from) {
      const next = list.slice();
      const [moved] = next.splice(d.from, 1);
      next.splice(d.over, 0, moved!);
      latest.current.onReorder(next);
      setAnnounce(m.dropped(label, d.over + 1, n));
    } else setAnnounce(commit ? m.dropped(label, d.from + 1, n) : m.cancelled(label, d.from + 1, n));
  };

  // --- con el puntero
  const applyPointer = () => {
    const p = pointer.current, d = dragRef.current, g = geo.current;
    if (!p || !d || !g) return;
    const raw = p.lastY - p.y0 + (scrollOf(p.container) - p.scroll0);
    const h = g.heights[d.from]!;
    // más allá de la primera o la última se resiste
    const dy = raw < g.min ? g.min + rubberBand(raw - g.min, h) : raw > g.max ? g.max + rubberBand(raw - g.max, h) : raw;
    const row = rows.current.get(d.key);
    if (row) {
      row.springs.springs.y.jump(dy, now());
      row.springs.kick();
    }
    const over = overAt(d.from, Math.min(g.max, Math.max(g.min, raw)));
    if (over !== d.over) setDrag({ ...d, over });
  };
  // cerca del borde de su contenedor (o de la ventana), se desplaza solo
  const autoScroll = () => {
    const p = pointer.current;
    if (!p) return;
    // la fila que se arrastraba ya no está (se quitó desde fuera): se acaba aquí
    if (!dragRef.current) {
      pointer.current = null;
      return;
    }
    const r = p.container ? p.container.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const k = p.lastY < r.top + EDGE ? -(1 - (p.lastY - r.top) / EDGE) : p.lastY > r.bottom - EDGE ? 1 - (r.bottom - p.lastY) / EDGE : 0;
    if (k) {
      const by = Math.max(-1, Math.min(1, k)) * SCROLL_MAX;
      if (p.container) p.container.scrollTop += by;
      else window.scrollBy(0, by);
      applyPointer();
    }
    p.raf = requestAnimationFrame(autoScroll);
  };
  const onHandlePointerDown = (key: string, e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || dragRef.current) return;
    // (el asa no desplaza la página en táctil: touch-action none; ni se selecciona texto: CSS)
    e.currentTarget.setPointerCapture(e.pointerId);
    const d = pickUp(key, false);
    if (!d) return;
    const container = scrollParent(e.currentTarget);
    pointer.current = { id: e.pointerId, y0: e.clientY, lastY: e.clientY, lastT: now(), v: 0, scroll0: scrollOf(container), container, raf: 0 };
    pointer.current.raf = requestAnimationFrame(autoScroll);
  };
  const onHandlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const t = now();
    p.v = 0.7 * ((e.clientY - p.lastY) / Math.max(1e-3, t - p.lastT)) + 0.3 * p.v;
    p.lastY = e.clientY;
    p.lastT = t;
    applyPointer();
  };
  const onHandlePointerUp = (e: PointerEvent<HTMLButtonElement>, commit: boolean) => {
    const p = pointer.current, d = dragRef.current;
    if (!p || p.id !== e.pointerId) return;
    cancelAnimationFrame(p.raf);
    pointer.current = null;
    if (!d) return;
    // se asienta con la velocidad que llevaba
    const row = rows.current.get(d.key);
    if (row) {
      const t = now();
      const sp = row.springs.springs.y;
      sp.setState(sp.value(t), releaseVelocity(p.v, t - p.lastT), t);
    }
    finish(d, commit);
  };
  useEffect(() => () => cancelAnimationFrame(pointer.current?.raf ?? 0), []);

  // --- con el teclado
  const onHandleKeyDown = (key: string, e: KeyboardEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    const { keys: ks, msg: m } = latest.current;
    const n = ks.length;
    if (!d) {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      const nd = pickUp(key, true);
      if (nd) setAnnounce(m.picked(labelOf(key), nd.from + 1, n));
      return;
    }
    if (d.key !== key || !d.keyboard) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const over = Math.max(0, Math.min(n - 1, d.over + (e.key === "ArrowDown" ? 1 : -1)));
      if (over === d.over) return;
      setDrag({ ...d, over });
      setAnnounce(m.moved(labelOf(key), over + 1, n));
      moveTo(key, slotY(d.from, over));
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      focusAfter.current = key;
      finish(d, true);
    } else if (e.key === "Escape") {
      // que no cierre también el diálogo en el que esté la lista
      e.preventDefault();
      e.stopPropagation();
      finish(d, false);
    } else if (e.key === "Tab") finish(d, false);
  };
  // Esc también cancela un arrastre con el puntero
  useEffect(() => {
    if (!drag || drag.keyboard) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const d = dragRef.current;
      if (e.key !== "Escape" || !d || !pointer.current) return;
      e.preventDefault();
      cancelAnimationFrame(pointer.current.raf);
      pointer.current = null;
      finish(d, false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [drag?.key, drag?.keyboard]);

  // la fila que se mueve con el teclado va a su hueco con un muelle (o salta, con «reducir movimiento»)
  const moveTo = (key: string, y: number) => {
    const row = rows.current.get(key);
    if (!row) return;
    const sp = row.springs.springs.y;
    if (prefersReducedMotion()) sp.jump(y, now());
    else sp.set(y, now(), springs.morph);
    row.springs.kick();
  };

  // si los elementos cambian a mitad de un arrastre (desde fuera), se suelta sin cambiar nada
  if (drag && keys[drag.from] !== drag.key) setDrag(null);
  // si llegan o se van otras filas sin mover la que se arrastra, se vuelve a medir: los huecos
  // son otros (y una fila nueva al final es un sitio más al que llevarla)
  const keysSig = keys.join("\n");
  useIsoLayoutEffect(() => {
    const d = dragRef.current;
    if (!d || keys[d.from] !== d.key) return;
    measure(d.from);
    const over = Math.min(d.over, keys.length - 1);
    if (over !== d.over) setDrag({ ...d, over });
    if (d.keyboard) moveTo(d.key, slotY(d.from, over));
    else applyPointer();
  }, [keysSig]);

  // al soltar con el teclado, el asa sigue enfocada aunque React haya movido su fila
  useIsoLayoutEffect(() => {
    const k = focusAfter.current;
    if (!k) return;
    focusAfter.current = null;
    const h = rows.current.get(k)?.handle;
    if (h && document.activeElement !== h) h.focus({ preventScroll: true });
  });

  const n = keys.length;
  return (
    <>
      <ul className={cx("mochi-reorder", className)} aria-label={ariaLabel} data-dragging={drag ? "" : undefined}>
        {items.map((item, i) => {
          const key = keys[i]!;
          const dragged = drag?.key === key;
          // las demás se apartan para dejarle el hueco
          let offset = 0;
          if (drag && !dragged && geo.current) {
            if (drag.from < drag.over && i > drag.from && i <= drag.over) offset = -geo.current.step;
            else if (drag.from > drag.over && i >= drag.over && i < drag.from) offset = geo.current.step;
          }
          return (
            <Row
              key={key}
              rowKey={key}
              offset={offset}
              dragged={dragged}
              rows={rows.current}
              handleLabel={msg.handle(getLabel(item))}
              instructionsId={instrId}
              onPointerDown={e => onHandlePointerDown(key, e)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={e => onHandlePointerUp(e, true)}
              onPointerCancel={e => onHandlePointerUp(e, false)}
              onKeyDown={e => onHandleKeyDown(key, e)}
              onBlur={() => {
                const d = dragRef.current;
                if (d && d.key === key && d.keyboard && focusAfter.current !== key) finish(d, false);
              }}
            >
              {(handle: ReactNode) => renderItem(item, { handle, dragging: dragged })}
            </Row>
          );
        })}
      </ul>
      <span id={instrId} className="mochi-sr">
        {msg.instructions}
      </span>
      <span className="mochi-sr" role="status" aria-live="polite">
        {n ? announce : ""}
      </span>
    </>
  );
}

function Row({
  rowKey,
  offset,
  dragged,
  rows,
  handleLabel,
  instructionsId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onBlur,
  children,
}: {
  rowKey: string;
  offset: number;
  dragged: boolean;
  rows: Map<string, RowApi>;
  handleLabel: string;
  instructionsId: string;
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
  children: (handle: ReactNode) => ReactNode;
}) {
  const el = useRef<HTMLLIElement>(null);
  const handleEl = useRef<HTMLButtonElement>(null);
  const springsRef = useRef<SpringsHandle<"y" | "s"> | null>(null);
  const prevTop = useRef<number | null>(null);
  const wasDragged = useRef(false);

  // si su sitio en la lista cambió (otro orden, filas nuevas o quitadas), parte de donde se veía.
  // Va antes que los muelles: en el mismo pintado ya animan desde ahí
  useIsoLayoutEffect(() => {
    const e = el.current, h = springsRef.current;
    if (!e) return;
    const top = e.offsetTop;
    if (h && prevTop.current !== null && top !== prevTop.current) {
      const t = now();
      const sp = h.springs.y;
      sp.setState(sp.value(t) + prevTop.current - top, sp.velocity(t), t);
    }
    prevTop.current = top;
  });

  // la que se suelta se asienta con `back` (con su velocidad); lo demás, con `morph`
  const settling = wasDragged.current && !dragged;
  const handle = useSprings(
    // mientras se arrastra, su posición la manda el puntero o el teclado (no se toca aquí)
    { y: dragged ? springsRef.current?.springs.y.target ?? 0 : offset, s: dragged ? LIFT : 1 },
    key => (key === "s" ? springs.snappy : settling ? springs.back : springs.morph),
    v => {
      const e = el.current;
      if (!e) return;
      const rest = Math.abs(v.y) < 0.01 && Math.abs(v.s - 1) < 1e-4;
      e.style.transform = rest ? "" : `translateY(${v.y.toFixed(2)}px) scale(${v.s.toFixed(4)})`;
    },
  );
  springsRef.current = handle;
  useIsoLayoutEffect(() => {
    wasDragged.current = dragged;
  });
  useIsoLayoutEffect(() => {
    const e = el.current;
    if (!e) return;
    rows.set(rowKey, { el: e, handle: handleEl.current, springs: handle });
    return () => {
      if (rows.get(rowKey)?.el === e) rows.delete(rowKey);
    };
  }, [rowKey]);

  const grip = (
    <button
      ref={handleEl}
      type="button"
      className="mochi-reorder__handle"
      aria-label={handleLabel}
      aria-describedby={instructionsId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <GripIcon size={18} />
    </button>
  );
  return (
    <li ref={el} className="mochi-reorder__item" data-dragging={dragged || undefined}>
      {children(grip)}
    </li>
  );
}
