# AUDIT VISUAL FIEZEL (live app, tanpa perubahan kode)

Sumber: `/home/user/workspace/fiezel-apps` (SPA: index.html 344 baris, style.css 2741 baris, app.js 4213 baris, features/ 20 subdir).
Metode: server lokal `python3 -m http.server 8930`, Playwright, viewport **390×844 (mobile)** dan **1280×800 (desktop)**, navigasi klik nyata. Semua screenshot di `redesign/audit/shots/` (±60 file), computed styles di `metrics.json`, snapshot localStorage di `ls_home.json`.

Catatan rute yang sulit dicapai:
- **Guided tour** muncul setelah onboarding dan memblokir semua klik → harus di-dismiss via `[data-tour-next]` berulang (`m09t_tour_step1/2.png`).
- **Auth gate Puter** (`#authGate` "Masuk ke FIEZEL") muncul ±9 detik setelah load saat SDK `js.puter.com` selesai dimuat; untuk audit offline SDK diblokir via route-abort, gate tetap terdokumentasi di `m27_auth_gate.png`.
- **Feedback grammar**: klik `.option` → confidence pop muncul; tombol "Lanjut" melewati feedback, jadi untuk memotret `#feedback` harus klik `.confidence-skip` ("Baca penjelasan dulu").
- **Notification gate** (`#welcome`) hanya muncul bila izin notifikasi undecided; tidak ter-trigger di run final (rutenya: selesai onboarding → gate sebelum home).

---

## 1. Inventaris Layar & Komponen

### Layar (mobile 390×844, prefix `m`/`f`; desktop prefix `d`)

| # | Layar | Screenshot | Cara dicapai |
|---|-------|------------|--------------|
| 1 | Splash (logo F emas di atas coklat gelap, tag "ADAPTIVE ENGLISH") | m01_splash | localStorage kosong, tunggu ±3,5 dtk |
| 2 | Onboarding: nama | m02_ob_name | setelah splash |
| 3 | Onboarding: carousel intro | m03_ob_carousel | klik lanjut berulang |
| 4 | Onboarding: tujuan + CEFR chips | m04_ob_goal | `[data-ob-goal]` |
| 5 | Onboarding: tawaran placement test | m05_ob_placement | lanjut |
| 6 | Onboarding: langkah lanjutan + ringkasan (Nama/Tujuan/Perkiraan level/Pengingat/Streak) | m06, m07_ob_summary | lanjut → "Mulai Belajar" |
| 7 | Guided tour overlay | m09t_tour_step1/2 | otomatis setelah onboarding |
| 8 | Home/dashboard | m10_home_top(_full), d01 | default |
| 9 | Settings modal ("FIEZEL CONTROL ROOM / Pengalaman Rara") | m11_settings_modal(_full), d10 | icon-button topbar |
| 10 | Level panel (A1–C2) | m12_level_panel | openLevelPanel() |
| 11 | Vocabulary hub + quiz + flashcards | m13, f08, f08b, f09, f09b, d08 | nav Vocab |
| 12 | Grammar hub (17 lesson, jalur A2) | m14, d02 | nav Grammar |
| 13 | Grammar: lesson intro | f01, d03 | "Buka lesson →" |
| 14 | Grammar: soal quiz (1/25) | f02, d04 | mulai latihan |
| 15 | Grammar: confidence pop | f03 | jawab soal |
| 16 | Grammar: feedback salah / benar | f04(_full), f05(_full), d05 | "Baca penjelasan dulu" |
| 17 | Grammar: jeda mengajar (AJAR ULANG) | f06, f06b | otomatis setelah beberapa salah |
| 18 | Grammar: completion ("SESSION COMPLETE", 24%) | f07(_full) | selesaikan 25 soal |
| 19 | Reading session | m15, f15 | nav Reading |
| 20 | Progress/analytics ("Peta Belajar & Lab") | m16(_full), d06 | nav Peta |
| 21 | Perpustakaan (9 buku audiobook) | m17, d07 | launch card |
| 22 | Classroom | m18 | launch card |
| 23 | Skills hub | m19, d09 | via home |
| 24 | Listening: dictation + MC + feedback | f10(_full), f11, f11b/c | skills → listening |
| 25 | Speaking | m22, f14 | skills |
| 26 | Writing | m23 | skills |
| 27 | Placement test start + soal | f12, f13, m24 | "Cari tahu level kamu" |
| 28 | Ask FIEZEL | m24_ask_view | "Tanya FIEZEL?" |
| 29 | Search | m25 | topbar |
| 30 | Focus state (tab ke-3) | m26_focus_state_tab3 | keyboard Tab |
| 31 | Auth gate Puter | m27_auth_gate | otomatis saat SDK termuat |

### Komponen

- **Topbar glass**: wordmark FIEZEL (F+garis merah), tombol "Tanya FIEZEL?" (label 7px!), icon-button settings 39px.
- **Tombol**: primer kuning `#FFD23F` teks ink 17px/700, radius 18px, tinggi 52px ("Mulai hari ini", "Lanjut", "Kembali ke Home"); sekunder putih border krem ("Keluar"); teks-link merah ("Lihat detail" pill).
- **Kartu**: launch-card grid 2 kolom (ikon tile pastel + judul + meta), lesson card grammar 364×246 seluruh kartu klik-able, kartu buku library (emoji + judul + meta + sinopsis), stat card progress.
- **Chips**: CEFR (A1–C2), filter progress (Ringkasan/Analisis/Adaptive Engine/… — overflow horizontal tanpa indikator), "Jalur A2".
- **Progress**: bar tipis biru-abu di Peta Belajar, counter "1/25" quiz, ring "0/5 HARI INI".
- **Bottom nav** 5 tab (Home/Vocab/Grammar/Reading/Peta), tab aktif tile kuning + dot; label 9,4px.
- **Answer choice**: pill putih full-width 326×53, teks 16px/650; state benar = mint `#E9F7F0` + `.correct`, salah = coral-soft, disabled = teks abu pudar.
- **Banner feedback**: kartu `#feedback` success (border hijau, ikon ✓ "Benar, mantap!") / error (ikon ✕ merah "Belum tepat, tidak apa-apa"), paragraf explain, `.memory-tip`, tombol `.ai-btn` "Jelaskan dengan cara yang lebih sederhana".
- **Confidence pop** (bottom sheet): 3 tombol 1-2-3 (coral-soft/kuning-soft/kuning) + "Baca penjelasan dulu".
- **Hint/teach panel**: kartu "JEDA MENGAJAR / AJAR ULANG" dengan blockquote merah, tip lampu, CTA kuning "Oke, aku siap coba lagi".
- **Tutor turn bubbles**: kartu FIEZEL (avatar merah) berisi coaching text + instruksi merah; turn lama di-dim.
- **Audio player (listening)**: tombol "Dengarkan" coral pastel teks putih, input dictation, "Nilai jawaban" disabled pink pucat.
- **Maskot PAW kuning**: fixed kanan-bawah di atas bottom nav + speech bubble putih; tampil di hampir semua layar.
- **Toast**: pill navy gelap ("Core Brain aktif…", "Progres tersimpan…") melayang di atas konten.
- **Empty/loading state**: stat 0% / "0 jawaban" / "Belum diukur · mulai di sini"; splash sebagai loading awal.
- **Modal**: settings, level panel, auth gate — punya role/aria-label (positif).

---

## 2. Design Token Aktual

### Palet (dari `:root` style.css, dikonfirmasi sampling piksel)

| Token | Hex | Peran |
|---|---|---|
| --cream / --cream-deep | #FFF8ED / #FFF0DC | background utama |
| --ink / --text | #2B2118 | teks utama |
| --yellow / --yellow-deep / --yellow-soft | #FFD23F / #E0B22A / #FFF1C9 | brand, CTA, tile |
| --coral / --coral-deep / --coral-soft | #EE5D4A / #C9432F / #FDE3DE | aksen field |
| --mint / --lilac / --gold | #A8DCC4 / #C9BCE4 / #C9A24B | tile pastel, aksen |
| --muted / --muted-soft | #6F5F48 / #8B7A60 | teks sekunder/tersier |
| --accent / --accent-strong | #C2402C / #A33422 | teks aksi merah |
| --green / --red | #2E8B69 / #C9503A | benar/salah |
| Glass | rgba(255,253,248,.58–.98) + blur(28px) | topbar, nav |
| Toast | navy gelap ±#1A2238 | notifikasi |

Catatan brand: task menyebut kuning **#FFC700**, CSS aktual memakai **#FFD23F** — keluarga sama tapi bukan nilai yang sama; perlu diputuskan satu kanon. Komentar CSS sendiri sudah benar menyatakan kuning/coral adalah *field color*, bukan warna teks.

### Tipografi

- Body/heading: **FZ Plus Jakarta Sans** (woff2 lokal, weight 400/500/600/700); display: **FZ Instrument Serif** 400 (judul "Peta Belajar & Lab", "Pilih fokus hari ini", "Pengalaman Rara"). Fallback -apple-system/SF Pro/Inter.
- Skala terukur (metrics.json): display 26,4px/700 (judul view), 21,6px/700 (pertanyaan quiz), 19,2px (section header serif), 17px/700 (tombol primer), 16px/650 (opsi jawaban), 14–15px body, lalu **anjlok ke micro-caps: 10,56px (eyebrow quiz), 9,92px (level-context), 9,6px (eyebrow hero), 9,44px (label nav), 7px (label "Tanya FIEZEL?")**.
- Font-weight dipakai 400/500/600/650/700/750/800 — 650/750/800 di luar file font yang tersedia (browser melakukan faux-bold/interpolasi).

### Spacing, radius, shadow

- Radius: 26 / 18 / 13px sebagai token, tapi nilai terukur juga 15/16/17/20/22px → **8 varian radius**, inkonsisten.
- Shadow: 3 tingkat rgba(43,33,24,.06/.09/.15) — lembut, konsisten, bagus.
- Spacing: padding kartu 18–24px umumnya konsisten; gap grid 2 kolom rapat tapi wajar; ruang kosong besar di bawah kartu quiz (f02) sementara area feedback memanjang melebihi viewport (f04/f05 butuh scroll panjang).

---

## 3. Temuan Masalah

### 3a. Kontras WCAG (rasio dihitung dari nilai aktual)

| Pasangan | Rasio | Status AA (4.5:1 normal, 3:1 besar) |
|---|---|---|
| Ink #2B2118 di cream | **14,93:1** | LULUS |
| Ink di tombol kuning #FFD23F | **10,91:1** | LULUS |
| Muted #6F5F48 di cream | **5,84:1** | LULUS |
| Accent #C2402C di cream / accent-strong | **4,90:1 / 6,48:1** | LULUS |
| Ink di coral-soft / mint-soft | **12,91:1 / 14,27:1** | LULUS |
| Muted #6F5F48 di kuning #FFD23F (eyebrow hero 9,6px) | **4,27:1** | GAGAL (teks kecil) |
| Muted-soft #8B7A60 di cream (meta text) | **3,94:1** | GAGAL teks normal |
| Quiz "Lanjut" disabled: #8B7A60 di #F0E8DC | **3,42:1** | rendah (state disabled, borderline) |
| Green #2E8B69 di cream ("24%" — teks 60px, large) | **3,97:1** | lolos large-text saja |
| Red #C9503A di cream | **4,24:1** | GAGAL teks normal |
| **Putih di tombol "Dengarkan" listening (terukur rgb 229,174,165)** | **1,92:1** | **GAGAL BERAT** |
| **Putih di "Nilai jawaban" disabled (238,208,203)** | **1,45:1** | **GAGAL BERAT** |
| Teks opsi disabled ±(176,166,150) di cream (f05, f11b) | **2,28:1** | GAGAL |
| Gold #C9A24B di cream (tag splash) | 2,27:1 | GAGAL |
| Kuning #FFD23F vs cream (field vs bg) | 1,37:1 | non-teks; butuh border, sudah ada sebagian |

Toast navy: teks toast tampak gelap di atas pill navy pada `f07_grammar_completion.png` ("Progres tersimpan…" nyaris tak terbaca) dan `d01_home_top.png` ("Core Brain aktif… remote push belum tersambung") — kemungkinan warna teks ink dipakai di atas bg gelap. **Bug kontras paling parah di app.**

### 3b. Hierarchy & kepadatan

- Home hero menumpuk banyak level: eyebrow micro-caps, chips, badge A2, ring 0/5, coaching line, kartu "KATA FIEZEL" + 2 CTA — di m10 hero memakan >1 layar sebelum grid fokus terlihat.
- Kartu feedback grammar (f04_full/f05_full) sangat panjang: tutor turns lama + feedback + tip + tombol AI + confidence pop; pengguna harus scroll jauh untuk menemukan CTA lanjut.
- Ruang kosong besar (±350px) di bawah kartu soal quiz (f02) — keseimbangan layout kurang.
- Chips progress overflow horizontal tanpa affordance scroll (m16: chip ke-4 terpotong "K…").

### 3c. Usability mobile & maskot

- **Maskot + speech bubble menutupi konten interaktif**: menutup teks feedback benar (f05), teks kartu buku (m17), "0 materi" (m16), kartu Speaking di desktop (d01), tombol "Nilai jawaban" listening (f10), lesson 2 grammar hub. Tidak ada tombol dismiss yang terlihat.
- Toast navy juga overlap kartu (d01, m10_full).
- Judul soal vocab menampilkan key internal: "VOCABULARY **PARTOFSPEECH** · 2" (f08b) — bocor istilah teknis.
- Splash gelap → app pastel terang: lompatan mood besar (m01 vs m10).
- Ikon tile kosong di settings ("Ulangi kenalan cepat", "Status bunyi") dan lingkaran maskot kosong di onboarding nama (m02) — aset tidak termuat.

### 3d. Aksesibilitas

Positif: 11 aturan `:focus-visible`, outline fokus nyata terlihat saat Tab (rgba(184,69,47,.32) solid 3px offset 2px, m26); dialog punya role/aria-label; mayoritas target ≥44px; tombol primer 52px.
Masalah:
- Touch target <44px: `coach-strip-more` 101×22px, icon-button topbar lebar 39px, tombol "Diagnostics" tersembunyi 1×44px (metrics.json).
- Label nav 9,44px & "Tanya FIEZEL?" 7px — di bawah ambang keterbacaan.
- State disabled opsi jawaban terlalu pudar (2,28:1) padahal pengguna masih perlu membacanya saat review jawaban (f05, f11b).

### 3e. Konsistensi komponen

- 8 varian radius (13–26px) dan 6+ font-weight; token ada tapi tidak dipatuhi merata.
- Dua bahasa visual tombol merah: "Lanjut" listening = blok merah solid teks putih (f11b) vs quiz = pill kuning; tombol coral pastel listening tidak ada padanannya di modul lain.
- Copy feedback tidak konsisten: "Belum tepat, tidak apa-apa." (f04) vs "Belum tepat, nggak apa-apa." (f03).
- Eyebrow caps dipakai dengan warna berbeda-beda (merah accent, muted, gold).

---

## 4. Rekomendasi PRESERVE / REFINE / REPLACE

Identitas inti dipertahankan: **AI + Education + Human**, maskot PAW kuning, keluarga kuning brand. **Tidak ada fungsi yang dihapus** — semua rekomendasi bersifat visual/interaksi.

| Area | Verdict | Rekomendasi |
|---|---|---|
| Palet pastel cream/ink/kuning | **PRESERVE** | Kontras inti sudah kuat (ink 14,9:1; CTA kuning 10,9:1). Kanonisasi kuning brand (#FFD23F vs #FFC700) dalam satu token. |
| Tombol primer kuning + shadow lembut | **PRESERVE** | Sudah 52px, kontras lulus. |
| Sistem feedback grammar (benar/salah/explain/memory-tip/AI button/teach pause) | **PRESERVE** (fungsi) + **REFINE** (layout) | Pedagogi terbaik di app. Ringkas tinggi kartu: collapse tutor-turn lama jadi accordion, CTA "Lanjut" sticky. |
| Maskot PAW + speech bubble | **PRESERVE** (identitas) + **REFINE** (perilaku) | Jangan pernah overlap elemen interaktif: beri safe-area/auto-hide saat bubble tampil di atas konten, tambah dismiss. |
| Fokus keyboard, aria, target 44px mayoritas | **PRESERVE** | Sudah di atas rata-rata. |
| Tipografi Jakarta Sans + Instrument Serif | **PRESERVE** (pairing) + **REFINE** (skala) | Naikkan micro-caps: nav ≥11px, eyebrow ≥11px, "Tanya FIEZEL?" ≥11px; batasi weight ke 400/600/700 yang benar-benar ada filenya. |
| Teks sekunder muted-soft #8B7A60 | **REFINE** | Gelapkan ke ≥#6F5F48 (5,8:1) untuk teks normal; muted-soft hanya untuk teks besar/dekoratif. |
| Merah #C9503A & hijau #2E8B69 sebagai teks kecil | **REFINE** | Pakai varian gelap (mis. accent-strong #A33422 6,5:1; hijau ±#1F6B4E) saat jadi teks <18px. |
| Tombol listening coral pastel (Dengarkan/Nilai jawaban) | **REPLACE** (style, bukan fungsi) | 1,9:1 dan 1,45:1 gagal berat. Ganti ke coral-deep #C9432F teks putih (≥4,5:1) atau pill kuning standar; samakan dengan sistem tombol quiz. |
| Toast navy dengan teks gelap | **REPLACE** (style) | Teks putih/cream di atas navy, atau toast cream border ink; sekarang tidak terbaca (f07, d01). |
| State disabled opsi jawaban | **REFINE** | Saat review, pertahankan teks ≥4,5:1 (cukup hilangkan pointer + beri check/cross), jangan diturunkan jadi 2,3:1. |
| Radius & weight zoo (8 radius, 6+ weight) | **REFINE** | Kunci ke token 26/18/13px; audit kelas yang hardcode 15/16/17/20/22px. |
| Label internal "PARTOFSPEECH" | **REFINE** | Map key internal → label manusiawi ("Jenis kata"). |
| Ikon kosong (settings, onboarding mascot circle) | **REFINE** | Muat aset yang hilang; fallback emoji/inisial. |
| Splash gelap vs app pastel | **REFINE** | Pertahankan momen brand, tapi jembatani (mis. splash cream dengan logo gelap, atau transisi warna) agar identitas konsisten. |
| Chips overflow progress | **REFINE** | Tambah fade/scroll indicator; chips tetap. |
| Touch target kecil (coach-strip-more 22px, icon-button 39px) | **REFINE** | Perbesar hit-area ke ≥44×44 via padding, visual boleh tetap. |
| Struktur home (hero → fokus grid → nav) | **PRESERVE** (IA) + **REFINE** (densitas hero) | Grid 2×3 launch card jelas dan disukai; padatkan hero agar grid terlihat tanpa scroll. |
| Guided tour, level panel, settings "Control Room" | **PRESERVE** | Berfungsi baik; hanya perbaiki ikon kosong & kontras checkbox merah (sudah oke, 4,9:1). |

### Ringkasan eksekutif

Fondasi desain (pastel cream + ink, CTA kuning, feedback pedagogis, maskot) **sehat dan layak dipertahankan**. Tiga perbaikan berdampak terbesar: (1) kontras tombol listening & toast navy (gagal berat 1,4–1,9:1), (2) maskot/toast yang menutupi konten interaktif, (3) normalisasi skala micro-typography (7–10px) dan token radius/weight. Tidak ada fungsi yang perlu dihapus.
