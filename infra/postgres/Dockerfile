FROM timescale/timescaledb:latest-pg16

ARG PGVECTOR_VERSION=v0.8.2

RUN set -eux; \
    if command -v apk >/dev/null 2>&1; then \
        apk add --no-cache --virtual .build-deps \
            build-base \
            clang19 \
            git \
            llvm19 \
            postgresql16-dev; \
        apk add --no-cache ca-certificates; \
        update-ca-certificates; \
    elif command -v apt-get >/dev/null 2>&1; then \
        apt-get update; \
        apt-get install -y --no-install-recommends \
            build-essential \
            ca-certificates \
            git \
            postgresql-server-dev-16; \
        update-ca-certificates; \
    else \
        echo "Unsupported base image: no apk or apt-get found" >&2; \
        exit 1; \
    fi; \
    git clone --branch "${PGVECTOR_VERSION}" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector; \
    make -C /tmp/pgvector; \
    make -C /tmp/pgvector install; \
    rm -rf /tmp/pgvector; \
    if command -v apk >/dev/null 2>&1; then \
        apk del .build-deps; \
    else \
        apt-get purge -y --auto-remove \
            build-essential \
            git \
            postgresql-server-dev-16; \
        rm -rf /var/lib/apt/lists/*; \
    fi
