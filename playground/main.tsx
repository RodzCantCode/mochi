// Sitio de pruebas de Mochi: una portada con todos los componentes y una página por
// componente, con tema claro, oscuro o del sistema, y Studio, una app de demostración que los usa
// juntos (selector «Lista | Demo»). `npm run dev` lo abre en http://localhost:5178. No forma
// parte del paquete.
import { StrictMode, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/tokens.css";
import "../src/styles/components.css";
import "./playground.css";
import "./studio/studio.css";
import {
  Button,
  CommandPalette,
  Drawer,
  FileIcon,
  PlusIcon,
  SaveIcon,
  SegmentedControl,
  SlidersIcon,
  Toaster,
  Tooltip,
  UserPlusIcon,
  toast,
  useCommandK,
  type Command,
} from "../src/index.js";
import { GROUPS, PAGES, type PageContext } from "./pages.js";
import { ColorsPage } from "./colors.js";
import { CasePage } from "./cases.js";
import { ModeSwitch, StudioBar, StudioLinks, StudioMain, isDemoRoute } from "./studio/Studio.js";
import { StudioProvider, useStudio } from "./studio/state.js";

const THEME_KEY = "mochi-site-theme";

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) ?? "light";
  } catch {
    return "light";
  }
}

/** El tema elegido: se aplica a la página y se recuerda. */
function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* sin almacenamiento: el tema no se recuerda */
    }
  }, [theme]);
  return [theme, setTheme] as const;
}

/** «Light | Dark | System»: abajo de la columna lateral y, en móvil, abajo del panel lateral. */
function ThemePicker({ theme, onChange }: { theme: string; onChange: (theme: string) => void }) {
  return (
    <div className="theme">
      <SegmentedControl
        aria-label="Theme"
        size="sm"
        value={theme}
        onValueChange={onChange}
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

/** Los componentes: en la columna lateral y, en móvil, dentro del panel lateral. */
function ListLinks({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  return (
    <div className="nav__list">
      <div className="nav__group">
        <a href="#/" aria-current={current === "" ? "page" : undefined} onClick={onNavigate}>
          Todos
        </a>
        <a href="#/colors" aria-current={current === "colors" ? "page" : undefined} onClick={onNavigate}>
          Colores
        </a>
      </div>
      {GROUPS.map(g => (
        <div key={g} className="nav__group">
          <span className="nav__title">{g}</span>
          {PAGES.filter(p => p.group === g).map(p => (
            <a key={p.id} href={`#/${p.id}`} aria-current={current === p.id ? "page" : undefined} onClick={onNavigate}>
              {p.name}
              {p.isNew ? <span className="nav__new">nuevo</span> : null}
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}

function Nav({ current, onMode, theme }: { current: string; onMode: (demo: boolean) => void; theme: ReactNode }) {
  const demo = isDemoRoute(current);
  return (
    <nav className="nav" aria-label={demo ? "Studio" : "Components"} data-mode={demo ? "demo" : "list"}>
      <a className="nav__brand" href="#/">
        <span className="nav__logo" aria-hidden="true" />
        Mochi
      </a>
      <ModeSwitch demo={demo} onChange={onMode} />
      {demo ? <StudioLinks route={current} /> : <ListLinks current={current} />}
      {/* abajo del todo y siempre a la vista, aunque la lista se desplace */}
      <div className="nav__theme">{theme}</div>
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
  const demo = isDemoRoute(current);
  const studio = useStudio();
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  // la navegación en móvil: un panel lateral con los enlaces y el tema abajo
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => setNavOpen(false);
  // en «Demo», ⌘K abre la paleta de Studio
  useCommandK(() => !demo && setOpen(o => !o));
  // al cambiar de modo se vuelve a la última página de cada uno
  const lastList = useRef("");
  const lastDemo = useRef("demo");
  useEffect(() => {
    if (demo) lastDemo.current = current;
    else lastList.current = current;
  }, [current, demo]);
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
      <Nav
        current={current}
        onMode={d => (location.hash = `#/${d ? lastDemo.current : lastList.current}`)}
        theme={<ThemePicker theme={theme} onChange={setTheme} />}
      />
      <main className="main">
        <div className="bar" data-mode={demo ? "demo" : "list"}>
          <Tooltip content="Menu">
            <Button variant="surface" iconOnly aria-label="Open navigation" className="site-menu" onClick={() => setNavOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
                <path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" />
              </svg>
            </Button>
          </Tooltip>
          {demo ? <StudioBar /> : null}
        </div>
        {demo ? (
          <StudioMain route={current} />
        ) : current === "" ? (
          <Overview ctx={ctx} />
        ) : current === "colors" ? (
          <ColorsPage />
        ) : current.startsWith("_cases/") ? (
          <CasePage key={current} name={current.slice("_cases/".length)} />
        ) : (
          <ComponentPage key={current} id={current} ctx={ctx} />
        )}
      </main>
      <Drawer
        open={navOpen}
        onOpenChange={setNavOpen}
        side="left"
        width={300}
        title={demo ? "Studio" : "Componentes"}
        actions={
          <div className="nav-panel__theme">
            <ThemePicker theme={theme} onChange={setTheme} />
          </div>
        }
      >
        {demo ? (
          <StudioLinks route={current} onNavigate={closeNav} />
        ) : (
          <div className="nav-panel">
            <ListLinks current={current} onNavigate={closeNav} />
          </div>
        )}
      </Drawer>
      {demo ? null : <CommandPalette open={open} onOpenChange={setOpen} commands={commands} />}
      {/* con el reproductor abajo, los avisos salen por encima de él */}
      <Toaster offset={demo && studio.playing ? 96 : 24} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudioProvider>
      <App />
    </StudioProvider>
  </StrictMode>,
);
