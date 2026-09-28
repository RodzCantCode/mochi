"use client";
// Tarjeta de gráfica: pestañas de rango arriba, la cifra principal (que cuenta hasta su valor),
// la variación y la gráfica. Es el «las pestañas se abren en una gráfica» del sistema.
import { useRef, useState, type ReactNode } from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs } from "../tokens.js";
import { cx } from "../internal/cx.js";
import { LineChart, type ChartPoint } from "./LineChart.js";
import { SegmentedControl, type SegmentedOption } from "./SegmentedControl.js";

export interface ChartCardProps {
  label: ReactNode;
  /** Cifra principal; al cambiar, cuenta desde la anterior. */
  value: number;
  formatValue?: (value: number) => string;
  /** Variación, p. ej. "+12.4%". */
  delta?: ReactNode;
  data: ChartPoint[];
  /** Pestañas de rango (Day / Week / Month…). */
  ranges?: SegmentedOption[];
  range?: string;
  defaultRange?: string;
  onRangeChange?: (range: string) => void;
  /** Resumen de la gráfica para lectores de pantalla. */
  chartLabel?: string;
  className?: string;
}

export function ChartCard({ label, value, formatValue = v => String(Math.round(v)), delta, data, ranges, range, defaultRange, onRangeChange, chartLabel, className }: ChartCardProps) {
  const num = useRef<HTMLSpanElement>(null);
  const [initial] = useState(() => formatValue(0));
  useSprings({ n: value }, springs.draw, ({ n }) => {
    if (num.current) num.current.textContent = formatValue(n);
  }, { from: { n: 0 } });

  return (
    <section className={cx("mochi-card", className)}>
      {ranges?.length ? (
        <SegmentedControl options={ranges} value={range} defaultValue={defaultRange} onValueChange={onRangeChange} aria-label="Range" size="sm" />
      ) : null}
      <div className="mochi-card__head">
        <div className="mochi-card__label">{label}</div>
        {delta ? <div className="mochi-card__delta">{delta}</div> : null}
      </div>
      <div className="mochi-card__value">
        {/* el número animado es decorativo; el valor final se anuncia aparte */}
        <span ref={num} aria-hidden="true">{initial}</span>
        <span className="mochi-sr">{formatValue(value)}</span>
      </div>
      <LineChart data={data} formatValue={formatValue} aria-label={chartLabel ?? (typeof label === "string" ? label : "Chart")} />
    </section>
  );
}
