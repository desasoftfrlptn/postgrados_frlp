#!/bin/sh
set -eu

alembic upgrade head

if [ "${ENVIRONMENT:-development}" = "development" ]; then
    python -m scripts.seed
fi

exec "$@"
