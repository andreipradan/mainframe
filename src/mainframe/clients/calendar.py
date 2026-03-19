import asyncio
import logging
from datetime import datetime, timedelta, timezone

import environ
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import BatchHttpRequest
from rest_framework import status

from mainframe.clients.chat import send_telegram_message
from mainframe.clients.storage import RedisClient

TYPE_ACCIDENTAL = "Accidental"
TYPE_PLANNED_15_DAYS = "Planned (15 days)"
TYPE_PLANNED_TODAY = "Planned (today)"


class CalendarClient:
    url = "https://www.googleapis.com/batch/calendar/v3"

    def __init__(self, logger=None, prefix=None):
        config = environ.Env()
        creds = Credentials.from_service_account_file(
            config("GOOGLE_CALENDAR_SERVICE_ACCOUNT_FILE"),
            scopes=["https://www.googleapis.com/auth/calendar"],
        )
        self.calendar_id = config("GOOGLE_CALENDAR_ID")
        self.events = {}
        self.logger = logger or logging.getLogger(__name__)
        self.prefix = f"{prefix or ''}[Calendar]"
        self.redis = RedisClient(self.logger)
        self.service = build("calendar", "v3", credentials=creds)

    # used manually to create calendar and set permissions for service account email
    def _setup(self, owner_email, summary, time_zone):
        calendar_payload = {"summary": summary, "timeZone": time_zone}
        response = self.service.calendars().insert(body=calendar_payload).execute()

        acl_payload = {
            "role": "owner",
            "scope": {"type": "user", "value": owner_email},
        }
        self.service.acl().insert(calendarId=response["id"], body=acl_payload).execute()

    def clear_events(self, event_type, **filters):
        date_time_format = "%Y-%m-%dT%H:%M:%S%z"
        now_utc = datetime.now(timezone.utc)
        interval = {"timeMin": now_utc.strftime(date_time_format)}
        if event_type == TYPE_PLANNED_15_DAYS:
            interval["timeMax"] = (now_utc + timedelta(days=15)).strftime(
                date_time_format
            )
        elif event_type == TYPE_PLANNED_TODAY:
            interval["timeMax"] = (now_utc + timedelta(days=1)).strftime(
                date_time_format
            )

        events = (
            self.service.events()
            .list(
                calendarId=self.calendar_id,
                singleEvents=True,
                orderBy="startTime",
                privateExtendedProperty=[
                    f"type={event_type}",
                    *[f"{k}={v}" for k, v in filters.items() if v],
                ],
                **interval,
            )
            .execute()
            .get("items")
        )
        if not events:
            return

        batch = BatchHttpRequest(batch_uri=self.url)
        for event in events:
            batch.add(
                self.service.events().delete(
                    calendarId=self.calendar_id, eventId=event["id"]
                )
            )

        batch.execute()
        self.logger.info("%s[delete] %d existing event(s)", self.prefix, len(events))

    def create_events(self, events):
        self.events = {event.id: event for event in events}

        batch = BatchHttpRequest(callback=self.event_callback, batch_uri=self.url)
        for event in events:
            request = self.service.events().insert(
                calendarId=self.calendar_id,
                body=event.to_calendar_event(),
                sendUpdates="none",
            )
            batch.add(request, request_id=event.id)
        batch.execute()

    def event_callback(self, request_id, response, exception):
        if exception:
            if (
                hasattr(exception, "resp")
                and exception.resp.status == status.HTTP_409_CONFLICT
            ):
                self.update(request_id)
            else:
                self.logger.error(
                    "%s[create][%s] Request failed: %s",
                    self.prefix,
                    request_id,
                    exception,
                )
        else:
            event = self.events[request_id]
            self.handle_notification(response, event)
            prefix = f"[{event.location}][{event.start}]"
            self.logger.info("%s[create]%s Created", self.prefix, prefix)

    def handle_notification(self, response, event, is_update=False):
        self.redis.set(f"calendar:{event.id}", response["etag"])
        locations = "\n".join(event.addresses)
        asyncio.run(
            send_telegram_message(
                f"*{'Updated ' if is_update else ''}{event.type} outage*\n"
                f"Start: {response['start']['dateTime']}\n"
                f"End: {response['end']['dateTime']}\n"
                f"Duration: {event.duration}\n\n"
                f"Locations:\n{locations}\n\n"
                f"[details here]({response['htmlLink']}).",
            )
        )

    def update(self, event_id):
        event = self.events[event_id]
        prefix = f"{self.prefix}[update][{event.location}][{event.start}]"
        try:
            response = (
                self.service.events()
                .update(
                    calendarId=self.calendar_id,
                    eventId=event_id,
                    body=event.to_calendar_event(),
                )
                .execute()
            )
            etag = self.redis.get(f"calendar:{event_id}")
            if response["etag"] != etag:
                self.handle_notification(response, event, is_update=True)
                self.logger.info("event '%s' updated.", event.location)
        except HttpError as e:
            if e.resp.status == status.HTTP_404_NOT_FOUND:
                self.logger.error(
                    "%s[update][%s] Couldn't update - not found, recreating...",
                    self.prefix,
                    event_id,
                )
                try:
                    self.service.events().insert(
                        calendarId=self.calendar_id, body=event, sendUpdates="none"
                    ).execute()
                except HttpError as err:
                    self.logger.error(
                        "%s[update] Failed to recreate '%s': %s",
                        self.prefix,
                        event,
                        err,
                    )
                else:
                    self.logger.info("%s Recreated", prefix)
            else:
                self.logger.error(
                    "%s[update][%s] Failed to update: %s",
                    self.prefix,
                    self.events[event_id],
                    e,
                )
        else:
            self.logger.info("%s Updated", prefix)
