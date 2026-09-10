# Onward design

White, full-screen concierge workspace. Conversation on the left, semantic trace on the right. Burgundy is the only accent.

## Identity

- **Wordmark:** Libre Caslon Text, sentence case, “Onward”
- **Body:** DM Sans, 400/500, optical sizing
- **Accent:** `#7A2E3A` on ivory `#F7F4EF` and paper `#FFFC F7`
- **Ink:** `#1C1917`
- **No second accent.** Status greens and ambers are badges only.

## Layout

- Desktop: `h-dvh`, no page scroll. Trip strip, conversation, composer in the main column. Trace pane 26rem.
- Mobile: conversation first. Trace is a dedicated full-screen panel. Presenter dock wraps.
- Composer is large and sticky to the main column.
- Nested radii: pane `16px`, inner cards `12px`, chips `9999px`.

## Motion

- Event reveal: 150–250ms opacity + 8px translate.
- Layer pulse: 1.4s opacity on the active burgundy dot.
- Respect `prefers-reduced-motion`.
- Pausing the display never pauses computation — the buffer already exists.

## Disclosures

- Fixed clock and fictional inventory sit in the header, always.
- Destination and portrait images carry an AI-generated caption.
- Replay is labelled “Recorded run”.
- Memory retrieval is labelled as the saved onboarding conversation.

## Do not

- Fake live AWS request IDs.
- Reveal the itinerary before the six layers have returned evidence in a stepped presentation.
- Use purple, neon, glassmorphism, or emoji in chrome.
