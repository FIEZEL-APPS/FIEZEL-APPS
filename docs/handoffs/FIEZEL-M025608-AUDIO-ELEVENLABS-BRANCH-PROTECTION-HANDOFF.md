# FIEZEL M025-608 Handoff Dossier: Branch Protection Fallback pada CI Audio ElevenLabs

**Nomor Rilis**: `m025-608`
**Cakupan**: `fix(audio): tambahkan proteksi branch fallback pada workflow audio elevenlabs (m025-608)`
**Tanggal**: 19 Oktober 2026
**Status CI & Mutu**: 100% HIJAU (PASS)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Pada alur kerja produksi audio ElevenLabs (`.github/workflows/audio-generate.yml`), langkah penyimpanan manifest (`Simpan manifest`) sebelumnya melakukan `git push` langsung ke branch `main`.

Dengan diterapkannya proteksi branch ketat pada `main` (`GH006: Protected branch update failed`), setiap `git push` langsung ke `main` akan ditolak oleh GitHub. Pada implementasi lama, hal ini memicu kegagalan berulang (`git pull --rebase` lalu `exit 1`) sehingga catatan aset audio yang telah berhasil diunggah ke Cloudflare R2 tidak tersimpan di repositori.

---

## 2. Solusi Teknis & Perubahan Sistemik

1. **Penerapan Pola Branch Fallback**:
   - Menyelaraskan alur `audio-generate.yml` dengan pola yang telah terbukti di `audio-gemini-generate.yml`.
   - Mengalirkan berkas manifest remote ke `/tmp/remote-manifest.json` agar terbebas dari batasan buffer memori `execSync`.
   - Jika `git push origin main` ditolak oleh aturan proteksi branch, sistem secara otomatis beralih ke branch baru `audio-update-<timestamp>` dan mendorongnya ke remote sehingga Pull Request dapat dibuat dan di-merge dengan aman.

2. **Integrasi Profil Suara Brittney (ElevenLabs Starter)**:
   - Voice ID `XiPS9cXxAVbaIWtGDHDh` (Brittney - Young, Peppy Female) berhasil diintegrasikan ke akun ElevenLabs dan diverifikasi aktif.
   - Secret `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, dan `ELEVENLABS_MODEL_ID` telah disinkronkan di GitHub Secrets.

3. **Penyelarasan Arbiter Hexa-Sync (m025-608)**:
   - Build version dinaikkan secara resmi melalui `tools/bump-build.mjs` ke `m025-608`.

---

## 3. Bukti Pengujian Empiris & Verifikasi Mutu

Seluruh gerbang mutu lokal telah diuji dan lulus 100%:
1. `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
2. `node tests/th-ui-leak-test.js` -> PASS (Nol kebocoran teks)
3. `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan pada build m025-608)
4. `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
5. `audio-generate.yml` (Run #39266408303) dengan mode `--verify-only` lulus sukses 100% hijau di GitHub Actions.
