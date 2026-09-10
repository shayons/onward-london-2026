import { ItineraryCard, NoMatchCard } from "@/components/onward/itinerary-card";
import { Button } from "@/components/ui/button";
import { CANONICAL_REQUEST } from "@/lib/onward/dataset";
import {
  hasVisibleItinerary,
  sliceVisible,
  visibleAssistant,
  activeLayer,
} from "@/lib/onward/display";
import { FOLLOW_UPS } from "@/lib/onward/talk-track";
import { LAYER_META } from "@/lib/onward/dataset";
import { useOnward } from "@/lib/onward/store";
import { ArrowUp, Layers } from "lucide-react";
import { useEffect, useRef } from "react";

export function Conversation() {
  const messages = useOnward((s) => s.messages);
  const buffer = useOnward((s) => s.buffer);
  const visibleCount = useOnward((s) => s.visibleCount);
  const runStatus = useOnward((s) => s.runStatus);
  const runMode = useOnward((s) => s.runMode);
  const composer = useOnward((s) => s.composer);
  const setComposer = useOnward((s) => s.setComposer);
  const submit = useOnward((s) => s.submit);
  const lastResult = useOnward((s) => s.lastResult);
  const runId = lastResult?.requestId;
  const alreadyCommitted = Boolean(runId && messages.some((m) => m.role === "assistant" && m.runId === runId));
  const setTraceOpen = useOnward((s) => s.setTraceOpen);
  const disruptionRevealed = useOnward((s) => s.disruptionRevealed);
  const scroller = useRef<HTMLDivElement>(null);

  const visible = sliceVisible(buffer, visibleCount);
  const assistant = visibleAssistant(visible);
  const showItinerary = hasVisibleItinerary(visible);
  const itinerary = visible.find((e) => e.type === "itinerary");
  const noMatch = visible.find((e) => e.type === "no_match");
  const unsupported = visible.find((e) => e.type === "unsupported");
  const layer = activeLayer(visible);
  const working = runStatus === "running" && !showItinerary;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, visibleCount, working]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2 scroll-thin">
        {messages.map((m) => (
          <div key={m.id}>
            {m.role === "system" ? (
              <p className="text-center text-xs text-subtle">{m.text}</p>
            ) : m.role === "assistant" ? (
              <div className="space-y-3">
                <div className="max-w-[46rem] whitespace-pre-wrap rounded-lg rounded-bl-xs bg-paper px-4 py-3 text-sm leading-relaxed shadow-border">
                  {m.text}
                </div>
                {m.itinerary ? <ItineraryCard itinerary={m.itinerary} /> : null}
                {m.noMatch ? <NoMatchCard noMatch={m.noMatch} /> : null}
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="max-w-[46rem] rounded-lg rounded-br-xs bg-accent px-4 py-3 text-sm leading-relaxed text-accent-fg">
                  {m.text}
                </div>
              </div>
            )}
          </div>
        ))}

        {runMode === "replay" && runStatus !== "idle" ? (
          <p className="text-center text-xs font-medium uppercase tracking-wider text-warn">Recorded run</p>
        ) : null}

        {working ? (
          <div className="rounded-lg bg-paper px-4 py-3 shadow-border">
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="size-1.5 rounded-full bg-accent pulse-dot" />
              {layer ? LAYER_META[layer]?.title : "Preparing"}
              <span className="text-subtle">— {layer ? LAYER_META[layer]?.question : "reading the contract"}</span>
            </p>
          </div>
        ) : null}

        {assistant && showItinerary && !alreadyCommitted ? (
          <div className="space-y-3">
            <div className="max-w-[46rem] whitespace-pre-wrap rounded-lg rounded-bl-xs bg-paper px-4 py-3 text-sm leading-relaxed shadow-border">
              {assistant}
            </div>
            {itinerary && itinerary.type === "itinerary" ? <ItineraryCard itinerary={itinerary.itinerary} /> : null}
            {noMatch && noMatch.type === "no_match" ? <NoMatchCard noMatch={noMatch.noMatch} /> : null}
          </div>
        ) : null}

        {unsupported && unsupported.type === "unsupported" && !assistant ? (
          <div className="max-w-[46rem] rounded-lg bg-paper px-4 py-3 text-sm shadow-border">{unsupported.detail}</div>
        ) : null}

        {runStatus === "complete" && lastResult?.itinerary ? (
          <div className="flex flex-wrap gap-2">
            {FOLLOW_UPS.map((f) => (
              <Button key={f.label} variant="quiet" size="sm" onClick={() => submit(f.text)}>
                {f.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <form
        className="mt-3 rounded-xl bg-paper p-2 shadow-border"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="onward-composer">
          Ask Onward
        </label>
        <textarea
          id="onward-composer"
          rows={3}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            disruptionRevealed
              ? "Ask Onward to recover the trip…"
              : "Reveal the cancellation, then ask…"
          }
          className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-subtle"
        />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <div className="flex gap-2">
            <button
              type="button"
              className="lg:hidden inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-xs text-muted hover:bg-chip"
              onClick={() => setTraceOpen(true)}
            >
              <Layers className="size-4" />
              Layer
            </button>
            {!disruptionRevealed ? (
              <button
                type="button"
                className="text-xs text-muted hover:text-ink"
                onClick={() => setComposer(CANONICAL_REQUEST)}
              >
                Load the demo request
              </button>
            ) : null}
          </div>
          <Button type="submit" variant="primary" size="md" disabled={!composer.trim() || runStatus === "running"}>
            Send
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
