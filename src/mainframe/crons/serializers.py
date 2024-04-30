from crontab import CronTab
from mainframe.crons.models import Cron
from rest_framework import serializers


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
                raise serializers.ValidationError(e) from e
        return value
