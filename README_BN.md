# PACTS Crypto App V1

এটি PACTS-এর প্রথম চালানো যায় এমন web-app starter। এটি Binance USDT-M Futures-এর public market data পড়ে BTCUSDT, ETHUSDT, LINKUSDT ও SOLUSDT-এর জন্য 15m entry filter এবং 1h/4h trend filter দেখায়।

## কী আছে
- FastAPI backend
- মোবাইল-ফ্রেন্ডলি web dashboard
- BTC, ETH, LINK, SOL scanner
- 5m, 15m, 1h, 4h candle data সংগ্রহ
- 1h/4h EMA 50/200 trend filter
- 15m EMA20, RSI ও volume filter
- সম্ভাব্য Entry, ATR/swing-ভিত্তিক Stop Loss এবং 1R/2R/3R target
- প্রতি ৬০ সেকেন্ডে dashboard refresh

## Android ফোনে চালানো
এই ZIP-এ Android APK নেই। এটি একটি web app; চালাতে Python hosting বা Python-সমর্থিত cloud service লাগবে।

### লোকাল/টার্মিনাল পরিবেশে
1. ZIP extract করো।
2. Python 3.11+ ইনস্টল থাকা পরিবেশে terminal খোলো।
3. চালাও: `pip install -r requirements.txt`
4. চালাও: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. ব্রাউজারে `http://127.0.0.1:8000` খোলো।

### GitHub + Render-এ deploy
1. ZIP extract করে সব ফাইল একটি নতুন GitHub repository-তে upload করো।
2. Render-এ New Web Service থেকে repository connect করো।
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Deploy হলে Render URL খুলে dashboard দেখো।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- এটি এখনো পূর্ণ PACTS production app নয়।
- এই সংস্করণ কোনো order place করে না; Binance API key লাগে না।
- এটি পূর্ণ historical backtesting engine নয়; এখনকার scanner signal দেখায়।
- signal logic সরল প্রাথমিক rule-set, লাভজনকতার প্রমাণ নয়।
- SMC/ICT, FVG, BOS/CHoCH, trade journal, notifications, configurable backtest, performance analytics এবং APK পরের ধাপে যোগ করতে হবে।
- Binance public endpoint/network availability-এর ওপর live data নির্ভর করে।
- কোনো বাস্তব অর্থ দিয়ে ট্রেড করার আগে আলাদা যাচাই ও paper trading করো।

## API
- `GET /api/health`
- `GET /api/scan`
