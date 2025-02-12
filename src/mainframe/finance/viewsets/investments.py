from django.db.models import (
    Count,
    DecimalField,
    F,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Bond, Deposit, Pension, UnitValue
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
                f"active_{currency}": Sum(
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
                f"active_{currency}": Sum(
                    "amount",
                    filter=Q(currency=currency, maturity__gt=timezone.now()),
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
        latest_unit_value_subquery = UnitValue.objects.filter(
            pension=OuterRef("id")
        ).order_by("-date")
        total_net_per_currency = (
            Pension.objects.annotate(
                latest_unit_value=Subquery(
                    latest_unit_value_subquery.values("value")[:1],
                    output_field=DecimalField(),
                ),
                currency=Subquery(latest_unit_value_subquery.values("currency")[:1]),
            )
            .annotate(
                net_amount=F("total_units")
                * Coalesce(
                    F("latest_unit_value"), Value(0, output_field=DecimalField())
                )
            )
            .values("currency")  # Group by currency
            .annotate(amount=Sum("net_amount"))  # Sum per currency
        )
        pension_currencies = list(
            UnitValue.objects.values_list("currency", flat=True)
            .distinct("currency")
            .order_by("currency")
        )
        pensions = {
            f"active_{entry['currency']}": entry["amount"]
            for entry in total_net_per_currency
        }
        currencies = sorted(
            (set(bond_currencies + deposit_currencies + pension_currencies))
        )
        unit_values_qs = UnitValue.objects.filter(
            pension_id__in=Pension.objects.values("id")
        ).order_by("date")
        unit_values_prefetch = Prefetch("unitvalue_set", queryset=unit_values_qs)

        unit_values = {
            pension.name: [
                {"date": unit_value.date, "value": unit_value.value}
                for unit_value in pension.unitvalue_set.all()
            ]
            for pension in Pension.objects.prefetch_related(
                unit_values_prefetch
            ).order_by("name")
        }
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
                "pension": {
                    **pensions,
                    "count": Pension.objects.count(),
                    "currencies": pension_currencies,
                    "unit_values": unit_values,
                },
                "currencies": currencies,
                "totals": {
                    currency: {
                        "active": bonds.get(f"active_{currency}", 0)
                        + deposits.get(f"active_{currency}", 0)
                        + pensions.get(f"active_{currency}", 0),
                        "deposit": bonds.get(f"deposit_{currency}", 0)
                        + deposits.get(f"deposit_{currency}", 0)
                        + pensions.get(f"deposit_{currency}", 0),
                        "buy": bonds.get(f"buy_{currency}", 0)
                        + deposits.get(f"buy_{currency}", 0)
                        + pensions.get(f"buy_{currency}", 0),
                        "sell": bonds.get(f"sell_{currency}", 0)
                        + deposits.get(f"sell_{currency}", 0)
                        + pensions.get(f"sell_{currency}", 0),
                        "pnl": bonds.get(f"pnl_{currency}", 0)
                        + deposits.get(f"pnl_{currency}", 0)
                        + pensions.get(f"pnl_{currency}", 0),
                        "dividend": bonds.get(f"dividend_{currency}", 0)
                        + deposits.get(f"dividend_{currency}", 0)
                        + pensions.get(f"dividend_{currency}", 0),
                    }
                    for currency in currencies
                },
            }
        )
