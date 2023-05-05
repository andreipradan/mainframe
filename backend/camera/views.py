from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated


class CameraViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    @action(detail=False, methods=['post'])
    def start_streaming(self, request):
        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)