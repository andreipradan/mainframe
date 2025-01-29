import logging

import telegram
from mainframe.bots.models import Bot, Message
from rest_framework import serializers

logger = logging.getLogger(__name__)


def sync(bot, attrs):
    try:
        attrs["webhook"] = bot.get_webhook_info()["url"]
    except telegram.error.TelegramError as e:
        raise serializers.ValidationError({"Telegram Error": e.message}) from e

    data = bot.bot.to_dict()
    attrs["first_name"] = data.pop("first_name")
    attrs["telegram_id"] = data.pop("id")
    attrs["username"] = data.pop("username")
    if "additional_data" in attrs:
        attrs["additional_data"].update(data)
    else:
        attrs["additional_data"] = data
    # for attrs only available via getattr
    attrs.update(
        {
            field: getattr(bot.bot, field, None) or ""
            for field in ["full_name", "last_name"]
        }
    )
    return attrs


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
        if action == "sync":
            raise serializers.ValidationError("TBA")
            token = self.instance.token
            attrs = {"token": token, "additional_data": self.instance.additional_data}
            return sync(self.instance.telegram_bot, attrs)

        if action == "create":
            if list(attrs) == ["token"]:
                raise serializers.ValidationError("TBA")
                try:
                    bot = telegram.Bot(attrs["token"])
                except telegram.error.InvalidToken as e:
                    raise serializers.ValidationError({"telegram": e.message}) from e
                return sync(bot, attrs)
            return attrs

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
