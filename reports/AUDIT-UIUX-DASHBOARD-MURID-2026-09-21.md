# Audit UI/UX Dasbor Murid (Home "Hari ini") — 21 September 2026

Lingkup yang diminta OWNER: **audit** UI dan UX dasbor murid pada PWA FIEZEL. Dokumen ini
membaca dan mengukur; ia **tidak mengubah satu baris pun** kode produksi.

Permukaan yang diaudit adalah view `home` dengan bendera `todayHome: true`
(`fiezel-ux-flags.js:117`) — yaitu `todayHomeMarkup()` di `app.js:7939`, bukan
`homeClassic` di cabang `else`-nya. Itu satu-satunya layar yang benar-benar dilihat murid
hari ini.

**Cara pengukuran.** Aplikasi benar-benar dijalankan di Chromium (Playwright, server statis
lokal, jaringan luar diblokir), di 320/390/768/1280 px, pada tiga keadaan murid: **baru**
(belum placement), **aktif** (placement selesai, runtun 7 hari), dan **tuntas** (16 soal
hari ini, runtun 21 hari). Angka di bawah dibaca dari DOM hidup — `getBoundingClientRect`,
`getComputedStyle`, rasio kontras WCAG dihitung dari warna terkomputasi — bukan dari
pembacaan kode saja. Bukti tangkapan layar ada di `reports/uiux-dashboard-murid-2026-09-21/`.

**Status gerbang saat audit:** `a11y-test`, `ui-structure-test`, `contrast-test`,
`ux-redesign-test`, `ux-flags-test`, `r2-ux-overhaul-smoke-test`, `th-coverage-test` —
**semuanya HIJAU**. Artinya setiap temuan di bawah berada di luar jangkauan gerbang yang
ada sekarang. Itu bukan catatan kaki, itu bagian dari temuannya.

---

## 0. Apa yang sebenarnya berdiri di layar itu

Urutan DOM `todayHomeMarkup()` dari atas ke bawah:

| # | Blok | Sumber |
|---|------|--------|
| 1 | Kokpit Pau — avatar + balon sapaan | `app.js:7990` (ditandai "Versi B") |
| 2 | "Rencana belajar" + kartu **Rencana Hari Ini** + **PAW ARENA** | `learnerFlowHomeMarkup()` `app.js:12269` |
| 3 | Kartu **HARI INI** — wajah Pau kedua, Ritme Harian, sapaan, isi sesi, CTA, runtun, trust-line | `app.js:8035-8044` |
| 4 | "Latihan Singkat 3 Menit" — chip bahasa + 3 chip fokus | `app.js:8018` (ditandai "Versi C") |
| 5 | Panel **ONLINE & TEMAN** | `socialHomeMarkup()` `app.js:13770` |

Di atas fungsi itu berdiri komentar `m025-246` yang menuliskan empat aturan layar ini,
kata demi kata:

> 1. SATU tombol primer (.primary) di seluruh layar. `today-home-test.js` menghitungnya dan
>    merah kalau ada dua.
> 2. Isi sesi TERLIHAT sebelum ditekan.
> 3. Runtun SEKUNDER: satu baris kecil di bawah tombol.
> 4. Blok dengar/bicara ikut di dalam isi sesi.

Aturan 1 dan 4 masih ditepati. Aturan 2 dan 3 sudah tidak. Dan **`tests/today-home-test.js`
tidak ada di repo ini** — disisir ke seluruh `tests/`, nol berkas. Aturan yang paling
sering dikutip di layar ini adalah aturan yang tidak dijaga siapa pun.

Blok 1 ("Versi B") dan blok 4 ("Versi C") ditandai sendiri di komentarnya sebagai potongan
dari dua opsi mockup yang berbeda. Sebagian besar temuan di bawah adalah jahitan antara
kedua potongan itu dengan kartu `m025-246` — masing-masing benar sendiri-sendiri, dan tidak
pernah didamaikan satu sama lain.

---

## 1. Temuan

### T1 — MERAH · Tiga definisi "satu hari belajar" hidup bersamaan; pembilangnya melewati penyebut

Layar ini memakai **tiga** angka berbeda untuk pertanyaan yang sama — berapa soal yang
membuat satu hari selesai:

| Angka | Dipakai di | Sumber |
|-------|-----------|--------|
| `policy.sessionSize` (5–16, adaptif) | judul & isi kartu, dan `dailySessionDone()` yang membalik kartu jadi "selesai" | `app.js:7920`, `app.js:7950` |
| **10, literal** | bar Ritme Harian — pembagi persen **dan** teks penyebut | `app.js:8000`, `app.js:8002` |
| `MEANINGFUL_ATTEMPTS = 5` | ambang `day_active` analytics, dan cincin hero di layar klasik | `app.js:152`, `app.js:5563` |

Yang terjadi di layar, terukur pada keadaan **tuntas** (16 soal, `policy.sessionSize` 10):

```
Ritme Harian (16/10 soal)   100%
Sesi hari ini sudah beres
Kamu boleh berhenti di sini. Kalau masih mau, satu sesi tambahan tidak apa-apa.
```

`16/10` bukan keadaan langka yang dipaksa harness: **setiap murid yang menjawab lebih dari
sepuluh soal dalam sehari melihatnya**, karena `doneCount` adalah `state.daily.attempts`
mentah dan penyebutnya tidak pernah ikut bergerak.

Dua arah kerusakannya, keduanya bisa dicapai tanpa trik apa pun:

* **`sessionSize` 5, murid menjawab 7.** Kartu berbunyi "Sesi hari ini sudah beres"; bar di
  atasnya, dalam kartu yang sama, berbunyi **70%**. Murid membaca dirinya belum selesai.
* **`sessionSize` 16, murid menjawab 10.** Bar berbunyi **100%**; kartu tetap menuntut enam
  soal lagi. Murid membaca dirinya sudah selesai lalu ditolak.

Ada pemakai keempat angka tetap itu, dan ia ada di dalam naskah, bukan di kode:

```
'home.sapaan-runtun-aktif': 'Runtun {hari} hari! Mantap sekali, {nama}. Siap lanjut 10 menit hari ini?'
'home.sapaan-runtun-aktif': 'ต่อเนื่อง {hari} วันแล้ว! เยี่ยมมาก {nama} วันนี้ไปต่ออีก 10 นาทีไหม'
```

`{hari}` dan `{nama}` diparameterkan; **"10 menit" / "10 นาที" dipaku** — di kedua bahasa.
Sementara `todaySessionShape().menit` bergerak 5–30 dan tercetak apa adanya di baris tepat
di bawahnya. Memperbaiki ini menyentuh naskah ID dan TH bersamaan, jadi ia perlu
placeholder baru (`{menit}`), bukan sekadar tambalan di `app.js`.

**Ukuran perbaikan.** Satu sumber kebenaran — `todaySessionShape().soal` — dipakai bar,
kartu, dan `dailySessionDone()`; `doneCount` dijepit ke penyebut untuk teksnya; naskah
sapaan diberi `{menit}`.

---

### T2 — MERAH · Ajakan utama layar ini jatuh 1,27 layar di bawah lipatan

Terukur di 390×844 (kelas iPhone 12/13/14), keadaan murid aktif:

```
"Rencana belajar" (h2)        top  213
kartu Rencana Hari Ini+ARENA  top  251   tinggi 308  → berakhir 559
kartu HARI INI                top  565   tinggi 586
tombol primer "Mulai 10 menit" top 1075   tinggi  52     ← lipatan ada di 844
chip Latihan Singkat          top 1167
panel Online & Teman          top 1348
tinggi halaman                    1665
```

**565 px pertama — 67% layar pertama — habis sebelum kartu yang menamai layar ini muncul.**
Satu-satunya tombol primer berdiri di 1075 px: **1,27 tinggi layar**, tidak terlihat tanpa
menggulir.

Yang terlihat murid tanpa menggulir, di urutan itu: balon Pau, judul "Rencana belajar",
kartu **Rencana Hari Ini**, kartu **PAW ARENA**, lalu kepala kartu HARI INI yang terpotong
di baris "10 soal · sekitar 10 menit". Dua pintu lain dibaca lebih dulu daripada pintu
utamanya.

Urutan fokus keyboard mengulang persis kekeliruan yang sama — sepuluh elemen dapat difokus
di `#app`, dan yang utama ada di nomor tiga:

```
1  .launch-card.learn-launch   "Pilih tujuan → 5 soal singkat → rencana hari ini"
2  .launch-card.arena-launch   "Ruang main FIEZEL — belajar sambil bertanding."
3  .primary.luxe.today-cta     "Mulai 10 menit"        ← baru di sini
4  .target-lang-chip           "Coba Bahasa Jepang"
5-7 .quick-chip ×3
8  .fz2-link                   "Lihat semua"
9-10 .fz2-act ×2
```

Ini persis keluhan yang `m025-246` ditulis untuk menutup — "murid yang membuka aplikasi
untuk belajar sepuluh menit harus memilih di antara lima pintu sebelum menjawab satu soal
pun" — dan ia kembali lewat pintu lain: bukan dengan menambah tombol ke dalam kartu,
melainkan dengan menumpuk dua kartu peluncur **di atasnya**.

**Ukuran perbaikan.** `learnerFlowHomeMarkup()` pindah ke **bawah** kartu HARI INI, di
sebelah chip Latihan Singkat. Tidak ada pintu yang hilang; yang berubah hanya siapa yang
dibaca lebih dulu.

---

### T3 — MERAH · Maskot menagih sesi baru tepat di sebelah kartu yang bilang hari ini sudah selesai

Terukur bersamaan di satu layar, keadaan tuntas:

```
balon Pau : "Runtun 21 hari! Mantap sekali, Rani. Siap lanjut 10 menit hari ini?"
judul     : "Sesi hari ini sudah beres"
lead      : "Kamu boleh berhenti di sini. Kalau masih mau, satu sesi tambahan tidak apa-apa."
```

`heroSpeech` (`app.js:7986`) hanya bercabang pada `streak > 0`. Ia **tidak pernah melihat
`selesai`**, variabel yang dihitung sepuluh baris di atasnya (`app.js:7950`) dan yang
mengubah seluruh isi kartu.

Yang membuat ini merah, bukan kuning, adalah komentar yang berdiri tepat di atas cabang
`selesai` — aturan yang dilanggar oleh blok Versi B, ditulis oleh penulis kartu itu
sendiri:

> Tombol tambahannya sengaja bukan `.primary` — target harian sudah tercapai, dan mendorong
> sesi kedua dengan tombol sekuat tombol utama adalah pola yang membuat aplikasi belajar
> terasa menagih.

Kartu itu menurunkan tombolnya jadi `.today-cta-soft` supaya tidak menagih. Balon 500 px di
atasnya menagih dengan kalimat penuh. Kehati-hatian itu terbayar nol.

**Ukuran perbaikan.** `heroSpeech` ikut membaca `selesai` dan memakai naskah ketiga
(apresiasi, bukan ajakan). Kunci baru butuh pasangan `copy-id-redesign.js` +
`copy-th-redesign.js`.

---

### T4 — MERAH · Dua wajah Pau di satu layar, padahal aturan "satu Pau di Home" ditulis di kode dan ditegakkan CSS untuk Pau ketiga

Terhitung di DOM pada view home: **`<fiezel-mascot>` ×3** — dua di dalam `#app`, satu di
gelembung FAB mengambang.

Dua yang di dalam `#app` sama-sama lahir dari `pawFaceMarkup()`:

```
app.js:7992   <div class="paw-hero-avatar">${pawFaceMarkup()}</div>      ← kokpit Versi B
app.js:8037   <div class="today-head">…${pawFaceMarkup()}</div>          ← kepala kartu HARI INI
```

Keduanya terlihat serentak di layar pertama 390×844: wajah kokpit di **top 106 px**, wajah
kartu di **top 589 px**. Jarak antar-keduanya kurang dari separuh layar.

Yang ketiga justru sudah dibayar mahal untuk disembunyikan. `renderInner()` memasang kelas
panggung khusus untuk itu, dengan alasan tertulis:

> wajah coach-strip adalah **SATU-SATUNYA Pau di Home**; gelembung FAB pengambang (Pau
> kedua, terukur menimpa lipatan hero/skill-hub di 390px) disembunyikan lewat CSS
> `body.fz-stage-home`

dan CSS-nya menepati (`style.css:4068`):

```css
body.fz-stage-home .fz-coach-peek,
body.fz-stage-home .fz-coach-bubble{display:none}
```

Jadi aplikasi ini menghitung, menulis aturan, memasang kelas panggung, dan menulis dua
baris CSS untuk mencegah Pau kedua — lalu markup layarnya menggambar Pau kedua sendiri,
di atas lipatan, tepat di tempat yang aturan itu lindungi. Ongkosnya dibayar, barangnya
tidak didapat.

**Ukuran perbaikan.** Satu `pawFaceMarkup()` dilepas. Yang di `today-head` adalah calon
terkuat: yang di kokpit membawa balon percakapan dan memang menjadi wajah pembuka layar.

---

### T5 — MERAH · Level CEFR dan tagihan review jatuh tempo tidak ada di dasbor murid

Disisir di DOM hidup, view home, ketiga keadaan:

```
.hero-stat          0
kata "review"/"ulang" di seluruh #app   tidak ada
level aktif (A1/A2/B1…)                 tidak tercetak di mana pun
```

Satu-satunya teks berbunyi level di layar ini adalah "Tingkat A1/N5" pada chip **Bahasa
Jepang** — level kursus lain, bukan level murid.

Penyebabnya bukan penghapusan, melainkan cabang yang mati. `homeStatStripMarkup()`
(`app.js:7853`) punya tepat satu pemanggil, `app.js:8062`, dan pemanggil itu ada di dalam
cabang `else` dari `uxOn('todayHome')`. Dengan bendera menyala, **nol murid** mencapainya.
Yang ikut mati bersamanya adalah dua tombol yang komentarnya rayakan sendiri:

> (a) Keping LEVEL kini tombol dan menyerap chip "A2 · semua materi · ganti" — level
> tercetak 1× di Home, bukan 3×.
> (c) Keping REVIEW kini tombol `onclick="startAdaptive()"` — tagihan review akhirnya bisa
> **DIKERJAKAN** dari tempat ia diiklankan (audit-18 P2).

Perbaikan audit-18 P2 itu terkirim ke layar yang dimatikan. Murid tidak bisa mengerjakan
tagihan review dari tempat ia diiklankan, karena ia tidak diiklankan di mana pun lagi.
`activeLevelTrustLineMarkup()` (`app.js:7567`) mengembalikan string kosong kecuali level
sedang terkunci atau masa percobaan, jadi ia bukan penggantinya.

Murid A2 yang punya 23 kata jatuh tempo membuka FIEZEL dan tidak melihat satu pun dari dua
angka itu tanpa pergi ke Progres.

**Ukuran perbaikan.** Dua keping — LEVEL dan REVIEW — dipasang di `today-head`, di sebelah
eyebrow "HARI INI". Keduanya sudah ditulis, teruji, dan tinggal dipanggil.

---

### T6 — KUNING · Kokpit Pau dapat diklik tetapi tidak dapat difokus keyboard, dan aria-label-nya jatuh di `div` tanpa `role`

```html
<aside class="paw-hero-cockpit" onclick="pawReact('wake');uiSfx('paw_greet')">
  <div class="paw-hero-avatar" aria-label="Maskot PAW">…</div>
  <div class="paw-speech-bubble">…</div>
</aside>
```

Tiga hal sekaligus:

* `<aside onclick>` **tidak pernah masuk urutan tab** — terhitung: sepuluh elemen dapat
  difokus di `#app`, kokpit bukan salah satunya. Tidak ada `tabindex`, tidak ada
  `role="button"`, tidak ada penangan `keydown`.
* `.paw-hero-avatar` dan `.paw-speech-bubble` sama-sama diberi `cursor:pointer` plus
  transform saat hover (`style.css:5304-5341`). Keduanya **berlagak** dapat ditekan;
  yang menangani justru induknya.
* `aria-label` di `<div>` tanpa `role` **diabaikan** sebagian besar pembaca layar — atribut
  itu hanya berlaku pada elemen dengan peran. Label "Maskot PAW" tidak sampai ke siapa pun.

Kerugiannya terbatas (yang hilang cuma reaksi maskot + SFX, bukan navigasi), karena itu
kuning, bukan merah. `:focus-visible` global sudah ada (`style.css:194`) dan akan langsung
bekerja begitu elemennya jadi `<button>`.

---

### T7 — KUNING · Label tombol terpotong di lebar ponsel kecil

Terukur `scrollWidth − clientWidth` pada elemen berteks:

| Lebar | Elemen | Terpotong |
|-------|--------|-----------|
| 390 px | label di dalam `.fz2-act` "Gabung KelasKu" | 9 px → tampil "Gabung Kela…" |
| 320 px | label di dalam `.fz2-act` "Gabung KelasKu" | 44 px → tampil "Gabun…" |
| 320 px | label di dalam `.fz2-act` "Tambah teman" | 32 px → tampil "Tamba…" |

390 px adalah lebar ponsel paling umum di basis pengguna PWA ini, bukan kasus tepi. "Gabung
Kela…" terpotong pada kata merek sendiri.

Catatan berdampingan: `.fz2-link` "Lihat semua" berukuran **108×32 px**. Ia lolos WCAG 2.5.8
AA (24×24), tetapi di bawah 44 px yang dipakai sisa layar ini — dan ia satu-satunya jalan ke
daftar teman.

---

### T8 — KUNING · Tidak ada `h1` di seluruh dokumen, dan urutan heading melompat

Struktur heading terbaca di `#app`, keadaan aktif:

```
h2  Rencana belajar
h2  Halo, Rani
h3  Isi sesi
h4  Latihan Singkat 3 Menit      ← <h4 style="…"> inline
```

Keadaan tuntas kehilangan `h3` ("Isi sesi" tidak dirender saat selesai), jadi urutannya
menjadi **h2 → h4**.

`index.html` tidak memuat satu pun `<h1>` (terhitung: nol), dan `home()` tidak memanggil
`shell()` — fungsi yang memberi semua view lain `<h1>`-nya. Dasbor murid adalah satu-satunya
layar tanpa judul tingkat satu. Bagi pengguna pembaca layar yang melompat antar-heading,
layar pembuka aplikasi tidak punya puncak.

`h4` itu juga satu dari **33 atribut `style=` inline** di `#app` pada layar ini — ukuran
huruf, tebal, dan warna ditulis langsung alih-alih lewat token (`app.js:8019-8021`), di luar
jangkauan `contrast-test` dan `ui-structure-test`.

---

### T9 — KUNING · Nama murid dan janji "10 menit" tercetak dua kali di layar pertama

Terbaca serentak di atas lipatan 390 px:

```
balon : "Halo, Rani! Belajar 10 menit hari ini untuk mulai runtun barumu."
judul : "Halo, Rani"
lead  : "10 soal · sekitar 10 menit"
```

Dua "Halo", dua "Rani", dua "10 menit" — di dalam layar pertama yang sama, sebelum satu pun
tombol terlihat. Sapaan yang diulang berhenti terbaca sebagai sapaan.

Ini akibat langsung dari jahitan yang sama dengan T1/T3: balon Versi B menulis sapaannya
sendiri tanpa tahu kartu `m025-246` sudah menulis sapaan.

---

### T10 — KUNING · `skillsLabDestination: false` tidak dibaca kode mana pun di `app.js`, dan chip "Dengar" tetap mengantar ke Skills Lab sebagai tujuan

Bendera itu menyatakan maksudnya sendiri (`tests/ux-flags-test.js:47`):

> `skillsLabDestination: [false, 'Skills Lab sebagai tujuan terpisah - SEMBUNYIKAN']`

Disisir ke seluruh repo, ia muncul di empat tempat: daftar bawaan `app.js:20`, berkas
benderanya, gerbangnya, dan `UX_ADDON_FALLBACK` di addon speaking-listening. **Nol
percabangan di `app.js` yang menanyakannya.**

Diuji dengan menekan chipnya sungguhan di Chromium:

```
chip  "Dengar · Audio pendek"  →  state.view = 'skills'
                                   h1 = "Bicara & Dengar"
                                   .skills-page = ada
```

Yaitu hub Skills Lab — persis tujuan terpisah yang benderanya minta sembunyikan. Gerbang T6
di `ux-flags-test.js` mendaftar tujuh bendera yang wajib punya titik baca; `skillsLabDestination`
tidak ada di daftar itu, jadi gerbangnya hijau sambil benderanya tidak menyetir apa pun.

Ini perlu keputusan OWNER, bukan tambalan: **apakah pintu ini memang dikehendaki kembali?**
Kalau ya, benderanya dihapus (bendera mati lebih buruk daripada tidak ada bendera). Kalau
tidak, chip "Dengar" harus disaring benderanya, sama seperti ia sudah disaring
`targetLangSurfaceBlocked()`.

---

### T11 — KUNING · "Latihan Singkat 3 Menit" menjanjikan tiga menit, chip pertamanya "10 kartu cepat"

```
'home.latihan-singkat' : 'Latihan Singkat 3 Menit'   /  'ฝึกสั้น ๆ 3 นาที'
'home.chip-vocab-sub'  : '10 kartu cepat'
```

Sepuluh kartu kosakata bukan tiga menit. Angka di judul seksi dan angka di dalamnya berasal
dari dua orang yang tidak saling membaca — pola yang sama dengan T1, dengan taruhan lebih
kecil. Ia tetap dicatat karena janji waktu adalah satu-satunya hal yang dipakai murid untuk
memutuskan mulai atau tidak.

---

## 2. Yang diperiksa dan ternyata BUKAN temuan

Dicatat supaya tidak ada yang memeriksanya dua kali, dan supaya ruang lingkup yang bersih
terlihat sama jelasnya dengan yang kotor.

* **Kontras — bersih.** Nol kegagalan di semua lebar dan keadaan, dihitung dari warna
  terkomputasi terhadap ambang WCAG AA. Teks kecil yang paling mencurigakan justru lapang:
  `.paw-bubble-text` 12 px = **5,65:1**, `.chip-sub` 11 px = **5,83:1**, `.today-lead`
  14 px = **5,47:1**, `.fz2-social-sub` = **14,67:1**. Palet marshmallow menepati janjinya.
* **Geser horizontal — nol.** `scrollWidth === clientWidth` di 320/390/768/1280, ketiga
  keadaan. `min-width:0` pada `.paw-speech-bubble` (`style.css:5325`) memang menahan apa
  yang komentarnya klaim.
* **Id ganda — nol.** Dua `pawFaceMarkup()` berbagi kelas, bukan id; DOM-nya sah.
* **`prefers-reduced-motion` — tertutup.** Aturan global `*{animation-duration:.001ms
  !important; transition-duration:.001ms!important}` (`style.css:757`) menelan transisi
  `.rhythm-fill` dan transform hover kokpit, dan `.today-blocks li` memang berada di dalam
  `no-preference` (`style.css:1310`).
* **Paritas Thai — utuh.** Enam puluh kunci `FiezelI18n.t()` di jalur Home disilangkan
  dengan seluruh `copy-id-*.js`/`copy-th-*.js`: **nol** kunci tanpa kembaran, di kedua arah.
  `th-coverage-test` hijau. (Isi naskahnya tetap punya cacat T1/T11 — itu soal angka yang
  dipaku, bukan soal paritas.)
* **Indikator fokus — ada.** `button:focus-visible` global (`style.css:194`) meliputi
  seluruh tombol layar ini; satu-satunya yang luput adalah elemen yang memang bukan tombol
  (T6).
* **Aturan "satu tombol primer" — ditepati.** Terhitung `.primary` di `#app`: **1** pada
  keadaan baru dan aktif, **0** pada keadaan tuntas — dan yang nol itu disengaja serta
  didokumentasikan.
* **Kebugaran target sentuh nav bawah — lulus.** Lima butir nav 55×58 px di 320 px,
  69×58 px di 390 px; tombol ikon topbar 44×44 px.

---

## 3. Urutan kerja yang disarankan

Satu rilis kecil menutup lima dari enam temuan merah/kuning yang paling terasa, tanpa
menyentuh satu pun mesin:

1. **T2** — pindahkan `learnerFlowHomeMarkup()` ke bawah kartu HARI INI. Satu baris
   berpindah tempat. Blok yang dipindah menempati 213→559 px, yaitu 346 px; CTA turun dari
   1075 px ke sekitar **729 px** — di atas lipatan 844 px, tanpa menggulir.
2. **T1** — satukan penyebutnya ke `todaySessionShape().soal`, jepit pembilangnya, beri
   naskah sapaan placeholder `{menit}` (ID + TH).
3. **T4** — lepas `pawFaceMarkup()` di `today-head`.
4. **T3** — `heroSpeech` membaca `selesai`; satu pasang kunci naskah baru.
5. **T9** — hapus sapaan ganda: balon berhenti menyapa nama, kartu tetap menyapa.
6. **T5** — pasang keping LEVEL dan REVIEW di `today-head`.

**Gerbang yang perlu lahir bersamanya:** `tests/today-home-test.js` — berkas yang sudah
dikutip komentar `m025-246` tetapi tidak pernah ditulis. Minimal ia menghitung `.primary`
(aturan 1), menuntut penyebut Ritme Harian datang dari `todaySessionShape()` dan bukan
literal, dan menuntut tepat satu `pawFaceMarkup()` di `todayHomeMarkup()`.

**T10 menunggu keputusan OWNER**, bukan tambalan — lihat temuannya.

---

## 4. Berkas yang dibaca

```
app.js                      7853-8210   homeStatStripMarkup, todayPlanBlocks,
                                        todaySessionShape, dailySessionDone,
                                        todayHomeMarkup, home
app.js                      6930, 7567, 12269, 12455, 13770
                                        pawFaceMarkup, activeLevelTrustLineMarkup,
                                        learnerFlowHomeMarkup, targetLangChipMarkup,
                                        socialHomeMarkup
app.js                      6771, 7109  renderInner (bendera panggung), go
style.css                   1289-1312, 4068-4069, 5285-5410
fiezel-ux-flags.js          seluruhnya
features/i18n/copy-id-redesign.js, copy-th-redesign.js
index.html                  topbar + nav bawah
tests/ux-flags-test.js, tests/ux-redesign-test.js, tests/r2-ux-overhaul-smoke-test.js
```
