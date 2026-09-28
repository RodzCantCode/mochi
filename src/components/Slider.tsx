"use client";
// Slider de manipulación directa: mientras arrastras, el valor sale de la posición del puntero.
// Si te pasas del límite, la forma se estira con resistencia creciente; al soltar vuelve con
// la velocidad que llevaba. Con el teclado, empujar contra el límite da un pequeño rebote.
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useSprings, now } from "../motion/useSprings.js";
import { rubberBand } from "../motion/spring.js";
import { springs } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { useElementSize } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Al soltar el arrastre o tras cada tecla. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Icono a la izquierda; como función recibe la fracción (0–1), p. ej. para <VolumeIcon level={f} />. */
  icon?: ReactNode | ((fraction: number) => ReactNode);
  /** Texto que oye un lector de pantalla para el valor (por defecto, el número). */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const H = 48;
const ICON = 22;
const ICON_X = 15;

export function Slider({
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  icon,
  formatValue,
  disabled,
  className,
  ...aria
}: SliderProps) {
  const [v, setV] = useControllable(value, defaultValue ?? min, onValueChange);
  const span = max - min || 1;
  const snap = (x: number) => Math.min(max, Math.max(min, Math.round((x - min) / step) * step + min));
  const frac = (x: number) => (x - min) / span;
  const f = frac(v);

  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(rootEl);
  const W = size?.width ?? 0;
  const shape = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const iconHi = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  // ancho de partida del relleno para el primer pintado (también en SSR); luego lo escribe el muelle
  const [fillStyle] = useState(() => ({ width: `${f * 100}%` }));
  const drag = useRef<{ x: number; f: number; w: number; st: number; samples: Array<[number, number]> } | null>(null);

  const handle = useSprings(
    { f, s: dragging ? (drag.current?.st ?? 0) : 0 },
    key => (key === "s" ? springs.back : springs.snappy),
    p => {
      if (!W) return;
      const s = p.s;
      const sh = shape.current;
      if (sh) {
        const extra = Math.abs(s);
        const h = H - extra * 0.12;
        sh.style.width = `${W + extra}px`;
        sh.style.height = `${h}px`;
        sh.style.transform = `translate(${s < 0 ? s : 0}px, ${(H - h) / 2}px)`;
      }
      const ff = Math.min(1, Math.max(0, p.f));
      const fillW = ff * W + (s > 0 && ff > 0.999 ? s : 0) + (s < 0 ? -s * ff : 0);
      if (fill.current) fill.current.style.width = `${fillW.toFixed(3)}px`;
      if (iconHi.current) {
        const clip = Math.min(ICON, Math.max(0, ICON_X + ICON - fillW));
        iconHi.current.style.clipPath = `inset(0 ${clip.toFixed(3)}px 0 0)`;
      }
    },
  );

  // al cambiar el ancho, vuelve a pintar el relleno y el recorte del icono
  useIsoLayoutEffect(() => handle.kick(), [W]);

  const commit = (x: number) => onValueCommit?.(x);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0 || !rootEl) return;
    const rect = rootEl.getBoundingClientRect();
    rootEl.setPointerCapture(e.pointerId);
    const f0 = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    drag.current = { x: e.clientX, f: f0, w: rect.width, st: 0, samples: [[now(), 0]] };
    setDragging(true);
    setV(snap(min + f0 * span));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const raw = d.f + (e.clientX - d.x) / d.w;
    const ff = Math.min(1, Math.max(0, raw));
    const over = raw > 1 ? (raw - 1) * d.w : raw < 0 ? raw * d.w : 0;
    d.st = rubberBand(over, d.w * 0.33);
    const t = now();
    d.samples.push([t, d.st]);
    if (d.samples.length > 4) d.samples.shift();
    handle.springs.f.jump(ff, t);
    handle.springs.s.jump(d.st, t);
    handle.kick();
    const nv = snap(min + ff * span);
    if (nv !== v) setV(nv);
  };
  const end = () => {
    const d = drag.current;
    if (!d) return;
    const t = now();
    const [t0, s0] = d.samples[0] ?? [t, d.st];
    const vel = t - t0 > 0.004 ? (d.st - s0) / (t - t0) : 0;
    handle.springs.s.setState(d.st, vel, t);
    drag.current = null;
    setDragging(false);
    commit(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = step * 10;
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? step :
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step :
      e.key === "PageUp" ? big : e.key === "PageDown" ? -big : 0;
    let next: number | null = null;
    if (delta) next = snap(v + delta);
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    if (next === v && delta) {
      // empuja contra el límite: rebote corto hacia fuera y vuelta
      handle.springs.s.setState(0, Math.sign(delta) * 320, now());
      handle.kick();
      return;
    }
    setV(next);
    commit(next);
  };

  const renderIcon = () => (typeof icon === "function" ? icon(f) : icon);

  return (
    <div
      ref={setRootEl}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={v}
      aria-valuetext={formatValue ? formatValue(v) : undefined}
      aria-disabled={disabled || undefined}
      aria-orientation="horizontal"
      className={cx("mochi-slider", className)}
      data-dragging={dragging || undefined}
      style={{ height: H }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={onKeyDown}
      {...aria}
    >
      <span ref={shape} className="mochi-slider__shape">
        <span ref={fill} className="mochi-slider__fill" style={fillStyle} />
        {icon ? (
          <>
            <span className="mochi-slider__icon" style={{ left: ICON_X }} aria-hidden="true">{renderIcon()}</span>
            <span ref={iconHi} className="mochi-slider__icon" data-layer="hi" style={{ left: ICON_X }} aria-hidden="true">{renderIcon()}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}
