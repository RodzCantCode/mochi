// Página de colores: cada valor de los dos temas, uno al lado del otro, con su uso.
import { Fragment } from "react";
import { colors } from "../src/tokens.js";

type ColorName = keyof (typeof colors)["light"];

const GROUPS: Array<{ title: string; names: ColorName[] }> = [
  { title: "Lienzo", names: ["canvas", "on-canvas", "on-canvas-muted"] },
  { title: "Forma", names: ["solid", "on-solid", "on-solid-muted", "solid-subtle", "solid-border"] },
  { title: "Superficie", names: ["surface", "on-surface", "on-surface-muted", "surface-border", "surface-border-strong"] },
  { title: "Relleno y bolita", names: ["fill", "on-fill", "thumb", "on-thumb", "on-thumb-muted"] },
  { title: "Acento matcha", names: ["accent", "on-accent", "accent-strong", "focus-ring"] },
  { title: "Error", names: ["danger", "on-danger", "danger-strong"] },
  { title: "Fondo de superposiciones", names: ["scrim"] },
];

export function ColorsPage() {
  return (
    <div className="colors">
      {(["light", "dark"] as const).map(theme => (
        <section key={theme} className="colors__theme" data-theme={theme}>
          <h2>{theme === "light" ? "Claro" : "Oscuro"}</h2>
          {GROUPS.map(g => (
            <div key={g.title} className="colors__group">
              <h3>{g.title}</h3>
              <div className="colors__grid">
                {g.names.map(n => (
                  <div key={n} className="swatch">
                    <span className="swatch__chip" style={{ background: `var(--mochi-${n})` }} />
                    <span className="swatch__name">{n}</span>
                    {/* si no cabe, se parte solo tras una coma (no en mitad de un número) */}
                    <span className="swatch__value">
                      {colors[theme][n].split(",").map((part, i) => (
                        <Fragment key={i}>
                          {i > 0 ? (
                            <>
                              ,<wbr />
                            </>
                          ) : null}
                          {part}
                        </Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="colors__sample">
            <span className="sample sample--accent">Upgrade</span>
            <span className="sample sample--danger">Delete</span>
            <span className="sample sample--solid">
              <span className="sample__dot" /> Matcha
            </span>
            <span className="sample__text">Something went wrong</span>
          </div>
        </section>
      ))}
    </div>
  );
}
