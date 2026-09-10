"""Onward's tools, served to the agent through AgentCore Gateway as MCP tools.

One Lambda function, six tools, all over real AWS data. The gateway passes the tool arguments as
the event and the tool name in the client context. Every tool returns the evidence the concierge
shows in its trace rail: a layer number, a title, a one-line summary, the services involved and
the raw records with their AWS request ids. The runtime hands the model a compact view and keeps
the full evidence for the audience.
"""
import json
import re
import secrets
import string
from datetime import datetime, timezone

from planner import TripRequest, compute, traveller_context
from services import (BOOKING_QUERY, HOTEL_SEARCH, LEG_QUERY, MEMORY, OFFER_QUERY, PRICE_QUERY, S3, SETTINGS,
    TRANSFER_QUERY, WALK_QUERY, db, db_write, embed, graph)

ACTOR = 'alex-onward'
PREFERENCE_NAMESPACE = f'/onward/actors/{ACTOR}/preferences/'
ONBOARDING_SESSION = 'onward-onboarding-2026'
NAMES = ['Business context', 'Ontology', 'Disambiguation', 'Metrics', 'Relationships', 'Verified examples', 'Booking']


def now():
    return datetime.now(timezone.utc).isoformat()


def rid(response):
    return response.get('ResponseMetadata', {}).get('RequestId')


def request_from(args):
    fields = {key: value for key, value in args.items() if key in TripRequest.model_fields}
    return TripRequest(**fields)


def definitions():
    rows, request_id = db('SELECT id,definition,source_id FROM definitions ORDER BY id')
    return {row['id']: row['definition'] for row in rows}, request_id


def entities():
    return db('SELECT id,kind,name,aliases,payload FROM entities ORDER BY kind,id')


def airport(rows, value):
    for entity in rows:
        names = [str(name).casefold() for name in [entity['id'], entity['name'], *entity['aliases']]]
        if entity['kind'] == 'airport' and str(value).casefold() in names:
            return entity['id']
    return None


def remembered_preferences(memory_enabled):
    """Long-term extracted preferences, or the stored onboarding conversation while extraction is pending."""
    if not memory_enabled:
        return [], 'disabled', None
    result = MEMORY.retrieve_memory_records(memoryId=SETTINGS['memoryId'], namespace=PREFERENCE_NAMESPACE,
        searchCriteria={'searchQuery': 'work travel preferences: quiet hotel, walking to meetings, aisle or window seats', 'topK': 8})
    memories = [{'id': r['memoryRecordId'], 'text': r.get('content', {}).get('text', ''), 'source': 'extracted preference'}
                for r in result.get('memoryRecordSummaries', [])]
    source, request_id = 'long-term extracted preferences', rid(result)
    if not memories:
        result = MEMORY.list_events(memoryId=SETTINGS['memoryId'], actorId=ACTOR, sessionId=ONBOARDING_SESSION,
            includePayloads=True, maxResults=10)
        memories = [{'id': e['eventId'], 'text': p['conversational']['content']['text'], 'source': 'stored onboarding conversation'}
                    for e in result.get('events', []) for p in e.get('payload', [])
                    if p.get('conversational', {}).get('role') == 'USER']
        source, request_id = 'short-term onboarding; extraction not available yet', rid(result)
    for record in memories:
        if record['text'].startswith('{'):
            structured = json.loads(record['text'])
            record['text'] = structured.get('preference', record['text'])
    return memories, source, request_id


def hotel_search(args):
    """Shared by search_hotels and select_itinerary so both see the same ranking."""
    request = request_from(args)
    defs, definition_id = definitions()
    rows, entity_id = entities()
    traveller = next(e for e in rows if e['id'] == ACTOR)
    memories, source, memory_id = remembered_preferences(request.memoryEnabled)
    personal = traveller_context(request, traveller['payload'], memories, source)
    vocabulary = defs['hotel-query-vocabulary']
    if request.hotelPreference in ('quiet', 'lively'):
        intent, prefer_hotel = vocabulary[request.hotelPreference], True
    elif request.hotelPreference == 'memory' and memories and request.memoryEnabled:
        preferences = ' '.join(m['text'] for m in memories)
        match = next((term for term in vocabulary if re.search(r'\b' + term + r'\b', preferences, re.I)), None)
        intent, prefer_hotel = (vocabulary[match] if match else 'Hotel for a work trip. ' + preferences), True
    else:
        intent, prefer_hotel = 'Hotel near the meeting venue in Lisbon', False
    vector, embed_id = embed(intent)
    lexical = ' OR '.join(re.findall(r'[A-Za-z]+', intent)[:30])
    hotels, hotel_id = db(HOTEL_SEARCH, {'embedding': vector, 'lexical': lexical})
    return {'request': request, 'definitions': defs, 'entities': rows, 'hotels': hotels, 'personal': personal,
            'memories': memories, 'memorySource': source, 'intent': intent, 'lexical': lexical, 'preferHotel': prefer_hotel,
            'requestIds': {'definitions': definition_id, 'entities': entity_id, 'memory': memory_id,
                           'embedding': embed_id, 'hotels': hotel_id}}


def journey(request, venue_id):
    legs, leg_id = graph(LEG_QUERY)
    transfers, transfer_id = graph(TRANSFER_QUERY, {'airport': request.destination, 'venue': venue_id})
    walks, walk_id = graph(WALK_QUERY, {'venue': venue_id})
    return legs, transfers[0] if transfers else None, walks, [leg_id, transfer_id, walk_id]


def policy_documents():
    documents, document_id = db("SELECT id,title,source_uri,version_id FROM documents WHERE id IN ('arrival-policy-v1','connection-policy-v1') ORDER BY id")
    sources = []
    for document in documents:
        key = document['source_uri'].split('/', 3)[3]
        obj = S3.get_object(Bucket=SETTINGS['bucket'], Key=key, VersionId=document['version_id'])
        with obj['Body'] as body:
            sources.append({**document, 'document': json.loads(body.read()), 'requestId': rid(obj)})
    return sources, document_id


def compact_plan(plan):
    selected = plan['selected']
    choice = None
    if selected:
        route, hotel, price = selected['route'], selected['hotel'], selected['price']
        choice = {'flight': route['offer']['id'], 'carrier': route['offer']['carrier'], 'departure': route['legs'][0]['depart'],
                  'landing': route['landing'], 'venueArrival': route['venueArrival'], 'hotel': hotel['name'], 'hotelId': hotel['id'],
                  'hotelDescription': hotel['description'], 'seat': selected['seat'], 'hotelWalkMinutes': hotel['walk_minutes'],
                  'totalPence': selected['totalPence'], 'seatsAvailable': route['offer']['seats'],
                  'seatSelectionIncluded': route['offer'].get('seat_selection_included') is True,
                  'arrivesBeforeDeadline': True,
                  'priceLinesPence': {k: price[k] for k in ['fare_pence', 'bags_pence', 'hotel_pence', 'transfer_pence']}}
    return {'selected': choice, 'request': plan['request'], 'minimumFeasiblePence': plan['minimumFeasiblePence'],
            'preferenceApplied': plan['preferenceApplied'], 'travellerContext': plan.get('travellerContext'),
            'rejections': [{'flight': r['offer']['id'], 'reasons': r['reasons']} for r in plan['routes'] if r['reasons']],
            'sources': {str(i + 1): title for i, title in enumerate(NAMES[:6])}}


def resolve_entities(args):
    rows, request_id = entities()
    origin, destination = airport(rows, args['origin']), airport(rows, args['destination'])
    trip = next(e for e in rows if e['kind'] == 'trip')
    venue = next(e for e in rows if e['kind'] == 'venue')
    traveller = next(e for e in rows if e['id'] == ACTOR)
    supported = origin == 'LHR' and destination == 'LIS' and args['travelDate'] == '2026-09-15' and int(args['nights']) == 1
    return {'layer': 1, 'title': 'Entities connected', 'service': 'Aurora PostgreSQL',
            'summary': f'Alex · {origin or args["origin"]} → {destination or args["destination"]} · {venue["name"]}',
            'origin': origin, 'destination': destination, 'travellerId': traveller['id'], 'tripId': trip['id'],
            'venueId': venue['id'], 'venueName': venue['name'], 'supported': supported,
            'evidence': {'sql': 'SELECT id,kind,name,aliases,payload FROM entities ORDER BY kind,id',
                         'entities': [{k: e[k] for k in ('id', 'kind', 'name', 'aliases')} for e in rows], 'requestId': request_id}}


def search_hotels(args):
    search = hotel_search(args)
    request = search['request']
    return {'layer': 2, 'title': 'Context makes the search specific', 'service': 'Aurora hybrid retrieval',
            'summary': f'{request.travelDate} · ≤{request.maxWalkMinutes} min walk · '
                       f'{"personalised hotel ranking" if search["preferHotel"] else "no remembered hotel ranking"}',
            'hotels': [{k: h[k] for k in ('id', 'name', 'quiet', 'walk_minutes', 'night_pence', 'rooms', 'rrf_score')} for h in search['hotels']],
            'travellerContext': search['personal'], 'memorySource': search['memorySource'], 'preferenceApplied': search['preferHotel'],
            'evidence': {'travellerContext': search['personal'], 'memorySource': search['memorySource'], 'memoryRecords': search['memories'],
                         'memoryRequestId': search['requestIds']['memory'], 'travellerProfileRequestId': search['requestIds']['entities'],
                         'namespace': PREFERENCE_NAMESPACE, 'embeddingDimensions': 256, 'sql': HOTEL_SEARCH,
                         'searchText': search['intent'], 'lexicalQuery': search['lexical'],
                         'embeddingRequestId': search['requestIds']['embedding'], 'queryRequestId': search['requestIds']['hotels'],
                         'hotels': search['hotels'],
                         'ranking': 'Reciprocal rank fusion of cosine similarity and full-text relevance; hard constraints applied later.'}}


def price_bundles(args):
    defs, definition_id = definitions()
    price_args = {'bags': int(args['bags']), 'nights': int(args['nights']), 'transfer': defs['transfer']['pricePence']}
    prices, price_id = db(PRICE_QUERY, price_args)
    offers, offer_id = db(OFFER_QUERY)
    return {'layer': 3, 'title': 'Every cost is included', 'service': 'Aurora PostgreSQL',
            'summary': f'{len(prices)} complete bundles priced by Aurora SQL.',
            'bundles': [{k: p[k] for k in ('offer_id', 'hotel_id', 'total_pence')} for p in prices],
            'definition': defs['complete-price'], 'excludes': 'Return flight and travel to Heathrow',
            'evidence': {'definition': defs['complete-price'], 'sql': PRICE_QUERY, 'parameters': price_args, 'bundles': prices,
                         'offers': offers, 'queryRequestId': price_id, 'offerRequestId': offer_id, 'definitionRequestId': definition_id,
                         'excludes': 'Return flight and travel to Heathrow'}}


def validate_journeys(args):
    request = request_from(args)
    defs, _ = definitions()
    rows, _ = entities()
    venue = next(e for e in rows if e['kind'] == 'venue')
    offers, offer_id = db(OFFER_QUERY)
    legs, transfer, walks, graph_ids = journey(request, venue['id'])
    sources, document_id = policy_documents()
    plan = compute(request, offers, [], [], legs, transfer, walks, defs['trip-rules'])
    routes = [{'offer': r['offer']['id'], 'carrier': r['offer']['carrier'], 'landing': r['landing'], 'venueArrival': r['venueArrival'],
               'connections': r['connections'], 'reasons': r['reasons']} for r in plan['routes']]
    rejected = '; '.join(r['offer'] + ': ' + r['reasons'][0] for r in routes if r['reasons'])
    return {'layer': 4, 'title': 'Impossible routes rejected', 'service': 'Application rules over Neptune paths',
            'summary': rejected or 'All returned routes meet the route constraints.',
            'routes': routes, 'rules': defs['trip-rules'],
            'evidence': {'queries': [LEG_QUERY, TRANSFER_QUERY, WALK_QUERY], 'graph': SETTINGS['graphId'],
                         'parameters': {'airport': request.destination, 'venue': venue['id']},
                         'arrivalAllowanceMinutes': defs['trip-rules']['arrivalAllowanceMinutes'],
                         'minimumConnectionMinutes': defs['trip-rules']['minimumConnectionMinutes'],
                         'paths': legs, 'transfer': transfer, 'walks': walks, 'sources': sources, 'routes': routes,
                         'requestIds': [*graph_ids, document_id, offer_id]}}


def select_itinerary(args):
    search = hotel_search(args)
    request, defs = search['request'], search['definitions']
    venue = next(e for e in search['entities'] if e['kind'] == 'venue')
    price_args = {'bags': request.bags, 'nights': request.nights, 'transfer': defs['transfer']['pricePence']}
    prices, check_id = db(PRICE_QUERY, price_args)
    offers, offer_id = db(OFFER_QUERY)
    for offer in offers:
        checked = next(p for p in prices if p['offer_id'] == offer['id'])
        offer.update({key: checked[key] for key in ('seats', 'aisle_seats', 'window_seats', 'seat_selection_included', 'seat_source_id')})
    legs, transfer, walks, graph_ids = journey(request, venue['id'])
    if transfer and transfer['price_pence'] != price_args['transfer']:
        raise ValueError('The transfer cost differs between the graph and the price contract; refresh the source data.')
    plan = compute(request, offers, search['hotels'], prices, legs, transfer, walks, defs['trip-rules'],
                   search['preferHotel'], search['personal']['seatPreference']['value'])
    plan['travellerContext'] = search['personal']
    plan['memory'] = {'enabled': request.memoryEnabled, 'source': search['memorySource'], 'records': search['memories']}
    plan['checkedAt'] = now()
    compact = compact_plan(plan)
    selected = plan['selected']
    summary = (f'{selected["route"]["offer"]["id"]} + {selected["hotel"]["name"]}: £{selected["totalPence"] / 100:g} complete.'
               if selected else 'No complete bundle satisfies the current constraints. Nothing was relaxed.')
    return {'layer': 5, 'title': 'The answer is grounded', 'service': 'Aurora + deterministic constraint checks',
            'summary': summary, 'selected': compact['selected'], 'rejections': compact['rejections'],
            'minimumFeasiblePence': plan['minimumFeasiblePence'], 'eligibleCount': plan['eligibleCount'],
            'travellerContext': search['personal'], 'plan': plan,
            'evidence': {**compact, 'sql': PRICE_QUERY, 'parameters': price_args, 'queryRequestId': check_id,
                         'offerRequestId': offer_id, 'graphRequestIds': graph_ids, 'checkedAt': plan['checkedAt']}}


def book_trip(args):
    """Reserve one seat and one room atomically. The gateway policy has already permitted the call."""
    defs, _ = definitions()
    prices, price_id = db(PRICE_QUERY, {'bags': int(args['bags']), 'nights': int(args['nights']), 'transfer': defs['transfer']['pricePence']})
    bundle = next((p for p in prices if p['offer_id'] == args['offerId'] and p['hotel_id'] == args['hotelId']), None)
    if bundle is None:
        raise ValueError(f'No priced bundle for {args["offerId"]} and {args["hotelId"]}.')
    if int(bundle['total_pence']) != int(args['totalPence']):
        raise ValueError(f'The complete price is now £{int(bundle["total_pence"]) / 100:g}; the itinerary must be re-selected before booking.')
    reference = 'ONW-' + ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    rows, request_id = db_write(BOOKING_QUERY, {'offer': args['offerId'], 'hotel': args['hotelId'], 'booking': reference,
        'session': args['sessionId'], 'traveller': ACTOR, 'total': int(args['totalPence']), 'policy': 'permit'})
    if not rows:
        raise ValueError('No seat or room is left in the current Aurora inventory; nothing was booked.')
    booking = rows[0]
    return {'layer': 6, 'title': 'Booked under policy', 'service': 'AgentCore Gateway policy · Aurora',
            'summary': f'{reference}: {args["offerId"]} + {args["hotelId"]}, £{int(args["totalPence"]) / 100:g}, policy permitted.',
            'booking': {'reference': reference, 'offerId': booking['offer_id'], 'hotelId': booking['hotel_id'],
                        'totalPence': booking['total_pence'], 'createdAt': booking['created_at'],
                        'seatsLeft': booking['seats_left'], 'roomsLeft': booking['rooms_left']},
            'evidence': {'sql': BOOKING_QUERY, 'booking': booking, 'policyDecision': 'permit',
                         'priceCheckRequestId': price_id, 'bookingRequestId': request_id, 'fictional': True}}


TOOLS = {'resolve_entities': resolve_entities, 'search_hotels': search_hotels, 'price_bundles': price_bundles,
         'validate_journeys': validate_journeys, 'select_itinerary': select_itinerary, 'book_trip': book_trip}


def handler(event, context):
    custom = getattr(getattr(context, 'client_context', None), 'custom', None) or {}
    tool = custom.get('bedrockAgentCoreToolName', '')
    name = tool.split('___')[-1]
    if name not in TOOLS:
        raise ValueError(f'Unknown Onward tool: {tool or "(none)"}')
    result = TOOLS[name](event or {})
    print(json.dumps({'onward_tool': name, 'layer': result['layer'], 'summary': result['summary'],
                      'gatewayRequestId': custom.get('bedrockAgentCoreAwsRequestId')}, ensure_ascii=False), flush=True)
    return result
