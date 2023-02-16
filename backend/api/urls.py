from django.urls import path, include

urlpatterns = [
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
    path(
        "earthquakes/",
        include(("api.earthquakes.routers", "api"), namespace="earthquakes"),
    ),
    path("hooks/", include("api.hooks.urls")),
    path("lights/", include("api.lights.urls")),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
]
