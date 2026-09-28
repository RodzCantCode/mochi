"use client";
// Avisos: `toast("Changes saved")` desde cualquier sitio y un <Toaster /> en la página.
// Se muestra uno cada vez; si llega otro, la píldora se transforma en el nuevo.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { cx } from "../internal/cx.js";
import { CheckCircleIcon } from "../icons/index.js";
import { MorphBox } from "./MorphBox.js";

export interface ToastOptions {
  title: ReactNode;
  /** "success" muestra el check; "none", nada; o un icono propio. */
  icon?: "success" | "none" | ReactNode;
  action?: { label: string; onClick: () => void };
  /** Milisegundos visible (se pausa mientras el puntero o el foco están encima). */
  duration?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
}

let seq = 0;
let current: ToastItem | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Muestra un aviso. Devuelve su id. */
export function toast(options: ToastOptions | string): number {
  const o = typeof options === "string" ? { title: options } : options;
  current = { icon: "success", duration: 3000, ...o, id: ++seq };
  emit();
  return current.id;
}
/** Quita el aviso `id` (o el que haya). */
toast.dismiss = (id?: number) => {
  if (current && (id === undefined || current.id === id)) {
    current = null;
    emit();
  }
};

export function Toaster({ position = "bottom", offset = 24, className }: { position?: "top" | "bottom"; offset?: number; className?: string }) {
  const item = useSyncExternalStore(subscribe, () => current, () => null);
  const [shown, setShown] = useState<ToastItem | null>(item);
  if (item && item !== shown) setShown(item);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);

  const wrap = useRef<HTMLDivElement>(null);
  useSprings({ o: item ? 1 : 0 }, (_k, from, to) => (to > from ? springs.morph : springs.fadeOut), ({ o }) => {
    const el = wrap.current;
    if (!el) return;
    const u = Math.min(1, Math.max(0, o));
    const dir = position === "bottom" ? 1 : -1;
    el.style.opacity = u.toFixed(4);
    el.style.transform = `translateY(${((1 - u) * 16 * dir).toFixed(2)}px) scale(${(0.9 + 0.1 * u).toFixed(4)})`;
    const b = (1 - u) * SWAP.blur;
    el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
    if (!item && u <= 0.002) setShown(null);
  }, { from: { o: 0 } });

  // cuenta atrás con pausa
  const [paused, setPaused] = useState(false);
  const left = useRef(0);
  const started = useRef(0);
  useEffect(() => {
    if (item) left.current = item.duration ?? 3000;
  }, [item]);
  useEffect(() => {
    if (!item || paused || !Number.isFinite(left.current)) return;
    started.current = Date.now();
    const t = setTimeout(() => toast.dismiss(item.id), left.current);
    return () => {
      clearTimeout(t);
      left.current -= Date.now() - started.current;
    };
  }, [item, paused]);

  if (!client) return null;
  const icon = shown?.icon === "success" ? <CheckCircleIcon size={22} /> : shown?.icon === "none" ? null : shown?.icon;
  return createPortal(
    <div className={cx("mochi-toaster", className)} data-position={position} style={{ [position]: offset }} role="region" aria-label="Notifications">
      <div aria-live="polite" aria-atomic="true">
        {shown ? (
          <div
            ref={wrap}
            className="mochi-toast-wrap"
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <MorphBox tone="solid" radius="pill" contentKey={shown.id} height={52} padding={shown.action ? "0 8px 0 18px" : "0 22px 0 18px"} className="mochi-toast">
              <span className="mochi-toast__body">
                {icon ? <span className="mochi-toast__icon">{icon}</span> : null}
                <span className="mochi-toast__title">{shown.title}</span>
                {shown.action ? (
                  <button
                    type="button"
                    className="mochi-toast__action"
                    onClick={() => {
                      shown.action!.onClick();
                      toast.dismiss(shown.id);
                    }}
                  >
                    {shown.action.label}
                  </button>
                ) : null}
              </span>
            </MorphBox>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
