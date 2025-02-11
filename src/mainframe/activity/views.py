from actstream.models import Action
from rest_framework.permissions import IsAdminUser
from rest_framework.viewsets import ReadOnlyModelViewSet

from mainframe.activity.serializers import ActionSerializer


class ActionViewSet(ReadOnlyModelViewSet):
    queryset = Action.objects.all().order_by("-timestamp").prefetch_related("actor")
    permission_classes = (IsAdminUser,)
    serializer_class = ActionSerializer
