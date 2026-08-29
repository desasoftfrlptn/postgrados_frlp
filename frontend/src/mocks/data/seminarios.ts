import type { Seminario } from '@/shared/types/seminario';

export const seminariosFixture: Seminario[] = [
  {
      id: "sem-001",
      nombre: "Metodología de la Investigación",
      codigo: "MET-001",
      horas_catedra: 32,
      es_obligatorio: true,
      docente: "Dr. Alejandro Vega",
      email_docente: "a.vega@frlp.utn.edu.ar"
    },
    {
      id: "sem-002",
      nombre: "Gestión de Proyectos de Software",
      codigo: "GPS-001",
      horas_catedra: 32,
      es_obligatorio: true,
      docente: "Mg. Patricia Ruiz",
      email_docente: "p.ruiz@frlp.utn.edu.ar"
    },
    {
      id: "sem-003",
      nombre: "Arquitectura de Software",
      codigo: "ARQ-001",
      horas_catedra: 48,
      es_obligatorio: true,
      docente: "Ing. Marcelo Díaz",
      email_docente: "m.diaz@frlp.utn.edu.ar"
    },
    {
      id: "sem-004",
      nombre: "Seguridad en Sistemas de Información",
      codigo: "SEG-001",
      horas_catedra: 32,
      es_obligatorio: false,
      docente: "Esp. Laura Jiménez",
      email_docente: "l.jimenez@frlp.utn.edu.ar"
    }
];
