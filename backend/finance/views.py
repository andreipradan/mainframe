from operator import attrgetter, itemgetter

import django.utils.timezone
from django.contrib.postgres.search import SearchVector
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth, TruncYear
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from finance.models import (
    Account,
    Category,
    Payment,
    Timetable,
    Transaction,
    get_default_credit,
)
from finance.serializers import (
    AccountSerializer,
    CategorySerializer,
    CreditSerializer,
    PaymentSerializer,
    TimetableSerializer,
    TransactionSerializer,
)


class AccountViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = (
        Account.objects.prefetch_related()
        .annotate(transaction_count=Count("transaction"))
        .order_by("-transaction_count")
    )
    serializer_class = AccountSerializer

    @action(methods=["get"], detail=True)
    def analytics(self, request, *args, **kwargs):
        qs = Transaction.objects.filter(account_id=kwargs["pk"], amount__lte=0)
        now = django.utils.timezone.now()
        year = request.query_params.get("year", now.year)
        categories = list(Category.objects.values_list("id", flat=True).order_by("id"))
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
            }
        )


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Category.objects.order_by("id")
    serializer_class = CategorySerializer


class CreditViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    def list(self, request, **kwargs):
        credit = get_default_credit()
        latest_timetable = credit.latest_timetable
        return JsonResponse(
            data={
                "credit": CreditSerializer(credit).data,
                "latest_timetable": TimetableSerializer(latest_timetable).data,
            }
        )


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Payment.objects.select_related("credit")
    serializer_class = PaymentSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Transaction.objects.order_by("-started_at")
    serializer_class = TransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if year := params.get("year"):
            queryset = queryset.filter(started_at__year=year)
        if month := params.get("month"):
            queryset = queryset.filter(started_at__month=month)
        if category := params.get("category"):
            queryset = queryset.filter(category=category)
        if transaction_type := params.get("type"):
            queryset = queryset.filter(type=transaction_type)
        if account_id := params.get("account_id"):
            queryset = queryset.filter(account_id=account_id)
        if search_term := params.get("search_term"):
            queryset = queryset.annotate(
                search=SearchVector(
                    "description", "additional_data", "amount", "type", "started_at"
                ),
            ).filter(search=search_term)
        return queryset
