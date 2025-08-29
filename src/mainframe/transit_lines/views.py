import logging
from datetime import datetime, timedelta

import environ
import pytz
from django.http import HttpResponse, JsonResponse
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.clients.scraper import fetch
from mainframe.transit_lines.models import TranzyResponse

logger = logging.getLogger(__name__)


class TransitViewSet(viewsets.GenericViewSet):
    permission_classes = (IsAuthenticated,)

    @staticmethod
    def list(request, *args, **kwargs):  # noqa: PLR0911, C901
        if not (entity := request.GET.get("entity")):
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"error": "entity header required"},
            )

        config = environ.Env()
        headers = {
            "X-API-KEY": config("TRANZY_API_KEY"),
            "X-AGENCY-ID": config("TRANZY_AGENCY_ID"),
        }
        url = config("TRANZY_API_URL", default=None)

        if etag := request.headers.get("if-none-match"):
            headers["If-None-Match"] = etag

        if entity == "vehicles":  # vehicles update often
            resp, error = fetch(
                f"{url}/{entity}", logger=logger, soup=False, headers=headers
            )
            if error:
                return JsonResponse(
                    status=status.HTTP_400_BAD_REQUEST, data={"error": str(error)}
                )
            if resp.status_code == status.HTTP_200_OK:
                return JsonResponse(
                    data={entity: resp.json(), f"{entity}_etag": resp.headers["ETag"]}
                )
            if resp.status_code == status.HTTP_304_NOT_MODIFIED:
                return HttpResponse(status=status.HTTP_304_NOT_MODIFIED)

        now = datetime.now(pytz.timezone("UTC"))
        cache, _ = TranzyResponse.objects.get_or_create(endpoint=entity)
        if (
            etag
            and cache.etag
            and cache.etag == etag
            and cache.updated_at + timedelta(days=1) > now
        ):
            logger.info(
                "[%s] Matching ETag and recent updates (%s)",
                entity,
                cache.updated_at,
            )
            return HttpResponse(status=304)

        resp, error = fetch(
            f"{url}/{entity}", logger=logger, soup=False, headers=headers
        )
        if error:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"error": str(error)}
            )

        if resp.status_code == status.HTTP_304_NOT_MODIFIED:
            cache.save()
            logger.info("[%s] No changes in external api", entity)
            return HttpResponse(status=status.HTTP_304_NOT_MODIFIED)

        if resp.status_code == status.HTTP_200_OK:
            cache.etag = resp.headers.get("ETag")
            cache.data = resp.json()
            cache.save()
        else:
            logger.error(
                "[%s] Unexpected status code: %s. Serving cached version from %s",
                entity,
                resp.status_code,
                cache.updated_at,
            )

        data = {entity: cache.data or {}}
        if cache.etag != etag:
            data[f"{entity}_etag"] = cache.etag
        return JsonResponse(data=data)
