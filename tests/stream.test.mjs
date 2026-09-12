import test from 'node:test';
import assert from 'node:assert/strict';
import {readEvents} from '../stream.js';

test('SSE preserves split Unicode, CRLF, comments and a final frame without a separator', async () => {
  const events = [{type:'token',text:'Pátio · £490'}, {type:'done'}];
  const raw = ': heartbeat\r\n\r\ndata: '+JSON.stringify(JSON.stringify(events[0]))+'\r\n\r\ndata: '+JSON.stringify(events[1]);
  const bytes = new TextEncoder().encode(raw);
  // Each byte gets its own chunk: UTF-8 characters and CRLF are necessarily split.
  const stream = new ReadableStream({start(controller){for(const byte of bytes)controller.enqueue(Uint8Array.of(byte));controller.close();}});
  const actual = [];
  for await (const event of readEvents(stream)) actual.push(event);
  assert.deepEqual(actual, events);
});
test('unreadable SSE fails instead of being treated as a completed answer', async () => {
  const stream = new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: invalid\n\n'));controller.close();}});
  await assert.rejects(async () => {for await (const event of readEvents(stream)) void event;});
  assert.equal(stream.locked, false);
});
