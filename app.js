import {travelData as data} from './data/travel.js';
import {hotelImages,hotelTiles,serviceBadges,serviceNames,layerServices,layerContributions,preparation,briefing,talkNotes} from './presentation.js?v=gateway-booking-20260910';

const $=id=>document.getElementById(id);
const EMPTY_SHA256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
async function payloadHash(body){
 if(!body)return EMPTY_SHA256;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function api(path,options={}){
 const body=options.body;
 const headers={...(options.headers||{}),'x-amz-content-sha256':await payloadHash(body)};
 return fetch(path,{...options,headers});
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2,minimumFractionDigits:p%100?2:0}).format(p/100);
const time=stamp=>stamp?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Lisbon'}).format(new Date(stamp)):'—';
const glyphs={arrow:'M4 12h15m-6-6 6 6-6 6',up:'M12 20V4m-6 6 6-6 6 6',down:'M12 4v16m6-6-6 6-6-6',chevron:'m6 9 6 6 6-6',close:'m6 6 12 12M6 18 18 6',pause:'M9 5v14M15 5v14',play:'m8 5 11 7-11 7Z',step:'m5 5 10 7-10 7ZM19 5v14',replay:'M4 10a8 8 0 1 1 1 8M4 4v6h6',check:'m5 12 4 4L19 6',trace:'M4 6h16M4 12h10M4 18h16',plane:'m22 2-7 20-4-9-9-4Z M22 2 11 13',plus:'M12 5v14M5 12h14',clock:'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',stop:'M6 6h12v12H6Z'};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${glyphs[name]||glyphs.arrow}"/></svg>`;
const ROUTES={prepare:'/prepare',briefing:'/briefing'};
const PAGES={prepare:'prepare-view',briefing:'briefing-view'};
function viewForPath(path){return Object.keys(ROUTES).find(name=>ROUTES[name]===path)||null;}
const layers=[
  {name:'Business context',phrase:'“make my meeting”',question:'What does success mean?',service:'Bedrock intent · AgentCore orchestration'},
  {name:'Ontology',phrase:'“me / Heathrow / my Lisbon meeting”',question:'Which people, places and things?',service:'Aurora · shared entity IDs and aliases'},
  {name:'Disambiguation',phrase:'“tomorrow / nearby / quiet”',question:'What do these words mean here?',service:'Aurora hybrid retrieval · AgentCore Memory'},
  {name:'Metrics',phrase:'“the whole trip under £650”',question:'What is the complete price?',service:'Aurora · complete-price SQL'},
  {name:'Relationships',phrase:'“will this journey work?”',question:'Will the whole journey work?',service:'Neptune journey paths · S3 source policies'},
  {name:'Verified examples',phrase:'“which supported trip should I choose?”',question:'Is the answer supported?',service:'Aurora · query patterns and current facts'},
  {name:'Booking',phrase:'“book it for me”',question:'Is the action allowed?',service:'AgentCore Gateway policy · Aurora inventory'}
];
const SEMANTIC=6;
const TRACE_CONSOLE='https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#gen-ai-observability/agent-core';
const state={sessionId:'onward-'+crypto.randomUUID(),messages:[],health:null,active:null,cancelled:false,presenter:false,modelId:null,
  paused:false,pace:450,timer:null,revealTimer:null,revealDeadline:null,openLayer:null,follow:true,traceOpen:true,
  soldOut:false,semantic:true,inspectedTurn:null,replaying:false,queue:[],cursor:0,visible:[],pendingLayer:null,lastQuery:'',turn:0,tripExpanded:true,animatedEvents:new Set(),preparing:false,dialogFocus:null};
const initialQuery='My flight has been cancelled. Get me from Heathrow to my Lisbon meeting by 2pm tomorrow, with one hotel night nearby. Keep the outbound flight, checked bag, hotel and airport transfer under £650.';

$('app').innerHTML=`
<div class="workspace"><main class="conversation" aria-label="Travel concierge"><div id="trip-status"></div><div id="transcript" class="transcript" role="log" aria-label="Conversation" aria-live="off"></div><div class="composer-dock"><button class="latest-button" type="button" data-action="latest">Latest ${icon('down')}</button><form id="chat-form" class="composer"><label class="sr-only" for="composer">Message Onward</label><textarea id="composer" rows="3" maxlength="4000" placeholder="Ask Onward to recover the trip…"></textarea><div class="composer-actions"><button type="button" class="quiet-button" data-action="load-request">Load the demo request</button><span class="composer-hint">Enter to send · Shift + Enter for a new line</span><button class="quiet-button trace-toggle" type="button" data-action="toggle-traces" aria-label="Toggle semantic traces">${icon('trace')} Layers</button><button id="send" class="send-button" type="submit" aria-label="Send message" title="Send message">${icon('plane')}</button><button id="stop" class="send-button stop-button" data-action="stop" type="button" aria-label="Stop the live request" hidden>Stop ${icon('stop')}</button></div></form><p class="disclosure">AI-generated destination and portrait · fictional traveller and trip</p></div></main>
<aside class="trace-panel" aria-label="Semantic traces"><div class="trace-heading"><div><h1>Six semantic responsibilities</h1><p>One question, progressively resolved.</p></div><button class="icon-button mobile-close" data-action="toggle-traces" aria-label="Close semantic traces">${icon('close')}</button></div><div class="trace-live"><span id="trace-mode"></span><button class="quiet-button" data-action="follow">Follow active layer</button></div><div class="trace-scroll" id="trace-scroll"><ol class="layer-list" id="layers"></ol></div><div class="trace-footer"><div id="trace-progress"></div><div id="trace-observability"></div><button class="quiet-button" data-action="source-preparation">How the data was prepared ${icon('arrow')}</button></div></aside></div>
<footer class="presenter-dock" aria-label="Presenter controls"><div class="mode-switch"><button data-action="auto-mode" id="auto-mode" aria-pressed="true">Auto reveal</button><button data-action="presenter" id="presenter" aria-pressed="false">Presenter</button></div><div id="trace-controls"></div><label class="pace-label">Pace <select id="pace"><option value="0">As received</option><option value="250">0.25s / event</option><option value="450" selected>0.45s / event</option><option value="800">0.8s / event</option><option value="1500">1.5s / event</option><option value="2500">2.5s / event</option></select></label><label class="pace-label model-label" for="model">Model <select id="model"></select></label><div class="context-controls"><button type="button" id="semantic-toggle" class="memory-button" data-action="semantic" aria-pressed="true" title="Off sends the next question to the model alone: no tools, no memory, no policy"><span>Semantic layer</span><span class="switch-track"></span><span class="sr-only">on</span></button><button class="stock-button" id="stock-toggle" data-action="stock" title="Change the preferred flight’s demo availability in Aurora">Flight availability <strong id="stock-label">Check stock</strong></button></div><div class="dock-secondary"><button class="quiet-button" data-action="talk-track">Talk track</button><button class="quiet-button" data-action="data">Architecture</button><button class="quiet-button" data-action="solution-briefing">Solution briefing</button><button class="quiet-button" data-action="new-chat" aria-label="New conversation">${icon('plus')} New</button></div></footer>`;

function intro(){return state.cancelled?`<section class="story-intro challenge"><h2>Recover the journey around a fixed 14:00 meeting</h2><p>Alex must reach the venue by <strong>14:00</strong>, stay within <strong>20 minutes on foot</strong>, and keep the <strong>complete trip under £650</strong>.</p><p class="story-insight">All three constraints have to hold together. The cheapest flight lands at 13:20 and still reaches the venue after the deadline.</p></section>`:`<section class="story-intro"><h2>Tomorrow in Lisbon: a client meeting at 14:00</h2><p>Alex flies out in the morning to meet a client at Ribeira Design Studio at <strong>14:00</strong>, with one hotel night booked and paid for. Reveal the cancellation to see the meeting time become the deadline for the whole journey.</p></section>`;}
function renderTrip(){
 const compact=state.messages.length&&!state.tripExpanded;
 document.body.classList.toggle('has-conversation',Boolean(state.messages.length));if(state.messages.length)$('composer').placeholder='Ask a follow-up…';
 $('send').innerHTML=icon('plane');$('send').setAttribute('aria-label',state.cancelled&&!state.messages.length?'Find another way':'Send message');$('send').title=state.cancelled&&!state.messages.length?'Find another way':'Send message';
 $('trip-status').innerHTML=`<section class="trip-card ${compact?'compact':''}" aria-label="Alex’s Lisbon trip"><img class="destination" src="assets/concierge/lisbon-destination-sharp.png" alt=""><div class="trip-shade"></div><div class="trip-content"><div class="trip-top"><button class="persona" data-action="profile" aria-label="Alex Morgan, fictional traveller, AI portrait"><img src="assets/concierge/alex-morgan.jpg" alt=""><span>Alex Morgan<small>Designer · London</small></span></button>${state.messages.length?`<div class="trip-links"><button data-action="trip-details" aria-expanded="${state.tripExpanded}">${compact?'Expand trip':'Compact trip'} ${icon('chevron')}</button></div>`:''}</div><div class="trip-route"><div><strong>LHR</strong><span>Heathrow · ${data.original.depart}</span></div><span class="flight-rule">${icon('plane')}</span><div><strong>LIS</strong><span>Lisbon · ${data.original.arrive}</span></div><div class="meeting-context"><span>Client meeting · 15 September</span><strong>Ribeira Design Studio · 14:00</strong></div></div><div class="trip-state ${state.cancelled?'cancelled':''}">${state.cancelled?`<span><strong>AX201 cancelled.</strong> The 14:00 meeting still stands. One hotel night, 15–16 September.</span>`:`<span><strong>AX201 booked.</strong> 15 September · one hotel night.</span><div class="reveal-actions"><button class="primary" data-action="cancel-flight">Reveal cancellation</button><div class="timed-buttons" aria-label="Timed cancellation">${[5,10,15,30].map(n=>`<button data-action="timed-reveal" data-seconds="${n}" aria-label="Reveal cancellation after ${n} seconds">${n}s</button>`).join('')}</div></div>`}</div><div class="timer-row" ${state.revealDeadline?'':'hidden'}><span id="timer-status"></span><button data-action="cancel-timer">Cancel timer</button></div></div></section>`;
}

function prose(text){return esc(text).split(/\n\s*\n/).map(p=>'<p>'+p.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([1-6])\]/g,(_,n)=>`<button class="inline-source" data-source="${Number(n)-1}" aria-label="Inspect source ${n}">[${n}]</button>`).replace(/\n/g,'<br>')+'</p>').join('');}
function sources(turn){return `<div class="answer-sources" aria-label="Answer sources">${layers.slice(0,SEMANTIC).map((l,i)=>`<button data-source="${i}" data-source-turn="${turn}">[${i+1}] ${l.name}</button>`).join('')}</div>`;}
function personalContext(context,seat){
 if(!context)return '';
 const preference=context.seatPreference,allergies=context.allergies||[];
 return `<aside class="traveller-context" aria-label="Alex’s preferences and requirements"><div><strong>${preference.value?`${esc(preference.value[0].toUpperCase()+preference.value.slice(1))} seat preferred`:'No seat preference applied'}</strong><p>${esc(preference.source)}</p>${seat?.preference?`<p>${seat.matches?`${seat.availableCount} matching ${seat.availableCount===1?'option':'options'} · selection included in fare`:seat.availableCount===0?'Preferred seat unavailable on this flight':'Seat availability or selection price unverified'}. No seat assigned.</p>`:''}</div>${allergies.length?`<div><strong>${allergies.map(a=>esc(a.name[0].toUpperCase()+a.name.slice(1))).join(', ')} allergy declared</strong><p>${[...new Set(allergies.map(a=>a.source))].map(esc).join(' · ')}</p><p>Catering unverified. Confirm requirements with the carrier before booking.</p></div>`:''}</aside>`;
}
function itinerary(plan,turn){
 if(!plan.selected)return `<section class="no-match"><h3>No complete trip fits.</h3><p>${plan.minimumFeasiblePence?`The lowest feasible complete trip is ${money(plan.minimumFeasiblePence)}. Your limit is strictly under ${money(plan.request.budgetPence)}.`:'The available journeys cannot meet all the current constraints.'}</p><p>The deadline and budget remain in place.</p><button class="quiet-button" data-prompt="Restore my budget to £650 and try again.">Restore the £650 budget ${icon('arrow')}</button></section>`;
 const p=plan.selected,r=p.route,h=p.hotel;
 const earlier=state.messages.filter(m=>m.role==='assistant'&&m.plan&&m.turn<turn).pop();
 const sameHotel=earlier?.plan?.selected?.hotel?.id===h.id;
 const docs=state.visible.findLast(e=>e.type==='trace'&&e.layer===4&&e.phase==='result')?.evidence?.sources||[];
 const saved=state.messages.find(m=>m.role==='assistant'&&m.turn===turn)?.documents;
 const docList=saved||docs;
 return `<section class="itinerary-card${sameHotel?' same-hotel':''}">${hotelImages[h.id]&&!sameHotel?`<figure class="hotel-photo"><img src="${hotelImages[h.id]}" alt="AI-generated illustration for fictional ${esc(h.name)}"><figcaption><strong>${esc(h.name)}</strong><span>Fictional hotel · AI-generated illustration</span></figcaption></figure>`:''}<div class="itinerary-content"><div class="itinerary-title"><div><span class="confirmed">${icon('check')} Supported itinerary</span><h3>${sameHotel&&hotelImages[h.id]?`<img class="hotel-thumb" src="${hotelImages[h.id]}" alt="">`:''}${esc(r.offer.id)} · ${esc(h.name)}</h3></div><strong class="total">${money(p.totalPence)}</strong></div><dl class="journey-facts"><div><dt>${icon('clock')} At the meeting</dt><dd>${time(r.venueArrival)} <small>Lisbon time</small></dd></div><div><dt>Complete outbound trip</dt><dd>${money(p.totalPence)}</dd></div><div><dt>${icon('plane')} Flight</dt><dd>${time(r.legs[0].depart)} LHR → ${time(r.landing)} LIS</dd></div><div><dt>Walk to the venue</dt><dd>${h.walk_minutes} minutes</dd></div></dl><dl class="price-lines"><div><dt>Fare</dt><dd>${money(p.price.fare_pence)}</dd></div><div><dt>${plan.request.bags} checked ${plan.request.bags===1?'bag':'bags'}</dt><dd>${money(p.price.bags_pence)}</dd></div><div><dt>Hotel with taxes</dt><dd>${money(p.price.hotel_pence)}</dd></div><div><dt>Transfer</dt><dd>${money(p.price.transfer_pence)}</dd></div></dl><p>${esc(h.description)} One night, 15–16 September.</p><div class="policy-chips">${docList.map(d=>`<button data-document-id="${esc(d.id)}" data-document-turn="${turn}">${esc(d.title)}</button>`).join('')}</div><button class="quiet-button" data-action="journey-details" data-journey-turn="${turn}">Inspect the complete journey ${icon('arrow')}</button>${bookRow(turn)}<small class="inventory-note">Current fictional inventory queried on AWS · ${state.messages.some(m=>m.booking)?'Reserved under policy in this conversation':'Nothing reserved'}</small></div></section>${personalContext(plan.travellerContext,p.seat)}`;
}
function bookRow(turn){
 const message=state.messages.find(m=>m.role==='assistant'&&m.turn===turn),latest=state.messages.findLast(m=>m.role==='assistant'&&m.plan?.selected);
 if(!message||message.pending||message!==latest||state.messages.some(m=>m.booking||m.bookingRefused))return '';
 const live=state.messages.some(m=>m.pending),bookingNow=state.messages.some(m=>m.pending&&m.bookingTurn);
 return `<div class="book-row"><button class="primary book-button${bookingNow?' is-booking':''}" data-action="book-trip" ${live?'disabled':''}>${bookingNow?icon('clock')+' Booking with the gateway…':icon('check')+' Book this for Alex'}</button><span>One click confirms. The gateway’s Cedar policy decides before the booking tool runs; the inventory is fictional.</span></div>`;
}
function bookingCard(m){
 const b=m.booking,plan=state.messages.findLast(x=>x.role==='assistant'&&x.plan?.selected&&x.turn<=m.turn)?.plan,sel=plan?.selected;
 const hotel=sel?.hotel?.name||data.hotels.find(h=>h.id===b.hotelId)?.name||b.hotelId;
 return `<div class="booking-banner" role="status"><span class="booking-banner-mark">${icon('check')}</span><div><strong>Booking confirmed</strong><span>Reference ${esc(b.reference)} · one seat on ${esc(b.offerId)} and one room at ${esc(hotel)} reserved · Cedar policy permitted</span></div></div><section class="booking-card"><div class="itinerary-title"><div><span class="confirmed">${icon('check')} Booked under policy</span><h3>${esc(b.reference)}</h3></div><strong class="total">${money(b.totalPence)}</strong></div><dl class="journey-facts"><div><dt>${icon('plane')} Flight</dt><dd>${esc(b.offerId)}${sel?` · ${time(sel.route.legs[0].depart)} LHR → ${time(sel.route.landing)} LIS`:''}</dd></div><div><dt>Hotel</dt><dd>${esc(hotel)} · one night</dd></div><div><dt>Seats left on ${esc(b.offerId)}</dt><dd>${esc(b.seatsLeft)}</dd></div><div><dt>Rooms left</dt><dd>${esc(b.roomsLeft)}</dd></div></dl><p class="booking-policy"><strong>Policy: permitted.</strong> Cedar policies on AgentCore Gateway checked the traveller’s confirmation, the budget and the deadline before the booking tool ran.</p><small class="inventory-note">Fictional inventory reserved in Aurora at ${esc(b.createdAt)} · no supplier booking</small></section>`;
}
function refusalCard(m){
 return `<section class="booking-refused"><h3>Booking refused${m.policyDecision==='deny'?' by policy':''}.</h3><p>${esc(m.bookingRefused)}</p><p>Nothing was reserved. ${m.policyDecision==='deny'?'AgentCore Gateway evaluated the Cedar policies against the request and denied the booking tool before any code ran.':'The booking tool did not complete.'}</p></section>`;
}

const FOLD_MS=720;
function retrievalPreview(m){
 if(!m.hotelResults)return '';
 const body=`${personalContext(m.travellerContext)}<h3>Hotels: description, walk, hybrid rank</h3>${hotelTiles(m.hotelResults,true)}`;
 if(m.hotelFold==='folding')return `<section class="retrieval-preview folding" style="animation-delay:-${Math.min(Date.now()-m.hotelFoldStart,FOLD_MS)}ms" aria-hidden="true"><div>${body}</div></section>`;
 if(m.plan){const chosen=m.plan.selected?.hotel?.name;return `<details class="retrieval-folded"><summary>${icon('chevron')} Hybrid retrieval ranked ${m.hotelResults.length} hotels${chosen?` · ${esc(chosen)} selected`:' · none eligible'}</summary><section class="retrieval-preview">${body}</section></details>`;}
 if(m.pending)return `<section class="retrieval-preview">${body}</section>`;
 return '';
}
function renderChat(){
  const view=$('transcript'),previousScroll=view.scrollTop,nearBottom=view.scrollHeight-view.scrollTop-view.clientHeight<70;
  if(!state.messages.length){view.innerHTML=intro();return;}
  view.innerHTML=state.messages.map((m,index)=>m.role==='user'?`<article class="user-message"><span class="sr-only">Alex:</span><div>${esc(m.text)}</div></article>`:`<article class="assistant-message${m.modelOnly?' model-only':''}" data-message="${index}"><div class="assistant-label"><span class="mini-brand">o.</span><strong>Onward</strong><span>${m.modelOnly?(m.pending?'Model only · answering without the semantic layer':'Model only · no data, no memory, no policy'):m.replay?'Recorded run':m.pending?'Resolving your journey':m.failed?'Request interrupted':'Your travel concierge'}</span></div>${reasoning(m)}${retrievalPreview(m)}${m.plan&&m.hotelFold!=='folding'?itinerary(m.plan,m.turn):''}${m.booking?bookingCard(m):m.bookingRefused?refusalCard(m):''}${m.text?`<div class="answer-text">${prose(m.text)}</div>`:''}${m.failed?`<div class="error-message"><p>${esc(m.failed)}</p><button class="quiet-button" data-action="retry">Retry this question ${icon('arrow')}</button></div>`:''}${!m.pending&&m.plan?sources(m.turn):''}${!m.pending&&m.plan?`<div class="followups"><button data-prompt="Can I arrive earlier?">Arrive earlier</button><button data-prompt="Why not the cheapest flight?">Why not the cheapest flight?</button><button data-prompt="Somewhere livelier for the evening, please.">Somewhere livelier</button><button data-prompt="Can we keep it under £450?">Try a £450 budget</button><button data-prompt="For this trip, I would prefer a window seat.">Window seat this trip</button></div>`:''}</article>`).join('');
  if(state.chatAnchor){const target=view.querySelector(state.chatAnchor);if(target)view.scrollTop+=target.getBoundingClientRect().top-view.getBoundingClientRect().top-16;state.chatAnchor=null;}else view.scrollTop=nearBottom?view.scrollHeight:previousScroll;
}
function serviceMarks(keys){return keys.map(key=>`<img src="assets/aws/${key==='memory'?'agentcore':key}.svg" alt="${esc(serviceNames[key])}" title="${esc(serviceNames[key])}" width="18" height="18">`).join('');}
function reasoning(m){
 if(m.modelOnly){const body=`<ol class="reasoning"><li class="step ${m.pending?'active':'done'}"><span class="step-mark">${m.pending?'<span class="step-pulse"></span>':icon('check')}</span><div><strong>Model only</strong><p>The semantic layer is off: no entity registry, no retrieval, no prices, no journey graph, no memory and no policy. Whatever follows is the model’s own.</p></div></li></ol>`;return m.pending?body:`<details class="reasoning-done"><summary>Model only · 0 of ${SEMANTIC} semantic responsibilities resolved ${icon('chevron')}</summary>${body}</details>`;}
 const steps=m.steps||[];
 const opening=m.pending&&!steps.length?`<li class="step active"><span class="step-mark"><span class="step-pulse"></span></span><div><strong>Reading the request</strong><p>${esc(m.status||'Connecting to the live agent…')}</p></div></li>`:'';
 const rows=steps.map(step=>`<li class="step ${step.error?'refused':step.done?'done':'active'}"><span class="step-mark">${step.error?icon('close'):step.done?icon('check'):'<span class="step-pulse"></span>'}</span><div><strong>${esc(layers[step.layer].name)}</strong><p>${esc(step.summary||'')}</p><span class="step-marks">${serviceMarks(layerServices[step.layer])}</span></div></li>`).join('');
 if(!opening&&!rows)return '';
 const body=`<ol class="reasoning">${opening}${rows}</ol>`;
 if(m.pending)return body;
 const done=steps.filter(step=>step.done&&step.layer<SEMANTIC).length,booking=steps.find(step=>step.layer===SEMANTIC);
 const label=booking?(booking.error?'Booking refused by policy':'Booked under policy · one governed action'):`${done} of ${SEMANTIC} semantic responsibilities resolved`;
 return `<details class="reasoning-done"><summary>${label} ${icon('chevron')}</summary>${body}</details>`;
}
function renderModels(health){
 const select=$('model'),models=health?.models||{};
 if(!select)return;
 if(!Object.keys(models).length){select.closest('label').hidden=true;return;}
 select.closest('label').hidden=false;
 state.modelId=state.modelId&&models[state.modelId]?state.modelId:health.model;
 select.innerHTML=Object.entries(models).map(([id,name])=>
   `<option value="${esc(id)}"${id===state.modelId?' selected':''}>${esc(name)}</option>`).join('');
}
function currentAssistant(){return state.messages.findLast(m=>m.role==='assistant');}
function streamAnswer(message){
 const view=$('transcript'),node=view.querySelector('.assistant-message:last-child .answer-text');
 if(!node)return false;
 const nearBottom=view.scrollHeight-view.scrollTop-view.clientHeight<70;
 node.innerHTML=prose(message.text);node.classList.add('streaming');
 if(nearBottom)view.scrollTop=view.scrollHeight;
 return true;
}
function renderControls(){
 const pending=state.queue.length-state.cursor,traces=traceEvents().filter(e=>e.type==='trace'),complete=new Set(traces.filter(e=>e.phase==='result'&&e.layer<SEMANTIC).map(e=>e.layer)).size,booked=traces.some(e=>e.layer===SEMANTIC&&e.phase==='result'&&!e.error);
 const receiving=Boolean(state.active),canReveal=pending>0||receiving;
 const canStepLayer=state.queue.slice(state.cursor).some(e=>e.type==='trace')||(receiving&&!state.queue.some(e=>e.type==='done'||e.type==='error'));
 const finished=state.visible.some(e=>e.type==='done'),failed=Boolean(currentAssistant()?.failed);
 const mode=currentAssistant()?.modelOnly&&state.inspectedTurn===null?'Model only · the semantic layer is off':state.inspectedTurn!==null?`Earlier turn ${state.inspectedTurn} · recorded evidence`:state.replaying?'Recorded run · no new AWS calls':receiving?(state.paused?'Display paused · agent continues':'Receiving live AWS events'):pending?(state.paused?'Display paused · run received':'Revealing received evidence'):failed?'Run interrupted · evidence retained':finished?'Run complete · evidence available':'Ready for your question';
 const controls=[['play-pause',state.paused?'Resume':'Pause reveal',state.paused?'play':'pause',canReveal],['next-event','Next event','step',canReveal],['next-layer','Next layer','arrow',canStepLayer],['replay','Replay','replay',state.queue.length&&!receiving]];
 const controlsHtml=controls.map(([action,label,glyph,enabled])=>`<button class="dock-control" data-action="${action}" ${enabled?'':'disabled'} title="${label}">${icon(glyph)}<span>${label}</span></button>`).join('');
 if(state.controlsHtml!==controlsHtml){$('trace-controls').innerHTML=controlsHtml;state.controlsHtml=controlsHtml;}
 $('trace-progress').innerHTML=`<span>${traces.length?`${complete} / ${SEMANTIC} components${booked?' + booking':''} · ${traces.length} semantic events`:'Prepared data becomes a supported answer.'}</span>${pending?`<small>${pending} stream events buffered</small>`:''}`;
 const run=traceEvents().findLast(e=>e.type==='run');
 $('trace-observability').innerHTML=run?.traceId?`<span class="trace-id" title="OpenTelemetry trace id">Trace ${esc(run.traceId.slice(0,8))}…</span><a class="trace-link" href="${TRACE_CONSOLE}" target="_blank" rel="noopener">View trace in CloudWatch ${icon('arrow')}</a>`:run?`<span class="trace-id">Traces: AgentCore Observability</span><a class="trace-link" href="${TRACE_CONSOLE}" target="_blank" rel="noopener">Open CloudWatch ${icon('arrow')}</a>`:'';
 $('trace-mode').innerHTML=`<span class="status-dot ${receiving?'active':''}"></span>${mode}`;
 $('presenter').setAttribute('aria-pressed',String(state.presenter));$('auto-mode').setAttribute('aria-pressed',String(!state.presenter));
}

function traceEvents(){return state.inspectedTurn===null?state.visible:(state.messages.find(m=>m.role==='assistant'&&m.turn===state.inspectedTurn)?.savedEvents||[]);}
function layerResolution(layer,events){
  const result=events.findLast(e=>e.type==='trace'&&e.layer===layer&&e.phase==='result');
  const evidence=result?.evidence||{};
  if(layer===0){
    const request=evidence.request||{};
    return {
      value:`Reach the meeting venue by ${request.deadline||'14:00'} with the complete outbound trip under ${money(request.budgetPence||65000)}.`,
      detail:'A flight landing before the deadline is only one leg of the business outcome.'
    };
  }
  if(layer===1){
    const entities=evidence.entities||[];
    const traveller=entities.find(e=>e.kind==='traveller')?.name||'Alex';
    const origin=entities.find(e=>e.kind==='airport'&&e.id==='LHR')?.id||'LHR';
    const destination=entities.find(e=>e.kind==='airport'&&e.id==='LIS')?.id||'LIS';
    const venue=entities.find(e=>e.kind==='venue')?.name||'the meeting venue';
    return {
      value:`${traveller} · ${origin} → ${destination} · ${venue}`,
      detail:'Stable IDs let offers, transfers, hotel walks and traveller context refer to the same trip.'
    };
  }
  if(layer===2){
    const memory=evidence.memorySource&&evidence.memorySource!=='disabled'?`Memory: ${evidence.memorySource}.`:'Memory is paused.';
    const search=evidence.searchText?`Aurora search intent: ${evidence.searchText}.`:'Aurora searches the meeting-venue hotel set.';
    return {
      value:`${evidence.date||'15 September 2026'} · ≤${evidence.maxWalkMinutes||20} min walk · ${evidence.ranking?'personalised hotel ranking':'current-request ranking'}`,
      detail:`${memory} ${search} Relevance narrows candidates; hard constraints still decide feasibility.`
    };
  }
  if(layer===3){
    const budget=evidence.budgetPence||65000;
    return {
      value:`Fare + checked bag + hotel with taxes + airport transfer < ${money(budget)}.`,
      detail:'Prices remain integer pence. The strict less-than boundary excludes equality; return travel and travel to Heathrow stay outside this scope.'
    };
  }
  if(layer===4){
    return {
      value:result?.summary||'Flight legs, transfer and walking edges are checked against the deadline and connection rules.',
      detail:'Neptune supplies the connected paths. Application rules apply timezone-aware timing, arrival allowance, transfer time, walking limit and minimum connection time.'
    };
  }
  if(layer===SEMANTIC){
    const refused=events.some(e=>e.type==='trace'&&e.layer===SEMANTIC&&e.error);
    return {
      value:result?.summary||'Waiting for the gateway’s policy decision.',
      detail:refused?'The gateway evaluated the Cedar policies against the tool arguments and denied the call; no code ran and nothing was reserved.':'AgentCore Gateway evaluates Cedar policies on the book_trip arguments before the Lambda runs: traveller confirmation, budget, deadline, seats and seat selection. The tool then reserves one seat and one room atomically in the fictional Aurora inventory.'
    };
  }
  return {
    value:result?.summary||'Current records are rechecked, then eligible complete bundles are ranked.',
    detail:'The reviewed pattern guides the bounded calls; current Aurora records establish availability and price before the answer is written.'
  };
}
function updateTraceHeading(){const governed=state.visible.some(e=>e.type==='trace'&&e.layer===SEMANTIC);const h=document.querySelector('.trace-heading h1'),p=document.querySelector('.trace-heading p');if(!h)return;h.textContent=governed?'Six responsibilities, one governed action':'Six semantic responsibilities';p.textContent=governed?'One question resolved; one booking decided by policy.':'One question, progressively resolved.';}
function renderTraces(){updateTraceHeading();
 const shown=traceEvents(),scroller=$('trace-scroll'),scroll=scroller.scrollTop;
 $('layers').innerHTML=layers.map((l,i)=>{
  const ev=shown.filter(e=>e.type==='trace'&&e.layer===i),last=ev.at(-1),refused=ev.some(e=>e.error),done=!refused&&ev.some(e=>e.phase==='result'),open=state.openLayer===i,error=shown.findLast(e=>e.type==='error'&&e.layer===i);
  if(i===SEMANTIC&&!ev.length)return '';
  const resolution=layerResolution(i,ev);
  return `${i===SEMANTIC?'<li class="layer-divider" aria-hidden="true">+ one governed action</li>':''}<li class="layer ${last?'has-events':''} ${done?'complete':''} ${refused?'refused':''} ${open?'expanded':''}"><button class="layer-toggle" data-layer="${i}" aria-expanded="${open}" aria-controls="layer-body-${i}"><span class="layer-number">${refused?icon('close'):done?icon('check'):i+1}</span><span class="layer-title"><strong>${l.name}</strong><span>${l.service}</span></span><span class="layer-state">${refused?'Refused':error?'Error':done?'Resolved':last?'Active':''}${icon('chevron')}</span></button><div id="layer-body-${i}" class="layer-body" ${open?'':'hidden'}><h3 class="layer-question">${l.question}</h3><div class="layer-resolution"><div><span class="layer-resolution-label">Question phrase</span><strong>${esc(l.phrase)}</strong></div><div><span class="layer-resolution-label">Resolved meaning</span><strong>${esc(resolution.value)}</strong></div><p>${esc(resolution.detail)}</p></div><p class="layer-contribution">${layerContributions[i]}</p>${serviceBadges(layerServices[i],i)}${ev.length?ev.map(e=>{
   const newEvent=!state.animatedEvents.has(e.id);state.animatedEvents.add(e.id);
   return `<article class="trace-event ${newEvent?'event-enter':''}" data-trace-id="${esc(e.id)}"><div class="event-meta"><span>${{input:'Input',mapping:'Shared meaning',tool:'Tool request',result:'Returned evidence'}[e.phase]}</span>${e.elapsedMs!==undefined?`<time>${(e.elapsedMs/1000).toFixed(2)}s</time>`:''}</div><h3>${esc(e.title)}</h3><p>${esc(e.summary)}</p><button class="inspect-event" data-event="${esc(e.id)}">Inspect ${e.phase==='tool'?'request':e.phase==='result'?'returned evidence':'details'} ${icon('arrow')}</button></article>`;
  }).join(''):'<p class="waiting-detail">Advance to this layer to reveal its inputs, meaning, tool request and returned evidence.</p>'}</div></li>`;
 }).join('');
 scroller.scrollTop=scroll;
 if(state.follow&&state.openLayer!==null&&state.inspectedTurn===null){const target=scroller.querySelector('.layer.expanded .trace-event:last-child')||scroller.querySelector('.layer.expanded');if(target){const r=target.getBoundingClientRect(),c=scroller.getBoundingClientRect();if(r.bottom>c.bottom||r.top<c.top)scroller.scrollTo({top:scroll+r.top-c.top-96,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}
 renderControls();
}

function apply(e){
  state.visible.push(e);
  const message=currentAssistant();
  if(!message)return;
  if(e.type==='connection')message.status=e.message;
  if(e.type==='run'){message.traceId=e.traceId||null;message.gateway=e.gateway||null;renderControls();}
  if(e.type==='booking'){if(e.booking)announce(`Booking confirmed. Reference ${e.booking.reference}: a seat on ${e.booking.offerId} and a room are reserved.`);message.booking=e.booking||null;message.bookingRefused=e.booking?null:(e.refused||'The gateway did not complete the booking.');message.policyDecision=e.policyDecision||null;state.chatAnchor='.assistant-message:last-child .booking-card, .assistant-message:last-child .booking-refused';}
  if(e.type==='trace'){
    message.status=e.summary;message.currentLayer=e.layer;
    message.steps=message.steps||[];
    const seen=message.steps.find(step=>step.layer===e.layer);
    if(seen){seen.summary=e.summary;seen.done=seen.done||e.phase==='result';seen.error=seen.error||e.error===true;}
    else message.steps.push({layer:e.layer,summary:e.summary,done:e.phase==='result',error:e.error===true});if(e.layer===2&&e.phase==='result'){message.hotelResults=e.evidence.hotels;message.travellerContext=e.evidence.travellerContext;state.chatAnchor='.assistant-message:last-child .retrieval-preview';}
    if(state.follow)state.openLayer=e.layer;
    renderTraces();
  }
  if(e.type==='plan'){const landing='.assistant-message:last-child .itinerary-card, .assistant-message:last-child .no-match';if(message.hotelResults){message.hotelFold='folding';message.hotelFoldStart=Date.now();state.holdReveal=FOLD_MS+60;state.chatAnchor='.assistant-message:last-child .retrieval-preview';setTimeout(()=>{if(message.hotelFold!=='folding')return;message.hotelFold='folded';state.chatAnchor=landing;renderChat();},FOLD_MS+40);}else state.chatAnchor=landing;message.documents=state.visible.findLast(v=>v.type==='trace'&&v.layer===4&&v.phase==='result')?.evidence?.sources||[];message.plan=e.plan;}
  if(e.type==='token'){message.text+=e.text;if(streamAnswer(message))return;}
  if(e.type==='answer'){message.text=e.text;message.pending=false;message.kind=e.kind;message.memoryEventId=e.memoryEventId;}
  if(e.type==='done'){state.pendingLayer=null;message.pending=false;message.elapsedMs=e.elapsedMs;message.savedEvents=[...state.visible];}
  if(e.type==='error'){state.pendingLayer=null;message.pending=false;message.failed=e.message;state.openLayer=e.layer??state.openLayer;renderTraces();}
  if(e.type!=='usage'&&e.type!=='run')renderChat();
}
function stopPlayback(){clearTimeout(state.timer);state.timer=null;}
function revealOne(){
 while(state.cursor<state.queue.length){const e=state.queue[state.cursor++];apply(e);if(e.type==='trace')break;}
 renderControls();
}
function revealBeat(){
 state.timer=null;
 if(state.paused&&state.pendingLayer===null)return;
 let semantic=false,words=0,hold=0;
 while(state.cursor<state.queue.length){
  const e=state.queue[state.cursor++];apply(e);
  if(state.holdReveal){hold=state.holdReveal;state.holdReveal=0;break;}
  if(e.type==='trace'){
   semantic=true;
   if(state.pendingLayer===e.layer&&e.phase==='result'){state.pendingLayer=null;state.paused=e.layer!==5;}
   break;
  }
  if(e.type==='token'&&(words+=e.text.length)>=12)break;
 }
 const pending=state.cursor<state.queue.length;
 if(!state.active&&!pending)state.pendingLayer=null;
 renderControls();
 if((pending||state.active)&&(!state.paused||state.pendingLayer!==null))state.timer=setTimeout(revealBeat,hold||(semantic?Math.max(state.pace,150):26));
}
function schedule(){stopPlayback();if(!state.paused||state.pendingLayer!==null)revealBeat();}
function receive(e){
 state.queue.push(e);
 if((!state.paused||state.pendingLayer!==null)&&!state.timer)revealBeat();
 renderControls();
}

function setBusy(busy){$('send').hidden=busy;$('stop').hidden=!busy;$('composer').disabled=busy;$('stock-toggle').disabled=busy;$('semantic-toggle').disabled=busy;}
async function submit(text,options={}){
  if(state.active||!text.trim())return;
  if(!state.health?.ok){announce('AWS is not ready. Open the connection details and retry.');openConnection();return;}
  clearReveal();stopPlayback();state.queue=[];state.cursor=0;state.visible=[];state.pendingLayer=null;state.openLayer=null;state.follow=true;state.inspectedTurn=null;state.replaying=false;
  state.paused=state.presenter&&state.semantic;state.tripExpanded=false;state.lastQuery=text;state.lastOptions=options;state.turn++;state.animatedEvents.clear();
  const user={role:'user',text},answer={role:'assistant',text:'',pending:true,turn:state.turn,bookingTurn:Boolean(options.confirmBooking),modelOnly:!state.semantic};state.messages.push(user,answer);state.chatAnchor='.user-message:nth-last-child(2)';renderTrip();
  $('composer').value='';$('chat-form').classList.remove('has-draft');state.active=new AbortController();setBusy(true);renderChat();renderTraces();
  try{
    const response=await api('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:state.active.signal,
      body:JSON.stringify({message:text,sessionId:state.sessionId,...(options.confirmBooking?{confirmBooking:true}:{}),...(state.semantic?{}:{semanticLayer:false}),...(state.modelId?{modelId:state.modelId}:{})})});
    if(!response.ok){const result=await response.json();throw new Error(result.error||'Unable to connect.');}
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    const parse=frame=>{
      const lines=frame.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim());if(!lines.length)return;
      let value=JSON.parse(lines.join('\n'));if(typeof value==='string')value=JSON.parse(value);
      if(value.type)receive(value);else if(value.error)receive({type:'error',message:value.error});
    };
    while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let cut;while((cut=buffer.indexOf('\n\n'))>=0){parse(buffer.slice(0,cut));buffer=buffer.slice(cut+2);}}
    buffer+=decoder.decode();if(buffer.trim())parse(buffer);
    if(!state.queue.some(e=>['done','error'].includes(e.type)))receive({type:'error',message:'The live stream ended before completion. Retry the question.'});
  }catch(error){if(error.name!=='AbortError')receive({type:'error',message:error.message});}
  finally{state.active=null;setBusy(false);renderChat();if(state.paused&&!state.visible.some(e=>e.type==='trace')&&!currentAssistant()?.failed){currentAssistant().status='The live run is ready. Advance an event or a layer to reveal its evidence.';renderChat();}renderControls();if((!state.paused||state.pendingLayer!==null)&&!state.timer)schedule();}
}
function announce(message){$('announcement').textContent=message;}
function updateSemantic(){const b=$('semantic-toggle');if(!b)return;b.setAttribute('aria-pressed',String(state.semantic));b.setAttribute('aria-label',`Semantic layer ${state.semantic?'on':'off'}`);b.innerHTML=`<span>Semantic layer</span><span class="switch-track"></span><span class="sr-only">${state.semantic?'on':'off'}</span>`;document.body.classList.toggle('model-only',!state.semantic);}
function clearReveal(){clearInterval(state.revealTimer);state.revealTimer=null;state.revealDeadline=null;if($('timer-status'))$('timer-status').textContent='';document.querySelector('.timer-row')?.setAttribute('hidden','');}
function cancelFlight(){clearReveal();state.cancelled=true;renderTrip();if(!state.messages.length)renderChat();$('composer').placeholder='Get me to the meeting by 2pm. Keep the complete trip under £650.';announce('Alex’s flight is cancelled. The meeting is still at 14:00.');}
function openDialog(title,html,kind=''){state.dialogFocus=document.activeElement;$('detail-dialog').className=kind;$('dialog-content').innerHTML=`<header class="dialog-header"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Close details">${icon('close')}</button></header>${html}`;$('detail-dialog').showModal();}
function openConnection(){const h=state.health;openDialog('Connected to your AWS account',h?`<p class="dialog-lead">Isengard ${esc(h.accountId)} · ${esc(h.region)}</p><ul class="service-list">${h.services.map(s=>`<li><strong>${esc(s.name)}</strong><span class="${s.ok?'service-ok':'service-error'}">${esc(s.status)}</span>${s.details?`<small>${esc(JSON.stringify(s.details))}</small>`:''}</li>`).join('')}</ul><dl class="connection-details"><dt>Aurora</dt><dd>${esc(h.cluster)} / ${esc(h.database)}</dd><dt>Bedrock model</dt><dd>${esc(h.model)}</dd><dt>Runtime</dt><dd>${esc(h.runtimeId)}</dd><dt>Memory</dt><dd>${esc(h.memoryId)}</dd><dt>Gateway</dt><dd>${esc(h.gatewayId||'not provisioned')}</dd><dt>Policy engine</dt><dd>${esc(h.policyEngineId||'not provisioned')}</dd><dt>Neptune graph</dt><dd>${esc(h.graphId)}</dd><dt>Sources</dt><dd>${esc(h.bucket)}</dd><dt>Traces</dt><dd><a href="${TRACE_CONSOLE}" target="_blank" rel="noopener">CloudWatch GenAI Observability</a>${state.messages.findLast(m=>m.traceId)?.traceId?` · latest trace ${esc(state.messages.findLast(m=>m.traceId).traceId)}`:''}</dd></dl><p>Checked ${esc(h.checkedAt)}. Bedrock invocation request IDs and token counts appear inside each run.</p><button class="primary" data-action="refresh-connection">Check again ${icon('replay')}</button>`:`<p>AWS connection checks have not completed.</p><button class="primary" data-action="refresh-connection">Retry connection ${icon('replay')}</button>`);}
function inspectSource(layer,turn){state.inspectedTurn=turn&&turn!==state.turn?turn:null;state.openLayer=layer;state.follow=false;state.traceOpen=true;document.body.classList.remove('traces-hidden');if(innerWidth<=1000)document.body.classList.add('mobile-traces-open');renderTraces();setTimeout(()=>document.querySelector(`[data-layer="${layer}"]`)?.scrollIntoView({block:'nearest'}),0);}
function inspectEvent(id){const e=traceEvents().find(x=>x.id===id);if(!e)return;openDialog(`${layers[e.layer].name}: ${e.title}`,`<p class="dialog-lead">${esc(e.summary)}</p><div class="evidence-meta"><span>${esc(e.service)}</span><span>${esc(e.at)}</span>${e.elapsedMs!==undefined?`<span>${(e.elapsedMs/1000).toFixed(2)} seconds</span>`:''}</div><pre>${esc(JSON.stringify(e.evidence,null,2))}</pre><p class="evidence-note">Actual application input/output from this run. No private model reasoning is exposed.</p>`);}
async function refreshHealth(){
  $('connection-text').textContent='Checking AWS';
  try{const r=await api('/api/health');const h=await r.json();if(!r.ok)throw new Error(h.error);state.health=h;renderModels(h);$('connection-text').textContent=h.ok?'Online':'Needs attention';$('connection').classList.toggle('is-connected',h.ok);const stock=h.services.find(s=>s.name==='Aurora PostgreSQL')?.details?.ax218_seats;if(stock!==undefined)updateStock(stock);}
  catch(error){state.health=null;$('connection-text').textContent='Offline';$('connection').classList.remove('is-connected');announce(error.message);}
}
async function stopRequest(){const session=state.sessionId;state.active?.abort();stopPlayback();state.pendingLayer=null;state.paused=false;state.queue=state.queue.slice(0,state.cursor);if(!currentAssistant())return;currentAssistant().pending=false;currentAssistant().failed='Request stopped. This run is incomplete; no itinerary was reserved.';renderChat();try{await api('/api/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:session})});}catch{};}
async function action(name,source){
  if(name==='cancel-flight')cancelFlight();
  if(name==='resolve-trip'){cancelFlight();await submit(initialQuery);}
  if(name==='connection')openConnection();
  if(name==='refresh-connection'){await refreshHealth();$('detail-dialog').close();openConnection();}
  if(name==='data'){showView('prepare');const section=document.querySelector('.retrieval-choices').closest('section');const page=$('prepare-view');page.scrollTop+=section.getBoundingClientRect().top-page.getBoundingClientRect().top-8;renderNav('architecture');}
  if(name==='source-preparation')showView('prepare');
  if(name==='solution-briefing')showView('briefing');
  if(name==='memory-tab'){
    const showcase=source?.closest('.memory-showcase');
    const id=source?.dataset.memoryTab;
    if(showcase&&id){
      showcase.querySelectorAll('[role="tab"]').forEach(tab=>{
        const selected=tab.dataset.memoryTab===id;
        tab.setAttribute('aria-selected',String(selected));
        tab.tabIndex=selected?0:-1;
      });
      showcase.querySelectorAll('[role="tabpanel"]').forEach(panel=>{
        panel.hidden=panel.id!==`memory-panel-${id}`;
      });
      showcase.querySelector(`[role="tab"][data-memory-tab="${id}"]`)?.focus();
    }
  }
  if(name==='back-concierge')showView(null);
  if(name==='talk-track')openDialog('Talk track',talkNotes(),'notes-dialog');
  if(name==='load-request'){$('composer').value=initialQuery;$('composer').focus();}
  if(name==='trip-details'){state.tripExpanded=!state.tripExpanded;renderTrip();}
  if(name==='close-dialog')$('detail-dialog').close();
  if(name==='profile')openDialog('Alex has a meeting to make.',`<div class="profile"><img src="assets/concierge/alex-morgan.jpg" alt="Portrait of Alex"><div><p class="dialog-lead">A client in Lisbon. A fixed deadline. A plan that suddenly changes.</p><p>Alex is a London designer travelling to Ribeira Design Studio for a client meeting at <strong>14:00 on 15 September</strong>, with one hotel night afterwards.</p><p>When her original flight is cancelled, the meeting still stands. She needs a replacement journey that gets her all the way to the venue on time, with a hotel within <strong>20 minutes on foot</strong>.</p><p>The complete trip must stay <strong>under £650</strong>: outbound flight, checked bag, hotel with taxes and airport transfer. She prefers somewhere quiet to finish the day.</p><p><strong>An aisle seat and a quiet hotel.</strong> Her earlier conversation supplies these preferences through AgentCore Memory. A window seat requested for this trip takes precedence.</p><p><strong>A declared shellfish allergy.</strong> Aurora stores this separately from preferences. Catering data is not supplied, so the concierge must flag carrier confirmation.</p><p class="profile-disclosure">Alex is a fictional demo persona. Her portrait is AI-generated.</p></div></div>`);
  if(name==='presenter'||name==='auto-mode'){state.presenter=name==='presenter';state.paused=state.presenter;state.pendingLayer=null;stopPlayback();if(!state.paused)schedule();renderControls();announce(state.presenter?'Display paused. Advance an event or a layer.':'Events reveal at the selected pace.');}
  if(name==='toggle-traces'){state.traceOpen=!state.traceOpen;if(innerWidth<=1000)document.body.classList.toggle('mobile-traces-open');else document.body.classList.toggle('traces-hidden',!state.traceOpen);}
  if(name==='latest'){$('transcript').scrollTop=$('transcript').scrollHeight;state.chatAnchor=null;}
  if(name==='follow'){state.inspectedTurn=null;state.follow=true;const last=state.visible.findLast(e=>e.type==='trace');if(last)state.openLayer=last.layer;renderTraces();}
  if(name==='play-pause'){state.paused=!state.paused;state.pendingLayer=null;if(state.paused)stopPlayback();else schedule();renderControls();}
  if(name==='next-event'){state.inspectedTurn=null;state.follow=true;state.paused=true;state.pendingLayer=null;stopPlayback();revealOne();}
  if(name==='next-layer'){
    if(state.cursor>=state.queue.length&&!state.active)return;
    stopPlayback();state.paused=true;state.inspectedTurn=null;state.follow=true;
    const next=state.queue.slice(state.cursor).find(e=>e.type==='trace'),last=state.visible.findLast(e=>e.type==='trace');
    state.pendingLayer=next?next.layer:last?(last.phase==='result'?Math.min(5,last.layer+1):last.layer):0;
    revealBeat();
  }
  if(name==='replay'&&!state.active){stopPlayback();state.cursor=0;state.visible=[];state.animatedEvents.clear();state.follow=true;state.paused=true;state.replaying=true;state.inspectedTurn=null;state.pendingLayer=null;state.openLayer=null;Object.assign(currentAssistant(),{text:'',plan:null,hotelResults:null,booking:null,bookingRefused:null,policyDecision:null,currentLayer:undefined,pending:true,failed:null,replay:true,status:'Replay is paused. Advance an event or a semantic layer.'});renderChat();renderTraces();}
  if(name==='semantic'){state.semantic=!state.semantic;updateSemantic();announce(state.semantic?'Semantic layer on: the next question runs through the six components.':'Semantic layer off: the next question goes to the model alone, with no tools, memory or policy.');}
  if(name==='retry')await submit(state.lastQuery,state.lastOptions||{});
  if(name==='book-trip'){if(state.messages.some(m=>m.booking||m.bookingRefused))return;await submit('Book this itinerary for Alex.',{confirmBooking:true});}
  if(name==='stop')await stopRequest();
  if(name==='new-chat'){if(state.active)await stopRequest();clearReveal();stopPlayback();state.sessionId='onward-'+crypto.randomUUID();state.messages=[];state.queue=[];state.visible=[];state.cursor=0;state.openLayer=null;state.pendingLayer=null;state.replaying=false;state.paused=state.presenter;state.cancelled=false;state.tripExpanded=true;state.inspectedTurn=null;renderTrip();renderChat();renderTraces();$('composer').value=initialQuery;$('composer').focus();}
  if(name==='timed-reveal'){clearReveal();state.revealDeadline=Date.now()+Number(source?.dataset.seconds||10)*1000;renderTrip();const tick=()=>{const remaining=Math.ceil((state.revealDeadline-Date.now())/1000);if($('timer-status'))$('timer-status').textContent=`Cancellation in ${remaining}s`;if(remaining<=0)cancelFlight();};tick();state.revealTimer=setInterval(tick,200);}
  if(name==='cancel-timer')clearReveal();
  if(name==='stock'){
    try{const r=await api('/api/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({soldOut:!state.soldOut})});const result=await r.json();if(!r.ok)throw new Error(result.error);state.soldOut=result.offer.seats===0;updateStock(result.offer.seats);announce(`AX218 now has ${result.offer.seats} seats in Onward’s Aurora inventory.`);if(state.messages.length)await submit('Please recheck the current flight availability and find the best complete trip with my existing constraints.');}
    catch(error){openDialog('Inventory update',`<p>${esc(error.message)}</p>`);}
  }
  if(name==='journey-details'){
    const plan=state.messages.find(m=>m.role==='assistant'&&m.turn===Number(source?.dataset.journeyTurn))?.plan;if(!plan)return;
    openDialog('The complete journey',`<p>Route checks over the Neptune flight legs and Aurora inventory for this answer.</p><div class="route-checks">${plan.routes.map(r=>`<section><h3>${esc(r.offer.id)} · ${esc(r.offer.description)}</h3><p>Landing ${time(r.landing)} → meeting ${time(r.venueArrival)}</p><strong class="${r.feasible?'service-ok':'service-error'}">${r.feasible?'Meets timing and connection rules':esc(r.reasons.join(' '))}</strong></section>`).join('')}</div><p>Checked ${esc(plan.checkedAt)}. Fictional supplier data; no seats or rooms reserved.</p>`);
  }
}

document.addEventListener('click',event=>{const b=event.target.closest('button, a.wordmark, a[data-action]');if(!b)return;
  if(b.matches('a.wordmark')){event.preventDefault();action('new-chat');}
  if(b.matches('a[data-action]'))event.preventDefault();
  if(b.dataset.action)action(b.dataset.action,b);
  if(b.dataset.layer!==undefined){const layer=Number(b.dataset.layer);state.openLayer=state.openLayer===layer?null:layer;state.follow=false;renderTraces();}
  if(b.dataset.source!==undefined)inspectSource(Number(b.dataset.source),Number(b.dataset.sourceTurn||state.messages[Number(b.closest('[data-message]')?.dataset.message)]?.turn||state.turn));
  if(b.dataset.event)inspectEvent(b.dataset.event);
  if(b.dataset.documentId){const message=state.messages.find(m=>m.turn===Number(b.dataset.documentTurn)&&m.role==='assistant');const d=message?.documents?.find(d=>d.id===b.dataset.documentId);if(d)openDialog(d.title,`<p class="source-uri">${esc(d.source_uri)}</p><p class="seed-note">Exact S3 version ${esc(d.version_id)}</p><p class="dialog-lead">${esc(d.document.text)}</p><p class="seed-note">Fictional authored policy, retrieved in this answer. AWS request ${esc(d.requestId)}</p>`,'source-dialog');}
  if(b.dataset.prompt)submit(b.dataset.prompt);
});
$('chat-form').addEventListener('submit',e=>{e.preventDefault();submit($('composer').value);});
$('composer').addEventListener('input',()=>{$('chat-form').classList.toggle('has-draft',Boolean($('composer').value.trim()));});
$('composer').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit($('composer').value);}});
document.addEventListener('change',e=>{
 if(e.target.id==='pace'){state.pace=Number(e.target.value);if(!state.paused||state.pendingLayer!==null)schedule();}
 if(e.target.id==='model'){state.modelId=e.target.value;announce(`Model set to ${e.target.selectedOptions[0].textContent}; it applies to your next question.`);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearReveal();stopPlayback();if(state.queue.length||state.active){state.paused=true;state.pendingLayer=null;renderControls();}}});
window.addEventListener('pagehide',()=>{clearReveal();stopPlayback();state.active?.abort();});
renderTrip();renderChat();renderTraces();updateSemantic();$('composer').value=initialQuery;refreshHealth();showView(viewForPath(location.pathname),false);

function updateStock(seats){state.soldOut=seats===0;$('stock-label').textContent=seats===0?'Sold out':`${seats} seats`;$('stock-toggle').setAttribute('aria-label',state.soldOut?'Restore flight availability in Aurora':'Sell out the preferred flight in Aurora');}
function renderNav(current){for(const link of document.querySelectorAll('.site-nav a')){if(link.dataset.nav===current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}}
function showView(view,push=true){
 state.view=view;renderNav(view||'concierge');
 if(push)history.pushState({},'',view?ROUTES[view]:'/');
 if(view){clearReveal();stopPlayback();state.paused=true;state.pendingLayer=null;renderControls();}
 $('prepare-view').innerHTML=view==='prepare'?preparation(state.visible):'';
 $('briefing-view').innerHTML=view==='briefing'?briefing(state.health):'';
 $('app').hidden=Boolean(view);
 for(const [name,id] of Object.entries(PAGES))$(id).hidden=view!==name;
 document.body.classList.toggle('preparing',Boolean(view));
 if(view){const page=$(PAGES[view]);page.scrollTop=0;page.querySelector('h1')?.focus();}
 else $('composer').focus();
}
window.addEventListener('popstate',()=>showView(viewForPath(location.pathname),false));
$('detail-dialog').addEventListener('close',()=>state.dialogFocus?.isConnected&&state.dialogFocus.focus());

new ResizeObserver(entries=>document.documentElement.style.setProperty('--dock-height',entries[0].target.getBoundingClientRect().height+'px')).observe(document.querySelector('.presenter-dock'));
const transcript=$('transcript');
const trackScroll=()=>document.body.classList.toggle('scrolled-back',
  state.messages.length>0&&transcript.scrollHeight-transcript.scrollTop-transcript.clientHeight>90);
transcript.addEventListener('scroll',trackScroll,{passive:true});
new ResizeObserver(trackScroll).observe(transcript);
