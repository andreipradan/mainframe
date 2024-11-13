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


class BotClient(BaseBotClient):
    def ask_question(self, update, quiz):
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
            update.effective_chat.send_message(
                f"Done!\nResults: {scores}\n" f"Hit /restart for a new one"
            )
            return

        category = questions[ci]["category"]
        question = questions[ci]["questions"][qi]["q"]
        options = questions[ci]["questions"][qi]["options"]
        update.effective_chat.send_message(
            f"❓[{ci + 1}/6] <b>{category}</b> - "
            f"[{qi + 1}/6] "
            f"{question}\n\nAnswers: [0/{len(quiz)}]",
            reply_markup=get_reply_markup(options, ci, qi),
            parse_mode=telegram.ParseMode.HTML,
        )
        quiz["current"] = {"ci": ci, "qi": qi, "answers": {}}
        self.redis.set("quiz", quiz)

    def handle_callback_query(self, update: Update, *_, **__):
        query = update.callback_query
        query.answer()

        if query.data == "end":
            return query.edit_message_text("See you next time!")

        if query.data == "restart":
            return self.handle_restart(update, *_, **__)

        category, question, *answer = query.data.split()
        user = update.effective_user.full_name
        quiz = self.redis.get("quiz")
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
            answer = f"Correct: <b>{correct_answer}</b>"
            query.edit_message_text(
                f"{category_and_question}\n{answer}\n{results}",
                parse_mode=telegram.ParseMode.HTML,
            )
            self.ask_question(update, quiz)

    def handle_categories(self, update: Update, *_, **__):
        message = update.effective_message
        quiz = self.redis.get("quiz")
        if categories := message.text.lstrip("/categories "):  # noqa: B005
            quiz["categories"] = categories
            return self.redis.set("quiz", quiz)

        if not (categories := quiz.get("categories")):
            return self.reply(
                message,
                "Categoriile nu sunt definite.\n"
                "Se pot seta cu: /categories categorie1, categorie2",
            )
        self.reply(message, f"Categoriile sunt: {', '.join(categories)}")

    def handle_new(self, update: Update, *_, **__):
        self.reset(update.effective_message)

    def handle_ready(self, update: Update, *_, **__):
        new_player = update.effective_user.full_name
        quiz = self.redis.get("quiz") or {}
        players = quiz.get("players", {})
        if new_player in players:
            return self.reply(update.effective_message, "You're already registered")
        players[new_player] = 0
        self.redis.set("quiz", quiz)
        self.reply(
            update.effective_message,
            f"{new_player} joined\nCurrent players: {', '.join(list(players))}",
        )

    def handle_regenerate_questions(self, update: Update, *_, **__):
        quiz = self.redis.get("quiz")
        self.regenerate_questions(update.effective_message, quiz)

    def handle_restart(self, update: Update, *_, **__):
        quiz = self.redis.get("quiz")
        quiz["current"] = {}
        for player, _ in quiz["players"].items():
            quiz["players"][player] = 0

        self.redis.set("quiz", quiz)
        text = (
            "Scores cleared, hit /start for a new quiz\n"
            "Hit /regenerate for new questions"
        )
        try:
            update.effective_message.edit_text(text)
        except telegram.error.BadRequest:
            update.effective_message.bot.send_message(update.effective_chat.id, text)

    def handle_start(self, update: Update, *_, **__):
        message = update.effective_message
        if not (quiz := self.redis.get("quiz")):
            quiz = self.reset(message)

        if not quiz.get("players"):
            return self.reply(message, "No players registered. Register doing /ready ")

        self.reply(message, "Starting in 3...")
        time.sleep(1)
        self.reply(message, "Starting in 2...")
        time.sleep(1)
        self.reply(message, "Starting in 1...")
        time.sleep(1)

        self.ask_question(update, quiz)

    def handle_status(self, update: Update, *_, **__):
        if not (quiz := self.redis.get("quiz")):
            return self.reply(
                update.effective_message,
                "No players registered. Register doing /ready ",
            )

        status = "\n".join(f"{player}: {score}" for player, score in quiz.items())
        self.reply(update.effective_message, f"<b>Current status</b>\n{status}")

    def regenerate_questions(self, message: telegram.Message, quiz):
        if not (categories := quiz.get("categories")):
            categories = DEFAULT_CATEGORIES

        self.reply(message, "Generating questions...")

        try:
            response = generate_content(
                prompt=f"""
                Genereaza un quiz standard cu intrebari noi pentru
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
                        'questions': [
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
                temperature=0,
            )
        except GeminiError as e:
            self.logger.exception(e)
            return self.reply(message, "Got an error trying to process your message")

        try:
            quiz["questions"] = json.loads(response)["questions"]
        except (json.JSONDecodeError, IndexError) as e:
            self.logger.exception(e)
            return self.reply(message, "Eroare la generarea intrebarilor")

        self.redis.set("quiz", quiz)
        return quiz

    def reset(self, message: telegram.Message):
        quiz = {"categories": DEFAULT_CATEGORIES, "current": {}, "players": {}}
        quiz = self.regenerate_questions(message, quiz)
        self.redis.set(key="quiz", value=quiz)
        self.reply(
            message,
            "S-a creat un quiz nou\n"
            "Sa te alaturi: /ready\n"
            "Categoriile: /categories\n"
            "Seteaza toate categoriile: /categories categorie1, categorie2",
        )
        return quiz


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
        dp.add_handler(CommandHandler("new", client.handle_new))
        dp.add_handler(CommandHandler("ready", client.handle_ready))
        dp.add_handler(CommandHandler("regenerate", client.handle_regenerate_questions))
        dp.add_handler(CommandHandler("restart", client.handle_restart))
        dp.add_handler(CommandHandler("start", client.handle_start))
        dp.add_handler(CommandHandler("status", client.handle_status))
        dp.add_handler(CallbackQueryHandler(client.handle_callback_query))
        updater.start_polling()
        updater.idle()
