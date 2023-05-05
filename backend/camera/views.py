import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from camera.consumers import CameraConsumer

logger = logging.getLogger(__name__)


class CameraViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    @action(detail=False, methods=["post"])
    def streaming(self, request):
        consumer = CameraConsumer()
        consumer.scope = {'type': 'websocket'}
        action_type = request.data.get("action")
        if action_type == "start":
            consumer.send_video_stream()
            logger.info("send_video_stream")
        elif action_type == "stop":
            consumer.disconnect(1000)
            logger.info("disconnect")
        else:
            msg = f"Invalid action: {action_type}"
            logger.info(msg)
            return Response(status=400, data=msg)
        return Response(status=status.HTTP_201_CREATED)
