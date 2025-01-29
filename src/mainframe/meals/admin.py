from django.contrib import admin

from mainframe.meals.models import Meal


class MealAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "type",
        "name",
    )


admin.site.register(Meal, MealAdmin)
