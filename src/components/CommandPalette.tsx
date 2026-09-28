"use client";
// Paleta de comandos (⌘K): se abre sobre la página, filtra al escribir, el resaltado se desliza
// hasta la opción activa y la altura se ajusta con un muelle a lo que queda. Flechas para
// moverse, Enter para ejecutar, Esc para cerrar. Incluye Kbd, el disparador y useCommandK.
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";
import { matchCommand } from "./commandFilter.js";
import { CommandIcon, EnterIcon, SearchIcon } from "../icons/index.js";
import { MorphBox } from "./MorphBox.js";

// ---------------------------------------------------------------------------------------
// Teclas

const isApple = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** Teclas de un atajo: "mod" es ⌘ en Apple y Ctrl en el resto; "enter" y "esc" tienen su signo. */
export function Kbd({ keys, className, size = "sm" }: { keys: string[]; className?: string; size?: "sm" | "lg" }) {
  const [apple, setApple] = useState(true);
  useEffect(() => setApple(isApple()), []);
  const icon = size === "lg" ? 20 : 12;
  return (
    <kbd className={cx("mochi-kbd", className)} data-size={size}>
      {keys.map((k, i) =>
        k === "mod" ? (
          apple ? <CommandIcon key={i} size={icon} strokeWidth={size === "lg" ? 1.9 : 1.35} title="Command" /> : <span key={i}>Ctrl</span>
        ) : k === "enter" ? (
          <EnterIcon key={i} size={icon + 2} strokeWidth={1.5} title="Enter" />
        ) : (
          <span key={i}>{k}</span>
        ),
      )}
    </kbd>
  );
}

/** ⌘K / Ctrl+K en toda la página. */
export function useCommandK(onToggle: () => void) {
  const ref = useRef(onToggle);
  ref.current = onToggle;
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Tecla ⌘K pulsable que abre la paleta. Con `children`, un buscador con el atajo a la derecha. */
export function CommandPaletteTrigger({ onClick, children, className }: { onClick: () => void; children?: ReactNode; className?: string }) {
  return (
    <MorphBox
      as="button"
      type="button"
      tone="surface"
      radius={children ? "pill" : 18}
      contentKey="trigger"
      padding={children ? "0 8px 0 16px" : "0 18px"}
      height={children ? 44 : 56}
      pressScale={0.94}
      className={cx("mochi-trigger", className)}
      data-kind={children ? "search" : "key"}
      aria-keyshortcuts="Meta+K Control+K"
      aria-label={children ? undefined : "Open command palette"}
      onClick={onClick}
    >
      {children ? (
        <span className="mochi-trigger__search">
          <SearchIcon size={18} />
          <span>{children}</span>
          <Kbd keys={["mod", "K"]} />
        </span>
      ) : (
        <Kbd keys={["mod", "K"]} size="lg" />
      )}
    </MorphBox>
  );
}

// ---------------------------------------------------------------------------------------
// Paleta

export interface Command {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Atajo que se muestra, p. ej. ["mod", "N"]. */
  shortcut?: string[];
  /** Otras palabras por las que encontrarlo. */
  keywords?: string[];
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Command[];
  placeholder?: string;
  emptyLabel?: string;
  /** Nombre accesible del diálogo. */
  label?: string;
  /** Filas visibles antes de desplazar. */
  maxRows?: number;
}

const ROW = 44;
const INPUT = 56;
const PAD = 8;

interface RowState {
  cmd: Command;
  leaving: boolean;
  fresh: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = "Search commands…",
  emptyLabel = "No results",
  label = "Command palette",
  maxRows = 7,
}: CommandPaletteProps) {
  const [mounted, setMounted] = useState(open);
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);
  if (open && !mounted) setMounted(true);
  if (!mounted || !client) return null;
  return createPortal(
    <Palette
      open={open}
      onClose={() => onOpenChange(false)}
      onGone={() => setMounted(false)}
      commands={commands}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
      label={label}
      maxRows={maxRows}
    />,
    document.body,
  );
}

function Palette(props: {
  open: boolean;
  onClose: () => void;
  onGone: () => void;
  commands: Command[];
  placeholder: string;
  emptyLabel: string;
  label: string;
  maxRows: number;
}) {
  const { open, onClose, onGone, commands, placeholder, emptyLabel, label, maxRows } = props;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const [hiLayer, setHiLayer] = useState<HTMLDivElement | null>(null);
  const restore = useRef<Element | null>(null);

  const filtered = commands.filter(c => matchCommand(query, c));
  const n = filtered.length;
  const act = Math.min(active, Math.max(0, n - 1));

  // filas con presencia: las que dejan de coincidir salen animadas antes de desaparecer
  const [rows, setRows] = useState<RowState[]>(() => filtered.map(cmd => ({ cmd, leaving: false, fresh: false })));
  const ids = filtered.map(c => c.id).join("\u0000");
  const [prevIds, setPrevIds] = useState(ids);
  if (ids !== prevIds) {
    setPrevIds(ids);
    setRows(prev => {
      const keep = new Set(filtered.map(c => c.id));
      const out: RowState[] = prev.map(r => (keep.has(r.cmd.id) ? { ...r, leaving: false } : { ...r, leaving: true }));
      for (const cmd of filtered) if (!prev.some(r => r.cmd.id === cmd.id)) out.push({ cmd, leaving: false, fresh: true });
      return out;
    });
  }
  const indexOf = new Map(filtered.map((c, i) => [c.id, i]));

  const visible = Math.min(Math.max(n, 1), maxRows);
  const listH = visible * ROW;
  const panelH = INPUT + 1 + PAD * 2 + listH;

  useSprings(
    { o: open ? 1 : 0, h: panelH, y: act * ROW, hv: n > 0 ? 1 : 0 },
    (key, from, to) => (key === "o" ? (to > from ? springs.fadeIn : springs.fadeOut) : key === "hv" ? springs.fadeIn : key === "y" ? springs.snappy : springs.morph),
    v => {
      const o = Math.min(1, Math.max(0, v.o));
      if (scrim.current) scrim.current.style.opacity = o.toFixed(4);
      const p = panel.current;
      if (p) {
        p.style.opacity = o.toFixed(4);
        p.style.height = `${v.h}px`;
        const b = (1 - o) * SWAP.blur;
        p.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
        p.style.transform = `scale(${(0.96 + 0.04 * o).toFixed(4)})`;
      }
      if (viewport.current) viewport.current.style.height = `${Math.max(0, v.h - INPUT - 1 - PAD * 2)}px`;
      const hv = Math.min(1, Math.max(0, v.hv));
      if (highlight.current) {
        highlight.current.style.transform = `translateY(${(v.y + 2).toFixed(3)}px)`;
        highlight.current.style.opacity = hv.toFixed(3);
      }
      if (hiLayer) {
        const top = v.y + 2, bottom = Math.max(0, n * ROW - (v.y + ROW - 2));
        hiLayer.style.height = `${Math.max(n, 1) * ROW}px`;
        hiLayer.style.clipPath = `inset(${top.toFixed(3)}px 8px ${bottom.toFixed(3)}px 8px round 10px)`;
        hiLayer.style.opacity = hv.toFixed(3);
      }
      if (!open && o <= 0.002) onGone();
    },
    { from: { o: 0 } },
  );

  // al abrir: foco en la búsqueda; al cerrar: vuelve a donde estaba
  useIsoLayoutEffect(() => {
    if (open) {
      restore.current = document.activeElement;
      setQuery("");
      setActive(0);
      input.current?.focus();
    } else {
      const el = restore.current as HTMLElement | null;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus();
    }
  }, [open]);

  // el resaltado no se sale de la zona visible al moverse con el teclado
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const top = act * ROW, bottom = top + ROW;
    if (top < vp.scrollTop) vp.scrollTop = top;
    else if (bottom > vp.scrollTop + listH) vp.scrollTop = bottom - listH;
  }, [act, listH]);

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    onClose();
    cmd.onSelect();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!n) return;
      setActive((act + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[act]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      e.preventDefault(); // el foco se queda en la paleta
    }
  };

  const activeId = n ? `${listId}-${filtered[act]?.id}` : undefined;
  return (
    <div className="mochi-cmdk-root" data-state={open ? "open" : "closed"}>
      <div ref={scrim} className="mochi-cmdk-scrim" onPointerDown={onClose} style={{ opacity: 0 }} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className="mochi-cmdk" style={{ opacity: 0, height: panelH }}>
        <div className="mochi-cmdk__input">
          <SearchIcon size={19} />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <Kbd keys={["esc"]} className="mochi-cmdk__esc" />
        </div>
        <div className="mochi-cmdk__divider" />
        <div ref={viewport} className="mochi-cmdk__viewport" style={{ height: listH }}>
          <div role="listbox" id={listId} aria-label={label} className="mochi-cmdk__list" style={{ height: Math.max(n, 1) * ROW }}>
            <span ref={highlight} className="mochi-cmdk__highlight" aria-hidden="true" />
            {rows.map(r => (
              <Row
                key={r.cmd.id}
                cmd={r.cmd}
                id={`${listId}-${r.cmd.id}`}
                index={indexOf.get(r.cmd.id) ?? 0}
                leaving={r.leaving}
                fresh={r.fresh}
                selected={!r.leaving && indexOf.get(r.cmd.id) === act}
                hiLayer={hiLayer}
                onHover={() => {
                  const i = indexOf.get(r.cmd.id);
                  if (i !== undefined && i !== act) setActive(i);
                }}
                onRun={() => run(r.cmd)}
                onGone={() => setRows(prev => prev.filter(x => !(x.cmd.id === r.cmd.id && x.leaving)))}
              />
            ))}
            {/* copia en blanco de las filas, recortada a la forma del resaltado */}
            <div ref={setHiLayer} className="mochi-cmdk__hi" aria-hidden="true" />
            {n === 0 ? <div className="mochi-cmdk__empty">{emptyLabel}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row(props: {
  cmd: Command;
  id: string;
  index: number;
  leaving: boolean;
  fresh: boolean;
  selected: boolean;
  hiLayer: HTMLDivElement | null;
  onHover: () => void;
  onRun: () => void;
  onGone: () => void;
}) {
  const { cmd, id, index, leaving, fresh, selected, hiLayer, onHover, onRun, onGone } = props;
  const lo = useRef<HTMLDivElement>(null);
  const hi = useRef<HTMLDivElement>(null);
  const gone = useRef(false);
  gone.current = gone.current && leaving;
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
  // una fila que sale se desvanece donde estaba
  const lastIndex = useRef(index);
  if (!leaving) lastIndex.current = index;

  useSprings(
    { y: lastIndex.current * ROW, v: leaving ? 0 : 1 },
    (key, from, to) => (key === "v" ? (to > from ? { config: springs.fadeIn, delay: SWAP.enterDelay } : springs.fadeOut) : springs.morph),
    p => {
      const u = Math.min(1, Math.max(0, p.v));
      const b = (1 - u) * 10;
      for (const el of [lo.current, hi.current]) {
        if (!el) continue;
        el.style.transform = `translateY(${p.y.toFixed(3)}px) scale(${(0.96 + 0.04 * u).toFixed(4)})`;
        el.style.opacity = u.toFixed(4);
        el.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
      }
      if (leaving && u <= 0.002 && !gone.current) {
        gone.current = true;
        onGoneRef.current();
      }
    },
    { from: { v: fresh ? 0 : 1 } },
  );

  const body = (
    <>
      <span className="mochi-cmdk__icon">{cmd.icon}</span>
      <span className="mochi-cmdk__label">{cmd.label}</span>
      {selected ? (
        <span className="mochi-cmdk__sc">
          <Kbd keys={["enter"]} />
        </span>
      ) : cmd.shortcut ? (
        <span className="mochi-cmdk__sc">
          <Kbd keys={cmd.shortcut} />
        </span>
      ) : null}
    </>
  );
  return (
    <>
      <div
        ref={lo}
        id={id}
        role="option"
        aria-selected={selected}
        aria-hidden={leaving || undefined}
        className="mochi-cmdk__row"
        onPointerMove={leaving ? undefined : onHover}
        onClick={leaving ? undefined : onRun}
      >
        {body}
      </div>
      {hiLayer
        ? createPortal(
            <div ref={hi} className="mochi-cmdk__row" data-hi>
              {body}
            </div>,
            hiLayer,
          )
        : null}
    </>
  );
}
