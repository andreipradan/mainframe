from rest_framework import serializers

from watchers.models import Watcher


class WatcherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Watcher
        fields = "__all__"
