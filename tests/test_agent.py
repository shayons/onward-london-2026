"""Unit checks for the gateway-facing runtime pieces: tool dispatch, evidence compaction, request signing, ordering."""
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

import boto3
import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
import os
os.environ.setdefault('ONWARD_CONFIG', str(ROOT / 'infra/deployed.json'))
import tools  # noqa: E402
from gateway_auth import GatewaySigV4  # noqa: E402
import main  # noqa: E402


class ToolDispatch(unittest.TestCase):
    def test_handler_strips_the_gateway_prefix_and_routes(self):
        calls = []
        original = tools.TOOLS['price_bundles']
        tools.TOOLS['price_bundles'] = lambda args: calls.append(args) or {'layer': 3, 'summary': 'ok', 'title': 't', 'service': 's', 'evidence': {}}
        try:
            context = SimpleNamespace(client_context=SimpleNamespace(custom={'bedrockAgentCoreToolName': 'OnwardTools___price_bundles'}))
            result = tools.handler({'bags': 1, 'nights': 1}, context)
        finally:
            tools.TOOLS['price_bundles'] = original
        self.assertEqual(calls, [{'bags': 1, 'nights': 1}])
        self.assertEqual(result['layer'], 3)

    def test_unknown_tool_is_refused(self):
        context = SimpleNamespace(client_context=SimpleNamespace(custom={'bedrockAgentCoreToolName': 'OnwardTools___delete_everything'}))
        with self.assertRaises(ValueError):
            tools.handler({}, context)

    def test_compact_plan_carries_what_the_policy_needs(self):
        plan = {'selected': {'route': {'offer': {'id': 'AX218', 'carrier': 'Aster Air', 'seats': 4, 'seat_selection_included': True},
                                        'legs': [{'depart': '2026-09-15T08:20:00+01:00'}], 'landing': '2026-09-15T11:05:00+01:00',
                                        'venueArrival': '2026-09-15T12:25:00+01:00'},
                             'hotel': {'id': 'patio-house', 'name': 'Pátio House', 'description': 'd', 'walk_minutes': 12},
                             'price': {'fare_pence': 25500, 'bags_pence': 3500, 'hotel_pence': 16500, 'transfer_pence': 3500},
                             'seat': {'matches': True}, 'totalPence': 49000},
                'request': {}, 'minimumFeasiblePence': 47000, 'preferenceApplied': True, 'routes': [{'offer': {'id': 'AX404'}, 'reasons': ['late']}]}
        compact = tools.compact_plan(plan)
        self.assertEqual(compact['selected']['seatsAvailable'], 4)
        self.assertTrue(compact['selected']['seatSelectionIncluded'])
        self.assertTrue(compact['selected']['arrivesBeforeDeadline'])
        self.assertEqual(compact['rejections'], [{'flight': 'AX404', 'reasons': ['late']}])


class RequestSigning(unittest.TestCase):
    def test_gateway_requests_are_sigv4_signed_for_bedrock_agentcore(self):
        session = boto3.Session(aws_access_key_id='AKIAEXAMPLE', aws_secret_access_key='secret', aws_session_token='token', region_name='us-east-1')
        auth = GatewaySigV4(session, 'us-east-1')
        request = httpx.Request('POST', 'https://example.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                                content=b'{"jsonrpc":"2.0"}', headers={'content-type': 'application/json', 'accept': 'application/json, text/event-stream'})
        signed = next(auth.auth_flow(request))
        self.assertIn('AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE/', signed.headers['Authorization'])
        self.assertIn('/us-east-1/bedrock-agentcore/aws4_request', signed.headers['Authorization'])
        self.assertEqual(signed.headers['X-Amz-Security-Token'], 'token')
        self.assertIn('X-Amz-Date', signed.headers)


class StoryOrder(unittest.TestCase):
    def event(self, name, tool_use_id='t1'):
        return SimpleNamespace(tool_use={'name': f'OnwardTools___{name}', 'toolUseId': tool_use_id, 'input': {'origin': 'LHR', 'destination': 'LIS'}},
                               cancel_tool=False, result=None)

    def test_out_of_order_tool_calls_are_cancelled_until_the_previous_component_landed(self):
        hooks = main.TraceHooks(main.asyncio.Queue())
        early = self.event('price_bundles')
        hooks.before(early)
        self.assertIn('Call resolve_entities next', early.cancel_tool)
        first = self.event('resolve_entities')
        hooks.before(first)
        self.assertFalse(first.cancel_tool)
        self.assertEqual(hooks.queue.qsize(), 3)  # input, mapping and tool phases for layer 1

    def test_booking_turn_only_accepts_book_trip(self):
        hooks = main.TraceHooks(main.asyncio.Queue(), booking_turn=True)
        wrong = self.event('search_hotels')
        hooks.before(wrong)
        self.assertIn('Call book_trip next', wrong.cancel_tool)

    def test_successful_result_becomes_trace_plus_compact_model_view(self):
        hooks = main.TraceHooks(main.asyncio.Queue())
        call = self.event('resolve_entities')
        hooks.before(call)
        payload = {'layer': 1, 'title': 'Entities connected', 'summary': 'ok', 'service': 'Aurora PostgreSQL', 'origin': 'LHR', 'destination': 'LIS',
                   'venueId': 'v', 'venueName': 'Venue', 'supported': True, 'evidence': {'entities': [1, 2, 3], 'requestId': 'r'}}
        call.result = {'toolUseId': 't1', 'status': 'success', 'content': [{'text': json.dumps(payload)}]}
        hooks.after(call)
        kinds = [item[0] for item in list(hooks.queue._queue)]
        self.assertEqual(kinds, ['trace', 'trace', 'trace', 'trace'])
        model_view = json.loads(call.result['content'][0]['text'])
        self.assertNotIn('evidence', model_view)
        self.assertEqual(model_view['venueName'], 'Venue')
        self.assertIn(1, hooks.done)

    def test_policy_denial_is_reported_as_a_refused_booking(self):
        hooks = main.TraceHooks(main.asyncio.Queue(), booking_turn=True)
        call = self.event('book_trip')
        hooks.before(call)
        call.result = {'toolUseId': 't1', 'status': 'error', 'content': [{'text': 'Tool Execution Denied: Tool call not allowed due to policy enforcement [Policy evaluation denied due to onward_airline_rules]'}]}
        hooks.after(call)
        items = list(hooks.queue._queue)
        result = next(payload for kind, payload in items if kind == 'trace' and payload['phase'] == 'result')
        self.assertEqual(result['title'], 'Booking refused by policy')
        self.assertTrue(result['error'])
        booking = next(payload for kind, payload in items if kind == 'booking')
        self.assertEqual(booking['policyDecision'], 'deny')
        self.assertIsNone(booking['booking'])


if __name__ == '__main__':
    unittest.main()


class Denials(unittest.TestCase):
    def test_policy_names_become_sentences(self):
        text = 'Tool execution failed: Tool Execution Denied: Tool call not allowed due to policy enforcement [Policy evaluation denied due to onward_airline_rules-qgjprwr4r_]'
        self.assertTrue(main.friendly_denial(text).startswith('Refused by Cedar policy onward_airline_rules. The airline accepts'))
        self.assertIn('Denied by default', main.friendly_denial('[No policy applies to the request (denied by default).]'))
