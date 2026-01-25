FROM python:3.10.11-alpine

ENV PYTHONUNBUFFERED 1
RUN apk add --update --no-cache --virtual .tmp-build-deps build-base linux-headers  # for psutil

COPY pyproject.toml /temp_requirements/
RUN echo "foo" > /temp_requirements/README.md  # some build systems require a README
RUN PYTHONDONTWRITEBYTECODE=1 pip install --no-cache-dir /temp_requirements && rm -rf /temp_requirements/
WORKDIR /app
COPY src gunicorn.config.py ./

CMD exec gunicorn -c gunicorn.config.py --bind 0.0.0.0:$PORT
