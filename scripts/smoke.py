"""Verify real invocation through the deployed AgentCore endpoint, retaining evidence locally."""
import json
import sys
import uuid
from pathlib import Path
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


def main():
    book = '--book' in sys.argv
    words = [arg for arg in sys.argv[1:] if arg != '--book']
    prompt = ' '.join(words) or 'My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.'
    events, session, request = invoke(prompt)
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
    errors = [e for e in events if e.get('type') == 'error' or 'error' in e]
    if errors:
        raise RuntimeError('The deployed run failed; inspect ' + str(path))
    assert any(e.get('type') == 'done' for e in events), 'No completed run event'
    plan = next((e['plan'] for e in events if e.get('type') == 'plan'), None)
    print(json.dumps({'evidence': str(path), 'events': len(events), 'runtimeRequestId': request,
        'selected': plan['selected']['id'] if plan and plan['selected'] else None,
        'total': plan['selected']['totalPence'] if plan and plan['selected'] else None,
        'memorySource': plan['memory']['source'] if plan else None}), flush=True)


if __name__ == '__main__':
    main()
