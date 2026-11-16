# Setup Scanner v2.0

## What is included
- Mobile-first crypto scanner for BTCUSDT, ETHUSDT, LINKUSDT and SOLUSDT.
- Free public Binance Spot klines (OHLCV); no paid market-data dependency.
- Basic SMC-inspired liquidity-sweep / structure / FVG checks plus EMA/RSI/ATR filters.
- Separate baseline EMA/RSI historical simulation with a chronological 70/30 split.
- Browser notifications and optional Fast2SMS relay through a server-side secret.
- No trade execution and no fake order-flow metrics.

## Important limitations
This is a working starter release, not an institutional-grade quant platform. The SMC detector uses simple swing approximations; it is not a full discretionary SMC interpretation. Backtest results are exploratory and should not be treated as proof of an edge. Current backtest execution assumptions are simplified; the next engineering pass should add a proper event-driven fill model, fees by maker/taker tier, funding, spread, slippage, walk-forward folds, untouched holdout and test fixtures. Browser scanning stops when the page is suspended by Android; reliable background alerts need a hosted worker/server scheduler and push notifications. SMS is only sent when the client reports a qualifying setup and the server re-checks thresholds; the backend currently trusts the client's metrics, so deploy only for personal use until server-side backtesting is added.

Order book, CVD, absorption, funding, OI and liquidation analytics are not claimed in this free-data build. Add them only when reliable public endpoints and rate limits are confirmed. If data is missing, show unavailable rather than invent a value.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`; fill a newly rotated Fast2SMS key and your destination number. Never paste the key into `index.html` or commit `.env`.
4. Run `npm start`.
5. Host `index.html` on HTTPS. In the app's Alert Settings, set Server URL to your backend URL.
6. Set `ALLOWED_ORIGIN` to the exact HTTPS origin hosting the HTML.

## Fast2SMS
The API key pasted into the chat should be considered exposed. Revoke it and generate a new key in Fast2SMS before enabling SMS. SMS route/template/approval rules and DLT requirements may apply to your account and recipient; check your provider dashboard. Test with a low volume before relying on alerts.

## Data / risk notes
- Binance Spot prices are used. They are not Delta futures execution prices.
- PAXG/gold has been removed because this build is crypto-only.
- Signals are candidate alerts only. They are not financial advice and are not guaranteed to win.
- Use paper trading first. Never use a win-rate threshold alone as a quality guarantee.
