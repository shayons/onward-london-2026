import { JsonBlock } from "@/components/onward/json-block";
import { LAYER_META } from "@/lib/onward/dataset";
import {
  activeLayer,
  completedLayers,
  layerEvents,
  sliceVisible,
} from "@/lib/onward/display";
import { useOnward } from "@/lib/onward/store";
import { LAYERS, type LayerId, type TraceEvent } from "@/lib/onward/types";
import { Check, ChevronDown, Circle } from "lucide-react";
import { useState } from "react";

export function TracePane() {
  const buffer = useOnward((s) => s.buffer);
  const visibleCount = useOnward((s) => s.visibleCount);
  const runMode = useOnward((s) => s.runMode);
  const visible = sliceVisible(buffer, visibleCount);
  const done = completedLayers(visible);
  const current = activeLayer(visible);
  const [open, setOpen] = useState<LayerId | null>(null);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-paper">
      <header className="border-b border-line px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-subtle">Semantic layer</p>
        <h2 className="font-display text-lg leading-tight">Six responsibilities</h2>
        <p className="mt-1 text-xs text-muted">
          Prepared stores over a fictional corpus. Not six databases, and not a live supplier feed.
          {runMode === "replay" ? " Recorded." : null}
        </p>
      </header>
      <ol className="min-h-0 flex-1 overflow-y-auto scroll-thin divide-y divide-line">
        {LAYERS.map((id, i) => {
          const meta = LAYER_META[id];
          const events = layerEvents(visible, id);
          const isDone = done.has(id);
          const isActive = current === id;
          const expanded = open === id || (open === null && isActive);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-chip/60"
              >
                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-chip text-xs tabular-nums text-muted">
                  {isDone ? <Check className="size-3.5 text-ok" /> : isActive ? (
                    <span className="size-2 rounded-full bg-accent pulse-dot" />
                  ) : (
                    <Circle className="size-3 text-line-strong" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">
                      {i + 1}. {meta?.title}
                    </span>
                    <ChevronDown className={`size-4 text-subtle transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </span>
                  <span className="block text-xs text-muted">{meta?.question}</span>
                </span>
              </button>
              {expanded ? (
                <div className="space-y-2 px-4 pb-4">
                  {events.length === 0 ? (
                    <p className="text-xs text-subtle">Waiting for this layer’s evidence.</p>
                  ) : (
                    events.map((e, idx) => <EventRow key={idx} event={e} />)
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function EventRow({ event }: { event: TraceEvent }) {
  if (event.type === "input") return <JsonBlock label={event.label} value={event.payload} />;
  if (event.type === "mapping") return <JsonBlock label={event.label} value={event.payload} />;
  if (event.type === "tool_request") {
    return (
      <div className="rounded-sm border border-line px-3 py-2">
        <p className="text-xs font-medium text-ink">
          {event.service} · {event.name}
        </p>
        <p className="font-mono text-xs text-subtle">{event.requestId}</p>
        <JsonBlock label="Request" value={event.arguments} />
      </div>
    );
  }
  if (event.type === "tool_result") {
    return (
      <div className="rounded-sm border border-line px-3 py-2">
        <p className="text-xs font-medium text-ok">
          Returned · {event.durationMs} ms · {event.service}
        </p>
        <JsonBlock label="Records" value={event.records} />
      </div>
    );
  }
  if (event.type === "evidence") {
    return (
      <div className="rounded-sm bg-accent-soft px-3 py-2">
        <p className="text-sm text-ink">{event.summary}</p>
        <JsonBlock value={event.payload} />
      </div>
    );
  }
  return null;
}
