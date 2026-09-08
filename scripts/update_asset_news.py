"""Public, source-attributed headlines. No credentials or generated financial claims."""
import concurrent.futures
import datetime as dt
import email.utils
import json
import re
import subprocess
import urllib.parse
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEEDS = [
    ('CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/', 'reporting'),
    ('GlobeNewswire public companies', 'https://www.globenewswire.com/RssFeed/orgclass/1/feedTitle/Public-companies', 'company release'),
    ('GlobeNewswire dividends', 'https://www.globenewswire.com/RssFeed/subjectcode/12-Dividend%20Reports%20and%20Estimates/feedTitle/Dividends', 'company release'),
    ('GlobeNewswire earnings', 'https://www.globenewswire.com/RssFeed/subjectcode/13-Earnings%20Releases%20and%20Operating%20Results/feedTitle/Earnings', 'company release'),
]
ALIASES = {
    'SKHY': ['SK hynix'], 'ARM': ['Arm Holdings'], 'DRAM': ['Roundhill Memory', 'DRAM ETF'],
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
HOSTS = {'coindesk.com', 'globenewswire.com', 'reuters.com', 'apnews.com', 'cnbc.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'barrons.com', 'marketwatch.com', 'investopedia.com', 'nasdaq.com', 'businesswire.com', 'prnewswire.com', 'investing.com', 'benzinga.com', 'fool.com', 'seekingalpha.com', 'etf.com', 'etftrends.com', 'etfdb.com', 'finance.yahoo.com', 'decrypt.co', 'theblock.co', 'newsroom.arm.com', 'hafnia.com', 'news.skhynix.com', 'digitimes.com'}
HOSTS.update({'tipranks.com', 'theguardian.com', 'cointelegraph.com'})
CRYPTO_TAGS = {'ZEC':'zcash', 'HYPE':'hyperliquid', 'BTC':'bitcoin', 'SOL':'solana'}
ETF_SYMBOLS = {'DRAM','USO','GSG','CORN','CANE','SCHD','VOO','QQQ','VTV','VTI'}
QUOTED = r'"(?:\\.|[^"\\])*"'

def parse_date(value):
    if value.endswith((' EDT',' EST')) and re.match(r'^[A-Z][a-z]{2} \d',value):
        return dt.datetime.strptime(value[:-4],'%b %d, %Y, %I:%M %p').replace(tzinfo=ZoneInfo('America/New_York')).astimezone(dt.timezone.utc)
    try:
        date = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        try:
            date = email.utils.parsedate_to_datetime(value)
        except (ValueError,TypeError):
            if value.endswith((' EDT',' EST')):
                date=dt.datetime.strptime(value[:-4],'%b %d, %Y, %I:%M %p').replace(tzinfo=ZoneInfo('America/New_York'))
            else: raise ValueError('Unsupported source date')
    if date.tzinfo is None:
        raise ValueError('Missing timezone')
    return date.astimezone(dt.timezone.utc)

def parse_asset_page(html, now):
    """Read public news metadata, never evaluate the page's JavaScript."""
    result = []
    for match in re.finditer(r'\{url:(' + QUOTED + r'),img:' + QUOTED + r',title:(' + QUOTED + r'),text:' + QUOTED + r',source:(' + QUOTED + r'),type:' + QUOTED + r',tickers:.*?,time:(' + QUOTED + r'),ago:', html):
        url, title, source, time = map(json.loads, match.groups())
        try:
            date = parse_date(time)
        except (ValueError, TypeError):
            continue
        if safe_url(url) and now - dt.timedelta(days=7) <= date <= now + dt.timedelta(minutes=5):
            kind = 'company release' if any(h in url for h in ['businesswire.com','globenewswire.com','prnewswire.com']) else 'report / analysis'
            result.append(dict(headline=title, url=url, source=source, publishedAt=date.isoformat(), kind=kind))
    return result

def fetch_asset(asset, now):
    symbol = asset['symbol']
    if asset['sector'] == 'crypto':
        url = 'https://cointelegraph.com/rss' if symbol == 'HYPE' else 'https://cointelegraph.com/rss/tag/' + CRYPTO_TAGS[symbol]
        entries, status = fetch((symbol + ' dedicated crypto feed', url, 'reporting'), now)
        if symbol == 'HYPE':
            entries = [i for i in entries if matches(i['headline'], ALIASES[symbol])]
            status['name'] = 'HYPE filtered crypto news'
        status['url'] = url
        return [dict(i, symbol=symbol, source='Cointelegraph') for i in entries], status
    path = 'quote/mutf/' + symbol if symbol == 'FXAIX' else ('etf/' if symbol in ETF_SYMBOLS else 'stocks/') + symbol.lower()
    url = 'https://stockanalysis.com/' + path + '/'
    try:
        response = subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','25',url],capture_output=True,check=True)
        html = response.stdout.decode('utf-8')
        if '<title>' not in html or symbol.casefold() not in html.casefold():
            raise ValueError('Asset page unavailable')
        entries = parse_asset_page(html,now)
        return [dict(i,symbol=symbol) for i in entries],dict(name=symbol+' asset news',status='ok',checkedAt=now.isoformat(),url=url)
    except Exception as error:
        return [],dict(name=symbol+' asset news',status='unavailable',checkedAt=now.isoformat(),error=type(error).__name__)

def latest_two(items, assets, now):
    result=[]
    for asset in assets:
        unique={}
        for item in items:
            if item['symbol'] != asset['symbol'] or not safe_url(item['url']): continue
            try: date=parse_date(item['publishedAt'])
            except (ValueError,TypeError): continue
            if not now-dt.timedelta(days=7) <= date <= now+dt.timedelta(minutes=5): continue
            unique.setdefault(item['url'],item)
        result.extend(sorted(unique.values(),key=lambda x:parse_date(x['publishedAt']),reverse=True)[:2])
    return result

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
        url = (item.findtext('link') or '').strip().split('?')[0]
        if any(re.search(r'sponsor|press release|advertorial', c.text or '', re.I) for c in item.findall('category')):
            continue
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
        asset_results = list(pool.map(lambda asset: fetch_asset(asset,now), assets))
    sources = [status for _, status in results]
    items = {}
    for entries, _ in asset_results:
        for entry in entries:
            items[(entry['symbol'],entry['url'])]=entry
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
    reviewed_path=ROOT/'data/researched-news.json'
    if reviewed_path.exists():
        for item in json.loads(reviewed_path.read_text())['items']:
            items.setdefault((item['symbol'],item['url']),item)
    ordered = latest_two(items.values(),assets,now)
    coverage = [dict(symbol=a['symbol'], name=a['name'], count=sum(i['symbol'] == a['symbol'] for i in ordered)) for a in assets]
    snapshot = dict(checkedAt=now.isoformat(), lastSuccessfulAt=now.isoformat() if any(s['status'] == 'ok' for s in sources) else old.get('lastSuccessfulAt'), sources=sources, assetChecks=[s for _,s in asset_results], coverage=coverage, items=ordered)
    path.write_text(json.dumps(snapshot, indent=2) + '\n')
    print(f"Checked {len(assets)} assets. {len(ordered)} recent headlines across {sum(a['count'] > 0 for a in coverage)} assets. {sum(s['status']=='ok' for _,s in asset_results)}/{len(assets)} dedicated sources available.")
    if not any(s['status'] == 'ok' for s in sources):
        raise SystemExit('All news sources failed; saved status and retained recent headlines.')

if __name__ == '__main__':
    main()
