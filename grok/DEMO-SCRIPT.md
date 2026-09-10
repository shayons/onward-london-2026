# Onward — Data for AI Day London

Six minutes. Presenter mode on if you want to walk the layers. Live pace if you want events to arrive on their own.

## 0:00 — Settled trip

The strip shows Alex Morgan, LHR → LIS on 10 September, Ribeira Design Studio at 14:00. AX201 looks booked. Say: the plan is ordinary; the objective is the meeting.

## 0:40 — Cancellation

Click **Reveal cancellation** (or start a 10s timer). AX201 is gone. The meeting does not move. Send the prepared request:

> My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.

## 1:20 — Six components

Use **Next layer**.

1. **Business context** — success is the studio by 14:00, complete cost strictly under £650. Not “a flight to Lisbon”.
2. **Ontology** — Heathrow, Lisbon, Alex, the venue and the trip become shared IDs.
3. **Disambiguation** — “tomorrow” is 10 September because the clock is fixed at 9 September 18:00 London. “Nearby” is 20 minutes on foot. Memory reads the quiet-courtyard onboarding as short-term source context.

## 2:40 — Traps

4. **Metrics** — integer pence, one formula. AX404’s cheap fare is not a complete trip.
5. **Relationships** — AX404 lands 13:20; 45 + 35 minutes puts her at 14:40. ME615’s Madrid connection is 45 elapsed minutes; the versioned minimum is 60. Linger here.

## 4:00 — Supported itinerary

6. **Verified examples** — stock and prices rechecked now. With memory on: **AX218 + Pátio House, £490, studio 12:25**. Forum Rooms is £20 cheaper; the quiet preference ranks after hard constraints.

## 5:00 — Change the data

- **Arrive earlier** → AX102 + Pátio, £590, 10:55.
- **Cheapest complete** → AX218 + Forum, £470 (explicit instruction overrides the preference).
- **Under £450** → no match. Cheapest eligible is £470.
- **AX218 sold out** → next request reads the snapshot; ME330 + Pátio, £564.

Close: the agent adapts because the goal, definitions, relationships, preferences and current records are available as data.

## Controls

Pause holds the display, not the engine. Next event is a smaller step; next layer waits for that component’s evidence. Replay is labelled recorded. Hiding the tab cancels a running cancellation timer and pauses the display.
