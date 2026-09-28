"use client";
// Cambio de contenido con desenfoque: cuando cambia `id`, el contenido anterior sale deprisa
// y el nuevo entra un poco después y más despacio, para que los textos no se solapen.
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { cx } from "../internal/cx.js";

interface Layer {
  key: string | number;
  node: ReactNode;
  leaving: boolean;
  fresh: boolean; // entra animado (no es el contenido inicial)
  style?: CSSProperties;
}

export interface SwapProps {
  /** Identidad del contenido: al cambiar, el anterior sale y el nuevo entra. */
  id: string | number;
  children: ReactNode;
  className?: string;
  /** Estilo que se congela en cada capa al crearla (p. ej. su color de texto). */
  layerStyle?: CSSProperties;
  /** Desenfoque máximo en px. */
  blur?: number;
  /** Escala de partida del contenido que entra. */
  enterScale?: number;
}

export function Swap({ id, children, className, layerStyle, blur = SWAP.blur, enterScale = SWAP.enterScale }: SwapProps) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ key: id, node: children, leaving: false, fresh: false, style: layerStyle }]);

  const current = layers.find(l => !l.leaving);
  if (!current || current.key !== id) {
    // ajuste de estado durante el render (patrón de React para reaccionar a un cambio de props)
    setLayers(prev => {
      const revived = prev.find(l => l.key === id);
      const rest = prev.filter(l => l.key !== id).map(l => (l.leaving ? l : { ...l, leaving: true }));
      const next: Layer = revived
        ? { ...revived, leaving: false, style: layerStyle }
        : { key: id, node: children, leaving: false, fresh: true, style: layerStyle };
      return [...rest, next];
    });
  }

  const remove = (key: string | number) => setLayers(prev => prev.filter(l => !(l.key === key && l.leaving)));

  return (
    <span className={cx("mochi-swap", className)}>
      {layers.map(l => (
        <SwapLayer
          key={l.key}
          leaving={l.leaving}
          fresh={l.fresh}
          style={l.style}
          blur={blur}
          enterScale={enterScale}
          onGone={() => remove(l.key)}
        >
          {/* la capa viva muestra siempre los hijos actuales; las que salen, los que tenían */}
          {l.leaving ? l.node : children}
        </SwapLayer>
      ))}
    </span>
  );
}

function SwapLayer(props: {
  leaving: boolean;
  fresh: boolean;
  style?: CSSProperties;
  blur: number;
  enterScale: number;
  onGone: () => void;
  children: ReactNode;
}) {
  const { leaving, fresh, style, blur, enterScale, onGone, children } = props;
  const el = useRef<HTMLSpanElement>(null);
  const gone = useRef(false);
  gone.current = gone.current && leaving;
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;

  useSprings(
    { v: leaving ? 0 : 1 },
    (_k, from, to) => (to > from ? { config: springs.fadeIn, delay: SWAP.enterDelay } : springs.fadeOut),
    ({ v }) => {
      const e = el.current;
      if (!e) return;
      const u = Math.min(1, Math.max(0, v));
      e.style.opacity = u.toFixed(4);
      const b = (1 - u) * blur;
      e.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
      const s = enterScale + (1 - enterScale) * u;
      e.style.transform = `${leaving ? "translate(-50%, -50%) " : ""}scale(${s.toFixed(4)})`;
      if (leaving && u <= 0.002 && !gone.current) {
        gone.current = true;
        onGoneRef.current();
      }
    },
    { from: { v: fresh ? 0 : 1 } },
  );

  return (
    <span ref={el} className="mochi-swap__layer" data-leaving={leaving || undefined} aria-hidden={leaving || undefined} style={style}>
      {children}
    </span>
  );
}
