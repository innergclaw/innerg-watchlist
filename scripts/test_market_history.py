import unittest
from update_market_data import history_charts, chart_points
import datetime as dt


def ts(value):
    return int(dt.datetime.fromisoformat(value).timestamp())


class HistoryTests(unittest.TestCase):
    def test_clean_sort_deduplicate(self):
        self.assertEqual(chart_points([(2, 4), (1, None), (2, 5), (3, float('nan'))]), [[2, 5]])

    def test_stock_latest_session_not_weekend(self):
        friday = ts('2026-09-04T14:00:00+00:00')
        sunday = ts('2026-09-06T15:00:00+00:00')
        charts = history_charts([], [(friday-86400, 9), (friday, 10), (friday+300, 11)], now=sunday)
        self.assertEqual(charts['day']['points'], [[friday, 10], [friday+300, 11]])

    def test_crypto_and_calendar_windows(self):
        now = ts('2026-09-07T15:00:00+00:00')
        points = [(now-days*86400, float(days+1)) for days in range(40)]
        charts = history_charts(points, points, True, now=now)
        self.assertEqual(len(charts['day']['points']), 2)
        self.assertEqual(len(charts['week']['points']), 8)
        self.assertEqual(len(charts['month']['points']), 31)

    def test_missing_intraday_does_not_fake_daily_points(self):
        charts = history_charts([(100, 2)], [], now=101)
        self.assertEqual(charts['day']['points'], [])
        self.assertEqual(charts['week']['points'], [[100, 2]])


if __name__ == '__main__':
    unittest.main()
