"""Public, source-attributed headlines. No credentials or generated financial claims."""
import concurrent.futures
import datetime as dt
import email.utils
import json
import re
import subprocess
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEEDS = [
    ('CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', 'reporting'),
    ('GlobeNewswire public companies', 'https://www.globenewswire.com/RssFeed/orgclass/1/feedTitle/Public-companies', 'company release'),
    ('GlobeNewswire dividends', 'https://www.globenewswire.com/RssFeed/subjectcode/12-Dividend%20Reports%20and%20Estimates/feedTitle/Dividends', 'company release'),
    ('GlobeNewswire earnings', 'https://www.globenewswire.com/RssFeed/subjectcode/13-Earnings%20Releases%20and%20Operating%20Results/feedTitle/Earnings', 'company release'),
]
ALIASES = {
    'SKHY': ['SK hynix'], 'ARM': ['Arm Holdings'], 'DRAM': ['Themes Generative AI', 'DRAM ETF'],
    'IREN': ['IREN', 'Iris Energy'], 'MRVL': ['Marvell'], 'CRWV': ['CoreWeave'], 'WDC': ['Western Digital'],
    'HOOD': ['Robinhood'], 'OPEN': ['Opendoor'], 'ASST': ['Strive, Inc', 'Strive Inc', 'Strive Asset', 'ASST'],
    'ZEC': ['Zcash', 'ZEC'], 'HYPE': ['Hyperliquid'], 'BTC': ['Bitcoin', 'BTC'], 'SOL': ['Solana'],
    'USO': ['United States Oil Fund', 'USO ETF'], 'GSG': ['GSCI Commodity', 'GSG ETF'],
    'OXY': ['Occidental'], 'MTDR': ['Matador Resources'], 'COP': ['ConocoPhillips'], 'HAFN': ['Hafnia'],
    'CORN': ['Teucrium Corn'], 'CANE': ['Teucrium Sugar'], 'EMN': ['Eastman Chemical'],
    'LYB': ['LyondellBasell'], 'OLN': ['Olin Corporation', 'Olin Corp'], 'NTR': ['Nutrien'],
    'MOS': ['Mosaic Company'], 'SCHD': ['SCHD', 'Schwab U.S. Dividend'],
    'VOO': ['VOO', 'Vanguard S&P 500'], 'QQQ': ['QQQ', 'Invesco QQQ'],
    'VTV': ['VTV', 'Vanguard Value ETF'], 'VTI': ['VTI', 'Vanguard Total Stock Market'],
    'FXAIX': ['FXAIX', 'Fidelity 500 Index'],
}
HOSTS = {'coindesk.com', 'globenewswire.com'}

def safe_url(url):
    parsed = urllib.parse.urlparse(url)
    host = parsed.hostname or ''
    return parsed.scheme == 'https' and not parsed.username and not parsed.password and any(host == h or host.endswith('.' + h) for h in HOSTS)

def matches(text, phrases):
    return any(re.search(r'(?<!\w)' + re.escape(p) + r'(?!\w)', text, re.I) for p in phrases)

def parse_feed(xml, source, kind, now):
    root = ET.fromstring(xml)
    if root.tag != 'rss':
        raise ValueError('Not an RSS feed')
    result = []
    for item in root.findall('./channel/item'):
        title = ' '.join((item.findtext('title') or '').split())
        url = (item.findtext('link') or '').strip()
        try:
            date = email.utils.parsedate_to_datetime(item.findtext('pubDate')).astimezone(dt.timezone.utc)
        except (TypeError, ValueError, AttributeError):
            continue
        if not title or not safe_url(url) or not now - dt.timedelta(days=7) <= date <= now + dt.timedelta(minutes=5):
            continue
        result.append(dict(headline=title, url=url, publishedAt=date.isoformat(), source=source, kind=kind))
    return result

def fetch(feed, now):
    source, url, kind = feed
    try:
        response = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--max-time', '25', '--max-filesize', '5000000', url], capture_output=True, check=True)
        entries = parse_feed(response.stdout, source, kind, now)
        return entries, dict(name=source, status='ok', checkedAt=now.isoformat())
    except Exception as error:
        return [], dict(name=source, status='unavailable', checkedAt=now.isoformat(), error=type(error).__name__)

def main():
    now = dt.datetime.now(dt.timezone.utc)
    path = ROOT / 'data/asset-news.json'
    old = json.loads(path.read_text()) if path.exists() else {'items': []}
    assets = json.loads((ROOT / 'data/watchlist.json').read_text())['assets']
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda feed: fetch(feed, now), FEEDS))
    sources = [status for _, status in results]
    items = {}
    for asset in assets:
        phrases = ALIASES.get(asset['symbol'], [asset['name']])
        for entries, _ in results:
            for entry in entries:
                if matches(entry['headline'], phrases):
                    key = (asset['symbol'], entry['url'])
                    items[key] = dict(entry, symbol=asset['symbol'])
    # Keep still-recent headlines when a feed rotates or is temporarily unavailable.
    symbols = {a['symbol'] for a in assets}
    for item in old['items']:
        if item['symbol'] in symbols and safe_url(item['url']) and dt.datetime.fromisoformat(item['publishedAt']) >= now - dt.timedelta(days=7):
            items.setdefault((item['symbol'], item['url']), item)
    ordered = sorted(items.values(), key=lambda x: x['publishedAt'], reverse=True)
    coverage = [dict(symbol=a['symbol'], name=a['name'], count=sum(i['symbol'] == a['symbol'] for i in ordered)) for a in assets]
    snapshot = dict(checkedAt=now.isoformat(), lastSuccessfulAt=now.isoformat() if any(s['status'] == 'ok' for s in sources) else old.get('lastSuccessfulAt'), sources=sources, coverage=coverage, items=ordered)
    path.write_text(json.dumps(snapshot, indent=2) + '\n')
    print(f"Checked {len(assets)} assets. {len(ordered)} matching headlines. {sum(s['status']=='ok' for s in sources)}/{len(sources)} feeds available.")
    if not any(s['status'] == 'ok' for s in sources):
        raise SystemExit('All news sources failed; saved status and retained recent headlines.')

if __name__ == '__main__':
    main()
