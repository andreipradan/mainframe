from rest_framework import routers

from api.commands import views

router = routers.SimpleRouter()
router.register("", views.CommandsViewSet, basename="commands")
urlpatterns = router.urls
