"""Tabla de usuarios del sistema (login de coordinador, CPR, docente, etc.)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database.connection import Base

from sqlalchemy import DateTime, ForeignKey

# Los mismos roles que el tipo Rol de frontend/src/shared/types/types.ts
# El aspirante no tiene usuario: entra por links con sus datos, sin iniciar sesión.
ROLES = ("docente", "admin", "coordinador", "cpr", "estudiante")


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("rol IN (" + ", ".join(f"'{r}'" for r in ROLES) + ")", name="rol_valido"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nombre: Mapped[str] = mapped_column(String(201)) # Cambio a 201 que es el máximo de la concatenación de nombre + " " + apellido
    email: Mapped[str] = mapped_column(String(255), unique=True)
    # Solo el hash. La contraseña en texto plano NUNCA se guarda (por eso no existe password_plano).
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(20))
    activo: Mapped[bool] = mapped_column(server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ (timestamp con zona)
        default=lambda: datetime.now(timezone.utc),
    )
class SesionRefresh(Base):
    __tablename__ = "sesiones_refresh"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
    )
    revocada_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
    )
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
    )

class InvitacionCuenta(Base):
    __tablename__ = "invitaciones_cuenta"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expira_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usada_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ (timestamp con zona)
        default=lambda: datetime.now(timezone.utc),
    )