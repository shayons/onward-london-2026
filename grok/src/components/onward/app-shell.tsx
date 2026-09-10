import { Conversation } from "@/components/onward/conversation";
import { PresenterDock } from "@/components/onward/presenter-dock";
import { SourceInspector } from "@/components/onward/source-inspector";
import { TalkNotes } from "@/components/onward/talk-notes";
import { TracePane } from "@/components/onward/trace-pane";
import { TripStrip } from "@/components/onward/trip-strip";
import { nextDelay } from "@/lib/onward/display";
import { clockLabel } from "@/lib/onward/format";
import { DEMO_CLOCK } from "@/lib/onward/dataset";
import { useOnward } from "@/lib/onward/store";
import { X } from "lucide-react";
import { useEffect } from "react";

export function AppShell() {
  const runStatus = useOnward((s) => s.runStatus);
  const paused = useOnward((s) => s.paused);
  const visibleCount = useOnward((s) => s.visibleCount);
  const buffer = useOnward((s) => s.buffer);
  const paceMs = useOnward((s) => s.paceMs);
  const tickVisible = useOnward((s) => s.tickVisible);
  const commitVisible = useOnward((s) => s.commitVisible);
  const cancelTimerUntil = useOnward((s) => s.cancelTimerUntil);
  const revealDisruption = useOnward((s) => s.revealDisruption);
  const clearCancelTimer = useOnward((s) => s.clearCancelTimer);
  const setPaused = useOnward((s) => s.setPaused);
  const traceOpen = useOnward((s) => s.traceOpen);
  const setTraceOpen = useOnward((s) => s.setTraceOpen);

  useEffect(() => {
    commitVisible();
  }, [visibleCount, commitVisible]);

  useEffect(() => {
    if (paused || runStatus !== "running") return;
    const wait = nextDelay(buffer, visibleCount, paceMs);
    const id = window.setTimeout(() => tickVisible(), wait);
    return () => window.clearTimeout(id);
  }, [paused, runStatus, visibleCount, buffer, paceMs, tickVisible]);

  useEffect(() => {
    if (!cancelTimerUntil) return;
    const id = window.setInterval(() => {
      if (Date.now() >= cancelTimerUntil) revealDisruption();
    }, 200);
    return () => window.clearInterval(id);
  }, [cancelTimerUntil, revealDisruption]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        clearCancelTimer();
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [clearCancelTimer, setPaused]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg">
            O
          </span>
          <div>
            <p className="font-display text-lg leading-none">Onward</p>
            <p className="text-xs text-subtle">Travel concierge · semantic layer</p>
          </div>
        </div>
        <p className="text-right text-xs text-muted">
          <span className="block font-medium text-ink tabular-nums">{clockLabel(DEMO_CLOCK)}</span>
          Fixed clock · fictional inventory
        </p>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4">
          <TripStrip />
          <Conversation />
        </main>
        <div className="hidden w-[26rem] shrink-0 border-l border-line lg:block">
          <TracePane />
        </div>
      </div>

      <PresenterDock />
      <SourceInspector />
      <TalkNotes />

      {traceOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="flex h-full flex-col bg-paper">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <p className="font-display text-lg">Semantic layer</p>
              <button
                type="button"
                className="size-10 rounded-md hover:bg-chip"
                onClick={() => setTraceOpen(false)}
                aria-label="Close layer panel"
              >
                <X className="mx-auto size-4" />
              </button>
            </div>
            <TracePane />
          </div>
        </div>
      ) : null}
    </div>
  );
}
