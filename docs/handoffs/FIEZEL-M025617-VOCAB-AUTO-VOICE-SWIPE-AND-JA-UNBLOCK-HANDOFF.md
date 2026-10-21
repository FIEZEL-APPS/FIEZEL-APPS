# Handoff FIEZEL m025-617: Auto-Play Audio Flashcard Kosakata (EN & JA) & Unblock Suara Kotoba N5

**Otoritas: USER / OWNER.**
**Nomor Build: `m025-617`**
**Tanggal: 20 Oktober 2026**

---

## 1. Ringkasan Perubahan

Sesuai permintaan user:
> *"aku inginya setiap kali user swipe kartu kosa kata, suaranya otomatis muncul, tanpa perlu tekan tombol apapun, juga berlaku pada sesi kosakata bahasa inggris"*
> *"apakah semuanya sudah live? dan sudah bisa di putar semua suara kotobanya di pwa?"*

Perubahan pada build `m025-617` meliputi:
1. **Auto-play Audio Kosakata Saat Kartu Muncul / Di-swipe**:
   - Di `flashcards(level)`: Begitu kartu kosa kata aktif ditampilkan (saat pertama buka sesi atau setelah swipe/navigasi ke kartu berikutnya/sebelumnya), fungsi `audio.play(v.word, {contentType:'word', next:nextCard?nextCard.word:''})` otomatis dipanggil tanpa memerlukan murid menekan tombol ikon speaker.
   - Di `reviewVocab()`: Hal serupa diterapkan saat pengulangan kosakata cerdas / review flashcards.
   - Panggilan `audio.stop()` dipasang pada siklus teardown (`leave`) agar audio segera berhenti bila murid berpindah halaman/keluar dari sesi flashcard.
2. **Pencabutan Gembok Suara Bahasa Jepang (`TARGET_LANG_TANPA_SUARA`)**:
   - Gembok `TARGET_LANG_TANPA_SUARA = Object.freeze(['ja'])` telah dicabut menjadi `Object.freeze([])` karena 1.000 audio kotoba N5 resmi sudah aktif dan live di Cloudflare R2 worker CDN (`https://fiezel-audio.fitrajft.workers.dev/a/...`) dengan manifest `vocabulary-audio-manifest.json` yang terintegrasi.
   - `targetLangVoiceBlocked()` kini mengembalikan `false` untuk `'ja'` dan `'en'`.
3. **Resolusi Locale Dinamis di `AudioService`**:
   - `AudioService.prefetch(word, ...)` dan `AudioService.play(word, ...)` kini secara dinamis memeriksa bahasa target aktif:
     `const loc = (typeof activeTargetLang === 'function' && activeTargetLang() === 'ja') ? 'ja-JP' : (opts.locale || 'en-US');`
   - Hal ini memastikan kosa kata Jepang diputar dan diprefetch menggunakan locale `'ja-JP'`, sedangkan bahasa Inggris menggunakan `'en-US'`.
4. **Penyelarasan Pengujian & Baseline Snapshot**:
   - `tests/target-lang-surface-guard-test.js`: Diperbarui untuk menegaskan bahwa `'ja'` tidak lagi diblokir suaranya (`targetLangVoiceBlocked()` mengembalikan `false`).
   - `id-golden-baseline.json`: Baseline emas diverifikasi dan disinkronkan kembali lewat `id-golden-snapshot-test.js --write-baseline` (13 berkas terkunci, 5808 literal identik utuh).
   - Hexa-sync arbiter menaikkan versi build ke `m025-617`.

---

## 2. Berkas yang Diubah

1. `app.js`: Auto-play pada flashcard regular & review vocab, unblock `'ja'` di `TARGET_LANG_TANPA_SUARA`, dynamic locale resolution `ja-JP`/`en-US`.
2. `tests/target-lang-surface-guard-test.js`: Update penegasan `targetLangVoiceBlocked()` untuk `'ja'`.
3. `id-golden-baseline.json`: Sinkronisasi snapshot AST literal `app.js`.
4. `sw.js`: Bump versi cache ke `m025-617`.
5. `core-config.js`: Bump `FIEZEL_PAGE_BUILD` ke `m025-617`.
6. `features/neural-voice/fiezel-diag-panel.js`: Bump `DIAG_BUILD` ke `m025-617`.
7. `kurikulum.html`: Cache busting script query `?v=m025-617`.
8. `misi.html`: Cache busting script query `?v=m025-617`.
9. `coordination/BUILD-VERSION.json`: Versi `m025-617`.
10. `docs/handoffs/FIEZEL-M025617-VOCAB-AUTO-VOICE-SWIPE-AND-JA-UNBLOCK-HANDOFF.md`: Dokumen handoff resmi ini.

---

## 3. Bukti Verifikasi Mutu (Quality Gates)

Semua uji otomatis lulus 100%:
- `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
- `node tests/th-ui-leak-test.js` -> PASS (4402 kunci padanan th lengkap, bebas kebocoran)
- `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan selaras m025-617)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tests/target-lang-surface-guard-test.js` -> PASS (13/13 assert PASS)
- `node tools/bump-build.mjs --check` -> PASS (Hexa-sync selaras)
