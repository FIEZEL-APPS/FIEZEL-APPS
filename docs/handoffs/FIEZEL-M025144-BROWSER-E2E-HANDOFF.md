# m025-144 — Aplikasinya akhirnya dibuka, bukan hanya dibaca

Menutup **B-12**, temuan P1 terakhir yang belum tersentuh. Delapan puluh delapan gate sebelumnya
membaca sumber atau menjalankan fungsi di dalam `vm`. Tidak satu pun pernah membuka
`index.html`, menekan tombolnya, memuat ulang halaman, dan memeriksa apakah progres murid masih
ada.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Kenapa ini bukan formalitas

m025-140 menemukan satu baris `let` yang menghapus **seluruh riwayat murid** saat aplikasi
dimuat. Tidak satu pun gate teks bisa melihatnya - yang menangkapnya adalah menjalankan
berkasnya. Gate ini menutup jarak yang sama untuk lapisan yang lebih tinggi: DOM, penyimpanan,
muat ulang, dan service worker.

Chromium dijalankan langsung lewat CDP. **Tanpa dependensi npm baru** - tidak ada Playwright
yang perlu dipasang, tidak ada unduhan peramban di CI.

## 2. Yang dibuktikan di browser sungguhan

| Pemeriksaan | Hasil terukur |
|---|---|
| Halaman nyata boot dan memuat kontrak level | `getActiveLevel`/`setActiveLevel` hidup di `index.html`, bukan di `vm` |
| Grammar Hub tergambar berurutan | 17 kartu A1, penomoran 1..17 berurutan |
| Lesson terkunci benar-benar `disabled` di DOM | 16 terkunci, semuanya membawa alasan tertulis |
| Lesson pertama selalu terbuka | murid baru punya pintu masuk |
| Lesson terkunci menolak panggilan fungsi langsung | `practiceSkill()` + `openGrammarLesson()` tidak mengubah layar |
| Ganti level memindahkan panelnya | A1 (17 kartu) → B1 (47 kartu), catatan jalur ikut berubah |
| A1 → B1 → A1 mempertahankan bukti | mastery 90 dan riwayat utuh |
| Muat ulang tidak menghapus progres | mastery 90 bertahan setelah reload |
| Service worker terdaftar di origin nyata | `registration` ada |

## 3. Dua koreksi terhadap dugaan saya sendiri

**Layar kosong ternyata bukan bug.** Saat `js.puter.com` diblokir jaringan, `#app` tetap kosong
selama 60 detik dan saya sempat menyimpulkan itu layar putih. Ternyata yang tampil adalah
**perkenalan lima langkah** untuk murid baru (`.fiezel-ob`) - perilaku yang memang benar. Gate
ini menandai perkenalan sudah selesai lewat kunci penyimpanan yang **sama** dengan yang dipakai
aplikasi (`fiezel-onboarding-v1`), bukan lewat jalan pintas yang hanya ada di tes.

**Satu kegagalan pertama juga salah saya.** Pemeriksaan muat ulang merah karena fixture-nya
menulis riwayat tanpa menaikkan `totalAnswered` - dan `sanitizeState()` memang SENGAJA
membersihkan progres turunan ketika belum ada satu jawaban pun tercatat, supaya state yang
rusak tidak menghidupkan penguasaan palsu. Aplikasinya benar; tesnya yang menuduh.

## 4. Kalau peramban tidak tersedia

Gate mencari Chromium/Chrome di beberapa lokasi umum (termasuk `/opt/pw-browsers`,
`/usr/bin/google-chrome`, dan `CHROME_PATH`). Kalau tidak ada, ia menulis status **SKIPPED**
dan mengatakan terang-terangan: *"E2E dilewati: browser tidak tersedia. Ini BUKAN bukti
aplikasi sehat."* Gate yang diam saat dilewati lebih berbahaya daripada gate yang tidak ada.

## 5. Bukti

- Seluruh **89 gate** `.github/workflows/quality.yml`: PASS.
- `tests/e2e-level-grammar-test.js`: **9/9 PASS** di Chromium sungguhan.
- Versi naik bersama ke `m025-144`.

## 6. Sisa

Seluruh temuan P1 diagnosis Brain Core (B-01, B-04, B-05, B-06, B-07, B-11, B-12) kini tertutup.
Yang masih terbuka: **B-08/B-09** kalibrasi 300 bacaan lama, **B-10** sudah ditutup m025-138,
serta Speaking dan Listening yang belum berformat ujian. Verdict HOLD diagnosis belum dicabut -
pencabutannya wewenang OWNER, bukan wewenang berkas ini.
