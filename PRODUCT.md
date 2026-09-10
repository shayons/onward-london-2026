# Onward — product brief
<!-- impeccable:product-schema 1 -->

## Platform

A web application, presented locally at **http://localhost:4318**, with an agent hosted on Amazon Bedrock AgentCore Runtime and data in the user's AWS account. The frontend never receives AWS credentials. Onward is an independent project beside Counter; Counter's files and data must remain untouched.

## Product Purpose

**Onward is a travel concierge that helps a business traveller recover a disrupted trip, while making the data behind a useful answer visible.**

The traveller asks one natural-language question. Onward resolves the goal, people and places, ambiguous terms, cost definitions, journey relationships and decision rules into a complete itinerary. A side panel exposes the real inputs, tool requests, source records and outcomes for six semantic components.

The product is the demonstration for **Data for the Semantic Layer: Building search that understands intent**. Its central claim is that an agent needs prepared, connected, well-defined data to give an answer that meets the user's goal. A relevant search result is only one ingredient.

## Users

### The traveller

Alex Morgan is a fictional London-based designer travelling to Lisbon for a client meeting. Her situation is easy to recognise across countries and industries: a plan changes, the objective remains, and several constraints must be satisfied together.

Alex wants a workable answer without searching flights, reading baggage rules, comparing hotel descriptions and calculating ground transfers herself. She should understand what is included, why the itinerary works, why alternatives were rejected and what to change if no result fits.

### The presenter

The presenter is operating a five-to-seven-minute demonstration for a UK audience at Data For AI Day London. They need a clear story, a reliable reveal and control over the pace. They may stop on an individual query, explain one semantic component, advance a smaller event or replay a completed run.

### The audience

Business leaders, architects, builders and data practitioners should leave with a practical framework for choosing relational, keyword, vector, hybrid and graph retrieval, including where each one fails. They should see how the quality of the underlying data determines what the agent can do, and where memory helps without becoming the authority for prices or availability.

## The Core Scenario

Alex has a flight booked from **London Heathrow to Lisbon** for **15 September 2026**, with a client meeting at the fictional **Ribeira Design Studio at 14:00 Lisbon time**. She needs one hotel night, 15–16 September.

The opening shows the settled trip. The presenter reveals that the original flight, **AX201**, has been cancelled. A manual button is the default; an explicitly started timer can reveal the cancellation after 5, 10, 15 or 30 seconds.

Alex's request is:

> My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.

The demo clock is fixed at **14 September 2026, 18:00 Europe/London**. This makes “tomorrow” reproducible during rehearsal. Onward must disclose that this is a fixed scenario, rather than imply a current supplier feed.

### What success means

- Alex reaches the **meeting venue** by 14:00; landing at the airport is insufficient.
- The complete cost is **strictly under £650**.
- The price includes the outbound fare, requested checked bags, one tax-inclusive hotel night and one airport-to-meeting transfer.
- Every flight connection meets the versioned minimum connection rule.
- The hotel is within the requested walking limit; “nearby” defaults to 20 minutes on foot under the demo policy.
- The selected flight and hotel have availability in the current **fictional Aurora inventory**.
- Soft preferences improve ranking only after hard constraints are satisfied.
- No booking or reservation is made.

The budget excludes travel to Heathrow, a return flight and a return airport transfer. Supplier fares and hotel prices already include applicable taxes; taxes must not be added twice.

## The Problem Onward Makes Visible

The cheapest advertised fare can be the wrong answer. A semantically relevant hotel can be too far away. A connection can look possible when local clock times are compared, yet fail when elapsed time is calculated. A remembered preference can help select a hotel, but cannot establish its availability.

The seeded data includes two deliberate traps:

1. **AX404 lands at 13:20.** A 45-minute arrival allowance plus a 35-minute ground transfer puts Alex at the meeting at **14:40**, after the deadline.
2. **ME615 connects in Madrid in 45 elapsed minutes.** The demo's minimum is **60 minutes**, so that path is rejected even though its final landing time looks useful.

These examples let the presenter show exactly why a search result and a feasible complete journey are different objects.

## The Semantic Layer

The six components are semantic responsibilities, not six mandatory databases. Each exposes an input, a mapping or definition, a real tool request and returned evidence. Multiple components may use the same service.

| Component | Question it answers | Prepared data | Observable contribution |
|---|---|---|---|
| Business context | What does success mean? | A trip contract, cost scope and recent conversation | Bedrock produces validated, typed request arguments around arrival at the venue and the complete budget. |
| Ontology | Which people, places and things are involved? | Stable entity IDs, types and aliases | Aurora resolves Alex, Heathrow, Lisbon, the trip and meeting venue into shared identifiers. |
| Disambiguation | What do the user's words mean here? | A fixed clock, walking definition, descriptions, embeddings and actor-scoped preferences | “Tomorrow” becomes a date; “nearby” becomes a constraint; Memory and hybrid retrieval make hotel matching contextual. |
| Metrics | How do we measure a complete trip? | Integer-pence prices and a single complete-cost definition | Parameterised Aurora SQL calculates fare + bags + hotel + transfer for complete candidate bundles. |
| Relationships | Will the whole journey work? | Flight-leg, airport-transfer and hotel-walk edges, plus versioned policies | Neptune returns the paths; application rules calculate elapsed connections and venue arrival, then explain rejected routes. |
| Verified examples | Is the assembled answer supported? | A stored complete-trip pattern and tested invariants | The application rechecks Aurora prices and availability immediately before ranking eligible bundles. |

“Verified examples” means a stored, authored query pattern whose deterministic constraints are exercised by tests. It does not imply a production-certified travel policy or an independently audited supplier database.

## Data Preparation Before the Question

Onward should make preparation as visible as query execution. The data starts as fictional supplier rows, hotel descriptions, source policies and an earlier conversation. Preparation produces:

- Normalised entity IDs and aliases that agree across Aurora and Neptune.
- Explicit currency, integer-pence amounts and distinct baggage, hotel and transfer lines.
- Timezone-aware flight timestamps and versioned timing rules.
- Hotel descriptions embedded with Bedrock Titan Text Embeddings V2, stored alongside PostgreSQL full-text indexes.
- A graph of offers, flight legs, airports, the venue, transfers and walks.
- Versioned source documents in S3, with their URIs and version IDs recorded in Aurora.
- An onboarding conversation stored in AgentCore Memory, with built-in Semantic, User Preference, Session Summary and Episodic strategies.

The actual authored source is `data/travel.json`, derived from `data/travel.js`. `scripts/seed.py` prepares the AWS stores. The data preparation view in the interface links raw examples to their prepared form.

## Dataset and Provenance

The current source contains one fictional traveller, one trip, one cancelled original booking, three real airport identifiers, five replacement offers comprising six flight legs, three fictional hotels, one transfer and four authored policy/example documents.

City and airport names provide geographical context. The schedules, airlines, hotels, venue, prices, stock, walking distances, transfer timings and policies are authored fixtures. They are not quotations or measurements from travel suppliers.

The Lisbon-inspired destination, Alex portrait, hotel scenes and meeting venue illustration are AI-generated. The supplied Grok artwork is copied with prompt provenance; a clarity-enhanced destination is generated from the original scene. The image tool returned 1672 × 941 pixels, so this asset is not claimed as 4K. The principal send and cancellation controls use solid burgundy with light text or icon and generous targets. The image/persona disclosure appears beneath the composer and at the end of Alex’s profile. Hotel imagery is illustrative and does not identify a bookable property.

### Useful scenario outcomes

The cost and feasibility contract establishes these examples before semantic ranking:

- AX218 + Pátio House costs **£490**, reaching the meeting at **12:25**.
- AX218 + Forum Rooms costs **£470**, with the same arrival time; the hotel has a livelier description.
- AX102 + Pátio House costs **£590**, reaching the meeting at **10:55**.
- ME330 + Pátio House costs **£564**, reaching the meeting at **13:10**.
- There is no complete feasible trip strictly under **£450**.

Actual connected recommendations must come from retrieved records and the current request. These examples are test expectations and talk-track aids, not hardcoded response text. Model interpretation and hybrid ranking can change the wording or hotel choice; deterministic deadline, budget and availability checks remain authoritative.

## AWS Architecture

The authorised AWS account is **619763002613**, accessed through the user's existing Isengard role. Application resources are in **us-east-1**. The selected Bedrock US inference profile may execute the model in another supported US region.

| Service | Onward's responsibility |
|---|---|
| Aurora PostgreSQL | Reuse the existing `meridian-demo` cluster with an isolated database named `onward`. Store entities, definitions, offers, hotels, documents and pgvector embeddings. The runtime uses its own database reader secret and role. |
| Amazon Bedrock | Interpret the user request into a typed contract, generate query embeddings and stream a concise response grounded in the completed tool result. Both language-model calls go through the **Strands Agents SDK**, so the model is one parameter rather than a code path. Titan Text Embeddings V2 produces the hotel and query vectors. |
| AgentCore Runtime | Host Onward's Python agent, coordinate real service calls and return an SSE stream. The local Node server invokes the IAM-authenticated runtime with the user's AWS credential chain. |
| AgentCore Memory | Persist conversations and extract actor-scoped facts, preferences, session summaries and completed episodes within the Onward namespace. Memory never supplies authoritative fare, stock or schedule facts. |
| Neptune Analytics | A dedicated Onward graph holds journey and walking relationships. The demo graph is provisioned at 16 m-NCUs with no replica; it incurs charges while running. |
| Amazon S3 | Keep versioned original fixture/policy sources and the immutable deployment ZIP versions. Public bucket access is blocked. |
| CloudWatch Logs | Store structured application trace events with request IDs. Onward's runtime log group uses a KMS key and seven-day retention. |

Exact deployed identifiers are recorded in `infra/deployed.json`. Deployment status alone is not proof of successful execution; the interface checks service readiness, and verification must include a complete invocation through the deployed runtime.

S3 Vectors and DynamoDB are **not provisioned for this version**. Aurora already serves the small corpus's vector and current-fact needs. They remain architectural discussion points, not decorative services in the request path.

## Model Selection

Both language-model calls run through the Strands Agents SDK, so swapping models is a parameter, not a rewrite. The presenter dock carries a **Model** control listing the allowlisted choices; the selection travels with the next question and the trace records which model produced it.

The allowlist lives in `infra/deployed.json` as `selectableModels`, read by the runtime, the local proxy and the browser alike. A request naming anything outside it silently falls back to the deployed default, and the runtime's execution role is scoped to exactly these inference profiles, so an injected id cannot reach an unapproved model.

Measured on the deployed runtime against the same question and the same seeded data:

| Model | Whole run | Interprets “by 2pm” as | Selected trip | Answer length |
|---|---:|---|---|---:|
| Claude Sonnet 5 (default) | 14.7s | balanced | AX218 + Pátio House, £490 | 120 words |
| Claude Opus 5 | ~13s | balanced | AX218 + Pátio House, £490 | 96 words |
| Claude Haiku 4.5 | 10.5s | **earliest** | **AX102** + Pátio House, £590 | 90 words |
| GPT-5.6 Luna | 15.6s | balanced | AX218 + Pátio House, £490 | 78 words |

These are single samples, not a benchmark. The useful demonstration is not which model wins: it is that Haiku reads the same sentence as a request for the earliest arrival, sets `priority: earliest` in the typed contract, and produces a different, more expensive but entirely valid itinerary. The deterministic layer holds — the deadline, budget, walking limit and availability checks are identical — while the interpretation of intent moves. That is the semantic layer's boundary made visible.

Reasoning-capable models spend token budget before their first visible word, so the answer ceiling is 2,000 tokens and the contract ceiling 4,000. Length is governed by the prompt, not the cap.

## Memory Behaviour

Short-term conversation state supports follow-ups such as “Can I arrive earlier?” without losing the current budget and deadline. Long-term memory can contribute a preference such as a quiet hotel or walking to the venue.

Built-in long-term extraction is asynchronous. If extracted preferences are not yet available, the agent may retrieve the saved onboarding conversation; the trace must label this as short-term source context. It must never present authored local text as a successful Memory retrieval.

AgentCore Memory and Aurora are separate stores. Onward does not use Aurora as AgentCore Memory's backing store and does not mirror Memory records into an Aurora memory table. The runtime retrieves actor-scoped preferences, resolves current-request precedence and combines them with the Aurora traveller profile. Preference language then shapes the Bedrock query embedding and lexical terms used by Aurora's pgvector/full-text hotel retrieval. Aurora also retains the explicit traveller declaration, product facts, complete-price definition and current availability as authoritative application data.

An explicit instruction in the current question overrides a remembered preference. Turning memory off removes its ranking influence; it does not erase historical records. A new conversation receives a new runtime session while the fictional traveller's cross-session preferences remain scoped to Alex.

## Interface and Interaction

The requested visual direction incorporates the supplied **Grok Onward design**: warm paper, burgundy, panoramic Lisbon imagery, premium hotel tiles and a full-screen concierge beside a trace panel. Self-hosted Google Fonts match the supplied Grok families: Libre Caslon Text carries the wordmark, airport codes, itinerary titles and section headings; DM Sans carries body text, labels, controls, composer and conversation. Caslon uses regular 400 headlines, with bold 700 and real italic 400 loaded. DM Sans includes optical sizing from 9–40, weights 400/500/600 and real italic 400; body text is 400 and UI labels are 500. Palatino fallbacks, ss01/cv11 features and antialiased smoothing match the reference. Type does not escalate on wide displays: from 1500px up the laptop sizes apply and only the layout widens. Detailed visual rules belong in `DESIGN.md`.

The main pane begins with Alex’s enlarged portrait, the booked trip and meeting context. Cancellation reveals the replacement challenge; the first send compacts the trip context. Conversation history, grounded itinerary summaries and a large composer with an icon-only paper-plane action follow. The trace pane sits alongside the conversation on desktop, with six expandable components. Its width grows from the MacBook layout to a wide presentation display while type stays at the laptop sizes; a distant audience is served by browser zoom. Questions have a bounded reading measure. On small screens it opens as a dedicated panel.

Collapsed rows name their contributing services and purpose. Disambiguation calls out Aurora hybrid retrieval and AgentCore Memory; its expanded service roles distinguish Titan embeddings, vector similarity, keyword relevance and rank fusion. Each trace can reveal actual tool arguments, SQL or graph queries, returned records, source references, service request IDs and measured duration. These are application execution events, not private model reasoning. The itinerary explains the total price, arrival at the venue, hotel fit and sources.

The five offered follow-ups each exercise a different responsibility and land a visibly different outcome: an earlier arrival re-ranks on time and changes the flight; “Why not the cheapest flight?” explains a rejected route from the graph and the timing rules; “Somewhere livelier” flips hybrid retrieval away from the remembered quiet preference and changes the hotel; a £450 budget produces an honest no-match naming the limiting constraint; a window seat this trip overrides long-term memory without rewriting it. Memory on/off and an inventory change remain dock controls. The stock control changes only AX218's fictional Onward Aurora record; a subsequent request must read that change from AWS.

## Presenter Controls and Streaming

- **Auto reveal:** reveal received events at the selected pace; text follows in short streamed chunks.
- **Auto reveal:** selected by default. A question runs straight through, revealing each semantic event at the chosen pace without waiting for the presenter.
- **Presenter:** opt-in stepping. Begin new runs with the display paused and a default pace of 0.45 seconds per semantic event.
- **Pause / resume:** hold or continue presentation of buffered events. Pausing the display does not pause AWS execution.
- **Next event:** reveal a smaller application event.
- **Next layer:** slowly reveal one component’s input, shared meaning, tool request and returned evidence, then pause. The sixth component unlocks the streamed answer. Wait honestly if a real event has not arrived.
- **Pace:** add an explicit presentation delay; this is not a measure of service latency.
- **Replay:** consume the recorded run without making new AWS calls. Label replay as recorded.
- **Stop:** stop the current request/runtime session; mark the run incomplete.
- **Cancellation timer:** explicitly start, cancel or manually reveal the disruption. Hiding the tab cancels the timer and pauses the display.

The UI must not reveal the final answer ahead of its supporting components during a stepped presentation. The compact trip and short follow-up composer leave the active conversation more space. Hotel comparisons and itineraries enter from a controlled top anchor. Automatic following only continues when the viewer is already near the bottom; deliberate presenter scrolling is preserved, and Latest returns to the end. Source inspection should remain usable while the presenter explains a query.

The footer names **AgentCore Memory** explicitly and exposes a **Flight availability** control. A green pulsing **Online** status opens real AWS connection details; reduced-motion settings stop the pulse. Hotel tiles show descriptions, walking times, nightly prices and actual lexical/semantic scores after Disambiguation. Before a run, the preparation page shows score placeholders rather than invented rankings. The app continues to use the existing live Pátio House, Forum Rooms and Coast Retreat dataset, not the Grok prototype’s alternate prices or hotel records.

**Solution briefing** has its own `/briefing` view: what the product is, what the agent does step by step, the two model calls and the five kinds of AWS operation the fixed pipeline makes, the behaviours its deterministic rules produce, a tabbed AgentCore Memory showcase, the architecture highlights and their boundaries, an architecture diagram of the deployed topology, the key AWS services and their roles, the two delivery paths and their access posture, the interface, and how the whole thing is verified. The page states plainly that the model never selects a tool and that no framework skill is involved. The Memory tabs quote records the deployed strategies returned, labelled as recorded rather than live, including the extracted episode. It is written for someone evaluating the approach, not operating the demo.

**Data preparation** has its own `/prepare` view with typed offers, the price definition, hotel retrieval, journey relationships, Memory and versioned policies. **Architecture** opens the retrieval-choice framework in that view: exact/relational, keyword, embeddings, vector search, hybrid fusion and graph traversal, each with the question it answers, where it wins, where it fails and what Onward does with it. Embeddings are attributed to Bedrock and vector similarity to Aurora, so no row conflates two services. Official AWS icons supplied in Downloads identify Aurora, Bedrock, AgentCore, Neptune and S3; provenance is recorded under `assets/aws/`.

## Demo Story and Timing

A six-minute narrative is: introduce Alex's booked trip; reveal cancellation; ask the complete request; step through the six components; linger on the late arrival and short connection; show the supported itinerary; change availability or budget and run a follow-up.

The strongest closing point is that the agent adapts because the underlying goal, definitions, relationships, preferences and current records are available as data. The supporting services each earn their place by answering a specific part of the question.

The click-by-click narration belongs in `DEMO-SCRIPT.md` and should track the shipped interface.

## Boundaries and Non-Goals

This is a connected AWS demonstration over a deliberately bounded fictional travel dataset. It is not a commercial booking service, a complete worldwide travel search product, a source of live traffic or flight status, a payment workflow, or a production travel-policy authority.

Unsupported routes, dates or stay lengths should be explained clearly. Never silently substitute a supported trip. If no eligible bundle exists, return no match and identify the limiting constraints. If an AWS service fails, show the failure rather than silently replacing its output with a local fixture.

Do not expose credentials in the browser, documentation, trace output or public files. Limit runtime access to its intended data and services. Keep live calls distinct from recorded playback and fictional inventory distinct from real supplier availability.

## Success Criteria

The traveller can understand the proposed trip and complete price without opening technical traces. The presenter can explain how each semantic component contributes to the answer, pause and replay reliably, and demonstrate a changed result after a genuine source-data change.

Verification must cover an end-to-end deployed runtime invocation, actual Aurora/Neptune/S3/Memory request evidence, memory retrieval and conversation persistence, strict budget boundaries, venue arrival and connection arithmetic, no-fit and unsupported requests, stock changes, source inspection, streaming controls, desktop/mobile readability and isolation from Counter.

## Open Decisions

Onward is the working product name. The current route and inventory are intentionally bounded. Future live supplier APIs, booking actions, broader city coverage, authentication for external users, production observability and the final hosted event URL are separate product decisions. Add another data store only when a concrete retrieval or operational requirement justifies it.


## Traveller preferences and declarations

Alex prefers an aisle seat and a quiet hotel. A seeded conversation is stored in AgentCore Memory; actual extracted long-term records supply eligible-option preferences. The current request can override the seat choice: “For this trip, I would prefer a window seat.” This contract is recorded as AgentCore short-term memory with extractionMode SKIP so the one-trip override does not rewrite long-term preferences. Explicit remember requests still use the extraction path.

The fictional shellfish allergy is a structured traveller declaration in the Aurora entity payload, with source alex-declaration-v1. It remains visible when preference Memory is switched off. Explicit allergy declarations in this conversation are added to that context; a food preference never establishes an allergy. The corpus contains no catering/allergen evidence, so the UI and answer require carrier confirmation and do not claim a suitable meal.

Aurora offer records now include aisle/window counts, a seat-selection-included flag and seat-options-v1 provenance. These are fictional options across the whole flight offer. The final SQL recheck refreshes seat counts; an available preferred option is not a seat assignment. The existing strict budget, venue deadline and explicit earliest/cheapest priority take precedence. Available matching seats influence eligible-bundle ranking; no selection fee is introduced because the seeded options are included in the fare.

In the demo, open Alex’s profile, reveal Disambiguation to see remembered preferences beside the declaration, then inspect the final itinerary’s seat availability. Use Window this trip to show a short-term override, or turn Memory off for a new conversation to show that the Aurora declaration is independent.
