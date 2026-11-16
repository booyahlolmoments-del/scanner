'use strict';
const I=require('./indicators');
const STRATEGIES=[
 {id:'smc',name:'SMC Liquidity Sweep',group:'Structure'},
 {id:'ema',name:'EMA Trend Pullback',group:'Trend'},
 {id:'breakout',name:'Breakout & Retest',group:'Structure'},
 {id:'momentum',name:'Momentum RSI + MACD',group:'Momentum'},
 {id:'volume',name:'Volume Profile',group:'Volume'},
 {id:'meanrev',name:'Mean Reversion',group:'Mean Reversion'},
 {id:'vwap',name:'VWAP Retest',group:'Volume'},
 {id:'priceaction',name:'Price Action',group:'Price Action'}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function base(c,i,dir,id,why,quality=0.65){
 const closes=c.slice(0,i+1).map(x=>x.c),a=I.atr(c.slice(0,i+1),14),at=a[i]||c[i].c*.005;
 const entry=c[i].c, recentLow=I.lowest(c,i+1,12),recentHigh=I.highest(c,i+1,12);
 let sl=dir==='LONG'?Math.min(recentLow,entry-at*1.15):Math.max(recentHigh,entry+at*1.15);
 const risk=Math.abs(entry-sl); if(!risk||risk/entry>.04)return null;
 const rr=3; const tp=entry+(dir==='LONG'?1:-1)*risk*rr;
 return {strategy:id,strategyName:STRATEGIES.find(s=>s.id===id).name,dir,entry,sl,tp,rr,atr:at,quality,reasons:why,barTime:c[i].t};
}
function detectAll(c,i){
 if(i<210)return []; const out=[],x=c[i],p=c[i-1],cl=c.slice(0,i+1).map(z=>z.c),e9=I.ema(cl,9),e20=I.ema(cl,20),e50=I.ema(cl,50),e200=I.ema(cl,200),r=I.rsi(cl),m=I.macd(cl),a=I.atr(c.slice(0,i+1)),bb=I.bollinger(cl),vw=I.vwap(c.slice(0,i+1));
 const atr=a[i]||x.c*.005,volAvg=I.mean(c.slice(i-20,i).map(z=>z.v)),volOK=x.v>volAvg*1.15;
 const add=(id,dir,why,q)=>{const s=base(c,i,dir,id,why,q);if(s)out.push(s)};
 // 1. Liquidity sweep + reclaim + displacement / structure confirmation.
 const low=I.lowest(c,i,12),high=I.highest(c,i,12),priorHigh=I.highest(c,i,8),priorLow=I.lowest(c,i,8);
 if(x.l<low && x.c>low && x.c>priorHigh && x.c>x.o && (x.c-x.o)>atr*.35)add('smc','LONG',['Sell-side liquidity sweep','Bullish structure reclaim','Displacement'],.78);
 if(x.h>high && x.c<high && x.c<priorLow && x.c<x.o && (x.o-x.c)>atr*.35)add('smc','SHORT',['Buy-side liquidity sweep','Bearish structure reclaim','Displacement'],.78);
 // 2. EMA trend alignment and pullback.
 if(e9[i]>e20[i]&&e20[i]>e50[i]&&e50[i]>e200[i]&&x.l<=e20[i]+atr*.15&&x.c>e9[i]&&x.c>x.o)add('ema','LONG',['EMA 9/20/50/200 bullish alignment','Pullback reclaimed EMA 9/20'],.76);
 if(e9[i]<e20[i]&&e20[i]<e50[i]&&e50[i]<e200[i]&&x.h>=e20[i]-atr*.15&&x.c<e9[i]&&x.c<x.o)add('ema','SHORT',['EMA 9/20/50/200 bearish alignment','Pullback rejected EMA 9/20'],.76);
 // 3. Range breakout and retest.
 const rh=I.highest(c,i-1,20),rl=I.lowest(c,i-1,20);
 if(p.c>rh&&x.l<=rh+atr*.2&&x.c>rh&&x.c>x.o)add('breakout','LONG',['20-bar resistance breakout','Retest held','Bullish close'],.74);
 if(p.c<rl&&x.h>=rl-atr*.2&&x.c<rl&&x.c<x.o)add('breakout','SHORT',['20-bar support breakdown','Retest rejected','Bearish close'],.74);
 // 4. Momentum continuation.
 if(r[i]!=null&&r[i]>52&&r[i]<72&&m.hist[i]>0&&m.hist[i]>m.hist[i-1]&&x.c>e20[i])add('momentum','LONG',['RSI bullish momentum','MACD histogram expanding','Price above EMA 20'],.70);
 if(r[i]!=null&&r[i]<48&&r[i]>28&&m.hist[i]<0&&m.hist[i]<m.hist[i-1]&&x.c<e20[i])add('momentum','SHORT',['RSI bearish momentum','MACD histogram expanding down','Price below EMA 20'],.70);
 // 5. Approximate rolling volume-profile POC from price bins.
 const vp=c.slice(i-60,i),minP=Math.min(...vp.map(z=>z.l)),maxP=Math.max(...vp.map(z=>z.h)),bins=24,arr=Array(bins).fill(0),step=(maxP-minP)/bins||1;
 vp.forEach(z=>{const k=clamp(Math.floor((((z.h+z.l+z.c)/3)-minP)/step),0,bins-1);arr[k]+=z.v});const poc=minP+(arr.indexOf(Math.max(...arr))+.5)*step;
 if(x.c>poc&&x.c>e20[i]&&volOK)add('volume','LONG',['Above rolling volume-profile POC','Relative volume expansion'],.70);
 if(x.c<poc&&x.c<e20[i]&&volOK)add('volume','SHORT',['Below rolling volume-profile POC','Relative volume expansion'],.70);
 // 6. Mean reversion only when price is stretched and momentum turns.
 if(bb[i]&&x.l<bb[i].lower&&x.c>bb[i].lower&&r[i]<35)add('meanrev','LONG',['Lower Bollinger Band rejection','RSI oversold'],.68);
 if(bb[i]&&x.h>bb[i].upper&&x.c<bb[i].upper&&r[i]>65)add('meanrev','SHORT',['Upper Bollinger Band rejection','RSI overbought'],.68);
 // 7. VWAP reclaim / rejection.
 if(p.c<vw[i-1]&&x.c>vw[i]&&x.c>x.o&&x.c>e20[i])add('vwap','LONG',['VWAP reclaim','Trend filter bullish'],.72);
 if(p.c>vw[i-1]&&x.c<vw[i]&&x.c<x.o&&x.c<e20[i])add('vwap','SHORT',['VWAP rejection','Trend filter bearish'],.72);
 // 8. Candle pattern with structure context.
 const body=Math.abs(x.c-x.o),range=x.h-x.l,lower=Math.min(x.o,x.c)-x.l,upper=x.h-Math.max(x.o,x.c);
 if(x.c>x.o&&p.c<p.o&&x.c>p.o&&x.o<p.c&&body>atr*.35&&x.c>e50[i])add('priceaction','LONG',['Bullish engulfing','Above EMA 50 structure filter'],.69);
 if(x.c<x.o&&p.c>p.o&&x.c<p.o&&x.o>p.c&&body>atr*.35&&x.c<e50[i])add('priceaction','SHORT',['Bearish engulfing','Below EMA 50 structure filter'],.69);
 if(lower>body*2&&upper<body*.7&&x.c>e50[i]&&x.c>x.o)add('priceaction','LONG',['Bullish rejection wick','Above EMA 50'],.66);
 if(upper>body*2&&lower<body*.7&&x.c<e50[i]&&x.c<x.o)add('priceaction','SHORT',['Bearish rejection wick','Below EMA 50'],.66);
 return out;
}
function scoreSetup(s,c,i,context={}){
 const cl=c.slice(0,i+1).map(x=>x.c),e20=I.ema(cl,20),e50=I.ema(cl,50),e200=I.ema(cl,200),r=I.rsi(cl),m=I.macd(cl),x=c[i];
 const long=s.dir==='LONG';let trend=long?(e20[i]>e50[i]?1:0)+(e50[i]>e200[i]?1:0):(e20[i]<e50[i]?1:0)+(e50[i]<e200[i]?1:0);
 let momentum=long?(r[i]>50&&m.hist[i]>0):(r[i]<50&&m.hist[i]<0);
 const volAvg=I.mean(c.slice(Math.max(0,i-20),i).map(z=>z.v)),volume=x.v>volAvg*1.1;
 const structure=s.reasons.some(z=>/sweep|breakout|engulfing|structure/i.test(z));
 const weights={structure:20,trend:15,momentum:10,volume:15,liquidity:15,entry:10,rr:10,market:5};
 const liquidity=s.strategy==='smc'||s.strategy==='volume';
 const points=(structure?weights.structure:10)+(trend?weights.trend:5)+(momentum?weights.momentum:3)+(volume?weights.volume:6)+(liquidity?weights.liquidity:7)+weights.entry+weights.rr+(context.marketOK?weights.market:3);
 return Math.min(100,Math.round(points));
}
module.exports={STRATEGIES,detectAll,scoreSetup};
