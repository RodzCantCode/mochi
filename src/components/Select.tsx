"use client";
// Selector de opciones. En escritorio, el campo se transforma en la lista (como el menú desde
// su botón): la opción elegida lleva un check, el resaltado se desliza y el valor nuevo entra
// con desenfoque. El foco se queda en el campo y el teclado funciona como en un <select>. En
// pantallas táctiles se abre el selector nativo del sistema, que es mejor que cualquier
// imitación; el <select> nativo también es el que viaja en los formularios (`name`).
import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";
import { useControllable } from "../internal/useControllable.js";
import { cx } from "../internal/cx.js";
import { ListPopup, enabledOf, useListKeys, type PopupEntry } from "../internal/listPopup.js";
import { useMediaQuery } from "../internal/overlay.js";
import type { MenuPlacement } from "../internal/placement.js";
import { CheckIcon, ChevronDownIcon } from "../icons/index.js";
import { MorphBox } from "./MorphBox.js";
import { Swap } from "./Swap.js";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Etiqueta: visible dentro del campo (`md`) o solo para lectores de pantalla (`sm`). */
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Texto mientras no hay nada elegido. */
  placeholder?: string;
  /** `md`: campo de 56 px como TextField. `sm`: píldora compacta para barras de herramientas. */
  size?: "md" | "sm";
  /** Nombre en un formulario. */
  name?: string;
  disabled?: boolean;
  placement?: MenuPlacement;
  id?: string;
  className?: string;
}

export function Select({
  label,
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
  size = "md",
  name,
  disabled,
  placement = "bottom-start",
  id: idProp,
  className,
}: SelectProps) {
  const [current, setCurrent] = useControllable(value, defaultValue, onValueChange);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [minWidth, setMinWidth] = useState(200);
  const autoId = useId();
  const id = idProp ?? `${autoId}-select`;
  const labelId = `${autoId}-label`;
  const listId = `${autoId}-list`;
  const trigger = useRef<HTMLElement | null>(null);
  // en táctil manda el selector nativo, que va encima del campo
  const native = useMediaQuery("(pointer: coarse)");

  const selectedIndex = options.findIndex(o => o.value === current);
  const selected = options[selectedIndex];
  const text = selected?.label ?? placeholder ?? "";
  const entries: PopupEntry[] = options.map((o, i) => ({
    id: String(i),
    label: o.label,
    disabled: o.disabled,
    selected: i === selectedIndex,
    trailing: i === selectedIndex ? <CheckIcon size={16} strokeWidth={1.9} /> : undefined,
  }));
  const keys = useListKeys(entries);
  const enabled = enabledOf(entries);

  const openList = (at?: number) => {
    if (disabled) return;
    if (trigger.current) setMinWidth(trigger.current.offsetWidth);
    setActive(at ?? (selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : enabled[0] ?? -1));
    setOpen(true);
  };
  const commit = (i: number) => {
    const o = options[i];
    if (o && !o.disabled && o.value !== current) setCurrent(o.value);
    setOpen(false);
  };

  // con teclado, el espacio que eligió la opción suelta después un clic: no debe volver a abrir
  const skipClick = useRef(false);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openList();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        openList(e.key === "Home" ? enabled[0] : enabled[enabled.length - 1]);
      } else if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const hit = keys(e, selectedIndex);
        if (hit !== null) openList(hit);
      }
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.key === " ") skipClick.current = true;
      if (active >= 0) commit(active);
      else setOpen(false);
    } else if (e.key === "Tab") {
      if (active >= 0) commit(active);
      else setOpen(false);
    } else if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault();
      if (active >= 0) commit(active);
    } else {
      const next = keys(e, active);
      if (next !== null) {
        e.preventDefault();
        setActive(next);
      }
    }
  };
  const onClick = (e: MouseEvent<HTMLElement>) => {
    if (skipClick.current && e.detail === 0) {
      skipClick.current = false;
      return;
    }
    if (open) setOpen(false);
    else openList();
  };

  const triggerProps = {
    ref: (el: HTMLElement | null) => {
      trigger.current = el;
    },
    type: "button",
    id,
    role: "combobox",
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": open && active >= 0 ? `${listId}-${active}` : undefined,
    "aria-labelledby": labelId,
    "aria-disabled": disabled || undefined,
    // con el nativo encima, este es solo el dibujo
    "aria-hidden": native || undefined,
    tabIndex: native ? -1 : 0,
    disabled,
    onKeyDown,
    onClick,
  };

  return (
    <span className={cx("mochi-select", className)} data-size={size} data-native={native || undefined} data-disabled={disabled || undefined}>
      {size === "md" ? (
        <button {...triggerProps} type="button" className="mochi-field__box mochi-select__trigger" data-empty={!selected || undefined}>
          <span id={labelId} className="mochi-field__label mochi-select__label" data-floated={text !== "" || undefined}>
            {label}
          </span>
          <span className="mochi-select__value">
            <Swap id={selected?.value ?? "\u0000placeholder"}>{text}</Swap>
          </span>
          <ChevronDownIcon className="mochi-select__chevron" size={18} />
          <span className="mochi-field__ring" aria-hidden="true" />
        </button>
      ) : (
        <>
          <span id={labelId} className="mochi-sr">
            {label}
          </span>
          <MorphBox
            {...triggerProps}
            as="button"
            tone="surface"
            contentKey={selected?.value ?? "\u0000placeholder"}
            height={40}
            padding="0 14px 0 18px"
            pressScale={0.965}
            className="mochi-select__pill"
          >
            <span className="mochi-select__pilltext">
              {text}
              <ChevronDownIcon size={16} />
            </span>
          </MorphBox>
        </>
      )}
      <select
        className="mochi-select__native"
        name={name}
        value={current}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-hidden={!native || undefined}
        tabIndex={native ? 0 : -1}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setCurrent(e.target.value)}
      >
        {!selected ? (
          <option value={current} disabled>
            {placeholder ?? ""}
          </option>
        ) : null}
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ListPopup
        id={listId}
        open={open}
        entries={entries}
        active={active}
        onActiveChange={i => i >= 0 && setActive(i)}
        onChoose={commit}
        onClose={() => setOpen(false)}
        anchor={() => trigger.current}
        point={null}
        placement={placement}
        minWidth={minWidth}
        role="listbox"
        labelledBy={labelId}
        takeFocus={false}
      />
    </span>
  );
}
