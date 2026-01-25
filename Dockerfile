FROM ghcr.io/astral-sh/uv:0.9.26-python3.13-alpine

ENV PYTHONUNBUFFERED 1
RUN apk add --update --no-cache --virtual .tmp-build-deps build-base linux-headers  # for psutil

WORKDIR /app
RUN uv sync
COPY src gunicorn.config.py ./

CMD exec gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT
