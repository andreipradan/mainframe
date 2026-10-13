from unittest import mock

import pytest

from mainframe.watchers.serializers import WatcherSerializer
from tests.factories.watchers import WatcherFactory


@mock.patch("mainframe.watchers.serializers.get_redis_client", return_value={})
@mock.patch("mainframe.watchers.models.schedule_task", return_value="{}")
@pytest.mark.django_db
class TestWatcherSerializer:
    def test_create(self, _, __):
        serializer = WatcherSerializer(
            data={
                "cron": "0 10 31 2 *",
                "name": "foo",
                "selector": ".foo-selector",
                "url": "https://example.com",
            }
        )
        assert serializer.is_valid(), serializer.errors

        instance = serializer.save()
        assert instance.chat_id is None
        assert instance.name == "foo"
        assert instance.selector == ".foo-selector"
        assert instance.url == "https://example.com"
        assert not hasattr(instance, "is_renamed")
        assert instance.cron == "0 10 31 2 *"
        assert instance.latest == {}
        assert instance.request == {}

    def test_renaming_preserves_cron_and_reschedules(
        self, schedule_task_mock, __, django_assert_num_queries
    ):
        instance = WatcherFactory(name="foo", cron="0 10 31 2 *")
        serializer = WatcherSerializer(
            instance=instance, data={"name": "renamed foo"}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

        with django_assert_num_queries(2):
            instance = serializer.save()
        assert instance.chat_id is None
        assert instance.name == "renamed foo"
        assert not hasattr(instance, "is_renamed")
        assert instance.cron == "0 10 31 2 *"
        instance.refresh_from_db()
        assert instance.cron == "0 10 31 2 *"
        assert schedule_task_mock.call_args_list == [
            mock.call(instance, previous_name="foo")
        ]

    def test_partial_update_without_name_keeps_cron(self, schedule_task_mock, __):
        instance = WatcherFactory(name="foo", cron="0 10 31 2 *")
        serializer = WatcherSerializer(
            instance=instance, data={"url": "https://example.com/new"}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

        updated = serializer.save()

        assert updated.cron == "0 10 31 2 *"
        assert not hasattr(updated, "is_renamed")
        schedule_task_mock.assert_not_called()
