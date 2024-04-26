from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser

from finance.models import Payment
from finance.serializers import PaymentSerializer


class PaymentPagination(PageNumberPagination):
    page_size = 250
    max_page_size = 250


class PaymentViewSet(viewsets.ModelViewSet):
    pagination_class = PaymentPagination
    permission_classes = (IsAdminUser,)
    queryset = Payment.objects.select_related("credit")
    serializer_class = PaymentSerializer
