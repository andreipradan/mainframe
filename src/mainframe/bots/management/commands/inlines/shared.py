import structlog
import telegram

from mainframe.clients.chat import edit_message

logger = structlog.get_logger(__name__)


class BaseInlines:
    @classmethod
    async def end(cls, update):
        bot = update.callback_query.bot
        message = update.callback_query.message
        await edit_message(
            bot,
            chat_id=update.message.chat_id,
            message_id=message.message_id,
            text="See you next time!",
        )

    @classmethod
    def get_markup(cls, **kwargs):
        raise NotImplementedError

    @classmethod
    async def start(cls, update: telegram.Update, **kwargs):
        user = (
            update.callback_query.from_user
            if update.callback_query
            else update.message.from_user
        )

        return await update.callback_query.edit_message_text(
            f"Hi {user.full_name}!",
            reply_markup=cls.get_markup(**kwargs),
        )


def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]
