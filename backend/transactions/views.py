from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.order_by("-date")
    serializer_class = TransactionSerializer
    permission_classes = (IsAuthenticated,)
