import json
import logging

import redis
from cron_descriptor import get_description
from crontab import CronTab
from rest_framework import serializers

from mainframe.core.serializers import ScheduleTaskIsRenamedSerializer
from mainframe.core.tasks import get_redis_client
from mainframe.crons.models import Cron

logger = logging.getLogger(__name__)


class CronSerializer(ScheduleTaskIsRenamedSerializer):
    cron_description = serializers.SerializerMethodField()
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
    def get_cron_description(obj: Cron) -> str:
        return get_description(obj.expression) if obj.expression else ""

    @staticmethod
    def get_redis(obj):
        try:
            result = json.loads(get_redis_client().get(f"tasks.{obj.name}") or "{}")
        except redis.exceptions.ConnectionError as e:
            logger.error("Error in CronSerializer.get_redis: %s", e)
            return {}
        return result
