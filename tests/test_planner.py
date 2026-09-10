import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from planner import TripRequest, compute, traveller_context, seat_option


class JourneyRules(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'data/travel.json').read_text())
        self.offers = [{'id': o['id'], 'seats': o['seats'], 'carrier': o['carrier']} for o in self.data['offers']]
        self.hotels = [{'id': h['id'], 'name': h['name'], 'rrf_score': {'patio-house': .03, 'coast-retreat': .02, 'forum-rooms': .01}[h['id']]} for h in self.data['hotels']]
        self.legs = [{'offer_id': o['id'], 'sequence': i, 'origin': l['from'], 'destination': l['to'], 'depart': l['depart'], 'arrive': l['arrive']} for o in self.data['offers'] for i, l in enumerate(o['legs'])]
        self.walks = [{'hotel_id': h['id'], 'minutes': h['walkMinutes']} for h in self.data['hotels']]
        self.prices = [{'offer_id': o['id'], 'hotel_id': h['id'], 'total_pence': o['farePence'] + o['bagPence'] + h['nightPence'] + 3500, 'rooms': h['rooms'], 'seats': o['seats']} for o in self.data['offers'] for h in self.data['hotels']]
        self.transfer = {'minutes': 35, 'price_pence': 3500}

    def plan(self, prefer=True, **options):
        return compute(TripRequest(**options), self.offers, self.hotels, self.prices, self.legs, self.transfer, self.walks, self.data['rules'], prefer)

    def test_complete_trip_and_deadline(self):
        p = self.plan()
        self.assertEqual((p['selected']['id'], p['selected']['totalPence']), ('AX218:patio-house', 49000))
        late = next(r for r in p['routes'] if r['offer']['id'] == 'AX404')
        self.assertFalse(late['feasible'])
        self.assertIn('14:40', late['reasons'][0])

    def test_elapsed_connection_time_and_disconnected_airports(self):
        route = next(r for r in self.plan()['routes'] if r['offer']['id'] == 'ME615')
        self.assertEqual(route['connections'][0]['minutes'], 45)
        self.assertFalse(route['feasible'])
        self.legs[-1]['origin'] = 'LHR'
        route = next(r for r in self.plan()['routes'] if r['offer']['id'] == 'ME615')
        self.assertTrue(any('same airport' in reason for reason in route['reasons']))

    def test_strict_budget_boundary_and_no_match(self):
        p = self.plan(budgetPence=47000)
        self.assertIsNone(p['selected'])
        self.assertEqual(p['minimumFeasiblePence'], 47000)
        self.assertEqual(self.plan(budgetPence=47001)['selected']['totalPence'], 47000)

    def test_current_inventory_and_priorities(self):
        self.assertEqual(self.plan(priority='earliest')['selected']['id'], 'AX102:patio-house')
        self.assertEqual(self.plan(priority='cheapest')['selected']['id'], 'AX218:forum-rooms')
        self.assertEqual(self.plan(prefer=False)['selected']['id'], 'AX218:forum-rooms')
        next(o for o in self.offers if o['id'] == 'AX218')['seats'] = 0
        self.assertEqual(self.plan()['selected']['id'], 'ME330:patio-house')

    def test_missing_edges_fail_closed(self):
        self.transfer = None
        self.assertIsNone(self.plan()['selected'])
        self.transfer = {'minutes': 35, 'price_pence': 3500}
        self.walks = []
        self.assertIsNone(self.plan()['selected'])

    def test_all_selected_bundles_obey_contract(self):
        for priority in ('balanced', 'earliest', 'cheapest'):
            for budget in (45000, 49000, 65000, 100000):
                for prefer in (True, False):
                    p = self.plan(prefer=prefer, priority=priority, budgetPence=budget)
                    for bundle in p['bundles']:
                        if bundle['eligible']:
                            self.assertLess(bundle['totalPence'], budget)
                            self.assertLessEqual(bundle['hotel']['walk_minutes'], 20)
                            self.assertTrue(bundle['route']['feasible'])
                            self.assertGreater(bundle['price']['rooms'], 0)

    def test_trip_override_and_memory_toggle_do_not_erase_declaration(self):
        profile = {'declaredRequirements': {'allergies': ['shellfish'], 'sourceId': 'alex-declaration-v1'}}
        memories = [{'id': 'aisle-memory', 'text': 'Alex prefers an aisle seat for work travel.'}]
        remembered = traveller_context(TripRequest(), profile, memories, 'long-term extracted preferences')
        self.assertEqual(remembered['seatPreference']['value'], 'aisle')
        self.assertEqual(remembered['seatPreference']['recordIds'], ['aisle-memory'])
        for request in (TripRequest(seatPreference='window'), TripRequest(memoryEnabled=False),
                TripRequest(memoryEnabled=False, seatPreference='window')):
            context = traveller_context(request, profile, memories, 'long-term extracted preferences')
            self.assertEqual(context['allergies'][0]['name'], 'shellfish')
            self.assertEqual(context['catering']['status'], 'unverified')
            self.assertEqual(context['seatPreference']['value'], 'window' if request.seatPreference == 'window' else None)

    def test_conflicting_or_negative_memory_does_not_assign_seat(self):
        for memories in ([{'id': 'n', 'text': 'Alex does not prefer aisle seats.'}],
                [{'id': 'a', 'text': 'Alex prefers aisle seats.'}, {'id': 'w', 'text': 'Alex prefers window seats.'}]):
            self.assertIsNone(traveller_context(TripRequest(), {}, memories, 'long-term')['seatPreference']['value'])
        self.assertFalse(seat_option({'seats': 4}, 'aisle')['matches'])
        self.assertFalse(seat_option({'seats': 0, 'aisle_seats': 1, 'seat_selection_included': True}, 'aisle')['matches'])

    def test_seat_preference_keeps_hard_constraints_and_explicit_priority(self):
        for offer in self.offers:
            source = next(o for o in self.data['offers'] if o['id'] == offer['id'])['seatOptions']
            offer.update(aisle_seats=source['aisle'], window_seats=source['window'], seat_selection_included=True)
        def seated(**options):
            return compute(TripRequest(**options), self.offers, self.hotels, self.prices, self.legs,
                self.transfer, self.walks, self.data['rules'], True, 'aisle')
        baseline = seated()['selected']
        self.assertEqual(baseline['id'], 'AX218:patio-house')
        self.assertTrue(baseline['seat']['matches'])
        self.assertFalse(baseline['seat']['assigned'])
        earliest = seated(priority='earliest')['selected']
        self.assertEqual(earliest['id'], 'AX102:patio-house')
        self.assertFalse(earliest['seat']['matches'])
        self.assertIsNone(seated(budgetPence=45000)['selected'])


if __name__ == '__main__':
    unittest.main()
