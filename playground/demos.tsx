// Demos conectadas de cada componente. Las usan la portada (todas juntas) y la página de cada
// componente. Sirven también como ejemplo de uso.
import { useEffect, useRef, useState } from "react";
import {
  type MenuEntry,
  Accordion,
  AccordionItem,
  AlertIcon,
  AutoHeight,
  CloseIcon,
  Collapsible,
  PlusIcon,
  Presence,
  PresenceGroup,
  SaveIcon,
  SlidersIcon,
  Tabs,
  UserPlusIcon,
  ArrowRightIcon,
  Button,
  ChartCard,
  ContextMenu,
  CopyIcon,
  Dialog,
  Menu,
  MoreIcon,
  PencilIcon,
  Select,
  ShareIcon,
  Tooltip,
  CommandPaletteTrigger,
  Kbd,
  MediaPlayer,
  SegmentedControl,
  Slider,
  Switch,
  TextField,
  TrashIcon,
  VolumeIcon,
  toast,
  useButtonStatus,
  type ChartPoint,
} from "../src/index.js";

export const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const dollars = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

const SERIES: Record<string, { total: number; delta: string; data: ChartPoint[] }> = {
  day: {
    total: 1840,
    delta: "+3.1%",
    data: ["9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"].map((h, i) => ({ label: `${h}:00`, value: [120, 180, 140, 210, 260, 190, 240, 310, 280, 350, 300, 380][i]! })),
  },
  week: {
    total: 11920,
    delta: "+8.7%",
    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({ label: d, value: [1400, 1650, 1520, 1880, 2100, 1700, 1670][i]! })),
  },
  month: {
    total: 48290,
    delta: "+12.4%",
    data: [8.2, 9.1, 8.6, 10.4, 9.8, 11.9, 12.4, 11.2, 13.8, 16.9, 15.2, 17.6].map((v, i) => ({ label: `Mar ${1 + Math.round(i * 2.55)}`, value: v * 1000 })),
  },
};

export function ButtonDemo() {
  const a = useButtonStatus(() => wait(1300));
  const b = useButtonStatus(() => wait(900));
  return (
    <div className="stage">
      <Button size="lg" icon={<ArrowRightIcon size={20} />} status={a.status} onClick={a.run}>
        Get started
      </Button>
      <Button variant="surface" status={b.status} onClick={b.run}>
        Save
      </Button>
      <Button variant="accent" size="sm">
        Upgrade
      </Button>
    </div>
  );
}

export function SwitchDemo() {
  const [on, setOn] = useState(false);
  return (
    <div className="stage col">
      <div className="row">
        <Switch id="sw-notify" aria-labelledby="sw-notify-label" checked={on} onCheckedChange={setOn} />
        <label id="sw-notify-label" htmlFor="sw-notify">Notifications</label>
      </div>
      <div className="row">
        <Switch size="sm" defaultChecked aria-label="Compact mode" />
        <span className="hint">sm, encendido de partida</span>
      </div>
    </div>
  );
}

export function SegmentedDemo() {
  return (
    <div className="stage">
      <SegmentedControl aria-label="Period" defaultValue="day" options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} />
    </div>
  );
}

export function SliderDemo() {
  const [v, setV] = useState(40);
  return (
    <div className="stage col">
      <div className="slider-wrap">
        <Slider aria-label="Volume" value={v} onValueChange={setV} icon={f => <VolumeIcon level={f} />} formatValue={x => `${x}%`} />
      </div>
      <span className="hint">{v}% · arrástralo más allá del final para estirarlo</span>
    </div>
  );
}

export function PlayerDemo() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(48);
  const duration = 160;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTime(t => (t + 0.25 >= duration ? 0 : t + 0.25)), 250);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <div className="stage">
      <MediaPlayer
        title="Night Drive"
        artist="Soft Machines"
        duration={duration}
        currentTime={time}
        onSeek={setTime}
        playing={playing}
        onPlayingChange={setPlaying}
        onPrevious={() => setTime(0)}
        onNext={() => setTime(0)}
      />
    </div>
  );
}

export function ChartDemo() {
  const [range, setRange] = useState("month");
  const s = SERIES[range]!;
  return (
    <div className="stage">
      <div className="card-wrap">
        <ChartCard
          label="Revenue"
          value={s.total}
          formatValue={dollars}
          delta={s.delta}
          data={s.data}
          ranges={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          range={range}
          onRangeChange={setRange}
          chartLabel={`Revenue by ${range}`}
        />
      </div>
    </div>
  );
}

export function PaletteDemo({ setOpen }: { setOpen: (o: boolean) => void }) {
  return (
    <div className="stage col">
      <CommandPaletteTrigger onClick={() => setOpen(true)} />
      <CommandPaletteTrigger onClick={() => setOpen(true)}>Search commands</CommandPaletteTrigger>
      <span className="hint">
        o pulsa <Kbd keys={["mod", "K"]} />
      </span>
    </div>
  );
}

export function ToastDemo() {
  return (
    <div className="stage">
      <Button variant="surface" onClick={() => toast({ title: "Changes saved", action: { label: "Undo", onClick: () => toast({ title: "Change undone", icon: "none" }) } })}>
        Show toast
      </Button>
      <Button variant="surface" onClick={() => toast("Link copied")}>
        Another
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Campo de texto

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Alta de cuenta: valida al salir de cada campo y al enviar. */
export function SignUpDemo() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailOk = EMAIL.test(email);
  const passOk = password.length >= 8;
  const submit = useButtonStatus(() => wait(1100));
  const emailError = touched.email && !emailOk ? (email ? "Enter a valid email address" : "Email is required") : undefined;
  const passError = touched.password && !passOk ? "Use at least 8 characters" : undefined;
  return (
    <form
      className="stage col form"
      noValidate
      onSubmit={e => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        if (!emailOk || !passOk) {
          const first = e.currentTarget.querySelector<HTMLInputElement>(!emailOk ? 'input[name="email"]' : 'input[name="password"]');
          first?.focus();
          return;
        }
        submit.run().then(() => toast("Account created"));
      }}
    >
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onValueChange={setEmail}
        onBlur={() => setTouched(t => ({ ...t, email: true }))}
        error={emailError}
        valid={touched.email && emailOk}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onValueChange={setPassword}
        onBlur={() => setTouched(t => ({ ...t, password: true }))}
        description="At least 8 characters"
        error={passError}
        valid={passOk}
      />
      <Button type="submit" size="lg" status={submit.status} icon={<ArrowRightIcon size={20} />}>
        Create account
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------------------
// Diálogo y hoja

/** Confirmación destructiva: la ventana crece desde el botón y vuelve a él. */
export function DeleteDialogDemo() {
  const [open, setOpen] = useState(false);
  const origin = useRef<HTMLButtonElement>(null);
  const del = useButtonStatus(() => wait(900));
  return (
    <div className="stage">
      <Button ref={origin} variant="solid" icon={<TrashIcon size={18} />} onClick={() => setOpen(true)}>
        Delete project
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        origin={origin}
        role="alertdialog"
        title="Delete “Night Drive”?"
        description="The project and its 24 files will be removed for everyone. This can’t be undone."
        actions={
          <>
            <Button variant="surface" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              status={del.status}
              onClick={() =>
                del.run().then(() => {
                  setOpen(false);
                  toast("Project deleted");
                })
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

/** Formulario dentro de la ventana: el foco empieza en el campo. */
export function RenameDialogDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Night Drive");
  const [draft, setDraft] = useState(name);
  const origin = useRef<HTMLButtonElement>(null);
  const empty = draft.trim() === "";
  const save = () => {
    if (empty) return;
    setName(draft.trim());
    setOpen(false);
    toast("Project renamed");
  };
  return (
    <div className="stage col">
      <Button
        ref={origin}
        variant="surface"
        onClick={() => {
          setDraft(name);
          setOpen(true);
        }}
      >
        Rename
      </Button>
      <span className="hint">Nombre actual: {name}</span>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        origin={origin}
        title="Rename project"
        actions={
          <>
            <Button variant="surface" onClick={() => setOpen(false)}>
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
    </div>
  );
}

/** Hoja: siempre desde abajo, se cierra arrastrándola. */
export function SheetDemo() {
  const [open, setOpen] = useState(false);
  const [wifi, setWifi] = useState(true);
  const [bt, setBt] = useState(false);
  return (
    <div className="stage col">
      <Button variant="surface" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <span className="hint">En móvil todas las ventanas salen así</span>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        presentation="sheet"
        title="Connections"
        description="Drag it down or tap outside to close."
      >
        <div className="sheet-rows">
          <label className="sheet-row">
            <span>Wi-Fi</span>
            <Switch checked={wifi} onCheckedChange={setWifi} aria-label="Wi-Fi" />
          </label>
          <label className="sheet-row">
            <span>Bluetooth</span>
            <Switch checked={bt} onCheckedChange={setBt} aria-label="Bluetooth" />
          </label>
        </div>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Menú

function useProjectActions(onDelete: () => void): MenuEntry[] {
  return [
    { id: "rename", label: "Rename", icon: <PencilIcon size={18} />, shortcut: ["mod", "E"], onSelect: () => toast({ title: "Rename", icon: "none" }) },
    { id: "duplicate", label: "Duplicate", icon: <CopyIcon size={18} />, shortcut: ["mod", "D"], onSelect: () => toast("Project duplicated") },
    { id: "share", label: "Share…", icon: <ShareIcon size={18} />, onSelect: () => toast("Link copied") },
    { id: "archive", label: "Archive", disabled: true, onSelect: () => {} },
    { type: "separator" },
    { id: "delete", label: "Delete", icon: <TrashIcon size={18} />, destructive: true, onSelect: onDelete },
  ];
}

/** El botón «…» se transforma en el menú; «Delete» abre la confirmación desde el mismo botón. */
export function MenuDemo() {
  const [confirm, setConfirm] = useState(false);
  const items = useProjectActions(() => setConfirm(true));
  return (
    <div className="stage">
      <div className="project-card">
        <span className="project-card__art" aria-hidden="true" />
        <span className="project-card__text">
          <b>Night Drive</b>
          <span>Edited 2 hours ago</span>
        </span>
        <Menu items={items} placement="bottom-end">
          <Button variant="surface" size="sm" iconOnly aria-label="Project actions">
            <MoreIcon size={20} />
          </Button>
        </Menu>
      </div>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        role="alertdialog"
        title="Delete “Night Drive”?"
        description="This can’t be undone."
        actions={
          <>
            <Button variant="surface" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirm(false);
                toast("Project deleted");
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

/** Clic derecho o pulsación larga: el menú crece desde el punto. */
export function ContextMenuDemo() {
  const items = useProjectActions(() => toast("Project deleted"));
  return (
    <div className="stage">
      <ContextMenu items={items} label="Project actions">
        <div className="ctx-area" tabIndex={0}>
          Haz clic derecho o mantén pulsado aquí
          <span className="hint">con teclado: Mayús + F10</span>
        </div>
      </ContextMenu>
    </div>
  );
}

/** Cerca de los bordes el menú se da la vuelta para no salirse. */
export function MenuEdgesDemo() {
  const items = useProjectActions(() => toast("Project deleted"));
  const trigger = (label: string) => (
    <Button variant="surface" size="sm">
      {label}
    </Button>
  );
  return (
    <div className="stage edges">
      <Menu items={items} placement="bottom-start">{trigger("bottom-start")}</Menu>
      <Menu items={items} placement="bottom-end">{trigger("bottom-end")}</Menu>
      <Menu items={items} placement="top-start">{trigger("top-start")}</Menu>
      <Menu items={items} placement="top-end">{trigger("top-end")}</Menu>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Tooltip

/** Barra de iconos: el primero espera; al pasar al siguiente, sale al momento. */
export function TooltipDemo() {
  const tools = [
    { label: "Rename", icon: <PencilIcon size={18} /> },
    { label: "Duplicate", icon: <CopyIcon size={18} /> },
    { label: "Share", icon: <ShareIcon size={18} /> },
    { label: "Delete", icon: <TrashIcon size={18} /> },
  ];
  return (
    <div className="stage">
      <div className="toolbar">
        {tools.map(t => (
          <Tooltip key={t.label} content={t.label}>
            <Button variant="surface" size="sm" iconOnly aria-label={t.label} onClick={() => toast(t.label)}>
              {t.icon}
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

/** Cada uno prefiere un lado; junto al borde se da la vuelta. */
export function TooltipSidesDemo() {
  return (
    <div className="stage">
      {(["top", "bottom", "left", "right"] as const).map(side => (
        <Tooltip key={side} content={`On the ${side}`} side={side}>
          <Button variant="surface" size="sm">
            {side}
          </Button>
        </Tooltip>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Selector

const COUNTRIES = ["Argentina", "Australia", "Brazil", "Canada", "Chile", "Colombia", "France", "Germany", "Italy", "Japan", "Mexico", "Netherlands", "Portugal", "Spain", "Sweden", "United Kingdom", "United States"];

/** En un formulario, junto a campos de texto. */
export function SelectFormDemo() {
  const [size, setSize] = useState("m");
  const [country, setCountry] = useState("");
  return (
    <div className="stage col form">
      <Select
        label="Size"
        value={size}
        onValueChange={setSize}
        options={[
          { value: "s", label: "Small" },
          { value: "m", label: "Medium" },
          { value: "l", label: "Large" },
          { value: "xl", label: "Extra large", disabled: true },
        ]}
      />
      <Select label="Country" placeholder="Choose a country" value={country} onValueChange={setCountry} options={COUNTRIES.map(c => ({ value: c.toLowerCase(), label: c }))} />
      <span className="hint">
        Talla: {size} · País: {country || "—"}
      </span>
    </div>
  );
}

/** Compacto, para barras: la píldora cambia de ancho con el valor. */
export function SelectPillDemo() {
  const [sort, setSort] = useState("newest");
  return (
    <div className="stage">
      <Select
        size="sm"
        label="Sort by"
        value={sort}
        onValueChange={setSort}
        options={[
          { value: "newest", label: "Newest first" },
          { value: "oldest", label: "Oldest" },
          { value: "name", label: "Name" },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Desplegable y acordeón

const FAQ = [
  { value: "ship", title: "How long does shipping take?", body: "Orders leave our warehouse within two working days. Delivery takes 2–4 days in Europe and 5–8 days everywhere else." },
  { value: "return", title: "Can I return an item?", body: "Yes, within 30 days. Start the return from your account and print the label; refunds arrive within a week of us receiving the parcel. Items must be unused and in their original packaging, and sale items can be exchanged but not refunded." },
  { value: "size", title: "How do I pick my size?", body: "Each product page has a size guide. If you are between two sizes, choose the larger one." },
  { value: "gift", title: "Do you offer gift wrapping?", body: "Not yet." },
];

/** Una abierta cada vez: abrir otra cierra la anterior en el mismo movimiento. */
export function AccordionFaqDemo() {
  return (
    <div className="stage wide-stage">
      <Accordion defaultValue={["ship"]} className="demo-accordion">
        {FAQ.map(f => (
          <AccordionItem key={f.value} value={f.value} title={f.title}>
            <p>{f.body}</p>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/** Varias abiertas; lo de dentro se conserva al cerrar (escribe algo y ciérrala). */
export function AccordionSettingsDemo() {
  const [push, setPush] = useState(true);
  const [digest, setDigest] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="stage wide-stage">
      <Accordion multiple defaultValue={["notify"]} className="demo-accordion">
        <AccordionItem value="notify" title="Notifications" icon={<SlidersIcon size={18} />}>
          <label className="setting-row">
            <span>Push notifications</span>
            <Switch size="sm" checked={push} onCheckedChange={setPush} aria-label="Push notifications" />
          </label>
          <label className="setting-row">
            <span>Weekly digest</span>
            <Switch size="sm" checked={digest} onCheckedChange={setDigest} aria-label="Weekly digest" />
          </label>
        </AccordionItem>
        <AccordionItem value="team" title="Team" icon={<UserPlusIcon size={18} />}>
          <div className="setting-form">
            <TextField label="Invite by email" value={name} onValueChange={setName} placeholder="name@company.com" />
          </div>
        </AccordionItem>
        <AccordionItem value="billing" title="Billing" icon={<SaveIcon size={18} />} disabled>
          <p>Only admins can change billing.</p>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** Suelto y plano, dentro de un formulario. */
export function CollapsibleDemo() {
  return (
    <div className="stage col form">
      <TextField label="Project name" defaultValue="Night Drive" />
      <Collapsible title="Advanced options" variant="plain">
        <div className="setting-form">
          <TextField label="Slug" defaultValue="night-drive" />
          <TextField label="Webhook URL" placeholder="https://" />
        </div>
      </Collapsible>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Pestañas con contenido

const ACTIVITY = ["Ada renamed the project", "Grace invited Linus", "Linus uploaded 12 files", "Ada changed the cover", "Grace left a comment"];

export function TabsDemo() {
  const [wifi, setWifi] = useState(true);
  return (
    <div className="stage wide-stage">
      <div className="tabs-card">
        <Tabs
          aria-label="Project"
          items={[
            {
              value: "overview",
              label: "Overview",
              content: <p className="tabs-copy">Night Drive is a synth-pop record in progress: nine tracks, two collaborators and a release planned for spring.</p>,
            },
            {
              value: "activity",
              label: "Activity",
              content: (
                <ul className="tabs-list">
                  {ACTIVITY.map(a => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ),
            },
            {
              value: "settings",
              label: "Settings",
              content: (
                <label className="setting-row">
                  <span>Public link</span>
                  <Switch size="sm" checked={wifi} onCheckedChange={setWifi} aria-label="Public link" />
                </label>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Movimiento

/** Un aviso en línea que abre su hueco: los párrafos de alrededor se deslizan. */
export function PresenceDemo() {
  const [show, setShow] = useState(false);
  return (
    <div className="stage col wide-stage">
      <div className="presence-copy">
        <p>Your changes are saved automatically while you edit.</p>
        <Presence show={show} collapse effect="rise">
          <div className="inline-notice" role="status">
            <AlertIcon size={18} />
            <span>You are offline. Changes will sync when you reconnect.</span>
          </div>
        </Presence>
        <p>Export the project any time from the menu.</p>
      </div>
      <Button variant="surface" size="sm" onClick={() => setShow(s => !s)}>
        {show ? "Hide notice" : "Show notice"}
      </Button>
    </div>
  );
}

/** Lista con presencia: las filas nuevas abren su hueco; las que se quitan lo cierran. */
export function PresenceGroupDemo() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Mix the second track" },
    { id: 2, text: "Send stems to Grace" },
    { id: 3, text: "Pick a cover photo" },
  ]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(4);
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTasks(t => [...t, { id: nextId.current++, text }]);
    setDraft("");
  };
  return (
    <div className="stage col form">
      <form
        className="task-add"
        onSubmit={e => {
          e.preventDefault();
          add();
        }}
      >
        <TextField label="New task" value={draft} onValueChange={setDraft} />
        <Button type="submit" iconOnly aria-label="Add task" size="lg">
          <PlusIcon size={20} />
        </Button>
      </form>
      <PresenceGroup as="ul" itemAs="li" className="task-list">
        {tasks.map(t => (
          <div key={t.id} className="task">
            <span>{t.text}</span>
            <button type="button" className="task__remove" aria-label={`Remove ${t.text}`} onClick={() => setTasks(ts => ts.filter(x => x.id !== t.id))}>
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </PresenceGroup>
    </div>
  );
}

/** La tarjeta se estira o se recoge con su texto. */
export function AutoHeightDemo() {
  const [more, setMore] = useState(false);
  return (
    <div className="stage wide-stage">
      <div className="autoheight-card">
        <AutoHeight>
          <p>Mochi is a small set of interface pieces built around a single idea: one shape that transforms.</p>
          {more ? (
            <p>
              Every control is the same piece changing its size, corners and colour with soft springs, and its content with a short blur. Nothing stops on a fixed curve and nothing
              bounces; everything can be interrupted halfway without a jump.
            </p>
          ) : null}
        </AutoHeight>
        <Button variant="surface" size="sm" onClick={() => setMore(m => !m)}>
          {more ? "Show less" : "Read more"}
        </Button>
      </div>
    </div>
  );
}
