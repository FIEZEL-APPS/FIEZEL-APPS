import json
import os

content_dir = r"c:\Users\hp\fiezel-apps\content\mapel"
tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def load_json(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# 1. MATEMATIKA
mat_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "MAT",
    "phase": "fase_d",
    "provenance": {
        "dokumen": "Matematika untuk SMP/MTs Kelas VII",
        "penerbit": "Pusat Kurikulum dan Perbukuan, Badan Penelitian dan Pengembangan dan Perbukuan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2021",
        "isbn": "978-602-244-883-9",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
c_mat_b1 = load_json(os.path.join(tools_dir, "chunk_mat_7_b1.json"))
c_mat_b2 = load_json(os.path.join(tools_dir, "chunk_mat_7_b2.json"))
if c_mat_b1:
    c_mat_b1["cpRef"] = "Matematika untuk SMP/MTs Kelas VII — Bab 1"
    mat_data["competencies"].append(c_mat_b1)
if c_mat_b2:
    c_mat_b2["cpRef"] = "Matematika untuk SMP/MTs Kelas VII — Bab 2"
    mat_data["competencies"].append(c_mat_b2)
save_json(os.path.join(content_dir, "mapel-mat-d.json"), mat_data)


# 2. BAHASA INDONESIA
ind_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "IND",
    "phase": "fase_d",
    "provenance": {
        "dokumen": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi)",
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2023",
        "isbn": "978-623-118-368-2",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
c_ind_b1 = load_json(os.path.join(tools_dir, "chunk_ind_7_b1.json"))
c_ind_b2 = load_json(os.path.join(tools_dir, "chunk_ind_7_b2.json"))
if c_ind_b1:
    c_ind_b1["cpRef"] = "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 1"
    ind_data["competencies"].append(c_ind_b1)
if c_ind_b2:
    c_ind_b2["cpRef"] = "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 2"
    ind_data["competencies"].append(c_ind_b2)
save_json(os.path.join(content_dir, "mapel-ind-d.json"), ind_data)


# 3. BAHASA INGGRIS
eng_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "ENG",
    "phase": "fase_d",
    "provenance": {
        "dokumen": "English for Nusantara untuk SMP/MTs Kelas VII",
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2022",
        "isbn": "978-602-244-885-3",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
c_eng_c1 = load_json(os.path.join(tools_dir, "chunk_eng_7_c1.json"))
c_eng_c2 = load_json(os.path.join(tools_dir, "chunk_eng_7_c2.json"))
if c_eng_c1:
    c_eng_c1["cpRef"] = "English for Nusantara untuk SMP/MTs Kelas VII — Chapter 1"
    eng_data["competencies"].append(c_eng_c1)
if c_eng_c2:
    c_eng_c2["cpRef"] = "English for Nusantara untuk SMP/MTs Kelas VII — Chapter 2"
    eng_data["competencies"].append(c_eng_c2)
save_json(os.path.join(content_dir, "mapel-eng-d.json"), eng_data)


# 4. IPS
ips_data = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "IPS",
    "phase": "fase_d",
    "provenance": {
        "dokumen": "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi)",
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2023",
        "isbn": "978-623-118-437-5",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": []
}
c_ips_t1 = load_json(os.path.join(tools_dir, "chunk_ips_7_t1.json"))
c_ips_t2 = load_json(os.path.join(tools_dir, "chunk_ips_7_t2.json"))
if c_ips_t1:
    c_ips_t1["cpRef"] = "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi) — Tema 01"
    ips_data["competencies"].append(c_ips_t1)
if c_ips_t2:
    c_ips_t2["cpRef"] = "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi) — Tema 02"
    ips_data["competencies"].append(c_ips_t2)
save_json(os.path.join(content_dir, "mapel-ips-d.json"), ips_data)


# 5. IPA (Grade 7 + Grade 8)
ipa_data = load_json(os.path.join(content_dir, "mapel-ipa-d.json"))
c_ipa_8_b1 = load_json(os.path.join(tools_dir, "chunk_ipa_8_b1.json"))
c_ipa_8_b2 = load_json(os.path.join(tools_dir, "chunk_ipa_8_b2.json"))

dok_ipa = ipa_data.get("provenance", {}).get("dokumen", "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)")
if c_ipa_8_b1:
    c_ipa_8_b1["cpRef"] = f"{dok_ipa} — Bab 1 (Kelas VIII)"
if c_ipa_8_b2:
    c_ipa_8_b2["cpRef"] = f"{dok_ipa} — Bab 2 (Kelas VIII)"

existing_ipa_codes = {c["code"]: c for c in ipa_data.get("competencies", [])}
if c_ipa_8_b1:
    existing_ipa_codes[c_ipa_8_b1["code"]] = c_ipa_8_b1
if c_ipa_8_b2:
    existing_ipa_codes[c_ipa_8_b2["code"]] = c_ipa_8_b2

ipa_data["competencies"] = list(existing_ipa_codes.values())
save_json(os.path.join(content_dir, "mapel-ipa-d.json"), ipa_data)

print("Master banks updated with strict schema compliance.")
