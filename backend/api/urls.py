from django.urls import path, include

urlpatterns = [
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
    path("camera/", include(("camera.routers", "api"), namespace="camera")),
    path("crons/", include(("crons.routers", "api"), namespace="crons")),
    path("devices/", include(("devices.routers", "api"), namespace="devices")),
    path(
        "earthquakes/",
        include(("api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path("hooks/", include("api.hooks.urls")),
    path("lights/", include(("api.lights.routers", "api"), namespace="lights")),
    path("logs/", include(("api.logs.routers", "api"), namespace="logs")),
    path("meals/", include(("meals.routers", "api"), namespace="meals")),
    path(
        "transactions/",
        include(("transactions.routers", "api"), namespace="transactions"),
    ),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
]
