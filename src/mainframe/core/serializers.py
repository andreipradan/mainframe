from rest_framework import serializers


class ScheduleTaskIsRenamedSerializer(serializers.ModelSerializer):
    def update(self, instance, validated_data):
        instance.is_renamed = instance.name != validated_data.get("name")
        return super().update(instance, validated_data)
