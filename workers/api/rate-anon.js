/**
 * workers/api/rate-anon.js — pembatas laju PENERBITAN identitas anonim
 * (`POST /api/auth/anon`). Menutup temuan audit D3 HIGH-2.
 *
 * ==========================================================================
 * 🔄 TEMUAN LAPANGAN 28 Agu 2026 (S1) — JEMBATAN SUDAH LEPAS, TARIFNYA BELUM
 * ==========================================================================
 * Ukuran owner terhadap PRODUKSI HIDUP: `POST https://api.fiezel.my.id/api/auth/anon`
 * ditembak 52 kali dari SATU IP; **28 pertama lolos 200**, sisanya 429. Jadi
 * pembatasnya bekerja, tetapi memakai tarif yang SALAH — angka terukur ~28-30
 * adalah tarif JEMBATAN (30/jam), bukan tarif per-IP (5/jam).
 *
 * SEBAB PERSIS (dibaca dari kode, bukan ditebak). Versi sebelum commit ini
 * memilih cabang begini:
 *
 *     export function anonIssueLimit(env) {
 *       return edgeSecret(env)                       // <-- SINYALNYA INI
 *         ? limit(env.ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR, 30)
 *         : limit(env.ANON_ISSUE_LIMIT_PER_HOUR, 5);
 *     }
 *
 * `edgeSecret(env)` hanya menjawab satu hal: **apakah Secret
 * `EDGE_SHARED_SECRET` terpasang di Worker**. Ia TIDAK menjawab "apakah
 * permintaan ini datang lewat jembatan PHP". Sesudah `api.fiezel.my.id` menjadi
 * custom domain Worker, kedua hal itu berpisah:
 *   - permintaan murid tiba LANGSUNG dari browser ke `api.fiezel.my.id`
 *     (`mw-edge.js` meloloskannya lewat jalur `custom-domain`, TANPA header);
 *   - Secret `EDGE_SHARED_SECRET` MASIH terpasang, karena `mw-edge.js` sengaja
 *     mempertahankan jalur header sebagai CADANGAN selama cache DNS lama masih
 *     memegang record origin ArenHost (lihat bab "KAPAN JALUR HEADER BOLEH
 *     DIHAPUS" di berkas itu).
 * Akibatnya `edgeSecret(env)` bernilai truthy untuk SETIAP permintaan, termasuk
 * permintaan yang jelas-jelas tidak lewat jembatan — jadi seluruh lalu lintas
 * produksi mendapat tarif 30/jam. Deteksinya menilai keadaan yang sudah tidak
 * berlaku. Bukan bug ketik: sinyalnya memang keliru sejak awal, hanya tidak
 * terlihat selama jembatan masih satu-satunya jalur.
 *
 * `CF-Connecting-IP` sendiri TIDAK pernah menjadi sinyal cabang (dulu maupun
 * kini) dan tidak boleh menjadi sinyal cabang: ia kunci EMBER, bukan pemilih
 * tarif.
 *
 * PERBAIKANNYA (bab "PEMILIH CABANG" di bawah): cabang dipilih dari
 * `ctx.edgePath` — nilai yang DITULIS `mw-edge.js` sendiri saat ia meloloskan
 * permintaan, jadi ia mencerminkan jalur yang BENAR-BENAR dipakai permintaan
 * ini, bukan isi konfigurasi Worker.
 *
 * ==========================================================================
 * MASALAH NYATA YANG DITUTUP BERKAS INI
 * ==========================================================================
 * Sebelum berkas ini ada, setiap `POST /api/auth/anon` tanpa cookie sah selalu
 * menerbitkan identitas baru: tulis D1 (`identity`) per panggilan, dan setiap
 * identitas baru membawa jatah gratisnya sendiri (25 AI/hari, 12.000 char
 * TTS/hari). Skrip yang membuang cookie tiap iterasi bisa (a) mengisi D1 plan
 * gratis sampai penuh, dan (b) memanen identitas segar untuk memutar jatah
 * AI/TTS tanpa batas efektif.
 *
 * ==========================================================================
 * APA YANG DIBATASI — PENERBITAN, BUKAN PANGGILAN
 * ==========================================================================
 * Murid dengan cookie `fz_id` yang sah TIDAK pernah kena batas ini: panggilan
 * ber-cookie tidak menerbitkan identitas baru (invarian "identitas stabil"
 * yang sudah dijaga gerbang). Yang dihitung hanya kejadian yang benar-benar
 * akan memanggil `issueAnonIdentity()`.
 *
 * ==========================================================================
 * PENYIMPANAN: TABEL D1 `anon_issue` — BUKAN KV, DAN INI KEPUTUSAN, BUKAN SELERA
 * ==========================================================================
 * Dua alasan yang bisa diperiksa:
 *   1. Invarian repo (dijaga cf-api-contract-test §3): jalur penerbitan NOL
 *      tulis KV — plan gratis hanya punya 1.000 tulis KV/hari, dan penghitung
 *      per-penerbitan akan membakarnya. D1 plan gratis punya 100.000 tulis/hari.
 *   2. Tabel `anon_issue (day, ip_hmac, issued)` SUDAH disiapkan migrasi
 *      `0001_identity.sql` persis untuk ini ("rem penerbitan identitas anonim
 *      per IP ter-HMAC").
 * Biaya per penerbitan: 1 SELECT (satu pernyataan, 6 pencarian kunci) + 1 UPSERT
 * D1; penolakan: 1 SELECT saja, NOL tulis. Baris berukuran puluhan byte.
 * Pembersihan baris lama dititip cron (`docs/D1-RETENTION.md` §2.3), tidak di
 * jalur panas.
 *
 * ==========================================================================
 * PEMILIH CABANG: `ctx.edgePath`, DAN KENAPA KLIEN TIDAK BISA MEMALSUKANNYA
 * ==========================================================================
 * `mw-edge.js` menulis `ctx.edgePath` saat meloloskan permintaan:
 *   'custom-domain' -> tiba di hostname tepercaya (jalur murid hari ini)
 *   'header'        -> tiba lewat proxy PHP dengan `X-Fiezel-Edge` SAH
 *   'off'           -> mode transisi dev/harness
 *   'free-path'     -> `/healthz` (tidak pernah menerbitkan identitas)
 * Aturan di sini: **HANYA `'header'` mendapat tarif jembatan.** Semua nilai lain,
 * termasuk `undefined` (rantai middleware tidak terpasang) dan `'unknown'`,
 * mendapat tarif KETAT. Arah default-nya sengaja ke sisi yang lebih aman:
 * kesalahan perakitan menghasilkan pembatas yang terlalu rapat (terlihat, bisa
 * dilaporkan murid), bukan pembatas yang terlalu longgar (tidak terlihat sampai
 * tagihan datang).
 *
 * Kenapa ini TIDAK bisa dipalsukan klien:
 *   - satu-satunya cara mendapat `'header'` adalah mengirim `X-Fiezel-Edge`
 *     yang cocok dengan `EDGE_SHARED_SECRET` (dibanding waktu-konstan) DAN tiba
 *     di hostname `*.workers.dev`. Tanpa secret, header apa pun yang dikirim
 *     klien berakhir 403 — bukan tarif longgar;
 *   - di `api.fiezel.my.id`, `mw-edge.js` memeriksa hostname tepercaya LEBIH
 *     DULU, jadi permintaan yang menempelkan `X-Fiezel-Edge` (benar atau salah)
 *     tetap dicatat sebagai `'custom-domain'` -> tetap tarif KETAT. Header dari
 *     klien tidak bisa MENAIKKAN tarifnya;
 *   - berkas ini tidak pernah membaca `X-Fiezel-Edge`, `X-Forwarded-*`, atau
 *     header apa pun untuk memilih cabang. Satu-satunya header yang dibaca
 *     adalah `CF-Connecting-IP` (dan `X-Real-IP` untuk harness) — dan itu hanya
 *     untuk KUNCI ember, bukan untuk tarif. `tests/rate-anon-test.js` butir (a)
 *     memindai hal ini dari kode + membuktikannya lewat permintaan nyata.
 *
 * ==========================================================================
 * DUA TARIF DAN ANGKANYA — DENGAN HITUNGAN, BUKAN SELERA
 * ==========================================================================
 * (1) `ANON_ISSUE_LIMIT_DEFAULT = 15` per IP per JAM BERGULIR — jalur langsung
 *     (custom domain). Dari mana 15:
 *       - satu murid, keadaan normal: 1 penerbitan per 180 hari (umur cookie).
 *       - satu murid, keadaan berat yang MASIH sah: 2 perangkat x (1 pasang
 *         pertama + 1 hapus cookie/jendela pribadi) + 1 percobaan ulang jaringan
 *         = 5 penerbitan/jam. Itu batas atas satu ORANG.
 *       - satu keluarga di satu NAT rumah: 3 anak x 2 perangkat, semua memasang
 *         di jam yang sama = 6; dengan satu-dua percobaan ulang = 8.
 *       - 15 = ~3x kasus satu murid terberat dan ~2x kasus keluarga terberat.
 *         Kepala keluarga mana pun tidak menyentuhnya.
 *     Efek terhadap penyalahguna: 15/jam = 360 identitas/hari/IP, turun dari
 *     720/hari (tarif 30) dan dari TAK TERBATAS sebelum pembatas ada. 360 tulis
 *     D1 dari 100.000/hari plan gratis = 0,36%; ~50,8 B/baris (docs/D1-CAPACITY
 *     §anon_issue) = ~18 KB/hari. Yang TIDAK ditutup angka ini adalah panen
 *     jatah AI — itu tugas lapisan kedua (`ai/ai-account-budget.js`), lihat bab
 *     LAPISAN KEDUA.
 *     KASUS KELAS, dan ini diakui apa adanya: satu kelas 36 murid yang onboarding
 *     BERSAMAAN di satu wifi sekolah akan melihat 429 mulai murid ke-16.
 *     Kenapa itu tetap dipilih, bukan angka 40 yang "aman untuk kelas":
 *       - pelajaran FIEZEL LOKAL semuanya (bab 1: server bukan sumber kebenaran
 *         progres). 429 di penerbitan identitas menunda AI/TTS untuk murid itu,
 *         TIDAK memblokir belajar — jadi harga salah-ketat di sini kecil dan
 *         terbatas waktu, sementara harga salah-longgar adalah tagihan akun;
 *       - jendelanya BERGULIR (bab berikut): murid ke-16 lolos ~10 menit
 *         kemudian, bukan "jam depan";
 *       - untuk sesi kelas yang TERJADWAL, owner menaikkan
 *         `ANON_ISSUE_LIMIT_PER_HOUR="60"` sebelum sesi dan MENGHAPUSNYA sesudah
 *         (perintahnya di `reports/work-s1-auth-anon.md`). Var, bukan default:
 *         keadaan longgar harus disengaja dan berjejak;
 *       - jalan keluar yang benar dan permanen adalah membuktikan manusia
 *         (Turnstile) atau WAF rate-rule per-ASN, bukan menaikkan default untuk
 *         semua orang selamanya.
 * (2) `ANON_ISSUE_LIMIT_BRIDGE_DEFAULT = 30` per jam — CABANG CADANGAN, dipakai
 *     HANYA saat `ctx.edgePath === 'header'`. Ia DIPERTAHANKAN, bukan dihapus,
 *     karena `deploy/edge/` masih ada sebagai jalur cadangan: proxy PHP
 *     (`deploy/edge/api-index.php`) SENGAJA tidak meneruskan IP murid (keputusan
 *     privasi di berkas itu), jadi bila lalu lintas kembali lewat sana SEMUA
 *     murid tampak sebagai SATU IP dan tarif 15 akan mematikan onboarding
 *     seluruh sekolah sekaligus. 30/jam di cabang itu bukan batas per-murid —
 *     ia anggaran penerbitan GLOBAL (maks 720 identitas/hari). Granularitas
 *     per-murid di belakang jembatan MUSTAHIL tanpa meneruskan IP.
 * (3) `ANON_ISSUE_LIMIT_DEGRADED_DEFAULT = 5` — dipakai saat D1 tidak bisa
 *     dibaca; lihat bab KEPUTUSAN D1 GAGAL.
 * Nilai `<= 0` pada var mematikan pembatas secara eksplisit (jangan lakukan di
 * produksi). Penghitungnya BUKAN compare-and-swap (baca-lalu-tulis), jadi dua
 * permintaan serentak bisa sedikit melewati batas — batas ini rem banjir, bukan
 * invarian akuntansi.
 *
 * ==========================================================================
 * JENDELA BERGULIR, BUKAN RESET DI MENIT KE-0
 * ==========================================================================
 * Versi sebelumnya memakai ember `floor(now / 1 jam)`: penghitungnya nol lagi
 * tepat di menit ke-0. Artinya penyerang cukup MENUNGGU pergantian jam untuk
 * mendapat kuota penuh lagi, dan dua ember berdampingan memberi 2x batas dalam
 * dua menit (23:59 + 00:00). Itu tidak diterima, dan tidak perlu diterima.
 *
 * Yang dipakai sekarang: 6 ember 10 menit (`BUCKET_MS`), dan keputusan memakai
 * JUMLAH 6 ember terakhir (`WINDOW_BUCKETS`) — jendela bergulir bergranularitas
 * 10 menit. Kenapa bukan jendela kontinu sempurna: itu menuntut satu baris per
 * penerbitan (stempel waktu per kejadian) = tabel yang tumbuh tanpa batas +
 * purge berkala, dan itu justru pola biaya yang tabel ini dirancang untuk
 * dihindari. Kesalahan yang tersisa terukur dan berpihak ke murid: paling
 * banyak selebar satu ember (10 menit) kelebihan izin, dan TIDAK ADA lagi titik
 * reset yang bisa ditunggu.
 *
 * Bentuk kunci ember: `YYYY-MM-DDThh:m0` (UTC, menit dibulatkan ke bawah ke 10).
 * Sengaja lebar-tetap dan berawalan TANGGAL supaya perbandingan leksikografis
 * `WHERE day < :cutoff_day` di cron retensi (`docs/D1-RETENTION.md` §2.3) benar
 * apa adanya — bentuk lama (`h0000472...`) tidak pernah bisa dibandingkan dengan
 * tanggal, jadi SQL retensi yang terdokumentasi itu sebenarnya tidak pernah
 * mengenai satu baris pun. Baris berbentuk lama tetap terhapus lebih dulu
 * (`'h' > '2'` -> ia tidak lolos filter `<`; barisnya kedaluwarsa sendiri karena
 * tidak pernah dibaca lagi, dan cron menghapusnya saat cutoff melewati 'h').
 *
 * ==========================================================================
 * KUNCI PENGHITUNG: HMAC(IP) BERSALT HARIAN, BUKAN IP MENTAH
 * ==========================================================================
 * IP mentah tidak pernah disimpan dan tidak pernah dicatat (kontrak privasi:
 * `ip` ada di PII_FORBIDDEN_KEYS). `ip_hmac` = HMAC-SHA256(salt,
 * "<indeks-hari>|<ip>") dipotong 128 bit — indeks hari ikut ditandatangani
 * supaya hash TIDAK bisa dipakai melacak orang antar hari, mengikuti komentar
 * desain tabelnya di `0001_identity.sql`.
 *
 * SALT-nya `RATE_SALT` (nama yang sama dengan yang dipakai rem analytics,
 * `analytics/route-events.js:rateKey`) supaya satu nama secret mengurus semua
 * kunci rem laju, lalu `IDENTITY_PEPPER` sebagai kompatibilitas ke belakang
 * (dia yang dipakai versi lama; deploy yang belum memasang `RATE_SALT` tidak
 * boleh mendadak kehilangan ember lamanya), lalu garam konstanta sebagai lantai
 * terakhir — masih hash satu arah, hanya tidak ber-secret. Pasang secret-nya.
 *
 * ==========================================================================
 * KEPUTUSAN: APA YANG TERJADI KALAU PEMBACAAN PEMBATAS GAGAL (D1 GALAT)
 * ==========================================================================
 * Pilihannya nyata dan dua-duanya menyakitkan:
 *   - FAIL-CLOSED murni (tolak semua penerbitan saat D1 tersendat): murid yang
 *     baru memasang aplikasi tidak bisa mendapat identitas justru saat sistem
 *     sedang stres. Ia tidak kehilangan pelajaran (semua pelajaran lokal), tapi
 *     ia kehilangan AI/TTS tanpa sebab yang bisa ia perbaiki sendiri.
 *   - FAIL-OPEN murni (lewatkan pembatas saat D1 galat): pembatasnya hilang
 *     TEPAT saat paling dibutuhkan, dan penyerang bisa MEMBUAT keadaan itu
 *     (banjiri D1 -> D1 melempar -> pembatas menghilang). Itu mengubah
 *     kerusakan menjadi kunci pembuka.
 * YANG DIPILIH: **fail-closed terhadap PEMBATAS, tidak pernah fail-open** —
 * pembatasnya TIDAK PERNAH menghilang. Saat D1 tidak bisa dibaca, penghitung
 * jatuh ke ember per-isolate DENGAN BATAS YANG DIPERKETAT ke
 * `ANON_ISSUE_LIMIT_DEGRADED_DEFAULT` (5, dan selalu <= batas normal). Jadi:
 * penerbitan TETAP MUNGKIN (ketersediaan belajar menang), tetapi hilangnya
 * presisi lintas-isolate DIBAYAR dengan batas yang lebih rapat, bukan dengan
 * membuka pintu.
 *
 * Preseden repo, dan posisi pilihan ini terhadapnya:
 *   - `ai/ai-account-budget.js` FAIL-CLOSED KERAS (tanpa hitungan, jalur berbayar
 *     tidak dibuka). Berbeda dari sini SECARA SENGAJA: yang di sana adalah pipa
 *     BIAYA (neuron yang ditagih Cloudflare), yang di sini adalah pintu MASUK
 *     murid. Menutup pipa biaya menunda satu jawaban AI; menutup pintu masuk
 *     memutus murid dari fiturnya sama sekali.
 *   - `mw-edge.js` FAIL-CLOSED saat secret belum dipasang — soal KONFIGURASI
 *     (bisa diperbaiki owner dalam satu perintah), bukan soal kegagalan runtime
 *     yang lewat sendiri.
 *   - `quota/quota-store-d1.js` menolak dengan `store_unavailable` saat lease
 *     gagal; `route-ai.js` menerjemahkan `quota_unavailable` menjadi mode hemat,
 *     bukan 500.
 *   - versi SEBELUM commit ini di berkas ini sendiri: jatuh ke Map per isolate
 *     dengan batas SAMA. Arahnya sama dengan pilihan sekarang, tetapi tanpa
 *     pengetatan — dan tanpa pengetatan, "jatuh ke memori" adalah fail-open yang
 *     dinamai lain (setiap isolate mendapat ember penuhnya sendiri, jadi batas
 *     efektifnya = batas x jumlah isolate). Itu yang diperbaiki di sini.
 *
 * ==========================================================================
 * LAPISAN KEDUA (dan kenapa lapisan ini SAJA tidak cukup)
 * ==========================================================================
 * Batas per-IP tidak menutup serangan TERSEBAR: 1.000 IP x 15 = 15.000
 * identitas/jam, dan tiap IP terlihat sah. Yang harus mengikat di situ adalah
 * plafon neuron TINGKAT AKUN (`workers/api/ai/ai-account-budget.js` +
 * `migrations/0005_ai_account_budget.sql`), karena ia menghitung di dimensi yang
 * dibayar (neuron per AKUN per hari), bukan per identitas. Berkas AI itu MILIK
 * PAKET LAIN dan TIDAK disentuh dari sini; hasil verifikasi + celah yang
 * ditemukan ditulis di `reports/work-s1-auth-anon.md`, dan `tests/rate-anon-test.js`
 * butir (g) meng-assert pengikatannya dari luar (nol edit).
 *
 * ==========================================================================
 * JITTER RESPONS
 * ==========================================================================
 * `anonJitter()` menunda respons rute anon 0..`ANON_JITTER_MAX_MS` (default
 * 150 ms, acak). Dua tujuan: (1) loop pemanen identitas tidak bisa memakai
 * waktu respons yang rata untuk memaksimalkan laju; (2) perbedaan waktu antara
 * "terbit" / "cookie stabil" / "ditolak" jadi lebih sulit dijadikan oracle.
 * `Math.random` di sini BUKAN untuk nilai keamanan (bukan token/secret) —
 * hanya penundaan; token identitas tetap `crypto.randomUUID()` di
 * `mw-identity.js`. DIPERTAHANKAN apa adanya; `tests/rate-anon-test.js` butir (c)
 * menjaganya tetap ada dan tetap dipanggil untuk SEMUA respons rute anon.
 */

import { jsonError, ERR } from './errors.js';
import { hmacHex, truncate128 } from './util-hmac.js';

const DAY_MS = 86400000;

/** Lebar satu ember dan jumlah ember dalam jendela. 6 x 10 menit = 1 jam. */
export const BUCKET_MS = 600000;
export const WINDOW_BUCKETS = 6;

export const ANON_ISSUE_LIMIT_DEFAULT = 15;
export const ANON_ISSUE_LIMIT_BRIDGE_DEFAULT = 30;
export const ANON_ISSUE_LIMIT_DEGRADED_DEFAULT = 5;
export const ANON_JITTER_MAX_MS_DEFAULT = 150;

/**
 * `Retry-After` KONSTANTA (detik) = lebar satu ember. Ini keputusan anti-oracle,
 * bukan pembulatan: nilai yang dihitung dari ember TERTUA milik IP ini akan
 * memberi tahu penyerang KAPAN ia terakhir berhasil terbit, dan itu persis
 * informasi "apakah IP ini pernah terbit sebelumnya" yang amplop 429 tidak boleh
 * bocorkan. Satu ember juga jawaban yang JUJUR: sesudah 10 menit, ember tertua
 * keluar dari jendela dan percobaan berikutnya memang bisa lolos.
 */
export const RETRY_AFTER_S = BUCKET_MS / 1000;

/** Nilai `ctx.edgePath` (dari `mw-edge.js`) yang berarti "lewat jembatan PHP". */
export const BRIDGE_EDGE_PATH = 'header';

/** Garam fallback terakhir bila `RATE_SALT`/`IDENTITY_PEPPER` belum dipasang.
 *  BUKAN secret — hanya memastikan IP tidak pernah tersimpan mentah bahkan di
 *  mode degradasi. */
const FALLBACK_SALT = 'fiezel-anon-issue-v1';

function limitNumber(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

/**
 * Jalur yang dipakai permintaan ini, dari sudut pandang TARIF. Dibaca dari
 * `ctx.edgePath` yang ditulis `mw-edge.js` — BUKAN dari header klien, BUKAN dari
 * ada/tidaknya Secret di env. Segala nilai selain `'header'` = 'direct'.
 */
export function anonIssuePathOf(ctx) {
  const seen = ctx && typeof ctx.edgePath === 'string' ? ctx.edgePath : '';
  return seen === BRIDGE_EDGE_PATH ? 'bridge' : 'direct';
}

/**
 * Batas untuk permintaan ini. `ctx` (bukan `env`) sengaja menjadi parameternya:
 * keputusan tarif bergantung pada JALUR permintaan, dan jalur hanya ada di ctx.
 */
export function anonIssueLimit(ctx) {
  const env = (ctx && ctx.env) || {};
  if (anonIssuePathOf(ctx) === 'bridge') {
    return limitNumber(env.ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR, ANON_ISSUE_LIMIT_BRIDGE_DEFAULT);
  }
  return limitNumber(env.ANON_ISSUE_LIMIT_PER_HOUR, ANON_ISSUE_LIMIT_DEFAULT);
}

/**
 * Batas mode degradasi (D1 tidak bisa dibaca). SELALU <= batas normal: mode
 * yang kehilangan presisi tidak boleh mendapat izin lebih besar.
 */
export function anonIssueDegradedLimit(ctx) {
  const env = (ctx && ctx.env) || {};
  const normal = anonIssueLimit(ctx);
  const degraded = limitNumber(env.ANON_ISSUE_LIMIT_DEGRADED_PER_HOUR, ANON_ISSUE_LIMIT_DEGRADED_DEFAULT);
  if (normal <= 0) return normal; // pembatas dimatikan eksplisit: tetap mati
  return Math.max(1, Math.min(normal, degraded));
}

/** IP pemanggil sebagaimana terlihat Cloudflare. 'noip' untuk harness/lokal.
 *  Nilai ini HANYA masuk `ipHmacOf()`; ia tidak pernah dicatat, dikembalikan ke
 *  klien, atau di-bind ke pernyataan D1. */
export function clientIpOf(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
  return ip.trim() || 'noip';
}

/**
 * Kunci ember: `YYYY-MM-DDThh:m0` UTC. Lebar tetap + berawalan tanggal supaya
 * bisa dibandingkan leksikografis oleh cron retensi (`WHERE day < :cutoff_day`).
 */
export function bucketKey(nowMs) {
  const floored = Math.floor(Number(nowMs) / BUCKET_MS) * BUCKET_MS;
  const iso = new Date(floored).toISOString(); // '2026-08-28T09:50:00.000Z'
  return iso.slice(0, 16);                     // '2026-08-28T09:50'
}

/** Ember jendela bergulir: ember sekarang + (WINDOW_BUCKETS-1) sebelumnya. */
export function windowKeys(nowMs) {
  const keys = [];
  for (let i = 0; i < WINDOW_BUCKETS; i += 1) keys.push(bucketKey(Number(nowMs) - i * BUCKET_MS));
  return keys;
}

/** Salt kunci rem. Urutan sengaja; lihat bab KUNCI PENGHITUNG. */
export function rateSaltOf(env) {
  const rate = env && typeof env.RATE_SALT === 'string' ? env.RATE_SALT.trim() : '';
  if (rate) return rate;
  const pepper = env && typeof env.IDENTITY_PEPPER === 'string' ? env.IDENTITY_PEPPER.trim() : '';
  if (pepper) return pepper;
  return FALLBACK_SALT;
}

async function ipHmacOf(env, ip, nowMs) {
  // Indeks hari ikut ditandatangani: hash hari ini != hash besok untuk IP yang
  // sama, jadi tabel ini tidak bisa dipakai melacak orang antar hari
  // (komentar desain anon_issue di migrations/0001_identity.sql).
  return truncate128(await hmacHex(rateSaltOf(env), Math.floor(nowMs / DAY_MS) + '|' + ip));
}

/** SQL di satu tempat supaya gerbang skema/kontrak bisa mencocokkannya. */
export const ANON_SQL = Object.freeze({
  // Jendela bergulir dalam SATU pernyataan: 6 pencarian kunci utama
  // (PK `(day, ip_hmac)`), bukan pemindaian rentang.
  windowRead:
    'SELECT issued FROM anon_issue WHERE day IN (?1, ?2, ?3, ?4, ?5, ?6) AND ip_hmac = ?7',
  bump:
    'INSERT INTO anon_issue (day, ip_hmac, issued) VALUES (?1, ?2, 1) ' +
    'ON CONFLICT(day, ip_hmac) DO UPDATE SET issued = issued + 1'
});

/* Ember per isolate untuk MODE DEGRADASI saja (D1 tidak terbaca). Map kecil,
 * dipangkas tiap panggilan supaya tidak tumbuh di isolate berumur panjang. */
const memoryBuckets = new Map();

export function resetAnonRateLimitForTests() {
  memoryBuckets.clear();
}

function pruneMemory(nowMs) {
  const alive = new Set(windowKeys(nowMs));
  for (const key of memoryBuckets.keys()) {
    if (!alive.has(key.slice(0, 16))) memoryBuckets.delete(key);
  }
}

/**
 * Amplop 429. BENTUKNYA SAMA untuk setiap sebab (jendela penuh di jalur
 * langsung, jendela penuh di jalur jembatan, jendela penuh di mode degradasi),
 * dan TIDAK memuat satu pun nilai yang bergantung pada riwayat IP ini: tidak ada
 * `issued`, tidak ada `remaining`, tidak ada `limit`, tidak ada `resetAt`, dan
 * `retryAfter` adalah KONSTANTA. Penyerang tidak boleh bisa menyimpulkan apakah
 * IP-nya pernah berhasil terbit sebelumnya — kalau bisa, 429 menjadi alat
 * pemetaan gratis ("IP mana yang sudah dipakai murid").
 */
function rejectIssue(ctx) {
  return jsonError(429, ERR.RATE_LIMITED, { retryAfter: RETRY_AFTER_S }, {
    headers: { ...((ctx && ctx.corsHeaders) || {}), 'retry-after': String(RETRY_AFTER_S) }
  });
}

/**
 * Gerbang penerbitan. Panggil HANYA pada jalur yang akan menerbitkan identitas
 * baru (bukan pada panggilan ber-cookie sah). Mengembalikan Response 429 =
 * tolak; `null` = penerbitan boleh jalan (dan sudah terhitung).
 */
export async function anonIssueGate(ctx) {
  const limit = anonIssueLimit(ctx);
  if (limit <= 0) return null; // dimatikan eksplisit lewat var — bukan default
  const keys = windowKeys(ctx.now);
  const hashed = await ipHmacOf(ctx.env, clientIpOf(ctx.request), ctx.now);

  if (ctx.env.CORE_DB) {
    try {
      const read = await ctx.env.CORE_DB
        .prepare(ANON_SQL.windowRead)
        .bind(keys[0], keys[1], keys[2], keys[3], keys[4], keys[5], hashed)
        .all();
      const rows = (read && read.results) || [];
      let issued = 0;
      for (const row of rows) issued += Number(row && row.issued) || 0;
      if (issued >= limit) return rejectIssue(ctx); // penolakan: nol tulis
      await ctx.env.CORE_DB.prepare(ANON_SQL.bump).bind(keys[0], hashed).run();
      return null;
    } catch (_) {
      // D1 rusak / tabel belum termigrasi. TIDAK fail-open: pembatas tetap
      // berjalan di memori isolate dengan batas yang DIPERKETAT (lihat bab
      // KEPUTUSAN D1 GAGAL). Sebabnya tidak dicatat dengan IP apa pun.
    }
  }

  const degraded = anonIssueDegradedLimit(ctx);
  pruneMemory(ctx.now);
  let seen = 0;
  for (const key of keys) seen += memoryBuckets.get(key + ':' + hashed) || 0;
  if (seen >= degraded) return rejectIssue(ctx);
  const head = keys[0] + ':' + hashed;
  memoryBuckets.set(head, (memoryBuckets.get(head) || 0) + 1);
  return null;
}

/**
 * Jitter respons rute anon. Dipanggil untuk SEMUA respons rute itu (terbit,
 * stabil, maupun 429) supaya penundaan sendiri tidak menjadi oracle.
 * `ANON_JITTER_MAX_MS = "0"` mematikannya (harness yang butuh determinisme).
 */
export async function anonJitter(env) {
  const max = limitNumber(env && env.ANON_JITTER_MAX_MS, ANON_JITTER_MAX_MS_DEFAULT);
  if (max <= 0) return;
  const ms = Math.floor(Math.random() * (max + 1));
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}
