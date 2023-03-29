import logging

from rest_framework import serializers
from transactions.models import Transaction

logger = logging.getLogger(__name__)


class TransactionSerializer(serializers.ModelSerializer):
    product_verbose = serializers.SerializerMethodField()
    type_verbose = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = "__all__"

    def get_product_verbose(self, obj: Transaction):
        return obj.get_product_display()

    def get_type_verbose(self, obj):
        return obj.get_type_display()
