# Roadmap finalizado — Contenido, voz y experiencia móvil

**Estado:** finalizado el 15/07/2026. Este documento conserva el historial de la primera mejora posterior a la versión 1.0.

## Hito 1 — Explicaciones y terminología

- [x] Retirar de la presentación los prefijos “Es correcta/o” y “No es correcta/o” en ambos idiomas.
- [x] Mostrar chips Correcta/Incorrecta en todas las opciones y conservar “Tu respuesta”.
- [x] Mantener `tester/testers` como anglicismo en el banco español.
- [x] Hacer estable la terminología en los scripts de traducción y validación.

## Hito 2 — Fidelidad de fórmulas

- [x] Incorporar bloques localizados de texto y fórmula con alternativa hablada.
- [x] Renderizar las fórmulas con KaTeX en pregunta y revisión.
- [x] Corregir la fracción y el texto contaminado de C-31.
- [x] Preservar la corrección al volver a ejecutar la extracción.
- [x] Cerrar el hito con validación del banco, renderizado y accesibilidad.

## Hito 3 — Lectura del navegador

- [x] Integrar Speech Synthesis con selección de idioma y fallback de voz.
- [x] Leer pregunta y opciones en su orden visible.
- [x] Leer primero la respuesta dada y después la explicación correcta.
- [x] Contemplar respuestas correctas, incorrectas, múltiples y en blanco.
- [x] Detener la lectura al cambiar de control o desmontar la pregunta.
- [x] Cerrar el hito con pruebas unitarias y E2E del contrato de voz.

## Hito 4 — Menú móvil compacto

- [x] Eliminar del menú la navegación duplicada que ya aparece en la barra inferior.
- [x] Mantener el nombre CTFL y ocultar “Entrenador” en móvil.
- [x] Reducir cierre, banderas y cabecera.
- [x] Sustituir la bandera británica por un SVG nítido.
- [x] Colocar los controles compactos de idioma y tema en la misma fila.
- [x] Cerrar el hito sin desbordamiento a 320, 390 y 768 píxeles.

## Cierre y definición de terminado

- [x] Regenerar los fragmentos derivados del banco maestro.
- [x] Superar validación de datos y 37 pruebas unitarias.
- [x] Superar compilación, auditoría PWA y 100 recorridos Playwright, con 18 omisiones previstas por proyecto.
- [x] Revisar y actualizar deliberadamente las capturas móviles y de escritorio afectadas.
- [x] Registrar fecha, cifras de validación y marcar el roadmap como finalizado.

**Cierre:** banco de 160 preguntas validado; fórmula accesible de C-31 contrastada y preservada en extracción; terminología `tester/testers` verificada globalmente; bundle principal de 338,47 kB con KaTeX aislado en un fragmento propio; PWA con 23 recursos de preguntas; suite completa sin errores.

## Decisiones permanentes

- Los roadmaps activos viven en `Docs/roadmaps/`; los cerrados, en `Docs/roadmaps/finalizados/`.
- Speech Synthesis es una mejora progresiva: sus controles no aparecen cuando el navegador no ofrece la API.
- Las preguntas sin bloques matemáticos conservan el formato de datos anterior.
- El progreso local mantiene su versión actual y no requiere migración.
