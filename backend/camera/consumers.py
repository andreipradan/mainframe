import io
import json
import logging
import time

import picamera
from channels.generic.websocket import AsyncWebsocketConsumer
from PIL import Image

logger = logging.getLogger(__name__)


class CameraConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = "camera"
        self.room_group_name = "chat_%s" % self.room_name
        self.stream_running = True
        logger.info("stream running set to false")

        if not self.scope["user"].is_authenticated:
            logger.warning("Unauthenticated, closing connection")
            return await self.close()
        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        self.stream_running = False
        logger.info("stream running set to false")

    async def receive(self, text_data=None, bytes_data=None):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat_message", "message": message}
        )

    def video_stream(self, event):
        self.send(text_data=event["text"])

    def send_video_stream(self):
        with picamera.PiCamera() as camera:
            camera.resolution = (640, 480)
            camera.framerate = 30

            # Allow time for the camera to warm up
            time.sleep(2)

            while self.stream_running:
                stream = io.BytesIO()
                camera.capture(stream, format="jpeg", use_video_port=True)
                stream.seek(0)
                image = Image.open(stream)

                # Convert the JPEG image to a byte array and send it to the WebSocket clients
                buffer = io.BytesIO()
                image.save(buffer, format="jpeg")
                self.video_stream({"text": buffer.getvalue()})

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"message": event["message"]}))
