import logging
from datetime import datetime, timedelta

import environ
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import BatchHttpRequest
from rest_framework import status

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
        self.service = build("calendar", "v3", credentials=creds)

    def _setup(self, owner_email, summary, time_zone):
        calendar_payload = {"summary": summary, "timeZone": time_zone}
        response = self.service.calendars().insert(body=calendar_payload).execute()

        acl_payload = {
            "role": "owner",
            "scope": {"type": "user", "value": owner_email},
        }
        self.service.acl().insert(calendarId=response["id"], body=acl_payload).execute()

    def clear_events(self, event_type, **filters):
        interval = {"timeMin": datetime.utcnow().isoformat() + "Z"}
        if event_type == TYPE_PLANNED_15_DAYS:
            interval["timeMax"] = (
                datetime.utcnow() + timedelta(days=15)
            ).isoformat() + "Z"
        elif event_type == TYPE_PLANNED_TODAY:
            interval["timeMax"] = (
                datetime.utcnow() + timedelta(days=1)
            ).isoformat() + "Z"

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
        self.events = {event["id"]: event for event in events}

        batch = BatchHttpRequest(callback=self.event_callback, batch_uri=self.url)
        for event in events:
            request = self.service.events().insert(
                calendarId=self.calendar_id, body=event, sendUpdates="none"
            )
            batch.add(request, request_id=event["id"])
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
            self.logger.info(
                "%s[create] Request '%s': '%s'",
                self.prefix,
                request_id,
                response["status"],
            )

    def update(self, event_id):
        event = self.events[event_id]
        try:
            self.service.events().update(
                calendarId=self.calendar_id, eventId=event_id, body=event
            ).execute()
        except HttpError as e:
            if e.resp.status == status.HTTP_404_NOT_FOUND:
                self.logger.error(
                    "%s[update][%s] Event not found, creating...",
                    self.prefix,
                    event_id,
                )
                try:
                    self.service.events().insert(
                        calendarId=self.calendar_id, body=event, sendUpdates="none"
                    ).execute()
                except HttpError as e:
                    self.logger.error(
                        "%s[update] Failed to create event '%s': %s",
                        self.prefix,
                        event,
                        e,
                    )
                else:
                    self.logger.info(
                        "%s[update][%s] Created.", self.prefix, event["id"]
                    )
            else:
                self.logger.error(
                    "%s[update][%s] Failed to update: %s",
                    self.prefix,
                    self.events[event_id],
                    e,
                )
        else:
            self.logger.info("%s[update][%s] Done.", self.prefix, event_id)
