"""Prepare fictional source data into Aurora, Neptune, S3 and AgentCore Memory."""
import json
from datetime import datetime, timezone
from pathlib import Path

from provision import CONFIG, ROOT, SESSION, sql


def parameters(values):
    return [{'name': k, 'value': {'stringValue': json.dumps(v) if isinstance(v, (dict, list)) else str(v)}} for k, v in values.items()]


def main():
    cfg = json.loads((ROOT / 'infra/deployed.json').read_text())
    data = json.loads((ROOT / 'data/travel.json').read_text())
    bedrock = SESSION.client('bedrock-runtime', config=CONFIG)
    s3 = SESSION.client('s3', config=CONFIG)
    graph = SESSION.client('neptune-graph', config=CONFIG)
    memory = SESSION.client('bedrock-agentcore', config=CONFIG)
    control = SESSION.client('bedrock-agentcore-control', config=CONFIG)

    def embed(text):
        response = bedrock.invoke_model(modelId=cfg['embeddingModelId'], contentType='application/json',
            body=json.dumps({'inputText': text, 'dimensions': 256, 'normalize': True}))
        with response['body'] as body:
            return json.loads(body.read())['embedding']

    ddl = [
        'CREATE TABLE IF NOT EXISTS entities (id text PRIMARY KEY, kind text NOT NULL, name text NOT NULL, aliases text[] NOT NULL DEFAULT ARRAY[]::text[], payload jsonb NOT NULL)',
        'CREATE TABLE IF NOT EXISTS offers (id text PRIMARY KEY, carrier text NOT NULL, description text NOT NULL, fare_pence integer NOT NULL CHECK(fare_pence>=0), bag_pence integer NOT NULL CHECK(bag_pence>=0), seats integer NOT NULL CHECK(seats>=0), source_id text NOT NULL, legs jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())',
        "CREATE TABLE IF NOT EXISTS hotels (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL, quiet boolean NOT NULL, walk_minutes integer NOT NULL, night_pence integer NOT NULL, rooms integer NOT NULL, source_id text NOT NULL, embedding vector(256) NOT NULL, search_text tsvector GENERATED ALWAYS AS (to_tsvector('english',name || ' ' || description)) STORED)",
        'CREATE TABLE IF NOT EXISTS definitions (id text PRIMARY KEY, definition jsonb NOT NULL, source_id text NOT NULL)',
        "CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, title text NOT NULL, body text NOT NULL, source_uri text NOT NULL, version_id text NOT NULL, embedding vector(256) NOT NULL, search_text tsvector GENERATED ALWAYS AS (to_tsvector('english',title || ' ' || body)) STORED)",
        'CREATE INDEX IF NOT EXISTS hotels_embedding_idx ON hotels USING hnsw (embedding vector_cosine_ops)',
        'CREATE INDEX IF NOT EXISTS hotels_lexical_idx ON hotels USING gin (search_text)',
        'CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops)',
        'CREATE INDEX IF NOT EXISTS documents_lexical_idx ON documents USING gin (search_text)',
    ]
    for statement in ddl:
        sql(statement, 'onward')
    entities = [('alex-onward', 'traveller', 'Alex Morgan', ['Alex', 'me', 'my'], data['traveller']),
        (data['trip']['id'], 'trip', 'Lisbon client meeting', ['my trip', 'tomorrow'], {**data['trip'], 'snapshot': data['snapshot'], 'travelDate': data['travelDate']}),
        (data['venue']['id'], 'venue', data['venue']['name'], ['my meeting', 'Lisbon meeting'], data['venue'])]
    entities += [(a['id'], 'airport', a['name'], [a['city'], a['id']], a) for a in data['airports']]
    for entity_id, kind, name, aliases, payload in entities:
        sql('INSERT INTO entities(id,kind,name,aliases,payload) VALUES(:id,:kind,:name,ARRAY(SELECT jsonb_array_elements_text(CAST(:aliases AS jsonb))),CAST(:payload AS jsonb)) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,name=excluded.name,aliases=excluded.aliases,payload=excluded.payload', 'onward', parameters(dict(id=entity_id, kind=kind, name=name, aliases=aliases, payload=payload)))
    for offer in data['offers']:
        sql('INSERT INTO offers(id,carrier,description,fare_pence,bag_pence,seats,source_id,legs) VALUES(:id,:carrier,:description,CAST(:fare AS integer),CAST(:bag AS integer),CAST(:seats AS integer),:source,CAST(:legs AS jsonb)) ON CONFLICT(id) DO UPDATE SET fare_pence=excluded.fare_pence,bag_pence=excluded.bag_pence,seats=excluded.seats,legs=excluded.legs,updated_at=now()', 'onward', parameters(dict(id=offer['id'], carrier=offer['carrier'], description=offer['description'], fare=offer['farePence'], bag=offer['bagPence'], seats=offer['seats'], source=offer['source'], legs=offer['legs'])))
    for hotel in data['hotels']:
        vector = embed(hotel['description'])
        sql('INSERT INTO hotels(id,name,description,quiet,walk_minutes,night_pence,rooms,source_id,embedding) VALUES(:id,:name,:description,CAST(:quiet AS boolean),CAST(:walk AS integer),CAST(:price AS integer),CAST(:rooms AS integer),:source,CAST(:embedding AS vector)) ON CONFLICT(id) DO UPDATE SET description=excluded.description,embedding=excluded.embedding,rooms=excluded.rooms', 'onward', parameters(dict(id=hotel['id'], name=hotel['name'], description=hotel['description'], quiet=str(hotel['quiet']).lower(), walk=hotel['walkMinutes'], price=hotel['nightPence'], rooms=hotel['rooms'], source=hotel['source'], embedding=vector)))
    definitions = {
        'trip-rules': data['rules'], 'trip-defaults': data['trip'], 'transfer': data['transfer'],
        'hotel-query-vocabulary': {'quiet': 'quiet peaceful calm courtyard residential hotel rooms', 'lively': 'lively central evening bar nightlife hotel rooms'},
        'complete-price': {'formula': 'fare_pence + bag_pence + night_pence + transfer_pence', 'currency': 'GBP', 'taxes': 'Included in supplier fare and hotel price; do not add again.', 'budgetOperator': '<'},
        'verified-example': {'id': 'complete-trip-v1', 'reviewStatus': 'Engine constraints verified by automated tests; fictional supplier data.', 'steps': ['resolve IDs', 'retrieve descriptions', 'compute complete price', 'validate path and deadline', 'recheck availability', 'rank eligible bundles'], 'invariants': ['venue arrival <= deadline', 'each connection >= minimum', 'hotel walk <= limit', 'complete total < budget', 'positive seats and rooms']}
    }
    for key, value in definitions.items():
        sql('INSERT INTO definitions(id,definition,source_id) VALUES(:id,CAST(:value AS jsonb),:source) ON CONFLICT(id) DO UPDATE SET definition=excluded.definition', 'onward', parameters(dict(id=key, value=value, source='onward-semantic-contract-v1')))
    for doc in data['sources']:
        key = f'sources/{doc["id"]}.json'
        response = s3.put_object(Bucket=cfg['bucket'], Key=key, Body=json.dumps(doc).encode(), ContentType='application/json', ServerSideEncryption='AES256')
        sql('INSERT INTO documents(id,title,body,source_uri,version_id,embedding) VALUES(:id,:title,:body,:uri,:version,CAST(:embedding AS vector)) ON CONFLICT(id) DO UPDATE SET body=excluded.body,version_id=excluded.version_id,embedding=excluded.embedding', 'onward', parameters(dict(id=doc['id'], title=doc['title'], body=doc['text'], uri=f's3://{cfg["bucket"]}/{key}', version=response['VersionId'], embedding=embed(doc['text']))))
    s3.upload_file(str(ROOT / 'data/travel.json'), cfg['bucket'], 'sources/travel-raw-v1.json', ExtraArgs={'ContentType': 'application/json', 'ServerSideEncryption': 'AES256'})
    sql('GRANT USAGE ON SCHEMA public TO onward_london_2026_reader', 'onward')
    sql('GRANT SELECT ON ALL TABLES IN SCHEMA public TO onward_london_2026_reader', 'onward')
    print('Aurora and S3 seeded: stable IDs, definitions, offers, pgvector embeddings and source versions.', flush=True)

    status = graph.get_graph(graphIdentifier=cfg['graphId'])['status']
    if status != 'AVAILABLE':
        print('Graph is still', status, '- rerun seed after it becomes AVAILABLE.', flush=True)
        return

    def cypher(query, params=None):
        result = graph.execute_query(graphIdentifier=cfg['graphId'], language='OPEN_CYPHER', queryString=query,
            parameters=params or {}, queryTimeoutMilliseconds=30000)
        with result['payload'] as body:
            return json.loads(body.read())

    for airport in data['airports']:
        cypher('MERGE (a:OnwardAirport {id:$id}) SET a.name=$name, a.timezone=$timezone', airport)
    cypher('MERGE (v:OnwardVenue {id:$id}) SET v.name=$name', {'id': data['venue']['id'], 'name': data['venue']['name']})
    for offer in data['offers']:
        cypher('MERGE (o:OnwardOffer {id:$id})', {'id': offer['id']})
        for i, leg in enumerate(offer['legs']):
            cypher('MATCH (o:OnwardOffer {id:$offer}), (a:OnwardAirport {id:$origin}), (b:OnwardAirport {id:$destination}) MERGE (l:OnwardLeg {id:$id}) SET l.sequence=$sequence,l.depart=$depart,l.arrive=$arrive MERGE (o)-[:HAS_LEG]->(l) MERGE (l)-[:DEPARTS_FROM]->(a) MERGE (l)-[:ARRIVES_AT]->(b)', {'offer': offer['id'], 'origin': leg['from'], 'destination': leg['to'], 'id': f'{offer["id"]}-{i}', 'sequence': i, 'depart': leg['depart'], 'arrive': leg['arrive']})
    t = data['transfer']
    cypher('MATCH (a:OnwardAirport {id:$origin}), (v:OnwardVenue {id:$venue}) MERGE (a)-[t:TRANSFER_TO]->(v) SET t.minutes=$minutes,t.pricePence=$price,t.source=$source', {'origin': t['from'], 'venue': t['to'], 'minutes': t['minutes'], 'price': t['pricePence'], 'source': t['source']})
    for h in data['hotels']:
        cypher('MATCH (v:OnwardVenue {id:$venue}) MERGE (h:OnwardHotel {id:$id}) SET h.name=$name MERGE (h)-[w:WALK_TO]->(v) SET w.minutes=$minutes', {'venue': data['venue']['id'], 'id': h['id'], 'name': h['name'], 'minutes': h['walkMinutes']})
    print('Neptune seeded: actual flight legs, airport transfers and hotel-to-venue edges.', flush=True)
    mem = control.get_memory(memoryId=cfg['memoryId'])['memory']
    if mem['status'] != 'ACTIVE':
        print('Memory is still', mem['status'], '- rerun seed when ACTIVE.', flush=True)
        return
    if not cfg.get('memorySeedEventId'):
        event = memory.create_event(memoryId=cfg['memoryId'], actorId='alex-onward', sessionId='onward-onboarding-2026',
            eventTimestamp=datetime.now(timezone.utc), payload=[
                {'conversational': {'role': 'USER', 'content': {'text': data['memory']['quote']}}},
                {'conversational': {'role': 'ASSISTANT', 'content': {'text': 'I will remember that you prefer quiet hotels, walking to meetings and one checked bag for work trips.'}}}])
        cfg['memorySeedEventId'] = event['event']['eventId']
        (ROOT / 'infra/deployed.json').write_text(json.dumps(cfg, indent=2) + '\n')
    print('AgentCore onboarding conversation stored; built-in preference extraction is asynchronous.', flush=True)
    from seed_preferences import main as seed_traveller_preferences
    seed_traveller_preferences()


if __name__ == '__main__':
    main()
