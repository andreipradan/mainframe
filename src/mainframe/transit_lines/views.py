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
    def handle_no_db(url, headers, entity, cache=None):
        resp, error = fetch(
            f"{url}/{entity}", logger=logger, soup=False, headers=headers
        )
        if error:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"error": str(error)}
            )
        if resp.status_code == status.HTTP_304_NOT_MODIFIED:
            if cache:
                cache.save()
            logger.info("[%s] No changes in external api", entity)
            return HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
        if resp.status_code == status.HTTP_200_OK:
            if not cache:
                return JsonResponse(
                    data={entity: resp.json(), f"{entity}_etag": resp.headers["ETag"]}
                )

            cache.etag = resp.headers.get("ETag")
            cache.data = resp.json()
            cache.save()
            data = {entity: cache.data or {}}
            if cache.etag != headers["If-None-Match"]:
                data[f"{entity}_etag"] = cache.etag
            return JsonResponse(data=data)
        elif cache:
            logger.error(
                "[%s] Unexpected status code: %s. Serving cached version from %s",
                entity,
                resp.status_code,
                cache.updated_at,
            )
        else:
            return HttpResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"error": str(resp.content)}
            )

    def list(self, request, *args, **kwargs):
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
            return self.handle_no_db(url, headers, entity)

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

        return self.handle_no_db(url, headers, entity, cache)
