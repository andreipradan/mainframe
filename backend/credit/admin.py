from django.contrib import admin

from credit.models import Account, Credit, Timetable, Payment


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = "first_name", "last_name", "number", "created_at", "updated_at"


@admin.register(Credit)
class CreditAdmin(admin.ModelAdmin):
    list_display = "account", "currency", "total", "created_at", "updated_at"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "total",
        "is_prepayment",
        "principal",
        "interest",
        "reference",
    )


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "interest",
        "ircc",
        "margin",
        "number_of_months",
        "credit",
        "created_at",
        "updated_at",
    )
