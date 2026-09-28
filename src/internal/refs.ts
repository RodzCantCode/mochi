import { version, type Ref, type RefCallback } from "react";

const RETURNS_CLEANUP = Number.parseInt(version, 10) >= 19;

/**
 * Une varias refs (de objeto o de función) en una sola. Devuelve la limpieza al estilo de
 * React 19: si una ref de función devuelve su propia limpieza, se llama a esa en vez de
 * pasarle null. React 18 ignora lo devuelto y llama con null, que también se reparte.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return value => {
    const cleanups: Array<() => void> = [];
    for (const r of refs) {
      if (typeof r === "function") {
        const c = (r as (v: T | null) => unknown)(value);
        cleanups.push(typeof c === "function" ? (c as () => void) : () => (r as (v: T | null) => void)(null));
      } else if (r) {
        (r as { current: T | null }).current = value;
        cleanups.push(() => ((r as { current: T | null }).current = null));
      }
    }
    // React 18 no admite limpieza (avisa si la ref devuelve algo): llamará con null al soltarla
    if (!RETURNS_CLEANUP) return;
    return () => {
      for (const c of cleanups) c();
    };
  };
}
