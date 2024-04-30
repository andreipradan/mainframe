from mainframe.api.huey_tasks import views
from rest_framework import routers

router = routers.SimpleRouter()
router.register("", views.TasksViewSet, basename="tasks")
urlpatterns = router.urls
