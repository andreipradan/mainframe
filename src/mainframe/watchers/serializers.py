import json

from cron_descriptor import get_description
from mainframe.core.serializers import ScheduleTaskIsRenamedSerializer
from mainframe.core.tasks import get_redis_client
from mainframe.watchers.models import Watcher
from rest_framework import serializers


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
        return json.loads(get_redis_client().get(f"tasks.{obj.name}") or "{}")
