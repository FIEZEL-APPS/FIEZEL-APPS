# Prompt Audit UI/UX FIEZEL — "berantakan & susah dimengerti"

> Prompt ini ditulis untuk dijalankan Claude sendiri di repo `FIEZEL-APPS/FIEZEL-APPS`.
> Ditulis 2026-08-30 atas keluhan owner: *"ui dan ux fiezel sangat berantakan, dan susah
> di mengerti"*. Cakupan: UI, UX, splash, onboarding, dan seluruh bug tampilan.

## 0. Aturan main

1. **Bukti sebelum opini.** Setiap temuan wajib punya angka atau `file:line`. Kalimat
   "terasa ramai" tidak boleh masuk laporan tanpa hitungan elemen, piksel, atau rasio kontras.
2. **Render, jangan grep.** 201 file `*-test.js` di repo ini semuanya regex atas teks sumber;
   tidak satu pun membuka halaman. Audit ini harus menjalankan aplikasi di browser sungguhan
   (Playwright + Chromium yang sudah terpasang) pada viewport nyata.
3. **Perbaiki akar, bukan gejala.** Kalau satu elemen meluber, cari aturan CSS yang
   menyebabkannya — jangan menambal dengan `overflow:hidden` di satu tempat.
4. **Regresi wajib dikunci.** Setiap bug yang diperbaiki harus punya tes yang MERAH sebelum
   perbaikan dan HIJAU sesudahnya, dan tes itu masuk `.github/workflows/quality.yml`.
5. **Jangan redesign diam-diam.** Ubah yang rusak. Perubahan rasa/selera yang besar
   diusulkan di laporan, tidak dikerjakan sepihak.
6. Ritual versi (`core-config.js` `FIEZEL_PAGE_BUILD`, `fiezel-diag-panel.js` `DIAG_BUILD`,
   `sw.js` `SW_REV`) dinaikkan bersama, +1 dari `m025-N` sekarang.
7. Seluruh suite di `.github/workflows/quality.yml` harus hijau sebelum diklaim selesai.

## 1. Viewport yang diuji

Wajib keempat-empatnya — keluhan "berantakan" hampir selalu lahir di layar sempit:

| Nama | Ukuran | Alasan |
|---|---|---|
| `xs` | 320×568 | iPhone SE gen-1 / Android murah; lantai terkecil yang realistis |
| `sm` | 390×844 | iPhone 14 — perangkat mayoritas |
| `md` | 768×1024 | tablet potret |
| `lg` | 1280×800 | desktop |

## 2. Yang harus diukur di setiap layar × setiap viewport

Layar: `home`, `vocab`, `grammar`, `reading`, `skills`, `listening`, `speaking`, `writing`,
`test`, `progress`, `classroom`, `library`, `ask`, `online` — ditambah **splash**,
**onboarding (tiap langkah)**, gerbang notifikasi, gerbang akun, dan modal.

Detektor yang harus jalan:

- **D1 — Scroll horizontal.** `documentElement.scrollWidth > clientWidth`. Nol toleransi.
- **D2 — Elemen meluber.** Setiap elemen yang `rect.right > viewport.width + 1` atau
  `rect.left < -1`. Laporkan selector + berapa piksel lewatnya.
- **D3 — Target sentuh.** Semua `button, a, [role=button], input, select` yang terlihat dan
  punya `min(w,h) < 44px` (lantai WCAG 2.5.5 / HIG). Kecualikan yang memang dekoratif.
- **D4 — Tumpang tindih kontrol.** Dua elemen interaktif yang kotaknya beririsan >40% —
  ini yang membuat tombol "tidak bisa dipencet".
- **D5 — Tertutup chrome.** Kontrol yang tertimbun bottom-nav / FAB maskot / dok Pau:
  uji `document.elementFromPoint(cx, cy)` — kalau yang balik bukan elemen itu atau
  keturunannya, kontrolnya tidak bisa diklik.
- **D6 — Kontras teks.** Rasio kontras aktual hasil komputasi (bukan token di CSS) untuk
  setiap simpul teks yang terlihat; ambang AA 4.5:1 (3:1 untuk ≥24px atau ≥19px bold).
  Jalankan di tema terang **dan** gelap, dan di keempat fase langit (dawn/day/dusk/night)
  karena palet langit menimpa permukaan.
- **D7 — Teks terpotong.** `scrollWidth > clientWidth` pada elemen ber-`text-overflow` atau
  ber-tinggi tetap; dan label tombol yang terpotong di 320px.
- **D8 — Tabrakan z-index.** Kumpulkan seluruh lapisan ber-`position:fixed`; pastikan
  urutannya (splash > modal > gerbang > toast > FAB > nav) konsisten dan tidak ada dua
  lapisan yang saling menutup pada saat bersamaan.
- **D9 — Fokus keyboard.** Tab dari awal: tiap perhentian harus terlihat, punya cincin fokus,
  dan tidak boleh keluar dari modal yang sedang terbuka (focus trap).
- **D10 — Keadaan kosong & muat.** Paksa state kosong (murid baru, nol progres, offline) dan
  pastikan tidak ada panel kosong tanpa penjelasan, `undefined`, `NaN`, atau `[object Object]`.
- **D11 — i18n.** Setiap `data-i18n` punya kunci; tidak ada kunci mentah bocor ke layar;
  cek `id` dan `th`, dan cek luberan akibat teks Thai yang lebih panjang.
- **D12 — Gerak.** Dengan `prefers-reduced-motion: reduce`, tidak boleh ada animasi
  berjalan; splash tetap harus bubar.

## 3. Pertanyaan UX yang harus dijawab dengan angka

Keluhan owner bukan cuma bug piksel — "susah dimengerti" adalah masalah struktur:

- **U1 — Beban layar.** Hitung untuk tiap layar: jumlah panel level-atas, jumlah kontrol
  interaktif, jumlah kata. Home yang punya belasan panel adalah temuan, bukan selera.
- **U2 — Satu layar satu aksi utama.** Hitung tombol ber-gaya primer yang terlihat
  bersamaan. Lebih dari satu = hierarki hilang = murid bingung harus menekan apa.
- **U3 — Kedalaman menuju "mulai belajar".** Berapa ketukan dari buka aplikasi sampai soal
  pertama muncul, untuk murid baru dan murid lama. Target ≤2 untuk murid lama.
- **U4 — Jargon.** Daftar istilah yang muncul di UI yang tidak akan dimengerti anak SMA
  (mis. "adaptif", "evidence", "kalibrasi", "BKT", "OLM", "SRL", "policy"). Setiap istilah
  internal yang bocor ke layar murid adalah bug.
- **U5 — Konsistensi.** Satu konsep, satu nama. Cari sinonim yang bersaing di UI
  ("Peta"/"Progress"/"Perjalanan", "Latihan"/"Sesi"/"Kuis").
- **U6 — Splash & onboarding.** Total durasi sampai murid bisa berinteraksi; jumlah langkah
  onboarding; berapa yang benar-benar wajib. Setiap langkah harus membayar dirinya sendiri.

## 4. Urutan kerja

1. Bangun harness Playwright yang bisa membuka aplikasi, memaksa `state` tertentu
   (murid baru / murid lama / offline), dan berpindah layar.
2. Jalankan D1–D12 dan U1–U6, simpan hasil mentah ke JSON di
   `reports/ui-ux-audit-2026-08/`.
3. Urutkan temuan: **P0** = tidak bisa dipakai (kontrol tak terjangkau, app buntu,
   teks tak terbaca) → **P1** = merusak pemahaman (hierarki, jargon, luberan) →
   **P2** = poles.
4. Perbaiki P0 dan P1. P2 dicatat.
5. Tulis tes regresi berbasis render untuk tiap perbaikan; daftarkan di `quality.yml`.
6. Jalankan seluruh suite sampai hijau. Naikkan trio versi. Commit ke
   `claude/audit-ui-ux-bugs-ca64u5`, push.
7. Laporan lengkap di deskripsi PR; ringkas di chat.

## 5. Definisi selesai

- Nol scroll horizontal dan nol elemen meluber di keempat viewport.
- Nol kontrol tak terjangkau atau tertimbun.
- Nol pelanggaran kontras AA pada teks yang terlihat, di kedua tema dan keempat fase langit.
- Nol target sentuh <44px pada kontrol nyata.
- Home punya tepat satu aksi primer yang terlihat.
- Tidak ada jargon internal di layar murid.
- Suite `quality.yml` hijau, termasuk tes render yang baru.
