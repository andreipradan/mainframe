journalctl --follow -o cat  -u backend.service \
                            -u bot.service \
                            -u quiz.service \
                            -u huey.service \
                            -u nginx \
                            -u ngrok.service \
                            -u redis.service
