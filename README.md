<!-- Documento generado el 2026-11-16-2047 -->

# MT2 Clan Creator

A guided Monster Train 2 clan creator for people with no programming experience. Uses the game, Trainworks Reloaded and Conductor components.

Clan mechanics are defined in JSON using existing effects from Monster Train 2, Trainworks Reloaded, and Conductor 0.6.0. The creator compiles a standard loader for the game. It does not generate custom C# mechanics.

## License

The creator’s code is available under the [MIT License](LICENSE). Monster Train 2 artwork and assets, third-party dependencies, and example mod content retain their respective rights and notices. See [catalog credits](catalog/credits).

## Download and run on Windows

Download the Windows ZIP from [Releases](https://github.com/David-defrutos/mt2-clan-creator/releases), extract the entire folder to a writable location, and run **start-clan-creator.cmd**. It opens the creator in your browser. Node is included; no separate Node installation is needed.

English is the initial language. Spanish is available from the language selector, and the program remembers your choice.

## Create and try a clan

Choose **Create my clan** to start from scratch, learn with an official clan, or open an editable example of The Free Company, SuccClan, or W&W Inc. The community examples mark any effects that were simplified to work with the supported components.

Choose **Open an existing clan** to continue a saved clan, make a separate copy of it, or open a shared **.mt2draft** file. The wizard’s first step links straight to the card collection when the clan already has cards.

Follow the wizard to define two champions, their three paths each, starting cards, units, spells, rooms, equipment, artifacts, rewards and artwork. You can return to earlier steps, copy examples, edit or remove their effects, and undo changes.

The Windows distribution includes official examples with DLC and audited community examples. Complex official behavior can be copied without copying the name, artwork or base statistics.

**Install and play** shows any missing clan data and explains how to prepare the game. To compile, install **Monster Train 2** and the **.NET 10 SDK or newer**. The creator checks compilation requirements before enabling installation. The first build downloads the Trainworks Reloaded 0.8.0 and Conductor 0.6.0 references from their public GitHub releases, plus the BepInEx compilation reference from its public NuGet feed. You need an internet connection for these downloads. The creator saves the references for later builds. Install and play also checks for newer Trainworks and Conductor releases in the background. You can keep your current versions or choose a newer release for compilation.

To play, install BepInExPack, Trainworks Reloaded and Conductor through [Thunderstore Mod Manager](https://www.overwolf.com/app/thunderstore-thunderstore_mod_manager). The [r2modman](https://r2modman.com/download-latest/) guide is still in development. Select your profile. You can use **Check this profile** to look for the required files and available versions. With the game closed, install the clan, then launch that profile with mods enabled.

Champion previews let you choose a path and level without changing the draft. Cards fit the available space and can be enlarged for reading. Effects group timing, action, target, amount and duration, with detailed help available on demand.

The wizard marks a step ready when it has the required data. Validation messages open the affected card and field. Removed cards can be recovered immediately. Installation status compares the draft with the last installation recorded by this creator, and remembers the destination for that draft.

Use **Help** in the creator to open the reference pages for effects, timing, targets, unit abilities, card properties, and duration. **View guide** next to a field opens the corresponding page and shows which options are available for the current card. You can search, combine filters, or browse the full reference. **Back to editing** returns to the same form.

Common effects are grouped by purpose; search or **More effects** shows the full set. Importing artwork opens a preview before applying it, with separate guidance for card illustrations, combat characters and clan icons. Originals are preserved.

A new card in progress is saved automatically with its current step. **Save and close** pauses it; the welcome screen lets you resume the card or open the clan and return to the card later. It is included in backups but stays out of the playable clan until finished. The creator remembers the last card, path and editing level for each draft. Collections can be searched by name or effect, filtered and shown in a compact view. Path editing shows one level at a time and compares final statistics and effects across all three levels.

Warnings appear while editing and use the same checks as installation. Replacing a customized card or path requires reviewing the replacement; card names and images can be retained. Copied native effects keep any special conditions that the simple controls cannot safely change.

Use **My expansions** to choose which DLC examples to show. This is a manual preference, without checking your installation. Public packages include card illustrations and frames. Official combat character art comes from the installed game. Combat artwork for the audited The Free Company, SuccClan and W&W Inc. examples is included. Local original images are not deleted. After installation, the creator explains how to start the modded profile and find your clan. An in-game checklist records checks confirmed by you for that installed version. Changes that affect the game require reinstalling before confirming the new version; installation success never marks gameplay as tested.

**Stones and slabs** creates optional merchant upgrades for units or spells. Choose the run type, the benefit and its icon. The SuccClan example includes Curseguard Stone and Curseguard Slab.

**Clan assets** edits clan icon variants, card frames, map banners and the images shown when choosing a champion. Use **Card artwork** to review individual cards.

**Art workshop** uses four short screens: choose a style, select artwork, prepare a request, and import the result. A searchable visual library separates cards, combat characters, champion presentation, banners, frames, clan identity and in-game icons. Starting styles include card illustrations from all 13 official clans and complete English style guides for SuccClan, W&W Inc. and The Free Company. Community examples include additional reference images you can attach to the request. It prepares requests for ChatGPT or another image generator. Set a shared visual style, colours and a reference image, then describe the resource. Card illustrations can be explored as nine alternatives in a 3 × 3 sheet. Import the result, choose a cell and adjust its bounds before applying it. For final artwork or a combat character, use the chosen illustration as a reference.

The workshop covers card illustrations, combat characters, clan logos and silhouette, card reward icons, banner states, map and minimap icons, four card frames, both champions' icons, portraits and selection characters, and separate room, equipment and relic HUD icons. Frames use existing game artwork as a geometry template. Applied resources are included in the generated clan. Source images, requests and shared style stay in the draft and its portable backups. Nothing is sent to an AI service automatically. Before replacing an image, compare the current and proposed artwork. Keep the current image or apply the new one; each resource retains up to five previous versions that can be restored without reverting card rules. From an applied logo or champion portrait, preview and select related sizes and crops. Silhouettes are prepared only when the logo has real transparency.

Open **View card JSON** while editing a card to see its definition and related resources. Optional technical details in the final step show the complete generated JSON files in read-only mode. External changes do not update the wizard draft. The creator does not generate a CREADO-CON.md file or request an author field.

Use **Backups and updates** to save a portable **.mt2draft** file containing a draft and uploaded images. Restore it in a new version or on another computer; restoration creates an independent draft and does not overwrite existing work.

When drafts exist, **Continue my clan** opens your most recent work. **New card** guides you through type, example, basic values, effects and optional artwork; going back keeps your entries. Invalid numbers explain the allowed value and tell you when the previous value is retained. Collections remember their filters, sorting, compact view and scroll position.

Use **My whole clan** to see champions, paths, paired starters and reward cards, with direct editing links. Statistics and Install and play include optional balance suggestions based on official references; these do not block installation.

**Recover an earlier version** lets you save a recovery point, review changed cards and restore it. The current state is preserved before restoration. For moving multiple clans, **Save all my clans** creates one **.mt2collection** backup including uploaded artwork. Preview and select the clans to restore as independent drafts.

Drafts are stored under **data/creator-projects**. Keep the whole **data** folder when updating or moving to another computer. Extract updates separately; do not overwrite or delete your existing data folder. Deleted drafts can be restored from the creator; uninstalling a clan preserves its draft and backs up the installed copy.

## Development

See [the development guide](docs/DEVELOPMENT-2026-11-16-2047.md) for setup, resources, tests and packaging. Windows x64 is the tested distribution; macOS and Linux packages have not been validated.

Sort lists alphabetically by their displayed labels in the active language. Keep the natural order where it helps users follow a sequence, such as wizard steps or upgrade levels.

## Contact and credits

Discord: **frutos**. [Monster Train 2 modding channel](https://discord.com/channels/336546996779483136/1377778943674810368).

The creator relies on community tools, including [Trainworks Reloaded](https://github.com/Monster-Train-2-Modding-Group/Trainworks-Reloaded) and Conductor. Thanks to Amaury-Lepicard, amaurylepicard-neovision, crazyjackel, lostone-zc, TricksterGuy, and everyone who contributes to these tools. Resource provenance and notices are kept under **catalog/credits**. See the [Trainworks Reloaded](https://github.com/Monster-Train-2-Modding-Group/Trainworks-Reloaded) and [Conductor](https://github.com/Monster-Train-2-Modding-Group/Conductor) repositories for their licenses.

<!-- 2026-11-16-2047||codex-clan-editor||clan-creator/README.md||Sustituir historial e informes internos por guía pública de uso y enlace de desarrollo -->

<!-- 2026-11-16-2158||codex-clan-editor||clan-creator/README.md||Documentar ocho mejoras para uso público con inicio corto vista por senda copias y lanzador inglés -->

<!-- 2026-11-16-2340||codex-clan-editor||clan-creator/README.md||Documentar revisión guiada recuperación estados registrados y encuadre de imágenes -->

<!-- 2026-11-17-0037||codex-clan-editor||clan-creator/README.md||Documentar recuperación de contexto edición por nivel búsqueda sustituciones y ausencia de arte DLC en paquetes públicos -->

<!-- 2026-11-17-1903||codex-clan-editor||clan-creator/README.md||Documentar ocho mejoras de creación guiada contexto recuperación consejos y copias conjuntas -->

<!-- 2026-11-17-1909||codex-clan-editor||clan-creator/README.md||Retirar instrucciones del selector privado de guía pública -->

<!-- 2026-11-17-1918||codex-clan-editor||clan-creator/README.md||Documentar DLC con ilustraciones de cartas pero sin distribuir sus personajes de combate -->

<!-- 2026-11-17-1919||codex-clan-editor||clan-creator/README.md||Explicitar inclusión de personajes de los tres mods auditados -->

<!-- 2026-11-17-1958||codex-clan-editor||clan-creator/README.md||Documentar taller guiado de IA estilo compartido selección de láminas y recursos adicionales instalables -->

<!-- 2026-11-17-2002||codex-clan-editor||clan-creator/README.md||Documentar iconos adicionales y acceso al taller desde la creación de cartas -->

<!-- 2026-11-17-2247||codex-clan-editor||clan-creator/README.md||Documentar ocho mejoras de taller breve biblioteca estilos variantes historial pausas y prueba manual -->

<!-- 2026-11-19-0801||codex-clan-editor||clan-creator/README.md||Actualizar guía sobre reanudación y recuperación desde una versión anterior -->

<!-- 2026-11-19-2226||codex-clan-editor||clan-creator/README.md||Retirar las instrucciones de la opción eliminada de la portada -->

<!-- 2026-11-19-2258||codex-clan-editor||clan-creator/README.md||Explicar qué cubre la licencia MIT y dónde consultar los avisos de terceros -->

<!-- 2026-11-19-2258||codex-clan-editor||clan-creator/README.md||Explicar que las reglas se guardan en JSON y que la DLL solo usa el cargador estándar -->

<!-- 2026-11-19-2258||codex-clan-editor||clan-creator/README.md||Indicar Conductor 0.6.0 en el alcance de los efectos disponibles -->

<!-- 2026-11-21-0949||codex-clan-editor||clan-creator/README.md||Documentar la primera compilacion con descargas publicas y referencias en cache -->

<!-- 2026-11-21-0952||codex-clan-editor||clan-creator/README.md||Describir actualizaciones voluntarias y visor JSON por carta -->

<!-- 2026-11-21-1000||codex-clan-editor||clan-creator/README.md||Actualizar la guia de arranque de Windows al lanzador unico -->

<!-- 2026-11-21-1006||codex-clan-editor||clan-creator/README.md||Documentar las dos opciones de Crear mi primer clan -->

<!-- 2026-11-21-1011||codex-clan-editor||clan-creator/README.md||Documentar opciones vigentes al crear el primer clan -->

<!-- 2026-11-21-1013||codex-clan-editor||clan-creator/README.md||Actualizar el nombre del boton en la guia del repositorio -->

<!-- 2026-11-21-1021||codex-clan-editor||clan-creator/README.md||Documentar el recorrido sin revision personal y el nuevo nombre de la pantalla de instalacion -->

<!-- 2026-11-21-1030||codex-clan-editor||clan-creator/README.md||Informar de la galeria y guias completas en el taller de arte -->

<!-- 2026-11-21-1119||codex-clan-editor||clan-creator/README.md||Documentar cómo crear, abrir, duplicar y editar los clanes comunitarios -->

<!-- 2026-11-21-1218||codex-clan-editor||clan-creator/README.md||Documentar qué arte de combate se incorpora a la distribución -->

<!-- 2026-11-21-1227||codex-clan-editor||clan-creator/README.md||Actualizar los agradecimientos del repositorio -->

<!-- 2026-11-21-1229||codex-clan-editor||clan-creator/README.md||Mostrar solo los nombres de GitHub en los agradecimientos, en orden alfabético -->

<!-- 2026-11-21-1335||codex-clan-editor||clan-creator/README.md||Documentar dónde se editan las mejoras de mercader y los recursos del clan -->

<!-- 2026-11-21-1427||codex-clan-editor||clan-creator/README.md||Documentar el orden alfabético por defecto para las listas -->
<!-- 2026-11-21-1931||codex-clan-editor||clan-creator/README.md||Explicar cómo consultar la documentación y volver al asistente -->
<!-- 2026-11-21-1945||codex-clan-editor||clan-creator/README.md||Explicar dónde consultar los requisitos del perfil antes de instalar -->
