from unittest.mock import MagicMock

from mainframe.bots.management.commands.run_quiz_bot_polling import Handler


def test_set_quiz_stores_quiz_synchronously():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    quiz = {"categories": ["history"]}

    result = handler.set_quiz(123, quiz)

    assert result is None
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)
