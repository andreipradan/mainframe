import logging

import telegram
from rest_framework import serializers

from mainframe.bots.models import Bot, Message

logger = logging.getLogger(__name__)


class BotSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    telegram_id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)

    class Meta:
        model = Bot
        fields = "__all__"

    def validate(self, attrs):  # noqa: C901, PLR0912
        action = self.context["view"].action
        if self.instance and action != "sync":
            bot = self.instance.telegram_bot
            webhook = attrs.get("webhook")
            if webhook != self.instance.webhook:
                if webhook:
                    try:
                        result = bot.set_webhook(webhook)
                    except telegram.error.TelegramError as e:
                        raise serializers.ValidationError(
                            {"Telegram Error": e.message}
                        ) from e
                    logger.info("Set new webhook '%s': %s", webhook, result)
                else:
                    try:
                        result = bot.delete_webhook()
                    except telegram.error.TelegramError as e:
                        raise serializers.ValidationError(
                            {"Telegram Error": e.message}
                        ) from e
                    logger.info("Deleted webhook: %s", result)
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
