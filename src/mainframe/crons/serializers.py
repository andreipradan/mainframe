import json

from crontab import CronTab
from mainframe.core.serializers import ScheduleTaskIsRenamedSerializer
from mainframe.core.tasks import get_redis_client
from mainframe.crons.models import Cron
from rest_framework import serializers


class CronSerializer(ScheduleTaskIsRenamedSerializer):
    redis = serializers.SerializerMethodField()

    class Meta:
        model = Cron
        fields = "__all__"

    @staticmethod
    def validate_expression(value):
        if value:
            cron = CronTab().new()
            try:
                cron.setall(value)
            except (KeyError, ValueError) as e:
                raise serializers.ValidationError(e) from e
        return value

    @staticmethod
    def get_redis(obj):
        return json.loads(get_redis_client().get(f"tasks.{obj.name}") or "{}")
