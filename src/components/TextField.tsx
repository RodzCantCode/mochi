"use client";
// Campo de texto: una píldora con la etiqueta dentro que sube y se encoge al enfocar o al
// escribir. El anillo cambia con el estado (foco, error), el mensaje de ayuda o de error entra
// con desenfoque y la fila crece con un muelle, y «correcto» dibuja un check. En contraseñas,
// un botón muestra u oculta lo escrito.
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type AnimationEvent,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { markSizing, useElementSize } from "../internal/useElementSize.js";
import { mergeRefs } from "../internal/refs.js";
import { cx } from "../internal/cx.js";
import { AlertIcon, EyeIcon, EyeOffIcon } from "../icons/index.js";
import { CheckMark } from "./Button.js";
import { Swap } from "./Swap.js";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "defaultValue" | "children"> {
  /** Etiqueta visible (dentro del campo) y nombre accesible. */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Ayuda bajo el campo cuando no hay error. */
  description?: ReactNode;
  /** Error: con texto, se muestra bajo el campo; con `true`, solo se marca el campo. */
  error?: ReactNode;
  /** Muestra el check de «correcto» a la derecha. */
  valid?: boolean;
  /** Icono a la izquierda (p. ej. <SearchIcon />). */
  icon?: ReactNode;
  /** Clase del contenedor (la del <input> va en `inputClassName`). */
  className?: string;
  inputClassName?: string;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

const H = 56; // alto de la píldora
const LIFT = -8; // la etiqueta sube hasta 9 px del borde
const SHRINK = 0.75; // y se queda en 12 px

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    value,
    defaultValue = "",
    onValueChange,
    description,
    error,
    valid,
    icon,
    className,
    inputClassName,
    showPasswordLabel = "Show password",
    hidePasswordLabel = "Hide password",
    type = "text",
    id: idProp,
    disabled,
    placeholder,
    onChange,
    onFocus,
    onBlur,
    onAnimationStart,
    style,
    "aria-describedby": describedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? `${autoId}-input`;
  const msgId = `${autoId}-msg`;
  const [text, setText] = useControllable(value, defaultValue, onValueChange);
  const [focused, setFocused] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const invalid = error !== undefined && error !== null && error !== false;
  const showsError = invalid && error !== true;
  const message = showsError ? error : description;
  const password = type === "password";
  const floated = focused || text !== "" || autofilled;

  // la etiqueta sube y se encoge; con un muelle, así se puede enfocar y desenfocar a mitad
  const labelEl = useRef<HTMLLabelElement>(null);
  const [initial] = useState(() => (floated ? `translateY(${LIFT}px) scale(${SHRINK})` : ""));
  useSprings({ f: floated ? 1 : 0 }, springs.snappy, ({ f }) => {
    const el = labelEl.current;
    if (el) el.style.transform = `translateY(${(LIFT * f).toFixed(3)}px) scale(${(1 - (1 - SHRINK) * f).toFixed(4)})`;
  });

  // la fila del mensaje crece o se recoge con la forma; el texto entra con desenfoque
  const [msgInner, setMsgInner] = useState<HTMLDivElement | null>(null);
  const msgSize = useElementSize(msgInner);
  const msgBox = useRef<HTMLDivElement>(null);
  const hasMessage = message !== undefined && message !== null && message !== false && message !== "";
  useSprings({ h: msgSize?.height ?? 0 }, springs.morph, ({ h }) => {
    const box = msgBox.current;
    if (!box) return;
    box.style.height = `${Math.max(0, h).toFixed(2)}px`;
    markSizing(box, Math.abs(h - (msgSize?.height ?? 0)) >= 0.5);
  });
  const msgKey = !hasMessage ? "none" : showsError ? `e:${typeof error === "string" ? error : "node"}` : `d:${typeof description === "string" ? description : "node"}`;

  const trailing = (password ? 40 : 0) + (valid ? 30 : 0);
  return (
    <div
      className={cx("mochi-field", className)}
      data-floated={floated || undefined}
      data-focused={focused || undefined}
      data-invalid={invalid || undefined}
      data-valid={valid || undefined}
      data-disabled={disabled || undefined}
    >
      <div className="mochi-field__box" style={{ height: H }}>
        <input
          {...rest}
          ref={mergeRefs(ref, input)}
          id={id}
          type={password && revealed ? "text" : type}
          className={cx("mochi-field__input", inputClassName)}
          style={{ ...style, paddingLeft: icon ? 50 : 22, paddingRight: 22 + trailing }}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={cx(describedBy, hasMessage && msgId) || undefined}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setText(e.target.value);
            if (autofilled && e.target.value === "") setAutofilled(false);
            onChange?.(e);
          }}
          onFocus={(e: FocusEvent<HTMLInputElement>) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e: FocusEvent<HTMLInputElement>) => {
            setFocused(false);
            onBlur?.(e);
          }}
          // el autorrelleno del navegador no avisa con onChange: lo delata esta animación (ver CSS)
          onAnimationStart={(e: AnimationEvent<HTMLInputElement>) => {
            if (e.animationName === "mochi-autofill") setAutofilled(true);
            else if (e.animationName === "mochi-autofill-out") setAutofilled(false);
            onAnimationStart?.(e);
          }}
        />
        {icon ? (
          <span className="mochi-field__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <label ref={labelEl} htmlFor={id} className="mochi-field__label" style={{ left: icon ? 50 : 22, transform: initial || undefined }}>
          {label}
        </label>
        <span className="mochi-field__ring" aria-hidden="true" />
        <span className="mochi-field__trail" style={{ right: password ? 48 : 16 }} aria-hidden="true">
          <Swap id={valid ? "ok" : "none"}>{valid ? <CheckMark size={20} strokeWidth={2.2} /> : <span />}</Swap>
        </span>
        {password ? (
          <button
            type="button"
            className="mochi-field__reveal"
            aria-label={revealed ? hidePasswordLabel : showPasswordLabel}
            aria-controls={id}
            disabled={disabled}
            // el foco se queda escribiendo en el campo
            onPointerDown={e => e.preventDefault()}
            onClick={() => setRevealed(r => !r)}
          >
            <Swap id={revealed ? "hide" : "show"}>{revealed ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}</Swap>
          </button>
        ) : null}
      </div>
      <div ref={msgBox} className="mochi-field__msg" style={{ height: msgSize?.height ?? (hasMessage ? undefined : 0) }}>
        <div ref={setMsgInner} className="mochi-field__msginner" id={msgId} aria-live="polite">
          <Swap id={msgKey}>
            {hasMessage ? (
              <span className="mochi-field__msgtext" data-kind={showsError ? "error" : "hint"}>
                {showsError ? <AlertIcon size={16} /> : null}
                <span>{message}</span>
              </span>
            ) : (
              <span />
            )}
          </Swap>
        </div>
      </div>
    </div>
  );
});
