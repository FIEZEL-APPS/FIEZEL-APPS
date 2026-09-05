# A6 — Penyalaan sisi klien, tahap 1: analytics saja

Branch: `work/a6cli`. Tidak di-push. Tidak ada nomor build yang dinaikkan di paket ini.
Tanggal: 28 Agustus 2026.

## 1. Masalahnya dalam satu paragraf

Sisi server sudah terbukti hidup: `POST https://api.fiezel.my.id/api/usage/events` menjawab
`202 {accepted:1}` tanpa cookie sesi, dua event `day_active` mendarat sebagai 2 baris
`dau_dedup`, `metrics_daily` dan `usage_daily` terisi, dasbor owner menampilkan angkanya.
Sisi klien mati total, dan bukan "belum ramai": `core-config.js` yang terpasang di produksi
berisi `enabled:false`, `base:''`, dan tujuh endpoint `'off'`, sehingga `cfStaticMode('usage')`
menjawab `'off'` dan baris terakhir blok pemancar di `app.js`
(`if(cfStaticMode('usage')!=='off')anBootSchedule();`) bahkan tidak memasang timernya. Nol
event pernah dikirim dari perangkat murid. Paket ini menyalakan satu jalur itu, dan hanya itu.

## 2. Yang dinyalakan, dan alasan tiap satu

`core-config.js` sekarang:

```js
self.FIEZEL_CF_CONFIG=Object.freeze({
  enabled:true,
  base:'https://api.fiezel.my.id',
  endpoints:Object.freeze({health:'off',config:'on',auth:'off',quota:'off',ai:'off',tts:'off',usage:'on'})
});
```

| Nilai | Kenapa perlu |
|---|---|
| `enabled:true` | Sakelar induk statis. `cfEndpointMode()`/`cfStaticMode()` menuntut `CF_CONFIG.enabled===true` sebelum melihat endpoint mana pun. Tanpa ini seluruh isi tabel di bawah tidak dibaca. |
| `base:'https://api.fiezel.my.id'` | Custom domain Worker `fiezel-api` (bukan `workers.dev`, bukan `*.puter.work`). `tests/cf-transport-test.js` mengunci pola `^https://[a-z0-9-]+\.fiezel\.my\.id$`; alamat ini memenuhinya. `FIEZEL_CORE_CONFIG.workerUrl` TIDAK disentuh — jalur pengingat push masih bergantung pada `*.puter.work` (`tests/remote-push-test.js:6`). |
| `usage:'on'` | Sakelar analytics itu sendiri, dan satu-satunya yang benar-benar wajib. Tiga pembacanya: `anGateOpen()` menuntut `cfStaticMode('usage')==='on'`; ekor blok pemancar hanya memasang timer kalau nilainya bukan `'off'`; dan `features/analytics/fiezel-analytics-client.js` menuntut `endpoints.usage==='on'` sebelum membuat `installId`, menulis antrean, atau mengirim. Biayanya tulisan D1 — gratis pada skala ini, nol neuron. |
| `config:'on'` | Tidak dituntut kode: `cfFetchServerConfig()` memakai `fetch()` langsung ke `base+'/api/config'`, bukan lewat `cfEndpointMode`. Tapi `tools/flag-plan-check.mjs` aturan 4 (`KILL_SWITCH_TAK_TERBACA`) menilai DANGER kalau ada endpoint hidup sementara `config` mati, dan itu penilaian yang benar: jalur hidup tanpa pengakuan jalur kill switch. Biaya permintaan tambahan: **nol** — tidak ada satu pun pemanggil `coreWorkerExec('/api/config')` di repo. Dengan nilai ini `node tools/flag-plan-check.mjs` melaporkan `0 DANGER, 0 WARN`. |

## 3. Yang TIDAK dinyalakan, dan alasannya

| Endpoint | Alasan tidak dinyalakan |
|---|---|
| `ai:'off'` | `/api/ai/*` di Worker membelanjakan **neuron** akun (plafon harian dipakai bersama seluruh murid). Bukan bagian paket ini; keputusan owner terpisah. Murid tetap memakai Puter untuk AI. |
| `tts:'off'` | `/api/tts/*` memanggil binding `env.AI` yang sama — sama-sama uang. Murid tetap memakai Puter untuk suara. |
| `quota:'off'` | Plafon per murid hanya bermakna untuk jalur berbiaya (ai/tts). Analytics tidak menagih apa pun; menyalakannya hanya menambah permukaan. |
| `auth:'off'` | Analytics ini sengaja tidak beridentitas: yang dikirim `visitor_token = HMAC(pepper harian, installId)`, dan server memang menerima `/api/usage/events` **tanpa** cookie sesi (terbukti 202). Memindahkan sesi murid ke jalur baru tidak punya alasan analytics. |
| `health:'off'` | `coreBrainHealth()` menembak `CORE_WORKER_URL` (Puter) langsung, tidak lewat transport CF. Nilai ini tidak dibaca siapa pun di jalur ini. |

## 4. Cache: apa yang harus terjadi supaya config baru benar-benar sampai

Ini inti paketnya, dan jawabannya tidak menyenangkan.

Fakta dari `sw.js` (bukan dugaan; kelimanya sekarang dijaga assert):

1. `SW_REV='m025-181-paw-character-system-20260828'`, dan `SHELL_CACHE = \`fiezel-shell-${SW_REV}\``. Nama cache **diturunkan dari SW_REV**, jadi generasi shell baru hanya lahir kalau SW_REV berubah.
2. `./core-config.js` ada di dalam `ASSETS` (sw.js:51) dan dimuat `index.html:271` **tanpa query versi**, jadi kunci cache-nya persis sama antar rilis.
3. Install: `caches.open(SHELL_CACHE).then(c=>c.addAll(shellRequests()))`, dengan `shellRequests()=ASSETS.map(a=>new Request(a,{cache:'reload'}))` — unduh ulang, bukan dari cache HTTP.
4. Aset shell non-navigasi dilayani **cache-first di dalam generasinya sendiri**. Navigasi network-first, aset shell tidak.
5. **Tidak ada `skipWaiting`, tidak ada `clients.claim`** — komentar di sw.js:140 menyebutnya keputusan sadar: rilis baru hanya boleh aktif setelah klien worker lama habis.

Konsekuensinya, urutan yang HARUS terjadi:

- `SW_REV` naik (lewat `tools/bump-build.mjs`, lihat §6) → `sw.js` di produksi berubah byte-nya.
- Murid membuka aplikasi **online**. Browser memeriksa `sw.js`; karena berubah, worker baru **install** dan mengunduh seluruh ASSETS termasuk `core-config.js` baru ke `fiezel-shell-<REV baru>`.
- Worker baru **menunggu**. Selama masih ada jendela/dokumen yang dikendalikan worker lama, murid masih dilayani `fiezel-shell-<REV lama>` — yaitu `core-config.js` **lama** dengan semua flag off.
- Worker baru aktif hanya setelah SEMUA klien worker lama tertutup. Pada PWA terpasang itu berarti aplikasinya benar-benar ditutup, bukan diminimalkan.

### Jawaban jujur soal waktu

- **Pengunjung web baru / yang belum memasang PWA**: langsung, pada muat pertama.
- **PWA terpasang, pola pemakaian normal**: umumnya **dua kali buka**. Buka pertama sesudah deploy = mengunduh; buka berikutnya sesudah aplikasi benar-benar ditutup = config baru berlaku. Untuk murid yang membuka aplikasi tiap hari dan menutupnya, praktis **hari yang sama atau H+1**.
- **Batas atas yang tidak bisa saya janjikan**: pemeriksaan skrip service worker bisa dilayani cache HTTP hingga ~24 jam pada perilaku browser lama, dan `periodicsync` tag `fiezel-update-check` (`sw.js:209`) hanya berjalan kalau browser memberi izin dan kuota. Jadi "beberapa jam" sampai "beberapa hari" adalah rentang yang realistis, bukan angka tunggal.
- **Ada yang MUNGKIN TIDAK PERNAH menerimanya**, dan ini harus dikatakan terang-terangan:
  1. Murid yang tidak pernah membuka aplikasi dalam keadaan **online** — worker baru tidak akan pernah terunduh.
  2. Murid yang **tidak pernah benar-benar menutup** PWA-nya (di Android/iOS aplikasi sering hanya di-suspend, tidak ditutup). Worker baru akan selamanya berstatus `waiting`, dan `core-config.js` lama terus dilayani cache-first sampai proses aplikasi itu benar-benar mati (restart perangkat, pembersihan memori sistem, atau murid menggeser aplikasinya dari daftar aplikasi terbaru).
  3. Murid yang perangkatnya menolak/menghapus pendaftaran service worker (mode privat, penyimpanan penuh, pembersih aplikasi) — mereka justru mendapatkan yang baru, karena tidak ada shell lama; tapi mereka juga kehilangan mode luring.

  Yang harus dilakukan orang di kelompok (2) supaya menerimanya: **tutup aplikasi sepenuhnya lalu buka lagi sambil online**. Tidak ada mekanisme lain di kode hari ini yang bisa memaksanya, dan saya tidak menambahkannya — memaksa lewat `skipWaiting` akan menukar generasi controller di tengah dokumen hidup, yang justru dilarang sadar di `sw.js:140`.

- **Kalau SW_REV tidak dinaikkan**: config baru **tidak pernah** sampai ke satu pun PWA terpasang, sementara pengunjung web baru sudah memakainya. Itu keadaan campur yang paling buruk: dua populasi, dua konfigurasi, dan tidak ada cara membedakannya dari dasbor.

## 5. Kill switch: dua-duanya masih hidup, dan dibuktikan gerbang

Bukan klaim; semuanya assert yang dijalankan di `tests/cf-config-killswitch-test.js` (86 assert, exit 0):

- **Rollback klien** — `(a-A6)`: `enabled:false` + ketujuh endpoint `'on'` + server menjawab semua `true` ⇒ ketujuh mode gabungan `'off'`, **nol** fetch CF (termasuk `/api/config`), ketujuh path dilayani Puter, nol timer dipasang.
- **Kill switch server tanpa deploy klien** — `(A6)`: dengan `core-config.js` apa adanya, `cfAnalyticsEnabled:false` dari `GET /api/config` mematikan `usage` (nol permintaan data CF, jatuh ke Puter). Tuas kedua `enabled:{analytics:false}` juga mematikannya. Arah AND tetap utuh: server tidak bisa **menyalakan** apa pun yang statisnya off (`(a)`).
- **`base` kosong = off** — `(d-A6)`: tiga bentuk (`''`, `'   '`, hilang) dengan `enabled:true` dan semua endpoint `'on'` ⇒ ketujuh mode off, nol fetch.
- **Berkas terpasang** — `(b)`: dua lapis, nilai hasil evaluasi `core-config.js` DAN teks berkasnya, memastikan `ai==='off'`, `tts==='off'`, dan yang hidup hanya `config`+`usage`.
- **Pemancar benar-benar jalan** — `(c-A6)`: blok `A1-ANALYTICS-EMITTER` dipotong dari `app.js` dan **dijalankan** di konteks vm yang sama dengan blok kill switch + transport, di atas config repo. Hasil: `anGateOpen()===true`, pemancar memasang **tepat satu** timernya sendiri, dan `/api/usage/events` bermode `'on'`. Tiga anti-vakumnya juga hijau: `usage` statis off ⇒ gerbang tertutup + nol timer; server mematikan analytics ⇒ gerbang tertutup; sebelum jawaban `/api/config` tiba ⇒ gerbang tertutup (fail-closed).
- **Invarian precache sw.js** — `(e)`: `core-config.js` di ASSETS, `SHELL_CACHE` diturunkan dari `SW_REV`, precache memakai `shellRequests()` dengan `cache:'reload'` lewat `addAll`, activate menghapus `fiezel-shell-*` basi, nol penyebutan `skipWaiting`/`clients.claim`, ada `registration.update()`, dan arbiter versi `tools/bump-build.mjs` menyentuh ketiga penanda.
- **Kopling rute dicatat sebagai assert**, bukan disembunyikan (lihat §7).

### Bukti merah terarah

Setiap assert dibuktikan bisa merah lewat mutasi lalu dipulihkan. 21 mutasi, semuanya MERAH pada percobaan akhir:

`ai:'on'`, `tts:'on'`, `usage:'off'`, `config:'off'`, `enabled:false`, `base:''`, `quota:'on'`, `Object.freeze` dibuang, `./core-config.js` dicabut dari ASSETS, `SHELL_CACHE` dilepas dari `SW_REV`, `cache:'reload'`→`'default'` di jalur precache, `skipWaiting()` disisipkan, `skipWaiting` lewat alias, `clients.claim()` disisipkan, `addAll(shellRequests())`→`addAll(ASSETS)`, `registration.update()` dibuang, gerbang pemancar dipaksa selalu terbuka, dipaksa selalu tertutup, lapis server dibuang dari gerbang pemancar, timer pemancar tidak dipasang, dan empat mutasi silang ke `tests/cf-transport-test.js` / `tests/analytics-client-test.js` / `tests/rollout-plan-test.js` / `tests/cf-shadow-mode-test.js`.

**Dua lubang gerbang ditemukan dan sudah ditutup** (percobaan pertama tetap hijau):

1. Assert `cache:'reload'` versi pertama hanya mencari pola `new Request(...,{cache:'reload'})` di mana pun di `sw.js`. `sw.js` punya DUA tempat memakai pola itu (precache shell di baris 139 dan revalidasi navigasi di baris 185), jadi merusak yang precache tetap hijau karena yang navigasi masih cocok. Sekarang yang dipatok jalur precache-nya sendiri: `shellRequests()=ASSETS.map(...cache:'reload')` **dan** `addAll(shellRequests())` **dan** `caches.open(SHELL_CACHE)`.
2. Assert `skipWaiting` versi pertama menuntut tanda kurung (`skipWaiting(`), jadi penyisipan `self.skipWaiting;` atau alias yang dipanggil belakangan tetap hijau. Sekarang setiap penyebutan namanya di kode (komentar sudah dibuang oleh `stripComments`) merah.

Satu mutasi juga sempat dilaporkan hijau (`quota:'off'`→`'on'`) tetapi itu **kesalahan mutasinya**, bukan lubang gerbang: `perl -0p` mengganti kemunculan pertama, dan kemunculan pertama ada di blok komentar yang saya tulis sendiri. Setelah polanya dipertajam (`quota:'off',ai:'off'`) hasilnya merah dengan 3 assert.

## 6. PERINTAH YANG HARUS MASTER JALANKAN

Saya tidak menaikkan versi dan tidak menyentuh `coordination/`. Urutannya:

```bash
cd <worktree utama>
git merge work/a6cli            # atau cherry-pick commit A6

# 1. ARBITER VERSI — WAJIB, kalau tidak, tidak satu pun PWA terpasang menerima config baru
node tools/bump-build.mjs "A6: nyalakan jalur analytics klien (usage+config); ai/tts tetap off"
node tools/bump-build.mjs --check       # harus "Selaras."

# 2. Gerbang wajib
for g in cf-config-killswitch-test analytics-client-test ai-transport-switch-test \
         cf-client-timeout-test boot-order-test sw-corp-test no-network-test \
         secret-scan-test gate-registry-test coordination-guard-test regression-test \
         install-health-test; do node $g.js >/dev/null || echo "MERAH: $g"; done

# 3. Gerbang yang kontraknya saya ubah (ikut wajib, semuanya sudah hijau di branch ini)
for g in cf-transport-test cf-shadow-mode-test rollout-plan-test config-consistency-test \
         cf-wiring-test pwa-cache-test pwa-release-coherence-test analytics-server-only-test \
         remote-push-test; do node $g.js >/dev/null || echo "MERAH: $g"; done

# 4. Arbiter rencana flag — harus "0 DANGER, 0 WARN"
node tools/flag-plan-check.mjs | tail -3
```

Sesudah deploy, sisi server tetap punya sakelar mati tanpa deploy klien: set `cfAnalyticsEnabled:false` (atau `enabled.analytics:false`) di KV `cfg:flags` ⇒ jalur analytics mati di seluruh perangkat dalam ≤5 menit (TTL cermin) tanpa menyentuh repo.

## 7. Biaya yang DIKETAHUI, bukan kejutan

`CF_ENDPOINT_ROUTES` di `app.js` menyatukan empat keluarga path di bawah satu kunci `'usage'`:
`/api/usage`, `/api/activity`, `/api/feedback`, `/api/policy`. Jadi `usage:'on'` juga
memindahkan empat pemanggil itu ke Cloudflare, dan SLOT 5 Worker (`route-legacy.js`) masih
`[BELUM]` terpasang ⇒ keempatnya menjawab **404**:

| Pemanggil | Akibat |
|---|---|
| `/api/policy/next` (app.js:2428) | ditangkap `catch`, jatuh ke kebijakan lokal — degradasi senyap |
| `/api/policy/outcome` (app.js:1498) | tetap di antrean (dibatasi 10) |
| `/api/activity` (app.js:3502) | mengembalikan `false`, senyap; hanya aktif saat `fiezel-remote-push==='active'` |
| `/api/feedback` (app.js:4018) | **terlihat murid**: toast "Gagal mengirim. Coba lagi nanti." |

Kopling ini **tidak bisa** dipisahkan dari `core-config.js`: kunci yang sama dibaca
`cfStaticMode('usage')` dan `cfEndpointMode()`, dan flag servernya pun satu
(`cfAnalyticsEnabled`). Dua jalan keluar, keduanya **di luar wilayah saya**:

1. Pecah kunci rute di `app.js` — `usage` untuk `/api/usage/*` saja, kunci lain (mis. `legacy`) untuk activity/feedback/policy; atau
2. Pasang SLOT 5 Worker (`workers/api/route-legacy.js`) sehingga keempatnya benar-benar dilayani.

Sampai salah satunya dikerjakan, satu pesan masukan murid bisa gagal terkirim. Kalau itu
tidak dapat diterima sebelum SLOT 5 ada, keputusannya bukan milik saya: **tunda merge paket
ini**, atau kerjakan (1) lebih dulu. Assert `(A6) kopling DIKETAHUI` sengaja memaku perilaku
ini supaya tidak ada yang bisa berpura-pura kaget nanti.

## 8. Berkas yang saya sentuh di luar wilayah, dan kenapa

Wilayah yang diberikan: `core-config.js`, `sw.js`, `tests/cf-config-killswitch-test.js`.
`sw.js` **tidak saya ubah sama sekali** (SW_REV bukan wewenang saya).

Empat berkas gerbang lain saya ubah karena kontraknya secara harfiah berbunyi "semua flag CF
masih off", jadi paket ini memerahkannya tanpa ada yang rusak. Semuanya minimal, dan tiap
perubahan diberi komentar yang menyebut bentuk lamanya:

| Berkas | Perubahan |
|---|---|
| `tests/analytics-client-test.js` | assert "core-config.js tetap usage:off" → "pemancar tidak menulis `FIEZEL_CF_CONFIG` sendiri" + "ai/tts tetap off". Berkas ini ada di daftar verifikasi wajib, jadi tidak ada pilihan lain. |
| `tests/cf-transport-test.js` | lima assert "default OFF" → daftar putih tahap rilis (`config`,`usage`), ai/tts/auth/quota/health wajib off, `base` terisi hanya kalau ada endpoint hidup, `enabled` konsisten dengan ada/tidaknya endpoint hidup. |
| `tests/cf-shadow-mode-test.js` | assert "repo SEMUA off" → "yang hidup hanya config+usage"; skenario mode-off berhenti meminjam config repo dan memakai `ALL_OFF` eksplisit (kalau tidak, ia menguji hal lain sambil mengaku menguji mode off). |
| `tests/rollout-plan-test.js` | assert "repo masih SEMUA off" → "tidak melampaui tahap rilis" + "ai/tts masih off". |

**Kontradiksi rencana yang harus MASTER putuskan.** Dokumen rencana rollout (yang dijaga
`tests/rollout-plan-test.js`) berbunyi "DILARANG menyalakan/mematikan dengan mengedit
core-config.js" dan "server hanya bisa MEMATIKAN". Dua aturan itu bersama-sama tidak bisa
menghasilkan penyalaan pertama: selama flag statis `'off'`, `cfStaticMode()` menjawab `'off'`
dan nilai KV apa pun tidak pernah dibaca. Jadi penyalaan pertama **harus** sekali lewat
`core-config.js`; sesudah itu KV menjadi sakelar mati-hidup yang sebenarnya. Perintah MASTER
menyuruh saya melakukan tepat itu, dan saya melakukannya — tetapi teks rencananya sendiri
belum diperbarui, dan itu di luar wilayah saya. Yang perlu diputuskan: perbaiki kalimat
rencananya ("penyalaan pertama satu kali lewat rilis, sesudahnya lewat KV"), atau batalkan
paket ini.

## 9. Status verifikasi di branch ini

Semua exit 0: `cf-config-killswitch-test` (86 assert), `analytics-client-test` (168),
`ai-transport-switch-test`, `cf-client-timeout-test`, `boot-order-test`, `sw-corp-test`,
`no-network-test`, `secret-scan-test`, `gate-registry-test`, `coordination-guard-test`,
`regression-test`, `install-health-test`, `cf-transport-test`, `cf-shadow-mode-test`,
`rollout-plan-test`, `config-consistency-test`, `cf-wiring-test`, `pwa-cache-test`,
`pwa-release-coherence-test`, `analytics-server-only-test`, `remote-push-test`,
`ai-integration-test`, `cf-api-contract-test`, `cf-shadow-ledger-test`, `core-brain-test`,
`observability-privacy-test`, `tts-transport-switch-test`.
`node tools/flag-plan-check.mjs` → `0 DANGER, 0 WARN`. `node tools/bump-build.mjs --check` →
`Selaras.` (m025-181).

Yang **tidak** saya verifikasi: seluruh 169 gerbang repo sekaligus — melebihi batas waktu
sandbox. Yang dijalankan adalah 12 gerbang wajib ditambah 15 gerbang lain yang menyebut
`core-config`/`FIEZEL_CF_CONFIG` (jadi satu-satunya yang bisa terpengaruh perubahan ini).
Kalau MASTER mau kepastian penuh, jalankan CI lengkap sesudah merge.
