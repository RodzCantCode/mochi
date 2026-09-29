// Estado de Studio: los proyectos, lo que suena, y lo que se abre desde cualquier sitio (el
// diálogo de proyecto nuevo y la paleta ⌘K). Está por encima de la barra
// lateral y del contenido, porque los dos lo usan.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "../../src/index.js";
import { SEED, TEMPLATES, newId, type Project, type Track } from "./data.js";

/** Navegar dentro de la app (rutas de hash: #/demo, #/demo/p/<id>, #/demo/settings…). */
export const go = (path: string) => {
  location.hash = `#/${path}`;
};

export interface Playing {
  projectId: string;
  trackId: string;
}

interface StudioState {
  projects: Project[];
  update: (id: string, patch: Partial<Project> | ((p: Project) => Partial<Project>)) => void;
  create: (name: string, template: string) => Project;
  duplicate: (id: string) => void;
  /** Lo quita y ofrece deshacerlo en un aviso. */
  remove: (id: string) => void;
  /** La lista de proyectos ya cargó una vez (el esqueleto solo sale la primera). */
  loaded: boolean;
  markLoaded: () => void;
  playing: Playing | null;
  isPlaying: boolean;
  time: number;
  play: (projectId: string, trackId: string) => void;
  setIsPlaying: (on: boolean) => void;
  seek: (t: number) => void;
  step: (dir: 1 | -1) => void;
  newOpen: boolean;
  setNewOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const Ctx = createContext<StudioState | null>(null);

export function useStudio(): StudioState {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStudio fuera de StudioProvider");
  return s;
}

export const findTrack = (projects: Project[], p: Playing | null): { project: Project; track: Track } | null => {
  const project = p ? projects.find(x => x.id === p.projectId) : undefined;
  const track = project?.tracks.find(x => x.id === p!.trackId);
  return project && track ? { project, track } : null;
};

export function StudioProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(SEED);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const update = (id: string, patch: Partial<Project> | ((p: Project) => Partial<Project>)) =>
    setProjects(ps => ps.map(p => (p.id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch), edited: 0 } : p)));

  const create = (name: string, template: string) => {
    const p: Project = {
      id: newId("p"),
      name,
      artist: "You",
      status: "draft",
      genre: "Synth-pop",
      edited: 0,
      hue: Math.round(Math.random() * 360),
      publicLink: false,
      comments: "team",
      tracks: (TEMPLATES[template] ?? []).map(title => ({ id: newId("t"), title, seconds: 90 + Math.round(Math.random() * 150) })),
    };
    setProjects(ps => [p, ...ps]);
    return p;
  };

  const duplicate = (id: string) => {
    const src = projectsRef.current.find(p => p.id === id);
    if (!src) return;
    const copy: Project = { ...src, id: newId("p"), name: `${src.name} copy`, edited: 0, tracks: src.tracks.map(t => ({ ...t, id: newId("t") })) };
    setProjects(ps => {
      const i = ps.findIndex(p => p.id === id);
      const next = ps.slice();
      next.splice(i + 1, 0, copy);
      return next;
    });
    toast(`Duplicated “${src.name}”`);
  };

  const remove = (id: string) => {
    const list = projectsRef.current;
    const i = list.findIndex(p => p.id === id);
    const gone = list[i];
    if (!gone) return;
    setProjects(ps => ps.filter(p => p.id !== id));
    if (playing?.projectId === id) {
      setPlaying(null);
      setIsPlaying(false);
    }
    toast({
      title: `Deleted “${gone.name}”`,
      action: {
        label: "Undo",
        onClick: () =>
          setProjects(ps => {
            if (ps.some(p => p.id === id)) return ps;
            const next = ps.slice();
            next.splice(Math.min(i, next.length), 0, gone);
            return next;
          }),
      },
    });
  };

  const play = (projectId: string, trackId: string) => {
    if (playing?.projectId === projectId && playing.trackId === trackId) {
      setIsPlaying(!isPlaying);
      return;
    }
    setPlaying({ projectId, trackId });
    setTime(0);
    setIsPlaying(true);
  };

  const step = (dir: 1 | -1) => {
    const now = findTrack(projectsRef.current, playing);
    if (!now) return;
    const list = now.project.tracks;
    const i = list.findIndex(t => t.id === now.track.id);
    const next = list[(i + dir + list.length) % list.length];
    if (next) {
      setPlaying({ projectId: now.project.id, trackId: next.id });
      setTime(0);
    }
  };

  // el reloj de lo que suena; al acabar una pista pasa a la siguiente
  const current = findTrack(projects, playing);
  const duration = current?.track.seconds ?? 0;
  useEffect(() => {
    if (!isPlaying || !duration) return;
    const id = setInterval(() => setTime(t => (t + 0.25 >= duration ? 0 : t + 0.25)), 250);
    return () => clearInterval(id);
  }, [isPlaying, duration]);

  const value: StudioState = {
    projects,
    update,
    create,
    duplicate,
    remove,
    loaded,
    markLoaded: () => setLoaded(true),
    playing,
    isPlaying,
    time,
    play,
    setIsPlaying,
    seek: setTime,
    step,
    newOpen,
    setNewOpen,
    paletteOpen,
    setPaletteOpen,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
