import http from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {BedrockAgentCoreClient, InvokeAgentRuntimeCommand, StopRuntimeSessionCommand} from '@aws-sdk/client-bedrock-agentcore';
import {BedrockAgentCoreControlClient, GetAgentRuntimeCommand, GetMemoryCommand} from '@aws-sdk/client-bedrock-agentcore-control';
import {STSClient, GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {RDSDataClient, ExecuteStatementCommand} from '@aws-sdk/client-rds-data';
import {NeptuneGraphClient, GetGraphCommand} from '@aws-sdk/client-neptune-graph';
import {S3Client, HeadObjectCommand} from '@aws-sdk/client-s3';

const root=import.meta.dirname, port=Number(process.env.TRAVEL_DEMO_PORT||4318);
const region='us-east-1', account='619763002613';
const runtime=new BedrockAgentCoreClient({region,maxAttempts:2});
const control=new BedrockAgentCoreControlClient({region,maxAttempts:2});
const sts=new STSClient({region,maxAttempts:2}), rds=new RDSDataClient({region,maxAttempts:2});
const neptune=new NeptuneGraphClient({region,maxAttempts:2}), s3=new S3Client({region,maxAttempts:2});
const active=new Map(), knownSessions=new Set();
let cachedHealth=null;
const config=async()=>JSON.parse(await readFile(resolve(root,'infra/deployed.json'),'utf8'));
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const event=(res,data)=>res.write('data: '+JSON.stringify(data)+'\n\n');
const sessionValid=s=>typeof s==='string'&&/^onward-[a-zA-Z0-9-]{32,80}$/.test(s);
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)throw new Error('Request is too large.');}return JSON.parse(raw);}
async function checkAccount(){const identity=await sts.send(new GetCallerIdentityCommand({}));if(identity.Account!==account)throw new Error('The active AWS credentials belong to a different account.');return identity;}

async function health(){
  if(cachedHealth&&Date.now()-cachedHealth.saved<30000)return cachedHealth.value;
  const cfg=await config();const identity=await checkAccount();
  const checks=await Promise.allSettled([
    rds.send(new ExecuteStatementCommand({resourceArn:cfg.clusterArn,secretArn:cfg.secretArn,database:cfg.database,sql:'SELECT current_database() AS database,(SELECT count(*) FROM offers) AS offers,(SELECT count(*) FROM hotels) AS hotels,(SELECT seats FROM offers WHERE id=\'AX218\') AS ax218_seats,(SELECT extversion FROM pg_extension WHERE extname=\'vector\') AS pgvector',formatRecordsAs:'JSON'})),
    control.send(new GetAgentRuntimeCommand({agentRuntimeId:cfg.runtimeId})),
    control.send(new GetMemoryCommand({memoryId:cfg.memoryId})),
    neptune.send(new GetGraphCommand({graphIdentifier:cfg.graphId})),
    s3.send(new HeadObjectCommand({Bucket:cfg.bucket,Key:'sources/travel-raw-v1.json'}))
  ]);
  const names=['Aurora PostgreSQL','AgentCore Runtime','AgentCore Memory','Neptune Analytics','Amazon S3'];
  const services=checks.map((check,i)=>({name:names[i],ok:check.status==='fulfilled',
    status:check.status==='fulfilled'?(check.value.status||check.value.memory?.status||'CONNECTED'):(check.reason.name||'Unavailable'),
    requestId:check.status==='fulfilled'?check.value.$metadata?.requestId:null,
    ...(i===0&&check.status==='fulfilled'?{details:JSON.parse(check.value.formattedRecords)[0]}:{})}));
  const value={ok:services.every(s=>s.ok&&(!['AgentCore Runtime','AgentCore Memory','Neptune Analytics'].includes(s.name)||['READY','ACTIVE','AVAILABLE'].includes(s.status))),
    accountId:identity.Account,region,services,cluster:cfg.clusterId,database:cfg.database,model:cfg.modelId,
    runtimeId:cfg.runtimeId,memoryId:cfg.memoryId,graphId:cfg.graphId,bucket:cfg.bucket,models:cfg.selectableModels||{},checkedAt:new Date().toISOString(),
    fixtureDate:'2026-09-15',supplierData:'fictional'};
  cachedHealth={saved:Date.now(),value};return value;
}

async function chat(req,res){
  const input=await body(req);
  if(!sessionValid(input.sessionId)||typeof input.message!=='string'||!input.message.trim()||input.message.length>4000)return json(res,400,{error:'Enter a message of 1–4,000 characters in a valid session.'});
  if(active.has(input.sessionId))return json(res,409,{error:'This conversation is already resolving a request.'});
  if(active.size>=2)return json(res,429,{error:'Two requests are already running. Try again when one finishes.'});
  const cfg=await config();await checkAccount();
  const runId=randomUUID(), abort=new AbortController();active.set(input.sessionId,abort);knownSessions.add(input.sessionId);
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
  event(res,{type:'connection',runId,message:'Connecting to AgentCore Runtime…'});
  const recorded=[];const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),15000);
  res.on('close',()=>abort.abort());
  try{
    const result=await runtime.send(new InvokeAgentRuntimeCommand({agentRuntimeArn:cfg.runtimeArn,
      runtimeSessionId:input.sessionId,qualifier:'DEFAULT',contentType:'application/json',accept:'text/event-stream',
      payload:Buffer.from(JSON.stringify({message:input.message.trim(),sessionId:input.sessionId,runId,
        ...(typeof input.memoryEnabled==='boolean'?{memoryEnabled:input.memoryEnabled}:{}),
        ...(typeof input.modelId==='string'?{modelId:input.modelId}:{})}))}),{abortSignal:abort.signal});
    for await(const chunk of result.response){const bytes=Buffer.from(chunk);recorded.push(bytes);if(!res.destroyed)res.write(bytes);}
  }catch(error){
    if(error.name!=='AbortError')event(res,{type:'error',runId,message:`${error.name||'Connection error'}: the live agent could not complete this request. Retry or check AWS connection details.`,requestId:error.$metadata?.requestId});
  }finally{
    clearInterval(heartbeat);active.delete(input.sessionId);
    if(recorded.length){await mkdir(resolve(root,'.local/runs'),{recursive:true});await writeFile(resolve(root,'.local/runs',runId+'.sse'),Buffer.concat(recorded));}
    if(!res.destroyed)res.end();
  }
}

const staticFiles=new Set(['index.html','app.js','presentation.js','style.css','data/travel.js','data/travel.json','data/README.md']);
const types={'.jpg':'image/jpeg','.svg':'image/svg+xml','.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const requestUrl=new URL(req.url,`http://localhost:${port}`), path=requestUrl.pathname;
    const host=(req.headers.host||'').split(':')[0];
    if(!['localhost','127.0.0.1'].includes(host))return json(res,403,{error:'Local requests only.'});
    if(req.headers.origin&&!new Set([`http://localhost:${port}`,`http://127.0.0.1:${port}`]).has(req.headers.origin))return json(res,403,{error:'Origin not allowed.'});
    if(req.method==='GET'&&path==='/api/health')return json(res,200,await health());
    if(req.method==='POST'){
      if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'JSON requests are required.'});
      if(path==='/api/chat')return await chat(req,res);
      if(path==='/api/stop'){
        const input=await body(req);
        if(!knownSessions.has(input.sessionId))return json(res,400,{error:'Unknown local session.'});
        active.get(input.sessionId)?.abort();const cfg=await config();
        await runtime.send(new StopRuntimeSessionCommand({agentRuntimeArn:cfg.runtimeArn,runtimeSessionId:input.sessionId,qualifier:'DEFAULT'}));
        return json(res,200,{stopped:true});
      }
      if(path==='/api/scenario'){
        const input=await body(req);if(typeof input.soldOut!=='boolean')return json(res,400,{error:'soldOut must be a boolean.'});
        if(active.size)return json(res,409,{error:'Wait for the current run to finish before changing inventory.'});
        const cfg=await config();await checkAccount();
        // Changes exactly one fictional offer in Onward, never Meridian data.
        const result=await rds.send(new ExecuteStatementCommand({resourceArn:cfg.clusterArn,
          secretArn:'arn:aws:secretsmanager:us-east-1:619763002613:secret:meridian-demo-credentials-W0pH9X',
          database:'onward',sql:"UPDATE offers SET seats=:seats,updated_at=now() WHERE id='AX218' RETURNING id,seats,updated_at::text",
          parameters:[{name:'seats',value:{longValue:input.soldOut?0:4}}],formatRecordsAs:'JSON'}));
        cachedHealth=null;return json(res,200,{offer:JSON.parse(result.formattedRecords)[0],requestId:result.$metadata.requestId});
      }
    }
    if(req.method!=='GET')return json(res,405,{error:'Method not allowed.'});
    const relative=decodeURIComponent(['/','/prepare','/briefing'].includes(path)?'/index.html':path).slice(1);
    if(!staticFiles.has(relative)&&!relative.startsWith('assets/'))return json(res,404,{error:'Not found.'});
    const file=resolve(root,relative);if(!file.startsWith(root+sep)||(relative.startsWith('assets/')&&!file.startsWith(resolve(root,'assets')+sep)))return json(res,403,{error:'Forbidden.'});
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache',
      'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});res.end(content);
  }catch(error){if(!res.headersSent)json(res,500,{error:error.message?.includes('different account')?error.message:`${error.name||'Error'}: unable to complete the local AWS request.`});else if(!res.destroyed)res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Onward live concierge: http://localhost:${port}`));
