import logging

from crontab import CronTab
from rest_framework import serializers

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
            except (KeyError, ValueError) as e:
                raise serializers.ValidationError(e)
        return value
