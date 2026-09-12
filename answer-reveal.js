// One frame loop smooths received text. It never generates or changes the answer.
export function createAnswerReveal({onUpdate,onIdle,requestFrame,cancelFrame,reducedMotion}){
 let target='',shown='',position=0,boundaries=[],frame=null,last=null,paused=false,epoch=0;
 const pending=()=>shown!==target;
 function unschedule(){if(frame!==null)cancelFrame(frame);frame=null;last=null;epoch++;}
 function schedule(){
  if(paused||frame!==null||!boundaries.some(end=>end>shown.length))return;
  const version=epoch;
  frame=requestFrame(now=>tick(now,version));
 }
 function tick(now,version){
  if(version!==epoch||paused)return;
  frame=null;
  if(reducedMotion()){flush();return;}
  // A background tab or a slow frame must not turn the remaining text into a burst.
  const elapsed=last===null?0:Math.min(40,Math.max(0,now-last));last=now;
  const rate=150+Math.min(70,(target.length-position)/20);
  position=Math.min(target.length,position+elapsed*rate/1000);
  let end=shown.length;
  for(const boundary of boundaries){if(boundary>position)break;end=boundary;}
  if(end!==shown.length){shown=target.slice(0,end);onUpdate(shown);}
  if(pending()){schedule();if(frame===null)last=null;}else{last=null;onIdle();}
 }
 function flush(){
  unschedule();position=target.length;
  if(shown!==target){shown=target;onUpdate(shown);}
  onIdle();
 }
 return {
  setText(text,{complete=false}={}){
   target=String(text);
   if(!target.startsWith(shown)){shown='';position=0;onUpdate(shown);}
   boundaries=Array.from(target.matchAll(/\s*\S+\s*|\s+$/gu),m=>m.index+m[0].length)
    .filter(end=>complete||end<target.length||/\s$/.test(target));
   if(reducedMotion()){flush();return;}
   schedule();
  },
  pause(){paused=true;unschedule();},
  resume(){paused=false;if(reducedMotion())flush();else schedule();},
  cancel(){unschedule();paused=true;},
  get pending(){return pending();},
  get text(){return shown;}
 };
}
