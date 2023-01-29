import logging

import telegram
from rest_framework import serializers
from bots.models import Bot

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

    def validate(self, attrs):
        action = self.context["view"].action
        if action == "sync":
            token = self.instance.token
            attrs = {"token": token}
            bot = telegram.Bot(token)
            try:
                attrs["webhook"] = bot.get_webhook_info()["url"]
            except telegram.error.TelegramError as e:
                raise serializers.ValidationError({"Telegram Error": e.message})

            bot = bot.bot
            additional_data = bot.to_dict()
            attrs["telegram_id"] = additional_data.pop("id")
            attrs["username"] = additional_data.pop("username")
            attrs.update(
                {
                    field: getattr(bot, field, None)
                    for field in ["first_name", "full_name", "last_name"]
                }
            )
            attrs["additional_data"] = additional_data
            return attrs

        if self.instance and action != "sync":
            if list(attrs) == ["token"]:
                logger.info("Setting new token")
                try:
                    bot.get_me()
                    return attrs
                except telegram.error.TelegramError as e:
                    raise serializers.ValidationError({"Telegram Error": e.message})

            webhook = attrs.get("webhook")
            if webhook != self.instance.webhook:
                if webhook:
                    try:
                        logger.info(
                            f"Set new webhook '{webhook}': {bot.set_webhook(webhook)}"
                        )
                    except telegram.error.TelegramError as e:
                        raise serializers.ValidationError({"Telegram Error": e.message})
                else:
                    try:
                        logger.info(f"Deleted webhook: {bot.delete_webhook()}")
                    except telegram.error.TelegramError as e:
                        raise serializers.ValidationError({"Telegram Error": e.message})

        return attrs
