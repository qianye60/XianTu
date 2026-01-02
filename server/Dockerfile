FROM python:3.12-slim

WORKDIR /app

COPY server/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY server /app

ENV PYTHONUNBUFFERED=1
EXPOSE 12345

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "12345"]
