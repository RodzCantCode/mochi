"use client";
// Botón de Mochi: normal → cargando (se encoge a círculo con un arco que gira) → hecho
// (el check se dibuja) → normal. Todo es la misma forma que se transforma.
import { forwardRef, useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { MorphBox } from "./MorphBox.js";
import { cx } from "../internal/cx.js";

export type ButtonStatus = "idle" | "loading" | "success";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  status?: ButtonStatus;
  /** `danger` para acciones destructivas (borrar, salir sin guardar). */
  variant?: "solid" | "surface" | "accent" | "danger";
  size?: "sm" | "md" | "lg";
  /** Icono tras el texto (p. ej. <ArrowRightIcon />). */
  icon?: ReactNode;
  /** Solo un icono como contenido: el botón es un círculo. Ponle `aria-label`. */
  iconOnly?: boolean;
  children: ReactNode;
  /** Lo que oye un lector de pantalla mientras carga. */
  loadingLabel?: string;
  /** Lo que oye un lector de pantalla al terminar. */
  successLabel?: string;
}

const SIZES = {
  sm: { h: 36, px: 16 },
  md: { h: 44, px: 20 },
  lg: { h: 56, px: 26 },
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    status = "idle",
    variant = "solid",
    size = "md",
    icon,
    iconOnly,
    children,
    loadingLabel = "Loading",
    successLabel = "Done",
    className,
    onClick,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  const { h, px } = SIZES[size];
  const busy = status !== "idle";
  return (
    <>
      <MorphBox
        ref={ref}
        as="button"
        type={type}
        tone={variant}
        radius="pill"
        contentKey={status}
        height={h}
        width={busy || iconOnly ? h : undefined}
        padding={busy || iconOnly ? "0" : `0 ${px}px`}
        pressScale={busy ? undefined : 0.965}
        className={cx("mochi-button", className)}
        data-size={size}
        data-status={status}
        disabled={disabled}
        aria-busy={status === "loading" || undefined}
        aria-disabled={busy || undefined}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
        accessory={iconOnly ? undefined : <span className="mochi-sr">{children}</span>}
        {...rest}
      >
        {status === "idle" ? (
          <span className="mochi-button__label" aria-hidden="true">
            {children}
            {icon}
          </span>
        ) : status === "loading" ? (
          <Spinner size={Math.round(h * 0.46)} />
        ) : (
          <CheckMark size={Math.round(h * 0.5)} />
        )}
      </MorphBox>
      <span className="mochi-sr" role="status" aria-live="polite">
        {status === "loading" ? loadingLabel : status === "success" ? successLabel : ""}
      </span>
    </>
  );
});

/** Arco que gira. Decorativo: el estado lo anuncia quien lo usa. */
export function Spinner({ size = 20, strokeWidth = 2.4, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg className={cx("mochi-spinner", className)} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={(strokeWidth * 24) / size} strokeLinecap="round" pathLength={100} />
    </svg>
  );
}

/** Check que se dibuja al aparecer. */
export function CheckMark({ size = 20, strokeWidth = 2.6, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg className={cx("mochi-checkmark", className)} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.5 12.5l4.2 4.2L18.5 7.8" fill="none" stroke="currentColor" strokeWidth={(strokeWidth * 24) / size} strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
    </svg>
  );
}

/**
 * Estado de un botón que lanza una acción asíncrona: `run` pasa a cargando, espera la acción,
 * muestra el check `successFor` ms y vuelve a normal. Si la acción falla, vuelve a normal y
 * relanza el error.
 */
export function useButtonStatus(action: () => unknown, { successFor = 1100 }: { successFor?: number } = {}) {
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const actionRef = useRef(action);
  actionRef.current = action;
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = useCallback(async () => {
    clearTimeout(timer.current);
    setStatus("loading");
    try {
      await actionRef.current();
    } catch (err) {
      setStatus("idle");
      throw err;
    }
    setStatus("success");
    timer.current = setTimeout(() => setStatus("idle"), successFor);
  }, [successFor]);
  return { status, run, setStatus };
}
