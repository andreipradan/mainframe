from django.urls import path

from api.hooks import github
from api.hooks.lights.main import lights


urlpatterns = [
    path("github/", github.mainframe),
    path("lights/", lights),
]
