FROM python:3.10.11-alpine

ENV PYTHONUNBUFFERED 1
RUN apk add --update --no-cache --virtual .tmp-build-deps build-base linux-headers  # for psutil

COPY requirements.lock /temp_requirements/
RUN PYTHONDONTWRITEBYTECODE=1 pip install --no-cache-dir -r  /temp_requirements/requirements.lock && rm -rf /temp_requirements/

WORKDIR /app
COPY src gunicorn.config.py ./

COPY --from=datadog/serverless-init:1 /datadog-init /app/datadog-init
RUN pip install --target /dd_tracer/python/ ddtrace
ENTRYPOINT ["/app/datadog-init"]

CMD exec /dd_tracer/python/bin/ddtrace-run gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT
