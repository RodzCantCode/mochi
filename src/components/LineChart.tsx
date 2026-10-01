"use client";
// Gráfica de línea sobre fondo sólido: la línea se dibuja al aparecer (y al cambiar los datos),
// el punto final aparece al terminar y un tooltip sigue al puntero o a las flechas del teclado.
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useSprings, now } from "../motion/useSprings.js";
import { prefersReducedMotion } from "../motion/reducedMotion.js";
import { springs } from "../tokens.js";
import { useElementSize } from "../internal/useElementSize.js";
import { cx } from "../internal/cx.js";
import { Swap } from "./Swap.js";

export interface ChartPoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  data: ChartPoint[];
  /** Alto total en px, etiquetas del eje incluidas. */
  height?: number;
  formatValue?: (value: number) => string;
  /** Cuántas etiquetas del eje horizontal mostrar (repartidas). */
  xTicks?: number;
  className?: string;
  /** Resumen para lectores de pantalla (p. ej. "Revenue in March"). */
  "aria-label"?: string;
}

const PAD = { top: 10, right: 6, bottom: 24, left: 0 };

function pathFor(pts: Array<[number, number]>): string {
  if (!pts.length) return "";
  let d = `M${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0]!.toFixed(2)} ${c1[1]!.toFixed(2)} ${c2[0]!.toFixed(2)} ${c2[1]!.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Índice del punto más cercano a una x (0–1 sobre el ancho). */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));
}

export function LineChart({ data, height = 150, formatValue = v => String(v), xTicks = 5, className, "aria-label": label = "Line chart" }: LineChartProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(root);
  const W = size?.width ?? 0;
  const H = height;
  const plotW = Math.max(1, W - PAD.left - PAD.right);
  const plotH = H - PAD.top - PAD.bottom;
  const tableId = useId();

  const { lo, hi } = useMemo(() => {
    const vs = data.map(d => d.value);
    const mn = Math.min(...vs), mx = Math.max(...vs);
    const pad = (mx - mn || Math.abs(mx) || 1) * 0.12;
    return { lo: mn - pad, hi: mx + pad };
  }, [data]);
  const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
  const pts = useMemo(() => data.map((d, i) => [x(i), y(d.value)] as [number, number]), [data, W, lo, hi]);
  const d = useMemo(() => pathFor(pts), [pts]);

  const [active, setActive] = useState<number | null>(null);
  const line = useRef<SVGPathElement>(null);
  const endDot = useRef<SVGCircleElement>(null);
  const guide = useRef<SVGLineElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const shownOnce = useRef(false);

  const ax = active !== null ? pts[active]?.[0] ?? 0 : pts[pts.length - 1]?.[0] ?? 0;
  const ay = active !== null ? pts[active]?.[1] ?? 0 : pts[pts.length - 1]?.[1] ?? 0;
  const handle = useSprings(
    { p: W ? 1 : 0, tx: ax, ty: ay, o: active !== null ? 1 : 0 },
    key => (key === "p" ? springs.draw : key === "o" ? springs.fadeIn : springs.snappy),
    v => {
      const p = Math.min(1, Math.max(0, v.p));
      if (line.current) line.current.style.strokeDashoffset = `${(1 - p).toFixed(4)}`;
      if (endDot.current) endDot.current.setAttribute("r", (4.5 * Math.min(1, Math.max(0, (p - 0.92) / 0.08))).toFixed(3));
      const o = Math.min(1, Math.max(0, v.o));
      guide.current?.setAttribute("x1", v.tx.toFixed(2));
      guide.current?.setAttribute("x2", v.tx.toFixed(2));
      if (guide.current) guide.current.style.opacity = o.toFixed(3);
      dot.current?.setAttribute("cx", v.tx.toFixed(2));
      dot.current?.setAttribute("cy", v.ty.toFixed(2));
      dot.current?.setAttribute("r", (5.5 * o).toFixed(3));
      const t = tip.current;
      if (t) {
        t.style.opacity = o.toFixed(3);
        t.style.visibility = o < 0.01 ? "hidden" : "visible";
        // no se sale por los lados
        const half = t.offsetWidth / 2;
        const cx = Math.min(W - half, Math.max(half, v.tx));
        t.style.transform = `translate(${(cx - half).toFixed(2)}px, ${(v.ty - 14).toFixed(2)}px) translateY(-100%) scale(${(0.92 + 0.08 * o).toFixed(3)})`;
      }
    },
  );

  // al aparecer por primera vez el tooltip, sin viajar desde otro sitio
  useEffect(() => {
    if (active === null) {
      shownOnce.current = false;
      return;
    }
    if (!shownOnce.current) {
      const t = now();
      handle.springs.tx.jump(ax, t);
      handle.springs.ty.jump(ay, t);
      handle.kick();
      shownOnce.current = true;
    }
  }, [active]);

  // redibuja la línea cuando cambian los datos
  const dataKey = data.map(p => p.value).join(",");
  const firstData = useRef(true);
  useEffect(() => {
    if (firstData.current) {
      firstData.current = false;
      return;
    }
    // con «reducir movimiento» la línea nueva aparece ya dibujada
    if (prefersReducedMotion()) return;
    const t = now();
    handle.springs.p.jump(0, t);
    handle.springs.p.set(1, t);
    handle.kick();
  }, [dataKey]);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    if (!root || !data.length) return;
    const r = root.getBoundingClientRect();
    setActive(nearestIndex((e.clientX - r.left - PAD.left) / plotW, data.length));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = data.length - 1;
    const cur = active ?? last;
    const next = e.key === "ArrowRight" ? Math.min(last, cur + 1) : e.key === "ArrowLeft" ? Math.max(0, cur - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (e.key === "Escape") return setActive(null);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  };

  const ticks = useMemo(() => {
    const n = Math.min(xTicks, data.length);
    if (n <= 1) return data.length ? [0] : [];
    return Array.from({ length: n }, (_, k) => Math.round((k / (n - 1)) * (data.length - 1)));
  }, [data.length, xTicks]);
  const grid = [0, 1, 2, 3].map(k => PAD.top + (k / 3) * plotH);
  const current = active !== null ? data[active] : undefined;

  return (
    <div
      ref={setRoot}
      className={cx("mochi-chart", className)}
      style={{ height: H }}
      tabIndex={0}
      role="group"
      aria-label={label}
      aria-describedby={tableId}
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive(a => a ?? data.length - 1)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
    >
      {W ? (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          {grid.map((gy, k) => (
            <line key={k} className="mochi-chart__grid" x1={0} x2={W} y1={gy} y2={gy} />
          ))}
          <line ref={guide} className="mochi-chart__guide" x1={0} x2={0} y1={PAD.top} y2={PAD.top + plotH} style={{ opacity: 0 }} />
          <path ref={line} className="mochi-chart__line" d={d} pathLength={1} style={{ strokeDasharray: "1 1", strokeDashoffset: 1 }} />
          <circle ref={endDot} className="mochi-chart__end" cx={pts[pts.length - 1]?.[0]} cy={pts[pts.length - 1]?.[1]} r={0} />
          <circle ref={dot} className="mochi-chart__dot" r={0} />
          {ticks.map((i, k) => (
            <text
              key={i}
              className="mochi-chart__tick"
              x={x(i)}
              y={H - 6}
              textAnchor={k === 0 ? "start" : k === ticks.length - 1 ? "end" : "middle"}
            >
              {data[i]?.label}
            </text>
          ))}
        </svg>
      ) : null}
      <div ref={tip} className="mochi-chart__tip" aria-hidden="true" style={{ opacity: 0, visibility: "hidden" }}>
        <Swap id={active ?? -1}>
          <TipBody value={current ? formatValue(current.value) : ""} label={current?.label ?? ""} />
        </Swap>
      </div>
      <span className="mochi-sr" aria-live="polite">
        {current ? `${current.label}: ${formatValue(current.value)}` : ""}
      </span>
      <table id={tableId} className="mochi-sr">
        <tbody>
          {data.map(p => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TipBody({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <span className="mochi-chart__tipbody">
      <b>{value}</b>
      <span>{label}</span>
    </span>
  );
}
