// Datos de ejemplo de Studio, la app de demostración del sitio de pruebas: proyectos musicales
// con sus pistas. Todo vive en memoria; recargar la página lo devuelve a como empieza.

export type Status = "draft" | "mixing" | "released";

export interface Track {
  id: string;
  title: string;
  /** Duración en segundos. */
  seconds: number;
}

export interface Project {
  id: string;
  name: string;
  artist: string;
  status: Status;
  genre: string;
  /** Minutos desde el último cambio (para «Edited 2 hours ago» y el orden). */
  edited: number;
  /** Tono de la portada. */
  hue: number;
  publicLink: boolean;
  comments: "everyone" | "team" | "nobody";
  tracks: Track[];
}

export const STATUS_LABEL: Record<Status, string> = { draft: "Draft", mixing: "Mixing", released: "Released" };
export const GENRES = ["Synth-pop", "Ambient", "House", "Folk", "Soundtrack"];

let seq = 100;
export const newId = (prefix: string) => `${prefix}${++seq}`;

const t = (title: string, seconds: number): Track => ({ id: newId("t"), title, seconds });

export const SEED: Project[] = [
  {
    id: "night-drive",
    name: "Night Drive",
    artist: "Soft Machines",
    status: "mixing",
    genre: "Synth-pop",
    edited: 120,
    hue: 88,
    publicLink: true,
    comments: "team",
    tracks: [t("Night Drive", 192), t("Glass Harbour", 245), t("Paper Moons", 168), t("Afterglow", 217), t("Soft Machines", 301)],
  },
  {
    id: "field-notes",
    name: "Field Notes",
    artist: "Grace Hopper",
    status: "draft",
    genre: "Ambient",
    edited: 25,
    hue: 200,
    publicLink: false,
    comments: "everyone",
    tracks: [t("Morning Frost", 274), t("Low Tide", 331), t("Birdsong Loop", 142)],
  },
  {
    id: "analytical",
    name: "Analytical Engines",
    artist: "Ada Lovelace",
    status: "released",
    genre: "House",
    edited: 60 * 24 * 3,
    hue: 30,
    publicLink: true,
    comments: "everyone",
    tracks: [t("Punch Cards", 356), t("Difference", 298), t("Note G", 412), t("Bernoulli", 265)],
  },
  {
    id: "kernel",
    name: "Kernel Panic",
    artist: "Linus",
    status: "mixing",
    genre: "Soundtrack",
    edited: 60 * 7,
    hue: 330,
    publicLink: false,
    comments: "team",
    tracks: [t("Boot", 88), t("Segfault", 203), t("Recovery", 251)],
  },
  {
    id: "harbour",
    name: "Harbour Lights",
    artist: "Soft Machines",
    status: "draft",
    genre: "Folk",
    edited: 60 * 24 * 12,
    hue: 250,
    publicLink: false,
    comments: "nobody",
    tracks: [t("Harbour Lights", 233), t("Rope & Salt", 187)],
  },
];

export const TEMPLATES: Record<string, string[]> = {
  empty: [],
  band: ["Intro", "Verse", "Chorus", "Bridge"],
  podcast: ["Cold open", "Episode", "Credits"],
};

/** «2 hours ago», «3 days ago»… */
export function ago(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Portada: un degradado apagado del tono del proyecto. */
export const cover = (hue: number) => `linear-gradient(135deg, hsl(${hue} 32% 72%), hsl(${hue} 26% 44%))`;

/** Escuchas de ejemplo para la tarjeta de estadísticas (la base; cada proyecto la varía). */
export const PLAYS = {
  day: { total: 1_284, delta: "+6.2%", data: ["9", "11", "13", "15", "17", "19", "21", "23"].map((h, i) => ({ label: `${h}:00`, value: [40, 62, 88, 120, 150, 210, 260, 180][i]! })) },
  week: { total: 8_912, delta: "+11.8%", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({ label: d, value: [980, 1120, 1040, 1310, 1570, 1720, 1172][i]! })) },
  month: { total: 36_450, delta: "+24.5%", data: [5.1, 5.8, 6.4, 6.1, 7.3, 8.8, 9.6, 9.1, 10.4, 11.2].map((v, i) => ({ label: `Sep ${1 + i * 3}`, value: v * 100 })) },
};

export type PlaysRange = keyof typeof PLAYS;

/**
 * Las escuchas de un proyecto: la base escalada y con su propia forma, siempre igual para el
 * mismo proyecto (sale de su id), para que cada uno tenga sus cifras.
 */
export function playsFor(id: string, range: PlaysRange) {
  const seed = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
  const scale = 0.35 + (seed % 97) / 60;
  const base = PLAYS[range];
  const data = base.data.map((d, i) => ({ label: d.label, value: Math.round(d.value * scale * (1 + 0.22 * Math.sin(i * 1.3 + seed))) }));
  const change = ((seed * 7) % 260) / 10 + 1.5;
  return { total: Math.round(base.total * scale), delta: `+${change.toFixed(1)}%`, data };
}
