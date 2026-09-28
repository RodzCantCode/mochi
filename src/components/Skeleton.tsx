"use client";
// Esqueleto de carga: huecos con la forma de lo que va a llegar (línea, círculo o bloque) con un
// brillo suave que los recorre; con «reducir movimiento» se quedan quietos. SkeletonSwap cambia
// el esqueleto por el contenido: los huecos se funden en el contenido real con desenfoque y la
// altura se adapta con un muelle.
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cx } from "../internal/cx.js";
import { AutoHeight } from "./AutoHeight.js";
import { Swap } from "./Swap.js";

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** `line` (una línea de texto, del alto de la letra), `circle` (avatar) o `block` (imagen, tarjeta). */
  shape?: "line" | "circle" | "block";
  /** Ancho en px o en CSS (por defecto, todo el ancho). */
  width?: number | string;
  /** Alto en px o en CSS (`block`: 120 px por defecto). */
  height?: number | string;
  /** Diámetro del círculo en px (40 por defecto). */
  size?: number;
  /** Con `line`, varias líneas seguidas; la última, más corta. */
  lines?: number;
}

export function Skeleton({ shape = "line", width, height, size, lines, className, style, ...rest }: SkeletonProps) {
  if (shape === "line" && lines && lines > 1) {
    // el ancho es el del párrafo; la última línea, un 60 % de él
    return (
      <span className={cx("mochi-skeleton-lines", className)} style={{ width, ...style }} aria-hidden="true" {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="mochi-skeleton" data-shape="line" style={i === lines - 1 ? { width: "60%" } : undefined} />
        ))}
      </span>
    );
  }
  const dims: CSSProperties = shape === "circle" ? { width: size ?? 40, height: size ?? 40 } : { width, height };
  return <span className={cx("mochi-skeleton", className)} data-shape={shape} style={{ ...dims, ...style }} aria-hidden="true" {...rest} />;
}

export interface SkeletonSwapProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Mientras es true se ve `skeleton`; al pasar a false, el contenido lo sustituye. */
  loading: boolean;
  /** El esqueleto: formas con la disposición del contenido que va a llegar. */
  skeleton: ReactNode;
  /** El contenido real; no se pinta mientras carga. */
  children: ReactNode;
  /** Lo que oye un lector de pantalla mientras carga. */
  loadingLabel?: string;
}

export function SkeletonSwap({ loading, skeleton, children, loadingLabel = "Loading", className, ...rest }: SkeletonSwapProps) {
  return (
    <AutoHeight className={cx("mochi-skeleton-swap", className)} aria-busy={loading || undefined} {...rest}>
      <Swap id={loading ? "skeleton" : "content"} align="start" enterScale={1} blur={8}>
        {loading ? (
          <>
            <span className="mochi-sr">{loadingLabel}</span>
            {skeleton}
          </>
        ) : (
          children
        )}
      </Swap>
    </AutoHeight>
  );
}
