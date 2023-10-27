from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.settings import api_settings

from finance.models import ExchangeRate
from finance.serializers import ExchangeRateSerializer


class ExchangePagination(api_settings.DEFAULT_PAGINATION_CLASS):
    page_size = 31


class ExchangeRateViewSet(viewsets.ModelViewSet):
    pagination_class = ExchangePagination
    permission_classes = (IsAuthenticated,)
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if date := self.request.query_params.get("date"):
            queryset = queryset.filter(date=date)
        if from_currency := self.request.query_params.get("from_currency"):
            queryset = queryset.filter(symbol__startswith=from_currency)
        if source := self.request.query_params.get("source"):
            queryset = queryset.filter(source=source)
        if to_currency := self.request.query_params.get("to_currency"):
            queryset = queryset.filter(symbol__endswith=to_currency)
        return queryset

    def list(self, request, *args, **kwargs):
        symbols = ExchangeRate.objects.distinct("symbol").order_by("symbol")
        sources = ExchangeRate.objects.distinct("source").order_by("source")
        response = super().list(request, *args, **kwargs)
        response.data["symbols"] = symbols.values_list("symbol", flat=True)
        response.data["sources"] = sources.values_list("source", flat=True)
        return response
