"use client";
// Progreso: una barra (Progress) o un anillo (ProgressRing). El valor avanza con un muelle. Sin
// valor es «indeterminado» y va en bucle, a velocidad constante: en la barra, un tramo sale
// estirándose por la izquierda, la recorre y se encoge contra el final; en el anillo, el arco
// gira y se alarga y se acorta mientras gira. Al llegar un valor, lo que se movía se transforma
// en el relleno. Al llegar al máximo, el anillo se llena desde el centro y se vuelve un check.
import { useId, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { useSprings, now, type SpringsHandle } from "../motion/useSprings.js";
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

interface Loop<S> {
  t0: number;
  s: S;
  /** Cuándo se paró (sin valor, sigue en marcha). */
  stopped?: number;
}

/**
 * Bucle de fotogramas mientras `active`: llama a `frame` con los segundos desde que empezó y lo
 * que devolvió `start` al arrancar. Devuelve el último bucle, para saber dónde iba al pararlo.
 */
function useLoop<S>(active: boolean, start: () => S, frame: (elapsed: number, s: S) => void) {
  const last = useRef<Loop<S> | null>(null);
  const fns = useRef({ start, frame });
  fns.current = { start, frame };
  useIsoLayoutEffect(() => {
    if (!active) return;
    const loop: Loop<S> = { t0: now(), s: fns.current.start() };
    last.current = loop;
    let raf = 0;
    const tick = () => {
      fns.current.frame(now() - loop.t0, loop.s);
      raf = requestAnimationFrame(tick);
    };
    // el primer fotograma ya, antes de pintar
    tick();
    return () => {
      cancelAnimationFrame(raf);
      loop.stopped = now();
    };
  }, [active]);
  return last;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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
// lo indeterminado: un tramo de un 30 % del ancho que cruza la barra entera en 1,1 s, de fuera a
// fuera; el surco lo recorta, así que sale estirándose y se encoge contra el final
const SEG = 0.3;
const SWEEP = 1.1;
const STILL: [number, number] = [0.3, 0.7]; // con «reducir movimiento»
/** Dónde va el tramo (en fracciones del ancho) a los `el` segundos, si empezó con la cabeza en `head0`. */
const sweepAt = (head0: number, el: number): [number, number] => {
  const head = (head0 + (el / SWEEP) * (1 + SEG)) % (1 + SEG);
  return [head - SEG, head];
};

export function Progress({ value, max = 100, formatValue, label, showValue, size = "md", className, style, "aria-labelledby": labelledBy, ...rest }: ProgressProps) {
  const { v, f } = readValue(value, max);
  const indeterminate = v === null;
  const labelId = useId();
  const hasLabel = label !== undefined && label !== null && label !== false;
  const format = formatValue ?? percent;

  const reduce = indeterminate && prefersReducedMotion();
  const looping = indeterminate && !reduce;
  // mientras va en bucle, los muelles se quedan en el principio (no pintan)
  const [l, r] = !indeterminate ? [0, f] : reduce ? STILL : [0, 0];

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
  const handleRef = useRef<SpringsHandle<"l" | "r" | "n"> | null>(null);
  // el bucle empieza donde estaba el borde delantero del relleno, así no salta si era corto
  const loop = useLoop(
    looping,
    () => ({ head0: clamp01(handleRef.current?.read().r ?? 0) }),
    (el, s) => {
      const [a, b] = sweepAt(s.head0, el);
      paint({ l: a, r: b });
    },
  );
  // al llegar un valor, los muelles parten de donde iba el tramo (lo que se ve de él) y lo
  // transforman en el relleno. Va antes que los muelles: en el mismo pintado, ya parten de ahí
  const wasLooping = useRef(looping);
  useIsoLayoutEffect(() => {
    const lp = loop.current, hd = handleRef.current;
    if (wasLooping.current && !looping && lp && hd) {
      const [a, b] = sweepAt(lp.s.head0, (lp.stopped ?? now()) - lp.t0);
      // ya salido por la derecha: se parte del principio
      const [a1, b1] = a >= 1 ? [0, 0] : [clamp01(a), clamp01(b)];
      hd.springs.l.jump(a1, now());
      hd.springs.r.jump(b1, now());
    }
    wasLooping.current = looping;
  });
  const handle = useSprings(
    { l, r, n: v ?? 0 },
    springs.morph,
    p => {
      if (!looping) paint(p);
      writeNum(p.n);
    },
  );
  handleRef.current = handle;
  // al cambiar de ancho, se recoloca sin animar
  useIsoLayoutEffect(() => {
    if (!looping) paint(handle.read());
  }, [W]);
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
// lo indeterminado: gira a ritmo constante y el arco se alarga y se acorta (en vueltas)
const SPIN = 0.95; // vueltas por segundo
const ARC_MIN = 0.08;
const ARC_MAX = 0.34;
const BREATH = 1.5; // segundos de un ciclo de alargarse y acortarse
/** Cola y cabeza del arco (en vueltas) a los `el` segundos, si empezó con la cola en `tail0`. */
const spinAt = (tail0: number, el: number): [number, number] => {
  const tail = tail0 + SPIN * el;
  // la cabeza nunca va hacia atrás: el arco cambia más despacio de lo que gira
  const len = ARC_MIN + ((ARC_MAX - ARC_MIN) * (1 - Math.cos((2 * Math.PI * el) / BREATH))) / 2;
  return [tail, tail + len];
};
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

  const reduce = indeterminate && prefersReducedMotion();
  const looping = indeterminate && !reduce;
  const arc = useRef<SVGPathElement>(null);
  const disc = useRef<SVGCircleElement>(null);
  const mark = useRef<SVGPathElement>(null);
  const paintArc = (tail: number, head: number) => {
    const a = arc.current;
    if (!a) return;
    const len = clamp01(head - tail);
    const start = tail - Math.floor(tail);
    // el patrón se repite cada vuelta: un arco que cruza las 12 se pinta en dos trozos
    a.style.strokeDasharray = `${len.toFixed(4)} ${(1 - len).toFixed(4)}`;
    a.style.strokeDashoffset = (-start).toFixed(4);
    // sin largo, el extremo redondo dejaría un punto
    a.style.opacity = len > 0.002 ? "1" : "0";
  };
  const handleRef = useRef<SpringsHandle<"t" | "hd" | "c" | "d"> | null>(null);
  // el bucle empieza donde estaba la cola del arco
  const loop = useLoop(
    looping,
    () => ({ tail0: handleRef.current?.read().t ?? 0 }),
    (el, s) => paintArc(...spinAt(s.tail0, el)),
  );
  // vueltas: al salir del bucle, la cuenta sigue desde la siguiente vuelta completa, así el arco
  // termina hacia delante, hasta las 12, en vez de desenrollarse
  const [mode, setMode] = useState({ indeterminate, base: 0 });
  if (mode.indeterminate !== indeterminate) {
    const running = loop.current && loop.current.stopped === undefined ? loop.current : null;
    setMode({ indeterminate, base: indeterminate || !running ? mode.base : Math.ceil(spinAt(running.s.tail0, now() - running.t0)[0] - 1e-9) });
  }
  // mientras va en bucle, los muelles se quedan en la base (no pintan el arco)
  const [t, hd] = !indeterminate ? [mode.base, mode.base + f] : reduce ? [mode.base, mode.base + 0.25] : [mode.base, mode.base];

  const [initial] = useState(() => ({
    arc: { strokeDasharray: `${f} ${1 - f}`, opacity: f > 0.002 ? 1 : 0 },
    r: complete ? 12 : 0,
    // sin dibujar, oculto: Safari pinta el remate redondo del trazo vacío como un punto
    mark: { strokeDashoffset: complete ? 0 : 1, opacity: complete ? 1 : 0 },
  }));
  // al llegar un valor, los muelles parten de donde iba el arco (va antes que los muelles)
  const wasLooping = useRef(looping);
  useIsoLayoutEffect(() => {
    const lp = loop.current, h = handleRef.current;
    if (wasLooping.current && !looping && lp && h) {
      const [tl, hd] = spinAt(lp.s.tail0, (lp.stopped ?? now()) - lp.t0);
      h.springs.t.jump(tl, now());
      h.springs.hd.jump(hd, now());
    }
    wasLooping.current = looping;
  });
  handleRef.current = useSprings(
    { t, hd, c: complete ? 1 : 0, d: complete ? 1 : 0 },
    (key, from, to) => (key === "d" ? (to > from ? { config: springs.draw, delay: 0.12 } : springs.fadeOut) : springs.morph),
    p => {
      if (!looping) paintArc(p.t, p.hd);
      if (disc.current) disc.current.setAttribute("r", (12 * clamp01(p.c)).toFixed(3));
      if (mark.current) {
        mark.current.style.strokeDashoffset = (1 - clamp01(p.d)).toFixed(4);
        mark.current.style.opacity = p.d > 0.001 ? "1" : "0";
      }
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
