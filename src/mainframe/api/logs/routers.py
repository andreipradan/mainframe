from rest_framework import routers

from mainframe.api.logs import views

router = routers.SimpleRouter()
router.register("", views.LogsViewSet, basename="logs")
urlpatterns = router.urls
