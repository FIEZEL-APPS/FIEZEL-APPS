# Audit UI/UX FIEZEL — temuan & perbaikan (2026-08-30)

Dijalankan atas keluhan owner: *"ui dan ux fiezel sangat berantakan, dan susah di mengerti"*.
Metode dan ambangnya ada di `AUDIT-PROMPT.md` di folder yang sama.

## 0. Ringkasan satu paragraf

Aplikasinya **tidak** berantakan secara tata letak — nol scroll horizontal di 320/390/768/1280px,
dan nol kontrol yang tertimbun. Yang rusak adalah hal-hal yang hanya muncul **setelah kaskade
CSS dihitung dan DOM disusun**, dan itu persis kelas cacat yang 201 berkas `*-test.js` di repo
ini secara struktural tidak bisa lihat, karena semuanya regex atas teks sumber dan tidak satu
pun pernah membuka halaman. Empat cacat nyata ditemukan dan diperbaiki; satu gerbang render
baru dipasang supaya kelasnya tidak bisa kembali diam-diam.

## 1. Cara mengukur

Harness Playwright + Chromium menjalankan aplikasi sungguhan, lalu:

- 56 kombinasi **layar × viewport** (14 layar × 320/390/768/1280px) untuk luberan, sasaran
  sentuh, tumpang tindih, keterjangkauan, dan pemotongan teks.
- 64 kombinasi **tema × fase langit × layar** untuk kontras, diukur dari **piksel screenshot
  sungguhan** (warna dominan di kotak elemen), bukan dari token CSS — satu-satunya cara jujur
  membaca gradien, alfa bertumpuk, dan lapisan langit.
- Penelusuran Tab sungguhan untuk pengurungan fokus dialog.
- `elementFromPoint` untuk keterjangkauan dan untuk area sentuh **efektif**.

## 2. Temuan yang diperbaiki

### P0-1 — `[object Object]` tercetak di layar Classroom
`fiezel-tutor-v3.js` `renderCategory()` me-**concat** `session.snapshot()` ke dalam string HTML
(`... + session.snapshot()`) alih-alih meneruskannya sebagai argumen kedua `shell(inner, snap)`,
seperti yang dilakukan `renderTopics()` dengan benar. Objeknya dikoersi jadi `"[object Object]"`
dan tampil di keempat viewport. Sintaksnya sah, jadi `node --check` dan seluruh gerbang regex diam.

**Perbaikan:** `+` → `,`. Sekaligus mengembalikan `snap` ke `shell()` yang selama ini menerima
`undefined`.

### P0-2 — Dialog `aria-modal` tidak mengurung fokus sama sekali
Dengan gerbang notifikasi terbuka, **22 dari 26 perhentian Tab mendarat di luar dialog** — di
topbar, kartu Home, dan bottom-nav yang tertutup scrim 0.82 dan tidak bisa diklik. Pengguna
keyboard harus menekan Tab 17 kali melewati kontrol tak terlihat sebelum sampai ke tombol
dialognya sendiri.

Menariknya, `openModal()` sudah melakukannya **dengan benar** sejak q17-S1 (inert + aria-hidden
+ trap + kembalikan fokus, terukur 0 kebocoran). Dua dialog yang **pertama dilihat murid baru**
— gerbang notifikasi dan gerbang akun — hanya menukar kelas `.hidden`.

**Perbaikan:** satu daftar lapisan dialog (`DIALOG_LAYER_IDS`) + `syncDialogContainment()` yang
dipakai bersama; trap Tab diperluas dari "hanya `#modal`" menjadi "lapisan teratas mana pun".
Terukur sesudahnya: **0 kebocoran dari 18 Tab**.

### P0-3 — Judul setiap layar tidak terbaca setiap senja dan malam
`features/tutor-classroom/tutor-v3.css` — stylesheet **fitur Classroom** — menjangkau keluar dan
memaku `.section-head h1` global ke `#f8faff` (hampir putih) saat `scene-dusk`/`scene-night`.
Hex itu mengandaikan langit senja/malam gelap. Ia tidak: `style.css:149-150` memasang senja
`#FFD3B4` (persik terang) dan malam `#EFE0C4` (krem terang), lalu `.global-sky` meredamnya lagi
ke opacity .58 di atas `--ui-bg:#FFF9EE`. Tanahnya **terang di keempat fase**.

Hasil terukur: **1,18:1** (ambang 3:1). "Vocabulary Hub", "Ruang Reading", "Peta Belajar & Lab",
"Skills Lab", dan "Perpustakaan" praktis hilang tiap sore.

Ini persis kelas bug yang blok `m025-113` **di file yang sama** sudah perbaiki untuk
`.launch-card` ("kartunya putih dan tintanya juga hampir putih"); perbaikan itu tidak pernah
sampai ke judulnya. Dan `contrast-test.js:353` **sudah punya kasus** untuk pemilih ini — tetapi
ia memodelkan warnanya sebagai `var(--ambient-text)` alih-alih menghitung kaskade, jadi override
di file lain lolos begitu saja.

**Perbaikan:** override dicabut (bukan diganti hex lain); `.section-head h1` kembali ke
`var(--ambient-text)`. Diverifikasi ulang di **40 kombinasi** fase × tema × layar: 0 gagal,
rasio terburuk **13,66:1**.

### P0-4 — Kartu ritual harian terbit di belakang gerbang, dan menghanguskan jatah harinya
`maybeShowDailyRitual()` hanya memeriksa `state.view` dan keberadaan `#fzRitual`; ia tidak pernah
bertanya apakah sudah ada dialog di layar. Akibatnya `#fzRitual` (z95, scrim .28) terbit di bawah
gerbang notifikasi (z100, scrim .82) — dua scrim bertumpuk — lalu memanggil `focus()` pada tombol
primernya sendiri, **mencuri fokus ke kartu yang tertutup**. Lebih buruk: `state.ritualMeta`
ditandai **sebelum** kartunya tampil, jadi rencana hari itu hangus tanpa pernah terlihat murid.

**Perbaikan (dua sisi, dan sisi kedua nyaris terlewat):** `maybeShowDailyRitual()` keluar lebih
awal kalau ada lapisan dialog terbuka, dan keluar **sebelum** `ritualMeta` ditandai supaya jatah
harian tidak hangus.

Versi pertama perbaikan ini hanya punya sisi itu, dan **itu membuat keadaan lebih buruk daripada
cacat aslinya.** Diukur berdampingan dengan `main` pada kondisi identik:

| | ritual menumpuk di balik gerbang | ritual sampai ke murid |
|---|---|---|
| `main` | ya (cacat) | ya, 0 ms setelah gerbang ditutup |
| perbaikan versi pertama | tidak | **tidak pernah** |
| perbaikan final | tidak | ya, 1000 ms setelah gerbang ditutup |

Menahan tanpa menawarkan ulang bukan perbaikan — ia menghilangkan rencana hari itu diam-diam.
Karena itu `releaseGateFocus()` (dipanggil kedua gerbang saat menutup) kini mencoba ulang
ritualnya. `maybeShowDailyRitual()` menjaga syaratnya sendiri, jadi pemanggilan itu idempoten.

Yang membuat cacat versi-pertama ini lolos: gerbang T5 saat itu hanya meng-assert "tidak
menumpuk" — dan cabang yang tidak pernah menampilkan apa pun **lolos assert itu**. T5b kini
menjaga HASIL bagi murid (rencananya benar-benar sampai), bukan sekadar ketiadaan penumpukan.

### P1-1 — Setengah Peta Belajar tidak pernah ditemukan di ponsel kecil
`.progress-tabs` `overflow-x:auto` sejak m025-85, tetapi tidak pernah **mengatakan** bahwa ia
bisa digeser. Terukur di 320px: lebar isi 482px dalam kotak 294px — hanya **2 dari 4 tab** yang
terlihat, **188px tersembunyi tanpa satu pun petunjuk**. "Adaptive Engine" dan "Kesiapan &
Skills" praktis tidak ada bagi murid di layar kecil.

**Perbaikan:** bayangan-gulir CSS murni (`background-attachment: local` vs `scroll`) — bayangan
hanya muncul kalau memang ada yang tersembunyi di sisi itu, hilang sendiri di tepi, tanpa JS dan
tanpa memakan ruang saat keempat tab muat.

### P1-2 — Sasaran sentuh 41px pada tautan yang berulang 17× per layar
`.lesson-skip-link` tinggi tampak 24px. Audit sebelumnya (04-003) sudah memasang perluasan
hit-area `::before` −10px dan komentarnya mengklaim hasilnya 44px. Diukur lewat
`elementFromPoint`: **41px** — kotaknya 23,x px, bukan 24 bulat. Tiga piksel di bawah lantai.

**Perbaikan:** −10px → −12px per sisi. Terukur sesudahnya **45px**, tanpa tabrakan dengan
kontrol tetangga.

## 3. Temuan yang sengaja TIDAK diperbaiki (dilaporkan saja)

### U4 — Layar Classroom berbahasa Inggris di aplikasi berbahasa Indonesia
12 string tampil unik masih Inggris: "Choose a subject, learn in short human teaching beats,
interrupt anytime.", "Open micro-lesson", "Reset evidence", "LESSON COMPLETE", "Back to the exact
lesson checkpoint", dst. — sementara satu paragraf di layar yang **sama** sudah Indonesia
("Kurikulum A1 lengkap dulu, lalu naik ke jalur TOEFL / IELTS"). Jadi ini inkonsistensi, bukan
pilihan desain.

Ini nyata dan menyumbang langsung ke "susah dimengerti". Tetapi memperbaikinya berarti menambah
kunci i18n baru dan menyentuh kontrak `id-golden-snapshot-test.js` serta `th-coverage-test.js`
(cabang Thai wajib ikut) — pekerjaan konten yang lebih besar dari perbaikan bug, dan yang
sebaiknya diputuskan owner, bukan dikerjakan sepihak di tengah audit tampilan.

### P2 — "Lanjut" onboarding di bawah lipatan pada layar 568px
Di 320×568 isi langkah nama setinggi 799px; tombol "Lanjut" ada di y=666, jadi murid harus
menggulir untuk menemukannya. Panelnya `overflow-y:auto` sehingga tetap terjangkau, dan tombolnya
`disabled` selama nama kosong (jadi bukan kegagalan diam). Dicatat sebagai poles, bukan cacat.

## 4. Yang TIDAK rusak (diverifikasi, bukan diasumsikan)

- **Nol scroll horizontal** di keempat viewport pada semua layar.
- **Nol kontrol tertimbun** setelah gerbang ditutup.
- **Overlay onboarding menutup penuh** — nav dan topbar di belakangnya tidak bisa ditekan.
- Splash bubar di **~3,4 detik** (jaringan luar diblokir) dan punya jaring pengaman 15 detik.
- `openModal()` sudah mengurung fokus dengan benar (0 kebocoran) — hanya kedua gerbang yang belum.

## 5. Gerbang baru

`ui-render-audit-test.js`, terdaftar di `quality.yml` tepat setelah `contrast-test.js`.
Ia menjalankan aplikasi di Chromium dan menjaga sembilan invarian (T1 nilai mentah, T2a/T2b
pengurungan fokus, T3 kontras judul lintas fase langit, T4 area sentuh efektif, T5/T5a/T5b
penumpukan dialog **dan** hasil ritualnya, T6 scroll horizontal).

**Dua pemeriksaan sengaja dibuat memaksa keadaannya sendiri** (T2 dan T5 membuka gerbangnya
lewat `setNotificationGateState('default')` alih-alih menunggu heuristik "undangan layak
tampil"). Sebabnya konkret: versi pertama T5 memakai localStorage kosong, sehingga yang muncul
adalah perkenalan, gerbangnya tidak pernah tercapai, dan cabang T5b **dilewati diam-diam**
sambil tetap mencetak hijau. Pemeriksaan yang bisa melewati dirinya sendiri adalah pemeriksaan
yang tidak ada.

**Dibuktikan bergigi, empat kali.** Dengan ketiga cacat asli dikembalikan sementara, gerbang ini
MERAH tepat pada ketiganya (`classroom: [object Object]`; `15/18 perhentian` bocor;
`1.18:1 < 3`). Dan ketika tawaran ulang ritual dimatikan, T5b MERAH sendirian dengan pesan yang
menyebut akibatnya bagi murid. Semuanya HIJAU kembali setelah perbaikan dipulihkan.

Ia **SKIP dan keluar 0** kalau Playwright/Chromium tidak ada, jadi CI publik tidak berubah
perilakunya; ia merah hanya kalau browsernya ada DAN invariannya benar-benar patah.
