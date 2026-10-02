01 · Contexto del Dominio
Actualmente la Facultad administra las carreras de posgrado utilizando correos electrónicos, planillas Excel y documentación física. Esto genera problemas de organización, seguimiento y acceso a la información.
El nuevo sistema web deberá centralizar toda la gestión académica y administrativa de aspirantes, estudiantes, docentes y autoridades.
Problemas detectados
    • Inscripciones manuales por correo electrónico. 
    • Documentación almacenada en carpetas físicas. 
    • Seguimiento académico realizado en Excel. 
    • Carga manual de asistencia y notas. 
    • Falta de indicadores automáticos de avance. 
    • Dificultad para generar estadísticas y reportes. 
Objetivos del sistema
    • Digitalizar el proceso de inscripción. 
    • Centralizar legajos académicos. 
    • Automatizar seguimiento de estudiantes. 
    • Permitir carga docente online. 
    • Generar reportes y estadísticas automáticas. 

02 · Identificación de Actores y Épicas
Actores del Sistema
Actor	    Función
Aspirante	    Completa formularios y carga documentación
Estudiante	    Consulta y mantiene su estado académico
Docente	    Registra asistencia y calificaciones
Equipo de Conducción	    Supervisa inscripciones y seguimiento académico
CPR	     Registra información de tesis y resoluciones
Administrador	      Configura y administra el sistema

Épicas del Sistema
ID	    Épica	    Descripción
EP-01	    Gestión de Inscripciones	    Registro de aspirantes y carga documental
EP-02	     Legajo y Perfil Académico	    Seguimiento académico del estudiante
EP-03	     Gestión Docente	    Registro de asistencia y notas
EP-04	     Estadísticas y Reportes	    Generación de indicadores y reportes
EP-05	     Administración del Sistema	    Configuración y control general
03 · Redacción de User Stories
Historias de Usuario
US-01
Como aspirante, quiero completar un formulario de inscripción online, para iniciar mi proceso de admisión.
US-02
Como aspirante, quiero adjuntar documentos PDF, para completar mi legajo digital.
US-03
Como conducción, quiero visualizar el estado del legajo del aspirante, para verificar si está completo.
US-04
Como conducción, quiero listar estudiantes por cohorte, para administrar las inscripciones.
US-05
Como conducción, quiero buscar estudiantes individualmente, para acceder rápidamente a su información.
US-06
Como docente, quiero acceder mediante un enlace a mi planilla, para cargar asistencia y notas.
US-07
Como docente, quiero registrar asistencia por fecha, para actualizar el porcentaje de asistencia del estudiante.
US-08
Como docente, quiero cargar calificaciones finales, para actualizar el estado académico.
US-09
Como conducción, quiero visualizar un perfil académico del estudiante, para consultar su avance.
US-10
Como conducción, quiero visualizar alertas e indicadores de avance, para detectar retrasos académicos.
US-11
Como CPR, quiero registrar datos de tesis y resoluciones, para formalizar la aprobación académica.
US-12
Como conducción, quiero generar estadísticas por cohorte, para analizar el estado de las carreras.

04 · Criterios de Aceptación
US-01
    • DADO que el aspirante completa el formulario, CUANDO presiona “Enviar”, ENTONCES el sistema guarda la información. 
    • DADO que faltan campos obligatorios, CUANDO intenta enviar el formulario, ENTONCES el sistema muestra errores. 
US-02
    • DADO que el aspirante selecciona archivos PDF, CUANDO los adjunta, ENTONCES el sistema los almacena correctamente. 
    • DADO que el archivo no es PDF, CUANDO intenta cargarlo, ENTONCES el sistema rechaza el archivo. 
US-03
    • DADO que conducción accede al panel, CUANDO consulta un aspirante, ENTONCES visualiza el estado del legajo. 
    • DADO que faltan documentos, CUANDO revisa el legajo, ENTONCES el sistema identifica archivos pendientes. 
US-04
    • DADO que conducción selecciona una cohorte, CUANDO realiza la consulta, ENTONCES el sistema muestra los inscriptos. 
    • DADO que existen registros, CUANDO visualiza la lista, ENTONCES puede paginar resultados. 
US-05
    • DADO que conducción ingresa nombre o DNI, CUANDO realiza la búsqueda, ENTONCES el sistema devuelve coincidencias. 
    • DADO que no existen resultados, CUANDO finaliza la búsqueda, ENTONCES el sistema informa que no hay registros. 
US-06
    • DADO que el docente recibe el enlace, CUANDO accede, ENTONCES visualiza su planilla. 
    • DADO que el enlace expiró, CUANDO intenta ingresar, ENTONCES el sistema deniega el acceso. 
US-07
    • DADO que el docente registra asistencia, CUANDO guarda los datos, ENTONCES el sistema actualiza porcentajes. 
    • DADO que existen modificaciones, CUANDO actualiza asistencia, ENTONCES el sistema recalcula automáticamente. 
US-08
    • DADO que el docente carga notas, CUANDO confirma la operación, ENTONCES el sistema actualiza el estado académico. 
    • DADO que la nota es inválida, CUANDO intenta guardar, ENTONCES el sistema muestra error. 
US-09
    • DADO que conducción consulta un estudiante, CUANDO abre el perfil, ENTONCES visualiza seminarios y estado académico. 
    • DADO que existen actualizaciones, CUANDO vuelve a ingresar, ENTONCES el sistema muestra información actualizada. 
US-10
    • DADO que el estudiante presenta retrasos, CUANDO conducción revisa el perfil, ENTONCES el sistema muestra alertas. 
    • DADO que el estudiante cumple requisitos, CUANDO se visualiza el perfil, ENTONCES el indicador aparece en verde. 
US-11
    • DADO que CPR registra una tesis, CUANDO guarda los datos, ENTONCES el sistema almacena director, resolución y fecha. 
    • DADO que faltan campos obligatorios, CUANDO intenta guardar, ENTONCES el sistema informa errores. 
US-12
    • DADO que conducción solicita estadísticas, CUANDO genera el reporte, ENTONCES el sistema muestra información por cohorte. 
    • DADO que existen graduados registrados, CUANDO consulta indicadores, ENTONCES el sistema calcula niveles de desgranamiento. 

05  Historia     	         Story Points	                 Prioridad
US-01	5	Alta
US-02	3	Alta
US-03	3	Alta
US-04	2	Alta
US-05	2	Alta
US-06	3	Media
US-07	5	Alta
US-08	5	Alta
US-09	5	Alta
US-10	3	Media
US-11	5	Alta
US-12	8	Media

06 · Construcción del Product Backlog
ID	Épica	Historia de Usuario	 Criterios de Aceptación	SP	Prioridad	Sprint
US-01	EP-01	Como aspirante, quiero completar un formulario online, para iniciar la inscripción.	Validación y guardado de datos.	5	Alta	1
US-02	EP-01	Como aspirante, quiero adjuntar documentos PDF, para completar mi legajo.	Validación y almacenamiento de archivos.	3	Alta	1
US-03	EP-01	Como conducción, quiero visualizar el estado del legajo, para verificar documentación.	Indicador de completitud.	3	Alta	2
US-04	EP-01	Como conducción, quiero listar estudiantes por cohorte, para administrar inscripciones.	Listado filtrado por cohorte.	2	Alta	2
US-05	EP-01	Como conducción, quiero buscar estudiantes, para acceder rápidamente a sus datos.	Búsqueda por nombre o DNI.	2	Alta	2
US-06	EP-03	Como docente, quiero acceder mediante enlace, para cargar asistencia y notas.	Acceso válido a planilla online.	3	Media	3
US-07	EP-03	Como docente, quiero registrar asistencia, para actualizar porcentajes.	Actualización automática de asistencia.	5	Alta	3
US-08	EP-03	Como docente, quiero cargar notas finales, para actualizar el estado académico.	Registro de calificaciones.	5	Alta	3
US-09	EP-02	Como conducción, quiero visualizar perfiles académicos, para consultar avance estudiantil.	Visualización de estado académico.	5	Alta	4
US-10	EP-02	Como conducción, quiero visualizar alertas académicas, para detectar retrasos.	Indicadores tipo semáforo.	3	Media	4
US-11	EP-02	Como CPR, quiero registrar datos de tesis, para formalizar aprobaciones.	Registro de tesis y resoluciones.	5	Alta	4
US-12	EP-04	Como conducción, quiero generar estadísticas, para analizar el estado de las carreras.	Reportes académicos y cohortes.	8	Media	5
