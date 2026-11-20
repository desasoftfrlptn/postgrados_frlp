from src.usuarios.seguridad import hash_password, verificar_password
import pytest

def test_contraseña_correcta_verificada():
    contraseña = "ClavePrueba"
    
    resultado = hash_password(contraseña)
    assert resultado != contraseña
    assert verificar_password(contraseña, resultado) is True
    
def test_contraseña_incorrecta_no_verificada():
    contrasena = "Clave123"
    
    resultado = hash_password(contrasena)
    assert resultado != contrasena
    assert verificar_password("ClaveFalsa", resultado) is False
    
def test_contraseña_vacia_procude_error():
    with pytest.raises(ValueError):
        hash_password("")
        
def test_misma_contrasena_genera_hashes_distintos():
    contraseña = "Prueba1"
    
    hash1 = hash_password(contraseña)
    hash2 = hash_password(contraseña)
    
    assert hash1 != hash2
    assert verificar_password(contraseña, hash1) is True
    assert verificar_password(contraseña, hash2) is True