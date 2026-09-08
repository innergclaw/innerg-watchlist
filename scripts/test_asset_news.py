import datetime as dt
import unittest
from update_asset_news import parse_feed, safe_url, matches, parse_date, parse_asset_page, latest_two

class NewsTests(unittest.TestCase):
    def test_publisher_date_formats(self):
        self.assertEqual(parse_date('Sep 8, 2026, 7:01 AM EDT').hour,11)
        self.assertEqual(parse_date('2026-09-08T11:01:00Z'),parse_date('Sep 8, 2026, 7:01 AM EDT'))
        with self.assertRaises(ValueError): parse_date('2026-09-08')

    def test_per_asset_metadata(self):
        html='{url:"https://www.tipranks.com/news/a",img:"",title:"Company update",text:"Text",source:"TheFly",type:"Article",tickers:void 0,time:"Sep 8, 2026, 7:01 AM EDT",ago:"1 hour ago"}'
        now=dt.datetime(2026,9,8,18,tzinfo=dt.timezone.utc)
        self.assertEqual(len(parse_asset_page(html,now)),1)
        self.assertEqual(parse_asset_page(html.replace('Sep 8','Aug 8'),now),[])

    def test_two_newest_per_asset(self):
        now=dt.datetime(2026,9,8,18,tzinfo=dt.timezone.utc)
        items=[dict(symbol=s,url=f'https://coindesk.com/{s}/{d}',publishedAt=f'2026-09-0{d}T12:00:00Z') for s in ['BTC','ARM'] for d in [1,5,6,7]]
        selected=latest_two(items+items,[{'symbol':'BTC'},{'symbol':'ARM'}],now)
        self.assertEqual(len(selected),4)
        self.assertEqual([i['publishedAt'][8:10] for i in selected],['07','06','07','06'])

    def test_safe_sources(self):
        for value in ['javascript:alert(1)', 'https://coindesk.com.evil.test', 'https://user:pass@coindesk.com/a', 'http://coindesk.com/a', 'https://reddit.com/a']:
            self.assertFalse(safe_url(value))
        self.assertTrue(safe_url('https://www.coindesk.com/markets/a'))

    def test_asset_matching(self):
        self.assertTrue(matches('Hafnia announces results', ['Hafnia']))
        self.assertFalse(matches('Supply arm grows', ['Arm Holdings']))
        self.assertFalse(matches('Stock hype rises', ['Hyperliquid']))

    def test_date_and_url_validation(self):
        now = dt.datetime(2026,9,8,tzinfo=dt.timezone.utc)
        def xml(date, url):
            return f'<rss><channel><item><title>Bitcoin news</title><link>{url}</link><pubDate>{date}</pubDate></item></channel></rss>'
        self.assertEqual(len(parse_feed(xml('Mon, 07 Sep 2026 12:00:00 GMT','https://coindesk.com/a'),'CoinDesk','reporting',now)),1)
        for date in ['bad','Mon, 01 Jun 2026 12:00:00 GMT','Wed, 09 Sep 2026 12:00:00 GMT']:
            self.assertEqual(parse_feed(xml(date,'https://coindesk.com/a'),'CoinDesk','reporting',now),[])
        self.assertEqual(parse_feed(xml('Mon, 07 Sep 2026 12:00:00 GMT','javascript:alert(1)'),'CoinDesk','reporting',now),[])

if __name__ == '__main__':
    unittest.main()
