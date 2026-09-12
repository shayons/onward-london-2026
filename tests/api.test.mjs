import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertOnwardConfig, parseJson, scenarioStatement, validateChat} from '../api-shared.mjs';
import {travelData} from '../data/travel.js';

test('malformed or oversized JSON produces a client error', () => {
  for (const raw of ['null', '[]', '{broken']) assert.throws(() => parseJson(raw), error => error.status === 400);
  assert.throws(() => parseJson('£'.repeat(8001)), error => error.status === 413);
});
test('only an actual boolean can confirm a booking', () => {
  const input = {sessionId: 'onward-' + 'a'.repeat(32), message: 'Book it'};
  assert.throws(() => validateChat({...input, confirmBooking: 'true'}));
  assert.equal(validateChat({...input, confirmBooking: true}).confirmBooking, true);
});
test('a flight availability toggle changes only that flight', () => {
  const statement = scenarioStatement({soldOut: false}, travelData);
  assert.doesNotMatch(statement.sql, /hotels/);
  assert.equal(statement.parameters[0].value.longValue, 4);
});
test('an explicit reset restores both kinds of demo stock', () => {
  const statement = scenarioStatement({reset: true}, travelData);
  assert.match(statement.sql, /UPDATE offers/);
  assert.match(statement.sql, /UPDATE hotels/);
  assert.throws(() => scenarioStatement({reset: true, soldOut: false}, travelData));
});
test('proxy configuration cannot target a neighbouring application database', () => {
  const cfg = {accountId:'619763002613', region:'us-east-1', database:'onward',
    clusterArn:'arn:aws:rds:us-east-1:619763002613:cluster:meridian-demo'};
  assert.equal(assertOnwardConfig(cfg), cfg);
  assert.throws(() => assertOnwardConfig({...cfg, database:'meridian'}));
});
test('the browser and server fixtures stay identical', async () => {
  const raw = await readFile(new URL('../data/travel.json', import.meta.url), 'utf8');
  assert.deepEqual(travelData, JSON.parse(raw));
});
