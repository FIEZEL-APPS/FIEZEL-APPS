# FIEZEL REBRAND — MIGRATION.md (rencana bertahap AMAN untuk app live)

Prinsip tak bisa ditawar:
- **JANGAN hapus fungsi apa pun.** Semua perubahan visual/interaksi; pedagogi, alur, data, gate, tour tetap (kontrak AUDIT §4: "Tidak ada fungsi yang dihapus").
- **JANGAN ubah IA.** Struktur layar, urutan onboarding→tour→gate, 5 tab bottom nav, grid Home, alur quiz/confidence/feedback dipertahankan (DIRECTION: "pertahankan ARSITEKTUR INFORMASI & fungsi yang ada").
- **main selalu deployable.** Semua kerja di branch `redesign-v1`; merge ke `main` per fase, hanya setelah suite test hijau.
- **Test-first pada token yang dipaku.** `tests/pastel-field-contrast-test.js` memaku literal `--cream/--ink/--yellow/--coral/--gold`; `tests/contrast-test.js` memarse `style.css`+`tutor-v3.css` statis. Setiap geser nilai token = pindahkan kuncinya di test **pada commit yang sama** (preseden komentar style.css ±b.640: "kuncinya dipindahkan ke nilai baru di contrast-test, bukan dibuang").
- **Satu fase = satu (atau sedikit) commit yang bisa di-revert bersih.**

Keadaan awal: repo `fiezel-apps` di branch `main`, HEAD `a06c9dc`; `sw.js` b.9 `SW_REV='m025-161-reading-bc-tfns-20260826-2'`.

---

## Fase 0 — Branch + preview (tanpa menyentuh main) — risiko NOL

1. `git checkout -b redesign-v1` dari `a06c9dc`. `main` tidak disentuh sama sekali sampai Fase 1 selesai direview.
2. Preview lokal: `python3 -m http.server 8931` di working tree branch (cara yang sama dengan audit); smoke visual di 390×844 & 1280×800 memakai skrip Playwright yang sudah ada di `redesign/audit/` (`capture_flows*.py`) — baseline "sebelum".
3. Jalankan **seluruh suite test sekali di branch bersih** dan simpan hasilnya sebagai baseline hijau (daftar di Fase 4). Kalau ada yang sudah merah sebelum perubahan, catat — itu bukan tanggungan rebrand.
4. Salin aset prasyarat (belum dipakai): `Fredoka-var.woff2` → `assets/fonts/` (commit terpisah "assets only", tidak mengubah CSS/JS; self-host — `tests/onboarding-test.js` menggagalkan CDN).

**Rollback**: hapus branch. Tidak ada jejak di main. **SW_REV**: tidak dinaikkan (tidak ada rilis).

## Fase 1 — Token swap in-place + perbaikan kontras wajib — risiko RENDAH

Lingkup (semua di style.css + test + tutor-v3.css; TIDAK menyentuh app.js/markup):

1. **Geser nilai `:root`** sesuai SPEC.md §2 di **kedua blok** `:root` (b.6 & b.594) — atau lebih bersih: hapus duplikat netral di blok 1, jadikan blok 2 kanon. Tambahkan token baru (`--sun*`, `--core*`, `--good/--bad/--info*`) + **alias kompatibilitas** (`--ink/--yellow/--green/--red/--cream/--black` → token baru). `--coral/--coral-deep/--coral-soft/--mint*/--lilac/--teal-pastel` **JANGAN dihapus dulu** — nilai lama dibiarkan hidup satu fase lagi supaya Fase 1 murni "geser nilai", bukan "ganti selector" (17 pemakaian coral tanpa fallback tetap render).
2. **Perbaikan kontras wajib yang murni-CSS** (audit "GAGAL BERAT", perbaikan wajib DIRECTION #1–2, #4, #7):
   - Toast: `.toast` b.277 → bg `--core`, teks `--on-core`; **hapus** `.toast{background:#101628}` b.806. (`features/mascot/micro-ui.css` `.fz-toast` ikut.)
   - `.quiz-listen-btn` b.356 & `.fsl-primary` (speaking-listening-addon.css b.15) → resep tombol ink (SPEC §3.1); hapus hover hex `#F7B0A3` b.361.
   - `.quiz-next:disabled` b.347 & disabled `.option` review → resep disabled SPEC §3.1/§3.4 (teks ≥4,5:1, tanpa opacity-only).
   - Focus ring seragam: `--sun-deep` 2px offset 2px (ganti `--gold` di b.364, b.1781×2).
   - `--red`→`--bad` #B8432D (nilai digeser via alias — teks merah kecil naik ke ≥4,5:1).
3. **Sinkronkan `tutor-v3.css`** blok `--ui-*` (b.2): `--ui-bg:#FFF9EE`, `--ui-text:#241A11`, `--ui-muted:#6E5E47`, dst mengikuti keluarga baru (file ini ikut diparse contrast-test).
4. **Pindahkan kunci test pada commit yang sama**: `tests/pastel-field-contrast-test.js` `BRIEF_PALETTE` → `--cream #FFF9EE, --ink #241A11, --yellow #FFC700, --coral` (hapus entri coral ATAU tandai deprecated sesuai struktur test — jangan biarkan memaku #EE5D4A kalau tokennya akan mati di Fase 2), `--gold` tetap #C9A24B; tambah nilai lama (#FFD23F, #FFF8ED, #2B2118, #EE5D4A sebagai permukaan aksi) ke `SUPERSEDED` bila polanya begitu; perbarui ekspektasi `tests/contrast-test.js` & `tests/topbar-logo-contrast-test.js` (wordmark di atas #FFF9EE) bila mereka memaku angka.
5. Naikkan `SW_REV` (sw.js b.9) → mis. `redesign-v1-f1-<tanggal>`.

**Gerbang keluar Fase 1**: seluruh suite Fase 4 hijau; screenshot before/after 8 layar kunci (home, quiz, feedback, listening, toast, nav, settings, splash) tanpa regresi layout; merge `redesign-v1`→`main` via PR + deploy.

**Rollback Fase 1**: `git revert <merge-commit>` di main (satu revert bersih karena satu unit) + naikkan `SW_REV` LAGI (nilai baru, jangan mundur — SW hanya update kalau byte berubah; SW_REV mundur tidak memicu refetch di sebagian klien). Perhatikan komentar sw.js b.24: tiap kenaikan SW_REV memicu unduh ulang shell ±152MB di klien terpasang — jadwalkan rilis & rollback hemat, jangan bolak-balik dalam sehari.

## Fase 2 — Komponen (tombol / toast-polish / nav / disabled / option / chips) — risiko SEDANG

Lingkup: selector CSS per komponen + edit kecil markup class (app.js template string), TANPA mengubah alur:

1. Tombol: satukan `.primary`/`.quiz-next`/`.auth-primary` ke spec sun-CTA; remap `.primary.is-coral` (b.1986) → varian ink; ganti 17 pemakaian `var(--coral*)` sesuai tabel SPEC §1d; **setelah nol pemakaian**, hapus token `--coral/-deep/-soft`, `--mint/-soft` (via `--good-soft`), `--teal-pastel`, `--lilac` dari `:root` + perbarui kunci test lagi.
2. Bottom nav & topbar: label 12px (b.306, b.851), `.nav.active` sun-soft; `.ask-label` 7px→12px (b.1772); `.brand-edition`/`.section-kicker`/`.eyebrow` → lantai 12px; `.coach-strip-more` (b.2622, 101×22) → hit-area ≥44px via padding (app.js b.2361 markup tetap).
3. Disabled state global: ganti `button:disabled{opacity:.42}` (b.147) dengan resep token; audit turunan (`.fiezel-btn[disabled]` b.1263 opacity .4, `.lesson-locked` b.2717) + ikon gembok pada yang terkunci.
4. Radius & weight normalisasi: tarik hardcode 13/15/17/20/22px ke `--radius-*`; weight 620/650/750/760/800/850/900 → 400/500/600/700.
5. Confetti app.js b.3141 → palet baru; label internal vocab (`PARTOFSPEECH`) → label manusiawi (app.js ±3178/3235; fungsi `indonesianPartOfSpeech` sudah ada — pakai di semua judul).
6. Rename bertahap `var(--ink)`→`var(--text)`, `var(--yellow)`→`var(--sun)` dst (sed per-file + review) — alias tetap ada sebagai jaring.
7. `SW_REV` naik. Merge via PR setelah suite hijau + screenshot diff.

**Rollback Fase 2**: `git revert` merge-commit fase (komponen tidak menyentuh data/logic sehingga revert aman) + `SW_REV` naik. Kalau hanya satu komponen bermasalah, revert commit komponen itu saja (susun Fase 2 sebagai commit per-komponen: buttons / nav / disabled / typography / cleanup).

## Fase 3 — Panel AI (Bright Mind) + layar — risiko SEDANG-TINGGI

1. Panel `--core` untuk momen AI: kartu BrainCore/analyzing/diagnosis/adaptive path, garis neural `--sun` — **panel/kartu saja, bukan layar penuh** (DIRECTION). Tipografi display → FZ Fredoka (`--fz-display`) untuk judul layar; Instrument Serif pensiun (kecuali kutipan).
2. Layar per-layar (IA tetap, kulit baru): Onboarding, Home (padatkan hero — DENSITAS, bukan struktur), Grammar quiz+feedback (collapse tutor-turn lama jadi accordion, CTA Lanjut sticky — interaksi tambahan, tidak menghapus konten), Listening, Vocabulary, Progress (chips overflow diberi fade indicator), Completion, Profile/settings (ikon tile kosong dimuat — subset lucide WAJIB ditambah dulu di `lucide.min.js`, lihat DESIGN-SYSTEM §5), Perpustakaan, Classroom, Skills.
3. Maskot dock: implement aturan SPEC §3.8 di `features/mascot/fiezel-mascot.js` + `fiezel-motion.css` (slot 88px, deteksi overlap → auto-hide/inline, state kontekstual, bubble 2 baris). `tests/paw-mascot-test.js` tetap hijau.
4. Splash & jembatan mood: splash ikut `--core` (#1B1418) + `manifest.json background_color` disamakan; transisi splash→app dilembutkan. Cek `tests/splash-choreography-test.js`, `tests/splash-first-paint-test.js`, `tests/install-health-test.js`, `tests/pwa-release-coherence-test.js`.
5. Sistem langit per-jam (app.js b.85–93 array hex) dikalibrasi ke keluarga baru.
6. `SW_REV` naik per rilis; fase ini boleh dipecah 2–3 rilis (3a panel AI+maskot, 3b layar belajar, 3c splash/PWA).

**Rollback Fase 3**: karena dipecah per-rilis, revert per merge-commit sub-fase + `SW_REV` naik. Manifest berubah = pasang canary: uji install PWA di satu perangkat sebelum rilis luas.

## Fase 4 — QA gate (wajib hijau sebelum SETIAP merge, bukan hanya di akhir)

Inventaris test repo: **91 file `*-test.js`** di root `fiezel-apps` (runner: `node <file>`). Wajib hijau **semua**, dengan kelompok yang paling tersentuh rebrand ditandai ★:

- **Visual/kontras/brand** ★: `tests/contrast-test.js`, `tests/pastel-field-contrast-test.js`, `tests/topbar-logo-contrast-test.js`, `tests/a11y-test.js`, `tests/paw-mascot-test.js`, `tests/ui-structure-test.js`, `tests/splash-choreography-test.js`, `tests/splash-first-paint-test.js`, `tests/tour-test.js`
- **Alur masuk & PWA** ★: `tests/onboarding-test.js`, `tests/install-health-test.js`, `tests/pwa-cache-test.js`, `tests/pwa-release-coherence-test.js`, `tests/pwa-startup-white-screen-recovery-test.js`, `tests/sw-corp-test.js`, `tests/boot-order-test.js`, `tests/back-nav-test.js`, `tests/notification-reminder-test.js`, `tests/puter-auth-coop-test.js`, `tests/puter-auth-diagnostics-test.js`, `tests/http-smoke-test.js`
- **Pengalaman belajar**: `tests/lesson-experience-test.js`, `tests/experience-integration-test.js`, `tests/e2e-level-grammar-test.js`, `tests/grammar-curriculum-test.js`, `tests/grammar-memory-scope-test.js`, `tests/grammar-unlock-test.js`, `tests/level-grammar-contract-test.js`, `tests/level-evidence-test.js`, `tests/listening-exam-test.js`, `tests/speaking-exam-test.js`, `tests/speaking-listening-test.js`, `tests/reading-exam-test.js`, `tests/writing-rubric-test.js`, `tests/misconception-diagnosis-test.js`, `tests/tutor-brain-v3-test.js`, `tests/tutor-classroom-regression-test.js`, `tests/tutor-reteach-card-test.js`, `tests/m02542-experience-test.js`, `tests/classroom-test.js`, `tests/skills-dashboard-test.js`, `tests/skills-evidence-test.js`, `tests/personal-journey-test.js`, `tests/personal-journey-ui-test.js`, `tests/library-integrity-test.js`
- **Konten/adopsi (tidak boleh tersentuh — kalau merah berarti rebrand bocor ke konten)**: `tests/content-adoption-test.js`, `tests/content-adoption-evidence-test.js`, `tests/content-adoption-receipt-test.js`, `tests/content-adoption-rehearsal-test.js`, `tests/content-canary-test.js`, `tests/content-evidence-origin-test.js`, `tests/content-integrity-gate-test.js`, `tests/content-patch-gate-test.js`, `tests/content-promotion-test.js`, `tests/content-qa-agent-test.js`, `tests/bank-soal-audit-test.js`
- **Brain/adaptif/infra**: `tests/core-brain-test.js`, `tests/core-brain-v2-test.js`, `tests/core-worker-contract-test.js`, `tests/adaptive-policy-test.js`, `tests/alrs-behavior-test.js`, `tests/policy-outcome-test.js`, `tests/prerequisite-graph-test.js`, `tests/learner-evidence-test.js`, `tests/academic-readiness-test.js`, `tests/continuity-test.js`, `tests/regression-test.js`, `tests/runtime-stage8-test.js`, `tests/fiezel-autonomy-config-test.js`, `tests/fiezel-evolution-ledger-test.js`, `tests/fiezel-evolution-loop-test.js`, `tests/fiezel-meta-learning-test.js`, `tests/fiezel-prompt-library-test.js`, `tests/fiezel-self-refine-test.js`, `tests/ai-integration-test.js`, `tests/app-report-control-path-test.js`, `tests/backup-ui-test.js`, `tests/diag-panel-test.js`, `tests/diag-search-test.js`, `tests/diagnostic-scanner-test.js`, `tests/observability-privacy-test.js`, `tests/reminder-struggle-test.js`, `tests/remote-push-test.js`, `tests/search-feedback-test.js`
- **Audio/voice**: `tests/audio-asset-pipeline-test.js`, `tests/prosody-test.js`, `tests/voice-offline-fallback-test.js`, `tests/neural-cache-isolation-test.js`, `neural-voice-m02520-webgpu-acceleration-test.js`, `tests/neural-voice-m02592-puter-subtitle-test.js`, `tests/neural-voice-m02593-subtitle-translate-test.js`

Ditambah QA manual per fase: 8 screenshot layar kunci mobile+desktop (pakai skrip `redesign/audit/`), tab-through keyboard (focus ring), VoiceOver spot-check dialog, uji reduced-motion, uji install/update PWA satu perangkat nyata setelah `SW_REV` naik.

## Ringkasan rollback path per fase

| Fase | Mekanisme | SW_REV | Catatan |
|---|---|---|---|
| 0 | hapus branch | tidak naik | main tak tersentuh |
| 1 | `git revert <merge-commit-F1>` | **naik lagi** (nilai baru) | token+test satu commit → revert atomik |
| 2 | revert per commit komponen atau merge-commit fase | naik lagi | susun commit per-komponen |
| 3 | revert per sub-rilis (3a/3b/3c) | naik lagi | manifest/PWA → canary 1 perangkat dulu |
| 4 | — (gate, bukan rilis) | — | test merah = blokir merge, bukan rollback |

Aturan emas SW: `SW_REV` **hanya maju**, tidak pernah dikembalikan ke string lama; setiap rilis & setiap rollback = string baru. Ingat biaya klien: satu kenaikan = re-download shell ±152MB (komentar sw.js b.24) — batch perubahan, jangan rilis harian kecil-kecil.

---

## Estimasi effort per fase

Asumsi: 1 engineer frontend yang sudah membaca SPEC.md; "hari" = hari kerja efektif termasuk menjalankan suite + screenshot diff.

| Fase | Isi | Estimasi | Risiko |
|---|---|---|---|
| 0 | branch, baseline test+screenshot, salin font | **0,5 hari** | nol |
| 1 | geser `:root` ×2 blok + alias, 5 fix kontras CSS, sinkron tutor-v3.css, pindah kunci 3 test, SW_REV | **1,5–2 hari** (≈60% di pembaruan test & verifikasi) | rendah |
| 2 | tombol+coral demotion (17 titik), nav/topbar 12px, disabled global, radius/weight, confetti+label internal, rename var bertahap | **3–4 hari** | sedang |
| 3 | panel AI core, Fredoka display, 9+ layar reskin, maskot dock behavior (JS), splash/manifest, langit per-jam | **6–9 hari** (3a: 2–3, 3b: 3–4, 3c: 1–2) | sedang-tinggi |
| 4 | QA gate berjalan di tiap fase; pass final + uji perangkat + canary PWA | **1,5–2 hari** terdistribusi | — |
| **Total** | | **≈12–17 hari kerja** (2,5–3,5 minggu kalender dengan review) | |

Pemicu pembengkakan yang sudah teridentifikasi: (a) test yang memaku literal lebih banyak dari 3 file yang ditemukan — grep `#FFD23F|#FFF8ED|#2B2118` di semua `*-test.js` sebelum Fase 1; (b) 36 hex `#C2402C` mentah tersebar; (c) subset lucide harus ditambah manual per ikon (DESIGN-SYSTEM §5); (d) re-download 152MB per SW_REV membuat iterasi rilis mahal — sediakan channel preview.
