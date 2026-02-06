from unittest import mock

import pytest
import telegram

from mainframe.clients import chat as chat_mod


@pytest.mark.django_db
class TestSendTelegramMessage:
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_missing_env(self, mock_dotenv, caplog):
        mock_dotenv.return_value = {}
        res = chat_mod.send_telegram_message("hi")
        assert res is None
        assert "TELEGRAM_CHAT_ID not set" in caplog.text

    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_success(self, mock_dotenv, mock_bot_class):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}

        mock_bot_instance = mock.MagicMock()
        mock_bot_instance.send_message.return_value = {"text": "hello", "kwargs": {}}
        mock_bot_class.return_value = mock_bot_instance

        res = chat_mod.send_telegram_message("hello")
        assert isinstance(res, dict)
        assert res["text"] == "hello"

    @mock.patch("mainframe.clients.chat.time.sleep")
    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_network_retry(
        self, mock_dotenv, mock_bot_class, mock_sleep
    ):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}

        mock_bot_instance = mock.MagicMock()
        mock_bot_instance.send_message.side_effect = [
            telegram.error.NetworkError(
                "[Errno -3] Temporary failure in name resolution"
            ),
            {"ok": True},
        ]
        mock_bot_class.return_value = mock_bot_instance

        res = chat_mod.send_telegram_message("retry test")
        assert res == {"ok": True}

    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_handles_badrequest_parse_error(
        self, mock_dotenv, mock_bot_class
    ):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}

        mock_bot_instance = mock.MagicMock()
        err = telegram.error.BadRequest("can't find end of the entity 2")
        err.message = "can't find end of the entity 2"
        mock_bot_instance.send_message.side_effect = [err, {"ok": True}]
        mock_bot_class.return_value = mock_bot_instance

        # Should not raise and should return success after retry
        res = chat_mod.send_telegram_message("01234")
        assert res == {"ok": True}
