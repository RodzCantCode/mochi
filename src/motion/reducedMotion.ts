// Preferencia del sistema «reducir movimiento»: con ella activa los muelles saltan al destino.
let mql: MediaQueryList | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  mql ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return mql.matches;
}
