#!/usr/bin/env python3
"""Build the public watchlist snapshot without exposing credentials."""

from __future__ import annotations

import datetime as dt
import json
import math
import pathlib
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "watchlist-preview.json"
USER_AGENT = "InnerG-Watchlist/2.0"

SECTORS = [
    {"id": "ai-compute", "name": "AI + Compute"},
    {"id": "platforms", "name": "Platforms + Fintech"},
    {"id": "crypto", "name": "Crypto"},
    {"id": "energy", "name": "Energy + Commodities"},
    {"id": "materials", "name": "Agriculture + Materials"},
    {"id": "core-funds", "name": "Core Funds"},
]

ASSETS = [
    ("SKHY", "SK hynix ADR", "ai-compute", "SKHY"),
    ("ARM", "Arm Holdings", "ai-compute", "ARM"),
    ("DRAM", "Themes Generative AI ETF", "ai-compute", "DRAM"),
    ("IREN", "IREN Limited", "ai-compute", "IREN"),
    ("MRVL", "Marvell Technology", "ai-compute", "MRVL"),
    ("CRWV", "CoreWeave", "ai-compute", "CRWV"),
    ("WDC", "Western Digital", "ai-compute", "WDC"),
    ("HOOD", "Robinhood Markets", "platforms", "HOOD"),
    ("OPEN", "Opendoor Technologies", "platforms", "OPEN"),
    ("ZEC", "Zcash", "crypto", "ZEC-USD"),
    ("HYPE", "Hyperliquid", "crypto", "HYPE"),
    ("BTC", "Bitcoin", "crypto", "BTC-USD"),
    ("SOL", "Solana", "crypto", "SOL-USD"),
    ("USO", "United States Oil Fund", "energy", "USO"),
    ("GSG", "iShares S&P GSCI Commodity Trust", "energy", "GSG"),
    ("OXY", "Occidental Petroleum", "energy", "OXY"),
    ("MTDR", "Matador Resources", "energy", "MTDR"),
    ("COP", "ConocoPhillips", "energy", "COP"),
    ("CORN", "Teucrium Corn Fund", "materials", "CORN"),
    ("CANE", "Teucrium Sugar Fund", "materials", "CANE"),
    ("EMN", "Eastman Chemical", "materials", "EMN"),
    ("LYB", "LyondellBasell Industries", "materials", "LYB"),
    ("OLN", "Olin Corporation", "materials", "OLN"),
    ("NTR", "Nutrien", "materials", "NTR"),
    ("MOS", "The Mosaic Company", "materials", "MOS"),
    ("SCHD", "Schwab U.S. Dividend Equity ETF", "core-funds", "SCHD"),
    ("VOO", "Vanguard S&P 500 ETF", "core-funds", "VOO"),
    ("QQQ", "Invesco QQQ Trust", "core-funds", "QQQ"),
    ("VTV", "Vanguard Value ETF", "core-funds", "VTV"),
    ("VTI", "Vanguard Total Stock Market ETF", "core-funds", "VTI"),
    ("FXAIX", "Fidelity 500 Index Fund", "core-funds", "FXAIX"),
]


def request_json(url: str, body: dict | None = None) -> dict | list:
    data = json.dumps(body).encode() if body else None
    headers = {"User-Agent": USER_AGENT}
    if body:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def clean(value):
    if value is None:
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def change(current, previous):
    if current is None or previous in (None, 0):
        return None
    return round((current / previous - 1) * 100, 4)


def prior_close(points, target_timestamp):
    candidates = [close for timestamp, close in points if timestamp <= target_timestamp and close is not None]
    return candidates[-1] if candidates else None


def yahoo_asset(symbol, name, sector, provider_symbol):
    encoded = urllib.parse.quote(provider_symbol, safe="")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded}?range=1y&interval=1d&includePrePost=true&events=div%2Csplits"
    payload = request_json(url)
    result = payload["chart"]["result"][0]
    meta = result["meta"]
    quote = result["indicators"]["quote"][0]
    points = [(ts, clean(close)) for ts, close in zip(result.get("timestamp", []), quote.get("close", [])) if close is not None]
    if not points:
        raise ValueError("No historical prices returned")

    current = clean(meta.get("regularMarketPrice")) or points[-1][1]
    now = int(time.time())
    highs = [clean(value) for value in quote.get("high", []) if value is not None]
    lows = [clean(value) for value in quote.get("low", []) if value is not None]
    day_high = clean(meta.get("regularMarketDayHigh")) or (highs[-1] if highs else current)
    day_low = clean(meta.get("regularMarketDayLow")) or (lows[-1] if lows else current)
    return {
        "symbol": symbol, "name": name, "sector": sector, "price": current,
        "currency": meta.get("currency") or "USD", "dayHigh": day_high, "dayLow": day_low,
        "yearHigh": clean(meta.get("fiftyTwoWeekHigh")) or max(highs + [current]),
        "yearLow": clean(meta.get("fiftyTwoWeekLow")) or min(lows + [current]),
        "weekSeries": [round(point[1], 6) for point in points[-7:]],
        "returns": {
            "day": clean(meta.get("regularMarketChangePercent")) or change(current, points[-2][1] if len(points) > 1 else None),
            "week": change(current, prior_close(points, now - 7 * 86400)),
            "month": change(current, prior_close(points, now - 30 * 86400)),
        },
        "historySessions": len(points), "status": "ok",
    }


def hyperliquid_asset(symbol, name, sector, provider_symbol):
    now_ms = int(time.time() * 1000)
    candles = request_json("https://api.hyperliquid.xyz/info", {
        "type": "candleSnapshot",
        "req": {"coin": provider_symbol, "interval": "1d", "startTime": now_ms - 370 * 86400000, "endTime": now_ms},
    })
    points = [(int(item["t"]) // 1000, clean(item["c"])) for item in candles]
    current = points[-1][1]
    highs = [clean(item["h"]) for item in candles]
    lows = [clean(item["l"]) for item in candles]
    return {
        "symbol": symbol, "name": name, "sector": sector, "price": current, "currency": "USD",
        "dayHigh": highs[-1], "dayLow": lows[-1], "yearHigh": max(highs), "yearLow": min(lows),
        "weekSeries": [round(point[1], 6) for point in points[-7:]],
        "returns": {
            "day": change(current, points[-2][1] if len(points) > 1 else None),
            "week": change(current, prior_close(points, now_ms // 1000 - 7 * 86400)),
            "month": change(current, prior_close(points, now_ms // 1000 - 30 * 86400)),
        },
        "historySessions": len(points), "status": "ok",
    }


def unavailable(symbol, name, sector, message):
    return {
        "symbol": symbol, "name": name, "sector": sector, "price": None, "currency": "USD",
        "dayHigh": None, "dayLow": None, "yearHigh": None, "yearLow": None,
        "weekSeries": [],
        "returns": {"day": None, "week": None, "month": None}, "historySessions": 0,
        "status": "unavailable", "error": message[:120],
    }


def main():
    assets = []
    for symbol, name, sector, provider_symbol in ASSETS:
        try:
            if symbol == "HYPE":
                item = hyperliquid_asset(symbol, name, sector, provider_symbol)
            else:
                item = yahoo_asset(symbol, name, sector, provider_symbol)
        except Exception as exc:
            item = unavailable(symbol, name, sector, str(exc))
        assets.append(item)
        print(f"{symbol}: {item['status']}")
        time.sleep(0.08)

    now = dt.datetime.now(dt.timezone.utc)
    first_by_sector = []
    for sector in SECTORS:
        first_by_sector.append(next(item for item in assets if item["sector"] == sector["id"]))
    leaders = sorted(
        (item for item in assets if item["returns"]["week"] is not None),
        key=lambda item: item["returns"]["week"],
        reverse=True,
    )[:3]

    payload = {
        "generatedAt": now.isoformat().replace("+00:00", "Z"),
        "marketLabel": "Latest scheduled snapshot",
        "sources": ["Yahoo Finance chart data", "Hyperliquid public API"],
        "sectors": SECTORS,
        "assets": first_by_sector,
        "leaders": leaders,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
