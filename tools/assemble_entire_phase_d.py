import json
import os

content_dir = r"c:\Users\hp\fiezel-apps\content\mapel"
tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def load_json(p):
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save_json(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

def fix_difficulty(comp):
    diff_map = {
        "easy": "dasar", "mudah": "dasar", "dasar": "dasar",
        "medium": "sedang", "sedang": "sedang",
        "hard": "tinggi", "sulit": "tinggi", "tinggi": "tinggi"
    }
    for item in comp.get("items", []):
        old_diff = item.get("difficulty", "dasar")
        item["difficulty"] = diff_map.get(old_diff, "dasar")
        for k in ["1", "2", "3"]:
            if k in item.get("distractorWhy", {}):
                val = item["distractorWhy"][k]
                if len(val.strip()) <= 10:
                    item["distractorWhy"][k] = val.strip() + " yang merupakan analisis kekeliruan jawaban."
    return comp

# 1. MATEMATIKA (Grade 7 Bab 1-6 + Grade 8 Bab 1)
mat_doc = "Matematika untuk SMP/MTs Kelas VII"
mat_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "MAT",
    "phase": "fase_d",
    "provenance": {
        "dokumen": mat_doc,
        "penerbit": "Pusat Kurikulum dan Perbukuan, Badan Penelitian dan Pengembangan dan Perbukuan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2021",
        "isbn": "978-602-244-883-9",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
for b in [1, 2, 3, 4, 5, 6]:
    c = load_json(os.path.join(tools_dir, f"chunk_mat_7_b{b}.json"))
    if c:
        c["cpRef"] = f"{mat_doc} — Bab {b}"
        mat_data["competencies"].append(fix_difficulty(c))

for b in [1]:
    c = load_json(os.path.join(tools_dir, f"chunk_mat_8_b{b}.json"))
    if c:
        c["cpRef"] = f"{mat_doc} — Bab {b} (Kelas VIII)"
        mat_data["competencies"].append(fix_difficulty(c))

save_json(os.path.join(content_dir, "mapel-mat-d.json"), mat_data)


# 2. BAHASA INDONESIA (Grade 7 Bab 1-6 + Grade 8 Bab 1-6)
ind_doc = "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi)"
ind_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "IND",
    "phase": "fase_d",
    "provenance": {
        "dokumen": ind_doc,
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2023",
        "isbn": "978-623-118-368-2",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
for b in [1, 2, 3, 4, 5, 6]:
    c = load_json(os.path.join(tools_dir, f"chunk_ind_7_b{b}.json"))
    if c:
        c["cpRef"] = f"{ind_doc} — Bab {b}"
        ind_data["competencies"].append(fix_difficulty(c))

for b in [1, 2, 3, 4, 5, 6]:
    c = load_json(os.path.join(tools_dir, f"chunk_ind_8_b{b}.json"))
    if c:
        c["cpRef"] = f"{ind_doc} — Bab {b} (Kelas VIII)"
        ind_data["competencies"].append(fix_difficulty(c))

save_json(os.path.join(content_dir, "mapel-ind-d.json"), ind_data)


# 3. BAHASA INGGRIS (Grade 7 Chapter 1-3 + Grade 8 Chapter 1-5 + Grade 9 Chapter 1-5)
eng_doc = "English for Nusantara untuk SMP/MTs Kelas VII"
eng_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "ENG",
    "phase": "fase_d",
    "provenance": {
        "dokumen": eng_doc,
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2022",
        "isbn": "978-602-244-885-3",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
for c_num in [1, 2, 3]:
    c = load_json(os.path.join(tools_dir, f"chunk_eng_7_c{c_num}.json"))
    if c:
        c["cpRef"] = f"{eng_doc} — Chapter {c_num}"
        eng_data["competencies"].append(fix_difficulty(c))

for c_num in [1, 2, 3, 4, 5]:
    c = load_json(os.path.join(tools_dir, f"chunk_eng_8_c{c_num}.json"))
    if c:
        c["cpRef"] = f"{eng_doc} — Chapter {c_num} (Kelas VIII)"
        eng_data["competencies"].append(fix_difficulty(c))

for c_num in [1, 2, 3, 4, 5]:
    c = load_json(os.path.join(tools_dir, f"chunk_eng_9_c{c_num}.json"))
    if c:
        c["cpRef"] = f"{eng_doc} — Chapter {c_num} (Kelas IX)"
        eng_data["competencies"].append(fix_difficulty(c))

save_json(os.path.join(content_dir, "mapel-eng-d.json"), eng_data)


# 4. IPS (Grade 7 Tema 1-4 + Grade 8 Tema 1)
ips_doc = "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi)"
ips_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "IPS",
    "phase": "fase_d",
    "provenance": {
        "dokumen": ips_doc,
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2023",
        "isbn": "978-623-118-437-5",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
for t_num in [1, 2, 3, 4]:
    c = load_json(os.path.join(tools_dir, f"chunk_ips_7_t{t_num}.json"))
    if c:
        c["cpRef"] = f"{ips_doc} — Tema {t_num:02d}"
        ips_data["competencies"].append(fix_difficulty(c))

for t_num in [1]:
    c = load_json(os.path.join(tools_dir, f"chunk_ips_8_t{t_num}.json"))
    if c:
        c["cpRef"] = f"{ips_doc} — Tema {t_num:02d} (Kelas VIII)"
        ips_data["competencies"].append(fix_difficulty(c))

save_json(os.path.join(content_dir, "mapel-ips-d.json"), ips_data)


# 5. IPA (Grade 7 Bab 1-7 + Grade 8 Bab 1-6)
ipa_data = load_json(os.path.join(content_dir, "mapel-ipa-d.json"))
ipa_doc = ipa_data.get("provenance", {}).get("dokumen", "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)")

existing_ipa = {c["code"]: c for c in ipa_data.get("competencies", [])}
for b in [1, 2, 3, 4, 5, 6]:
    c = load_json(os.path.join(tools_dir, f"chunk_ipa_8_b{b}.json"))
    if c:
        c["cpRef"] = f"{ipa_doc} — Bab {b} (Kelas VIII)"
        existing_ipa[c["code"]] = fix_difficulty(c)

ipa_data["competencies"] = list(existing_ipa.values())
save_json(os.path.join(content_dir, "mapel-ipa-d.json"), ipa_data)

print(f"Assembled: MAT={len(mat_data['competencies'])}, IND={len(ind_data['competencies'])}, ENG={len(eng_data['competencies'])}, IPS={len(ips_data['competencies'])}, IPA={len(ipa_data['competencies'])}")

