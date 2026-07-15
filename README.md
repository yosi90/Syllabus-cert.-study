# ISTQB CTFL v4.0 Trainer

Entrenador local construido con React, TypeScript y Vite a partir de los modelos oficiales A–D de ISTQB CTFL v4.0.

**Estado:** versión 1.0.0 preparada para uso y entrega local.

## Desarrollo

- `npm install`: instala las dependencias.
- `npx playwright install chromium`: instala el navegador usado por las pruebas E2E.
- `npm run dev`: inicia la aplicación en desarrollo.
- `npm run prepare:data`: regenera los cuatro fragmentos de preguntas a partir del banco maestro.
- `npm run build`: compila la versión de producción.
- `npm run preview`: sirve localmente la compilación de producción con su PWA.

## Validación

- `npm run validate:data`: valida las 160 preguntas, traducciones y recursos visuales.
- `npm test`: ejecuta las pruebas unitarias.
- `npm run validate:pwa`: audita manifest, iconos y precaché de la compilación existente.
- `npm run test:e2e`: compila y ejecuta las pruebas en escritorio y móvil sobre `vite preview`, incluido el uso offline.
- `npm run test:e2e:update`: regenera deliberadamente las referencias visuales de escritorio.
- `npm run validate`: ejecuta validación de datos, unitarias, compilación, auditoría PWA y pruebas E2E.

## PWA y uso offline

La compilación se puede instalar desde un navegador compatible. Tras la primera carga completa, la aplicación, el banco y los 23 recursos gráficos quedan disponibles sin conexión. El progreso, las sesiones y la importación/exportación siguen almacenándose únicamente en el navegador. Las actualizaciones se anuncian y solo se aplican cuando el usuario elige recargar.

Las referencias visuales solo deben actualizarse después de revisar que el cambio de interfaz es intencionado. Los roadmaps activos se crean en [`Docs/roadmaps/`](./Docs/roadmaps/) y los cerrados se conservan en [`Docs/roadmaps/finalizados/`](./Docs/roadmaps/finalizados/); actualmente no hay ningún roadmap activo. Los límites de módulos y las reglas para ampliar la aplicación están en [ARCHITECTURE.md](./ARCHITECTURE.md).

## Fuente de datos

`src/data/question-bank.json` es la única fuente editable del banco. Antes de desarrollar, probar o compilar, `scripts/prepare-question-bank.ts` genera automáticamente `src/data/generated/core.json` y un fragmento por modelo. Esta separación conserva las 160 preguntas y evita cargar un único módulo JavaScript por encima del umbral de 500 kB.
