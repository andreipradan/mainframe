from django.urls import path

from api.lights import views


urlpatterns = [
    path("", views.get_list),
    path("<str:ip>/turn-off", views.turn_off),
    path("<str:ip>/turn-on", views.turn_on),
]
