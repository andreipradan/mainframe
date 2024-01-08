from django.urls import include, path

urlpatterns = [
    path("camera/", include(("camera.routers", "api"), namespace="camera")),
    path("commands/", include(("api.commands.routers", "api"), namespace="commands")),
    path("crons/", include(("crons.routers", "api"), namespace="crons")),
    path("devices/", include(("devices.routers", "api"), namespace="devices")),
    path(
        "earthquakes/",
        include(("api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path("exchange/", include(("exchange.routers", "api"), namespace="exchange")),
    path("finance/", include(("finance.routers", "api"), namespace="finance")),
    path("groups/", include(("api.groups.routers", "api"), namespace="groups")),
    path("hooks/", include("api.hooks.urls")),
    path("lights/", include(("api.lights.routers", "api"), namespace="lights")),
    path("logs/", include(("api.logs.routers", "api"), namespace="logs")),
    path("meals/", include(("meals.routers", "api"), namespace="meals")),
    path("rpi/", include(("api.rpi.routers", "api"), namespace="rpi")),
    path("split/", include(("expenses.routers", "api"), namespace="expenses")),
    path("tasks/", include(("api.huey_tasks.routers", "api"), namespace="tasks")),
    path("telegram/", include(("bots.routers", "api"), namespace="telegram")),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
]
