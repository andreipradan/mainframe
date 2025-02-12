from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from mainframe.finance.models import Contribution, Pension
from mainframe.finance.serializers import (
    ContributionSerializer,
    PensionSerializer,
)


class ContributionsViewSet(ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Contribution.objects.select_related("pension").order_by("-date")
    serializer_class = ContributionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if pension_id := self.request.query_params.get("pension_id"):
            queryset = queryset.filter(pension_id=pension_id)
        return queryset


class PensionViewSet(ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Pension.objects.prefetch_related("contribution_set", "unitvalue_set")
    serializer_class = PensionSerializer

    @action(methods=["post"], detail=True)
    def contributions(self, request, *args, **kwargs):
        pension = self.get_object()
        serializer = ContributionSerializer(
            data={"pension": pension.id, **request.data}
        )
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except IntegrityError:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={
                    "error": f"{pension.name} contribution for "
                    f"{request.data.get('date')} already exists"
                },
            )
        return JsonResponse(self.serializer_class(self.get_object()).data)

    @action(methods=["delete", "patch"], detail=True)
    def contribution(self, request, *args, **kwargs):
        if not (contribution_id := request.query_params.get("contribution_id")):
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"error": "contribution_id is required."},
            )

        pension_id = self.kwargs["pk"]
        try:
            contribution = Contribution.objects.get(
                pension_id=pension_id, id=contribution_id
            )
        except Contribution.DoesNotExist:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"error": f"Contribution id '{contribution_id}' does not exist"},
            )

        if request.method == "DELETE":
            try:
                contribution.delete()
            except ValidationError as e:
                return JsonResponse(
                    status=status.HTTP_400_BAD_REQUEST, data={"error": str(e)}
                )
            return JsonResponse(status=status.HTTP_204_NO_CONTENT, data={})

        serializer = ContributionSerializer(
            instance=contribution, data={"pension": pension_id, **request.data}
        )
        if not serializer.is_valid():
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"errors": serializer.errors}
            )
        serializer.save()
        return JsonResponse(self.serializer_class(self.get_object()).data)

    @action(methods=["patch"], detail=True, url_path="sync-units")
    def sync(self, request, *args, **kwargs):
        pension = self.get_object()
        if not (contribution_id := request.data.pop("contribution_id", None)):
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"message": "contribution_id is required"},
            )
        try:
            contribution = pension.contribution_set.get(id=contribution_id)
        except Contribution.DoesNotExist:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={
                    "message": f"'{pension.name}' contribution with id "
                    f"'{contribution_id}' does not exist"
                },
            )
        unit_value = (
            pension.unitvalue_set.filter(
                date__month=contribution.date.month,
                date__year=contribution.date.year,
            )
            .order_by("date")
            .first()
        )
        if not unit_value:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={
                    "message": f"'{pension.name}' unit value for "
                    f"'{contribution.date}' does not exist"
                },
            )

        contribution.units = contribution.amount / unit_value.value
        contribution.save()
        return Response(PensionSerializer(self.get_object()).data)
