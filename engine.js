'use strict';
const {detectAll,scoreSetup,STRATEGIES}=require('./strategies');
const {atr,mean}=require('./indicators');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function evaluate(candles,symbol,tf){
 const c=candles.slice(0,-1); // ignore still-forming candle
 if(c.length<220)return {symbol,tf,error:'Insufficient candle history'};
 const i=c.length-1,candidates=[];
 const marketOK=Math.abs(c[i].c-c[i-20].c)/c[i-20].c<.12;
 for(let age=0;age<=2;age++){
  const at=i-age,raw=detectAll(c,at);
  for(const s of raw){
   let invalid=false;
   for(let j=at+1;j<=i;j++){const z=c[j],sl=s.dir==='LONG'?z.l<=s.sl:z.h>=s.sl,tp=s.dir==='LONG'?z.h>=s.tp:z.l<=s.tp;if(sl||tp){invalid=true;break}}
   if(invalid)continue;
   const score=scoreSetup(s,c,at,{marketOK});
   const risk=Math.abs(s.entry-s.sl),reward=Math.abs(s.tp-s.entry);
   const feeEstimate=.0012*s.entry,netRR=Math.max(0,(reward-feeEstimate)/(risk+feeEstimate));
   if(netRR<1.5)continue;
   candidates.push({...s,symbol,tf,score,netRR:+netRR.toFixed(2),status:age===0?'READY':'FORMING',age,grade:score>=85?'A':score>=75?'B':score>=65?'C':'D',price:c[i].c,updatedAt:c[i].t});
  }
 }
 const history=backtest(c);
 return {symbol,tf,candidates,history,candleTime:c[i].t,price:c[i].c};
}
function backtest(c){
 const by={}; let nextAllowed=210;
 for(let i=210;i<c.length-25;i+=2){
  if(i<nextAllowed)continue;
  const signals=detectAll(c,i);
  if(!signals.length)continue;
  const s=signals.sort((a,b)=>b.quality-a.quality)[0],risk=Math.abs(s.entry-s.sl);if(!risk)continue;
  let result=null,end=Math.min(c.length-1,i+24);
  for(let j=i+1;j<=end;j++){
   const z=c[j],sl=s.dir==='LONG'?z.l<=s.sl:z.h>=s.sl,tp=s.dir==='LONG'?z.h>=s.tp:z.l<=s.tp;
   if(sl&&tp){result=-1.05;break} // conservative same-candle ambiguity
   if(sl){result=-1.05;break} if(tp){result=2.85;break}
  }
  if(result===null)result=(s.dir==='LONG'?c[end].c-s.entry:s.entry-c[end].c)/risk;
  const key=s.strategy;by[key]??=[];by[key].push(result);nextAllowed=i+3;
 }
 const out={};for(const [k,a] of Object.entries(by)){
  const wins=a.filter(x=>x>0),gp=wins.reduce((x,y)=>x+y,0),gl=-a.filter(x=>x<=0).reduce((x,y)=>x+y,0);
  out[k]={trades:a.length,winRate:a.length?wins.length/a.length:0,profitFactor:gl?gp/gl:0,expectancy:a.length?mean(a):0,status:a.length>=100?'PROVISIONAL':a.length>=20?'LOW_SAMPLE':'INSUFFICIENT'};
 }
 return out;
}
function consolidate(results){
 const all=results.flatMap(r=>r.candidates||[]);
 // Cluster same coin/direction/timeframe signals; don't count correlated strategies as independent trades.
 const groups=new Map();for(const s of all){const key=[s.symbol,s.tf,s.dir].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)}
 const merged=[];for(const group of groups.values()){
  group.sort((a,b)=>b.score-a.score);const best=group[0],families=[...new Set(group.map(x=>x.strategyName))];
  const boost=Math.min(8,(families.length-1)*3);
  merged.push({...best,score:Math.min(100,best.score+boost),strategies:families,confluenceCount:families.length,grade:best.score+boost>=85?'A':best.score+boost>=75?'B':'C'});
 }
 return merged.sort((a,b)=>b.score-a.score||b.netRR-a.netRR);
}
module.exports={evaluate,consolidate};
