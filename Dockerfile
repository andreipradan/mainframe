FROM python:3.14.3-alpine AS builder

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1

# Install build dependencies for psutil
RUN apk add --update --no-cache --virtual .tmp-build-deps \
        build-base \
        linux-headers

# Install Python dependencies
# copy pyproject only; README may not always exist in context so create a stub if absent
COPY pyproject.toml /tmp/
RUN if [ ! -f /tmp/README.md ]; then printf "# dummy\n" > /tmp/README.md; fi \
    && pip install --no-cache-dir /tmp/ \
    && apk del .tmp-build-deps \
    && rm -rf /var/cache/apk/*

FROM python:3.14.3-alpine

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy pre-built Python packages from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages/ /usr/local/lib/python3.10/site-packages/
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn

WORKDIR /app
COPY src gunicorn.config.py ./

USER appuser

# healthcheck should target the same port the app binds to (env $PORT set by Cloud Run)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import os,urllib.request; port=os.getenv('PORT','8000'); urllib.request.urlopen(f'http://localhost:{port}/health').read()" || exit 1

CMD ["sh", "-c", "exec gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT"]
