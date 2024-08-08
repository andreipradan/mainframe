import telegram
from mainframe.bots.models import Bot, Message
from mainframe.clients.logs import get_default_logger
from rest_framework import serializers

logger = get_default_logger(__name__)


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
            token = self.instance.token
            attrs = {"token": token}
            bot = self.instance.telegram_bot
            try:
                attrs["webhook"] = bot.get_webhook_info()["url"]
            except telegram.error.TelegramError as e:
                raise serializers.ValidationError({"Telegram Error": e.message}) from e

            bot = bot.bot
            additional_data = self.instance.additional_data
            additional_data.update(bot.to_dict())
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
            bot = self.instance.telegram_bot

            if list(attrs) == ["token"]:
                logger.info("Setting new token")
                try:
                    bot.get_me()
                    return attrs
                except telegram.error.TelegramError as e:
                    raise serializers.ValidationError(
                        {"Telegram Error": e.message}
                    ) from e

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
