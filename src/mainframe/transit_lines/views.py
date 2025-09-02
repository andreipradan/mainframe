import logging
from datetime import timedelta

import environ
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated

from mainframe.clients.scraper import fetch
from mainframe.transit_lines.models import TranzyResponse

logger = logging.getLogger(__name__)


class TransitViewSet(viewsets.GenericViewSet):
    permission_classes = (IsAuthenticated,)

    @staticmethod
    def handle_no_db(url, request_headers, entity, cache=None):
        resp, error = fetch(
            f"{url}/{entity}", logger=logger, soup=False, headers=request_headers
        )
        if error:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"error": str(error)}
            )
        if resp.status_code == status.HTTP_304_NOT_MODIFIED:
            if cache:
                cache.last_checked = timezone.now()
                cache.save(update_fields=["last_checked"])
            logger.info("[%s] No changes in external api", entity)
            return HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
        if resp.status_code == status.HTTP_200_OK:
            headers = {"ETag": resp.headers.get("ETag")}
            if not cache:
                return JsonResponse(data={entity: resp.json()}, headers=headers)

            cache.etag = resp.headers.get("ETag")
            cache.data = resp.json()
            cache.last_checked = timezone.now()
            cache.save()
            return JsonResponse(data={entity: cache.data or {}}, headers=headers)
        if cache:
            logger.error(
                "[%s] Unexpected status code: %s. Serving cached version from %s",
                entity,
                resp.status_code,
                cache.updated_at,
            )
            headers = {}
            if cache.etag:
                headers["ETag"] = cache.etag
            return JsonResponse(data={entity: cache.data}, headers=headers)
        return HttpResponse(
            status=status.HTTP_400_BAD_REQUEST, data={"error": str(resp.content)}
        )

    def list(self, request, *args, **kwargs):
        if not (entity := request.GET.get("entity")):
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"error": "entity query parameter required"},
            )
        allowed = {"vehicles", "routes", "shapes", "stops", "stop_times", "trips"}
        if entity not in allowed:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST,
                data={"error": f"unsupported entity '{entity}'"},
            )

        config = environ.Env()
        headers = {
            "X-API-KEY": config("TRANZY_API_KEY"),
            "X-AGENCY-ID": config("TRANZY_AGENCY_ID"),
        }
        url = config("TRANZY_API_URL", default=None)
        if not url:
            logger.error("TRANZY_API_URL not configured")
            return JsonResponse(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={"error": "server misconfiguration: missing TRANZY_API_URL"},
            )

        if etag := request.headers.get("if-none-match"):
            headers["If-None-Match"] = etag
        if entity == "vehicles":  # vehicles update often
            return self.handle_no_db(url, headers, entity)

        cache, _ = TranzyResponse.objects.get_or_create(endpoint=entity)
        if (
            etag
            and cache.etag
            and cache.etag == etag
            and cache.last_checked
            and cache.last_checked + timedelta(days=1) > timezone.now()
        ):
            logger.info(
                "[%s] Matching ETag and recently checked (%s)",
                entity,
                cache.last_checked,
            )
            return HttpResponse(status=304)

        return self.handle_no_db(url, headers, entity, cache)
