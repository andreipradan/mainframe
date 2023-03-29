from django.contrib import admin

from transactions.models import Transaction


class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "started_at",
        "type",
        "amount",
        "fee",
        "description",
    )


admin.site.register(Transaction, TransactionAdmin)
