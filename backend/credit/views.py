from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from credit.models import Payment, Timetable, get_default_credit
from credit.serializers import PaymentSerializer, TimetableSerializer, CreditSerializer


class OverviewViewSet(viewsets.ViewSet):
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
