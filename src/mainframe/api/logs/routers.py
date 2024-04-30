from mainframe.api.logs import views
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", views.LogsViewSet, basename="logs")
urlpatterns = router.urls
