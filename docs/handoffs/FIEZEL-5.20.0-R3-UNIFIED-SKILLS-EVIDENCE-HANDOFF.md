# FIEZEL 5.20 — R3 Unified Skills Evidence Handoff

Tanggal: 2026-08-20 WIB
Lane: R3 (roadmap `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`)
Release: `DIAG_BUILD=m025-54`, `SW_REV=m025-54-unified-skills-evidence-20260820-1`
Base: `main@8256a57` (merge PR #92, R2 selesai)
Otoritas: OWNER memerintahkan roadmap dilanjutkan sampai ter-deploy. MASTER (sesi ini) memegang implementasi dan rilis.

## STATUS

Machine-verified. Retest fisik neural voice tetap DITUNDA oleh OWNER; lane audio dipegang `HELPER:APEX` di bawah override OWNER.

## APA YANG BERUBAH

`features/skills-evidence/fiezel-skills-evidence.js` memproyeksikan bukti agregat Speaking/Listening dari `fiezel-sl-v1-state` ke Learner Evidence. Peta skill R2 sekarang bisa menaikkan kedua skill itu dari `pending_r3` menjadi `measured` begitu ada latihan yang tercatat.

```yaml
files_added:
  - features/skills-evidence/fiezel-skills-evidence.js
  - tests/skills-evidence-test.js
  - FIEZEL-5.20.0-R3-UNIFIED-SKILLS-EVIDENCE-HANDOFF.md
files_touched:
  - app.js                     # withSpokenSkills() + satu panggilan di buildLearnerEvidenceModel
  - features/personal-journey/fiezel-personal-journey.js   # peta skill membaca proyeksi
  - tests/personal-journey-test.js
  - index.html                 # satu script tag
  - sw.js                      # satu asset + SW_REV
  - features/neural-voice/fiezel-diag-panel.js  # DIAG_BUILD saja
  - .github/workflows/quality.yml               # satu baris gate
forbidden:
  - Raw audio, transcript, dictation.
  - Menyebut coverage produksi lisan sebagai skor pengucapan.
  - Mengubah kontrak sidecar fiezel-sl-v1-state.
  - Menyentuh perilaku neural voice (lane APEX).
```

## KEPUTUSAN YANG PERLU DIWARISKAN

1. **Modul pure, `now` wajib.** Sama seperti R2. Pembacaan storage dipisah ke `readSidecarState()` supaya sisanya bisa diuji tanpa browser, dan fungsi itu tidak pernah melempar — gagal membaca bukti latihan tidak boleh menjatuhkan Home.
2. **`practiceScore`, bukan skor pengucapan.** Nama dijaga dari modul sampai layar, dan gate memeriksa tidak ada nilai teks yang memakai kata terlarang. `terminology.pronunciationScore: false` adalah penyangkalan eksplisit, bukan label.
3. **Coverage target bukan nilai.** Tanpa jumlah bank soal dari pemanggil, coverage TIDAK dihitung; `measured: false` dan masuk daftar `unmeasurable`. Menebak penyebut menghasilkan persen yang terlihat resmi tetapi tidak berarti.
4. ~~`replayCount` tidak terukur~~ — **DIPERBAIKI di m025-65 pada sumbernya, bukan ditambal di proyeksi.** `replays` kini ikut disimpan pada event sidecar, dan proyeksi melaporkannya apa adanya. Event LAMA dari sebelum perubahan ini tidak punya field tersebut, dan untuk event seperti itu jawabannya tetap "belum terukur" — bukan nol, karena nol berarti murid tidak pernah mengulang audio sedangkan yang sebenarnya terjadi adalah kita tidak mencatatnya. Catatan asli: **`replayCount` tidak terukur.** `replays` dihitung di controller latihan (`fiezel-speaking-listening-addon.js`) tetapi TIDAK pernah ikut disimpan ke event, jadi tidak dapat diturunkan dari state. Dinyatakan `null` + `unmeasurable`, bukan diisi nol. Kalau replay count memang dibutuhkan produk, perbaikannya ada di sisi sidecar: simpan `replays` pada event.
5. **Migrasi versioned + idempotent.** Bentuk v1 dikembalikan apa adanya; bentuk lama hanya menyumbang angka yang masih bisa dipercaya (`attempts`, `averageScore`, `passRate`), sisanya kembali ke "belum terukur". Dua kali migrasi menghasilkan objek identik.
6. **Penggabungan idempotent.** `mergeIntoLearnerEvidence()` menulis ulang `skills.spoken`, tidak mengakumulasi, dan tidak memutasi input.

## YANG BELUM SELESAI DI SLICE INI

- ~~Jumlah bank soal belum tersedia sinkron di `app.js`~~ — **SELESAI di m025-55.** Penyebutnya kini konstanta `bankCounts` di `speaking-listening-config.js`, dan `tests/skills-evidence-test.js` membandingkannya langsung ke isi bank soal, sehingga konstanta itu tidak bisa diam-diam basi. Peta skill menampilkan cakupan sebagai baris terpisah dari nilai; kalau penyebut tidak diketahui, barisnya tidak muncul sama sekali.
- **Dashboard R3 penuh** (membedakan skor latihan, cakupan target, dan yang belum dapat diukur secara visual) belum dibuat; peta skill R2 sudah menampilkan tiga keadaan itu untuk lima skill.
- **Shadow evaluation** sebelum domain policy baru: belum ada domain policy baru yang diusulkan, jadi belum berlaku.

## GATE

`node tests/skills-evidence-test.js` — 13 kasus: agregasi dua domain, kontrak `now`, reproducibility, coverage vs nilai, coverage tanpa penyebut, replay tidak terukur, larangan istilah, tidak ada kebocoran id/metrik/event, state rusak, event tidak valid dibuang, migrasi idempotent, merge idempotent tanpa mutasi input, pembacaan storage aman.

Hijau lokal juga: `tests/personal-journey-test.js`, `tests/personal-journey-ui-test.js`, `tests/learner-evidence-test.js`, `tests/speaking-listening-test.js`, `tests/pwa-cache-test.js`, `tests/pwa-release-coherence-test.js`, `tests/ui-structure-test.js`, `neural-voice-m028-audio-integrity-test.js`, `tests/diag-panel-test.js`, `validator.js`, `product-audit.js`.

## LANJUTAN

1. Jumlah bank soal → coverage target hidup.
2. Dashboard R3.
3. R4 (5.21) Academic and Scholarship Readiness.
4. Setelah seluruh roadmap ter-deploy: retest fisik neural voice oleh OWNER.
