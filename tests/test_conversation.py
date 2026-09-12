from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import boto3
from strands.types.session import SessionMessage

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
import conversation


class Conversation(unittest.TestCase):
    def test_proposal_is_corrected_before_creating_its_memory_event(self):
        manager = object.__new__(conversation.OnwardMemorySessionManager)
        manager.session_id = 'session'
        manager._latest_agent_message = {}
        manager.create_message = Mock(return_value={'eventId': 'saved'})
        manager.assistant_text_filter = lambda text: 'A proposed trip. Nothing has been reserved.'
        original = {'role': 'assistant', 'content': [
            {'reasoningContent': {'redactedContent': b'signed'}},
            {'text': "You're booked into the hotel."}]}
        manager.append_message(original, SimpleNamespace(agent_id='agent'))
        stored = manager.create_message.call_args.args[2].message
        self.assertEqual(stored, {'role': 'assistant', 'content': [
            {'text': 'A proposed trip. Nothing has been reserved.'}]})
        self.assertEqual(original['content'][1]['text'], "You're booked into the hotel.")
        self.assertIn('reasoningContent', original['content'][0])

    def test_proposal_filter_preserves_an_in_progress_tool_exchange(self):
        manager = object.__new__(conversation.OnwardMemorySessionManager)
        manager.session_id = 'session'
        manager._latest_agent_message = {}
        manager.create_message = Mock(return_value={'eventId': 'saved'})
        manager.assistant_text_filter = Mock(side_effect=AssertionError('Do not filter tool exchanges'))
        original = {'role': 'assistant', 'content': [
            {'text': 'Checking the trip.'},
            {'toolUse': {'toolUseId': 'tool', 'name': 'select_itinerary', 'input': {}}}]}
        manager.append_message(original, SimpleNamespace(agent_id='agent'))
        self.assertEqual(manager.create_message.call_args.args[2].message, original)
        manager.assistant_text_filter.assert_not_called()

    def test_history_reads_sdk_text_and_plain_preference_events_together(self):
        day = datetime(2026, 9, 10, tzinfo=timezone.utc)
        saved = SessionMessage(message={'role': 'assistant', 'content': [
            {'reasoningContent': {'redactedContent': 'opaque'}},
            {'text': 'The complete trip costs £490.'}]}, message_id=4)
        rows = [
            {'eventTimestamp': day, 'payload': [{'conversational': {
                'role': 'ASSISTANT', 'content': {'text': json.dumps(saved.to_dict())}}}]},
            {'eventTimestamp': day, 'payload': [{'conversational': {
                'role': 'USER', 'content': {'text': 'Remember that I prefer quiet hotels.'}}}]},
        ]
        with patch.object(conversation, 'events', return_value=(rows, 'request')):
            messages, _ = conversation.history('session')
        self.assertEqual(messages, [
            {'role': 'assistant', 'text': 'The complete trip costs £490.'},
            {'role': 'user', 'text': 'Remember that I prefer quiet hotels.'}])
        restored = conversation.OnwardMemoryConverter.events_to_messages(list(reversed(rows)))
        self.assertEqual([item.message_id for item in restored], [4, 5])

    def test_restored_history_omits_orphaned_reasoning_and_tool_blocks(self):
        saved = [
            SessionMessage(message={'role': 'user', 'content': [{'text': 'Find a trip.'}]}, message_id=0),
            SessionMessage(message={'role': 'assistant', 'content': [
                {'reasoningContent': {'reasoningText': {'text': '', 'signature': 'old-model-signature'}}},
                {'toolUse': {'name': 'search_hotels', 'input': {}}}]}, message_id=1),
            SessionMessage(message={'role': 'user', 'content': [{'toolResult': {'content': []}}]}, message_id=2),
            SessionMessage(message={'role': 'assistant', 'content': [
                {'reasoningContent': {'redactedContent': b'opaque'}}, {'text': 'The complete trip costs £490.'}]}, message_id=3),
        ]
        manager = object.__new__(conversation.OnwardMemorySessionManager)
        with patch.object(conversation.AgentCoreMemorySessionManager, 'list_messages', return_value=saved):
            restored = manager.list_messages('session', 'agent')
        self.assertEqual([item.message_id for item in restored], [0, 3])
        self.assertEqual(restored[-1].to_message()['content'], [{'text': 'The complete trip costs £490.'}])
        self.assertIn('reasoningContent', saved[-1].message['content'][0])  # stored evidence is unchanged

    def test_restoration_respects_redaction(self):
        saved = SessionMessage(message={'role': 'assistant', 'content': [{'text': 'old text'}]},
                               redact_message={'role': 'assistant', 'content': [{'text': 'replacement text'}]},
                               message_id=8)
        manager = object.__new__(conversation.OnwardMemorySessionManager)
        with patch.object(conversation.AgentCoreMemorySessionManager, 'list_messages', return_value=[saved]):
            restored = manager.list_messages('session', 'agent')
        self.assertEqual(restored[0].to_message()['content'], [{'text': 'replacement text'}])

    def test_history_reads_later_pages_before_choosing_recent_messages(self):
        def event(day, text):
            return {'eventTimestamp': datetime(2026, 9, day, tzinfo=timezone.utc),
                    'payload': [{'conversational': {'role': 'USER', 'content': {'text': text}}}]}
        with patch.object(conversation, 'MEMORY') as memory:
            memory.list_events.side_effect = [
                {'events': [event(8, 'Old budget')], 'nextToken': 'next', 'ResponseMetadata': {'RequestId': 'a'}},
                {'events': [event(10, 'New budget'), event(9, 'Window this trip')], 'ResponseMetadata': {'RequestId': 'b'}},
            ]
            messages, request_id = conversation.history('onward-test')
            self.assertEqual([item['text'] for item in messages], ['Old budget', 'Window this trip', 'New budget'])
            self.assertEqual(memory.list_events.call_args.kwargs['nextToken'], 'next')
            self.assertEqual(request_id, 'b')

    def test_state_retains_a_cleared_selection_after_restart(self):
        request = {'budgetPence': 45000, 'seatPreference': 'window'}
        with patch.object(conversation, 'MEMORY') as memory:
            memory.create_event.return_value = {'ResponseMetadata': {'RequestId': 'saved'}}
            self.assertEqual(conversation.save_state('onward-test', request, None), 'saved')
            kwargs = memory.create_event.call_args.kwargs
            self.assertEqual(kwargs['extractionMode'], 'SKIP')
            self.assertEqual(kwargs['sessionId'], 'onward-test-state')
            memory.list_events.return_value = {'events': [{'eventTimestamp': datetime.now(timezone.utc),
                                                          'payload': kwargs['payload']}]}
            self.assertEqual(conversation.load_state('onward-test')['selection'], None)
            self.assertEqual(conversation.load_state('onward-test')['request'], request)

    def test_sdk_create_event_hook_skips_long_term_extraction(self):
        client = boto3.client('bedrock-agentcore', region_name='us-east-1',
                              aws_access_key_id='example', aws_secret_access_key='example')
        manager = SimpleNamespace(memory_client=SimpleNamespace(gmdp_client=client))
        conversation.configure_session_memory(manager)
        params = {'sessionId': 'ordinary-trip'}
        service = client.meta.service_model.service_id.hyphenize()
        client.meta.events.emit(f'before-parameter-build.{service}.CreateEvent', params=params, model=client.meta.service_model.operation_model('CreateEvent'), context={})
        self.assertEqual(params['extractionMode'], 'SKIP')
