# Onward — ten-minute demo

For **Data for the Semantic Layer: Building search that understands intent**, presented by Shayon Sanyal. The talk slot is **10:30–11:30 GMT+1**; this guide covers a ten-minute demonstration within it.

The audience should leave with one idea: **useful search needs data that describes the goal, the meaning of the words and the facts that make an answer work.**

## Before the session

1. Open `http://localhost:4318`. Select **Online** and check the services.
2. In that dialog, select **Restore demo stock** if preparing a fresh rehearsal. This restores all fictional seats and rooms. It keeps the booking records.
3. Rehearse the main request once. Check the actual hotel match, meeting arrival and complete price.
4. Select **New**, then **Presenter**. Auto reveal is the normal default; Presenter pauses the display so you can explain each step.
5. Keep the evidence panel visible. Use browser zoom if the room needs larger text.

The clock is fixed at 14 September 2026, so “tomorrow” always means 15 September. Travel offers, prices, people and policies are fictional. The application really calls AWS; it has no supplier feed and cannot make a real booking.

## 0:00–1:00 — introduce the goal

Show Alex’s original trip.

Say: “Alex has a client meeting in Lisbon at two o’clock tomorrow. Her flight is cancelled, but the meeting stays. She needs a replacement flight, a checked bag, one hotel night and the airport transfer, all for under £650.”

Say: “Getting to Lisbon airport is not enough. She has to reach the meeting.”

Keep the cancellation button for the request in a moment.

## 1:00–2:00 — show what was prepared

Open **Data preparation**. Point to the flight records, complete-price definition and hotel descriptions.

Say: “Before the question, we did some preparation. Heathrow and LHR refer to the same airport. Every price uses the same currency and includes the right costs. Hotel descriptions are ready to search by meaning. The flights, transfers and meeting are connected.”

Point to Pátio House’s description: “Courtyard-facing rooms on a residential lane.”

Say: “That sounds quiet, even though the description does not use the word ‘quiet’. This is where a word search alone can miss something useful.”

Return to **Concierge**. Select **Presenter** if it is not selected.

## 2:00–4:00 — ask once and explain the meaning

Select **Reveal cancellation**, then the send button, labelled **Find another way**.

The prepared question is:

> My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.

Use **Next layer** three times. Let each step finish before advancing.

| Component on screen | Plain explanation |
|---|---|
| Set the goal · Business context | “Reach the meeting, within the complete budget.” |
| Connect names and places · Ontology | “Alex, Heathrow, Lisbon and this meeting refer to shared records.” |
| Understand the words · Disambiguation | “Tomorrow has a date; nearby means a walking limit; Alex usually prefers a quiet hotel.” |

Pause on the hotel comparisons.

Say: “Keyword search matches words. Vector search compares meaning, so different wording can still match. An embedding is the list of numbers used for that comparison. Hybrid search combines word and meaning rankings.”

Point to the walking times.

Say: “A good description match is only a candidate. Coast Retreat sounds peaceful, but a 55-minute walk does not meet Alex’s 20-minute limit.”

The scores are relative search scores, not probabilities. Describe which hotel ranks higher; there is no need to read decimal scores aloud.

## 4:00–6:00 — check the price and the journey

Advance **Count every cost** (Metrics).

Say: “A £255 fare is not a £255 trip. Add £35 for the bag, £165 for the hotel and £35 for the transfer: £490. Taxes are already included. We count each cost once.”

Advance **Check the whole journey** (Relationships). Point to the two rejected flights.

Say: “The cheapest flight lands at 13:20. Add 45 minutes for arrivals and 35 minutes for the transfer: Alex reaches the meeting at 14:40. It misses the goal.”

Say: “The Madrid connection leaves only 45 minutes. Our demo rule requires 60, so that option fails too.”

Say: “The knowledge graph gives us the connected steps. The application checks whether their times work. A link between two places is not a guarantee that you can make the journey.”

Raw SQL, graph queries and source versions are available under **Inspect request** and **Inspect returned evidence**. Open one only if it helps this audience.

## 6:00–7:00 — show the supported answer

Advance **Check the answer** (Verified examples). The last step releases the itinerary and answer.

The usual quiet-hotel result with starting stock is **AX218 + Pátio House**, **£490 complete**, reaching the meeting at **12:25**, with a **12-minute hotel walk**. Read the actual card: a changed request, stock level or retrieved preference can change the result.

Say: “This trip meets the requirements together. The checklist tells the application what to check; current records supply the price and availability. Nothing has been reserved.”

## 7:00–8:00 — change one thing

Select **Auto reveal**, then **Somewhere livelier**.

Say: “Alex changed her preference. The search should find a livelier hotel, while keeping the same budget and meeting deadline.”

With starting stock, Forum Rooms is the expected new hotel. Explain the result that actually appears.

For an alternative, choose **Try a £450 budget**. No complete feasible trip is strictly under £450 with the starting data; £470 is the lowest feasible total.

Say: “A useful system can say that nothing fits. It should not quietly drop the bag, ignore the transfer or move the deadline.”

Use one follow-up in the core demo. Earlier arrival, a window seat and stock changes are available for questions.

## 8:00–9:00 — connect back to architecture choices

Open **Architecture**.

| Need | Starting approach |
|---|---|
| Exact prices, stock and limits | Database queries and explicit checks |
| Names, codes and distinctive words | Keyword search |
| Similar meaning with different wording | Vector search |
| Both word matches and meaning matches | Hybrid search |
| Following several connected steps | Graph traversal |

Say: “Choose based on the question. Simple relationships can live in relational tables. A graph becomes useful when following connections is central to the work. Several of these roles can share one database.”

## 9:00–10:00 — finish and leave room

Say: “The useful answer depended on prepared data: shared names, complete costs, searchable descriptions, connected steps and rules with sources. The model could then interpret Alex’s question and explain an answer the data supports.”

Leave this minute for a question or a slower live response. Booking is an optional extension, not a required stop in this retrieval demo.

## Optional: a booking allowed or refused

On a completed itinerary, **Book this for Alex** confirms one fictional booking. The runtime supplies the selected trip and the real confirmation flag. AgentCore Gateway checks the Cedar booking rules before the booking tool runs. Aurora reserves a seat and room together, and a retry returns the same booking.

For a refusal, start a **fresh conversation**, sell out AX218 with **Flight availability**, and ask the original question with: “Choose a quiet hotel. I have no seat preference for this trip.” This prevents a remembered window-seat preference from selecting the more expensive AX102. With the starting rooms and other flights available, ME330 + Pátio House is £564. Its fictional Meridian Europe carrier does not accept agent bookings. Read the actual selected flight, then select **Book this for Alex** to show the refusal. Nothing is reserved.

Typing “Book it” without the confirmation button also fails the confirmation rule.

After either experiment, use **Online → Restore demo stock**, then **New**. The flight switch alone only changes AX218; it does not restore rooms or other flights.

## Controls and recovery

- **Pause / Resume** controls the display. AWS execution continues while paused.
- **Next event** reveals one smaller step. **Next layer** reveals one component, then pauses. The final component releases the answer.
- **“1 of 6 steps shown”** describes your progress through the search presentation. AWS can have finished while later steps are still waiting to be shown. Booking is a separate confirmation check: its status replaces this counter, with a link back to the six trip checks.
- **Replay** starts the recorded run from an empty evidence panel and makes no new AWS calls.
- **Stop** stops playback and requests cancellation of a live runtime session. If stopped during booking, the booking may already have completed; retry the same question to check its result safely.
- New questions and stock changes wait until the current answer has been shown or stopped.
- **New** resets the visible conversation and runtime session. It preserves stock and Alex’s usual preferences.
- Hiding the tab cancels a pending cancellation timer and pauses the display.
- A failed live call stays visible as a failure. Use **Check again** after renewing expired AWS credentials. There is no silent local-data replacement.
