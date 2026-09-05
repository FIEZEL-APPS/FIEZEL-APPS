/**
 * tests/edge-proxy-hopbyhop-test.js — GERBANG cacat F4: "permintaan ke-3 menggantung".
 *
 * ==========================================================================
 * CACAT YANG MELAHIRKAN GERBANG INI (terukur, bukan dugaan)
 * ==========================================================================
 * Gerbang E2E BROWSER (`tools/fiezel-e2e-bridge.mjs`, skenario `bridge-hop-stable`)
 * menembak `/api/quota` BERUNTUN dari satu halaman pada SATU koneksi dan mengukur:
 *
 *     #1 200 1853ms | #2 200 943ms | #3 TIMEOUT 8002ms
 *
 * Reproducible dari halaman kosong, pada HTTP/2 MAUPUN HTTP/1.1, dan TIDAK terlihat
 * oleh `curl` (satu proses curl = satu koneksi baru; ia tidak pernah menganyam tiga
 * permintaan di atas satu koneksi keep-alive seperti browser). Aplikasi murid yang
 * menembak `/api/config` -> `/api/user/me` -> `/api/quota` berurutan MENGGANTUNG pada
 * panggilan ketiga. Itu pemblokir rollout, bukan catatan kecil.
 *
 * ==========================================================================
 * APA YANG BISA DAN TIDAK BISA DIBUKTIKAN GERBANG INI — DIBACA DULU
 * ==========================================================================
 * Gerbang ini node MURNI, NOL jaringan, nol berkas temporer. Ia memuat kedua sumber
 * PHP jembatan sebagai TEKS dan meng-assert STRUKTURNYA. Itu berarti:
 *
 *   YANG DIBUKTIKAN: kelas kesalahan yang MEMANG hidup di kode — header hop-by-hop
 *   yang diteruskan, batas kesabaran cURL yang lebih panjang dari kesabaran klien,
 *   lock sesi PHP yang tidak dilepas, `Content-Length` upstream yang diteruskan
 *   mentah, badan yang tidak ditulis-sekali-lalu-di-flush, dan nilai rahasia yang
 *   ter-commit.
 *
 *   YANG TIDAK DIBUKTIKAN: bahwa cacat F4 SUDAH TERTUTUP. Itu hanya bisa dibuktikan
 *   dengan menjalankan ULANG gerbang E2E browser terhadap jembatan yang sudah
 *   DIUNGGAH ke origin (deploy/edge/README.md §5e). Hipotesis 5 (batas proses PHP
 *   per pengguna cPanel, `LSAPI_CHILDREN`/entry process) TIDAK BISA dinilai dari
 *   teks sama sekali — gerbang ini hanya menuntut kode melepas slot prosesnya
 *   secepat mungkin, dan mengatakan sejujurnya bahwa sisanya di luar jangkauannya.
 *
 * Analisis kode tidak pernah menutup cacat runtime. Gerbang ini mencegah cacat itu
 * KEMBALI lewat sunting berikutnya, dan itu pekerjaan yang berbeda.
 *
 * ==========================================================================
 * BUTIR YANG DI-ASSERT (untuk KEDUA berkas: api-index.php dan owner-index.php)
 * ==========================================================================
 * (a) Daftar hop-by-hop dibuang DUA ARAH (naik ke upstream dan turun ke klien).
 * (b) Timeout cURL diset eksplisit, dan angkanya masuk akal terhadap batas 8 detik
 *     yang membuat browser menyerah (proxy WAJIB kalah lebih dulu).
 * (c) Tidak ada `session_start()` tanpa `session_write_close()`.
 * (d) `Content-Length` tidak pernah diteruskan mentah dari hulu.
 * (e) `__EDGE_SECRET__` tetap placeholder dan nilai sungguhan tidak pernah ter-commit.
 * (f) Badan respons ditulis SEKALI lalu di-flush (tambahan; ia satu paket dengan (d)).
 *
 * Setiap detektor DIBUKTIKAN BISA MERAH lewat matriks racun di bawah: pelanggaran
 * disuntikkan ke salinan DI MEMORI, dan gerbang menuntut detektor yang bersangkutan
 * menyala. Berkas di repo tidak pernah disentuh.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */

'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const FILES = {
  api: path.join(ROOT, 'deploy', 'edge', 'api-index.php'),
  owner: path.join(ROOT, 'deploy', 'edge', 'owner-index.php')
};
const E2E_PATH = path.join(ROOT, 'tools', 'fiezel-e2e-bridge.mjs');

const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

function mustRead(absolute, label) {
  if (!fs.existsSync(absolute)) throw new Error('berkas wajib tidak ada: ' + label);
  return fs.readFileSync(absolute, 'utf8');
}

/**
 * Buang komentar PHP TETAPI pertahankan jumlah baris. Alasannya sama seperti di
 * `tests/edge-proxy-contract-test.js`: kedua berkas MENJELASKAN nama header dan nama fungsi
 * di dalam komentar (mis. "jangan pernah meneruskan Transfer-Encoding"), dan detektor
 * yang membaca komentar akan menghukum dokumentasi yang benar.
 */
function stripPhpComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  out = out.replace(/^\s*#[^\n]*/gm, (m) => ' '.repeat(m.length));
  return out;
}

/* Header yang menurut RFC 9110 §7.6.1 milik SATU hop. `content-length` bukan
 * hop-by-hop menurut RFC, tetapi ia MASUK daftar wajib-buang di sini karena
 * alasan F4 yang konkret: panjang hitungan upstream tidak berlaku lagi sesudah hop
 * PHP (dekompresi, buffer, kompresi ulang lapisan web), dan panjang yang lebih besar
 * dari byte yang benar-benar terkirim membuat browser menunggu sisa yang tidak ada —
 * lalu permintaan BERIKUTNYA di koneksi keep-alive itu ikut menggantung. */
const REQUIRED_HOP_NAMES = ['connection', 'keep-alive', 'transfer-encoding', 'te',
  'trailer', 'upgrade', 'content-length'];
const REQUIRED_PROXY_NAMES = ['proxy-authenticate', 'proxy-authorization', 'proxy-connection'];

/* =======================================================================
 * DETEKTOR — satu fungsi per klaim, supaya matriks racun bisa memanggil
 * detektor yang SAMA atas sumber yang sudah dilanggar.
 * ===================================================================== */
const DETECT = {
  /** (a1) Daftar hop-by-hop ada dan memuat setiap nama yang wajib. */
  hopListComplete(php) {
    const m = /const\s+HOP_BY_HOP\s*=\s*\[([\s\S]*?)\];/.exec(php);
    if (!m) return false;
    const names = (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, '').toLowerCase());
    return [...REQUIRED_HOP_NAMES, ...REQUIRED_PROXY_NAMES].every((n) => names.includes(n));
  },

  /** (a2) Helper `hopByHop()` ada, tidak peka huruf, dan memeriksa keluarga `proxy-*`. */
  hopHelperSound(php) {
    const m = /function\s+hopByHop\s*\(\s*string\s+\$name\s*\)\s*:\s*bool\s*\{([\s\S]*?)\n\}/.exec(php);
    if (!m) return false;
    const body = m[1];
    return /strtolower\s*\(/.test(body)
      && /in_array\s*\(\s*\$n\s*,\s*HOP_BY_HOP\s*,\s*true\s*\)/.test(body)
      && /str_starts_with\s*\(\s*\$n\s*,\s*'proxy-'\s*\)/.test(body);
  },

  /** (a3) ARAH NAIK: header yang dikirim ke upstream disaring hopByHop() SEBELUM curl. */
  hopFilteredUpstream(php) {
    const filterAt = php.search(/\$fwd\s*=\s*array_values\s*\(\s*array_filter\s*\(\s*\$fwd[\s\S]{0,220}hopByHop\s*\(/);
    const curlAt = php.indexOf('curl_init(');
    return filterAt > 0 && curlAt > filterAt;
  },

  /** (a4) ARAH TURUN: hopByHop() diperiksa SEBELUM allowlist $passThrough dan Set-Cookie. */
  hopFilteredDownstream(php) {
    const guardAt = php.search(/if\s*\(\s*hopByHop\s*\(\s*\$name\s*\)\s*\)\s*continue\s*;/);
    const passAt = php.search(/in_array\s*\(\s*\$name\s*,\s*\$passThrough\s*,\s*true\s*\)/);
    const cookieAt = php.search(/\$name\s*===\s*'set-cookie'/);
    return guardAt > 0 && passAt > guardAt && cookieAt > guardAt;
  },

  /** (a5) Sapuan terakhir: `header_remove()` atas seluruh daftar, tanpa syarat. */
  hopHeaderRemoved(php) {
    return /foreach\s*\(\s*HOP_BY_HOP\s+as\s+\$hopName\s*\)\s*\{\s*header_remove\s*\(\s*\$hopName\s*\)\s*;\s*\}/.test(php);
  },

  /** (a6) Tidak ada nama hop-by-hop yang diselipkan ke allowlist $passThrough. */
  passThroughClean(php) {
    const m = /\$passThrough\s*=\s*\[([\s\S]*?)\];/.exec(php);
    if (!m) return false;
    const names = (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, '').toLowerCase());
    return !names.some((n) => REQUIRED_HOP_NAMES.includes(n) || n.startsWith('proxy-'));
  },

  /** (a7) Tidak ada header hop-by-hop yang disusun tangan untuk dikirim ke upstream. */
  noHopHeaderComposed(php) {
    const lines = php.split('\n').filter((l) => /\$fwd\s*\[\s*\]\s*=|'(?:Connection|Keep-Alive|Upgrade|TE|Trailer|Transfer-Encoding|Proxy-[A-Za-z-]+|Content-Length)\s*:/i.test(l));
    return !lines.some((l) => /'(?:Connection|Keep-Alive|Upgrade|TE|Trailer|Transfer-Encoding|Proxy-[A-Za-z-]+|Content-Length)\s*:/i.test(l));
  },

  /** (b1) Batas total dan batas connect cURL diset EKSPLISIT (bukan default tak terlihat). */
  curlTimeoutsSet(php) {
    return /CURLOPT_TIMEOUT\s*=>\s*\$?[A-Za-z_][A-Za-z0-9_]*/.test(php)
      && /CURLOPT_CONNECTTIMEOUT\s*=>\s*[A-Za-z_$][A-Za-z0-9_]*/.test(php)
      && !/CURLOPT_TIMEOUT\s*=>\s*0\b/.test(php)
      && !/CURLOPT_CONNECTTIMEOUT\s*=>\s*0\b/.test(php);
  },

  /** (c) Nol `session_start()`; dan lock sesi dilepas tanpa syarat sebelum kerja jaringan. */
  sessionSafe(php) {
    const starts = (php.match(/\bsession_start\s*\(/g) || []).length;
    const closeAt = php.search(/session_write_close\s*\(\s*\)/);
    const curlAt = php.indexOf('curl_init(');
    if (starts > 0) {
      // Kalau sesi memang dimulai, ia HARUS ditutup sesudahnya dan sebelum upstream.
      const startAt = php.search(/\bsession_start\s*\(/);
      return closeAt > startAt && curlAt > closeAt;
    }
    return closeAt > 0 && /session_status\s*\(\s*\)\s*===\s*PHP_SESSION_ACTIVE/.test(php)
      && curlAt > closeAt;
  },

  /** (d1) `content-length` ada di daftar wajib-buang. */
  contentLengthDropped(php) {
    const m = /const\s+HOP_BY_HOP\s*=\s*\[([\s\S]*?)\];/.exec(php);
    if (!m) return false;
    return /'content-length'/.test(m[1]);
  },

  /** (d2) Proxy tidak pernah MENGARANG `Content-Length` sendiri. */
  noSelfContentLength(php) {
    return !/header\s*\(\s*['"]Content-Length/i.test(php)
      && !/Content-Length:\s*['"]?\s*\.\s*strlen/i.test(php);
  },

  /** (f) Badan ditulis SEKALI lalu di-flush, dan slot proses dilepas kalau bisa. */
  bodyWrittenOnceAndFlushed(php) {
    const echoes = (php.match(/^\s*echo\s+\$payload\s*;/gm) || []).length;
    if (echoes !== 1) return false;
    const echoAt = php.search(/^\s*echo\s+\$payload\s*;/m);
    const tail = php.slice(echoAt);
    return /\bflush\s*\(\s*\)\s*;/.test(tail)
      && /function_exists\s*\(\s*'fastcgi_finish_request'\s*\)[\s\S]{0,80}fastcgi_finish_request\s*\(/.test(tail)
      && /while\s*\(\s*ob_get_level\s*\(\s*\)\s*>\s*0\s*\)/.test(php.slice(0, echoAt));
  },

  /** (e1) Placeholder secret utuh, tepat sekali, dan bukan nilai sungguhan. */
  secretPlaceholderIntact(phpRaw) {
    const decl = /const\s+EDGE_SECRET\s*=\s*'([^']*)'/.exec(phpRaw);
    return !!decl && decl[1] === '__EDGE_SECRET__'
      && (phpRaw.match(/__EDGE_SECRET__/g) || []).length === 1;
  },

  /**
   * (e2) Nol literal berentropi tinggi di seluruh berkas. Ini yang menangkap secret
   * yang ter-commit BUKAN lewat konstanta EDGE_SECRET (mis. disisipkan sebagai header
   * kedua, atau ditinggalkan di komentar saat menelusuri masalah).
   */
  noHighEntropyLiteral(phpRaw) {
    const candidates = phpRaw.match(/[A-Za-z0-9_\-+/=]{20,}/g) || [];
    for (const c of candidates) {
      if (/^_+[A-Z_]+_+$/.test(c)) continue;                    // __EDGE_SECRET__
      if (/^[A-Z][A-Z0-9_]*$/.test(c)) continue;                // KONSTANTA_PHP
      if (/^[a-z][a-z0-9_]*$/.test(c)) continue;                // nama_fungsi_php
      if (/^[A-Za-z][A-Za-z0-9]*$/.test(c) && !/[0-9]/.test(c)) continue; // kataPanjangBiasa
      const classes = [/[a-z]/, /[A-Z]/, /[0-9]/].filter((re) => re.test(c)).length;
      const distinct = new Set(c).size;
      if (classes >= 3 && distinct >= 14) return false;
    }
    return true;
  }
};

/* =======================================================================
 * Jalankan seluruh detektor atas KEDUA berkas sungguhan
 * ===================================================================== */
const SOURCES = {};
for (const [key, abs] of Object.entries(FILES)) {
  const raw = mustRead(abs, path.relative(ROOT, abs));
  SOURCES[key] = { raw, php: stripPhpComments(raw), rel: path.relative(ROOT, abs) };
  assert(raw.split('\n').length === SOURCES[key].php.split('\n').length,
    'penghapus komentar mempertahankan jumlah baris untuk ' + SOURCES[key].rel);
}

// Bukti penghapus komentar benar-benar bekerja: kedua berkas MENYEBUT nama header
// hop-by-hop di dalam prosa penjelasnya, jadi kalau komentar tidak terbuang, butir
// (a7) akan menghukum dokumentasi yang benar.
assert(/Transfer-Encoding/i.test(SOURCES.api.raw) && !/'Transfer-Encoding\s*:/i.test(SOURCES.api.php),
  'penghapus komentar TERBUKTI bekerja: nama header di prosa tidak terbaca sebagai header yang dikirim');

const BUTIR = [
  ['(a)', 'hopListComplete', 'daftar HOP_BY_HOP memuat semua nama wajib (Connection, Keep-Alive, Proxy-*, Transfer-Encoding, TE, Trailer, Upgrade, Content-Length)'],
  ['(a)', 'hopHelperSound', 'helper hopByHop() tidak peka huruf DAN memeriksa keluarga proxy-* sebagai awalan'],
  ['(a)', 'hopFilteredUpstream', 'ARAH NAIK: header ke upstream disaring hopByHop() sebelum curl disentuh'],
  ['(a)', 'hopFilteredDownstream', 'ARAH TURUN: hopByHop() diperiksa SEBELUM allowlist passThrough dan sebelum Set-Cookie'],
  ['(a)', 'hopHeaderRemoved', 'sapuan terakhir header_remove() atas seluruh daftar, tanpa syarat'],
  ['(a)', 'passThroughClean', 'nol nama hop-by-hop yang diselipkan ke allowlist $passThrough'],
  ['(a)', 'noHopHeaderComposed', 'nol header hop-by-hop yang disusun tangan untuk dikirim ke upstream'],
  ['(b)', 'curlTimeoutsSet', 'CURLOPT_TIMEOUT dan CURLOPT_CONNECTTIMEOUT diset eksplisit dan bukan 0 (tanpa batas)'],
  ['(c)', 'sessionSafe', 'nol session_start() yang tidak ditutup; lock sesi dilepas sebelum kerja jaringan'],
  ['(d)', 'contentLengthDropped', 'content-length ada di daftar wajib-buang (tidak diteruskan mentah dari hulu)'],
  ['(d)', 'noSelfContentLength', 'proxy tidak pernah mengarang Content-Length hasil hitungan sendiri'],
  ['(f)', 'bodyWrittenOnceAndFlushed', 'badan ditulis SEKALI lalu di-flush, buffer nyasar dibuang lebih dulu']
];

for (const [key, src] of Object.entries(SOURCES)) {
  for (const [butir, detector, label] of BUTIR) {
    const fn = DETECT[detector];
    // Nama detektor yang salah tulis harus MEMERAHKAN gerbang, bukan diam-diam lolos
    // lewat fallback: gerbang yang memanggil fungsi yang tidak ada adalah gerbang yang
    // tidak menjaga apa pun.
    assert(typeof fn === 'function', 'detektor ' + detector + ' ada (nama tidak salah tulis)');
    assert(typeof fn === 'function' && fn(src.php), butir + ' ' + src.rel + ': ' + label);
  }
  // (e) dijalankan atas teks MENTAH: nilai secret yang ter-commit di komentar tetap
  // nilai yang ter-commit.
  assert(DETECT.secretPlaceholderIntact(src.raw),
    '(e) ' + src.rel + ': EDGE_SECRET tetap placeholder __EDGE_SECRET__, tepat sekali, bukan nilai sungguhan');
  assert(DETECT.noHighEntropyLiteral(src.raw),
    '(e) ' + src.rel + ': nol literal berentropi tinggi di seluruh berkas (termasuk komentar)');
}

/* =======================================================================
 * (b) Angka timeout DIIKAT pada batas kesabaran klien yang sesungguhnya
 * ===================================================================== */
{
  const e2eRaw = mustRead(E2E_PATH, 'tools/fiezel-e2e-bridge.mjs');
  const hop = /const\s+HOP_TIMEOUT\s*=\s*([0-9]+)/.exec(e2eRaw);
  assert(!!hop, '(b) batas kesabaran klien bisa dibaca dari tools/fiezel-e2e-bridge.mjs (HOP_TIMEOUT)');
  const clientMs = hop ? Number(hop[1]) : null;
  assert(clientMs === 8000,
    '(b) batas itu masih 8.000 ms — angka yang membuat permintaan ke-3 dilaporkan TIMEOUT 8002ms, dapat ' + clientMs);

  const api = SOURCES.api.php;
  const num = (name) => {
    const m = new RegExp('const\\s+' + name + '\\s*=\\s*([0-9]+)').exec(api);
    return m ? Number(m[1]) : null;
  };
  const fast = num('TIMEOUT_FAST_S');
  const slow = num('TIMEOUT_S');
  const connect = num('CONNECT_S');
  const abandon = num('CLIENT_ABANDON_S');

  assert(abandon !== null && clientMs !== null && abandon === clientMs / 1000,
    '(b) CLIENT_ABANDON_S di PHP mencerminkan HOP_TIMEOUT gerbang E2E (' + abandon + ' s vs ' + (clientMs / 1000) + ' s)');
  assert(fast !== null && abandon !== null && fast < abandon,
    '(b) TIMEOUT_FAST_S (' + fast + ' s) LEBIH PENDEK dari batas klien (' + abandon + ' s): proxy wajib kalah lebih dulu, supaya murid melihat 504, bukan gantungan');
  assert(fast !== null && abandon !== null && abandon - fast >= 2,
    '(b) sisa >= 2 s antara batas proxy dan batas klien (jatah perjalanan 504 ke browser), dapat ' + (abandon - fast) + ' s');
  assert(fast !== null && fast >= 4,
    '(b) TIMEOUT_FAST_S tetap >= 4 s: ekor terburuk terukur 2.214 ms, jadi jangan memotong permintaan yang sehat, dapat ' + fast);
  assert(connect !== null && fast !== null && connect < fast,
    '(b) batas connect (' + connect + ' s) lebih pendek dari batas total (' + fast + ' s)');
  assert(slow !== null && slow >= 20,
    '(b) jalur model tetap sabar (TIMEOUT_S >= 20 s) — batas pendek tidak boleh memotong jawaban AI, dapat ' + slow);

  // Jalur yang SUNGGUHAN menggantung di lapangan harus memakai batas pendek itu.
  const fl = /const\s+FAST_TIMEOUT_PATHS\s*=\s*\[([\s\S]*?)\]/.exec(api);
  assert(!!fl, '(b) FAST_TIMEOUT_PATHS bisa dibaca gerbang');
  const fastPaths = fl ? (fl[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, '')) : [];
  for (const p of ['/api/config', '/api/user/me', '/api/quota']) {
    assert(fastPaths.includes(p),
      '(b) ' + p + ' memakai batas pendek: ia jalur boot murid yang terbukti menggantung, dan 25 s > 8 s kesabaran browser');
  }
  assert(!fastPaths.includes('/api/ai/task') && !fastPaths.includes('/api/tts/render'),
    '(b) jalur model TIDAK ikut batas pendek');
  // Dan hubungan itu ditegakkan oleh KODE, bukan hanya oleh komentar.
  assert(/if\s*\(in_array\(\$path,\s*FAST_TIMEOUT_PATHS,\s*true\)\s*&&\s*\$timeout\s*>=\s*CLIENT_ABANDON_S\)/.test(api),
    '(b) ada klem yang MEMAKSA batas jalur cepat tinggal di bawah batas klien walau konstantanya dinaikkan');

  // Jembatan owner: batasnya juga eksplisit dan bukan tak-berbatas.
  const ownerConnect = /const\s+CONNECT_S\s*=\s*([0-9]+)/.exec(SOURCES.owner.php);
  const ownerTotal = /const\s+TIMEOUT_S\s*=\s*([0-9]+)/.exec(SOURCES.owner.php);
  assert(!!ownerConnect && Number(ownerConnect[1]) >= 2 && Number(ownerConnect[1]) <= 5,
    '(b) owner-index.php: CONNECT_S 2..5 s (leg origin->Cloudflare), dapat ' + (ownerConnect && ownerConnect[1]));
  assert(!!ownerTotal && Number(ownerTotal[1]) > 0 && Number(ownerTotal[1]) <= 30,
    '(b) owner-index.php: TIMEOUT_S terbatas dan masuk akal, dapat ' + (ownerTotal && ownerTotal[1]));
}

/* =======================================================================
 * (e) Nilai secret tidak ter-commit DI MANA PUN di direktori jembatan
 * ===================================================================== */
{
  const dir = path.join(ROOT, 'deploy', 'edge');
  const entries = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
  assert(entries.length > 0, '(e) direktori deploy/edge bisa dibaca');
  for (const f of entries) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    // README memuat contoh perintah `sed`/`wrangler`; yang dilarang adalah NILAI, dan
    // detektor entropi di atas hanya diterapkan pada sumber PHP. Di sini yang dijaga
    // adalah hal yang lebih sempit dan tidak bisa salah tafsir: tidak ada berkas di
    // direktori ini yang boleh memuat baris `EDGE_SHARED_SECRET=<nilai>`.
    assert(!/EDGE_SHARED_SECRET\s*=\s*['"]?[A-Za-z0-9_\-+/=]{16,}/.test(text),
      '(e) deploy/edge/' + f + ': nol nilai EDGE_SHARED_SECRET yang ter-commit');
    assert(!/X-Fiezel-Edge:\s*[A-Za-z0-9_\-+/=]{16,}/.test(text),
      '(e) deploy/edge/' + f + ': nol nilai header X-Fiezel-Edge yang ter-commit');
  }
}

/* =======================================================================
 * MATRIKS RACUN — setiap detektor DIBUKTIKAN bisa MERAH
 * ===================================================================== */
const POISON = [
  {
    butir: '(a)',
    detector: 'hopListComplete',
    label: 'satu nama dihapus dari daftar HOP_BY_HOP',
    poison: (raw) => raw.replace("'upgrade',", "")
  },
  {
    butir: '(a)',
    detector: 'hopHelperSound',
    label: 'helper berhenti memeriksa keluarga proxy-*',
    poison: (raw) => raw.replace(/\s*\|\|\s*str_starts_with\(\$n, 'proxy-'\)/, '')
  },
  {
    butir: '(a)',
    detector: 'hopFilteredUpstream',
    label: 'saringan arah NAIK dihapus',
    poison: (raw) => raw.replace(/\$fwd = array_values\(array_filter\([\s\S]*?\}\)\);/, '')
  },
  {
    butir: '(a)',
    detector: 'hopFilteredDownstream',
    label: 'saringan arah TURUN dihapus',
    poison: (raw) => raw.replace(/  if \(hopByHop\(\$name\)\) continue;\r?\n/, '')
  },
  {
    butir: '(a)',
    detector: 'hopHeaderRemoved',
    label: 'sapuan header_remove() dihapus',
    poison: (raw) => raw.replace(/foreach \(HOP_BY_HOP as \$hopName\) \{ header_remove\(\$hopName\); \}/, '')
  },
  {
    butir: '(a)',
    detector: 'passThroughClean',
    label: 'transfer-encoding diselipkan ke allowlist passThrough',
    poison: (raw) => raw.replace("'content-type',", "'content-type','transfer-encoding',")
  },
  {
    butir: '(a)',
    detector: 'noHopHeaderComposed',
    label: "header `Connection: keep-alive` disusun tangan untuk upstream",
    poison: (raw) => raw.replace('$url = UPSTREAM', "$fwd[] = 'Connection: keep-alive';\n$url = UPSTREAM")
  },
  {
    butir: '(b)',
    detector: 'curlTimeoutsSet',
    label: 'CURLOPT_TIMEOUT diset 0 (tanpa batas — permintaan boleh menggantung selamanya)',
    poison: (raw) => raw.replace(/CURLOPT_TIMEOUT\s*=>\s*[^,]+,/, 'CURLOPT_TIMEOUT        => 0,')
  },
  {
    butir: '(c)',
    detector: 'sessionSafe',
    label: 'session_start() disisipkan tanpa session_write_close()',
    poison: (raw) => raw
      .replace(/if \(function_exists\('session_status'\)[\s\S]*?\r?\n\}\r?\n/, '')
      .replace('$url = UPSTREAM', "session_start();\n$url = UPSTREAM")
  },
  {
    butir: '(d)',
    detector: 'contentLengthDropped',
    label: 'content-length dikeluarkan dari daftar wajib-buang',
    poison: (raw) => raw.replace("'upgrade','content-length'", "'upgrade'")
  },
  {
    butir: '(d)',
    detector: 'noSelfContentLength',
    label: 'Content-Length hasil hitungan sendiri dipasang ke klien',
    poison: (raw) => raw.replace('echo $payload;', "header('Content-Length: ' . strlen($payload));\necho $payload;")
  },
  {
    butir: '(f)',
    detector: 'bodyWrittenOnceAndFlushed',
    label: 'badan ditulis dua kali (dan tanpa flush di antaranya)',
    poison: (raw) => raw.replace(/echo \$payload;\r?\nflush\(\);/, 'echo $payload;\necho $payload;')
  }
];

for (const p of POISON) {
  const target = SOURCES.api;
  const poisonedRaw = p.poison(target.raw);
  assert(poisonedRaw !== target.raw,
    'MATRIKS ' + p.butir + ' racun benar-benar mengubah sumber: ' + p.label);
  const detector = DETECT[p.detector];
  assert(detector(target.php) === true,
    'MATRIKS ' + p.butir + ' detektor ' + p.detector + ' HIJAU atas berkas asli');
  assert(detector(stripPhpComments(poisonedRaw)) === false,
    'MATRIKS ' + p.butir + ' detektor ' + p.detector + ' MERAH saat: ' + p.label);
}

// (e) juga punya barisnya sendiri di matriks: nilai secret sungguhan disuntikkan.
{
  const target = SOURCES.api;
  // Nilai palsu DISUSUN saat jalan, bukan ditulis sebagai satu literal, karena
  // `tests/secret-scan-test.js` memindai SELURUH repo dan literal 32 karakter berentropi
  // tinggi di dalam gerbang ini akan memerahkan gerbang itu — benar sekali, dan itu
  // sebabnya fixture-nya dipecah alih-alih dimaafkan lewat allowlist.
  const fakeSecret = ['v7Qk2m', 'Zp8Lb', 'Xn4Tr', 'Yw9Cs', 'E3aHd', '6JgFu1'].join('');
  const poisoned = target.raw.replace("'__EDGE_SECRET__'", "'" + fakeSecret + "'");
  assert(DETECT.secretPlaceholderIntact(target.raw) === true,
    'MATRIKS (e) detektor placeholder HIJAU atas berkas asli');
  assert(DETECT.secretPlaceholderIntact(poisoned) === false,
    'MATRIKS (e) detektor placeholder MERAH saat nilai secret sungguhan menggantikan placeholder');
  assert(DETECT.noHighEntropyLiteral(target.raw) === true,
    'MATRIKS (e) detektor entropi HIJAU atas berkas asli (nol positif palsu di 500+ baris prosa)');
  assert(DETECT.noHighEntropyLiteral(poisoned) === false,
    'MATRIKS (e) detektor entropi MERAH atas nilai berentropi tinggi yang ter-commit');
  const inComment = target.raw.replace('declare(strict_types=1);',
    'declare(strict_types=1);\n// catatan sementara saat menelusuri F4: SECRET='
    + ['Kp9wQz', '2Vb7L', 'n4XsT', '6yRm3', 'Hc8Jd', '5Gf1Ae'].join('') + '\n');
  assert(DETECT.noHighEntropyLiteral(inComment) === false,
    'MATRIKS (e) detektor entropi MERAH walau nilai itu "hanya" ditinggalkan di komentar');
}

/* =======================================================================
 * README: diagnosis + langkah verifikasi yang harus dijalankan pemilik
 * ===================================================================== */
{
  const readme = mustRead(path.join(ROOT, 'deploy', 'edge', 'README.md'), 'deploy/edge/README.md');
  for (const [re, label] of [
    [/#3\s*TIMEOUT\s*8002ms|8002\s*ms/i, 'angka cacat yang terukur (#3 TIMEOUT 8002ms)'],
    [/hop-by-hop/i, 'diagnosis header hop-by-hop'],
    [/session_write_close/, 'diagnosis lock sesi PHP'],
    [/Content-Length/i, 'diagnosis Content-Length yang tidak boleh diteruskan'],
    [/LSAPI_CHILDREN|entry process/i, 'hipotesis batas proses cPanel yang TIDAK bisa dinilai dari kode'],
    [/--next/, 'perintah curl 5 permintaan berurutan pada satu koneksi'],
    [/edge-proxy-hopbyhop-test/, 'gerbang struktural baru'],
    [/fiezel-e2e-bridge/, 'gerbang E2E browser yang harus dijalankan ulang'],
    [/analisis kode( saja)? tidak|belum terbukti tertutup|hanya terbukti tertutup/i,
      'pernyataan jujur bahwa analisis kode saja tidak menutup cacat ini']
  ]) {
    assert(re.test(readme), 'README deploy/edge menjelaskan ' + label);
  }
  // Perintah verifikasi harus benar-benar menembak SATU koneksi berkali-kali, bukan
  // lima proses curl terpisah (itu justru kasus yang TIDAK memperlihatkan cacatnya).
  assert(/curl[\s\S]{0,400}--next[\s\S]{0,400}--next[\s\S]{0,400}--next[\s\S]{0,400}--next/.test(readme),
    'README memuat perintah curl dengan >=4 `--next` (5 permintaan pada SATU koneksi)');
  assert(/Connection:\s*keep-alive/i.test(readme),
    'README menyebut alternatif -H \'Connection: keep-alive\'');
  assert(/time_total|%\{http_code\}/.test(readme),
    'README menunjukkan cara MEMBACA hasilnya (kode status + waktu per permintaan)');
}

/* =======================================================================
 * Gerbang ini benar-benar terdaftar di CI
 * ===================================================================== */
{
  const workflow = mustRead(path.join(ROOT, '.github', 'workflows', 'quality.yml'), '.github/workflows/quality.yml');
  assert(/node tests\/edge-proxy-hopbyhop-test\.js/.test(workflow),
    'quality.yml memanggil node tests/edge-proxy-hopbyhop-test.js');
  assert(/node tests\/edge-proxy-contract-test\.js/.test(workflow),
    'quality.yml masih memanggil tests/edge-proxy-contract-test.js (gerbang ini melengkapinya)');
}

/* ---------------------------- Laporan --------------------------------- */
const passed = results.filter((r) => r.ok).length;
for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
fs.writeFileSync(path.join(ROOT, 'EDGE-PROXY-HOPBYHOP-REPORT.json'), JSON.stringify({
  schema: 'fiezel-edge-proxy-hopbyhop-report-v1',
  generatedAt: new Date().toISOString(),
  pass: failures === 0,
  defect: {
    id: 'F4',
    measuredBy: 'tools/fiezel-e2e-bridge.mjs (bridge-hop-stable)',
    measurement: '#1 200 1853ms | #2 200 943ms | #3 TIMEOUT 8002ms',
    invisibleTo: 'curl (satu proses = satu koneksi baru; tidak menganyam permintaan pada satu koneksi keep-alive)'
  },
  scope: 'deploy/edge/api-index.php + deploy/edge/owner-index.php dipindai sebagai TEKS (nol PHP, nol jaringan)',
  honesty: 'Gerbang ini mencegah kelas cacat KEMBALI. Ia TIDAK membuktikan cacat F4 tertutup; '
    + 'itu hanya terbukti sesudah gerbang E2E browser dijalankan ULANG terhadap jembatan yang '
    + 'sudah diunggah. Hipotesis batas proses PHP per pengguna cPanel (LSAPI_CHILDREN/entry '
    + 'process) tidak bisa dinilai dari teks sama sekali.',
  counts: { pass: passed, fail: failures, total: results.length, poisonRows: POISON.length },
  checks: results
}, null, 2) + '\n');
console.log('edge-proxy-hopbyhop-test: ' + passed + '/' + results.length + ' assert PASS');
if (failures) {
  console.error('edge-proxy-hopbyhop-test GAGAL: ' + failures + ' assert merah');
  process.exit(1);
}
