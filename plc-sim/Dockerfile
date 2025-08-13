FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY simulator.py ./

ENV SITE_ID="wtp-porto-01"

CMD ["python", "-u", "simulator.py"]

