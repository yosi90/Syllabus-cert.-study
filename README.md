# ISTQB CTFL v4.0 Trainer

Entrenador local construido con React, TypeScript y Vite a partir de los modelos oficiales A–D de ISTQB CTFL v4.0.

## Desarrollo

- `npm install`: instala las dependencias.
- `npx playwright install chromium`: instala el navegador usado por las pruebas E2E.
- `npm run dev`: inicia la aplicación en desarrollo.
- `npm run build`: compila la versión de producción.

## Validación

- `npm run validate:data`: valida las 160 preguntas, traducciones y recursos visuales.
- `npm test`: ejecuta las pruebas unitarias.
- `npm run test:e2e`: ejecuta las pruebas de humo en escritorio y móvil y compara las referencias visuales.
- `npm run test:e2e:update`: regenera deliberadamente las referencias visuales de escritorio.
- `npm run validate`: ejecuta validación de datos, unitarias, compilación y pruebas E2E.

Las referencias visuales solo deben actualizarse después de revisar que el cambio de interfaz es intencionado. El estado y el orden de los próximos hitos se mantienen en [ROADMAP.md](./ROADMAP.md). Los límites de módulos y las reglas para ampliar la aplicación están en [ARCHITECTURE.md](./ARCHITECTURE.md).
