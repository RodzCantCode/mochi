"use client";
// Panel flotante: un panel pequeño con contenido libre (filtros, una ficha, un selector) que sale
// de su botón sin tapar la página. El botón se transforma en el panel, como el del menú: su forma
// crece hasta él, su tono cambia sin pasar por gris y el contenido entra con desenfoque; al cerrar
// vuelve a ser el botón. Se coloca solo para no salirse de la ventana. No es modal: Tab puede
// salir de él (y entonces se cierra); Esc y el toque fuera también lo cierran. En pantallas
// estrechas es una hoja que sube desde abajo, la del diálogo.
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { mergeProps, refOf } from "../internal/slot.js";
import { mergeRefs } from "../internal/refs.js";
import { useControllable } from "../internal/useControllable.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { useElementSize } from "../internal/useElementSize.js";
import {
  classBackground,
  clamp01,
  focusables,
  ghostOf,
  hideOrigin,
  nearRect,
  paintGrow,
  readOrigin,
  showOrigin,
  useEscapeLayer,
  useScrollLock,
  useViewport,
  type Origin,
  type Rect,
} from "../internal/overlay.js";
import { MARGIN, placeMenu, type MenuPlacement } from "../internal/placement.js";
import { Dialog } from "./Dialog.js";

export interface PopoverProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "content" | "title"> {
  /** El botón que lo abre. Recibe ref, onClick y los atributos ARIA. */
  children: ReactElement;
  /** Lo de dentro. Como función, recibe `close` (p. ej. para un botón «Apply»). */
  content: ReactNode | ((api: { close: () => void }) => ReactNode);
  /** Nombre accesible del panel; en móvil, título de la hoja si no hay `title`. */
  label: string;
  /** Título visible arriba del panel. */
  title?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Lado preferido; si no cabe, se da la vuelta. */
  placement?: MenuPlacement;
  /** Ancho del panel en px; si no, el de su contenido (entre 240 y 360 px). */
  width?: number;
}

const SHEET_BREAKPOINT = 640; // el mismo que el diálogo
const RADIUS = 22; // radius-lg

/** Los atributos que recibe (p. ej. de un Tooltip que lo envuelve) pasan a su botón. */
export const Popover = forwardRef<HTMLElement, PopoverProps>(function Popover(
  { children, content, label, title, open: openProp, onOpenChange, placement = "bottom-start", width, ...outer },
  ref,
) {
  const [open, setOpen] = useControllable(openProp, false, onOpenChange);
  const trigger = useRef<HTMLElement | null>(null);
  const panelId = useId();
  const autoTriggerId = useId();
  const vp = useViewport();
  const sheet = vp.w < SHEET_BREAKPOINT;
  const focusTrigger = () => trigger.current?.focus({ preventScroll: true });
  const close = () => {
    focusTrigger();
    setOpen(false);
  };
  const body = typeof content === "function" ? content({ close }) : content;

  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const props = mergeProps(child.props as Record<string, unknown>, outer as Record<string, unknown>) as Record<string, unknown> & {
    onClick?: (e: MouseEvent<HTMLElement>) => void;
  };
  const triggerId = (props.id as string | undefined) ?? autoTriggerId;
  const triggerEl = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ...props,
    ref: mergeRefs(refOf(child), ref, (el: unknown) => {
      trigger.current = el as HTMLElement | null;
    }),
    id: triggerId,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open && !sheet ? panelId : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      props.onClick?.(e);
      if (e.defaultPrevented) return;
      setOpen(!open);
    },
  });

  return (
    <>
      {triggerEl}
      {sheet ? (
        <Dialog open={open} onOpenChange={setOpen} presentation="sheet" title={title ?? label} origin={trigger}>
          {body}
        </Dialog>
      ) : (
        <PopoverPanel id={panelId} open={open} label={label} title={title} width={width} placement={placement} trigger={trigger} onClose={close} onDismiss={() => setOpen(false)}>
          {body}
        </PopoverPanel>
      )}
    </>
  );
});

interface PanelProps {
  id: string;
  open: boolean;
  label: string;
  title?: ReactNode;
  width?: number;
  placement: MenuPlacement;
  trigger: { current: HTMLElement | null };
  /** Cerrar devolviendo el foco al botón. */
  onClose: () => void;
  /** Cerrar sin tocar el foco (ya se movió a otro sitio). */
  onDismiss: () => void;
  children: ReactNode;
}

/** El panel, montado solo mientras está abierto o cerrándose. */
function PopoverPanel(props: PanelProps) {
  const [mounted, setMounted] = useState(props.open);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (props.open && !mounted) setMounted(true);
  if (!mounted || !client) return null;
  return createPortal(<Panel {...props} onGone={() => setMounted(false)} />, document.body);
}

type Values = { x: number; y: number; w: number; h: number; r: number; p: number; o: number; g: number };

function Panel({ id, open, label, title, width, placement, trigger, onClose, onDismiss, children, onGone }: PanelProps & { onGone: () => void }) {
  const vp = useViewport();
  const titleId = useId();
  // el botón del que sale, leído al abrir y de nuevo al cerrar (por si se movió)
  const [origin] = useState<Origin | null>(() => readOrigin(trigger.current));
  const originNow = !open && origin ? readOrigin(origin.el) ?? origin : origin;
  const anchorRect = originNow ? originNow.rect : { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0, r: 0 };

  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(contentEl);
  const measured = size !== null;
  const placed = placeMenu(anchorRect, size ? { w: size.width, h: size.height } : { w: width ?? 240, h: 120 }, vp, placement);
  const W = Math.min(size?.width ?? width ?? 240, vp.w - MARGIN * 2);
  const H = Math.min(size?.height ?? 120, placed.maxH);
  const to: Rect = { x: placed.x, y: placed.y, w: W, h: H, r: RADIUS };
  // sin botón (p. ej. se desmontó), crece desde un punto en el centro de donde irá
  const from: Rect = originNow ? originNow.rect : { x: to.x + to.w / 2 - 6, y: to.y + to.h / 2 - 6, w: 12, h: 12, r: 6 };

  const [armed, setArmed] = useState(false);
  useIsoLayoutEffect(() => {
    if (measured && !armed) setArmed(true);
  }, [measured, armed]);
  const shown = open && armed;
  const at = shown ? to : from;

  const shape = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLSpanElement>(null);
  const ghostBox = useRef<HTMLDivElement>(null);
  const surfaceColor = useRef<string | null>(null);
  const toRef = useRef(to);
  toRef.current = to;

  useSprings<keyof Values>(
    { x: at.x, y: at.y, w: at.w, h: at.h, r: at.r, p: shown ? 1.06 : 0, o: shown ? 1 : 0, g: shown ? 0 : 1 },
    (key, f, t) => {
      const opening = t > f;
      if (key === "o") return opening ? { config: springs.fadeIn, delay: origin ? 0.08 : 0.02 } : springs.fadeOut;
      if (key === "g") return opening ? { config: springs.fadeIn, delay: 0.12 } : springs.fadeOut;
      return springs.morph;
    },
    v => {
      const el = shape.current;
      if (!el || !measured) return;
      const T = toRef.current;
      const q = origin ? clamp01((v.w - from.w) / Math.max(1, T.w - from.w)) : clamp01(v.o);
      const tint = origin?.background && origin.background !== surfaceColor.current ? origin.background : null;
      paintGrow({ shape: el, shadow: shadow.current, reveal: reveal.current, ghost: ghostBox.current, content: contentEl }, v, {
        to: T,
        tint,
        shadow: q,
        fadeContent: true,
        ghost: origin ? origin.rect : null,
        blur: SWAP.blur,
      });
      if (!open && nearRect(v, from) && v.o < 0.002) onGone();
    },
    { immediate: measured && !armed },
  );

  useIsoLayoutEffect(() => {
    if (shape.current && surfaceColor.current === null) surfaceColor.current = classBackground(shape.current);
  }, []);
  // el botón desaparece mientras el panel es él
  useIsoLayoutEffect(() => {
    if (!origin) return;
    hideOrigin(origin.el);
    return () => showOrigin(origin.el);
  }, []);
  useIsoLayoutEffect(() => {
    const gb = ghostBox.current;
    if (!gb || !origin) return;
    gb.replaceChildren(ghostOf(origin.el));
    return () => gb.replaceChildren();
  }, []);

  // foco: al abrir, al primer control de dentro (o al panel); si se cierra desde fuera con el
  // foco dentro, vuelve al botón
  useIsoLayoutEffect(() => {
    if (!armed) return;
    const s = shape.current;
    if (open) {
      const c = contentEl;
      const active = document.activeElement;
      const already = c && active instanceof HTMLElement && c.contains(active) ? active : null;
      (already ?? c?.querySelector<HTMLElement>("[data-autofocus]") ?? (c ? focusables(c)[0] : undefined) ?? s)?.focus({ preventScroll: true });
    } else if (s?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
  }, [open, armed]);

  useScrollLock(open);
  useEscapeLayer(open, onClose);

  // Tab puede salir: hacia delante, al siguiente control de la página tras el botón; hacia atrás,
  // al botón. En los dos casos el panel se cierra
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = shape.current;
    if (!open || e.key !== "Tab" || e.defaultPrevented || !s) return;
    const list = focusables(s);
    const active = document.activeElement;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (!first || active === first || active === s)) {
      e.preventDefault();
      onClose();
    } else if (!e.shiftKey && (!last || active === last)) {
      e.preventDefault();
      const page = focusables(document.body).filter(el => !s.contains(el) && !el.closest(".mochi-popover-root"));
      const at = trigger.current ? page.indexOf(trigger.current) : -1;
      const next = at >= 0 ? page[at + 1] : undefined;
      if (next) {
        next.focus();
        onDismiss();
      } else onClose();
    }
  };

  const downOutside = useRef(false);
  return (
    <div className="mochi-popover-root" data-state={open ? "open" : "closed"}>
      <div
        className="mochi-popover-catcher"
        // cierra con el clic de un toque que empezó fuera con el panel ya abierto: el toque no
        // atraviesa a lo de debajo
        onPointerDown={() => (downOutside.current = true)}
        onClick={() => {
          if (open && downOutside.current) onClose();
          downOutside.current = false;
        }}
        onContextMenu={e => {
          e.preventDefault();
          if (open) onClose();
        }}
      />
      <div ref={shadow} className="mochi-popover__shadow" aria-hidden="true" style={{ opacity: 0 }} />
      <div
        ref={shape}
        id={id}
        role="dialog"
        tabIndex={-1}
        aria-label={title ? undefined : label}
        aria-labelledby={title ? titleId : undefined}
        className="mochi-popover"
        style={{ opacity: 0 }}
        onKeyDown={onKeyDown}
      >
        <span ref={reveal} className="mochi-popover__reveal" aria-hidden="true" />
        <div ref={ghostBox} className="mochi-popover__ghost" aria-hidden="true" />
        <div ref={setContentEl} className="mochi-popover__content" style={{ width, maxWidth: vp.w - MARGIN * 2, maxHeight: placed.maxH }}>
          {title ? (
            <h2 id={titleId} className="mochi-popover__title">
              {title}
            </h2>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
