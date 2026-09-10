---
name: "Onward"
description: "A calm travel concierge with visible semantic evidence."
colors:
  accent: "#7a2e3a"
  accent-soft: "#f3e6e4"
  bg: "#f7f4ef"
  paper: "#fffcf7"
  ink: "#1c1917"
  muted: "#6f675f"
  subtle: "#8a8278"
  line: "#e4ddd3"
  chip: "#efe8df"
  green: "#38634c"
  red: "#91363e"
  action-hover: "#642631"
typography:
  display:
    fontFamily: "Libre Caslon Text, Palatino Linotype, Palatino, serif"
    fontSize: "var(--type-story, 34px)"
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: "-.025em"
  ask:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-ask, 20px)"
    fontWeight: 400
    lineHeight: 1.45
  answer:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-answer, 15px)"
    fontWeight: 400
    lineHeight: 1.7
  question:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-question, 18px)"
    fontWeight: 400
    lineHeight: 1.6
  layer:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-layer, 17px)"
    fontWeight: 500
    lineHeight: 1.55
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-body, 15px)"
    fontWeight: 400
    lineHeight: 1.6
  support:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-support, 14px)"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-data, 14px)"
    fontWeight: 400
    lineHeight: 1.5
  controls:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "var(--type-controls, 12px)"
    fontWeight: 500
  evidence:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  chip: "7px"
  action: "9px"
  status: "10px"
  portrait: "12px"
  hotel: "14px"
  surface: "16px"
spacing:
  small: "8px"
  cluster: "12px"
  group: "16px"
  inset: "20px"
  large: "24px"
  wide: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.status}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.paper}"
  button-send:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.portrait}"
    width: "52px"
    height: "48px"
    padding: "11px"
  composer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "14px 16px 11px"
  followup:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "7px 10px"
  hotel-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hotel}"
  mode-switch:
    backgroundColor: "{colors.chip}"
    rounded: "{rounded.action}"
    padding: "3px"
---

# Design System: Onward

## Overview

**Creative North Star: "The Onward Concierge Workspace"**

Onward combines warm paper, burgundy actions and Lisbon imagery with a precise evidence rail. The character is calm, premium and readable: a travel concierge whose answers can be explained to an audience. Libre Caslon Text carries narrative landmarks; DM Sans carries the request, conversation and operational information.

The Grok-derived world keeps the human journey prominent while progressively revealing six semantic responsibilities. Photography provides atmosphere, thin rules organise facts, and larger audience-facing type gives the explanation room. Raw-data preparation and returned evidence remain connected to the supported trip.

**Key Characteristics:**

- Warm paper surfaces, restrained burgundy actions and photographic travel context.
- Regular Caslon landmarks with optical-size-aware DM Sans body and UI.
- A large opening request and a compact follow-up state with bounded reading measures.
- Six semantic responsibilities, actual service roles and inspectable evidence.

## Colors

The palette is warm and material: burgundy is the primary accent, supported by paper, stone and dark ink. Frontmatter values are normative and preserve the implemented CSS palette.

### Primary

- **Onward burgundy (`accent`):** main actions, links, selected controls and active semantic details. `action-hover` deepens the principal Send and Reveal actions.
- **Rose paper (`accent-soft`):** active markers and contextual feedback.

### Neutral

- **Warm canvas (`bg`) and light paper (`paper`):** outer workspace and contained surfaces.
- **Dark ink (`ink`), warm supporting text (`muted`) and tertiary stone (`subtle`):** primary reading, secondary explanation and event metadata.
- **Fine sand rule (`line`) and inset stone (`chip`):** dividers, borders, message bubbles, code and grouped controls.
- **Constraint green (`green`) and error red (`red`):** semantic status paired with explicit text. Online uses a separate brighter green pulse; it is a connection state rather than another brand accent.

**The Solid Action Rule.** Send and Reveal cancellation use flat burgundy with light foregrounds and generous targets; keep metallic fills and decorative action shadows out.

## Typography

**Display Font:** Libre Caslon Text → Palatino Linotype → Palatino → serif.
**Body Font:** DM Sans → ui-sans-serif → system-ui → sans-serif.
**Label/Mono Font:** ui-monospace → SF Mono → Menlo → Consolas → monospace for returned records.

The self-hosted faces in `assets/fonts.css` match the supplied Grok Google Fonts request: Libre Caslon Text regular 400, bold 700 and italic 400; DM Sans normal 400/500/600 and italic 400, with optical size 9–40. Display headings, the wordmark, airport codes, itinerary titles and hotel titles use regular Caslon. Body text and the composer use DM Sans 400; buttons, labels, layer names and operational emphasis use 500. Trace-event h3 titles remain DM Sans 500. The body enables `ss01` and `cv11`, automatic optical sizing, antialiasing and grayscale smoothing.

### Hierarchy

The role variables below are the final desktop CSS values; the sidecar carries breakpoints, while the frontmatter references these live variables. There is no single modular ratio.

| Role | 1001–1499px | ≥1500px |
|---|---:|---:|
| Narrative (`--type-story`) | 36px | 38px |
| Opening request (`--type-ask`) | 18px | 20px |
| Answer (`--type-answer`) | 17px | 18px |
| Sent question (`--type-question`) | 17px | 18px |
| Layer title (`--type-layer`) | 17px | 17px |
| Journey facts (`--type-facts`) | 17px | 17px |
| Body (`--type-body`) | 16px | 16px |
| Supporting/service title (`--type-support`) | 14px | 14px |
| Price/hotel metadata (`--type-data`) | 14px | 14px |
| Controls (`--type-controls`) | 12px | 12px |

**The Answer Outranks the Question Rule.** The opening request is the hero of an empty workspace, so `--type-ask` carries it. Once a run exists, the request has been read and the answer is the thing the room is looking at: the sent question drops to `--type-question` and the answer takes `--type-answer` at or above it. Never let the echoed question outweigh the grounded reply.

At 1728px the concierge resolves to ten steps — 42 / 38 / 26 / 24 / 20 / 18 / 17 / 16 / 14 / 12 — and the preparation page adds 28 and 21 for its section and article headings. Any new desktop value must land on that ramp or extend it deliberately here. The same ramp governs every wider display.

Answers use 1.7 line height, the opening field 1.45, sent questions 1.6, hotel prose 1.6 and layer service summaries 1.5. The root baseline remains 15px / 1.55. Airport codes are 36px below 1500px and 42px from there up; trace headings are 26px on every desktop width. The active follow-up field matches `--type-question`, with a 46px resting height; focus or a draft expands it to 90px. On phones the opening field is 17px and the follow-up field 16px; mobile layer names are 16px. Returned `pre` records take `--type-support`, 14px on desktop.

**The Room Zooms, The Ramp Holds.** Wide displays widen the layout (rail, insets, preparation container, dialog) and leave every type size at its ≥1500px value. A projector that needs larger text gets it from browser zoom, which scales the whole composition uniformly. A per-band escalation of type at ≥1800px was tried and read as oversized on a 2000px laptop viewport; do not reintroduce it.

**One Band Owns Its Values.** Desktop type is set in two blocks: `1001px+` sets every token and `1500px+` overrides four of them. The `≥1800` block sets no tokens and no font sizes; it changes layout only. A role is set once per band, from the token.

**The Wide Band Sets Layout, Not Type.** The ≥1800 block changes the rail width, the conversation insets, the preparation container and the dialog width. A font size, token or type-driven padding in that block is drift: an earlier escalation there reached a 30px opening field, 54px airport codes and a 48px headline. The composer, its hint and actions, the disclosure line, follow-up chips, dock controls, trace meta and layer states all read `--type-controls`; the field itself reads `--type-ask` before the first send and `--type-question` after it.

## Layout

The application fills `100dvh`. The topbar, trip context, composer and playback dock frame independently scrolling transcript and trace regions. The preparation view is a separately scrolling page. The opening combines Alex's portrait, the LHR–LIS panorama, booked status, “One meeting. It cannot move.” the large request and the six-component rail. After sending, the trip becomes a compact two-row grid and the composer contracts so the active explanation has more space.

| Width | Implemented layout |
|---|---|
| 1001–1799px | Main pane plus `clamp(416px,30vw,540px)` trace rail; topbar 68px. At 1728px the rail is 518.4px. |
| ≥1800px | Main pane plus `clamp(600px,28vw,720px)` rail; topbar stays 68px. At 2560px the rail is 716.8px. Conversation insets are 24px 28px; everything else keeps the 1500px values. |
| ≤1000px | One conversation column; traces open in a fixed panel up to 460px wide, above the measured presenter dock. |
| ≤600px | 60px topbar; full-width trace panel. Conversation scrolls as one region, with a sticky follow-up composer once a conversation exists. Hotel grids become one column. |

The composer, sent question and working content cap their measure at 72ch; sent questions also cap at 86% of their pane. Answer prose caps at 72ch and supporting paragraphs at 68ch. Desktop card and panel spacing uses the extracted 8–28px rhythm. The default opening panorama has a 260px minimum height, growing to 288px from 1500px; the portrait grows from 86px to 92px. Active desktop portraits compact to 48px, or 52px from 1500px.

**The Laptop Budget.** 1728×940 is the reference laptop viewport, and vertical space is the scarce resource there. At that size the trip card is 297px, the opening composer 189px, the transcript 259px and the trace scroll 605px. Any addition to the framing chrome has to be paid for out of the transcript or the evidence rail, so measure both before growing either.

Preparation uses a 1120px container, expanding to 1480px on wide displays. Hotel comparisons generally use three columns. Live retrieval at 1001–1399px uses stacked horizontal cards with a 30% photograph, 17px 20px body padding, 15px prose and 14px metadata; this prevents narrow hotel bodies. At 1728px and wider, hotel body text is 16px and metadata 14px.

## Elevation & Depth

Paper cards use tonal separation and fine borders without action shadows. Photography uses dark, translucent gradients for readable overlaid text. Native dialogs use `0 20px 80px rgba(37,27,21,.2)` with a dark backdrop; the tablet trace overlay uses `-10px 12px 40px rgba(37,27,21,.12)`. Neither shadow is a button treatment.

**The Photographic Depth Rule.** Use gradients to protect text over photography; keep ordinary paper cards flat and reserve ambient shadows for overlays.

Evidence enters over 340ms with `cubic-bezier(.16,1,.3,1)`, moving 7px upward while gaining opacity. The connected dot pulses over 2.4s. Reduced-motion preferences disable animation, transitions and smooth scrolling. Presentation pacing controls evidence disclosure; it does not represent service latency.

### Reasoning steps

While a run is live the transcript shows what the agent is actually doing, in the shape people now expect from a conversational assistant. Each semantic responsibility appears as a step the moment its first event arrives and stays on screen: a ruled row with a 22px mark, the responsibility name, the event's own one-line summary, and the official AWS marks of the services doing that step, inline at 18px. The active step carries an accent mark with a 1.5s pulse and accent-coloured title; resolved steps take a green check, a muted title and half-opacity service marks. Rows enter over 380ms on the house easing curve, 6px upward.

When the run finishes the whole stack collapses into one line — “6 of 6 semantic responsibilities resolved” — that expands on demand. The transcript keeps the narrative; the trace rail keeps the evidence.

**The Working State Is Not Display Type Rule.** Step titles take `--type-layer` and summaries `--type-support`. The narrative size belongs to the opening headline, never to a status line: a 38px “Reading the request” outshouts the headline above it and the answer below it.

**The Streaming Answer Rule.** Streamed text arrives in roughly word-sized reveals — 12 characters every 26ms — and patches the existing answer node instead of re-rendering the transcript, so selection, scroll position and the caret survive the stream. A 2px accent caret blinks on the final paragraph while the answer is pending and disappears the moment the run completes. The caret is a state indicator, not decoration: it must never appear on a finished or recorded answer.

## Shapes

Rounded photographic panels, paper cards and fields soften a ruled application structure. Major surfaces use 16px radii, hotel tiles 14px, portraits and the send control 12px, status/event containers 10px and follow-up chips 7px. The mode switch uses a 9px outer shape and 6px selected segment. Trace numbers remain circular. SVG controls use unfilled rounded strokes, usually 1.6px; the send icon uses 1.7px. Preserve photographs as cropped images, not decorative glyphs.

## Components

### Buttons

Flat, quiet and physically generous. Send is icon-only with an accessible name, a 52×48px target and 12px radius. Reveal cancellation uses a 10px radius, `--type-support` text, 46px minimum height and 11px 17px padding. Hover deepens burgundy. Keyboard focus uses a 2px accent outline offset 4px. Disabled buttons use .42 opacity and a not-allowed cursor. Stop uses dark ink.

### Composer and follow-up chips

The paper composer has a fine border, a 16px radius and an accent-tinted focus-within border. Its DM Sans textarea has a burgundy caret and a bounded reading measure. The opening desktop field grows with its three rows from a 58px minimum (64px from 1500px); the active field follows the compact sizes above. Follow-up chips use paper, a fine border, 7px corners and 7px 10px padding, with DM Sans 500 text at `--type-controls`.

### Navigation and playback

The Caslon wordmark anchors the topbar, followed by the section nav: Concierge, Data preparation, Architecture and Solution briefing, in DM Sans 500 at `--type-support`, with the current section on rose paper in burgundy. The topbar sits outside the workspace shell, so the nav persists on the preparation and briefing pages. Below 1000px the nav is hidden and the presenter dock carries the section links; on desktop the dock drops those duplicates and keeps Talk track and New. The main workspace retains its trace toggle and explicit mobile close action. A paper playback dock holds the segmented Presenter/Auto reveal switch, pause/resume, stepping, pace, replay, AgentCore Memory and Flight availability. The selected segment is paper on an inset stone group with burgundy text. Wide-display controls grow while keeping these actions grouped.

### Trip and hotel cards

The panoramic trip introduces the traveller and meeting, with the booked/cancelled strip separated on paper. Text over the photograph is protected twice: the shade gradient runs .62 at the top edge, falls to .14 by 30% and returns to .80 at the base, and the overlay links carry their own `rgba(24,19,15,.62)` pill so they stay legible over the brightest sky in the frame. A text shadow alone is not contrast. It compacts after sending. Hotel tiles use a clipped photograph and an explicitly padded body containing a regular Caslon title, readable DM Sans description, ruled facts, rankings and image disclosure. Lexical and semantic scores remain placeholders before retrieval. The itinerary keeps its complete total, venue arrival, cost lines and constraint status together; unmet constraints receive explanatory text rather than a success card.

### Solution briefing

A reading surface, not an operating one. It shares the preparation page's scroll shell, 1120px container and reading measure, and adds five components: a numbered pipeline (28px ruled circles beside a title and one muted paragraph), a two-column comparison of the operations the code calls and the behaviours its rules produce, a tabbed AgentCore Memory showcase, a two-column service-role grid pairing each official AWS mark with what that service actually does here, and the architecture diagram. Operation rows name real runtime calls. Behaviour rows name branches of the deterministic planner, and the boundary line states that the model is called twice and never chooses a tool.

The Memory showcase places the onboarding message, extracted strategy records and a cross-session answer beside the itinerary card that those preferences affect. The two panels stretch to one height; the tab panel fills the remaining space so the pair reads as a matched pair rather than a short card beside a tall one. Facts, Preferences, Session Summary and Episodic quote records returned by the deployed Memory, labelled as recorded on a date rather than live. Product price, schedule, walking time and stock remain attributed to Aurora, Neptune and versioned source policies.

An integration panel below the showcase answers the storage question directly: Aurora is not the backing store for AgentCore Memory. It shows the real sequence, AgentCore Memory → runtime precedence → Bedrock embedding → Aurora full-text/pgvector retrieval and SQL validation. It also distinguishes the explicit traveller declaration stored in Aurora from conversational preferences stored in Memory.

The diagram is authored SVG on the inset stone fill and reads in two explicit parts: how a request reaches the agent, then what the agent calls. Published and local paths occupy separate labelled rows and converge on one accent-tinted AgentCore Runtime node. Strands appears inside that runtime because it is an SDK, not a separately deployed service. The two S3 nodes are named by responsibility — site bucket and policy sources — so their repeated mark does not imply one ambiguous store. Double-ended connectors pair requests with their returned records or SSE stream; a small legend explains solid and dashed paths. Below 760px the diagram scrolls at its own scale rather than shrinking its 12px labels into illegibility.

**The Honest Mark Rule.** Official AWS icons appear only for the services Onward actually ships marks for. CloudFront, Lambda and the browser are drawn as plain labelled boxes, and the caption says so. An invented icon in an architecture diagram is a false claim about provenance.

### Retrieval choices

The preparation page's closing section is a decision framework, not a service catalogue. Each row names one retrieval approach — exact/relational, keyword, embeddings, vector search, hybrid fusion, graph traversal — with the question it answers, where it wins, **where it fails**, and what Onward actually does with it. The implementing service and its official AWS mark sit under the approach name, so one service legitimately appears in several rows and the repetition itself argues that a specialist store must earn its place.

**The Attribution Rule.** An approach names exactly one service, and that service must be the one performing that step. Embeddings are Bedrock; vector similarity over the stored embeddings is Aurora. Collapsing the two into one "vector" row misattributes the work and is the ambiguity this section exists to remove.

Rows are ruled, not carded: a 236px approach column beside a two-column definition list, collapsing to a single column below 600px. The failure line is the load-bearing content; never trim it to balance the row.

### Hotel comparison fold

During Disambiguation the three ranked hotel tiles enter the transcript as live evidence. When the plan arrives they do not vanish: the block folds over 720ms on a symmetric ease (grid rows to zero, opacity to zero), slower than the house entrance curve so the collapse itself is watchable, the reveal loop holds for that long, and the block re-renders as a one-line `<details>` summary, "Hybrid retrieval ranked 3 hotels · Pátio House selected", styled like the collapsed reasoning steps. The itinerary and the first answer tokens land only after the fold, so the audience sees hotels fold away, then the supported itinerary, then the prose. The summary reopens on click, so the comparison stays inspectable while the presenter explains the choice.

**The Evidence Folds, It Does Not Disappear Rule.** Intermediate evidence that the audience just watched arrive must leave by a visible transition into a place it can be reopened from, never by a re-render that drops it.

### Itinerary photography

The hotel photograph marks a **change** of hotel, not the presence of one. The first itinerary in a conversation gets the full clipped photograph; a later turn that keeps the same hotel drops to a single-column card with a 30px rounded thumbnail beside the title, because the news on that turn is the flight, not the room. When a follow-up genuinely moves the hotel — “Somewhere livelier” flipping hybrid retrieval from Pátio House to Forum Rooms — the photograph returns and lands as an event.

**The Imagery Marks Change Rule.** Repeating an image on every turn spends the one moment it should punctuate. If nothing about the subject changed, show its name, not its picture.

### Follow-ups

Five chips, each exercising a different responsibility and producing a visibly different outcome: re-rank on time, explain a rejected route, flip the semantic hotel match, force an honest no-match, override remembered preference for one trip. Chips are paper with a fine border and 7px corners. Never offer two follow-ups that land on the same answer by different words.

### Model control

The dock carries a **Model** select beside Pace, at `--type-controls`, populated from the deployed allowlist. It is presenter chrome, not a traveller-facing feature: it never grows, never takes accent colour, and changing it announces that the choice applies to the next question rather than re-running the current one.

### Six semantic components and evidence

Business context, Ontology, Disambiguation, Metrics, Relationships and Verified examples form a ruled list with numbered or checked circles. Collapsed rows name service contributions; expansion reveals the question, explanation, actual service roles and input/output evidence. The open row stays sticky within the trace scroll region. Event cards use warm inset fills and readable DM Sans titles and prose. Evidence inspection opens a native dialog with wrapped monospace records. The six entries describe semantic responsibilities; they are not six separate databases.

## Do's and Don'ts

### Do:

- Do retain warm paper, burgundy and the supplied Caslon Text/DM Sans role pairing.
- Do keep the opening traveller, booked route and request legible beside all six semantic component names.
- Do use the desktop audience size ramp and preserve bounded question and prose measures.
- Do show hotel descriptions, walking time, nightly price and actual lexical/semantic scores together.
- Do distinguish live execution, buffered presentation and recorded replay, and keep evidence attached to its answer.
- Do pair status colours with words or icons and retain keyboard focus and reduced-motion behavior.

### Don't:

- Don't add metallic fills to Send or Reveal cancellation.
- Don't use Caslon for the composer, sent requests, trace-event titles or operational labels.
- Don't substitute tiny metadata text for the explanation the audience needs to read.
- Don't imply a booking or live supplier feed, invent hotel scores before retrieval, or hide an unmet constraint behind success styling.
