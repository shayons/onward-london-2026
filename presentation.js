import {travelData as data} from './data/travel.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=p=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2,minimumFractionDigits:p%100?2:0}).format(p/100);
export const hotelImages={'patio-house':'assets/concierge/hotel-patio-house.jpg','forum-rooms':'assets/concierge/hotel-forum-rooms.jpg','coast-retreat':'assets/concierge/hotel-coast-retreat.jpg'};
export const serviceNames={aurora:'Aurora PostgreSQL',bedrock:'Amazon Bedrock',agentcore:'AgentCore',memory:'AgentCore Memory',neptune:'Neptune Analytics',s3:'Amazon S3'};
const serviceRoles=[{bedrock:'Typed intent extraction',agentcore:'Live tool orchestration'},{aurora:'Shared entity IDs and aliases'},{memory:'Remembered traveller preferences',bedrock:'Titan text embeddings',aurora:'Hybrid: vector + keyword retrieval; rank fusion'},{aurora:'SQL: fare + bag + hotel + transfer'},{neptune:'Connected journey paths',s3:'Versioned timing and connection policies'},{aurora:'Reviewed query pattern + fresh availability'},{agentcore:'Gateway policy check (Cedar) before the tool runs',aurora:'One seat and one room reserved atomically'}];
export function serviceBadges(keys,layer){return `<span class="service-badges ${layer!==undefined?'with-roles':''}">${keys.map(key=>`<span class="service-badge"><img src="assets/aws/${key==='memory'?'agentcore':key}.svg" alt="" width="24" height="24"><span>${serviceNames[key]}${layer!==undefined?`<small>${serviceRoles[layer]?.[key]||''}</small>`:''}</span></span>`).join('')}</span>`;}
export const layerServices=[['bedrock','agentcore'],['aurora'],['memory','bedrock','aurora'],['aurora'],['neptune','s3'],['aurora'],['agentcore','aurora']];
export const layerContributions=[
 'Make success explicit: the meeting venue, the deadline and the whole-trip budget.',
 'Make the same person, airport and venue mean the same thing across every store.',
 'Turn tomorrow and nearby into constraints. Retrieve hotel descriptions with both semantic vector similarity and full-text keyword relevance, fuse their ranks, and apply remembered hotel and seat preferences. Keep declared allergies separate: Aurora supplies the declaration, and absent catering evidence remains unverified.',
 'Measure the complete journey, including the costs an advertised fare leaves out.',
 'Check whether all the connected steps can actually get Alex to the meeting.',
 'Apply the reviewed pattern, recheck current facts and support the final answer.',
 'Act only when allowed: the gateway evaluates the Cedar policies against the booking arguments, then the tool reserves one seat and one room in the fictional inventory and returns a reference. The policy sees the call, not the prose: its inputs are the runtime’s selected itinerary, so the model cannot talk its way past it.'
];

export function hotelTiles(hotels,live=false){return `<div class="hotel-grid ${live?'live-hotel-grid':''}">${hotels.map((h,i)=>{const walk=h.walk_minutes??h.walkMinutes,price=h.night_pence??h.nightPence;return `<article class="hotel-tile"><img src="${hotelImages[h.id]}" alt="AI-generated illustration for fictional ${esc(h.name)}" loading="lazy"><div class="hotel-tile-body"><h3>${esc(h.name)}</h3><p>${esc(h.description)}</p><div class="hotel-stats"><span>walk <strong>${walk}m</strong></span><span><strong>${money(price)}</strong> / night</span><span>lexical <strong>${live?Number(h.lexical_score).toFixed(2):'—'}</strong></span><span>semantic <strong>${live?Number(h.similarity).toFixed(2):'—'}</strong></span></div><div class="hotel-ranking">${live?`<span>Hybrid rank <strong>${i+1}</strong></span>`:'<span>Scores appear after a live search</span>'}<span class="${walk>20?'outside-walk':'within-walk'}">${walk>20?'Outside the 20-minute walk':'Within the walking limit'}</span></div><small>Fictional hotel · AI-generated illustration</small></div></article>`;}).join('')}</div>`;}

export function preparation(events=[]){
 const matches=events.findLast(e=>e.type==='trace'&&e.layer===2&&e.phase==='result')?.evidence?.hotels;
 const returned=events.findLast(e=>e.type==='trace'&&e.layer===4&&e.phase==='result')?.evidence?.sources||[];
 return `<header class="prepare-header"><button class="quiet-button" data-action="back-concierge">← Back to the concierge</button><h1 id="prepare-title" tabindex="-1">Data preparation</h1><p>The question is the last step. Start with supplier rows, descriptions, policies and an earlier conversation. Prepare the meaning they share.</p><span class="seed-note">Authored seed data · 15 September 2026 · live decisions query AWS</span></header>
 <div class="prepare-content">
 <section class="preparation-overview"><div><h2>One meeting. Several kinds of truth.</h2><p>Alex must reach Ribeira Design Studio by 14:00, with one nearby hotel night and the complete outbound trip strictly under £650.</p><p>Meaning helps find relevant hotels. Prices, policies and connected routes establish whether the journey works.</p></div><figure><img src="assets/concierge/venue-ribeira.jpg" alt="AI-generated illustration of the fictional Ribeira Design Studio"><figcaption>Fictional meeting venue · AI-generated illustration</figcaption></figure></section>
 <section><h2>Supplier row → typed offer</h2><p>Normalise airport IDs and integer-pence amounts. Keep baggage as its own cost line.</p>${serviceBadges(['aurora'])}<div class="table-scroll"><table><thead><tr><th>Flight</th><th>Fare</th><th>Fare pence</th><th>Bag pence</th><th>Seed seats</th></tr></thead><tbody>${data.offers.map(o=>`<tr><th>${o.id}</th><td>${money(o.farePence)}</td><td><code>${o.farePence}</code></td><td><code>${o.bagPence}</code></td><td>${o.seats}</td></tr>`).join('')}</tbody></table></div><p class="seed-note">This table documents the seed snapshot. The AX218 inventory control changes the Aurora record; each live run reads its current availability.</p></section>
 <section><h2>A complete price needs a definition.</h2><div class="formula"><span>Outbound fare</span><b>+</b><span>Checked bags</span><b>+</b><span>Hotel with taxes</span><b>+</b><span>Airport transfer</span></div><p>Use <code>complete_total &lt; budget_pence</code>. The £650 boundary is exactly 65000 pence; equality fails. Travel to Heathrow and return travel are outside this trip's scope.</p></section>
 <section id="hotel-preparation"><h2>Hotels: description, walk, hybrid rank</h2><p>Bedrock Titan embeds hotel text. Aurora combines lexical and semantic ranks using reciprocal rank fusion. The walking limit is a separate hard constraint.</p>${serviceBadges(['bedrock','aurora'])}${hotelTiles(matches||data.hotels,Boolean(matches))}<p class="seed-note">${matches?'Scores returned by the latest revealed Aurora search. Semantic similarity and lexical relevance measure different things; their ranks form the hybrid order.':'Seed descriptions, prices and walking times. Run the question and reveal Disambiguation to see the actual retrieval scores here.'}</p></section>
 <section><h2>Relationships make the whole journey visible.</h2><p>Neptune returns the path. Application rules validate continuity and elapsed time against source policies.</p>${serviceBadges(['neptune','s3'])}<div class="journey-diagram" role="img" aria-label="A flight reaches Lisbon airport. Add 45 minutes for arrivals and 35 minutes for the transfer to reach the meeting. Hotels connect to the meeting by walking edges."><div><span>Flight legs</span><b>→</b><span>Lisbon airport</span><b>→</b><span>45 min arrivals</span><b>→</b><span>35 min transfer</span><b>→</b><strong>Meeting venue</strong></div><div><span>Hotel</span><b>→</b><span>Walking edge ≤20 min</span><b>→</b><strong>Same venue ID</strong></div></div><div class="route-lessons"><article><h3>The late arrival</h3><p>AX404 lands at <strong>13:20</strong>. Add the allowance and transfer: Alex reaches the venue at <strong>14:40</strong>. A flight arriving before the meeting still fails.</p></article><article><h3>The short connection</h3><p>ME615 arrives Madrid at <strong>10:00 +02:00</strong> and departs at <strong>10:45 +02:00</strong>. The <strong>45 elapsed minutes</strong> fail the <strong>60-minute</strong> rule.</p></article></div></section>
 <section><h2>A conversation becomes scoped preferences.</h2>${serviceBadges(['memory'])}<blockquote>${esc(data.memory.quote)}</blockquote><p>Actor <code>alex-onward</code> has an onboarding conversation in AgentCore Memory. Long-term preference extraction is asynchronous. A shellfish-allergy declaration is stored explicitly in Aurora, independently of the Memory toggle; it is not a preference score. Live traces name the actual records retrieved and distinguish a saved-conversation fallback.</p><p>Long-term preferences influence eligible hotel and seat ranking. A request such as “window for this trip” is kept in AgentCore short-term conversation memory, with long-term extraction skipped. Current requests take precedence; memory never establishes fare, stock or schedule facts.</p></section>
 <section><h2>Keep the source behind the rule.</h2>${serviceBadges(['s3','aurora'])}<div class="prepared-sources">${data.sources.map(d=>{const live=returned.find(r=>r.id===d.id);return `<article><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p><small>${live?`Retrieved S3 version <code>${esc(live.version_id)}</code>`:`Authored seed source · <code>${d.id}</code>`}</small>${live?`<code class="source-uri">${esc(live.source_uri)}</code>`:''}</article>`;}).join('')}</div><p class="seed-note">Known policy IDs select exact S3 versions. Document embeddings are prepared; policy reads here do not use S3 Vectors.</p></section>
 <section><h2>Which retrieval answers which question.</h2><p>Relevance is not feasibility. Each approach answers a different kind of question, and the wrong one fails quietly: it returns something plausible instead of nothing.</p><div class="retrieval-choices">${[
 ['aurora','Exact / relational','What is true right now?','One correct current answer exists: a price, a stock count, a policy threshold.','The user\u2019s words do not match your column values.','Aurora SQL sums fare + bag + hotel + transfer, then rechecks AX218 seats immediately before ranking.'],
 ['aurora','Keyword (lexical)','Which records literally contain these terms?','Names, codes, rare tokens and exact phrases the user typed.','The traveller says \u201cquiet\u201d and the description never uses the word.','PostgreSQL full-text ranking over the three fictional hotel descriptions.'],
 ['bedrock','Embeddings','What does this text mean, as numbers?','Meaning has to survive different wording \u2014 the model turns descriptions and the live question into comparable vectors.','Used alone \u2014 an embedding retrieves nothing by itself, ranks nothing, and knows no current fact.','Bedrock Titan Text Embeddings V2 embeds the three hotel descriptions at seed time and the traveller\u2019s question at query time.'],
 ['aurora','Vector search','Which stored records are nearest in meaning?','Paraphrase and intent: \u201csomewhere quiet\u201d matching a description that never uses the word.','Nothing suitable exists \u2014 it still returns a nearest neighbour, and it can never tell you a price or whether a room is free.','pgvector cosine similarity in Aurora over the stored hotel embeddings.'],
 ['aurora','Hybrid (rank fusion)','Which records are relevant both literally and semantically?','Mixed vocabulary, where neither the keyword rank nor the vector rank alone can be trusted.','A constraint is required \u2014 fusion reorders candidates, it cannot exclude one.','Reciprocal rank fusion of the keyword and vector ranks inside Aurora; the 20-minute walk stays a separate hard filter.'],
 ['neptune','Graph traversal','Do the steps actually connect?','Multi-hop journeys and reachability that would otherwise need repeated self-joins.','The edge exists but the timing does not \u2014 the graph returns a path, your rules decide feasibility.','Neptune returns flight-leg, transfer and walking edges; application rules then reject AX404 (venue at 14:40) and ME615 (45 minutes against a 60-minute rule).']
].map(([key,name,answers,wins,fails,onward])=>`<article><div class="choice-name"><img src="assets/aws/${key}.svg" alt="" width="34" height="34"><div><h3>${name}</h3><strong>${serviceNames[key]}</strong></div></div><dl><dt>Answers</dt><dd>${answers}</dd><dt>Wins when</dt><dd>${wins}</dd><dt>Fails when</dt><dd>${fails}</dd><dt>In Onward</dt><dd class="choice-onward">${onward}</dd></dl></article>`).join('')}</div><p class="choice-order"><strong>Order matters more than choice.</strong> Meaning finds candidates; constraints decide between them. Bedrock embeds, Aurora searches and fuses, Neptune connects the steps, and only then does Aurora price and recheck whatever survived. Reverse that and you confidently recommend a cheap flight that misses the meeting.</p><p class="seed-note">Two responsibilities sit outside retrieval: AgentCore Runtime coordinates the live calls and AgentCore Memory scopes remembered preferences to Alex, while Amazon S3 keeps the versioned policy behind each rule. S3 Vectors and DynamoDB are not provisioned for a corpus this small \u2014 add a specialist store when a concrete retrieval or operational requirement earns it.</p></section>
 <footer class="prepare-footer"><p>People, offers, hotels, policies and imagery are fictional. Imported portraits, destination and property scenes are AI-generated; no image identifies a bookable property.</p><a href="data/travel.json" target="_blank" rel="noopener">Open the source dataset</a><button class="primary" data-action="back-concierge">Back to the concierge →</button></footer></div>`;
}
export function talkNotes(){return `<p class="dialog-lead">A six-minute story, with room to pause.</p><ol class="talk-track">${[
 ['0:00','Meet Alex','A London designer, a booked trip to Lisbon, a 14:00 meeting and one hotel night. The complete replacement budget is £650.'],
 ['0:40','Reveal the cancellation','AX201 is cancelled. The meeting still stands. Use the manual reveal or a timed reveal, then send the complete request.'],
 ['1:20','Make meaning explicit','Next layer reveals business context, shared entities, then ambiguous words and remembered preferences. Ask what data each responsibility needs.'],
 ['2:40','Explain the two traps','Aurora prices the whole trip. Neptune paths show that AX404 reaches the meeting at 14:40, and ME615 has only 45 minutes to connect against a 60-minute rule.'],
 ['4:00','Reveal the supported itinerary','The quiet-hotel baseline is AX218 with Pátio House: £490, at the meeting at 12:25. Source chips return to the evidence. Nothing is booked yet.'],
 ['4:30','Book it under policy','One click on Book this for Alex. The gateway evaluates the Cedar policies against the exact arguments before the tool runs, then one seat and one room are reserved in the fictional inventory. To show a refusal: sell out AX218, run again, and book the Meridian Europe fare the agent now selects; the airline rule forbids it.'],
 ['5:00','Change the data or the intent','Sell out AX218 in Aurora, ask to arrive earlier, or reduce the budget to £450. Restore the stock after the experiment. Open the trace link once, then finish in Data preparation: the data makes the answer possible.']
 ].map(([time,title,body])=>`<li><time>${time}</time><h3>${title}</h3><p>${body}</p></li>`).join('')}</ol><p class="seed-note">Pause controls the display, not AWS execution. Replay uses recorded evidence. Waiting means the next real event has not arrived.</p>`;}

// ---------------------------------------------------------------------------------------
// Solution briefing: what Onward is, what it runs on, and where the boundaries sit.
// The diagram is authored from the deployed topology; nodes without an official AWS mark
// are drawn as plain labelled boxes rather than given an invented icon.
const archNode=({x,y,w,h,icon,title,lines=[],dashed=false,accent=false})=>`
 <g class="arch-node${dashed?' arch-dashed':''}${accent?' arch-accent':''}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"></rect>
  ${icon?`<image href="assets/aws/${icon}.svg" x="${x+16}" y="${y+15}" width="26" height="26"></image>`:''}
  <text class="arch-title" x="${x+(icon?52:16)}" y="${y+33}">${title}</text>
  ${lines.map((line,i)=>`<text class="arch-sub" x="${x+16}" y="${y+56+i*17}">${line}</text>`).join('')}
 </g>`;

const archEdge=(d,label,{dashed=false,bidirectional=false,lx=0,ly=0}={})=>`
 <g class="arch-edge${dashed?' arch-edge-dashed':''}${bidirectional?' arch-edge-io':''}">
  <path d="${d}" ${bidirectional?'marker-start="url(#arrowhead-start)" ':''}marker-end="url(#arrowhead)"></path>
  ${label?`<text class="arch-label" x="${lx}" y="${ly}">${label}</text>`:''}
 </g>`;

export function architectureDiagram(){
 return `<figure class="arch-figure">
 <svg viewBox="0 0 1160 770" role="img" aria-labelledby="arch-caption" preserveAspectRatio="xMidYMid meet">
  <defs>
   <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"></path></marker>
   <marker id="arrowhead-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10 0 L0 5 L10 10 z"></path></marker>
  </defs>

  <rect class="arch-lane" x="20" y="20" width="1120" height="230" rx="16"></rect>
  <text class="arch-band" x="36" y="48">How a request reaches the agent</text>
  <text class="arch-route-title" x="36" y="82">Published</text>
  <text class="arch-route-title" x="36" y="184">Local alternative</text>

  ${archNode({x:150,y:62,w:160,h:72,title:'Browser',lines:['No AWS credentials']})}
  ${archNode({x:370,y:62,w:190,h:72,title:'CloudFront',lines:['Basic auth · routing']})}
  ${archNode({x:620,y:38,w:210,h:72,icon:'s3',title:'S3 site bucket',lines:['Private static files']})}
  ${archNode({x:620,y:132,w:210,h:72,title:'Lambda function URL',lines:['IAM origin · SSE proxy']})}
  ${archNode({x:150,y:164,w:160,h:72,dashed:true,title:'Browser',lines:['Local development']})}
  ${archNode({x:370,y:164,w:190,h:72,dashed:true,title:'server.mjs',lines:['Same API · credential chain']})}
  ${archNode({x:900,y:82,w:220,h:112,icon:'agentcore',accent:true,title:'AgentCore Runtime',lines:['Onward agent · Strands SDK','ADOT traces to CloudWatch']})}

  ${archEdge('M310 98 L364 98','HTTPS',{bidirectional:true,lx:319,ly:88})}
  ${archEdge('M560 92 L614 74','static site',{lx:566,ly:66})}
  ${archEdge('M560 106 L590 106 L590 168 L614 168','/api/*',{bidirectional:true,lx:568,ly:151})}
  ${archEdge('M830 168 L894 142','',{bidirectional:true})}
  ${archEdge('M310 200 L364 200','localhost',{dashed:true,bidirectional:true,lx:317,ly:190})}
  ${archEdge('M560 200 L590 200 L590 222 L860 222 L860 180 L894 166','',{dashed:true,bidirectional:true})}

  <text class="arch-band" x="36" y="298">What the agent calls</text>
  ${archNode({x:60,y:316,w:290,h:96,icon:'bedrock',title:'Amazon Bedrock',lines:['Typed contract · grounded prose','Titan embeddings for the tools']})}
  ${archNode({x:435,y:316,w:290,h:96,icon:'agentcore',accent:true,title:'AgentCore Gateway',lines:['Six MCP tools · IAM-signed calls','Policy: Cedar before every tool']})}
  ${archNode({x:790,y:316,w:270,h:96,title:'Onward tools (Lambda)',lines:['Deterministic rules over real data','Full evidence out, compact result back']})}

  ${archEdge('M960 194 L960 268 L205 268 L205 312','model calls',{bidirectional:true,lx:540,ly:262})}
  ${archEdge('M1010 194 L1010 286 L580 286 L580 312','MCP over HTTPS · SigV4',{bidirectional:true,lx:640,ly:281})}
  ${archEdge('M725 364 L786 364','invoke',{bidirectional:true,lx:735,ly:355})}
  ${archEdge('M840 412 L840 444 L205 444 L205 412','Titan embeddings',{bidirectional:true,dashed:true,lx:470,ly:438})}
  ${archEdge('M1085 194 L1085 460 L1060 460 L1060 506','conversation',{bidirectional:true,dashed:true,lx:1092,ly:330})}

  <path class="arch-trunk" d="M955 412 L955 480"></path>
  <path class="arch-bus" d="M150 480 L1000 480"></path>

  ${archNode({x:80,y:510,w:220,h:110,icon:'aurora',title:'Aurora PostgreSQL',lines:['Profile · prices · hybrid search','Bookings: one seat, one room']})}
  ${archNode({x:340,y:510,w:220,h:110,icon:'neptune',title:'Neptune Analytics',lines:['Journey and walking','relationships']})}
  ${archNode({x:600,y:510,w:220,h:110,icon:'s3',title:'S3 policy sources',lines:['Versioned rules and','example evidence']})}
  ${archNode({x:845,y:510,w:235,h:110,icon:'agentcore',title:'AgentCore Memory',lines:['Events · facts · preferences','summaries · episodes']})}

  ${archEdge('M190 480 L190 506','facts · search · booking',{bidirectional:true,lx:112,ly:470})}
  ${archEdge('M450 480 L450 506','paths',{bidirectional:true,lx:433,ly:470})}
  ${archEdge('M710 480 L710 506','policies',{bidirectional:true,lx:686,ly:470})}
  ${archEdge('M960 480 L960 506','preferences',{bidirectional:true,lx:925,ly:470})}

  <g class="arch-legend">
   <line x1="36" y1="690" x2="78" y2="690"></line><text x="88" y="695">Published path</text>
   <line class="arch-legend-dashed" x1="226" y1="690" x2="268" y2="690"></line><text x="278" y="695">Local alternative · secondary calls</text>
   <path d="M545 690 L587 690" marker-start="url(#arrowhead-start)" marker-end="url(#arrowhead)"></path><text x="599" y="695">Request and returned records or stream</text>
  </g>
  <text class="arch-boundary" x="36" y="740">The browser never makes AWS calls. The runtime signs every gateway request with its own role; the gateway's policy engine decides before the tools Lambda runs.</text>
 </svg>
 <figcaption id="arch-caption">Onward's request and evidence paths. Solid connectors show the published CloudFront route; dashed connectors show the local alternative and secondary calls. Double-ended arrows pair each request with its returned records or server-sent event stream. The runtime calls Bedrock directly for the typed contract and the prose, and reaches every other store only through AgentCore Gateway, whose Cedar policies are evaluated before the tools Lambda is invoked. The Lambda calls Aurora, Neptune, S3, Bedrock Titan and Memory; the runtime also persists the conversation to Memory through the Strands session manager. Strands runs inside the runtime rather than as a separate service. Lambda and the browser carry no official mark, so they are drawn as plain boxes. The two S3 nodes name their distinct jobs: static delivery and versioned policy evidence.</figcaption>
 </figure>`;
}

const AGENT_STEPS=[
 ['Resolves the goal into a typed contract',
  'Bedrock, through Strands, turns one sentence into validated arguments: arrival at the venue by 14:00, a complete budget under £650, one hotel night, a 20-minute walking limit. Nothing downstream reads the sentence again.'],
 ['Discovers its tools through AgentCore Gateway',
  'The runtime lists six MCP tools from the Onward gateway with IAM-signed requests: resolve entities, search hotels, price bundles, validate journeys, select the itinerary and book the trip. Every tool call from here on passes through the gateway and its Cedar policy engine.'],
 ['Resolves the entities',
  'resolve_entities: Aurora maps “me”, “Heathrow” and “my meeting” onto stable identifiers that every other store already uses, and reports whether the route, date and stay are inside the seeded inventory.'],
 ['Disambiguates the words that need context',
  'search_hotels: “tomorrow” becomes 2026-09-15 against a fixed clock, “nearby” becomes a hard 20-minute walk, and remembered preferences from AgentCore Memory become a source-backed search phrase that Titan embeds and Aurora ranks with pgvector similarity fused with full-text relevance. Preferences influence rank only.'],
 ['Measures the complete trip',
  'price_bundles: parameterised Aurora SQL prices fare + checked bag + tax-inclusive hotel + airport transfer across all fifteen candidate bundles, in integer pence, against one shared definition of what a trip costs.'],
 ['Validates the whole journey',
  'validate_journeys: Neptune returns flight-leg, transfer and walking edges. The tool applies the arrival allowance and minimum connection time from Aurora’s versioned definitions and fetches the source policies those definitions cite from S3 by version ID, so the evidence shows which document version applied.'],
 ['Grounds the answer, and books only when asked',
  'select_itinerary runs the complete-price query again immediately before ranking, so the itinerary reflects availability at the moment of answering; the model writes the prose from a compact result while the full evidence goes to the trace rail. A separate turn, started by one click, calls book_trip. The gateway permits or forbids it by policy before the Lambda reserves one seat and one room in the fictional inventory.'],
];

const MCP_TOOLS=[
 ['aurora','resolve_entities','Ontology. Resolves the traveller, both airports, the trip and the venue against the Aurora entity registry and reports whether the request is inside the seeded inventory.'],
 ['agentcore','search_hotels','Disambiguation. Retrieves actor-scoped preferences from AgentCore Memory, maps them to source-backed vocabulary, embeds the phrase with Titan and runs Aurora hybrid retrieval.'],
 ['aurora','price_bundles','Metrics. Prices every flight-and-hotel bundle with the one complete-price definition, in integer pence, over current records.'],
 ['neptune','validate_journeys','Relationships. Fetches Neptune paths and the versioned S3 policies, then applies the arrival allowance and connection rules to every route.'],
 ['aurora','select_itinerary','Verified examples. Reruns the price query, keeps only bundles that pass every hard constraint and ranks the eligible ones by priority, preference and seat.'],
 ['agentcore','book_trip','Booking. Reserves one seat and one room atomically in the fictional Aurora inventory and records a booking reference. Callable only when Cedar permits.'],
];

const CEDAR_POLICIES=[
 ['onward_read_tools','Any authorised caller may use the five read tools.',
  'permit(principal, action in [AgentCore::Action::"OnwardTools___resolve_entities", AgentCore::Action::"OnwardTools___search_hotels", AgentCore::Action::"OnwardTools___price_bundles", AgentCore::Action::"OnwardTools___validate_journeys", AgentCore::Action::"OnwardTools___select_itinerary"], resource == AgentCore::Gateway::"<gateway-arn>");'],
 ['onward_traveller_booking','A booking is permitted only when the traveller confirmed it, the complete price is under the stated budget and the itinerary reaches the venue in time.',
  'permit(principal, action == AgentCore::Action::"OnwardTools___book_trip", resource == AgentCore::Gateway::"<gateway-arn>") when { context.input.travellerConfirmed == true && context.input.totalPence < context.input.budgetPence && context.input.arrivesBeforeDeadline == true };'],
 ['onward_airline_rules','In this fictional world only Aster Air accepts agent bookings; a Meridian Europe fare must be booked by a human agent. The rule also refuses an offer with no seat left or without seat selection in the fare.',
  'forbid(principal, action == AgentCore::Action::"OnwardTools___book_trip", resource == AgentCore::Gateway::"<gateway-arn>") when { context.input.carrier != "Aster Air" || context.input.seatsAvailable < 1 || context.input.seatSelectionIncluded == false };'],
];

const DEMO_SKILLS=[
 ['Recover a disrupted trip','Composes all six semantic components into one eligible itinerary, then rechecks current availability before answering.'],
 ['Explain why an option fails','Turns route evidence into a specific rejection: late venue arrival, short connection, excessive walk, unavailable stock or complete price.'],
 ['Re-rank eligible options','Changes earliest, cheapest, quiet or lively prioritisation only after every hard constraint has passed.'],
 ['Diagnose no match','Keeps the deadline and budget intact, reports the limiting constraint and names the minimum feasible complete price when one exists.'],
 ['Apply traveller context safely','Uses remembered preferences or a one-trip override for ranking while keeping declarations, prices, schedules and availability source-backed.'],
 ['Refuse a booking honestly','When the gateway denies book_trip, reports the policy reason, reserves nothing and does not retry.'],
];

const MEMORY_TABS=[
 ['facts','Facts','Extracted records · recorded',
  `<div class="memory-record"><span class="memory-record-kind">Extracted fact</span><strong>Alex Morgan is a London-based designer.</strong><small><code>mem-0db3…a0f</code> + <code>mem-59cb…fe1</code> · AgentCore Memory</small></div>
   <div class="memory-record"><span class="memory-record-kind">Extracted fact</span><strong>Travelling to Lisbon for a client meeting at 14:00 on 15 September 2026.</strong><small><code>mem-582d…fa2</code> · AgentCore Memory</small></div>
   <p class="memory-panel-note">These records describe conversation context. The current request and source systems still establish the live trip contract.</p>`],
 ['preferences','Preferences','Extracted records · recorded',
  `<div class="memory-record"><span class="memory-record-kind">Extracted preference</span><strong>Quiet hotels within walking distance for business travel; one checked bag; aisle seat.</strong><small><code>mem-e481…974</code> · AgentCore Memory</small></div>
   <div class="memory-record"><span class="memory-record-kind">Extracted preference</span><strong>Normally checks one bag when travelling.</strong><small><code>mem-91f5…df5</code> · AgentCore Memory</small></div>
   <p class="memory-panel-note">Preferences can influence rank. They cannot establish the £490 price, a 12-minute walk, a schedule or current availability.</p>`],
 ['summary','Session summary','Extracted summary · recorded',
  `<div class="memory-record"><span class="memory-record-kind">Extracted session summary</span><strong>Traveller profile</strong><p>Alex Morgan · designer · London.</p></div>
   <div class="memory-record"><strong>Trip and preferences</strong><p>Lisbon client meeting · one checked bag · aisle seat · quiet hotel within 20 minutes on foot.</p><small><code>mem-92c4…99e8</code> · AgentCore Memory</small></div>
   <p class="memory-panel-note">The summary also records that fares, schedules, walking time and availability must be verified from source systems.</p>`],
 ['episodic','Episodic','Extracted episode · recorded',
  `<div class="memory-record"><span class="memory-record-kind">Extracted episode · situation</span><strong>A London-based designer is planning a business trip to Lisbon for a client meeting at 14:00 on 15 September. They provided travel preferences (checked bag, aisle seat, quiet hotel within 20 minutes walk of the meeting venue) and a £650 budget cap for the full package in the event the original flight is cancelled.</strong><small><code>mem-0000…08e</code> · AgentCore Memory · extracted 9 September 2026</small></div>
   <div class="memory-record"><span class="memory-record-kind">Reflection</span><p>“At the initial context-gathering stage, the correct pattern is to defer tool use entirely and focus on accurately capturing user preferences and constraints. Key constraints to carry forward include: checked bag, aisle seat preference, quiet hotel within 20-minute walking distance of the meeting venue, £650 total budget cap (applicable if original flight is cancelled), and a hard arrival deadline tied to a 14:00 meeting on 15 September in Lisbon.”</p></div>
   <p class="memory-panel-note">The episode is AgentCore's own assessment of one completed exchange. Onward's runtime does not read episodes; the constraints it enforces come from the current request and Aurora.</p>`],
];

function memoryShowcase(){
 const tabs=MEMORY_TABS.map(([id,label,status],i)=>`<button id="memory-tab-${id}" role="tab" aria-selected="${i===1}" aria-controls="memory-panel-${id}" tabindex="${i===1?'0':'-1'}" data-action="memory-tab" data-memory-tab="${id}"><span>${label}</span><small>${status}</small></button>`).join('');
 const panels=MEMORY_TABS.map(([id,,,content],i)=>`<div id="memory-panel-${id}" class="memory-panel" role="tabpanel" aria-labelledby="memory-tab-${id}" ${i===1?'':'hidden'}>${content}</div>`).join('');
 return `<section id="briefing-memory" class="memory-showcase"><div class="memory-showcase-heading"><div><span class="memory-eyebrow">AgentCore Memory · recorded strategy output</span><h2>One message becomes reusable context</h2><p>Alex's onboarding message is stored once. AgentCore strategies process it into different kinds of memory, each with its own retrieval boundary. The records below were returned by the deployed strategies and copied here on 9 September 2026; the page does not query Memory itself.</p></div><span class="memory-live"><i></i> Four strategies active</span></div>
 <blockquote class="memory-input">“When I travel for work, I prefer an aisle seat. I like a quiet hotel and I would rather walk to the meeting. I normally check one bag.”</blockquote>
 <div class="memory-demo-grid">
  <div class="memory-browser">
   <div class="memory-tabs" role="tablist" aria-label="AgentCore Memory strategies">${tabs}</div>
   <div class="memory-panels">${panels}</div>
  </div>
  <div class="memory-recall">
   <span class="memory-eyebrow">Worked example · cited recall</span>
   <p class="memory-question">What would suit Alex after the cancellation?</p>
   <p class="memory-answer">Alex usually prefers an aisle seat and a quiet hotel within walking distance <button type="button" data-action="memory-tab" data-memory-tab="preferences">[P1]</button>. The prior session says to verify the changing trip facts from source systems <button type="button" data-action="memory-tab" data-memory-tab="summary">[S1]</button>. <strong>Pátio House</strong> fits those preferences; its price, walk, arrival and stock do not come from memory.</p>
   <article class="memory-product">
    <img src="${hotelImages['patio-house']}" alt="AI-generated illustration for fictional Pátio House" loading="lazy">
    <div><span class="confirmed">Supported itinerary</span><h3>AX218 · Pátio House</h3><strong class="memory-price">£490</strong>
     <dl><div><dt>At the meeting</dt><dd>12:25</dd></div><div><dt>Walk</dt><dd>12 min</dd></div><div><dt>Seat preference</dt><dd>Aisle available</dd></div></dl>
     <p><span>Aurora</span><span>Neptune</span><span>AgentCore Memory</span></p>
    </div>
   </article>
 </div>
 </div>
 <div class="memory-integration">
  <div class="memory-integration-heading"><span class="memory-eyebrow">How Memory integrates with Aurora</span><h3>Separate stores, joined in the runtime</h3><p><strong>Aurora is not the backing store for AgentCore Memory.</strong> No AgentCore event, fact, preference, summary or episode is mirrored into an Aurora memory table in this build.</p></div>
  <ol>
   <li><span>1</span><div><strong>AgentCore Memory retrieves context</strong><p>Actor-scoped records supply soft context such as “quiet hotel”, “walk to meetings” and “aisle seat”.</p></div></li>
   <li><span>2</span><div><strong>The runtime resolves precedence</strong><p>The current request overrides remembered preference. Aurora's traveller entity supplies explicit declarations, such as the shellfish allergy, as separate authoritative application data.</p></div></li>
   <li><span>3</span><div><strong>Aurora searches and validates products</strong><p>The runtime maps the preference to source-backed vocabulary, Bedrock creates the query embedding, and Aurora runs pgvector plus full-text rank fusion. Aurora SQL then prices every flight-and-hotel bundle; the application rules discard the ones that fail, and the price query runs again before ranking.</p></div></li>
  </ol>
  <p class="memory-integration-result"><span>AgentCore Memory</span><b>personal context</b><i>→ Runtime →</i><span>Amazon Bedrock</span><b>query embedding</b><i>→</i><span>Aurora PostgreSQL</span><b>profile, search, price, stock</b></p>
 </div>
 <p class="capability-boundary"><strong>Boundary:</strong> Memory supplies personal context across sessions. Aurora, Neptune and versioned S3 policies still establish the product facts and whether the complete journey is valid. The example uses fictional inventory and makes no booking.</p></section>`;
}

const SERVICE_ROLES=[
 ['aurora','Aurora PostgreSQL','Entity registry, explicit traveller declarations, cost and policy definitions, offers and hotels, pgvector embeddings and full-text indexes, and the bookings table. It does not store AgentCore Memory records. The tools read with a reader secret and book with a separate writer secret.'],
 ['bedrock','Amazon Bedrock','Interprets the request into the typed contract, plans with the gateway tools and streams the grounded answer. Titan Text Embeddings V2 embeds hotel descriptions at seed time and, at query time, a hotel search phrase built from the traveller’s preferences.'],
 ['agentcore','AgentCore Runtime','Hosts the Python agent, signs every gateway request with its execution role, persists the conversation to Memory through the Strands session manager and returns a server-sent event stream of application trace events. ADOT auto-instrumentation sends its spans to CloudWatch.'],
 ['agentcore','AgentCore Gateway and Policy','Serves the six Onward tools over MCP from one Lambda target with IAM inbound authorisation. Its policy engine evaluates three Cedar policies on every call, in ENFORCE mode; book_trip is permitted only when the traveller confirmed, the price is under budget and the itinerary reaches the venue in time, and forbidden when the airline rule fails: only Aster Air accepts agent bookings in this fictional world.'],
 ['agentcore','AgentCore Memory','Holds short-term events plus extracted facts, preferences, session summaries and completed episodes, scoped to the fictional traveller. Never a source of fares, stock or schedules.'],
 ['neptune','Neptune Analytics','The journey graph: flight legs, airport-to-venue transfers and hotel-to-venue walks.'],
 ['s3','Amazon S3','Versioned original policy and example documents, plus immutable deployment artefacts. Retrieved evidence carries the object version it came from.'],
];

export function briefing(health){
 const models=Object.values(health?.models||{});
 return `<header class="prepare-header"><button class="quiet-button" data-action="back-concierge">← Back to the concierge</button>
 <h1 id="briefing-title" tabindex="-1">Solution briefing</h1>
 <p>Onward turns one natural-language request into a complete, constraint-satisfying itinerary, shows the prepared data behind every part of the answer, and books it on one confirmed click, under policy. This is how it is built and where the boundaries sit.</p>
 <span class="seed-note">Data For AI Day London · 14 September 2026 · fictional inventory, live AWS execution</span></header>
 <div class="prepare-content">

 <section><h2>Overview</h2>
 <p>A business traveller's flight is cancelled. The meeting does not move. One question has to become a replacement trip that satisfies a hard deadline, a strict budget, a walking limit and current availability <em>at the same time</em>.</p>
 <p>The agent runs on Amazon Bedrock AgentCore Runtime using the Strands Agents SDK. Its tools are served by AgentCore Gateway over MCP and implemented in one Lambda function over data prepared in Aurora PostgreSQL, Neptune Analytics, Amazon S3 and AgentCore Memory. Every tool call is checked by Cedar policies at the gateway, every answer streams alongside the actual tool requests, returned records and service request IDs that produced it, and every run leaves an OpenTelemetry trace in CloudWatch.</p>
 <p><strong>The claim this demonstrates:</strong> a relevant search result is only one ingredient. An agent needs prepared, connected, well-defined data before it can give an answer that meets the user's goal, and it needs governance outside its own code before it can act on that answer.</p></section>

 <section><h2>What the agent does</h2>
 <ol class="agent-steps">${AGENT_STEPS.map(([title,body],i)=>
   `<li><span class="step-index">${i+1}</span><div><strong>${title}</strong><p>${body}</p></div></li>`).join('')}</ol></section>

 <section><h2>What the model does, and what the code does</h2>
 <p>The model is called for the typed trip contract, then plans by calling six MCP tools served by AgentCore Gateway with IAM-signed requests, then writes the prose from the last tool's compact result. The deterministic rules, the deadline arithmetic, the complete-price definition, the connection minimum, the availability checks, live inside the tools, not in the prompt. AgentCore Policy evaluates Cedar policies on every book_trip call before the Lambda runs, so whether the agent may act is decided outside the agent's code. That is why the answer can be verified, the booking can be governed and the model can be swapped.</p>
 <div class="capability-columns">
  <div class="capability-panel"><h3>What the model decides</h3><p>Three things, and nothing else.</p>
   <ol class="capability-list capability-skills">${[['Interpretation','Which typed contract the sentence means: deadline, budget, bags, nights, walking limit, priority, preferences, allergies.'],['Sequencing','When to call which tool, with the contract values. The system prompt prescribes the order; the tool results are what the model sees.'],['Wording','The prose of the answer, and the refusal wording when a booking is denied. Every number is copied from the tool result.']].map(([name,body],i)=>
    `<li><span>${i+1}</span><div><strong>${name}</strong><p>${body}</p></div></li>`).join('')}</ol>
  </div>
  <div class="capability-panel"><h3>Behaviours the rules produce</h3><p>Each is a branch of the same deterministic planner inside the tools, exercised by the main request, a follow-up chip or the booking click.</p>
   <ol class="capability-list capability-skills">${DEMO_SKILLS.map(([name,body],i)=>
    `<li><span>${i+1}</span><div><strong>${name}</strong><p>${body}</p></div></li>`).join('')}</ol>
  </div>
 </div>
 <p class="capability-boundary"><strong>Boundary:</strong> no framework “skill” is involved, and the model cannot reach a store directly. It sees six tools and their descriptions; the gateway, its policy engine and the Lambda decide what those tools do and whether they may run.</p></section>

 <section><h2>Tools over MCP</h2>
 <p>Six tools, one Lambda target, one gateway. The runtime discovers them with an MCP <code>tools/list</code> call and invokes them with <code>tools/call</code>; the gateway names each one <code>OnwardTools___&lt;tool&gt;</code>. Every result carries its AWS request IDs. The runtime keeps the full evidence for the trace rail and hands the model a compact view, which is why the tool results below read as evidence rather than as prompt filler.</p>
 <div class="capability-list">${MCP_TOOLS.map(([key,name,body])=>
   `<article class="capability-tool"><img src="assets/aws/${key}.svg" alt="" width="30" height="30"><div><strong><code>${name}</code></strong><p>${body}</p></div></article>`).join('')}</div>
 <p class="seed-note">Inbound authorisation is AWS IAM: the runtime signs each MCP request with SigV4 using its own execution role, which is granted <code>bedrock-agentcore:InvokeGateway</code> on this gateway only. The gateway's role may invoke this one Lambda; the Lambda's role reads with the Onward reader secret and books with a separate writer secret.</p></section>

 <section><h2>Governance with Cedar</h2>
 <p>Policy in AgentCore attaches a Cedar policy engine to the gateway. The engine is default-deny: a tool call is blocked unless a policy permits it, and a forbid always wins. Three policies govern Onward, written exactly as they are provisioned; the gateway ARN is substituted at deployment.</p>
 <div class="cedar-list">${CEDAR_POLICIES.map(([name,plain,statement])=>
   `<article class="cedar-policy"><h3><code>${name}</code></h3><p>${plain}</p><pre class="cedar">${esc(statement)}</pre></article>`).join('')}</div>
 <p>The arguments those conditions read, <code>travellerConfirmed</code>, <code>totalPence</code>, <code>budgetPence</code>, <code>arrivesBeforeDeadline</code>, <code>carrier</code>, <code>seatsAvailable</code> and <code>seatSelectionIncluded</code>, are part of the <code>book_trip</code> tool schema, so the policy is evaluated against the actual call. The engine runs in ENFORCE mode. A denied call never reaches the Lambda; the agent receives the refusal, explains it and does not retry. To see the airline rule fire: sell out AX218 with the Flight availability control, run the request again so the agent selects ME330 with Pátio House, a Meridian Europe fare, then click Book this for Alex.</p>
 <p class="capability-callout"><strong>Why this matters.</strong> The gateway evaluates these policies against the tool call itself, before any Onward code runs. Adding or tightening a rule is a policy change, not a deployment. The values the policies read come from the runtime’s selected itinerary, not from the model’s prose, so the model cannot talk its way past them.</p>
 <p class="capability-boundary"><strong>Boundary:</strong> the policies govern the fictional Onward inventory. They demonstrate where such rules belong, outside the agent's code and enforced on every call, not a production airline's contract of carriage.</p></section>

 ${memoryShowcase()}

 <section><h2>Observability</h2>
 <p>The runtime is auto-instrumented with the AWS Distro for OpenTelemetry. Model calls, gateway tool calls and Memory operations become spans in the agent's own CloudWatch log group; sessions, traces, token usage and durations appear in the CloudWatch GenAI Observability dashboard. Each run carries its trace id in the <code>run</code> event, the trace rail shows it beside a link to the dashboard, and the connection dialog names the latest one.</p>
 <p>Two kinds of record coexist and are kept distinct. The trace rail shows application tool events: arguments, SQL and graph queries, returned rows, source versions and request IDs. The OpenTelemetry trace shows the same run as timed spans across the runtime, Bedrock, the gateway and Memory. Neither exposes private model reasoning.</p>
 <p class="seed-note">CloudWatch Transaction Search is enabled in the account. Spans go to <code>/aws/bedrock-agentcore/runtimes/&lt;runtime&gt;-DEFAULT</code> alongside the structured application events, under the same KMS key and seven-day retention.</p></section>

 <section><h2>Booking</h2>
 <p>After a supported itinerary, the card offers one button: <strong>Book this for Alex</strong>. One click sends a booking turn with the traveller's confirmation attached. The runtime passes <code>travellerConfirmed</code> and the selected itinerary's exact values to the agent, the agent calls <code>book_trip</code> through the gateway, Cedar permits or forbids it, and only then does the Lambda reserve one seat on the flight and one room at the hotel in a single atomic Aurora statement, recording a booking reference. The card then shows the reference, the seats and rooms left, and the policy decision.</p>
 <p>The inventory is fictional. Nothing is sent to an airline or a hotel, no payment is taken, and the Flight availability control restores the seats after a rehearsal.</p></section>

 <section><h2>Architecture highlights</h2>
 <h3>Every store answers a different question</h3>
 <p>Onward uses several engines on purpose, and each one earns its place by answering something the others cannot. Relational truth, keyword matching, vector similarity, rank fusion and the booking ledger all live in Aurora; reachability lives in Neptune; provenance lives in S3; the traveller's history lives in AgentCore Memory; the rules about acting live in the gateway's policy engine.</p>
 <p class="seed-note">S3 Vectors and DynamoDB are deliberately <em>not</em> provisioned. For a corpus this small they would be decoration in the request path. Add a specialist store when a concrete retrieval or operational requirement earns it.</p>

 <h3>The deterministic boundary</h3>
 <p>The model interprets intent, sequences the tools and writes the prose. It never decides feasibility and it never decides whether it may act. Deadline arithmetic, the complete-price definition, minimum connection times and availability are application rules inside the tools over current records; the permission to book is a Cedar decision at the gateway. That is why the answer can be trusted and the model can be swapped.</p>
 <p>Two seeded traps make the first boundary visible. <strong>AX404</strong> is the cheapest fare and lands at 13:20, comfortably before the deadline; a 45-minute arrival allowance plus a 35-minute transfer puts Alex at the venue at <strong>14:40</strong>. <strong>ME615</strong> connects in Madrid in <strong>45 elapsed minutes</strong> against a 60-minute rule. The check works in elapsed time across time zones, so a connection that looks fine on local clocks could not slip through either.</p>

 <h3>Model choice is a parameter, not a code path</h3>
 <p>The contract call and the planning agent both go through Strands, so the presenter can change model between questions from the dock${models.length?`: ${models.join(', ')}`:''}. The allowlist lives in <code>infra/deployed.json</code>; the runtime's execution role is scoped to exactly those inference profiles, so a request naming anything else falls back to the default.</p>
 <p>The interesting result is not which model wins. In our rehearsal runs, Claude Haiku 4.5 read “by 2pm” as a request for the <em>earliest</em> arrival, set <code>priority: earliest</code> in the typed contract and returned a different, more expensive, entirely valid itinerary. Every deterministic check held identically. Only the interpretation of intent moved, which is the semantic layer's boundary made visible in one click. Model output varies between runs, so treat this as something to look for rather than a guarantee.</p></section>

 <section id="briefing-architecture"><h2>Architecture</h2>${architectureDiagram()}
 <h3>Data flow</h3>
 <div class="flow-diagram" role="img" aria-label="Browser to CloudFront to the Lambda function URL, which invokes the AgentCore Runtime. The agent calls Bedrock through Strands for the contract, then calls six tools through AgentCore Gateway, where Cedar policies are evaluated before the tools Lambda queries Aurora, Neptune, S3 and Memory. Trace events stream back to the browser; spans go to CloudWatch.">
  <div><span>Browser</span><b>→</b><span>CloudFront</span><b>→</b><span>Lambda function URL</span><b>→</b><strong>AgentCore Runtime</strong></div>
  <div><strong>Agent loop</strong><b>→</b><span>Strands + Bedrock</span><b>→</b><span>AgentCore Gateway + Cedar</span><b>→</b><span>Tools Lambda</span><b>→</b><span>Aurora · Neptune · S3 · Memory</span></div>
  <div><strong>Server-sent events</strong><b>→</b><span>six semantic responsibilities</span><b>→</b><span>itinerary</span><b>→</b><span>streamed answer</span><b>→</b><span>booking under policy</span></div>
  <div><strong>OpenTelemetry</strong><b>→</b><span>ADOT on the runtime</span><b>→</b><span>CloudWatch GenAI Observability</span></div>
 </div></section>

 <section><h2>Key AWS services</h2>
 <div class="service-roles">${SERVICE_ROLES.map(([key,name,role])=>
   `<article><img src="assets/aws/${key}.svg" alt="" width="30" height="30"><div><h3>${name}</h3><p>${role}</p></div></article>`).join('')}</div>
 <p class="seed-note">AWS Lambda carries no official mark in this build, so it is named rather than iconised: one function serves the six tools behind the gateway, another proxies the published API. Aurora reuses an existing cluster with an isolated <code>onward</code> database. CloudWatch Logs holds structured trace events and OpenTelemetry spans with request IDs under a KMS key and seven-day retention.</p></section>

 <section><h2>Delivery and access</h2>
 <p>The same application runs two ways. Locally, <code>server.mjs</code> serves the static files and proxies the API using the developer's AWS credential chain. Published, a private S3 bucket and a streaming Lambda sit behind CloudFront.</p>
 <ul class="briefing-list">
  <li><strong>The browser never holds AWS credentials</strong> on either path. Lambda or the local server invokes AgentCore Runtime; the runtime's role calls Bedrock and signs its gateway requests.</li>
  <li><strong>The gateway accepts only IAM-signed requests</strong>: SigV4 from the runtime's execution role, which is granted <code>InvokeGateway</code> on this one gateway. No bearer tokens, no identity provider, no shared secret in code.</li>
  <li><strong>The static bucket is private</strong>, with all four public-access blocks on and a policy scoped to the one distribution.</li>
  <li><strong>The API's function URL is <code>AWS_IAM</code></strong>, reachable only by CloudFront through an origin access control scoped to that distribution. Because Lambda rejects unsigned payloads, the page sends a SHA-256 of each request body.</li>
  <li><strong>A CloudFront function enforces basic auth</strong> on every path and rewrites the client-side routes.</li>
  <li><strong>The publish script refuses to regress</strong>: it fails if the function URL is ever not IAM, if any resource-policy statement becomes an unscoped wildcard, or if the bucket stops blocking public access.</li>
 </ul></section>

 <section><h2>Interface</h2>
 <p>A concierge workspace on the left, an evidence rail on the right, presenter controls along the bottom.</p>
 <ul class="briefing-list">
  <li><strong>Reasoning steps</strong> accumulate as the run proceeds — each semantic responsibility with its own one-line summary and the AWS marks of the services doing that step — then collapse to a single line when the run completes.</li>
  <li><strong>The evidence rail</strong> expands each responsibility into its question, its actual tool arguments, SQL or graph queries, returned records, source versions, service request IDs and measured durations. A seventh row, Booking, appears only when a booking turn runs, with the policy decision. These are application execution events, not model reasoning.</li>
  <li><strong>The trace link</strong> in the rail footer shows the run's OpenTelemetry trace id and opens the CloudWatch GenAI Observability dashboard.</li>
  <li><strong>Presenter controls</strong> pace, pause, step by event or by layer, replay a recorded run without new AWS calls, switch the semantic layer off for a model-only comparison, change flight availability in Aurora, and swap the model.</li>
  <li><strong>Follow-ups</strong> each exercise a different responsibility: re-rank on time, explain a rejected route, flip the semantic hotel match, force an honest no-match, override remembered preference for one trip.</li>
  <li><strong>Book this for Alex</strong> is one click on the itinerary card; the confirmation card shows the reference, the seats and rooms left and the policy decision, or the refusal reason with no success styling.</li>
 </ul></section>

 <section><h2>Verification and boundaries</h2>
 <p>Deterministic rules are covered by unit tests over the fixtures, <code>tests/test_planner.py</code> for the planner that the tools Lambda runs and <code>tests/engine.test.mjs</code> for the browser prototype, both run by <code>npm test</code>. <code>scripts/smoke.py</code> makes a real invocation through the deployed runtime, gateway and tools, and saves the whole event stream, including both rejected routes, the complete price and, when asked, the booking decision.</p>
 <p>Onward is a connected AWS demonstration over a deliberately bounded fictional dataset. It is not a booking service, a live supplier feed or a production travel-policy authority. People, offers, hotels, prices, walking times and policies are authored fixtures; portraits and property scenes are AI-generated; a booking reserves fictional inventory in Aurora and nothing else. Unsupported routes and dates are explained rather than silently substituted, and a service failure or a policy refusal is shown rather than replaced with a local fixture.</p></section>

 <footer class="prepare-footer"><p>Fictional traveller, fictional inventory, live AWS execution.</p>
 <button class="quiet-button" data-action="source-preparation">See how the data was prepared →</button>
 <button class="primary" data-action="back-concierge">Back to the concierge →</button></footer></div>`;
}
