import type {
  Entity,
  FlightLeg,
  Hotel,
  MemoryTurn,
  Offer,
  PolicyDoc,
  Transfer,
} from "./types.ts";

/** Fixed demo clock: 9 September 2026, 18:00 Europe/London. */
export const DEMO_CLOCK = "2026-09-09T18:00:00+01:00";
export const DEMO_CLOCK_LABEL = "9 September 2026, 18:00 Europe/London";
export const MEETING_ISO = "2026-09-10T14:00:00+01:00";
export const TRAVEL_DATE = "2026-09-10";
export const CANONICAL_BUDGET_PENCE = 65000;
export const ARRIVAL_ALLOWANCE_MIN = 45;
export const MIN_CONNECTION_MIN = 60;
export const DEFAULT_NEARBY_WALK_MIN = 20;

export const CANONICAL_REQUEST =
  "My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.";

export const TRAVELLER = {
  id: "person:alex-morgan",
  name: "Alex Morgan",
  role: "Designer",
  city: "London",
  image: "/images/alex-morgan.jpg",
  actor: "alex-morgan",
};

export const ORIGINAL_BOOKING = {
  id: "booking:ax201",
  flightNumber: "AX201",
  origin: "LHR",
  destination: "LIS",
  departIso: "2026-09-10T07:05:00+01:00",
  arriveIso: "2026-09-10T09:45:00+01:00",
  farePence: 22000,
  bagPence: 3500,
  status: "cancelled" as const,
};

export const ENTITIES: Entity[] = [
  {
    id: "person:alex-morgan",
    type: "person",
    name: "Alex Morgan",
    aliases: ["alex", "alex morgan", "me", "i"],
    attrs: { city: "London", role: "designer", actor: "alex-morgan" },
  },
  {
    id: "airport:LHR",
    type: "airport",
    name: "London Heathrow",
    aliases: ["heathrow", "lhr", "london heathrow"],
    attrs: { iata: "LHR", tz: "Europe/London", city: "London" },
  },
  {
    id: "airport:LIS",
    type: "airport",
    name: "Lisbon Humberto Delgado",
    aliases: ["lisbon airport", "lis", "humberto delgado"],
    attrs: { iata: "LIS", tz: "Europe/Lisbon", city: "Lisbon" },
  },
  {
    id: "airport:MAD",
    type: "airport",
    name: "Madrid Barajas",
    aliases: ["madrid", "mad", "barajas"],
    attrs: { iata: "MAD", tz: "Europe/Madrid", city: "Madrid" },
  },
  {
    id: "city:london",
    type: "city",
    name: "London",
    aliases: ["london"],
    attrs: { country: "GB" },
  },
  {
    id: "city:lisbon",
    type: "city",
    name: "Lisbon",
    aliases: ["lisbon", "lisboa"],
    attrs: { country: "PT" },
  },
  {
    id: "venue:ribeira-design-studio",
    type: "venue",
    name: "Ribeira Design Studio",
    aliases: [
      "ribeira",
      "lisbon meeting",
      "my lisbon meeting",
      "the studio",
      "client meeting",
      "meeting venue",
    ],
    attrs: { address: "Rua da Misericórdia, Chiado", tz: "Europe/Lisbon" },
  },
  {
    id: "trip:lisbon-client-2026",
    type: "trip",
    name: "Lisbon client meeting",
    aliases: ["this trip", "my trip", "the trip"],
    attrs: { date: TRAVEL_DATE, origin: "LHR", destination: "LIS" },
  },
  {
    id: "airline:AX",
    type: "airline",
    name: "Aether Air",
    aliases: ["aether", "ax"],
    attrs: { iata: "AX" },
  },
  {
    id: "airline:ME",
    type: "airline",
    name: "Mare Europa",
    aliases: ["mare", "me", "mare europa"],
    attrs: { iata: "ME" },
  },
];

export const OFFERS: Offer[] = [
  {
    id: "offer:AX218",
    flightNumber: "AX218",
    airlineId: "airline:AX",
    origin: "LHR",
    destination: "LIS",
    farePence: 24500,
    bagPence: 3500,
    seats: 4,
    kind: "direct",
    notes: "Morning direct. Lands with comfortable venue slack.",
  },
  {
    id: "offer:AX102",
    flightNumber: "AX102",
    airlineId: "airline:AX",
    origin: "LHR",
    destination: "LIS",
    farePence: 34500,
    bagPence: 3500,
    seats: 2,
    kind: "direct",
    notes: "Earliest direct. Higher fare.",
  },
  {
    id: "offer:AX404",
    flightNumber: "AX404",
    airlineId: "airline:AX",
    origin: "LHR",
    destination: "LIS",
    farePence: 19800,
    bagPence: 3500,
    seats: 9,
    kind: "direct",
    notes: "Cheapest advertised fare. Lands at 13:20 — too late for the studio.",
  },
  {
    id: "offer:ME330",
    flightNumber: "ME330",
    airlineId: "airline:ME",
    origin: "LHR",
    destination: "LIS",
    farePence: 31900,
    bagPence: 3500,
    seats: 3,
    kind: "direct",
    notes: "Later direct. Still reaches the venue before 14:00.",
  },
  {
    id: "offer:ME615",
    flightNumber: "ME615",
    airlineId: "airline:ME",
    origin: "LHR",
    destination: "LIS",
    farePence: 26800,
    bagPence: 3500,
    seats: 5,
    kind: "connecting",
    notes: "Connects in Madrid. Elapsed connection 45 minutes; policy minimum is 60.",
  },
];

export const LEGS: FlightLeg[] = [
  {
    id: "leg:AX218",
    offerId: "offer:AX218",
    flightNumber: "AX218",
    airlineId: "airline:AX",
    from: "LHR",
    to: "LIS",
    departIso: "2026-09-10T08:25:00+01:00",
    arriveIso: "2026-09-10T11:05:00+01:00",
    sequence: 1,
  },
  {
    id: "leg:AX102",
    offerId: "offer:AX102",
    flightNumber: "AX102",
    airlineId: "airline:AX",
    from: "LHR",
    to: "LIS",
    departIso: "2026-09-10T06:55:00+01:00",
    arriveIso: "2026-09-10T09:35:00+01:00",
    sequence: 1,
  },
  {
    id: "leg:AX404",
    offerId: "offer:AX404",
    flightNumber: "AX404",
    airlineId: "airline:AX",
    from: "LHR",
    to: "LIS",
    departIso: "2026-09-10T10:40:00+01:00",
    arriveIso: "2026-09-10T13:20:00+01:00",
    sequence: 1,
  },
  {
    id: "leg:ME330",
    offerId: "offer:ME330",
    flightNumber: "ME330",
    airlineId: "airline:ME",
    from: "LHR",
    to: "LIS",
    departIso: "2026-09-10T09:10:00+01:00",
    arriveIso: "2026-09-10T11:50:00+01:00",
    sequence: 1,
  },
  {
    id: "leg:ME615a",
    offerId: "offer:ME615",
    flightNumber: "ME615",
    airlineId: "airline:ME",
    from: "LHR",
    to: "MAD",
    departIso: "2026-09-10T07:50:00+01:00",
    arriveIso: "2026-09-10T10:55:00+02:00",
    sequence: 1,
  },
  {
    id: "leg:ME615b",
    offerId: "offer:ME615",
    flightNumber: "ME615",
    airlineId: "airline:ME",
    from: "MAD",
    to: "LIS",
    departIso: "2026-09-10T11:40:00+02:00",
    arriveIso: "2026-09-10T12:05:00+01:00",
    sequence: 2,
  },
];

export const HOTELS: Hotel[] = [
  {
    id: "hotel:patio-house",
    name: "Pátio House",
    walkMinutes: 14,
    nightPence: 17200,
    rooms: 2,
    quiet: true,
    image: "/images/hotel-patio-house.jpg",
    lexical: 0.62,
    semantic: 0.84,
    description:
      "A small courtyard house in Príncipe Real. Limewashed rooms, an orange tree, and a desk that faces the garden. Quiet after ten. Fourteen minutes on foot to Ribeira Design Studio.",
  },
  {
    id: "hotel:forum-rooms",
    name: "Forum Rooms",
    walkMinutes: 8,
    nightPence: 15200,
    rooms: 4,
    quiet: false,
    image: "/images/hotel-forum-rooms.jpg",
    lexical: 0.71,
    semantic: 0.77,
    description:
      "A Chiado townhouse with terrazzo floors and a lively ground-floor lounge used by visiting studios. Eight minutes to the venue. More energy than hush — the bar stays open late.",
  },
  {
    id: "hotel:alfama-watch",
    name: "Alfama Watch",
    walkMinutes: 26,
    nightPence: 14000,
    rooms: 3,
    quiet: true,
    image: "/images/hotel-alfama-watch.jpg",
    lexical: 0.44,
    semantic: 0.69,
    description:
      "A hillside terrace looking over tiled roofs to the river. Quiet and photogenic, but twenty-six minutes on foot to the studio — outside the nearby walking rule.",
  },
];

export const TRANSFER: Transfer = {
  id: "transfer:lis-car-venue",
  from: "LIS",
  to: "venue:ribeira-design-studio",
  minutes: 35,
  pence: 3800,
  mode: "Private car",
};

export const POLICIES: PolicyDoc[] = [
  {
    id: "policy:min-connection:v3",
    title: "Minimum connection time",
    version: "v3",
    uri: "s3://onward-fixtures/policies/min-connection-v3.md",
    versionId: "3N6QK2",
    body: `Effective 1 April 2026.

A connecting itinerary is feasible only when elapsed time between the scheduled arrival of the inbound leg and the scheduled departure of the outbound leg is at least 60 minutes.

Elapsed time is computed from timezone-aware instants, not from local clock faces. A 10:55 arrival and an 11:40 departure in the same airport is 45 minutes if both timestamps share an offset, regardless of how the times look when printed without zones.

This is a versioned demo policy, not a carrier standard.`,
  },
  {
    id: "policy:nearby-walk:v2",
    title: "Nearby walking definition",
    version: "v2",
    uri: "s3://onward-fixtures/policies/nearby-walk-v2.md",
    versionId: "2H8RL1",
    body: `When the traveller asks for a hotel “nearby” without a number, Onward uses a 20-minute walk to the meeting venue under the current demo policy.

Walking minutes are authored edges on the journey graph, not live routing. A hotel that is semantically about Lisbon or about design can still fail this constraint.

An explicit instruction in the current question overrides the default.`,
  },
  {
    id: "policy:complete-cost:v1",
    title: "Complete cost definition",
    version: "v1",
    uri: "s3://onward-fixtures/policies/complete-cost-v1.md",
    versionId: "1C4PT9",
    body: `Complete cost = outbound fare + requested checked bags + one tax-inclusive hotel night + one airport-to-meeting transfer.

Amounts are integer pence in GBP. Supplier fares and hotel prices already include applicable taxes; taxes are not added twice.

Excluded from this contract: travel to Heathrow, a return flight, a return airport transfer.

The budget bound is strict: complete cost must be less than the cap. Equality with the cap fails.`,
  },
  {
    id: "example:complete-trip-pattern:v1",
    title: "Complete-trip pattern",
    version: "v1",
    uri: "s3://onward-fixtures/examples/complete-trip-v1.md",
    versionId: "1E9VM4",
    body: `A stored, authored query pattern — not a production-certified travel policy.

A bundle is eligible only when all of the following hold against current records:

1. Last flight lands such that landing + arrival allowance (45 min) + transfer (35 min) is at or before the venue deadline.
2. Every connection meets the versioned minimum elapsed time.
3. Hotel walking edge ≤ nearby limit.
4. Complete cost (integer pence) is strictly under the budget.
5. Offer seats > 0 and hotel rooms > 0 in the current inventory snapshot.

Soft preferences (quiet hotel, walking) rank eligible bundles only. They cannot create availability.`,
  },
];

export const ONBOARDING: MemoryTurn[] = [
  {
    role: "assistant",
    at: "2026-09-04T09:12:00+01:00",
    text: "Any hotel preferences I should keep for client trips?",
  },
  {
    role: "user",
    at: "2026-09-04T09:13:00+01:00",
    text: "Quiet if I can. A courtyard or garden helps me work in the evening. I'd rather walk to the studio than take a taxi across town. Window if there's a choice.",
  },
];

export const LAYER_META: Record<
  string,
  { title: string; question: string; prepared: string }
> = {
  business_context: {
    title: "Business context",
    question: "What does success mean?",
    prepared: "Trip contract, cost scope, recent conversation",
  },
  ontology: {
    title: "Ontology",
    question: "Which people, places and things are involved?",
    prepared: "Stable entity IDs, types and aliases",
  },
  disambiguation: {
    title: "Disambiguation",
    question: "What do the user's words mean here?",
    prepared: "Fixed clock, walking definition, embeddings, actor-scoped preferences",
  },
  metrics: {
    title: "Metrics",
    question: "How do we measure a complete trip?",
    prepared: "Integer-pence prices and a single complete-cost definition",
  },
  relationships: {
    title: "Relationships",
    question: "Will the whole journey work?",
    prepared: "Flight-leg, transfer and hotel-walk edges, versioned policies",
  },
  verified_examples: {
    title: "Verified examples",
    question: "Is the assembled answer supported?",
    prepared: "Stored complete-trip pattern and tested invariants",
  },
};

export const IMAGE_DISCLOSURES = [
  {
    src: "/images/alex-morgan.jpg",
    prompt: "/images/prompts/alex-morgan.txt",
    note: "AI-generated portrait. Alex Morgan is not a real customer.",
  },
  {
    src: "/images/lisbon-destination.jpg",
    prompt: "/images/prompts/lisbon-destination.txt",
    note: "AI-generated destination still. It does not identify a bookable property.",
  },
  {
    src: "/images/hotel-patio-house.jpg",
    prompt: "/images/prompts/hotel-patio-house.txt",
    note: "AI-generated. Pátio House is a fictional hotel.",
  },
  {
    src: "/images/hotel-forum-rooms.jpg",
    prompt: "/images/prompts/hotel-forum-rooms.txt",
    note: "AI-generated. Forum Rooms is a fictional hotel.",
  },
  {
    src: "/images/hotel-alfama-watch.jpg",
    prompt: "/images/prompts/hotel-alfama-watch.txt",
    note: "AI-generated. Alfama Watch is a fictional hotel.",
  },
  {
    src: "/images/venue-ribeira.jpg",
    prompt: "/images/prompts/venue-ribeira.txt",
    note: "AI-generated. Ribeira Design Studio is a fictional venue.",
  },
];
