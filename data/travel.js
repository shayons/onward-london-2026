// Author-created fictional travel fixtures. Kept in sync with travel.json.
export const travelData = {
  "version": "onward-demo-v1",
  "snapshot": "2026-09-14T17:00:00Z",
  "demoClock": "14 September 2026, 18:00 in London",
  "travelDate": "2026-09-15",
  "hotelCheckout": "2026-09-16",
  "currency": "GBP",
  "traveller": {
    "id": "alex-morgan",
    "name": "Alex Morgan",
    "actorId": "alex-onward",
    "description": "A London-based designer travelling for a client meeting",
    "declaredRequirements": {
      "allergies": [
        "shellfish"
      ],
      "sourceId": "alex-declaration-v1",
      "source": "Fictional traveller declaration",
      "cateringStatus": "not-supplied"
    }
  },
  "trip": {
    "id": "trip-lisbon-01",
    "origin": "LHR",
    "destination": "LIS",
    "venueId": "venue-ribeira",
    "deadline": "2026-09-15T14:00:00+01:00",
    "budgetPence": 65000,
    "hotelNights": 1,
    "bags": 1,
    "maxWalkMinutes": 20,
    "scope": "Outbound travel from Heathrow, one checked bag, one hotel night and one airport-to-meeting transfer. No return flight or onward return transfer."
  },
  "original": {
    "id": "AX201",
    "carrier": "Aster Air",
    "depart": "07:45",
    "arrive": "10:35",
    "route": "LHR → LIS"
  },
  "airports": [
    {
      "id": "LHR",
      "city": "London",
      "name": "Heathrow",
      "timezone": "Europe/London"
    },
    {
      "id": "LIS",
      "city": "Lisbon",
      "name": "Lisbon Airport",
      "timezone": "Europe/Lisbon"
    },
    {
      "id": "MAD",
      "city": "Madrid",
      "name": "Madrid Airport",
      "timezone": "Europe/Madrid"
    }
  ],
  "venue": {
    "id": "venue-ribeira",
    "name": "Ribeira Design Studio",
    "city": "Lisbon",
    "timezone": "Europe/Lisbon",
    "description": "Fictional meeting venue"
  },
  "offers": [
    {
      "id": "AX218",
      "carrier": "Aster Air",
      "description": "Morning nonstop to Lisbon",
      "farePence": 25500,
      "bagPence": 3500,
      "seats": 4,
      "source": "offer-AX218-v1",
      "legs": [
        {
          "from": "LHR",
          "to": "LIS",
          "depart": "2026-09-15T08:20:00+01:00",
          "arrive": "2026-09-15T11:05:00+01:00"
        }
      ],
      "seatOptions": {
        "aisle": 1,
        "window": 2,
        "includedInFare": true,
        "sourceId": "seat-options-v1",
        "scope": "Fictional available options across every leg; no seat assigned"
      }
    },
    {
      "id": "AX102",
      "carrier": "Aster Air",
      "description": "Early nonstop to Lisbon",
      "farePence": 36500,
      "bagPence": 2500,
      "seats": 2,
      "source": "offer-AX102-v1",
      "legs": [
        {
          "from": "LHR",
          "to": "LIS",
          "depart": "2026-09-15T06:45:00+01:00",
          "arrive": "2026-09-15T09:35:00+01:00"
        }
      ],
      "seatOptions": {
        "aisle": 0,
        "window": 1,
        "includedInFare": true,
        "sourceId": "seat-options-v1",
        "scope": "Fictional available options across every leg; no seat assigned"
      }
    },
    {
      "id": "ME330",
      "carrier": "Meridian Europe",
      "description": "Mid-morning nonstop to Lisbon",
      "farePence": 32900,
      "bagPence": 3500,
      "seats": 3,
      "source": "offer-ME330-v1",
      "legs": [
        {
          "from": "LHR",
          "to": "LIS",
          "depart": "2026-09-15T09:05:00+01:00",
          "arrive": "2026-09-15T11:50:00+01:00"
        }
      ],
      "seatOptions": {
        "aisle": 1,
        "window": 0,
        "includedInFare": true,
        "sourceId": "seat-options-v1",
        "scope": "Fictional available options across every leg; no seat assigned"
      }
    },
    {
      "id": "AX404",
      "carrier": "Aster Air",
      "description": "Low-fare nonstop to Lisbon",
      "farePence": 11900,
      "bagPence": 4500,
      "seats": 7,
      "source": "offer-AX404-v1",
      "legs": [
        {
          "from": "LHR",
          "to": "LIS",
          "depart": "2026-09-15T10:30:00+01:00",
          "arrive": "2026-09-15T13:20:00+01:00"
        }
      ],
      "seatOptions": {
        "aisle": 2,
        "window": 2,
        "includedInFare": true,
        "sourceId": "seat-options-v1",
        "scope": "Fictional available options across every leg; no seat assigned"
      }
    },
    {
      "id": "ME615",
      "carrier": "Meridian Europe",
      "description": "Lisbon via Madrid",
      "farePence": 18900,
      "bagPence": 3500,
      "seats": 5,
      "source": "offer-ME615-v1",
      "legs": [
        {
          "from": "LHR",
          "to": "MAD",
          "depart": "2026-09-15T06:30:00+01:00",
          "arrive": "2026-09-15T10:00:00+02:00"
        },
        {
          "from": "MAD",
          "to": "LIS",
          "depart": "2026-09-15T10:45:00+02:00",
          "arrive": "2026-09-15T11:15:00+01:00"
        }
      ],
      "seatOptions": {
        "aisle": 1,
        "window": 1,
        "includedInFare": true,
        "sourceId": "seat-options-v1",
        "scope": "Fictional available options across every leg; no seat assigned"
      }
    }
  ],
  "hotels": [
    {
      "id": "patio-house",
      "name": "Pátio House",
      "description": "Courtyard-facing rooms on a residential lane; a calm place to finish the day.",
      "quiet": true,
      "walkMinutes": 12,
      "nightPence": 16500,
      "rooms": 3,
      "source": "hotel-patio-v1"
    },
    {
      "id": "forum-rooms",
      "name": "Forum Rooms",
      "description": "A lively central stay above an evening bar, close to the meeting venue.",
      "quiet": false,
      "walkMinutes": 8,
      "nightPence": 14500,
      "rooms": 6,
      "source": "hotel-forum-v1"
    },
    {
      "id": "coast-retreat",
      "name": "Coast Retreat",
      "description": "Secluded, peaceful rooms beyond the city centre.",
      "quiet": true,
      "walkMinutes": 55,
      "nightPence": 12500,
      "rooms": 4,
      "source": "hotel-coast-v1"
    }
  ],
  "transfer": {
    "id": "transfer-lis-ribeira",
    "from": "LIS",
    "to": "venue-ribeira",
    "mode": "Pre-arranged car",
    "minutes": 35,
    "pricePence": 3500,
    "available": true,
    "source": "transfer-LIS-RIB-v1"
  },
  "rules": {
    "arrivalAllowanceMinutes": 45,
    "minimumConnectionMinutes": 60,
    "bagKg": 23,
    "priceBasis": "Supplier prices include applicable taxes; baggage and airport transfer are added separately.",
    "budgetOperator": "<",
    "nearby": "At most 20 minutes on foot, under this demo trip policy.",
    "deadlineMeaning": "Reach the meeting venue by 14:00 Europe/Lisbon.",
    "precedence": "Hard constraints first; current priority overrides remembered preferences."
  },
  "memory": {
    "actorId": "alex-onward",
    "quote": "When I travel for work, I prefer an aisle seat. I like a quiet hotel and I would rather walk to the meeting. I normally check one bag.",
    "preferences": [
      "aisle seat",
      "quiet hotel",
      "walkable to the venue"
    ],
    "source": "alex-previous-session-01"
  },
  "sources": [
    {
      "id": "trip-policy-v1",
      "title": "Demo trip policy",
      "text": "The budget covers an outbound fare, one 23kg checked bag, one tax-inclusive hotel night and the transfer from the destination airport to the meeting. Nearby means no more than 20 minutes on foot."
    },
    {
      "id": "arrival-policy-v1",
      "title": "Demo arrival allowance",
      "text": "Allow 45 minutes after scheduled arrival for disembarkation and checked baggage. Add the recorded ground transfer duration to obtain the arrival time at the meeting."
    },
    {
      "id": "connection-policy-v1",
      "title": "Demo connection rule",
      "text": "Every connection must allow at least 60 elapsed minutes. Compare timezone-aware timestamps; a valid-looking local clock time is insufficient."
    },
    {
      "id": "reviewed-example-v1",
      "title": "Authored complete-trip query pattern",
      "text": "Resolve the traveller and venue. Retrieve candidates. Expand the complete journey. Validate connections and door-to-venue arrival. Check complete costs and current availability. Rank only eligible bundles."
    }
  ],
  "rawExamples": [
    {
      "source": "Supplier offer row",
      "raw": "AX218 · LHR/LIS · 255 GBP · BAG23 +35",
      "prepared": "Stable offer and airport IDs; tax-inclusive fare in pence; checked-bag fee as a separate line."
    },
    {
      "source": "Hotel description",
      "raw": "Courtyard-facing rooms on a residential lane",
      "prepared": "Source-linked text for hybrid retrieval; “quiet” is a semantic preference, not an availability claim."
    },
    {
      "source": "Airport and transfer policy",
      "raw": "45 min arrival allowance + 35 min ground transfer",
      "prepared": "Versioned rules and graph edges; meeting arrival = landing + allowance + transfer."
    },
    {
      "source": "Earlier conversation",
      "raw": "A quiet hotel, close enough to walk",
      "prepared": "Preference records scoped to actor alex-onward; current trip constraints take precedence."
    },
    {
      "source": "Traveller declaration",
      "raw": "I have a shellfish allergy",
      "prepared": "A structured declaration in Aurora, separate from preference ranking. Catering evidence is absent; carrier confirmation is required."
    },
    {
      "source": "Seat options",
      "raw": "AX218: 1 aisle option; selection included",
      "prepared": "Current Aurora seat counts are checked against the remembered or explicitly requested seat preference. Nothing is assigned."
    }
  ]
};
