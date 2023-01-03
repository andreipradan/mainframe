from django.urls import path, include

urlpatterns = [
    path("users/", include(("api.user.routers", "api"), namespace="users")),
    path("bots/", include(("api.bots.routers", "api"), namespace="bots")),
]
