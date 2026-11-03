from mainframe.clients.meals import parse_week


def test_parse_week_returns_empty_when_active_week_is_missing():
    assert parse_week(("<html></html>", "https://example.com")) == []
