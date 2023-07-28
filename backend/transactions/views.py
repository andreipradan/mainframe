from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncYear
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.order_by("-started_at")
    permission_classes = (IsAuthenticated,)
    serializer_class = TransactionSerializer

    @action(methods=["get"], detail=False)
    def overview(self, request, **kwargs):
        per_year = (
            Transaction.objects.annotate(year=TruncYear("started_at"))
            .values("year")
            .annotate(count=Count("pk"))
            .order_by("year")
        )
        per_type = Transaction.objects.values("type").annotate(count=Sum("amount"))
        per_currency = Transaction.objects.values("currency").annotate(
            money_in=Sum("amount", filter=Q(amount__gt=0)),
            money_out=Sum("amount", filter=Q(amount__lt=0)),
        )
        return JsonResponse(
            {
                "per_currency": list(per_currency),
                "per_type": list(per_type),
                "per_year": [
                    {"year": i["year"].year, "count": i["count"]} for i in per_year
                ],
            }
        )
