from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

from api.urls import urlpatterns as api_urls

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_urls)),
    re_path(r".*", TemplateView.as_view(template_name="index.html")),
]
if settings.ENV == "local":
    urlpatterns += [path("__debug__/", include("debug_toolbar.urls"))]
