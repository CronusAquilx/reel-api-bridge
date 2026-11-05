"""Connect completed native imports and preserve every previous saved selection."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
NATIVE = ROOT / "src/assets/wallpapers/native"
TARGET = ROOT / "src/lib/astra/wallpaper-originals.ts"

manifest = json.loads((NATIVE / "manifest.json").read_text())
old_catalog = TARGET.read_text()
old_imports = dict(re.findall(r'import (\w+) from "@/([^\"]+)";', old_catalog))
old_upgrade_refs = re.findall(r'"([^\"]+)": (\w+)\.url', old_catalog)
old_id_refs = dict(re.findall(r'"([^\"]+)": \{ video: (\w+)\.url', old_catalog))
prior_by_id = {}
for item_id, symbol in old_id_refs.items():
    pointer = json.loads((ROOT / "src" / old_imports[symbol]).read_text())
    prior_by_id[item_id] = [pointer["url"]] + [url for url, ref in old_upgrade_refs if ref == symbol]

imports, entries, upgrades = [], [], {}
complete = []
for item in manifest:
    checkpoint = NATIVE / "checkpoints" / (item["id"] + ".json")
    if not checkpoint.exists():
        raise RuntimeError("Import is unfinished: " + item["id"])
    result = json.loads(checkpoint.read_text())
    if result["status"] != "complete":
        continue
    n = len(complete)
    video = json.loads((ROOT / "src" / result["videoPointer"]).read_text())
    image = json.loads((ROOT / "src" / result["imagePointer"]).read_text())
    if video.get("size") != result["bytes"] or not image.get("url"):
        raise RuntimeError("Invalid imported media: " + item["id"])
    imports.extend([f'import video{n} from "@/{result["videoPointer"]}";',
                    f'import image{n} from "@/{result["imagePointer"]}";'])
    entries.append(f'  {json.dumps(item["id"])}: {{ video: video{n}.url, image: image{n}.url, resolution: {json.dumps(result["resolution"])} }},')
    for previous in set(item.get("previousUrls", []) + [item["video"]] + prior_by_id.get(item["id"], [])):
        upgrades[previous] = f"video{n}.url"
    complete.append(result)

output = "\n".join(imports) + '\n\nexport const WALLPAPER_ORIGINALS: Record<string, { video: string; image: string; resolution: string }> = {\n'
output += "\n".join(entries) + '\n};\n\nexport const WALLPAPER_VIDEO_UPGRADES: Record<string, string> = {\n'
output += "\n".join(f'  {json.dumps(url)}: {ref},' for url, ref in upgrades.items()) + "\n};\n"
TARGET.write_text(output)
print("Connected", len(complete), "native originals;", len(manifest) - len(complete), "source previews retained")
print("Native 4K or higher:", sum(item["width"] >= 3840 and item["height"] >= 2160 for item in complete))
print("Uncompressed originals:", round(sum(item["bytes"] for item in complete) / 1024**3, 2), "GiB")