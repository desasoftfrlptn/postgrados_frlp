1. RELEVAMIENTO Y ELICITACIÓN DE REQUERIMIENTOS
Descripción general del problema o necesidad
Actualmente, el proceso de solicitud, inscripción y seguimiento académico de las carreras de
posgrado se realiza de forma manual y fragmentada. El flujo actual depende del envío de correos
electrónicos con formularios y documentación adjunta. Esta documentación es revisada por el equipo
de conducción y luego cargada manualmente en planillas de Excel para armar carpetas de archivo.
Una vez iniciada la cursada, la información académica también se cruza manualmente usando
fórmulas de Excel, planillas de asistencia y actas enviadas por los docentes. Este manejo manual
genera ineficiencias, por lo que la Facultad requiere desarrollar un sistema web que centralice la
gestión integral de la información académica y administrativa.
Identificación de stakeholders y usuarios objetivo
Aspirantes: Personas que solicitan información y completan los formularios para ingresar a una
carrera de posgrado.
Estudiantes: Aspirantes que ya han sido admitidos y cuentan con un perfil académico y un
registro de calificaciones.
Docentes: Profesores a cargo de los seminarios que deben registrar asistencias y calificaciones
finales.
Equipo de conducción y Autoridades del área: Encargados de revisar legajos, administrar
aperturas/cierres de inscripción, monitorear el progreso académico y evaluar estadísticas de las
carreras.
Comisión de Posgrado Regional (CPR): Entidad encargada de cargar y aprobar los datos
correspondientes a las tesis de maestrías y doctorados.
Requerimientos Funcionales
El sistema debe generar un enlace para ser enviado por correo electrónico que redirija al
formulario web de inscripción.
El sistema debe permitir al aspirante completar un formulario con sus datos personales,
información académica, motivaciones y cómo conoció la oferta.
El sistema debe permitir al aspirante adjuntar documentación en formato PDF con firma analógica,
como copias de DNI, partida de nacimiento, CUIT-CUIL y títulos de grado/posgrado.
El sistema debe incluir una opción para que el aspirante solicite una beca del 30% o 100% y
adjunte el formulario respectivo.
El sistema debe mostrar un indicador que permita conocer el estado de carga del legajo del
aspirante.
El sistema debe permitir al equipo de conducción listar a los inscriptos por cohorte, realizar
búsquedas individuales por estudiante, y abrir o cerrar el período de inscripción.
El sistema debe mantener un perfil académico por estudiante que registre la cohorte, el estado del
legajo y los seminarios.
El sistema debe permitir registrar la asistencia, las calificaciones finales y las fechas de actas de
examen de cada seminario.
El sistema debe permitir registrar la información del Trabajo Final Integrador o los datos de la tesis,
incluyendo título, directores y fecha de aprobación.
El sistema debe mostrar en el perfil del estudiante un indicador visual tipo "semáforo" que refleje el
estado de avance en la carrera y genere alertas de plazos de vencimiento.
El sistema debe proveer a cada docente un enlace específico para acceder a la planilla de carga
de sus seminarios asignados.
El sistema debe actualizar automáticamente el estado académico, porcentaje de asistencia y
condición del estudiante cuando el docente registre la información.
El sistema debe enviar recordatorios automáticos al correo del docente si no completa la carga de
notas en tiempo y forma.
El sistema debe contar con un módulo de estadísticas para que el equipo de conducción visualice
la cantidad de inscripciones, niveles de desgranamiento, situación de trabajos finales y cantidad de
graduados.
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
Informe N° 1
Grupo N° 6 - Ibáñez, Benavente, Scarselletta, ColavitteUTNFRLP
Página 2 de 4
Requerimientos No Funcionales
Seguridad y Permisos: El acceso a los perfiles académicos de los estudiantes debe estar
restringido exclusivamente al equipo de conducción. El sistema en general debe poseer distintos
niveles de acceso según el tipo de usuario.
Interoperabilidad / Exportación: El sistema debe permitir que la información del avance
académico sea descargada por cohorte o estudiante individual. Asimismo, debe permitir la
descarga de las planillas docentes para su uso en formato analógico.
Usabilidad: La interfaz debe organizar la información ingresada por los estudiantes en una base
de datos estructurada de manera clara por cohorte y por individuo.
Backlog (Épicas principales)
Épica 1: Gestión de Aspirantes e Inscripción. Comprende la generación de enlaces, carga de
formularios, subida de PDFs y revisión de legajos.
Épica 2: Perfil y Seguimiento Académico. Incluye el registro del estado del alumno, semáforo de
alertas, tutorías y carga de tesis por parte de la CPR.
Épica 3: Portal Docente. Abarca la generación de enlaces de acceso para profesores, la carga de
notas/asistencia y los recordatorios automáticos.
Épica 4: Reportes y Estadísticas. Desarrollo del dashboard para el equipo de conducción con
métricas globales y exportación de datos.
2. DISEÑO UX — WIREFRAMES Y ARQUITECTURA DE INFORMACIÓN
Mapa de sitio / Diagrama de navegación
Pantalla de Inicio / Login
Portal del Aspirante/Estudiante
Formulario de Preinscripción / Carga de Documentación.
Estado de Trámite (Indicador visual de legajo).
Mi Avance (Semáforo de estado, notas y asistencias).
Portal Docente
Mis Seminarios (Listado de cursos a cargo).
Planilla de Carga (Listado de alumnos, registro de asistencia y calificación).
Portal Equipo de Conducción / CPR
Dashboard Estadístico (Módulo de métricas de la carrera).
Gestión de Inscripciones (Apertura/Cierre de cohortes y revisión de legajos).
Buscador de Estudiantes (Perfiles académicos completos y alertas de vencimiento).
Gestión de Tesis (Carga de directores y resoluciones - Exclusivo CPR).
Wireframes de baja fidelidad (Estructura sugerida)
Pantalla de Inscripción (Aspirantes): Debe dividirse en un formulario por pasos (wizard). Paso 1:
Datos Personales (Nombre, DNI, Nacionalidad). Paso 2: Datos de Contacto y Residencia. Paso 3:
Antecedentes Académicos y Motivaciones. Paso 4: Subida de archivos (Dropzone para arrastrar y
soltar los PDF del DNI, Partida, Título y formulario de Beca).
Pantalla de Planilla Docente: Un encabezado con el nombre del seminario y la cohorte. Debajo,
una tabla donde las filas sean los estudiantes y las columnas sean "Asistencia (Checkboxes)",
"Calificación (Input numérico)" y "Estado Automático (Solo lectura)". Un botón primario al final para
"Guardar y Enviar Actas".
Pantalla de Perfil Estudiantil (Vista Conducción): Un panel superior con los datos básicos del
alumno y un "Semáforo" grande (Verde/Amarillo/Rojo) indicando su situación regular. Debajo, una
línea de tiempo o tarjetas mostrando los seminarios aprobados, alertas de vencimiento y el estado
del Trabajo Final Integrador/Tesis.
Justificación de decisiones de diseño
La estructuración de las pantallas responde directamente a la necesidad de eliminar las tareas
manuales en Excel y la pérdida de documentos en hilos de correo. Para los aspirantes, dividir el
•
•
•
•
•
•
•
•
•
◦
◦
◦
•
◦
◦
•
◦
◦
◦
◦
•
•
•
Informe N° 1
Grupo N° 6 - Ibáñez, Benavente, Scarselletta, ColavitteUTNFRLP
Página 3 de 4
formulario extenso en pasos reduce la carga cognitiva y organiza la subida de archivos obligatorios.
Para los docentes, presentar una vista en formato "tabla", similar a una planilla de cálculo pero en la
web, facilita la adopción del sistema porque imita la vista a la que ya están acostumbrados, pero
automatiza el cálculo de porcentajes y la sincronización con el legajo central. El uso de componentes
visuales como el "semáforo" para el equipo de conducción permite evaluar el riesgo académico de un
vistazo rápido sin necesidad de revisar múltiples celdas o documentos.