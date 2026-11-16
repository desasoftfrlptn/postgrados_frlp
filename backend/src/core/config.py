from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg2://postgrado_user:cambiar_en_produccion"
        "@localhost:5432/postgrado_dev"
    )
    secret_key: str = "dev-only-change-this-secret"
    jwt_secret: str = "development-only-secret-change-before-deploying"
    jwt_issuer: str = "postgrados-frlp"
    environment: str = "development"
    cors_origin: str = "http://localhost:3000"
    storage_path: Path = Path(__file__).resolve().parents[2] / "storage"
    max_file_size_mb: int = 5
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = False
    email_from: str = "noreply@posgrado.frlp.utn.edu.ar"

    @model_validator(mode="after")
    def validate_jwt_configuration(self) -> "Settings":
        if self.environment.lower() == "production" and (
            len(self.jwt_secret) < 32
            or self.jwt_secret.startswith(("cambiar_en_produccion", "development-only-"))
        ):
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres y no ser un valor de ejemplo")
        return self

    @model_validator(mode="after")
    def validar_secreto_jwt(self) -> "Settings":
        if self.environment.lower() == "production" and (
            len(self.jwt_secret) < 32
            or self.jwt_secret.startswith(
                ("cambiar_en_produccion", "development-only-")
            )
        ):
            raise ValueError(
                "JWT_SECRET debe tener al menos 32 caracteres y no ser un valor de ejemplo"
            )
        return self

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
