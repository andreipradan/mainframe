from unittest import mock

import pytest
from django.core.management import call_command

from tests.factories.source import SourceFactory


@pytest.mark.django_db
class TestFetchConcertsCommand:
    @mock.patch("mainframe.events.management.commands.fetch_concerts.get_band_concerts")
    def test_queues_only_active_band_sources(self, mock_get_band_concerts):
        active_band = SourceFactory.create(
            name="Active band",
            type="band",
            is_active=True,
        )
        SourceFactory.create(
            name="Inactive band",
            type="band",
            is_active=False,
        )
        SourceFactory.create(
            name="Regular source",
            type="regular",
            is_active=True,
        )

        call_command("fetch_concerts")

        assert mock_get_band_concerts.call_args_list == [
            mock.call(active_band),
        ]
