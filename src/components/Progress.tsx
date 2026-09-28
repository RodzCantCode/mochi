"use client";
// Progreso: una barra (Progress) o un anillo (ProgressRing). El valor avanza con un muelle. Sin
// valor es «indeterminado»: un tramo recorre la barra (o da vueltas al anillo) con sus dos
// bordes en muelles distintos, el de delante en `lead` y el de detrás en `trail`, así que se
// estira al moverse, como el indicador de las pestañas. Al llegar al máximo, el anillo se
// llena desde el centro y se transforma en un check.
import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { useSprings } from "../motion/useSprings.js";
import { prefersReducedMotion } from "../motion/reducedMotion.js";
import { springs } from "../tokens.js";
import { useElementSize } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";

interface CommonProps {
  /** De 0 a `max`. Sin valor (`null`, o algo que no es un número, como 0/0), indeterminado: se sabe que avanza, no cuánto. */
  value?: number | null;
  max?: number;
  /**
   * Texto del valor para lectores de pantalla (y el que se ve con `showValue`). Con `showValue`
   * recibe también los valores por los que pasa la cifra mientras cuenta (enteros si `value` y
   * `max` lo son).
   */
  formatValue?: (value: number, max: number) => string;
}

const percent = (v: number, max: number) => `${max > 0 ? Math.round((v / max) * 100) : 0}%`;

/** El valor dentro de [0, max] y su fracción; `null` si no hay (o no es un número). */
function readValue(value: number | null | undefined, max: number): { v: number | null; f: number } {
  if (value == null || !Number.isFinite(value)) return { v: null, f: 0 };
  // sin un máximo válido no hay nada que medir: se queda al principio
  if (!(Number.isFinite(max) && max > 0)) return { v: 0, f: 0 };
  const v = Math.min(max, Math.max(0, value));
  return { v, f: v / max };
}

/**
 * Pasos de `ms` mientras `active` (vuelve a 0 al activarse). Con «reducir movimiento» no avanza:
 * lo indeterminado se queda quieto.
 */
function useSteps(active: boolean, ms: (step: number) => number): number {
  const [step, setStep] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    // ajuste de estado durante el render (patrón de React para reaccionar a un cambio de props)
    setWasActive(active);
    if (active) setStep(0);
  }
  const msRef = useRef(ms);
  msRef.current = ms;
  useEffect(() => {
    if (!active || prefersReducedMotion()) return;
    const t = setTimeout(() => setStep(s => s + 1), msRef.current(step));
    return () => clearTimeout(t);
  }, [active, step]);
  return step;
}

// ---------------------------------------------------------------------------------------
// Barra

export interface ProgressProps extends CommonProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Texto visible encima de la barra; también es su nombre accesible. Sin él, pon `aria-label`. */
  label?: ReactNode;
  /** Muestra el valor a la derecha de la etiqueta (por defecto, en porcentaje). */
  showValue?: boolean;
  size?: "sm" | "md";
  /** Clase del contenedor (los demás atributos van a la barra). */
  className?: string;
}

const BAR_H = { sm: 6, md: 10 } as const;
// tramos por los que pasa lo indeterminado, en fracciones del ancho: entra por la izquierda,
// avanza a saltos que lo estiran y sale por la derecha; el último vuelve al principio sin verse
const HOPS: Array<[number, number]> = [
  [0.06, 0.34],
  [0.36, 0.64],
  [0.66, 0.94],
  [1.04, 1.32],
  [-0.32, -0.04],
];
const STILL: [number, number] = [0.3, 0.7]; // con «reducir movimiento»
const HOP_MS = 420;

export function Progress({ value, max = 100, formatValue, label, showValue, size = "md", className, style, "aria-labelledby": labelledBy, ...rest }: ProgressProps) {
  const { v, f } = readValue(value, max);
  const indeterminate = v === null;
  const labelId = useId();
  const hasLabel = label !== undefined && label !== null && label !== false;
  const format = formatValue ?? percent;

  const step = useSteps(indeterminate, s => (s % HOPS.length === HOPS.length - 1 ? 60 : HOP_MS));
  const hop = step % HOPS.length;
  const reduce = indeterminate && prefersReducedMotion();
  const [l, r] = !indeterminate ? [0, f] : reduce ? STILL : HOPS[hop]!;

  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const W = useElementSize(track)?.width ?? 0;
  const H = BAR_H[size];
  const bar = useRef<HTMLSpanElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const [initial] = useState(() => ({ bar: indeterminate ? { width: 0 } : { width: `${f * 100}%` }, text: v === null ? "" : format(v, max) }));

  const paint = (p: { l: number; r: number }) => {
    const el = bar.current;
    if (!el || !W) return;
    const x0 = p.l * W, x1 = p.r * W;
    // nunca más estrecho que alto: si no, la píldora se deformaría; lo que sobra queda fuera
    const w = Math.max(H, x1 - x0);
    el.style.transform = `translateX(${(x1 - w).toFixed(2)}px)`;
    el.style.width = `${w.toFixed(2)}px`;
  };
  // la cifra cuenta con su propio muelle (desde 0 al llegar el primer valor); si el valor y el
  // máximo son enteros, pasa por enteros
  const whole = v !== null && Number.isInteger(v) && Number.isInteger(max);
  const writeNum = (n: number) => {
    if (num.current && v !== null) num.current.textContent = format(Math.min(max, Math.max(0, whole ? Math.round(n) : n)), max);
  };
  const handle = useSprings(
    { l, r, n: v ?? 0 },
    // lo indeterminado se estira (delante `lead`, detrás `trail`); el valor avanza con `morph`
    (key, from, to) => (!indeterminate || key === "n" ? springs.morph : (key === "r") === to > from ? springs.lead : springs.trail),
    p => {
      paint(p);
      writeNum(p.n);
    },
    // el paso que vuelve al principio salta: va de fuera a fuera
    { immediate: indeterminate && !reduce && hop === HOPS.length - 1 },
  );
  // al cambiar de ancho, se recoloca sin animar
  useIsoLayoutEffect(() => paint(handle.read()), [W]);
  // la cifra, al día aunque aparezca cuando la barra ya está quieta
  useIsoLayoutEffect(() => writeNum(handle.read().n));

  return (
    <div className={cx("mochi-progress", className)} data-size={size} data-state={indeterminate ? "indeterminate" : f >= 1 ? "complete" : "loading"}>
      {hasLabel || showValue ? (
        <div className="mochi-progress__head">
          {hasLabel ? (
            <span id={labelId} className="mochi-progress__label">
              {label}
            </span>
          ) : null}
          {showValue && !indeterminate ? (
            // la cifra que avanza es decorativa: el valor lo anuncia la barra
            <span ref={num} className="mochi-progress__value" aria-hidden="true">
              {initial.text}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        ref={setTrack}
        role="progressbar"
        aria-labelledby={labelledBy ?? (hasLabel && !rest["aria-label"] ? labelId : undefined)}
        aria-valuemin={0}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-valuenow={v ?? undefined}
        aria-valuetext={v !== null && formatValue ? formatValue(v, max) : undefined}
        className="mochi-progress__track"
        style={{ height: H, ...style }}
        {...rest}
      >
        <span ref={bar} className="mochi-progress__bar" style={initial.bar} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Anillo

export interface ProgressRingProps extends CommonProps, Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** `sm` (20 px, para ir junto a un texto) o `md` (40 px). Ponle `aria-label`. */
  size?: "sm" | "md";
}

const RING = {
  sm: { px: 20, stroke: 2.5, check: 2 },
  md: { px: 40, stroke: 4, check: 2.6 },
} as const;
const TURN_STEP = 0.3; // vueltas que avanza cada salto de lo indeterminado
const ARC = 0.12; // largo del arco en reposo, en vueltas
// check dentro del disco: el de Button, a tres cuartos
const RING_CHECK = "M7.13 12.38 L10.28 15.53 L16.88 8.85";

export function ProgressRing({ value, max = 100, formatValue, size = "md", className, style, ...rest }: ProgressRingProps) {
  const { v, f } = readValue(value, max);
  const indeterminate = v === null;
  const complete = !indeterminate && f >= 1;
  const { px, stroke, check } = RING[size];
  const sw = (stroke * 24) / px; // en unidades de la cuadrícula de 24
  const rad = 12 - sw / 2;
  const circle = `M12 ${12 - rad} A${rad} ${rad} 0 1 1 12 ${12 + rad} A${rad} ${rad} 0 1 1 12 ${12 - rad}`;

  // vueltas: al salir de lo indeterminado, la cuenta sigue desde la siguiente vuelta completa,
  // así el arco termina hacia delante en vez de desenrollarse
  const step = useSteps(indeterminate, () => HOP_MS);
  const [mode, setMode] = useState({ indeterminate, base: 0 });
  if (mode.indeterminate !== indeterminate) {
    setMode({ indeterminate, base: indeterminate ? mode.base : Math.ceil(mode.base + step * TURN_STEP - 1e-9) });
  }
  const reduce = indeterminate && prefersReducedMotion();
  const spin = mode.base + step * TURN_STEP;
  const [t, hd] = !indeterminate ? [mode.base, mode.base + f] : reduce ? [mode.base, mode.base + 0.25] : [spin, spin + ARC];

  const arc = useRef<SVGPathElement>(null);
  const disc = useRef<SVGCircleElement>(null);
  const mark = useRef<SVGPathElement>(null);
  const [initial] = useState(() => ({
    arc: { strokeDasharray: `${f} ${1 - f}`, opacity: f > 0.002 ? 1 : 0 },
    r: complete ? 12 : 0,
    mark: { strokeDashoffset: complete ? 0 : 1 },
  }));
  useSprings(
    { t, hd, c: complete ? 1 : 0, d: complete ? 1 : 0 },
    (key, from, to) =>
      key === "d"
        ? to > from
          ? { config: springs.draw, delay: 0.12 }
          : springs.fadeOut
        : indeterminate && (key === "t" || key === "hd")
          ? (key === "hd") === to > from
            ? springs.lead
            : springs.trail
          : springs.morph,
    p => {
      const a = arc.current;
      if (a) {
        const len = Math.min(1, Math.max(0, p.hd - p.t));
        const start = p.t - Math.floor(p.t);
        // el patrón se repite cada vuelta: un arco que cruza las 12 se pinta en dos trozos
        a.style.strokeDasharray = `${len.toFixed(4)} ${(1 - len).toFixed(4)}`;
        a.style.strokeDashoffset = (-start).toFixed(4);
        // sin largo, el extremo redondo dejaría un punto
        a.style.opacity = len > 0.002 ? "1" : "0";
      }
      if (disc.current) disc.current.setAttribute("r", (12 * Math.min(1, Math.max(0, p.c))).toFixed(3));
      if (mark.current) mark.current.style.strokeDashoffset = (1 - Math.min(1, Math.max(0, p.d))).toFixed(4);
    },
  );

  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Number.isFinite(max) ? max : undefined}
      aria-valuenow={v ?? undefined}
      aria-valuetext={v !== null && formatValue ? formatValue(v, max) : undefined}
      className={cx("mochi-ring", className)}
      data-size={size}
      data-state={indeterminate ? "indeterminate" : complete ? "complete" : "loading"}
      style={{ width: px, height: px, ...style }}
      {...rest}
    >
      <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden="true" focusable="false">
        <circle className="mochi-ring__track" cx="12" cy="12" r={rad} fill="none" strokeWidth={sw} />
        <path ref={arc} className="mochi-ring__arc" d={circle} pathLength={1} fill="none" strokeWidth={sw} strokeLinecap="round" style={initial.arc} />
        <circle ref={disc} className="mochi-ring__disc" cx="12" cy="12" r={initial.r} />
        <path
          ref={mark}
          className="mochi-ring__check"
          d={RING_CHECK}
          pathLength={1}
          fill="none"
          strokeWidth={(check * 24) / px}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={1}
          style={initial.mark}
        />
      </svg>
    </span>
  );
}
