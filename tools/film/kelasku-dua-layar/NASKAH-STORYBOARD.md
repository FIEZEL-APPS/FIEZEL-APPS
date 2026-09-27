# FIEZEL · "Satu Kelas, Dua Layar" — naskah & storyboard

**Film 3D KelasKu (murid) + Dasbor KelasKu untuk Guru** · 72 dtk · 1080×1920 · 30 fps · 100 BPM
Kode proyek: **DUA LAYAR** · dibuat 24 September 2026

---

## 0. Satu kalimat

> **Satu kelas. Dua layar. Terhubung.** Apa pun yang guru kirim sampai ke murid; apa pun yang
> murid kerjakan pulang sendiri ke guru — lalu KelasKu mengubahnya menjadi tindakan.

**Penonton utama:** guru SMP/SMA (dan kepala sekolah) yang mengajar ±32 murid per kelas.
**Rasa yang dituju:** megah tapi hangat; "ternyata sejelas ini" — bukan iklan yang berteriak.
**Ajakan:** *Buka Demo Guru di fiezel.my.id* — tombol yang memang ada di website dan membuka
dasbor demo berisi kelas contoh, tanpa mendaftar.

## 1. Konsep visual — dua mata, satu aula

- **Aula megah berkolonade** (pilar 16 m, berkabut) — skala yang membuat satu kelas terasa penting.
- **32 slate porselen melayang** = 32 murid, tersusun 4 × 8 seperti bangku kelas, menghadap guru.
  Nama asli dari kelas demo aplikasi (Rina, Yoga, Sari, Bagas, Nadia, Fikri, …).
- **Monolit "KelasKu untuk Guru"** = sidebar dasbor guru yang asli (Ringkasan hari ini, Ruang
  Kelas, Siswa, Tugas & Ujian, Analitik kelas, Komunikasi, Jurnal Guru, waktu yang dihemat).
- **Benang cahaya** emerald→emas menghubungkan monolit ke tiap slate. **Kapsul data** berjalan
  di atasnya ke dua arah: tugas turun ke murid, hasil naik ke guru. Itulah "terhubung".
- **Amfiteater dasbor**: di detik 26,4 (drop) dasbor membuka diri menjadi dinding melengkung
  16 panel mengelilingi kelas. Tiap fitur "lepas" dari dinding ke arah kamera, lalu kembali.

**Tata bahasa kamera** (penonton merasakannya tanpa dijelaskan):
- Melihat **ke arah kelas** dari sisi monolit = **mata guru** (wajah slate terlihat).
- Melihat **ke arah monolit** dari antara murid = **mata murid** (panel KelasKu dekat, bokeh).

**Cahaya bercerita:** malam (tidak tahu siapa yang tertinggal) → fajar saat KelasKu muncul →
siang (jelas) → senja keemasan di puncak → semua terisap ke satu titik → splash resmi.

## 2. Kait (0,0–4,8 dtk) — kuat sejak frame pertama

Frame 0: 32 slate bercahaya di ruang gelap, kamera sudah meluncur. Genangan cahaya hangat di
bawah tiap slate. Di 1,2 dtk slate **Raka** meredup dan mundur; 3,3 dtk **Yoga**, 3,6 dtk
**Fajar** ikut meredup. Fokus pindah ke slate yang padam.
VO: *"Tiga puluh dua murid. Satu guru. — Siapa yang diam-diam tertinggal?"*
Tiga nama itu kembali di detik 29 sebagai daftar **"siapa yang perlu disapa hari ini"** —
pertanyaan kait dijawab oleh produk.

## 3. Storyboard

Kolom **Bukti** = berkas sumber di repo yang membuktikan fitur itu nyata.

| Shot | Waktu (dtk) | Kamera | Gambar & gerak | VO | Bukti |
|---|---|---|---|---|---|
| SH01 kait | 0,00–4,85 | 38→42 mm, meluncur rendah, rack fokus ke slate yang padam | 32 slate di kegelapan; Raka, Yoga, Fajar meredup | 01 · 02 | kelas demo `seedClass()` |
| SH02 monolit bangkit | 4,85–7,20 | potong; 26→32 mm sudut rendah heroik | monolit KelasKu naik dari lantai dalam berkas cahaya emerald; aula berubah dari malam ke fajar | 03 | `fiezel-teacher-shell.js` sidebar |
| SH03 kode | 7,20–8,88 | 32 mm, panel di depan monolit | "Buat kelas" → Kelas 8B · Bahasa Inggris → kode **FZ-7K3QPA** tersusun huruf demi huruf → Salin Kode | 04 | `makeClassCode()` |
| SH03b kode terbang | 8,88–9,58 | potong; tinggi di samping monolit | chip kode melesat ke 32 slate | — | |
| SH04 Nadia gabung | 9,58–11,98 | **mata murid**, 36 mm, panel sangat dekat, bokeh | "Gabung KelasKu dengan kode guru" → ketik FZ-7K3QPA → **Gabung** → "Permintaan bergabung sudah dikirim ke gurumu" | 05 | `copy-id-student.js` social2.class-*, `classjoin` |
| SH05 persetujuan | 11,98–13,35 | **mata guru** | "Menunggu persetujuan": Nadia, Raka, Putri → **Tambahkan** ×3 | 06 | `acceptJoin()`, `kelas.menunggu-*` |
| SH05b tersambung | 13,35–14,38 | potong; lebar dari sudut belakang kelas | benang cahaya menyala baris demi baris ke 32 slate; bingkai slate berubah emas | (06) | |
| SH06 tugas | 14,38–16,78 | 30 mm, panel di depan monolit | "Buat tugas / ujian": Review Past Tense — penanda waktu · 10 soal · Jum 27 Sep → Mode **Ujian / Kuis Terjadwal** (timer 8 menit, soal diacak) → **Kirim ke semua murid** | 07 | `buildAssignment()`, `guru.mode-ujian-*` |
| SH07 kapsul | 16,78–19,18 | potong; crane dari atas monolit | panel terlipat jadi kapsul → pecah jadi 32 kapsul yang meluncur di benang; tiap slate menampilkan "Tugas baru" + lonceng | (07) | `sendAssignment()` notifikasi |
| SH08 kerjakan | 19,18–21,58 | **mata murid**, 38 mm | KelasKu murid: tab Kerjakan · Terlewat · Selesai · Arsip; kartu "Ujian mini · 2 hari lagi" → **Mulai** → panel berbalik → soal "Yesterday I ___ to the market…" → **went** ✓ "Benar! Mantap." + alasannya | 08 | `KELASKU-SIKLUS-TUGAS`, `kelas.siklus.*` |
| SH09 selesai | 21,58–22,28 | mata murid | Selesai **90%** · "Laporan terakhir terkirim ke guru" | 09 | `kelas.laporan-terkirim` |
| SH09b hasil pulang | 22,28–23,98 | mata guru dari monolit | 29 kapsul emerald pulang dari slate ke monolit; "Hasil per tugas" menghitung **0 → 29/32 selesai** | (09) | `pullReports()`, `ingest()` |
| SH10 Yoga ujian | 23,98–25,28 | 50 mm dekat, DOF | slate Yoga menampilkan timer 07:42 lalu **berpaling** (keluar layar) dan kembali | 10 | `fiezel-focus-guard.js` |
| SH10b keluar layar | 25,28–26,38 | mata guru | baris Yoga mendapat pil **"Keluar layar 1× · 14 dtk"** + "Tanyakan dulu ke muridnya." | (10) | `guru.proctor-catatan` |
| — | 26,25–26,40 | — | **hening musik** (napas sebelum drop) | | |
| SH11 amfiteater | 26,38–27,68 | makro nav "Ringkasan hari ini" → tarik mundur & naik | **DROP.** Dasbor membuka diri: 16 panel naik dari lantai menjadi amfiteater di sekeliling kelas | 11 | `views` teacher-shell |
| SH11b ringkasan | 27,68–28,78 | panel lepas dari dinding | "Ringkasan hari ini": Perlu dibantu **3** · Rata-rata akurasi **74%** · Siswa aktif 7 hari **29/32** · Tugas berjalan **2** (angka menghitung naik) | (11) | `classStats()` |
| SH12 disapa | 28,78–31,18 | mata guru, rack fokus ke kelas | "Siapa yang perlu disapa hari ini": **Raka** Berisiko · 8 hari tidak belajar; **Yoga** Pantau · akurasi 48%; **Fajar** Pantau · 1 tugas lewat tenggat — tiga slate itu naik & menyala amber/bata | (11) | `risk()`, `needsGreeting()` |
| SH13 kartu sapa | 31,18–33,15 | panel lepas | "Pesan personal 1 ketuk" menulis dirinya: "Hai Raka, ini Bu Sari…" → **Kirim via WhatsApp** | 12 | `greetingCard()` |
| SH13b Raka disapa | 33,15–33,58 | potong ke slate Raka | kapsul tiba; slate Raka berubah emerald "Disapa" | — | |
| SH14 peta panas | 33,58–35,98 | panel miring 3D, kamera menyamping | "Siswa × skill — sekali lihat, tahu siapa butuh apa": sel terisi bergelombang; kolom Past questions disorot | 13 | `heatmap()` |
| SH15 miskonsepsi | 35,98–38,38 | 60 mm makro | "Miskonsepsi utama kelas: Past questions — Penandaan ganda yang mubazir (did + verb 2)"; *Did you ~~went~~ → go*; Rencana: Mini lesson | 14 | `misconceptions()`, taksonomi `MIS` |
| SH16 kelompok | 38,38–40,78 | tinggi di atas kelas | 32 slate berpindah menjadi 8 kelompok; mentor tiap kelompok naik & ber-bingkai amber | 15 | `studyGroups()` serpentin |
| SH17 remedial | 40,78–43,18 | tinggi | slate terbelah: Perlu remedial (9) · Pengayaan ≥90% (7) → **Buat sesi remedial** → kelas paralel 8A · 8C · 8D menyala | 16 | `guru.remedial-*`, `target-kelas-paralel` |
| SH18 laporan ortu | 43,18–45,58 | panel kertas miring | "Rapor naratif otomatis" menulis dirinya (akurasi, kekuatan, perlu latihan, kehadiran) → **Kirim via WhatsApp** → kertas terbang | 17 | `parentReport()` |
| SH19 absensi & e-Rapor | 45,58–47,98 | di depan monolit | "Absensi hari ini" H/S/I/A → **Semua hadir** → "Rekap Nilai — Kelas 8B" (Tuntas/Remedial, KKM 75) → Ekspor rekap | 18 | `att-all`, `export-rekap` |
| SH20 kurikulum | 47,98–50,38 | panel lepas | "Kurikulum Merdeka, di dalam kelasmu": Fase D · Kelas 8 · Recount Text (1.1–1.3) · Apersepsi 5 Menit · Top Miskonsepsi · 24 soal → **+ Buat Tugas** → 10 kartu soal berkipas | 19 | `fiezel-teacher-curriculum.js` d_g8_recount |
| SH21 braincore | 50,38–52,78 | panel lepas | "Saran otomatis. Guru memutuskan. Murid belajar.": 1 Soal asli → 2 Analisis → 3 Saran → 4 Soal final → **Setujui** (chip VISUALISASI KONSEP) | 20 | `fiezel-braincore-review.js` |
| SH22 pengumuman | 52,78–53,95 | panel lepas | "Satu pesan, semua kanal": pengumuman diketik → **Kirim ke semua murid** → kapsul ke 32 slate | (21) | `announcements` |
| SH22b murid | 53,95–55,18 | **mata murid** | KelasKu Nadia: pengumuman Bu Sari · wali kelas; Peta skill (Vocabulary 95% / Past questions 46%); Paspor Kompetensi — stempel **TUNTAS** | 21 | class-hub paspor, `kelas.peta-skill` |
| SH23 waktu kembali | 55,18–57,58 | rendah ke kaki monolit, cahaya keemasan | "Waktu administrasi yang dihemat" berputar naik; "Refleksi 60 detik" ditulis | 22 | `saveMinutes()`, jurnal |
| SH24 terhubung | 57,58–60,35 | crane naik tinggi 26→22 mm | seluruh aula: amfiteater, monolit, 32 slate, benang menyala, kapsul bersirkulasi dua arah | 23 | |
| SH25 implosi | 60,35–62,05 | tinggi, dorong pelan | semua terisap ke satu titik cahaya → padam | — | |
| hening | 62,05–62,40 | — | layar splash gelap, **nol digital** | | |
| MEREK | 62,40–72,00 | — | **splash resmi** (partikel → F → dua batang emas → ekualiser → wordmark kecil) → mengecil jadi lockup → **KelasKu untuk Guru** → tombol **Buka Demo Guru →** · fiezel.my.id | 24 (66,6) | `features/brand/*` |

## 4. Naskah VO (24 baris)

Bahasa sehari-hari, sapaan "kamu", kalimat pendek. Suara default **Gacrux** (Gemini TTS).
`at` = detik baris mulai; baris dijaga tidak menabrak baris berikutnya.

| # | at | Teks | Gaya |
|---|---|---|---|
| 01 | 0,30 | Tiga puluh dua murid. Satu guru. | pelan, hangat, membuka cerita |
| 02 | 2,70 | Siapa yang diam-diam tertinggal? | bertanya lirih, ikut peduli |
| 03 | 5,00 | KelasKu punya jawabannya. | yakin, hangat |
| 04 | 7,40 | Buat kelas, bagikan satu kode. | jelas, ringan |
| 05 | 9,80 | Murid mengetik kode, lalu Gabung. | jelas, ringan |
| 06 | 12,20 | Kamu yang menyetujui siapa masuk. | tenang, meyakinkan |
| 07 | 14,60 | Kirim tugas atau ujian mini. Sekali ketuk, sampai ke semua murid. | bersemangat tapi tenang |
| 08 | 19,40 | Murid mengerjakannya di KelasKu. | ringan |
| 09 | 21,80 | Hasilnya pulang sendiri. | puas, tersenyum |
| 10 | 24,20 | Saat ujian, pindah layar pun tercatat. | tegas, tenang |
| 11 | 26,60 | Tiap pagi, KelasKu memberi tahu siapa yang perlu disapa. | hangat, penuh perhatian |
| 12 | 31,40 | Pesannya sudah tertulis. Tinggal kirim. | ringan, tersenyum |
| 13 | 33,80 | Sekali lihat, tahu siapa butuh apa. | yakin |
| 14 | 36,20 | Bukan cuma nilai, tapi letak salahnya. | tegas, jelas |
| 15 | 38,60 | Kelompok belajar tersusun sendiri. | ringan |
| 16 | 41,00 | Remedial dan pengayaan, otomatis. | ringkas, mantap |
| 17 | 43,40 | Laporan orang tua, jadi sendiri. | ringan, tersenyum |
| 18 | 45,80 | Absensi dan rekap e-Rapor, beres. | ringkas, lega |
| 19 | 48,20 | Kurikulum Merdeka, langsung jadi tugas. | yakin |
| 20 | 50,60 | Braincore menyarankan. Kamu yang memutuskan. | tenang, menghormati guru |
| 21 | 53,50 | Murid pun melihat langkah belajarnya. | hangat |
| 22 | 55,40 | Dan waktumu kembali untuk mengajar. | hangat, lega, sedikit lebih pelan |
| 23 | 57,80 | Satu kelas. Dua layar. Terhubung. | mantap, pelan, jeda di tiap titik |
| 24 | 66,60 | Buka Demo Guru di fiezel.my.id. | ramah, jelas, mengajak |

Sesudah baris 23 tidak ada VO sampai logo selesai; baris 24 adalah satu-satunya ajakan.

## 5. Fitur yang tercakup

**Dasbor guru (KelasKu untuk Guru)** — 22 fitur:
kode kelas & bagikan · persetujuan bergabung · buat tugas/ujian (mode latihan vs ujian, timer,
acak) · kirim langsung ke notifikasi murid · hasil per tugas otomatis · pendeteksi keluar layar
saat ujian · ringkasan hari ini (KPI) · deteksi dini "siapa yang perlu disapa" (Aman/Pantau/
Berisiko + alasan + saran tindakan) · kartu sapa 1 ketuk · peta panas siswa × skill ·
miskonsepsi utama + rencana · kelompok belajar otomatis bermentor · remedial & pengayaan KKM 75 ·
terapkan ke kelas paralel · laporan orang tua naratif via WhatsApp · absensi H/S/I/A "Semua hadir" ·
rekap e-Rapor · Kurikulum Merdeka (fase, bab, sub-bab, apersepsi 5 menit, top miskonsepsi, bank
soal, 1-klik jadi tugas) · Braincore review (saran → guru memutuskan) · pengumuman kelas ·
jurnal/refleksi 60 detik · waktu administrasi yang dihemat · navigasi dasbor (monolit).

**KelasKu murid** — 7 fitur:
gabung dengan kode guru · daftar tugas (Kerjakan/Terlewat/Selesai/Arsip) + lonceng notifikasi ·
mengerjakan ujian mini dengan timer + penjelasan jawaban · hasil & "laporan terkirim ke guru" ·
pengumuman wali kelas · peta skill (terkuat / perlu perhatian) · Paspor Kompetensi (Tuntas).

**Sengaja tidak ditampilkan:** Papan Kelas (memakai XP) dan runtun/streak — aturan film melarang
XP & streak di layar. Tutor suara FIEZEL — bukan bagian KelasKu.

## 6. Aturan visual

- **Palet dunia:** malam #120C0F, siang krem #EFE6D7, senja #E9D4B6, benang emerald #1FA07A → emas #F2B227.
- **Palet panel = token asli aplikasi.** Guru: tinta #12211F, kertas #FBF9F4, garis #E2DCCE, sage #1F7A63,
  amber #D98E1F/#FBEBCF, bata #B93F2A/#F7DDD6. Murid: panel #FFFFFF, soft #F6F1EA, aksen marun #9B3A4A,
  good #1F6B4E.
- **Merek:** splash field radial #2A2126→#1B1418→#120C0F, emas #F0C241/#FFD94F, krem #FFF4DA.
  Lockup gelap: "KelasKu" krem 800 −0,02em, "untuk Guru" emas 600 0,68em (varian footer website).
  Tombol "Buka Demo Guru →" emerald #1F7A63, teks krem.
- **Huruf:** Plus Jakarta Sans 400–800 saja.
- **Gerak:** pegas teredam (masuk), percepatan cubic-in (keluar), easing aplikasi `fz-out` & `fz-spring`,
  tekan tombol = turun 5 % lalu memantul. Tanpa fade/slide ala PowerPoint.
- **Lensa:** 22–60 mm, DOF lensa tipis dengan autofokus ke panel yang tampil, motion blur rana 180°.
- **Grade:** tone map netral (PBR Neutral) supaya warna UI tetap jujur, bloom hanya untuk benang/kapsul,
  vinyet 0,17, grain berbobot luminans.
- **Area aman:** teks panel di Y 240–1640; lockup di Y 560–1600.

## 7. Klaim jujur

- Angka di panel adalah **data contoh** (sama seperti mode Demo Guru) — panel dasbor bertanda "Data contoh".
- "Waktu administrasi yang dihemat" berlabel **perkiraan**, seperti di aplikasi.
- Braincore bertanda **VISUALISASI KONSEP**; guru tetap yang memutuskan (kontrak class-hub).
- Tidak ada: GRATIS, harga, pasang/instal/unduh, offline, jaminan hasil, sertifikasi/CEFR, nama aplikasi lain.
- Pendeteksi keluar layar ditampilkan persis seperti aplikasi: mencatat, lalu "Tanyakan dulu ke muridnya".

## 8. Musik & bunyi (ringkas — detail di CUE-SHEET)

Skor orisinal **"Terhubung"**, 100 BPM: kait D minor (piano Salamander yang bertanya, detak
jantung) → dentum saat monolit bangkit (B♭add9) → denyut "tersambung" (pluck, setengah tempo) →
**hening 0,15 dtk** → DROP megah di 26,4 (Dm–B♭–F–C, taiko, brass, bel motif) → napas di 55,2
(B♭maj7) → puncak F mayor di 57,6 (brass, koor, bel) → implosi C7sus4 terisap → **nol digital**
62,05–62,40 → sonic logo resmi F add9 → ekor Fmaj9 di bawah ajakan.
Setiap klik, ketikan, kapsul yang tiba, dan stempel adalah SFX sintesis yang dikunci ke frame-nya,
bernada pentatonik F supaya antarmuka ikut bermain di dalam musik.
