<!-- Documento generado el 2026-11-15-0818 -->

# Aceptación del editor

## Aceptación adicional obligatoria · 15-11-2026

Alcance: creación sencilla de clanes desde cero para personas sin conocimientos técnicos, con Trainworks Reloaded y Conductor como únicos proveedores de mecánicas.

- [ ] Una persona principiante completa identidad, campeones, sendas, cartas, pools, desbloqueos y arte mediante formularios y selectores, sin escribir JSON, C# ni comandos.
- [ ] El flujo genera identificadores y referencias; los conceptos necesarios se explican con ayudas y ejemplos.
- [ ] Las mecánicas ofrecidas identifican proveedor y compatibilidad; no se ofrecen efectos C# propios ni librerías adicionales.
- [ ] Un clan importado con mecánicas ajenas se identifica como parcialmente editable y conserva su contenido sin sustituciones automáticas.
- [ ] Los ejemplos se pueden modificar mediante ese mismo flujo. FullClan como fuentes C# se retira del inicio o se sustituye; Free Company se revisa antes de presentarlo como ejemplo íntegramente compatible.
- [ ] La compilación y la preparación del mod se hacen desde el editor. Las dependencias necesarias se detectan y explican; GitHub es opcional.
- [ ] El clan generado aparece y funciona en el juego con sus campeones, sendas, cartas, arte y desbloqueos configurados.

- [ ] Crear mi clan abre el asistente en el orden especificado en PLAN.md, con tres niveles dentro de cada una de las seis sendas.
- [ ] Cada paso explica su propósito, muestra ejemplos y permite volver sin perder datos; campos y reglas salen de configuración.
- [ ] Guardar y salir permite reanudar en el paso guardado tras cerrar y abrir el editor, incluso con un borrador incompleto.
- [ ] Unidades, hechizos, salas y artefactos permiten añadir, editar y duplicar contenido; las secciones opcionales se pueden omitir y completar después.
- [ ] Los problemas de revisión final llevan al paso y campo que hay que corregir; el resultado preparado se prueba dentro del juego.

- [ ] Los pasos del asistente muestran ejemplos revisados de las versiones actuales de Free Company, W&W Inc. y SuccClan cuando existan candidatos compatibles.
- [ ] Ningún ejemplo necesita efectos, estados, habilidades o parches C# propios del clan; se revisan todas las dependencias y se registran proveedor, versión y hashes.
- [ ] Usar como base crea contenido independiente sin requerir la DLL del clan original. Cambios en las fuentes invalidan la revisión del candidato; no se utilizan paquetes antiguos como fuente automática.

**Estado: pendiente.** Las comprobaciones históricas siguientes no certifican estos nuevos criterios.


> Antecedente técnico al 08-10-2026: [cierre verificado y pendientes de entrega](CIERRE-2026-10-08.md). Los incrementos fechados de este documento describen la evolución del proyecto.

## Revisión del 07-10-2026

Estado: validación automática completada; aceptación visual y en partida pendiente.

- 101 pruebas superadas; compilación del servidor y web correcta.
- Lectura HTTP de 16 entradas de la biblioteca y seis rutas por entrada: objetos, campeones, personaje, checklist de arte, compatibilidad de mecánicas y bundles. Las 96 respuestas cumplen los contratos comprobados.
- Las escrituras de prueba se realizan en carpetas temporales. El recorrido HTTP solo usa GET y conserva los mods de la biblioteca.
- Corregidos: selección residual al cambiar de objeto/sección; acceso con Enter/Espacio y foco visible en tablas; etiquetas del formulario de estados; nombres accesibles de botones de ordenación; referencias locales que intentaban pasar por externas; estados vacíos o mal formados; IDs duplicados entre archivos en edición avanzada; cambios en disco durante su guardado.
- El guardado avanzado comprueba también la ruta resuelta, crea un temporal exclusivo y lo retira si falla. Una modificación concurrente detectada no se sobrescribe.

### Repetir el recorrido HTTP

Con el editor arrancado, desde esta carpeta:

```powershell
node scripts/check-library.mjs
```

URL, tiempo máximo y rutas están en `config/acceptance.json`. Para otro puerto:

```powershell
node scripts/check-library.mjs http://127.0.0.1:4318
```

Informe: `data/acceptance/library-http.json` (local, ignorado por Git). Incluye cantidades por ruta, errores de validación por código y hasta tres ejemplos por clan. Un OK acredita la lectura HTTP; los errores de contenido se muestran por separado. El script devuelve error si alguna respuesta falla o incumple el contrato.

### Incidencias de contenido observadas

Las siete instalaciones personalizadas principales, Deva, la demo y las importaciones de Free Company, Disciple/Arcadian y Steward Guild no muestran errores de validación. Cuatro importaciones adicionales sí:

| Copia importada | Errores | Ejemplos |
| --- | ---: | --- |
| Sweetkins | 2 | Referencias a `@crabcake` ausente. |
| Sandscourged | 1 | Tooltip `@TestTooltip` ausente. |
| Yokai | 2 | Habilidades `@Foxcharm1Ability` y `@Foxcharm2Ability` ausentes. |
| Silksong | 156 | Definiciones duplicadas en `json/champion/Nueva carpeta/`, referencias e imágenes ausentes. |

Estos resultados corresponden a las carpetas de la biblioteca actual; no acreditan ni descartan el funcionamiento de otras versiones de esos mods. No se han reparado automáticamente: retirar una definición o sustituir una referencia exige identificar su intención.

## Recorrido visual pendiente

La automatización del navegador no arrancó: el entorno de Windows devolvió `apply deny-read ACLs`. No hay una comprobación visual ejecutada en esta revisión.

Usar una copia del clan para estas pruebas:

| Pantalla | Recorrido | Criterio |
| --- | --- | --- |
| Cartas / Unidades / Todos los objetos / Mecánicas | Tab, Enter/Espacio, abrir varios objetos consecutivos. | Foco visible; cada inspector carga sus campos y selecciones; no conserva la revisión del objeto anterior. |
| Conexiones | Añadir, ordenar y quitar; cambiar objeto y sección. | Antes/después correcto; botones identificables; preservar metadatos y referencias vecinas. |
| Parámetros | Editar estados y cantidades; intentar valores vacíos o fraccionarios. | Campos etiquetados; rechazar referencias vacías y cantidades no enteras; conservar datos adicionales. |
| Arte / Vista de personaje | Roderic, Vesper, Carrier, Virodemonologist e Incubus Butcher; zoom y movimientos. | Comprobar encuadre y transformaciones, distinguir ajuste de vista de ajuste guardado. |
| Recursos | Campeones, selección, reliquias, estilos, atlas y bundles. | Rol e imagen correctos; recursos externos visibles como externos; avisos de plataforma comprensibles. |
| Estructura | Crear nodo conectado; reparar senda; editar varias unidades. | Revisar los objetos afectados y respaldos; recargar y confirmar referencias. |

## Aceptación en el juego pendiente

1. Compilar y empaquetar una copia de prueba; registrar versión de Trainworks, DLL y clan.
2. Comprobar selección de los dos campeones, starters, niveles de clan y cartas ocultas.
3. Probar sendas, efectos, triggers, estados, habilidades, reliquias y recompensas de mapa.
4. Comparar escala y altura del personaje frente a una captura con unidades oficiales; verificar pies y suelo. La vista 2D no reproduce animaciones, shaders ni cámara 3D.
5. Probar los casos de C# propio y bundles con sus dependencias reales; registrar logs y resultados.

Después: idiomas y selector persistente, comprobaciones Linux/macOS y documentación de entrega. Las imágenes oficiales como comparación en el visor siguen al final y con prioridad baja.

## Cierre técnico y entrega pendiente · 08-10-2026

Completados nodos custom_class, preservación de overrides vacíos y triggers sin buff_effect, filtros/progresión de pools ponderados, catálogo ES/EN de 1.501 textos y auditoría automática, copias editables de ejemplos y empaquetado configurable con lanzadores. Comparación opcional del visor con 353 sprites oficiales locales añadida; escala manual, sin reproducción de prefabs/animaciones.

Compilación y 128 pruebas correctas. La distribución de prueba arranca fuera del proyecto y permite copiar Free Company 0.2.6. La entrega normal exige dos clanes reales: falta identificar el segundo pedido como Conductor, que es una biblioteca. FullClan no contiene una clase de clan y no sirve como sustituto.

Pendientes de aceptación: recorrido visual (herramienta bloqueada por ACL), partida real, Linux/macOS y restauración autenticada de GitHub Packages. Matriz CI preparada, sin ejecutar ni publicar. El adaptador de descarte por pool espera confirmar una versión publicada compatible. Estado vigente y evidencias: [CIERRE-2026-10-08.md](CIERRE-2026-10-08.md). Los incrementos anteriores son históricos; no se declara terminada toda la entrega. Sin commit ni push.

### Ejemplos confirmados: FullClan y Free Company

El usuario confirmó FullClan como segundo ejemplo. La distribución normal incluye FullClan 0.3.0 (`source`, proyecto C# y licencia) y The Free Company 0.2.6 (`clan`, JSON/arte/fuentes/licencia). Biblioteca ofrece Copiar fuentes para FullClan y muestra su carpeta para abrir en un editor C#; Abrir copia añade Free Company a la biblioteca. Se conserva el mínimo de dos ejemplos y se valida cada uno según su tipo. Ya no queda pendiente identificar el segundo ejemplo. Los párrafos anteriores corresponden al estado histórico. Permanecen las comprobaciones externas recogidas en CIERRE-2026-10-08.md.

<!-- 2026-11-15-0818||codex-clan-editor||clan-editor/ACEPTACION.md||Actualizar alcance: creación sin programación con Trainworks y Conductor; ejemplos compatibles y aceptación guiada pendientes -->

<!-- 2026-11-15-0819||codex-clan-editor||clan-editor/ACEPTACION.md||Especificar asistente por pasos: clan, dos campeones y seis sendas, iniciales, unidades, hechizos, salas y artefactos; navegación y borrador reanudable -->

<!-- 2026-11-15-0822||codex-clan-editor||clan-editor/ACEPTACION.md||Añadir ejemplos por paso desde versiones actuales de Free Company, W&W y SuccClan; exigir revisión de dependencias sin C# propio y registrar versiones locales y exclusiones -->
