from django.urls import path, include

urlpatterns = [
    path("hooks/", include("api.hooks.urls")),
    path("users/", include(("api.user.routers", "api"), namespace="users")),
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
]
