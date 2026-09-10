export const LAYERS = [
  "business_context",
  "ontology",
  "disambiguation",
  "metrics",
  "relationships",
  "verified_examples",
] as const;

export type LayerId = (typeof LAYERS)[number];

export type RankBy = "preference" | "cost" | "arrival";

export type RunMode = "live" | "replay";

export type PaceMode = "live" | "presenter";

export interface Entity {
  id: string;
  type: "person" | "airport" | "city" | "venue" | "trip" | "hotel" | "airline" | "offer";
  name: string;
  aliases: string[];
  attrs: Record<string, string | number | boolean>;
}

export interface FlightLeg {
  id: string;
  offerId: string;
  flightNumber: string;
  airlineId: string;
  from: string;
  to: string;
  departIso: string;
  arriveIso: string;
  sequence: number;
}

export interface Offer {
  id: string;
  flightNumber: string;
  airlineId: string;
  origin: string;
  destination: string;
  farePence: number;
  bagPence: number;
  seats: number;
  kind: "direct" | "connecting";
  notes: string;
}

export interface Hotel {
  id: string;
  name: string;
  walkMinutes: number;
  nightPence: number;
  rooms: number;
  quiet: boolean;
  description: string;
  image: string;
  lexical: number;
  semantic: number;
}

export interface Transfer {
  id: string;
  from: string;
  to: string;
  minutes: number;
  pence: number;
  mode: string;
}

export interface PolicyDoc {
  id: string;
  title: string;
  version: string;
  uri: string;
  versionId: string;
  body: string;
}

export interface MemoryTurn {
  role: "assistant" | "user";
  text: string;
  at: string;
}

export interface InventoryOverride {
  offerSeats?: Record<string, number>;
  hotelRooms?: Record<string, number>;
}

export interface TripContract {
  travellerId: string;
  originAirport: string;
  destinationCity: string;
  destinationAirport: string;
  venueId: string;
  travelDate: string;
  arriveByIso: string;
  hotelNights: number;
  checkIn: string;
  checkOut: string;
  nearbyWalkMinutes: number;
  budgetPence: number;
  bagsChecked: number;
  rankBy: RankBy;
  costScope: string[];
}

export interface CostLines {
  farePence: number;
  bagPence: number;
  hotelPence: number;
  transferPence: number;
  completePence: number;
}

export interface Rejection {
  code:
    | "late_arrival"
    | "short_connection"
    | "walk_too_far"
    | "over_budget"
    | "no_seats"
    | "no_rooms"
    | "unsupported";
  subject: string;
  detail: string;
  evidence: Record<string, string | number | boolean>;
}

export interface Bundle {
  id: string;
  offerId: string;
  hotelId: string;
  transferId: string;
  legs: FlightLeg[];
  cost: CostLines;
  landIso: string;
  venueArrivalIso: string;
  connectionMinutes: number | null;
  walkMinutes: number;
  quiet: boolean;
  eligible: boolean;
  rejections: Rejection[];
}

export interface Itinerary {
  bundle: Bundle;
  why: string[];
  rejected: Rejection[];
  sources: { label: string; ref: string }[];
  memoryUsed: boolean;
  memorySource: "onboarding_conversation" | "none";
}

export interface NoMatch {
  reasons: string[];
  rejected: Rejection[];
  cheapestEligiblePence: number | null;
}

export type TraceEvent =
  | {
      type: "run_started";
      delayMs: number;
      requestId: string;
      clock: string;
      mode: RunMode;
      text: string;
    }
  | {
      type: "layer_started";
      delayMs: number;
      layer: LayerId;
      question: string;
    }
  | {
      type: "input";
      delayMs: number;
      layer: LayerId;
      label: string;
      payload: unknown;
    }
  | {
      type: "mapping";
      delayMs: number;
      layer: LayerId;
      label: string;
      payload: unknown;
    }
  | {
      type: "tool_request";
      delayMs: number;
      layer: LayerId;
      service: string;
      name: string;
      arguments: unknown;
      requestId: string;
    }
  | {
      type: "tool_result";
      delayMs: number;
      layer: LayerId;
      service: string;
      durationMs: number;
      records: unknown;
      requestId: string;
    }
  | {
      type: "evidence";
      delayMs: number;
      layer: LayerId;
      summary: string;
      payload: unknown;
    }
  | { type: "layer_complete"; delayMs: number; layer: LayerId }
  | { type: "itinerary"; delayMs: number; itinerary: Itinerary }
  | { type: "no_match"; delayMs: number; noMatch: NoMatch }
  | { type: "unsupported"; delayMs: number; detail: string }
  | { type: "assistant_message"; delayMs: number; text: string }
  | { type: "run_complete"; delayMs: number }
  | { type: "run_failed"; delayMs: number; error: string };

export interface EngineInput {
  text: string;
  memoryEnabled: boolean;
  inventory?: InventoryOverride;
  previous?: TripContract | null;
  mode?: RunMode;
}

export interface EngineResult {
  requestId: string;
  contract: TripContract | null;
  events: TraceEvent[];
  itinerary: Itinerary | null;
  noMatch: NoMatch | null;
  unsupported: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  at: number;
  runId?: string;
  kind?: "disruption" | "recorded" | "stock" | "stopped" | "scenario";
  itinerary?: Itinerary;
  noMatch?: NoMatch;
}
