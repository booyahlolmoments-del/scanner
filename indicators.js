'use strict';
const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0;
function ema(values, period) {
  if (!values.length) return [];
  const k=2/(period+1), out=[]; let v=values[0];
  values.forEach((x,i)=>{v=i?x*k+v*(1-k):x;out.push(v)}); return out;
}
function sma(values, period) { return values.map((_,i)=>i+1<period?null:mean(values.slice(i+1-period,i+1))); }
function rsi(values, period=14) {
  const out=Array(values.length).fill(null); if(values.length<=period)return out;
  let g=0,l=0; for(let i=1;i<=period;i++){const d=values[i]-values[i-1];if(d>0)g+=d;else l-=d;}
  g/=period;l/=period;out[period]=l===0?100:100-100/(1+g/l);
  for(let i=period+1;i<values.length;i++){const d=values[i]-values[i-1];g=(g*(period-1)+Math.max(d,0))/period;l=(l*(period-1)+Math.max(-d,0))/period;out[i]=l===0?100:100-100/(1+g/l)} return out;
}
function atr(candles, period=14) {
  const tr=candles.map((c,i)=>i?Math.max(c.h-c.l,Math.abs(c.h-candles[i-1].c),Math.abs(c.l-candles[i-1].c)):c.h-c.l);
  return ema(tr,period);
}
function bollinger(values, period=20, mult=2) {
  const mid=sma(values,period); return values.map((_,i)=>{if(mid[i]==null)return null;const a=values.slice(i+1-period,i+1),m=mid[i],sd=Math.sqrt(mean(a.map(x=>(x-m)**2)));return {mid:m,upper:m+mult*sd,lower:m-mult*sd}});
}
function macd(values) {const e12=ema(values,12),e26=ema(values,26),line=values.map((_,i)=>e12[i]-e26[i]),signal=ema(line,9);return {line,signal,hist:line.map((x,i)=>x-signal[i])};}
function vwap(candles, period=50) {return candles.map((_,i)=>{const a=candles.slice(Math.max(0,i-period+1),i+1);let pv=0,v=0;for(const c of a){const p=(c.h+c.l+c.c)/3;pv+=p*c.v;v+=c.v}return v?pv/v:a[a.length-1].c})}
function highest(c,i,n){let x=-Infinity;for(let j=Math.max(0,i-n);j<i;j++)x=Math.max(x,c[j].h);return x}
function lowest(c,i,n){let x=Infinity;for(let j=Math.max(0,i-n);j<i;j++)x=Math.min(x,c[j].l);return x}
module.exports={mean,ema,sma,rsi,atr,bollinger,macd,vwap,highest,lowest};
