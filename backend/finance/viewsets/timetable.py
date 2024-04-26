from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from finance.models import Timetable
from finance.serializers import TimetableSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Timetable.objects.select_related("credit")
    serializer_class = TimetableSerializer
