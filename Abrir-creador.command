#!/bin/sh
cd "$(dirname "$0")" || exit 1
CREATOR_NODE="$(command -v node)"
if [ -x runtime/node ]; then CREATOR_NODE="./runtime/node"; fi
if [ -z "$CREATOR_NODE" ]; then echo "Necesitas la distribucion completa de Clan Creator o Node instalado."; exit 1; fi
"$CREATOR_NODE" scripts/launch.mjs
