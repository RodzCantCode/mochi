"use client";
// Casilla: un cuadro con filo que, al marcarla, se llena de `solid` desde el centro (la forma
// del tono nuevo crece; los tonos nunca se funden) y dibuja el check. El estado mixto es una
// raya: el check se transforma en ella. La etiqueta también marca; Espacio marca, Enter no.
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { mergeRefs } from "../internal/refs.js";
import { cx } from "../internal/cx.js";
import { ChoiceMessage, hasContent, readError, usePress } from "../internal/choice.js";

export type CheckedState = boolean | "indeterminate";

export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "defaultValue" | "defaultChecked" | "children"> {
  /** Marcada, sin marcar o `"indeterminate"` (mixta: una raya). */
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  /** Recibe el estado nuevo; desde mixta, pulsar la marca. */
  onCheckedChange?: (checked: boolean) => void;
  /** Etiqueta visible; pulsarla también marca. Sin ella, pon `aria-label`. */
  label?: ReactNode;
  /** Ayuda bajo la etiqueta cuando no hay error. */
  description?: ReactNode;
  /** Error: con texto, se muestra bajo la etiqueta; con `true`, solo se marca la casilla. */
  error?: ReactNode;
  size?: "sm" | "md";
  /** Con `name`, el valor viaja en formularios como una casilla normal. */
  name?: string;
  value?: string;
  /** Clase del contenedor (la casilla es un <button> dentro). */
  className?: string;
}

// el check (el de Button, un poco más pequeño) y la raya, con los mismos tres puntos: así uno
// se transforma en la otra
const CHECK = [
  [6.2, 12.4],
  [10.1, 16.2],
  [17.8, 8.3],
] as const;
const DASH = [
  [7, 12],
  [12, 12],
  [17, 12],
] as const;
const markPath = (m: number) =>
  CHECK.map(([x, y], i) => `${i ? "L" : "M"}${(x + (DASH[i]![0] - x) * m).toFixed(2)} ${(y + (DASH[i]![1] - y) * m).toFixed(2)}`).join(" ");
const STROKE = { sm: 2.2, md: 2.4 } as const; // px reales del trazo

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    checked,
    defaultChecked = false,
    onCheckedChange,
    label,
    description,
    error,
    size = "md",
    name,
    value = "on",
    className,
    id: idProp,
    disabled,
    onClick,
    onKeyDown,
    onKeyUp,
    onBlur,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    "aria-label": ariaLabel,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    ...rest
  },
  ref,
) {
  const [state, setState] = useControllable<CheckedState>(checked, defaultChecked, v => onCheckedChange?.(v === true));
  const on = state !== false;
  const mixed = state === "indeterminate";
  const autoId = useId();
  const id = idProp ?? `${autoId}-box`;
  const labelId = `${autoId}-label`;
  const msgId = `${autoId}-msg`;
  const { invalid, showsError } = readError(error);
  const hasMessage = hasContent(showsError ? error : description);
  const box = useRef<HTMLButtonElement>(null);
  const press = usePress(box, disabled);

  // estilos de partida para el primer pintado (también en SSR); luego los escriben los muelles
  const [initial] = useState(() => ({
    fill: { transform: `scale(${on ? 1 : 0})` },
    d: markPath(mixed ? 1 : 0),
    // sin dibujar, oculto: Safari pinta el remate redondo del trazo vacío como un punto
    mark: { strokeDashoffset: on ? 0 : 1, opacity: on ? 1 : 0 },
  }));
  const fill = useRef<HTMLSpanElement>(null);
  const mark = useRef<SVGPathElement>(null);
  // el trazo solo se reescribe si cambia: reescribirlo obliga a recalcular la página
  const drawn = useRef(initial.d);

  // como una casilla nativa: al reiniciar su formulario vuelve a como empezó
  const startState = useRef(state);
  const setStateRef = useRef(setState);
  setStateRef.current = setState;
  useEffect(() => {
    const form = box.current?.form;
    if (!form) return;
    const onReset = () => setStateRef.current(startState.current);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  useSprings(
    { p: on ? 1 : 0, d: on ? 1 : 0, m: mixed ? 1 : 0, s: press.pressed ? 0.9 : 1 },
    (key, from, to) =>
      key === "d"
        ? to > from
          ? { config: springs.draw, delay: 0.08 }
          : springs.fadeOut
        : key === "s" && to < from
          ? springs.press
          : springs.snappy,
    v => {
      if (fill.current) fill.current.style.transform = `scale(${Math.max(0, v.p).toFixed(4)})`;
      const mk = mark.current;
      if (mk) {
        const d = markPath(Math.min(1, Math.max(0, v.m)));
        if (d !== drawn.current) {
          mk.setAttribute("d", d);
          drawn.current = d;
        }
        mk.style.strokeDashoffset = (1 - Math.min(1, Math.max(0, v.d))).toFixed(4);
        mk.style.opacity = v.d > 0.001 ? "1" : "0";
      }
      if (box.current) box.current.style.transform = v.s === 1 ? "" : `scale(${v.s.toFixed(4)})`;
    },
  );

  const hasLabel = hasContent(label);
  return (
    <div
      className={cx("mochi-choice", "mochi-check", className)}
      data-size={size}
      data-state={mixed ? "indeterminate" : on ? "checked" : "unchecked"}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      <button
        {...rest}
        onPointerDown={e => {
          press.pointer.onPointerDown(e);
          onPointerDown?.(e);
        }}
        onPointerUp={e => {
          press.pointer.onPointerUp();
          onPointerUp?.(e);
        }}
        onPointerLeave={e => {
          press.pointer.onPointerLeave();
          onPointerLeave?.(e);
        }}
        onPointerCancel={e => {
          press.pointer.onPointerCancel();
          onPointerCancel?.(e);
        }}
        ref={mergeRefs(ref, box)}
        id={id}
        type="button"
        role="checkbox"
        aria-checked={mixed ? "mixed" : on}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy ?? (hasLabel && !ariaLabel ? labelId : undefined)}
        aria-describedby={cx(describedBy, hasMessage && msgId) || undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className="mochi-choice__control"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          onClick?.(e);
          if (!e.defaultPrevented) setState(mixed ? true : !on);
        }}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          // como una casilla nativa: Enter no la marca (en un formulario, lo envía quien toque)
          if (e.key === "Enter") e.preventDefault();
          press.onKeyDown(e.key);
          onKeyDown?.(e);
        }}
        onKeyUp={(e: KeyboardEvent<HTMLButtonElement>) => {
          press.onKeyUp();
          onKeyUp?.(e);
        }}
        onBlur={e => {
          press.onBlur();
          onBlur?.(e);
        }}
      >
        <span ref={fill} className="mochi-choice__fill" style={initial.fill} aria-hidden="true">
          <svg className="mochi-check__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              ref={mark}
              d={initial.d}
              pathLength={1}
              fill="none"
              stroke="currentColor"
              strokeWidth={(STROKE[size] * 24) / (size === "sm" ? 18 : 22)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1}
              style={initial.mark}
            />
          </svg>
        </span>
        <span className="mochi-choice__ring" aria-hidden="true" />
      </button>
      {/* el mensaje está siempre, aunque vacío: así un lector de pantalla anuncia el error que llegue */}
      <div className="mochi-choice__text">
        {hasLabel ? (
          <label htmlFor={id} id={labelId} className="mochi-choice__label" {...press.pointer}>
            {label}
          </label>
        ) : null}
        <ChoiceMessage id={msgId} description={description} error={error} />
      </div>
      {name ? <input type="checkbox" hidden readOnly name={name} value={value} checked={state === true} disabled={disabled} form={rest.form} /> : null}
    </div>
  );
});
