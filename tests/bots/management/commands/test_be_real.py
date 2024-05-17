from unittest import mock

import pytest
from django.core.management import call_command
from mainframe.crons.models import Cron


@pytest.mark.django_db
class TestCommand:
    @mock.patch("mainframe.crons.models.schedule_task")
    @mock.patch("mainframe.bots.management.commands.be_real.send_telegram_message")
    @mock.patch("mainframe.bots.management.commands.be_real.logging")
    @mock.patch("environ.Env")
    def test_be_real(self, _, __, send_mock, schedule_cron_mock):
        call_command("be_real")
        assert send_mock.call_args_list == [
            mock.call(chat_id=mock.ANY, text=mock.ANY, disable_notification=False),
        ]
        assert len(calls := schedule_cron_mock.call_args_list) == 1
        assert len(args := calls[0].args) == 1
        assert isinstance((cron := args[0]), Cron)
        assert cron.command == "be_real"
        assert cron.expression
