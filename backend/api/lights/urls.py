from django.urls import path

from api.lights import views


urlpatterns = [
    path("", views.get_list),
    path("turn-off", views.turn_all_off),
    path("turn-on", views.turn_all_on),
    path("<str:ip>/set-brightness", views.set_brightness),
    path("<str:ip>/set-color-temp", views.set_color_temp),
    path("<str:ip>/set-rgb", views.set_rgb),
    path("<str:ip>/turn-off", views.turn_off),
    path("<str:ip>/turn-on", views.turn_on),
]
