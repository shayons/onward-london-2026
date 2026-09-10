import { LAYERS, type LayerId, type TraceEvent } from "./types.ts";

export function sliceVisible(buffer: TraceEvent[], count: number): TraceEvent[] {
  return buffer.slice(0, count);
}

export function completedLayers(events: TraceEvent[]): Set<LayerId> {
  return new Set(
    events.filter((e) => e.type === "layer_complete").map((e) => e.layer),
  );
}

export function activeLayer(events: TraceEvent[]): LayerId | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.type === "layer_complete") continue;
    if (e && "layer" in e) return e.layer;
  }
  return null;
}

export function layerEvents(events: TraceEvent[], layer: LayerId): TraceEvent[] {
  return events.filter((e) => "layer" in e && e.layer === layer);
}

export function hasVisibleItinerary(events: TraceEvent[]): boolean {
  return events.some((e) => e.type === "itinerary" || e.type === "no_match" || e.type === "unsupported");
}

export function visibleAssistant(events: TraceEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.type === "assistant_message") return e.text;
  }
  return null;
}

export function nextDelay(buffer: TraceEvent[], visibleCount: number, paceMs: number): number {
  const next = buffer[visibleCount];
  if (!next) return 80;
  return Math.max(16, next.delayMs + paceMs);
}

export { LAYERS };
