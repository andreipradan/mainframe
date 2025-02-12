from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Bond
from mainframe.finance.serializers import BondSerializer


class BondsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Bond.objects.order_by("-date")
    serializer_class = BondSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if tickers := self.request.query_params.getlist("ticker"):
            queryset = queryset.filter(ticker__in=tickers)
        if transaction_types := self.request.query_params.getlist("type"):
            queryset = queryset.filter(type__in=transaction_types)
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        bond_currencies = list(
            Bond.objects.values_list("currency", flat=True)
            .distinct("currency")
            .order_by("currency")
        )
        response.data.update(
            aggregations=Bond.objects.aggregate(
                deposited=Sum("net", filter=Q(type=Bond.TYPE_DEPOSIT)),
                dividends=Sum("net", filter=Q(type=Bond.TYPE_DIVIDEND)),
                invested=Sum("net", filter=Q(type=Bond.TYPE_BUY)),
                pnl=Sum("pnl"),
                sold=Sum("net", filter=Q(type=Bond.TYPE_SELL)),
                **{
                    f"active_{currency}": Sum(
                        "net",
                        filter=Q(
                            currency=currency,
                            maturity__gt=timezone.now(),
                            type=Bond.TYPE_BUY,
                        ),
                    )
                    for currency in bond_currencies
                },
            ),
            tickers=(
                Bond.objects.values_list("ticker", flat=True)
                .distinct("ticker")
                .order_by("ticker")
            ),
            types=Bond.TYPE_CHOICES,
        )
        return response
