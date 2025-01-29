from django.contrib import admin

from mainframe.exchange.models import ExchangeRate


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = "date", "source", "symbol", "value"
