from datetime import datetime

from django.db.models import (
    BooleanField,
    Case,
    Q,
    Sum,
    When,
)
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Deposit
from mainframe.finance.serializers import DepositSerializer


class DepositsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Deposit.objects.annotate(
        has_matured=Case(
            When(maturity__lt=datetime.today(), then=True),
            default=False,
            output_field=BooleanField(),
        )
    ).order_by("has_matured", "maturity", "-date")
    serializer_class = DepositSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if currencies := self.request.query_params.getlist("currency"):
            queryset = queryset.filter(currency__in=currencies)
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        currencies = list(
            Deposit.objects.values_list("currency", flat=True)
            .distinct("currency")
            .order_by("currency")
        )
        aggregations = Deposit.objects.aggregate(
            **{
                currency: Sum(
                    "amount",
                    filter=Q(currency=currency, maturity__gt=datetime.now().date()),
                )
                for currency in currencies
            },
        )

        response.data.update(aggregations=aggregations, currencies=currencies)
        return response
