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
KEY_COLOR = "\033[36m"
VALUE_COLOR = "\033[33m"
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
    standard_fields = {"event", "timestamp", "logger", "level"}
    parameters = ""
    extra_fields = []
    for key, value in record.items():
        if key in standard_fields:
            continue
        serialized_value = json.dumps(value, ensure_ascii=False, sort_keys=True)
        if USE_COLORS:
            key = f"{KEY_COLOR}{key}{RESET}"
            serialized_value = f"{VALUE_COLOR}{serialized_value}{RESET}"
        extra_fields.append(f"{key}={serialized_value}")
    if extra_fields:
        parameters = f" ({', '.join(extra_fields)})"

    print(f"{timestamp} {styled_level} [{logger}] {event}{parameters}", flush=True)
