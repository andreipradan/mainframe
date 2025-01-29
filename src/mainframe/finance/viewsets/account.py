from operator import attrgetter, itemgetter

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth, TruncYear
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Account, Category, Transaction
from mainframe.finance.serializers import AccountSerializer


class AccountViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = (
        Account.objects.prefetch_related()
        .annotate(transaction_count=Count("transaction"))
        .order_by("-transaction_count")
    )
    serializer_class = AccountSerializer

    @action(methods=["get"], detail=True)
    def expenses(self, request, *args, **kwargs):
        qs = Transaction.objects.expenses().filter(account_id=kwargs["pk"])
        categories = list(Category.objects.values_list("id", flat=True).order_by("id"))
        year = request.query_params.get("year", timezone.now().year)
        per_month = (
            qs.filter(started_at__year=year)
            .annotate(month=TruncMonth("started_at"))
            .values("month")
            .annotate(
                **{
                    k: Sum("amount", filter=Q(category=k), default=0)
                    for k in categories
                }
            )
            .order_by("month")
        )
        years = list(
            map(
                attrgetter("year"),
                qs.annotate(year=TruncYear("started_at"))
                .values_list("year", flat=True)
                .distinct("year")
                .order_by("year"),
            )
        )
        return JsonResponse(
            data={
                "per_month": [
                    {
                        "month": item["month"].strftime("%B"),
                        **{k: item[k] for k in categories},
                    }
                    for item in per_month
                ],
                "years": years,
                "categories": [
                    cat for cat in categories if sum(map(itemgetter(cat), per_month))
                ],
                "total": Transaction.objects.filter(account_id=kwargs["pk"]).count(),
            }
        )
