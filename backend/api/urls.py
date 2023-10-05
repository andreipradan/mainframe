from django.urls import include, path

urlpatterns = [
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
    path("camera/", include(("camera.routers", "api"), namespace="camera")),
    path("crons/", include(("crons.routers", "api"), namespace="crons")),
    path("devices/", include(("devices.routers", "api"), namespace="devices")),
    path(
        "earthquakes/",
        include(("api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path("finance/", include(("finance.routers", "api"), namespace="finance")),
    path("hooks/", include("api.hooks.urls")),
    path("lights/", include(("api.lights.routers", "api"),
                            namespace="lights")),
    path("logs/", include(("api.logs.routers", "api"), namespace="logs")),
    path("meals/", include(("meals.routers", "api"), namespace="meals")),
    path("rpi/", include(("api.rpi.routers", "api"), namespace="rpi")),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
]
