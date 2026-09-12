// Test the shipped application state transitions. Native browser checks cover actual layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {travelData as data} from '../data/travel.js';
import * as presentation from '../presentation.js';
import {readEvents} from '../stream.js';
import {createAnswerReveal} from '../answer-reveal.js';

const source = (await readFile(new URL('../app.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
const tick = () => new Promise(resolve => setImmediate(resolve));
class Element {
  innerHTML=''; textContent=''; value=''; disabled=false; hidden=false; isConnected=true;
  clientHeight=800; scrollHeight=800; scrollTop=0;
  classList={add(){},remove(){},toggle(){}};
  style={setProperty(){}};
  attrs={};
  setAttribute(k,v){this.attrs[k]=v;} removeAttribute(k){delete this.attrs[k];}
  querySelector(){return null;} querySelectorAll(){return [];} closest(){return this;}
  addEventListener(){} focus(){} showModal(){} close(){} scrollTo(){}
  getBoundingClientRect(){return {top:0,bottom:800,height:800};}
}
function response(events) {return new Response(events.map(event=>'data: '+JSON.stringify(event)+'\n\n').join(''));}
async function app(fetchChat=async()=>response([{type:'answer',text:'Ready',kind:'clarify'},{type:'done'}]),smooth=false) {
  const frames=new Map();let frameId=0,frameTime=0;
  const advanceFrames=(count=1)=>{for(let i=0;i<count;i++){frameTime+=16;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(frameTime));}};
  const elements=new Map(), get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const doc={getElementById:get,querySelector:selector=>get(selector),querySelectorAll:()=>[],body:get('body'),documentElement:get('root'),addEventListener(){},activeElement:null};
  const ctx=vm.createContext({data,...presentation,readEvents,createAnswerReveal,document:doc,window:{addEventListener(){}},
    location:{pathname:'/'},history:{pushState(){}},crypto:webcrypto,TextEncoder,TextDecoder,AbortController,AbortSignal,
    setTimeout,clearTimeout,setInterval,clearInterval,innerWidth:1728,matchMedia:()=>({matches:!smooth}),
    requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),
    ResizeObserver:class{observe(){}},console,
    fetch:async(path,options)=>path.startsWith('/api/health')?Response.json({ok:true,models:{},services:[]}):path==='/api/stop'?Response.json({stopped:true}):fetchChat(path,options)});
  vm.runInContext(source+'\nthis.review={state,submit,apply,action,revealOne,stopRequest,isBusy,bookRow,layerResolution,cancelFold,renderTraces};',ctx);
  await tick(); await tick();
  ctx.review.state.health={ok:true};ctx.review.state.presenter=true;
  return {...ctx.review,elements,advanceFrames};
}
function revealAll(a){while(a.state.cursor<a.state.queue.length)a.revealOne();}

test('buffered presenter playback keeps the composer locked until the completed answer is shown',async()=>{
  const a=await app();await a.submit('Recover the trip');
  assert.equal(a.state.active,null);
  assert.equal(a.isBusy(),true);
  assert.equal(a.elements.get('composer').disabled,true);
  await a.submit('A premature follow-up');
  assert.equal(a.state.messages.length,2);
  revealAll(a);
  assert.equal(a.isBusy(),false);
  assert.equal(a.elements.get('composer').disabled,false);
});
test('progress counts shown steps while a completed run waits for the presenter',async()=>{
  const events=Array.from({length:6},(_,layer)=>({type:'trace',id:'step-'+layer,layer,phase:'result',summary:'Checked',evidence:{}}));
  const a=await app(async()=>response([...events,{type:'answer',text:'Ready'},{type:'done'}]));
  await a.submit('Recover');
  a.revealOne();
  assert.equal(a.state.active,null);
  assert.match(a.elements.get('trace-progress').innerHTML,/1 of 6 steps shown/);
  assert.doesNotMatch(a.elements.get('trace-progress').innerHTML,/checks complete/);
  revealAll(a);
  assert.match(a.elements.get('trace-progress').innerHTML,/6 of 6 steps shown/);
});
test('a confirmed booking has its own progress and updates current stock only once',async()=>{
  const booking={reference:'ONW-TEST',offerId:'AX218',hotelId:'patio-house',totalPence:49000,seatsLeft:1,roomsLeft:0,createdAt:'2026-09-15'};
  const events=[{type:'trace',id:'goal',layer:0,phase:'result',summary:'Goal',evidence:{request:{action:'book'}}},
    {type:'trace',id:'booking',layer:6,phase:'result',summary:'Allowed',evidence:{}},
    {type:'booking',booking},{type:'answer',text:'Confirmed'},{type:'done'}];
  const a=await app(async()=>response(events));
  await a.submit('Book the trip',{confirmBooking:true});revealAll(a);
  assert.match(a.elements.get('trace-progress').innerHTML,/Booking confirmed/);
  assert.doesNotMatch(a.elements.get('trace-progress').innerHTML,/of 6|progressbar/);
  assert.doesNotMatch(a.elements.get('layers').innerHTML,/data-layer="[1-5]"/);
  assert.equal(a.elements.get('stock-label').textContent,'1 seat');
  a.elements.get('stock-label').textContent='Current stock';
  await a.action('replay');revealAll(a);
  assert.equal(a.elements.get('stock-label').textContent,'Current stock');
  assert.match(a.elements.get('announcement').textContent,/Recorded booking confirmation.*no new reservation/);
});
test('a refused booking does not show an incomplete six-step search',async()=>{
  const events=[{type:'trace',id:'goal',layer:0,phase:'result',summary:'Goal',evidence:{request:{action:'book'}}},
    {type:'trace',id:'booking',layer:6,phase:'result',error:true,summary:'Refused',evidence:{}},
    {type:'booking',booking:null,policyDecision:'deny',refused:'Carrier rule'},
    {type:'answer',text:'Nothing reserved'},{type:'done'}];
  const a=await app(async()=>response(events));
  await a.submit('Book it');revealAll(a);
  assert.match(a.elements.get('trace-progress').innerHTML,/Booking refused/);
  assert.doesNotMatch(a.elements.get('trace-progress').innerHTML,/of 6|Booking confirmed/);
  const savedEvents=Array.from({length:6},(_,layer)=>({type:'trace',id:'earlier-'+layer,layer,phase:'result',summary:'Checked',evidence:{}}));
  a.state.messages.push({role:'assistant',turn:42,savedEvents});
  a.state.inspectedTurn=42;a.renderTraces();
  assert.match(a.elements.get('trace-progress').innerHTML,/6 of 6 steps shown/);
  assert.match(a.elements.get('layers').innerHTML,/data-layer="5"/);
});
test('replay begins with no completed steps from the original run',async()=>{
  const a=await app(async()=>response([{type:'trace',id:'step',layer:0,phase:'result',summary:'Goal',evidence:{request:{budgetPence:65000,deadline:'14:00'}}},{type:'answer',text:'Ready'},{type:'done'}]));
  await a.submit('Recover');revealAll(a);
  assert.equal(a.state.messages[1].steps.length,1);
  await a.action('replay');
  assert.equal(a.state.messages[1].steps.length,0);
  assert.equal(a.state.visible.length,0);
  assert.equal(a.state.messages[1].text,'');
  assert.equal(a.bookRow(1),'');
});
test('an old request finishing after Stop cannot overwrite a newer request',async()=>{
  const pending=[];
  const a=await app(()=>new Promise(resolve=>pending.push(resolve)));
  const first=a.submit('First');
  while(pending.length<1)await tick();
  await a.stopRequest();
  const second=a.submit('Second');
  while(pending.length<2)await tick();
  const active=a.state.active;
  pending[0](response([{type:'answer',text:'Old answer'},{type:'done'}]));
  await first;
  assert.equal(a.state.active,active);
  assert.equal(a.state.queue.length,0);
  pending[1](response([{type:'answer',text:'New answer'},{type:'done'}]));
  await second;revealAll(a);
  assert.equal(a.state.messages.at(-1).text,'New answer');
  assert.equal(a.state.queue.some(event=>event.text==='Old answer'),false);
});
test('stopping a booking does not claim that no reservation happened',async()=>{
  const a=await app();
  a.state.messages=[{role:'assistant',turn:1,bookingTurn:true,pending:true,text:''}];
  await a.stopRequest();
  assert.match(a.state.messages[0].failed,/may already have completed/);
  assert.doesNotMatch(a.state.messages[0].failed,/nothing.*reserved|no itinerary was reserved/i);
});
test('evidence summaries use the changed budget and walking limit',async()=>{
  const a=await app(),request={budgetPence:45000,bags:0,maxWalkMinutes:10,travelDate:'2026-09-15'};
  const metrics=a.layerResolution(3,[{type:'trace',phase:'result',layer:3,evidence:{request}}]);
  assert.match(metrics.value,/£450/);assert.doesNotMatch(metrics.value,/£650/);
  const context=a.layerResolution(2,[{type:'trace',phase:'result',layer:2,evidence:{request,preferenceApplied:false}}]);
  assert.match(context.value,/10 min walk/);assert.match(context.value,/no hotel preference/);
});
test('starting another query invalidates the earlier booking button',async()=>{
  const a=await app();a.state.selectionTurn=1;
  await a.submit('Use a £450 budget');
  assert.equal(a.state.selectionTurn,null);
  assert.equal(a.bookRow(1),'');
  revealAll(a);
});
test('a completed AWS stream stays busy until the smooth answer is fully shown',async()=>{
  const text='The complete trip is £490, including the flight, bag, hotel taxes and transfer. '.repeat(4);
  const a=await app(async()=>response([{type:'token',text},{type:'answer',text},{type:'done'}]),true);
  await a.submit('Recover');revealAll(a);
  assert.equal(a.state.active,null);assert.equal(a.isBusy(),true);
  assert.equal(a.state.messages.at(-1).shownText,'');
  assert.doesNotMatch(a.elements.get('transcript').innerHTML,/The complete trip is/);
  a.advanceFrames(20);
  const partial=a.state.messages.at(-1).shownText;
  assert.ok(partial.length>0&&partial.length<text.length);
  await a.action('presenter');a.advanceFrames(100);
  assert.equal(a.state.messages.at(-1).shownText,partial);
  await a.action('play-pause');a.advanceFrames(600);
  assert.equal(a.state.messages.at(-1).shownText,text);
  assert.equal(a.isBusy(),false);assert.equal(a.elements.get('composer').disabled,false);
  await a.action('replay');
  assert.equal(a.state.messages.at(-1).shownText,'');assert.equal(a.state.messages.at(-1).streamDone,false);
});
test('Stop cancels the answer reveal and a new turn cannot receive its remaining words',async()=>{
  const text='A long checked answer that should stop cleanly. '.repeat(6);
  const a=await app(async()=>response([{type:'answer',text},{type:'done'}]),true);
  await a.submit('First');revealAll(a);a.advanceFrames(20);
  const first=a.state.messages.at(-1),partial=first.shownText;
  await a.stopRequest();a.advanceFrames(200);
  assert.equal(first.shownText,partial);assert.equal(a.isBusy(),false);
  await a.action('new-chat');a.advanceFrames(200);
  assert.equal(a.state.messages.length,0);
});
