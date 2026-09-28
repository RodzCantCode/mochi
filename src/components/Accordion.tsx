"use client";
// Desplegable (Collapsible) y acordeón (Accordion). Cada sección es una cabecera que abre su
// contenido: la altura crece con un muelle, la flecha gira y el contenido entra con desenfoque;
// al cerrar, al revés. En un acordeón de una sola abierta, abrir una cierra la otra a la vez y
// la tarjeta cambia de tamaño en un solo movimiento. El contenido cerrado no se desmonta (lo
// escrito en un formulario se conserva) y la búsqueda del navegador abre la sección donde
// encuentra el texto.
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useSprings } from "../motion/useSprings.js";
import { springs, swap as SWAP } from "../tokens.js";
import { useControllable } from "../internal/useControllable.js";
import { useLiveHeight } from "../internal/useElementSize.js";
import { useIsoLayoutEffect } from "../internal/useIsoLayoutEffect.js";
import { cx } from "../internal/cx.js";
import { ChevronDownIcon } from "../icons/index.js";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

// ---------------------------------------------------------------------------------------
// Una sección

interface SectionProps {
  title: ReactNode;
  icon?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  headingLevel: HeadingLevel;
  className?: string;
  children: ReactNode;
}

// hidden="until-found": oculto, pero la búsqueda del navegador lo encuentra y avisa (beforematch)
const untilFound = () => typeof document !== "undefined" && "onbeforematch" in document.body;

function Section({ title, icon, open, onOpenChange, disabled, headingLevel, className, children }: SectionProps) {
  const id = useId();
  const triggerId = `${id}-trigger`;
  const regionId = `${id}-region`;
  const region = useRef<HTMLDivElement>(null);
  const chevron = useRef<HTMLSpanElement>(null);
  const [inner, setInner] = useState<HTMLDivElement | null>(null);

  // cerrada del todo = oculta. Se deriva de `open`: al abrir deja de estarlo en ese mismo render
  // (antes de medir), sin actualizar estado durante el render
  const [settledClosed, setSettledClosed] = useState(!open);
  const closed = !open && settledClosed;
  useIsoLayoutEffect(() => {
    if (open && settledClosed) setSettledClosed(false);
  }, [open, settledClosed]);
  useIsoLayoutEffect(() => {
    const r = region.current;
    if (!r) return;
    // desactivada, oculta del todo: la búsqueda no debe abrir algo que luego no se puede cerrar
    if (closed) r.setAttribute("hidden", untilFound() && !disabled ? "until-found" : "");
    else r.removeAttribute("hidden");
  }, [closed, disabled]);
  const h = useLiveHeight(inner);
  // abierta y quieta, la altura sigue al contenido al momento (lo de dentro anima lo suyo);
  // solo se anima al abrir y al cerrar
  const committedOpen = useRef(open);
  const restingOpen = useRef(false);

  const [initial] = useState<{ region?: CSSProperties; content?: CSSProperties; chevron?: CSSProperties }>(() =>
    open ? { chevron: { transform: "rotate(180deg)" } } : { region: { height: 0, overflow: "hidden" }, content: { opacity: 0 } },
  );
  // la primera medida se coloca sin animar (se apunta al pintar)
  const measured = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useSprings(
    { h: open ? h ?? 0 : 0, o: open ? 1 : 0, r: open ? 1 : 0 },
    (key, from, to) =>
      key === "o" ? (to > from ? { config: springs.fadeIn, delay: SWAP.enterDelay } : springs.fadeOut) : key === "r" ? springs.snappy : springs.morph,
    ({ h: hv, o, r }) => {
      const rg = region.current;
      if (rg) {
        if (open && h !== null && Math.abs(hv - h) < 0.5) {
          rg.style.height = "";
          rg.style.overflow = "";
        } else {
          rg.style.height = `${Math.max(0, hv).toFixed(2)}px`;
          rg.style.overflow = "hidden";
        }
      }
      if (inner) {
        const u = Math.min(1, Math.max(0, o));
        inner.style.opacity = u > 0.999 ? "" : u.toFixed(4);
        const b = (1 - u) * 8;
        inner.style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : "";
      }
      if (chevron.current) chevron.current.style.transform = `rotate(${(r * 180).toFixed(2)}deg)`;
      if (open) restingOpen.current = h !== null && Math.abs(hv - h) < 0.5 && o > 0.999;
      else {
        restingOpen.current = false;
        if (!settledClosed && hv <= 0.5 && o <= 0.002) setSettledClosed(true);
      }
    },
    { immediate: (h !== null && !measured.current) || (open && committedOpen.current && restingOpen.current) },
  );
  useIsoLayoutEffect(() => {
    if (h !== null) measured.current = true;
    committedOpen.current = open;
  });

  // si se cierra con el foco dentro, el foco pasa a la cabecera (lo de dentro va a ocultarse)
  const trigger = useRef<HTMLButtonElement>(null);
  useIsoLayoutEffect(() => {
    if (!open && region.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
  }, [open]);

  // la búsqueda del navegador ha encontrado algo dentro: se abre. Si quien la controla no la
  // abre, se vuelve a ocultar (el navegador ya le ha quitado `hidden`)
  useEffect(() => {
    const r = region.current;
    if (!r) return;
    const onMatch = () => {
      onOpenChangeRef.current(true);
      requestAnimationFrame(() => {
        if (!committedOpen.current && region.current) region.current.setAttribute("hidden", "until-found");
      });
    };
    r.addEventListener("beforematch", onMatch);
    return () => r.removeEventListener("beforematch", onMatch);
  }, []);

  const Heading = `h${headingLevel}` as "h3";
  return (
    <div className={cx("mochi-accordion__item", className)} data-state={open ? "open" : "closed"} data-disabled={disabled || undefined}>
      <Heading className="mochi-accordion__heading">
        <button
          ref={trigger}
          type="button"
          id={triggerId}
          className="mochi-accordion__trigger"
          aria-expanded={open}
          aria-controls={regionId}
          disabled={disabled}
          data-mochi-accordion-trigger=""
          onClick={() => onOpenChange(!open)}
        >
          {icon ? (
            <span className="mochi-accordion__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="mochi-accordion__title">{title}</span>
          <span ref={chevron} className="mochi-accordion__chevron" aria-hidden="true" style={initial.chevron}>
            <ChevronDownIcon size={18} />
          </span>
        </button>
      </Heading>
      {/* cerrada no es una región: si no, aparece vacía en el árbol de accesibilidad */}
      <div
        ref={region}
        id={regionId}
        role={closed ? undefined : "region"}
        aria-labelledby={closed ? undefined : triggerId}
        className="mochi-accordion__region"
        style={initial.region}
      >
        <div ref={setInner} className="mochi-accordion__content" style={initial.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Flechas entre cabeceras (Inicio y Fin incluidos)

function onHeadersKeyDown(e: KeyboardEvent<HTMLElement>) {
  const root = e.currentTarget;
  const target = e.target as HTMLElement;
  if (!target.matches("[data-mochi-accordion-trigger]") || target.closest(".mochi-accordion") !== root) return;
  const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-mochi-accordion-trigger]")).filter(
    t => t.closest(".mochi-accordion") === root && !t.disabled,
  );
  const i = triggers.indexOf(target as HTMLButtonElement);
  let next = -1;
  if (e.key === "ArrowDown") next = (i + 1) % triggers.length;
  else if (e.key === "ArrowUp") next = (i - 1 + triggers.length) % triggers.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = triggers.length - 1;
  if (next < 0) return;
  e.preventDefault();
  triggers[next]?.focus();
}

// ---------------------------------------------------------------------------------------
// Desplegable

export interface CollapsibleProps {
  /** Texto de la cabecera. */
  title: ReactNode;
  /** Icono a la izquierda del título. */
  icon?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** `card`: tarjeta `surface`. `plain`: sin fondo, con separadores, para ir dentro de otra superficie. */
  variant?: "card" | "plain";
  /** Nivel del encabezado que envuelve la cabecera (h3 por defecto). */
  headingLevel?: HeadingLevel;
  className?: string;
  children: ReactNode;
}

export function Collapsible({ title, icon, open: openProp, defaultOpen = false, onOpenChange, disabled, variant = "card", headingLevel = 3, className, children }: CollapsibleProps) {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  return (
    <div className={cx("mochi-accordion", className)} data-variant={variant}>
      <Section title={title} icon={icon} open={open} onOpenChange={setOpen} disabled={disabled} headingLevel={headingLevel}>
        {children}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Acordeón

interface AccordionContext {
  isOpen: (value: string) => boolean;
  toggle: (value: string, open: boolean) => void;
  headingLevel: HeadingLevel;
}
const Ctx = createContext<AccordionContext | null>(null);

export interface AccordionProps {
  /** Valores de las secciones abiertas. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Varias abiertas a la vez; si no, abrir una cierra la otra. */
  multiple?: boolean;
  /** Con una sola abierta, si se puede cerrar la que está abierta (por defecto sí). */
  collapsible?: boolean;
  variant?: "card" | "plain";
  headingLevel?: HeadingLevel;
  className?: string;
  /** Las secciones: `AccordionItem`. */
  children: ReactNode;
}

export function Accordion({
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  collapsible = true,
  variant = "card",
  headingLevel = 3,
  className,
  children,
}: AccordionProps) {
  const [openValues, setOpenValues] = useControllable(value, defaultValue, onValueChange);
  const ctx: AccordionContext = {
    isOpen: v => openValues.includes(v),
    toggle: (v, open) => {
      if (open) setOpenValues(multiple ? [...openValues.filter(x => x !== v), v] : [v]);
      else if (multiple || collapsible) setOpenValues(openValues.filter(x => x !== v));
    },
    headingLevel,
  };
  return (
    <Ctx.Provider value={ctx}>
      <div className={cx("mochi-accordion", className)} data-variant={variant} onKeyDown={onHeadersKeyDown}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export interface AccordionItemProps {
  /** Identidad de la sección dentro del acordeón. */
  value: string;
  title: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function AccordionItem({ value, title, icon, disabled, className, children }: AccordionItemProps) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AccordionItem must be rendered inside an Accordion");
  return (
    <Section
      title={title}
      icon={icon}
      open={ctx.isOpen(value)}
      onOpenChange={open => ctx.toggle(value, open)}
      disabled={disabled}
      headingLevel={ctx.headingLevel}
      className={className}
    >
      {children}
    </Section>
  );
}
