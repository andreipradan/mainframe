from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from credit.models import Payment, Timetable
from credit.serializers import PaymentSerializer, TimetableSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Payment.objects.select_related("credit").all()
    serializer_class = PaymentSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
