# Onward review — 11 September 2026

The review covers the shipped frontend, local and published APIs, AgentCore runtime, gateway tools, planner, Memory integration, preparation/deployment scripts and presenter journey. The starting revision was `a77dea2`. Changes remain uncommitted.

The ten-minute demonstration keeps the six semantic components, prepared data, source evidence and architecture choices. `PRODUCT.md` is unchanged. Counter and Meridian application files and data were not modified.

## Findings and fixes

| Priority | Finding and effect | Change and evidence |
|---|---|---|
| P1 | Booking could consume only part of a trip's inventory, or consume inventory again on retry. | Lock the seat and room together, insert one booking per session, and decrement both only for a new booking. A saved reservation is returned before testing depleted stock. Real PostgreSQL concurrency tests and a live retry after runtime restart verify this. See `backend/services.py`, `backend/tools.py`, `tests/test_booking_database.py`. |
| P1 | Model-supplied tool arguments could diverge from the checked request or real booking confirmation. | The runtime supplies canonical arguments, enforces tool order, limits calls and prevents a planning turn from booking. Gateway policy remains in ENFORCE mode. Tests exercise changed budgets, out-of-order calls and unconfirmed bookings; live checks verify both confirmation and airline refusals. See `backend/main.py`, `tests/test_agent.py`. |
| P1 | A restarted session could lose constraints, reuse a stale selection or fail while restoring signed model content. | Persist the typed contract and selection separately; invalidate a selection after no-match or unsupported changes. Restore plain conversation text from both SDK and preference events, excluding orphaned tool/reasoning blocks. Cold follow-ups and booking retries passed against AWS. See `backend/conversation.py`, `tests/test_conversation.py`. |
| P2 | Generated prose claimed a booking before confirmation, suggested an unchecked no-match workaround, or calculated an incorrect connection shortfall. | No-match, unsupported and booking outcomes use checked result text. Proposals mentioning reservations or connections use source-based wording and returned rejection reasons. The corrected copy is saved before creating its Memory event; it does not require deleting an existing event. Regression tests cover “booked”, “rebooked” and incorrect connection arithmetic. See `backend/main.py`, `backend/conversation.py`. |
| P2 | Invalid dates, ambiguous timestamps, incomplete paths and unavailable stock could produce misleading feasibility results. | Validate actual dates, offset-aware elapsed times, continuous and complete legs, transfer availability, non-negative costs and stock. Recheck prices and availability before selection and booking. Tests cover deadlines, totals, connections and strict “under” budgets. See `backend/planner.py`, `tests/test_planner.py`. |
| P2 | Stop, replay and overlapping requests could leave stale results, controls or booking actions on screen. | Guard callbacks by request generation, clear replay state, keep actions disabled until display playback finishes, and retain an honest uncertain-booking state after interruption. The actual application functions are exercised by playback regression tests. See `app.js`, `tests/playback.test.mjs`. |
| P2 | Fragmented event streams and inconsistent proxy validation could turn transport problems into misleading completion. | Add a shared SSE decoder and consistent JSON, body-size, session and confirmation checks. Published streaming includes keepalives. Tests cover split Unicode, CRLF, final frames, malformed input and overlapping request completion. See `stream.js`, `api-shared.mjs`, both proxies and their tests. |
| P2 | Inventory controls could reset unrelated fixture stock, and the published API carried shared administration access. | Separate the AX218 switch from the explicit full stock reset; use Onward's writer secret and guard the exact account/database configuration. Publication removes the shared admin credential from the edge environment and permissions. See `api-shared.mjs`, `scripts/publish.py`. |
| P3 | A booking turn ran two relevant checks but showed “1 of 6 checks complete”. Search progress also confused presenter disclosure with AWS progress. | Give booking its own status and two relevant rows, with a link to the earlier trip's six checks. Search progress says “steps shown”. Use six plain-language headings with technical subtitles, visible trip limits and a prominent Next layer action. Update the current seat count after confirmation; recorded playback leaves current stock unchanged and announces that it creates no new reservation. Browser checks and playback regressions cover these states. |
| P3 | Checked answers arrived as one large text block, producing an abrupt reveal. | Buffer received text separately from displayed text, then reveal complete words on one frame loop. Keep the composer locked until display completion, remove the blinking cursor, and pause or cancel the buffer with playback controls. Tests cover uneven chunks, Unicode, citations, final corrections, reduced motion and stale callbacks after Stop. See `answer-reveal.js`, `app.js` and the reveal/playback tests. |
| P3 | Firefox rejected the hotel-panel fold's inline style under the existing security policy. Send and Stop also differed in height. | Apply the fold delay through the trusted script's style property and give both controls the same height. The final live browser run records no policy violations and a constant composer height and position. |

Dependency packaging now uses explicit Python locks and clean deployment builds. The smoke checker requires a supported answer and validates the returned trip, rather than treating a completed stream as sufficient.

## Verification

- **79 automated tests pass:** 30 JavaScript and 49 Python, including real disposable PostgreSQL reservation tests. No tests were skipped.
- The final static design check reports no primary findings; 188 existing token advisories remain. The palette exception stays scoped to `index.html`, and the decorative status pulses remain removed.
- JavaScript syntax, Python compilation and Git whitespace checks pass. `npm audit --omit=dev` reports no known vulnerabilities.
- The live baseline selects **AX218 + Pátio House, £490 complete, at the venue by 12:25**. It rejects AX404's **14:40** venue arrival and ME615's **45-minute connection against a 60-minute minimum**.
- Live follow-ups cover restored sessions, a livelier hotel, earliest arrival, a strict £450 no-match, disabled preference ranking, unsupported Paris and model-only comparison. Evidence: `.local/review/live-read-checks.json`.
- Eight final live cases validate no-match wording, unsupported routing, a quiet-hotel proposal, unconfirmed booking refusal, confirmed booking, retry after restart, sold-out flight substitution and carrier refusal. Evidence: `.local/review/live-final-checks-v21.json`. The final prose guard was then extended and deployed as runtime version 22.
- The earlier verification reservation was removed and its seat and room restored. Those checks preserved the nine existing booking records, two AX218 seats and one Pátio House room. During the resumed browser pass, booking `ONW-6L9XV3` appeared in the shared Chrome conversation and was retained. The final ledger contains ten bookings, with one AX218 seat and no Pátio House rooms left. The streaming checks created no bookings. The reader role correctly refuses access to the booking ledger; ledger verification used the Onward writer role.
- **Runtime version 22 and the reviewed web app are deployed.** CloudFront reports Deployed. Hosted HTML, JavaScript and CSS match local source; Concierge, Data preparation and Solution briefing routes load correctly. The site requires authentication, both direct origins return 403, and the Lambda URL requires AWS_IAM. The edge role can read only the Onward reader and writer secrets.
- All six service checks pass locally and through CloudFront. The hosted SSE request returns AX218 + Pátio House for £490, with all 24 semantic events and the correct 45/60-minute connection evidence. The saved Memory explanation exactly matches the displayed answer. Invalid requests return 400/413 and stopping the test runtime session succeeds. Evidence: `.local/review/published-checks.json`.

## UI and presentation

| Audience heading | Technical subtitle |
|---|---|
| Set the goal | Business context |
| Connect names and places | Ontology |
| Understand the words | Disambiguation |
| Count every cost | Metrics |
| Check the whole journey | Relationships |
| Check the answer | Verified examples |

For the final step, say: “Use a checked trip template, recheck availability, and show the sources.” The examples describe what to check; current data supplies the answer.

The warm paper, burgundy, Caslon and DM Sans design is preserved. The opening groups the meeting deadline, complete budget and nearby hotel together. Each answer shows the interpreted limits. Short desktop and phone layouts have corresponding spacing rules.

Native Chrome capture recovered. The phone check at 390×844 reached the composer and all six evidence steps by scrolling, opened and closed the layers overlay, and displayed the service-status dialog within the screen. DOM measurements at 1728×940 and 2560×1440 found no horizontal page overflow and confirmed the presenter dock fits the viewport. The live desktop rehearsal showed the £490 itinerary, paused and advanced evidence, reached all six checks and opened the returned-source dialog. A booking in the shared Chrome conversation showed its own confirmation status, refreshed the footer to “1 seat”, and linked back to all six earlier trip checks. Evidence: `.local/review/browser-checks.json`.

The final streaming check used Firefox while Chrome was in use. A DOM observer recorded **77 visible updates over 2.914 seconds**, with a largest increment of **12 characters**. The composer stayed at **68px high and y=738** throughout the reveal and completion. There were **no security-policy violations**, and the composer enabled after the answer finished. Current inventory selected AX218 + Forum Rooms for £470 with all 24 semantic events; the existing Pátio House booking was preserved. The same six frontend files match local source and the authenticated CloudFront responses. The final publication also rechecked all six AWS services and the application routes.

## Design check disposition

- Fixed the architecture diagram's font drift, normalised the added type sizes and replaced two heavy side rules with the existing fine divider.
- Suppressed only the body-level clipping finding for `index.html`: the viewport shell contains independently scrolling regions, and evidence opens in a native modal dialog's top layer. The reason is recorded in `.impeccable/config.json`.
- Recorded a file-scoped exception for the deliberate warm paper palette, with `DESIGN.md` as its evidence. Removed the step and connection pulses: they could animate while completed results waited for the presenter, during replay, or beside a cached health status. Static marks and explicit labels now communicate those states. Reduced-motion support remains in place.
- The detector's remaining token advisories are documented in `.local/review/design-findings-final.json`; this pass did not broadly rewrite the established stylesheet.
- Refreshed `DESIGN.md` and the component specimens in `.impeccable/design.json`.

## Boundaries and remaining limits

All suppliers, people, prices, availability and reservations are fictional fixtures. AWS calls are real. There are no supplier feeds, payments or real bookings.

The itinerary card and source evidence are authoritative. Other generated proposal prose can still paraphrase imprecisely; this review does not establish general hallucination prevention. The three-hotel dataset demonstrates retrieval decisions, not production-scale search performance. Shared demo authentication and the fixed Alex actor are not a multi-user authorisation design.

The existing separation between candidate retrieval and hard feasibility checks is sound. The data-preparation view, source references and presenter controls support the talk well, and the revised script keeps the live sequence bounded.
## Second review — 12 September 2026

A follow-up pass over the same working tree, before it was committed.

| Priority | Finding and effect | Change and evidence |
|---|---|---|
| P2 | `pounds()` stripped trailing zero characters rather than a redundant `.00`, so £649.90 read "£649.9" and £12.50 read "£12.5". Seeded prices are round pounds, but `budgetPence` comes from what the traveller types, and the browser's own formatter disagreed. | Render whole pounds without decimals and every other amount with both, as `money()` does. Two regression tests fail against the old formatter. See `backend/main.py`, `tests/test_agent.py`. |
| P3 | `app.js` imported `presentation.js` under the previous cache token, and the disambiguation heading read "Understand the intent" while README, DEMO-SCRIPT, DESIGN and this document all said "Understand the words". | One token across `index.html` and `app.js`; the heading now matches the documents and the layer's own question. |
| P3 | `tests/test_agent.py` placed its `__main__` guard above a later test class, so running the file directly executed 15 of its 16 tests. | Guard moved to the end of the file; direct runs and discovery now agree. |
| P3 | `select_itinerary` raised a bare `StopIteration` when an offer had no current price row, and `apply()` read layer-2 evidence without the optional chaining used around it. | A named error that says what to do, and consistent optional access. See `backend/tools.py`, `app.js`. |
| P3 | The published site served none of the security headers the local server sends, and a 98 MB deck plus 112 MB of presentation working files sat untracked and un-ignored beside the repository. | One `CONTENT_SECURITY_POLICY` constant in `api-shared.mjs` drives both the local response and a CloudFront response-headers policy carrying nosniff, HSTS, frame-deny and a referrer policy. `.gitignore` covers the deck and its working directory. |

Also removed: nine orphaned font files and two superseded rasters that no source referenced, the unexecuted `pipeline.js` and `resolution.css`, four write-only fields in `app.js` and nine unused imports. `engine.js` stays: it re-derives the trip arithmetic independently, which is what pins the numbers the talk quotes. Provenance sidecars and the edit source recorded by `lisbon-destination-sharp.png.json` remain in the repository but are no longer uploaded; the site bucket now holds exactly the 35 objects the publisher produces.

Verified after the change: 79 tests pass, `ruff --select F,E9` is clean, the local server serves the shared policy, and the published site returns all five security headers, 401 without credentials, matching hashes for every static file, all three routes and six of six AWS services.
