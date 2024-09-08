from unittest import mock
from unittest.mock import MagicMock

import pytest
from django.core.management import CommandError
from mainframe.bots.management.commands.run_bot_polling import (
    handle_chat_id,
    handle_dex,
    handle_earthquake,
    handle_left_chat_member,
    handle_new_chat_members,
    handle_new_chat_title,
    handle_next,
    handle_randomize,
    handle_save,
    is_whitelisted,
)
from mainframe.bots.models import Bot
from mainframe.clients.dexonline import DexOnlineError
from telegram import ParseMode

from tests.factories.bots import BotFactory
from tests.factories.earthquakes import EarthquakeFactory

DEFAULT_REPLY_KWARGS = {
    "disable_notification": True,
    "disable_web_page_preview": True,
    "parse_mode": "Markdown",
}


def prepare_update(update, **kwargs):
    kwargs = {
        "new_chat_title": None,
        "new_chat_members": None,
        "left_chat_member": None,
        "from_user": MagicMock(username="foo_username"),
        "document": None,
        "text": None,
        **kwargs,
    }
    update = update()
    update.message = MagicMock(**kwargs)
    return update


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestStatusUpdate:
    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    def test_new_chat_title_without_who_s_next(self, save_to_db, update, logger, _):
        update = prepare_update(update, new_chat_title=1)
        assert not handle_new_chat_title(update, mock.ANY, mock.MagicMock())
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.effective_chat.id,
                update.effective_chat.title,
            ),
        ]
        assert not save_to_db.called

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    def test_new_chat_title_without_chat_id(self, save_to_db, update, logger, _):
        bot = BotFactory(additional_data={"whos_next": {}})
        handle_new_chat_title(update, mock.ANY, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.effective_chat.id,
                update.effective_chat.title,
            ),
        ]
        assert not save_to_db.called

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    def test_new_chat_title_with_unexpected_chat_id(
        self, save_to_db, update, logger, _
    ):
        bot = BotFactory(additional_data={"whos_next": {"chat_id": 1}})
        assert not handle_new_chat_title(update, mock.ANY, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.effective_chat.id,
                update.effective_chat.title,
            ),
        ]
        assert not save_to_db.called

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    def test_new_chat_title(self, save_to_db, update, logger, _):
        update = prepare_update(update, new_chat_title=1)
        update.effective_chat.id = 1
        bot = BotFactory(additional_data={"whos_next": {"chat_id": 1}})
        context = mock.MagicMock()
        handle_new_chat_title(update, context, bot)

        assert logger.info.call_args_list == []
        assert save_to_db.call_args_list == [
            mock.call(
                update.message, chat=context.bot.get_chat(update.message.chat_id)
            ),
        ]
        assert bot.additional_data["whos_next"]["posted"] is True
        assert bot.additional_data["whos_next"]["initial"] is False
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved ✔", **DEFAULT_REPLY_KWARGS)
        ]

    def test_new_chat_members(self, update, logger, _):
        update = prepare_update(
            update,
            new_chat_members=[MagicMock(full_name="Foo"), MagicMock(full_name="Bar")],
        )
        handle_new_chat_members(update, mock.ANY, BotFactory())

        assert logger.info.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Welcome Foo, Bar!", **DEFAULT_REPLY_KWARGS)
        ]

    def test_left_chat_member(self, update, logger, _):
        update = prepare_update(update, left_chat_member=MagicMock(full_name="Foo"))
        handle_left_chat_member(update)
        assert logger.info.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Bye Foo! 😢", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch.object(Bot, "objects")
    def test_ignoring_non_whitelisted_users(self, objects, update, logger, _):
        objects.get.side_effect = Bot.DoesNotExist
        prepare_update(
            update,
            from_user=MagicMock(full_name="foo", username="foo_username", id="foo_id"),
        )
        is_whitelisted(MagicMock())(update, MagicMock(), MagicMock())
        assert logger.warning.call_args_list == [
            mock.call("Not whitelisted: %s", update.effective_user)
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestHandleDex:
    def test_missing_args(self, update, logger, _):
        update = prepare_update(update, text="/dex")

        handle_dex(update, MagicMock(args=[]))

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "What do you want to search? (usage: '/dex <word>')",
                **{**DEFAULT_REPLY_KWARGS, "parse_mode": ParseMode.MARKDOWN},
            )
        ]

    @mock.patch("requests.get", side_effect=DexOnlineError("foo"))
    def test_3rd_party_error(self, _, update, logger, __):
        update = prepare_update(update, text="/dex 1")
        context = mock.MagicMock(args=["1"])

        handle_dex(update, context)

        assert logger.warning.call_args_list == []
        assert logger.error.call_args_list == [
            mock.call(
                "DexOnlineError: '%s'. Update: '%s'. Context: '%s'",
                mock.ANY,
                update.to_dict(),
                context,
            )
        ]
        assert update.message.reply_text.call_args_list == [
            mock.call("Couldn't find definition for '1'", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("requests.get")
    def test_success(self, get_mock, update, logger, __):
        get_mock.return_value = MagicMock(
            status_code=200,
            json=MagicMock(return_value={"definitions": [{"htmlRep": "foo bar"}]}),
        )
        update = prepare_update(update, text="/dex 1")

        handle_dex(update, MagicMock(args=["1"]))

        assert logger.warning.call_args_list == []
        assert logger.error.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("foo: bar", **DEFAULT_REPLY_KWARGS)
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestEarthquakes:
    def test_missing_config(self, update, logger, _):
        update = prepare_update(update, text="/earthquake")
        bot = BotFactory(whitelist=["foo_username"])

        handle_earthquake(update, mock.MagicMock(args=[]), bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("No earthquake configuration found", **DEFAULT_REPLY_KWARGS)
        ]

    def test_no_entries(self, update, logger, _):
        update = prepare_update(update, text="/earthquake")
        bot = BotFactory(
            whitelist=["foo_username"], additional_data={"earthquake": {"foo": "bar"}}
        )

        handle_earthquake(update, mock.MagicMock(args=[]), bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("No earthquakes stored", **DEFAULT_REPLY_KWARGS)
        ]

    def test_set_min_magnitude(self, update, logger, _):
        update = prepare_update(update, text="/earthquake set_min_magnitude 3")
        bot = BotFactory(
            whitelist=["foo_username"], additional_data={"earthquake": {"foo": 1}}
        )
        EarthquakeFactory()

        handle_earthquake(update, mock.MagicMock(args=["set_min_magnitude", "3"]), bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Updated min magnitude to 3", **DEFAULT_REPLY_KWARGS)
        ]
        assert bot.additional_data["earthquake"]["min_magnitude"] == "3"

    def test_latest(self, update, logger, _):
        update = prepare_update(update, text="/earthquake")
        bot = BotFactory(
            whitelist=["foo_username"], additional_data={"earthquake": {"foo": 1}}
        )
        EarthquakeFactory()

        handle_earthquake(update, mock.MagicMock(args=[]), bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "🟢 <b>Earthquake alert</b>\n"
                "Magnitude: <b>1.00</b>\n"
                "Location: <a href='"
                "https://www.google.com/maps/search/1.00000,1.00000'>"
                "1</a>\n\n"
                "Depth: 1.000 km\n\n"
                "Time: 2000-01-01 10:10:10+00:00",
                **DEFAULT_REPLY_KWARGS,
            )
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestMisc:
    def test_chat_id(self, update, logger, _):
        update.effective_chat.id = 123321
        handle_chat_id(update)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Chat ID: 123321", **DEFAULT_REPLY_KWARGS)
        ]

    @pytest.mark.parametrize("items", ["a", "a " * 51])
    def test_randomize_invalid_number_of_items(self, update, logger, _, items):
        update = prepare_update(update, text="/randomize")
        handle_randomize(update, mock.MagicMock(args=[1]))
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "Must contain 2-50 items separated by spaces",
                **DEFAULT_REPLY_KWARGS,
            )
        ]

    def test_save_with_no_reply_to_message(self, update, logger, _):
        update = prepare_update(update, text="/save", reply_to_message=None)
        handle_save(update, mock.ANY)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "This command must be sent as a reply to the message you want to save",
                **DEFAULT_REPLY_KWARGS,
            )
        ]

    def test_save_with_no_reply_to_message_text(self, update, logger, _):
        update = prepare_update(
            update,
            text="/save",
            reply_to_message=MagicMock(text=None, new_chat_title=None),
        )
        handle_save(update, mock.ANY)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("No text/title found to save.", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    def test_save_text(self, save_to_db, update, logger, _):
        message = MagicMock(text="foo", new_chat_title=None)
        update = prepare_update(update, text="/save", reply_to_message=message)
        context = mock.MagicMock()
        handle_save(update, context)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved message ✔", **DEFAULT_REPLY_KWARGS)
        ]
        assert save_to_db.call_args_list == [
            mock.call(message, context.bot.get_chat(), text="foo")
        ]

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    def test_save_title(self, save_to_db, update, logger, _):
        message = MagicMock(text=None, new_chat_title="foo")
        update = prepare_update(update, text="/save", reply_to_message=message)
        context = mock.MagicMock()
        handle_save(update, context)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved title ✔", **DEFAULT_REPLY_KWARGS)
        ]
        assert save_to_db.call_args_list == [
            mock.call(message, chat=context.bot.get_chat())
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestWhoSNext:
    def test_who_s_next(self, update, logger, _):
        update = prepare_update(update, text="/next")
        bot = BotFactory(
            whitelist=["foo_username"],
            additional_data={"whos_next": {"chat_id": 1, "post_order": [1, 2, 0]}},
        )
        handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("A fost: <b>0</b>\nUrmează: <b>1</b>", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch(
        "mainframe.bots.management.commands.run_bot_polling.whos_next",
        side_effect=CommandError("err"),
    )
    def test_who_s_next_error(self, _, update, logger, __):
        update = prepare_update(update, text="/next")
        bot = BotFactory(whitelist=["foo_username"])
        handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("err", **DEFAULT_REPLY_KWARGS)
        ]

    def test_who_s_next_posted(self, update, logger, _):
        update = prepare_update(update, text="/next")
        bot = BotFactory(
            whitelist=["foo_username"],
            additional_data={
                "whos_next": {"chat_id": 1, "post_order": [1, 2, 0], "posted": True}
            },
        )
        handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("A fost: <b>1</b>\nUrmează: <b>2</b>", **DEFAULT_REPLY_KWARGS)
        ]

    def test_who_s_next_with_theme(self, update, logger, _):
        update = prepare_update(update, text="/next")
        bot = BotFactory(
            whitelist=["foo_username"],
            additional_data={
                "whos_next": {
                    "chat_id": 1,
                    "post_order": [1, 2, 0],
                    "posted": True,
                    "theme": "theme foo",
                }
            },
        )
        handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "A fost: <b>1</b>\nUrmează: <b>2</b>\n"
                "Tema a fost: theme foo\n\nNoua tema se anunta la 9 PM",
                **DEFAULT_REPLY_KWARGS,
            )
        ]
