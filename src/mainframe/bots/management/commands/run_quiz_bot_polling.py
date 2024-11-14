import json
import time

import environ
import telegram
from django.core.management import BaseCommand
from mainframe.clients.bot import BaseBotClient
from mainframe.clients.gemini import GeminiError, generate_content
from mainframe.clients.logs import get_default_logger
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import CallbackQueryHandler, CommandHandler, Updater

DEFAULT_CATEGORIES = [
    "Cultură generală",
    "Istorie",
    "Geografie",
    "Muzică",
    "Surpriză",
    "Filme",
]


def get_reply_markup(options, ci, qi):
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(o, callback_data=f"{ci} {qi} {o}")
                for o in options[:2]
            ],
            [
                InlineKeyboardButton(o, callback_data=f"{ci} {qi} {o}")
                for o in options[2:]
            ],
            [
                InlineKeyboardButton("♻️", callback_data="restart"),
                InlineKeyboardButton("✅", callback_data="end"),
            ],
        ]
    )


def get_start_markup():
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("▶️", callback_data="play"),
                InlineKeyboardButton("🫡", callback_data="ready"),
                InlineKeyboardButton("🗂", callback_data="categories"),
                InlineKeyboardButton("🔥", callback_data="reset"),
                InlineKeyboardButton("♻️", callback_data="restart"),
                InlineKeyboardButton("✅", callback_data="end"),
            ],
        ]
    )


class Handler:
    def __init__(self, logger, query, quiz):
        self.logger = logger
        self.query = query
        self.quiz = quiz

    def handle_categories(self):
        if not (categories := self.quiz.get("categories")):
            return self.query.edit_message_text(
                "Categoriile nu sunt definite.\n"
                "Se pot seta cu: `/categories categorie1, categorie2`",
                reply_markup=get_start_markup(),
                parse_mode=telegram.ParseMode.MARKDOWN,
            )
        return self.query.edit_message_text(
            f"Categorii: `{', '.join(categories)}`\n"
            "Pentru a seta categoriile: `/categories categorie1, categorie2`",
            reply_markup=get_start_markup(),
            parse_mode=telegram.ParseMode.MARKDOWN,
        )

    def handle_play(self):
        if not self.quiz.get("players"):
            self.query.edit_message_text(
                "Nu sunt jucatori inregistrati.\nApasa 🫡 sa te inregistrezi",
                reply_markup=get_start_markup(),
                parse_mode=telegram.ParseMode.MARKDOWN,
            )
            return

        self.query.edit_message_text(
            "Starting in 3...",
            parse_mode=telegram.ParseMode.HTML,
            reply_markup=get_start_markup(),
        )
        time.sleep(1)
        self.query.edit_message_text(
            "Starting in 2...",
            parse_mode=telegram.ParseMode.HTML,
            reply_markup=get_start_markup(),
        )
        time.sleep(1)
        self.query.edit_message_text(
            "Starting in 1...",
            parse_mode=telegram.ParseMode.HTML,
            reply_markup=get_start_markup(),
        )
        time.sleep(1)
        return True

    def handle_regenerate(self):
        if not (categories := self.quiz.get("categories")):
            categories = DEFAULT_CATEGORIES

        self.query.edit_message_text(
            "Generating questions...",
            parse_mode=telegram.ParseMode.HTML,
            reply_markup=get_start_markup(),
        )

        old_qs_text = ""
        if self.quiz.get("questions"):
            old_qs = [q["q"] for q in self.quiz["questions"]]
            old_qs_text = f"f(cele vechi sunt: {old_qs})"

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
            self.logger.exception(e)
            return self.query.edit_message_text(
                "Eroare la generarea intrebarilor",
                parse_mode=telegram.ParseMode.HTML,
                reply_markup=get_start_markup(),
            )

        try:
            self.quiz["questions"] = json.loads(response)["data"]
        except (json.JSONDecodeError, IndexError) as e:
            self.logger.exception(e)
            return self.query.edit_message_text(
                "Eroare la procesarea intrebarilor",
                parse_mode=telegram.ParseMode.HTML,
                reply_markup=get_start_markup(),
            )

        return self.quiz


class BotClient(BaseBotClient):
    def ask_question(self, query: telegram.CallbackQuery, quiz):
        if not (questions := quiz.get("questions")):
            return self.logger.warning("No questions")

        if not (current := quiz.get("current")):
            ci, qi = 0, 0
        else:
            ci, qi = int(current["ci"]), int(current["qi"])

            item = questions[ci]
            if len(item["questions"]) - 1 < qi + 1:
                ci, qi = ci + 1, 0
            else:
                qi += 1

        if ci + 1 > len(questions) or (
            ci + 1 == len(questions) and qi + 1 > len(questions[ci]["questions"])
        ):
            scores = " | ".join(f"{p}: {s}" for p, s in quiz["players"].items())
            query.edit_message_text(
                f"Done!\nResults: {scores}",
                reply_markup=get_start_markup(),
                parse_mode=telegram.ParseMode.HTML,
            )
            return

        category = questions[ci]["category"]
        question = questions[ci]["questions"][qi]["q"]
        options = questions[ci]["questions"][qi]["options"]
        query.edit_message_text(
            f"❓[{ci + 1}/6] <b>{category}</b> - "
            f"[{qi + 1}/6] "
            f"{question}\n\nAnswers: [0/{len(quiz['players'])}]",
            reply_markup=get_reply_markup(options, ci, qi),
            parse_mode=telegram.ParseMode.HTML,
        )
        quiz["current"] = {"ci": ci, "qi": qi, "answers": {}}
        self.set_quiz(query.message.chat_id, quiz)

    def get_quiz(self, chat_id: int) -> dict:
        return self.redis.get(f"quiz:{chat_id}")

    def handle_callback_query(self, update: Update, *_, **__):  # noqa: C901, PLR0911, PLR0912
        query = update.callback_query
        chat_id = update.effective_chat.id
        query.answer()

        if not (quiz := self.get_quiz(chat_id)):
            self.reset(query)

        if query.data == "categories":
            return Handler(self.logger, query, quiz).handle_categories()

        if query.data == "end":
            return query.edit_message_text("See you next time!")

        if query.data == "play":
            if Handler(self.logger, query, quiz).handle_play():
                return self.ask_question(query, quiz)
            return

        if query.data == "ready":
            new_player = update.effective_user.full_name
            players = quiz.get("players", {})
            if new_player in players:
                action = "a renuntat"
                del players[new_player]
                self.set_quiz(chat_id, quiz)
            else:
                players[new_player] = 0
                action = "s-a alaturat"
            players_text = (
                f"Jucatori: {', '.join(list(players))}"
                if list(players)
                else "Nu sunt jucatori inregistrati"
            )
            self.set_quiz(chat_id, quiz)
            return query.edit_message_text(
                f"{new_player} {action}\n{players_text}",
                reply_markup=get_start_markup(),
                parse_mode=telegram.ParseMode.HTML,
            )

        if query.data == "reset":
            return self.reset(query)

        if query.data == "restart":
            quiz["current"] = {}
            for player, _ in quiz["players"].items():
                quiz["players"][player] = 0

            self.set_quiz(chat_id, quiz)
            return query.edit_message_text(
                "Scorul s-a resetat\nApasa 🔥 pentru intrebari noi",
                parse_mode=telegram.ParseMode.HTML,
                reply_markup=get_start_markup(),
            )

        category, question, *answer = query.data.split()
        user = update.effective_user.full_name
        if (answers := quiz["current"]["answers"]) and user in answers:
            return self.logger("User %s already answered", user)

        answers[user] = " ".join(answer)
        questions = quiz.get("questions")
        options = questions[int(category)]["questions"][int(question)]["options"]
        players = quiz["players"]
        category_text = query.message.text.split("-")[0]
        text = query.message.text.replace(category_text, f"<b>{category_text}</b>")
        answers_count = f"Answers: [{len(answers)}/{len(players)}]"
        category_and_question = text.split("\n\n")[0]
        try:
            query.edit_message_text(
                category_and_question + "\n\n" + answers_count,
                reply_markup=get_reply_markup(options, category, question),
                parse_mode=telegram.ParseMode.HTML,
            )
        except telegram.error.BadRequest as e:
            self.logger.exception(e)
            return query.edit_message_text(
                f"{text}\nOld message - not acting",
                parse_mode=telegram.ParseMode.HTML,
                reply_markup=get_reply_markup(options, category, question),
            )

        if set(answers) == set(players):
            current_questions = questions[int(category)]["questions"]
            results = " | ".join(f"{p}: {a}" for p, a in answers.items())
            correct_answer = current_questions[int(question)]["a"]
            for player, answer in answers.items():
                if answer == correct_answer:
                    players[player] += 1
            query.edit_message_text(
                f"{category_and_question}\nCorrect: <b>{correct_answer}</b>\n{results}",
                parse_mode=telegram.ParseMode.HTML,
            )
            self.ask_question(query, quiz)

    def handle_categories(self, update: Update, *_, **__):
        message = update.effective_message
        chat_id = update.effective_chat.id
        quiz = self.get_quiz(chat_id)
        if categories := message.text.lstrip("/categories "):  # noqa: B005
            quiz["categories"] = [c.strip() for c in categories.split(",")]
            return self.set_quiz(f"quiz:{chat_id}", quiz)
        self.reply(message, "Pentru a seta: `/categories categorie1, categorie2`")

    def handle_start(self, update: Update, *_, **__):
        message = update.effective_message
        quiz = self.get_quiz(update.effective_chat.id)

        players = quiz["players"]
        players_text = (
            f"Jucatori: {', '.join(list(players))}"
            if list(players)
            else "Nu sunt jucatori inregistrati"
        )

        self.reply(
            message,
            f"Bun venit la quiz\n{players_text}",
            reply_markup=get_start_markup(),
            parse_mode=telegram.ParseMode.HTML,
        )

    def reset(self, query: telegram.CallbackQuery):
        quiz = {"categories": DEFAULT_CATEGORIES, "current": {}, "players": {}}
        quiz = Handler(self.logger, query, quiz).handle_regenerate()
        self.set_quiz(query.message.chat_id, quiz)
        query.edit_message_text(
            "S-a creat un quiz nou\n"
            "Apasa ca 🫡 sa te alaturi\n"
            f"Categoriile sunt: {', '.join(quiz['categories'])}\n"
            "Categoriile se pot seta cu: `/categories categorie1, categorie2`",
            reply_markup=get_start_markup(),
            parse_mode=telegram.ParseMode.MARKDOWN,
        )

    def set_quiz(self, chat_id, quiz):
        self.redis.set(f"quiz:{chat_id}", quiz)


class Command(BaseCommand):
    def handle(self, *_, **__):
        logger = get_default_logger(__name__)
        logger.info("Starting quiz bot polling")
        config = environ.Env()
        if not (token := config("TELEGRAM_QUIZ_TOKEN")):
            logger.error("Missing telegram quiz bot token")
            return

        updater = Updater(token, use_context=True)
        dp = updater.dispatcher

        client = BotClient(logger=logger)
        # Warning! make sure all handlers are wrapped in is_whitelisted!
        dp.add_handler(CommandHandler("categories", client.handle_categories))
        dp.add_handler(CommandHandler("start", client.handle_start))
        dp.add_handler(CallbackQueryHandler(client.handle_callback_query))
        updater.start_polling()
        updater.idle()
