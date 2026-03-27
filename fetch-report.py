#!/usr/bin/env python3
"""Fetch current prices for InnerG Watchlist stocks via Finnhub"""
import json, urllib.request, time

API_KEY = 'd6qctv1r01qhcrmjo040d6qctv1r01qhcrmjo04g'

stocks = [
    {"ticker": "USO", "name": "United States Oil Fund", "cat": "Commodity", "monday": 70.50},
    {"ticker": "CORN", "name": "Teucrium Corn Fund", "cat": "Agriculture", "monday": 23.20},
    {"ticker": "GSG", "name": "iShares GSCI Commodity Trust", "cat": "Commodity", "monday": 16.80},
    {"ticker": "CANE", "name": "Teucrium Sugar Fund", "cat": "Agriculture", "monday": 12.40},
    {"ticker": "EMN", "name": "Eastman Chemical", "cat": "Chemicals", "monday": 98.50},
    {"ticker": "LYB", "name": "LyondellBasell Industries", "cat": "Chemicals", "monday": 85.20},
    {"ticker": "OLN", "name": "Olin Corporation", "cat": "Chemicals", "monday": 42.30},
    {"ticker": "OXY", "name": "Occidental Petroleum", "cat": "Energy", "monday": 52.80},
    {"ticker": "MTDR", "name": "Matador Resources", "cat": "Energy", "monday": 48.90},
    {"ticker": "COP", "name": "ConocoPhillips", "cat": "Energy", "monday": 101.20},
    {"ticker": "NTR", "name": "Nutrien Ltd", "cat": "Agriculture", "monday": 56.40},
    {"ticker": "MOS", "name": "Mosaic Company", "cat": "Agriculture", "monday": 32.80},
    {"ticker": "MSTR", "name": "Strategy Inc (Bitcoin)", "cat": "Crypto", "monday": 285.60},
]

results = []
for s in stocks:
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={s['ticker']}&token={API_KEY}"
        req = urllib.request.Request(url, headers={"User-Agent": "InnerG/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        
        current = data.get("c", 0)
        prev_close = data.get("pc", 0)
        high = data.get("h", 0)
        low = data.get("l", 0)
        
        daily_chg = ((current - prev_close) / prev_close * 100) if prev_close else 0
        weekly_chg = ((current - s["monday"]) / s["monday"] * 100) if s["monday"] else 0
        
        results.append({
            "ticker": s["ticker"],
            "name": s["name"],
            "cat": s["cat"],
            "current": current,
            "prev_close": prev_close,
            "high": high,
            "low": low,
            "daily_pct": round(daily_chg, 2),
            "weekly_pct": round(weekly_chg, 2),
            "monday": s["monday"],
        })
        print(f"  {s['ticker']}: ${current:.2f} | Daily: {daily_chg:+.2f}% | Weekly: {weekly_chg:+.2f}%")
    except Exception as e:
        print(f"  {s['ticker']}: ERROR - {e}")
        results.append({"ticker": s["ticker"], "name": s["name"], "cat": s["cat"], "error": str(e)})
    time.sleep(0.3)

# Sort by weekly performance
ranked = sorted([r for r in results if "error" not in r], key=lambda x: x["weekly_pct"], reverse=True)

print("\n=== WEEKLY LEADERS ===")
for i, r in enumerate(ranked[:3]):
    print(f"  #{i+1} {r['ticker']} ({r['name']}): {r['weekly_pct']:+.2f}% this week")

print("\n=== WEEKLY LAGGARDS ===")
for r in ranked[-3:]:
    print(f"  {r['ticker']} ({r['name']}): {r['weekly_pct']:+.2f}% this week")

# Save for report generation
with open("weekly-data.json", "w") as f:
    json.dump({"ranked": ranked, "all": results}, f, indent=2)
print("\nSaved to weekly-data.json")
