# S1 — Menutup lubang pembatas penerbitan identitas anonim

Cabang: `work/s1auth` (tidak di-push, versi build tidak diubah)
Tanggal: 28 Agustus 2026
Berkas yang disentuh: `workers/api/rate-anon.js`, `tests/rate-anon-test.js` (baru),
`tools/rate-anon-red-matrix.mjs` (baru, alat bukti merah), `tests/cf-api-contract-test.js`
(fixture D1), `.github/workflows/quality.yml`, `workers/api/wrangler.toml`,
`workers/api/README.md`, laporan ini.
NOL berkas di `features/`, `app.js`, `sw.js`, `core-config.js`, `workers/owner/`,
`coordination/`, `workers/api/ai/` yang disentuh.

---

## 1. Diagnosis: kenapa cabang jembatan yang terpilih

Bukan tebakan. Kode lamanya begini:

```js
export function anonIssueLimit(env) {
  return edgeSecret(env)
    ? intVar(env.ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR, ANON_ISSUE_LIMIT_BRIDGE_DEFAULT) // 30
    : intVar(env.ANON_ISSUE_LIMIT_PER_HOUR, ANON_ISSUE_LIMIT_DEFAULT);              // 5
}
```

`edgeSecret(env)` (di `mw-edge.js`) hanya menjawab satu hal: **apakah Secret
`EDGE_SHARED_SECRET` terpasang di env Worker**. Itu properti KONFIGURASI, bukan
properti PERMINTAAN. Secret itu masih terpasang hari ini — memang harus, karena
`mw-edge.js` sengaja mempertahankan jalur header sebagai cadangan selama cache DNS
lama masih hidup dan `deploy/edge/` masih ada. Akibatnya `edgeSecret(env)` truthy
untuk SETIAP permintaan, termasuk yang datang langsung ke `api.fiezel.my.id`, dan
setiap permintaan mendapat tarif 30/jam.

Ini persis cocok dengan pengukuran lapangan owner: 52 tembakan dari satu IP, **28
lolos 200**, sisanya 429. Ember jam berjalan sudah terisi ~2 sebelum uji dimulai
(28 + 2 = 30 = tarif jembatan). Kalau tarif ketat 5 yang terpakai, angkanya
mustahil 28.

Dua hal yang perlu dicatat supaya diagnosisnya tidak salah alamat:

- `CF-Connecting-IP` **tidak pernah** menjadi sinyal cabang. Ia hanya kunci ember.
  Jadi "jembatan sudah lepas dan IP sudah asli" tidak otomatis memperbaiki tarif.
- Tidak ada satu pun gerbang yang menjaga pemilihan cabang ini. `tests/edge-guard-test.js`
  hanya meng-assert bahwa `mw-edge.js` MENYEBUT `rate-anon.js`, bukan bahwa tarif
  yang terpilih benar. Itu sebabnya kesalahannya bisa hidup tanpa terlihat.

## 2. Perbaikan: sinyal cabang yang tidak bisa dipalsukan

Sekarang cabang dibaca dari `ctx.edgePath`, nilai yang **ditulis `mw-edge.js` saat
ia mengizinkan permintaan masuk**: `'custom-domain'`, `'header'`, `'off'`, atau
`'free-path'`. Hanya `'header'` (= benar-benar lewat proxy PHP) yang mendapat tarif
cadangan. Nilai lain, termasuk `undefined` kalau rantai middleware rusak, mendapat
tarif KETAT — default yang aman.

Kenapa klien tidak bisa memalsukannya: untuk mendapat `edgePath = 'header'`, dua
syarat harus terpenuhi sekaligus — hostnya BUKAN host tepercaya (`api.fiezel.my.id`
diperiksa LEBIH DULU) dan `X-Fiezel-Edge` cocok waktu-konstan dengan
`EDGE_SHARED_SECRET`. Di custom domain, header kiriman klien tidak pernah dibaca
sama sekali. Ini dibuktikan sebagai perilaku, bukan sebagai klaim: gerbang menembak
`api.fiezel.my.id` dengan `X-Fiezel-Edge` yang SAH dan tetap mendapat 429 pada
penerbitan ke-3 dengan batas 2 (assert a4), sedangkan `*.workers.dev` + header sah
mendapat tarif cadangan (a5), dan `*.workers.dev` + header palsu 403 (a6).

`rate-anon.js` juga tidak lagi mengimpor apa pun dari `mw-edge.js` dan tidak membaca
satu pun header pemilih jalur; dua pembacaan header yang tersisa (`cf-connecting-ip`,
`x-real-ip`) hanya untuk KUNCI ember (a3).

## 3. Angka yang dipilih, dengan alasan

| Parameter | Nilai | Var |
| --- | --- | --- |
| Jalur langsung, per IP | **15 / jendela bergulir 1 jam** | `ANON_ISSUE_LIMIT_PER_HOUR` |
| Cabang jembatan (cadangan) | **30 / jam, TOTAL** | `ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR` |
| Mode degradasi (D1 tak terbaca) | **5**, dijepit <= batas normal | `ANON_ISSUE_LIMIT_DEGRADED_PER_HOUR` |
| Lebar ember / `Retry-After` | 10 menit / konstanta 600 s | — |

**Kenapa 15, dihitung dari perilaku murid, bukan dari rasa:**

- Murid normal: 1 penerbitan per pemasangan. Cookie identitas berumur 180 hari, jadi
  laju wajarnya ~1 per 180 hari per perangkat.
- Murid terberat yang masih sah: 2 perangkat x (pasang + bersihkan cookie) + 1 ulang
  = **5**.
- Rumah di belakang NAT: 3 anak x 2 perangkat + beberapa percobaan ulang = **8**.
- 15 = ~3x murid terberat dan ~2x kasus keluarga. Ada ruang untuk kejadian tak
  terduga tanpa memberi penyerang ruang bergerak.
- Sisi penyerang: plafon identitas per IP turun dari 720/hari menjadi **360/hari**.
  Dengan ~50,8 B/baris (`docs/D1-CAPACITY`), satu IP jahat paling banyak menulis
  ~18 KB dan ~360 tulis/hari = **0,36%** dari 100.000 tulis/hari plan gratis.

**Kasus kelas — sengaja diterima, bukan diabaikan.** Satu kelas 36 murid yang
onboarding serentak di satu wifi sekolah akan melihat 429 mulai murid ke-16. Itu
tidak memblokir belajar: seluruh pelajaran berjalan LOKAL dan server bukan sumber
kebenaran progres, jadi 429 hanya menunda AI/TTS. Jendelanya bergulir, jadi murid
ke-16 lolos ~10 menit kemudian. Untuk sesi kelas terjadwal owner bisa menyetel
`ANON_ISSUE_LIMIT_PER_HOUR = "60"` sementara lalu menghapusnya. Penutup permanennya
Turnstile atau WAF rate-rule per ASN (bagian 7).

**Kenapa cabang jembatan DIPERTAHANKAN di 30/jam.** `deploy/edge/api-index.php`
dengan sengaja tidak meneruskan IP murid (privasi), jadi seluruh lalu lintas jembatan
berbagi SATU ember. 30/jam di sana adalah anggaran penerbitan GLOBAL (maks 720/hari),
bukan batas per orang. Jalur itu masih ada sebagai cadangan kalau custom domain harus
dilepas, jadi mencabutnya berarti mematikan penerbitan di jalur pemulihan.

**Jendela bergulir.** 6 ember x 10 menit dijumlahkan. Kunci ember berbentuk
`YYYY-MM-DDThh:m0` (UTC) — berawalan tanggal dan lebar tetap supaya SQL retensi yang
sudah didokumentasikan (`WHERE day < :cutoff_day`, `docs/D1-RETENTION.md` §2.3)
benar-benar bisa membandingkannya. Bentuk lama (`h0000472…`) tidak pernah bisa
dibandingkan dengan tanggal; itu bug laten lama yang ikut terbetulkan di sini.

**`Retry-After` konstanta 600 s** dengan sengaja: nilai yang dihitung dari sisa
jendela akan membocorkan kapan IP itu terakhir berhasil terbit.

**Jitter dipertahankan** (`anonJitter`, default 150 ms) beserta alasannya di kode:
waktu respons tidak boleh menjadi oracle terbit/stabil/tolak. Gerbang menuntut ia
dipanggil TANPA SYARAT untuk semua respons rute — jitter yang hanya berlaku pada 200
justru MEMBUAT oracle.

**Privasi kunci.** `ip_hmac = truncate128(HMAC(salt, dayIndex + '|' + ip))`, rantai
salt `RATE_SALT` -> `IDENTITY_PEPPER` (kompatibilitas versi lama) -> konstanta.
Nol IP mentah di bind D1 maupun di log (assert f1/f2).

## 4. Keputusan: apa yang terjadi kalau pembacaan pembatas gagal

**Fail-closed terhadap PEMBATAS. Tidak pernah fail-open.** Kalau D1 melempar,
pembatas tidak dilepas; ia pindah ke ember per-isolate dengan batas
**DIPERKETAT (5)**. Penerbitan tetap mungkin (ketersediaan belajar menang), tetapi
presisi lintas-isolate yang hilang dibayar dengan plafon yang lebih rapat. Alasannya
tertulis di dalam `workers/api/rate-anon.js`, bukan hanya di sini.

Posisi terhadap preseden repo, disebut eksplisit di kode:

- `workers/api/ai/ai-account-budget.js`: fail-closed KERAS (menolak). Beda urusan —
  itu pipa BIAYA; menolak permintaan AI tidak menghentikan murid belajar.
- `workers/api/mw-edge.js`: fail-closed saat secret hilang. Itu KONFIGURASI, bukan
  penyimpanan.
- `workers/api/quota/quota-store-d1.js` menjawab `store_unavailable` dan
  `route-ai.js` mengubahnya jadi mode hemat, bukan 500. Preseden yang paling dekat:
  degradasi, bukan penolakan total.
- Versi `rate-anon.js` sebelumnya juga jatuh ke memori — tetapi dengan batas yang
  SAMA. Itu fail-open bernama lain: batas efektifnya jadi `limit x jumlah isolate`.
  Itulah cacat spesifik yang diperbaiki di sini.

Catatan jujur soal cakupan: gerbang menguji kegagalan pada pernyataan `anon_issue`
saja. Kalau SELURUH D1 mati, penerbitan gagal di tempat lain (`ensureIdentityRow`)
dan itu keadaan berbeda yang bukan wewenang berkas ini.

## 5. Gerbang `tests/rate-anon-test.js` — matriks merah/hijau

Node murni, nol jaringan, menjalankan Worker `workers/api/` yang sungguhan lewat
`tools/cf-test-harness.js`. **76/76 assert PASS.** Setiap kelompok assert dibuktikan
BISA merah lewat `tools/rate-anon-red-matrix.mjs` (merusak satu titik, jalankan,
pulihkan; alat, bukan gerbang CI):

| Mutasi | Tag yang merah | Jumlah assert merah |
| --- | --- | --- |
| M1 cabang tarif selalu jembatan | (a2) (a4) (a7) (b1) (b2) (b3) (b4) (b5) (b6) (d3) (e4) | 18 |
| M2 cabang dipilih dari header klien | (a3) (a5) | 3 |
| M3 amplop 429 membocorkan hitungan | (b2) (b6) | 3 |
| M4 `retryAfter` dihitung dari sisa jendela | (b3) (b5) | 3 |
| M5 jitter hanya untuk respons 200 | (c4) | 2 |
| M6 batas degradasi = batas normal | (d1) (d2) (d3) | 3 |
| M7 ember kembali per jam penuh | (e1) (e2) (e5) | 4 |
| M8 IP mentah jadi kunci ember | (f1) (f4) (f5) | 4 |
| M9 celah lapisan-2 dihapus dari laporan ini | (g6) | 1 |
| M10 gerbang dicabut dari `quality.yml` | (h) | 1 |

**10/10 mutasi terbukti merah lalu pulih hijau.**

Butir (e) dijawab tegas: penghitung **tidak** reset di menit ke-0. Burst yang
memenuhi batas pada 09:52 tetap 429 pada 10:01 (assert e4) dan baru lolos pada 10:55
ketika ember tertua benar-benar keluar dari jendela (e5).

Gerbang terdaftar di `.github/workflows/quality.yml` tepat sesudah
`node tests/edge-guard-test.js`, dan gerbang itu meng-assert pendaftarannya sendiri (h).

## 6. Lapisan kedua: plafon neuron tingkat AKUN (verifikasi, nol edit)

Sesuai instruksi, tidak ada berkas di `workers/api/ai/` yang disunting.

Yang terbukti mengikat:

- `ai-account-budget.js` fail-closed di setiap cabang: tanpa binding D1 ->
  `ai_budget_store_missing`; D1 melempar / tabel belum ada -> `ai_budget_unreadable`.
  Keduanya diuji langsung di gerbang (g2).
- Reservasi ATOMIK: syarat plafon ada di dalam `WHERE day = ?1 AND neurons + ?2 <= ?4
  RETURNING neurons`, bukan baca-lalu-tulis (g4).
- Plafon efektif = `min(GLOBAL_NEURON_CAP, 10000)`, jadi salah tulis var tidak bisa
  membuka plafon di atas jatah akun (g3).
- `route-wiring.js` benar-benar menyuntikkan `accountBudget` ke `aiDeps`, dan
  `route-ai.js` menolak (503 `service_degraded`) ketika `allowed !== true`, sebelum
  kuota murid dan sesudah breaker (g5).

**CELAH YANG DITEMUKAN (belum tertutup, di luar wewenang paket ini).**
Penegakan itu OPSIONAL per pemanggil: `route-ai.js` hanya memakai pagar akun kalau
`typeof deps.accountBudget === 'function'`. Jalur registrasi lain (atau yang ditulis
nanti) yang lupa menyuntikkan dep itu akan melewati plafon akun **tanpa satu pun
galat** — fail-open karena kelalaian. Tidak ada gerbang yang saat ini meng-assert
penyambungan itu (`grep accountBudget` di `tests/cf-wiring-test.js`, `quota-*-test.js`,
`tests/d1-schema-contract-test.js` nol hasil). Yang menutupnya: assert di `tests/cf-wiring-test.js`
bahwa setiap pemanggil `routeAi` menyertakan `accountBudget`, atau ubah dep itu jadi
WAJIB di `route-ai.js` (menolak kalau tidak ada) — keduanya menyentuh berkas milik
paket lain. `tests/rate-anon-test.js` menahannya secara sah: ia meng-assert celah ini
tertulis di laporan ini (g6), jadi ia tidak bisa hilang tanpa jejak.

Dua catatan lain, bukan celah tetapi batas cakupan: jalur TTS tidak dilindungi
plafon neuron, dan tidak ada rollback saat provider gagal (disengaja, terdokumentasi).
Plafon ini juga tidak melindungi pertumbuhan baris D1 dari penerbitan anon — itu
pekerjaan pembatas di bagian 2-3.

## 7. Yang MASIH tidak tertutup

1. **Serangan tersebar dari ribuan IP.** Pembatas ini per IP. 1.000 IP x 15 = 15.000
   identitas/jam, dan tidak ada di dalam Worker yang bisa membedakannya dari 1.000
   murid baru. Penutupnya di lapisan yang benar, bukan di kode ini:
   - Cloudflare WAF rate-limiting rule pada `POST /api/auth/anon` per ASN dan per
     negara (bukan per IP), mis. 300/menit per ASN.
   - Turnstile pada penerbitan pertama. Ini yang benar-benar mahal bagi bot dan murah
     bagi murid. Butuh keputusan owner karena menambah satu langkah onboarding.
2. **Botnet perumahan yang meniru laju murid** (1-2 penerbitan per IP) tidak akan
   pernah tertangkap oleh pembatas laju apa pun. Hanya Turnstile atau pembuktian
   perangkat yang menyentuh kelas ini.
3. **Penegakan plafon akun yang opsional per pemanggil** (bagian 6).
4. **Ketepatan lintas-isolate saat D1 mati.** Mode degradasi memakai memori
   per-isolate, jadi batas efektifnya `5 x jumlah isolate aktif`. Diterima sadar-sadar;
   satu-satunya penutup sejati adalah Durable Object atau KV, keduanya di luar plan
   gratis untuk laju ini.
5. **Jendela bergulir bergranularitas 10 menit**, bukan detik. Burst 15 dalam satu
   detik masih mungkin sekali per jam per IP. Diterima: itu tetap 360/hari.

## 8. Perintah verifikasi lapangan sesudah deploy

Jalankan dari mesin owner, bukan dari CI. Ganti `N` sesuai kebutuhan.

```bash
# 1. Tarif mana yang berlaku: harus 200 sebanyak 15, lalu 429 seterusnya.
for i in $(seq 1 20); do
  printf '%s ' "$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST https://api.fiezel.my.id/api/auth/anon \
    -H 'origin: https://fiezel.my.id' -H 'content-type: application/json' -d '{}')"
done; echo

# 2. Amplop penolakan tidak boleh memuat issued/remaining/limit/resetAt.
curl -s -X POST https://api.fiezel.my.id/api/auth/anon \
  -H 'origin: https://fiezel.my.id' -H 'content-type: application/json' -d '{}' | tee /dev/stderr | \
  grep -Eq '"(issued|remaining|limit|resetAt)"' && echo 'BOCOR' || echo 'AMPLOP BERSIH'

# 3. Header klien tidak boleh membeli tarif jembatan (harus tetap 429 sesudah batas).
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.fiezel.my.id/api/auth/anon \
  -H 'origin: https://fiezel.my.id' -H "x-fiezel-edge: $EDGE_SHARED_SECRET" \
  -H 'content-type: application/json' -d '{}'

# 4. Jalur mana yang dilihat Worker (harus "custom-domain", bukan "header").
curl -s https://api.fiezel.my.id/health | grep -o '"edgeGuard":"[^"]*"'

# 5. Nol IP mentah di D1, dan pertumbuhan baris masuk akal.
npx wrangler d1 execute fiezel-core --remote \
  --command "SELECT day, COUNT(*) rows, SUM(issued) issued FROM anon_issue GROUP BY day ORDER BY day DESC LIMIT 8;"
npx wrangler d1 execute fiezel-core --remote \
  --command "SELECT ip_hmac FROM anon_issue LIMIT 5;"   # wajib 32 hex, bukan alamat IP

# 6. Jendela benar-benar bergulir: penuhi batas, tunggu lewat menit ke-0, harus tetap 429.
date -u; curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.fiezel.my.id/api/auth/anon \
  -H 'origin: https://fiezel.my.id' -H 'content-type: application/json' -d '{}'

# 7. Plafon neuron akun benar-benar mengikat (jalankan SESUDAH flag AI dinyalakan).
npx wrangler d1 execute fiezel-core --remote \
  --command "SELECT day, neurons FROM ai_account_budget ORDER BY day DESC LIMIT 3;"
```

Yang harus dilihat owner di perintah 1: **tepat 15 kali 200**, lalu 429. Kalau
muncul 30 kali 200, cabang tarif masih salah dan `ctx.edgePath` tidak sampai ke
pembatas. Kalau muncul 5 kali 200, D1 tidak terbaca dan Worker sedang di mode
degradasi — cek `wrangler tail` untuk galat binding.

## 9. Gerbang yang dijalankan (semua exit 0)

`tests/rate-anon-test.js` (76/76), `tests/cf-api-contract-test.js` (237/237), `tests/cf-wiring-test.js`,
`tests/quota-core-test.js`, `tests/quota-manipulation-test.js`, `tests/d1-schema-contract-test.js`
(38/38), `tests/analytics-privacy-test.js`, `tests/no-network-test.js` (41 assert, 169 gerbang
dipindai), `tests/secret-scan-test.js` (46/46), `tests/gate-registry-test.js`,
`tests/coordination-guard-test.js` (24/24), `tests/regression-test.js`, `tests/install-health-test.js`,
`tests/edge-guard-test.js` (190/190).
