import json
import os

p = r"c:\Users\hp\fiezel-apps\tools\chunk_eng_8_c2.json"
with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)

diff_map = {
    "easy": "dasar",
    "medium": "sedang",
    "hard": "tinggi",
    "dasar": "dasar",
    "sedang": "sedang",
    "tinggi": "tinggi"
}

for item in data.get("items", []):
    old_diff = item.get("difficulty", "dasar")
    item["difficulty"] = diff_map.get(old_diff, "dasar")

with open(p, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Fixed eng8_c2 difficulty mappings.")
