/**
 * workers/api/mw-edge.js — GERBANG JEMBATAN EDGE (`X-Fiezel-Edge`).
 *
 * ==========================================================================
 * MASALAH NYATA YANG DITUTUP BERKAS INI
 * ==========================================================================
 * Worker `fiezel-api` hidup di dua alamat sekaligus:
 *
 *   1. `https://api.fiezel.my.id`      — subdomain cPanel di origin ArenHost yang
 *      menjalankan proxy PHP (`deploy/edge/api-index.php`) dan meneruskan ke (2).
 *      Ini jalur yang dipakai murid, dan satu-satunya jalur yang membuat cookie
 *      identitas `fz_id` tetap PIHAK PERTAMA di `fiezel.my.id`.
 *   2. `https://fiezel-api.fitrajft.workers.dev` — alamat asal Worker.
 *
 * Alamat (2) TIDAK bisa dimatikan selama (1) masih menjadi jembatan: proxy PHP
 * memanggilnya. Tetapi selama ia terbuka tanpa syarat, siapa pun bisa memanggil
 * `POST /api/auth/anon` langsung ke sana, MELEWATI jembatan, dan menerbitkan
 * identitas anonim tanpa batas. Itu bukan kerugian teoretis: setiap penerbitan
 * menulis baris ke D1 (`identity`, `anon_issue`), dan setiap identitas baru
 * membawa jatah gratisnya sendiri (AI/TTS). Artinya alamat (2) yang terbuka =
 * pintu untuk menguras kuota gratis akun DAN mengisi D1 plan gratis.
 *
 * Karena itu: proxy PHP mengirim `X-Fiezel-Edge: <secret>` pada SETIAP
 * permintaan, dan berkas ini menolak permintaan yang tidak membawanya.
 *
 * ==========================================================================
 * KENAPA GERBANG INI PALING LUAR (SEBELUM CORS/ORIGIN DAN IDENTITAS)
 * ==========================================================================
 * Penyerang yang memanggil `*.workers.dev` langsung tidak mengirim `Origin`
 * sama sekali, jadi `originGate` MELOLOSKANNYA dengan sengaja (permintaan
 * non-browser / same-origin). Gerbang origin memang tidak dirancang untuk
 * masalah ini. Jadi satu-satunya tempat yang benar adalah SEBELUM apa pun yang
 * menyentuh D1/KV — supaya biaya penolakan tetap nol tulis, nol baca.
 *
 * ==========================================================================
 * KEADAAN `off` — SAH HANYA SELAMA MASA TRANSISI
 * ==========================================================================
 * Kalau Secret `EDGE_SHARED_SECRET` TIDAK terpasang, gerbang ini TIDAK menolak
 * apa pun; ia hanya mencatat peringatan dan `/health` melaporkan
 * `edgeGuard:"off"`.
 *
 * Itu keputusan sadar, dan batasnya harus dibaca sebagai batas keras:
 *   - `off` ada SEMATA supaya `wrangler deploy` yang dijalankan owner sebelum
 *     `wrangler secret put EDGE_SHARED_SECRET` tidak langsung mematikan seluruh
 *     API murid dengan 403 di setiap rute. Fail-closed pada deploy pertama akan
 *     membuat orang berikutnya mengira Worker-nya rusak, lalu ia akan mencabut
 *     gerbang ini — hasil akhirnya lebih tidak aman, bukan lebih aman.
 *   - `off` BUKAN mode produksi. Selama `off`, alamat `*.workers.dev` masih
 *     terbuka lebar dan kerentanan yang dijelaskan di atas MASIH ADA.
 *   - `off` HARUS berakhir di dua titik: (i) segera setelah secret dipasang, dan
 *     (ii) selamanya setelah nameserver `fiezel.my.id` pindah ke Cloudflare, saat
 *     custom domain menggantikan jembatan PHP dan `workers_dev = false`
 *     mematikan alamat (2). Sesudah titik (ii), MODE `off` TIDAK PUNYA ALASAN
 *     HIDUP LAGI dan berkas ini boleh menolak tanpa syarat.
 * Jangan menormalkan `off`. Kalau `/health` masih menjawab `edgeGuard:"off"`
 * seminggu setelah deploy, itu temuan, bukan konfigurasi.
 *
 * ==========================================================================
 * JALUR BEBAS-HEADER: `/healthz` SAJA — `/health` TETAP DILINDUNGI
 * ==========================================================================
 * Pertanyaannya nyata: monitor eksternal (UptimeRobot dsb.) tidak bisa
 * mengirim header rahasia, jadi harus ada satu jalur yang boleh tanpa header.
 * Kandidatnya `/health`. DITOLAK, alasannya bisa diperiksa:
 *   - `/health` mengumumkan `capabilities`, `aiGateway`, `version`, `service`,
 *     dan `plan`. Itu peta permukaan serang: ia memberi tahu penyerang fitur
 *     mana yang hidup (`context-coach-v1`, `alrs`, ...) tanpa ia perlu menebak.
 *     Membebaskan `/health` berarti membocorkan peta itu ke publik selamanya.
 *   - Monitor tidak butuh peta itu. Monitor butuh satu bit: hidup atau mati.
 * Jadi `/healthz` ada: HANYA `{ok:true,protocol:"1.7"}`, nol baca D1/KV, nol
 * kapabilitas, nol nama layanan, nol waktu server. `protocol` tetap ada karena
 * monitor yang berguna harus bisa melihat protokol yang salah, dan angka itu
 * sudah publik di klien.
 *
 * Konsekuensi yang diterima sadar: `/healthz` bisa dipakai memetakan bahwa
 * Worker ini ada. Itu sudah diketahui siapa pun yang membuka aplikasi. Yang
 * TIDAK bocor adalah daftar fitur.
 *
 * Preflight `OPTIONS` juga tidak lewat gerbang ini (ia dijawab `index.js`
 * sebelum rantai middleware). Itu benar dan tidak melemahkan apa pun: proxy PHP
 * menjawab preflight sendiri, jadi preflight ke Worker hanya datang dari klien
 * yang salah alamat — dan permintaan sungguhannya tetap kena 403.
 */

import { jsonError } from './errors.js';

/** Nama header yang dikirim proxy PHP. Satu sumber kebenaran. */
export const EDGE_HEADER = 'x-fiezel-edge';

/**
 * Path yang boleh diakses TANPA header jembatan. Daftar ini SENGAJA sesempit
 * mungkin dan setiap penambahan wajib punya alasan tertulis: setiap path di
 * sini adalah permukaan yang terbuka di `*.workers.dev`.
 */
export const EDGE_FREE_PATHS = Object.freeze(['/healthz']);

/**
 * Perbandingan waktu-konstan. Cermin `ctEq()` di `workers/owner/index.js:65`
 * (pola yang sudah dipakai repo untuk digest token owner), disalin dan BUKAN
 * diimpor karena `workers/owner` adalah Worker terpisah dengan graf modul
 * sendiri — `workers/api` tidak boleh mengimpor lintas Worker.
 *
 * Kenapa bukan operator kesetaraan biasa: perbandingan string berhenti pada
 * byte pertama yang berbeda, jadi waktu eksekusinya membocorkan panjang prefiks
 * yang cocok. Dengan header yang bisa dikirim berulang kali tanpa batas, itu
 * cukup untuk menebak secret byte demi byte. Panjang yang berbeda pun tetap
 * dijalankan sampai habis di sini.
 *
 * TIDAK ADA satu pun operator kesetaraan langsung yang diterapkan pada nilai
 * rahasia di berkas ini — `edge-guard-test.js` butir (d) memindai itu.
 */
export function ctEq(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a == null ? '' : a));
  const y = enc.encode(String(b == null ? '' : b));
  const len = Math.max(x.length, y.length, 1);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i += 1) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

/** Secret yang terpasang, sudah dirapikan. String kosong dianggap tidak ada. */
export function edgeSecret(env) {
  const raw = env && env.EDGE_SHARED_SECRET;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Status gerbang untuk `/health`. Dua nilai saja, dan keduanya JUJUR:
 *   'on'  = setiap permintaan (kecuali `EDGE_FREE_PATHS`) wajib berheader benar.
 *   'off' = secret belum dipasang; Worker berjalan seperti sebelum gerbang ada.
 * `/health` sendiri hanya bisa dibaca lewat jembatan saat 'on', jadi nilai ini
 * bukan oracle publik.
 */
export function edgeGuardStatus(env) {
  return edgeSecret(env) ? 'on' : 'off';
}

/**
 * Peringatan `off` dicatat lewat jalur log Worker yang sudah dipakai
 * `index.js` (`console.warn`/`console.error` -> `wrangler tail` /
 * Workers Observability). Sekali per isolate, BUKAN sekali per permintaan:
 * satu baris log per permintaan adalah cara paling cepat membuat owner
 * mematikan observability, dan owner yang mematikan log tidak akan melihat
 * peringatan apa pun lagi.
 */
let warnedThisIsolate = false;

export function resetEdgeWarningForTests() {
  warnedThisIsolate = false;
}

function warnGuardOff() {
  if (warnedThisIsolate) return;
  warnedThisIsolate = true;
  console.warn(
    'fiezel-api edgeGuard=off — EDGE_SHARED_SECRET belum dipasang. ' +
    'Alamat *.workers.dev TERBUKA dan bisa dipakai menerbitkan identitas anonim tanpa lewat jembatan. ' +
    'Jalankan: wrangler secret put EDGE_SHARED_SECRET. Keadaan ini hanya sah selama masa transisi.'
  );
}

/**
 * Bentuk galat penolakan. SATU bentuk untuk semua sebab (header tidak ada,
 * header salah), mengikuti aturan anti-oracle `errors.js`: penyerang tidak boleh
 * bisa membedakan "secret terpasang tapi punyamu salah" dari "kamu tidak
 * mengirim apa pun". Ia juga tidak boleh bisa menyimpulkan apakah secret
 * terpasang — karena itu jawaban saat guard `off` tidak pernah 403 SEKALIGUS
 * jawaban saat guard `on` tidak pernah menyebut nama header, nama secret, atau
 * nama alamat jembatan.
 *
 * Bentuknya lahir dari `errors.js` (`jsonError`), bukan dirakit di sini: satu
 * tabel bentuk galat adalah aturan keras repo ini, dan gerbang jembatan tidak
 * boleh menjadi pengecualian yang mengembalikan amplop berbeda.
 *
 * `forbidden_edge` dipilih (bukan `forbidden_origin`) supaya log owner bisa
 * memisahkan dua sebab penolakan yang sangat berbeda tanpa memberi tahu klien
 * apa pun lebih dari satu kata.
 */
export const ERR_EDGE = 'forbidden_edge';

/**
 * Middleware [M-1] — dijalankan PALING LUAR, sebelum CORS/origin dan identitas.
 * Mengembalikan Response = permintaan ditolak; `null` = lanjut.
 *
 * Nol I/O: tidak ada baca D1, tidak ada baca KV, tidak ada `await`. Penolakan
 * di plan gratis harus lebih murah daripada serangan yang memicunya.
 */
export function edgeGuardMiddleware(ctx) {
  const configured = edgeSecret(ctx.env);
  if (!configured) {
    warnGuardOff();
    return null;
  }
  if (EDGE_FREE_PATHS.includes(ctx.pathname)) return null;

  const presented = ctx.request.headers.get(EDGE_HEADER);
  if (ctEq(presented, configured)) return null;

  // Bentuk galat sopan + header CORS: klien yang salah alamat tetap harus bisa
  // membaca body-nya, kalau tidak browser menampilkan "network error" alih-alih
  // pesan FIEZEL (aturan bab 12 yang sama seperti `mw-guard.js`).
  const headers = Object.assign({ vary: 'Origin' }, ctx.corsHeaders || {});
  return jsonError(403, ERR_EDGE, { message: 'Permintaan ini harus lewat alamat resmi FIEZEL.' }, { headers });
}
