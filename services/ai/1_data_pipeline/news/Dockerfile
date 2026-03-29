# 뉴스 데이터 파이프라인
FROM python:3.12-slim

LABEL maintainer="sallaemallae-ai"
LABEL description="KOSPI200 뉴스 수집·전처리·키워드 추출 파이프라인"

# 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 복사 (Docker 레이어 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 출력/데이터 디렉토리 생성
RUN mkdir -p /app/output /app/data

ENV PYTHONUNBUFFERED=1

# 헬스체크
HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD python -c "import aiohttp; import sqlalchemy; print('ok')" || exit 1

# 기본 실행: 일일 크롤러
CMD ["python", "-m", "crawlers.daily"]
