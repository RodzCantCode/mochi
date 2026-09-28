// Generado por scripts/build-tokens.mjs desde tokens/*.json. No editar a mano.
export const colors = {
  "light": {
    "canvas": "#EAE7E2",
    "on-canvas": "#0D0D0E",
    "on-canvas-muted": "rgba(13,13,14,0.62)",
    "solid": "#0D0D0E",
    "on-solid": "#FFFFFF",
    "on-solid-muted": "rgba(255,255,255,0.62)",
    "solid-subtle": "rgba(255,255,255,0.10)",
    "solid-border": "rgba(255,255,255,0)",
    "surface": "#FFFFFF",
    "on-surface": "#0D0D0E",
    "on-surface-muted": "rgba(13,13,14,0.58)",
    "surface-border": "rgba(13,13,14,0.08)",
    "surface-border-strong": "rgba(13,13,14,0.16)",
    "fill": "#0D0D0E",
    "on-fill": "#FFFFFF",
    "thumb": "#FFFFFF",
    "on-thumb": "#0D0D0E",
    "on-thumb-muted": "rgba(13,13,14,0.58)",
    "accent": "#1F6BFF",
    "on-accent": "#FFFFFF",
    "focus-ring": "#1F6BFF",
    "scrim": "rgba(234,231,226,0.55)"
  },
  "dark": {
    "canvas": "#0F0F0E",
    "on-canvas": "#F4F2EE",
    "on-canvas-muted": "rgba(244,242,238,0.62)",
    "solid": "#262624",
    "on-solid": "#F4F2EE",
    "on-solid-muted": "rgba(244,242,238,0.62)",
    "solid-subtle": "rgba(255,255,255,0.08)",
    "solid-border": "rgba(255,255,255,0.07)",
    "surface": "#1B1B1A",
    "on-surface": "#F4F2EE",
    "on-surface-muted": "rgba(244,242,238,0.62)",
    "surface-border": "rgba(255,255,255,0.08)",
    "surface-border-strong": "rgba(255,255,255,0.18)",
    "fill": "#F4F2EE",
    "on-fill": "#0D0D0E",
    "thumb": "#FFFFFF",
    "on-thumb": "#0D0D0E",
    "on-thumb-muted": "rgba(13,13,14,0.58)",
    "accent": "#1F6BFF",
    "on-accent": "#FFFFFF",
    "focus-ring": "#6F9DFF",
    "scrim": "rgba(15,15,14,0.6)"
  }
} as const;
export const fontFamilies = {
  "sans": "\"Geist\", \"Geist Fallback\", system-ui, -apple-system, \"Segoe UI\", sans-serif",
  "mono": "\"Geist Mono\", ui-monospace, \"SF Mono\", Menlo, monospace"
} as const;
export const text = {
  "caption": {
    "family": "sans",
    "fontSize": "11px",
    "lineHeight": "14px",
    "fontWeight": 480
  },
  "label": {
    "family": "sans",
    "fontSize": "13px",
    "lineHeight": "16px",
    "fontWeight": 520
  },
  "body": {
    "family": "sans",
    "fontSize": "15px",
    "lineHeight": "20px",
    "fontWeight": 500
  },
  "body-lg": {
    "family": "sans",
    "fontSize": "16px",
    "lineHeight": "22px",
    "fontWeight": 500
  },
  "title": {
    "family": "sans",
    "fontSize": "18px",
    "lineHeight": "24px",
    "fontWeight": 600
  },
  "display": {
    "family": "sans",
    "fontSize": "32px",
    "lineHeight": "36px",
    "fontWeight": 620
  }
} as const;
export const space = {
  "space-1": "4px",
  "space-2": "8px",
  "space-3": "12px",
  "space-4": "16px",
  "space-5": "20px",
  "space-6": "24px",
  "space-8": "32px"
} as const;
export const radius = {
  "radius-xs": "6px",
  "radius-sm": "10px",
  "radius-md": "14px",
  "radius-lg": "22px",
  "radius-xl": "32px",
  "radius-full": "9999px"
} as const;
export const shadow = {
  "shadow-surface": "0 1px 1.5px rgba(0,0,0,0.06), 0 10px 28px -10px rgba(0,0,0,0.18)",
  "shadow-thumb": "0 1px 2px rgba(0,0,0,0.18), 0 3px 8px rgba(0,0,0,0.10)",
  "shadow-pop": "0 6px 16px rgba(0,0,0,0.25)",
  "shadow-overlay": "0 24px 60px -12px rgba(0,0,0,0.30), 0 2px 6px rgba(0,0,0,0.08)"
} as const;
export const springs = {
  "morph": {
    "response": 0.42,
    "damping": 0.86
  },
  "snappy": {
    "response": 0.26,
    "damping": 0.88
  },
  "press": {
    "response": 0.14,
    "damping": 0.95
  },
  "lead": {
    "response": 0.2,
    "damping": 0.86
  },
  "trail": {
    "response": 0.42,
    "damping": 0.88
  },
  "fadeIn": {
    "response": 0.24,
    "damping": 1
  },
  "fadeOut": {
    "response": 0.13,
    "damping": 1
  },
  "draw": {
    "response": 0.62,
    "damping": 1
  },
  "back": {
    "response": 0.34,
    "damping": 0.84
  },
  "color": {
    "response": 0.3,
    "damping": 1
  }
} as const;
export const swap = {
  "enterDelay": 0.06,
  "blur": 12,
  "enterScale": 0.94
} as const;
export type ThemeName = keyof typeof colors;
export type ColorToken = keyof (typeof colors)["light"];
export type SpringName = keyof typeof springs;
