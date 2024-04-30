from django.urls import path
from mainframe.api.hooks import github

urlpatterns = [
    path("github/", github.mainframe),
]
