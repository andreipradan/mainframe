import logging

from rest_framework import status, viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from mainframe.clients.finance.timetable import TimetableImportError, import_timetable
from mainframe.finance.models import Timetable
from mainframe.finance.serializers import TimetableSerializer


class TimetableViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Timetable.objects.select_related("credit").order_by(
        "-date", "-created_at"
    )
    serializer_class = TimetableSerializer

    def create(self, request, *args, **kwargs):
        file = request.FILES["file"]
        logger = logging.getLogger(__name__)
        try:
            timetable = import_timetable(file, logger)
        except TimetableImportError as e:
            logger.error("Could not process file: %s - error: %s", file, e)
            return Response(f"Invalid file: {file}", status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(instance=timetable)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )
