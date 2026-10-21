# Analisis Braincore Engine FIEZEL — 2026-09-29

Basis: repo `FIEZEL-APPS/FIEZEL-APPS` @ `main` (commit terbaru 7db8700, 2026-09-29).
Metode: baca kode (backend/braincore.py 672 baris, braincore-bridge.js, fiezel-braincore-evidence.js,
fiezel-braincore-review.js, wiring di learning.py/assessment.py) + probe fungsional
(probe.py dengan stub Mongo in-memory): **14 PASS, 1 "FAIL" yang mengonfirmasi temuan B7.**

## Yang BERFUNGSI (terbukti via probe)
- Matematika inti sehat: IRT 3PL (P(θ=b)=0.625 pas), inversi optimal_difficulty konsisten,
  BKT naik/turun benar, decay half-life 30 hari benar.
- State machine: 4x benar+yakin → MASTERED, due_at terjadwal, transfer → TRANSFERRED,
  12x salah → label TRANSFERRED luruh (fix B3 bekerja).
- Ledger miskonsepsi tercatat & ter-resolve.
- Pemilihan item: prasyarat lemah → turun ke prasyarat; pool habis → None (bukan crash);
  adaptive → fallback antrean guru di learning.py.
- Per audit internal 2026-09-26, defek tinggi A1/A2/A3 + B1–B6 SUDAH diperbaiki owner
  (m025-376/377): penyetel tanpa pagar dimatikan, jendela bukti lintas sesi, decay BKT dipakai.

## Yang TIDAK BERFUNGSI / MASIH BERMASALAH
1. **B7 (terbukti via probe):** `coverage_matrix` menulis "80% murid belum mencapai mastery"
   padahal 80% = 100 − rerata posterior (bukan persentase murid). Guru mengambil keputusan
   remedial dari angka yang salah makna. Status di audit: "Rekomendasi" — BELUM diperbaiki.
2. **IDOR (baru, dari analisis ini):**
   - `GET /api/braincore/student-state` tanpa cek kepemilikan — murid bisa baca state murid lain
     (passport & evidence-graph punya cek 403, endpoint ini tidak).
   - Endpoint guru `coverage`, `braincore/recommendations|groups|lesson-plan|tp-detail` hanya
     memeriksa role teacher — TIDAK memeriksa kelas itu milik/m diampu guru tersebut.
3. **Kode mati C6:** `and s not in []` di perhitungan `developing` coverage_matrix — selalu True.
4. **Pesan vs perilaku:** untuk murid baru (p=0.25), reason berbunyi "soal yang lebih ringan"
   tetapi IRT desirable-difficulty memilih kesulitan ≈1.33 → soal terpilih 1.5, BUKAN yang
   termudah (1.0). Secara pedagogis benar, tetapi copy-nya menyesatkan.
5. **Paritas parameter belum selesai (C3):** BKT klien L0=.20/T=.15/guess=.25/gate=.95 vs
   backend .25/.18/.20/.80 — dua "sumber kebenaran" untuk konsep yang sama.
6. **Retrievability beda satuan (C2):** klien 2^(−t/h), backend e^(−t/S) — beda faktor ln2.
7. **"Cryptographic hash chain" (C1)** sebenarnya FNV-1a non-kriptografis — klaim berlebih.
8. **B8:** `backend/unit_test.py` (54 cek) tidak jalan di CI.

## Yang PERLU DITINGKATKAN (performa & skala)
1. **N+1 query berat** di jalur guru: `coverage_matrix` (~4 query per TP), `learning_passport`
   (2–3 find_one per kompetensi), `class_misconceptions` (1 query per agregat),
   `recommendations` memanggil student_tp_summary per baris kandidat (1 query per murid),
   `due_reviews` (1 find_one per baris due). Solusi: satu query $in + join di memori, atau
   aggregation pipeline.
2. `next_best_item`: `get_state` per kompetensi SEKUENSIAL — bisa satu query $in.
3. `db.py` memakai default fallback `mongodb://localhost:27017` — sebaiknya fail-fast.
4. `_pool`/`to_list(500)` cap senyap — tidak ada indikator saat pool terpotong.

## Rekomendasi prioritas
- P0: tutup IDOR (cek kepemilikan kelas + cek self di student-state); perbaiki B7 (hitung murid,
  bukan rerata).
- P1: hapus kode mati C6; selaraskan copy alasan dengan perilaku IRT; satukan parameter BKT
  klien-server (C3); tambahkan unit_test.py ke CI (B8).
- P2: refactor N+1 → aggregation; samakan satuan retrievability (C2); jujurkan sebutan
  hash chain (C1); fail-fast MONGO_URL.
