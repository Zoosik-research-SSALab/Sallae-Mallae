FROM timescale/timescaledb:latest-pg16

ARG PGVECTOR_VERSION=v0.8.2

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        git \
        postgresql-server-dev-16 \
    && git clone --branch "${PGVECTOR_VERSION}" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && make -C /tmp/pgvector \
    && make -C /tmp/pgvector install \
    && rm -rf /tmp/pgvector \
    && apt-get purge -y --auto-remove \
        build-essential \
        git \
        postgresql-server-dev-16 \
    && rm -rf /var/lib/apt/lists/*
