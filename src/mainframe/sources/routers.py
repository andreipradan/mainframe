from rest_framework import routers

from mainframe.sources.views import SourcesViewSet

router = routers.SimpleRouter()

router.register("", SourcesViewSet, basename="sources")


urlpatterns = router.urls
