from operator import attrgetter

import django.utils.timezone
from django.contrib.postgres.search import SearchVector
from django.db.models import Count, Sum, Q, Func
from django.db.models.functions import TruncYear, TruncMonth
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from finance.models import Account
from finance.models import Payment
from finance.models import Timetable
from finance.models import Transaction
from finance.models import get_default_credit
from finance.serializers import AccountSerializer
from finance.serializers import CreditSerializer
from finance.serializers import PaymentSerializer
from finance.serializers import TimetableSerializer
from finance.serializers import TransactionSerializer


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
        qs = Transaction.objects.filter(account_id=kwargs["pk"])
        year = request.query_params.get("year", django.utils.timezone.now().year)
        per_month = (
            qs.filter(
                started_at__year=year,
            )
            .annotate(month=TruncMonth("started_at"))
            .values("month")
            .annotate(
                money_in=Sum("amount", filter=Q(amount__gt=0)),
                money_out=Func(Sum("amount", filter=Q(amount__lt=0)), function="ABS"),
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
                        "money_in": item["money_in"],
                        "money_out": item["money_out"],
                    }
                    for item in per_month
                ],
                "years": years,
            }
        )


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
    queryset = Transaction.objects.order_by("-completed_at")
    serializer_class = TransactionSerializer

    def get_queryset(self):
        params = self.request.query_params
        queryset = super().get_queryset()
        if account_id := params.get("account_id"):
            queryset = queryset.filter(account_id=account_id)
        if search_term := params.get("search_term"):
            queryset = queryset.annotate(
                search=SearchVector("description", "additional_data"),
            ).filter(search=search_term)
        return queryset
