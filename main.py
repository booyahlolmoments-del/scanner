from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import requests
from datetime import datetime, timezone

app = FastAPI(title="PACTS Crypto App", version="1.0.0")
BASE = "https://fapi.binance.com"
SYMBOLS = ["BTCUSDT", "ETHUSDT", "LINKUSDT", "SOLUSDT"]
INTERVALS = ["5m", "15m", "1h", "4h"]

app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

def candles(symbol: str, interval: str, limit: int = 250):
    r = requests.get(f"{BASE}/fapi/v1/klines",
                     params={"symbol": symbol, "interval": interval, "limit": limit},
                     timeout=15)
    r.raise_for_status()
    raw = r.json()
    return [{"time": int(x[0]), "open": float(x[1]), "high": float(x[2]),
             "low": float(x[3]), "close": float(x[4]), "volume": float(x[5])}
            for x in raw]

def ema(values, period):
    if len(values) < period:
        return None
    alpha = 2 / (period + 1)
    result = sum(values[:period]) / period
    for value in values[period:]:
        result = value * alpha + result * (1 - alpha)
    return result

def rsi(values, period=14):
    if len(values) <= period:
        return None
    gains, losses = [], []
    for a, b in zip(values[-period-1:-1], values[-period:]):
        change = b - a
        gains.append(max(change, 0))
        losses.append(max(-change, 0))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    return 100 - (100 / (1 + avg_gain / avg_loss))

def analyze(symbol):
    data = {tf: candles(symbol, tf) for tf in INTERVALS}
    closes_1h = [x["close"] for x in data["1h"]]
    closes_4h = [x["close"] for x in data["4h"]]
    closes = [x["close"] for x in data["15m"]]
    latest = data["15m"][-1]
    e50_1h, e200_1h = ema(closes_1h, 50), ema(closes_1h, 200)
    e50_4h, e200_4h = ema(closes_4h, 50), ema(closes_4h, 200)
    e20 = ema(closes, 20)
    rv = rsi(closes)
    vol_avg = sum(x["volume"] for x in data["15m"][-21:-1]) / 20
    vol_ok = latest["volume"] > vol_avg
    trend_up = all(v is not None for v in [e50_1h,e200_1h,e50_4h,e200_4h]) and e50_1h > e200_1h and e50_4h > e200_4h
    trend_down = all(v is not None for v in [e50_1h,e200_1h,e50_4h,e200_4h]) and e50_1h < e200_1h and e50_4h < e200_4h
    direction = "WAIT"
    reasons = []
    if trend_up:
        reasons.append("1H ও 4H EMA trend bullish")
        if e20 and latest["close"] > e20 and latest["close"] > latest["open"] and rv and rv > 50 and vol_ok:
            direction = "BUY"
            reasons += ["15M EMA20-এর উপরে bullish candle", "RSI ও volume filter pass"]
    elif trend_down:
        reasons.append("1H ও 4H EMA trend bearish")
        if e20 and latest["close"] < e20 and latest["close"] < latest["open"] and rv and rv < 50 and vol_ok:
            direction = "SELL"
            reasons += ["15M EMA20-এর নিচে bearish candle", "RSI ও volume filter pass"]
    else:
        reasons.append("1H/4H trend একমত নয়")
    # Illustrative ATR-based levels; this is a research signal, not an order.
    recent = data["15m"][-14:]
    tr = []
    prev = None
    for c in recent:
        tr.append(max(c["high"]-c["low"],
                      abs(c["high"]-prev) if prev is not None else 0,
                      abs(c["low"]-prev) if prev is not None else 0))
        prev = c["close"]
    atr = sum(tr)/len(tr)
    entry = latest["close"]
    if direction == "BUY":
        sl = min(x["low"] for x in data["15m"][-7:]) - 0.2*atr
        risk = max(entry-sl, 0)
        targets = [entry+risk*n for n in (1,2,3)]
    elif direction == "SELL":
        sl = max(x["high"] for x in data["15m"][-7:]) + 0.2*atr
        risk = max(sl-entry, 0)
        targets = [entry-risk*n for n in (1,2,3)]
    else:
        sl, targets = None, []
    return {
        "symbol": symbol, "signal": direction, "price": entry,
        "entry": entry if direction != "WAIT" else None,
        "stop_loss": sl, "targets": targets, "rsi_15m": rv,
        "ema20_15m": e20, "volume_confirmed": vol_ok,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "reasons": reasons
    }

@app.get("/", response_class=HTMLResponse)
def home():
    return (Path(__file__).parent / "static" / "index.html").read_text(encoding="utf-8")

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "PACTS Crypto App", "version": "1.0.0"}

@app.get("/api/scan")
def scan():
    results, errors = [], []
    for symbol in SYMBOLS:
        try:
            results.append(analyze(symbol))
        except Exception as exc:
            errors.append({"symbol": symbol, "error": str(exc)})
    return {"market": "Binance USDT-M Futures", "timeframes": INTERVALS,
            "signals": results, "errors": errors,
            "note": "Research/paper-trading only. Not financial advice."}
