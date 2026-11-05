from unittest import mock

from django.db.models.signals import post_delete

from mainframe.crons.models import Cron


def test_string_includes_command_and_expression():
    cron = Cron(command="sync", expression="0 10 * * *", kwargs={})

    assert str(cron) == "[sync]  0 10 * * *"


def test_string_includes_kwargs():
    cron = Cron(command="sync", expression="0 10 * * *", kwargs={"force": True})

    assert str(cron) == "[sync]  kwargs={'force': True} 0 10 * * *"


def test_run_invokes_management_command():
    cron = Cron(command="sync", expression="0 10 * * *", kwargs={"force": True})
    with mock.patch("mainframe.crons.models.call_command") as call_command:
        cron.run()

    call_command.assert_called_once_with("sync", force=True)


def test_delete_signal_clears_expression_and_reschedules():
    cron = Cron(command="sync", expression="0 10 * * *", kwargs={})
    with mock.patch("mainframe.crons.models.schedule_task") as schedule_task:
        post_delete.send(sender=Cron, instance=cron)

    assert cron.expression == ""
    schedule_task.assert_called_once_with(cron)
