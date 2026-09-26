# Braincore Autonomy — OWNER Activation Record

**Tanggal:** 2026-09-27  
**Build:** m025-374  
**Bundle:** Brain 3.11.0 → 3.12.0  
**Otorisasi:** OWNER (perintah tertulis eksplisit dalam sesi Antigravity)

---

## 1. Apa yang diizinkan

OWNER mengizinkan dan mengaktifkan **penyetelan-diri berbatas** (Langkah 5 roadmap otonomi):

| Modul | Perubahan | Alasan |
|---|---|---|
| `fiezel-self-tune.js` | `off` → `active` | Pengusul penyetelan-diri, 7 pagar terbukti |
| `fiezel-param-ledger.js` | `off` → `active` | Rantai hash audit trail, prasyarat self-tune |
| `fiezel-brain-config.js` | `off` → `active` | Registry parameter dibaca runtime oleh self-tune |

## 2. Kelas perubahan yang diizinkan

**HANYA parameter dalam daftar TUNABLE** (`fiezel-self-tune.js`):

| Parameter | Step | Min | Max | Alasan aman |
|---|---|---|---|---|
| `difficulty.targetSuccess` | 0.02 | 0.70 | 0.90 | Target probabilitas sukses — pergeseran kecil, efek terukur per sesi |
| `bkt.T` | 0.02 | 0.05 | 0.35 | Laju transisi BKT — batas BOUNDS sudah ketat |

## 3. Kelas perubahan yang DILARANG (tidak pernah bergerak sendiri)

- **bkt.slip / bkt.guess** — ambang degenerasi BKT; menggesernya membuat model berhenti membedakan "menguasai" dari "menebak"
- **Seluruh blok memory (FSRS)** — menulis jadwal ulangan; salah setel = murid kehilangan materi, kerugian baru terlihat berminggu-minggu kemudian
- **misconception.\*** — menggerbangi diagnosis; melonggarkannya menghasilkan tuduhan palsu

## 4. Pagar keamanan yang aktif

Tujuh pagar, masing-masing terbukti bisa merah (`tests/self-tune-test.js`):

1. **DI DALAM BOUNDS SEJAK LAHIR** — usulan di luar batas tidak pernah lahir
2. **SATU PARAMETER PER USULAN** — atribusi kausal tunggal
3. **SATU PERUBAHAN AKTIF PER JENDELA** — cooldown 5 sesi minimum
4. **HANYA SAAT VERDICT 'promote'** — bukti statistik (Wilson/Newcombe CI)
5. **ROLLBACK OTOMATIS PADA REGRESI** — margin 3pp, tercatat di ledger
6. **KILL SWITCH** — `halt: true` mematikan seluruh jalur, mengalahkan segalanya
7. **FAIL-CLOSED** — dependensi absen = tidak mengusulkan apa pun

## 5. Pencabutan

Izin ini bisa dicabut kapan saja dengan:
- Mengatur `halt: true` di state `fiezel-self-tune-v1` (instan, tanpa deploy)
- Mengembalikan `selfTune: 'off'` di manifest (membutuhkan deploy)

## 6. Risiko yang diterima

Parameter yang sudah bergeser di perangkat murid **tidak ikut kembali** saat kodenya di-revert — ini satu-satunya langkah di peta yang tidak bisa dibatalkan dengan `git revert`. Itulah mengapa izin ini eksplisit, berbatas, dan bisa dicabut.
