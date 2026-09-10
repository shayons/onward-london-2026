# Onward — six-minute presenter guide

Open **http://localhost:4318**. The audience should leave understanding what data makes an agent's answer meaningful, measurable and feasible.

## Before the audience arrives

- Confirm **Online** and open the connection dialog: account `619763002613`, `us-east-1`, Aurora `meridian-demo / onward`, Runtime, Memory, Gateway, Neptune and S3, plus the Gateway and Policy engine ids and the CloudWatch trace link.
- Run one rehearsal to warm the deployed runtime and inspect actual Memory retrieval in Disambiguation. Long-term preference extraction is asynchronous; it is prepared before the event.
- Restore AX218's seats after any stock experiment. Then select **New conversation** with **Presenter** selected (the default).
- Use a desktop viewport with the trace pane open. At narrow widths, the traces button opens the panel separately.
- Keep the six components visible initially. Source dialogs are optional drill-downs, not six mandatory stops.

## 0:00–0:45 — a familiar trip

The opening says **“One meeting. It cannot move.”** Alex has a flight, a client meeting at 14:00 and one hotel night.

Say: “Alex's goal is a meeting, not a flight search. The full replacement trip must be under £650. The people and inventory are fictional; the AWS calls you will see are real.”

Select **Reveal cancellation**. Alternatively, select 5s, 10s, 15s or 30s beside it while introducing Alex. **Cancel timer** stops the reveal.

## 0:45–1:15 — one question

Select **Find another way**. The composer also accepts the complete request:

> My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.

Say: “Relevant results alone cannot answer that. We need definitions, identities, context, calculations, relationships and supporting evidence.”

Presenter mode holds the display while the actual agent works. It is safe to narrate; **Next layer** waits if its returned evidence has not arrived.

## 1:15–3:45 — six components

| Advance | What to show | What to say |
|---|---|---|
| Business context | Typed deadline, complete budget and preserved conversation constraints | “Success means reaching the venue. Our cost scope is data the agent can read.” |
| Ontology | Aurora's stable IDs and aliases for Alex, LHR, LIS and the venue | “Names in a sentence become shared entities across the stores.” |
| Disambiguation | Fixed date, walking limit, actual Memory records and hybrid hotel results | “‘Tomorrow’ and ‘nearby’ need context. Memory supplies preferences; descriptions supply meaning.” |
| Metrics | Aurora SQL prices 15 complete bundles | “A £255 fare is not a £255 trip. Bags, hotel and transfer count too.” |
| Relationships | Neptune paths and rejected routes | “AX404 lands before two, but reaches the venue at 14:40. ME615 has only 45 minutes to connect against a 60-minute rule.” |
| Verified examples | Stored pattern, fresh Aurora check and constraint-valid selection | “The assembled answer is checked against current facts. An example helps organise the work; it does not certify the result.” |

Use **Next event** to break any layer into input, mapping, tool request and returned evidence. **Inspect request** shows SQL or openCypher. **Inspect returned evidence** shows the actual records and request IDs. These are application traces, not the model's private reasoning.

For a nontechnical audience, spend most of this time on Metrics and Relationships. Mention the service only after explaining the question it answers.

## 3:45–4:30 — the supported answer

The default quiet-hotel run has produced **AX218 + Pátio House, £490 complete, at the meeting at 12:25**. The itinerary breaks down £255 fare, £35 bag, £165 hotel and £35 transfer. The hotel is 12 minutes on foot from the venue in the fixture.

Say: “This is an eligible whole journey, with a hotel that fits Alex's preferences. Nothing has been booked yet. The next click books it, and a policy decides whether the agent may.”

Select a source reference to return to its semantic component. The answer's exact prose is generated live; the card's numbers come from the validated tool result.

## 4:30–5:00 — book it under policy

Select **Book this for Alex** on the itinerary card. One click sends the booking turn with Alex’s confirmation attached; there is no dialog.

Watch the rail: a seventh row, **Booking**, appears under “+ one governed action”. Its four events show the request, the policy step (“Policy decides before code runs”), the `book_trip` call through AgentCore Gateway and the returned evidence. The card shows the booking reference, the flight and hotel, the complete price, the seats and rooms left, and **Policy: permitted**.

Say: “The agent asked to act. Before any of our code ran, the gateway evaluated three Cedar policies against the exact arguments: Alex confirmed, the price is under her budget, the itinerary reaches the venue in time, and the airline’s rules hold. Only then did one seat and one room get reserved, atomically, in our fictional inventory. Nothing went to an airline.”

To show a refusal, select **Flight availability** in the footer to sell out AX218, let the automatic recheck run (the agent now selects **ME330 + Pátio House, £564**, a Meridian Europe fare), then click **Book this for Alex**. The airline rule forbids it: in this fictional world only Aster Air accepts agent bookings. The gateway denies the call before the tool runs, the Booking row reads **Refused**, the card explains the policy reason with no success styling, and nothing is reserved. Select **Flight availability** again to restore the seats. The policy engine runs in ENFORCE mode with three policies, `onward_read_tools`, `onward_traveller_booking` and `onward_airline_rules`, shown verbatim on the Solution briefing page. (Typing **Book it for me** without the click is also refused, under the traveller policy, because the confirmation is missing.)

The trace rail footer shows the run’s OpenTelemetry trace id and **View trace in CloudWatch**; open it once to show the same run as timed spans across the runtime, Bedrock, the gateway and Memory.

## 5:00–5:30 — change the data or the intent

Choose one main experiment; keep the others for questions.

- **Data changes:** select **Flight availability** in the footer to sell out the preferred flight. This updates the actual fictional Aurora record and submits a fresh availability check. With the original constraints and quiet preference, the expected replacement is **ME330 + Pátio House, £564, venue arrival 13:10**. Restore the seats after explaining it.
- **Intent changes:** select **Arrive earlier**. Conversation memory retains the budget and deadline; expected **AX102 + Pátio House, £590, venue arrival 10:55**.
- **Preference changes:** select **Lowest complete price** or turn Memory off. Expected **AX218 + Forum Rooms, £470** when AX218 has seats.
- **No feasible answer:** ask for **strictly under £450**. No complete eligible bundle fits. Onward should report that without relaxing the deadline or omitting costs.

Run each comparison from the intended current constraints. Earlier/cheapest/budget instructions persist within that conversation. **New conversation** resets those constraints; remembered cross-session preferences and inventory persist.

## 5:30–6:00 — connect back to the talk

Open **How the data was prepared** or **Data preparation** to visit `/prepare`.

Say: “Before the question, raw rows became stable entities and money units, descriptions became searchable meaning, edges connected the journey, source versions anchored the rules, and a conversation became scoped preferences. That is the data for our semantic layer.”

Aurora handles authoritative facts and hybrid retrieval. Neptune earns its place for relationship traversal. Memory adds user context. S3 preserves source versions. Bedrock interprets and explains; AgentCore runs the agent. The six responsibilities do not require six databases.

## Controls and recovery

**Book this for Alex** sends one booking turn; the button disables while a run is live and disappears after a booking or a refusal in that conversation. **Flight availability** restores the seat a booking took. **Pause/Resume** controls display only. **Auto reveal** reveals received events at the selected pace. Presenter mode starts paused at 0.8s per semantic event; Next layer pauses after each component, and the sixth unlocks the streamed response. **Replay** reuses this run and is labelled recorded. **Stop** terminates the live request/runtime session and marks the run incomplete. **Retry this question** is a fresh AWS call.

If a live service fails, show the error and check the connection. A previously received run can be replayed, clearly labelled; there is no silent simulation fallback. New conversation returns to the booked-trip opening. Hiding the tab cancels the cancellation timer and pauses display playback.

The **Talk track** button provides a compact version of this guide. In Disambiguation, premium hotel tiles expose the actual lexical score, semantic similarity and hybrid rank, together with walking time and nightly price. The numerical scores depend on the current query; do not present them as probabilities. The copied Grok prototype uses different fixtures; the live demo keeps Pátio House at £165/12 minutes, Forum Rooms at £145/8 minutes, and Coast Retreat at £125/55 minutes.

On a projector the type stays at laptop sizes and only the layout widens; if the room needs larger text, use browser zoom (Cmd and plus) so everything scales together. The question stays within a comfortable reading width. After sending, the trip becomes a shallow context strip. You can scroll up to inspect a hotel or source and advance an event without being pulled down; **Latest** returns to the end.


### Optional memory moment (45–60 seconds)

At Disambiguation, pause on Alex’s aisle preference from an actual AgentCore long-term record and shellfish declaration from Aurora. Explain that the two need different handling. The final itinerary checks the preferred seat against Aurora inventory and shows catering as unverified. Click **Window this trip**: AgentCore short-term context overrides the remembered aisle preference for this conversation. A fresh conversation still retrieves aisle. Switch **AgentCore Memory** off on a new conversation: preference influence disappears, while the explicit Aurora allergy declaration remains. No seat, meal or booking is reserved.
