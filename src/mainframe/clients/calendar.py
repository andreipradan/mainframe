import logging

import environ
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import BatchHttpRequest

logger = logging.getLogger(__name__)


class CalendarClient:
    def __init__(self):
        config = environ.Env()
        scopes = ["https://www.googleapis.com/auth/calendar"]
        service_account_file = config("GOOGLE_CALENDAR_SERVICE_ACCOUNT_FILE")
        creds = Credentials.from_service_account_file(
            service_account_file, scopes=scopes
        )

        self.calendar_id = config("GOOGLE_CALENDAR_ID")
        self.service = build("calendar", "v3", credentials=creds)

    def clear_all(self):
        batch = BatchHttpRequest(
            batch_uri="https://www.googleapis.com/batch/calendar/v3"
        )
        events = self.service.events().list(calendarId=self.calendar_id).execute()
        for event in events.get("items", []):
            batch.add(
                self.service.events().delete(
                    calendarId=self.calendar_id, eventId=event["id"]
                )
            )

        batch.execute()

    def create_events(self, events):
        def event_callback(request_id, response, exception):
            if exception:
                print(f"Request {request_id} failed: {exception}")
            else:
                print(f"Request {request_id} succeeded: {response['id']}")

        batch = BatchHttpRequest(
            callback=event_callback,
            batch_uri="https://www.googleapis.com/batch/calendar/v3",
        )
        for event in events:
            request = self.service.events().insert(
                calendarId=self.calendar_id, body=event, sendUpdates="none"
            )
            batch.add(request)

        batch.execute()
