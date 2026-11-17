import os

os.environ.setdefault(
    "DATABASE_URL",
   "postgresql://pytest:pytest@127.0.0.1:1/pytest_sin_conexion",
)