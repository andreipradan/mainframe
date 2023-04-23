import logging

from rest_framework import serializers
from crons.models import Cron

logger = logging.getLogger(__name__)


class CronSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cron
        fields = "__all__"
