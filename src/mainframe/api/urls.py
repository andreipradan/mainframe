from django.urls import include, path

urlpatterns = [
    path(
        "commands/",
        include(("mainframe.api.commands.routers", "api"), namespace="commands"),
    ),
    path("crons/", include(("mainframe.crons.routers", "api"), namespace="crons")),
    path(
        "devices/", include(("mainframe.devices.routers", "api"), namespace="devices")
    ),
    path(
        "earthquakes/",
        include(("mainframe.api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path(
        "exchange/",
        include(("mainframe.exchange.routers", "api"), namespace="exchange"),
    ),
    path(
        "finance/", include(("mainframe.finance.routers", "api"), namespace="finance")
    ),
    path(
        "groups/", include(("mainframe.api.groups.routers", "api"), namespace="groups")
    ),
    path("hooks/", include("mainframe.api.hooks.urls")),
    path(
        "lights/", include(("mainframe.api.lights.routers", "api"), namespace="lights")
    ),
    path("logs/", include(("mainframe.api.logs.routers", "api"), namespace="logs")),
    path("meals/", include(("mainframe.meals.routers", "api"), namespace="meals")),
    path("rpi/", include(("mainframe.api.rpi.routers", "api"), namespace="rpi")),
    path(
        "sources/",
        include(("mainframe.sources.routers", "api"), namespace="sources"),
    ),
    path(
        "split/", include(("mainframe.expenses.routers", "api"), namespace="expenses")
    ),
    path(
        "tasks/",
        include(("mainframe.api.huey_tasks.routers", "api"), namespace="tasks"),
    ),
    path("telegram/", include(("mainframe.bots.routers", "api"), namespace="telegram")),
    path("users/", include(("mainframe.api.user.routers", "api"), namespace="users")),
    path(
        "watchers/", include(("mainframe.watchers.routers", "api"), namespace="watcher")
    ),
]
