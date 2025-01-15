from actstream.models import Action
from mainframe.activity.serializers import ActionSerializer
from rest_framework.permissions import IsAdminUser
from rest_framework.viewsets import ReadOnlyModelViewSet


class ActionViewSet(ReadOnlyModelViewSet):
    queryset = Action.objects.all().order_by("-timestamp")
    permission_classes = (IsAdminUser,)
    serializer_class = ActionSerializer
