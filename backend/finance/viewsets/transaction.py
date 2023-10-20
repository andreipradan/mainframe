from django.contrib.postgres.search import SearchVector
from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from finance.models import Transaction, Category, Account
from finance.serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
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
        response.data["msg"] = {"message": "Successfully updated 1 transaction"}
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
        response.data["categories"] = Category.objects.values_list(
            "id", flat=True
        ).order_by("id")
        response.data["accounts"] = Account.objects.values("id", "bank", "type")
        response.data["unidentified_count"] = (
            Transaction.objects.expenses()
            .filter(
                category=Category.UNIDENTIFIED,
            )
            .count()
        )
        return response
