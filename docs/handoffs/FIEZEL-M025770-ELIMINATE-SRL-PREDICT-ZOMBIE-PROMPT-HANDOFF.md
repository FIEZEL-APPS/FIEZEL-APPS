# FIEZEL m025-770 Handoff Dossier: Eliminasi Zombie Prompt SRL-Predict & Indikator Koneksi Mochi SOS

## 1. Ringkasan Eksekutif & Permintaan Pengguna
Sesuai izin dan perintah eksplisit pengguna (*"AKU IZINKAN SEPENUHNYA"*), rilis ini menuntaskan pembersihan anomali tampilan kuis adaptif dan menyempurnakan umpan balik status koneksi Mochi Voice SOS:

1. **Eliminasi Zombie Prompt `srl-predict` di Kuis Adaptif (`app.js`)**:
   - Menghapus penyisipan paragraf teks `<p class="muted srl-predict">Seberapa yakin jawabanmu akan benar?</p>` yang sebelumnya disisipkan tepat di atas container `#options`.
   - Mengikuti mandat resmi Owner (31 Agustus 2026: *"popup keyakinan dihapus semua di semua sesi, itu sangat mengganggu"*), teks pertanyaan metakognisi tersebut tidak boleh lagi melayang tanpa tombol/skala rating di atas tombol pilihan jawaban kuis tata bahasa (`Are / Is / Am / Do`).
   - Murid kini melihat tampilan kuis yang bersih, koheren, dan fokus 100% pada kalimat soal yang sebenarnya (`Do you ready for the test?`).

2. **Indikator Status Sambungan Mochi SOS (`fiezel-mochi-voice-sos.js`)**:
   - Menambahkan status koneksi seketika `setConnectionStatusInternal('connecting', 'Sedang menghubungkan Mochi...')` saat saklar bantuan suara diaktifkan.
   - Murid mendapatkan kejelasan visual bahwa AI Gemini Live sedang dalam proses inisialisasi jaringan, menghilangkan kesan macet/lambat dalam kekosongan hening. Banner otomatis hilang begitu koneksi suara terhubung (`connected`).

---

## 2. Berkas yang Disentuh
- `app.js`: Mengeliminasi baris DOM injection `$('options').before(p)` untuk `srl-predict` pada kuis adaptif.
- `features/mascot/fiezel-mochi-voice-sos.js`: Menambahkan pemanggilan status koneksi `'connecting'` pada inisialisasi duplex Gemini Live.
- `id-golden-baseline.json`: Regenerasi baseline emas teks Indonesia sesuai perubahan di `app.js`.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`: Sinkronisasi 6 titik build `m025-770`.

---

## 3. Hasil Pengujian Mutu (100% HIJAU)
- `tests/id-golden-snapshot-test.js`: PASS
- `tests/th-ui-leak-test.js`: PASS
- `tests/curriculum-cache-version-test.js`: PASS (33 penegasan selaras m025-770)
- `tests/gate-registry-test.js`: PASS (10/10 gerbang mutu valid)
- `tests/srl-coach-test.js`: PASS (Semua kontrak modul SRL valid)
- `tests/secret-scan-test.js`: PASS (46/46 assert PASS, 0 temuan)
- `tests/master-learning-experience-audit-test.js`: PASS (9/9 skenario kuis valid)
- `tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras m025-770)
