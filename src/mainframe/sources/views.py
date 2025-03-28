from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.sources.models import Source
from mainframe.sources.serializers import SourceSerializer


class SourcesViewSet(viewsets.ModelViewSet):
    queryset = Source.objects.all()
    serializer_class = SourceSerializer
    permission_classes = (IsAuthenticated,)
