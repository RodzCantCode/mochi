"use client";
// Pestañas con contenido: el SegmentedControl encima y el panel debajo. Al cambiar de pestaña,
// el panel viejo sale hacia un lado y el nuevo entra desde el otro, en el sentido en que se
// mueve el indicador, con desenfoque; la altura se adapta con un muelle.
import { useId, useRef, type ReactNode } from "react";
import { useControllable } from "../internal/useControllable.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";
import { SegmentedControl } from "./SegmentedControl.js";
import { AutoHeight } from "./AutoHeight.js";
import { Swap } from "./Swap.js";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md";
  /** Las pestañas ocupan todo el ancho. */
  fullWidth?: boolean;
  /** Nombre accesible de la lista de pestañas. */
  "aria-label"?: string;
  className?: string;
  panelClassName?: string;
}

const SLIDE = 16; // px que se desplaza el panel al cambiar

export function Tabs({ items, value, defaultValue, onValueChange, size = "md", fullWidth, "aria-label": ariaLabel, className, panelClassName }: TabsProps) {
  const [current, setCurrent] = useControllable(value, defaultValue ?? items[0]?.value ?? "", onValueChange);
  const baseId = useId();
  // ids por posición: un valor con espacios partiría aria-labelledby en dos
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = (i: number) => `${baseId}-panel-${i}`;
  const index = Math.max(0, items.findIndex(t => t.value === current));
  const item = items[index];

  // el sentido del cambio: hacia la derecha, el nuevo entra por la derecha (se compara con lo
  // último pintado, no con el render anterior: en desarrollo React renderiza dos veces)
  const painted = useRef({ index, dir: 1 });
  const dir = index === painted.current.index ? painted.current.dir : Math.sign(index - painted.current.index) || 1;
  useIsoLayoutEffect(() => {
    painted.current = { index, dir };
  });

  return (
    <div className={cx("mochi-tabs", className)} data-full={fullWidth || undefined}>
      <div className="mochi-tabs__list">
        <SegmentedControl
          aria-label={ariaLabel}
          size={size}
          value={item?.value ?? ""}
          onValueChange={setCurrent}
          options={items.map((t, i) => ({ value: t.value, label: t.label, disabled: t.disabled, id: tabId(i), controls: panelId(i) }))}
        />
      </div>
      <AutoHeight className="mochi-tabs__panels">
        <Swap id={item?.value ?? ""} align="start" slide={dir * SLIDE} enterScale={1} blur={8}>
          {item ? (
            <div role="tabpanel" id={panelId(index)} aria-labelledby={tabId(index)} tabIndex={0} className={cx("mochi-tabs__panel", panelClassName)}>
              {item.content}
            </div>
          ) : null}
        </Swap>
      </AutoHeight>
    </div>
  );
}
