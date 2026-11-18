from unittest import mock
from unittest.mock import AsyncMock, MagicMock

import pytest
import telegram

from mainframe.bots.management.commands.inlines.lights import LightsInline
from mainframe.bots.management.commands.run_bot_polling import handle_callback_query
from mainframe.clients.lights import LightsException


class TestLightsInline:
    def test_get_markup_renders_lights_and_controls(self):
        lights = [
            {
                "ip": "192.168.1.10",
                "capabilities": {"name": "Desk", "power": "on"},
            },
            {
                "ip": "192.168.1.11",
                "capabilities": {"name": "", "power": "off"},
            },
        ]
        with mock.patch(
            "mainframe.bots.management.commands.inlines.lights.LightsClient.get_bulbs",
            return_value=lights,
        ):
            markup = LightsInline.get_markup()

        assert len(markup.inline_keyboard) == 3
        assert (
            markup.inline_keyboard[0][0].callback_data == "lights toggle 192.168.1.10"
        )
        assert (
            markup.inline_keyboard[1][0].callback_data == "lights toggle 192.168.1.11"
        )
        assert markup.inline_keyboard[2][1].callback_data == "lights refresh"

    @pytest.mark.asyncio
    async def test_refresh_edits_message_with_markup(self):
        update = MagicMock()
        update.callback_query.edit_message_text = AsyncMock(return_value="edited")
        markup = MagicMock()

        with mock.patch.object(LightsInline, "get_markup", return_value=markup):
            result = await LightsInline.refresh(update)

        assert result == "edited"
        update.callback_query.edit_message_text.assert_awaited_once()
        assert (
            update.callback_query.edit_message_text.call_args.kwargs["reply_markup"]
            is markup
        )

    @pytest.mark.asyncio
    async def test_refresh_handles_bad_request(self):
        update = MagicMock()
        update.callback_query.edit_message_text = AsyncMock(
            side_effect=telegram.error.BadRequest("Message is not modified")
        )

        with (
            mock.patch.object(LightsInline, "get_markup", return_value=MagicMock()),
            mock.patch(
                "mainframe.bots.management.commands.inlines.lights.logger"
            ) as logger,
        ):
            result = await LightsInline.refresh(update)

        assert result is None
        logger.info.assert_called_once_with(
            "Unable to refresh lights message", error="Message is not modified"
        )

    @pytest.mark.asyncio
    async def test_toggle_handles_unreachable_light_in_callback(self):
        update = MagicMock()
        update.callback_query.data = "lights toggle 192.168.1.10"
        update.callback_query.answer = AsyncMock()

        with (
            mock.patch(
                "mainframe.bots.management.commands.inlines.lights.LightsClient.toggle",
                side_effect=LightsException("No route to host"),
            ),
            mock.patch(
                "mainframe.bots.management.commands.inlines.lights.logger"
            ) as logger,
        ):
            await handle_callback_query(update)

        logger.warning.assert_called_once_with(
            "Error toggling light",
            ip="192.168.1.10",
            error="No route to host",
        )

    @pytest.mark.asyncio
    async def test_toggle_refreshes_after_success(self):
        update = MagicMock()
        with (
            mock.patch(
                "mainframe.bots.management.commands.inlines.lights.LightsClient.toggle",
                return_value="toggled",
            ),
            mock.patch.object(
                LightsInline, "refresh", new_callable=AsyncMock, return_value="updated"
            ) as refresh,
        ):
            result = await LightsInline.toggle(update, "192.168.1.10")

        assert result == "updated"
        refresh.assert_awaited_once_with(update)
