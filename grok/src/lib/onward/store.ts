import { create } from "zustand";
import { CANONICAL_REQUEST } from "./dataset.ts";
import { defaultInventory, runEngine } from "./engine.ts";
import type {
  ChatMessage,
  EngineResult,
  InventoryOverride,
  PaceMode,
  TraceEvent,
  TripContract,
} from "./types.ts";

export type CancelTimerSec = 5 | 10 | 15 | 30;

interface OnwardState {
  paceMode: PaceMode;
  paused: boolean;
  paceMs: number;
  memoryEnabled: boolean;
  disruptionRevealed: boolean;
  cancelTimerSec: CancelTimerSec;
  cancelTimerUntil: number | null;
  inventory: InventoryOverride;
  contract: TripContract | null;
  messages: ChatMessage[];
  buffer: TraceEvent[];
  visibleCount: number;
  runStatus: "idle" | "running" | "complete" | "incomplete";
  runMode: "live" | "replay";
  lastResult: EngineResult | null;
  lastRecorded: EngineResult | null;
  traceOpen: boolean;
  notesOpen: boolean;
  inspectorRef: string | null;
  composer: string;
  setPaceMode: (m: PaceMode) => void;
  setPaused: (v: boolean) => void;
  setPaceMs: (n: number) => void;
  setMemoryEnabled: (v: boolean) => void;
  setComposer: (v: string) => void;
  setTraceOpen: (v: boolean) => void;
  setNotesOpen: (v: boolean) => void;
  setInspectorRef: (v: string | null) => void;
  revealDisruption: () => void;
  startCancelTimer: (sec: CancelTimerSec) => void;
  clearCancelTimer: () => void;
  setAx218Seats: (seats: number) => void;
  resetInventory: () => void;
  submit: (text?: string) => void;
  replayLast: () => void;
  stopRun: () => void;
  nextEvent: () => void;
  nextLayer: () => void;
  tickVisible: () => void;
  commitVisible: () => void;
  newConversation: () => void;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function startedText(result: EngineResult): string {
  const ev = result.events.find((e) => e.type === "run_started");
  return ev && ev.type === "run_started" ? ev.text : "Replay";
}

export const useOnward = create<OnwardState>()((set, get) => ({
  paceMode: "live",
  paused: false,
  paceMs: 0,
  memoryEnabled: true,
  disruptionRevealed: false,
  cancelTimerSec: 10,
  cancelTimerUntil: null,
  inventory: defaultInventory(),
  contract: null,
  messages: [
    {
      id: "sys-scenario",
      role: "system",
      kind: "scenario",
      at: 0,
      text: "Fixed scenario · 9 September 2026, 18:00 Europe/London. Fictional inventory — not a live supplier feed.",
    },
  ],
  buffer: [],
  visibleCount: 0,
  runStatus: "idle",
  runMode: "live",
  lastResult: null,
  lastRecorded: null,
  traceOpen: false,
  notesOpen: false,
  inspectorRef: null,
  composer: CANONICAL_REQUEST,

  setPaceMode: (paceMode) =>
    set({
      paceMode,
      paused: paceMode === "presenter" && get().runStatus === "running" ? true : get().paused,
    }),
  setPaused: (paused) => set({ paused }),
  setPaceMs: (paceMs) => set({ paceMs }),
  setMemoryEnabled: (memoryEnabled) => set({ memoryEnabled }),
  setComposer: (composer) => set({ composer }),
  setTraceOpen: (traceOpen) => set({ traceOpen }),
  setNotesOpen: (notesOpen) => set({ notesOpen }),
  setInspectorRef: (inspectorRef) => set({ inspectorRef }),

  revealDisruption: () =>
    set((s) => {
      if (s.disruptionRevealed) return s;
      return {
        disruptionRevealed: true,
        cancelTimerUntil: null,
        composer: CANONICAL_REQUEST,
        messages: [
          ...s.messages,
          {
            id: uid("sys"),
            role: "system",
            kind: "disruption",
            at: Date.now(),
            text: "Aether Air has cancelled AX201. The meeting at Ribeira Design Studio still stands at 14:00 tomorrow.",
          },
        ],
      };
    }),

  startCancelTimer: (sec) =>
    set({
      cancelTimerSec: sec,
      cancelTimerUntil: Date.now() + sec * 1000,
    }),

  clearCancelTimer: () => set({ cancelTimerUntil: null }),

  setAx218Seats: (seats) => {
    const inventory = {
      ...get().inventory,
      offerSeats: { ...get().inventory.offerSeats, "offer:AX218": seats },
    };
    set({
      inventory,
      messages: [
        ...get().messages,
        {
          id: uid("sys"),
          role: "system",
          kind: "stock",
          at: Date.now(),
          text:
            seats <= 0
              ? "AX218 seats set to 0 in the fictional Onward inventory. The next request will read this snapshot."
              : `AX218 seats restored to ${seats} in the fictional Onward inventory.`,
        },
      ],
    });
  },

  resetInventory: () => set({ inventory: defaultInventory() }),

  submit: (raw) => {
    const text = (raw ?? get().composer).trim();
    if (!text || get().runStatus === "running") return;
    if (!get().disruptionRevealed) get().revealDisruption();
    const result = runEngine({
      text,
      memoryEnabled: get().memoryEnabled,
      inventory: get().inventory,
      previous: get().contract,
      mode: "live",
    });
    set({
      buffer: result.events,
      visibleCount: 0,
      lastResult: result,
      lastRecorded: result,
      contract: result.contract,
      runStatus: "running",
      runMode: "live",
      paused: get().paceMode === "presenter",
      composer: "",
      messages: [
        ...get().messages,
        {
          id: uid("u"),
          role: "user",
          text,
          at: Date.now(),
          runId: result.requestId,
        },
      ],
    });
  },

  replayLast: () => {
    const rec = get().lastRecorded;
    if (!rec) return;
    set({
      buffer: rec.events,
      visibleCount: 0,
      lastResult: rec,
      runStatus: "running",
      runMode: "replay",
      paused: get().paceMode === "presenter",
      messages: [
        ...get().messages,
        {
          id: uid("sys"),
          role: "system",
          kind: "recorded",
          at: Date.now(),
          text: "Recorded run. No new service calls.",
        },
        {
          id: uid("u"),
          role: "user",
          text: startedText(rec),
          at: Date.now(),
          runId: rec.requestId,
        },
      ],
    });
  },

  stopRun: () =>
    set((s) => ({
      runStatus: s.runStatus === "running" ? "incomplete" : s.runStatus,
      paused: true,
      messages:
        s.runStatus === "running"
          ? [
              ...s.messages,
              {
                id: uid("sys"),
                role: "system",
                kind: "stopped",
                at: Date.now(),
                text: "Run stopped. Marked incomplete.",
              },
            ]
          : s.messages,
    })),

  nextEvent: () =>
    set((s) => {
      const visibleCount = Math.min(s.buffer.length, s.visibleCount + 1);
      return {
        paused: true,
        visibleCount,
        runStatus: visibleCount >= s.buffer.length && s.buffer.length ? "complete" : s.runStatus,
      };
    }),

  nextLayer: () =>
    set((s) => {
      const start = s.visibleCount;
      const rest = s.buffer.slice(start);
      const idx = rest.findIndex((e, i) => i > 0 && e.type === "evidence");
      const jump = idx === -1 ? rest.length : idx + 1;
      const visibleCount = Math.min(s.buffer.length, start + jump);
      return {
        paused: true,
        visibleCount,
        runStatus: visibleCount >= s.buffer.length && s.buffer.length ? "complete" : s.runStatus,
      };
    }),

  tickVisible: () =>
    set((s) => {
      if (s.paused || s.runStatus !== "running") return s;
      const visibleCount = Math.min(s.buffer.length, s.visibleCount + 1);
      return {
        visibleCount,
        runStatus: visibleCount >= s.buffer.length ? "complete" : "running",
      };
    }),

  commitVisible: () =>
    set((s) => {
      const visible = s.buffer.slice(0, s.visibleCount);
      const asst = [...visible].reverse().find((e) => e.type === "assistant_message");
      if (!asst || asst.type !== "assistant_message") return s;
      const runId = s.lastResult?.requestId;
      if (!runId || s.messages.some((m) => m.role === "assistant" && m.runId === runId)) return s;
      const it = visible.find((e) => e.type === "itinerary");
      const nm = visible.find((e) => e.type === "no_match");
      return {
        messages: [
          ...s.messages,
          {
            id: `a-${runId}`,
            role: "assistant",
            text: asst.text,
            at: Date.now(),
            runId,
            itinerary: it && it.type === "itinerary" ? it.itinerary : undefined,
            noMatch: nm && nm.type === "no_match" ? nm.noMatch : undefined,
          },
        ],
      };
    }),

  newConversation: () =>
    set({
      contract: null,
      messages: [
        {
          id: "sys-scenario",
          role: "system",
          kind: "scenario",
          at: Date.now(),
          text: "New conversation. Cross-session preferences stay scoped to Alex; this runtime session is fresh.",
        },
      ],
      buffer: [],
      visibleCount: 0,
      runStatus: "idle",
      lastResult: null,
      composer: CANONICAL_REQUEST,
    }),
}));
