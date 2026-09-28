"use client";
// Diálogo y hoja. En pantallas anchas es una ventana centrada que crece desde el botón que la
// abre: la forma del botón se estira hasta la ventana, su tono cambia sin pasar por gris y el
// contenido entra con desenfoque; al cerrar vuelve a encogerse en el botón. En pantallas
// estrechas es una hoja que sube desde abajo y se cierra arrastrándola hacia abajo.
// Esc, clic en el fondo y foco retenido dentro; al cerrar, el foco vuelve a donde estaba.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useSprings, now } from "../motion/useSprings.js";
import { rubberBand } from "../motion/spring.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { useElementSize } from "../internal/useElementSize.js";
import { cx } from "../internal/cx.js";
import {
  classBackground,
  clamp01,
  focusables,
  focusedTrigger,
  ghostOf,
  hideOrigin,
  nearRect,
  paintGrow,
  readOrigin,
  showOrigin,
  trapTab,
  useEscapeLayer,
  useScrollLock,
  useViewport,
  useVisualViewport,
  type Origin,
  type Rect,
} from "../internal/overlay.js";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título (también es el nombre accesible). */
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Botones de abajo, p. ej. Cancelar y Confirmar. */
  actions?: ReactNode;
  /** Botón desde el que crece la ventana (y al que vuelve el foco). */
  origin?: RefObject<HTMLElement | null>;
  /** `auto`: hoja en pantallas de menos de 640 px y ventana centrada en el resto. */
  presentation?: "auto" | "center" | "sheet";
  /** Ancho máximo de la ventana centrada, en px. */
  width?: number;
  /** Esc, clic en el fondo y arrastrar la hoja la cierran. */
  dismissible?: boolean;
  role?: "dialog" | "alertdialog";
  /** Qué recibe el foco al abrir; si no, el primer control del contenido. */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}

const SHEET_BREAKPOINT = 640;
const RADIUS = 32; // radius-xl
const EDGE = 8; // margen de la hoja con los bordes

export function Dialog(props: DialogProps) {
  const { open } = props;
  const [mounted, setMounted] = useState(open);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (open && !mounted) setMounted(true);
  if (!mounted || !client) return null;
  return createPortal(<Panel {...props} onGone={() => setMounted(false)} />, document.body);
}

type Values = { x: number; y: number; w: number; h: number; r: number; p: number; o: number; g: number; s: number };

function Panel({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  origin: originRef,
  presentation = "auto",
  width = 440,
  dismissible = true,
  role = "dialog",
  initialFocus,
  className,
  onGone,
}: DialogProps & { onGone: () => void }) {
  const titleId = useId();
  const descId = useId();
  const vp = useViewport();
  const sheet = presentation === "sheet" || (presentation === "auto" && vp.w < SHEET_BREAKPOINT);
  // en vertical manda la parte que se ve: en Safari de iOS el teclado la tapa sin cambiar el alto
  // de la ventana, y la hoja tiene que subir con él
  const visual = useVisualViewport(true);
  const viewTop = visual?.top ?? 0;
  const viewH = visual?.height ?? vp.h;
  const close = () => onOpenChange(false);

  // el botón de origen, leído al abrir (y de nuevo al cerrar, por si se movió)
  const restore = useRef<Element | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(() => {
    restore.current = typeof document !== "undefined" ? document.activeElement : null;
    return readOrigin(originRef?.current ?? focusedTrigger());
  });
  // si se vuelve a abrir mientras se cerraba, quizá desde otro botón
  const wasOpen = useRef(open);
  useIsoLayoutEffect(() => {
    if (open && !wasOpen.current) {
      restore.current = document.activeElement;
      const next = readOrigin(originRef?.current ?? focusedTrigger());
      if (next?.el !== origin?.el) setOrigin(next);
    }
    wasOpen.current = open;
  }, [open]);
  const grows = !sheet && origin !== null;
  const originNow = !open && grows ? readOrigin(origin.el) ?? origin : origin;

  // tamaño final: el contenido medido al ancho definitivo
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const size = useElementSize(contentEl);
  const W = sheet ? vp.w - EDGE * 2 : Math.min(width, vp.w - 32);
  const maxH = sheet ? viewH - 56 : viewH - 48;
  const H = Math.min(size?.height ?? 0, maxH);
  const to: Rect = sheet
    ? { x: EDGE, y: viewTop + viewH - EDGE - H, w: W, h: H, r: RADIUS }
    : { x: Math.round((vp.w - W) / 2), y: viewTop + Math.max(24, Math.round((viewH - H) * 0.44)), w: W, h: H, r: RADIUS };
  const from: Rect = sheet
    ? { ...to, y: viewTop + viewH + EDGE }
    : grows
      ? originNow!.rect
      : { x: to.x + to.w * 0.02, y: to.y + 10, w: to.w * 0.96, h: to.h * 0.96, r: RADIUS };

  // primero se coloca en `from` sin animar y en el mismo fotograma arranca hacia `to`
  const measured = size !== null;
  const [armed, setArmed] = useState(false);
  useIsoLayoutEffect(() => {
    if (measured && !armed) setArmed(true);
  }, [measured, armed]);
  // mientras se arrastra la hoja, su posición la manda el dedo (aunque React vuelva a pintar)
  const dragOff = useRef(0);
  const dragging = useRef(false);
  const at = open && armed ? { ...to, y: to.y + (dragging.current ? dragOff.current : 0) } : from;

  const root = useRef<HTMLDivElement>(null);
  const shape = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLSpanElement>(null);
  const ghostBox = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const surfaceColor = useRef<string | null>(null);
  const toRef = useRef(to);
  toRef.current = to;

  const handle = useSprings<keyof Values>(
    {
      x: at.x,
      y: at.y,
      w: at.w,
      h: at.h,
      r: at.r,
      p: open && armed ? 1.06 : 0,
      o: open && armed ? 1 : 0,
      g: open && armed ? 0 : 1,
      s: open && armed ? 1 : 0,
    },
    (key, f, t) => {
      const opening = t > f;
      if (key === "o") return opening ? { config: springs.fadeIn, delay: grows ? 0.12 : SWAP.enterDelay } : springs.fadeOut;
      if (key === "g") return opening ? { config: springs.fadeIn, delay: 0.16 } : springs.fadeOut;
      if (key === "s") return springs.color;
      return springs.morph;
    },
    v => paint(v),
    { immediate: measured && !armed },
  );

  function paint(v: Values) {
    const el = shape.current;
    if (!el || !measured) return;
    const T = toRef.current;
    // cuánto ha crecido (0 = botón, 1 = ventana): la sombra grande aparece con él
    const q = grows ? clamp01((v.w - from.w) / Math.max(1, T.w - from.w)) : 1;
    const tint = grows && origin?.background && origin.background !== surfaceColor.current ? origin.background : null;
    paintGrow({ shape: el, shadow: shadow.current, reveal: reveal.current, ghost: ghostBox.current, content: contentEl }, v, {
      to: T,
      tint,
      shadow: sheet ? 1 : grows ? q : clamp01(v.o),
      fadeContent: !sheet,
      ghost: grows && origin ? origin.rect : null,
      blur: SWAP.blur,
      opacity: !sheet && !grows ? clamp01(v.o) : 1,
    });
    // el fondo: en la hoja sigue a la posición (también al arrastrar)
    const sc = scrim.current;
    if (sc) {
      const s = sheet ? clamp01((from.y - v.y) / Math.max(1, from.y - T.y)) : clamp01(v.s);
      sc.style.opacity = s.toFixed(4);
    }
    if (!open) {
      const done = sheet ? v.y >= from.y - 0.5 : grows ? nearRect(v, from) && v.o < 0.002 : v.o < 0.002;
      if (done) onGone();
    }
  }

  // el botón de origen desaparece mientras la ventana es él
  useIsoLayoutEffect(() => {
    if (!grows || !origin) return;
    hideOrigin(origin.el);
    return () => showOrigin(origin.el);
  }, [grows, origin?.el]);

  // copia del contenido del botón, que se desvanece dentro de la forma
  useIsoLayoutEffect(() => {
    const gb = ghostBox.current;
    if (!gb || !grows || !origin) return;
    const g = ghostOf(origin.el);
    gb.replaceChildren(g);
    return () => gb.replaceChildren();
  }, [grows, origin?.el]);

  useIsoLayoutEffect(() => {
    if (shape.current && surfaceColor.current === null) surfaceColor.current = classBackground(shape.current);
  }, []);

  // foco: dentro al abrir, de vuelta al cerrar
  useIsoLayoutEffect(() => {
    if (!armed) return;
    if (open) {
      const c = contentEl;
      const active = document.activeElement;
      // p. ej. un campo con autoFocus: React lo enfoca al montarse
      const already = c && active instanceof HTMLElement && c.contains(active) ? active : null;
      const target =
        initialFocus?.current ??
        already ??
        c?.querySelector<HTMLElement>("[data-autofocus]") ??
        (c?.querySelector(".mochi-dialog__body") ? focusables(c.querySelector(".mochi-dialog__body") as HTMLElement)[0] : undefined) ??
        (c ? focusables(c)[0] : undefined) ??
        shape.current;
      target?.focus({ preventScroll: true });
    } else {
      const el = (origin?.el ?? restore.current) as HTMLElement | null;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus({ preventScroll: true });
    }
  }, [open, armed]);

  useScrollLock(open);
  useEscapeLayer(open, dismissible ? close : () => {});

  // arrastrar la hoja hacia abajo para cerrarla
  const drag = useRef<{ id: number; y0: number; lastY: number; lastT: number; v: number } | null>(null);
  const onGrabDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!sheet || !dismissible || !open || e.button !== 0) return;
    if ((e.target as Element).closest("button, a, input, textarea, select, [contenteditable]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, y0: e.clientY, lastY: e.clientY, lastT: now(), v: 0 };
    dragging.current = true;
    dragOff.current = 0;
  };
  const onGrabMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const t = now();
    const dt = Math.max(1e-3, t - d.lastT);
    d.v = 0.7 * ((e.clientY - d.lastY) / dt) + 0.3 * d.v;
    d.lastY = e.clientY;
    d.lastT = t;
    const dy = e.clientY - d.y0;
    const off = dy >= 0 ? dy : rubberBand(dy, H);
    dragOff.current = off;
    handle.springs.y.jump(to.y + off, t);
    handle.kick();
  };
  const onGrabUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    dragging.current = false;
    const t = now();
    const y = handle.springs.y.value(t);
    const dy = y - to.y;
    handle.springs.y.setState(y, d.v, t);
    // vuelve con la velocidad que llevaba; si se cierra, React la redirige hacia abajo desde ahí
    handle.springs.y.set(to.y, t, springs.back);
    handle.kick();
    if (dy > H * 0.3 || (d.v > 900 && dy > 12)) close();
  };

  const downOnScrim = useRef(false);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = shape.current;
    if (!el || e.defaultPrevented || !el.contains(e.target as Node)) return;
    trapTab(e, el);
  };

  return (
    <div ref={root} className={cx("mochi-dialog-root", className)} data-state={open ? "open" : "closed"} data-presentation={sheet ? "sheet" : "center"}>
      <div
        ref={scrim}
        className="mochi-dialog-scrim"
        style={{ opacity: 0 }}
        // cierra con el clic de un toque que empezó en el fondo: el toque no atraviesa a la página
        onPointerDown={() => (downOnScrim.current = true)}
        onClick={() => {
          if (dismissible && downOnScrim.current) close();
          downOnScrim.current = false;
        }}
      />
      <div ref={shadow} className="mochi-dialog__shadow" aria-hidden="true" style={{ opacity: 0 }} />
      <div
        ref={shape}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="mochi-dialog"
        style={{ opacity: 0 }}
        onKeyDown={onKeyDown}
      >
        <span ref={reveal} className="mochi-dialog__reveal" aria-hidden="true" />
        <div ref={ghostBox} className="mochi-dialog__ghost" aria-hidden="true" />
        <div ref={setContentEl} className="mochi-dialog__content" style={{ width: W, maxHeight: maxH }}>
          <div className="mochi-dialog__grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
            {sheet ? <span className="mochi-dialog__handle" aria-hidden="true" /> : null}
            <h2 id={titleId} className="mochi-dialog__title">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mochi-dialog__desc">
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="mochi-dialog__body">{children}</div> : null}
          {actions ? <div className="mochi-dialog__actions">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
