# Setup Scanner v3.0 (SMC)
Strategy: sell/buy-side liquidity sweep -> market structure shift -> limit entry at FVG / order-block midpoint, SL beyond the sweep, TP at fixed RR (1:2, 1:2.5, 1:3).
Backtest runs the SAME detector over up to 3000 closed candles per coin, one trade at a time, fees + slippage, conservative fills, and reports the last 40% of trades separately as out-of-sample.
Grades: A = 10+ trades, WR >= 60%, PF >= 1.5 (and out-of-sample WR >= 50%). B = WR >= 50%, PF >= 1.2. Only grade A triggers SMS/notifications.
No setup is guaranteed. Paper-trade first.
## Run
1. Only index.html is needed for the scanner: host it (GitHub Pages) or open it in Chrome.
2. SMS is optional: Node 20.6+, `npm install`, copy `.env.example` to `.env` (new rotated Fast2SMS key), `npm start`.
3. In the app set Server URL and Alert token. ALLOWED_ORIGIN must be your page's exact origin.
