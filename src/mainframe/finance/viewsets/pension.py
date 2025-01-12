from django.db import IntegrityError
from django.http import JsonResponse
from mainframe.finance.models import Contribution, Pension
from mainframe.finance.serializers import (
    ContributionSerializer,
    PensionSerializer,
)
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet


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
            obj = serializer.save()
        except IntegrityError:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={
                    "message": f"{pension.name} contribution for "
                    f"{request.data.get('date')} already exists"
                },
            )
        return Response(ContributionSerializer(obj).data)

    @action(methods=["patch"], detail=True, url_path="update-units")
    def update_units(self, request, *args, **kwargs):
        pension = self.get_object()
        if not (contribution_id := request.data.pop("contribution_id", None)):
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"message": f"'{pension.name}' contribution_id is required."},
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
        if not (units := request.data.pop("units", None)):
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"message": "units required"}
            )
        contribution.units = units
        contribution.save()
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
