import json

file_path = r"c:\Users\hp\fiezel-apps\tools\chunk_ind_8_b5.json"
with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print("Code:", data["code"])
print("Grade:", data["grade"])
print("Name:", data["name"])
print("Materi:", data["materi"])
print("cpRef:", data["cpRef"])
print("Items count:", len(data["items"]))

forbidden = ["pilihan a", "pilihan b", "pilihan c", "pilihan d", "jawaban a", "jawaban b", "jawaban c", "jawaban d", "opsi di atas", "pilihan di atas", "opsi a", "opsi b", "opsi c", "opsi d"]

difficulties = {}
for item in data["items"]:
    assert item["id"].startswith("ind-d-8-b5-q"), f"Invalid id: {item['id']}"
    assert len(item["options"]) == 4, f"Options count error in {item['id']}"
    assert item["answer"] == 0, f"Answer not 0 in {item['id']}"
    assert "0" in item["why"], f"Missing key 0 in why for {item['id']}"
    assert set(item["distractorWhy"].keys()) == {"1", "2", "3"}, f"distractorWhy keys error in {item['id']}"
    
    full_text = json.dumps(item, ensure_ascii=False).lower()
    for word in forbidden:
        assert word not in full_text, f"Forbidden word '{word}' found in {item['id']}"

    d = item["difficulty"]
    difficulties[d] = difficulties.get(d, 0) + 1

print("Difficulty distribution:", difficulties)
print("ALL CHECKS PASSED PERFECTLY!")
