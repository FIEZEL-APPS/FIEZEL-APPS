# HANDOFF — Penakaran neuron rute warisan, dan tabrakan dua PR (m025-309)

**Status:** SELESAI untuk cakupan di bawah; tiga keputusan OWNER masih terbuka.
**Otoritas:** OWNER. Tidak ada satu pun butir "terbuka" di bawah yang boleh diputuskan
agen tanpa persetujuan OWNER — semuanya menyangkut biaya nyata atau penghapusan aset.

---

## 1. Apa yang diperbaiki, dan kenapa itu penting

`workers/api/route-legacy.js` mengeja `ctx.env.AI.run(...)` langsung di lima tempat,
memintas titik cekik `ai/model-call-gate.js`. Akibatnya sebagian rute `/api/ai/*`
membelanjakan neuron **tanpa dihitung** terhadap plafon akun — sementara plafon
10.000 neuron/hari ditanggung bersama SELURUH murid. Yang memakan jatah tanpa
tercatat membuat jatah habis lebih cepat daripada yang diketahui siapa pun, lalu AI
mati untuk murid sungguhan.

Kelima rute itu: `/api/ai/chat`, `/api/ai/translate`, `/api/coach/context`,
`/api/content/qa/review`, `/api/content/patch/candidate`. Tiga yang pertama **masih
dipakai klien** (dua dari `app.js`, satu dari modul subtitle), jadi mematikannya
bukan pilihan.

## 2. Tabrakan dengan PR #409 — dan kenapa versi ini mengalah

PR #409 mendarat di `main` saat PR #410 berjalan, mengerjakan pekerjaan yang SAMA.
Merge bertabrakan di enam berkas. Penyelesaiannya dinilai per berkas, bukan
"pertahankan milik sendiri":

| Berkas | Putusan | Alasan |
|---|---|---|
| 5 gerbang basi | **ambil #409** | #409 melacak tiap kontrak pensiun ke PENERUSNYA (`readBoundedJson()`, `ownerGate()`, `validReportEndpoint()`). Pendekatan #410 adalah penjaga terbalik yang menunggu berkas terhapus kembali — ia menjaga kontrak yang mungkin tidak pernah kembali, sedangkan #409 menguji perilaku yang hidup sekarang. |
| `route-wiring.js` | **buang milik #410** | `reserveNeuronsForEnv()` + `callModelMetered()` menjadi kode mati begitu `route-legacy.js` memakai perakitan #409. |
| `route-legacy.js` | **dasar #409 + 3 tempelan** | lihat bagian 3. |

## 3. Tiga perbaikan yang hanya ada di sini

1. **Maskot.** Sapaan cadangan `/api/ai/chat` masih berbunyi *"Halo! Saya Nusa & Mira"*.
   Penggantian maskot m025-307 hanya menjangkau berkas klien; kalimat ini hidup di
   Worker dan tertinggal. Ia bukan naskah mati — inilah yang dibaca murid setiap kali
   AI tidak tersedia. Kini PAW.

2. **Galat mentah ke murid.** `catch` rute chat menulis `AI response fallback: ${e.message}`.
   Sebelum penakaran, cabang itu hampir tak pernah kena. **Penakaran #409 sendiri yang
   mempersenjatainya**: penolakan plafon kini lewat jalur yang sama, jadi murid akan
   membaca `AI response fallback: ai_account_cap:...`. Sapaan yang bisa dibaca kini
   dipertahankan.

3. **Penanda tata kelola rute owner.** `authority` dan `gateStatus` hanya hidup di
   komentar kontrak, tidak pernah di satu pun objek respons. Tiga akibatnya:
   konsumen kehilangan peringatan "belum terverifikasi";
   `features/brain/fiezel-content-chain.js` memindahkan `gateStatus` dari nilai yang
   tidak pernah dikirim worker; dan `product-audit.js` — yang meng-assert sumber Worker
   memuat `authority:'candidate-only'` dan `UNVERIFIED_LOCAL_GATES_REQUIRED` sebagai
   bukti mutasi kanonik tetap tertutup — **lolos berkat komentar**. Audit itu kini
   menguji keluaran sungguhan.

## 4. Biaya per permintaan

`@cf/meta/llama-3.1-8b-instruct` tidak punya angka terukur sendiri di `ai/ai-tasks.js`.
Saudara terdekatnya varian `-fp8` adalah 12,5 neuron/permintaan dan non-fp8 tidak lebih
murah, jadi dibulatkan KE ATAS — arah yang sama yang dipilih `accountNeuronsFor()`:
memesan kelebihan aman untuk dompet, memesan kekurangan tidak.

---

## 5. LANGKAH BERIKUTNYA — terbuka, menunggu OWNER

1. **Titik buta gerbang cap.** Assert C1-C5 di `tests/ai-account-cap-gate-test.js` hanya
   menemukan modul yang mendefinisikan `registerXxxRoutes(`. Modul berbentuk
   `export const ROUTES` — seperti `route-legacy.js` — lolos dari tuntutan fixture
   sepenuhnya. Melebarkannya menuntut lima fixture baru.

2. **Perakitan tanda terima terduplikasi.** `route-legacy.js` kini memanggil
   `ModelCallGate.makeReservation()` sendiri dan menyalin resolver `umd()` dari
   `route-wiring.js`. `model-call-gate.js` secara eksplisit memperingatkan agar bentuk
   tanda terima tidak diketik di dua tempat yang bisa menyimpang. Menyatukannya adalah
   refactor tersendiri.

3. **Maskot & aset.** MIRA sisi guru di `landing.html` belum diputuskan, dan direktori
   `assets/characters/` 39 MB masih dikonsumsi `remotion/src/Scene.jsx`,
   `design/redesign-v2/`, serta `character-preview.html`.

4. **Utang naskah dua bahasa.** Naskah sisi Worker (`route-legacy.js`) seluruhnya
   Indonesia saja, di luar sistem `FiezelI18n`. Murid Thai membacanya sebagai layar
   campur. Memindahkannya ke pasangan copy-id/copy-th menuntut i18n sisi server yang
   belum ada. Dicatat sebagai utang bertanggal 2026-09-13.
