"""Persist the typed trip context without turning one-trip changes into lasting preferences."""
import json
from dataclasses import replace
from datetime import datetime, timezone

from bedrock_agentcore.memory.integrations.strands.bedrock_converter import AgentCoreMemoryConverter
from bedrock_agentcore.memory.integrations.strands.session_manager import AgentCoreMemorySessionManager
from strands.types.session import SessionMessage

from services import MEMORY, SETTINGS

ACTOR = 'alex-onward'


class OnwardMemoryConverter(AgentCoreMemoryConverter):
    """Accept both SDK messages and explicit, plain-text preference conversations."""

    @staticmethod
    def events_to_messages(rows):
        messages, next_id = [], 0
        for event in reversed(rows):  # the SDK receives newest events first
            for payload in event.get('payload', []):
                conversational = payload.get('conversational')
                if conversational:
                    text = conversational['content']['text']
                    try:
                        value = json.loads(text)
                    except ValueError:
                        value = None
                    if isinstance(value, dict) and isinstance(value.get('message'), dict):
                        parsed = [SessionMessage.from_dict(value)]
                    else:
                        parsed = [SessionMessage(message={'role': conversational['role'].lower(),
                                                          'content': [{'text': text}]}, message_id=next_id)]
                else:
                    parsed = AgentCoreMemoryConverter.events_to_messages([{**event, 'payload': [payload]}])
                for message in parsed:
                    messages.append(message)
                    next_id = max(next_id, message.message_id + 1)
        return messages


class OnwardMemorySessionManager(AgentCoreMemorySessionManager):
    """Restore conversation text; each new turn must check the travel data again."""

    def __init__(self, *args, assistant_text_filter=None, **kwargs):
        self.assistant_text_filter = assistant_text_filter
        super().__init__(*args, **kwargs)

    def append_message(self, message, agent, **kwargs):
        check = getattr(self, 'assistant_text_filter', None)
        content = message.get('content', [])
        if (check and message.get('role') == 'assistant'
                and not any('toolUse' in block for block in content)):
            text = ''.join(block['text'] for block in content if isinstance(block.get('text'), str))
            if text.strip():
                checked = check(text)
                if checked != text:
                    # Correct the stored copy before CreateEvent. SDK redaction
                    # deletes immutable events and requires extra permissions.
                    # Leave the model's signed, in-flight message untouched.
                    message = {'role': 'assistant', 'content': [{'text': checked}]}
        return super().append_message(message, agent, **kwargs)

    def list_messages(self, session_id, agent_id, limit=None, offset=0, **kwargs):
        restored = super().list_messages(session_id, agent_id, limit, offset, **kwargs)
        messages = []
        for saved in restored:
            message = saved.to_message()
            # The SDK's tool-context filter leaves signed reasoning blocks behind.
            # They cannot be replayed after their tool exchange has been removed,
            # and may belong to a different model selected on this turn.
            content = [{'text': block['text']} for block in message.get('content', [])
                       if isinstance(block.get('text'), str) and block['text'].strip()]
            if content:
                clean = {'role': message['role'], 'content': content}
                messages.append(replace(saved, message=clean,
                                        redact_message=clean if saved.redact_message is not None else None))
        return messages


def events(session):
    """Read all pages before ordering; the latest turn may not be on the first page."""
    rows, token, request_id = [], None, None
    for _ in range(20):
        result = MEMORY.list_events(memoryId=SETTINGS['memoryId'], actorId=ACTOR, sessionId=session,
                                    includePayloads=True, maxResults=100, **({'nextToken': token} if token else {}))
        rows.extend(result.get('events', []))
        request_id = result.get('ResponseMetadata', {}).get('RequestId')
        token = result.get('nextToken')
        if not token:
            return sorted(rows, key=lambda event: (event['eventTimestamp'], event.get('eventId', ''))), request_id
    raise ValueError('This conversation is too long for the demo. Start a new conversation.')


def history(session):
    rows, request_id = events(session)
    messages = []
    for saved in OnwardMemoryConverter.events_to_messages(list(reversed(rows))):
        message = saved.to_message()
        text = '\n'.join(block['text'] for block in message.get('content', [])
                         if isinstance(block.get('text'), str) and block['text'].strip())
        if text:
            messages.append({'role': message['role'], 'text': text[:1200]})
    return messages[-8:], request_id


def load_state(session):
    # Keep application state separate from the Strands conversational message format.
    rows, _ = events(session + '-state')
    for event in reversed(rows):
        for item in event.get('payload', []):
            if 'blob' in item:
                value = item['blob']
                state = json.loads(value) if isinstance(value, str) else value
                if isinstance(state, dict) and state.get('version') == 1:
                    return state
    return {}


def save_state(session, request, selection):
    response = MEMORY.create_event(memoryId=SETTINGS['memoryId'], actorId=ACTOR, sessionId=session + '-state',
        eventTimestamp=datetime.now(timezone.utc), extractionMode='SKIP',
        payload=[{'blob': json.dumps({'version': 1, 'request': request, 'selection': selection})}])
    return response.get('ResponseMetadata', {}).get('RequestId')


def skip_preference_extraction(params, **kwargs):
    """A documented botocore parameter hook, applied only to the ordinary-turn Memory client."""
    params['extractionMode'] = 'SKIP'


def configure_session_memory(manager):
    manager.memory_client.gmdp_client.meta.events.register(
        'before-parameter-build.bedrock-agentcore.CreateEvent', skip_preference_extraction)
    return manager
