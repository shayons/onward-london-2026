import type { ReactNode } from "react";
import { HOTELS, OFFERS, TRANSFER } from "@/lib/onward/dataset";
import { gbp, timeInZone } from "@/lib/onward/format";
import type { Itinerary, NoMatch } from "@/lib/onward/types";
import { useOnward } from "@/lib/onward/store";
import { Clock3, Footprints, Landmark, Wallet } from "lucide-react";

export function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  const setInspectorRef = useOnward((s) => s.setInspectorRef);
  const b = itinerary.bundle;
  const offer = OFFERS.find((o) => o.id === b.offerId)!;
  const hotel = HOTELS.find((h) => h.id === b.hotelId)!;
  const first = b.legs[0];
  const last = b.legs[b.legs.length - 1];

  return (
    <article className="overflow-hidden rounded-xl bg-paper shadow-border">
      <div className="grid grid-cols-1 md:grid-cols-5">
        <div className="relative md:col-span-2 min-h-40">
          <img
            src={hotel.image}
            alt=""
            className="photo absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink/70 to-transparent" />
          <p className="absolute bottom-3 left-3 right-3 font-display text-lg text-paper">{hotel.name}</p>
        </div>
        <div className="md:col-span-3 p-4 sm:p-5 flex flex-col gap-4">
          <header>
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">Supported itinerary</p>
            <h3 className="mt-1 font-display text-xl leading-snug">
              {offer.flightNumber} · {hotel.name}
            </h3>
          </header>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Fact
              icon={<Clock3 className="size-3.5" />}
              label="Studio arrival"
              value={`${timeInZone(b.venueArrivalIso, "Europe/Lisbon")} Lisbon`}
            />
            <Fact icon={<Wallet className="size-3.5" />} label="Complete cost" value={gbp(b.cost.completePence)} />
            <Fact
              icon={<Landmark className="size-3.5" />}
              label="Flight"
              value={`${first ? timeInZone(first.departIso, "Europe/London") : "—"} LHR → ${last ? timeInZone(last.arriveIso, "Europe/Lisbon") : "—"} LIS`}
            />
            <Fact
              icon={<Footprints className="size-3.5" />}
              label="Walk to venue"
              value={`${b.walkMinutes} min`}
            />
          </dl>
          <div className="rounded-md bg-chip px-3 py-2 text-xs text-muted leading-relaxed">
            Fare {gbp(b.cost.farePence)} · bag {gbp(b.cost.bagPence)} · hotel {gbp(b.cost.hotelPence)} · {TRANSFER.mode.toLowerCase()} {gbp(b.cost.transferPence)}
          </div>
          <ul className="space-y-1.5 text-sm text-ink/90">
            {itinerary.why.map((w) => (
              <li key={w} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
          {itinerary.rejected.filter((r) => r.code === "late_arrival" || r.code === "short_connection").length > 0 ? (
            <div className="border-t border-line pt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle mb-2">Rejected on the way</p>
              <ul className="space-y-2 text-sm text-muted">
                {itinerary.rejected
                  .filter((r) => r.code === "late_arrival" || r.code === "short_connection")
                  .map((r) => (
                    <li key={r.subject}>
                      <span className="font-medium text-ink">{r.subject}.</span> {r.detail}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {itinerary.sources.map((s) => (
              <button
                key={s.ref}
                type="button"
                onClick={() => setInspectorRef(s.ref)}
                className="rounded-full bg-chip px-2.5 py-1 text-xs text-ink hover:bg-line"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function NoMatchCard({ noMatch }: { noMatch: NoMatch }) {
  return (
    <article className="rounded-xl bg-paper p-5 shadow-border">
      <p className="text-xs font-medium uppercase tracking-wider text-subtle">No eligible bundle</p>
      <h3 className="mt-1 font-display text-xl">Nothing in corpus meets the contract</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {noMatch.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {noMatch.cheapestEligiblePence !== null ? (
        <p className="mt-3 text-sm">
          Cheapest complete eligible trip currently in inventory:{" "}
          <span className="font-medium text-ink">{gbp(noMatch.cheapestEligiblePence)}</span>.
        </p>
      ) : null}
    </article>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
