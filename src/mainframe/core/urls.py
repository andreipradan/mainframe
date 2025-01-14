from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from mainframe.api.urls import urlpatterns

urlpatterns = [
    path("activity/", include("actstream.urls")),
    path("admin/", admin.site.urls),
    path("", include(urlpatterns)),
]
if settings.ENV == "local":
    urlpatterns += [path("__debug__/", include("debug_toolbar.urls"))]
