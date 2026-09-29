// Páginas de Studio: la lista de proyectos, un proyecto (resumen, pistas y ajustes), los ajustes
// de la cuenta y la ayuda. Cada una usa los componentes de Mochi como en una app de verdad.
import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionItem,
  ArrowRightIcon,
  Button,
  ChartCard,
  Checkbox,
  Collapsible,
  CommandPaletteTrigger,
  ContextMenu,
  CopyIcon,
  Dialog,
  Drawer,
  Menu,
  MoreIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Popover,
  Presence,
  PresenceGroup,
  Progress,
  ProgressRing,
  RadioGroup,
  ReorderList,
  SearchIcon,
  Select,
  ShareIcon,
  Skeleton,
  SkeletonSwap,
  Slider,
  SlidersIcon,
  Switch,
  Tabs,
  TextField,
  Tooltip,
  TrashIcon,
  VolumeIcon,
  formatTime,
  toast,
  useButtonStatus,
  type MenuEntry,
} from "../../src/index.js";
import { wait } from "../demos.js";
import { GENRES, PLAYS, STATUS_LABEL, ago, cover, newId, type Project, type Status } from "./data.js";
import { go, useStudio } from "./state.js";

// ---------------------------------------------------------------------------------------
// Piezas comunes

function StatusChip({ status }: { status: Status }) {
  return (
    <span className="studio-status" data-status={status}>
      <span className="studio-status__dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Cover({ hue, size = 48 }: { hue: number; size?: number }) {
  return <span className="studio-cover" style={{ width: size, height: size, background: cover(hue) }} aria-hidden="true" />;
}

/** Confirmación de borrar un proyecto: crece desde el botón que la abre. */
function DeleteDialog({ project, onClose, onDeleted }: { project: Project | null; onClose: () => void; onDeleted?: () => void }) {
  const s = useStudio();
  const del = useButtonStatus(() => wait(700));
  // el nombre se queda mientras la ventana se cierra
  const [shown, setShown] = useState(project);
  if (project && project !== shown) setShown(project);
  return (
    <Dialog
      open={project !== null}
      onOpenChange={o => !o && onClose()}
      role="alertdialog"
      title={`Delete “${shown?.name ?? ""}”?`}
      description={`Its ${shown?.tracks.length ?? 0} tracks will be removed for everyone. You can undo it for a few seconds.`}
      actions={
        <>
          <Button variant="surface" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            status={del.status}
            onClick={() =>
              del.run().then(() => {
                if (shown) s.remove(shown.id);
                onClose();
                onDeleted?.();
              })
            }
          >
            Delete
          </Button>
        </>
      }
    />
  );
}

/** Renombrar: el foco empieza en el campo. */
function RenameDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const s = useStudio();
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState(project);
  if (project && project !== shown) {
    setShown(project);
    setDraft(project.name);
  }
  const empty = draft.trim() === "";
  const save = () => {
    if (!shown || empty) return;
    s.update(shown.id, { name: draft.trim() });
    onClose();
    toast("Project renamed");
  };
  return (
    <Dialog
      open={project !== null}
      onOpenChange={o => !o && onClose()}
      title="Rename project"
      actions={
        <>
          <Button variant="surface" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={empty}>
            Save
          </Button>
        </>
      }
    >
      <form
        onSubmit={e => {
          e.preventDefault();
          save();
        }}
      >
        <TextField label="Project name" value={draft} onValueChange={setDraft} error={empty ? "Give it a name" : undefined} />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------------------
// Proyectos

function ProjectsSkeleton() {
  return (
    <ul className="studio-projects" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <li key={i}>
          <div className="studio-project">
            <div className="studio-project__main">
              <Skeleton shape="block" width={48} height={48} />
              <span className="studio-project__text">
                <Skeleton width={`${46 - i * 6}%`} />
                <Skeleton width="30%" className="studio-small" />
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProjectRow({ p, onRename, onDelete }: { p: Project; onRename: (p: Project) => void; onDelete: (p: Project) => void }) {
  const s = useStudio();
  const actions: MenuEntry[] = [
    { id: "open", label: "Open", icon: <ArrowRightIcon size={18} />, onSelect: () => go(`demo/p/${p.id}`) },
    { id: "rename", label: "Rename", icon: <PencilIcon size={18} />, onSelect: () => onRename(p) },
    { id: "duplicate", label: "Duplicate", icon: <CopyIcon size={18} />, onSelect: () => s.duplicate(p.id) },
    { type: "separator" },
    { id: "delete", label: "Delete", icon: <TrashIcon size={18} />, destructive: true, onSelect: () => onDelete(p) },
  ];
  return (
    <ContextMenu items={actions} label={`Actions for ${p.name}`}>
      <div className="studio-project">
        <a className="studio-project__main" href={`#/demo/p/${p.id}`}>
          <Cover hue={p.hue} />
          <span className="studio-project__text">
            <b>{p.name}</b>
            <span className="studio-small">
              {p.artist} · {ago(p.edited)}
            </span>
          </span>
        </a>
        <StatusChip status={p.status} />
        <Tooltip content="More actions">
          <Menu items={actions} placement="bottom-end">
            <Button variant="surface" size="sm" iconOnly aria-label={`Actions for ${p.name}`}>
              <MoreIcon size={18} />
            </Button>
          </Menu>
        </Tooltip>
      </div>
    </ContextMenu>
  );
}

const ALL_STATUSES: Status[] = ["draft", "mixing", "released"];

export function ProjectsPage() {
  const s = useStudio();
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Status[]>(ALL_STATUSES);
  const [sort, setSort] = useState("recent");
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  // la primera vez que se entra, la lista «carga»
  const [loading, setLoading] = useState(!s.loaded);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      s.markLoaded();
    }, 1100);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = s.projects
    .filter(p => statuses.includes(p.status) && (p.name.toLowerCase().includes(q) || p.artist.toLowerCase().includes(q)))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : a.edited - b.edited));
  const filtered = statuses.length < ALL_STATUSES.length;

  return (
    <div className="studio-page">
      <header className="studio-head">
        <div className="studio-head__text">
          <h1>Projects</h1>
          <p>
            {s.projects.length} projects · {s.projects.reduce((n, p) => n + p.tracks.length, 0)} tracks
          </p>
        </div>
        <Button icon={<PlusIcon size={18} />} onClick={() => s.setNewOpen(true)}>
          New project
        </Button>
      </header>
      <div className="studio-toolbar">
        <div className="studio-toolbar__search">
          <TextField label="Search" icon={<SearchIcon size={20} />} placeholder="Name or artist" value={query} onValueChange={setQuery} />
        </div>
        <Popover
          label="Filter by status"
          title="Status"
          content={({ close }) => (
            <div className="studio-form">
              {ALL_STATUSES.map(st => (
                <Checkbox
                  key={st}
                  label={STATUS_LABEL[st]}
                  checked={statuses.includes(st)}
                  onCheckedChange={on => setStatuses(prev => (on ? [...prev, st] : prev.filter(x => x !== st)))}
                />
              ))}
              <div className="studio-form__actions">
                <Button
                  size="sm"
                  variant="surface"
                  onClick={() => {
                    setStatuses(ALL_STATUSES);
                    close();
                  }}
                >
                  Reset
                </Button>
                <Button size="sm" onClick={close}>
                  Done
                </Button>
              </div>
            </div>
          )}
        >
          <Button variant={filtered ? "solid" : "surface"} icon={<SlidersIcon size={18} />}>
            {filtered ? `Filters · ${statuses.length}` : "Filters"}
          </Button>
        </Popover>
        <Select
          size="sm"
          label="Sort by"
          value={sort}
          onValueChange={setSort}
          options={[
            { value: "recent", label: "Recently edited" },
            { value: "name", label: "Name" },
          ]}
        />
      </div>
      <SkeletonSwap loading={loading} skeleton={<ProjectsSkeleton />} loadingLabel="Loading projects">
        {visible.length ? (
          <PresenceGroup as="ul" itemAs="li" className="studio-projects" aria-label="Projects">
            {visible.map(p => (
              <ProjectRow key={p.id} p={p} onRename={setRenaming} onDelete={setDeleting} />
            ))}
          </PresenceGroup>
        ) : (
          <div className="studio-empty">
            <p>No projects match.</p>
            <Button
              variant="surface"
              size="sm"
              onClick={() => {
                setQuery("");
                setStatuses(ALL_STATUSES);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </SkeletonSwap>
      <RenameDialog project={renaming} onClose={() => setRenaming(null)} />
      <DeleteDialog project={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Un proyecto

const ACTIVITY = [
  "Ada renamed “Punch Cards”",
  "Grace left a comment on Afterglow",
  "Linus uploaded 3 stems",
  "Ada changed the cover",
  "Grace invited Linus",
  "Soft Machines exported a mix",
];

function Overview({ p }: { p: Project }) {
  const [range, setRange] = useState<keyof typeof PLAYS>("week");
  const series = PLAYS[range];
  return (
    <div className="studio-overview">
      <ChartCard
        label={`Plays of ${p.name}`}
        value={series.total}
        formatValue={v => Math.round(v).toLocaleString("en-US")}
        delta={series.delta}
        data={series.data}
        range={range}
        onRangeChange={r => setRange(r as keyof typeof PLAYS)}
        ranges={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
      />
      <Collapsible title="Recent activity" variant="plain" defaultOpen>
        <ul className="studio-activity">
          {ACTIVITY.map(a => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Collapsible>
    </div>
  );
}

function Tracks({ p }: { p: Project }) {
  const s = useStudio();
  // undefined: nada que subir; null: preparando; número: porcentaje
  const [upload, setUpload] = useState<number | null | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const start = () => {
    clearTimeout(timer.current);
    setUpload(null);
    let v = 0;
    const tick = () => {
      v = Math.min(100, v + 8 + Math.round(Math.random() * 14));
      setUpload(v);
      if (v < 100) {
        timer.current = setTimeout(tick, 360);
        return;
      }
      const n = p.tracks.length;
      s.update(p.id, x => ({ tracks: [...x.tracks, { id: newId("t"), title: `Stem ${n + 1}`, seconds: 120 + Math.round(Math.random() * 120) }] }));
      toast("Stem uploaded");
      timer.current = setTimeout(() => setUpload(undefined), 1400);
    };
    timer.current = setTimeout(tick, 1300);
  };
  const total = p.tracks.reduce((n, t) => n + t.seconds, 0);
  return (
    <div className="studio-tracks">
      <div className="studio-tracks__head">
        <span className="studio-small">
          {p.tracks.length} tracks · {formatTime(total)}
        </span>
        <Button variant="surface" size="sm" icon={<PlusIcon size={16} />} onClick={start} disabled={upload !== undefined}>
          Upload stem
        </Button>
      </div>
      <Presence show={upload !== undefined} collapse effect="rise">
        <div className="studio-upload">
          <ProgressRing value={upload ?? null} aria-label="Stem upload" />
          <div className="studio-upload__bar">
            <Progress value={upload ?? null} label={upload === null ? "Preparing stem…" : upload !== undefined && upload >= 100 ? "Uploaded" : "Uploading stem"} showValue />
          </div>
        </div>
      </Presence>
      {p.tracks.length ? (
        <ReorderList
          aria-label={`Tracks of ${p.name}`}
          items={p.tracks}
          getKey={t => t.id}
          getLabel={t => t.title}
          onReorder={tracks => s.update(p.id, { tracks })}
          renderItem={(t, { handle }) => {
            const current = s.playing?.trackId === t.id;
            const on = current && s.isPlaying;
            return (
              <div className="studio-track" data-current={current || undefined}>
                {handle}
                <Tooltip content={on ? "Pause" : "Play"}>
                  <button type="button" className="studio-track__play" aria-label={`${on ? "Pause" : "Play"} ${t.title}`} onClick={() => s.play(p.id, t.id)}>
                    {on ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                  </button>
                </Tooltip>
                <span className="studio-track__title">{t.title}</span>
                <span className="studio-track__time">{formatTime(t.seconds)}</span>
              </div>
            );
          }}
        />
      ) : (
        <p className="studio-empty">No tracks yet. Upload a stem to start.</p>
      )}
    </div>
  );
}

function ProjectSettings({ p, onDelete }: { p: Project; onDelete: () => void }) {
  const s = useStudio();
  return (
    <Accordion multiple defaultValue={["general"]} className="studio-accordion">
      <AccordionItem value="general" title="General">
        <div className="studio-form">
          <TextField label="Project name" value={p.name} onValueChange={name => name.trim() && s.update(p.id, { name })} />
          <Select label="Genre" value={p.genre} onValueChange={genre => s.update(p.id, { genre })} options={GENRES.map(g => ({ value: g, label: g }))} />
          <Select
            label="Status"
            value={p.status}
            onValueChange={status => s.update(p.id, { status: status as Status })}
            options={(Object.keys(STATUS_LABEL) as Status[]).map(st => ({ value: st, label: STATUS_LABEL[st] }))}
          />
        </div>
      </AccordionItem>
      <AccordionItem value="sharing" title="Sharing">
        <div className="studio-form">
          <label className="setting-row">
            <span>Public link</span>
            <Switch size="sm" checked={p.publicLink} onCheckedChange={publicLink => s.update(p.id, { publicLink })} aria-label="Public link" />
          </label>
          <RadioGroup
            label="Who can comment"
            size="sm"
            value={p.comments}
            onValueChange={c => s.update(p.id, { comments: c as Project["comments"] })}
            options={[
              { value: "everyone", label: "Anyone with the link" },
              { value: "team", label: "Only the team" },
              { value: "nobody", label: "Nobody" },
            ]}
          />
        </div>
      </AccordionItem>
      <AccordionItem value="danger" title="Delete project">
        <p className="studio-small">The project and its tracks are removed for everyone.</p>
        <div className="studio-form__actions studio-form__actions--start">
          <Button variant="danger" size="sm" icon={<TrashIcon size={16} />} onClick={onDelete}>
            Delete project
          </Button>
        </div>
      </AccordionItem>
    </Accordion>
  );
}

function ShareContent({ p, close }: { p: Project; close: () => void }) {
  const s = useStudio();
  const link = `https://studio.example/${p.id}`;
  return (
    <div className="studio-form studio-share">
      <label className="setting-row">
        <span>Public link</span>
        <Switch size="sm" checked={p.publicLink} onCheckedChange={publicLink => s.update(p.id, { publicLink })} aria-label="Public link" />
      </label>
      <Presence show={p.publicLink} collapse>
        <div className="studio-share__link">
          <span className="studio-share__url">{link}</span>
          <Tooltip content="Copy link">
            <Button
              size="sm"
              iconOnly
              aria-label="Copy link"
              onClick={() => {
                void navigator.clipboard?.writeText(link).catch(() => {});
                close();
                toast("Link copied");
              }}
            >
              <CopyIcon size={16} />
            </Button>
          </Tooltip>
        </div>
      </Presence>
    </div>
  );
}

function EditDrawer({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useStudio();
  const [name, setName] = useState(p.name);
  const [artist, setArtist] = useState(p.artist);
  const [genre, setGenre] = useState(p.genre);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(p.name);
      setArtist(p.artist);
      setGenre(p.genre);
    }
  }
  const empty = name.trim() === "";
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Edit details"
      description="Changes are shared with everyone on the project."
      actions={
        <>
          <Button variant="surface" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={empty}
            onClick={() => {
              s.update(p.id, { name: name.trim(), artist: artist.trim() || p.artist, genre });
              onOpenChange(false);
              toast("Details saved");
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="studio-form">
        <TextField label="Name" value={name} onValueChange={setName} error={empty ? "Give it a name" : undefined} />
        <TextField label="Artist" value={artist} onValueChange={setArtist} />
        <Select label="Genre" value={genre} onValueChange={setGenre} options={GENRES.map(g => ({ value: g, label: g }))} />
      </div>
    </Drawer>
  );
}

export function ProjectPage({ id }: { id: string }) {
  const s = useStudio();
  const p = s.projects.find(x => x.id === id);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  if (!p) {
    return (
      <div className="studio-page studio-empty">
        <p>This project doesn’t exist anymore.</p>
        <Button variant="surface" onClick={() => go("demo")}>
          Back to projects
        </Button>
      </div>
    );
  }
  return (
    <div className="studio-page">
      <a className="studio-back" href="#/demo">
        <ArrowRightIcon size={16} className="studio-back__icon" />
        Projects
      </a>
      <header className="studio-head">
        <Cover hue={p.hue} size={64} />
        <div className="studio-head__text">
          <h1>{p.name}</h1>
          <p>
            {p.artist} · {p.genre} · <StatusChip status={p.status} />
          </p>
        </div>
        <div className="studio-head__actions">
          <Tooltip content="Share">
            <Popover label="Share" title="Share project" placement="bottom-end" content={({ close }) => <ShareContent p={p} close={close} />}>
              <Button variant="surface" iconOnly aria-label="Share">
                <ShareIcon size={18} />
              </Button>
            </Popover>
          </Tooltip>
          <Tooltip content="Edit details">
            <Button variant="surface" iconOnly aria-label="Edit details" onClick={() => setEditing(true)}>
              <PencilIcon size={18} />
            </Button>
          </Tooltip>
        </div>
      </header>
      <Tabs
        aria-label="Project"
        items={[
          { value: "overview", label: "Overview", content: <Overview p={p} /> },
          { value: "tracks", label: "Tracks", content: <Tracks p={p} /> },
          { value: "settings", label: "Settings", content: <ProjectSettings p={p} onDelete={() => setDeleting(p)} /> },
        ]}
      />
      <EditDrawer p={p} open={editing} onOpenChange={setEditing} />
      <DeleteDialog project={deleting} onClose={() => setDeleting(null)} onDeleted={() => go("demo")} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Ajustes de la cuenta

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NOTIFY = [
  { id: "comments", label: "Comments on my tracks" },
  { id: "mentions", label: "Mentions" },
  { id: "digest", label: "Weekly digest" },
];

export function SettingsPage() {
  const [name, setName] = useState("Ada Lovelace");
  const [email, setEmail] = useState("ada@studio.example");
  const [touched, setTouched] = useState(false);
  const [notify, setNotify] = useState(["comments", "mentions"]);
  const [density, setDensity] = useState("comfortable");
  const [volume, setVolume] = useState(70);
  const [autoplay, setAutoplay] = useState(true);
  const save = useButtonStatus(() => wait(900));
  const emailOk = EMAIL.test(email);
  const all = notify.length === NOTIFY.length ? true : notify.length ? "indeterminate" : false;
  return (
    <div className="studio-page">
      <header className="studio-head">
        <div className="studio-head__text">
          <h1>Settings</h1>
          <p>Your account and how Studio behaves.</p>
        </div>
      </header>
      <form
        className="studio-settings"
        noValidate
        onSubmit={e => {
          e.preventDefault();
          setTouched(true);
          if (!emailOk) {
            e.currentTarget.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
            return;
          }
          save.run().then(() => toast("Settings saved"));
        }}
      >
        <section className="studio-card">
          <h2>Profile</h2>
          <div className="studio-form">
            <TextField label="Name" name="name" value={name} onValueChange={setName} autoComplete="name" />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={email}
              onValueChange={setEmail}
              onBlur={() => setTouched(true)}
              error={touched && !emailOk ? "Enter a valid email address" : undefined}
              valid={touched && emailOk}
              autoComplete="email"
            />
          </div>
        </section>
        <section className="studio-card">
          <h2>Notifications</h2>
          <div className="studio-form">
            <Checkbox label="Email me about" checked={all} onCheckedChange={on => setNotify(on ? NOTIFY.map(n => n.id) : [])} />
            <div className="studio-indent">
              {NOTIFY.map(n => (
                <Checkbox key={n.id} label={n.label} checked={notify.includes(n.id)} onCheckedChange={on => setNotify(p => (on ? [...p, n.id] : p.filter(x => x !== n.id)))} />
              ))}
            </div>
          </div>
        </section>
        <section className="studio-card">
          <h2>Playback</h2>
          <div className="studio-form">
            <label className="setting-row">
              <span>Autoplay the next track</span>
              <Switch size="sm" checked={autoplay} onCheckedChange={setAutoplay} aria-label="Autoplay the next track" />
            </label>
            <div className="studio-field-label" id="studio-volume">
              Preview volume
            </div>
            <Slider aria-labelledby="studio-volume" value={volume} onValueChange={setVolume} icon={f => <VolumeIcon level={f} />} formatValue={v => `${v}%`} />
            <RadioGroup
              label="Density"
              size="sm"
              orientation="horizontal"
              value={density}
              onValueChange={setDensity}
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
                { value: "spacious", label: "Spacious" },
              ]}
            />
          </div>
        </section>
        <div className="studio-form__actions">
          <Button type="submit" size="lg" status={save.status}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Ayuda

const FAQ = [
  { value: "stems", title: "What formats can I upload?", body: "WAV, AIFF and FLAC up to 2 GB per file. Stems are converted to 48 kHz on upload; the originals are kept." },
  { value: "share", title: "Who can hear a project?", body: "Only the team, unless you turn on the public link in the project settings. Anyone with the link can listen, and you choose who can comment." },
  { value: "order", title: "How do I change the track order?", body: "Open the project, go to Tracks and drag a track by its handle, or focus the handle and use Space and the arrow keys." },
  { value: "undo", title: "I deleted a project by mistake", body: "Press Undo on the notice that appears right after deleting it. After that, contact us within 30 days." },
];

export function HelpPage() {
  const s = useStudio();
  return (
    <div className="studio-page">
      <header className="studio-head">
        <div className="studio-head__text">
          <h1>Help</h1>
          <p>Answers to the questions we hear most.</p>
        </div>
      </header>
      <Accordion defaultValue={["stems"]} className="studio-accordion">
        {FAQ.map(f => (
          <AccordionItem key={f.value} value={f.value} title={f.title}>
            <p>{f.body}</p>
          </AccordionItem>
        ))}
      </Accordion>
      <div className="studio-card studio-help">
        <p>Looking for something else? Jump anywhere with the command palette.</p>
        <CommandPaletteTrigger onClick={() => s.setPaletteOpen(true)}>Search Studio</CommandPaletteTrigger>
      </div>
    </div>
  );
}
