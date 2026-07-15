# Arquitectura del entrenador CTFL

La aplicación se organiza por responsabilidad. `App.tsx` compone rutas, conecta estado y coordina acciones; el detalle visual y de persistencia vive fuera del contenedor.

## Estructura

- `src/app/`: contratos de interfaz, textos bilingües y utilidades puras de presentación.
- `src/views/`: una vista por ruta (`StudyView`, `ExamView` y `ReviewView`). Reciben datos y callbacks tipados; no acceden directamente a `localStorage`.
- `src/components/common/`: piezas reutilizables, tutorial, métricas y diálogos.
- `src/components/navigation/`: navegación lateral y móvil.
- `src/components/sidebar/`: filtros y acciones secundarias.
- `src/components/questions/`: tarjeta, gráficos, explicación, teoría y raíles de preguntas.
- `src/hooks/`: integración React con persistencia, tema y restauración de ruta.
- `src/domain/`: reglas puras de filtrado, puntuación, opciones y generación de simulacros.
- `src/storage/`: esquema, migración, importación y exportación del progreso.
- `src/data/`: banco maestro, tipos y fragmentos derivados por modelo. `question-bank.json` es la única fuente editable; `npm run prepare:data` regenera `generated/` automáticamente.
- `public/icons/` y `vite.config.ts`: identidad instalable, manifest y precaché PWA; `PwaStatus` concentra los avisos de conexión y actualización.

## Reglas de dependencia

1. `data`, `domain` y `storage` no importan componentes ni vistas.
2. Las vistas pueden componer componentes, pero no deben conocer claves de almacenamiento.
3. Los componentes reciben datos y eventos mediante props; no importan `App.tsx`.
4. Los efectos de navegador o persistencia se encapsulan en hooks o servicios.
5. Los textos visibles nuevos se añaden a `src/app/content.ts` en inglés y español.
6. Las transformaciones que no necesitan React se añaden a `domain` o `app/presentation.ts` y se prueban como funciones puras.
7. Una ruta nueva debe tener su propia vista y conectarse desde `AppShell`, sin añadir su JSX completo a `App.tsx`.
8. El orden de respuestas forma parte del estado de una sesión: simulacros usan `original`; práctica y sesiones adaptativas usan `shuffled` junto con una semilla estable. Pregunta, corrección y revisión deben recibir siempre el mismo modo y semilla.
9. Todo diálogo o superficie modal usa `useModalAccessibility`: foco inicial, ciclo de tabulación, cierre con `Escape`, bloqueo de desplazamiento y devolución de foco forman un único contrato reutilizable.
10. El service worker solo cachea recursos estáticos; progreso, sesiones e importaciones continúan bajo `src/storage/` y nunca se sincronizan con un backend.
11. Los archivos de `src/data/generated/` no se editan a mano. Cualquier corrección se hace en `question-bank.json` y se propaga con `npm run prepare:data`; desarrollo, unitarias y compilación ejecutan este paso previamente.

## Flujo de estado

`AppShell` mantiene el estado de la sesión activa y entrega props a las vistas. `useTrainerProgress` carga y guarda el documento v2; `useWorkspacePersistence` sincroniza preferencias, práctica, simulacro y revisión; `usePersistentTheme` y `useLastRouteRestoration` aíslan sus respectivos efectos de navegador.

Antes de cerrar un cambio estructural se ejecuta `npm run validate`. Los selectores y nombres accesibles existentes se consideran contratos de las pruebas E2E.
