from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from finance.models import Payment
from finance.serializers import PaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Payment.objects.select_related("credit")
    serializer_class = PaymentSerializer
