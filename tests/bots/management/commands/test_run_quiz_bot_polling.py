import json
from unittest import mock
from unittest.mock import AsyncMock, MagicMock

import pytest

from mainframe.bots.management.commands import run_quiz_bot_polling as quiz_bot
from mainframe.bots.management.commands.run_quiz_bot_polling import (
    BotClient,
    Command,
    Handler,
    get_markup,
)


def test_set_quiz_stores_quiz_synchronously():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    quiz = {"categories": ["history"]}

    result = handler.set_quiz(123, quiz)

    assert result is None
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)


def test_get_markup_contains_all_quiz_actions():
    markup = get_markup()

    assert [button.callback_data for button in markup.inline_keyboard[0]] == [
        "play",
        "ready",
        "categories",
        "reset",
        "restart",
        "end",
    ]


@pytest.mark.asyncio
async def test_categories_reports_missing_and_available_categories():
    query = MagicMock()
    query.edit_message_text = AsyncMock()

    await Handler.categories(query, {})
    assert "nu sunt definite" in query.edit_message_text.await_args.args[0]

    await Handler.categories(query, {"categories": ["history", "music"]})
    assert "history, music" in query.edit_message_text.await_args.args[0]
    assert query.edit_message_text.await_count == 2


@pytest.mark.asyncio
@mock.patch(
    "mainframe.bots.management.commands.run_quiz_bot_polling.asyncio.sleep",
    new_callable=AsyncMock,
)
async def test_get_question_stores_quiz_and_sends_poll(mock_sleep):
    handler = Handler.__new__(Handler)
    message = MagicMock(message_id=7)
    message.poll.id = "poll-id"
    handler.client = MagicMock()
    handler.client.safe_send = AsyncMock(return_value=message)
    context = MagicMock()
    context.bot_data = {}
    quiz = {
        "ci": 0,
        "qi": 0,
        "questions": [
            {
                "category": "history",
                "questions": [
                    {
                        "q": "Question?",
                        "a": "Correct",
                        "options": ["Wrong", "Correct"],
                    }
                ],
            }
        ],
    }

    result = await handler.get_question(123, context, quiz)

    assert result is None
    assert context.bot_data == {"poll-id": {"chat_id": 123, "message_id": 7}}
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)
    assert quiz["correct_option"] == 1
    handler.client.safe_send.assert_awaited_once()
    mock_sleep.assert_awaited_once_with(2)


@pytest.mark.asyncio
async def test_play_handles_no_players_and_starts_question_for_players():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    handler.client.safe_send = AsyncMock()
    handler.get_question = AsyncMock(return_value="poll")
    query = MagicMock()
    query.edit_message_text = MagicMock()
    context = MagicMock()

    result = await handler.play(123, context, query, {})
    assert result == handler.client.safe_send.return_value
    assert "Nu sunt jucatori" in handler.client.safe_send.await_args.kwargs["text"]

    handler.client.safe_send.reset_mock()
    quiz = {"players": {"player": 1}}
    result = await handler.play(123, context, query, quiz)
    assert result == "poll"
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)
    handler.get_question.assert_awaited_once_with(123, context, quiz)


@pytest.mark.asyncio
async def test_receive_poll_answer_ignores_old_poll():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    update = MagicMock()
    update.poll_answer.poll_id = "old-poll"
    context = MagicMock()
    context.bot_data = {}

    assert await handler.receive_poll_answer(update, context) is None
    handler.client.redis.get.assert_not_called()


@pytest.mark.asyncio
async def test_receive_poll_answer_updates_score_and_advances_question():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    handler.client.safe_send = AsyncMock()
    handler.get_question = AsyncMock(return_value="next-poll")
    update = MagicMock()
    update.poll_answer.poll_id = "poll-id"
    update.poll_answer.user.full_name = "player"
    update.poll_answer.option_ids = [1]
    context = MagicMock()
    context.bot_data = {"poll-id": {"chat_id": 123, "message_id": 7}}
    quiz = {
        "answers": {},
        "players": {"player": 0},
        "correct_option": 1,
        "questions": [{"questions": [{"q": "One"}, {"q": "Two"}]}],
        "ci": 0,
        "qi": 0,
    }
    handler.client.redis.get.return_value = quiz

    result = await handler.receive_poll_answer(update, context)

    assert result == "next-poll"
    assert quiz["players"]["player"] == 1
    assert quiz["qi"] == 1
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)
    handler.get_question.assert_awaited_once_with(123, context, quiz)
    handler.client.safe_send.assert_awaited_once()


@pytest.mark.asyncio
async def test_receive_poll_answer_completes_last_question_and_advances_category():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    handler.client.safe_send = AsyncMock()
    handler.get_question = AsyncMock(return_value="next-poll")
    context = MagicMock()
    context.bot_data = {"poll-id": {"chat_id": 123, "message_id": 7}}
    update = MagicMock()
    update.poll_answer.poll_id = "poll-id"
    update.poll_answer.user.full_name = "player"
    update.poll_answer.option_ids = [0]
    quiz = {
        "answers": {},
        "players": {"player": 0},
        "correct_option": 1,
        "questions": [
            {"questions": [{"q": "One"}]},
            {"questions": [{"q": "Two"}, {"q": "Three"}]},
        ],
        "ci": 0,
        "qi": 0,
    }
    handler.client.redis.get.return_value = quiz

    await handler.receive_poll_answer(update, context)

    assert quiz["ci"] == 1
    assert quiz["qi"] == 0
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)
    assert handler.client.safe_send.await_count == 2

    quiz["ci"] = 1
    quiz["qi"] = 1
    quiz["answers"] = {}
    handler.client.safe_send.reset_mock()
    handler.client.redis.set.reset_mock()
    await handler.receive_poll_answer(update, context)
    assert handler.client.safe_send.await_count == 2
    handler.client.redis.set.assert_not_called()


@pytest.mark.asyncio
@mock.patch("mainframe.bots.management.commands.run_quiz_bot_polling.generate_content")
async def test_regenerate_builds_questions_and_handles_generation_errors(generate):
    query = MagicMock()
    query.edit_message_text = AsyncMock()
    generate.return_value = json.dumps({"data": [{"category": "history"}]})

    quiz = await Handler.regenerate(query, {"categories": ["history"]})
    assert quiz["questions"] == [{"category": "history"}]

    generate.side_effect = quiz_bot.GeminiError("failed")
    result = await Handler.regenerate(query, {})
    assert result == query.edit_message_text.return_value
    assert "generarea" in query.edit_message_text.await_args.args[0]

    generate.side_effect = None
    generate.return_value = "not json"
    result = await Handler.regenerate(query, {"questions": []})
    assert result == query.edit_message_text.return_value
    assert "procesarea" in query.edit_message_text.await_args.args[0]


@pytest.mark.asyncio
async def test_reset_and_restart_store_quiz_synchronously():
    handler = Handler.__new__(Handler)
    handler.client = MagicMock()
    handler.regenerate = AsyncMock(
        return_value={"categories": ["history"], "ci": 0, "qi": 0}
    )
    query = MagicMock()
    query.message.chat.id = 123
    query.edit_message_text = AsyncMock()

    quiz = await handler.reset(query, {"categories": ["history"]})
    assert quiz == {"categories": ["history"], "ci": 0, "qi": 0}
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)

    handler.client.redis.set.reset_mock()
    quiz = {"ci": 2, "qi": 4, "players": {"one": 5, "two": 3}}
    await handler.restart(123, quiz, query, "now")
    assert (quiz["ci"], quiz["qi"], list(quiz["players"].values())) == (
        0,
        0,
        [0, 0],
    )
    handler.client.redis.set.assert_called_once_with("quiz:123", quiz)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("action", "quiz", "user", "expected_players"),
    [
        ("ready", {"categories": ["history"]}, "player", {"player": 0}),
        ("ready", {"players": {"player": 0}}, "player", {}),
        ("ready", {"players": {"other": 1}}, "player", {"other": 1, "player": 0}),
    ],
)
@mock.patch("mainframe.clients.bot.Bot.objects.get")
async def test_callback_ready_updates_players_synchronously(
    mock_get, action, quiz, user, expected_players
):
    client = BotClient.__new__(BotClient)
    client.handler = MagicMock()
    client.handler.get_quiz.return_value = quiz
    query = MagicMock(data=action)
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()
    update = MagicMock()
    update.callback_query = query
    update.effective_chat.id = 123
    update.effective_user.full_name = user

    await client.handle_callback_query(update, MagicMock())

    assert quiz["players"] == expected_players
    client.handler.set_quiz.assert_called_once_with(123, quiz)


@pytest.mark.asyncio
@mock.patch("mainframe.clients.bot.Bot.objects.get")
async def test_callback_end_and_categories(mock_get):
    client = BotClient.__new__(BotClient)
    client.handler = MagicMock()
    client.handler.get_quiz.return_value = {"categories": ["history"]}
    client.handler.categories = AsyncMock(return_value="categories")
    query = MagicMock()
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()
    update = MagicMock()
    update.callback_query = query
    update.effective_chat.id = 123

    query.data = "end"
    result = await client.handle_callback_query(update, MagicMock())
    assert result == query.edit_message_text.return_value
    query.edit_message_text.assert_awaited_once_with("See you next time!")

    query.data = "categories"
    assert await client.handle_callback_query(update, MagicMock()) == "categories"
    client.handler.categories.assert_awaited_once_with(
        query, {"categories": ["history"]}
    )


@pytest.mark.asyncio
@mock.patch("mainframe.clients.bot.Bot.objects.get")
async def test_callback_play_reset_and_restart(mock_get):
    client = BotClient.__new__(BotClient)
    client.handler = MagicMock()
    client.handler.get_quiz.return_value = {"players": {"player": 1}}
    client.handler.play = AsyncMock(return_value="played")
    client.handler.reset = AsyncMock(return_value={"categories": ["history"]})
    client.handler.restart = AsyncMock()
    query = MagicMock()
    query.answer = AsyncMock()
    query.edit_message_text = AsyncMock()
    update = MagicMock()
    update.callback_query = query
    update.effective_chat.id = 123
    context = MagicMock()

    query.data = "play"
    assert await client.handle_callback_query(update, context) == "played"
    client.handler.play.assert_awaited_once()

    query.data = "reset"
    await client.handle_callback_query(update, context)
    client.handler.reset.assert_awaited_once_with(query, {"players": {"player": 1}})

    query.data = "restart"
    assert await client.handle_callback_query(update, context) is None
    client.handler.restart.assert_awaited_once()


@pytest.mark.asyncio
@mock.patch("mainframe.clients.bot.Bot.objects.get")
async def test_callback_creates_missing_quiz_before_handling_action(mock_get):
    client = BotClient.__new__(BotClient)
    client.handler = MagicMock()
    client.handler.get_quiz.return_value = None
    client.handler.reset = AsyncMock(return_value={"categories": ["history"]})
    client.handler.categories = AsyncMock(return_value="categories")
    query = MagicMock(data="categories")
    query.answer = AsyncMock()
    update = MagicMock()
    update.callback_query = query
    update.effective_chat.id = 123

    result = await client.handle_callback_query(update, MagicMock())

    assert result == "categories"
    client.handler.reset.assert_awaited_once_with(query)
    client.handler.categories.assert_awaited_once_with(
        query, {"categories": ["history"]}
    )


@pytest.mark.asyncio
@mock.patch("mainframe.clients.bot.Bot.objects.get")
async def test_handle_categories_and_start(mock_get):
    client = BotClient.__new__(BotClient)
    client.handler = MagicMock()
    quiz = {"categories": []}
    client.handler.get_quiz.return_value = quiz
    message = MagicMock(text="/categories history, music")
    update = MagicMock()
    update.effective_message = message
    update.effective_chat.id = 123

    await client.handle_categories(update, MagicMock())
    assert quiz["categories"] == ["history", "music"]
    client.handler.set_quiz.assert_called_once_with(123, quiz)

    client.reply = AsyncMock()
    update.effective_message.text = "/categories "
    await client.handle_categories(update, MagicMock())
    client.reply.assert_awaited_once()

    await client.handle_start(update, MagicMock())
    assert client.reply.await_count == 2


@mock.patch("mainframe.bots.management.commands.run_quiz_bot_polling.BotClient")
@mock.patch("mainframe.bots.management.commands.run_quiz_bot_polling.Application")
@mock.patch("mainframe.bots.management.commands.run_quiz_bot_polling.environ.Env")
def test_command_handles_missing_token_and_registers_handlers(
    env, application, bot_client
):
    env.return_value = lambda key: ""
    command = Command()
    command.handle()
    application.builder.assert_not_called()

    env.return_value = lambda key: "token"
    command.handle()
    application.builder.assert_called_once()
    application.builder.return_value.token.assert_called_once_with("token")
    app = application.builder.return_value.token.return_value.build.return_value
    assert app.add_handler.call_count == 4
    app.run_polling.assert_called_once_with(allowed_updates=quiz_bot.Update.ALL_TYPES)
    bot_client.assert_called_once()
