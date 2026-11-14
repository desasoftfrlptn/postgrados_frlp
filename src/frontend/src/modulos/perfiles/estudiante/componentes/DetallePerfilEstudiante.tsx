interface DetallePerfilEstudianteProps {
  carrera: string;
  cohorte: string;
}

export default function DetallePerfilEstudiante({
  carrera,
  cohorte,
}: DetallePerfilEstudianteProps) {
  return (
    <section>
      <h2>Información académica</h2>

      <div className="mi-perfil-carrera">
        {carrera}
      </div>

      <dl className="mi-perfil-indicadores">
        <div>
          <dt>Cohorte</dt>
          <dd>{cohorte}</dd>
        </div>

        <div>
          <dt>Materias de la carrera</dt>
          <dd>17</dd>
        </div>

        <div>
          <dt>Seminarios aprobados</dt>
          <dd>13</dd>
        </div>

        <div>
          <dt>Avance</dt>
          <dd>40%</dd>
        </div>
      </dl>
    </section>
  );
}