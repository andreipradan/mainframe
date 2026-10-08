SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

journalctl --follow -o cat  -u backend.service \
                            -u bot.service \
                            -u quiz.service \
                            -u huey.service \
                            -u nginx \
                            -u ngrok.service \
                            -u redis.service \
                            -u wifi-repair.service \
  | python3 -u "${SCRIPT_DIR}/format-logs.py"
