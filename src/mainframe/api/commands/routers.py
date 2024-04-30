from mainframe.api.commands import views
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", views.CommandsViewSet, basename="commands")
urlpatterns = router.urls
