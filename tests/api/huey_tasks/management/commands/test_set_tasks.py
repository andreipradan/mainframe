from unittest import mock

import pytest
from django.core.management import call_command
from mainframe.crons.models import Cron
from mainframe.watchers.models import Watcher

from tests.factories.crons import CronFactory
from tests.factories.watchers import WatcherFactory


@pytest.mark.django_db
class TestCommand:
    path = "mainframe.api.huey_tasks.management.commands.set_tasks"

    @mock.patch("mainframe.crons.models.schedule_task")
    @mock.patch(f"{path}.send_telegram_message")
    @mock.patch("logging.getLogger")
    @mock.patch("environ.Env")
    def test_nothing_set(self, _, logging_mock, send_mock, __):
        call_command("set_tasks")
        assert send_mock.call_args_list == [
            mock.call(text="[[huey]] up"),
        ]
        assert logging_mock.return_value.info.call_args_list == []

    @mock.patch(f"{path}.schedule_task")
    @mock.patch(f"{path}.send_telegram_message")
    @mock.patch("logging.getLogger")
    @mock.patch("environ.Env")
    def test_crons_and_watchers(self, _, logging_mock, send_mock, schedule_task_mock):
        cron, watcher = CronFactory(is_active=True), WatcherFactory()
        call_command("set_tasks")
        assert send_mock.call_args_list == [mock.call(text="[[huey]] up")]
        assert logging_mock.return_value.info.call_args_list == []
        assert len(calls := schedule_task_mock.call_args_list) == 2

        # cron
        assert len(args := calls[0].args) == 1
        assert isinstance((instance := args[0]), Cron)
        assert instance.command == cron.command
        assert instance.expression == "0 0 31 2 0"

        # watcher
        assert len(args := calls[1].args) == 1
        assert isinstance((instance := args[0]), Watcher)
        assert instance.name == watcher.name
        assert instance.cron == "0 0 31 2 0"
