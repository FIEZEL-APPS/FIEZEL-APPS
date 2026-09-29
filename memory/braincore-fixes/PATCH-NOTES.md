# Braincore FIEZEL — Patch P0/P1/P2 (2026-06)

Repo target: `FIEZEL-APPS/FIEZEL-APPS` (repo publik, TIDAK bisa saya push).
Perbaikan diterapkan pada salinan sumber lokal, diverifikasi probe (**15 PASS, 0 FAIL**),
lalu dikemas di sini untuk owner terapkan ke repo.

File patched (drop-in pengganti file di `backend/`):
- `braincore.py`   → B7, dead-code C6, copy-vs-perilaku #4, N+1 `get_states` (P2)
- `assessment.py`  → IDOR (P0): guard kepemilikan kelas + akses murid
- `db.py`          → fail-fast MONGO_URL (P2)
- `probe.py`       → probe diperbarui (assert perilaku yang BENAR, bukan bug)
- `backend-tests.yml` → CI GitHub Actions (B8, P1) — taruh di `.github/workflows/`

---

## P0-1 — IDOR ditutup (`assessment.py`)

Ditambahkan 3 helper akses di `assessment.py`:
- `_class_or_404(class_id)`
- `_assert_class_teacher(class_id, u)` — guru hanya kelas yang ia ampu (`classes.teacher_id`); owner bebas.
- `_assert_student_access(student_id, u)` — murid hanya dirinya; guru hanya murid di kelas yang ia ampu; owner bebas.

Endpoint yang sebelumnya HANYA cek peran, kini juga cek kepemilikan:

| Endpoint | Sebelum | Sesudah |
|---|---|---|
| `GET /api/braincore/student-state` | siapa pun login bisa baca state murid mana pun | `_assert_student_access` |
| `GET /api/coverage` | guru mana pun, kelas mana pun | `_assert_class_teacher` |
| `GET /api/braincore/recommendations` | guru mana pun | `_assert_class_teacher` |
| `POST /api/braincore/groups` | guru mana pun | `_assert_class_teacher` |
| `POST /api/braincore/lesson-plan` | guru mana pun | `_assert_class_teacher` |
| `GET /api/braincore/tp-detail` | guru mana pun | `_assert_class_teacher` |
| `GET /api/braincore/passport/{id}` | guru mana pun boleh baca murid mana pun | `_assert_student_access` (guru dibatasi kelasnya) |
| `GET /api/braincore/evidence-graph/{id}` | sda | `_assert_student_access` |
| `GET /api/classes/{id}` | siapa pun login (bocor roster+email) | guru: kelasnya; murid: hanya jika anggota; owner: bebas |

⚠️ Perlu diuji end-to-end DUA akun berbeda (guru A vs guru B, murid X vs murid Y):
- guru B minta `coverage?class_id=<kelas guru A>` → harus **403**.
- murid Y minta `student-state?student_id=<murid X>` → harus **403**.
- guru A minta murid di kelasnya → **200**.

## P0-2 — B7 metrik guru (`braincore.py`, `coverage_matrix`)

Note GAP dulu: `f"...{100 - int(mastery_pct)}% murid belum mencapai mastery."`
di mana `mastery_pct = 100 × rerata posterior` → **bukan** persentase murid.

Sesudah: hitung proporsi MURID nyata dari `exposed` dan `mastered`:
```
not_mastered = max(0, exposed - mastered)
pct_students = round(100 * not_mastered / exposed) if exposed else 0
note = f"TP sudah dipelajari, tetapi {pct_students}% murid ({not_mastered} dari {exposed} yang aktif) belum mencapai mastery."
```
Probe membuktikan: skenario 1 murid aktif belum tuntas → "100% murid (1 dari 1 ...)",
BUKAN "80% murid" hasil 100−posterior.

---

## P1-1 — Dead code C6 (`braincore.py`, `coverage_matrix`)
Dihapus `and s not in []` (selalu True) pada perhitungan `developing`.

## P1-2 — Copy vs perilaku #4 (`braincore.py`, `next_best_item`)
Untuk murid baru (p<0.35) reason lama menjanjikan "soal yang lebih ringan",
padahal IRT desirable-difficulty memilih kesulitan ≈1.33 (→1.5), bukan termudah (1.0).
Copy diselaraskan: "soal yang pas untuk membangun pijakan — cukup menantang supaya kamu
belajar, tapi masih sangat bisa kamu kerjakan." Perilaku IRT TIDAK diubah (memang benar).

## P1-3 — CI backend (B8) → `backend-tests.yml`
`backend/unit_test.py` (54 cek) tidak jalan di CI. Ditambahkan workflow GitHub Actions
dengan service MongoDB yang menjalankan `unit_test.py` + `probe.py`.
Owner: sesuaikan perintah run bila unit_test.py butuh entrypoint berbeda.

## P1-4 — Paritas BKT klien-server (C3/C2) — ⚠️ BELUM DITERAPKAN
File "client brain v3" (yang memakai L0=.20/T=.15/guess=.25/gate=.95 dan
retrievability `2^(-t/h)`) TIDAK ada di salinan lokal yang saya audit, jadi TIDAK saya
ubah (mengubah file yang tidak terlihat berisiko). Target perubahan (sumber kebenaran =
server `braincore.py`):
- `P_INIT=0.25`, `P_LEARN=0.18`, `P_SLIP=0.10`, `P_GUESS=0.20`, gate mastery `0.80`.
- Retrievability samakan satuan: server pakai `exp(-t/S)` (hari). Bila klien pakai
  `2^(-t/h)`, konversi `h = S * ln 2` atau ganti klien ke bentuk `exp`.
Owner: sunting file brain klien agar konstanta & rumus retrievability identik server,
lalu tambахkan test paritas (bandingkan output klien vs `braincore.py` pada input sama).

---

## P2-1 — N+1 `next_best_item` (`braincore.py`) — DITERAPKAN
Ditambah `get_states(student_id, competency_ids)` = SATU query `$in` (bukan `get_state`
per kompetensi). `next_best_item` memakainya. Probe membuktikan perilaku identik.

## P2-2 — fail-fast MONGO_URL (`db.py`) — DITERAPKAN
`os.environ["MONGO_URL"]` (tanpa fallback localhost). DB_NAME tetap punya default "fiezel".
⚠️ Deployment WAJIB set MONGO_URL, kalau tidak proses gagal saat start (disengaja).

## P2-3 — N+1 jalur guru lain (`coverage_matrix`, `learning_passport`, dll) — BELUM
Masih ada N+1 (lookup `curriculum_nodes` per kompetensi/TP, `student_tp_summary` per
baris). Rekomendasi: kumpulkan id → satu `find({$in})` → join di memori, atau aggregation
pipeline. Tidak diterapkan di patch ini agar perubahan tetap kecil & aman.

## P2-4 — cap senyap `_pool` `to_list(500)` — BELUM (didokumentasikan)
Pool soal >500 terpotong tanpa indikator. Opsi: naikkan cap, atau kembalikan flag
`truncated` bila hasil = cap.

---

## Verifikasi
```
cd backend  # atau folder berisi braincore.py
python -m py_compile braincore.py assessment.py db.py
python probe.py   # → 15 PASS, 0 FAIL
```
IDOR wajib diverifikasi via HTTP dua akun (lihat P0-1). Probe tidak menguji lapisan HTTP.
