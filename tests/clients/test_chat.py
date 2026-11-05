from unittest import mock

import pytest
import telegram

from mainframe.clients import chat as chat_mod


def make_bot(*, return_value=None, side_effect=None):
    bot = mock.MagicMock()
    bot.__aenter__ = mock.AsyncMock(return_value=bot)
    bot.__aexit__ = mock.AsyncMock(return_value=None)
    bot.send_message = mock.AsyncMock(
        return_value=return_value, side_effect=side_effect
    )
    return bot


@pytest.mark.django_db
class TestSendTelegramMessage:
    @mock.patch("mainframe.clients.chat.logger")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_missing_env(self, mock_dotenv, logger_mock):
        mock_dotenv.return_value = {}
        res = chat_mod.send_telegram_message("hi")
        assert res is None
        assert logger_mock.error.call_args_list == [
            mock.call("TELEGRAM_CHAT_ID not set on env"),
        ]

    @mock.patch("mainframe.clients.chat.logger")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_missing_token(self, mock_dotenv, logger_mock):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1"}

        assert chat_mod.send_telegram_message("hi") is None
        logger_mock.error.assert_called_once_with("TELEGRAM_TOKEN not set on env")

    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_success(self, mock_dotenv, mock_bot_class):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}

        mock_bot_instance = make_bot(return_value={"text": "hello", "kwargs": {}})
        mock_bot_class.return_value = mock_bot_instance

        res = chat_mod.send_telegram_message("hello")
        assert isinstance(res, dict)
        assert res["text"] == "hello"
        mock_bot_instance.send_message.assert_awaited_once()
        mock_bot_instance.__aenter__.assert_awaited_once()
        mock_bot_instance.__aexit__.assert_awaited_once()

    @mock.patch("mainframe.clients.chat.asyncio.sleep", new_callable=mock.AsyncMock)
    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_network_retry(self, mock_dotenv, mock_bot_class, _):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}

        mock_bot_instance = make_bot(
            side_effect=[
                telegram.error.NetworkError(
                    "[Errno -3] Temporary failure in name resolution"
                ),
                {"ok": True},
            ]
        )
        mock_bot_class.return_value = mock_bot_instance

        res = chat_mod.send_telegram_message("retry test")
        assert res == {"ok": True}

    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_handles_badrequest_parse_error(
        self, mock_dotenv, mock_bot_class
    ):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}

        err = telegram.error.BadRequest("can't find end of the entity 2")
        err.message = "can't find end of the entity 2"
        mock_bot_instance = make_bot(side_effect=[err, {"ok": True}])
        mock_bot_class.return_value = mock_bot_instance

        # Should not raise and should return success after retry
        res = chat_mod.send_telegram_message("01234")
        assert res == {"ok": True}

    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_raises_unexpected_network_error(
        self, mock_dotenv, mock_bot_class
    ):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}
        mock_bot_class.return_value = make_bot(
            side_effect=telegram.error.NetworkError("connection reset")
        )

        with pytest.raises(telegram.error.NetworkError, match="connection reset"):
            chat_mod.send_telegram_message("hello")

    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_retries_without_formatting(
        self, mock_dotenv, mock_bot_class
    ):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}
        bot = make_bot(
            side_effect=[telegram.error.BadRequest("invalid formatting"), "ok"]
        )
        mock_bot_class.return_value = bot

        assert chat_mod.send_telegram_message("hello") == "ok"
        assert bot.send_message.await_args_list[-1] == mock.call(
            text="hello",
            chat_id="1",
            disable_notification=True,
            disable_web_page_preview=True,
            parse_mode=None,
        )

    @mock.patch("mainframe.clients.chat.logger")
    @mock.patch("mainframe.clients.chat.telegram.Bot")
    @mock.patch("mainframe.clients.chat.dotenv.dotenv_values")
    def test_send_telegram_message_returns_none_if_unformatted_send_fails(
        self, mock_dotenv, mock_bot_class, logger_mock
    ):
        mock_dotenv.return_value = {"TELEGRAM_CHAT_ID": "1", "TELEGRAM_TOKEN": "t"}
        bot = make_bot(
            side_effect=[
                telegram.error.BadRequest("invalid formatting"),
                telegram.error.BadRequest("still invalid"),
            ]
        )
        mock_bot_class.return_value = bot

        assert chat_mod.send_telegram_message("hello") is None
        logger_mock.exception.assert_called_once()


class TestEditMessage:
    @pytest.mark.asyncio
    async def test_edit_message_returns_bot_result(self):
        bot = mock.MagicMock()
        bot.edit_message_text = mock.AsyncMock(return_value="updated")

        result = await chat_mod.edit_message(bot, 1, 2, "hello")

        assert result == "updated"
        bot.edit_message_text.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_edit_message_returns_bad_request_message(self):
        bot = mock.MagicMock()
        bot.edit_message_text = mock.AsyncMock(
            side_effect=telegram.error.BadRequest("message not found")
        )

        result = await chat_mod.edit_message(bot, 1, 2, "hello")

        assert result == "message not found"
