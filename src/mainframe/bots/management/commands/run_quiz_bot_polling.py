import asyncio
import datetime
import itertools
import json
import logging

import environ
import telegram
from django.core.management import BaseCommand
from mainframe.clients.bot import BaseBotClient
from mainframe.clients.gemini import GeminiError, generate_content
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Poll,
    Update,
)
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    PollAnswerHandler,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

DEFAULT_CATEGORIES = [
    "Cultură generală",
    "Istorie",
    "Geografie",
    "Muzică",
    "Surpriză",
    "Filme",
]


def get_markup():
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("▶️", callback_data="play"),
                InlineKeyboardButton("🫡", callback_data="ready"),
                InlineKeyboardButton("🗂", callback_data="categories"),
                InlineKeyboardButton("🔥", callback_data="reset"),
                InlineKeyboardButton("♻️", callback_data="restart"),
                InlineKeyboardButton("✅", callback_data="end"),
            ]
        ]
    )


class Handler:
    def __init__(self, client):
        self.client: BotClient = client

    @staticmethod
    async def categories(query, quiz):
        if not (categories := quiz.get("categories")):
            return await query.edit_message_text(
                "Categoriile nu sunt definite.\n"
                "Se pot seta cu: `/categories categorie1, categorie2`",
                reply_markup=get_markup(),
                parse_mode=ParseMode.MARKDOWN,
            )
        return await query.edit_message_text(
            f"Categorii: `{', '.join(categories)}`\n"
            "Pentru a seta categoriile: `/categories categorie1, categorie2`",
            reply_markup=get_markup(),
            parse_mode=ParseMode.MARKDOWN,
        )

    async def get_question(
        self,
        chat_id,
        context: ContextTypes.DEFAULT_TYPE,
        quiz,
    ):
        cat = quiz["questions"][quiz["ci"]]
        category = cat["category"]
        q = cat["questions"]
        question = q[quiz["qi"]]["q"]
        options = q[quiz["qi"]]["options"]
        correct_option = options.index(q[quiz["qi"]]["a"])

        params = {
            "chat_id": chat_id,
            "question": f"{category}\n[{quiz['qi'] + 1}/{len(q)}] {question}",
            "options": options,
            "is_anonymous": False,
            "allows_multiple_answers": False,
            "type": Poll.QUIZ,
            "correct_option_id": correct_option,
        }
        quiz["answers"] = {}
        quiz["correct_option"] = correct_option
        await self.set_quiz(chat_id, quiz)

        await asyncio.sleep(2)
        message = await self.client.safe_send(context.bot.send_poll, **params)

        payload = {
            message.poll.id: {"chat_id": chat_id, "message_id": message.message_id}
        }

        return context.bot_data.update(payload)

    def get_quiz(self, chat_id: int) -> dict:
        return self.client.redis.get(f"quiz:{chat_id}")

    async def play(self, chat_id, context, query, quiz):
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if not quiz.get("players"):
            return await self.client.safe_send(
                query.edit_message_text,
                text="Nu sunt jucatori inregistrati.\n"
                "Apasa 🫡 sa te inregistrezi\n"
                f"{now}",
                reply_markup=get_markup(),
                parse_mode=ParseMode.MARKDOWN,
            )
        await self.client.safe_send(
            query.edit_message_text,
            text=f"Quiz inceput la: {now}\nJucatori: {', '.join(quiz['players'])}",
            reply_markup=get_markup(),
        )
        await self.set_quiz(chat_id, quiz)
        return await self.get_question(chat_id, context, quiz)

    async def receive_poll_answer(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        answer = update.poll_answer
        try:
            bot_data = context.bot_data[answer.poll_id]
        except KeyError:
            logger.info("Old poll")
            return

        chat_id = bot_data["chat_id"]

        player = answer.user.full_name
        answer = answer.option_ids[0]  # single choice

        quiz = self.get_quiz(chat_id)

        quiz["answers"][player] = answer
        if answer == quiz["correct_option"]:
            quiz["players"][player] += 1

        if set(quiz["answers"]) == set(quiz["players"]):
            await self.client.safe_send(
                context.bot.send_poll, message_id=bot_data["message_id"]
            )

        max_ci = len(quiz["questions"])
        max_qi = len(quiz["questions"][quiz["ci"]]["questions"])
        if quiz["qi"] + 1 >= max_qi:
            scores = "\n".join(f"{p}: {s}" for p, s in quiz["players"].items())
            if quiz["ci"] + 1 >= max_ci:  # Done
                await self.client.safe_send(
                    context.bot.send_message,
                    chat_id=chat_id,
                    text=f"Done! 🎉\n<b>Results</b>\n{scores}",
                    parse_mode=ParseMode.HTML,
                )
                return  # completed all the questions
            quiz["ci"] += 1
            quiz["qi"] = 0
            await self.client.safe_send(
                context.bot.send_message,
                chat_id=chat_id,
                text=f"{quiz['ci']} / {max_ci} "
                f"categories completed\n"
                f"Current score\n{scores}",
            )
        else:
            quiz["qi"] += 1

        await self.set_quiz(chat_id, quiz)

        return await self.get_question(chat_id, context, quiz)

    @staticmethod
    async def regenerate(query, quiz):
        if not (categories := quiz.get("categories")):
            categories = DEFAULT_CATEGORIES

        await query.edit_message_text(
            "Generating questions...",
            parse_mode=ParseMode.HTML,
            reply_markup=get_markup(),
        )

        old_qs_text = ""
        if quiz.get("questions"):
            old_qs = [
                q["q"]
                for q in itertools.chain(
                    *(cat["questions"] for cat in quiz["questions"])
                )
            ]
            old_qs_text = (
                f"f(total diferite de cele vechi care sunt urmatoarele: {old_qs})"
            )

        try:
            response = generate_content(
                prompt=f"""
                    Genereaza un quiz standard cu intrebari noi {old_qs_text} pentru
                    urmatoarele categorii:
                    {', '.join(categories)}
                    Fiecare categorie continand cate 6 intrebari.
                    Pentru fiecare intrebare vreau cate 4 variante de raspuns
                    din care doar 1 singura corecta
                    Raspunsul trebuie sa fie
                     de maxim 2000 de caractere
                     in format json
                     pe o singura linie
                     fara formatare sau stilizare de genul ```json ```
                     sau escape char e.g. \\n
                     sa il pot incarca cu json.loads
                     dupa cum urmeaza:
                        {{
                            'data': [
                                {{
                                    'category': <categorie1>,
                                    'questions': [
                                        {{
                                            'q': <intrebarea1>,
                                            'a': <raspunsul1>,
                                            'options': [
                                                <option1>,
                                                <option2>,
                                                <option3>,
                                                <option4>
                                            ]
                                        }},
                                    ],
                                }}
                            ]
                        }}

                    """,
                max_output_tokens=2000,
                temperature=0.5,
            )
        except GeminiError as e:
            logger.exception(e)
            return query.edit_message_text(
                "Eroare la generarea intrebarilor",
                parse_mode=ParseMode.HTML,
                reply_markup=get_markup(),
            )

        try:
            quiz["questions"] = json.loads(response)["data"]
        except (json.JSONDecodeError, IndexError) as e:
            logger.exception(e)
            return await query.edit_message_text(
                "Eroare la procesarea intrebarilor",
                parse_mode=ParseMode.HTML,
                reply_markup=get_markup(),
            )

        return quiz

    async def reset(self, query: telegram.CallbackQuery, quiz=None):
        quiz = {"categories": DEFAULT_CATEGORIES, **(quiz or {}), "ci": 0, "qi": 0}
        quiz = await self.regenerate(query, quiz)
        await self.set_quiz(query.message.chat.id, quiz)
        await query.edit_message_text(
            "S-a creat un quiz nou\n"
            "Apasa ca 🫡 sa te alaturi\n"
            f"Categoriile sunt: {', '.join(quiz['categories'])}\n"
            "Categoriile se pot seta cu: `/categories categorie1, categorie2`",
            reply_markup=get_markup(),
            parse_mode=ParseMode.MARKDOWN,
        )
        return quiz

    async def restart(self, chat_id, quiz, query, now):
        quiz["ci"], quiz["qi"] = 0, 0
        for player, _ in quiz["players"].items():
            quiz["players"][player] = 0
        await self.set_quiz(chat_id, quiz)
        await query.edit_message_text(
            f"Scorul s-a resetat la: {now}\nApasa 🔥 pentru intrebari noi",
            parse_mode=ParseMode.HTML,
            reply_markup=get_markup(),
        )

    async def set_quiz(self, chat_id, quiz):
        self.client.redis.set(f"quiz:{chat_id}", quiz)


class BotClient(BaseBotClient):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.handler = Handler(self)

    async def handle_callback_query(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ):  # noqa: C901, PLR0911, PLR0912
        query = update.callback_query
        chat_id = update.effective_chat.id
        await query.answer()

        if query.data == "end":
            return await query.edit_message_text("See you next time!")

        if not (quiz := self.handler.get_quiz(chat_id)):
            quiz = await self.handler.reset(query)

        if query.data == "categories":
            return await self.handler.categories(query, quiz)

        now = datetime.datetime.now().strftime("%d.%m.%Y %H:%M:%S")
        if query.data == "play":
            return await self.handler.play(chat_id, context, query, quiz)

        if query.data == "ready":
            new_player = update.effective_user.full_name
            if "players" not in quiz:
                action = "s-a alaturat"
                quiz["players"] = {new_player: 0}
            elif new_player not in quiz["players"]:
                action = "s-a alaturat"
                quiz["players"][new_player] = 0
            else:
                action = "a renuntat"
                del quiz["players"][new_player]
            await self.handler.set_quiz(chat_id, quiz)
            players_text = (
                f"Jucatori: {', '.join(list(quiz['players']))}"
                if list(quiz["players"])
                else "Nu sunt jucatori inregistrati"
            )
            return await query.edit_message_text(
                f"{new_player} {action}\n{players_text}",
                reply_markup=get_markup(),
                parse_mode=ParseMode.HTML,
            )

        if query.data == "reset":
            return await self.handler.reset(query, quiz)

        if query.data == "restart":
            await self.handler.restart(chat_id, quiz, query, now)

    async def handle_categories(self, update: Update, _: ContextTypes.DEFAULT_TYPE):
        message = update.effective_message
        chat_id = update.effective_chat.id
        quiz = self.handler.get_quiz(chat_id)
        if categories := message.text.lstrip("/categories "):  # noqa: B005
            quiz["categories"] = [c.strip() for c in categories.split(",")]
            return self.handler.set_quiz(f"quiz:{chat_id}", quiz)
        await self.reply(message, "Pentru a seta: `/categories categorie1, categorie2`")

    async def handle_start(self, update: Update, _: ContextTypes.DEFAULT_TYPE):
        message = update.effective_message
        await self.reply(
            message,
            "Bun venit la quiz",
            reply_markup=get_markup(),
            parse_mode=ParseMode.HTML,
        )


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger.info("Starting quiz bot polling")
        config = environ.Env()
        if not (token := config("TELEGRAM_QUIZ_TOKEN")):
            logger.error("Missing telegram quiz bot token")
            return

        client = BotClient(logger)
        application = Application.builder().token(token).build()
        application.add_handler(CallbackQueryHandler(client.handle_callback_query))
        application.add_handler(PollAnswerHandler(client.handler.receive_poll_answer))
        application.add_handler(CommandHandler("categories", client.handle_categories))
        application.add_handler(CommandHandler("start", client.handle_start))
        application.run_polling(allowed_updates=Update.ALL_TYPES)
