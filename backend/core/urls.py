from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

from api.urls import urlpatterns as api_urls


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urls)),
    path("", TemplateView.as_view(template_name="index.html")),
]
