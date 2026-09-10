"""Deterministic checks over current Aurora prices and Neptune journey paths."""
from datetime import datetime, timedelta
import re

from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


class TripRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    action: Literal['plan', 'remember', 'clarify', 'book'] = 'plan'
    origin: str = Field(default='LHR', max_length=80)
    destination: str = Field(default='LIS', max_length=80)
    travelDate: str = '2026-09-15'
    deadline: str = '14:00'
    budgetPence: int = Field(default=65000, gt=0, le=2000000,
        description='The exact stated budget amount in GBP pence, used as an exclusive upper bound. Under £450 means 45000, never 44999; the application applies the strict less-than comparison.')
    bags: int = Field(default=1, ge=0, le=3)
    nights: int = Field(default=1, ge=1, le=7)
    maxWalkMinutes: int = Field(default=20, ge=1, le=120)
    priority: Literal['balanced', 'earliest', 'cheapest'] = 'balanced'
    hotelPreference: Literal['memory', 'quiet', 'lively', 'none'] = 'memory'
    seatPreference: Literal['memory', 'aisle', 'window', 'none'] = 'memory'
    allergies: list[str] = Field(default_factory=list, max_length=8,
        description='Only allergy declarations explicitly made in this conversation; never infer an allergy from a food preference.')
    memoryEnabled: bool = True
    message: str = Field(default='', max_length=500)


def time_at(stamp):
    return datetime.fromisoformat(stamp).strftime('%H:%M')


def traveller_context(request, profile, memories, memory_source):
    seat = {'value': None, 'source': 'No seat preference applied', 'recordIds': []}
    if request.seatPreference in ('aisle', 'window'):
        seat.update(value=request.seatPreference, source='Current conversation · AgentCore short-term memory')
    elif request.seatPreference == 'memory' and request.memoryEnabled:
        choices = {}
        for record in memories:
            text = record['text'].lower()
            # Use an affirmative preference, not a bare keyword in an unrelated or negative memory.
            if re.search(r'\b(?:not|never|avoid|dislike|dislikes)\b', text):
                continue
            for value in ('aisle', 'window'):
                if re.search(r'\bprefers?\s+(?:an?\s+)?' + value + r'\s+seats?\b', text):
                    choices.setdefault(value, []).append(record['id'])
        if len(choices) == 1:
            value = next(iter(choices))
            seat.update(value=value, source='AgentCore Memory · ' + memory_source, recordIds=choices[value])
        elif choices:
            seat['source'] = 'Conflicting remembered seat preferences · ask Alex'
    declaration = profile.get('declaredRequirements', {})
    allergies = [{'name': name, 'source': 'Aurora traveller declaration', 'sourceId': declaration.get('sourceId')}
        for name in declaration.get('allergies', [])]
    known = {item['name'].casefold() for item in allergies}
    for name in request.allergies:
        name = name.strip()[:80]
        if name and name.casefold() not in known:
            allergies.append({'name': name, 'source': 'Current conversation · explicit declaration'})
            known.add(name.casefold())
    return {'seatPreference': seat, 'allergies': allergies,
        'catering': {'status': 'unverified', 'message': 'Catering and allergen data are not supplied. Confirm requirements with the carrier before booking; no meal has been assessed.'} if allergies else None}


def seat_option(offer, preference):
    count = offer.get((preference or '') + '_seats')
    available = min(int(count), int(offer['seats'])) if count is not None and preference else None
    included = offer.get('seat_selection_included') is True
    return {'preference': preference, 'availableCount': available,
        'matches': bool(preference and available and included), 'includedInFare': included,
        'sourceId': offer.get('seat_source_id'), 'assigned': False}


def compute(request, offers, hotels, prices, legs, transfer, walks, rules, prefer_hotel=False, seat_preference=None):
    deadline = datetime.fromisoformat(request.travelDate + 'T' + request.deadline + ':00+01:00')
    routes = []
    walk_map = {w['hotel_id']: int(w['minutes']) for w in walks}
    hotel_map = {h['id']: h for h in hotels}
    for offer in offers:
        path = sorted([l for l in legs if l['offer_id'] == offer['id']], key=lambda l: l['sequence'])
        reasons, connections = [], []
        arrival = None
        if not path:
            reasons.append('No complete flight path was returned by Neptune.')
        else:
            if path[0]['origin'] != request.origin or path[-1]['destination'] != request.destination:
                reasons.append('The path does not match the requested airports.')
            if path[0]['depart'][:10] != request.travelDate:
                reasons.append('The offer is for a different travel date.')
            for leg in path:
                if datetime.fromisoformat(leg['arrive']) <= datetime.fromisoformat(leg['depart']):
                    reasons.append('The flight leg has invalid timestamps.')
            for previous, following in zip(path, path[1:]):
                gap = (datetime.fromisoformat(following['depart']) - datetime.fromisoformat(previous['arrive'])).total_seconds() / 60
                connections.append({'airport': following['origin'], 'minutes': gap, 'minimum': rules['minimumConnectionMinutes']})
                if previous['destination'] != following['origin']:
                    reasons.append('The flight legs do not connect at the same airport.')
                if gap < rules['minimumConnectionMinutes']:
                    reasons.append(f'{following["origin"]} connection is {gap:g} minutes; the minimum is {rules["minimumConnectionMinutes"]}.')
            if not transfer:
                reasons.append('No airport-to-venue transfer path exists.')
            else:
                arrival = datetime.fromisoformat(path[-1]['arrive']) + timedelta(minutes=rules['arrivalAllowanceMinutes'] + transfer['minutes'])
                if arrival > deadline:
                    reasons.append(f'At the meeting at {arrival:%H:%M}, after the {request.deadline} deadline.')
        if offer['seats'] <= 0:
            reasons.append('No seats are available in the current Aurora demo inventory.')
        routes.append({'offer': offer, 'legs': path, 'connections': connections,
            'landing': path[-1]['arrive'] if path else None,
            'venueArrival': arrival.isoformat() if arrival else None,
            'reasons': reasons, 'feasible': not reasons})
    route_map = {r['offer']['id']: r for r in routes}
    bundles = []
    for price in prices:
        route, hotel = route_map[price['offer_id']], hotel_map[price['hotel_id']]
        reasons = list(route['reasons'])
        walk = walk_map.get(hotel['id'])
        if walk is None:
            reasons.append('No hotel-to-venue walk is recorded in Neptune.')
        elif walk > request.maxWalkMinutes:
            reasons.append(f'Hotel is {walk} minutes on foot; the limit is {request.maxWalkMinutes}.')
        if price['rooms'] <= 0:
            reasons.append('The hotel has no rooms in the current Aurora demo inventory.')
        fits_except_budget = not reasons
        if price['total_pence'] >= request.budgetPence:
            reasons.append(f'Complete price £{price["total_pence"]/100:g} is not under £{request.budgetPence/100:g}.')
        bundles.append({'id': route['offer']['id'] + ':' + hotel['id'], 'route': route,
            'hotel': {**hotel, 'walk_minutes': walk}, 'price': price, 'totalPence': price['total_pence'],
            'seat': seat_option(route['offer'], seat_preference),
            'reasons': reasons, 'eligible': not reasons, 'fitsExceptBudget': fits_except_budget})

    def order(bundle):
        arrival = bundle['route']['venueArrival']
        preference = -float(bundle['hotel']['rrf_score']) if prefer_hotel and request.priority != 'cheapest' else 0
        seat = 0 if not seat_preference or bundle['seat']['matches'] else 1
        if request.priority == 'earliest':
            return (datetime.fromisoformat(arrival).timestamp(), preference, seat, bundle['totalPence'], bundle['id'])
        if request.priority == 'cheapest':
            return (bundle['totalPence'], seat, datetime.fromisoformat(arrival).timestamp(), bundle['id'])
        return (preference, seat, bundle['totalPence'], datetime.fromisoformat(arrival).timestamp(), bundle['id'])

    eligible = sorted([b for b in bundles if b['eligible']], key=order)
    possible_prices = [b['totalPence'] for b in bundles if b['fitsExceptBudget']]
    return {'request': request.model_dump(), 'selected': eligible[0] if eligible else None,
        'alternatives': eligible[1:4], 'routes': routes, 'bundles': bundles,
        'eligibleCount': len(eligible), 'minimumFeasiblePence': min(possible_prices) if possible_prices else None,
        'transfer': transfer, 'rules': rules, 'deadline': deadline.isoformat(),
        'preferenceApplied': prefer_hotel and request.priority != 'cheapest'}
