from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from src.inscripcion.infrastructure import models as _inscripcion_models
