from django.urls import path

from api.logs import views


urlpatterns = [
    path("", views.get_list),
]
