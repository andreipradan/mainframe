from rest_framework import routers

from mainframe.api.huey_tasks import views

router = routers.SimpleRouter()
router.register("", views.TasksViewSet, basename="tasks")
urlpatterns = router.urls
