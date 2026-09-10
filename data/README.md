# Fictional travel dataset

`travel.json` is the source seeded into AWS by `scripts/seed.py`, derived from `travel.js`. The UI imports `travel.js` for scenario and preparation explanations; live decisions come from the deployed AWS stores. This is an authored teaching fixture, not scraped travel inventory. Every traveller, venue, airline, flight offer, hotel, price, schedule, availability count and policy value is fictional. Real city and airport identifiers supply recognisable geographical context, not real operational claims.

## Records

- 1 traveller, 1 trip, 1 cancelled original booking and 1 fictional meeting venue.
- 3 airports with IANA time-zone identifiers: London Heathrow (LHR), Lisbon (LIS), Madrid (MAD).
- 5 replacement flight offers, comprising 6 flight legs.
- 3 hotels, 1 airport-to-venue transfer, an earlier conversation, and 4 policy/example source excerpts.
- 4 raw-source examples showing preparation into shared semantics.

The snapshot is `2026-09-14T17:00:00Z`, 18:00 in London. Travel is on 15 September; the one hotel night is 15–16 September. This fixed clock keeps the narrative repeatable.

## Core rules

- Reach the **meeting venue** by 14:00 Europe/Lisbon; landing at the airport is insufficient.
- Add a 45-minute airport arrival allowance and the 35-minute ground transfer to the last flight's arrival.
- Every connecting flight needs at least 60 elapsed minutes, calculated from offset-aware timestamps and connected airport IDs.
- Hotel is at most 20 minutes on foot from the venue under the demo's prepared “nearby” policy.
- Cost is outbound fare + one 23kg checked bag + one hotel night with applicable taxes + airport-to-venue transfer. All values use GBP integer pence; taxes are already included in supplier line prices.
- “Under £650” means `< 65000` pence. The scope excludes travel to Heathrow, return flights and return airport transfers; it is stated in the UI and request.
- Available seats, a hotel room and the airport transfer are required. The stock experiment removes seats from AX218.
- Hard constraints apply before ranking. Default ranking favours a quiet eligible hotel, then the lowest complete price. Memory off or “cheapest” removes the quiet preference. “Earliest” ranks venue arrival first, then any enabled quiet preference, then cost.

## Expected decisions

| Scenario | Flight and hotel | Complete total | Venue arrival |
|---|---|---:|---|
| Default | AX218 + Pátio House | £490 | 12:25 |
| Memory paused / lowest price | AX218 + Forum Rooms | £470 | 12:25 |
| Earliest arrival, memory enabled | AX102 + Pátio House | £590 | 10:55 |
| AX218 sold out, default priorities | ME330 + Pátio House | £564 | 13:10 |
| Budget under £450 | No feasible bundle | — | — |

AX404 lands at 13:20, then reaches the meeting at **14:40**. ME615 would arrive at the venue in time but has a **45-minute Madrid connection**. Both are rejected. Coast Retreat has attractive quiet-room descriptions but a **55-minute walk** and is excluded independently of price.

## Semantic preparation and live retrieval

`scripts/seed.py` loads stable entity IDs and aliases, business definitions, five offers and three hotels into the isolated Aurora `onward` database. Money stays in integer pence; timestamps carry UTC offsets. The runtime executes actual SQL for complete prices and current inventory.

Bedrock Titan Text Embeddings V2 creates 256-dimensional hotel/document vectors. Hotel text is searched in Aurora with pgvector cosine similarity plus PostgreSQL full text, combined by reciprocal rank fusion. Quiet/lively query-expansion vocabulary is an explicit stored definition. The current small candidate set is fully validated before ranking, so a relevant but distant hotel cannot replace an eligible one. The original local fixture's quiet tags remain reference data; the deployed preference ranking uses actual retrieved scores.

Neptune holds curated offers, flight legs, airports, transfers and hotel-to-venue edges. Python validates continuity and timing over these returned paths. S3 holds versioned source excerpts and the raw fixture. Aurora records each document's URI/version ID; the runtime reads that exact S3 version. Document embeddings are prepared, but policy selection currently follows known IDs rather than vector search.

AgentCore Memory holds the earlier onboarding conversation and real demo conversations for actor `alex-onward`. Its built-in Semantic, User Preference, Session Summary and Episodic strategies extract long-term records asynchronously. The runtime's ranking path retrieves User Preference records and distinguishes them from an onboarding-conversation fallback. The solution briefing also shows the dedicated showcase session's facts and summary; Episodic stays visibly empty until AgentCore detects a completed episode. New conversations preserve this actor's preferences; turning Memory off removes their ranking influence without deleting them.

Aurora does not store or mirror those Memory records. It stores the stable traveller entity, explicit declarations, hotel descriptions and embeddings, prices and current stock. The runtime uses retrieved preference language to select source-backed search vocabulary, asks Bedrock for the query embedding, and executes the combined lexical/vector retrieval in Aurora.

The “verified examples” component reads a stored, authored complete-trip pattern. Automated deterministic checks exercise its budget, route, availability and timing invariants. It is not a certified travel policy. A fresh Aurora read supports the final answer.

## Rehearsal changes

The stock control writes AX218 seats to zero or four in Onward's Aurora table, then submits a new request using the current conversation constraints. Restore the seats after rehearsal. This does not change the local fixture file. Re-running `scripts/seed.py` restores fixture inventory and refreshes source versions/embeddings; it is not necessary between ordinary runs.

Hotel ranking can vary with the current explicit query, retrieved preferences and model interpretation. The expected outcomes above describe the tested default conditions; hard budget, deadline, walking and availability rules remain deterministic.
