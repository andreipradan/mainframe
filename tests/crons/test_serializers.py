from unittest import mock

import pytest

from mainframe.crons.serializers import CronSerializer
from tests.factories.crons import CronFactory


@mock.patch("mainframe.crons.serializers.get_redis_client", return_value={})
@mock.patch("mainframe.crons.models.schedule_task", return_value="{}")
@pytest.mark.django_db
class TestCronSerializer:
    def test_create(self, _, __):
        serializer = CronSerializer(
            data={"expression": "0 10 31 2 *", "name": "foo", "command": "cmd"}
        )
        assert serializer.is_valid(), serializer.errors

        instance = serializer.save()
        assert instance.name == "foo"
        assert instance.command == "cmd"
        assert not hasattr(instance, "is_renamed")
        assert instance.expression == "0 10 31 2 *"
        assert instance.is_active is False

    def test_renaming_reschedules_under_new_name(
        self, schedule_task_mock, __, django_assert_num_queries
    ):
        instance = CronFactory(name="foo", expression="0 10 31 2 *")
        serializer = CronSerializer(
            instance=instance, data={"name": "renamed foo"}, partial=True
        )
        assert serializer.is_valid(), serializer.errors

        with django_assert_num_queries(2):
            instance = serializer.save()
        assert instance.expression == "0 10 31 2 *"
        assert instance.name == "renamed foo"
        assert not hasattr(instance, "is_renamed")
        instance.refresh_from_db()
        assert instance.expression == "0 10 31 2 *"
        assert schedule_task_mock.call_args_list == [
            mock.call(instance, previous_name="foo")
        ]
