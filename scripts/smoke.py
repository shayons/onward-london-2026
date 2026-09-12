"""Verify real invocation through the deployed AgentCore endpoint, retaining evidence locally."""
import json
import sys
import uuid
from datetime import datetime, timezone

from provision import ROOT, SESSION, CONFIG


def invoke(message, session_id=None, **extra):
    cfg = json.loads((ROOT / 'infra/deployed.json').read_text())
    session_id = session_id or 'onward-' + str(uuid.uuid4())
    result = SESSION.client('bedrock-agentcore', config=CONFIG).invoke_agent_runtime(
        agentRuntimeArn=cfg['runtimeArn'], runtimeSessionId=session_id, qualifier='DEFAULT',
        contentType='application/json', accept='text/event-stream',
        payload=json.dumps({'message': message, 'sessionId': session_id, 'runId': str(uuid.uuid4()), **extra}).encode())
    events = []
    with result['response'] as stream:
        pending = b''
        while True:
            chunk = stream.read(256)
            if not chunk:
                break
            pending += chunk
            while b'\n' in pending:
                line, pending = pending.split(b'\n', 1)
                text = line.decode()
                if not text.startswith('data:'):
                    continue
                value = json.loads(text[5:].strip())
                if isinstance(value, str):
                    value = json.loads(value)
                events.append(value)
                if value.get('type') == 'trace' and value.get('phase') == 'result':
                    print(f'{value["layer"] + 1}. {value["title"]}: {value["summary"]}', flush=True)
                if value.get('type') == 'error':
                    print('ERROR:', json.dumps(value), flush=True)
    return events, session_id, result['ResponseMetadata']['RequestId']


def validate_events(events, require_booking=False, require_plan=False):
    """Check the returned evidence, not just whether the transport reached a done event."""
    errors = [e for e in events if e.get('type') == 'error']
    assert not errors, 'The deployed request returned an error: ' + json.dumps(errors)
    assert any(e.get('type') == 'done' for e in events), 'No completed run event'
    assert any(e.get('type') == 'answer' and e.get('text', '').strip() for e in events), 'No answer was returned'
    if require_plan:
        assert any(e.get('type') == 'plan' and isinstance(e.get('plan'), dict) for e in events), 'No trip evaluation was returned'
    for event in events:
        if event.get('type') != 'plan':
            continue
        plan = event['plan']
        resolved = {e['layer'] for e in events if e.get('type') == 'trace' and e.get('phase') == 'result' and not e.get('error')}
        assert set(range(6)) <= resolved, 'The answer skipped a semantic component'
        selected = plan.get('selected')
        if selected:
            assert selected['eligible'] and not selected['reasons'], 'An ineligible itinerary was selected'
            assert selected['totalPence'] < plan['request']['budgetPence'], 'The strict budget was not met'
            assert selected['totalPence'] == sum(selected['price'][key] for key in (
                'fare_pence', 'bags_pence', 'hotel_pence', 'transfer_pence')), 'Cost lines do not add up'
            assert datetime.fromisoformat(selected['route']['venueArrival']) <= datetime.fromisoformat(plan['deadline']), 'Venue arrival is late'
            assert selected['hotel']['walk_minutes'] <= plan['request']['maxWalkMinutes'], 'Hotel exceeds walking limit'
            assert selected['price']['seats'] > 0 and selected['price']['rooms'] > 0, 'Selected stock is unavailable'
    if require_booking:
        assert any(e.get('type') == 'booking' and e.get('booking') for e in events), 'No booking was confirmed'


def main():
    book = '--book' in sys.argv
    model_only = '--model-only' in sys.argv
    words = [arg for arg in sys.argv[1:] if arg not in ('--book', '--model-only')]
    prompt = ' '.join(words) or 'My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.'
    events, session, request = invoke(prompt, **({'semanticLayer': False} if model_only else {}))
    if book:
        # The one-click confirmation: the browser sends confirmBooking=true; the gateway's Cedar policies decide.
        booking_events, _, booking_request = invoke('Book this itinerary for Alex.', session, confirmBooking=True)
        events += booking_events
        print('booking request', booking_request, json.dumps(next((e for e in booking_events if e.get('type') == 'booking'), None)), flush=True)
    folder = ROOT / '.local/verification'
    folder.mkdir(parents=True, exist_ok=True)
    output = {'at': datetime.now(timezone.utc).isoformat(), 'sessionId': session, 'runtimeRequestId': request, 'events': events}
    path = folder / (session + '.json')
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    validate_events(events, require_booking=book, require_plan=not model_only and not words)
    plan = next((e['plan'] for e in events if e.get('type') == 'plan'), None)
    print(json.dumps({'evidence': str(path), 'events': len(events), 'runtimeRequestId': request,
        'selected': plan['selected']['id'] if plan and plan['selected'] else None,
        'total': plan['selected']['totalPence'] if plan and plan['selected'] else None,
        'memorySource': plan['memory']['source'] if plan else None}), flush=True)


if __name__ == '__main__':
    main()
