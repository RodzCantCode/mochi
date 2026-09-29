// Studio: la app de demostración del sitio de pruebas. Un gestor de proyectos musicales que usa
// los componentes de Mochi juntos, como en un proyecto de verdad. En el sitio se elige con el
// selector «Lista | Demo»; en «Demo», la columna lateral es su navegación (en móvil, un panel
// lateral) y el contenido son sus páginas.
import { useState } from "react";
import {
  Button,
  CommandPalette,
  CommandPaletteTrigger,
  Dialog,
  Drawer,
  FileIcon,
  MediaPlayer,
  PlusIcon,
  Presence,
  RadioGroup,
  SearchIcon,
  SegmentedControl,
  SlidersIcon,
  TextField,
  Tooltip,
  toast,
  useButtonStatus,
  useCommandK,
  type Command,
} from "../../src/index.js";
import { wait } from "../demos.js";
import { cover } from "./data.js";
import { HelpPage, ProjectPage, ProjectsPage, SettingsPage } from "./pages.js";
import { findTrack, go, useStudio } from "./state.js";

export const isDemoRoute = (route: string) => route === "demo" || route.startsWith("demo/");

/** «Lista | Demo»: los componentes sueltos o la app. */
export function ModeSwitch({ demo, onChange }: { demo: boolean; onChange: (demo: boolean) => void }) {
  return (
    <div className="mode-switch">
      <SegmentedControl
        aria-label="View"
        size="sm"
        value={demo ? "demo" : "list"}
        onValueChange={v => onChange(v === "demo")}
        options={[
          { value: "list", label: "Lista" },
          { value: "demo", label: "Demo" },
        ]}
      />
    </div>
  );
}

/** La navegación de la app: en la columna lateral y, en móvil, dentro del panel lateral. */
export function StudioLinks({ route, onNavigate }: { route: string; onNavigate?: () => void }) {
  const s = useStudio();
  const recent = [...s.projects].sort((a, b) => a.edited - b.edited).slice(0, 4);
  const current = (href: string) => (route === href ? "page" : undefined);
  return (
    <div className="studio-links">
      <div className="studio-links__group">
        <a href="#/demo" aria-current={current("demo")} onClick={onNavigate}>
          Projects
          <span className="studio-links__count">{s.projects.length}</span>
        </a>
        <a href="#/demo/settings" aria-current={current("demo/settings")} onClick={onNavigate}>
          Settings
        </a>
        <a href="#/demo/help" aria-current={current("demo/help")} onClick={onNavigate}>
          Help
        </a>
      </div>
      <div className="studio-links__group">
        <span className="studio-links__title">Recent</span>
        {recent.map(p => (
          <a key={p.id} href={`#/demo/p/${p.id}`} aria-current={current(`demo/p/${p.id}`)} onClick={onNavigate}>
            <span className="studio-links__cover" style={{ background: cover(p.hue) }} aria-hidden="true" />
            <span className="studio-links__name">{p.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Lo que va arriba a la izquierda de la barra del sitio en «Demo»: el menú (móvil) y ⌘K. */
export function StudioBar() {
  const s = useStudio();
  return (
    <div className="studio-bar">
      <Tooltip content="Menu">
        <Button variant="surface" iconOnly aria-label="Open navigation" className="studio-bar__menu" onClick={() => s.setNavOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
            <path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" />
          </svg>
        </Button>
      </Tooltip>
      <CommandPaletteTrigger onClick={() => s.setPaletteOpen(true)}>Search</CommandPaletteTrigger>
    </div>
  );
}

function NewProjectDialog() {
  const s = useStudio();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("empty");
  const [tried, setTried] = useState(false);
  const [wasOpen, setWasOpen] = useState(s.newOpen);
  if (s.newOpen !== wasOpen) {
    setWasOpen(s.newOpen);
    if (s.newOpen) {
      setName("");
      setTemplate("empty");
      setTried(false);
    }
  }
  const create = useButtonStatus(() => wait(700));
  const empty = name.trim() === "";
  const submit = () => {
    setTried(true);
    if (empty || create.status !== "idle") return;
    create.run().then(() => {
      const p = s.create(name.trim(), template);
      s.setNewOpen(false);
      go("demo");
      toast({ title: `Created “${p.name}”`, action: { label: "Open", onClick: () => go(`demo/p/${p.id}`) } });
    });
  };
  return (
    <Dialog
      open={s.newOpen}
      onOpenChange={s.setNewOpen}
      title="New project"
      actions={
        <>
          <Button variant="surface" onClick={() => s.setNewOpen(false)}>
            Cancel
          </Button>
          <Button status={create.status} onClick={submit}>
            Create
          </Button>
        </>
      }
    >
      <form
        className="studio-form"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField label="Project name" value={name} onValueChange={setName} autoFocus error={tried && empty ? "Give it a name" : undefined} />
        <RadioGroup
          label="Start from"
          value={template}
          onValueChange={setTemplate}
          options={[
            { value: "empty", label: "Empty project" },
            { value: "band", label: "Band", description: "Intro, verse, chorus and bridge" },
            { value: "podcast", label: "Podcast", description: "Cold open, episode and credits" },
          ]}
        />
      </form>
    </Dialog>
  );
}

/** El reproductor, flotando abajo mientras suena algo. */
function PlayerDock() {
  const s = useStudio();
  const now = findTrack(s.projects, s.playing);
  return (
    <div className="studio-dock">
      <Presence show={now !== null} effect="rise" className="studio-dock__inner">
        {now ? (
          <MediaPlayer
            title={now.track.title}
            artist={now.project.name}
            artwork={<span className="studio-dock__art" style={{ background: cover(now.project.hue) }} />}
            duration={now.track.seconds}
            currentTime={s.time}
            onSeek={s.seek}
            playing={s.isPlaying}
            onPlayingChange={s.setIsPlaying}
            onPrevious={() => s.step(-1)}
            onNext={() => s.step(1)}
          />
        ) : null}
      </Presence>
    </div>
  );
}

export function StudioMain({ route }: { route: string }) {
  const s = useStudio();
  useCommandK(() => s.setPaletteOpen(!s.paletteOpen));
  const [, section, id] = route.split("/");
  const page =
    section === "p" && id ? <ProjectPage key={id} id={id} /> : section === "settings" ? <SettingsPage /> : section === "help" ? <HelpPage /> : <ProjectsPage />;

  const now = findTrack(s.projects, s.playing);
  const commands: Command[] = [
    { id: "new", label: "New project", icon: <PlusIcon size={18} />, onSelect: () => s.setNewOpen(true) },
    { id: "projects", label: "Go to Projects", icon: <FileIcon size={18} />, onSelect: () => go("demo") },
    { id: "settings", label: "Go to Settings", icon: <SlidersIcon size={18} />, keywords: ["preferences", "account"], onSelect: () => go("demo/settings") },
    { id: "help", label: "Go to Help", icon: <SearchIcon size={18} />, keywords: ["faq", "support"], onSelect: () => go("demo/help") },
    ...(now ? [{ id: "toggle", label: s.isPlaying ? `Pause ${now.track.title}` : `Play ${now.track.title}`, onSelect: () => s.setIsPlaying(!s.isPlaying) }] : []),
    ...s.projects.map(p => ({ id: `open-${p.id}`, label: `Open ${p.name}`, keywords: [p.artist, p.genre], onSelect: () => go(`demo/p/${p.id}`) })),
  ];

  return (
    <div className="studio">
      {page}
      <NewProjectDialog />
      <Drawer open={s.navOpen} onOpenChange={s.setNavOpen} side="left" width={300} title="Studio">
        <StudioLinks route={route} onNavigate={() => s.setNavOpen(false)} />
      </Drawer>
      <CommandPalette open={s.paletteOpen} onOpenChange={s.setPaletteOpen} commands={commands} />
      <PlayerDock />
    </div>
  );
}
