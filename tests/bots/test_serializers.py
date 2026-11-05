from types import SimpleNamespace
from unittest import mock

import pytest
import telegram
from rest_framework import serializers

from mainframe.bots.serializers import BotSerializer


def build_serializer(webhook="old"):
    bot = mock.MagicMock()
    instance = SimpleNamespace(webhook=webhook, telegram_bot=bot)
    return BotSerializer(instance=instance), bot


def test_validate_without_instance_returns_attributes():
    attributes = {"webhook": "new"}

    assert BotSerializer().validate(attributes) is attributes


def test_validate_unchanged_webhook_does_not_update_bot():
    serializer, bot = build_serializer()
    attributes = {"webhook": "old"}

    assert serializer.validate(attributes) is attributes
    bot.set_webhook.assert_not_called()
    bot.delete_webhook.assert_not_called()


def test_validate_sets_changed_webhook():
    serializer, bot = build_serializer()
    attributes = {"webhook": "new"}

    assert serializer.validate(attributes) is attributes
    bot.set_webhook.assert_called_once_with("new")


def test_validate_deletes_removed_webhook():
    serializer, bot = build_serializer()
    attributes = {"webhook": ""}

    assert serializer.validate(attributes) is attributes
    bot.delete_webhook.assert_called_once_with()


@pytest.mark.parametrize("method", ["set_webhook", "delete_webhook"])
def test_validate_converts_telegram_error(method):
    serializer, bot = build_serializer()
    getattr(bot, method).side_effect = telegram.error.TelegramError("request failed")
    attributes = {"webhook": "new" if method == "set_webhook" else ""}

    with pytest.raises(serializers.ValidationError, match="Telegram Error"):
        serializer.validate(attributes)
