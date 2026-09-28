"use client";
// Botones de opción: un grupo en el que solo una opción va elegida. Al elegirla, el círculo se
// llena de `solid` desde el centro y el punto crece con `snappy`; la que deja de estarlo se
// recoge hacia su centro. Se entra con un solo Tab y las flechas mueven y eligen, como en un
// grupo de radios nativo.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { cx } from "../internal/cx.js";
import { ChoiceMessage, hasContent, readError, usePress } from "../internal/choice.js";

export interface RadioOption {
  value: string;
  /** Etiqueta visible; pulsarla también elige. */
  label: ReactNode;
  /** Ayuda bajo la etiqueta de esta opción. */
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  /** La opción elegida; `null`, ninguna. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Título visible del grupo y su nombre accesible. Sin él, pon `aria-label`. */
  label?: ReactNode;
  /** Ayuda bajo las opciones cuando no hay error. */
  description?: ReactNode;
  /** Error: con texto, se muestra bajo las opciones; con `true`, solo se marcan. */
  error?: ReactNode;
  /** Nombre en un formulario: viaja el valor elegido (salvo si está desactivado). */
  name?: string;
  size?: "sm" | "md";
  /** `vertical` (por defecto) o `horizontal`, en fila. */
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function RadioGroup({
  options,
  value,
  defaultValue = null,
  onValueChange,
  label,
  description,
  error,
  name,
  size = "md",
  orientation = "vertical",
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
}: RadioGroupProps) {
  const [current, setCurrent] = useControllable<string | null>(value, defaultValue, v => v !== null && onValueChange?.(v));
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const msgId = `${baseId}-msg`;
  const { invalid, showsError } = readError(error);
  const hasMessage = hasContent(showsError ? error : description);
  const hasLabel = hasContent(label);
  const radios = useRef<Array<HTMLButtonElement | null>>([]);
  const root = useRef<HTMLDivElement>(null);

  // como unos radios nativos: al reiniciar su formulario vuelve a como empezó
  const startValue = useRef(current);
  const setCurrentRef = useRef(setCurrent);
  setCurrentRef.current = setCurrent;
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const onReset = () => setCurrentRef.current(startValue.current);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const off = (i: number) => disabled || !!options[i]?.disabled;
  const selected = current === null ? -1 : options.findIndex(o => o.value === current);
  // un solo Tab para entrar: a la elegida o, si no hay, a la primera que se puede elegir
  const tabStop = selected >= 0 && !off(selected) ? selected : options.findIndex((_, i) => !off(i));

  const choose = (i: number) => {
    const o = options[i];
    if (!o || off(i)) return;
    if (o.value !== current) setCurrent(o.value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const move = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!move) return;
    const from = radios.current.findIndex(r => r === e.target);
    if (from < 0) return;
    let next = from;
    for (let n = 0; n < options.length; n++) {
      next = (next + move + options.length) % options.length;
      if (!off(next)) break;
    }
    if (next === from || off(next)) return;
    e.preventDefault();
    choose(next);
    radios.current[next]?.focus();
  };

  return (
    <div
      ref={root}
      className={cx("mochi-radio-group", className)}
      data-size={size}
      data-orientation={orientation}
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      {hasLabel ? (
        <div id={labelId} className="mochi-radio-group__label">
          {label}
        </div>
      ) : null}
      <div
        id={id}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy ?? (hasLabel && !ariaLabel ? labelId : undefined)}
        aria-describedby={hasMessage ? msgId : undefined}
        aria-invalid={invalid || undefined}
        aria-disabled={disabled || undefined}
        className="mochi-radio-group__list"
        onKeyDown={onKeyDown}
      >
        {options.map((o, i) => (
          <Radio
            key={o.value}
            option={o}
            size={size}
            checked={i === selected}
            tabbable={i === tabStop}
            disabled={off(i)}
            buttonRef={el => {
              radios.current[i] = el;
            }}
            onSelect={() => choose(i)}
          />
        ))}
      </div>
      <ChoiceMessage id={msgId} description={description} error={error} />
      {/* como un radio nativo desactivado, lo desactivado no viaja */}
      {name && selected >= 0 && !off(selected) ? <input type="hidden" name={name} value={current ?? ""} /> : null}
    </div>
  );
}

function Radio({
  option,
  size,
  checked,
  tabbable,
  disabled,
  buttonRef,
  onSelect,
}: {
  option: RadioOption;
  size: "sm" | "md";
  checked: boolean;
  tabbable: boolean;
  disabled: boolean;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onSelect: () => void;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  const box = useRef<HTMLButtonElement | null>(null);
  const press = usePress(box, disabled);
  const [initial] = useState(() => ({ fill: { transform: `scale(${checked ? 1 : 0})` } }));
  const fill = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  useSprings(
    { p: checked ? 1 : 0, q: checked ? 1 : 0, s: press.pressed ? 0.9 : 1 },
    (key, from, to) => (key === "q" && to > from ? { config: springs.snappy, delay: 0.05 } : key === "s" && to < from ? springs.press : springs.snappy),
    v => {
      if (fill.current) fill.current.style.transform = `scale(${Math.max(0, v.p).toFixed(4)})`;
      if (dot.current) dot.current.style.transform = `scale(${Math.max(0, v.q).toFixed(4)})`;
      if (box.current) box.current.style.transform = v.s === 1 ? "" : `scale(${v.s.toFixed(4)})`;
    },
  );
  const hasDesc = hasContent(option.description);
  return (
    <div className="mochi-choice mochi-radio" data-size={size} data-state={checked ? "checked" : "unchecked"} data-disabled={disabled || undefined}>
      <button
        ref={el => {
          box.current = el;
          buttonRef(el);
        }}
        id={`${id}-radio`}
        type="button"
        role="radio"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hasDesc ? descId : undefined}
        tabIndex={tabbable ? 0 : -1}
        disabled={disabled}
        className="mochi-choice__control"
        onClick={onSelect}
        onKeyDown={e => {
          // como un radio nativo: Enter no elige
          if (e.key === "Enter") e.preventDefault();
          press.onKeyDown(e.key);
        }}
        onKeyUp={press.onKeyUp}
        onBlur={press.onBlur}
        {...press.pointer}
      >
        <span ref={fill} className="mochi-choice__fill" style={initial.fill} aria-hidden="true">
          <span ref={dot} className="mochi-radio__dot" style={initial.fill} />
        </span>
        <span className="mochi-choice__ring" aria-hidden="true" />
      </button>
      <div className="mochi-choice__text">
        <label htmlFor={`${id}-radio`} id={labelId} className="mochi-choice__label" {...press.pointer}>
          {option.label}
        </label>
        {hasDesc ? (
          <div id={descId} className="mochi-choice__desc">
            {option.description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
