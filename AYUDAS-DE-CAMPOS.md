# Ayudas de los formularios

Las etiquetas cuentan con un botón «?» cuando hay una explicación configurada. La ayuda define el concepto, qué modifica y, cuando procede, da un ejemplo. Se distinguen el nombre visible y el identificador, la capacidad de una unidad y el tamaño de su imagen, las cartas iniciales y los campeones, los pools y las cantidades, y los recursos locales y externos.

- `config/ui-help.json`: 57 ayudas reutilizables para formularios de creación, conexiones, pools, recompensas, arte, comparaciones, compilación y publicación.
- `config/fields.json`: explicación específica de los 247 campos del inspector; completadas las 69 que faltaban.
- Configuración de personaje y conexiones: se conservan sus ayudas específicas.
- `config/locales/es.json` y `en.json`: traducciones de las ayudas y etiquetas.

Las ayudas se cargan desde `/api/config`; cambiar su configuración no exige reconstruir el código. Recarga el editor para obtener la configuración actualizada. Si cambias el texto, actualiza ambos catálogos de idiomas.

## Interacción

Se pueden abrir al pasar el ratón, dar foco con Tab o pulsar «?». Enter/Espacio funciona con teclado; Escape las cierra. El texto se presenta sobre los paneles y diálogos, con posición ajustada al área visible. Abrir una ayuda no debe cambiar la selección de un campo o casilla.

## Verificación

Compilación correcta, auditoría de 1.626 textos ES/EN sin ausencias y 129 pruebas superadas. `npm run check:i18n` también comprueba que cada campo configurado tiene ayuda y que las etiquetas con tooltip apuntan a una ayuda disponible. El recorrido interactivo del navegador no se ha ejecutado: la herramienta sigue fallando al iniciar por `apply deny-read ACLs`.

Cambios locales, sin commit ni push.
