<!-- Documento generado el 2026-11-15-0828 -->

# MT2 Clan Creator

Un creador de clanes de Monster Train 2 para personas sin conocimientos de programación.

## La experiencia que vamos a construir

Un único asistente acompaña al usuario: nombre del clan → campeón 1 y sus tres sendas → campeón 2 y sus tres sendas → cartas iniciales → unidades → hechizos → salas → artefactos → revisión y prueba.

Cada paso explica qué hay que hacer, propone valores y permite guardar y continuar otro día. Solo se ofrecen mecánicas del juego disponibles mediante **Trainworks Reloaded y Conductor**. El usuario no necesita escribir JSON, C# ni comandos. Los ejemplos se seleccionan de las versiones actuales de Free Company, W&W Inc. y SuccClan, previa revisión de sus dependencias para excluir código propio de esos clanes.

## Estado real

**Repositorio independiente creado; el nuevo asistente todavía no está implementado.** El código ejecutable inicial procede del editor anterior y conserva sus pantallas. No es una entrega terminada para principiantes. El siguiente desarrollo debe sustituir esa experiencia por el asistente definido en el [plan del creador](PLAN-CREADOR-2026-11-15-0828.md).

La simplicidad se mide por lo que puede completar una persona principiante, no por cuántas herramientas técnicas conserva la base heredada.

## Conservación del trabajo anterior

- Original: `D:/Juegos/MT2_mod/clan-editor`, [mt2-clan-editor](https://github.com/David-defrutos/mt2-clan-editor). No se ha modificado para crear esta copia.
- Nuevo proyecto: `D:/Juegos/MT2_mod/clan-creator`, [mt2-clan-creator](https://github.com/David-defrutos/mt2-clan-creator).
- Historial completo conservado desde `9f951e5`, sin compartir archivos Git mediante hardlinks.
- Los últimos cambios locales de planificación se guardaron en el commit `982497e` del nuevo proyecto. El README anterior se puede consultar en ese commit.
- `origin` apunta al nuevo repositorio. `upstream` identifica el original; no se actualiza ni se sobrescribe automáticamente.
- `data/`, credenciales, mods instalados, dependencias y recursos locales no se copian al repositorio nuevo ni se publican. Siguen conservados en su ubicación original. El creador tendrá sus propios proyectos y respaldos.

Los documentos históricos heredados describen el editor anterior y se conservan como referencia. El alcance y la prioridad del nuevo producto los fija el plan del creador.

## Desarrollo

Esta sección es para desarrollar la aplicación, no para la persona que creará su clan. Se preparará una distribución con arranque sencillo cuando exista el asistente.

Recomendado Node.js 24 y SDK .NET 10 para las pruebas de compilación de mods.

```powershell
Set-Location 'D:\Juegos\MT2_mod\clan-creator'
npm ci
npm run build
npm start
```

Abrir `http://127.0.0.1:4320`. El editor original mantiene su puerto 4318. Para desarrollar la web, `npm run dev:web` usa 5174 y conecta al servidor del creador en 4320; `npm run dev:server` inicia ese servidor.

Comprobaciones: `npm test`, `npm run build` y `npm run check:i18n`. Las pruebas existentes sirven para verificar el motor heredado; no acreditan que el nuevo recorrido para principiantes esté completo.

<!-- 2026-11-15-0828||codex-clan-editor||clan-creator/README.md||Definir nuevo producto para principiantes, separación del editor original y estado pendiente del asistente -->
