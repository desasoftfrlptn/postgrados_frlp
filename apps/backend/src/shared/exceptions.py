class LegajoNoEncontrado(Exception):
    """Excepción lanzada cuando un legajo no existe en la base de datos."""

    def __init__(self, legajo_id: str):
        self.legajo_id = legajo_id
        self.message = f"Legajo con ID {legajo_id} no encontrado"
        super().__init__(self.message)
