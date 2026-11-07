import os

ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()

DB_USER: str = os.getenv("DB_USER", "app")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "app")
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"postgresql://{DB_USER}:{DB_PASSWORD}@localhost:5432/fenix_postgrado"
)

CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")