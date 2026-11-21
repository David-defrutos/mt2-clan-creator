"""Extract previews for official relics and the four native clan icon variants."""
import argparse
import hashlib
import io
import json
import struct
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--game-data", type=Path, required=True)
args = parser.parse_args()
catalog = ROOT / "catalog/official"
workspace = ROOT.parent
settings = json.loads((ROOT / "config/creator.json").read_text(encoding="utf-8"))
relic_ids = {
    doc["id"]
    for source in (workspace / "datos-juego/MonsterTrain2GameData/CollectableRelicData").glob("*.json")
    for doc in json.loads(source.read_text(encoding="utf-8-sig")).get("relics", [])
}
class_ids = set(settings["officialDataImport"]["classNames"])
env = UnityPy.load(str(args.game_data / "sharedassets0.assets"))
generator = TypeTreeGenerator(next(iter(env.files.values())).unity_version)
generator.load_local_game(str(args.game_data.parent))
class_nodes = generator.get_nodes_up("Assembly-CSharp", "ClassData")
sprites = {obj.path_id: obj for obj in env.objects if obj.type.name == "Sprite"}
stamp = datetime.now(ZoneInfo("Europe/Madrid")).strftime("%Y-%m-%d-%H%M")


def write(path, data):
    before = path.stat().st_mtime_ns if path.exists() else None
    if path.exists():
        old = path.read_bytes()
        if old == data:
            return
    if (path.stat().st_mtime_ns if path.exists() else None) != before:
        raise RuntimeError("Concurrent edit: " + path.name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    if path.stat().st_size != len(data):
        raise OSError("Incomplete write")
    with (workspace / "docs/registro/codex-clan-editor.md").open("a", encoding="utf-8") as log:
        log.write(f"{stamp}||codex-clan-editor||{path.relative_to(workspace).as_posix()}||Extraer icono oficial o índice de iconos\n")


def save(sprite):
    with io.BytesIO() as data:
        sprite.read().image.convert("RGBA").save(data, format="PNG")
        png = data.getvalue()
    filename = hashlib.sha256(png).hexdigest() + ".png"
    write(catalog / "assets" / filename, png)
    return "official/assets/" + filename


relics, clans = {}, {}
for obj in env.objects:
    if obj.type.name != "MonoBehaviour":
        continue
    raw = obj.get_raw_data()
    if len(raw) < 32:
        continue
    size = struct.unpack_from("<i", raw, 28)[0]
    if not 0 < size < 200:
        continue
    name = raw[32:32 + size].decode("utf-8", errors="replace")
    if name in class_ids:
        typed = obj.read_typetree(nodes=class_nodes)
        icons = {}
        for variant, ref in typed["icons"].items():
            sprite = sprites.get(ref["m_PathID"]) if ref["m_FileID"] == 0 else None
            if sprite:
                icons[variant] = save(sprite)
        if icons:
            key = name.removeprefix("Class").lower()
            clans["wurmkin" if key == "wurm" else key] = icons
    elif name in relic_ids:
        # RelicData stores icon and iconSmall as consecutive local Sprite PPtrs.
        # Skip ambiguous objects; some assets are absent from this Unity file.
        matches = []
        for offset in range(32 + ((size + 3) // 4) * 4, len(raw) - 11, 4):
            file_id, object_id = struct.unpack_from("<iq", raw, offset)
            if file_id == 0 and object_id in sprites:
                matches.append((offset, sprites[object_id]))
        if len(matches) == 2 and matches[1][0] - matches[0][0] == 12:
            relics[name] = {"picture": save(matches[0][1]), "detailPicture": save(matches[1][1])}
write(catalog / "icon-manifest.json", (json.dumps({"relics": relics, "clans": clans}, sort_keys=True, indent=2) + "\n").encode("utf-8"))
print(f"{len(relics)}/{len(relic_ids)} relics, {len(clans)}/{len(class_ids)} clans")
print("Missing relic previews:", ", ".join(sorted(relic_ids - relics.keys())))
# 2026-11-21-1330||codex-clan-editor||clan-creator/scripts/extract-creator-icons.py||Extraer iconos auténticos de artefactos y clanes del juego instalado sin tocar sprites de combate
