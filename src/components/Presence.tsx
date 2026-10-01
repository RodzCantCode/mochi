"use client";
// Aparecer y desaparecer con muelle. Presence enseña o quita lo que tiene dentro: entra con un
// fundido y un desenfoque corto y, al quitarlo, se sigue pintando hasta terminar de irse. Con
// `collapse`, además abre y cierra su hueco, así lo de alrededor se desliza en vez de saltar.
// PresenceGroup hace lo mismo con cada elemento de una lista (con `key`).
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { markSizing, useLiveHeight, verticalChrome } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";

export type PresenceEffect = "blur" | "rise" | "fade";

export interface PresenceProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Si se ve. Al pasar a false, sale animado y después se desmonta. */
  show: boolean;
  children: ReactNode;
  /** `blur` (fundido, desenfoque y una escala mínima), `rise` (sube 8 px) o `fade` (solo fundido). */
  effect?: PresenceEffect;
  /** También abre y cierra su hueco: lo de alrededor se desliza. */
  collapse?: boolean;
  /** Anima también la primera vez que se monta ya visible. */
  appear?: boolean;
  /** Cuando termina de irse (ya desmontado). */
  onExited?: () => void;
  /** Elemento que lo envuelve (por defecto `div`; `li` dentro de una lista). */
  as?: ElementType;
}

export function Presence({ show, children, effect = "blur", collapse = false, appear = false, onExited, as: As = "div", className, style, ...rest }: PresenceProps) {
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);
  // lo que había al irse se sigue pintando mientras sale (mismo valor en los dos renders)
  const kept = useRef<ReactNode>(children);
  if (show) kept.current = children;

  const el = useRef<HTMLElement>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);
  const h = useLiveHeight(collapse && mounted ? inner : null);
  const [startVisible] = useState(show && !appear);
  // con `collapse` y ya visible al montar, la primera medida se coloca sin animar
  const measured = useRef(false);
  // visible y quieto, el alto sigue al contenido al momento: solo se anima al entrar y al salir
  const committedShow = useRef(show);
  const resting = useRef(false);
  // relleno y borde propios (con border-box, el alto los incluye)
  const chrome = useRef(0);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  const exited = useRef(false);

  const [initial] = useState<CSSProperties | undefined>(() =>
    startVisible ? undefined : { opacity: 0, ...(collapse ? { height: 0, overflow: "hidden" } : null) },
  );

  useSprings(
    { v: show ? 1 : 0, h: collapse && show ? h ?? 0 : 0 },
    (key, from, to) => (key === "v" ? (to > from ? { config: springs.fadeIn, delay: collapse ? SWAP.enterDelay : 0 } : springs.fadeOut) : springs.morph),
    ({ v, h: hv }) => {
      const e = el.current;
      if (!e) return;
      const u = Math.min(1, Math.max(0, v));
      e.style.opacity = u > 0.999 ? "" : u.toFixed(4);
      const b = effect === "blur" ? (1 - u) * 8 : 0;
      e.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
      e.style.transform =
        u > 0.999 ? "" : effect === "blur" ? `scale(${(0.97 + 0.03 * u).toFixed(4)})` : effect === "rise" ? `translateY(${((1 - u) * 8).toFixed(2)}px)` : "";
      if (collapse) {
        // mientras abre o cierra su hueco lo marca: un AutoHeight de fuera lo sigue sin recortarlo
        if (show && h !== null && Math.abs(hv - h) < 0.5) {
          e.style.height = "";
          e.style.overflow = "";
          markSizing(e, false);
        } else {
          e.style.height = `${(Math.max(0, hv) + chrome.current).toFixed(2)}px`;
          e.style.overflow = "hidden";
          markSizing(e, true);
        }
      }
      resting.current = show && u > 0.999 && (!collapse || (h !== null && Math.abs(hv - h) < 0.5));
      if (!show && u <= 0.002 && (!collapse || hv <= 0.5) && !exited.current) {
        exited.current = true;
        setMounted(false);
        onExitedRef.current?.();
      }
    },
    {
      from: { v: startVisible ? 1 : 0 },
      immediate: collapse && ((startVisible && h !== null && !measured.current) || (show && committedShow.current && resting.current)),
    },
  );
  useIsoLayoutEffect(() => {
    if (h !== null) measured.current = true;
    if (show) exited.current = false;
    committedShow.current = show;
    if (el.current) chrome.current = verticalChrome(el.current);
  });
  // mientras sale no se puede usar (ni con teclado ni con lector de pantalla)
  useEffect(() => {
    const e = el.current as (HTMLElement & { inert?: boolean }) | null;
    if (e) e.inert = !show;
  }, [show, mounted]);

  if (!mounted) return null;
  const content = show ? children : kept.current;
  return (
    <As ref={el} className={cx("mochi-presence", className)} data-state={show ? "shown" : "leaving"} style={{ ...initial, ...style }} {...rest}>
      {collapse ? (
        <div ref={setInner} className="mochi-presence__inner">
          {content}
        </div>
      ) : (
        content
      )}
    </As>
  );
}

export interface PresenceGroupProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Elementos con `key`. Los nuevos aparecen; los que faltan salen y cierran su hueco. */
  children: ReactNode;
  effect?: PresenceEffect;
  /** Cada elemento abre y cierra su hueco (por defecto sí). */
  collapse?: boolean;
  /** Elemento de la lista (por defecto `div`; `ul` para una lista). */
  as?: ElementType;
  /** Elemento que envuelve a cada uno (por defecto `div`; `li` dentro de un `ul`). */
  itemAs?: ElementType;
}

/**
 * Lista con presencia: al añadir un elemento abre su hueco y aparece; al quitarlo se desvanece
 * donde estaba y cierra el hueco. Reordenar no se anima (los elementos cambian de sitio al
 * momento).
 */
export function PresenceGroup({ children, effect = "blur", collapse = true, as: As = "div", itemAs = "div", className, ...rest }: PresenceGroupProps) {
  const list = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const keys = list.map(c => String(c.key));
  const keysRef = useRef(keys);
  keysRef.current = keys;
  // los que había al montar no se animan; los que se quitaron alguna vez, al volver, sí
  const [initial] = useState(() => new Set(keys));
  const removedOnce = useRef(new Set<string>());
  const nodes = useRef(new Map<string, ReactElement>());
  for (const c of list) nodes.current.set(String(c.key), c);

  // lo que se pinta, incluidos los que están saliendo: cada uno que sale se queda justo detrás
  // del que tenía delante, así el orden no se altera aunque se quiten o añadan varios seguidos
  const sig = keys.join("\u0000");
  const [prevSig, setPrevSig] = useState(sig);
  const [order, setOrder] = useState<string[]>(keys);
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  if (sig !== prevSig) {
    setPrevSig(sig);
    const nextLeaving = new Set(order.filter(k => !keys.includes(k)));
    const result = [...keys];
    order.forEach((k, i) => {
      if (!nextLeaving.has(k)) return;
      let j = i - 1;
      while (j >= 0 && !result.includes(order[j]!)) j--;
      result.splice(j < 0 ? 0 : result.indexOf(order[j]!) + 1, 0, k);
    });
    for (const k of nextLeaving) removedOnce.current.add(k);
    setOrder(result);
    setLeaving(nextLeaving);
  }

  const exit = (key: string) => {
    nodes.current.delete(key);
    setLeaving(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    // si ha vuelto a la lista entretanto, se queda
    setOrder(prev => (keysRef.current.includes(key) ? prev : prev.filter(k => k !== key)));
  };

  return (
    <As className={cx("mochi-presence-group", className)} {...rest}>
      {order.map(key => {
        const node = nodes.current.get(key);
        if (!node) return null;
        return (
          <Presence
            key={key}
            show={!leaving.has(key)}
            effect={effect}
            collapse={collapse}
            appear={!initial.has(key) || removedOnce.current.has(key)}
            as={itemAs}
            onExited={() => exit(key)}
          >
            {node}
          </Presence>
        );
      })}
    </As>
  );
}
