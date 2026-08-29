import type { Cohorte } from '@/shared/types/cohorte';

export const cohortesFixture: Cohorte[] = [
  {
      id: "c1a2b3c4-0001-0000-0000-000000000001",
      anio: 2024,
      nombre: "Cohorte 2024",
      inscripcion_abierta: false,
      fecha_inicio: "2024-03-15"   
    },
    {
      id: "c1a2b3c4-0001-0000-0000-000000000002",
      anio: 2025,
      nombre: "Cohorte 2025",
      inscripcion_abierta: false,
      fecha_inicio: "2025-03-20"
    },
    {
      id: "c1a2b3c4-0001-0000-0000-000000000003",
      anio: 2026,
      nombre: "Cohorte 2026",
      inscripcion_abierta: true,
      fecha_inicio: "2026-04-01"
    }
];
