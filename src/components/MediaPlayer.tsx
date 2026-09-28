"use client";
// Island y reproductor: una píldora compacta (carátula y ecualizador) que se abre en una
// tarjeta con título, barra arrastrable y controles. La carátula y el ecualizador viajan de
// un sitio a otro; el resto entra con desenfoque. Incluye PlayPauseIcon y Scrubber sueltos.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { useSprings, now } from "../motion/useSprings.js";
import { prefersReducedMotion } from "../motion/reducedMotion.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { formatTime } from "../internal/format.js";
import { useElementSize } from "../internal/useElementSize.js";
import { cx } from "../internal/cx.js";
import { NextIcon, PreviousIcon } from "../icons/index.js";

// ---------------------------------------------------------------------------------------
// Play ↔ pausa: dos mitades de triángulo que se convierten en dos barras.

const A0 = [[7, 5], [12.5, 8.2], [12.5, 15.8], [7, 19]];
const A1 = [[6.5, 5], [10, 5], [10, 19], [6.5, 19]];
const B0 = [[12.5, 8.2], [19, 12], [19, 12], [12.5, 15.8]];
const B1 = [[14, 5], [17.5, 5], [17.5, 19], [14, 19]];
const shapeAt = (P0: number[][], P1: number[][], p: number) =>
  "M" + P0.map((q, i) => `${(q[0]! + (P1[i]![0]! - q[0]!) * p).toFixed(3)} ${(q[1]! + (P1[i]![1]! - q[1]!) * p).toFixed(3)}`).join("L") + "Z";

/** Icono que se transforma de play (`playing=false`) a pausa (`playing=true`). */
export function PlayPauseIcon({ playing, size = 24 }: { playing: boolean; size?: number }) {
  const a = useRef<SVGPathElement>(null);
  const b = useRef<SVGPathElement>(null);
  const [initial] = useState(() => [shapeAt(A0, A1, playing ? 1 : 0), shapeAt(B0, B1, playing ? 1 : 0)]);
  useSprings({ p: playing ? 1 : 0 }, springs.snappy, ({ p }) => {
    const q = Math.min(1.02, Math.max(0, p));
    a.current?.setAttribute("d", shapeAt(A0, A1, q));
    b.current?.setAttribute("d", shapeAt(B0, B1, q));
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round">
      <path ref={a} d={initial[0]} />
      <path ref={b} d={initial[1]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------------------
// Barra de progreso arrastrable.

export interface ScrubberProps {
  /** Segundos reproducidos. */
  value: number;
  /** Duración total en segundos. */
  duration: number;
  /** Al soltar el arrastre o tras cada tecla: salta a ese segundo. */
  onSeek?: (seconds: number) => void;
  /** Durante el arrastre, con el segundo bajo el puntero. */
  onScrub?: (seconds: number) => void;
  disabled?: boolean;
  tabIndex?: number;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

export function Scrubber({ value, duration, onSeek, onScrub, disabled, tabIndex, className, style, "aria-label": label = "Seek" }: ScrubberProps) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const drag = useRef<{ x: number; f: number; w: number } | null>(null);
  const shown = scrub ?? value;
  const f = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const [initial] = useState(() => ({ fill: { width: `${f * 100}%` } }));

  const handle = useSprings({ g: scrub !== null ? 1 : 0, f }, springs.snappy, p => {
    const h = 6 + 4 * p.g;
    if (bar.current) {
      bar.current.style.height = `${h}px`;
      bar.current.style.borderRadius = `${h / 2}px`;
    }
    if (fill.current) fill.current.style.width = `${(Math.min(1, Math.max(0, p.f)) * 100).toFixed(3)}%`;
  });

  const at = (clientX: number, d: { x: number; f: number; w: number }) => Math.min(1, Math.max(0, d.f + (clientX - d.x) / d.w)) * duration;
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (disabled || e.button !== 0 || !el || !duration) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const f0 = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    drag.current = { x: e.clientX, f: f0, w: rect.width };
    setScrub(f0 * duration);
    onScrub?.(f0 * duration);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const s = at(e.clientX, d);
    handle.springs.f.jump(s / duration, now());
    handle.kick();
    setScrub(s);
    onScrub?.(s);
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    if (scrub !== null) onSeek?.(scrub);
    setScrub(null);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const d =
      e.key === "ArrowRight" || e.key === "ArrowUp" ? 5 :
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? -5 :
      e.key === "PageUp" ? duration / 10 : e.key === "PageDown" ? -duration / 10 : 0;
    let next: number | null = d ? value + d : e.key === "Home" ? 0 : e.key === "End" ? duration : null;
    if (next === null) return;
    e.preventDefault();
    next = Math.min(duration, Math.max(0, next));
    onSeek?.(next);
  };

  return (
    <div
      ref={root}
      role="slider"
      tabIndex={disabled ? -1 : tabIndex ?? 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
      aria-disabled={disabled || undefined}
      className={cx("mochi-scrubber", className)}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={onKeyDown}
    >
      <span ref={bar} className="mochi-scrubber__bar">
        <span ref={fill} className="mochi-scrubber__fill" style={initial.fill} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Ecualizador: 4 barras que bailan mientras suena y se quedan en puntos en pausa.

function Equalizer({ barRef }: { barRef: (i: number) => (el: HTMLSpanElement | null) => void }) {
  return (
    <>
      {[0, 1, 2, 3].map(i => (
        <span key={i} ref={barRef(i)} className="mochi-player__bar" />
      ))}
    </>
  );
}

function useEqualizer(bars: RefObject<Array<HTMLSpanElement | null>>, playing: boolean, maxH: number) {
  useEffect(() => {
    let raf = 0;
    let last = now();
    const h = [3, 3, 3, 3];
    const reduce = prefersReducedMotion();
    const frame = () => {
      const t = now();
      const dt = Math.min(0.05, t - last);
      last = t;
      let moving = false;
      for (let i = 0; i < 4; i++) {
        // ritmo seudoaleatorio pero determinista: suma de dos senos por barra
        const target = playing && !reduce
          ? 3 + (maxH - 3) * (0.5 + 0.5 * Math.sin(t * (7.1 + i * 1.9) + i * 1.3)) * (0.55 + 0.45 * Math.sin(t * (3.3 + i * 0.7) + i))
          : playing ? maxH * 0.6 : 3;
        h[i] = h[i]! + (target - h[i]!) * (1 - Math.exp(-dt * 22));
        if (Math.abs(target - h[i]!) > 0.05) moving = true;
        const el = bars.current?.[i];
        if (el) el.style.height = `${h[i]!.toFixed(2)}px`;
      }
      raf = playing || moving ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, maxH, bars]);
}

// ---------------------------------------------------------------------------------------
// Reproductor.

export interface MediaPlayerProps {
  title: string;
  artist?: string;
  /** URL de la carátula o un nodo propio. Sin ella, un disco neutro. */
  artwork?: string | ReactNode;
  /** Duración en segundos. */
  duration: number;
  currentTime?: number;
  defaultCurrentTime?: number;
  onSeek?: (seconds: number) => void;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  /** Alineación dentro del hueco disponible (el reproductor ocupa el ancho de su contenedor). */
  align?: "center" | "start";
  className?: string;
}

// geometría de los dos estados, en px desde la esquina superior izquierda; el ancho se adapta
// al hueco disponible hasta un máximo (344 abierto cabe en un móvil de 375 con márgenes de 16)
const MAX_COMPACT = 232;
const MAX_EXPANDED = 344;
const compact = (w: number) => ({ w, h: 44, r: 22, art: { x: 8, y: 8, s: 28, r: 8 }, eq: { x: w - 26, y: 22, k: 1 } });
const expanded = (w: number) => ({ w, h: 236, r: 32, art: { x: 20, y: 20, s: 64, r: 14 }, eq: { x: w - 34, y: 52, k: 1.3 } });

export function MediaPlayer(props: MediaPlayerProps) {
  const { title, artist, artwork, duration, onSeek, onPrevious, onNext, className } = props;
  const [open, setOpen] = useControllable(props.expanded, props.defaultExpanded ?? false, props.onExpandedChange);
  const [playing, setPlaying] = useControllable(props.playing, props.defaultPlaying ?? false, props.onPlayingChange);
  const [time, setTime] = useControllable(props.currentTime, props.defaultCurrentTime ?? 0, onSeek);

  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const room = useElementSize(host)?.width;
  const wOpen = Math.max(260, Math.min(MAX_EXPANDED, room ?? MAX_EXPANDED));
  const wCompact = Math.max(180, Math.min(MAX_COMPACT, room ?? MAX_COMPACT));
  const G = open ? expanded(wOpen) : compact(wCompact);
  const everMeasured = useRef(false);
  const firstMeasure = room !== undefined && !everMeasured.current;
  const shape = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLSpanElement>(null);
  const eq = useRef<HTMLSpanElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const bars = useRef<Array<HTMLSpanElement | null>>([]);
  const barRef = (i: number) => (el: HTMLSpanElement | null) => {
    bars.current[i] = el;
  };
  useEqualizer(bars, playing, 14);

  const [initial] = useState(() => ({
    shape: { width: G.w, height: G.h, borderRadius: G.r },
    art: { width: G.art.s, height: G.art.s, borderRadius: G.art.r, transform: `translate(${G.art.x}px, ${G.art.y}px)` },
    eq: { transform: `translate(${G.eq.x}px, ${G.eq.y}px) scale(${G.eq.k})` },
    detail: { opacity: open ? 1 : 0, visibility: (open ? "visible" : "hidden") as "visible" | "hidden" },
  }));

  useSprings(
    {
      w: G.w, h: G.h, r: G.r,
      ax: G.art.x, ay: G.art.y, as: G.art.s, ar: G.art.r,
      ex: G.eq.x, ey: G.eq.y, ek: G.eq.k,
      d: open ? 1 : 0,
    },
    (key, from, to) => (key === "d" ? (to > from ? { config: springs.fadeIn, delay: 0.08 } : springs.fadeOut) : springs.morph),
    v => {
      const s = shape.current;
      if (s) {
        s.style.width = `${v.w}px`;
        s.style.height = `${v.h}px`;
        s.style.borderRadius = `${Math.min(v.r, v.h / 2)}px`;
      }
      const a = art.current;
      if (a) {
        a.style.width = a.style.height = `${v.as}px`;
        a.style.borderRadius = `${v.ar}px`;
        a.style.transform = `translate(${v.ax}px, ${v.ay}px)`;
      }
      if (eq.current) eq.current.style.transform = `translate(${v.ex}px, ${v.ey}px) scale(${v.ek})`;
      const d = detail.current;
      if (d) {
        const u = Math.min(1, Math.max(0, v.d));
        d.style.opacity = u.toFixed(4);
        const b = (1 - u) * SWAP.blur;
        d.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
        d.style.transform = `scale(${(SWAP.enterScale + (1 - SWAP.enterScale) * u).toFixed(4)})`;
        d.style.visibility = u < 0.002 ? "hidden" : "visible";
      }
    },
    { immediate: firstMeasure },
  );
  if (room !== undefined) everMeasured.current = true;

  const hidden = !open;
  return (
    <div ref={setHost} className={cx("mochi-player-host", className)} data-align={props.align ?? "center"}>
    <div ref={shape} className="mochi-player" data-state={open ? "expanded" : "compact"} style={initial.shape}>
      <span ref={art} className="mochi-player__art" style={initial.art} aria-hidden="true">
        {typeof artwork === "string" ? <img src={artwork} alt="" /> : artwork ?? <span className="mochi-player__disc" />}
      </span>
      <span ref={eq} className="mochi-player__eq" style={initial.eq} aria-hidden="true">
        <Equalizer barRef={barRef} />
      </span>

      {/* compacto: toda la píldora abre el reproductor; abierto: la cabecera lo cierra */}
      <button
        type="button"
        className="mochi-player__toggle"
        data-area={open ? "header" : "all"}
        style={open ? { width: wOpen - 88 } : undefined}
        aria-expanded={open}
        aria-label={open ? `Collapse player` : `Expand player: ${title}${artist ? `, ${artist}` : ""}`}
        onClick={() => setOpen(!open)}
      />

      <div ref={detail} className="mochi-player__detail" style={{ ...initial.detail, width: wOpen }} aria-hidden={hidden || undefined}>
        <div className="mochi-player__title" style={{ maxWidth: wOpen - 150 }}>{title}</div>
        {artist ? <div className="mochi-player__artist" style={{ maxWidth: wOpen - 150 }}>{artist}</div> : null}
        <Scrubber
          style={{ width: wOpen - 40 }}
          className="mochi-player__scrub"
          value={time}
          duration={duration}
          onSeek={setTime}
          tabIndex={hidden ? -1 : 0}
          disabled={hidden}
          aria-label={`Seek ${title}`}
        />
        <div className="mochi-player__times" aria-hidden="true">
          <span>{formatTime(time)}</span>
          <span>-{formatTime(Math.max(0, duration - time))}</span>
        </div>
        <div className="mochi-player__controls">
          <button type="button" className="mochi-player__ctl" aria-label="Previous" tabIndex={hidden ? -1 : 0} onClick={onPrevious}>
            <PreviousIcon size={24} />
          </button>
          <button type="button" className="mochi-player__ctl" data-main aria-label={playing ? "Pause" : "Play"} tabIndex={hidden ? -1 : 0} onClick={() => setPlaying(!playing)}>
            <PlayPauseIcon playing={playing} size={34} />
          </button>
          <button type="button" className="mochi-player__ctl" aria-label="Next" tabIndex={hidden ? -1 : 0} onClick={onNext}>
            <NextIcon size={24} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
