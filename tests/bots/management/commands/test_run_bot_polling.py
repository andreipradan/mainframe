import uuid
from unittest import mock
from unittest.mock import AsyncMock, MagicMock

import pytest
from asgiref.sync import sync_to_async
from django.core.management import CommandError
from django.utils import timezone
from future.backports.datetime import datetime
from telegram.constants import ParseMode

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
from mainframe.earthquakes.models import Earthquake
from tests.factories.bots import BotFactory
from tests.factories.earthquakes import EarthquakeFactory

DEFAULT_REPLY_KWARGS = {
    "disable_notification": True,
    "disable_web_page_preview": True,
    "parse_mode": "HTML",
}


def prepare_update(update, mock_class=MagicMock, **kwargs):
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
    update.message = mock_class(**kwargs)
    return update


@pytest.mark.asyncio
@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestStatusUpdate:
    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    async def test_new_chat_title_without_who_s_next(
        self, save_to_db, update, logger, _
    ):
        update = prepare_update(update, new_chat_title=1)
        assert not await handle_new_chat_title(update, mock.ANY, mock.MagicMock())
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.effective_chat.id,
                update.effective_chat.title,
            ),
        ]
        assert not save_to_db.called

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    async def test_new_chat_title_without_chat_id(self, save_to_db, update, logger, _):
        bot = await sync_to_async(BotFactory)(
            token=uuid.uuid4(), additional_data={"whos_next": {}}
        )
        await handle_new_chat_title(update, mock.ANY, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.effective_chat.id,
                update.effective_chat.title,
            ),
        ]
        assert not save_to_db.called

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    async def test_new_chat_title_with_unexpected_chat_id(
        self, save_to_db, update, logger, _
    ):
        bot = await sync_to_async(BotFactory)(
            token=uuid.uuid4(), additional_data={"whos_next": {"chat_id": 1}}
        )
        assert not await handle_new_chat_title(update, mock.ANY, bot)
        assert logger.info.call_args_list == [
            mock.call(
                "[%s] New chat title: %s",
                update.effective_chat.id,
                update.effective_chat.title,
            ),
        ]
        assert not save_to_db.called

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    async def test_new_chat_title(self, save_to_db, update, logger, _):
        update = prepare_update(update, mock_class=AsyncMock, new_chat_title=1)
        update.effective_chat.id = 1
        bot = await sync_to_async(BotFactory)(
            token=uuid.uuid4(), additional_data={"whos_next": {"chat_id": 1}}
        )
        context = mock.AsyncMock()
        await handle_new_chat_title(update, context, bot)

        assert logger.info.call_args_list == []
        assert save_to_db.call_args_list == [
            mock.call(
                update.message, chat=await context.bot.get_chat(update.message.chat_id)
            ),
        ]
        assert bot.additional_data["whos_next"]["posted"] is True
        assert bot.additional_data["whos_next"]["initial"] is False
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved ✔", **DEFAULT_REPLY_KWARGS)
        ]

    async def test_new_chat_members(self, update, logger, _):
        update = prepare_update(
            update,
            mock_class=AsyncMock,
            new_chat_members=[MagicMock(full_name="Foo"), MagicMock(full_name="Bar")],
        )
        await handle_new_chat_members(update, mock.ANY)

        assert logger.info.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Welcome Foo, Bar!", **DEFAULT_REPLY_KWARGS)
        ]

    async def test_left_chat_member(self, update, logger, _):
        update = prepare_update(
            update, mock_class=AsyncMock, left_chat_member=MagicMock(full_name="Foo")
        )
        await handle_left_chat_member(update)
        assert logger.info.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Bye Foo! 😢", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch.object(Bot, "objects")
    async def test_ignoring_non_whitelisted_users(self, objects, update, logger, _):
        objects.get.side_effect = Bot.DoesNotExist
        prepare_update(
            update,
            mock_class=AsyncMock,
            from_user=MagicMock(full_name="foo", username="foo_username", id="foo_id"),
        )
        await is_whitelisted(handle_new_chat_members)(update, MagicMock())
        assert logger.warning.call_args_list == [
            mock.call("Not whitelisted: %s", update.effective_user)
        ]


@pytest.mark.asyncio
@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestHandleDex:
    async def test_missing_args(self, update, logger, _):
        update = prepare_update(update, text="/dex", mock_class=AsyncMock)

        await handle_dex(update, MagicMock(args=[]))

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "What do you want to search? (usage: '/dex <word>')",
                **{**DEFAULT_REPLY_KWARGS, "parse_mode": ParseMode.MARKDOWN},
            )
        ]

    @mock.patch("requests.request", side_effect=DexOnlineError("foo"))
    async def test_3rd_party_error(self, _, update, logger, __):
        update = prepare_update(update, text="/dex 1", mock_class=AsyncMock)
        update.message.reply_text = AsyncMock()
        context = mock.MagicMock(args=["1"])

        await handle_dex(update, context)

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

    @mock.patch("requests.request")
    async def test_success(self, get_mock, update, logger, __):
        get_mock.return_value = MagicMock(
            status_code=200,
            json=MagicMock(return_value={"definitions": [{"htmlRep": "foo bar"}]}),
        )
        update = prepare_update(update, text="/dex 1", mock_class=AsyncMock)

        await handle_dex(update, MagicMock(args=["1"]))

        assert logger.warning.call_args_list == []
        assert logger.error.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("foo: bar", **DEFAULT_REPLY_KWARGS)
        ]


@pytest.mark.asyncio
@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestEarthquakes:
    async def test_no_entries(self, update, logger, _):
        await sync_to_async(Earthquake.objects.all().delete)()
        update = prepare_update(update, text="/earthquake", mock_class=AsyncMock)

        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
            whitelist=["foo_username"],
            additional_data={"earthquake": {"foo": "bar"}},
        )

        await handle_earthquake(update, mock.MagicMock(args=[]), bot)

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("No earthquakes stored", **DEFAULT_REPLY_KWARGS)
        ]

    async def test_set_min_magnitude(self, update, logger, _):
        update = prepare_update(
            update, text="/earthquake set_min_magnitude 3", mock_class=AsyncMock
        )

        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
            whitelist=["foo_username"],
            additional_data={"earthquake": {"foo": 1}},
        )
        await sync_to_async(EarthquakeFactory)(timestamp=timezone.now())

        _ = await handle_earthquake(
            update, mock.MagicMock(args=["set_min_magnitude", "3"]), bot
        )

        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Updated min magnitude to 3", **DEFAULT_REPLY_KWARGS)
        ]
        assert bot.additional_data["earthquake"]["min_magnitude"] == "3"

    async def test_latest(self, update, logger, _):
        await sync_to_async(Earthquake.objects.all().delete)()
        update = prepare_update(update, text="/earthquake", mock_class=AsyncMock)

        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
            whitelist=["foo_username"],
            additional_data={"earthquake": {"foo": 1}},
        )
        await sync_to_async(EarthquakeFactory)(
            timestamp=datetime.fromisoformat("2000-01-01T00:00:00+00:00")
        )

        await handle_earthquake(update, mock.MagicMock(args=[]), bot)

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
                "Time: 2000-01-01 00:00:00+00:00\n"
                "Last check: -",
                **DEFAULT_REPLY_KWARGS,
            )
        ]


@pytest.mark.asyncio
@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=AsyncMock(callback_query=None))
@pytest.mark.django_db
class TestMisc:
    async def test_chat_id(self, update, logger, _):
        update.effective_chat.id = 123321
        update.message.reply_text = AsyncMock()
        await handle_chat_id(update)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Chat ID: 123321", **DEFAULT_REPLY_KWARGS)
        ]

    @pytest.mark.parametrize("items", ["a", "a " * 51])
    async def test_randomize_invalid_number_of_items(self, update, logger, _, items):
        update = prepare_update(update, text="/randomize", mock_class=AsyncMock)
        update.message.reply_text = AsyncMock()
        await handle_randomize(update, mock.MagicMock(args=[1]))
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "Must contain 2-50 items separated by spaces",
                **DEFAULT_REPLY_KWARGS,
            )
        ]

    async def test_save_with_no_reply_to_message(self, update, logger, _):
        update = prepare_update(update, text="/save", reply_to_message=None)
        update.message.reply_text = AsyncMock()
        await handle_save(update, mock.ANY)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "This command must be sent as a reply to the message you want to save",
                **DEFAULT_REPLY_KWARGS,
            )
        ]

    async def test_save_with_no_reply_to_message_text(self, update, logger, _):
        update = prepare_update(
            update,
            text="/save",
            reply_to_message=MagicMock(text=None, new_chat_title=None),
        )
        update.message.reply_text = AsyncMock()
        await handle_save(update, mock.ANY)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("No text/title found to save.", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    async def test_save_text(self, save_to_db, update, logger, _):
        message = MagicMock(text="foo", new_chat_title=None)
        update = prepare_update(update, text="/save", reply_to_message=message)
        update.message.reply_text = AsyncMock()
        context = mock.MagicMock()
        context.bot.get_chat = AsyncMock()
        await handle_save(update, context)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved message ✔", **DEFAULT_REPLY_KWARGS)
        ]
        assert save_to_db.call_args_list == [
            mock.call(message, await context.bot.get_chat(), text="foo")
        ]

    @mock.patch("mainframe.bots.management.commands.run_bot_polling.save_to_db")
    async def test_save_title(self, save_to_db, update, logger, _):
        message = MagicMock(text=None, new_chat_title="foo")
        update = prepare_update(update, text="/save", reply_to_message=message)
        update.message.reply_text = AsyncMock()
        context = mock.MagicMock()
        context.bot.get_chat = AsyncMock(return_value={"title": "foo"})
        await handle_save(update, context)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("Saved title ✔", **DEFAULT_REPLY_KWARGS)
        ]
        assert save_to_db.call_args_list == [
            mock.call(message, chat=await context.bot.get_chat())
        ]


@pytest.mark.asyncio
@mock.patch.object(Bot, "telegram_bot")
@mock.patch("mainframe.bots.management.commands.run_bot_polling.logger")
@mock.patch("telegram.Update.de_json", return_value=MagicMock(callback_query=None))
@pytest.mark.django_db
class TestWhoSNext:
    async def test_who_s_next(self, update, logger, _):
        update = prepare_update(update, mock_class=AsyncMock, text="/next")

        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
            whitelist=["foo_username"],
            additional_data={"whos_next": {"chat_id": 1, "post_order": [1, 2, 0]}},
        )
        await handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("A fost: <b>0</b>\nUrmează: <b>1</b>", **DEFAULT_REPLY_KWARGS)
        ]

    @mock.patch(
        "mainframe.bots.management.commands.run_bot_polling.whos_next",
        side_effect=CommandError("err"),
    )
    async def test_who_s_next_error(self, _, update, logger, __):
        update = prepare_update(update, mock_class=AsyncMock, text="/next")
        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
            whitelist=["foo_username"],
        )
        await handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("err", **DEFAULT_REPLY_KWARGS)
        ]

    async def test_who_s_next_posted(self, update, logger, _):
        update = prepare_update(update, mock_class=AsyncMock, text="/next")
        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
            whitelist=["foo_username"],
            additional_data={
                "whos_next": {"chat_id": 1, "post_order": [1, 2, 0], "posted": True}
            },
        )
        await handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call("A fost: <b>1</b>\nUrmează: <b>2</b>", **DEFAULT_REPLY_KWARGS)
        ]

    async def test_who_s_next_with_theme(self, update, logger, _):
        update = prepare_update(update, mock_class=AsyncMock, text="/next")
        bot = await sync_to_async(BotFactory)(
            token=str(uuid.uuid4()),
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
        await handle_next(update, mock.ANY, bot=bot)
        assert logger.error.call_args_list == []
        assert logger.warning.call_args_list == []
        assert update.message.reply_text.call_args_list == [
            mock.call(
                "A fost: <b>1</b>\nUrmează: <b>2</b>\n"
                "Tema a fost: theme foo\n\nNoua tema se anunta la 9 PM",
                **DEFAULT_REPLY_KWARGS,
            )
        ]
