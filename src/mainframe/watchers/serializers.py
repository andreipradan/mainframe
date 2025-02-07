import json
import logging

import redis.exceptions
from cron_descriptor import get_description
from rest_framework import serializers

from mainframe.core.serializers import ScheduleTaskIsRenamedSerializer
from mainframe.core.tasks import get_redis_client
from mainframe.watchers.models import Watcher

logger = logging.getLogger(__name__)


class WatcherSerializer(ScheduleTaskIsRenamedSerializer):
    cron_description = serializers.SerializerMethodField()
    redis = serializers.SerializerMethodField()

    class Meta:
        model = Watcher
        fields = "__all__"

    @staticmethod
    def get_cron_description(obj: Watcher) -> str:
        return get_description(obj.cron) if obj.cron else ""

    @staticmethod
    def get_redis(obj):
        try:
            result = json.loads(get_redis_client().get(f"tasks.{obj.name}") or "{}")
        except redis.exceptions.ConnectionError as e:
            logger.error("Error in WatcherSerializer.get_redis: %s", e)
            return {}
        return result
