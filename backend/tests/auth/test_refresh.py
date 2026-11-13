from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4
from hashlib import sha256

import pytest

from src.shared.auth.refresh import renovar_sesion


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "caso",
    [
        "sesion_inexistente",
        "sesion_revocada",
        "sesion_vencida",
        "usuario_inexistente",
        "usuario_inactivo",
    ],
)
async def test_renovar_sesion_rechaza_acceso_invalido(caso):
    ahora = datetime.now(timezone.utc)
    sesion = SimpleNamespace(
        usuario_id=uuid4(),
        revocada_en=None,
        fecha_expiracion=ahora + timedelta(days=1),
    )
    usuario = SimpleNamespace(id=sesion.usuario_id, activo=True)

    if caso == "sesion_inexistente":
        sesion = None
    elif caso == "sesion_revocada":
        sesion.revocada_en = ahora
    elif caso == "sesion_vencida":
        sesion.fecha_expiracion = ahora - timedelta(days=1)
    elif caso == "usuario_inexistente":
        usuario = None
    elif caso == "usuario_inactivo":
        usuario.activo = False

    resultado = Mock()
    resultado.scalar_one_or_none.return_value = sesion
    db = SimpleNamespace(
        execute=AsyncMock(return_value=resultado),
        get=AsyncMock(return_value=usuario),
        add=Mock(),
        commit=AsyncMock(),
    )

    with pytest.raises(ValueError, match="Sesión inválida o vencida"):
        await renovar_sesion(db, "refresh-token-de-prueba")

    db.add.assert_not_called()
    db.commit.assert_not_awaited()

@pytest.mark.asyncio
async def test_renovar_sesion_revoca_token_anterior_y_crea_otro(monkeypatch):
    ahora = datetime.now(timezone.utc)
    usuario = SimpleNamespace(id=uuid4(), activo=True)
    sesion_anterior = SimpleNamespace(
        usuario_id=usuario.id,
        revocada_en=None,
        fecha_expiracion=ahora + timedelta(days=1),
    )
    token_anterior = "refresh-token-anterior"

    resultado = Mock()
    resultado.scalar_one_or_none.return_value = sesion_anterior
    db = SimpleNamespace(
        execute=AsyncMock(return_value=resultado),
        get=AsyncMock(return_value=usuario),
        add=Mock(),
        commit=AsyncMock(),
    )
    monkeypatch.setenv("JWT_REFRESH_EXPIRATION", "7d")
    crear_access_token = Mock(return_value="access-token-de-prueba")
    monkeypatch.setattr(
        "src.shared.auth.refresh.crear_token_acceso",
        crear_access_token,
    )

    access_token, refresh_token = await renovar_sesion(db, token_anterior)

    assert access_token == "access-token-de-prueba"
    crear_access_token.assert_called_once_with(usuario.id)
    assert refresh_token != token_anterior
    assert sesion_anterior.revocada_en is not None

    db.add.assert_called_once()
    sesion_nueva = db.add.call_args.args[0]
    assert sesion_nueva.usuario_id == usuario.id
    assert sesion_nueva.token_hash == sha256(refresh_token.encode("utf-8")).hexdigest()
    db.commit.assert_awaited_once()