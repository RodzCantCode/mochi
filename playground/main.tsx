// Sitio de pruebas de Mochi: una portada con todos los componentes y una página por
// componente, con tema claro, oscuro o del sistema. `npm run dev` lo abre en
// http://localhost:5178. No forma parte del paquete.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/tokens.css";
import "../src/styles/components.css";
import "./playground.css";
import {
  CommandPalette,
  FileIcon,
  PlusIcon,
  SaveIcon,
  SegmentedControl,
  SlidersIcon,
  Toaster,
  UserPlusIcon,
  toast,
  useCommandK,
  type Command,
} from "../src/index.js";
import { GROUPS, PAGES, type PageContext } from "./pages.js";
import { ColorsPage } from "./colors.js";
import { CasePage } from "./cases.js";

const THEME_KEY = "mochi-site-theme";

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) ?? "light";
  } catch {
    return "light";
  }
}

function ThemePicker() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* sin almacenamiento: el tema no se recuerda */
    }
  }, [theme]);
  return (
    <div className="theme">
      <SegmentedControl
        aria-label="Theme"
        size="sm"
        value={theme}
        onValueChange={setTheme}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "System" },
        ]}
      />
    </div>
  );
}

const route = () => decodeURIComponent(location.hash.replace(/^#\/?/, ""));

function useRoute() {
  const [r, setR] = useState(route);
  useEffect(() => {
    const on = () => {
      setR(route());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}

function Nav({ current }: { current: string }) {
  return (
    <nav className="nav" aria-label="Components">
      <a className="nav__brand" href="#/">
        <span className="nav__logo" aria-hidden="true" />
        Mochi
      </a>
      <div className="nav__list">
        <div className="nav__group">
          <a href="#/" aria-current={current === "" ? "page" : undefined}>
            Todos
          </a>
          <a href="#/colors" aria-current={current === "colors" ? "page" : undefined}>
            Colores
          </a>
        </div>
        {GROUPS.map(g => (
          <div key={g} className="nav__group">
            <span className="nav__title">{g}</span>
            {PAGES.filter(p => p.group === g).map(p => (
              <a key={p.id} href={`#/${p.id}`} aria-current={current === p.id ? "page" : undefined}>
                {p.name}
                {p.isNew ? <span className="nav__new">nuevo</span> : null}
              </a>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

function Overview({ ctx }: { ctx: PageContext }) {
  return (
    <>
      <header className="head">
        <h1>Todos los componentes</h1>
        <p>Una sola forma que se transforma. Pulsa, arrastra y usa el teclado; cada tarjeta lleva a su página.</p>
      </header>
      <div className="grid">
        {PAGES.filter(p => p.overview).map(p => (
          <section key={p.id} className={`spec${p.sections[0]?.wide ? " wide" : ""}`} data-demo={p.id}>
            <h2>
              <a href={`#/${p.id}`}>{p.name}</a>
              {p.isNew ? <span className="nav__new">nuevo</span> : null}
            </h2>
            {p.overview!(ctx)}
          </section>
        ))}
      </div>
    </>
  );
}

function ComponentPage({ id, ctx }: { id: string; ctx: PageContext }) {
  const page = PAGES.find(p => p.id === id);
  if (!page) return <p className="hint">No hay ninguna página «{id}». Vuelve a <a href="#/">todos</a>.</p>;
  return (
    <>
      <header className="head">
        <h1>{page.name}</h1>
        <p>{page.summary}</p>
        {page.imports ? (
          <code className="import">
            import {"{"} {page.imports} {"}"} from "mochi-ui";
          </code>
        ) : null}
      </header>
      <div className="sections">
        {page.sections.map(s => (
          <section key={s.title} className="spec" data-demo={`${page.id}-${s.title.toLowerCase()}`}>
            <h2>{s.title}</h2>
            {s.hint ? <p className="spec__hint">{s.hint}</p> : null}
            {s.render(ctx)}
          </section>
        ))}
      </div>
    </>
  );
}

function App() {
  const current = useRoute();
  const [open, setOpen] = useState(false);
  useCommandK(() => setOpen(o => !o));
  const ctx: PageContext = { openPalette: setOpen };
  const commands: Command[] = [
    { id: "new", label: "New project", icon: <PlusIcon size={18} />, shortcut: ["mod", "N"], onSelect: () => toast("Project created") },
    { id: "invite", label: "Invite teammate", icon: <UserPlusIcon size={18} />, shortcut: ["mod", "I"], onSelect: () => toast("Invite sent") },
    { id: "docs", label: "Search docs", icon: <FileIcon size={18} />, shortcut: ["mod", "/"], onSelect: () => toast({ title: "Opening docs", icon: "none" }) },
    { id: "save", label: "Save changes", icon: <SaveIcon size={18} />, shortcut: ["mod", "S"], onSelect: () => toast({ title: "Changes saved", action: { label: "Undo", onClick: () => toast({ title: "Change undone", icon: "none" }) } }) },
    { id: "settings", label: "Settings", icon: <SlidersIcon size={18} />, shortcut: ["mod", ","], keywords: ["preferences"], onSelect: () => toast({ title: "Settings", icon: "none" }) },
  ];
  return (
    <div className="site">
      <Nav current={current} />
      <main className="main">
        <div className="bar">
          <ThemePicker />
        </div>
        {current === "" ? (
          <Overview ctx={ctx} />
        ) : current === "colors" ? (
          <ColorsPage />
        ) : current.startsWith("_cases/") ? (
          <CasePage key={current} name={current.slice("_cases/".length)} />
        ) : (
          <ComponentPage key={current} id={current} ctx={ctx} />
        )}
      </main>
      <CommandPalette open={open} onOpenChange={setOpen} commands={commands} />
      <Toaster />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
