# Roadmap - Web de Tests ISTQB CTFL 2018

## Objetivo

Construir una web local de estudio para la certificación ISTQB CTFL 2018 en español, con preguntas sueltas, simulacros de examen, revisión explicada, filtros por trazabilidad y progreso persistente en el navegador.

## Fuentes Revisadas

- `Docs/ISTQB syllabus 2018 español.pdf`: syllabus oficial CTFL 2018 en español.
- `Docs/ISTQB-CTFL-2018-ES-EJEMPLO_DE_EXAMEN-PREGUNTAS-MODELO_A-SSTQB.pdf`
- `Docs/ISTQB-CTFL-2018-ES-EJEMPLO_DE_EXAMEN-PREGUNTAS-MODELO_B-SSTQB.pdf`
- `Docs/ISTQB-CTFL-2018-ES-EJEMPLO_DE_EXAMEN-PREGUNTAS-MODELO_C-SSTQB.pdf`
- `Docs/ISTQB-CTFL-2018-ES-EJEMPLO_DE_EXAMEN-RESPUESTAS-MODELO_A-SSTQB.pdf`
- `Docs/ISTQB-CTFL-2018-ES-EJEMPLO_DE_EXAMEN-RESPUESTAS-MODELO_B-SSTQB.pdf`
- `Docs/ISTQB-CTFL-2018-ES-EJEMPLO_DE_EXAMEN-RESPUESTAS-MODELO_C-SSTQB.pdf`
- `Docs/Especificación Técnica y Base de Datos_ Simulador ISTQB CTFL 2018.docx`

## Decisiones Técnicas

- SPA con Vite, React, TypeScript y datos estáticos.
- Persistencia local con `localStorage`; sin backend ni base de datos en v1.
- Enrutado implícito por estado de React para evitar configuración de servidor.
- Datos oficiales extraidos a JSON/TS desde los PDFs locales sin modificar `Docs/`.

## Reglas del Examen

- 40 preguntas por examen.
- 1 punto por acierto, 0 puntos por error o blanco.
- Aprobado con 26 aciertos de 40, equivalente al 65%.
- Sin penalización por respuestas incorrectas.
- Formato general de opción múltiple; el Modelo A contiene preguntas multi-respuesta que se conservan.

## Estructura del Banco

Cada pregunta normalizada tendrá: `id`, `sourceModel`, `sourceNumber`, `chapter`, `reference`, `kLevel`, `rawKLevel`, `prompt`, `options`, `correctAnswers`, `selectionMode` y `explanation`.

## Incidencias Conocidas de Extraccion

- El Modelo C tiene una errata `K33`; se normaliza como `K3` y se conserva `rawKLevel`.
- El Modelo A contiene al menos dos preguntas con dos respuestas correctas.
- Algunas preguntas incluyen listas internas numeradas o letras A-D que no son opciones de respuesta; la extracción debe validarse manualmente.
- Las filas `NB-1.x` y `NB-4.x` del Modelo A se tratan como referencias amplias a palabras clave de capítulo.

## Funcionalidades

### Completado

- Plan de producto y alcance v1.
- Esqueleto inicial del proyecto.
- Ingesta y normalización del banco de preguntas.
- Banco generado con 120 preguntas oficiales: 40 por Modelo A, 40 por Modelo B y 40 por Modelo C.
- Validador `npm run validate:data` con comprobaciones de estructura, respuestas, LO/K y casos especiales.
- Motor de corrección para respuesta única y múltiple.
- Generación de simulacros exactos A/B/C y simulacro aleatorio con distribución `NB-1:8`, `NB-2:5`, `NB-3:5`, `NB-4:11`, `NB-5:9`, `NB-6:2`.
- Persistencia local de progreso, sesiones, marcadas, exportación e importación.
- UI de práctica, simulacros, revisión, filtros y estadísticas locales.
- Tutorial obligatorio de primera visita dentro de la web, con resaltado contextual y opción de relanzarlo desde el lateral.
- Tests unitarios de scoring, exámenes y persistencia.

### Pendiente / Siguiente Iteracion

- Afinar copy o terminología si se detecta alguna frase mal extraída del PDF.
- Añadir temporizador solo si se decide una duración oficial para el contexto de uso.
- Ampliar analíticas por objetivo de aprendizaje si el estudio diario lo necesita.
- Añadir un modo de repaso espaciado basado en fallos recurrentes.

## Comandos Utiles

- `npm install`: instalar dependencias.
- `npm run extract:data`: regenerar banco desde `Docs/`.
- `npm run validate:data`: validar estructura del banco.
- `npm test`: ejecutar tests unitarios.
- `npm run build`: compilar producción.
- `npm run dev`: levantar servidor local de desarrollo.

## Documentacion de Uso

- `TUTORIAL.md`: guía de uso de la web, modelos, capítulos, niveles K, referencias, estados y estrategia de estudio.
