import json

import redis
from django.http import Http404, JsonResponse
from huey.signals import (
    SIGNAL_CANCELED,
    SIGNAL_COMPLETE,
    SIGNAL_ERROR,
    SIGNAL_EXPIRED,
    SIGNAL_INTERRUPTED,
    SIGNAL_LOCKED,
    SIGNAL_REVOKED,
)
from mainframe.clients.logs import get_default_logger
from mainframe.core.tasks import get_redis_client, log_status
from mainframe.finance.models import Category, Transaction
from mainframe.finance.tasks import predict, train
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

logger = get_default_logger(__name__)

FINAL_STATUSES = [
    SIGNAL_CANCELED,
    SIGNAL_COMPLETE,
    SIGNAL_ERROR,
    SIGNAL_EXPIRED,
    SIGNAL_INTERRUPTED,
    SIGNAL_LOCKED,
    SIGNAL_REVOKED,
]


class PredictionViewSet(viewsets.ViewSet):
    permission_classes = (IsAdminUser,)
    error = "Tasks backend unreachable"

    def list(self, request, *args, **kwargs):
        redis_client = get_redis_client()
        try:
            train_data = redis_client.get("tasks.train")
        except redis.exceptions.ConnectionError:
            logger.exception(self.error)
            return JsonResponse({"detail": self.error}, status=400)
        train_data = json.loads(train_data) if train_data else None
        predict_data = redis_client.get("tasks.predict")
        predict_data = json.loads(predict_data) if predict_data else None
        return JsonResponse({"train": train_data, "predict": predict_data})

    @action(methods=["put"], detail=False, url_path="start-prediction")
    def start_prediction(self, request, *args, **kwargs):
        redis_client = get_redis_client()
        try:
            redis_entry = redis_client.get("tasks.predict")
        except redis.exceptions.ConnectionError:
            logger.exception(self.error)
            return JsonResponse({"detail": self.error}, status=400)
        details = json.loads(redis_entry) if redis_entry else {}
        if (status := details.get("status")) and status not in FINAL_STATUSES:
            return JsonResponse({"detail": f"prediction - {status}"}, status=400)
        redis_client.delete("tasks.predict")

        queryset = Transaction.objects.expenses().filter(
            category=Category.UNIDENTIFIED,
            confirmed_by=Transaction.CONFIRMED_BY_UNCONFIRMED,
        )
        if descriptions := request.data:
            queryset = queryset.filter(description__in=descriptions)

        predict(queryset.values("description", "id"), logger)
        return JsonResponse(
            data={"type": "predict", **log_status("predict", status="initial")}
        )

    @action(methods=["put"], detail=False, url_path="start-training")
    def start_training(self, request, *args, **kwargs):
        redis_client = get_redis_client()
        try:
            redis_entry = redis_client.get("tasks.train")
        except redis.exceptions.ConnectionError:
            logger.exception(self.error)
            return JsonResponse({"detail": self.error}, status=400)

        details = json.loads(redis_entry) if redis_entry else {}
        if (status := details.get("status")) and status not in FINAL_STATUSES:
            return JsonResponse({"detail": f"training - {status}"}, status=400)
        redis_client.delete("tasks.train")

        try:
            train(logger)
        except redis.exceptions.ConnectionError as e:
            logger.exception(e)
            return JsonResponse({"detail": self.error}, status=400)
        return JsonResponse(
            data={"type": "train", **log_status("train", status="initial")}
        )

    @action(methods=["get"], detail=False, url_path="predict-status")
    def predict_status(self, request, *args, **kwargs):
        redis_client = get_redis_client()
        if not (task := redis_client.get("tasks.predict")):
            raise Http404
        return JsonResponse(data={"type": "predict", **json.loads(task)})

    @action(methods=["get"], detail=False, url_path="train-status")
    def train_status(self, request, *args, **kwargs):
        redis_client = get_redis_client()
        if not (task := redis_client.get("tasks.train")):
            raise Http404
        return JsonResponse(data={"type": "train", **json.loads(task)})
