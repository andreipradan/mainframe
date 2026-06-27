from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.sources.models import Source
from mainframe.sources.serializers import SourceSerializer


class SourcesViewSet(viewsets.ModelViewSet):
    queryset = Source.objects.all()
    serializer_class = SourceSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get("type"):
            return queryset.filter(type=self.request.query_params.get("type"))
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["types"] = Source.TYPES
        return response
