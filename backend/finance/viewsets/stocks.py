from django.db.models import Sum, Q, Count
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from finance.models import StockTransaction
from finance.serializers import StockTransactionSerializer


class StocksViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = StockTransaction.objects.all()
    serializer_class = StockTransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if currency := self.request.query_params.getlist("currency"):
            queryset = queryset.filter(currency__in=currency)
        if ticker := self.request.query_params.getlist("ticker"):
            queryset = queryset.filter(ticker__in=ticker)
        if transaction_type := self.request.query_params.getlist("type"):
            queryset = queryset.filter(type__in=transaction_type)
        return queryset

    def list(self, request, *args, **kwargs):
        def normalize_type(type_display):
            return type_display.replace(" -", "").replace(" ", "_")

        response = super().list(request, *args, **kwargs)
        currencies = (
            StockTransaction.objects.values_list("currency", flat=True)
            .distinct("currency")
            .order_by("currency")
        )
        response.data["currencies"] = currencies
        aggregations = StockTransaction.objects.aggregate(
            **{
                f"{normalize_type(_type_display)}_total_{currency}": Sum(
                    "total_amount", filter=Q(type=_type, currency=currency)
                )
                for _type, _type_display in StockTransaction.TYPE_CHOICES
                for currency in currencies
            },
            **{
                f"{normalize_type(_type_display)}_count_{currency}": Count(
                    "id", filter=Q(type=_type, currency=currency)
                )
                for _type, _type_display in StockTransaction.TYPE_CHOICES
                for currency in currencies
            },
            count_EUR=Count("id", filter=Q(currency="EUR")),
            count_USD=Count("id", filter=Q(currency="USD")),
        )
        response.data["aggregations"] = {
            currency: {
                "counts": [
                    {"type": "total", "value": aggregations[f"count_{currency}"]},
                    *[
                        {"type": k.replace(f"_count_{currency}", ""), "value": v}
                        for (k, v) in aggregations.items()
                        if k.endswith(f"_count_{currency}")
                    ],
                ],
                "totals": [
                    {"type": k.replace(f"_total_{currency}", ""), "value": v}
                    for (k, v) in aggregations.items()
                    if k.endswith(f"_total_{currency}")
                ],
            }
            for currency in currencies
        }
        response.data["aggregations"]["current"] = self.filter_queryset(
            self.get_queryset()
        ).aggregate(
            **{
                f"total_{currency}": Sum("total_amount", filter=Q(currency=currency))
                for currency in currencies
            }
        )
        response.data["transactions_count"] = StockTransaction.objects.count()
        response.data["types"] = StockTransaction.TYPE_CHOICES
        response.data["tickers"] = (
            StockTransaction.objects.values_list("ticker")
            .distinct("ticker")
            .order_by("ticker")
        )
        return response
