import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnswerReveal} from '../answer-reveal.js';

function harness(reduced=false){
 const frames=new Map(),updates=[];let id=0,time=0,idles=0;
 const control=createAnswerReveal({onUpdate:text=>updates.push(text),onIdle:()=>idles++,
  reducedMotion:()=>reduced,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id)});
 const advance=(count=1,ms=16)=>{for(let i=0;i<count;i++){time+=ms;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));}};
 return {control,updates,frames,advance,get idles(){return idles;}};
}
test('one large received answer reveals complete words and finishes exactly',()=>{
 const h=harness(),text='A quiet hotel near the meeting. £490 includes the bag, taxes and transfer. '.repeat(5);
 h.control.setText(text);h.advance(12);
 assert.ok(h.control.text.length>0&&h.control.text.length<text.length/2);
 assert.ok(h.updates.every(value=>text.startsWith(value)&&/\s$/.test(value)));
 h.advance(600);
 assert.equal(h.control.text,text);assert.equal(h.control.pending,false);assert.equal(h.frames.size,0);
});
test('uneven chunks, source markers and Unicode survive the reveal without duplication',()=>{
 const h=harness(),text='**Pátio House** costs £490. Visit the café 👩🏽‍💻. [4] [5]';
 h.control.setText(text.slice(0,20));h.advance(8);
 h.control.setText(text.slice(0,35));h.advance(8);
 h.control.setText(text,{complete:true});h.advance(300);
 assert.equal(h.control.text,text);
 assert.ok(h.updates.every(value=>!value.endsWith('\ud83d')&&text.startsWith(value)));
 // An authoritative final answer replaces a differing streamed draft.
 h.control.setText('The corrected complete price is £490.',{complete:true});h.advance(300);
 assert.equal(h.control.text,'The corrected complete price is £490.');
});
test('a chunk ending inside a word waits for its remaining letters',()=>{
 const h=harness();h.control.setText('The hot');h.advance(120);
 assert.equal(h.control.text,'The ');assert.equal(h.frames.size,0);
 h.control.setText('The hotel.',{complete:true});h.advance(120);
 assert.equal(h.control.text,'The hotel.');
});
test('pause and slow frames do not flush a backlog; cancelled frames stay cancelled',()=>{
 const h=harness();h.control.setText('A checked journey with complete costs. '.repeat(12));h.advance(12);
 const before=h.control.text;h.control.pause();h.advance(40);
 assert.equal(h.control.text,before);
 h.control.resume();h.advance(1,60000);
 assert.equal(h.control.text,before);
 h.advance(1,60000);
 assert.ok(h.control.text.length-before.length<30);
 const pending=[...h.frames.values()];h.control.cancel();const stopped=h.control.text;
 pending.forEach(fn=>fn(999999));
 assert.equal(h.control.text,stopped);assert.equal(h.frames.size,0);
});
test('reduced motion shows received text immediately without scheduling frames',()=>{
 const h=harness(true);h.control.setText('The checked answer.');
 assert.equal(h.control.text,'The checked answer.');assert.equal(h.frames.size,0);assert.equal(h.idles,1);
});
