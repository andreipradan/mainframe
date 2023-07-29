from django.db.models import Sum
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from credit.models import Payment, Timetable, Credit, get_default_credit
from credit.serializers import PaymentSerializer, TimetableSerializer


class OverviewViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    def list(self, request, **kwargs):
        try:
            credit = get_default_credit()
        except Credit.DoesNotExist:
            return JsonResponse(
                {"error": ["Default credit does not exists"]}, status=400
            )
        paid = Payment.objects.aggregate(
            total_interest=Sum("interest"),
            total_paid=Sum("total"),
            total_principal=Sum("principal"),
        )
        last_payment = Payment.objects.order_by("-date").first()
        return JsonResponse(
            {
                "date": credit.date,
                "paid": {
                    "interest": paid["total_interest"],
                    "principal": paid["total_principal"],
                    "total": paid["total_paid"],
                },
                "last_payment": PaymentSerializer(instance=last_payment).data
                if last_payment
                else None,
                "total": f"{credit.currency} {credit.total}",
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
