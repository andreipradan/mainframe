from unittest import mock
from unittest.mock import MagicMock

import pytest
from django.core.management import CommandError
from mainframe.bots.models import Bot
from mainframe.bots.webhooks.butler import call

from tests.factories.bots import BotFactory
from tests.factories.earthquakes import EarthquakeFactory

DEFAULT_REPLY_KWARGS = {
    "disable_notification": True,
    "disable_web_page_preview": True,
    "parse_mode": "HTML",
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
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestInitialNewChatTitleAndMembers:
    def test_no_message(self, update, logger, _):
        update.return_value.message = None
        bot = BotFactory()
        call({}, bot)
        assert logger.info.call_args_list == [
            mock.call("No message or chat: %s", update().to_dict())
        ]

    def test_new_chat_title_without_who_s_next(self, update, logger, _):
        update = prepare_update(update, new_chat_title=1)
        bot = BotFactory()
        call({}, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.message.chat.id,
                update.message.chat.title,
            ),
        ]

    def test_new_chat_title_without_chat_id(self, update, logger, _):
        bot = BotFactory(additional_data={"whos_next": {}})
        call({}, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update().message.chat.id,
                update().message.chat.title,
            ),
        ]

    def test_new_chat_title_with_unexpected_chat_id(self, update, logger, _):
        bot = BotFactory(additional_data={"whos_next": {"chat_id": 1}})
        call({}, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update().message.chat.id,
                update().message.chat.title,
            ),
        ]

    @mock.patch("mainframe.bots.webhooks.butler.save_to_db")
    def test_new_chat_title(self, save_to_db, update, logger, telegram_bot):
        update = prepare_update(update, chat_id=1, new_chat_title=1)
        bot = BotFactory(additional_data={"whos_next": {"chat_id": 1}})

        call({}, bot)

        assert logger.info.call_args_list == []
        assert save_to_db.call_args_list == [
            mock.call(
                update.message, chat=telegram_bot.get_chat(update.message.chat_id)
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
        bot = BotFactory()

        call({}, bot)

        assert logger.info.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Welcome Foo, Bar!", **DEFAULT_REPLY_KWARGS)
        ]

    def test_left_chat_member(self, update, logger, _):
        update = prepare_update(update, left_chat_member=MagicMock(full_name="Foo"))
        bot = BotFactory()

        call({}, bot)

        assert logger.info.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Bye Foo! 😢", **DEFAULT_REPLY_KWARGS)
        ]

    def test_ignoring_non_whitelisted_users(self, update, logger, _):
        prepare_update(
            update,
            from_user=MagicMock(full_name="foo", username="foo_username", id="foo_id"),
        )
        bot = BotFactory()
        call({}, bot)
        assert logger.info.call_args_list == []
        assert logger.error.call_args_list == [
            mock.call(
                "Ignoring message from: %s",
                "Name: foo. Username: foo_username. ID: foo_id",
            )
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestDocuments:
    @mock.patch("mainframe.bots.webhooks.butler.finance_import")
    def test_revolut_statement(self, finance_import, update, logger, _):
        update = prepare_update(
            update,
            document=MagicMock(file_name="account-statement.csv"),
        )
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.info.call_args_list == [
            mock.call("Got %s saving...", "csv"),
            mock.call("Saved %s: %s", "statements", "account-statement.csv"),
        ]
        assert logger.error.call_args_list == []
        assert finance_import.call_args_list == [
            mock.call(doc_type="statements", bank="revolut")
        ]
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved statements: account-statement.csv", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("mainframe.bots.webhooks.butler.finance_import")
    def test_raiffeisen_statement(self, finance_import, update, logger, _):
        update = prepare_update(
            update,
            document=MagicMock(file_name="Extras_de_cont.xlsx"),
        )
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.info.call_args_list == [
            mock.call("Got %s saving...", "xlsx"),
            mock.call("Saved %s: %s", "statements", "Extras_de_cont.xlsx"),
        ]
        assert logger.error.call_args_list == []
        assert finance_import.call_args_list == [
            mock.call(doc_type="statements", bank="raiffeisen")
        ]
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved statements: Extras_de_cont.xlsx", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("mainframe.bots.webhooks.butler.finance_import")
    def test_unhandled_pdf(self, finance_import, update, logger, _):
        update = prepare_update(
            update,
            document=MagicMock(file_name="filename.pdf"),
        )
        update.message = MagicMock(
            new_chat_title=None,
            new_chat_members=None,
            left_chat_member=None,
            from_user=MagicMock(username="foo_username"),
            document=MagicMock(file_name="filename.pdf"),
        )
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

        assert logger.error.call_args_list == [mock.call("Unhandled pdf type")]
        assert logger.info.call_args_list == []
        assert finance_import.call_args_list == []
        assert update.message.reply_text.call_args_list == []

    @mock.patch("mainframe.bots.webhooks.butler.finance_import")
    @pytest.mark.parametrize("filename", ["Tranzactii.pdf", "Scadentar.pdf"])
    def test_pdf(self, finance_import, update, logger, _, filename):
        update = prepare_update(update, document=MagicMock(file_name=filename))
        bot = BotFactory(whitelist=["foo_username"])
        doc_type = "payments" if "Tranzactii" in filename else "timetables"

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.info.call_args_list == [
            mock.call("Got %s saving...", "pdf"),
            mock.call("Saved %s: %s", doc_type, filename),
        ]
        assert finance_import.call_args_list == [mock.call(doc_type=doc_type)]
        assert update.message.reply_text.call_args_list == [
            mock.call(f"Saved {doc_type}: {filename}", **DEFAULT_REPLY_KWARGS)
        ]

    def test_no_message_text(self, update, logger, _):
        user = "Name: foo. Username: foo_username. ID: foo_id"
        update = prepare_update(
            update,
            from_user=MagicMock(username="foo_username", full_name="foo", id="foo_id"),
        )
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.info.call_args_list == [
            mock.call("No message text: %s. From: %s", update.to_dict(), user),
        ]

    def test_invalid_command(self, update, logger, _):
        user = "Name: foo. Username: foo_username. ID: foo_id"
        update = prepare_update(
            update,
            from_user=MagicMock(username="foo_username", full_name="foo", id="foo_id"),
            text="bar",
        )
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == [
            mock.call("Invalid command: '%s'. From: %s", update.message.text, user),
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestEarthquakes:
    def test_no_entries(self, update, logger, _):
        update = prepare_update(update, text="/earthquake")
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

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

        call({}, bot)

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

        call({}, bot)

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
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestInlines:
    @mock.patch("mainframe.bots.webhooks.butler.BusInline")
    def test_bus(self, bus_inline, update, logger, _):
        update = prepare_update(
            update,
            text="/bus@bot_username",
            entities=[MagicMock(type="bot_command")],
        )
        bot = BotFactory(whitelist=["foo_username"], username="bot_username")

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert bus_inline.start.call_args_list == [mock.call(update)]

    @mock.patch("mainframe.bots.webhooks.butler.MealsInline")
    def test_meals(self, inline, update, logger, _):
        update = prepare_update(update, text="/meals")
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert inline.start.call_args_list == [mock.call(update, page=1)]

    @mock.patch("mainframe.bots.webhooks.butler.SavedMessagesInlines")
    def test_saved(self, inline, update, logger, _):
        update = prepare_update(update, text="/saved", chat_id="foo chat id")
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert inline.call_args_list == [mock.call("foo chat id")]
        assert inline().start.call_args_list == [mock.call(update, page=1)]

    @mock.patch("mainframe.bots.webhooks.butler.SavedMessagesInlines")
    def test_saved_with_chat_id(self, inline, update, logger, _):
        update = prepare_update(update, text="/saved -123")
        bot = BotFactory(whitelist=["foo_username"])

        call({}, bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert inline.call_args_list == [mock.call(-123)]
        assert inline().start.call_args_list == [mock.call(update, page=1)]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestMisc:
    def test_chat_id(self, update, logger, _):
        update = prepare_update(update, text="/get_chat_id", chat_id="123321")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Chat ID: 123321", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("mainframe.bots.webhooks.butler.get_ngrok_url")
    @pytest.mark.parametrize("ngrok_url", [None, "https://google.com"])
    def test_mainframe(self, get_ngrok_url, update, logger, _, ngrok_url):
        get_ngrok_url.return_value = ngrok_url
        expected_message = ngrok_url or "Could not find mainframe URL"
        update = prepare_update(update, text="/mainframe")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(expected_message, **DEFAULT_REPLY_KWARGS)
        ]

    @pytest.mark.parametrize("items", ["a", "a " * 51])
    def test_randomize_invalid_number_of_items(self, update, logger, _, items):
        update = prepare_update(update, text="/randomize")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
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
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
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
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("No text/title found to save.", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("mainframe.bots.webhooks.butler.save_to_db")
    def test_save_text(self, save_to_db, update, logger, telegram_bot):
        message = MagicMock(text="foo", new_chat_title=None)
        update = prepare_update(update, text="/save", reply_to_message=message)
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved message ✔", **DEFAULT_REPLY_KWARGS)
        ]
        assert save_to_db.call_args_list == [
            mock.call(message, telegram_bot.get_chat(), text="foo")
        ]

    @mock.patch("mainframe.bots.webhooks.butler.save_to_db")
    def test_save_title(self, save_to_db, update, logger, telegram_bot):
        message = MagicMock(text=None, new_chat_title="foo")
        update = prepare_update(update, text="/save", reply_to_message=message)
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved title ✔", **DEFAULT_REPLY_KWARGS)
        ]
        assert save_to_db.call_args_list == [
            mock.call(message, chat=telegram_bot.get_chat())
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestTranslate:
    help_text = (
        "/translate <insert text here>\n"
        "/translate target=<language_code> <insert text here>\n"
        "Language codes here: https://cloud.google.com/translate/docs/languages"
    )
    translate_defaults = {**DEFAULT_REPLY_KWARGS, "parse_mode": None}

    def test_help(self, update, logger, _):
        update = prepare_update(update, text="/translate help")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(self.help_text, **self.translate_defaults),
        ]

    @pytest.mark.parametrize("cmd", ["", "source=a", "target=foo", "source=a target=b"])
    def test_missing_text(self, update, logger, _, cmd):
        update = prepare_update(update, text=f"/translate {cmd}")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Missing text to translate", **DEFAULT_REPLY_KWARGS)
        ]

    @pytest.mark.parametrize(
        "dataset",
        [
            {"cmd": "foo text", "source": None, "target": None},
            {"cmd": "source=sc foo text", "source": "sc", "target": None},
            {"cmd": "target=tg foo text", "source": None, "target": "tg"},
            {"cmd": "source=sc target=tg foo text", "source": "sc", "target": "tg"},
        ],
    )
    @mock.patch("mainframe.bots.webhooks.butler.translate_text")
    def test_translate(self, translate_text, update, logger, _, dataset):
        translate_text.return_value = "foo translation"
        update = prepare_update(update, text=f"/translate {dataset['cmd']}")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        translate_text.assert_called_once_with(
            "foo text", source=dataset["source"], target=dataset["target"]
        )
        assert update.message.reply_text.call_args_list == [
            mock.call("foo translation", **self.translate_defaults)
        ]

    def test_too_many_chars(self, update, logger, _):
        update = prepare_update(update, text="/translate " + "a" * 256)
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "Too many characters. Try sending less than 255 characters",
                **DEFAULT_REPLY_KWARGS,
            ),
        ]


@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.webhooks.butler.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestWhoSNext:
    def test_who_s_next(self, update, logger, _):
        update = prepare_update(update, text="/next")
        bot = BotFactory(
            whitelist=["foo_username"],
            additional_data={"whos_next": {"chat_id": 1, "post_order": [1, 2, 0]}},
        )
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("A fost: <b>0</b>\nUrmează: <b>1</b>", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch(
        "mainframe.bots.webhooks.butler.whos_next", side_effect=CommandError("err")
    )
    def test_who_s_next_error(self, _, update, logger, __):
        update = prepare_update(update, text="/next")
        bot = BotFactory(whitelist=["foo_username"])
        call({}, bot)
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
        call({}, bot)
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
        call({}, bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "A fost: <b>1</b>\nUrmează: <b>2</b>\n"
                "theme foo\nNoua tema se anunta la 9 PM",
                **DEFAULT_REPLY_KWARGS,
            )
        ]
