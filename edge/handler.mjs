// Onward's published API. Mirrors the local server.mjs routes so the CloudFront site
// behaves identically to http://localhost:4318, but runs under the Lambda execution role.
// The browser never receives AWS credentials; CloudFront is the only permitted caller.
import {BedrockAgentCoreClient, InvokeAgentRuntimeCommand, StopRuntimeSessionCommand} from '@aws-sdk/client-bedrock-agentcore';
import {BedrockAgentCoreControlClient, GetAgentRuntimeCommand, GetGatewayCommand, GetMemoryCommand} from '@aws-sdk/client-bedrock-agentcore-control';
import {STSClient, GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {RDSDataClient, ExecuteStatementCommand} from '@aws-sdk/client-rds-data';
import {NeptuneGraphClient, GetGraphCommand} from '@aws-sdk/client-neptune-graph';
import {S3Client, HeadObjectCommand} from '@aws-sdk/client-s3';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const region='us-east-1', account='619763002613';
const runtime=new BedrockAgentCoreClient({region,maxAttempts:2});
const control=new BedrockAgentCoreControlClient({region,maxAttempts:2});
const sts=new STSClient({region,maxAttempts:2}), rds=new RDSDataClient({region,maxAttempts:2});
const neptune=new NeptuneGraphClient({region,maxAttempts:2}), s3=new S3Client({region,maxAttempts:2});
const EDGE_SECRET=process.env.ONWARD_EDGE_SECRET||'';
const READER_SECRET=process.env.ONWARD_SCENARIO_SECRET||'';
let cachedConfig=null, cachedHealth=null;

const config=async()=>cachedConfig??=JSON.parse(await readFile(new URL('./deployed.json',import.meta.url),'utf8'));
const sessionValid=s=>typeof s==='string'&&/^onward-[a-zA-Z0-9-]{32,80}$/.test(s);
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

async function checkAccount(){
  const identity=await sts.send(new GetCallerIdentityCommand({}));
  if(identity.Account!==account)throw new Error('The active AWS credentials belong to a different account.');
  return identity;
}

async function health(){
  if(cachedHealth&&Date.now()-cachedHealth.saved<30000)return cachedHealth.value;
  const cfg=await config(), identity=await checkAccount();
  const checks=await Promise.allSettled([
    rds.send(new ExecuteStatementCommand({resourceArn:cfg.clusterArn,secretArn:cfg.secretArn,database:cfg.database,sql:'SELECT current_database() AS database,(SELECT count(*) FROM offers) AS offers,(SELECT count(*) FROM hotels) AS hotels,(SELECT seats FROM offers WHERE id=\'AX218\') AS ax218_seats,(SELECT extversion FROM pg_extension WHERE extname=\'vector\') AS pgvector',formatRecordsAs:'JSON'})),
    control.send(new GetAgentRuntimeCommand({agentRuntimeId:cfg.runtimeId})),
    control.send(new GetMemoryCommand({memoryId:cfg.memoryId})),
    control.send(new GetGatewayCommand({gatewayIdentifier:cfg.gatewayId})),
    neptune.send(new GetGraphCommand({graphIdentifier:cfg.graphId})),
    s3.send(new HeadObjectCommand({Bucket:cfg.bucket,Key:'sources/travel-raw-v1.json'}))
  ]);
  const names=['Aurora PostgreSQL','AgentCore Runtime','AgentCore Memory','AgentCore Gateway','Neptune Analytics','Amazon S3'];
  const services=checks.map((check,i)=>({name:names[i],ok:check.status==='fulfilled',
    status:check.status==='fulfilled'?(check.value.status||check.value.memory?.status||'CONNECTED'):(check.reason.name||'Unavailable'),
    requestId:check.status==='fulfilled'?check.value.$metadata?.requestId:null,
    ...(i===0&&check.status==='fulfilled'?{details:JSON.parse(check.value.formattedRecords)[0]}:{})}));
  const value={ok:services.every(s=>s.ok&&(!['AgentCore Runtime','AgentCore Memory','AgentCore Gateway','Neptune Analytics'].includes(s.name)||['READY','ACTIVE','AVAILABLE'].includes(s.status))),
    accountId:identity.Account,region,services,cluster:cfg.clusterId,database:cfg.database,model:cfg.modelId,
    runtimeId:cfg.runtimeId,memoryId:cfg.memoryId,gatewayId:cfg.gatewayId,policyEngineId:cfg.policyEngineId,graphId:cfg.graphId,bucket:cfg.bucket,models:cfg.selectableModels||{},checkedAt:new Date().toISOString(),
    fixtureDate:'2026-09-15',supplierData:'fictional'};
  cachedHealth={saved:Date.now(),value};return value;
}

const parseBody=event=>{
  const raw=event.isBase64Encoded?Buffer.from(event.body||'',
    'base64').toString('utf8'):(event.body||'');
  if(raw.length>16000)throw new Error('Request is too large.');
  return JSON.parse(raw||'{}');
};

function send(stream,status,value){
  const body=JSON.stringify(value);
  stream=awslambda.HttpResponseStream.from(stream,{statusCode:status,headers:HEADERS});
  stream.write(body);stream.end();
}

export const handler=awslambda.streamifyResponse(async(event,responseStream)=>{
  const headers=Object.fromEntries(Object.entries(event.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));
  const method=event.requestContext?.http?.method||'GET';
  const path=(event.rawPath||'/').replace(/\/+$/,'')||'/';
  try{
    // Only CloudFront may reach this function; the shared secret is injected as an origin header.
    if(!EDGE_SECRET||headers['x-onward-edge']!==EDGE_SECRET)return send(responseStream,403,{error:'Direct origin access is not permitted.'});
    if(method==='GET'&&path==='/api/health')return send(responseStream,200,await health());
    if(method!=='POST')return send(responseStream,405,{error:'Method not allowed.'});
    if(!(headers['content-type']||'').startsWith('application/json'))return send(responseStream,415,{error:'JSON requests are required.'});

    if(path==='/api/chat'){
      const input=parseBody(event);
      if(!sessionValid(input.sessionId)||typeof input.message!=='string'||!input.message.trim()||input.message.length>4000)
        return send(responseStream,400,{error:'Enter a message of 1–4,000 characters in a valid session.'});
      const cfg=await config();await checkAccount();
      const runId=randomUUID();
      const stream=awslambda.HttpResponseStream.from(responseStream,{statusCode:200,
        headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
      stream.write('data: '+JSON.stringify({type:'connection',runId,message:'Connecting to AgentCore Runtime…'})+'\n\n');
      try{
        const result=await runtime.send(new InvokeAgentRuntimeCommand({agentRuntimeArn:cfg.runtimeArn,
          runtimeSessionId:input.sessionId,qualifier:'DEFAULT',contentType:'application/json',accept:'text/event-stream',
          payload:Buffer.from(JSON.stringify({message:input.message.trim(),sessionId:input.sessionId,runId,
            ...(typeof input.memoryEnabled==='boolean'?{memoryEnabled:input.memoryEnabled}:{}),
            ...(input.confirmBooking===true?{confirmBooking:true}:{}),
            ...(typeof input.modelId==='string'?{modelId:input.modelId}:{})}))}));
        for await(const chunk of result.response)stream.write(Buffer.from(chunk));
      }catch(error){
        stream.write('data: '+JSON.stringify({type:'error',runId,
          message:`${error.name||'Connection error'}: the live agent could not complete this request. Retry or check AWS connection details.`,
          requestId:error.$metadata?.requestId})+'\n\n');
      }
      return stream.end();
    }

    if(path==='/api/stop'){
      const input=parseBody(event);
      if(!sessionValid(input.sessionId))return send(responseStream,400,{error:'Unknown session.'});
      const cfg=await config();
      await runtime.send(new StopRuntimeSessionCommand({agentRuntimeArn:cfg.runtimeArn,runtimeSessionId:input.sessionId,qualifier:'DEFAULT'}));
      return send(responseStream,200,{stopped:true});
    }

    if(path==='/api/scenario'){
      const input=parseBody(event);
      if(typeof input.soldOut!=='boolean')return send(responseStream,400,{error:'soldOut must be a boolean.'});
      const cfg=await config();await checkAccount();
      // Changes exactly one fictional offer in Onward, never Meridian data.
      const secretArn=READER_SECRET||cfg.secretArn;
      const result=await rds.send(new ExecuteStatementCommand({resourceArn:cfg.clusterArn,secretArn,
        database:'onward',sql:"UPDATE offers SET seats=:seats,updated_at=now() WHERE id='AX218' RETURNING id,seats,updated_at::text",
        parameters:[{name:'seats',value:{longValue:input.soldOut?0:4}}],formatRecordsAs:'JSON'}));
      let hotels=null;
      if(!input.soldOut){
        // Restoring availability also returns rehearsal bookings' rooms to the seeded counts.
        const seeded=JSON.parse(await readFile(new URL('./travel.json',import.meta.url),'utf8')).hotels.map(h=>({id:h.id,rooms:h.rooms}));
        const rooms=await rds.send(new ExecuteStatementCommand({resourceArn:cfg.clusterArn,secretArn,database:'onward',
          sql:"UPDATE hotels h SET rooms=v.rooms FROM json_to_recordset(CAST(:rooms AS json)) AS v(id text,rooms integer) WHERE h.id=v.id RETURNING h.id,h.rooms",parameters:[{name:'rooms',value:{stringValue:JSON.stringify(seeded)}}],formatRecordsAs:'JSON'}));
        hotels=JSON.parse(rooms.formattedRecords);
      }
      cachedHealth=null;
      return send(responseStream,200,{offer:JSON.parse(result.formattedRecords)[0],hotels,requestId:result.$metadata.requestId});
    }
    return send(responseStream,404,{error:'Not found.'});
  }catch(error){
    try{send(responseStream,500,{error:error.message?.includes('different account')?error.message:`${error.name||'Error'}: unable to complete the AWS request.`});}
    catch{responseStream.end();}
  }
});
