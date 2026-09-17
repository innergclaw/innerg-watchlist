#!/usr/bin/env python3
"""Create the public closing report and its shareable graphic."""

from __future__ import annotations

import datetime as dt
import json
import math
import pathlib
from zoneinfo import ZoneInfo

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
WATCHLIST = ROOT / "data" / "watchlist.json"
REPORT = ROOT / "data" / "closing-report.json"
GRAPHIC = ROOT / "assets" / "innerg-closing-bell.png"
FONT_DIR = pathlib.Path("/Users/nasirrm/.codex/skills/canvas-design/canvas-fonts")


def dated_closes(asset: dict, through: dt.date) -> list[tuple[dt.date, float]]:
    closes = []
    for timestamp, value in asset.get("charts", {}).get("month", {}).get("points", []):
        if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            continue
        date = dt.datetime.fromtimestamp(timestamp, ZoneInfo("America/New_York")).date()
        if date <= through:
            closes.append((date, float(value)))
    return closes


def report_item(asset: dict, price: float, change: float) -> dict:
    return {
        "symbol": asset["symbol"],
        "name": asset["name"],
        "sector": asset["sector"],
        "price": round(price, 4),
        "currency": asset.get("currency") or "USD",
        "changePercent": round(change, 4),
    }


def latest_completed_market_date(assets: list[dict], now: dt.datetime) -> dt.date:
    eastern = now.astimezone(ZoneInfo("America/New_York"))
    through = eastern.date()
    if eastern.weekday() < 5 and eastern.time() < dt.time(16, 0):
        through -= dt.timedelta(days=1)
    while through.weekday() > 4:
        through -= dt.timedelta(days=1)
    dates = [points[-1][0] for asset in assets if asset.get("sector") != "crypto" if (points := dated_closes(asset, through))]
    if not dates:
        raise ValueError("No completed market session is available")
    return max(dates)


def rank_assets(assets: list[dict], market_date: dt.date) -> tuple[list[dict], list[dict]]:
    ranked = []
    for asset in assets:
        if asset.get("sector") == "crypto" or asset.get("status") != "ok":
            continue
        points = dated_closes(asset, market_date)
        if len(points) < 2 or points[-1][0] != market_date or points[-2][1] == 0:
            continue
        change = (points[-1][1] / points[-2][1] - 1) * 100
        ranked.append((asset, points[-1][1], change))
    ranked.sort(key=lambda row: row[2], reverse=True)
    gainers = ranked[:5]
    gainers_symbols = {row[0]["symbol"] for row in gainers}
    losers = [row for row in reversed(ranked) if row[0]["symbol"] not in gainers_symbols][:5]
    if len(gainers) != 5 or len(losers) != 5:
        raise ValueError("At least ten eligible non-crypto assets are required")
    return [report_item(*row) for row in gainers], [report_item(*row) for row in losers]


def fit(draw: ImageDraw.ImageDraw, text: str, font_path: pathlib.Path, size: int, max_width: int) -> ImageFont.FreeTypeFont:
    while size > 16:
        font = ImageFont.truetype(str(font_path), size)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
        size -= 1
    return ImageFont.truetype(str(font_path), size)


def truncate(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text
    shortened = text
    while shortened and draw.textlength(shortened + "…", font=font) > max_width:
        shortened = shortened[:-1]
    return shortened.rstrip() + "…"


def render_graphic(report: dict) -> None:
    width, height = 1600, 900
    image = Image.new("RGB", (width, height), "#151513")
    draw = ImageDraw.Draw(image)
    regular = FONT_DIR / "Outfit-Regular.ttf"
    bold = FONT_DIR / "Outfit-Bold.ttf"
    mono = FONT_DIR / "RedHatMono-Bold.ttf"
    title = ImageFont.truetype(str(bold), 66)
    eyebrow = ImageFont.truetype(str(mono), 22)
    section = ImageFont.truetype(str(bold), 30)
    ticker = ImageFont.truetype(str(mono), 27)
    value = ImageFont.truetype(str(mono), 24)
    small = ImageFont.truetype(str(regular), 20)

    draw.rectangle((0, 0, 24, height), fill="#caff37")
    draw.text((76, 55), "INNERG MARKET PULSE", font=eyebrow, fill="#caff37")
    draw.text((76, 98), "Closing Bell Snapshot", font=title, fill="#f5f5ef")
    market_date = dt.date.fromisoformat(report["marketDate"]).strftime("%B %d, %Y").replace(" 0", " ")
    draw.text((78, 184), f"U.S. MARKET CLOSE  /  {market_date.upper()}", font=eyebrow, fill="#a8a89f")

    columns = [(76, "TOP 5 GAINERS", report["gainers"], "#caff37"), (824, "TOP 5 LOSERS", report["losers"], "#ff8d82")]
    for x, heading, items, accent in columns:
        draw.rounded_rectangle((x, 255, x + 700, 760), radius=22, fill="#20201d", outline="#3c3c36", width=2)
        draw.text((x + 34, 286), heading, font=section, fill=accent)
        for index, item in enumerate(items):
            y = 355 + index * 77
            if index:
                draw.line((x + 34, y - 14, x + 666, y - 14), fill="#3c3c36", width=1)
            draw.text((x + 34, y), str(index + 1).zfill(2), font=small, fill="#74746c")
            draw.text((x + 82, y - 5), item["symbol"], font=ticker, fill="#f5f5ef")
            name_font = fit(draw, item["name"], regular, 18, 190)
            display_name = truncate(draw, item["name"], name_font, 190)
            draw.text((x + 190, y + 1), display_name, font=name_font, fill="#aaa9a1")
            price = f"${item['price']:,.2f}"
            draw.text((x + 478, y), price, font=value, fill="#deded6", anchor="ra")
            change = f"{item['changePercent']:+.2f}%"
            draw.text((x + 650, y), change, font=value, fill=accent, anchor="ra")

    draw.text((76, 818), "RANKED BY REGULAR-SESSION DAILY % CHANGE  •  CRYPTO EXCLUDED", font=small, fill="#aaa9a1")
    draw.text((1524, 818), "RESEARCH ONLY", font=eyebrow, fill="#caff37", anchor="ra")
    GRAPHIC.parent.mkdir(parents=True, exist_ok=True)
    image.save(GRAPHIC, optimize=True)


def main() -> None:
    snapshot = json.loads(WATCHLIST.read_text(encoding="utf-8"))
    generated = dt.datetime.now(dt.timezone.utc)
    market_date = latest_completed_market_date(snapshot["assets"], generated)
    gainers, losers = rank_assets(snapshot["assets"], market_date)
    payload = {
        "marketDate": market_date.isoformat(),
        "generatedAt": generated.isoformat().replace("+00:00", "Z"),
        "universe": "Public INNERG watchlist, excluding crypto",
        "method": "Regular-session daily percentage change",
        "gainers": gainers,
        "losers": losers,
        "sources": snapshot.get("sources", []),
        "disclaimer": "Research and education only. Prices can be delayed.",
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    render_graphic(payload)
    print(f"Built {REPORT.relative_to(ROOT)} and {GRAPHIC.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
