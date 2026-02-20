from datetime import datetime
from zoneinfo import ZoneInfo

from django.test import override_settings

from mainframe.clients.finance.statement import RevolutParser


@override_settings(TIME_ZONE="Europe/Bucharest")
def test_revolut_convert_to_utc_returns_utc_tzinfo():
    dt = RevolutParser.convert_to_utc("2026-02-21 14:00:00")
    assert dt.tzinfo == ZoneInfo("UTC")
    # sanity check conversion: in Feb, Bucharest is +02:00
    local = datetime(2026, 2, 21, 14, 0, 0, tzinfo=ZoneInfo("Europe/Bucharest"))
    assert dt == local.astimezone(ZoneInfo("UTC"))
