# Tutorial de Uso - ISTQB CTFL v4.0 Trainer

Este documento explica cada parte de la web y como usarla para estudiar ISTQB CTFL v4.0 con los examenes oficiales de ejemplo.

## Vista General

La web tiene cuatro secciones principales:

- `Inicio`: panel con cobertura, precision, progreso por bloques y accesos para continuar.
- `Practica`: preguntas sueltas para estudiar, filtrar, corregir al momento y marcar dudas.
- `Simulacro`: examenes de 40 preguntas, con modelos oficiales o combinacion aleatoria.
- `Revision`: historial de simulacros y revisiones completas que pueden abrirse de nuevo.

En el lateral izquierdo estan los filtros, el progreso local y las acciones de exportar, importar o borrar progreso.

En pantallas moviles, una barra inferior permite cambiar entre `Inicio`, `Practica`, `Simulacro` y `Revision`. Los filtros, el progreso y las acciones secundarias siguen disponibles desde el boton de menu.

La primera vez que abras la web aparece un tutorial breve de tres pasos. Puedes completarlo u omitirlo; si quieres verlo otra vez, usa el boton `Tutorial` del lateral.

## Inicio y Panel de Estudio

`Inicio` resume exclusivamente el progreso registrado en este navegador:

- Cobertura: porcentaje de las 160 preguntas que se ha intentado al menos una vez.
- Precision: porcentaje de aciertos sobre el total de intentos realizados.
- Errores pendientes: preguntas cuyo ultimo intento fue incorrecto.
- Marcadas y no vistas.
- Cobertura y precision por capitulo y nivel K.
- Hasta dos capitulos a reforzar cuando ya existen intentos suficientes para compararlos.

El panel no predice si aprobaras el examen. Los bloques de 10 y 20 abren conjuntos ordenados y acotados de practica; la priorizacion adaptativa y su recuperacion forman parte del siguiente hito.

Si hay progreso de practica o un simulacro activo, `Inicio` muestra acciones para continuar donde lo dejaste.

## Practica

La seccion `Practica` sirve para estudiar pregunta a pregunta.

Funcionamiento:

- Seleccionas una respuesta.
- Pulsas `Comprobar`.
- La web marca si es correcta o incorrecta.
- Muestra la explicacion oficial extraida del documento de respuestas.
- Guarda el intento en el progreso local.

Puedes moverte con `Anterior` y `Siguiente`, o usar la lista inferior de preguntas para saltar directamente a otra.

El boton de marcador permite guardar una pregunta para repasarla despues con el filtro `Marcadas`.

## Simulacro

La seccion `Simulacro` crea examenes de 40 preguntas.

Reglas aplicadas:

- 40 preguntas.
- 1 punto por acierto.
- 0 puntos por error o respuesta en blanco.
- Aprobado con 26 de 40.
- Sin penalizacion.
- Duracion oficial CTFL v4.0: 60 minutos, o 75 minutos con extension del 25%.

Durante el simulacro no se muestra la correccion hasta finalizar. Al terminar, la web guarda la sesion y abre la revision.

## Historial y Revisiones

La seccion `Revision` conserva hasta 20 sesiones terminadas. Cada fila indica la fecha, el tipo de sesion, la puntuacion y el resultado.

Pulsa `Abrir revision` para reconstruir la correccion completa con las preguntas y respuestas guardadas. La revision abierta se recupera tambien despues de recargar la pagina. Los modelos oficiales, simulacros aleatorios y futuras sesiones adaptativas se identifican por separado.

Si una exportacion antigua contiene una sesion cuyas preguntas ya no existen en la version actual del banco, la web mantiene la entrada en el historial, la marca como incompatible y evita abrir una revision incompleta.

## Que Son los Modelos A, B, C y D

Los modelos son cuatro ejemplos oficiales de examen incluidos en la documentacion:

- `Modelo A`
- `Modelo B`
- `Modelo C`
- `Modelo D`

Cada modelo contiene 40 preguntas. Elegir un modelo afecta a dos cosas:

- En `Simulacro`, si eliges un modelo, haces exactamente ese examen oficial, con sus 40 preguntas originales.
- En `Practica`, si filtras por modelo, solo veras preguntas que vienen de ese documento.

El simulacro `Aleatorio` no usa un unico modelo. Mezcla preguntas del banco completo sin duplicados, respetando la distribucion oficial por capitulos.

## Que Son los Capitulos

Los capitulos corresponden a las areas del syllabus CTFL v4.0:

- `FL-1`: Fundamentals of Testing.
- `FL-2`: Testing Throughout the Software Development Lifecycle.
- `FL-3`: Static Testing.
- `FL-4`: Test Analysis and Design.
- `FL-5`: Managing the Test Activities.
- `FL-6`: Test Tools.

Filtrar por capitulo sirve para estudiar un bloque completo del temario.

El simulacro aleatorio usa esta distribucion:

- `FL-1`: 8 preguntas.
- `FL-2`: 6 preguntas.
- `FL-3`: 4 preguntas.
- `FL-4`: 11 preguntas.
- `FL-5`: 9 preguntas.
- `FL-6`: 2 preguntas.

## Que Es el Nivel K

El nivel K indica la dificultad cognitiva de la pregunta segun el syllabus.

### K1 - Recordar

Preguntas de memoria y reconocimiento.

### K2 - Comprender

Preguntas de interpretacion, comparacion y seleccion de la mejor descripcion.

### K3 - Aplicar

Preguntas practicas. Suelen pedir aplicar una tecnica a un caso concreto, calcular valores o elegir casos de prueba.

Si estas empezando, conviene estudiar en este orden: `K1`, luego `K2`, luego `K3`.

## Que Es la Referencia

La referencia apunta al objetivo de aprendizaje exacto del syllabus.

Ejemplos:

- `FL-1.1.1`: objetivo concreto dentro del capitulo 1.
- `FL-4.2.2`: objetivo de aprendizaje dentro de analisis y diseno de pruebas.
- `FL-5.5.1`: objetivo relacionado con gestion de riesgos.

Elegir una referencia sirve para estudiar con mucha precision. La referencia es mas precisa que el capitulo.

## Como Elegir el Estado

El filtro `Estado` usa tu progreso local para mostrar subconjuntos utiles:

- `Todas`: muestra todo lo que cumpla el resto de filtros.
- `Sin responder`: preguntas que aun no has intentado.
- `Ultima correcta`: preguntas que respondiste bien la ultima vez.
- `Ultima incorrecta`: preguntas que respondiste mal la ultima vez.
- `Marcadas`: preguntas guardadas manualmente con el marcador.

## Busqueda

El buscador filtra por texto dentro de:

- Enunciado.
- Opciones.
- Identificador de pregunta.
- Capitulo.
- Referencia.
- Nivel K.

Puedes buscar palabras como `regression`, `boundary`, `risk`, `defect`, `FL-4.2.2` o `K3`.

## Progreso Local

La web guarda el progreso en el navegador mediante `localStorage`.

Se guarda:

- Preguntas intentadas.
- Ultimo resultado de cada pregunta.
- Preguntas marcadas.
- Simulacros recientes y la revision historica abierta.
- Respuestas de sesiones terminadas.
- Idioma, tema, filtros, ultima seccion y pregunta actual.
- Respuestas, posicion y temporizador de un simulacro sin terminar.

Si recargas o cierras la pestana durante un simulacro, la web lo recupera al volver. Si el tiempo termina mientras esta cerrada, conserva las respuestas y muestra el estado `Tiempo agotado` para que puedas finalizar o cancelar.

El progreso CTFL v4.0 usa una clave separada del progreso CTFL 2018 para evitar mezclar bancos distintos.

## Exportar, Importar y Borrar

### Exportar

Descarga un archivo JSON con tu progreso y el estado recuperable de la web. Sirve para copia de seguridad o para moverlo a otro navegador.

### Importar

Carga un archivo JSON exportado previamente y sustituye el progreso y estado actual. Las exportaciones anteriores con formato v1 se migran automaticamente a v2.

### Borrar

Elimina todo el progreso local. No borra preguntas ni documentos; solo reinicia tu historial de estudio.

## Estrategia Recomendada de Estudio

1. Empieza en `Practica` con `Sin responder`.
2. Filtra por `K1` para asegurar terminologia.
3. Pasa a `K2` para entender conceptos.
4. Practica `K3`, especialmente en `FL-4` y `FL-5`.
5. Marca preguntas dudosas.
6. Revisa `Ultima incorrecta` y `Marcadas`.
7. Haz un modelo oficial completo.
8. Lee la revision y vuelve a practicar solo lo fallado.
9. Usa `Aleatorio` cuando ya hayas visto todos los modelos.

## Notas de Contenido

- El contenido procede de los PDFs oficiales incluidos en `Docs/`.
- El banco principal contiene 160 preguntas: 40 de cada modelo A, B, C y D.
- Algunas preguntas tienen mas de una respuesta correcta; la web usa checkboxes en esos casos.
- El Modelo A incluye preguntas adicionales en apendice; no forman parte del banco principal de 160 preguntas.
