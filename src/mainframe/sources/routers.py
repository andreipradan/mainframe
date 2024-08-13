from mainframe.sources.views import SourcesViewSet
from rest_framework import routers

router = routers.SimpleRouter()

router.register("", SourcesViewSet, basename="sources")


urlpatterns = router.urls
