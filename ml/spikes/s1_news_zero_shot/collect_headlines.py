r"""Collect recent headlines through the locally running Spring backend (manual tool, never a test).

The backend's ``GET /api/v1/news/{symbol}`` already calls Finnhub for the last 7 days.
Output stays under ignored ``ml/datasets/s1/`` (strict data-rights assumption, spec §4.4).

Usage (from ``ml/``, backend running on :8080)::

    .\.venv-s1\Scripts\python.exe -m spikes.s1_news_zero_shot.collect_headlines --symbols AAPL MSFT ...
"""

from __future__ import annotations

import argparse
import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from spikes.s1_news_zero_shot.schema import HEADLINE_COLUMNS, label_template

DEFAULT_BACKEND = "http://localhost:8080"
DEFAULT_OUT = Path("datasets") / "s1"
TARGET_MAX = 500
SAMPLE_SEED = 20261015


def headline_id(headline: str) -> str:
    normalized = " ".join(headline.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:12]


def normalize_articles(symbol: str, articles: list[dict]) -> list[dict]:
    rows = []
    for article in articles:
        headline = " ".join(str(article.get("headline") or "").split())
        if not headline or not article.get("datetime"):
            continue
        rows.append({
            "id": headline_id(headline),
            "symbol": symbol.upper(),
            "published_at": datetime.fromtimestamp(int(article["datetime"]), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": str(article.get("source") or ""),
            "headline": headline,
        })
    return rows


def deduplicate_and_sample(rows: list[dict], limit: int = TARGET_MAX, seed: int = SAMPLE_SEED) -> pd.DataFrame:
    frame = pd.DataFrame(rows, columns=list(HEADLINE_COLUMNS))
    frame = frame.sort_values(["published_at", "symbol"], kind="mergesort").drop_duplicates("id", keep="first")
    if len(frame) > limit:
        frame = frame.sample(n=limit, random_state=seed)
    return frame.sort_values("id", kind="mergesort").reset_index(drop=True)


def fetch(backend: str, symbol: str) -> list[dict]:
    url = f"{backend}/api/v1/news/{urllib.parse.quote(symbol.upper())}"
    with urllib.request.urlopen(url, timeout=30) as response:  # noqa: S310 - local backend only
        return json.loads(response.read().decode("utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Collect S1 headlines from the local backend")
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--backend", default=DEFAULT_BACKEND)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)
    rows: list[dict] = []
    for symbol in args.symbols:
        articles = fetch(args.backend, symbol)
        rows.extend(normalize_articles(symbol, articles))
        print(f"{symbol}: {len(articles)} articles")
    frame = deduplicate_and_sample(rows)
    args.out.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.out / "headlines.csv", index=False, encoding="utf-8")
    label_template(frame).to_csv(args.out / "labels.csv", index=False, encoding="utf-8-sig")
    print(f"{len(frame)} unique headlines -> {args.out / 'labels.csv'}")
    return 0 if len(frame) >= 300 else 1


if __name__ == "__main__":
    raise SystemExit(main())
