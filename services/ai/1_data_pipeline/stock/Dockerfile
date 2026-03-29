# KOSPI 200 데이터 파이프라인 — Python 3.14
FROM python:3.14-slim

LABEL maintainer="장호정 <ghwjd32123@gmail.com>"
LABEL description="KOSPI 200 주식 데이터 수집·가공·검증 파이프라인"

# 시스템 의존성 (최소)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && curl -sSL https://rclone.org/install.sh | bash \
    && apt-get purge -y unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 복사 (Docker 레이어 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 데이터 저장 경로 (볼륨 마운트 대상)
RUN mkdir -p /data/raw /data/processed /data/logs

# rclone 설정 (외부에서 마운트)
RUN mkdir -p /root/.config/rclone

# 기본 BASE_PATH를 컨테이너 내부 경로로 설정
ENV BASE_PATH=/data
ENV PYTHONUNBUFFERED=1

# 헬스체크
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD python -c "import pandas; import pykrx; print('ok')" || exit 1

# 기본 실행: 증분 수집
CMD ["python", "pipeline.py", "--mode", "incremental"]
