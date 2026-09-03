# m025-243 — Undangan teman: jembatan deep link + kabar dari teman

Laporan OWNER, apa adanya:

> "fitur baru social, online dan teman, undangan teman masih ribet banget, tidak ada
> notifikasi, undangannya dikirim link, dan waktu linknya dibuka, diarahkan ke website atau
> browser fiezel.my.id bukan ke PWA yang sudah terpasang di device user. Seharusnya langsung
> muncul notif di PWA teman, dan teman langsung bisa masuk ke game atau apapun itu, seperti
> layaknya aplikasi game."

Rilis ini menutup tiga dari empat keluhan itu sepenuhnya, dan menutup yang keempat sejauh
yang bisa ditutup dari sisi web — bagian 2 menjelaskan batasnya tanpa dibungkus.

---

## 1. Akar masalah — empat lapis, semuanya nyata sebelum rilis ini

Handoff m025-240 menutup pertanyaan "bagaimana murid MENEMUKAN fitur ini" dengan kartu di
Home. Yang tidak pernah diperiksa sesudahnya adalah apa yang terjadi pada murid **di ujung
seberang** — teman yang diundang. Itu jalur yang, sepanjang yang bisa dibaca dari repo, belum
pernah dicoba dua perangkat sungguhan (m025-240 §7 butir 1 mengakuinya).

Dibaca ulang baris demi baris, jalurnya begini:

| # | Akar masalah | Bukti di kode sebelum rilis ini |
|---|---|---|
| **A1** | **Undangan dikirim sebagai kalimat, bukan tautan yang bisa diketuk.** `navigator.share({title,text})` dipanggil TANPA field `url`. WhatsApp/Telegram hanya membuat pratinjau yang bisa diketuk untuk field `url`; kalimat berisi alamat mendarat sebagai teks mati di sebagian klien. | `app.js` `socialShareInvite()` — `navigator.share({title:'FIEZEL',text})` |
| **A2** | **`?invite=KODE` tidak menukarkan apa pun.** Ia hanya MENGISI `value=` kolom teks di Online → tab Teman, dan hanya kalau murid kebetulan sudah berada di layar itu. Kalau ia mendarat di Home — dan itulah yang selalu terjadi — undangannya lenyap tanpa jejak. | `app.js` `socialTemanMarkup()` — `value="${esc(urlInvite)}"` |
| **A3** | **Nol notifikasi, di kedua sisi.** Pengundang tidak pernah tahu undangannya diterima. Penerima tidak pernah tahu ada undangan. Yang paling menyakitkan: `workers/api/social/notify-core.js` SUDAH ADA — 15 KB kebijakan permintaan teman + pusat notifikasi + push, lengkap dengan gerbangnya (`social-notify-test.js`, 47 assert hijau) — tetapi **nol rute, nol tabel, nol pemanggil**. Kebijakan yang tidak pernah dieksekusi. | `grep -rn "notify-core" workers/api/` → hanya berkas itu sendiri |
| **A4** | **Sesudah berteman, tidak ada apa-apa untuk dimasuki bersama.** Duel Belajar (`features/learner-flow/fiezel-duel.js`) sudah lengkap, tetapi tidak ada satu pun jalan dari "kalian sekarang teman" ke sana. | tidak ada rujukan `FiezelDuel` di seluruh blok sosial `app.js` |

Hitung ketukan yang dituntut dari seorang anak SMP sebelum rilis ini, sesudah tautannya
terbuka: buka menu → Online → tab Teman → gulir ke "Punya kode dari teman?" → Tukar kode.
Empat ketukan buta, tanpa satu pun petunjuk di layar bahwa ada undangan yang menunggu.

---

## 2. Yang TIDAK bisa diperbaiki, dan kenapa rancangannya jadi begini

**Tidak ada cara di web untuk memaksa tautan WhatsApp membuka PWA terpasang.**

WebAPK buatan Chrome memang mendaftarkan intent filter untuk URL dalam scope-nya, tetapi
verifikasi Android App Links menuntut `/.well-known/assetlinks.json` yang memuat **sidik jari
paket WebAPK** — paket yang dicetak per-perangkat oleh server minting Google dan tidak
diketahui pemilik situs. Ditambah satu hal yang membuatnya makin tidak mungkin di sini:
FIEZEL diterbitkan ke `public_html/app`, sedangkan `assetlinks.json` HARUS hidup di akar
domain (`fiezel.my.id/.well-known/`) — di luar jangkauan `.cpanel.yml` mana pun.

Menulis kode yang BERGANTUNG pada tautan yang membuka PWA berarti menulis fitur yang gagal
diam-diam di perangkat mayoritas murid. Jadi rancangan di sini sengaja **tidak bergantung
pada itu sama sekali**:

1. **Kode disimpan di origin yang sama.** Di Android/Chrome, WebAPK berbagi profil
   penyimpanan dengan tab peramban. Kode yang mendarat di tab akan **ditemukan sendiri oleh
   PWA** saat murid membukanya — tanpa ia perlu tahu apa-apa.
2. **`share_target` di manifest = jalan masuk yang benar-benar bekerja.** Tekan-lama pesan
   WhatsApp → Bagikan → FIEZEL. Pesan **mentah** masuk ke aplikasi sebagai `?text=`. Karena
   itu `extract()` dibuat bisa membaca kode dari kalimat utuh, bukan cuma dari URL rapi.
3. **`handle_links: "preferred"` + `launch_handler: focus-existing`** dipasang sebagai
   lapisan terbaik-usaha di Chromium — bukan sebagai fondasi.
4. **Jalur ketik/tempel tidak pernah hilang**, dan sekarang ia menerima tempelan apa pun.

Yang boleh diklaim rilis ini, dan hanya ini: **sesudah kodenya sampai ke aplikasi — lewat
tautan, share sheet, tempel, atau ketik — murid tidak perlu tahu apa-apa lagi.**

---

## 3. Perbaikan

### 3.1 `features/social/fiezel-invite-link.js` (baru, 370 baris)

Modul mandiri pola gems-core: tanpa import, tanpa menyentuh state belajar, gagal diam.

- **`extract(text)`** — menemukan kode di URL rapi, di `#hash`, di tengah kalimat WhatsApp,
  dan sebagai kode telanjang. Pemindaian kalimat bebas aman **karena alfabet cetak server
  (`23456789ABCDEFGHJKMNPQRSTVWXYZ`) tidak punya 0/1/I/L/O/U** — kata Indonesia biasa
  praktis tidak pernah menjadi 8 karakter dari alfabet itu. Gerbangnya mengunci sifat ini.
- **Antrean undangan** ber-TTL 7 hari (= `INVITE_RULES.TTL_DAYS` server) + daftar kode yang
  sudah dijawab. Ini yang membuat undangan **bertahan melewati lompatan tab → PWA** dan
  yang mencegah lembar undangan lahir berulang tiap boot untuk kode yang sudah mati.
- **`cleanUrl()`** membuang `?invite=` sesudah dibaca, **tetapi tidak pernah membuang
  `?duel=`** — alur Duel Belajar membacanya dari `location` setiap kali ia menggambar.
  Ini dikunci gerbang; membuangnya akan mematikan kartu "Terima Duel Belajar" secara diam.
- **`sharePayload()`** memberi `url` TERPISAH (menutup A1) dan tetap menyertakan kode di
  dalam teks sebagai cadangan yang bisa ditempel.

### 3.2 `features/social/fiezel-social-notify.js` (baru, 232 baris)

Kotak masuk sosial sisi klien. Menutup A3 **dengan endpoint yang sudah hidup**, bukan dengan
janji: potret `GET /api/social/friends` disimpan, lalu dibandingkan tiap aplikasi dibuka.

- teman baru muncul → **"@x menerima undanganmu"** — kabar yang selama ini hilang total;
- sorakan bertambah → **"@x menyoraki belajarmu"**;
- milestone teman → masuk kotak masuk, **tidak pernah** mengangkat notifikasi sistem
  (cermin `PUSHABLE_KINDS` §26: kabar baik yang bisa menunggu, bukan gangguan layar kunci).

Enum `kind` **sama persis** dengan `NOTIFY_KIND` di `workers/api/social/notify-core.js`, dan
gerbangnya meng-assert kesamaan itu terhadap berkas server. Saat lane server menyala, kotak
masuk server tinggal menggantikan sumbernya — nol penggantian nama, nol naskah yang perlu
ditulis ulang.

Potret **pertama** menghasilkan NOL kabar: murid yang baru memasang aplikasi tidak boleh
disambut dua puluh notifikasi tentang teman yang sudah lama ada.

### 3.3 `app.js` — lembar undangan yang menyelesaikan seluruh rantai

Menutup A2 dan A4. Undangan yang tertangkap membuka **satu lembar** yang mengerjakan
semuanya di tempat: sesi anon → profil (kolom nama samaran muncul **di lembar yang sama**
kalau belum punya) → tukar kode → **"Kalian sekarang teman belajar 🎉"** dengan dua tombol:
**Main Duel Belajar** dan Lihat teman. Empat ketukan buta menjadi satu ketukan.

Yang dijaga di sekelilingnya:

- **Fail-closed terhadap flag server.** Lembar tidak pernah lahir saat `cfSocialEnabled`
  mati atau perangkat offline — pintu buntu yang dibuka sendiri lebih buruk daripada diam.
  Kodenya tidak hilang: ia tetap tertunda dan lembarnya lahir sendiri begitu flag hidup.
- **Tidak pernah bertumpuk.** Perkenalan, permintaan nama, dan tawaran notifikasi memang
  mengantre di boot pertama. Alur itu tidak memancarkan peristiwa "selesai" yang bisa
  didengar, jadi `armSocialInviteSheet()` memakai syarat yang benar-benar bisa dibaca —
  tidak ada modal terbuka — 10 percobaan × 1,6 detik, lalu diam.
- **Kartu Home punya keadaan "ada undangan menunggu"** dan lencana jumlah kabar belum
  terbaca. Ini persis yang dicatat m025-240 §8 sebagai langkah berikutnya.
- **Kolom tukar kode menerima tempelan apa pun** — seluruh pesan WhatsApp, tautan saja, atau
  kode. Sebelum ini string mentah dikirim apa adanya dan server menolaknya sebagai kode tidak
  berlaku: kegagalan yang terlihat seperti kode temannya yang rusak.
- **`socialNotifyResync()`** menyegarkan potret diam-diam sesudah kita sendiri yang menambah
  teman — tanpa ini, teman yang baru saja kita tambahkan akan melahirkan notifikasi
  "undanganmu diterima" palsu.

### 3.4 `manifest.json`

`id` (identitas stabil), `launch_handler: focus-existing`, `handle_links: "preferred"`,
`share_target` (jalan masuk yang benar-benar bekerja di Android), dan dua `shortcuts`.

---

## 4. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `features/social/fiezel-invite-link.js` | **baru** — jembatan deep link, antrean undangan, muatan share |
| `features/social/fiezel-social-notify.js` | **baru** — potret + selisih + kotak masuk sosial |
| `social-invite-link-test.js` | **baru** — 59 assert, terdaftar di `quality.yml` |
| `app.js` | lembar undangan, `socialNotifyPoll`, kartu Home berlencana, share ber-`url`, tukar kode yang menerima tempelan |
| `manifest.json` | `id`, `launch_handler`, `handle_links`, `share_target`, `shortcuts` |
| `index.html`, `sw.js` | dua modul baru dimuat + ikut precache |
| `style.css` | `.social-launch-invite`, `.social-badge` (nol warna baru; garis emas yang sudah dipakai `.social-code`) |
| `features/i18n/copy-id-feat-c.js`, `copy-th-feat-c.js` | 25 kunci `social.*` baru, paritas id/th penuh |
| `id-golden-baseline.json` | diregenerasi — lihat bagian 5 |
| `.github/workflows/quality.yml` | gerbang baru terdaftar |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` | m025-242 → **m025-243** lewat `node tools/bump-build.mjs` |

`features/neural-voice/fiezel-diag-panel.js` tersentuh **hanya** oleh `DIAG_BUILD` — nol
logika neural-voice berubah.

---

## 5. Naskah Indonesia — 14 literal baru, 0 hilang, 0 berubah

`id-golden-snapshot-test.js` merah sekali, lalu baseline ditulis ulang **setelah** selisihnya
diperiksa satu per satu:

```
LITERAL Indonesia: tidak ada yang hilang/berubah — utuh      ← lolos SEBELUM regenerasi
TAMBAH (14) · HILANG (0)
```

Keempat belasnya naskah baru milik fitur ini (lembar undangan, kabar teman, kartu Home).
**Nol naskah murid yang lain bergeser.** `manifest.json` juga terkunci baseline dan memang
berubah — lima field PWA di bagian 3.4, nol naskah.

Baseline TIDAK diregenerasi untuk menghijaukan gerbang; ia diregenerasi karena perubahannya
sudah dibuktikan disengaja, dan buktinya ada di paragraf ini.

---

## 6. Gerbang

Seluruh daftar `quality.yml` dijalankan lokal. Yang paling relevan:

```
node social-invite-link-test.js        59/59 assert PASS   (gerbang baru)
node social-frontend-test.js           PASS (67 pemeriksaan)
node social-api-contract-test.js       107/107 assert PASS
node social-schema-contract-test.js    79/79 assert PASS
node social-notify-test.js             47/47 assert PASS
node boot-order-test.js                PASS
node global-name-collision-test.js     22/22 PASS
node install-health-test.js            PASS
node pwa-release-coherence-test.js     PASS
node coordination-guard-test.js        24/24 assert PASS
node id-golden-snapshot-test.js        HIJAU (sesudah regenerasi bagian 5)
node th-coverage-test.js               143/143 PASS
node contrast-test.js                  PASS
node a11y-test.js                      PASS
node ui-render-audit-test.js           semua invarian render hijau
node tools/bump-build.mjs --check      Selaras.
```

Nol gerbang dinonaktifkan, di-skip, atau dihapus.

Satu gerbang **sengaja diperketat oleh rilis ini**, bukan dilonggarkan: `.social-badge`
awalnya memaku `color:#2A1D06` di atas `var(--gold)` dan `contrast-test.js` menolaknya
(tinta gelap dipaku di atas permukaan bertema). Diperbaiki ke `var(--text)`, bukan
dikecualikan.

---

## 7. Status rilis — apa yang terbukti dan apa yang belum

**Terbukti lokal:** seluruh logika murni (ekstraksi kode, antrean, TTL, selisih potret,
fail-closed) dikunci 59 assert, dan seluruh gerbang repo hijau.

**BELUM terbukti, dan tidak boleh ditulis dari sisi yang mengerjakan patch:**

1. **Jalur ujung-ke-ujung dua perangkat sungguhan.** Sama seperti m025-240, ini masih
   menunggu OWNER — dan sekarang ia menunggu di jalur yang jauh lebih pendek.
2. **Perilaku share sheet Android sungguhan.** `share_target` benar menurut spesifikasi dan
   dikunci gerbang, tetapi WhatsApp → Bagikan → FIEZEL belum pernah dijalankan di perangkat.
3. **Apakah `handle_links: "preferred"` mengubah apa pun di Android.** Dugaan jujurnya:
   tidak, karena alasan di bagian 2. Ia dipasang sebagai lapisan gratis, bukan sebagai
   jawaban — dan tidak ada satu baris naskah pun yang menjanjikannya ke murid.

**Prasyarat yang tidak berubah:** seluruh lane ini masih MATI sampai OWNER menyalakan
`enabled.social` + `flags.cfSocialEnabled` di KV `cfg:flags` (`docs/SOCIAL-FLAG-RUNBOOK.md`).
Sampai itu terjadi rilis ini tidak mengubah apa pun yang dilihat murid — lembar undangannya
fail-closed dan tidak digambar.

---

## 8. Langkah berikutnya

- **Nyalakan lane `notify-core.js` di server.** Kebijakannya sudah ditulis dan sudah hijau;
  yang belum ada adalah migrasi D1 (`friend_request`, `social_notification`,
  `push_subscription`), rutenya, dan kunci VAPID di Worker. Sesudah itu ada, kotak masuk
  klien di rilis ini tinggal berganti sumber — enum-nya sudah sama persis, dan gerbang
  `social-invite-link-test.js` yang mengunci kesamaan itu.
  **Hanya lane itu yang bisa memberi notifikasi saat layar terkunci.** Jalur di rilis ini
  jujur pada batasnya: kabar muncul saat aplikasi dibuka atau kembali terlihat, dan tidak
  ada satu pun naskah yang menjanjikan lebih.
- **Permintaan teman dua arah (§23).** Kode undangan hari ini langsung jadi teman; tidak ada
  keadaan "menunggu", jadi tidak ada "tolak". `notify-core.js` sudah memuat kebijakannya.
- Sesudah lane server hidup, pertimbangkan `periodicsync` untuk menarik kotak masuk di latar.
