FROM python:3.10-alpine

ENV PYTHONUNBUFFERED 1
RUN apk add --update --no-cache --virtual .tmp-build-deps \
    gcc libc-dev build-base linux-headers libffi-dev # for google translate (grpcio)
RUN pip install -U pip
COPY requirements.txt /temp_requirements/
RUN pip install --no-cache-dir -r /temp_requirements/requirements.txt && rm -rf /temp_requirements/

WORKDIR /app
COPY . .

CMD exec gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT
