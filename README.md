<!-- Documento generado el 2026-11-16-2047 -->

# MT2 Clan Creator

A guided Monster Train 2 clan creator for people with no programming experience. Uses the game, Trainworks Reloaded and Conductor components.

Clan mechanics are defined in JSON using existing effects from Monster Train 2, Trainworks Reloaded, and Conductor 0.6.0. The creator compiles a standard loader for the game. It does not generate custom C# mechanics.

## License

The creator’s code is available under the [MIT License](LICENSE). Monster Train 2 artwork and assets, third-party dependencies, and example mod content retain their respective rights and notices. See [catalog credits](catalog/credits).

## Download and run on Windows

Download the Windows ZIP from [Releases](https://github.com/David-defrutos/mt2-clan-creator/releases), extract the entire folder to a writable location, and run **Launch-Creator.cmd**. It opens the creator in your browser. Node is included; no separate Node installation is needed.

English is the initial language. Spanish is available from the language selector, and the program remembers your choice.

## Create and try a clan

Choose **Create my first clan** for a short seven-step route with prepared champions, paths, starters and three example cards, or **Create my clan** to start empty. All clan steps remain available, and you can switch to the full wizard.

Follow the wizard to define two champions, their three paths each, starting cards, units, spells, rooms, equipment, artifacts, rewards and artwork. You can return to earlier steps, copy examples, edit or remove their effects, and undo changes.

The Windows distribution includes 938 current official examples from 13 clans, including DLC, and 124 audited mod examples compatible with the supported components. Complex official behavior can be copied without copying the name, artwork or base statistics.

**Review and install** checks your clan and explains how to prepare the game. To compile, install **Monster Train 2** and the **.NET 10 SDK or newer**. The creator checks compilation requirements before enabling installation. Trainworks Reloaded 0.8.0 and Conductor 0.6.0 references are included for compilation.

To play, install BepInExPack, Trainworks Reloaded and Conductor through [Thunderstore Mod Manager](https://www.overwolf.com/app/thunderstore-thunderstore_mod_manager). The [r2modman](https://r2modman.com/download-latest/) guide is still in development. With the game closed, provide your profile folder and install the clan, then launch that profile with mods enabled.

Champion previews let you choose a path and level without changing the draft. Cards fit the available space and can be enlarged for reading. Effects group timing, action, target, amount and duration, with detailed help available on demand.

Ready steps and steps reviewed by you are shown separately. Review messages open the affected card and field. Removed cards can be recovered immediately. Installation status compares the draft with the last installation recorded by this creator, and remembers the destination for that draft.

Common effects are grouped by purpose; search or **More effects** shows the full set. Importing artwork opens a preview before applying it, with separate guidance for card illustrations, combat characters and clan icons. Originals are preserved.

A new card in progress is saved automatically with its current step. **Save and close** pauses it; continuing the clan reopens that card. It is included in backups but stays out of the playable clan until finished. The creator remembers the last card, path and editing level for each draft. Collections can be searched by name or effect, filtered and shown in a compact view. Path editing shows one level at a time and compares final statistics and effects across all three levels.

Warnings appear while editing and use the same checks as the final review. Replacing a customized card or path requires reviewing the replacement; card names and images can be retained. Copied native effects keep any special conditions that the simple controls cannot safely change.

Use **My expansions** to choose which DLC examples to show. This is a manual preference, without checking your installation. Public packages include DLC card illustrations and frames, but exclude DLC combat character images. Character artwork supplied with the audited The Free Company, SuccClan and W&W Inc. examples remains included. Original game characters are referenced from the installed game; their resources must be available there. Local original images are not deleted. After installation, the creator explains how to start the modded profile and find your clan. An in-game checklist records checks confirmed by you for that installed version. Changes that affect the game require reinstalling before confirming the new version; installation success never marks gameplay as tested.

**Art workshop** uses four short screens: choose a style, select artwork, prepare a request, and import the result. A searchable visual library separates cards, combat characters, champion presentation, banners, frames, clan identity and in-game icons. Starting styles include a bundled visual reference and editable descriptions. It prepares requests for ChatGPT or another image generator. Set a shared visual style, colours and a reference image, then describe the resource. Card illustrations can be explored as nine alternatives in a 3 × 3 sheet. Import the result, choose a cell and adjust its bounds before applying it. For final artwork or a combat character, use the chosen illustration as a reference.

The workshop covers card illustrations, combat characters, clan logos and silhouette, card reward icons, banner states, map and minimap icons, four card frames, both champions' icons, portraits and selection characters, and separate room, equipment and relic HUD icons. Frames use existing game artwork as a geometry template. Applied resources are included in the generated clan. Source images, requests and shared style stay in the draft and its portable backups. Nothing is sent to an AI service automatically. Before replacing an image, compare the current and proposed artwork. Keep the current image or apply the new one; each resource retains up to five previous versions that can be restored without reverting card rules. From an applied logo or champion portrait, preview and select related sizes and crops. Silhouettes are prepared only when the logo has real transparency.

Optional technical details show the generated JSON in read-only mode. External changes do not update the wizard draft. The creator does not generate a CREADO-CON.md file or request an author field.

Use **Backups and updates** to save a portable **.mt2draft** file containing a draft and uploaded images. Restore it in a new version or on another computer; restoration creates an independent draft and does not overwrite existing work.

When drafts exist, **Continue my clan** opens your most recent work. **New card** guides you through type, example, basic values, effects and optional artwork; going back keeps your entries. Invalid numbers explain the allowed value and tell you when the previous value is retained. Collections remember their filters, sorting, compact view and scroll position.

Use **My whole clan** to see champions, paths, paired starters and reward cards, with direct editing links. Statistics and final review include optional balance suggestions based on official references; these do not block installation.

**Recover an earlier version** lets you save a recovery point, review changed cards and restore it. The current state is preserved before restoration. For moving multiple clans, **Save all my clans** creates one **.mt2collection** backup including uploaded artwork. Preview and select the clans to restore as independent drafts.

Drafts are stored under **data/creator-projects**. Keep the whole **data** folder when updating or moving to another computer. Extract updates separately; do not overwrite or delete your existing data folder. Deleted drafts can be restored from the creator; uninstalling a clan preserves its draft and backs up the installed copy.

## Development

See [the development guide](docs/DEVELOPMENT-2026-11-16-2047.md) for setup, resources, tests and packaging. Windows x64 is the tested distribution; macOS and Linux packages have not been validated.

## Contact and credits

Discord: **frutos**. [Monster Train 2 modding channel](https://discord.com/channels/336546996779483136/1377778943674810368).

The creator relies on community tools, including [Trainworks Reloaded](https://github.com/Monster-Train-2-Modding-Group/Trainworks-Reloaded) and Conductor. Thanks to Brandon (**tricksterguy** on Discord) and their contributors. Resource provenance and notices are kept under **catalog/credits** and in the distribution's dependency license files.

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
