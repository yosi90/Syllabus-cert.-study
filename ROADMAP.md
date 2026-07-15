# Roadmap incremental — Entrenador ISTQB CTFL v4.0

Este documento es la fuente de verdad del estado del proyecto. `ROADMAP_CTFL_V4_UPDATE.md` se conserva como historial de la migración desde CTFL 2018.

## Estado de partida

- [x] Banco de 160 preguntas de los modelos A–D.
- [x] Limpieza de palabras fragmentadas y traducciones.
- [x] Validación automática del banco de preguntas.
- [x] Listado de preguntas plegado por defecto.
- [x] Modo oscuro persistente.
- [x] Extracción e integración de 23 gráficos y tablas.
- [x] Práctica, simulacros, corrección y progreso local básicos.

## Hito 0 — Base de calidad y navegador

- [x] Instalar y configurar Playwright con Chromium.
- [x] Añadir proyectos de escritorio y móvil.
- [x] Automatizar el arranque de Vite durante las pruebas.
- [x] Crear pruebas de humo para práctica, simulacro y revisión.
- [x] Capturar una referencia visual inicial en claro y oscuro.
- [x] Documentar los comandos de validación.
- [x] Cerrar el hito ejecutando datos, unitarias, compilación y Playwright sin errores.

**Cerrado el 15/07/2026.** Validación: 160 preguntas verificadas, 12 pruebas unitarias superadas, compilación de producción correcta y 8 recorridos E2E superados en Chromium de escritorio y móvil. Se guardaron referencias visuales canónicas de escritorio para los temas claro y oscuro.

## Hito 1 — Tutorial y experiencia móvil

- [x] Reducir el tutorial a tres pasos.
- [x] Añadir la acción “Omitir tutorial”.
- [x] Traducir completamente tutorial y controles.
- [x] Corregir anchura, altura y desplazamiento del modal móvil.
- [x] Añadir navegación móvil para Práctica, Simulacro y Revisión; `Inicio` se incorporará cuando exista su pantalla en el Hito 4.
- [x] Mantener filtros y acciones secundarias en el menú lateral.
- [x] Verificar que no haya desbordamientos a 320, 390 y 768 píxeles.
- [x] Cerrar el hito con pruebas móviles de tutorial, menú y navegación.

**Cerrado el 15/07/2026.** Validación: tutorial bilingüe de tres pasos completado y omitido en escritorio y móvil; navegación inferior y menú lateral verificados; ausencia de desbordamiento horizontal comprobada a 320, 390 y 768 px; 12 pruebas unitarias y 19 recorridos E2E superados. Se guardaron referencias visuales canónicas del tutorial y de la práctica móvil a 390 px.

## Hito 2 — Persistencia y recuperación

- [x] Diseñar el almacenamiento local versión 2.
- [x] Implementar migración automática desde versión 1.
- [x] Persistir idioma, tema, filtros, ruta y pregunta actual.
- [x] Persistir simulacro activo, respuestas, posición y temporizador.
- [x] Recuperar correctamente un simulacro tras recargar.
- [x] Conservar el estado de tiempo agotado sin perder respuestas.
- [x] Incluir el nuevo estado en exportación e importación.
- [x] Añadir pruebas unitarias de migración y recuperación.
- [x] Cerrar el hito comprobando compatibilidad con exportaciones antiguas.

**Cerrado el 15/07/2026.** Validación: migración automática v1→v2 y exportaciones antiguas verificadas; preferencias, práctica y simulacro activo recuperados tras recarga en escritorio y móvil; temporizador vencido restaurado sin perder respuestas; 14 pruebas unitarias y 27 recorridos E2E superados.

## Hito 3 — Historial y revisiones recuperables

- [x] Convertir las sesiones del historial en elementos interactivos.
- [x] Reconstruir una revisión desde preguntas y respuestas almacenadas.
- [x] Mostrar fecha, modelo, puntuación y resultado.
- [x] Distinguir simulacros oficiales, aleatorios y futuras sesiones adaptativas.
- [x] Añadir estado vacío y manejo de sesiones incompatibles.
- [x] Sustituir confirmaciones nativas relevantes por diálogos accesibles.
- [x] Cerrar el hito reabriendo una revisión antes y después de recargar.

**Cerrado el 15/07/2026.** Validación: historial interactivo y revisiones reconstruidas desde sesiones actuales y antiguas; reapertura persistente antes y después de recargar; sesiones incompatibles aisladas; confirmaciones de cancelar y borrar verificadas mediante teclado; banco de 160 preguntas, 15 pruebas unitarias, compilación y 35 recorridos E2E superados en escritorio y móvil.

## Hito 3.5 — Arquitectura y mantenibilidad

- [x] Definir límites de módulos y una estructura de carpetas estable.
- [x] Extraer tipos, constantes, traducciones y contenido del tutorial.
- [x] Extraer utilidades puras de presentación y reconstrucción de revisiones.
- [x] Separar componentes compartidos de navegación, filtros, preguntas y diálogos.
- [x] Separar las vistas de Práctica, Simulacro y Revisión por ruta.
- [x] Encapsular la sincronización de preferencias y progreso en hooks especializados.
- [x] Reducir `App.tsx` a composición de rutas y orquestación de alto nivel.
- [x] Evitar dependencias circulares y mantener contratos tipados entre módulos.
- [x] Documentar la arquitectura y las reglas para añadir nuevas funcionalidades.
- [x] Cerrar el hito ejecutando datos, unitarias, compilación y E2E sin regresiones.

**Cerrado el 15/07/2026.** Validación: `App.tsx` reducido de 2.165 a 506 líneas; contenido, utilidades, componentes, vistas y efectos de persistencia separados mediante contratos TypeScript y dependencias unidireccionales; banco de 160 preguntas, 15 pruebas unitarias, compilación y 35 recorridos E2E superados sin cambios visuales.

## Hito 4 — Panel de estudio

- [x] Crear la ruta y pantalla de Inicio.
- [x] Incorporar Inicio como cuarto acceso de la navegación móvil.
- [x] Mover la práctica a `/practice`.
- [x] Mostrar cobertura y precisión global.
- [x] Mostrar progreso por capítulo y nivel K.
- [x] Mostrar errores pendientes, marcadas y preguntas no vistas.
- [x] Identificar capítulos débiles sin presentar predicciones de aprobado.
- [x] Añadir accesos a sesión rápida de 10 y completa de 20.
- [x] Permitir continuar una sesión o simulacro pendiente.
- [x] Cerrar el hito validando cálculos, navegación y estados sin progreso.

**Cerrado el 15/07/2026.** Validación: Inicio y `/practice` verificados en ambos idiomas, temas y tamaños; cobertura y precisión calculadas desde intentos reales, desgloses por capítulo/K y áreas débiles cubiertos por unitarias; bloques ordenados de 10/20 y continuidad de práctica/simulacro comprobados; banco de 160 preguntas, 17 pruebas unitarias, compilación y 47 recorridos E2E superados.

## Hito 5 — Cola adaptativa

- [ ] Implementar el cálculo de prioridad por pregunta.
- [ ] Priorizar errores recientes, marcadas, baja precisión, antigüedad y no vistas.
- [ ] Limitar inicialmente un capítulo al 40 % de la sesión.
- [ ] Generar sesiones reproducibles de 10 o 20 preguntas sin duplicados.
- [ ] Persistir preguntas, posición, respuestas y semilla de la sesión.
- [ ] Permitir abandonar y continuar posteriormente.
- [ ] Mostrar resumen y recomendación al terminar.
- [ ] Registrar la sesión adaptativa en el historial.
- [ ] Añadir pruebas del ranking, equilibrio y casos con pocos candidatos.
- [ ] Cerrar el hito completando y recuperando sesiones de ambos tamaños.

## Hito 6 — Fidelidad de opciones y simulacros

- [ ] Introducir modos explícitos de opciones `original` y `shuffled`.
- [ ] Mantener letras y orden originales en todos los simulacros.
- [ ] Barajar de forma estable en práctica y sesiones adaptativas.
- [ ] Mantener el mismo orden en pregunta, corrección y revisión.
- [ ] Añadir pruebas para preguntas simples y múltiples.
- [ ] Verificar manualmente muestras de los cuatro PDF.
- [ ] Cerrar el hito sin discrepancias entre respuesta seleccionada y explicación.

## Hito 7 — Accesibilidad y pulido

- [ ] Gestionar foco inicial y devolución de foco en modales.
- [ ] Añadir cierre con `Escape` y bloqueo de desplazamiento.
- [ ] Revisar nombres accesibles, encabezados y regiones.
- [ ] Garantizar foco visible y navegación completa por teclado.
- [ ] Respetar `prefers-reduced-motion`.
- [ ] Comprobar contraste en temas claro y oscuro.
- [ ] Añadir estados de carga, éxito y error para importar/exportar.
- [ ] Cerrar el hito con recorridos Playwright mediante teclado.

## Hito 8 — PWA y funcionamiento offline

- [ ] Añadir manifest e iconos instalables.
- [ ] Configurar service worker y estrategia de actualización.
- [ ] Cachear aplicación, banco y recursos gráficos.
- [ ] Mostrar estado offline y aviso de nueva versión.
- [ ] Verificar que progreso e importación sigan siendo locales.
- [ ] Probar instalación y funcionamiento sin conexión.
- [ ] Cerrar el hito con una auditoría de la compilación de producción.

## Hito 9 — Estabilización final

- [ ] Ejecutar validación completa del banco.
- [ ] Ejecutar todas las pruebas unitarias y E2E.
- [ ] Revisar escritorio y móvil en ambos temas e idiomas.
- [ ] Comprobar los cuatro modelos y el simulacro aleatorio.
- [ ] Revisar migración, exportación y restauración.
- [ ] Resolver errores de consola y regresiones visuales.
- [ ] Revisar y reducir el bundle principal, actualmente por encima del aviso de 500 kB de Vite.
- [ ] Actualizar documentación de uso y desarrollo.
- [ ] Marcar la versión como preparada para entrega.

## Normas de seguimiento

- Una tarea solo cambia a `[x]` cuando el comportamiento está implementado y verificado.
- Si una tarea queda parcialmente hecha, permanece como `[ ]` y se añade una nota breve con el bloqueo.
- Al completar un hito, se añade fecha y resumen de validación.
- Cada sesión de trabajo aborda un único hito o una porción coherente del mismo.
- Los hallazgos nuevos se añaden al hito correspondiente antes de implementarlos.
- Playwright y la actualización de este documento forman parte de la definición de terminado de cada hito.

## Supuestos

- Los hitos se ejecutan en el orden indicado, salvo tareas independientes claramente documentadas.
- La PWA se implementa después del entrenador adaptativo y la persistencia.
- El proyecto continúa siendo local, privado y sin cuentas ni backend.
