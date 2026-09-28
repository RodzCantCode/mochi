// Iconos de Mochi: cuadrícula de 24 y un único grosor de trazo (1,6 px reales a cualquier tamaño).
// Los de reproducción van rellenos, como es convención en controles multimedia.
import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Lado en px. */
  size?: number;
  /** Grosor de trazo en px reales (no en unidades de la cuadrícula). */
  strokeWidth?: number;
  /** Texto accesible; sin él, el icono es decorativo y se oculta a lectores de pantalla. */
  title?: string;
}

export const ICON_STROKE = 1.6;

function make(name: string, body: ReactNode, filled = false) {
  function Icon({ size = 20, strokeWidth = ICON_STROKE, title, ...rest }: IconProps) {
    const sw = (strokeWidth * 24) / size;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? (0.9 * 24) / size : sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
        focusable="false"
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {body}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const ArrowRightIcon = make("ArrowRightIcon", <path d="M5 12h14M13 6l6 6-6 6" />);
export const CheckIcon = make("CheckIcon", <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />);
export const SearchIcon = make("SearchIcon", <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></>);
export const PlusIcon = make("PlusIcon", <path d="M12 5v14M5 12h14" />);
export const UserPlusIcon = make("UserPlusIcon", <><circle cx="9.5" cy="8" r="3.5" /><path d="M3 19.5c.6-3.2 3.2-5.5 6.5-5.5s5.9 2.3 6.5 5.5M19 8.5v6M16 11.5h6" /></>);
export const FileIcon = make("FileIcon", <><path d="M6.5 3.5h7.5l4 4v13h-11.5z" /><path d="M13.5 3.5v4.5h4.5M9.5 13h5M9.5 16.5h5" /></>);
export const SaveIcon = make("SaveIcon", <><path d="M5 4h11.5L20 7.5V20H5z" /><path d="M8.5 4v4.5h6.5V4M8.5 20v-6h7v6" /></>);
export const SlidersIcon = make("SlidersIcon", <><path d="M4 7.5h9.5M18.5 7.5H20M4 16.5h3.5M12.5 16.5H20" /><circle cx="16" cy="7.5" r="2.4" /><circle cx="10" cy="16.5" r="2.4" /></>);
export const CheckCircleIcon = make("CheckCircleIcon", <><circle cx="12" cy="12" r="9" /><path d="m8.4 12.3 2.5 2.5 4.8-5.1" /></>);
export const CommandIcon = make("CommandIcon", <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />);
export const EnterIcon = make("EnterIcon", <><path d="M9 10.5 5 14.5l4 4" /><path d="M19 5v6.5a3 3 0 0 1-3 3H5.5" /></>);
export const CloseIcon = make("CloseIcon", <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />);

export const PlayIcon = make("PlayIcon", <path d="M7 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1l-11-6.8a.6.6 0 0 0-.9.5z" />, true);
export const PauseIcon = make("PauseIcon", <><path d="M6.5 5h3.5v14H6.5z" /><path d="M14 5h3.5v14H14z" /></>, true);
export const PreviousIcon = make("PreviousIcon", <><path d="M6 6.2h2.2v11.6H6z" /><path d="M19.5 6.6v10.8L10.2 12z" /></>, true);
export const NextIcon = make("NextIcon", <><path d="M15.8 6.2H18v11.6h-2.2z" /><path d="M4.5 6.6v10.8l9.3-5.4z" /></>, true);

/** Altavoz con 0 a 3 ondas según `level` (0–1). Las ondas aparecen con un fundido corto. */
export function VolumeIcon({ level = 1, size = 22, strokeWidth = ICON_STROKE, title, ...rest }: IconProps & { level?: number }) {
  const sw = (strokeWidth * 24) / size;
  const on = (a: number, b: number) => Math.min(1, Math.max(0, (level - a) / (b - a)));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} focusable="false" {...rest}>
      {title ? <title>{title}</title> : null}
      <path d="M11 5 6.5 9H3.5v6h3l4.5 4z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" opacity={on(0.02, 0.1)} />
      <path d="M17.6 7a7 7 0 0 1 0 10" opacity={on(0.38, 0.48)} />
      <path d="M20.2 4.5a10.5 10.5 0 0 1 0 15" opacity={on(0.72, 0.82)} />
    </svg>
  );
}
