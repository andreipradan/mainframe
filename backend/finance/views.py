import logging
from operator import attrgetter, itemgetter

import django.utils.timezone
from django.contrib.postgres.search import SearchVector
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncMonth, TruncYear
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from clients.classifier import predict, train
from clients.logs import MainframeHandler
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

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


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

    @action(methods=["put"], detail=False, url_path="bulk-update")
    def bulk_update(self, request, *args, **kwargs):
        total = 0
        for item in self.request.data:
            total += Transaction.objects.filter(description=item["description"]).update(
                category=item["category"],
                category_suggestion_id=None,
                confirmed_by=Transaction.CONFIRMED_BY_ML,
            )
        response = self.list(request, *args, **kwargs)
        response.data["msg"] = {
            "message": f"Successfully updated {total} transaction categories"
        }
        return response

    @action(methods=["put"], detail=False, url_path="clear-suggestions")
    def clear_suggestions(self, request, *args, **kwargs):
        queryset = Transaction.objects.expenses().filter(
            description__in=self.request.data["descriptions"],
        )
        queryset.update(category_suggestion_id=None)

        return self._aggregate_results(queryset)

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if account_id := params.get("account_id"):
            queryset = queryset.filter(account_id=account_id)
        if category := params.get("category"):
            queryset = queryset.filter(category=category)
        if confirmed_by := params.get("confirmed_by"):
            queryset = queryset.filter(confirmed_by=confirmed_by)
        if description := params.get("description"):
            queryset = queryset.filter(description=description)
        if params.get("expense") == "true":
            queryset = queryset.expenses()
        if month := params.get("month"):
            queryset = queryset.filter(started_at__month=month)
        if search_term := params.get("search_term"):
            queryset = queryset.annotate(
                search=SearchVector(
                    "description", "additional_data", "amount", "type", "started_at"
                ),
            ).filter(search=search_term)
        if types := params.getlist("type"):
            queryset = queryset.filter(type__in=types)
        if params.get("unique") == "true":
            queryset = queryset.distinct("description").order_by("description")
        if year := params.get("year"):
            queryset = queryset.filter(started_at__year=year)

        return queryset.select_related("account")

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return self._populate_filters(response)

    def partial_update(self, request, *args, **kwargs):
        Category.objects.get_or_create(id=request.data["category"])
        response = super().partial_update(request, *args, **kwargs)
        response.data["msg"] = {"message": f"Successfully updated 1 transaction"}
        return response

    @action(methods=["put"], detail=False)
    def predict(self, request, *args, **kwargs):
        queryset = Transaction.objects.expenses().filter(
            category=Category.UNIDENTIFIED,
            confirmed_by=Transaction.CONFIRMED_BY_UNCONFIRMED,
        )
        if descriptions := self.request.data:
            queryset = queryset.filter(description__in=descriptions)

        transactions = predict(queryset.values("description", "id"), logger)
        logger.info(f"Bulk updating {len(transactions)}")
        total = Transaction.objects.bulk_update(
            transactions,
            fields=("category_suggestion_id",),
            batch_size=1000,
        )
        logger.info("Done.")
        response = self.list(request, *args, **kwargs)
        response.data["msg"] = {
            "message": f"Completed predicting categories for {total} transactions 🎉"
        }
        return response

    @action(methods=["put"], detail=False)
    def train(self, request, *args, **kwargs):
        accuracy = train(logger)
        response = self.list(request, *args, **kwargs)
        success = accuracy > 0.95
        response.data["msg"] = {
            "level": "success" if success else "danger",
            "message": f"Training {'completed' if success else 'failed'} - "
            f"{accuracy * 100:.2f}% accuracy "
            f"{'🎉' if success else '😢'}",
        }
        return response

    @action(methods=["put"], detail=False, url_path="update-all")
    def update_all(self, request, *args, **kwargs):
        category = self.request.data["category"]
        queryset = Transaction.objects.expenses().filter(
            description=self.request.data["description"],
        )
        total = queryset.update(
            category=category,
            category_suggestion_id=(
                None
                if category != Category.UNIDENTIFIED
                else F("category_suggestion_id")
            ),
            confirmed_by=(
                Transaction.CONFIRMED_BY_ML
                if category != Category.UNIDENTIFIED
                else Transaction.CONFIRMED_BY_UNCONFIRMED
            ),
        )
        response = self.list(request, *args, **kwargs)
        response.data["msg"] = {
            "message": f"Successfully updated {total} transactions",
            "level": "success",
        }
        return response

    def _aggregate_results(self, queryset):
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self._populate_filters(self.get_paginated_response(serializer.data))

        serializer = self.get_serializer(queryset, many=True)
        return self._populate_filters(Response(serializer.data))

    def _populate_filters(self, response):
        response.data["types"] = (
            Transaction.objects.filter(amount__lt=0)
            .values_list("type", flat=True)
            .distinct("type")
            .order_by("type")
        )
        response.data["confirmed_by_choices"] = Transaction.CONFIRMED_BY_CHOICES
        response.data["categories"] = Category.objects.values_list("id", flat=True)
        response.data["unidentified_count"] = (
            Transaction.objects.expenses()
            .filter(
                category=Category.UNIDENTIFIED,
            )
            .count()
        )
        return response
