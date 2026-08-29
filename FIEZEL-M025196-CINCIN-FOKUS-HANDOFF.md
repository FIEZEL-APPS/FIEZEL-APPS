# Handoff m025-196 — cincin fokus emas dibuang

**Kewenangan: OWNER.** Perubahan ini adalah perintah langsung pemilik, diulang dua kali:
kotak kuning / outline emas harus hilang dari aplikasi.

## Status

**SELESAI dan terkunci gerbang.** Nol aturan `:focus` telanjang tersisa di `style.css`;
nol token cincin berwarna emas.

| | sebelum | sesudah |
|---|---|---|
| `--focus-ring` | `#A67A00` (hue 44°, saturasi 1,00) | `#241A11` (hue 28°, saturasi 0,36) |
| `--focus-ring-on-core` | `#FFC700` | `#FDFAF3` |
| `.fiezel-field input` | `:focus` telanjang → garis `#E6A800` + cahaya kuning 3px | `:focus-visible` saja |
| `.endpoint-label input` | `:focus` telanjang | `:focus-visible` saja |
| kontras cincin di atas cream | 3,71:1 | **16,28:1** |
| kontras cincin di atas `--core` | 11,57:1 | **17,37:1** |

Menuruti pemilik di sini MENAIKKAN aksesibilitas. Tidak ada yang ditukar.

## Kenapa berkas ini menyentuh wilayah sesi lain

`features/neural-voice/fiezel-diag-panel.js` ikut berubah **hanya** pada satu angka:
`DIAG_BUILD` `m025-195` → `m025-196`. Itu ditulis `tools/bump-build.mjs`, pintu tunggal yang
disepakati protokol koordinasi, bukan suntingan tangan ke wilayah klaim sesi neural-voice.
Nol baris logika panel diagnostik disentuh.

Bump-nya **wajib**, bukan formalitas: `style.css` ikut precache `sw.js`. Tanpa `SW_REV` naik,
PWA yang sudah terpasang di HP murid tidak akan pernah menarik shell baru — pemilik akan tetap
melihat kotak kuning yang sama walau kodenya sudah benar.

## Utang yang MASIH terbuka untuk sesi neural-voice

Dua kontrol di panel diagnostik masih di bawah lantai 16px, dan itu belum berubah:

- `#fiezelDiagSearch` — 13px
- `#fiezelDiagText` — 11px

Gayanya disuntik dari `fiezel-diag-panel.js` dengan selector ID, jadi ia menang atas lantai
elemen di `style.css`. Panel itu permukaan OWNER, bukan murid, jadi dampaknya kecil — tetapi
`app-interaction-policy-test.js` (F) mengunci batas ini supaya tetap terlihat sampai
pemiliknya memperbaikinya. **Audit ini tidak menyentuhnya dan tidak berpura-pura sudah beres.**

## Langkah berikutnya

1. Pemilik menekan **Update from Remote → Deploy HEAD Commit** di cPanel Git Version Control.
   Penerbitan masih manual; yang otomatis hanya pemeriksaannya.
2. Jalankan **Actions → FIEZEL Deploy Site → Run workflow** pada `main` untuk menuntut bukti
   bahwa produksi menyajikan `m025-196`.
3. Tutup total aplikasi FIEZEL di HP lalu buka lagi — service worker generasi baru hanya aktif
   sesudah semua klien lama tutup (`sw.js` sengaja tidak memanggil `skipWaiting()`).
