#!/bin/sh
# Exit immediately if a command exits with a non-zero status
set -e

echo "Corriendo las migraciones de la base de datos..."
uv run alembic upgrade head
echo "Corriendo la seed..."
uv run python -m scripts.seed

echo "Starting application..."
# Executes whatever command is passed to the container (your CMD)
exec "$@"