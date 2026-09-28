"use client";
// Pestañas con indicador líquido: el borde que va delante tira y el de detrás llega después.
// Las etiquetas cambian de color exactamente por donde pasa el indicador (una copia recortada).
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  /** Id del panel que controla la pestaña, si lo hay. */
  controls?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps) {
  const [current, setCurrent] = useControllable(value, defaultValue ?? options[0]?.value ?? "", onValueChange);
  const index = Math.max(0, options.findIndex(o => o.value === current));
  const baseId = useId();
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const indicator = useRef<HTMLSpanElement>(null);
  const hi = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; cells: Array<[number, number]> } | null>(null);

  // posiciones reales de cada pestaña (cambian con la fuente, el ancho o las etiquetas)
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => {
      const cells = tabs.current.slice(0, options.length).map(t => (t ? ([t.offsetLeft, t.offsetLeft + t.offsetWidth] as [number, number]) : ([0, 0] as [number, number])));
      const next = { w: el.clientWidth, h: el.clientHeight, cells };
      setGeo(prev => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [options.length]);

  const cell = geo?.cells[index] ?? [0, 0];
  // se anima al cambiar de pestaña; si solo cambia la geometría (ancho, fuente), se recoloca al
  // instante. Se compara con lo último que llegó a pintarse: en desarrollo React renderiza dos
  // veces seguidas y, si esto se apuntara al renderizar, la segunda vería el cambio como hecho.
  const everMeasured = useRef(false);
  const paintedIndex = useRef(index);
  const first = !!geo && !everMeasured.current;
  const relayout = everMeasured.current && paintedIndex.current === index;
  useSprings(
    { l: cell[0], r: cell[1] },
    (key, from, to) => ((key === "r") === to > from ? springs.lead : springs.trail),
    v => {
      if (!geo) return;
      const ind = indicator.current;
      if (ind) {
        ind.style.transform = `translateX(${v.l.toFixed(3)}px)`;
        ind.style.width = `${Math.max(0, v.r - v.l).toFixed(3)}px`;
        ind.style.visibility = "visible";
      }
      if (hi.current) {
        const radius = (geo.h - 8) / 2;
        hi.current.style.clipPath = `inset(4px ${(geo.w - v.r).toFixed(3)}px 4px ${v.l.toFixed(3)}px round ${radius}px)`;
      }
    },
    { immediate: first || relayout },
  );
  useIsoLayoutEffect(() => {
    paintedIndex.current = index;
    if (geo) everMeasured.current = true;
  });

  const select = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    setCurrent(o.value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const move = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    let next = -1;
    if (move) {
      next = index;
      for (let n = 0; n <= last; n++) {
        next = (next + move + options.length) % options.length;
        if (!options[next]?.disabled) break;
      }
    } else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    tabs.current[next]?.focus();
  };

  return (
    <div
      ref={root}
      role="tablist"
      className={cx("mochi-seg", className)}
      data-size={size}
      onKeyDown={onKeyDown}
      {...aria}
    >
      <span ref={indicator} className="mochi-seg__indicator" aria-hidden="true" />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={el => {
            tabs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${baseId}-${i}`}
          aria-selected={i === index}
          aria-controls={o.controls}
          tabIndex={i === index ? 0 : -1}
          disabled={o.disabled}
          className="mochi-seg__tab"
          onClick={() => select(i)}
        >
          {o.label}
        </button>
      ))}
      {/* copia de las etiquetas en el color de sobre el indicador, recortada a su forma */}
      <span ref={hi} className="mochi-seg__hi" aria-hidden="true">
        {options.map(o => (
          <span key={o.value} className="mochi-seg__tab">
            {o.label}
          </span>
        ))}
      </span>
    </div>
  );
}
