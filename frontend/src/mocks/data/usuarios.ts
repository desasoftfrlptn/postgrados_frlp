import type { User } from "@/shared/types/types";

export const usuariosFixture: User[] = [
    {
      "email": "admin@fenix.test",
      "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/RewHPNn97NRGNTPQG",
      "password_plano": "Admin1234!",
      "rol": "coordinador",
      "nombre": "María González",
      "activo": true
    },
    {
      "email": "docente@fenix.test",
      "password_hash": "$2b$12$XxXxXxXxXxXxXxXxXxXxXeXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX",
      "password_plano": "Docente1234!",
      "rol": "docente",
      "nombre": "Carlos Pérez",
      "activo": true
    },
    {
      "email": "cpr@fenix.test",
      "password_hash": "$2b$12$YyYyYyYyYyYyYyYyYyYyYeYyYyYyYyYyYyYyYyYyYyYyYyYyYyYyY",
      "password_plano": "Cpr1234!",
      "rol": "cpr",
      "nombre": "Laura Martínez",
      "activo": true
    }
]