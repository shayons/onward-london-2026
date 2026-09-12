# Onward — a travel concierge with evidence

Onward demonstrates **Data for the Semantic Layer: Building search that understands intent**. A cancelled London-to-Lisbon flight becomes one question resolved through six visible semantic components. The Grok-inspired concierge workspace runs real AWS requests and lets a presenter pause, step and replay their evidence.

**Open http://localhost:4318.** Counter remains independent at `../data-ai-day-london-cafe-2026`; its files and application data are untouched.

- [PRODUCT.md](PRODUCT.md): the full product brief, scenario, data, behaviours, boundaries and success criteria.
- [DEMO-SCRIPT.md](DEMO-SCRIPT.md): the ten-minute presenter guide, including preparation and architecture choices.
- [ARCHITECTURE.md](ARCHITECTURE.md): the execution path and database decision framework.
- [data/README.md](data/README.md): dataset provenance, preparation and expected decisions.
- [infra/README.md](infra/README.md): deployed resources, rebuilding and retirement guidance.
- [CODE-REVIEW.md](CODE-REVIEW.md): prioritised fixes, verification evidence and remaining limits.

## Run the connected demo

Use a recent Node.js release and active AWS credentials for the authorised Isengard account **619763002613**. The server uses the default AWS credential chain; credentials stay server-side.

```sh
npm ci
npm start
```

The agent’s tools are served by AgentCore Gateway; `scripts/provision_gateway.py` creates the tools Lambda, the gateway, its target, the Cedar policy engine and the writer credentials, and is run once after provisioning and seeding (see [infra/README.md](infra/README.md)).

The server binds to `127.0.0.1:4318`; `TRAVEL_DEMO_PORT` overrides the port. No frontend build is required. Fonts and images are local. The browser talks to the local Node proxy, which invokes the IAM-authenticated AgentCore runtime in **us-east-1**. `infra/deployed.json` contains resource identifiers, never secret values.

The **Online** button opens actual service readiness checks. If credentials expire, renew the existing AWS session and select **Check again**. A failed AWS request is shown as a failure; there is no automatic local-data fallback.

## Play the story

1. **Auto reveal** is selected by default. Choose **Presenter** for the guided demo so each request begins with its display paused.
2. Select **Reveal cancellation**, then **Find another way**. Or type a question in the composer.
3. Advance **Next layer** through Set the goal, Connect names and places, Understand the words, Count every cost, Check the whole journey and Check the answer. Their technical component names remain visible underneath. **Next event** reveals one smaller event; **Resume** reveals the queue at the selected pace.
4. Inspect an event's SQL, graph query, returned evidence or service request IDs. The sixth layer unlocks the itinerary and checked response. Received answers appear steadily in complete words; Pause and Stop also control this text reveal. Reduced motion shows received text immediately. “1 of 6 steps shown” measures revealed search evidence; it does not measure AWS service readiness. An optional booking has its own status and a link back to the six trip checks.
5. Try **Arrive earlier**, **Somewhere livelier**, a **£450 budget**, or the **Flight availability** control in the footer.

**Pause holds the display, while AWS execution continues. Replay uses the recorded run without new AWS calls. Stop ends the live request/runtime session.** The stream contains application tool events, not private model reasoning. The 24 semantic events are separate from answer-token and lifecycle events.

A new conversation resets the visible story and runtime session. It preserves Alex's cross-session memory and does not reset Aurora inventory. The **Flight availability** switch changes only AX218. To restore all fictional seats and rooms after booking, open **Online → Restore demo stock** before another rehearsal. The cancellation timer is explicitly started and can be cancelled; hiding the tab cancels that timer and pauses display playback.

## What is connected

- **Aurora PostgreSQL:** isolated `onward` database in the existing `meridian-demo` cluster; current fictional prices/availability, definitions, entities and pgvector/full-text retrieval.
- **Amazon Bedrock (via Strands Agents):** the selected model interprets typed requests and explains checked trip results; Titan Text Embeddings V2 produces 256-dimensional embeddings. Proposal text is held until complete. Reservation and connection explanations use checked facts; no-match and booking outcomes are also explained directly from their returned data.
- **AgentCore Runtime, Gateway, Policy and Memory:** the deployed Strands agent discovers and calls six MCP tools through AgentCore Gateway with IAM-signed requests; a Cedar policy engine permits or forbids each call before the tools Lambda runs; real conversations and extracted preferences support follow-ups and hotel ranking.
- **AWS Lambda:** one function implements the six tools over Aurora, Neptune, S3, Titan and Memory; another proxies the published API.
- **Neptune Analytics:** actual journey and walking relationships; bounded Python rules validate continuity, elapsed connection time and venue arrival.
- **S3:** versioned original source documents, retrieved by recorded version ID.
- **CloudWatch:** structured application events with service request IDs, OpenTelemetry spans from ADOT on the runtime (GenAI Observability dashboard, linked from the trace rail), KMS encryption and seven-day retention.

S3 Vectors and DynamoDB are not provisioned. The dedicated Neptune graph incurs charges while running; see [resource guidance](infra/README.md). Stopping the local server does not delete AWS resources.

## Dataset and scope

This is a connected AWS demo over **fictional travel inventory**, not a supplier feed. A booking reserves fictional inventory in Aurora under a Cedar policy decision at AgentCore Gateway; no supplier is contacted and no payment is taken. It supports Heathrow to Lisbon on **15 September 2026**, one hotel night, a venue deadline and complete outbound budget. The fixed demo clock makes “tomorrow” repeatable.

The source has five replacement offers, six flight legs, three hotels and four authored policy/example documents. It deliberately includes a late venue arrival, an invalid connection and a relevant but distant hotel. Live runs calculate complete costs and enforce hard constraints before ranking.

Alex and the Lisbon-inspired scene are AI-generated, with visible disclosures and exact prompt sidecars in `assets/`. Alex is not a real customer; the image does not depict a bookable hotel.

## Verification and implementation

```sh
npm test
.venv/bin/python scripts/smoke.py
```

`npm test` covers the planner, real PostgreSQL reservation concurrency, tool argument enforcement, conversation persistence, SSE decoding and playback cancellation. The reservation checks start a disposable local PostgreSQL instance when server binaries are installed; otherwise those checks report a skip. Install Python dependencies first with `uv pip install --python .venv/bin/python -r backend/requirements.lock`. The smoke command makes a real deployed AgentCore request and saves its evidence under `.local/verification/`. Browser verification and captures are in `.impeccable/review/grok/`.

The shipped frontend is `index.html`, `app.js`, `presentation.js`, `style.css`; the proxy is `server.mjs`; the agent, conversation state, gateway client and six-tool Lambda are in `backend/`. `api-shared.mjs` keeps local and published request validation consistent; `stream.js` decodes the browser event stream and `answer-reveal.js` smooths its text for display. `scripts/` provisions, seeds, packages and verifies the AWS deployment. `engine.js` is not shipped to the browser; it re-derives the trip arithmetic independently so `tests/engine.test.mjs` can pin the numbers the talk quotes.

The supplied `grok/` export is preserved as a reference. Its visual design and images are incorporated into the live app; its simulated engine and alternate dataset are not loaded. Open **http://localhost:4318/prepare** for the data-preparation view. Hotel comparison tiles show actual retrieval scores after the Disambiguation component has been revealed.

Open **http://localhost:4318/briefing**, or choose **Solution briefing** in the top bar, for the solution briefing. The top bar also links Concierge, Data preparation and Architecture, and stays visible on every page. Its “What the model does, and what the code does” section explains the model’s three decisions, lists the six MCP tools it calls through AgentCore Gateway, shows the three Cedar policies verbatim, and names the behaviours the deterministic rules produce; no framework skill is involved. The Memory showcase quotes Semantic facts, User Preference records, a Session Summary and the Episodic record that the deployed strategies extracted from a dedicated Alex conversation, labelled as recorded on 9 September 2026 rather than fetched live.

Aurora is not used as AgentCore Memory's backing store. The search_hotels tool, behind AgentCore Gateway, retrieves Memory preferences, applies current-request precedence, uses Bedrock to embed the resulting hotel intent, and sends the vector and lexical query to Aurora; the runtime’s Strands session manager persists the conversation. Aurora holds the traveller entity and explicit declarations, hotel text/embeddings, prices and stock; AgentCore Memory holds the conversational records.

Traveller context adds an aisle-seat preference in AgentCore Memory, a structured shellfish-allergy declaration in Aurora, and current fictional aisle/window options. Run `.venv/bin/python scripts/seed_preferences.py` to apply just this additive fixture update to an existing Onward database; full `scripts/seed.py` includes it. Normal trip conversations use short-term Memory with extraction skipped; explicit remember requests still permit long-term extraction. Fonts now match the supplied Grok Google Fonts request and are self-hosted with provenance in `assets/fonts-provenance.json`.

Run `.venv/bin/python scripts/enable_memory_showcase.py` to idempotently add the Semantic, Session Summary and Episodic strategies to an existing Onward Memory and seed the dedicated showcase session. Long-term extraction is asynchronous; inspect the returned records before describing them as complete.
