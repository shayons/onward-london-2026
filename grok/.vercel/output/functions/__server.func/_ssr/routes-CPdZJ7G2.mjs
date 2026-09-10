import { i as __toESM } from "../_runtime.mjs";
import { _ as clockLabel, b as rid, c as MEETING_ISO, d as ORIGINAL_BOOKING, f as POLICIES, g as addMinutes, h as TRAVEL_DATE, i as HOTELS, l as OFFERS, m as TRAVELLER, n as DEMO_CLOCK, o as LAYER_META, p as TRANSFER, r as ENTITIES, s as LEGS, t as CANONICAL_REQUEST, u as ONBOARDING, v as elapsedMinutes, x as timeInZone, y as gbp } from "./format-C6CTpjys.mjs";
import { R as require_react, _ as Link, y as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { _ as Check, a as SkipForward, c as Pause, d as Footprints, f as FastForward, g as ChevronDown, h as CircleStop, i as Square, l as Layers, m as Circle, n as Wallet, o as RotateCcw, p as Clock3, s as Play, t as X, u as Landmark, v as ArrowUp } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CPdZJ7G2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function airlineName(id) {
	return ENTITIES.find((e) => e.id === id)?.name ?? id;
}
function hotelById(id) {
	const h = HOTELS.find((x) => x.id === id);
	if (!h) throw new Error(`Unknown hotel ${id}`);
	return h;
}
function offerById(id) {
	const o = OFFERS.find((x) => x.id === id);
	if (!o) throw new Error(`Unknown offer ${id}`);
	return o;
}
function legsFor(offerId) {
	return LEGS.filter((l) => l.offerId === offerId).sort((a, b) => a.sequence - b.sequence);
}
function applyInventory(inv) {
	return {
		offers: OFFERS.map((o) => ({
			...o,
			seats: inv?.offerSeats?.[o.id] ?? o.seats
		})),
		hotels: HOTELS.map((h) => ({
			...h,
			rooms: inv?.hotelRooms?.[h.id] ?? h.rooms
		}))
	};
}
function parseBudget(text) {
	const m = text.match(/\bunder\s*£?\s*([0-9][0-9,]*)\b/i);
	if (!m?.[1]) return null;
	return Number(m[1].replace(/,/g, "")) * 100;
}
function isUnsupported(text) {
	const t = text.toLowerCase();
	const elsewhere = /(tokyo|berlin|new york|nyc|paris|rome|madrid stay|dublin|singapore|sydney|chicago)/i.exec(t);
	if (elsewhere) return `Onward’s current corpus is the London Heathrow → Lisbon recovery on 10 September 2026. It does not silently substitute another city for “${elsewhere[1]}”.`;
	if (/\b(three|3|two|2)\s+nights?\b/.test(t) || /\bweek\b/.test(t)) return "This scenario holds a single hotel night, 10–11 September. A different stay length is out of corpus — Onward will not invent nights.";
	return null;
}
function mergeContract(text, previous) {
	const t = text.toLowerCase();
	const budgetFromText = parseBudget(text);
	let rankBy = previous?.rankBy ?? "preference";
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
		nearbyWalkMinutes: previous?.nearbyWalkMinutes ?? 20,
		budgetPence: budgetFromText ?? previous?.budgetPence ?? 65e3,
		bagsChecked: 1,
		rankBy,
		costScope: [
			"outbound_fare",
			"checked_bags",
			"hotel_night_tax_inclusive",
			"airport_to_meeting_transfer"
		]
	};
}
function connectionMinutes(legs) {
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
function costFor(offer, hotel) {
	const farePence = offer.farePence;
	const bagPence = offer.bagPence;
	const hotelPence = hotel.nightPence;
	const transferPence = TRANSFER.pence;
	return {
		farePence,
		bagPence,
		hotelPence,
		transferPence,
		completePence: farePence + bagPence + hotelPence + transferPence
	};
}
function evaluateBundle(offer, hotel, contract) {
	const legs = legsFor(offer.id);
	const last = legs[legs.length - 1];
	if (!last) return {
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
		rejections: [{
			code: "unsupported",
			subject: offer.flightNumber,
			detail: "Offer has no flight legs.",
			evidence: {}
		}]
	};
	const landIso = last.arriveIso;
	const venueArrivalIso = addMinutes(landIso, 45 + TRANSFER.minutes);
	const conn = connectionMinutes(legs);
	const cost = costFor(offer, hotel);
	const rejections = [];
	if (offer.seats <= 0) rejections.push({
		code: "no_seats",
		subject: offer.flightNumber,
		detail: `${offer.flightNumber} has no remaining seats in the current fictional inventory.`,
		evidence: { seats: offer.seats }
	});
	if (hotel.rooms <= 0) rejections.push({
		code: "no_rooms",
		subject: hotel.name,
		detail: `${hotel.name} has no remaining rooms in the current fictional inventory.`,
		evidence: { rooms: hotel.rooms }
	});
	if (Date.parse(venueArrivalIso) > Date.parse(contract.arriveByIso)) rejections.push({
		code: "late_arrival",
		subject: offer.flightNumber,
		detail: `${offer.flightNumber} lands at ${timeInZone(landIso, "Europe/Lisbon")} Lisbon. After a 45-minute arrival allowance and a ${TRANSFER.minutes}-minute transfer, Alex reaches the studio at ${timeInZone(venueArrivalIso, "Europe/Lisbon")} — after the 14:00 meeting.`,
		evidence: {
			landLocal: timeInZone(landIso, "Europe/Lisbon"),
			venueLocal: timeInZone(venueArrivalIso, "Europe/Lisbon"),
			deadlineLocal: timeInZone(contract.arriveByIso, "Europe/Lisbon"),
			allowanceMin: 45,
			transferMin: TRANSFER.minutes
		}
	});
	if (conn !== null && conn < 60) rejections.push({
		code: "short_connection",
		subject: offer.flightNumber,
		detail: `${offer.flightNumber} connects in Madrid with ${conn} elapsed minutes. The versioned minimum is 60 minutes.`,
		evidence: {
			elapsedMin: conn,
			policyMin: 60,
			policy: "policy:min-connection:v3"
		}
	});
	if (hotel.walkMinutes > contract.nearbyWalkMinutes) rejections.push({
		code: "walk_too_far",
		subject: hotel.name,
		detail: `${hotel.name} is a ${hotel.walkMinutes}-minute walk to the venue. “Nearby” is ${contract.nearbyWalkMinutes} minutes under policy v2.`,
		evidence: {
			walkMinutes: hotel.walkMinutes,
			nearbyLimit: contract.nearbyWalkMinutes
		}
	});
	if (cost.completePence >= contract.budgetPence) rejections.push({
		code: "over_budget",
		subject: `${offer.flightNumber} + ${hotel.name}`,
		detail: `Complete cost ${gbp(cost.completePence)} is not strictly under ${gbp(contract.budgetPence)}.`,
		evidence: {
			completePence: cost.completePence,
			budgetPence: contract.budgetPence
		}
	});
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
		rejections
	};
}
function rankBundles(bundles, contract, memoryOn) {
	const copy = [...bundles];
	copy.sort((a, b) => {
		if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
		if (contract.rankBy === "arrival") {
			const d = Date.parse(a.venueArrivalIso) - Date.parse(b.venueArrivalIso);
			if (d !== 0) return d;
		}
		if (contract.rankBy === "cost") return a.cost.completePence - b.cost.completePence;
		if (memoryOn && a.quiet !== b.quiet) return a.quiet ? -1 : 1;
		return a.cost.completePence - b.cost.completePence;
	});
	return copy;
}
function uniqueRejections(bundles) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const b of bundles) for (const r of b.rejections) {
		const key = `${r.code}:${r.subject}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(r);
	}
	return out;
}
function prose(itinerary, contract) {
	const b = itinerary.bundle;
	const offer = offerById(b.offerId);
	const hotel = hotelById(b.hotelId);
	const first = b.legs[0];
	const last = b.legs[b.legs.length - 1];
	const slack = elapsedMinutes(b.venueArrivalIso, contract.arriveByIso);
	const lines = [];
	lines.push(`${offer.flightNumber} ${airlineName(offer.airlineId)} leaves Heathrow at ${first ? timeInZone(first.departIso, "Europe/London") : "—"} and lands in Lisbon at ${last ? timeInZone(last.arriveIso, "Europe/Lisbon") : "—"}. After the 45-minute arrival allowance and a ${TRANSFER.minutes}-minute ${TRANSFER.mode.toLowerCase()}, you reach Ribeira Design Studio at ${timeInZone(b.venueArrivalIso, "Europe/Lisbon")} — ${slack >= 60 ? `${Math.floor(slack / 60)}h ${slack % 60}m` : `${slack} min`} before the 14:00 meeting.`);
	lines.push(`${hotel.name} is ${hotel.walkMinutes} minutes on foot, inside the ${contract.nearbyWalkMinutes}-minute nearby rule.${itinerary.memoryUsed && hotel.quiet ? " It matches the quiet-courtyard preference from Alex’s onboarding conversation." : ""}`);
	lines.push(`Complete cost ${gbp(b.cost.completePence)}: fare ${gbp(b.cost.farePence)}, checked bag ${gbp(b.cost.bagPence)}, hotel ${gbp(b.cost.hotelPence)}, transfer ${gbp(b.cost.transferPence)} — strictly under ${gbp(contract.budgetPence)}. Taxes are already in the supplier figures.`);
	const notable = itinerary.rejected.filter((r) => r.code === "late_arrival" || r.code === "short_connection" || r.code === "no_seats");
	if (notable.length) lines.push(notable.map((r) => r.detail).join(" "));
	lines.push("No booking is made. Inventory is the current fictional Onward snapshot, not a live supplier feed.");
	return lines.join("\n\n");
}
function noMatchProse(noMatch, contract) {
	const bits = noMatch.reasons.join(" ");
	const floor = noMatch.cheapestEligiblePence !== null ? ` The cheapest complete eligible trip currently in inventory is ${gbp(noMatch.cheapestEligiblePence)}.` : " No complete eligible trip exists in this corpus under the current constraints.";
	return `No itinerary meets the contract (arrive at Ribeira Design Studio by ${timeInZone(contract.arriveByIso, "Europe/Lisbon")} on ${contract.travelDate}, complete cost strictly under ${gbp(contract.budgetPence)}, nearby hotel, current availability). ${bits}${floor}`;
}
function buildItinerary(chosen, all, memoryOn) {
	const hotel = hotelById(chosen.hotelId);
	const why = [
		`Venue arrival ${timeInZone(chosen.venueArrivalIso, "Europe/Lisbon")} is at or before 14:00.`,
		`Complete cost ${gbp(chosen.cost.completePence)} uses fare + bag + hotel + transfer in integer pence.`,
		`Hotel walk ${chosen.walkMinutes} min ≤ nearby 20 min.`,
		`Offer seats and hotel rooms rechecked against the current snapshot.`
	];
	if (memoryOn && hotel.quiet) why.push("Quiet-courtyard preference applied after hard constraints, from the saved onboarding conversation (short-term source context — not a live long-term extraction).");
	return {
		bundle: chosen,
		why,
		rejected: uniqueRejections(all),
		sources: [
			{
				label: "Complete cost definition",
				ref: "policy:complete-cost:v1"
			},
			{
				label: "Minimum connection v3",
				ref: "policy:min-connection:v3"
			},
			{
				label: "Nearby walking v2",
				ref: "policy:nearby-walk:v2"
			},
			{
				label: "Complete-trip pattern",
				ref: "example:complete-trip-pattern:v1"
			}
		],
		memoryUsed: memoryOn,
		memorySource: memoryOn ? "onboarding_conversation" : "none"
	};
}
function runEngine(input) {
	const requestId = rid("run");
	const mode = input.mode ?? "live";
	const events = [];
	const push = (event) => events.push(event);
	push({
		type: "run_started",
		delayMs: 0,
		requestId,
		clock: DEMO_CLOCK,
		mode,
		text: input.text
	});
	const unsupported = isUnsupported(input.text);
	const looksInCorpus = /heathrow|lisbon|flight|hotel|cancelled|cancel|meeting|650|450|earlier|cheapest|ax218|bag/i.test(input.text) || Boolean(input.previous);
	if (unsupported || !looksInCorpus && !input.previous && input.text !== "My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.") {
		const detail = unsupported ?? "Onward can recover the Heathrow → Lisbon meeting on 10 September 2026. Ask about that trip, or use the suggested request.";
		layer(push, "business_context", (L) => {
			L.input("User request", {
				text: input.text,
				clock: DEMO_CLOCK
			});
			L.mapping("Bounded corpus", { supported: "LHR→LIS, 10 Sep 2026, one hotel night, meeting 14:00 Lisbon" });
			L.tool("onward.engine", "validate_scope", { text: input.text }, {
				inCorpus: false,
				detail
			});
			L.evidence("Request is outside the prepared scenario.", { detail });
		});
		push({
			type: "unsupported",
			delayMs: 160,
			detail
		});
		push({
			type: "assistant_message",
			delayMs: 80,
			text: detail
		});
		push({
			type: "run_complete",
			delayMs: 40
		});
		return {
			requestId,
			contract: input.previous ?? null,
			events,
			itinerary: null,
			noMatch: null,
			unsupported: detail
		};
	}
	const contract = mergeContract(input.text, input.previous ?? null);
	const { offers, hotels } = applyInventory(input.inventory);
	const tomorrow = TRAVEL_DATE;
	layer(push, "business_context", (L) => {
		L.input("User request and clock", {
			text: input.text,
			clock: DEMO_CLOCK,
			clockNote: "Fixed scenario clock — not wall time."
		});
		L.mapping("Typed trip contract", contract);
		L.tool("onward.engine", "validate_trip_contract", {
			arrive_at_venue: contract.arriveByIso,
			complete_budget_pence: contract.budgetPence,
			cost_scope: contract.costScope
		}, {
			valid: true,
			success: "Alex at Ribeira Design Studio by 14:00 Lisbon. Complete cost strictly under budget.",
			excludes: [
				"travel to Heathrow",
				"return flight",
				"return transfer"
			]
		});
		L.evidence("Success means arriving at the venue, not the airport, under one complete-cost definition.", {
			arriveBy: contract.arriveByIso,
			budgetPence: contract.budgetPence,
			rankBy: contract.rankBy
		});
	});
	const resolved = [
		matchEntity("heathrow"),
		matchEntity("lisbon"),
		matchEntity("my lisbon meeting"),
		matchEntity("alex"),
		matchEntity("this trip")
	].filter(Boolean);
	layer(push, "ontology", (L) => {
		L.input("Surface names from the request", [
			"Alex",
			"Heathrow",
			"Lisbon",
			"my Lisbon meeting",
			"the trip"
		]);
		L.mapping("Alias table", {
			Heathrow: "airport:LHR",
			Lisbon: "city:lisbon + airport:LIS",
			"my Lisbon meeting": "venue:ribeira-design-studio",
			Alex: "person:alex-morgan"
		});
		L.tool("prepared.aurora", "SELECT id, type, name, aliases FROM entities WHERE aliases && $names", { names: [
			"heathrow",
			"lisbon",
			"alex",
			"meeting"
		] }, resolved, 42);
		L.evidence("People, places and the trip share identifiers across the store and the graph.", { ids: resolved.map((e) => e && e.id) });
	});
	const hybrid = [...hotels].map((h) => ({
		id: h.id,
		name: h.name,
		walkMinutes: h.walkMinutes,
		quiet: h.quiet,
		hybrid: Number((.4 * h.lexical + .6 * h.semantic).toFixed(3)),
		lexical: h.lexical,
		semantic: h.semantic
	})).sort((a, b) => b.hybrid - a.hybrid);
	layer(push, "disambiguation", (L) => {
		L.input("Ambiguous language", {
			tomorrow: "relative to the fixed clock",
			nearby: "no numeric limit in the question",
			hotel: "descriptions + embeddings + preferences"
		});
		L.mapping("Resolved senses", {
			tomorrow,
			nearbyMinutes: contract.nearbyWalkMinutes,
			policy: "policy:nearby-walk:v2",
			"2pm": "14:00 at the venue in Europe/Lisbon"
		});
		L.tool("prepared.aurora", `SELECT id, name,
  ts_rank(fts, plainto_tsquery('english', $q)) AS lexical,
  1 - (embedding <=> $q_vec) AS semantic
FROM hotels
ORDER BY 0.4 * lexical + 0.6 * semantic DESC`, {
			q: "hotel nearby quiet courtyard walk studio",
			model: "Titan Text Embeddings V2 (prepared)"
		}, hybrid, 88);
		if (input.memoryEnabled) L.tool("prepared.memory", "retrieve_actor_context", {
			namespace: "onward",
			actor: "alex-morgan",
			strategy: "onboarding_conversation",
			label: "short-term source context — not a live AgentCore long-term extraction"
		}, {
			turns: ONBOARDING,
			extracted: {
				quiet: true,
				walk_to_venue: true,
				window: "soft"
			},
			note: "Built-in long-term extraction is asynchronous. This run uses the saved onboarding conversation."
		}, 64);
		else L.mapping("Memory", {
			enabled: false,
			note: "Historical records remain; they do not influence ranking on this run."
		});
		L.evidence("“Tomorrow”, “nearby” and hotel fit are definitions plus context, not keyword hits.", {
			tomorrow,
			nearbyWalkMinutes: contract.nearbyWalkMinutes,
			hybridTop: hybrid[0]?.name,
			memoryEnabled: input.memoryEnabled
		});
	});
	const ranked = rankBundles(offers.flatMap((o) => hotels.map((h) => evaluateBundle(o, h, contract))), contract, input.memoryEnabled);
	const eligible = ranked.filter((b) => b.eligible);
	const metricRows = ranked.map((b) => ({
		offer: offerById(b.offerId).flightNumber,
		hotel: hotelById(b.hotelId).name,
		fare: b.cost.farePence,
		bag: b.cost.bagPence,
		hotel_pence: b.cost.hotelPence,
		transfer: b.cost.transferPence,
		complete_pence: b.cost.completePence,
		under_budget: b.cost.completePence < contract.budgetPence
	}));
	layer(push, "metrics", (L) => {
		L.input("Complete-cost definition", POLICIES.find((p) => p.id.startsWith("policy:complete-cost")));
		L.mapping("Integer pence", {
			currency: "GBP",
			formula: "fare + checked_bag + hotel_night + transfer",
			budgetPence: contract.budgetPence
		});
		L.tool("prepared.aurora", `SELECT o.flight_number, h.name,
  o.fare_pence + o.bag_pence + h.night_pence + t.pence AS complete_pence
FROM offers o
CROSS JOIN hotels h
CROSS JOIN transfers t
WHERE t.id = 'transfer:lis-car-venue'`, { budget_pence: contract.budgetPence }, metricRows, 51);
		L.evidence("A cheap fare is not a complete trip. Complete cost is one number, in pence.", {
			cheapestAdvertised: "AX404 £198 fare",
			cheapestCompleteEligible: eligible[0] ? gbp([...eligible].sort((a, b) => a.cost.completePence - b.cost.completePence)[0]?.cost.completePence ?? 0) : null
		});
	});
	const pathRows = ranked.map((b) => {
		const o = offerById(b.offerId);
		return {
			path: o.kind === "connecting" ? "LHR-[:LEG]->MAD-[:LEG]->LIS-[:TRANSFER]->venue" : "LHR-[:LEG]->LIS-[:TRANSFER]->venue",
			offer: o.flightNumber,
			hotel: hotelById(b.hotelId).name,
			land: timeInZone(b.landIso, "Europe/Lisbon"),
			venueArrival: timeInZone(b.venueArrivalIso, "Europe/Lisbon"),
			connectionElapsed: b.connectionMinutes,
			walk: b.walkMinutes,
			eligible: b.eligible,
			reasons: b.rejections.map((r) => r.code)
		};
	});
	layer(push, "relationships", (L) => {
		L.input("Journey graph", {
			nodes: [
				"LHR",
				"MAD",
				"LIS",
				"venue:ribeira-design-studio",
				...hotels.map((h) => h.id)
			],
			edgeTypes: [
				"LEG",
				"TRANSFER",
				"WALK"
			]
		});
		L.mapping("Elapsed time, not clock faces", {
			minConnection: 60,
			arrivalAllowance: 45,
			transferMinutes: TRANSFER.minutes,
			policy: "policy:min-connection:v3"
		});
		L.tool("prepared.neptune", `MATCH (o:Offer)-[:HAS_LEG]->(l:Leg)
OPTIONAL MATCH (l)-[:CONNECTS]->(n:Leg)
MATCH (o)-[:LANDS]->(a:Airport {iata:'LIS'})-[:TRANSFER]->(v:Venue)
MATCH (h:Hotel)-[:WALK]->(v)
RETURN o, n, h, elapsed(l,n), walk(h,v)`, { arrive_by: contract.arriveByIso }, pathRows, 96);
		const traps = uniqueRejections(ranked).filter((r) => r.code === "late_arrival" || r.code === "short_connection");
		L.evidence("A search result and a feasible complete journey are different objects.", {
			ax404: traps.find((r) => r.subject === "AX404")?.detail,
			me615: traps.find((r) => r.subject === "ME615")?.detail
		});
	});
	const snapshot = eligible.map((b) => ({
		offer: offerById(b.offerId).flightNumber,
		hotel: hotelById(b.hotelId).name,
		seats: offers.find((o) => o.id === b.offerId)?.seats,
		rooms: hotels.find((h) => h.id === b.hotelId)?.rooms,
		completePence: b.cost.completePence,
		venueArrival: timeInZone(b.venueArrivalIso, "Europe/Lisbon"),
		quiet: b.quiet
	}));
	layer(push, "verified_examples", (L) => {
		L.input("Stored pattern", POLICIES.find((p) => p.id.startsWith("example:complete-trip")));
		L.mapping("Invariants under test", {
			venue_deadline: true,
			min_connection: true,
			nearby_walk: true,
			strict_budget: true,
			current_availability: true
		});
		L.tool("prepared.aurora", `SELECT offer_id, hotel_id, seats, rooms, fare_pence, night_pence
FROM offers JOIN hotels
WHERE seats > 0 AND rooms > 0
  AND complete_pence < $budget
  AND venue_arrival <= $deadline`, {
			budget: contract.budgetPence,
			deadline: contract.arriveByIso,
			note: "Recheck immediately before ranking — memory cannot certify stock."
		}, snapshot, 37);
		L.evidence("Eligible bundles rechecked against current prices and availability.", {
			eligibleCount: eligible.length,
			ax218Seats: offers.find((o) => o.flightNumber === "AX218")?.seats
		});
	});
	if (!eligible.length) {
		const noMatch = {
			reasons: uniqueRejections(ranked).slice(0, 4).map((r) => r.detail),
			rejected: uniqueRejections(ranked),
			cheapestEligiblePence: null
		};
		if (ranked.filter((b) => b.cost.completePence < contract.budgetPence && !b.eligible).length) noMatch.reasons.unshift(`Several advertised combinations sit under ${gbp(contract.budgetPence)} but fail deadline, connection, walking or stock.`);
		const globalCheapestEligible = rankBundles(offers.flatMap((o) => hotels.map((h) => evaluateBundle(o, h, {
			...contract,
			budgetPence: 1e7
		}))), {
			...contract,
			rankBy: "cost"
		}, false).find((b) => b.eligible);
		if (globalCheapestEligible) noMatch.cheapestEligiblePence = globalCheapestEligible.cost.completePence;
		push({
			type: "no_match",
			delayMs: 180,
			noMatch
		});
		push({
			type: "assistant_message",
			delayMs: 120,
			text: noMatchProse(noMatch, contract)
		});
		push({
			type: "run_complete",
			delayMs: 40
		});
		return {
			requestId,
			contract,
			events,
			itinerary: null,
			noMatch,
			unsupported: null
		};
	}
	const chosen = eligible[0];
	const itinerary = buildItinerary(chosen, ranked, input.memoryEnabled);
	push({
		type: "itinerary",
		delayMs: 200,
		itinerary
	});
	push({
		type: "assistant_message",
		delayMs: 140,
		text: prose(itinerary, contract)
	});
	push({
		type: "run_complete",
		delayMs: 40
	});
	return {
		requestId,
		contract,
		events,
		itinerary,
		noMatch: null,
		unsupported: null
	};
}
function matchEntity(alias) {
	const a = alias.toLowerCase();
	return ENTITIES.find((e) => e.aliases.includes(a) || e.name.toLowerCase() === a);
}
function layer(push, id, fill) {
	const meta = LAYER_META[id];
	push({
		type: "layer_started",
		delayMs: 90,
		layer: id,
		question: meta?.question ?? id
	});
	fill({
		input: (label, payload) => push({
			type: "input",
			delayMs: 40,
			layer: id,
			label,
			payload
		}),
		mapping: (label, payload) => push({
			type: "mapping",
			delayMs: 50,
			layer: id,
			label,
			payload
		}),
		tool: (service, name, args, records, durationMs = 70) => {
			const requestId = rid("tool");
			push({
				type: "tool_request",
				delayMs: 30,
				layer: id,
				service,
				name,
				arguments: args,
				requestId
			});
			push({
				type: "tool_result",
				delayMs: durationMs + 80,
				layer: id,
				service,
				durationMs,
				records,
				requestId
			});
		},
		evidence: (summary, payload) => push({
			type: "evidence",
			delayMs: 60,
			layer: id,
			summary,
			payload
		})
	});
	push({
		type: "layer_complete",
		delayMs: 40,
		layer: id
	});
}
function defaultInventory() {
	return {
		offerSeats: Object.fromEntries(OFFERS.map((o) => [o.id, o.seats])),
		hotelRooms: Object.fromEntries(HOTELS.map((h) => [h.id, h.rooms]))
	};
}
function uid(prefix) {
	return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
function startedText(result) {
	const ev = result.events.find((e) => e.type === "run_started");
	return ev && ev.type === "run_started" ? ev.text : "Replay";
}
var useOnward = create()((set, get) => ({
	paceMode: "live",
	paused: false,
	paceMs: 0,
	memoryEnabled: true,
	disruptionRevealed: false,
	cancelTimerSec: 10,
	cancelTimerUntil: null,
	inventory: defaultInventory(),
	contract: null,
	messages: [{
		id: "sys-scenario",
		role: "system",
		kind: "scenario",
		at: 0,
		text: "Fixed scenario · 9 September 2026, 18:00 Europe/London. Fictional inventory — not a live supplier feed."
	}],
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
	setPaceMode: (paceMode) => set({
		paceMode,
		paused: paceMode === "presenter" && get().runStatus === "running" ? true : get().paused
	}),
	setPaused: (paused) => set({ paused }),
	setPaceMs: (paceMs) => set({ paceMs }),
	setMemoryEnabled: (memoryEnabled) => set({ memoryEnabled }),
	setComposer: (composer) => set({ composer }),
	setTraceOpen: (traceOpen) => set({ traceOpen }),
	setNotesOpen: (notesOpen) => set({ notesOpen }),
	setInspectorRef: (inspectorRef) => set({ inspectorRef }),
	revealDisruption: () => set((s) => {
		if (s.disruptionRevealed) return s;
		return {
			disruptionRevealed: true,
			cancelTimerUntil: null,
			composer: CANONICAL_REQUEST,
			messages: [...s.messages, {
				id: uid("sys"),
				role: "system",
				kind: "disruption",
				at: Date.now(),
				text: "Aether Air has cancelled AX201. The meeting at Ribeira Design Studio still stands at 14:00 tomorrow."
			}]
		};
	}),
	startCancelTimer: (sec) => set({
		cancelTimerSec: sec,
		cancelTimerUntil: Date.now() + sec * 1e3
	}),
	clearCancelTimer: () => set({ cancelTimerUntil: null }),
	setAx218Seats: (seats) => {
		set({
			inventory: {
				...get().inventory,
				offerSeats: {
					...get().inventory.offerSeats,
					"offer:AX218": seats
				}
			},
			messages: [...get().messages, {
				id: uid("sys"),
				role: "system",
				kind: "stock",
				at: Date.now(),
				text: seats <= 0 ? "AX218 seats set to 0 in the fictional Onward inventory. The next request will read this snapshot." : `AX218 seats restored to ${seats} in the fictional Onward inventory.`
			}]
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
			mode: "live"
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
			messages: [...get().messages, {
				id: uid("u"),
				role: "user",
				text,
				at: Date.now(),
				runId: result.requestId
			}]
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
					text: "Recorded run. No new service calls."
				},
				{
					id: uid("u"),
					role: "user",
					text: startedText(rec),
					at: Date.now(),
					runId: rec.requestId
				}
			]
		});
	},
	stopRun: () => set((s) => ({
		runStatus: s.runStatus === "running" ? "incomplete" : s.runStatus,
		paused: true,
		messages: s.runStatus === "running" ? [...s.messages, {
			id: uid("sys"),
			role: "system",
			kind: "stopped",
			at: Date.now(),
			text: "Run stopped. Marked incomplete."
		}] : s.messages
	})),
	nextEvent: () => set((s) => {
		const visibleCount = Math.min(s.buffer.length, s.visibleCount + 1);
		return {
			paused: true,
			visibleCount,
			runStatus: visibleCount >= s.buffer.length && s.buffer.length ? "complete" : s.runStatus
		};
	}),
	nextLayer: () => set((s) => {
		const start = s.visibleCount;
		const rest = s.buffer.slice(start);
		const idx = rest.findIndex((e, i) => i > 0 && e.type === "evidence");
		const jump = idx === -1 ? rest.length : idx + 1;
		const visibleCount = Math.min(s.buffer.length, start + jump);
		return {
			paused: true,
			visibleCount,
			runStatus: visibleCount >= s.buffer.length && s.buffer.length ? "complete" : s.runStatus
		};
	}),
	tickVisible: () => set((s) => {
		if (s.paused || s.runStatus !== "running") return s;
		const visibleCount = Math.min(s.buffer.length, s.visibleCount + 1);
		return {
			visibleCount,
			runStatus: visibleCount >= s.buffer.length ? "complete" : "running"
		};
	}),
	commitVisible: () => set((s) => {
		const visible = s.buffer.slice(0, s.visibleCount);
		const asst = [...visible].reverse().find((e) => e.type === "assistant_message");
		if (!asst || asst.type !== "assistant_message") return s;
		const runId = s.lastResult?.requestId;
		if (!runId || s.messages.some((m) => m.role === "assistant" && m.runId === runId)) return s;
		const it = visible.find((e) => e.type === "itinerary");
		const nm = visible.find((e) => e.type === "no_match");
		return { messages: [...s.messages, {
			id: `a-${runId}`,
			role: "assistant",
			text: asst.text,
			at: Date.now(),
			runId,
			itinerary: it && it.type === "itinerary" ? it.itinerary : void 0,
			noMatch: nm && nm.type === "no_match" ? nm.noMatch : void 0
		}] };
	}),
	newConversation: () => set({
		contract: null,
		messages: [{
			id: "sys-scenario",
			role: "system",
			kind: "scenario",
			at: Date.now(),
			text: "New conversation. Cross-session preferences stay scoped to Alex; this runtime session is fresh."
		}],
		buffer: [],
		visibleCount: 0,
		runStatus: "idle",
		lastResult: null,
		composer: CANONICAL_REQUEST
	})
}));
function ItineraryCard({ itinerary }) {
	const setInspectorRef = useOnward((s) => s.setInspectorRef);
	const b = itinerary.bundle;
	const offer = OFFERS.find((o) => o.id === b.offerId);
	const hotel = HOTELS.find((h) => h.id === b.hotelId);
	const first = b.legs[0];
	const last = b.legs[b.legs.length - 1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
		className: "overflow-hidden rounded-xl bg-paper shadow-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 md:grid-cols-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative md:col-span-2 min-h-40",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: hotel.image,
						alt: "",
						className: "photo absolute inset-0 size-full object-cover"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-linear-to-t from-ink/70 to-transparent" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "absolute bottom-3 left-3 right-3 font-display text-lg text-paper",
						children: hotel.name
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "md:col-span-3 p-4 sm:p-5 flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-wider text-subtle",
						children: "Supported itinerary"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mt-1 font-display text-xl leading-snug",
						children: [
							offer.flightNumber,
							" · ",
							hotel.name
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "grid grid-cols-2 gap-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock3, { className: "size-3.5" }),
								label: "Studio arrival",
								value: `${timeInZone(b.venueArrivalIso, "Europe/Lisbon")} Lisbon`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "size-3.5" }),
								label: "Complete cost",
								value: gbp(b.cost.completePence)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Landmark, { className: "size-3.5" }),
								label: "Flight",
								value: `${first ? timeInZone(first.departIso, "Europe/London") : "—"} LHR → ${last ? timeInZone(last.arriveIso, "Europe/Lisbon") : "—"} LIS`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footprints, { className: "size-3.5" }),
								label: "Walk to venue",
								value: `${b.walkMinutes} min`
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md bg-chip px-3 py-2 text-xs text-muted leading-relaxed",
						children: [
							"Fare ",
							gbp(b.cost.farePence),
							" · bag ",
							gbp(b.cost.bagPence),
							" · hotel ",
							gbp(b.cost.hotelPence),
							" · ",
							TRANSFER.mode.toLowerCase(),
							" ",
							gbp(b.cost.transferPence)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-1.5 text-sm text-ink/90",
						children: itinerary.why.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-2 size-1 shrink-0 rounded-full bg-accent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: w })]
						}, w))
					}),
					itinerary.rejected.filter((r) => r.code === "late_arrival" || r.code === "short_connection").length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t border-line pt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium uppercase tracking-wider text-subtle mb-2",
							children: "Rejected on the way"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-2 text-sm text-muted",
							children: itinerary.rejected.filter((r) => r.code === "late_arrival" || r.code === "short_connection").map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-medium text-ink",
									children: [r.subject, "."]
								}),
								" ",
								r.detail
							] }, r.subject))
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-1.5",
						children: itinerary.sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setInspectorRef(s.ref),
							className: "rounded-full bg-chip px-2.5 py-1 text-xs text-ink hover:bg-line",
							children: s.label
						}, s.ref))
					})
				]
			})]
		})
	});
}
function NoMatchCard({ noMatch }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-xl bg-paper p-5 shadow-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-wider text-subtle",
				children: "No eligible bundle"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-1 font-display text-xl",
				children: "Nothing in corpus meets the contract"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-2 text-sm text-muted",
				children: noMatch.reasons.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: r }, r))
			}),
			noMatch.cheapestEligiblePence !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm",
				children: [
					"Cheapest complete eligible trip currently in inventory:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-ink",
						children: gbp(noMatch.cheapestEligiblePence)
					}),
					"."
				]
			}) : null
		]
	});
}
function Fact({ icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dt", {
		className: "flex items-center gap-1.5 text-xs text-subtle",
		children: [icon, label]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: "mt-0.5 font-medium tabular-nums",
		children: value
	})] });
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Button({ className, variant = "outline", size = "md", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn("inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none", size === "sm" && "h-10 min-h-10 px-3 text-xs rounded-sm sm:h-8 sm:min-h-8", size === "md" && "h-10 px-3.5 text-sm rounded-md", size === "lg" && "h-12 px-4 text-sm rounded-md", size === "icon" && "size-10 rounded-md", variant === "primary" && "bg-accent text-accent-fg shadow-border hover:brightness-110", variant === "outline" && "bg-paper text-ink shadow-border hover:shadow-border-hover", variant === "ghost" && "bg-transparent text-ink hover:bg-chip", variant === "quiet" && "bg-chip text-ink hover:bg-line", variant === "danger" && "bg-danger text-paper", className),
		...props
	});
}
var LAYERS = [
	"business_context",
	"ontology",
	"disambiguation",
	"metrics",
	"relationships",
	"verified_examples"
];
function sliceVisible(buffer, count) {
	return buffer.slice(0, count);
}
function completedLayers(events) {
	return new Set(events.filter((e) => e.type === "layer_complete").map((e) => e.layer));
}
function activeLayer(events) {
	for (let i = events.length - 1; i >= 0; i--) {
		const e = events[i];
		if (e?.type === "layer_complete") continue;
		if (e && "layer" in e) return e.layer;
	}
	return null;
}
function layerEvents(events, layer) {
	return events.filter((e) => "layer" in e && e.layer === layer);
}
function hasVisibleItinerary(events) {
	return events.some((e) => e.type === "itinerary" || e.type === "no_match" || e.type === "unsupported");
}
function visibleAssistant(events) {
	for (let i = events.length - 1; i >= 0; i--) {
		const e = events[i];
		if (e?.type === "assistant_message") return e.text;
	}
	return null;
}
function nextDelay(buffer, visibleCount, paceMs) {
	const next = buffer[visibleCount];
	if (!next) return 80;
	return Math.max(16, next.delayMs + paceMs);
}
var TALK_TRACK = [
	{
		t: "0:00",
		title: "The settled trip",
		body: "Alex Morgan, a London designer, is flying Heathrow to Lisbon tomorrow for a 14:00 meeting at Ribeira Design Studio. One hotel night. The opening shows the booked trip — AX201 — as if nothing is wrong."
	},
	{
		t: "0:40",
		title: "The cancellation",
		body: "Reveal that AX201 is cancelled. Default is the manual button; a timer is available if you want the room to wait. The meeting does not move. Ask the complete request in one sentence: venue by 2pm, one nearby night, complete cost under £650."
	},
	{
		t: "1:20",
		title: "Six components, not six databases",
		body: "Step Next layer. Business context types the contract: success is the studio, not the airport. Ontology binds Heathrow, Lisbon, Alex and the venue to stable IDs. Disambiguation turns “tomorrow” and “nearby” into a date and a 20-minute walk, and reads Alex’s quiet-courtyard onboarding as short-term context."
	},
	{
		t: "2:40",
		title: "The two traps",
		body: "Linger on relationships. AX404 is the cheapest fare and lands at 13:20 — 45 minutes of arrival allowance plus a 35-minute transfer puts her at the studio at 14:40. ME615’s Madrid connection is 45 elapsed minutes; the versioned minimum is 60. A relevant search result is not a feasible journey."
	},
	{
		t: "4:00",
		title: "The supported itinerary",
		body: "Verified examples recheck stock and pence immediately before ranking. With memory on, AX218 + Pátio House is £490, at the studio 12:25. Forum Rooms is cheaper; the quiet preference ranks after hard constraints, it does not invent availability."
	},
	{
		t: "5:00",
		title: "Change the data, change the answer",
		body: "Sell out AX218, or drop the budget to £450, or ask for an earlier arrival. The agent adapts because the goal, definitions, relationships, preferences and current records are available as data. Close on that — not on a model that “just knows”."
	}
];
var FOLLOW_UPS = [
	{
		label: "Arrive earlier",
		text: "Can I arrive earlier?"
	},
	{
		label: "Cheapest complete",
		text: "What's the cheapest complete price?"
	},
	{
		label: "Under £450",
		text: "Keep the same trip under £450."
	},
	{
		label: "If AX218 has no seats",
		text: "AX218 has no seats. What else works?"
	}
];
function Conversation() {
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
	const scroller = (0, import_react.useRef)(null);
	const visible = sliceVisible(buffer, visibleCount);
	const assistant = visibleAssistant(visible);
	const showItinerary = hasVisibleItinerary(visible);
	const itinerary = visible.find((e) => e.type === "itinerary");
	const noMatch = visible.find((e) => e.type === "no_match");
	const unsupported = visible.find((e) => e.type === "unsupported");
	const layer = activeLayer(visible);
	const working = runStatus === "running" && !showItinerary;
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({
			top: scroller.current.scrollHeight,
			behavior: "smooth"
		});
	}, [
		messages.length,
		visibleCount,
		working
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: scroller,
			className: "min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2 scroll-thin",
			children: [
				messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: m.role === "system" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-xs text-subtle",
					children: m.text
				}) : m.role === "assistant" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-w-[46rem] whitespace-pre-wrap rounded-lg rounded-bl-xs bg-paper px-4 py-3 text-sm leading-relaxed shadow-border",
							children: m.text
						}),
						m.itinerary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItineraryCard, { itinerary: m.itinerary }) : null,
						m.noMatch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoMatchCard, { noMatch: m.noMatch }) : null
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "max-w-[46rem] rounded-lg rounded-br-xs bg-accent px-4 py-3 text-sm leading-relaxed text-accent-fg",
						children: m.text
					})
				}) }, m.id)),
				runMode === "replay" && runStatus !== "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-xs font-medium uppercase tracking-wider text-warn",
					children: "Recorded run"
				}) : null,
				working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-lg bg-paper px-4 py-3 shadow-border",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "flex items-center gap-2 text-sm text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-accent pulse-dot" }),
							layer ? LAYER_META[layer]?.title : "Preparing",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-subtle",
								children: ["— ", layer ? LAYER_META[layer]?.question : "reading the contract"]
							})
						]
					})
				}) : null,
				assistant && showItinerary && !alreadyCommitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-w-[46rem] whitespace-pre-wrap rounded-lg rounded-bl-xs bg-paper px-4 py-3 text-sm leading-relaxed shadow-border",
							children: assistant
						}),
						itinerary && itinerary.type === "itinerary" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItineraryCard, { itinerary: itinerary.itinerary }) : null,
						noMatch && noMatch.type === "no_match" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoMatchCard, { noMatch: noMatch.noMatch }) : null
					]
				}) : null,
				unsupported && unsupported.type === "unsupported" && !assistant ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-w-[46rem] rounded-lg bg-paper px-4 py-3 text-sm shadow-border",
					children: unsupported.detail
				}) : null,
				runStatus === "complete" && lastResult?.itinerary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: FOLLOW_UPS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "quiet",
						size: "sm",
						onClick: () => submit(f.text),
						children: f.label
					}, f.label))
				}) : null
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "mt-3 rounded-xl bg-paper p-2 shadow-border",
			onSubmit: (e) => {
				e.preventDefault();
				submit();
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "sr-only",
					htmlFor: "onward-composer",
					children: "Ask Onward"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "onward-composer",
					rows: 3,
					value: composer,
					onChange: (e) => setComposer(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							submit();
						}
					},
					placeholder: disruptionRevealed ? "Ask Onward to recover the trip…" : "Reveal the cancellation, then ask…",
					className: "w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-subtle"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 px-1 pb-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "lg:hidden inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-xs text-muted hover:bg-chip",
							onClick: () => setTraceOpen(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "size-4" }), "Layer"]
						}), !disruptionRevealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-xs text-muted hover:text-ink",
							onClick: () => setComposer(CANONICAL_REQUEST),
							children: "Load the demo request"
						}) : null]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						variant: "primary",
						size: "md",
						disabled: !composer.trim() || runStatus === "running",
						children: ["Send", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "size-4" })]
					})]
				})
			]
		})]
	});
}
function PresenterDock() {
	const paceMode = useOnward((s) => s.paceMode);
	const setPaceMode = useOnward((s) => s.setPaceMode);
	const paused = useOnward((s) => s.paused);
	const setPaused = useOnward((s) => s.setPaused);
	const paceMs = useOnward((s) => s.paceMs);
	const setPaceMs = useOnward((s) => s.setPaceMs);
	const memoryEnabled = useOnward((s) => s.memoryEnabled);
	const setMemoryEnabled = useOnward((s) => s.setMemoryEnabled);
	const nextEvent = useOnward((s) => s.nextEvent);
	const nextLayer = useOnward((s) => s.nextLayer);
	const stopRun = useOnward((s) => s.stopRun);
	const replayLast = useOnward((s) => s.replayLast);
	const lastRecorded = useOnward((s) => s.lastRecorded);
	const runStatus = useOnward((s) => s.runStatus);
	const inventory = useOnward((s) => s.inventory);
	const setAx218Seats = useOnward((s) => s.setAx218Seats);
	const notesOpen = useOnward((s) => s.notesOpen);
	const setNotesOpen = useOnward((s) => s.setNotesOpen);
	const newConversation = useOnward((s) => s.newConversation);
	const ax218 = inventory.offerSeats?.["offer:AX218"] ?? 0;
	const running = runStatus === "running";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
		className: "shrink-0 border-t border-line bg-paper/90 backdrop-blur-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2 px-3 py-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Segment, {
					value: paceMode,
					onChange: setPaceMode,
					options: [{
						id: "live",
						label: "Live pace"
					}, {
						id: "presenter",
						label: "Presenter"
					}]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: paused ? "Resume display" : "Pause display",
					onClick: () => setPaused(!paused),
					disabled: !running,
					children: paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Next event",
					onClick: nextEvent,
					disabled: !running,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Next layer",
					onClick: nextLayer,
					disabled: !running,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FastForward, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Stop run",
					onClick: stopRun,
					disabled: !running,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleStop, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					label: "Replay last run",
					onClick: replayLast,
					disabled: !lastRecorded,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "ml-1 hidden items-center gap-2 text-xs text-muted sm:flex",
					children: [
						"Pace",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: 1200,
							step: 50,
							value: paceMs,
							onChange: (e) => setPaceMs(Number(e.target.value)),
							className: "w-20 accent-accent"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tabular-nums w-10",
							children: [paceMs, "ms"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-6 w-px bg-line sm:block" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "Memory"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						role: "switch",
						"aria-checked": memoryEnabled,
						onClick: () => setMemoryEnabled(!memoryEnabled),
						className: `relative h-6 w-10 rounded-full transition-colors ${memoryEnabled ? "bg-accent" : "bg-line-strong"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 size-5 rounded-full bg-paper shadow-border transition-transform ${memoryEnabled ? "translate-x-4" : "translate-x-0.5"}` })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "AX218"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setAx218Seats(ax218 > 0 ? 0 : 4),
						className: "rounded-sm bg-chip px-2 py-1 font-medium tabular-nums",
						children: ax218 > 0 ? `${ax218} seats` : "Sold out"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "ml-auto flex items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => setNotesOpen(!notesOpen),
						children: "Talk track"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: newConversation,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5" }), "New"]
					})]
				})
			]
		})
	});
}
function IconBtn({ label, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		title: label,
		"aria-label": label,
		className: "inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-chip disabled:opacity-30",
		...props,
		children
	});
}
function Segment({ value, onChange, options }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex rounded-md bg-chip p-0.5",
		children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onChange(o.id),
			className: `h-8 rounded-sm px-2.5 text-xs font-medium ${value === o.id ? "bg-paper shadow-border" : "text-muted"}`,
			children: o.label
		}, o.id))
	});
}
function SourceInspector() {
	const ref = useOnward((s) => s.inspectorRef);
	const setRef = useOnward((s) => s.setInspectorRef);
	if (!ref) return null;
	const doc = POLICIES.find((p) => p.id === ref);
	if (!doc) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-40 flex items-end justify-center sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-ink/30",
			"aria-label": "Close source",
			onClick: () => setRef(null)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "relative z-10 max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-xl sm:rounded-xl bg-paper p-5 shadow-border-hover scroll-thin",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs uppercase tracking-wider text-subtle",
						children: [
							doc.uri,
							" · ",
							doc.versionId
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-xl",
						children: doc.title
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "size-10 rounded-md hover:bg-chip",
						onClick: () => setRef(null),
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "mx-auto size-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/90",
					children: doc.body
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-xs text-subtle",
					children: "Authored fixture. Versioned for the demo — not a production-certified travel policy."
				})
			]
		})]
	});
}
function TalkNotes() {
	const open = useOnward((s) => s.notesOpen);
	const setOpen = useOnward((s) => s.setNotesOpen);
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-40 flex justify-end",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-ink/20",
			"aria-label": "Close notes",
			onClick: () => setOpen(false)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "relative z-10 flex h-full w-full max-w-md flex-col bg-paper shadow-border-hover",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between border-b border-line px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-wider text-subtle",
					children: "Six minutes"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg",
					children: "Talk track"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "size-10 rounded-md hover:bg-chip",
					onClick: () => setOpen(false),
					"aria-label": "Close",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "mx-auto size-4" })
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "min-h-0 flex-1 space-y-4 overflow-y-auto p-4 scroll-thin",
				children: TALK_TRACK.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tabular-nums text-accent",
						children: s.t
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-lg",
						children: s.title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-relaxed text-muted",
						children: s.body
					})
				] }, s.t))
			})]
		})]
	});
}
function JsonBlock({ value, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-sm bg-chip/70 px-3 py-2",
		children: [label ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-1 text-xs font-medium uppercase tracking-wider text-subtle",
			children: label
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "max-h-48 overflow-auto font-mono text-xs leading-relaxed text-ink/90 scroll-thin whitespace-pre-wrap break-all",
			children: stringify(value)
		})]
	});
}
function stringify(value) {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
function TracePane() {
	const buffer = useOnward((s) => s.buffer);
	const visibleCount = useOnward((s) => s.visibleCount);
	const runMode = useOnward((s) => s.runMode);
	const visible = sliceVisible(buffer, visibleCount);
	const done = completedLayers(visible);
	const current = activeLayer(visible);
	const [open, setOpen] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full min-h-0 flex-col bg-paper",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "border-b border-line px-4 py-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-wider text-subtle",
					children: "Semantic layer"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg leading-tight",
					children: "Six responsibilities"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-xs text-muted",
					children: ["Prepared stores over a fictional corpus. Not six databases, and not a live supplier feed.", runMode === "replay" ? " Recorded." : null]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "min-h-0 flex-1 overflow-y-auto scroll-thin divide-y divide-line",
			children: LAYERS.map((id, i) => {
				const meta = LAYER_META[id];
				const events = layerEvents(visible, id);
				const isDone = done.has(id);
				const isActive = current === id;
				const expanded = open === id || open === null && isActive;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setOpen(expanded ? null : id),
					className: "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-chip/60",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-0.5 flex size-6 items-center justify-center rounded-full bg-chip text-xs tabular-nums text-muted",
						children: isDone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5 text-ok" }) : isActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-2 rounded-full bg-accent pulse-dot" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "size-3 text-line-strong" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium text-sm",
								children: [
									i + 1,
									". ",
									meta?.title
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: `size-4 text-subtle transition-transform ${expanded ? "rotate-180" : ""}` })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block text-xs text-muted",
							children: meta?.question
						})]
					})]
				}), expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2 px-4 pb-4",
					children: events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: "Waiting for this layer’s evidence."
					}) : events.map((e, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventRow, { event: e }, idx))
				}) : null] }, id);
			})
		})]
	});
}
function EventRow({ event }) {
	if (event.type === "input") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JsonBlock, {
		label: event.label,
		value: event.payload
	});
	if (event.type === "mapping") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JsonBlock, {
		label: event.label,
		value: event.payload
	});
	if (event.type === "tool_request") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-sm border border-line px-3 py-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs font-medium text-ink",
				children: [
					event.service,
					" · ",
					event.name
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-subtle",
				children: event.requestId
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JsonBlock, {
				label: "Request",
				value: event.arguments
			})
		]
	});
	if (event.type === "tool_result") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-sm border border-line px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-xs font-medium text-ok",
			children: [
				"Returned · ",
				event.durationMs,
				" ms · ",
				event.service
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JsonBlock, {
			label: "Records",
			value: event.records
		})]
	});
	if (event.type === "evidence") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-sm bg-accent-soft px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-ink",
			children: event.summary
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JsonBlock, { value: event.payload })]
	});
	return null;
}
function TripStrip() {
	const revealed = useOnward((s) => s.disruptionRevealed);
	const reveal = useOnward((s) => s.revealDisruption);
	const start = useOnward((s) => s.startCancelTimer);
	const clear = useOnward((s) => s.clearCancelTimer);
	const until = useOnward((s) => s.cancelTimerUntil);
	const sec = useOnward((s) => s.cancelTimerSec);
	const [, setNow] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!until) return;
		const id = window.setInterval(() => setNow(Date.now()), 200);
		return () => window.clearInterval(id);
	}, [until]);
	const remaining = until ? Math.max(0, Math.ceil((until - Date.now()) / 1e3)) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "relative shrink-0 overflow-hidden rounded-xl bg-ink text-paper shadow-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/images/lisbon-destination.jpg",
				alt: "",
				className: "absolute inset-0 size-full object-cover"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-linear-to-r from-ink/85 via-ink/50 to-ink/15" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex flex-col gap-4 p-4 sm:p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: TRAVELLER.image,
								alt: "",
								className: "photo size-12 rounded-md object-cover"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg leading-tight",
								children: TRAVELLER.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-paper/70",
								children: [
									TRAVELLER.role,
									" · ",
									TRAVELLER.city
								]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/prepare",
							className: "text-xs text-paper/70 underline-offset-4 hover:text-paper hover:underline",
							children: "Data preparation"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end gap-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutePoint, {
								code: "LHR",
								city: "Heathrow",
								time: timeInZone(ORIGINAL_BOOKING.departIso, "Europe/London")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mb-1 h-px w-8 bg-paper/40" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoutePoint, {
								code: "LIS",
								city: "Lisbon",
								time: timeInZone(ORIGINAL_BOOKING.arriveIso, "Europe/Lisbon")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sm:ml-auto",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs uppercase tracking-wider text-paper/60",
									children: "Meeting"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: "Ribeira Design Studio · 14:00"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-paper/55",
						children: "AI-generated destination still · not a bookable property. Portrait is fictional."
					}),
					!revealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2 rounded-md bg-ink/55 p-3 sm:flex-row sm:items-center sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-paper",
							children: [
								"Booked ",
								ORIGINAL_BOOKING.flightNumber,
								" · 10 Sep · one hotel night. Status looks settled."
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "primary",
								size: "md",
								onClick: reveal,
								children: "Reveal cancellation"
							}), until ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "quiet",
								size: "md",
								onClick: clear,
								children: [
									"Cancel timer · ",
									remaining,
									"s"
								]
							}) : [
								5,
								10,
								15,
								30
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "quiet",
								size: "md",
								onClick: () => start(n),
								children: [n, "s"]
							}, n))]
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border border-accent/40 bg-accent/90 px-3 py-2 text-sm text-accent-fg",
						children: [
							ORIGINAL_BOOKING.flightNumber,
							" cancelled. The 14:00 meeting still stands. One hotel night, 10–11 Sep.",
							until && remaining ? ` Timer was ${sec}s.` : null
						]
					})
				]
			})
		]
	});
}
function RoutePoint({ code, city, time }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-display text-2xl leading-none tracking-tight",
		children: code
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mt-1 text-xs text-paper/70",
		children: [
			city,
			" · ",
			time
		]
	})] });
}
function AppShell() {
	const runStatus = useOnward((s) => s.runStatus);
	const paused = useOnward((s) => s.paused);
	const visibleCount = useOnward((s) => s.visibleCount);
	const buffer = useOnward((s) => s.buffer);
	const paceMs = useOnward((s) => s.paceMs);
	const tickVisible = useOnward((s) => s.tickVisible);
	const commitVisible = useOnward((s) => s.commitVisible);
	const cancelTimerUntil = useOnward((s) => s.cancelTimerUntil);
	const revealDisruption = useOnward((s) => s.revealDisruption);
	const clearCancelTimer = useOnward((s) => s.clearCancelTimer);
	const setPaused = useOnward((s) => s.setPaused);
	const traceOpen = useOnward((s) => s.traceOpen);
	const setTraceOpen = useOnward((s) => s.setTraceOpen);
	(0, import_react.useEffect)(() => {
		commitVisible();
	}, [visibleCount, commitVisible]);
	(0, import_react.useEffect)(() => {
		if (paused || runStatus !== "running") return;
		const wait = nextDelay(buffer, visibleCount, paceMs);
		const id = window.setTimeout(() => tickVisible(), wait);
		return () => window.clearTimeout(id);
	}, [
		paused,
		runStatus,
		visibleCount,
		buffer,
		paceMs,
		tickVisible
	]);
	(0, import_react.useEffect)(() => {
		if (!cancelTimerUntil) return;
		const id = window.setInterval(() => {
			if (Date.now() >= cancelTimerUntil) revealDisruption();
		}, 200);
		return () => window.clearInterval(id);
	}, [cancelTimerUntil, revealDisruption]);
	(0, import_react.useEffect)(() => {
		const onVis = () => {
			if (document.hidden) {
				clearCancelTimer();
				setPaused(true);
			}
		};
		document.addEventListener("visibilitychange", onVis);
		return () => document.removeEventListener("visibilitychange", onVis);
	}, [clearCancelTimer, setPaused]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col overflow-hidden bg-bg text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-7 items-center justify-center rounded-sm bg-accent font-display text-sm text-accent-fg",
						children: "O"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg leading-none",
						children: "Onward"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: "Travel concierge · semantic layer"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-right text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-medium text-ink tabular-nums",
						children: clockLabel(DEMO_CLOCK)
					}), "Fixed clock · fictional inventory"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TripStrip, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Conversation, {})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hidden w-[26rem] shrink-0 border-l border-line lg:block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TracePane, {})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresenterDock, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceInspector, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TalkNotes, {}),
			traceOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-30 lg:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full flex-col bg-paper",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between border-b border-line px-3 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg",
							children: "Semantic layer"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "size-10 rounded-md hover:bg-chip",
							onClick: () => setTraceOpen(false),
							"aria-label": "Close layer panel",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "mx-auto size-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TracePane, {})]
				})
			}) : null
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
