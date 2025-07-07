from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Bond
from mainframe.finance.serializers import BondSerializer


class BondsViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Bond.objects.order_by("-date", "-created_at")
    serializer_class = BondSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if tickers := self.request.query_params.getlist("ticker"):
            queryset = queryset.filter(ticker__in=tickers)
        if transaction_types := self.request.query_params.getlist("type"):
            queryset = queryset.filter(type__in=transaction_types)
        if self.request.query_params.get("active_only") == "true":
            queryset = queryset.filter(maturity__gt=timezone.now())
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
                **{
                    f"pnl_{currency}": Sum("pnl", filter=Q(currency=currency))
                    for currency in bond_currencies
                },
                **{
                    f"{bond_type.lower()}_{currency}": Sum(
                        "net",
                        filter=Q(
                            currency=currency,
                            type=getattr(Bond, f"TYPE_{bond_type.upper()}"),
                        ),
                    )
                    for currency in bond_currencies
                    for bond_type in [t[1] for t in Bond.TYPE_CHOICES]
                },
            ),
            currencies=bond_currencies,
            tickers=(
                Bond.objects.values_list("ticker", flat=True)
                .distinct("ticker")
                .order_by("ticker")
            ),
            types=Bond.TYPE_CHOICES,
        )
        return response
