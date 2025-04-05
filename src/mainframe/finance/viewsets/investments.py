from django.db.models import Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Bond, Deposit
from mainframe.finance.serializers import BondSerializer, DepositSerializer


class InvestmentsViewSet(viewsets.ViewSet):
    permission_classes = (IsAdminUser,)

    @staticmethod
    def list(request, **kwargs):
        bond_currencies = list(
            Bond.objects.values_list("currency", flat=True)
            .distinct("currency")
            .order_by("currency")
        )
        bonds = Bond.objects.aggregate(
            count=Count("id"),
            **{
                f"active_{currency}": -Sum(
                    "net",
                    filter=Q(
                        currency=currency,
                        maturity__gt=timezone.now(),
                        type=Bond.TYPE_BUY,
                    ),
                )
                for currency in bond_currencies
            },
            **{
                f"buy_{currency}": Sum(
                    "net", filter=Q(currency=currency, type=Bond.TYPE_BUY)
                )
                for currency in bond_currencies
            },
            **{
                f"deposit_{currency}": Sum(
                    "net", filter=Q(currency=currency, type=Bond.TYPE_DEPOSIT)
                )
                for currency in bond_currencies
            },
            **{
                f"dividend_{currency}": Sum(
                    "net", filter=Q(currency=currency, type=Bond.TYPE_DIVIDEND)
                )
                for currency in bond_currencies
            },
            **{
                f"pnl_{currency}": Coalesce(
                    Sum("pnl", filter=Q(currency=currency)),
                    Value(0, output_field=DecimalField()),
                )
                for currency in bond_currencies
            },
            **{
                f"sell_{currency}": Sum(
                    "net", filter=Q(currency=currency, type=Bond.TYPE_SELL)
                )
                for currency in bond_currencies
            },
        )
        deposit_currencies = list(
            Deposit.objects.values_list("currency", flat=True)
            .distinct("currency")
            .order_by("currency")
        )
        deposits = Deposit.objects.aggregate(
            count=Count("id"),
            **{
                f"active_{currency}": Coalesce(
                    Sum(
                        "amount",
                        filter=Q(currency=currency, maturity__gt=timezone.now()),
                    ),
                    Value(0, output_field=DecimalField()),
                )
                for currency in deposit_currencies
            },
            **{
                f"pnl_{currency}": Coalesce(
                    Sum("pnl", filter=Q(currency=currency)),
                    Value(0, output_field=DecimalField()),
                )
                for currency in bond_currencies
            },
        )
        currencies = sorted((set(bond_currencies + deposit_currencies)))
        return JsonResponse(
            data={
                "bonds": {
                    **bonds,
                    "currencies": bond_currencies,
                    "next_maturity": BondSerializer(
                        Bond.objects.filter(maturity__gt=timezone.now())
                        .order_by("date")
                        .first()
                    ).data,
                    **{
                        f"interest_rates_{currency}": list(
                            Bond.objects.filter(
                                currency=currency, interest__isnull=False
                            )
                            .values("date__date", "interest")
                            .annotate(date=F("date__date"))
                            .order_by("date")
                        )
                        for currency in bond_currencies
                    },
                },
                "deposits": {
                    **{k: v for k, v in deposits.items() if v},
                    "currencies": deposit_currencies,
                    "next_maturity": DepositSerializer(
                        Deposit.objects.filter(maturity__gt=timezone.now())
                        .order_by("date")
                        .first()
                    ).data,
                    **{
                        f"interest_rates_{currency}": list(
                            Deposit.objects.filter(
                                currency=currency, interest__isnull=False
                            )
                            .values("date", "interest")
                            .order_by("date")
                        )
                        for currency in deposit_currencies
                    },
                },
                "currencies": currencies,
                "totals": {
                    currency: {
                        "active": bonds.get(f"active_{currency}", 0)
                        + deposits.get(f"active_{currency}", 0),
                        "deposit": bonds.get(f"deposit_{currency}", 0)
                        + deposits.get(f"deposit_{currency}", 0),
                        "buy": bonds.get(f"buy_{currency}", 0)
                        + deposits.get(f"buy_{currency}", 0),
                        "sell": bonds.get(f"sell_{currency}", 0)
                        + deposits.get(f"sell_{currency}", 0),
                        "pnl": bonds.get(f"pnl_{currency}", 0)
                        + deposits.get(f"pnl_{currency}", 0),
                        "dividend": bonds.get(f"dividend_{currency}", 0)
                        + deposits.get(f"dividend_{currency}", 0),
                    }
                    for currency in currencies
                },
            }
        )
