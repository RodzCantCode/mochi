// Muelles en forma cerrada: la posición en cualquier instante sale de una fórmula,
// sin integrar paso a paso. Así un movimiento se puede interrumpir y redirigir
// conservando exactamente la posición y la velocidad que llevaba.

export interface SpringConfig {
  /** Periodo natural en segundos: cuánto tarda en ir y volver si no hubiera amortiguación. */
  response: number;
  /** Amortiguación: 1 = sin rebote; desde 0.84 el rebote no llega al 1 %. */
  damping: number;
}

interface Solved {
  w0: number;
  z: number;
  wd: number;
}
const cache = new WeakMap<SpringConfig, Solved>();
function solve(s: SpringConfig): Solved {
  let r = cache.get(s);
  if (!r) {
    const w0 = (2 * Math.PI) / s.response;
    const z = Math.min(1, s.damping);
    r = { w0, z, wd: w0 * Math.sqrt(Math.max(1e-9, 1 - z * z)) };
    cache.set(s, r);
  }
  return r;
}

/** Respuesta a un escalón de 0 a 1 a los `t` segundos (0 antes de empezar). */
export function stepResponse(t: number, s: SpringConfig): number {
  if (t <= 0) return 0;
  return 1 + freeResponse(t, -1, 0, s).x;
}

/**
 * Movimiento libre hacia el reposo (0) desde un desplazamiento `x0` y una velocidad `v0`.
 * Devuelve el desplazamiento y la velocidad a los `t` segundos.
 */
export function freeResponse(t: number, x0: number, v0: number, s: SpringConfig): { x: number; v: number } {
  if (t <= 0) return { x: x0, v: v0 };
  const { w0, z, wd } = solve(s);
  if (z >= 1) {
    const e = Math.exp(-w0 * t);
    const b = v0 + w0 * x0;
    return { x: e * (x0 + b * t), v: e * (v0 - w0 * b * t) };
  }
  const a = z * w0;
  const e = Math.exp(-a * t);
  const c = Math.cos(wd * t);
  const sn = Math.sin(wd * t);
  const B = (v0 + a * x0) / wd;
  return {
    x: e * (x0 * c + B * sn),
    v: e * (-a * (x0 * c + B * sn) + (-x0 * wd * sn + B * wd * c)),
  };
}

/** Un valor animado con muelle que se puede redirigir en cualquier momento sin saltos. */
export class Spring {
  private to: number;
  private t0 = 0;
  private x0 = 0; // desplazamiento respecto al destino al empezar el tramo
  private v0 = 0;
  private cfg: SpringConfig;

  constructor(value: number, config: SpringConfig) {
    this.to = value;
    this.cfg = config;
  }

  get target(): number {
    return this.to;
  }

  value(now: number): number {
    return this.to + freeResponse(now - this.t0, this.x0, this.v0, this.cfg).x;
  }

  velocity(now: number): number {
    return freeResponse(now - this.t0, this.x0, this.v0, this.cfg).v;
  }

  /** Nuevo destino. Parte de la posición y la velocidad actuales. `delay` retrasa el arranque. */
  set(target: number, now: number, config?: SpringConfig, delay = 0): void {
    const x = this.value(now);
    const v = this.velocity(now);
    if (config) this.cfg = config;
    this.to = target;
    // con retraso: se queda quieto donde está hasta que arranca
    this.t0 = now + delay;
    this.x0 = x - target;
    this.v0 = delay > 0 ? 0 : v;
  }

  /** Coloca el valor al instante (sin animar) y en reposo. */
  jump(value: number, now: number): void {
    this.setState(value, 0, now);
  }

  /**
   * Coloca el valor al instante con una velocidad, p. ej. al soltar un arrastre. El siguiente
   * set() parte de ahí con esa velocidad; si nadie lo redirige, se asienta alrededor de `value`.
   */
  setState(value: number, velocity: number, now: number): void {
    this.to = value;
    this.t0 = now;
    this.x0 = 0;
    this.v0 = velocity;
  }

  isSettled(now: number, eps = 1e-3): boolean {
    if (now < this.t0) return false;
    const { x, v } = freeResponse(now - this.t0, this.x0, this.v0, this.cfg);
    return Math.abs(x) < eps && Math.abs(v) < eps * 10;
  }
}

/**
 * Estirón elástico al pasarse de un límite: crece cada vez menos y nunca supera `dimension`.
 * `overshoot` es cuánto se ha pasado el dedo o el cursor (con signo).
 */
export function rubberBand(overshoot: number, dimension: number, coefficient = 0.55): number {
  const d = Math.abs(overshoot);
  const r = (1 - 1 / ((d * coefficient) / dimension + 1)) * dimension;
  return Math.sign(overshoot) * r;
}
