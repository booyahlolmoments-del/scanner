// SMS relay. Secrets live ONLY in server environment variables (.env, never committed).
const express=require("express"),helmet=require("helmet"),rateLimit=require("express-rate-limit");
const app=express();app.set("trust proxy",1);
app.use(helmet());app.use(express.json({limit:"8kb"}));
app.use(rateLimit({windowMs:60000,max:8,standardHeaders:true,legacyHeaders:false}));
const {PORT=3000,FAST2SMS_API_KEY:KEY,ALERT_PHONE:PHONE,ALERT_TOKEN:TOKEN}=process.env;
const ORIGINS=(process.env.ALLOWED_ORIGIN||"").split(",").map(s=>s.trim()).filter(Boolean);
app.use((req,res,next)=>{const o=req.headers.origin;
 if(o&&!ORIGINS.includes(o))return res.status(403).json({error:"Origin not allowed"});
 if(o){res.setHeader("Access-Control-Allow-Origin",o);res.setHeader("Vary","Origin");res.setHeader("Access-Control-Allow-Headers","Content-Type,X-Alert-Token");res.setHeader("Access-Control-Allow-Methods","POST,GET,OPTIONS")}
 if(req.method==="OPTIONS")return res.sendStatus(204);next()});
const sent=new Map();
app.get("/health",(q,r)=>r.json({ok:true,smsConfigured:!!(KEY&&PHONE),tokenSet:!!TOKEN}));
app.post("/api/alert",async(req,res)=>{
 if(TOKEN&&req.get("x-alert-token")!==TOKEN)return res.status(401).json({error:"Bad token"});
 const {symbol,tf,direction,entry,sl,tp,winRate,profitFactor,trades,score}=req.body||{};
 if(!/^(BTC|ETH|LINK|SOL)USDT$/.test(symbol||"")||!["15m","1h","4h"].includes(tf)||!["BUY","SELL"].includes(direction)||![entry,sl,tp,winRate,profitFactor,trades,score].every(Number.isFinite))return res.status(400).json({error:"Invalid alert"});
 const buy=direction==="BUY";
 if(buy?!(sl<entry&&entry<tp):!(tp<entry&&entry<sl))return res.status(400).json({error:"Bad price geometry"});
 const rr=Math.abs(tp-entry)/Math.abs(entry-sl);
 if(rr<1.5||winRate<.55||profitFactor<1.2||trades<10||score<70)return res.status(422).json({error:"Below alert thresholds"});
 if(!KEY||!PHONE)return res.status(503).json({error:"SMS not configured"});
 const key=[symbol,tf,direction,entry.toFixed(5)].join("|");
 if(sent.has(key)&&Date.now()-sent.get(key)<6*36e5)return res.json({ok:true,duplicate:true});
 const f=n=>Number(n).toFixed(n<1?5:2);
 const message=`SMC ${symbol} ${direction} LIMIT ${tf} | Entry ${f(entry)} SL ${f(sl)} TP ${f(tp)} | RR 1:${rr.toFixed(1)} | Test WR ${(winRate*100).toFixed(0)}% PF ${profitFactor.toFixed(2)} (${trades}) | Paper-trade first.`;
 try{const r=await fetch("https://www.fast2sms.com/dev/bulkV2",{method:"POST",headers:{authorization:KEY,"Content-Type":"application/json"},body:JSON.stringify({route:"q",message,flash:0,numbers:PHONE})});
  if(!r.ok)return res.status(502).json({error:"SMS provider rejected",providerStatus:r.status});
  sent.set(key,Date.now());res.json({ok:true})}catch(e){res.status(502).json({error:"SMS provider unavailable"})}});
app.listen(PORT,()=>console.log("Setup Scanner relay on "+PORT));
