FROM python:3.13 AS builder

RUN mkdir /app

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip 

COPY requirements.txt /app/

RUN apt update && apt install -y ca-certificates python3-dev default-libmysqlclient-dev default-mysql-client build-essential pkg-config libmariadb3 libmariadb-dev mariadb-client && update-ca-certificates

RUN pip install --force --no-cache --no-cache-dir -r requirements.txt

FROM python:3.13

RUN useradd -m -r appuser && \
   mkdir /app && \
   chown -R appuser /app

RUN apt update && apt install -y ca-certificates gosu && update-ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.13/site-packages/ /usr/local/lib/python3.13/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

WORKDIR /app

COPY --chown=appuser:appuser . .

EXPOSE 1337

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-1337} --workers ${WEB_CONCURRENCY:-3} backend.wsgi:application"]
