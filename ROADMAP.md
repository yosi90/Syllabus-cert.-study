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

- [x] Implementar el cálculo de prioridad por pregunta.
- [x] Priorizar errores recientes, marcadas, baja precisión, antigüedad y no vistas.
- [x] Limitar inicialmente un capítulo al 40 % de la sesión.
- [x] Generar sesiones reproducibles de 10 o 20 preguntas sin duplicados.
- [x] Persistir preguntas, posición, respuestas y semilla de la sesión.
- [x] Permitir abandonar y continuar posteriormente.
- [x] Mostrar resumen y recomendación al terminar.
- [x] Registrar la sesión adaptativa en el historial.
- [x] Añadir pruebas del ranking, equilibrio y casos con pocos candidatos.
- [x] Cerrar el hito completando y recuperando sesiones de ambos tamaños.

**Cerrado el 15/07/2026.** Validación: ranking reproducible con prioridad por errores recientes, marcadas, baja precisión, antigüedad y preguntas no vistas; equilibrio inicial del 40 % por capítulo y casos con pocos candidatos cubiertos por unitarias; sesiones de 10 y 20 preguntas persistidas, abandonadas, recuperadas, finalizadas y reabiertas desde el historial mediante Playwright. Banco de 160 preguntas, 22 pruebas unitarias, compilación y 51 pruebas E2E superadas, con 11 omisiones intencionadas por proyecto.

## Hito 6 — Fidelidad de opciones y simulacros

- [x] Introducir modos explícitos de opciones `original` y `shuffled`.
- [x] Mantener letras y orden originales en todos los simulacros.
- [x] Barajar de forma estable en práctica y sesiones adaptativas.
- [x] Mantener el mismo orden en pregunta, corrección y revisión.
- [x] Añadir pruebas para preguntas simples y múltiples.
- [x] Verificar manualmente muestras de los cuatro PDF.
- [x] Cerrar el hito sin discrepancias entre respuesta seleccionada y explicación.

**Cerrado el 15/07/2026.** Validación: los modos `original` y `shuffled` forman parte explícita de simulacros, sesiones adaptativas e historial, con migración compatible para datos v2 anteriores; los modelos oficiales y el aleatorio conservan letras y orden originales, mientras práctica y sesiones adaptativas mantienen un barajado estable en pregunta, corrección y revisión. Se contrastó la pregunta 1 de los PDF A–D —incluidas las fragmentaciones `syst em` y `quali ty` de A-01— y se cubrieron preguntas simples y múltiples. Banco de 160 preguntas, 27 pruebas unitarias, compilación y 61 pruebas E2E superadas, con 11 omisiones intencionadas por proyecto.

## Hito 7 — Accesibilidad y pulido

- [x] Gestionar foco inicial y devolución de foco en modales.
- [x] Añadir cierre con `Escape` y bloqueo de desplazamiento.
- [x] Revisar nombres accesibles, encabezados y regiones.
- [x] Garantizar foco visible y navegación completa por teclado.
- [x] Respetar `prefers-reduced-motion`.
- [x] Comprobar contraste en temas claro y oscuro.
- [x] Añadir estados de carga, éxito y error para importar/exportar.
- [x] Cerrar el hito con recorridos Playwright mediante teclado.

**Cerrado el 15/07/2026.** Validación: contrato modal reutilizable con foco inicial, ciclo de tabulación, `Escape`, bloqueo de desplazamiento y devolución de foco aplicado a confirmaciones, tutorial, teoría, imágenes y menú móvil; regiones, encabezados, controles con nombre, foco visible, navegación con `Tab`/`Enter` y `prefers-reduced-motion` verificados; contraste WCAG AA comprobado en superficies clave de ambos temas; importación y exportación anuncian carga, éxito y error sin alertas nativas. Banco de 160 preguntas, 27 pruebas unitarias, compilación y 80 pruebas E2E superadas, con 12 omisiones intencionadas por proyecto.

## Hito 8 — PWA y funcionamiento offline

- [x] Añadir manifest e iconos instalables.
- [x] Configurar service worker y estrategia de actualización.
- [x] Cachear aplicación, banco y recursos gráficos.
- [x] Mostrar estado offline y aviso de nueva versión.
- [x] Verificar que progreso e importación sigan siendo locales.
- [x] Probar instalación y funcionamiento sin conexión.
- [x] Cerrar el hito con una auditoría de la compilación de producción.

**Cerrado el 15/07/2026.** Validación: manifest instalable con iconos 192, 512 y maskable generado desde el favicon transparente; service worker Workbox con estrategia de actualización bajo confirmación y limpieza de cachés antiguas; 32 recursos precacheados (2,14 MiB), incluidos aplicación, banco integrado y 23 gráficos. Chromium sobre `vite preview` verificó registro y control del service worker, recarga offline, recuperación de respuestas, carga de gráficos e importación local sin red. Auditoría PWA automatizada, banco de 160 preguntas, 27 pruebas unitarias, compilación y 82 pruebas E2E superadas, con 14 omisiones intencionadas por proyecto.

## Hito 9 — Estabilización final

- [x] Ejecutar validación completa del banco.
- [x] Ejecutar todas las pruebas unitarias y E2E.
- [x] Revisar escritorio y móvil en ambos temas e idiomas.
- [x] Comprobar los cuatro modelos y el simulacro aleatorio.
- [x] Revisar migración, exportación y restauración.
- [x] Resolver errores de consola y regresiones visuales.
- [x] Revisar y reducir el bundle principal, anteriormente por encima del aviso de 500 kB de Vite.
- [x] Actualizar documentación de uso y desarrollo.
- [x] Marcar la versión como preparada para entrega.

**Cerrado el 15/07/2026.** Validación final: banco maestro con 160 preguntas y distribución A–D 40/40/40/40; 27 pruebas unitarias y 96 recorridos E2E superados en Chromium de escritorio y móvil, con 14 omisiones intencionadas por proyecto. Se recorrieron las rutas principales en ambos idiomas y temas sin desbordamiento, los cuatro modelos oficiales y un aleatorio de 40 preguntas únicas, migración v1→v2, recuperación de simulacro, exportación→importación→restauración, PWA offline, contraste, teclado, consola y referencias visuales. El banco se divide automáticamente en cuatro fragmentos y el bundle principal bajó de 879,91 kB a 332,93 kB, sin advertencias de tamaño. Versión 1.0.0 preparada para entrega local.

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
