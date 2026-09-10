"""AWS adapters. Credentials come from the runtime role or the local AWS chain."""
import json
import os
from pathlib import Path

import boto3
from botocore.config import Config
from strands.models import BedrockModel

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

# The presenter can swap the language model per run. The allowlist lives in deployed.json so
# the runtime, the local proxy and the browser all read one list, and a request can never point
# the runtime at a model its execution role is not scoped to invoke.
SELECTABLE_MODELS = SETTINGS.get('selectableModels') or {SETTINGS['modelId']: SETTINGS['modelId']}


def resolve_model_id(requested):
    """Return an allowlisted model id, falling back to the deployed default."""
    return requested if requested in SELECTABLE_MODELS else SETTINGS['modelId']


def language_model(model_id, max_tokens):
    """A Strands model for one call. Temperature is left at the provider default because
    current Claude models reject the parameter; determinism comes from the typed contract."""
    return BedrockModel(model_id=model_id, max_tokens=max_tokens,
                        boto_session=SESSION, boto_client_config=CONFIG)


def db(query, values=None):
    params = []
    for key, value in (values or {}).items():
        if isinstance(value, bool):
            field = {'booleanValue': value}
        elif isinstance(value, int):
            field = {'longValue': value}
        else:
            field = {'stringValue': json.dumps(value) if isinstance(value, (list, dict)) else str(value)}
        params.append({'name': key, 'value': field})
    response = DB.execute_statement(resourceArn=SETTINGS['clusterArn'], secretArn=SETTINGS['secretArn'],
        database=SETTINGS['database'], sql=query, parameters=params, formatRecordsAs='JSON')
    rows = json.loads(response.get('formattedRecords', '[]'))
    # The Data API's JSON format represents PostgreSQL jsonb columns as strings.
    for row in rows:
        for key in ('definition', 'payload', 'legs'):
            if isinstance(row.get(key), str):
                row[key] = json.loads(row[key])
    return rows, response['ResponseMetadata']['RequestId']


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

LEG_QUERY = """MATCH (o:OnwardOffer)-[:HAS_LEG]->(l:OnwardLeg),
 (l)-[:DEPARTS_FROM]->(a:OnwardAirport), (l)-[:ARRIVES_AT]->(b:OnwardAirport)
RETURN o.id AS offer_id,l.sequence AS sequence,a.id AS origin,b.id AS destination,
 l.depart AS depart,l.arrive AS arrive ORDER BY offer_id,sequence"""

TRANSFER_QUERY = """MATCH (a:OnwardAirport {id:$airport})-[t:TRANSFER_TO]->(v:OnwardVenue {id:$venue})
RETURN t.minutes AS minutes,t.pricePence AS price_pence,t.source AS source_id,v.id AS venue_id"""

WALK_QUERY = """MATCH (h:OnwardHotel)-[w:WALK_TO]->(v:OnwardVenue {id:$venue})
RETURN h.id AS hotel_id,w.minutes AS minutes"""
