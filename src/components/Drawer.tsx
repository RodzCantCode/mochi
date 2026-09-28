"use client";
// Panel lateral: un panel de toda la altura que entra desde un borde (derecho por defecto) sobre
// el fondo oscurecido, para navegación, detalles o filtros. Entra deslizándose con un muelle y el
// contenido llega un poco después con desenfoque. Con el dedo (o el ratón) se cierra
// arrastrándolo hacia su borde: lo sigue sin retraso, hacia fuera se resiste y al soltar se cierra
// si pasó un tercio o se lanzó; si no, vuelve con la velocidad que llevaba. Por lo demás es un
// diálogo: foco retenido y devuelto, Esc, clic en el fondo, desplazamiento bloqueado y colocado
// sobre la parte visible de la pantalla (con el teclado de iOS).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useSprings, now } from "../motion/useSprings.js";
import { rubberBand } from "../motion/spring.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";
import { clamp01, focusables, trapTab, useEscapeLayer, useScrollLock, useViewport, useVisualViewport } from "../internal/overlay.js";
import { CloseIcon } from "../icons/index.js";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título (también es el nombre accesible). */
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Botones de abajo, fijos aunque el contenido se desplace. */
  actions?: ReactNode;
  /** Borde del que sale. */
  side?: "right" | "left";
  /** Ancho máximo en px (nunca más que la pantalla menos 48 px). */
  width?: number;
  /** Esc, clic en el fondo, el botón de cerrar y arrastrarlo lo cierran. */
  dismissible?: boolean;
  /** Qué recibe el foco al abrir; si no, el primer control del contenido. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Nombre del botón de cerrar. */
  closeLabel?: string;
  className?: string;
}

const EDGE = 8; // margen con los bordes de la pantalla
const SHADOW = 32; // lo que se aleja de más al cerrar, para que la sombra salga entera

export function Drawer(props: DrawerProps) {
  const { open } = props;
  const [mounted, setMounted] = useState(open);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (open && !mounted) setMounted(true);
  if (!mounted || !client) return null;
  return createPortal(<Panel {...props} onGone={() => setMounted(false)} />, document.body);
}

function Panel({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  side = "right",
  width = 400,
  dismissible = true,
  initialFocus,
  closeLabel = "Close",
  className,
  onGone,
}: DrawerProps & { onGone: () => void }) {
  const titleId = useId();
  const descId = useId();
  const vp = useViewport();
  // en vertical manda la parte que se ve: en Safari de iOS el teclado la tapa sin cambiar el alto
  const visual = useVisualViewport(true);
  const viewTop = visual?.top ?? 0;
  const viewH = visual?.height ?? vp.h;
  const close = () => onOpenChange(false);

  const W = Math.min(width, vp.w - 48);
  const H = viewH - EDGE * 2;
  const x = side === "right" ? vp.w - EDGE - W : EDGE;
  // cuánto hay que apartarlo para que salga del todo (sombra incluida); hacia su borde
  const out = W + EDGE + SHADOW;
  const dir = side === "right" ? 1 : -1;

  // quién tenía el foco al abrir (vuelve ahí al cerrar)
  const restore = useRef<Element | null>(typeof document !== "undefined" ? document.activeElement : null);
  const wasOpen = useRef(open);
  useIsoLayoutEffect(() => {
    if (open && !wasOpen.current) restore.current = document.activeElement;
    wasOpen.current = open;
  }, [open]);

  const shape = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  // mientras se arrastra, la posición la manda el dedo (aunque React vuelva a pintar)
  const dragging = useRef(false);
  const geo = useRef({ x, viewTop, out, dir });
  geo.current = { x, viewTop, out, dir };

  const handle = useSprings(
    // d: lo que se aparta de su sitio hacia su borde (0 = abierto); o: el contenido
    { d: open ? 0 : out, o: open ? 1 : 0 },
    (key, from, to) => (key === "o" ? (to > from ? { config: springs.fadeIn, delay: SWAP.enterDelay } : springs.fadeOut) : springs.morph),
    v => paint(v),
    { from: { d: out, o: 0 } },
  );

  function paint(v: { d: number; o: number }) {
    const el = shape.current;
    if (!el) return;
    const g = geo.current;
    el.style.transform = `translate(${(g.x + g.dir * v.d).toFixed(2)}px, ${(g.viewTop + EDGE).toFixed(2)}px)`;
    el.style.opacity = "1";
    const c = content.current;
    if (c) {
      const u = clamp01(v.o);
      c.style.opacity = u > 0.999 ? "" : u.toFixed(4);
      const b = (1 - u) * 8;
      c.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
    }
    if (scrim.current) scrim.current.style.opacity = clamp01(1 - v.d / g.out).toFixed(4);
    if (!open && v.d >= g.out - 0.5 && v.o < 0.002) onGone();
  }
  // si cambia el tamaño de la pantalla (o sale el teclado), se recoloca sin animar
  useIsoLayoutEffect(() => {
    if (!dragging.current) paint(handle.read());
  }, [x, viewTop, H]);

  // foco: dentro al abrir, de vuelta al cerrar
  useIsoLayoutEffect(() => {
    const s = shape.current;
    if (!s) return;
    if (open) {
      const c = content.current;
      const active = document.activeElement;
      // p. ej. un campo con autoFocus: React lo enfoca al montarse
      const already = c && active instanceof HTMLElement && c.contains(active) ? active : null;
      const body = c?.querySelector<HTMLElement>(".mochi-drawer__body");
      const target =
        initialFocus?.current ??
        already ??
        c?.querySelector<HTMLElement>("[data-autofocus]") ??
        (body ? focusables(body)[0] : undefined) ??
        (c ? focusables(c)[0] : undefined) ??
        s;
      target.focus({ preventScroll: true });
    } else {
      const el = restore.current as HTMLElement | null;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus({ preventScroll: true });
    }
  }, [open]);

  useScrollLock(open);
  useEscapeLayer(open, dismissible ? close : () => {});

  // arrastrarlo hacia su borde para cerrarlo. Solo en horizontal: en vertical, el contenido se
  // desplaza como siempre (touch-action: pan-y)
  const drag = useRef<{ id: number; x0: number; y0: number; lastX: number; lastT: number; v: number; on: boolean } | null>(null);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!dismissible || !open || e.button !== 0) return;
    if ((e.target as Element).closest("button, a, input, textarea, select, label, [contenteditable], [role='slider']")) return;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastT: now(), v: 0, on: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.on) {
      // se decide al moverse unos px: si va más en vertical, no es un arrastre del panel
      if (Math.abs(dx) < 6 && Math.abs(e.clientY - d.y0) < 6) return;
      if (Math.abs(e.clientY - d.y0) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      d.on = true;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.setAttribute("data-dragging", "");
      window.getSelection()?.removeAllRanges();
    }
    const t = now();
    const dt = Math.max(1e-3, t - d.lastT);
    // velocidad hacia su borde, en px/s
    d.v = 0.7 * ((dir * (e.clientX - d.lastX)) / dt) + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = t;
    const toward = dir * dx;
    const off = toward >= 0 ? toward : rubberBand(toward, W);
    handle.springs.d.jump(off, t);
    handle.kick();
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.on) return;
    dragging.current = false;
    e.currentTarget.removeAttribute("data-dragging");
    const t = now();
    const off = handle.springs.d.value(t);
    handle.springs.d.setState(off, d.v, t);
    // vuelve con la velocidad que llevaba; si se cierra, React lo redirige hacia fuera desde ahí
    handle.springs.d.set(0, t, springs.back);
    handle.kick();
    if (off > W / 3 || (d.v > 900 && off > 12)) close();
  };

  const downOnScrim = useRef(false);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = shape.current;
    if (!el || e.defaultPrevented || !el.contains(e.target as Node)) return;
    trapTab(e, el);
  };

  return (
    <div className={cx("mochi-drawer-root", className)} data-state={open ? "open" : "closed"} data-side={side}>
      <div
        ref={scrim}
        className="mochi-drawer-scrim"
        style={{ opacity: 0 }}
        // cierra con el clic de un toque que empezó en el fondo: el toque no atraviesa a la página
        onPointerDown={() => (downOnScrim.current = true)}
        onClick={() => {
          if (dismissible && downOnScrim.current) close();
          downOnScrim.current = false;
        }}
      />
      <div
        ref={shape}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="mochi-drawer"
        style={{ width: W, height: H, opacity: 0 }}
        onKeyDown={onKeyDown}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div ref={content} className="mochi-drawer__content" style={{ opacity: 0 }}>
          <div className="mochi-drawer__head">
            <h2 id={titleId} className="mochi-drawer__title">
              {title}
            </h2>
            {dismissible ? (
              <button type="button" className="mochi-drawer__close" aria-label={closeLabel} onClick={close}>
                <CloseIcon size={20} />
              </button>
            ) : null}
          </div>
          {description ? (
            <p id={descId} className="mochi-drawer__desc">
              {description}
            </p>
          ) : null}
          <div className="mochi-drawer__body">{children}</div>
          {actions ? <div className="mochi-drawer__actions">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
