from django.urls import path, include

urlpatterns = [
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
    path("crons/", include(("crons.routers", "api"), namespace="crons")),
    path("devices/", include(("api.devices.routers", "api"), namespace="devices")),
    path(
        "earthquakes/",
        include(("api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path("hooks/", include("api.hooks.urls")),
    path("lights/", include("api.lights.urls")),
    path("logs/", include("api.logs.urls")),
    path("meals/", include(("meals.routers", "api"), namespace="meals")),
    path(
        "transactions/",
        include(("transactions.routers", "api"), namespace="transactions"),
    ),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
]
