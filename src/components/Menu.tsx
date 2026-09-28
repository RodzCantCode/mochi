"use client";
// Menú de acciones. El botón que lo abre (p. ej. «…») se transforma en el menú: su forma crece
// hasta la lista y al cerrar vuelve a ser el botón. Con ContextMenu se abre con clic derecho o
// pulsación larga, creciendo desde el punto pulsado. Se coloca solo para no salirse de la
// ventana (se da la vuelta arriba o a la izquierda). Flechas, Inicio/Fin, letras para saltar,
// Enter para elegir y Esc para cerrar.
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  version,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { useControllable } from "../internal/useControllable.js";
import { mergeRefs } from "../internal/refs.js";
import { ListPopup, enabledOf, useListKeys, type PopupEntry } from "../internal/listPopup.js";
import type { MenuPlacement } from "../internal/placement.js";
import { Kbd } from "./CommandPalette.js";

export { placeMenu, type MenuPlacement, type Placed } from "../internal/placement.js";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Atajo que se muestra, p. ej. ["mod", "D"]. */
  shortcut?: string[];
  onSelect: () => void;
  /** Acción destructiva (borrar): texto en rojo y resaltado rojo. */
  destructive?: boolean;
  disabled?: boolean;
}
export interface MenuSeparator {
  type: "separator";
  id?: string;
}
export type MenuEntry = MenuItem | MenuSeparator;

const isSeparator = (e: MenuEntry): e is MenuSeparator => (e as MenuSeparator).type === "separator";

// las entradas del menú en la forma de la lista común (el hueco del icono se reserva siempre)
const toEntries = (items: MenuEntry[]): PopupEntry[] =>
  items.map((e, i) =>
    isSeparator(e)
      ? { separator: true, id: e.id ?? `sep-${i}` }
      : { id: e.id, label: e.label, icon: e.icon ?? null, trailing: e.shortcut ? <Kbd keys={e.shortcut} /> : undefined, destructive: e.destructive, disabled: e.disabled },
  );

/** Estado común de Menu y ContextMenu: la opción activa y las teclas con el menú enfocado. */
function useMenuList(items: MenuEntry[], close: () => void) {
  const entries = toEntries(items);
  const [active, setActive] = useState(-1);
  const keys = useListKeys(entries);
  const choose = (i: number) => {
    const it = items[i];
    if (!it || isSeparator(it) || it.disabled) return;
    close();
    it.onSelect();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = keys(e, active);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
  };
  const start = (how: "first" | "last" | null) => {
    const enabled = enabledOf(entries);
    setActive(how === "first" ? enabled[0] ?? -1 : how === "last" ? enabled[enabled.length - 1] ?? -1 : -1);
  };
  return { entries, active, setActive, choose, onKeyDown, start };
}

// ---------------------------------------------------------------------------------------
// Menú con botón

export interface MenuProps {
  items: MenuEntry[];
  /** El botón que lo abre. Recibe ref, onClick, onKeyDown y los atributos ARIA. */
  children: ReactElement;
  placement?: MenuPlacement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Nombre accesible del menú; si no, el del botón. */
  label?: string;
  minWidth?: number;
}

const childRef = (el: ReactElement): Ref<unknown> | undefined =>
  Number.parseInt(version, 10) >= 19 ? (el.props as { ref?: Ref<unknown> }).ref : (el as unknown as { ref?: Ref<unknown> }).ref;

export function Menu({ items, children, placement = "bottom-start", open: openProp, onOpenChange, label, minWidth = 200 }: MenuProps) {
  const [open, setOpen] = useControllable(openProp, false, onOpenChange);
  const trigger = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const autoTriggerId = useId();
  const list = useMenuList(items, () => setOpen(false));
  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const props = child.props as Record<string, unknown> & {
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  };
  const triggerId = (props.id as string | undefined) ?? autoTriggerId;
  const openWith = (how: "first" | "last" | null) => {
    list.start(how);
    setOpen(true);
  };
  const triggerEl = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ref: mergeRefs(childRef(child), (el: unknown) => {
      trigger.current = el as HTMLElement | null;
    }),
    id: triggerId,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      props.onClick?.(e);
      if (e.defaultPrevented) return;
      // con teclado (Enter o espacio) el clic llega con detail 0: se resalta la primera opción
      if (open) setOpen(false);
      else openWith(e.detail === 0 ? "first" : null);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openWith(e.key === "ArrowDown" ? "first" : "last");
      }
    },
  });
  return (
    <>
      {triggerEl}
      <ListPopup
        id={menuId}
        open={open}
        entries={list.entries}
        active={list.active}
        onActiveChange={list.setActive}
        onChoose={list.choose}
        onClose={() => setOpen(false)}
        anchor={() => trigger.current}
        point={null}
        placement={placement}
        minWidth={minWidth}
        role="menu"
        label={label}
        labelledBy={label ? undefined : triggerId}
        takeFocus
        onKeyDown={list.onKeyDown}
      />
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Menú contextual

export interface ContextMenuProps {
  items: MenuEntry[];
  /** La zona donde se abre con clic derecho o pulsación larga. */
  children: ReactElement;
  label?: string;
  disabled?: boolean;
  minWidth?: number;
}

const LONG_PRESS = 480; // ms
const SLOP = 8; // px que se puede mover el dedo antes de cancelar

export function ContextMenu({ items, children, label = "Actions", disabled, minWidth = 200 }: ContextMenuProps) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const menuId = useId();
  const list = useMenuList(items, () => setPoint(null));
  const press = useRef<{ id: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const openedAt = useRef(0);
  const swallowClick = useRef(false);
  const child = Children.only(children);
  useEffect(() => () => clearTimeout(press.current?.timer), []);
  if (!isValidElement(child)) return null;
  const props = child.props as Record<string, ((e: never) => void) | undefined>;
  const call = (name: string, e: unknown) => (props[name] as ((e: unknown) => void) | undefined)?.(e);

  const openAt = (x: number, y: number, byKeyboard: boolean) => {
    openedAt.current = Date.now();
    list.start(byKeyboard ? "first" : null);
    setPoint({ x, y });
  };
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const area = cloneElement(child as ReactElement<Record<string, unknown>>, {
    "data-mochi-context": "",
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      call("onContextMenu", e);
      if (disabled || e.defaultPrevented) return;
      e.preventDefault();
      cancelPress();
      if (Date.now() - openedAt.current < 700) return; // ya lo abrió la pulsación larga
      // desde el teclado (Mayús+F10, tecla de menú) no hay posición: debajo del elemento enfocado
      if (e.clientX === 0 && e.clientY === 0) {
        const r = (document.activeElement ?? e.currentTarget).getBoundingClientRect();
        openAt(r.left + 12, r.top + Math.min(r.height, 32), true);
      } else openAt(e.clientX, e.clientY, false);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      call("onPointerDown", e);
      swallowClick.current = false;
      if (disabled || e.pointerType !== "touch") return;
      cancelPress();
      const { pointerId: id, clientX: x, clientY: y } = e;
      press.current = {
        id,
        x,
        y,
        timer: setTimeout(() => {
          press.current = null;
          swallowClick.current = true;
          navigator.vibrate?.(8);
          openAt(x, y, false);
        }, LONG_PRESS),
      };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      call("onPointerMove", e);
      const p = press.current;
      if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) cancelPress();
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      call("onPointerUp", e);
      cancelPress();
    },
    onPointerCancel: (e: PointerEvent<HTMLElement>) => {
      call("onPointerCancel", e);
      cancelPress();
    },
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      call("onClickCapture", e);
      // el clic que llega al levantar el dedo tras la pulsación larga no cuenta
      if (swallowClick.current) {
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });
  return (
    <>
      {area}
      <ListPopup
        id={menuId}
        open={point !== null}
        entries={list.entries}
        active={list.active}
        onActiveChange={list.setActive}
        onChoose={list.choose}
        onClose={() => setPoint(null)}
        anchor={null}
        point={point}
        placement="bottom-start"
        minWidth={minWidth}
        role="menu"
        label={label}
        takeFocus
        onKeyDown={list.onKeyDown}
      />
    </>
  );
}
