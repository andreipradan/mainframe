from datetime import date
from types import SimpleNamespace
from unittest import mock

import pytest

from mainframe.bots.management.commands.inlines.meals import MealsInline, parse_meal
from mainframe.meals.models import Meal


def make_callback_update():
    message = SimpleNamespace(chat=SimpleNamespace(id=10), message_id=20)
    callback_query = SimpleNamespace(
        message=message,
        _bot=mock.MagicMock(),
        from_user=SimpleNamespace(full_name="Alice"),
    )
    return SimpleNamespace(callback_query=callback_query)


@pytest.mark.asyncio
async def test_get_meals_markup_bottom_level():
    markup = await MealsInline.get_meals_markup("2025-01-02", 3, bottom_level=True)

    assert [button.callback_data for button in markup.inline_keyboard[0]] == [
        "meals fetch_day 2025-01-02 3",
        "end",
    ]


@pytest.mark.asyncio
async def test_get_meals_markup_includes_meal_buttons():
    meal = mock.MagicMock(pk=7)
    meal.get_type_display.return_value = "Lunch"
    query = mock.MagicMock()
    query.order_by.return_value = [meal]
    with mock.patch.object(Meal.objects, "filter", return_value=query):
        markup = await MealsInline.get_meals_markup("2025-01-02", 2)

    assert markup.inline_keyboard[0][0].callback_data == "meals fetch 7 2"
    assert markup.inline_keyboard[-1][-1].callback_data == "end"


@pytest.mark.asyncio
async def test_get_markup_non_top_level_returns_navigation():
    markup = await MealsInline.get_markup(page=4)

    assert [button.callback_data for button in markup.inline_keyboard[0]] == [
        "meals start 4",
        "end",
        "meals sync",
    ]


@pytest.mark.asyncio
async def test_get_markup_top_level_groups_dates_and_adds_pagination():
    items = [SimpleNamespace(date=date(2025, 1, day)) for day in range(1, 5)]
    ordered = mock.MagicMock()
    ordered.__getitem__.return_value = items
    distinct = mock.MagicMock()
    distinct.order_by.return_value = ordered
    with mock.patch.object(Meal.objects, "distinct", return_value=distinct):
        markup = await MealsInline.get_markup(page=2, is_top_level=True, last_page=3)

    assert len(markup.inline_keyboard) == 3
    assert markup.inline_keyboard[0][0].callback_data == "meals fetch_day 2025-01-01 2"
    assert [button.callback_data for button in markup.inline_keyboard[-1]] == [
        "meals start 1",
        "end",
        "meals sync",
        "meals start 3",
    ]


@pytest.mark.asyncio
async def test_fetch_day_edits_message_with_day_markup():
    update = make_callback_update()
    markup = mock.MagicMock()
    with (
        mock.patch.object(
            MealsInline, "get_meals_markup", new=mock.AsyncMock(return_value=markup)
        ),
        mock.patch(
            "mainframe.bots.management.commands.inlines.meals.edit_message",
            new=mock.AsyncMock(return_value="edited"),
        ) as edit_message,
    ):
        result = await MealsInline.fetch_day(update, "2025-01-02", 3)

    assert result == "edited"
    assert edit_message.await_args.kwargs["text"] == "2025-01-02"
    assert edit_message.await_args.kwargs["reply_markup"] is markup


@pytest.mark.asyncio
async def test_fetch_edits_existing_meal():
    update = make_callback_update()
    meal = SimpleNamespace(
        name="Soup",
        date=date(2025, 1, 2),
        ingredients=["water", "salt"],
        quantities={"water": "1L"},
        get_type_display=lambda: "Lunch",
    )
    markup = mock.MagicMock()
    with (
        mock.patch.object(Meal.objects, "get", return_value=meal),
        mock.patch.object(
            MealsInline, "get_meals_markup", new=mock.AsyncMock(return_value=markup)
        ),
        mock.patch(
            "mainframe.bots.management.commands.inlines.meals.edit_message",
            new=mock.AsyncMock(return_value="edited"),
        ) as edit_message,
    ):
        result = await MealsInline.fetch(update, 7, 2)

    assert result == "edited"
    assert "<b>Soup</b>" in edit_message.await_args.kwargs["text"]
    assert edit_message.await_args.kwargs["reply_markup"] is markup


@pytest.mark.asyncio
async def test_fetch_handles_deleted_meal():
    update = make_callback_update()
    markup = mock.MagicMock()
    with (
        mock.patch.object(Meal.objects, "get", side_effect=Meal.DoesNotExist),
        mock.patch.object(
            MealsInline, "get_markup", new=mock.AsyncMock(return_value=markup)
        ) as get_markup,
        mock.patch(
            "mainframe.bots.management.commands.inlines.meals.edit_message",
            new=mock.AsyncMock(return_value="edited"),
        ) as edit_message,
    ):
        result = await MealsInline.fetch(update, 7, 2)

    assert result == "edited"
    assert edit_message.await_args.kwargs["text"] == "Not found"
    assert edit_message.await_args.kwargs["reply_markup"] is markup
    get_markup.assert_awaited_once_with(page=2)


@pytest.mark.asyncio
async def test_start_replies_to_new_conversation():
    dates = mock.MagicMock()
    dates.count.return_value = 25
    user = SimpleNamespace(username="alice", id=5, full_name="Alice")
    reply_text = mock.MagicMock(return_value="sent")
    update = SimpleNamespace(
        callback_query=None,
        message=SimpleNamespace(from_user=user, reply_text=reply_text),
    )
    with (
        mock.patch.object(Meal.objects, "distinct", return_value=dates),
        mock.patch.object(
            MealsInline, "get_markup", new=mock.AsyncMock(return_value="markup")
        ) as get_markup,
    ):
        result = await MealsInline.start(update)

    assert result == "sent"
    assert "Choose a date [1 / 2]" in reply_text.call_args.args[0]
    get_markup.assert_awaited_once_with(is_top_level=True, last_page=2)


@pytest.mark.asyncio
async def test_start_edits_callback_message():
    update = make_callback_update()
    dates = mock.MagicMock()
    dates.count.return_value = 1
    with (
        mock.patch.object(Meal.objects, "distinct", return_value=dates),
        mock.patch.object(
            MealsInline, "get_markup", new=mock.AsyncMock(return_value="markup")
        ) as get_markup,
        mock.patch(
            "mainframe.bots.management.commands.inlines.meals.edit_message",
            new=mock.AsyncMock(return_value="edited"),
        ) as edit_message,
    ):
        result = await MealsInline.start(update, page="1", override_message="Custom")

    assert result == "edited"
    assert edit_message.await_args.kwargs["text"] == "Custom"
    get_markup.assert_awaited_once_with(page=1, is_top_level=True, last_page=1)


@pytest.mark.asyncio
async def test_sync_fetches_meals_and_restarts_inline():
    update = make_callback_update()
    meals = [mock.MagicMock(), mock.MagicMock()]
    with (
        mock.patch(
            "mainframe.bots.management.commands.inlines.meals.MealsClient.fetch_meals",
            return_value=meals,
        ),
        mock.patch.object(
            MealsInline, "start", new=mock.AsyncMock(return_value="sent")
        ) as start,
    ):
        result = await MealsInline.sync(update)

    assert result == "sent"
    start.assert_awaited_once_with(update, override_message="Fetched 2 meals 👌")


def test_parse_meal_formats_ingredients_and_quantities():
    meal = SimpleNamespace(
        name="Soup",
        date=date(2025, 1, 2),
        ingredients=["water", "salt"],
        quantities={"water": "1L"},
        get_type_display=lambda: "Lunch",
    )

    result = parse_meal(meal)

    assert "1. water" in result
    assert "2. salt" in result
    assert "water - 1L" in result
