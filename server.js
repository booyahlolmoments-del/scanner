// Minimal SMS relay. Keep Fast2SMS credentials ONLY in server environment variables.
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:"8kb"}));
app.use(rateLimit({windowMs:60_000,max:8,standardHeaders:true,legacyHeaders:false}));
const PORT=process.env.PORT||3000;
const API_KEY=process.env.FAST2SMS_API_KEY;
const PHONE=process.env.ALERT_PHONE;
const ALLOWED_ORIGIN=(process.env.ALLOWED_ORIGIN||"").split(",").map(x=>x.trim()).filter(Boolean);
app.use((req,res,next)=>{
 const origin=req.headers.origin;
 if(origin && ALLOWED_ORIGIN.length && !ALLOWED_ORIGIN.includes(origin)) return res.status(403).json({error:"Origin not allowed"});
 res.setHeader("Access-Control-Allow-Origin",origin||"*");
 res.setHeader("Vary","Origin");
 res.setHeader("Access-Control-Allow-Headers","Content-Type");
 res.setHeader("Access-Control-Allow-Methods","POST,GET,OPTIONS");
 if(req.method==="OPTIONS")return res.sendStatus(204);
 next();
});
let sent=new Map();
app.get("/health",(req,res)=>res.json({ok:true,smsConfigured:!!(API_KEY&&PHONE)}));
app.post("/api/alert",async(req,res)=>{
 const {symbol,tf,direction,entry,sl,tp,winRate,profitFactor,trades,score}=req.body||{};
 if(!/^(BTC|ETH|LINK|SOL)USDT$/.test(symbol||"")||!["BUY","SELL"].includes(direction)||![entry,sl,tp,winRate,profitFactor,trades,score].every(Number.isFinite))return res.status(400).json({error:"Invalid alert"});
 // Server-side safety gate; never trust a browser's claimed WR alone.
 if(winRate<0.55||profitFactor<1.15||trades<30||score<65)return res.status(422).json({error:"Setup did not pass alert thresholds"});
 if(!API_KEY||!PHONE)return res.status(503).json({error:"SMS not configured on server"});
 const key=[symbol,tf,direction,Number(entry).toFixed(5)].join("|");
 if(sent.has(key)&&Date.now()-sent.get(key)<6*60*60*1000)return res.json({ok:true,duplicate:true});
 const message=`Setup Scanner | ${symbol} ${direction} | TF ${tf} | Entry ${Number(entry).toFixed(5)} | SL ${Number(sl).toFixed(5)} | TP ${Number(tp).toFixed(5)} | Test WR ${(winRate*100).toFixed(1)}% | PF ${Number(profitFactor).toFixed(2)} | Trades ${trades} | Score ${score}/100. Paper-trade candidate; not a guarantee.`;
 try{
  const response=await fetch("https://www.fast2sms.com/dev/bulkV2",{method:"POST",headers:{"authorization":API_KEY,"Content-Type":"application/json"},body:JSON.stringify({route:"q",message,flash:0,numbers:PHONE})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return res.status(502).json({error:"SMS provider rejected request",providerStatus:response.status});
  sent.set(key,Date.now());
  res.json({ok:true,provider:data});
 }catch(e){res.status(502).json({error:"SMS provider unavailable"});}
});
app.listen(PORT,()=>console.log(`Setup Scanner SMS relay listening on ${PORT}`));
