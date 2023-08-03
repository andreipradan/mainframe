from django.contrib import admin

from transactions.models import Transaction


class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "type",
        "amount",
        "fee",
        "started_at",
        "completed_at",
        "state",
        "product",
        "description",
        "created_at",
        "updated_at",
    )
    list_filter = ["type", "state", "product"]


admin.site.register(Transaction, TransactionAdmin)
