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

# 1. MATEMATIKA (mapel-mat-d.json)
mat_data = load_json(os.path.join(content_dir, "mapel-mat-d.json"))
if not mat_data:
    mat_data = {
        "schemaVersion": "fiezel-mapel-bank-v1",
        "subject": "Matematika",
        "subjectCode": "MAT",
        "phase": "fase_d",
        "provenance": {
            "dokumen": "Matematika untuk SMP/MTs Kelas VII",
            "penerbit": "Pusat Kurikulum dan Perbukuan, Badan Penelitian dan Pengembangan dan Perbukuan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
            "tahun": 2021,
            "isbn": "978-602-244-883-9",
            "diperolehDari": "https://buku.kemendikdasmen.go.id",
            "penyusunButir": "resmi-terverifikasi"
        },
        "competencies": []
    }

chunk_mat_b1 = load_json(os.path.join(tools_dir, "chunk_mat_7_b1.json"))
chunk_mat_b2 = load_json(os.path.join(tools_dir, "chunk_mat_7_b2.json"))

# Rebuild competencies array
existing_codes = {c["code"]: c for c in mat_data.get("competencies", [])}
if chunk_mat_b1:
    existing_codes[chunk_mat_b1["code"]] = chunk_mat_b1
if chunk_mat_b2:
    existing_codes[chunk_mat_b2["code"]] = chunk_mat_b2

mat_data["competencies"] = list(existing_codes.values())
save_json(os.path.join(content_dir, "mapel-mat-d.json"), mat_data)
print(f"Matematika bank saved with {len(mat_data['competencies'])} competencies.")


# 2. BAHASA INDONESIA (mapel-ind-d.json)
ind_data = load_json(os.path.join(content_dir, "mapel-ind-d.json"))
if not ind_data:
    ind_data = {
        "schemaVersion": "fiezel-mapel-bank-v1",
        "subject": "Bahasa Indonesia",
        "subjectCode": "IND",
        "phase": "fase_d",
        "provenance": {
            "dokumen": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi)",
            "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
            "tahun": 2023,
            "isbn": "978-623-118-368-2",
            "diperolehDari": "https://buku.kemendikdasmen.go.id",
            "penyusunButir": "resmi-terverifikasi"
        },
        "competencies": []
    }

chunk_ind_b1 = load_json(os.path.join(tools_dir, "chunk_ind_7_b1.json"))
chunk_ind_b2 = load_json(os.path.join(tools_dir, "chunk_ind_7_b2.json"))

existing_ind_codes = {c["code"]: c for c in ind_data.get("competencies", [])}
if chunk_ind_b1:
    existing_ind_codes[chunk_ind_b1["code"]] = chunk_ind_b1
if chunk_ind_b2:
    existing_ind_codes[chunk_ind_b2["code"]] = chunk_ind_b2

ind_data["competencies"] = list(existing_ind_codes.values())
save_json(os.path.join(content_dir, "mapel-ind-d.json"), ind_data)
print(f"Bahasa Indonesia bank saved with {len(ind_data['competencies'])} competencies.")


# 3. BAHASA INGGRIS (mapel-eng-d.json)
eng_data = load_json(os.path.join(content_dir, "mapel-eng-d.json"))
if not eng_data:
    eng_data = {
        "schemaVersion": "fiezel-mapel-bank-v1",
        "subject": "Bahasa Inggris",
        "subjectCode": "ENG",
        "phase": "fase_d",
        "provenance": {
            "dokumen": "English for Nusantara untuk SMP/MTs Kelas VII",
            "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
            "tahun": 2022,
            "isbn": "978-602-244-885-3",
            "diperolehDari": "https://buku.kemendikdasmen.go.id",
            "penyusunButir": "resmi-terverifikasi"
        },
        "competencies": []
    }

chunk_eng_c1 = load_json(os.path.join(tools_dir, "chunk_eng_7_c1.json"))
chunk_eng_c2 = load_json(os.path.join(tools_dir, "chunk_eng_7_c2.json"))

existing_eng_codes = {c["code"]: c for c in eng_data.get("competencies", [])}
if chunk_eng_c1:
    existing_eng_codes[chunk_eng_c1["code"]] = chunk_eng_c1
if chunk_eng_c2:
    existing_eng_codes[chunk_eng_c2["code"]] = chunk_eng_c2

eng_data["competencies"] = list(existing_eng_codes.values())
save_json(os.path.join(content_dir, "mapel-eng-d.json"), eng_data)
print(f"Bahasa Inggris bank saved with {len(eng_data['competencies'])} competencies.")


# 4. IPS (mapel-ips-d.json)
ips_data = load_json(os.path.join(content_dir, "mapel-ips-d.json"))
if not ips_data:
    ips_data = {
        "schemaVersion": "fiezel-mapel-bank-v1",
        "subject": "IPS",
        "subjectCode": "IPS",
        "phase": "fase_d",
        "provenance": {
            "dokumen": "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi)",
            "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
            "tahun": 2023,
            "isbn": "978-623-118-437-5",
            "diperolehDari": "https://buku.kemendikdasmen.go.id",
            "penyusunButir": "resmi-terverifikasi"
        },
        "competencies": []
    }

chunk_ips_t1 = load_json(os.path.join(tools_dir, "chunk_ips_7_t1.json"))
chunk_ips_t2 = load_json(os.path.join(tools_dir, "chunk_ips_7_t2.json"))

existing_ips_codes = {c["code"]: c for c in ips_data.get("competencies", [])}
if chunk_ips_t1:
    existing_ips_codes[chunk_ips_t1["code"]] = chunk_ips_t1
if chunk_ips_t2:
    existing_ips_codes[chunk_ips_t2["code"]] = chunk_ips_t2

ips_data["competencies"] = list(existing_ips_codes.values())
save_json(os.path.join(content_dir, "mapel-ips-d.json"), ips_data)
print(f"IPS bank saved with {len(ips_data['competencies'])} competencies.")


# 5. IPA (mapel-ipa-d.json - Update with Grade 8 Bab 1 & Bab 2)
ipa_data = load_json(os.path.join(content_dir, "mapel-ipa-d.json"))

chunk_ipa_8_b1 = load_json(os.path.join(tools_dir, "chunk_ipa_8_b1.json"))
chunk_ipa_8_b2 = load_json(os.path.join(tools_dir, "chunk_ipa_8_b2.json"))

existing_ipa_codes = {c["code"]: c for c in ipa_data.get("competencies", [])}
if chunk_ipa_8_b1:
    existing_ipa_codes[chunk_ipa_8_b1["code"]] = chunk_ipa_8_b1
if chunk_ipa_8_b2:
    existing_ipa_codes[chunk_ipa_8_b2["code"]] = chunk_ipa_8_b2

ipa_data["competencies"] = list(existing_ipa_codes.values())
save_json(os.path.join(content_dir, "mapel-ipa-d.json"), ipa_data)
print(f"IPA bank updated with Grade 8 chapters. Total competencies: {len(ipa_data['competencies'])}.")
