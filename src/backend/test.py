import os

ruta_base = os.path.join(os.path.dirname(__file__), "src", "autenticacion", "infraestructura", "orm_model.py")

print("Buscando en:", ruta_base)
if os.path.exists(ruta_base):
    print("✅ ¡El archivo EXISTE!")
else:
    print("❌ El archivo NO EXISTE en esta ruta exacta.")