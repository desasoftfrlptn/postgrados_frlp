"""Tabla de usuarios del sistema (login de coordinador, CPR, docente, etc.)."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database.connection import Base

# Los mismos roles que el tipo Rol de frontend/src/shared/types/types.ts
ROLES = ("aspirante", "docente", "admin", "coordinador", "cpr", "estudiante")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("rol IN (" + ", ".join(f"'{r}'" for r in ROLES) + ")", name="rol_valido"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nombre: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    # Solo el hash. La contraseña en texto plano NUNCA se guarda (por eso no existe password_plano).
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
