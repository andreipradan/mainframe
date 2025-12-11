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

logger = logging.getLogger(__name__)


class CalendarClient:
    url = "https://www.googleapis.com/batch/calendar/v3"

    def __init__(self):
        config = environ.Env()
        creds = Credentials.from_service_account_file(
            config("GOOGLE_CALENDAR_SERVICE_ACCOUNT_FILE"),
            scopes=["https://www.googleapis.com/auth/calendar"],
        )

        self.calendar_id = config("GOOGLE_CALENDAR_ID")
        self.service = build("calendar", "v3", credentials=creds)
        self.events = {}

    def clear_events(self, event_type):
        interval = {}
        if event_type != TYPE_ACCIDENTAL:
            interval["timeMin"] = datetime.utcnow().isoformat() + "Z"
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
                privateExtendedProperty=f"type={event_type}",
                **interval,
            )
            .execute()
        )
        if not events.get("items"):
            logger.info("No existing '%s' events to delete", event_type)
            return

        batch = BatchHttpRequest(batch_uri=self.url)
        for event in events.get("items", []):
            batch.add(
                self.service.events().delete(
                    calendarId=self.calendar_id, eventId=event["id"]
                )
            )

        batch.execute()
        logger.info(
            "Deleted '%d' '%s' existing events",
            len(events.get("items", [])),
            event_type,
        )

    def create_events(self, events):
        self.events = {event["id"]: event for event in events}

        batch = BatchHttpRequest(callback=self.event_callback, batch_uri=self.url)
        for event in events:
            request = self.service.events().insert(
                calendarId=self.calendar_id, body=event, sendUpdates="none"
            )
            batch.add(request, request_id=event["id"])
        batch.execute()
        logger.info("Processed '%d' events", len(events))

    def event_callback(self, request_id, response, exception):
        if exception:
            if (
                hasattr(exception, "resp")
                and exception.resp.status == status.HTTP_409_CONFLICT
            ):
                logger.info(
                    "Event with ID '%s' already exists, updating",
                    request_id,
                )
                self.update(request_id)
            else:
                logger.error("Request '%s' failed: %s", request_id, exception)
        else:
            logger.info("Request '%s' succeeded: %s", request_id, response["status"])

    def update(self, event_id):
        event = self.events[event_id]
        try:
            self.service.events().update(
                calendarId=self.calendar_id, eventId=event_id, body=event
            ).execute()
        except HttpError as e:
            if e.resp.status == status.HTTP_404_NOT_FOUND:
                logger.error("Event with ID '%s' not found for update", event_id)
                try:
                    self.service.events().insert(
                        calendarId=self.calendar_id, body=event, sendUpdates="none"
                    ).execute()
                except HttpError as e:
                    logger.error("Failed to create event '%s': %s", event, e)
                else:
                    logger.info("Created event '%s'", event["id"])
            else:
                logger.error(
                    "Failed to update event '%s': %s", self.events[event_id], e
                )
        else:
            logger.info("Updated existing event '%s'", event_id)
