from unittest import mock

from mainframe.core import tasks


def test_schedule_deploy_uses_noreq_for_regular_pull():
    with (
        mock.patch(
            "mainframe.core.tasks.run_cmd",
            return_value="Updating abc..def\n  src/mainframe/api/hooks/github.py",
        ),
        mock.patch("mainframe.clients.cron.delay") as cron_delay,
    ):
        result = tasks.schedule_deploy.call_local()

    assert result == "[Deploy] Starting local setup (+ Restart backend)"
    cron_command = cron_delay.call_args.args[0]
    assert "$HOME/projects/mainframe/deploy/setup.sh noreq restart" not in cron_command
    assert "$HOME/projects/mainframe/deploy/setup.sh noreq" in cron_command
