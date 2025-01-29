from django.db import IntegrityError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from mainframe.sources.models import Source


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = "__all__"

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except IntegrityError as e:
            raise ValidationError({"detail": str(e)}) from e
