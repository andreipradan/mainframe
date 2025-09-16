from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import OuterRef, Prefetch, Subquery, Sum
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.viewsets import ModelViewSet

from mainframe.finance.models import Contribution, Pension, UnitValue
from mainframe.finance.serializers import ContributionSerializer, PensionSerializer


class PensionViewSet(ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = (
        Pension.objects.annotate(
            latest_unit_value=Subquery(
                UnitValue.objects.filter(pension_id=OuterRef("pk"))
                .order_by("-date")
                .values("value")[:1]
            ),
            latest_unit_value_date=Subquery(
                UnitValue.objects.filter(pension_id=OuterRef("pk"))
                .order_by("-date")
                .values("date")[:1]
            ),
        )
        .prefetch_related(
            Prefetch(
                "contribution_set",
                Contribution.objects.annotate(
                    unit_value=Subquery(
                        UnitValue.objects.filter(
                            pension=OuterRef("pension"), date__lte=OuterRef("date")
                        ).values("value")[:1]
                    )
                ),
                to_attr="contributions",
            ),
        )
        .annotate(total_units=Sum("contribution__units"))
    )
    serializer_class = PensionSerializer

    @action(methods=["post"], detail=True)
    def contributions(self, request, *args, **kwargs):
        pension_id = self.kwargs["pk"]
        serializer = ContributionSerializer(
            data={"pension": pension_id, **request.data}
        )
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except IntegrityError as e:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={
                    "error": f"{e} contribution for pension ID '{pension_id}' "
                    f"for {request.data.get('date')} already exists"
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
