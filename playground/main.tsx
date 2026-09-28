// Banco de pruebas de Mochi: cada componente con una demo conectada. Sirve también como
// ejemplo de uso. `npm run dev` lo abre en http://localhost:5178.
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/tokens.css";
import "../src/styles/components.css";
import "./playground.css";
import {
  ArrowRightIcon,
  Button,
  ChartCard,
  CommandPalette,
  CommandPaletteTrigger,
  FileIcon,
  Kbd,
  MediaPlayer,
  PlusIcon,
  SaveIcon,
  SegmentedControl,
  Slider,
  SlidersIcon,
  Switch,
  Toaster,
  UserPlusIcon,
  VolumeIcon,
  toast,
  useButtonStatus,
  useCommandK,
  type ChartPoint,
  type Command,
} from "../src/index.js";

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
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

function ThemePicker() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <div className="theme">
      <SegmentedControl
        aria-label="Theme"
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

function ButtonDemo() {
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

function SwitchDemo() {
  const [on, setOn] = useState(false);
  return (
    <div className="stage col">
      <div className="row">
        <Switch id="sw-notify" aria-labelledby="sw-notify-label" checked={on} onCheckedChange={setOn} />
        <label id="sw-notify-label" htmlFor="sw-notify">Notifications</label>
      </div>
      <div className="row">
        <Switch size="sm" defaultChecked aria-label="Compact mode" />
        <span className="hint">sm, on by default</span>
      </div>
    </div>
  );
}

function SliderDemo() {
  const [v, setV] = useState(40);
  return (
    <div className="stage col">
      <div className="slider-wrap">
        <Slider aria-label="Volume" value={v} onValueChange={setV} icon={f => <VolumeIcon level={f} />} formatValue={x => `${x}%`} />
      </div>
      <span className="hint">{v}% · drag past the end to stretch it</span>
    </div>
  );
}

function PlayerDemo() {
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

function ChartDemo() {
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

function PaletteDemo({ setOpen }: { setOpen: (o: boolean) => void }) {
  return (
    <div className="stage col">
      <CommandPaletteTrigger onClick={() => setOpen(true)} />
      <CommandPaletteTrigger onClick={() => setOpen(true)}>Search commands</CommandPaletteTrigger>
      <span className="hint">
        or press <Kbd keys={["mod", "K"]} />
      </span>
    </div>
  );
}

function ToastDemo() {
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

function App() {
  const [open, setOpen] = useState(false);
  useCommandK(() => setOpen(o => !o));
  const commands: Command[] = [
    { id: "new", label: "New project", icon: <PlusIcon size={18} />, shortcut: ["mod", "N"], onSelect: () => toast("Project created") },
    { id: "invite", label: "Invite teammate", icon: <UserPlusIcon size={18} />, shortcut: ["mod", "I"], onSelect: () => toast("Invite sent") },
    { id: "docs", label: "Search docs", icon: <FileIcon size={18} />, shortcut: ["mod", "/"], onSelect: () => toast({ title: "Opening docs", icon: "none" }) },
    { id: "save", label: "Save changes", icon: <SaveIcon size={18} />, shortcut: ["mod", "S"], onSelect: () => toast({ title: "Changes saved", action: { label: "Undo", onClick: () => toast({ title: "Change undone", icon: "none" }) } }) },
    { id: "settings", label: "Settings", icon: <SlidersIcon size={18} />, shortcut: ["mod", ","], keywords: ["preferences"], onSelect: () => toast({ title: "Settings", icon: "none" }) },
  ];
  return (
    <main className="page">
      <header className="top">
        <div className="brand">
          <h1>Mochi</h1>
          <p>One shape, many states. Soft springs, light and dark.</p>
        </div>
        <ThemePicker />
      </header>
      <div className="grid">
        <section className="spec" data-demo="button"><h2>Button · idle → loading → done</h2><ButtonDemo /></section>
        <section className="spec" data-demo="switch"><h2>Switch</h2><SwitchDemo /></section>
        <section className="spec" data-demo="segmented"><h2>Segmented control</h2><div className="stage"><SegmentedControl aria-label="Period" defaultValue="day" options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} /></div></section>
        <section className="spec" data-demo="slider"><h2>Slider</h2><SliderDemo /></section>
        <section className="spec wide" data-demo="player"><h2>Island · player</h2><PlayerDemo /></section>
        <section className="spec wide" data-demo="chart"><h2>Chart card</h2><ChartDemo /></section>
        <section className="spec" data-demo="palette"><h2>Command palette</h2><PaletteDemo setOpen={setOpen} /></section>
        <section className="spec" data-demo="toast"><h2>Toast</h2><ToastDemo /></section>
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} commands={commands} />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
