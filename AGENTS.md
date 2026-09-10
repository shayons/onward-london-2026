# Onward project instructions

This separate travel demo lives beside Counter. Never write to ../data-ai-day-london-cafe-2026.
Preserve PRODUCT.md and the user's talk: data preparation, shared meaning and source-backed retrieval, not merely a travel chatbot.
Use British spelling, pounds, explicit tax/baggage/transfers and one hotel night. All offers and people are fictional fixtures. AWS execution is live; supplier inventory is seeded demo data. Never claim live bookings, supplier feeds or expose generated internal reasoning.
Keep the six semantic components and presenter controls. Memory is user context, never the authority for fares or schedules. Application rules establish feasible transfers/connections over source data. Neptune holds journey relationships; application rules validate their timing.
Local web entrypoint: npm start, localhost:4318; AWS calls run server-side. Syntax and meaningful engine/browser checks should cover deadlines, totals, availability and playback cancellation. The user has explicitly authorised connecting and deploying the AWS services for Onward. Reuse meridian-demo with an isolated Onward database. Never alter Counter or Meridian application files/data.
