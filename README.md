<!-- Documento generado el 2026-11-16-2047 -->

# MT2 Clan Creator

A guided Monster Train 2 clan creator for people with no programming experience. Uses the game, Trainworks Reloaded and Conductor components.

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

Optional technical details show the generated JSON in read-only mode. External changes do not update the wizard draft. The creator does not generate a CREADO-CON.md file or request an author field.

Use **Backups and updates** to save a portable **.mt2draft** file containing a draft and uploaded images. Restore it in a new version or on another computer; restoration creates an independent draft and does not overwrite existing work.

Drafts are stored under **data/creator-projects**. Keep the whole **data** folder when updating or moving to another computer. Extract updates separately; do not overwrite or delete your existing data folder. Deleted drafts can be restored from the creator; uninstalling a clan preserves its draft and backs up the installed copy.

## Development

See [the development guide](docs/DEVELOPMENT-2026-11-16-2047.md) for setup, resources, tests and packaging. Windows x64 is the tested distribution; macOS and Linux packages have not been validated.

## Contact and credits

Discord: **frutos**. [Monster Train 2 modding channel](https://discord.com/channels/336546996779483136/1377778943674810368).

The creator relies on community tools, including [Trainworks Reloaded](https://github.com/Monster-Train-2-Modding-Group/Trainworks-Reloaded) and Conductor. Thanks to Brandon (**tricksterguy** on Discord) and their contributors. Resource provenance and notices are kept under **catalog/credits** and in the distribution's dependency license files.

<!-- 2026-11-16-2047||codex-clan-editor||clan-creator/README.md||Sustituir historial e informes internos por guía pública de uso y enlace de desarrollo -->

<!-- 2026-11-16-2158||codex-clan-editor||clan-creator/README.md||Documentar ocho mejoras para uso público con inicio corto vista por senda copias y lanzador inglés -->
