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

# 1. MATEMATIKA
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
for b in [1, 2, 3, 4]:
    c = load_json(os.path.join(tools_dir, f"chunk_mat_7_b{b}.json"))
    if c:
        c["cpRef"] = f"{mat_doc} — Bab {b}"
        mat_data["competencies"].append(c)
save_json(os.path.join(content_dir, "mapel-mat-d.json"), mat_data)
print(f"MAT bank assembled with {len(mat_data['competencies'])} competencies.")


# 2. BAHASA INDONESIA
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
for b in [1, 2, 3, 4]:
    c = load_json(os.path.join(tools_dir, f"chunk_ind_7_b{b}.json"))
    if c:
        c["cpRef"] = f"{ind_doc} — Bab {b}"
        ind_data["competencies"].append(c)
save_json(os.path.join(content_dir, "mapel-ind-d.json"), ind_data)
print(f"IND bank assembled with {len(ind_data['competencies'])} competencies.")


# 3. BAHASA INGGRIS
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
        eng_data["competencies"].append(c)
save_json(os.path.join(content_dir, "mapel-eng-d.json"), eng_data)
print(f"ENG bank assembled with {len(eng_data['competencies'])} competencies.")


# 4. IPS
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
for t_num in [1, 2, 3]:
    c = load_json(os.path.join(tools_dir, f"chunk_ips_7_t{t_num}.json"))
    if c:
        c["cpRef"] = f"{ips_doc} — Tema {t_num:02d}"
        ips_data["competencies"].append(c)
save_json(os.path.join(content_dir, "mapel-ips-d.json"), ips_data)
print(f"IPS bank assembled with {len(ips_data['competencies'])} competencies.")


# 5. IPA (Grade 7 Bab 1-7 + Grade 8 Bab 1-6)
ipa_data = load_json(os.path.join(content_dir, "mapel-ipa-d.json"))
ipa_doc = ipa_data.get("provenance", {}).get("dokumen", "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)")

existing_ipa = {c["code"]: c for c in ipa_data.get("competencies", [])}
for b in [1, 2, 3, 4, 5, 6]:
    c = load_json(os.path.join(tools_dir, f"chunk_ipa_8_b{b}.json"))
    if c:
        c["cpRef"] = f"{ipa_doc} — Bab {b} (Kelas VIII)"
        existing_ipa[c["code"]] = c

ipa_data["competencies"] = list(existing_ipa.values())
save_json(os.path.join(content_dir, "mapel-ipa-d.json"), ipa_data)
print(f"IPA bank assembled with total {len(ipa_data['competencies'])} competencies (Grade 7 + Grade 8).")
