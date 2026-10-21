# F6 — bukti mentah (28 Agu 2026)

Semua angka di bawah diukur dari sandbox ini terhadap jembatan hidup
`https://api.fiezel.my.id`. Alat: `tools/f6-client-timeout-probe.mjs`,
`tools/f6-hop-isolate.mjs`, `tools/f6-cookie-matrix.mjs`, `tools/f6-app-vs-raw.mjs`,
`tools/f6-h3-check.mjs`, plus curl.

## 1. Latensi jembatan (curl, TCP/TLS baru vs keep-alive)

| Jalur | Ukuran |
|---|---|
| `/api/config` koneksi baru (10x) | 1.123 1.201 1.161 1.193 1.137 1.361 1.405 1.405 1.161 1.153 s → p95 ≈ 1.41 s |
| `/api/config` keep-alive | pertama 1.158 s, lanjutan 0.349–0.472 s |
| `/api/quota` 401 | pertama 1.170 s, lanjutan 0.384–0.508 s |
| `/api/quota` 200 (dengan `fz_id`) | 1.72–1.95 s (`upstream_ttfb;dur=526.8`) |

Pra-F4 (A7) tercatat 847–1163 ms hangat. Jadi **tidak ada bukti F4 memperlambat
jembatan**: jalur hangat sekarang 0.35–0.5 s, jalur dingin 1.1–1.4 s yang sebagian
besarnya handshake TLS (0.48–0.72 s). Premis "1.4–1.7 s karena F4" tidak lolos ukur.

Header jawaban nyata (curl, `Accept-Encoding: gzip, deflate, br, zstd`):

```
content-encoding: br
vary: Origin,Accept-Encoding
x-fiezel-edge-hop: 1
server-timing: edge_dns;dur=17.9, edge_tcp;dur=13.1, edge_tls;dur=44.7, upstream_ttfb;dur=526.8, edge_total;dur=602.6
```

Artinya lapisan web asal (LiteSpeed) **sudah** memampatkan brotli atas badan identity
dari PHP. Menyalakan kembali gzip pass-through tidak menambah apa pun di hop klien;
ia hanya memindahkan kompresi dari br ke gzip dan menambah risiko encoding ganda.

## 2. Kenapa jawaban `/api/config` tidak pernah sampai ke aplikasi

`tools/f6-client-timeout-probe.mjs`, skenario 2 (jawaban config ditunda 5 s):

```
fetch CF: /api/config mulai 397ms selesai 2898ms status 0
          galat "AbortError: signal is aborted without reason"
aborts  : padaMs 2898, pemanggil "AbortController.abort <- https://fiezel.my.id/app.js:2211:56"
cfState : status "unreachable", source "error", reason "timeout", flags null
mode    : config "off", quota "off"
```

Jadi bukan jembatan yang bisu: **aplikasi membatalkan permintaannya sendiri** di
`app.js:2211` (`setTimeout(() => controller.abort(), CF_REMOTE_TIMEOUT_MS)`) dengan
anggaran `timeoutMs: 2500` dari `core-config.js:108`. Sesudah itu status jadi
`unreachable` dan SEMUA jalur CF mati untuk sisa sesi (tidak ada percobaan ulang).
Konsekuensinya di gerbang A5: `config-protocol`, `config-flags-present`, dan
`config-non-blocking` merah karena tidak ada jawaban yang pernah tiba.

Tanpa penundaan, jalur yang sama hijau: config 200 dalam 1320 ms (382→1702), protokol
1.7, flags lengkap. Selisih aman hanya ~1.2 s dari batas 2500 ms.

## 3. Kenapa `bridge-hop-stable` merah — QUIC, bukan jembatan

Eksperimen terkontrol (`tools/f6-hop-isolate.mjs`), satu variabel yang diubah:

| Varian | Hasil 3 hop `/api/quota` |
|---|---|
| A1 Chromium apa adanya | TIMEOUT 8001 / 8001 / 8001 ms (fetch tidak pernah settle, bahkan >24 s) |
| A2 ulang | TIMEOUT 8001 / 8000 / 8000 ms |
| B1 `--disable-quic` | 200 dalam 1707 / 893 / 934 ms |
| B2 ulang | 200 dalam 1632 / 885 / 938 ms |

Deterministik 2/2 vs 2/2. Penyebab: jawaban asal mengiklankan
`alt-svc: h3=":443"; ma=2592000`, jadi permintaan kedua dan seterusnya dicoba lewat
HTTP/3, dan UDP/443 di sandbox ini adalah lubang hitam. Kontrol tambahan
(`tools/f6-h3-check.mjs`): host lain yang h3-nya sehat pun ikut menggantung 39 s
sebelum jatuh balik ke h2 (`cloudflare-quic.com/favicon.ico` 39054 ms), sedangkan
UDP/53 keluar normal. Jadi ini artefak lingkungan uji, bukan cacat aplikasi maupun
jembatan.

Bukti pendukung bahwa transport aplikasi sehat kalau QUIC tidak ikut campur:

- `tools/f6-cookie-matrix.mjs` (halaman kosong, tanpa kode FIEZEL): quota+cookie 200
  dalam 1644 ms; quota tanpa cookie 401 dalam 1095 ms; config 200 dalam 1276 ms.
- `tools/f6-app-vs-raw.mjs` (halaman aplikasi, cookie disemai): `coreWorkerExec`
  `/api/quota` 200 dalam 852 ms, fetch mentah 200 dalam 850–1590 ms, service worker
  tidak pernah mengendalikan halaman (`controller:false`) dan memang keluar lebih awal
  untuk asal silang.

## 4. Garis dasar E2E sebelum perbaikan

- Penuh: 18/22 (log `/tmp/e2e2.log`), merah: `config-protocol`,
  `config-flags-present`, `config-non-blocking`, `bridge-hop-stable`.
- Hanya C+D terhadap worktree `fix/f6client`: 11/12, satu merah
  `bridge-hop-stable` (`#1 TIMEOUT 8001ms | #2 TIMEOUT 8000ms | #3 Failed to fetch 7503ms`),
  sementara `anon-200` 1433 ms dan `quota-200-after-auth` hijau di halaman yang sama.
