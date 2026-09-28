"use client";
// Interruptor: cada borde de la bolita va en su propio muelle. El que va delante es rápido y
// el de detrás lento, así que la bolita se estira al cambiar y recupera su forma al llegar.
import { forwardRef, useRef, useState, type ButtonHTMLAttributes } from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { cx } from "../internal/cx.js";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "defaultValue"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
  /** Con `name`, el valor viaja en formularios como una casilla normal. */
  name?: string;
  value?: string;
}

const SIZES = {
  sm: { w: 40, h: 24, inset: 2 },
  md: { w: 52, h: 32, inset: 3 },
} as const;

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, defaultChecked = false, onCheckedChange, size = "md", name, value = "on", className, disabled, onClick, onPointerDown, onPointerUp, onPointerLeave, ...rest },
  ref,
) {
  const [on, setOn] = useControllable(checked, defaultChecked, onCheckedChange);
  const [pressed, setPressed] = useState(false);
  const { w, h, inset } = SIZES[size];
  const k = h - inset * 2; // diámetro de la bolita
  const stretch = pressed ? Math.round(k * 0.22) : 0; // al pulsar se alarga hacia donde va a ir
  const left = on ? w - inset - k - stretch : inset;
  const right = on ? w - inset : inset + k + stretch;

  // estilos de partida para el primer pintado (también en SSR); luego los escriben los muelles
  const [initial] = useState(() => ({
    knob: { top: inset, height: k, borderRadius: k / 2, width: right - left, transform: `translateX(${left}px)` },
    track: { background: on ? "var(--mochi-accent)" : "var(--mochi-solid)" },
  }));
  const knob = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLSpanElement>(null);
  useSprings(
    { l: left, r: right, p: on ? 1 : 0 },
    (key, from, to) => {
      if (key === "p") return springs.color;
      // el borde que va en la dirección del movimiento es el que tira
      const movingRight = to > from;
      return (key === "r") === movingRight ? springs.lead : springs.trail;
    },
    v => {
      if (knob.current) {
        knob.current.style.transform = `translateX(${v.l.toFixed(3)}px)`;
        knob.current.style.width = `${Math.max(k * 0.6, v.r - v.l).toFixed(3)}px`;
      }
      if (track.current) {
        const pc = Math.min(100, Math.max(0, v.p * 100));
        track.current.style.background = `color-mix(in srgb, var(--mochi-accent) ${pc.toFixed(2)}%, var(--mochi-solid))`;
      }
    },
  );

  return (
    <>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        className={cx("mochi-switch", className)}
        data-size={size}
        data-state={on ? "on" : "off"}
        style={{ width: w, height: h }}
        onClick={e => {
          onClick?.(e);
          if (!e.defaultPrevented) setOn(!on);
        }}
        onPointerDown={e => {
          if (e.button === 0) setPressed(true);
          onPointerDown?.(e);
        }}
        onPointerUp={e => {
          setPressed(false);
          onPointerUp?.(e);
        }}
        onPointerLeave={e => {
          setPressed(false);
          onPointerLeave?.(e);
        }}
        {...rest}
      >
        <span ref={track} className="mochi-switch__track" aria-hidden="true" style={initial.track} />
        <span ref={knob} className="mochi-switch__knob" aria-hidden="true" style={initial.knob} />
      </button>
      {name ? <input type="checkbox" hidden readOnly name={name} value={value} checked={on} /> : null}
    </>
  );
});
