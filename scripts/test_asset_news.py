import datetime as dt
import unittest
from update_asset_news import parse_feed, safe_url, matches

class NewsTests(unittest.TestCase):
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
