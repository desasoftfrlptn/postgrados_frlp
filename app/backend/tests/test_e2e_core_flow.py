from datetime import date
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.auth.security import create_access_token, hash_password
from src.cohortes.models import Cohorte
from src.legajos.models import Documento
from src.shared.models import User

PASSWORD = "Correct-Horse-Battery-42"


async def create_user(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    email: str,
    role: str = "ASPIRANTE",
    nombre: str = "Test",
    apellido: str = "User",
) -> User:
    user = User(
        email=email,
        password_hash=hash_password(PASSWORD),
        nombre=nombre,
        apellido=apellido,
        rol=role,
    )
    async with session_factory() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


def auth_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user)}"}


async def upload_document(
    session_factory: async_sessionmaker[AsyncSession],
    legajo_id: UUID,
    doc_type: str,
) -> None:
    async with session_factory() as session:
        doc = Documento(
            id=uuid4(),
            legajo_id=legajo_id,
            tipo=doc_type,
            path_storage=f"legajos/{legajo_id}/{doc_type.lower()}.pdf",
            nombre_original=f"{doc_type.lower()}.pdf",
            checksum_sha256="b" * 64,
            tamanio_bytes=2048,
        )
        session.add(doc)
        await session.commit()


@pytest.mark.asyncio
async def test_flujo_completo_admision_core_e2e(
    client: AsyncClient,
    test_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Test E2E que valida la integración completa de los casos de uso del Core:
    1. Consulta pública de cohortes abiertas.
    2. Creación y apertura de cohorte oficial por el administrador.
    3. Preinscripción de aspirante con DNI.
    4. Carga documental requerida y envío a revisión.
    5. Observación por coordinación con motivo obligatorio.
    6. Subsanación y re-envío del aspirante.
    7. Aprobación final y emisión del número de legajo descriptivo (YY-CCCC-CC-NNN).
    8. Consulta de auditoría y documentos del estudiante aprobado.
    """
    # Usuarios
    admin = await create_user(
        test_session_factory,
        email="coordinador@posgrado.frlp.utn.edu.ar",
        role="ADMIN_POSGRADO",
        nombre="Coordinador",
        apellido="Posgrado",
    )
    aspirante = await create_user(
        test_session_factory,
        email="aspirante.e2e@example.com",
        role="ASPIRANTE",
        nombre="Carlos",
        apellido="Rodriguez",
    )

    # 1. Admin crea una nueva cohorte oficial según el contrato
    payload_cohorte: dict[str, Any] = {
        "anio": 2026,
        "nombre": "Cohorte 2026 - MISI E2E",
        "carrera": "Maestría en Ingeniería en Sistemas de Información",
        "codigo_carrera": "MISI",
        "numero_cohorte": 1,
        "tipo_carrera": "Maestria",
        "abierta": True,
        "fecha_inicio": "2026-04-01",
    }
    resp_cohorte = await client.post(
        "/api/v1/cohortes",
        json=payload_cohorte,
        headers=auth_header(admin),
    )
    assert resp_cohorte.status_code == 201
    cohorte_id = resp_cohorte.json()["id"]

    # 2. Consulta pública de cohortes (sin autenticación)
    resp_publica = await client.get("/api/v1/cohortes")
    assert resp_publica.status_code == 200
    cohortes_publicas = resp_publica.json()
    assert any(c["id"] == cohorte_id for c in cohortes_publicas)

    # 3. Aspirante se preinscribe en la cohorte creada
    payload_legajo = {
        "cohorte_id": cohorte_id,
        "dni": "35123456",
        "solicita_beca": True,
        "tipo_beca": "100%",
    }
    resp_legajo = await client.post(
        "/api/v1/legajos",
        json=payload_legajo,
        headers=auth_header(aspirante),
    )
    assert resp_legajo.status_code == 201
    legajo_data = resp_legajo.json()
    legajo_id = UUID(legajo_data["id"])
    assert legajo_data["estado"] == "BORRADOR"
    assert legajo_data["numero_legajo"] is None

    # 4. Carga de documentos obligatorios (DNI y Título de Grado)
    await upload_document(test_session_factory, legajo_id, "DNI")
    await upload_document(test_session_factory, legajo_id, "TITULO_GRADO")

    # 5. Aspirante envía el legajo para revisión
    resp_envio = await client.post(
        f"/api/v1/legajos/{legajo_id}/enviar",
        headers=auth_header(aspirante),
    )
    assert resp_envio.status_code == 200
    assert resp_envio.json()["estado"] == "EN_REVISION"

    # 6. Coordinador lista los legajos y encuentra el trámite en revisión
    resp_listado = await client.get(
        "/api/v1/legajos?estado=EN_REVISION",
        headers=auth_header(admin),
    )
    assert resp_listado.status_code == 200
    items = resp_listado.json()["items"]
    assert any(item["id"] == str(legajo_id) for item in items)

    # 7. Coordinador observa el legajo con motivo obligatorio
    resp_obs = await client.patch(
        f"/api/v1/legajos/{legajo_id}/estado",
        json={
            "estado": "OBSERVADO",
            "motivo_observacion": "El escaneo del título no es legible. Por favor re-subir.",
        },
        headers=auth_header(admin),
    )
    assert resp_obs.status_code == 200
    assert resp_obs.json()["estado"] == "OBSERVADO"
    assert "no es legible" in resp_obs.json()["motivo_observacion"]

    # 8. Aspirante corrige y re-envía
    resp_reenvio = await client.post(
        f"/api/v1/legajos/{legajo_id}/enviar",
        headers=auth_header(aspirante),
    )
    assert resp_reenvio.status_code == 200
    assert resp_reenvio.json()["estado"] == "EN_REVISION"

    # 9. Coordinador aprueba el legajo -> Se genera el número descriptivo
    resp_aprobacion = await client.patch(
        f"/api/v1/legajos/{legajo_id}/estado",
        json={"estado": "APROBADO"},
        headers=auth_header(admin),
    )
    assert resp_aprobacion.status_code == 200
    aprobado = resp_aprobacion.json()
    assert aprobado["estado"] == "APROBADO"
    # Formato: 26-MISI-01-001
    assert aprobado["numero_legajo"] == "26-MISI-01-001"
    assert aprobado["fecha_aprobacion"] is not None

    # 10. Auditoría documental y expediente de estudiante
    resp_docs = await client.get(
        f"/api/v1/legajos/{legajo_id}/documentos",
        headers=auth_header(admin),
    )
    assert resp_docs.status_code == 200
    docs = resp_docs.json()
    assert len(docs) == 2
    assert {d["tipo"] for d in docs} == {"DNI", "TITULO_GRADO"}
