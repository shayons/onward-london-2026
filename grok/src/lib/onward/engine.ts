import {
  ARRIVAL_ALLOWANCE_MIN,
  CANONICAL_BUDGET_PENCE,
  CANONICAL_REQUEST,
  DEFAULT_NEARBY_WALK_MIN,
  DEMO_CLOCK,
  ENTITIES,
  HOTELS,
  LAYER_META,
  LEGS,
  MEETING_ISO,
  MIN_CONNECTION_MIN,
  OFFERS,
  ONBOARDING,
  POLICIES,
  TRAVEL_DATE,
  TRANSFER,
} from "./dataset.ts";
import { addMinutes, elapsedMinutes, gbp, rid, timeInZone } from "./format.ts";
import type {
  Bundle,
  CostLines,
  EngineInput,
  EngineResult,
  FlightLeg,
  Hotel,
  InventoryOverride,
  Itinerary,
  LayerId,
  NoMatch,
  Offer,
  Rejection,
  TraceEvent,
  TripContract,
} from "./types.ts";

const ZONE_AIRPORT: Record<string, string> = {
  LHR: "Europe/London",
  LIS: "Europe/Lisbon",
  MAD: "Europe/Madrid",
};

function airlineName(id: string): string {
  return ENTITIES.find((e) => e.id === id)?.name ?? id;
}

function hotelById(id: string): Hotel {
  const h = HOTELS.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown hotel ${id}`);
  return h;
}

function offerById(id: string): Offer {
  const o = OFFERS.find((x) => x.id === id);
  if (!o) throw new Error(`Unknown offer ${id}`);
  return o;
}

function legsFor(offerId: string): FlightLeg[] {
  return LEGS.filter((l) => l.offerId === offerId).sort((a, b) => a.sequence - b.sequence);
}

function applyInventory(inv?: InventoryOverride) {
  const offers = OFFERS.map((o) => ({
    ...o,
    seats: inv?.offerSeats?.[o.id] ?? o.seats,
  }));
  const hotels = HOTELS.map((h) => ({
    ...h,
    rooms: inv?.hotelRooms?.[h.id] ?? h.rooms,
  }));
  return { offers, hotels };
}

function parseBudget(text: string): number | null {
  const m = text.match(/\bunder\s*£?\s*([0-9][0-9,]*)\b/i);
  if (!m?.[1]) return null;
  return Number(m[1].replace(/,/g, "")) * 100;
}

function isUnsupported(text: string): string | null {
  const t = text.toLowerCase();
  const elsewhere =
    /(tokyo|berlin|new york|nyc|paris|rome|madrid stay|dublin|singapore|sydney|chicago)/i.exec(
      t,
    );
  if (elsewhere) {
    return `Onward’s current corpus is the London Heathrow → Lisbon recovery on 10 September 2026. It does not silently substitute another city for “${elsewhere[1]}”.`;
  }
  if (/\b(three|3|two|2)\s+nights?\b/.test(t) || /\bweek\b/.test(t)) {
    return "This scenario holds a single hotel night, 10–11 September. A different stay length is out of corpus — Onward will not invent nights.";
  }
  return null;
}

function mergeContract(text: string, previous: TripContract | null): TripContract {
  const t = text.toLowerCase();
  const budgetFromText = parseBudget(text);
  let rankBy = previous?.rankBy ?? ("preference" as const);
  if (/\b(earlier|earliest|arrive earlier)\b/.test(t)) rankBy = "arrival";
  if (/\b(cheapest|lowest|least expensive)\b/.test(t)) rankBy = "cost";

  return {
    travellerId: "person:alex-morgan",
    originAirport: "LHR",
    destinationCity: "lisbon",
    destinationAirport: "LIS",
    venueId: "venue:ribeira-design-studio",
    travelDate: TRAVEL_DATE,
    arriveByIso: MEETING_ISO,
    hotelNights: 1,
    checkIn: "2026-09-10",
    checkOut: "2026-09-11",
    nearbyWalkMinutes: previous?.nearbyWalkMinutes ?? DEFAULT_NEARBY_WALK_MIN,
    budgetPence: budgetFromText ?? previous?.budgetPence ?? CANONICAL_BUDGET_PENCE,
    bagsChecked: 1,
    rankBy,
    costScope: [
      "outbound_fare",
      "checked_bags",
      "hotel_night_tax_inclusive",
      "airport_to_meeting_transfer",
    ],
  };
}

function connectionMinutes(legs: FlightLeg[]): number | null {
  if (legs.length < 2) return null;
  let min = Infinity;
  for (let i = 1; i < legs.length; i++) {
    const prev = legs[i - 1];
    const next = legs[i];
    if (!prev || !next) continue;
    min = Math.min(min, elapsedMinutes(prev.arriveIso, next.departIso));
  }
  return Number.isFinite(min) ? min : null;
}

function costFor(offer: Offer, hotel: Hotel): CostLines {
  const farePence = offer.farePence;
  const bagPence = offer.bagPence;
  const hotelPence = hotel.nightPence;
  const transferPence = TRANSFER.pence;
  return {
    farePence,
    bagPence,
    hotelPence,
    transferPence,
    completePence: farePence + bagPence + hotelPence + transferPence,
  };
}

function evaluateBundle(
  offer: Offer,
  hotel: Hotel,
  contract: TripContract,
): Bundle {
  const legs = legsFor(offer.id);
  const last = legs[legs.length - 1];
  if (!last) {
    return {
      id: `${offer.flightNumber}+${hotel.id}`,
      offerId: offer.id,
      hotelId: hotel.id,
      transferId: TRANSFER.id,
      legs,
      cost: costFor(offer, hotel),
      landIso: "",
      venueArrivalIso: "",
      connectionMinutes: null,
      walkMinutes: hotel.walkMinutes,
      quiet: hotel.quiet,
      eligible: false,
      rejections: [
        {
          code: "unsupported",
          subject: offer.flightNumber,
          detail: "Offer has no flight legs.",
          evidence: {},
        },
      ],
    };
  }
  const landIso = last.arriveIso;
  const venueArrivalIso = addMinutes(landIso, ARRIVAL_ALLOWANCE_MIN + TRANSFER.minutes);
  const conn = connectionMinutes(legs);
  const cost = costFor(offer, hotel);
  const rejections: Rejection[] = [];

  if (offer.seats <= 0) {
    rejections.push({
      code: "no_seats",
      subject: offer.flightNumber,
      detail: `${offer.flightNumber} has no remaining seats in the current fictional inventory.`,
      evidence: { seats: offer.seats },
    });
  }
  if (hotel.rooms <= 0) {
    rejections.push({
      code: "no_rooms",
      subject: hotel.name,
      detail: `${hotel.name} has no remaining rooms in the current fictional inventory.`,
      evidence: { rooms: hotel.rooms },
    });
  }
  if (Date.parse(venueArrivalIso) > Date.parse(contract.arriveByIso)) {
    rejections.push({
      code: "late_arrival",
      subject: offer.flightNumber,
      detail: `${offer.flightNumber} lands at ${timeInZone(landIso, "Europe/Lisbon")} Lisbon. After a ${ARRIVAL_ALLOWANCE_MIN}-minute arrival allowance and a ${TRANSFER.minutes}-minute transfer, Alex reaches the studio at ${timeInZone(venueArrivalIso, "Europe/Lisbon")} — after the 14:00 meeting.`,
      evidence: {
        landLocal: timeInZone(landIso, "Europe/Lisbon"),
        venueLocal: timeInZone(venueArrivalIso, "Europe/Lisbon"),
        deadlineLocal: timeInZone(contract.arriveByIso, "Europe/Lisbon"),
        allowanceMin: ARRIVAL_ALLOWANCE_MIN,
        transferMin: TRANSFER.minutes,
      },
    });
  }
  if (conn !== null && conn < MIN_CONNECTION_MIN) {
    rejections.push({
      code: "short_connection",
      subject: offer.flightNumber,
      detail: `${offer.flightNumber} connects in Madrid with ${conn} elapsed minutes. The versioned minimum is ${MIN_CONNECTION_MIN} minutes.`,
      evidence: {
        elapsedMin: conn,
        policyMin: MIN_CONNECTION_MIN,
        policy: "policy:min-connection:v3",
      },
    });
  }
  if (hotel.walkMinutes > contract.nearbyWalkMinutes) {
    rejections.push({
      code: "walk_too_far",
      subject: hotel.name,
      detail: `${hotel.name} is a ${hotel.walkMinutes}-minute walk to the venue. “Nearby” is ${contract.nearbyWalkMinutes} minutes under policy v2.`,
      evidence: {
        walkMinutes: hotel.walkMinutes,
        nearbyLimit: contract.nearbyWalkMinutes,
      },
    });
  }
  if (cost.completePence >= contract.budgetPence) {
    rejections.push({
      code: "over_budget",
      subject: `${offer.flightNumber} + ${hotel.name}`,
      detail: `Complete cost ${gbp(cost.completePence)} is not strictly under ${gbp(contract.budgetPence)}.`,
      evidence: { completePence: cost.completePence, budgetPence: contract.budgetPence },
    });
  }

  return {
    id: `${offer.flightNumber}+${hotel.id.replace("hotel:", "")}`,
    offerId: offer.id,
    hotelId: hotel.id,
    transferId: TRANSFER.id,
    legs,
    cost,
    landIso,
    venueArrivalIso,
    connectionMinutes: conn,
    walkMinutes: hotel.walkMinutes,
    quiet: hotel.quiet,
    eligible: rejections.length === 0,
    rejections,
  };
}

function rankBundles(bundles: Bundle[], contract: TripContract, memoryOn: boolean): Bundle[] {
  const copy = [...bundles];
  copy.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (contract.rankBy === "arrival") {
      const d = Date.parse(a.venueArrivalIso) - Date.parse(b.venueArrivalIso);
      if (d !== 0) return d;
    }
    if (contract.rankBy === "cost") {
      return a.cost.completePence - b.cost.completePence;
    }
    if (memoryOn && a.quiet !== b.quiet) return a.quiet ? -1 : 1;
    return a.cost.completePence - b.cost.completePence;
  });
  return copy;
}

function uniqueRejections(bundles: Bundle[]): Rejection[] {
  const seen = new Set<string>();
  const out: Rejection[] = [];
  for (const b of bundles) {
    for (const r of b.rejections) {
      const key = `${r.code}:${r.subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}

function prose(itinerary: Itinerary, contract: TripContract): string {
  const b = itinerary.bundle;
  const offer = offerById(b.offerId);
  const hotel = hotelById(b.hotelId);
  const first = b.legs[0];
  const last = b.legs[b.legs.length - 1];
  const slack = elapsedMinutes(b.venueArrivalIso, contract.arriveByIso);
  const lines: string[] = [];

  lines.push(
    `${offer.flightNumber} ${airlineName(offer.airlineId)} leaves Heathrow at ${first ? timeInZone(first.departIso, "Europe/London") : "—"} and lands in Lisbon at ${last ? timeInZone(last.arriveIso, "Europe/Lisbon") : "—"}. After the ${ARRIVAL_ALLOWANCE_MIN}-minute arrival allowance and a ${TRANSFER.minutes}-minute ${TRANSFER.mode.toLowerCase()}, you reach Ribeira Design Studio at ${timeInZone(b.venueArrivalIso, "Europe/Lisbon")} — ${slack >= 60 ? `${Math.floor(slack / 60)}h ${slack % 60}m` : `${slack} min`} before the 14:00 meeting.`,
  );

  lines.push(
    `${hotel.name} is ${hotel.walkMinutes} minutes on foot, inside the ${contract.nearbyWalkMinutes}-minute nearby rule.${itinerary.memoryUsed && hotel.quiet ? " It matches the quiet-courtyard preference from Alex’s onboarding conversation." : ""}`,
  );

  lines.push(
    `Complete cost ${gbp(b.cost.completePence)}: fare ${gbp(b.cost.farePence)}, checked bag ${gbp(b.cost.bagPence)}, hotel ${gbp(b.cost.hotelPence)}, transfer ${gbp(b.cost.transferPence)} — strictly under ${gbp(contract.budgetPence)}. Taxes are already in the supplier figures.`,
  );

  const notable = itinerary.rejected.filter(
    (r) => r.code === "late_arrival" || r.code === "short_connection" || r.code === "no_seats",
  );
  if (notable.length) {
    lines.push(notable.map((r) => r.detail).join(" "));
  }

  lines.push("No booking is made. Inventory is the current fictional Onward snapshot, not a live supplier feed.");
  return lines.join("\n\n");
}

function noMatchProse(noMatch: NoMatch, contract: TripContract): string {
  const bits = noMatch.reasons.join(" ");
  const floor =
    noMatch.cheapestEligiblePence !== null
      ? ` The cheapest complete eligible trip currently in inventory is ${gbp(noMatch.cheapestEligiblePence)}.`
      : " No complete eligible trip exists in this corpus under the current constraints.";
  return `No itinerary meets the contract (arrive at Ribeira Design Studio by ${timeInZone(contract.arriveByIso, "Europe/Lisbon")} on ${contract.travelDate}, complete cost strictly under ${gbp(contract.budgetPence)}, nearby hotel, current availability). ${bits}${floor}`;
}

function buildItinerary(
  chosen: Bundle,
  all: Bundle[],
  memoryOn: boolean,
): Itinerary {
  const hotel = hotelById(chosen.hotelId);
  const why = [
    `Venue arrival ${timeInZone(chosen.venueArrivalIso, "Europe/Lisbon")} is at or before 14:00.`,
    `Complete cost ${gbp(chosen.cost.completePence)} uses fare + bag + hotel + transfer in integer pence.`,
    `Hotel walk ${chosen.walkMinutes} min ≤ nearby ${DEFAULT_NEARBY_WALK_MIN} min.`,
    `Offer seats and hotel rooms rechecked against the current snapshot.`,
  ];
  if (memoryOn && hotel.quiet) {
    why.push(
      "Quiet-courtyard preference applied after hard constraints, from the saved onboarding conversation (short-term source context — not a live long-term extraction).",
    );
  }
  return {
    bundle: chosen,
    why,
    rejected: uniqueRejections(all),
    sources: [
      { label: "Complete cost definition", ref: "policy:complete-cost:v1" },
      { label: "Minimum connection v3", ref: "policy:min-connection:v3" },
      { label: "Nearby walking v2", ref: "policy:nearby-walk:v2" },
      { label: "Complete-trip pattern", ref: "example:complete-trip-pattern:v1" },
    ],
    memoryUsed: memoryOn,
    memorySource: memoryOn ? "onboarding_conversation" : "none",
  };
}

export function runEngine(input: EngineInput): EngineResult {
  const requestId = rid("run");
  const mode = input.mode ?? "live";
  const events: TraceEvent[] = [];
  const push = (event: TraceEvent) => events.push(event);

  push({
    type: "run_started",
    delayMs: 0,
    requestId,
    clock: DEMO_CLOCK,
    mode,
    text: input.text,
  });

  const unsupported = isUnsupported(input.text);
  const looksInCorpus =
    /heathrow|lisbon|flight|hotel|cancelled|cancel|meeting|650|450|earlier|cheapest|ax218|bag/i.test(
      input.text,
    ) || Boolean(input.previous);

  if (unsupported || (!looksInCorpus && !input.previous && input.text !== CANONICAL_REQUEST)) {
    const detail =
      unsupported ??
      "Onward can recover the Heathrow → Lisbon meeting on 10 September 2026. Ask about that trip, or use the suggested request.";
    layer(push, "business_context", (L) => {
      L.input("User request", { text: input.text, clock: DEMO_CLOCK });
      L.mapping("Bounded corpus", {
        supported: "LHR→LIS, 10 Sep 2026, one hotel night, meeting 14:00 Lisbon",
      });
      L.tool("onward.engine", "validate_scope", { text: input.text }, { inCorpus: false, detail });
      L.evidence("Request is outside the prepared scenario.", { detail });
    });
    push({ type: "unsupported", delayMs: 160, detail });
    push({ type: "assistant_message", delayMs: 80, text: detail });
    push({ type: "run_complete", delayMs: 40 });
    return {
      requestId,
      contract: input.previous ?? null,
      events,
      itinerary: null,
      noMatch: null,
      unsupported: detail,
    };
  }

  const contract = mergeContract(input.text, input.previous ?? null);
  const { offers, hotels } = applyInventory(input.inventory);
  const tomorrow = TRAVEL_DATE;

  layer(push, "business_context", (L) => {
    L.input("User request and clock", {
      text: input.text,
      clock: DEMO_CLOCK,
      clockNote: "Fixed scenario clock — not wall time.",
    });
    L.mapping("Typed trip contract", contract);
    L.tool(
      "onward.engine",
      "validate_trip_contract",
      {
        arrive_at_venue: contract.arriveByIso,
        complete_budget_pence: contract.budgetPence,
        cost_scope: contract.costScope,
      },
      {
        valid: true,
        success: "Alex at Ribeira Design Studio by 14:00 Lisbon. Complete cost strictly under budget.",
        excludes: ["travel to Heathrow", "return flight", "return transfer"],
      },
    );
    L.evidence("Success means arriving at the venue, not the airport, under one complete-cost definition.", {
      arriveBy: contract.arriveByIso,
      budgetPence: contract.budgetPence,
      rankBy: contract.rankBy,
    });
  });

  const resolved = [
    matchEntity("heathrow"),
    matchEntity("lisbon"),
    matchEntity("my lisbon meeting"),
    matchEntity("alex"),
    matchEntity("this trip"),
  ].filter(Boolean);

  layer(push, "ontology", (L) => {
    L.input("Surface names from the request", [
      "Alex",
      "Heathrow",
      "Lisbon",
      "my Lisbon meeting",
      "the trip",
    ]);
    L.mapping("Alias table", {
      Heathrow: "airport:LHR",
      Lisbon: "city:lisbon + airport:LIS",
      "my Lisbon meeting": "venue:ribeira-design-studio",
      Alex: "person:alex-morgan",
    });
    L.tool(
      "prepared.aurora",
      "SELECT id, type, name, aliases FROM entities WHERE aliases && $names",
      { names: ["heathrow", "lisbon", "alex", "meeting"] },
      resolved,
      42,
    );
    L.evidence("People, places and the trip share identifiers across the store and the graph.", {
      ids: resolved.map((e) => e && e.id),
    });
  });

  const hybrid = [...hotels]
    .map((h) => ({
      id: h.id,
      name: h.name,
      walkMinutes: h.walkMinutes,
      quiet: h.quiet,
      hybrid: Number((0.4 * h.lexical + 0.6 * h.semantic).toFixed(3)),
      lexical: h.lexical,
      semantic: h.semantic,
    }))
    .sort((a, b) => b.hybrid - a.hybrid);

  layer(push, "disambiguation", (L) => {
    L.input("Ambiguous language", {
      tomorrow: "relative to the fixed clock",
      nearby: "no numeric limit in the question",
      hotel: "descriptions + embeddings + preferences",
    });
    L.mapping("Resolved senses", {
      tomorrow: tomorrow,
      nearbyMinutes: contract.nearbyWalkMinutes,
      policy: "policy:nearby-walk:v2",
      "2pm": "14:00 at the venue in Europe/Lisbon",
    });
    L.tool(
      "prepared.aurora",
      `SELECT id, name,
  ts_rank(fts, plainto_tsquery('english', $q)) AS lexical,
  1 - (embedding <=> $q_vec) AS semantic
FROM hotels
ORDER BY 0.4 * lexical + 0.6 * semantic DESC`,
      { q: "hotel nearby quiet courtyard walk studio", model: "Titan Text Embeddings V2 (prepared)" },
      hybrid,
      88,
    );
    if (input.memoryEnabled) {
      L.tool(
        "prepared.memory",
        "retrieve_actor_context",
        {
          namespace: "onward",
          actor: "alex-morgan",
          strategy: "onboarding_conversation",
          label: "short-term source context — not a live AgentCore long-term extraction",
        },
        {
          turns: ONBOARDING,
          extracted: { quiet: true, walk_to_venue: true, window: "soft" },
          note: "Built-in long-term extraction is asynchronous. This run uses the saved onboarding conversation.",
        },
        64,
      );
    } else {
      L.mapping("Memory", {
        enabled: false,
        note: "Historical records remain; they do not influence ranking on this run.",
      });
    }
    L.evidence("“Tomorrow”, “nearby” and hotel fit are definitions plus context, not keyword hits.", {
      tomorrow,
      nearbyWalkMinutes: contract.nearbyWalkMinutes,
      hybridTop: hybrid[0]?.name,
      memoryEnabled: input.memoryEnabled,
    });
  });

  const bundles = offers.flatMap((o) => hotels.map((h) => evaluateBundle(o, h, contract)));
  const ranked = rankBundles(bundles, contract, input.memoryEnabled);
  const eligible = ranked.filter((b) => b.eligible);

  const metricRows = ranked.map((b) => ({
    offer: offerById(b.offerId).flightNumber,
    hotel: hotelById(b.hotelId).name,
    fare: b.cost.farePence,
    bag: b.cost.bagPence,
    hotel_pence: b.cost.hotelPence,
    transfer: b.cost.transferPence,
    complete_pence: b.cost.completePence,
    under_budget: b.cost.completePence < contract.budgetPence,
  }));

  layer(push, "metrics", (L) => {
    L.input("Complete-cost definition", POLICIES.find((p) => p.id.startsWith("policy:complete-cost")));
    L.mapping("Integer pence", {
      currency: "GBP",
      formula: "fare + checked_bag + hotel_night + transfer",
      budgetPence: contract.budgetPence,
    });
    L.tool(
      "prepared.aurora",
      `SELECT o.flight_number, h.name,
  o.fare_pence + o.bag_pence + h.night_pence + t.pence AS complete_pence
FROM offers o
CROSS JOIN hotels h
CROSS JOIN transfers t
WHERE t.id = 'transfer:lis-car-venue'`,
      { budget_pence: contract.budgetPence },
      metricRows,
      51,
    );
    L.evidence("A cheap fare is not a complete trip. Complete cost is one number, in pence.", {
      cheapestAdvertised: "AX404 £198 fare",
      cheapestCompleteEligible: eligible[0]
        ? gbp(
            [...eligible].sort((a, b) => a.cost.completePence - b.cost.completePence)[0]
              ?.cost.completePence ?? 0,
          )
        : null,
    });
  });

  const pathRows = ranked.map((b) => {
    const o = offerById(b.offerId);
    return {
      path:
        o.kind === "connecting"
          ? "LHR-[:LEG]->MAD-[:LEG]->LIS-[:TRANSFER]->venue"
          : "LHR-[:LEG]->LIS-[:TRANSFER]->venue",
      offer: o.flightNumber,
      hotel: hotelById(b.hotelId).name,
      land: timeInZone(b.landIso, "Europe/Lisbon"),
      venueArrival: timeInZone(b.venueArrivalIso, "Europe/Lisbon"),
      connectionElapsed: b.connectionMinutes,
      walk: b.walkMinutes,
      eligible: b.eligible,
      reasons: b.rejections.map((r) => r.code),
    };
  });

  layer(push, "relationships", (L) => {
    L.input("Journey graph", {
      nodes: ["LHR", "MAD", "LIS", "venue:ribeira-design-studio", ...hotels.map((h) => h.id)],
      edgeTypes: ["LEG", "TRANSFER", "WALK"],
    });
    L.mapping("Elapsed time, not clock faces", {
      minConnection: MIN_CONNECTION_MIN,
      arrivalAllowance: ARRIVAL_ALLOWANCE_MIN,
      transferMinutes: TRANSFER.minutes,
      policy: "policy:min-connection:v3",
    });
    L.tool(
      "prepared.neptune",
      `MATCH (o:Offer)-[:HAS_LEG]->(l:Leg)
OPTIONAL MATCH (l)-[:CONNECTS]->(n:Leg)
MATCH (o)-[:LANDS]->(a:Airport {iata:'LIS'})-[:TRANSFER]->(v:Venue)
MATCH (h:Hotel)-[:WALK]->(v)
RETURN o, n, h, elapsed(l,n), walk(h,v)`,
      { arrive_by: contract.arriveByIso },
      pathRows,
      96,
    );
    const traps = uniqueRejections(ranked).filter(
      (r) => r.code === "late_arrival" || r.code === "short_connection",
    );
    L.evidence("A search result and a feasible complete journey are different objects.", {
      ax404: traps.find((r) => r.subject === "AX404")?.detail,
      me615: traps.find((r) => r.subject === "ME615")?.detail,
    });
  });

  const snapshot = eligible.map((b) => ({
    offer: offerById(b.offerId).flightNumber,
    hotel: hotelById(b.hotelId).name,
    seats: offers.find((o) => o.id === b.offerId)?.seats,
    rooms: hotels.find((h) => h.id === b.hotelId)?.rooms,
    completePence: b.cost.completePence,
    venueArrival: timeInZone(b.venueArrivalIso, "Europe/Lisbon"),
    quiet: b.quiet,
  }));

  layer(push, "verified_examples", (L) => {
    L.input("Stored pattern", POLICIES.find((p) => p.id.startsWith("example:complete-trip")));
    L.mapping("Invariants under test", {
      venue_deadline: true,
      min_connection: true,
      nearby_walk: true,
      strict_budget: true,
      current_availability: true,
    });
    L.tool(
      "prepared.aurora",
      `SELECT offer_id, hotel_id, seats, rooms, fare_pence, night_pence
FROM offers JOIN hotels
WHERE seats > 0 AND rooms > 0
  AND complete_pence < $budget
  AND venue_arrival <= $deadline`,
      {
        budget: contract.budgetPence,
        deadline: contract.arriveByIso,
        note: "Recheck immediately before ranking — memory cannot certify stock.",
      },
      snapshot,
      37,
    );
    L.evidence("Eligible bundles rechecked against current prices and availability.", {
      eligibleCount: eligible.length,
      ax218Seats: offers.find((o) => o.flightNumber === "AX218")?.seats,
    });
  });

  if (!eligible.length) {
    const cheapestEligiblePence = null;
    const noMatch: NoMatch = {
      reasons: uniqueRejections(ranked)
        .slice(0, 4)
        .map((r) => r.detail),
      rejected: uniqueRejections(ranked),
      cheapestEligiblePence,
    };
    const underBudgetButInfeasible = ranked.filter(
      (b) => b.cost.completePence < contract.budgetPence && !b.eligible,
    );
    if (underBudgetButInfeasible.length) {
      noMatch.reasons.unshift(
        `Several advertised combinations sit under ${gbp(contract.budgetPence)} but fail deadline, connection, walking or stock.`,
      );
    }
    const globalCheapestEligible = rankBundles(
      offers.flatMap((o) =>
        hotels.map((h) => evaluateBundle(o, h, { ...contract, budgetPence: 10_000_000 })),
      ),
      { ...contract, rankBy: "cost" },
      false,
    ).find((b) => b.eligible);
    if (globalCheapestEligible) {
      noMatch.cheapestEligiblePence = globalCheapestEligible.cost.completePence;
    }
    push({ type: "no_match", delayMs: 180, noMatch });
    push({
      type: "assistant_message",
      delayMs: 120,
      text: noMatchProse(noMatch, contract),
    });
    push({ type: "run_complete", delayMs: 40 });
    return { requestId, contract, events, itinerary: null, noMatch, unsupported: null };
  }

  const chosen = eligible[0]!;
  const itinerary = buildItinerary(chosen, ranked, input.memoryEnabled);
  push({ type: "itinerary", delayMs: 200, itinerary });
  push({ type: "assistant_message", delayMs: 140, text: prose(itinerary, contract) });
  push({ type: "run_complete", delayMs: 40 });

  return { requestId, contract, events, itinerary, noMatch: null, unsupported: null };
}

function matchEntity(alias: string) {
  const a = alias.toLowerCase();
  return ENTITIES.find((e) => e.aliases.includes(a) || e.name.toLowerCase() === a);
}

function layer(
  push: (e: TraceEvent) => void,
  id: LayerId,
  fill: (l: {
    input: (label: string, payload: unknown) => void;
    mapping: (label: string, payload: unknown) => void;
    tool: (
      service: string,
      name: string,
      args: unknown,
      records: unknown,
      durationMs?: number,
    ) => void;
    evidence: (summary: string, payload: unknown) => void;
  }) => void,
) {
  const meta = LAYER_META[id];
  push({ type: "layer_started", delayMs: 90, layer: id, question: meta?.question ?? id });
  fill({
    input: (label, payload) =>
      push({ type: "input", delayMs: 40, layer: id, label, payload }),
    mapping: (label, payload) =>
      push({ type: "mapping", delayMs: 50, layer: id, label, payload }),
    tool: (service, name, args, records, durationMs = 70) => {
      const requestId = rid("tool");
      push({
        type: "tool_request",
        delayMs: 30,
        layer: id,
        service,
        name,
        arguments: args,
        requestId,
      });
      push({
        type: "tool_result",
        delayMs: durationMs + 80,
        layer: id,
        service,
        durationMs,
        records,
        requestId,
      });
    },
    evidence: (summary, payload) =>
      push({ type: "evidence", delayMs: 60, layer: id, summary, payload }),
  });
  push({ type: "layer_complete", delayMs: 40, layer: id });
}

export function defaultInventory(): InventoryOverride {
  return {
    offerSeats: Object.fromEntries(OFFERS.map((o) => [o.id, o.seats])),
    hotelRooms: Object.fromEntries(HOTELS.map((h) => [h.id, h.rooms])),
  };
}
