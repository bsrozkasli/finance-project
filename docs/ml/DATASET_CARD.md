# Dataset Card: US Stocks Relative to SPY Baseline

## Sources

| Role | Kaggle handle | Locked version | License |
|---|---|---:|---|
| Asset OHLCV | `asadullahcreative/us-stock-market-historical-ohlcv-dataset` | 1 | Apache-2.0 |
| Benchmark OHLCV | `aliraza948/spdr-s-and-p-500-etf-spy` | 1 | CC-BY-4.0 |

The committed lock file records coordinates, not copied data: `data-service/finance_ml/config/datasets.lock.json`. Dataset download requires the user to comply with Kaggle terms and source licenses.

## Intended use

Develop and compare an offline classification baseline for five-session stock returns relative to SPY. The data is unsuitable by itself for investment advice, automated trading, credit decisions, or claims about future performance.

## Required schema and preparation

Each supplied CSV must expose date, ticker/symbol, open, high, low, close, adjusted close, and volume (common aliases are recognised). Preparation:

1. Converts dates to naive session dates and symbols to uppercase.
2. Rejects duplicate symbol-date rows, invalid OHLC relationships, non-positive prices, invalid adjusted close, negative volume, and non-finite values.
3. Computes an adjustment factor `adjusted_close / close` and materialises adjusted open, high, and low.
4. Writes Parquet and a manifest containing row count, date range, symbols, sources, and SHA-256 of the Parquet file.

No missing price or volume is fabricated or forward-filled.

## Known limitations

- Constituent history, delistings, corporate-action conventions, and sector metadata may be incomplete in third-party datasets.
- A current 120-stock universe can create survivorship bias.
- Daily data cannot model intraday fills, bid-ask spreads, borrow costs, taxes, or market impact.
- Dataset rows can be revised by publishers; preserve the generated local manifest with every experiment report.

## Privacy and security

The datasets contain market observations, not personal data. Kaggle credentials are secrets: set them through the local environment and never log or commit them.
