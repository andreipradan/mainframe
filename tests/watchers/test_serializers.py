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
        assert not getattr(instance, "is_renamed", None)
        assert instance.cron == "0 10 31 2 *"
        assert instance.latest == {}
        assert instance.request == {}
        assert instance.top is True

    def test_renaming_clears_cron(self, schedule_task_mock, __):
        instance = WatcherFactory(name="foo", cron="0 10 31 2 *")
        serializer = WatcherSerializer(
            instance=instance, data={"name": "renamed foo"}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

        instance = serializer.save()
        assert instance.cron == ""
        assert instance.chat_id is None
        assert instance.name == "renamed foo"
        assert getattr(instance, "is_renamed", None) is True
        assert schedule_task_mock.call_args_list == [mock.call(instance)]
