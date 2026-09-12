// The local and published proxies use the same input and inventory rules.
// One policy for the local server and the CloudFront distribution; scripts/publish.py reads it from here.
export const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export class RequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function parseJson(raw) {
  if (Buffer.byteLength(raw, 'utf8') > 16000) throw new RequestError('Request is too large.', 413);
  let value;
  try { value = JSON.parse(raw || '{}'); }
  catch { throw new RequestError('Send a valid JSON object.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Send a JSON object.');
  return value;
}

export const sessionValid = value => typeof value === 'string' && /^onward-[a-zA-Z0-9-]{32,80}$/.test(value);

export function validateChat(input) {
  if (!sessionValid(input.sessionId) || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 4000)
    throw new RequestError('Enter a message of 1–4,000 characters in a valid session.');
  for (const key of ['confirmBooking', 'memoryEnabled', 'semanticLayer']) {
    if (key in input && typeof input[key] !== 'boolean') throw new RequestError(`${key} must be true or false.`);
  }
  if ('modelId' in input && typeof input.modelId !== 'string') throw new RequestError('Choose a model from the list.');
  return input;
}

export function assertOnwardConfig(cfg) {
  if (cfg.accountId !== '619763002613' || cfg.region !== 'us-east-1' || cfg.database !== 'onward'
      || cfg.clusterArn !== 'arn:aws:rds:us-east-1:619763002613:cluster:meridian-demo') {
    throw new Error('The configuration must use the isolated Onward database in the authorised account.');
  }
  return cfg;
}

export function scenarioStatement(input, data) {
  if (input.reset === true && !('soldOut' in input)) {
    return {
      sql: `WITH restored_offers AS (
        UPDATE offers o SET seats=v.seats,updated_at=now()
        FROM json_to_recordset(CAST(:offers AS json)) AS v(id text,seats integer)
        WHERE o.id=v.id RETURNING o.id,o.seats,o.updated_at::text
      ), restored_hotels AS (
        UPDATE hotels h SET rooms=v.rooms
        FROM json_to_recordset(CAST(:hotels AS json)) AS v(id text,rooms integer)
        WHERE h.id=v.id RETURNING h.id,h.rooms
      ) SELECT id,seats,updated_at FROM restored_offers WHERE id='AX218'`,
      parameters: [
        {name: 'offers', value: {stringValue: JSON.stringify(data.offers.map(({id,seats}) => ({id,seats})))}},
        {name: 'hotels', value: {stringValue: JSON.stringify(data.hotels.map(({id,rooms}) => ({id,rooms})))}},
      ],
    };
  }
  if (typeof input.soldOut !== 'boolean' || 'reset' in input) throw new RequestError('Choose a flight stock change or a demo stock reset.');
  return {
    sql: "UPDATE offers SET seats=:seats,updated_at=now() WHERE id='AX218' RETURNING id,seats,updated_at::text",
    parameters: [{name: 'seats', value: {longValue: input.soldOut ? 0 : data.offers.find(offer => offer.id === 'AX218').seats}}],
  };
}
