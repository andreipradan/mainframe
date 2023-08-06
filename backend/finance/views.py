from django.http import JsonResponse
from rest_framework import viewsets
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
    queryset = Account.objects.all()
    serializer_class = AccountSerializer


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
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                account_id=self.request.query_params["account_id"],
                account__type=self.request.query_params["account_type"],
            )
        )
