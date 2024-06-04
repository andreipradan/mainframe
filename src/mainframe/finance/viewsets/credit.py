from django.core.exceptions import ValidationError
from django.db.models import Count, Q, Sum
from django.http import JsonResponse
from mainframe.exchange.models import ExchangeRate
from mainframe.exchange.serializers import ExchangeRateSerializer
from mainframe.finance.models import Credit, Payment, get_default_credit
from mainframe.finance.serializers import CreditSerializer, TimetableSerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser


class CreditViewSet(viewsets.ViewSet):
    permission_classes = (IsAdminUser,)

    def list(self, request, **kwargs):
        try:
            credit = get_default_credit()
        except ValidationError as e:
            return JsonResponse({"error": e.message}, status=400)
        except Credit.DoesNotExist as e:
            return JsonResponse({"error": str(e)}, status=400)
        latest_timetable = credit.latest_timetable
        rates = (
            ExchangeRate.objects.filter(
                Q(symbol__startswith=credit.currency_id)
                | Q(symbol__endswith=credit.currency_id)
            )
            .distinct("symbol")
            .order_by("symbol", "-date")
        )
        payment_stats = Payment.objects.filter(credit=credit).aggregate(
            interest=Sum("interest"),
            number_of_payments=Count("id"),
            prepaid=Sum("total", filter=Q(is_prepayment=True)),
            principal=Sum("principal"),
            saved=Sum("saved"),
            total=Sum("total"),
        )
        return JsonResponse(
            data={
                "credit": CreditSerializer(credit).data,
                "latest_timetable": TimetableSerializer(latest_timetable).data,
                "payment_stats": payment_stats,
                "rates": ExchangeRateSerializer(rates, many=True).data,
            }
        )
