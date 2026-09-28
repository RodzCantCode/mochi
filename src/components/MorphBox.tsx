"use client";
// La forma de Mochi: una caja que ajusta tamaño y esquinas a su contenido con muelles,
// cambia ese contenido con desenfoque y, al cambiar de tono (negro ↔ blanco), deja crecer
// una copia de sí misma en el tono nuevo desde el centro en vez de fundir colores.
import {
  forwardRef,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
  type PointerEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useSprings, now } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useElementSize } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { mergeRefs } from "../internal/refs.js";
import { cx } from "../internal/cx.js";
import { Swap } from "./Swap.js";

export type Tone = "solid" | "surface" | "accent" | "danger";

export interface MorphBoxProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Elemento que se renderiza (por defecto `div`; `button` para acciones). */
  as?: ElementType;
  tone?: Tone;
  /** Radio de las esquinas en px, o `"pill"` para media altura. */
  radius?: number | "pill";
  /** Identidad del contenido: al cambiar, el contenido se cambia con desenfoque. */
  contentKey: string | number;
  /** Ancho fijo en px; si no, el del contenido. */
  width?: number;
  /** Alto fijo en px; si no, el del contenido. */
  height?: number;
  /** Relleno alrededor del contenido (CSS). */
  padding?: string;
  /** Escala al pulsar (p. ej. 0.965). Sin ella, la forma no reacciona a la pulsación. */
  pressScale?: number;
  /** Contenido que no se cambia con desenfoque (p. ej. un nombre accesible oculto). */
  accessory?: ReactNode;
  /**
   * Conserva el hueco: mientras `width` venga fijado (p. ej. un botón cargando, en círculo), la
   * forma ocupa lo mismo que con su contenido y encoge dentro de ese hueco, sin mover lo de al
   * lado. Usa los márgenes laterales de la forma.
   */
  holdSpace?: boolean;
  children: ReactNode;
  [key: string]: unknown;
}

const TONE_COLOR: Record<Tone, string> = {
  solid: "var(--mochi-on-solid)",
  surface: "var(--mochi-on-surface)",
  accent: "var(--mochi-on-accent)",
  danger: "var(--mochi-on-danger)",
};

export const MorphBox = forwardRef<HTMLElement, MorphBoxProps>(function MorphBox(props, ref) {
  const {
    as: As = "div",
    tone = "solid",
    radius = "pill",
    contentKey,
    width,
    height,
    padding,
    pressScale,
    accessory,
    holdSpace,
    className,
    children,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    ...rest
  } = props as MorphBoxProps & Record<string, never>;

  const shape = useRef<HTMLElement | null>(null);
  const reveal = useRef<HTMLSpanElement>(null);
  const [contentEl, setContentEl] = useState<HTMLSpanElement | null>(null);
  const size = useElementSize(contentEl);
  const tw = width ?? size?.width;
  const th = height ?? size?.height;
  const measured = tw !== undefined && th !== undefined;
  const everMeasured = useRef(false);
  const firstMeasure = measured && !everMeasured.current;
  // ancho del contenido la última vez que no había `width` fijado (se apunta al pintar). Al
  // soltar `width`, la medida del contenido nuevo llega un fotograma después: hasta entonces la
  // medida es la de antes y se mantiene el hueco reservado
  const freeWidth = useRef<number | null>(null);
  const fixedSize = useRef<typeof size>(null);
  const stale = width === undefined && size !== null && size === fixedSize.current;
  const footprint = holdSpace ? (width !== undefined || stale ? freeWidth.current ?? tw : tw) : undefined;

  // tono pintado debajo; mientras difiere de `tone`, la copia del tono nuevo está creciendo
  const [baseTone, setBaseTone] = useState<Tone>(tone);
  const revealing = baseTone !== tone;
  const [pressed, setPressed] = useState(false);

  const handle = useSprings(
    {
      w: tw ?? 0,
      h: th ?? 0,
      r: typeof radius === "number" ? radius : 0,
      p: revealing ? 1.06 : 0,
      s: pressed && pressScale ? pressScale : 1,
    },
    (k, from, to) => (k === "p" ? springs.snappy : k === "s" ? (to < from ? springs.press : springs.snappy) : springs.morph),
    v => {
      const el = shape.current;
      if (!el || !measured) return;
      const w = Math.max(0, v.w), h = Math.max(0, v.h);
      const r = radius === "pill" ? h / 2 : Math.min(v.r, h / 2, w / 2);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.borderRadius = `${r}px`;
      el.style.transform = v.s === 1 ? "" : `scale(${v.s.toFixed(4)})`;
      if (holdSpace) {
        // encoge dentro de su hueco: el margen repone lo que le falta hasta el ancho reservado
        const m = footprint !== undefined ? Math.max(0, (footprint - w) / 2) : 0;
        const mm = m > 0.01 ? `${m.toFixed(2)}px` : "";
        el.style.marginLeft = mm;
        el.style.marginRight = mm;
      }
      const rv = reveal.current;
      if (rv) {
        if (revealing && v.p > 0.001) {
          const p = Math.min(v.p, 1.06);
          rv.style.display = "block";
          rv.style.width = `${w * p}px`;
          rv.style.height = `${h * p}px`;
          rv.style.left = `${(w - w * p) / 2}px`;
          rv.style.top = `${(h - h * p) / 2}px`;
          rv.style.borderRadius = `${r * p}px`;
        } else rv.style.display = "none";
      }
      if (revealing && v.p >= 1) {
        handle.springs.p.jump(0, now());
        setBaseTone(tone);
      }
    },
    { immediate: firstMeasure },
  );
  // se apunta cuando ya se ha pintado: en desarrollo React renderiza dos veces seguidas y, si se
  // apuntara al renderizar, la segunda pasada animaría la primera medida desde ancho 0
  useIsoLayoutEffect(() => {
    if (measured) everMeasured.current = true;
    if (width !== undefined) fixedSize.current = size;
    else if (size && size !== fixedSize.current) freeWidth.current = size.width;
  });

  const press = (on: boolean) => pressScale && setPressed(on);

  return (
    <As
      ref={mergeRefs(ref, shape)}
      className={cx("mochi-morph", className)}
      data-tone={baseTone}
      data-measured={measured || undefined}
      onPointerDown={(e: PointerEvent<HTMLElement>) => {
        if (e.button === 0) press(true);
        onPointerDown?.(e);
      }}
      onPointerUp={(e: PointerEvent<HTMLElement>) => {
        press(false);
        onPointerUp?.(e);
      }}
      onPointerLeave={(e: PointerEvent<HTMLElement>) => {
        press(false);
        onPointerLeave?.(e);
      }}
      onPointerCancel={(e: PointerEvent<HTMLElement>) => {
        press(false);
        onPointerCancel?.(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === " " || e.key === "Enter") press(true);
        onKeyDown?.(e);
      }}
      onKeyUp={(e: KeyboardEvent<HTMLElement>) => {
        press(false);
        onKeyUp?.(e);
      }}
      {...rest}
    >
      <span ref={reveal} className="mochi-morph__reveal" data-tone={tone} aria-hidden="true" />
      <span ref={setContentEl} className="mochi-morph__content" style={{ padding }}>
        <Swapper contentKey={contentKey} tone={tone}>
          {children}
        </Swapper>
      </span>
      {accessory}
    </As>
  );
});

// el color de texto se congela en cada capa: el contenido que sale conserva el de su tono
function Swapper({ contentKey, tone, children }: { contentKey: string | number; tone: Tone; children: ReactNode }) {
  return (
    <Swap id={contentKey} layerStyle={{ color: TONE_COLOR[tone] }}>
      {children}
    </Swap>
  );
}
