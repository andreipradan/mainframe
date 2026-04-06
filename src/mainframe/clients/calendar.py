import asyncio
from datetime import datetime, timedelta, timezone

import environ
import structlog
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

    def __init__(self, logger=None, source=None):
        config = environ.Env()
        creds = Credentials.from_service_account_file(
            config("GOOGLE_CALENDAR_SERVICE_ACCOUNT_FILE"),
            scopes=["https://www.googleapis.com/auth/calendar"],
        )
        self.calendar_id = config("GOOGLE_CALENDAR_ID")
        self.events = {}
        self.logger = logger or structlog.get_logger(__name__)
        self.logger.bind(calendar_id=self.calendar_id, source=source)
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
        self.logger.info("Deleted existing events", count=len(events))

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
                    "Calendar event creation failed",
                    request_id=request_id,
                    exception=str(exception),
                )
        else:
            event = self.events[request_id]
            self.handle_notification(response, event)
            self.logger.info(
                "Event created", location=event.location, start=event.start
            )

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
                self.logger.info(
                    "Event updated", event_id=event_id, location=event.location
                )
        except HttpError as e:
            if e.resp.status == status.HTTP_404_NOT_FOUND:
                self.logger.error(
                    "Couldn't update - not found, recreating...",
                    event_id=event_id,
                )
                try:
                    self.service.events().insert(
                        calendarId=self.calendar_id, body=event, sendUpdates="none"
                    ).execute()
                except HttpError as err:
                    self.logger.error(
                        "Failed to recreate event after not found error",
                        event=event,
                        err=str(err),
                    )
                else:
                    self.logger.info(
                        "Event recreated", location=event.location, start=event.start
                    )
            else:
                self.logger.error(
                    "Failed to update event",
                    event=self.events[event_id],
                    error=str(e),
                )
        else:
            self.logger.info(
                "Event updated", location=event.location, start=event.start
            )
