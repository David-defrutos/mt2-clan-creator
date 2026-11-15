# Edición por campeón, senda y nivel

## Pantalla

Arriba hay tres selectores: Campeón, Senda (1–3) y Nivel (1–3). Debajo aparece la mejora local del nivel elegido: nombre, descripción, bonificaciones de ataque, salud y capacidad, icono y conexiones disponibles. Cada campo tiene ayuda. La capacidad no es el tamaño de la imagen.

La pantalla es la vista principal de Campeones y sendas. También aparece al elegir la sección upgrades en Todos los objetos o al abrir una mejora de campeón desde la comparación. Al abrir una mejora asignada se selecciona su campeón/senda/nivel. Se conserva la selección tras guardar. Comparación de estadísticas, estructura del árbol, otras mejoras y edición avanzada siguen accesibles en paneles plegables.

## Guardado

Se editan los campos en conjunto, se revisa la lista Antes/Después y se guardan con un único reemplazo del archivo y copia de seguridad. Cada cambio mantiene la validación del editor de campos. Se conservan comentarios, BOM, saltos de línea, campos desconocidos, otros idiomas, referencias externas y el resto de definiciones. Previsualizaciones obsoletas se rechazan. Si falla el reemplazo, el original queda intacto y se retira el temporal.

Mientras haya cambios sin guardar no se cambia de campeón/senda/nivel ni se guarda arte por separado: se guardan o descartan primero. No se inventan mejoras para niveles ausentes ni se convierten referencias externas en locales. Las mejoras compartidas muestran todos los niveles locales detectados; editarlas modifica el objeto compartido.

## Configuración y pruebas

Campos y ayudas en config/fields.json, selectores en config/ui-help.json, límites de sendas/niveles en config/champions.json. Etiquetas y ayudas ES/EN en config/locales. El servidor valida y revisa cambios en /api/upgrade-form/preview y /save.

Compilación e idiomas correctos; 132 pruebas superadas, incluidas tres nuevas de guardado conjunto, conservación de datos, rechazo de revisiones/valores inválidos y fallo de reemplazo. No se han guardado cambios en clanes instalados. La revisión interactiva del navegador continúa pendiente por el error de ACL ya documentado.

Cambios locales, sin commit ni push.
