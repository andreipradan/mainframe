from mainframe.finance.models import Timetable
from mainframe.finance.serializers import TimetableSerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser


class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Timetable.objects.select_related("credit")
    serializer_class = TimetableSerializer
