"""Enable and seed the real AgentCore Memory strategies used by the briefing."""
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.config import Config


ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'infra' / 'deployed.json'
ACTOR = 'alex-onward'
SESSION_ID = 'onward-memory-showcase-2026'
CONFIG = Config(connect_timeout=10, read_timeout=120,
    retries={'total_max_attempts': 4, 'mode': 'standard'})

STRATEGIES = {
    'SEMANTIC': {
        'semanticMemoryStrategy': {
            'name': 'OnwardFacts',
            'description': 'Factual traveller and trip context extracted from Onward conversations.',
            'namespaceTemplates': ['/onward/actors/{actorId}/facts/'],
        },
    },
    'SUMMARIZATION': {
        'summaryMemoryStrategy': {
            'name': 'OnwardSessionSummary',
            'description': 'A concise summary of each Onward conversation session.',
            'namespaceTemplates': ['/onward/actors/{actorId}/summaries/{sessionId}/'],
        },
    },
    'EPISODIC': {
        'episodicMemoryStrategy': {
            'name': 'OnwardEpisodes',
            'description': 'Completed trip-recovery episodes and reflections across sessions.',
            'namespaceTemplates': [
                '/onward/actors/{actorId}/episodes/{sessionId}/',
            ],
            'reflectionConfiguration': {
                'namespaceTemplates': [
                    '/onward/actors/{actorId}/episodes/',
                ],
            },
        },
    },
}


def main():
    state = json.loads(STATE.read_text())
    region = state['region']
    memory_id = state['memoryId']
    session = boto3.Session(region_name=region)
    account = session.client('sts', config=CONFIG).get_caller_identity()['Account']
    if account != state['accountId']:
        raise RuntimeError('The active account is not the deployed Onward account.')

    control = session.client('bedrock-agentcore-control', config=CONFIG)
    data = session.client('bedrock-agentcore', config=CONFIG)
    memory = control.get_memory(memoryId=memory_id)['memory']
    active_types = {strategy['type'] for strategy in memory.get('strategies', [])}
    additions = [strategy for strategy_type, strategy in STRATEGIES.items()
        if strategy_type not in active_types]

    if additions:
        control.update_memory(memoryId=memory_id,
            memoryStrategies={'addMemoryStrategies': additions})
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            memory = control.get_memory(memoryId=memory_id)['memory']
            types = {strategy['type'] for strategy in memory.get('strategies', [])
                if strategy.get('status') == 'ACTIVE'}
            if set(STRATEGIES).issubset(types):
                break
            if memory.get('status') == 'FAILED':
                raise RuntimeError(memory.get('failureReason', 'Memory update failed.'))
            time.sleep(5)
        else:
            raise TimeoutError('AgentCore Memory strategies did not become active in time.')

    if not state.get('memoryShowcaseEventId'):
        user_message = (
            'I’m Alex Morgan, a London-based designer travelling to Lisbon for a '
            'client meeting at 14:00 on 15 September. For work trips I normally '
            'check one bag, prefer an aisle seat and choose a quiet hotel within '
            '20 minutes on foot of the meeting. If my original flight is cancelled, '
            'help me recover the trip and keep the outbound flight, checked bag, '
            'hotel with taxes and airport transfer under £650.'
        )
        assistant_message = (
            'I’ll remember the traveller context and preferences. I’ll still verify '
            'fares, schedules, walking time and availability from the prepared source '
            'systems before recommending an itinerary.'
        )
        response = data.create_event(memoryId=memory_id, actorId=ACTOR,
            sessionId=SESSION_ID, eventTimestamp=datetime.now(timezone.utc),
            payload=[
                {'conversational': {'role': 'USER',
                    'content': {'text': user_message}}},
                {'conversational': {'role': 'ASSISTANT',
                    'content': {'text': assistant_message}}},
            ])
        state['memoryShowcaseEventId'] = response['event']['eventId']
        state['memoryShowcaseSessionId'] = SESSION_ID
        STATE.write_text(json.dumps(state, indent=2) + '\n')

    memory = control.get_memory(memoryId=memory_id)['memory']
    print('AgentCore Memory strategies:',
        ', '.join(sorted(strategy['type'] for strategy in memory['strategies'])))
    print('Showcase session:', SESSION_ID)
    print('Extraction is asynchronous; inspect records before publishing the briefing.')


if __name__ == '__main__':
    main()
