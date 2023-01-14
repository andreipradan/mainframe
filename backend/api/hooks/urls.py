from django.urls import path

from api.hooks import github
from api.hooks.telegram.lights import lights


urlpatterns = [
    path("github/", github.mainframe),
    path("lights/", lights),
]
