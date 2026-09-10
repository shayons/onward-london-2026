"""Add fictional traveller declarations and seat options to existing Onward data."""
import json
from datetime import datetime, timezone

from provision import ACCOUNT, CONFIG, ROOT, SESSION, sql
from seed import parameters


def main():
    if SESSION.client('sts', config=CONFIG).get_caller_identity()['Account'] != ACCOUNT:
        raise RuntimeError('The active account is not the Onward demo account.')
    state_path = ROOT / 'infra/deployed.json'
    cfg = json.loads(state_path.read_text())
    data = json.loads((ROOT / 'data/travel.json').read_text())
    for definition in ('aisle_seats integer CHECK(aisle_seats>=0)',
            'window_seats integer CHECK(window_seats>=0)', 'seat_selection_included boolean', 'seat_source_id text'):
        sql('ALTER TABLE offers ADD COLUMN IF NOT EXISTS ' + definition, 'onward')
    for offer in data['offers']:
        seat = offer['seatOptions']
        sql('UPDATE offers SET aisle_seats=CAST(:aisle AS integer),window_seats=CAST(:window AS integer),seat_selection_included=true,seat_source_id=:source WHERE id=:id',
            'onward', parameters({'aisle': seat['aisle'], 'window': seat['window'], 'source': seat['sourceId'], 'id': offer['id']}))
    sql("UPDATE entities SET payload=jsonb_set(payload,'{declaredRequirements}',CAST(:declaration AS jsonb)) WHERE id='alex-onward'",
        'onward', parameters({'declaration': data['traveller']['declaredRequirements']}))
    memory = SESSION.client('bedrock-agentcore', config=CONFIG)
    if not cfg.get('seatPreferenceSeedEventId'):
        event = memory.create_event(memoryId=cfg['memoryId'], actorId='alex-onward', sessionId='onward-onboarding-2026',
            eventTimestamp=datetime.now(timezone.utc), payload=[
                {'conversational': {'role': 'USER', 'content': {'text': data['memory']['quote']}}},
                {'conversational': {'role': 'ASSISTANT', 'content': {'text': 'Your work-travel preferences are an aisle seat, a quiet hotel and walking to the meeting.'}}}])
        cfg['seatPreferenceSeedEventId'] = event['event']['eventId']
        state_path.write_text(json.dumps(cfg, indent=2) + '\n')
    s3 = SESSION.client('s3', config=CONFIG)
    s3.upload_file(str(ROOT / 'data/travel.json'), cfg['bucket'], 'sources/travel-raw-v1.json',
        ExtraArgs={'ExpectedBucketOwner': ACCOUNT, 'ContentType': 'application/json', 'ServerSideEncryption': 'AES256'})
    print('Onward seat options and traveller declaration stored in Aurora; preference conversation stored in AgentCore Memory. Long-term extraction is asynchronous.', flush=True)


if __name__ == '__main__':
    main()
