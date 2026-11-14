# FIEZEL M025-797 - SSW SENSEI (Pengolahan Makanan OTAFF Ver 5.1 & Wakai Papa Pro) Handoff Dossier

## 1. Ringkasan Arsitektur & Ruang Lingkup
- **Worktree**: `C:\Users\hp\fiezel-kawan-bicara-sync` (branch `fix/kawan-bicara-sync-m025`)
- **Build Terikat**: `m025-797` (`Selaras.`)
- **Tujuan**: Mengintegrasikan **SSW SENSEI** (`飲食料品製造業 特定技能1号`) di fitur Kawan Bicara (`call.html` / `features/voice-studio/`) dengan pola ringan menyerupai Kurikulum SMP (`backend/` + lazy static fallback `./content/ssw/*.json`) agar bundle utama `voice-studio.js` dan precache Service Worker (`sw.js`) tidak membengkak.
- **Pembagian Kerja & Pengawasan**:
  - Agen `143bf1a4-2a2d-4583-a231-ef92178b16b2` menangani modul frontend `features/voice-studio/*`, skenario SSW, panel workbench, dan penyesuaian bilingual Worker.
  - Koordinator menangani kompilasi korpus lengkap Wakai Papa + OTAFF, API FastAPI + seeder MongoDB backend, perbaikan kebocoran spoiler kuis, audit independen, dan verifikasi ulang lintas backend, Playwright Chromium, serta seluruh gerbang mutu FIEZEL.

## 2. Basis Pengetahuan Terindeks (Backend & Lazy Fallback)
- `backend/data/ssw_sensei_full_corpus.json` (`2,169,348` B)
- `content/ssw/ssw-sensei-master-kb.json` (`440,987` B - **tidak** diprecache di `sw.js`)
- `content/ssw/ssw-wakai-papa-corpus.json` (`1,728,333` B - **tidak** diprecache di `sw.js`)
- Cakupan terverifikasi:
  - `91` halaman panduan presisi step-by-step (`Hal. 1-91`, mengintegrasikan OTAFF Ed. 4 Indonesia 79 hal + OTAFF Ver 5.1 Apr 2026 Jepang 86 hal / 142 indeks resmi, termasuk Cashew Nut masuk **9 Wajib Label** dan Pistachio Coklat Dubai masuk **20 Anjuran**)
  - `266` kotoba ber-furigana (`<ruby>`/`<rt>`)
  - `58` kuis CBT, hitungan kalkulator, & jebakan (`119` pembocor alasan di `optionsId` dipisahkan ke `optionRationalesId`; rentang angka seperti `85 - 90°C` dan `37 - 38 triliun` dipertahankan utuh)
  - `13` trik & jebakan utama Wakai Papa/kreator + `5` rumus kalkulator + `13` angka emas
  - `86` transkrip video & Shorts YouTube (`47` Wakai Papa: 42 video panjang + 5 Shorts; `39` kreator SSW Indonesia lain), terindeks ke `1,216` potongan (*chunk*) transkrip.
  - *Catatan jujur*: 2 video kuis visual Wakai Papa (`IxsI0a5d8FA`, `bCM7veQoRi4`) hanya memuat musik latar tanpa narasi suara lisan.

## 3. Daftar Berkas Utama
### Backend
- `backend/ssw_sensei.py`: Router FastAPI `/api/ssw` (`/health`, `/bootstrap`, `/bundle`, `/page/{page_num}`, `/search`, `/videos`, `/video/{video_id}`, `/quiz/draw`, `/quiz/grade`).
- `backend/seed_ssw.py`: Seeder & auto-seed idempoten `/api/seed/ssw`, `/api/seed/ssw/status`.
- `backend/db.py`, `backend/server.py`, `backend/bootstrap.py`: Indeks MongoDB SSW dan registrasi router/startup parity Passenger.

### Frontend & Worker
- `features/voice-studio/src/data/sswSenseiMasterKb.json`: **Dihapus** (486 KB JSON statis tidak lagi tertanam di bundle).
- `features/voice-studio/src/lib/sswSenseiEngine.ts`: Core manifest ringan, hidrasi asinkron (`/api/ssw/bundle?include_chunks=true` lalu fallback `./content/ssw/*.json`), pencarian `1,216` chunk + 91 halaman PDF + 266 kotoba, evaluasi kuis 0-spoiler + rasional per opsi, dan jembatan telemetri ke Braincore (`braincore.ts`).
- `features/voice-studio/src/data/sswCallScenarios.ts`: Persona `ssw_sensei` (`Charon` / `id-ID-ArdiNeural`) + 3 skenario (`scen_ssw_mentor_roadmap`, `scen_ssw_cbt_tryout`, `scen_ssw_math_visual`).
- `features/voice-studio/src/components/SswSenseiWorkbenchPanel.tsx`, `BeginnerAnswerAssistant.tsx`, `App.tsx`, `liveTransport.ts`: UI tab Roadmap/PDF-Kotoba/Simulasi Kuis, 4 tombol chip cepat SSW, tool calls Gemini Live sinkron/async (`get_ssw_progress`, `update_ssw_study_progress`, `lookup_ssw_material_and_page`, `draw_ssw_quiz_question`, `grade_ssw_quiz_answer`).
- `workers/api/voice/route-voice-live.js`: Dukungan dwibahasa Indonesia-Jepang untuk `verify-speech`, `partner-turn`, dan `gemini-tts`.
- `features/voice-studio/dist/voice-studio.js` (`3,378,945` B) & `features/voice-studio/dist/voice-studio.css` (`72,163` B).

## 4. Hasil Pengujian Independen Pasca Edit Terakhir
- `python -m py_compile` (5 file backend) + verifikasi handler `ssw_sensei.py`: **PASS** (`91` pages, `266` kotoba, `58/58` kuis, `86` video / `47` Wakai Papa, `1,216` chunk, `0` em-dash/en-dash).
- `node tools/bump-build.mjs --check`: `m025-797`, `Selaras.`
- `node tests/ssw-sensei-mentor-probe.js`: **SSW_SENSEI_PROBE_PASS: ALL CHECKS GREEN (0 FAILURES)**.
- `node tests/voice-pte-realtime-probe.js`: **PASS** saat dijalankan mandiri (`9ms` internal / `51ms` wall-clock; sempat memicu batas wall-clock `1295ms` vs `< 1100ms` ketika dirantai tepat sesudah Playwright sebelumnya).
- `node tests/backend-env-contract-test.js`: `19/19 assert PASS`.
- `node tests/id-golden-snapshot-test.js`: `HIJAU: baseline emas Indonesia utuh`.
- `node tests/curriculum-cache-version-test.js`: `33 penegasan, m025-797`.
- `node tests/precache-covers-shell-test.js`: `5/5 assert PASS`.
- `node tests/deploy-site-gate-test.js`: `33/33 assert PASS`.
- `node tests/critical-surface-protection-test.js`: `9 PASS, 0 FAIL`.
- `node tests/th-ui-leak-test.js`, `voice-copilot-relevance-gate-test.js` (`26/26`), `voice-cjk-phonetics-anti-leak-test.js`, `voice-studio-ui-architecture-test.js` (`8/8`), `voice-kawan-bicara-sync-test.js`, `gate-registry-test.js` (`10 pass, 0 fail`): **PASS**.
- Preview `http://localhost:8080/call.html?lang=ja`: HTTP `200`, `m025-797`, `./content/ssw/ssw-sensei-master-kb.json` HTTP `200`.

## 5. Status Git & Langkah Lanjut
- Perubahan masih berada di worktree lokal `C:\Users\hp\fiezel-kawan-bicara-sync` (belum di-commit / belum dibuat PR ke `main`).
- Saat siap merilis ke produksi sesuai `AGENTS.md`: buat PR dari cabang kerja ke `main`, pantau CI *FIEZEL Quality Gate* & *FIEZEL Deploy Site* hingga 100% hijau sebelum merge.
