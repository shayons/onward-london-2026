import assert from "node:assert/strict";
import { test } from "node:test";
import { CANONICAL_REQUEST } from "./dataset.ts";
import { defaultInventory, runEngine } from "./engine.ts";
import type { EngineInput, Itinerary } from "./types.ts";

function itineraryOf(text: string, extra?: Partial<EngineInput>) {
  return runEngine({
    text,
    memoryEnabled: extra?.memoryEnabled ?? true,
    inventory: extra?.inventory ?? defaultInventory(),
    previous: extra?.previous ?? null,
  });
}

function flight(it: Itinerary | null) {
  return it?.bundle.offerId.replace("offer:", "");
}
function hotel(it: Itinerary | null) {
  return it?.bundle.hotelId;
}

test("canonical request: AX218 + Pátio House, £490, 12:25", () => {
  const r = itineraryOf(CANONICAL_REQUEST);
  assert.equal(r.unsupported, null);
  assert.ok(r.itinerary);
  assert.equal(flight(r.itinerary), "AX218");
  assert.equal(hotel(r.itinerary), "hotel:patio-house");
  assert.equal(r.itinerary?.bundle.cost.completePence, 49000);
  const venue = new Date(r.itinerary!.bundle.venueArrivalIso);
  assert.equal(venue.getUTCHours(), 11);
  assert.equal(venue.getUTCMinutes(), 25);
});

test("memory off ranks cheapest eligible: AX218 + Forum, £470", () => {
  const r = itineraryOf(CANONICAL_REQUEST, { memoryEnabled: false });
  assert.equal(flight(r.itinerary), "AX218");
  assert.equal(hotel(r.itinerary), "hotel:forum-rooms");
  assert.equal(r.itinerary?.bundle.cost.completePence, 47000);
});

test("AX404 is rejected for late venue arrival", () => {
  const r = itineraryOf(CANONICAL_REQUEST);
  const late = r.itinerary?.rejected.find((x) => x.subject === "AX404");
  assert.equal(late?.code, "late_arrival");
});

test("ME615 is rejected for short Madrid connection", () => {
  const r = itineraryOf(CANONICAL_REQUEST);
  const short = r.itinerary?.rejected.find((x) => x.subject === "ME615");
  assert.equal(short?.code, "short_connection");
  assert.equal(short?.evidence.elapsedMin, 45);
});

test("no complete feasible trip strictly under £450", () => {
  const r = itineraryOf(
    "My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £450.",
  );
  assert.equal(r.itinerary, null);
  assert.ok(r.noMatch);
  assert.equal(r.noMatch?.cheapestEligiblePence, 47000);
});

test("earlier arrival follow-up selects AX102", () => {
  const first = itineraryOf(CANONICAL_REQUEST);
  const r = itineraryOf("Can I arrive earlier?", { previous: first.contract });
  assert.equal(flight(r.itinerary), "AX102");
  assert.equal(r.itinerary?.bundle.cost.completePence, 59000);
});

test("cheapest complete follow-up selects Forum", () => {
  const first = itineraryOf(CANONICAL_REQUEST);
  const r = itineraryOf("What's the cheapest complete price?", {
    previous: first.contract,
    memoryEnabled: true,
  });
  assert.equal(hotel(r.itinerary), "hotel:forum-rooms");
  assert.equal(r.itinerary?.bundle.cost.completePence, 47000);
});

test("AX218 stock 0 removes it from recommendations", () => {
  const inv = defaultInventory();
  inv.offerSeats = { ...inv.offerSeats, "offer:AX218": 0 };
  const r = itineraryOf(CANONICAL_REQUEST, { inventory: inv, memoryEnabled: true });
  assert.notEqual(flight(r.itinerary), "AX218");
  assert.equal(hotel(r.itinerary), "hotel:patio-house");
  assert.equal(flight(r.itinerary), "ME330");
  assert.equal(r.itinerary?.bundle.cost.completePence, 56400);
});

test("AX102 + Pátio House is £590", () => {
  const first = itineraryOf(CANONICAL_REQUEST);
  const r = itineraryOf("Can I arrive earlier?", { previous: first.contract });
  assert.equal(r.itinerary?.bundle.cost.completePence, 59000);
});

test("ME330 + Pátio is £564 when AX218 is gone", () => {
  const inv = defaultInventory();
  inv.offerSeats = { ...inv.offerSeats, "offer:AX218": 0 };
  const r = itineraryOf(CANONICAL_REQUEST, { inventory: inv });
  assert.equal(r.itinerary?.bundle.cost.completePence, 56400);
});

test("unsupported city is explained, not substituted", () => {
  const r = itineraryOf("Get me to Tokyo tomorrow");
  assert.ok(r.unsupported);
  assert.match(r.unsupported ?? "", /Tokyo/i);
});

test("six semantic layers all emit evidence", () => {
  const r = itineraryOf(CANONICAL_REQUEST);
  const layers = [
    "business_context",
    "ontology",
    "disambiguation",
    "metrics",
    "relationships",
    "verified_examples",
  ];
  for (const layer of layers) {
    assert.ok(
      r.events.some((e) => e.type === "evidence" && e.layer === layer),
      `missing evidence for ${layer}`,
    );
  }
});
