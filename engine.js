// Independent fixture checks for the demo arithmetic. The shipped UI does not run this;
// tests/engine.test.mjs uses it to pin the numbers the talk quotes.
import {travelData as data} from './data/travel.js';
const defaults={memory:true,priority:'balanced',soldOut:false,budgetPence:65000};
const formatMoney=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(pence/100);
const localTime=(stamp,zone='Europe/Lisbon')=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:zone}).format(new Date(stamp));
export const minutesBetween=(a,b)=>(new Date(b)-new Date(a))/60000;
export function planTrip(options={}) {
  const opts={...defaults,...options};
  const routes=data.offers.map(offer=>{
    const last=offer.legs.at(-1),landing=new Date(last.arrive).getTime();
    const venueArrival=new Date(landing+(data.rules.arrivalAllowanceMinutes+data.transfer.minutes)*60000).toISOString();
    const connections=offer.legs.slice(1).map((leg,i)=>({airport:leg.from,minutes:minutesBetween(offer.legs[i].arrive,leg.depart),minimum:data.rules.minimumConnectionMinutes,connected:offer.legs[i].to===leg.from}));
    const reasons=[];
    if(offer.legs[0].from!==data.trip.origin || last.to!==data.trip.destination)reasons.push('Wrong origin or destination.');
    if(offer.legs.some(leg=>minutesBetween(leg.depart,leg.arrive)<=0))reasons.push('Invalid flight times.');
    if(connections.some(c=>!c.connected||c.minutes<c.minimum))reasons.push('Madrid connection is 45 minutes; the demo minimum is 60.');
    if(new Date(venueArrival)>new Date(data.trip.deadline))reasons.push(`Reaches the meeting at ${localTime(venueArrival)}, after the 14:00 deadline.`);
    if(offer.seats<=0 || (opts.soldOut&&offer.id==='AX218'))reasons.push('No seats available in this sample snapshot.');
    if(!data.transfer.available)reasons.push('The required airport transfer is unavailable.');
    return {offer,connections,landing:last.arrive,venueArrival,reasons,feasible:reasons.length===0};
  });
  const bundles=routes.flatMap(route=>data.hotels.map(hotel=>{
    const totalPence=route.offer.farePence+route.offer.bagPence+hotel.nightPence+data.transfer.pricePence;
    const reasons=[...route.reasons];
    if(hotel.walkMinutes>data.trip.maxWalkMinutes)reasons.push(`Hotel is ${hotel.walkMinutes} minutes on foot; the limit is ${data.trip.maxWalkMinutes}.`);
    if(hotel.rooms<=0)reasons.push('Hotel has no rooms available.');
    if(totalPence>=opts.budgetPence)reasons.push(`Complete total ${formatMoney(totalPence)} is not under ${formatMoney(opts.budgetPence)}.`);
    return {id:`${route.offer.id}:${hotel.id}`,route,hotel,totalPence,reasons,eligible:reasons.length===0};
  }));
  const eligible=bundles.filter(b=>b.eligible).sort((a,b)=>{
    if(opts.priority==='earliest'){const delta=new Date(a.route.venueArrival)-new Date(b.route.venueArrival);if(delta)return delta;}
    if(opts.memory&&opts.priority!=='cheapest'&&a.hotel.quiet!==b.hotel.quiet)return Number(b.hotel.quiet)-Number(a.hotel.quiet);
    return a.totalPence-b.totalPence||new Date(a.route.venueArrival)-new Date(b.route.venueArrival);
  });
  return {options:opts,routes,bundles,eligible,selected:eligible[0]||null,deadline:data.trip.deadline};
}
