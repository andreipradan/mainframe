from mainframe.clients.sentry import redact_telegram_token_from_breadcrumb


def test_redact_telegram_bot_token_from_url_and_message():
    token = "123456789:secret-token"  # noqa: S105
    url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
    breadcrumb = {
        "data": {"url": url},
        "message": f"HTTP request to {url}",
    }

    result = redact_telegram_token_from_breadcrumb(breadcrumb, {})

    assert result["data"]["url"] == (
        "https://api.telegram.org/bot[REDACTED]/answerCallbackQuery"
    )
    assert result["message"] == (
        "HTTP request to https://api.telegram.org/bot[REDACTED]/answerCallbackQuery"
    )
    assert token not in repr(result)


def test_redact_telegram_bot_token_leaves_other_breadcrumbs_unchanged():
    breadcrumb = {"data": {"url": "https://example.com/api"}}

    result = redact_telegram_token_from_breadcrumb(breadcrumb, {})

    assert result["data"]["url"] == "https://example.com/api"
