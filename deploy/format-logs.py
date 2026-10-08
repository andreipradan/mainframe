import json
import os
import sys

COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[1;31m",
}
RESET = "\033[0m"
USE_COLORS = sys.stdout.isatty() and "NO_COLOR" not in os.environ

for line in sys.stdin:
    try:
        record = json.loads(line)
    except json.JSONDecodeError:
        sys.stdout.write(line)
        sys.stdout.flush()
        continue

    if not isinstance(record, dict) or "event" not in record:
        sys.stdout.write(line)
        sys.stdout.flush()
        continue

    level = str(record.get("level", "INFO")).upper()
    color = COLORS.get(level, "") if USE_COLORS else ""
    styled_level = f"{color}{level:8}{RESET}" if color else f"{level:8}"
    timestamp = record.get("timestamp", "")
    logger = record.get("logger", "")
    event = str(record["event"]).replace("\n", "\n    ")
    print(f"{timestamp} {styled_level} [{logger}] {event}", flush=True)
