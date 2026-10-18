FROM python:3.14.3-alpine AS builder

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install build dependencies for psutil
RUN apk add --update --no-cache --virtual .tmp-build-deps \
        build-base \
        linux-headers

# Install the locked production dependencies into a virtual environment.
COPY pyproject.toml uv.lock README.md ./
RUN pip install --no-cache-dir uv==0.12.23 \
    && uv sync --locked --no-dev --no-install-project \
    && apk del .tmp-build-deps \
    && rm -rf /var/cache/apk/*

FROM python:3.14.3-alpine

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PATH="/app/.venv/bin:${PATH}"

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY src gunicorn.config.py ./

USER appuser

# healthcheck should target the same port the app binds to (env $PORT set by Cloud Run)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import os,urllib.request; port=os.getenv('PORT','8000'); urllib.request.urlopen(f'http://localhost:{port}/health').read()" || exit 1

CMD ["sh", "-c", "exec gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT"]
