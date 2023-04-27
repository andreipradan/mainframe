import logging

from crontab import CronTab
from rest_framework import serializers

from clients.cron import set_crons
from crons.models import Cron

logger = logging.getLogger(__name__)


class CronSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cron
        fields = "__all__"

    def validate_expression(self, value):
        if value:
            cron = CronTab().new()
            try:
                cron.setall(value)
            except ValueError as e:
                raise serializers.ValidationError(e)
        return value

    def update(self, instance: Cron, validated_data):
        need_to_update_cron = (
            instance.command != validated_data.get("command")
            or instance.expression != validated_data.get("expression")
            or (
                (args := validated_data.get("arguments"))
                and set(instance.arguments) != set(args)
            )
        )
        instance = super().update(instance, validated_data)
        need_to_update_cron and set_crons([instance])
        return instance
