from django.db import IntegrityError
from mainframe.sources.models import Source
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = "__all__"

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except IntegrityError as e:
            raise ValidationError({"detail": str(e)}) from e
