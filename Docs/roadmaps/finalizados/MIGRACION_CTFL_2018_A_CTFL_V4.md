# Roadmap finalizado — Migración de CTFL 2018 a CTFL v4.0

**Estado:** finalizado y archivado el 15/07/2026. Las casillas abiertas se conservan como registro histórico de revisiones manuales opcionales, no como trabajo activo.

## Objetivo

Actualizar la web local de estudio desde CTFL 2018 a CTFL v4.0, manteniendo la experiencia actual de practica, simulacros, revision y progreso, pero sustituyendo el banco, trazabilidad y reglas por las fuentes oficiales actuales.

## Estado General

- [x] Crear checklist operativo para seguir el update sin perder el hilo.
- [x] Revisar documentos CTFL v4.0 disponibles en `Docs/`.
- [x] Identificar diferencias principales entre CTFL 2018 y CTFL v4.0.
- [ ] Implementar migracion tecnica completa.
- [x] Validar banco, tests y build final.

## Fuentes

- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-A-Questions_v1.7.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-A-Answers_v1.7.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-B-Questions_v1.7.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-B-Answers_v1.7.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-C-Questions_v1.6.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-C-Answers_v1.6.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-D-Questions_v1.5.pdf`.
- [x] Revisar `Docs/ISTQB_CTFL_v4.0_Sample-Exam-D-Answers_v1.5.pdf`.
- [x] Revisar `Docs/ISTQB_Exam-Structures-and-Rules_v1.2.pdf`.
- [x] Incorporar a `Docs/` la fuente oficial `ISTQB Exam Structures & Rules Tables v1.18`, publicada el 27/05/2026.
- [x] Incorporar a `Docs/` el syllabus CTFL v4.0/v4.0.1 completo si se quiere mostrar texto de objetivos de aprendizaje.

## Cambios Clave Detectados

- [x] Confirmar que la web actual esta basada en CTFL 2018 y usa referencias `NB-*`.
- [x] Confirmar que CTFL v4.0 usa objetivos `FL-*`.
- [x] Confirmar que el banco oficial pasa de modelos A/B/C a modelos A/B/C/D.
- [x] Confirmar que el banco objetivo pasa de 120 a 160 preguntas oficiales.
- [x] Confirmar distribucion por examen CTFL v4.0:
  - [x] `FL-1`: 8 preguntas
  - [x] `FL-2`: 6 preguntas
  - [x] `FL-3`: 4 preguntas
  - [x] `FL-4`: 11 preguntas
  - [x] `FL-5`: 9 preguntas
  - [x] `FL-6`: 2 preguntas
- [x] Confirmar distribucion K por examen: `K1:8`, `K2:24`, `K3:8`, `K4:0`.
- [x] Confirmar que cada pregunta CTFL Foundation vale 1 punto.
- [x] Confirmar aprobado con 65%, equivalente a 26 aciertos de 40.
- [x] Confirmar duracion CTFL v4.0: 60 minutos, o 75 minutos con extension del 25%.
- [x] Confirmar que hay preguntas multi-respuesta en los modelos v4.0.
- [x] Confirmar compatibilidad declarada: modelos A/B con syllabus v4.0.1 y modelos C/D con syllabus v4.0.

## Fase 1 - Inventario y Baseline

- [x] Confirmar que todos los PDFs nuevos estan en `Docs/`.
- [x] Confirmar que los documentos CTFL 2018 estan archivados en `Docs/Antiguo/`.
- [x] Descargar y guardar localmente `ISTQB Exam Structures & Rules Tables v1.18`.
- [x] Decidir si el update sustituye completamente CTFL 2018 o si la web ofrecera selector de version `2018` / `v4.0`.
- [x] Ejecutar `npm run validate:data` sobre el estado actual.
- [x] Ejecutar `npm test` sobre el estado actual.
- [x] Ejecutar `npm run build` sobre el estado actual.
- [ ] Guardar captura del estado funcional actual antes de modificar datos.

## Fase 2 - Modelo de Datos

- [x] Ampliar `SourceModel` de `"A" | "B" | "C"` a `"A" | "B" | "C" | "D"`.
- [x] Cambiar la semantica de `chapter`, `reference` y `objectives` de `NB-*` a `FL-*`.
- [x] Revisar textos visibles para renombrar `NB` a `FL` en UI, filtros, tutorial y documentacion.
- [x] Actualizar `QuestionBank.metadata.version` para CTFL v4.0.
- [x] Actualizar `QuestionBank.metadata.generatedFrom` con todos los PDFs v4.0.
- [x] Actualizar `QuestionBank.metadata.examRules` con reglas CTFL v4.0.
- [x] Actualizar `QuestionBank.metadata.chapterDistribution`.
- [x] Actualizar `QuestionBank.metadata.countsByKLevel`.
- [x] Registrar `QuestionBank.metadata.extractionIssues`.
- [x] Mantener compatibilidad con `selectionMode: "single" | "multiple"`.
- [x] Definir estrategia de migracion para progreso local, porque IDs como `A-01` chocan semanticamente entre 2018 y v4.0.

## Fase 3 - Extraccion de Preguntas y Respuestas

- [x] Adaptar `scripts/extract_data.py` al naming `ISTQB_CTFL_v4.0_Sample-Exam-{A-D}-...`.
- [x] Cambiar parser de preguntas para detectar formato `Question #N (1 Point)`.
- [x] Cambiar parser de preguntas para detectar `Select ONE option` y `Select TWO options`.
- [x] Cambiar parser de opciones para soportar `a)` a `e)` cuando existan cinco opciones.
- [x] Evitar mezclar el apendice de preguntas adicionales del Modelo A con las 40 preguntas principales, salvo decision explicita.
- [x] Cambiar parser de respuestas para guias con columnas `Question Number`, `Correct Answer`, `LO`, `K-Level`, `Points`.
- [x] Extraer explicaciones/rationale por pregunta.
- [x] Soportar respuestas multiples separadas por coma.
- [x] Normalizar referencias `FL-x.y.z`.
- [x] Derivar capitulo `FL-x` desde la referencia.
- [x] Registrar incidencias manuales cuando `pypdf` una lineas, tablas u opciones.
- [x] Generar `src/data/question-bank.json` con 160 preguntas.

## Fase 4 - Validacion del Banco

- [x] Actualizar `scripts/validate-data.ts` para esperar 160 preguntas.
- [x] Validar 40 preguntas por modelo A/B/C/D.
- [x] Validar IDs `A-01` a `D-40`.
- [x] Validar referencias con formato `FL-\d.\d.\d`.
- [x] Validar capitulos `FL-1` a `FL-6`.
- [x] Validar niveles `K1`, `K2`, `K3`.
- [x] Validar distribucion por examen `8/6/4/11/9/2`.
- [x] Validar distribucion K por examen `8/24/8`.
- [x] Validar que cada pregunta vale 1 punto.
- [x] Validar preguntas multi-respuesta conocidas.
- [ ] Revisar manualmente 5 preguntas de texto largo por modelo.
- [ ] Revisar manualmente todas las preguntas K3.
- [ ] Revisar manualmente todas las preguntas multi-respuesta.
- [ ] Revisar manualmente preguntas con tablas, listas o calculos.
- [x] Confirmar que las explicaciones no quedan vacias.
- [x] Confirmar que las explicaciones no quedan contaminadas con cabeceras/pies del PDF.

## Fase 5 - Logica de Examen

- [x] Actualizar `src/domain/exams.ts` para incluir Modelo D.
- [x] Cambiar distribucion del simulacro aleatorio a `FL-1:8`.
- [x] Cambiar distribucion del simulacro aleatorio a `FL-2:6`.
- [x] Cambiar distribucion del simulacro aleatorio a `FL-3:4`.
- [x] Cambiar distribucion del simulacro aleatorio a `FL-4:11`.
- [x] Cambiar distribucion del simulacro aleatorio a `FL-5:9`.
- [x] Cambiar distribucion del simulacro aleatorio a `FL-6:2`.
- [x] Incorporar temporizador oficial opcional de 60 minutos.
- [x] Incorporar modo de extension de 75 minutos.
- [x] Permitir desactivar temporizador para practica libre.
- [x] Anadir cancelacion de simulacro activo sin guardar respuestas.
- [x] Mantener scoring actual: 1 punto por acierto, 0 por error o blanco, sin penalizacion.
- [x] Revisar tests de scoring para preguntas multi-respuesta.

## Fase 6 - UI y Contenido

- [x] Cambiar textos visibles de CTFL 2018 a CTFL v4.0.
- [x] Anadir selector de Modelo D en practica.
- [x] Anadir selector de Modelo D en simulacro.
- [x] Renombrar filtros `NB` a `FL`.
- [x] Cambiar "capitulos del syllabus 2018" por "capitulos CTFL v4.0".
- [x] Cambiar "referencia NB" por "objetivo de aprendizaje FL".
- [x] Actualizar tutorial inicial para reflejar 4 modelos oficiales.
- [x] Actualizar tutorial inicial para reflejar 160 preguntas.
- [x] Actualizar tutorial inicial para reflejar distribucion v4.0.
- [x] Actualizar tutorial inicial para reflejar duracion oficial 60/75 minutos.
- [x] Actualizar `TUTORIAL.md`.
- [x] Revisar estadisticas locales para que no mezclen progreso 2018 con v4.0.
- [x] Mejorar presentacion de explicaciones separando rationale por opcion.
- [x] Enlazar cada pregunta con objetivo, seccion y pagina del syllabus CTFL v4.0.1.
- [x] Anadir modal `Ver teoria` desde las explicaciones.
- [x] Compactar escala tipografica y espaciado en escritorio.
- [x] Distribuir respuestas, explicaciones y revision en dos columnas en escritorio.
- [x] Anadir tooltip visible al boton de marcador de pregunta.
- [x] Compactar menu lateral, filtros, metricas y acciones.
- [x] Mover limpieza de filtros junto al buscador y mostrarla solo con filtros activos.
- [x] Anadir salto aleatorio en modo practica.
- [x] Aleatorizar de forma estable el orden de respuestas por pregunta.

## Fase 7 - Persistencia y Migracion

- [x] Versionar la clave de `localStorage` o el formato de progreso.
- [x] Evitar que intentos del banco 2018 se apliquen a preguntas v4.0 con el mismo ID.
- [x] Crear clave nueva `istqb-ctfl-v4-trainer:v1`.
- [x] Conservar export/import separado por version.
- [x] Mostrar aviso si se importa progreso incompatible.
- [x] Actualizar tests de `src/storage/progress.test.ts`.

## Fase 8 - QA Funcional

- [x] Ejecutar `npm run extract:data`.
- [x] Ejecutar `npm run validate:data`.
- [x] Ejecutar `npm test`.
- [x] Ejecutar `npm run build`.
- [ ] Probar practica con filtros por modelo.
- [ ] Probar practica con filtros por capitulo.
- [ ] Probar practica con filtros por K.
- [ ] Probar practica con filtros por referencia.
- [ ] Probar simulacro Modelo A.
- [ ] Probar simulacro Modelo D.
- [ ] Probar simulacro aleatorio con 40 preguntas.
- [ ] Probar correccion de preguntas single.
- [ ] Probar correccion de preguntas multiple.
- [ ] Probar finalizacion de examen con aprobado/no aprobado.
- [ ] Probar exportacion de progreso.
- [ ] Probar importacion de progreso.
- [ ] Probar reset de progreso.
- [ ] Verificar responsive en escritorio.
- [ ] Verificar responsive en movil.

## Fase 9 - Documentacion y Cierre

- [x] Consolidar el estado final en [`ENTRENADOR_CTFL_V4_VERSION_1_0.md`](./ENTRENADOR_CTFL_V4_VERSION_1_0.md).
- [x] Mantener este archivo como checklist historico de migracion.
- [x] Documentar fuentes exactas, versiones y fechas finales.
- [x] Documentar incidencias conocidas de extraccion.
- [x] Documentar comando `npm run extract:data`.
- [x] Documentar comando `npm run validate:data`.
- [x] Documentar comando `npm test`.
- [x] Documentar comando `npm run build`.

## Orden de Ejecucion Recomendado

- [x] Incorporar `Exam Structures & Rules Tables v1.18` a `Docs/`.
- [x] Modificar tipos y validadores para aceptar CTFL v4.0.
- [x] Adaptar extractor y generar banco v4.0.
- [x] Corregir incidencias de extraccion con overrides documentados.
- [x] Actualizar UI, tutorial y copy.
- [x] Resolver migracion de progreso local.
- [ ] Ejecutar QA completo y build final.

## Riesgos Abiertos

- [x] Falta local el syllabus CTFL v4.0/v4.0.1 completo; las guias de respuesta dan los objetivos `FL-*`, pero no los textos completos de cada objetivo.
- [x] El Modelo A incluye apendice con preguntas adicionales; hay que decidir explicitamente si quedan fuera del banco principal o si se anaden como modo extra.
- [x] La extraccion PDF puede mezclar cabeceras, pies, tablas y explicaciones largas.
- [x] Los IDs actuales chocan semanticamente con los nuevos si se reutilizan sin versionado.
- [ ] Si se mantiene selector 2018/v4.0, el alcance sube: datos, filtros, progreso, tutorial y copy deben ser multi-version.
