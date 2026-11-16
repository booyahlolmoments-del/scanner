# Trade Expert Intelligent Scanner v1.0.0

A mobile-first, multi-strategy crypto perpetual market research scanner. It discovers candidate setups from public Binance USD-M Futures market data. It does **not** place trades, send notifications, or promise a win rate.

## Requirements
- Node.js 20.6 or newer
- Internet connection (the server fetches public Binance USD-M Futures data)

## Run locally
1. Extract the project folder.
2. Open a terminal in `TradeExpertScanner`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` in a browser.

On Android, you can run the project using Termux with Node.js installed, then open the local address in Chrome. For hosted use, deploy the complete folder to a Node.js hosting service that supports Node 20.6+ and set the start command to `npm start`.

## Configuration
Copy `.env.example` to `.env` if your host supports environment files. Optional settings:
- `PORT`: server port (default 3000)
- `MAX_SYMBOLS`: number of liquid USDT perpetual markets to scan (10–30, default 24)
- `ALLOWED_ORIGINS`: optional comma-separated allowed browser origins when frontend is hosted separately

The frontend is served by the same Express server, so separate CORS configuration is normally unnecessary.

## Included strategy families
1. SMC liquidity sweep / reclaim
2. EMA trend pullback
3. Breakout and retest
4. RSI + MACD momentum
5. Approximate rolling volume profile POC
6. Bollinger Band + RSI mean reversion
7. VWAP reclaim / rejection
8. Price action engulfing / rejection wick

## Important methodology notes
- Uses Binance USD-M perpetual public endpoints; no API key is required for public market data.
- The scanner ignores the still-forming candle and evaluates closed candles.
- The score is a rule-based confluence score out of 100, **not** a probability or win-rate estimate.
- Candidate stop/target levels are rule-based estimates. The displayed RR is an approximate fee-adjusted estimate, not a guaranteed executable result.
- The in-app historical simulation is a lightweight screening estimate. It is not an audited backtest and does not fully model order-book fills, funding, market impact, latency, exchange outages, or all fee tiers. Do not treat its statistics as proof of a profitable edge.
- Strategy results with fewer than 100 simulated trades are marked insufficient or low sample. Even larger samples require out-of-sample testing and paper trading before use.
- The 5–15 daily candidate goal is a design target, not a guaranteed output. If no valid setup exists, the scanner should show none.
- No SMS, push notifications, browser notifications, exchange credentials, or auto-trading are included.

## API
- `GET /api/health`
- `GET /api/strategies`
- `GET /api/universe`
- `GET /api/scan?tf=all|5m|15m|1h|4h`

## Disclaimer
For research and paper trading only. Not financial advice. Crypto perpetual futures are highly risky and leverage can cause rapid losses. Verify every candidate independently before considering a trade.
