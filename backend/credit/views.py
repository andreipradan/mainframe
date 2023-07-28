from django.db.models import Sum
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from credit.models import Payment, Timetable, Credit, get_default_credit
from credit.serializers import PaymentSerializer, TimetableSerializer, CreditSerializer


class OverviewViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    def list(self, request, **kwargs):
        credit = get_default_credit()
        paid = Payment.objects.aggregate(
            total_interest=Sum("interest"),
            total_paid=Sum("total"),
            total_principal=Sum("principal"),
        )
        return JsonResponse(
            {
                "date": credit.date,
                "paid": {
                    "interest": paid["total_interest"],
                    "principal": paid["total_principal"],
                    "total": paid["total_paid"],
                },
                "last_payment": PaymentSerializer(
                    instance=Payment.objects.order_by("-date").first()
                ).data,
                "total": f"{credit.currency} {credit.total}",
                "timetables": TimetableSerializer(
                    Timetable.objects.all(), many=True
                ).data,
            },
        )


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
