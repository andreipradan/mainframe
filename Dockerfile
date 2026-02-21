FROM python:3.10.11-alpine AS builder

ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache --virtual .tmp-build-deps \
        build-base \
        linux-headers \
    && mkdir -p /temp_requirements

# README.md is needed since it's mentioned in the pyproject.toml
COPY pyproject.toml README.md /temp_requirements/
RUN PYTHONDONTWRITEBYTECODE=1 \
    pip install --no-cache-dir /temp_requirements \
    && rm -rf /temp_requirements \
    && apk del .tmp-build-deps \
    && rm -rf /var/cache/apk/*

FROM python:3.10.11-alpine
ENV PYTHONUNBUFFERED=1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /usr/local/lib/python3.10/site-packages/ /usr/local/lib/python3.10/site-packages/
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn

WORKDIR /app
COPY src gunicorn.config.py ./

USER appuser

CMD ["/bin/sh", "-c", "gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT"]
