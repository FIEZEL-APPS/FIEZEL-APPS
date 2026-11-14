# FIEZEL m025-795 — Kawan Bicara (Mitra Kaiwa) Synchronization Audit & Fix Handoff

## 1. Ringkasan Temuan Audit

Audit lengkap dilakukan pada seluruh permukaan **Kawan Bicara (`Mitra Kaiwa` / AI Voice Studio)** (`features/voice-studio/`, `workers/api/voice/route-voice-live.js`, dan `call.html`) setelah keluhan ketidakcocokan serius antara kolom bicara (Live HUD & Riwayat Transkrip), terjemahan, bantuan jawaban (`BeginnerAnswerAssistant`), serta pop-up (`InCallLearningWorkbenchModal`) dan seluruh cara baca (Furigana, Romaji, Pinyin, serta panduan fonetik bahasa Inggris).

Masalah akar yang ditemukan dan diperbaiki:
1. **Ketidaksinkronan Multi-Jalur Panduan Baca (Cara Baca Drift)**:
   - Live HUD, Riwayat Transkrip (`History`), kartu koreksi `"Naturalnya begini"`, `BeginnerAnswerAssistant`, dan `InCallLearningWorkbenchModal` masing-masing memanggil utilitas berbeda untuk menghasilkan Furigana/Romaji/Pinyin/Fonetik Inggris, sehingga kata yang sama menghasilkan cara baca yang berbeda antar-panel.
   - Solusi: Memperkenalkan Single Source of Truth `resolveUnifiedPronunciation` di `features/voice-studio/src/lib/liveCallHelper.ts` dan menyambungkannya ke `JapaneseRubyDisplay.tsx`, `BeginnerAnswerAssistant.tsx`, `InCallLearningWorkbenchModal.tsx`, `liveTransport.ts`, serta `App.tsx`.
2. **Cacat Transliterasi CJK (`japanesePhonetics.js` & `mandarinPhonetics.ts`)**:
   - Bahasa Jepang: Kosakata frekuensi tinggi Voice Studio (`なるほど`, `この`, `その`, `あの`, `どの`, `どんな`, bentuk kata kerja dasar & partikel gabungan) dan pelindung non-partikel (`startsNonParticleAux`) ditambah penanganan tanda kutip `«` / `»` belum lengkap.
   - Bahasa Mandarin: Penggabungan erhua keliru saat karakter depan memiliki vokal bernada (`还容易` salah terbaca alih-alih `hái róngyì`), spasi guillemet `«` / `»`, serta kosakata pedagogis workbench (`语序`, `例子`, `动词`, `前面`, `后面`, `试试`).
3. **Kualitas Evaluasi, Echo Redemption, & Kebocoran Bahasa di Pop-up Workbench (`InCallLearningWorkbenchModal.tsx`, `route-voice-live.js`)**:
   - Koreksi ucapan & echo redemption kini tidak lagi mengulang kesalahan pengguna mentah-mentah (`watashi wa koohii ni nomimasudeshita` -> `watashi wa koohii o nomimashita`; `zh_location_before_verb` menempatkan `在 + lokasi` sebelum kata kerja).
   - Pop-up `InCallLearningWorkbenchModal` kini penuh memakai `<JapaneseRubyDisplay>` di judul topik, `confusing_pair`, `syntax_ribbon`, `magic_character`, `tone_waveform`, `options`, `cloze`, dan `blocks`, mendukung blok kalimat berbasis `Intl.Segmenter`, penilaian Cloze & Susun Kalimat CJK yang toleran spasi, pembersihan markup `**` mentah, serta lokalisasi penuh UI `th | ja | zh | id`.
4. **Responsivitas Seluler (`390x844`) & Kebocoran UI `id` di Mode `th`**:
   - Baris tab `1 · Singkat`, `2 · Alami`, `3 · + Tanya Balik` pada `BeginnerAnswerAssistant.tsx` sebelumnya terpotong di lebar `390px` karena sebaris dengan header dropdown; kini dipecah responsif (`flex-wrap sm:flex-nowrap` + `order-*`).
   - Tinggi Mochi stage (`h-[88px] sm:h-[200px] lg:h-[225px]`), `live-translation-hud`, `ruby.fz-ja-ruby, ruby.zh-ruby` (`line-height: 2.15 !important`, `ruby-align: center`), serta padding bawah riwayat (`pb-8 sm:pb-10` + smooth scroll saat beralih ke tab Riwayat) dirapikan di `App.tsx` & `index.css`.
   - Label tersisa di kartu panggilan, kontrol pemutar suara (`Putar Suara` -> `เล่นเสียง` / `音声を再生` / `播放语音`), tab Riwayat (`data-testid="tab-history-btn"`, `data-testid="tab-call-btn"`), dan mode kuis pop-up kini terlokalisasi lengkap tanpa kebocoran string Indonesia di mode Thai (`th`).

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

Probe empiris dijalankan melalui Playwright terhadap build produksi terbaru `features/voice-studio` pada 5 skenario lintasan bahasa dan ukuran layar (`en_desktop_id`, `ja_mobile_id`, `zh_mobile_id`, `ja_mobile_th`, `zh_desktop_th`):
- **`pageErrors`**: `[]` (nol error runtime di ke-5 skenario).
- **Sinkronisasi Cara Baca & Ruby (`afterTurnHud` & `historyDetails` & `workbenchReport`)**:
  - `en_desktop_id`:
    - `hudAiPron`: `"Gud tri! In-sted of seiing \"Ai em e-gri\", sei: \"Ai e-gri bi-koz yes-ter-dei Ai went tu de lai-bre-ri.\""`
    - `userPron`: `"Ai em e-gri bi-koz yes-ter-dei Ai goed tu lai-bre-ri."`
    - `corrPron`: `"Ai e-gri bi-koz yes-ter-dei Ai went tu lai-bre-ri."`
  - `ja_mobile_id` & `ja_mobile_th`:
    - `hudAiPron`: `"Naruhodo! Kono baai wa \"kafe de koohii o nomimashita.\" to iu to shizen da yo. Mouichido itte mite!"` (`hudAiRtCount: 6`)
    - `userPron`: `"Watashi wa koohii ni nomimasudeshita."`
    - `corrPron`: `"Watashi wa koohii o nomimashita."` (`corrRtCount: 2`)
    - `wbTitle`: `"て形けいと過去形かこけいの使つかい分わけ・助詞じょし「を」 / Tekei to kakokei no tsukaiwake joshi \"o\""`
    - `wbOpt1Pron`: `"Kinou kafe de koohii o nomimashita."`
  - `zh_mobile_id` & `zh_desktop_th`:
    - `hudAiPron`: `"Méiguānxì! Wǒmen bǎ dìdiǎn fàng zài dòngcí qiánmiàn: qǐng shuō \"wǒ zài jiālǐ xuéxí Hànyǔ.\" nǐ shìshi kàn!"` (`hudAiRtCount: 28`, tidak lagi menyatu `还容易` di kartu saran tingkat 2 `hái róngyì jì zhù`)
    - `userPron`: `"Wǒ xuéxí Hànyǔ zài jiālǐ."`
    - `corrPron`: `"Wǒ zài jiālǐ xuéxí Hànyǔ."` (`corrRtCount: 8`)
    - `wbTitle`: `"汉Hàn语yǔ语yǔ序xù：在zài家jiā里lǐ学xué习xí汉Hàn语yǔ / Hànyǔ yǔxù: zài jiālǐ xuéxí Hànyǔ"`
    - `wbOpt1Pron`: `"Wǒ zài jiālǐ xuéxí Hànyǔ."`
- **Kebocoran UI Thai (`th`)**: `hasIndonesianLeakInTh: false` pada riwayat & `hasIndonesianButtonLeak: false` pada workbench untuk `ja_mobile_th` dan `zh_desktop_th`; tangkapan layar `ja_mobile_id_hud.png`, `ja_mobile_th_history.png`, `zh_desktop_th_hud.png`, `zh_desktop_th_workbench.png`, dan `en_desktop_id_history.png` diverifikasi bebas asterisk markdown `**`, tab `1 · Singkat` utuh tidak terpotong di `390x844`, dan kontrol audio/panggilan terlokalisasi penuh.

## 3. Daftar Berkas yang Disentuh

### Kode Fitur & Worker
- `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/src/lib/japanesePhonetics.js`
- `features/voice-studio/src/lib/mandarinPhonetics.ts`
- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/components/JapaneseRubyDisplay.tsx`
- `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/index.css`
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css` (hasil `vite build`)
- `workers/api/voice/route-voice-live.js`

### Pengujian & CI
- `tests/voice-kawan-bicara-sync-test.js` (baru — terdaftar di `.github/workflows/quality.yml`)
- `.github/workflows/quality.yml` (penambahan baris `node tests/voice-kawan-bicara-sync-test.js`)
- `id-golden-baseline.json` (pembaruan baseline golden Indonesia atas perubahan naskah terverifikasi di bundle `features/voice-studio/dist/voice-studio.js`)

### Sinkronisasi Build & Rilis (`m025-795`)
- `coordination/BUILD-VERSION.json` (`m025-795`)
- `sw.js` (`SW_REV` -> `m025-795`)
- `core-config.js` (`FIEZEL_PAGE_BUILD` -> `m025-795`)
- `features/neural-voice/fiezel-diag-panel.js` (`DIAG_BUILD` -> `m025-795`)
- `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html` (rujukan versi `?v=m025-795` via `node tools/bump-build.mjs`)
- `docs/handoffs/FIEZEL-M025795-KAWAN-BICARA-SYNC-AUDIT-HANDOFF.md` (dokumen serah terima ini)

## 4. Status Gerbang Mutu Lokal

Diverifikasi di worktree `C:\Users\hp\fiezel-kawan-bicara-sync` setelah seluruh suntingan final dan pembaruan baseline:
- `node tools/bump-build.mjs --check`: Selaras (`m025-795`, `selaras: true`)
- `npm run build` (`features/voice-studio`): LULUS (Vite v6.4.5, 2199 modules, exit 0)
- `node tests/voice-kawan-bicara-sync-test.js`: LULUS (5/5 assertion groups)
- `node tests/voice-cjk-phonetics-anti-leak-test.js`: LULUS (exit 0)
- `node tests/voice-copilot-relevance-gate-test.js`: LULUS (26/26)
- `node tests/voice-studio-ui-architecture-test.js`: LULUS (8/8)
- `node tests/id-golden-snapshot-test.js`: LULUS (`HIJAU: baseline emas Indonesia utuh.`)
- `node tests/th-ui-leak-test.js`: LULUS (`4751 kunci id, semuanya punya padanan th`)
- `node tests/curriculum-cache-version-test.js`: LULUS (`33 penegasan, 3 halaman, build m025-795`)
- `node tests/gate-registry-test.js`: LULUS (`10 pass, 0 fail`)
- `node tests/critical-surface-protection-test.js`: LULUS (`9 PASS, 0 FAIL`)
- `node tests/collateral-scope-guard-test.js`: LULUS (`8 PASS, 0 FAIL`)

## 5. Catatan & Pekerjaan Lanjutan

- Perubahan berada di branch `fix/kawan-bicara-sync-m025` pada worktree terisolasi `C:\Users\hp\fiezel-kawan-bicara-sync` (direktori root `c:\Users\hp\fiezel-apps` tidak disentuh).
- Untuk merilis ke `main`, buat commit + Pull Request dari branch `fix/kawan-bicara-sync-m025` agar melewati 10 check wajib GitHub (`FIEZEL Quality Gate`, `A6`–`A14`, dan Auto PR Review) sebelum merge dan deploy ke Cloudflare (`https://fiezel.my.id/app/`).
