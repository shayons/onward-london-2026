import { useEffect, useState } from "react";
import { ORIGINAL_BOOKING, TRAVELLER } from "@/lib/onward/dataset";
import { timeInZone } from "@/lib/onward/format";
import { useOnward } from "@/lib/onward/store";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function TripStrip() {
  const revealed = useOnward((s) => s.disruptionRevealed);
  const reveal = useOnward((s) => s.revealDisruption);
  const start = useOnward((s) => s.startCancelTimer);
  const clear = useOnward((s) => s.clearCancelTimer);
  const until = useOnward((s) => s.cancelTimerUntil);
  const sec = useOnward((s) => s.cancelTimerSec);
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!until) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [until]);
  const remaining = until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : null;

  return (
    <section className="relative shrink-0 overflow-hidden rounded-xl bg-ink text-paper shadow-border">
      <img
        src="/images/lisbon-destination.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-r from-ink/85 via-ink/50 to-ink/15" />
      <div className="relative flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={TRAVELLER.image}
              alt=""
              className="photo size-12 rounded-md object-cover"
            />
            <div>
              <p className="font-display text-lg leading-tight">{TRAVELLER.name}</p>
              <p className="text-xs text-paper/70">
                {TRAVELLER.role} · {TRAVELLER.city}
              </p>
            </div>
          </div>
          <Link
            to="/prepare"
            className="text-xs text-paper/70 underline-offset-4 hover:text-paper hover:underline"
          >
            Data preparation
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <RoutePoint code="LHR" city="Heathrow" time={timeInZone(ORIGINAL_BOOKING.departIso, "Europe/London")} />
          <span className="mb-1 h-px w-8 bg-paper/40" />
          <RoutePoint code="LIS" city="Lisbon" time={timeInZone(ORIGINAL_BOOKING.arriveIso, "Europe/Lisbon")} />
          <div className="sm:ml-auto">
            <p className="text-xs uppercase tracking-wider text-paper/60">Meeting</p>
            <p className="font-medium">Ribeira Design Studio · 14:00</p>
          </div>
        </div>
        <p className="text-xs text-paper/55">
          AI-generated destination still · not a bookable property. Portrait is fictional.
        </p>
        {!revealed ? (
          <div className="flex flex-col gap-2 rounded-md bg-ink/55 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-paper">
              Booked {ORIGINAL_BOOKING.flightNumber} · 10 Sep · one hotel night. Status looks settled.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="md" onClick={reveal}>
                Reveal cancellation
              </Button>
              {until ? (
                <Button variant="quiet" size="md" onClick={clear}>
                  Cancel timer · {remaining}s
                </Button>
              ) : (
                ([5, 10, 15, 30] as const).map((n) => (
                  <Button key={n} variant="quiet" size="md" onClick={() => start(n)}>
                    {n}s
                  </Button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-accent/40 bg-accent/90 px-3 py-2 text-sm text-accent-fg">
            {ORIGINAL_BOOKING.flightNumber} cancelled. The 14:00 meeting still stands. One hotel night, 10–11 Sep.
            {until && remaining ? ` Timer was ${sec}s.` : null}
          </div>
        )}
      </div>
    </section>
  );
}

function RoutePoint({ code, city, time }: { code: string; city: string; time: string }) {
  return (
    <div>
      <p className="font-display text-2xl leading-none tracking-tight">{code}</p>
      <p className="mt-1 text-xs text-paper/70">
        {city} · {time}
      </p>
    </div>
  );
}
