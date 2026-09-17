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


def eligible(asset: dict) -> bool:
    change = asset.get("returns", {}).get("day")
    return (
        asset.get("sector") != "crypto"
        and asset.get("status") == "ok"
        and isinstance(asset.get("price"), (int, float))
        and isinstance(change, (int, float))
        and math.isfinite(float(asset["price"]))
        and math.isfinite(float(change))
    )


def report_item(asset: dict) -> dict:
    return {
        "symbol": asset["symbol"],
        "name": asset["name"],
        "sector": asset["sector"],
        "price": round(float(asset["price"]), 4),
        "currency": asset.get("currency") or "USD",
        "changePercent": round(float(asset["returns"]["day"]), 4),
    }


def rank_assets(assets: list[dict]) -> tuple[list[dict], list[dict]]:
    ranked = sorted((asset for asset in assets if eligible(asset)), key=lambda asset: asset["returns"]["day"], reverse=True)
    gainers = ranked[:5]
    gainers_symbols = {asset["symbol"] for asset in gainers}
    losers = [asset for asset in reversed(ranked) if asset["symbol"] not in gainers_symbols][:5]
    if len(gainers) != 5 or len(losers) != 5:
        raise ValueError("At least ten eligible non-crypto assets are required")
    return [report_item(asset) for asset in gainers], [report_item(asset) for asset in losers]


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
    gainers, losers = rank_assets(snapshot["assets"])
    generated = dt.datetime.now(dt.timezone.utc)
    market_date = generated.astimezone(ZoneInfo("America/New_York")).date().isoformat()
    payload = {
        "marketDate": market_date,
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
