"""AWS adapters shared by the runtime and the tool Lambda. Credentials come from the role.

This module imports only boto3 so the tool Lambda stays small; model selection lives in models.py.
"""
import json
import os
from pathlib import Path

import boto3
from botocore.config import Config

CONFIG_PATH = Path(os.environ.get('ONWARD_CONFIG', Path(__file__).resolve().parent / 'deployed.json'))
if not CONFIG_PATH.exists():
    CONFIG_PATH = Path(__file__).resolve().parents[1] / 'infra/deployed.json'
SETTINGS = json.loads(CONFIG_PATH.read_text())
SESSION = boto3.Session(region_name=SETTINGS['region'])
CONFIG = Config(connect_timeout=8, read_timeout=180, retries={'total_max_attempts': 3, 'mode': 'standard'})
DB = SESSION.client('rds-data', config=CONFIG)
MODEL = SESSION.client('bedrock-runtime', config=CONFIG)
MEMORY = SESSION.client('bedrock-agentcore', config=CONFIG)
GRAPH = SESSION.client('neptune-graph', config=CONFIG)
S3 = SESSION.client('s3', config=CONFIG)


def _parameters(values):
    params = []
    for key, value in (values or {}).items():
        if isinstance(value, bool):
            field = {'booleanValue': value}
        elif isinstance(value, int):
            field = {'longValue': value}
        else:
            field = {'stringValue': json.dumps(value) if isinstance(value, (list, dict)) else str(value)}
        params.append({'name': key, 'value': field})
    return params


def db(query, values=None, secret_arn=None):
    """Run one parameterised statement through the Data API with the reader secret by default."""
    response = DB.execute_statement(resourceArn=SETTINGS['clusterArn'], secretArn=secret_arn or SETTINGS['secretArn'],
        database=SETTINGS['database'], sql=query, parameters=_parameters(values), formatRecordsAs='JSON')
    rows = json.loads(response.get('formattedRecords', '[]'))
    # The Data API's JSON format represents PostgreSQL jsonb columns as strings.
    for row in rows:
        for key in ('definition', 'payload', 'legs'):
            if isinstance(row.get(key), str):
                row[key] = json.loads(row[key])
    return rows, response['ResponseMetadata']['RequestId']


def db_write(query, values=None):
    """Run a statement with the writer secret. Only the booking tool uses this."""
    writer = SETTINGS.get('writerSecretArn')
    if not writer:
        raise RuntimeError('No writer secret is deployed; run scripts/provision_gateway.py first.')
    return db(query, values, writer)


def graph(query, params=None):
    response = GRAPH.execute_query(graphIdentifier=SETTINGS['graphId'], queryString=query,
        language='OPEN_CYPHER', parameters=params or {}, queryTimeoutMilliseconds=30000)
    with response['payload'] as body:
        data = json.loads(body.read())
    return data.get('results', data), response['ResponseMetadata']['RequestId']


def embed(text):
    response = MODEL.invoke_model(modelId=SETTINGS['embeddingModelId'], contentType='application/json',
        body=json.dumps({'inputText': text[:8000], 'dimensions': 256, 'normalize': True}))
    with response['body'] as body:
        vector = json.loads(body.read())['embedding']
    return vector, response['ResponseMetadata']['RequestId']


HOTEL_SEARCH = """WITH scored AS (
 SELECT id,name,description,quiet,walk_minutes,night_pence,rooms,source_id,
        1-(embedding <=> CAST(:embedding AS vector)) AS similarity,
        ts_rank_cd(search_text,websearch_to_tsquery('english',:lexical)) AS lexical_score
 FROM hotels
), ranked AS (
 SELECT *, row_number() OVER(ORDER BY similarity DESC,id) AS vector_rank,
 CASE WHEN lexical_score>0 THEN row_number() OVER(ORDER BY lexical_score DESC,id) END AS lexical_rank
 FROM scored
)
SELECT *, 1.0/(60+vector_rank)+CASE WHEN lexical_rank IS NULL THEN 0 ELSE 1.0/(60+lexical_rank) END AS rrf_score
FROM ranked ORDER BY rrf_score DESC,id LIMIT 10"""

PRICE_QUERY = """SELECT o.id AS offer_id,h.id AS hotel_id,
 o.fare_pence,o.bag_pence*:bags AS bags_pence,h.night_pence*:nights AS hotel_pence,
 CAST(:transfer AS integer) AS transfer_pence,
 o.fare_pence+o.bag_pence*:bags+h.night_pence*:nights+:transfer AS total_pence,
 o.seats,o.aisle_seats,o.window_seats,o.seat_selection_included,o.seat_source_id,h.rooms,o.updated_at::text AS checked_at
FROM offers o CROSS JOIN hotels h ORDER BY o.id,h.id"""

OFFER_QUERY = """SELECT id,carrier,description,fare_pence,bag_pence,seats,aisle_seats,window_seats,
 seat_selection_included,seat_source_id,source_id FROM offers ORDER BY id"""

LEG_QUERY = """MATCH (o:OnwardOffer)-[:HAS_LEG]->(l:OnwardLeg),
 (l)-[:DEPARTS_FROM]->(a:OnwardAirport), (l)-[:ARRIVES_AT]->(b:OnwardAirport)
RETURN o.id AS offer_id,l.sequence AS sequence,a.id AS origin,b.id AS destination,
 l.depart AS depart,l.arrive AS arrive ORDER BY offer_id,sequence"""

TRANSFER_QUERY = """MATCH (a:OnwardAirport {id:$airport})-[t:TRANSFER_TO]->(v:OnwardVenue {id:$venue})
RETURN t.minutes AS minutes,t.pricePence AS price_pence,t.source AS source_id,v.id AS venue_id"""

WALK_QUERY = """MATCH (h:OnwardHotel)-[w:WALK_TO]->(v:OnwardVenue {id:$venue})
RETURN h.id AS hotel_id,w.minutes AS minutes"""

# One atomic statement: the booking row exists only if a seat and a room were still available.
BOOKING_QUERY = """WITH offer AS (
 UPDATE offers SET seats=seats-1,updated_at=now() WHERE id=:offer AND seats>0 RETURNING id,seats
), hotel AS (
 UPDATE hotels SET rooms=rooms-1 WHERE id=:hotel AND rooms>0 RETURNING id,rooms
), booked AS (
 INSERT INTO bookings(id,session_id,traveller_id,offer_id,hotel_id,total_pence,policy_decision)
 SELECT :booking,:session,:traveller,offer.id,hotel.id,CAST(:total AS integer),:policy FROM offer,hotel
 RETURNING id,offer_id,hotel_id,total_pence,created_at::text AS created_at
)
SELECT booked.*,offer.seats AS seats_left,hotel.rooms AS rooms_left FROM booked,offer,hotel"""
