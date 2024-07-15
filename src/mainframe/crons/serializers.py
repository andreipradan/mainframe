import json

from crontab import CronTab
from mainframe.core.tasks import get_redis_client
from mainframe.crons.models import Cron
from rest_framework import serializers


class CronSerializer(serializers.ModelSerializer):
    redis = serializers.SerializerMethodField()

    class Meta:
        model = Cron
        fields = "__all__"

    def validate_expression(self, value):
        if value:
            cron = CronTab().new()
            try:
                cron.setall(value)
            except (KeyError, ValueError) as e:
                raise serializers.ValidationError(e) from e
        return value

    def get_redis(self, obj):
        return json.loads(get_redis_client().get(f"tasks.{obj.name}") or "{}")
