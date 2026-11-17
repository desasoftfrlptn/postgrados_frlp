from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from src.authentication.infrastructure import models as _authentication_models
from src.carga_academica.infraestructura import modelos as _modelos_carga_academica
from src.inscripcion.infrastructure import models as _inscripcion_models
from src.seguimiento_graduacion.infraestructura import modelos as _modelos_graduacion
from src.shared.auditoria import modelos as _modelos_auditoria
from src.shared.limite_solicitudes import modelos as _modelos_limite_solicitudes
