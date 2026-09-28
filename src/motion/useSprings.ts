"use client";
// Anima varios valores con muelles y escribe cada fotograma directamente en el DOM
// (a través de `onFrame`), sin volver a renderizar React en cada fotograma.
import { useRef } from "react";
import { Spring, type SpringConfig } from "./spring.js";
import { prefersReducedMotion } from "./reducedMotion.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";

export type SpringValues<K extends string> = { [P in K]: number };
export interface SpringPlan {
  config: SpringConfig;
  /** Segundos de espera antes de arrancar. */
  delay?: number;
}
/** Un muelle para todo, o uno por valor y cambio (p. ej. el borde que va delante y el que va detrás). */
export type SpringConfigFor<K extends string> = SpringConfig | ((key: K, from: number, to: number) => SpringConfig | SpringPlan);

/** Reloj de los muelles, en segundos. */
export const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

export interface SpringsHandle<K extends string> {
  springs: { [P in K]: Spring };
  /** Arranca el bucle tras cambiar muelles a mano (p. ej. en un gestor de arrastre). */
  kick: () => void;
  /** Valores actuales. */
  read: () => SpringValues<K>;
}

interface State<K extends string> {
  springs: { [P in K]: Spring };
  raf: number;
  onFrame: (v: SpringValues<K>) => void;
  mounted: boolean;
}

export function useSprings<K extends string>(
  targets: SpringValues<K>,
  config: SpringConfigFor<K>,
  onFrame: (values: SpringValues<K>) => void,
  options: { immediate?: boolean; from?: Partial<SpringValues<K>> } = {},
): SpringsHandle<K> {
  const ref = useRef<State<K> | null>(null);
  const handleRef = useRef<SpringsHandle<K> | null>(null);
  const keys = Object.keys(targets) as K[];

  if (!ref.current) {
    const cfg0 = typeof config === "function" ? undefined : config;
    const springs = {} as { [P in K]: Spring };
    for (const k of keys) {
      const start = options.from?.[k] ?? targets[k];
      springs[k] = new Spring(start, cfg0 ?? { response: 0.42, damping: 0.86 });
    }
    ref.current = { springs, raf: 0, onFrame, mounted: false };
  }
  const st = ref.current;
  st.onFrame = onFrame;

  if (!handleRef.current) {
    const read = () => {
      const t = now();
      const out = {} as SpringValues<K>;
      for (const k of Object.keys(st.springs) as K[]) out[k] = st.springs[k].value(t);
      return out;
    };
    const tick = () => {
      const t = now();
      const out = {} as SpringValues<K>;
      let settled = true;
      for (const k of Object.keys(st.springs) as K[]) {
        const sp = st.springs[k];
        if (sp.isSettled(t)) out[k] = sp.target;
        else {
          out[k] = sp.value(t);
          settled = false;
        }
      }
      st.onFrame(out);
      st.raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (typeof window === "undefined") return;
      if (!st.raf) st.raf = requestAnimationFrame(tick);
    };
    handleRef.current = { springs: st.springs, kick, read };
  }
  const handle = handleRef.current;

  useIsoLayoutEffect(() => {
    const t = now();
    const reduce = options.immediate || prefersReducedMotion();
    let changed = !st.mounted;
    for (const k of keys) {
      const sp = st.springs[k];
      const to = targets[k];
      if (sp.target === to && st.mounted) continue;
      changed = true;
      if (reduce) {
        sp.jump(to, t);
        continue;
      }
      const from = sp.value(t);
      const plan = typeof config === "function" ? config(k, from, to) : config;
      const p: SpringPlan = "config" in plan ? plan : { config: plan };
      if (from === to && sp.isSettled(t)) sp.jump(to, t);
      else sp.set(to, t, p.config, p.delay ?? 0);
    }
    st.mounted = true;
    if (changed) {
      // primer fotograma ya, antes de pintar; el resto en el bucle
      st.onFrame(handle.read());
      handle.kick();
    }
  });

  useIsoLayoutEffect(() => {
    // al (re)montar sigue animando lo que quedara a medias (StrictMode desmonta y monta en desarrollo)
    handle.kick();
    return () => {
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = 0;
    };
  }, []);

  return handle;
}
