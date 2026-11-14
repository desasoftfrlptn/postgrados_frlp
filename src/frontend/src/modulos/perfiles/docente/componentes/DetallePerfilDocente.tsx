export default function DetallePerfilDocente() {
  return (
    <section>
      <h2>Información docente</h2>

      <div className="mi-perfil-carrera">
        Docente de Posgrado
      </div>

      <dl className="mi-perfil-indicadores">
        <div>
          <dt>Seminarios asignados</dt>
          <dd>4</dd>
        </div>

        <div>
          <dt>Estudiantes a cargo</dt>
          <dd>183</dd>
        </div>

        <div>
          <dt>Asistencias pendientes</dt>
          <dd>2</dd>
        </div>

        <div>
          <dt>Notas pendientes</dt>
          <dd>2</dd>
        </div>
      </dl>
    </section>
  );
}