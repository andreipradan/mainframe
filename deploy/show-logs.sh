journalctl --follow -o cat -u backend.service -u nginx -u ngrok.service -u redis.service -u huey.service -u telegram.service
