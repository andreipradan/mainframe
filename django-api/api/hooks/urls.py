from django.urls import path

from api.hooks import github


urlpatterns = [
    path("github/", github.mainframe),
]
