from django.db.models import Q, Sum
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from mainframe.exchange.models import Currency
from mainframe.finance.models import Deposit
from mainframe.finance.serializers import DepositSerializer


class DepositsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Deposit.objects.order_by("-date")
    serializer_class = DepositSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if currencies := self.request.query_params.getlist("currency"):
            queryset = queryset.filter(currency__in=currencies)
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        currencies = list(
            Currency.objects.values_list("symbol", flat=True)
            .distinct("symbol")
            .order_by("symbol")
        )
        aggregations = Deposit.objects.aggregate(
            pnl=Sum("pnl"),
            **{
                currency: Sum("amount", filter=Q(currency=currency))
                for currency in currencies
            },
        )
        response.data.update(
            aggregations={k: v for k, v in aggregations.items() if v},
            currencies=currencies,
        )
        return response
