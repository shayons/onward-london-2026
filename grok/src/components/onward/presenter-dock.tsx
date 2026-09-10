import type { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { useOnward } from "@/lib/onward/store";
import {
  CircleStop,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Square,
} from "lucide-react";

export function PresenterDock() {
  const paceMode = useOnward((s) => s.paceMode);
  const setPaceMode = useOnward((s) => s.setPaceMode);
  const paused = useOnward((s) => s.paused);
  const setPaused = useOnward((s) => s.setPaused);
  const paceMs = useOnward((s) => s.paceMs);
  const setPaceMs = useOnward((s) => s.setPaceMs);
  const memoryEnabled = useOnward((s) => s.memoryEnabled);
  const setMemoryEnabled = useOnward((s) => s.setMemoryEnabled);
  const nextEvent = useOnward((s) => s.nextEvent);
  const nextLayer = useOnward((s) => s.nextLayer);
  const stopRun = useOnward((s) => s.stopRun);
  const replayLast = useOnward((s) => s.replayLast);
  const lastRecorded = useOnward((s) => s.lastRecorded);
  const runStatus = useOnward((s) => s.runStatus);
  const inventory = useOnward((s) => s.inventory);
  const setAx218Seats = useOnward((s) => s.setAx218Seats);
  const notesOpen = useOnward((s) => s.notesOpen);
  const setNotesOpen = useOnward((s) => s.setNotesOpen);
  const newConversation = useOnward((s) => s.newConversation);
  const ax218 = inventory.offerSeats?.["offer:AX218"] ?? 0;
  const running = runStatus === "running";

  return (
    <footer className="shrink-0 border-t border-line bg-paper/90 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Segment
          value={paceMode}
          onChange={setPaceMode}
          options={[
            { id: "live", label: "Live pace" },
            { id: "presenter", label: "Presenter" },
          ]}
        />
        <IconBtn
          label={paused ? "Resume display" : "Pause display"}
          onClick={() => setPaused(!paused)}
          disabled={!running}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </IconBtn>
        <IconBtn label="Next event" onClick={nextEvent} disabled={!running}>
          <SkipForward className="size-4" />
        </IconBtn>
        <IconBtn label="Next layer" onClick={nextLayer} disabled={!running}>
          <FastForward className="size-4" />
        </IconBtn>
        <IconBtn label="Stop run" onClick={stopRun} disabled={!running}>
          <CircleStop className="size-4" />
        </IconBtn>
        <IconBtn label="Replay last run" onClick={replayLast} disabled={!lastRecorded}>
          <RotateCcw className="size-4" />
        </IconBtn>
        <label className="ml-1 hidden items-center gap-2 text-xs text-muted sm:flex">
          Pace
          <input
            type="range"
            min={0}
            max={1200}
            step={50}
            value={paceMs}
            onChange={(e) => setPaceMs(Number(e.target.value))}
            className="w-20 accent-accent"
          />
          <span className="tabular-nums w-10">{paceMs}ms</span>
        </label>
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted">Memory</span>
          <button
            type="button"
            role="switch"
            aria-checked={memoryEnabled}
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={`relative h-6 w-10 rounded-full transition-colors ${memoryEnabled ? "bg-accent" : "bg-line-strong"}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-paper shadow-border transition-transform ${memoryEnabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted">AX218</span>
          <button
            type="button"
            onClick={() => setAx218Seats(ax218 > 0 ? 0 : 4)}
            className="rounded-sm bg-chip px-2 py-1 font-medium tabular-nums"
          >
            {ax218 > 0 ? `${ax218} seats` : "Sold out"}
          </button>
        </label>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setNotesOpen(!notesOpen)}>
            Talk track
          </Button>
          <Button variant="ghost" size="sm" onClick={newConversation}>
            <Square className="size-3.5" />
            New
          </Button>
        </div>
      </div>
    </footer>
  );
}

function IconBtn({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-chip disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex rounded-md bg-chip p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-8 rounded-sm px-2.5 text-xs font-medium ${value === o.id ? "bg-paper shadow-border" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
