import json

from rest_framework import serializers

from core.tasks import get_redis_client
from watchers.models import Watcher


class WatcherSerializer(serializers.ModelSerializer):
    redis = serializers.SerializerMethodField()

    class Meta:
        model = Watcher
        fields = "__all__"

    def get_redis(self, obj):
        return json.loads(get_redis_client().get(f"tasks.{obj.name}") or "{}")
