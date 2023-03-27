from django.urls import path, include

urlpatterns = [
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
    path("devices/", include(("api.devices.routers", "api"), namespace="devices")),
    path(
        "earthquakes/",
        include(("api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path("hooks/", include("api.hooks.urls")),
    path("lights/", include("api.lights.urls")),
    path("logs/", include("api.logs.urls")),
    path("meals/", include(("meals.routers", "api"), namespace="meals")),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
]
