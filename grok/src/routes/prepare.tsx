import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HOTELS,
  IMAGE_DISCLOSURES,
  LEGS,
  OFFERS,
  ONBOARDING,
  ORIGINAL_BOOKING,
  POLICIES,
} from "@/lib/onward/dataset";
import { elapsedMinutes, gbp, timeInZone } from "@/lib/onward/format";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/prepare")({ component: Prepare });

function Prepare() {
  const me615a = LEGS.find((l) => l.id === "leg:ME615a")!;
  const me615b = LEGS.find((l) => l.id === "leg:ME615b")!;
  const naive = "10:55 → 11:40 looks like 45 minutes on a clock face without zones — and it is 45 elapsed minutes.";
  const elapsed = elapsedMinutes(me615a.arriveIso, me615b.departIso);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" />
          Back to the concierge
        </Link>
        <h1 className="mt-3 font-display text-3xl">Data preparation</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The question is the last step. Onward starts as fictional supplier rows, hotel descriptions, source policies
          and an earlier conversation. Preparation makes them agree.
        </p>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <section>
          <h2 className="font-display text-2xl">Raw offer → typed offer</h2>
          <p className="mt-1 text-sm text-muted">Decimal pounds become integer pence. Bags are a distinct line.</p>
          <div className="mt-4 overflow-x-auto rounded-xl bg-paper shadow-border">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-medium uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Flight</th>
                  <th className="px-3 py-2">Advertised</th>
                  <th className="px-3 py-2">Fare pence</th>
                  <th className="px-3 py-2">Bag pence</th>
                  <th className="px-3 py-2">Seats</th>
                </tr>
              </thead>
              <tbody>
                {OFFERS.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium">{o.flightNumber}</td>
                    <td className="px-3 py-2 text-muted">{gbp(o.farePence)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{o.farePence}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{o.bagPence}</td>
                    <td className="px-3 py-2 tabular-nums">{o.seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Original booking {ORIGINAL_BOOKING.flightNumber} is a cancelled row, not a replacement offer.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl">Elapsed time, not clock faces</h2>
          <p className="mt-1 text-sm text-muted">
            ME615 arrives Madrid at {timeInZone(me615a.arriveIso, "Europe/Madrid")} CEST and leaves at{" "}
            {timeInZone(me615b.departIso, "Europe/Madrid")} CEST. {naive} Computed elapsed: {elapsed} minutes. Policy
            minimum: 60.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl">Hotels: description, walk, hybrid rank</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {HOTELS.map((h) => (
              <article key={h.id} className="overflow-hidden rounded-xl bg-paper shadow-border">
                <img src={h.image} alt="" className="photo h-36 w-full object-cover" />
                <div className="p-3">
                  <h3 className="font-display text-lg">{h.name}</h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{h.description}</p>
                  <p className="mt-2 font-mono text-xs text-subtle">
                    walk {h.walkMinutes}m · {gbp(h.nightPence)} · lexical {h.lexical} · semantic {h.semantic}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl">Journey graph</h2>
          <svg viewBox="0 0 640 180" className="mt-4 w-full rounded-xl bg-paper p-3 shadow-border" aria-hidden="true">
            <path d="M40 90 H200" stroke="currentColor" className="text-line-strong" />
            <path d="M200 90 H360" stroke="currentColor" className="text-line-strong" />
            <path d="M360 90 H520" stroke="currentColor" className="text-line-strong" />
            <path d="M200 90 V40 H360" stroke="currentColor" className="text-accent" fill="none" />
            <Node x={40} y={90} label="LHR" />
            <Node x={200} y={90} label="MAD" />
            <Node x={360} y={90} label="LIS" />
            <Node x={520} y={90} label="Studio" />
            <Node x={200} y={40} label="ME615 trap" small />
          </svg>
          <p className="mt-2 text-xs text-muted">
            Direct offers skip Madrid. Hotel WALK edges attach to the studio; Alfama Watch is 26 minutes and fails nearby.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl">Onboarding conversation</h2>
          <p className="mt-1 text-sm text-muted">
            Stored under the Onward namespace and the Alex actor. If long-term extraction is not ready, this conversation
            is short-term source context — never presented as a live AgentCore retrieval of extracted facts.
          </p>
          <ol className="mt-3 space-y-2">
            {ONBOARDING.map((t) => (
              <li key={t.at} className="rounded-lg bg-paper px-3 py-2 text-sm shadow-border">
                <span className="text-xs uppercase tracking-wider text-subtle">{t.role}</span>
                <p>{t.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-2xl">Versioned sources</h2>
          <ul className="mt-3 space-y-2">
            {POLICIES.map((p) => (
              <li key={p.id} className="rounded-lg bg-paper px-3 py-2 shadow-border">
                <p className="font-medium">{p.title}</p>
                <p className="font-mono text-xs text-subtle">
                  {p.uri} · {p.version} · {p.versionId}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl">Image disclosures</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {IMAGE_DISCLOSURES.map((d) => (
              <li key={d.src}>
                {d.note} Prompt sidecar: {d.prompt}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Node({ x, y, label, small }: { x: number; y: number; label: string; small?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={small ? 8 : 12} className="fill-accent" />
      <text x={x} y={y + (small ? 24 : 28)} textAnchor="middle" className="fill-ink text-xs">
        {label}
      </text>
    </g>
  );
}
