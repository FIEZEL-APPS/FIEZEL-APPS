/**
 * reports/d4-owner-brake-red-proof.mjs — BUKTI MERAH untuk butir (b-a)…(b-g) dan bagian KV
 * butir (g-g) di `owner-edge-guard-test.js` (rem penebakan halaman masuk owner + pengalihan
 * penanda buku `GET /` → `/login`).
 *
 * Kenapa berkas ini ada: rem yang diganti hari ini adalah rem yang SELALU HIJAU di gerbang lama
 * padahal di produksi ia tidak pernah menyentuh (12 percobaan token salah → 403 dua belas kali,
 * NOL 429). Gerbang baru tidak boleh punya sifat yang sama. Skrip ini menyuntikkan SATU mutasi
 * pada satu waktu ke berkas SUNGGUHAN, menjalankan gerbang, mencatat butir mana yang jatuh, lalu
 * MEMULIHKAN berkas apa pun yang terjadi (finally).
 *
 * Jalankan: node reports/d4-owner-brake-red-proof.mjs
 * Keluaran: reports/d4-owner-brake-red-proof.json + matriks di stdout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OWNER = path.join(ROOT, 'workers', 'owner', 'index.js');
const TOML = path.join(ROOT, 'workers', 'owner', 'wrangler.toml');
const GATE = 'owner-edge-guard-test.js';
const REPORT = path.join(ROOT, 'OWNER-EDGE-GUARD-REPORT.json');

const MUTATIONS = [
  {
    id: 'M1-rem-kembali-per-isolate',
    why: 'CACAT ASLINYA: tanpa penyimpanan bersama, hitungan hidup di satu isolate → nol 429',
    file: OWNER,
    from: '  const kv = env && env.CFG;\n  if (!kv || typeof kv.get !== \'function\') return state;',
    to: '  const kv = null;   // MUTASI: rem kembali per-isolate\n  if (!kv || typeof kv.get !== \'function\') return state;',
    expect: ['(b-a)'],
  },
  {
    id: 'M2-kunci-rem-jadi-konstanta-global',
    why: 'CACAT 2: satu ember untuk seluruh dunia → penyerang bisa mengunci owner keluar',
    file: OWNER,
    from: "  const source = scope === 'shared' ? 'bridge' : loginClientIp(request);",
    to: "  const source = 'login';   // MUTASI: satu ember global",
    expect: ['(b-b)'],
  },
  {
    id: 'M3-batas-rem-dinaikkan-diam-diam',
    why: 'rem yang batasnya tidak pernah tercapai = rem dekoratif dengan bentuk lain',
    file: OWNER,
    from: '  if (total >= state.limit) {',
    to: '  if (total >= state.limit * 100) {   // MUTASI',
    expect: ['(b-a)'],
  },
  {
    id: 'M4-jendela-berhenti-bergulir',
    why: 'jendela tetap = penyerang cukup menunggu pergantian jendela untuk kuota penuh',
    file: OWNER,
    from: '  for (let i = 0; i < LOGIN_WINDOW_BUCKETS; i += 1) keys.push(loginBucketKey(Number(nowMs) - i * LOGIN_BUCKET_MS));',
    to: '  keys.push(loginBucketKey(Math.floor(Number(nowMs) / LOGIN_WINDOW_MS) * LOGIN_WINDOW_MS));   // MUTASI',
    expect: ['(b-c)'],
  },
  {
    id: 'M5-tulis-rem-tanpa-TTL',
    why: 'kunci rem tanpa TTL menumpuk dan keadaan terkunci bisa macet tanpa cara membersihkan',
    file: OWNER,
    from: '      expirationTtl: LOGIN_KV_TTL_S,',
    to: '      expirationTtl: 0,   // MUTASI',
    expect: ['(b-a)'],
  },
  {
    id: 'M6-baca-rem-tanpa-batas-cache',
    why: 'cacheTtl default 60 detik menggandakan jendela lag konsistensi eventual',
    file: OWNER,
    from: '    raw = await Promise.all(keys.map((key) => kv.get(\n      LOGIN_KV_PREFIX + key + \':\' + source, { cacheTtl: LOGIN_KV_CACHE_TTL_S }\n    )));',
    to: '    raw = await Promise.all(keys.map((key) => kv.get(LOGIN_KV_PREFIX + key + \':\' + source)));   // MUTASI',
    expect: ['(b-a)'],
  },
  {
    id: 'M7-IP-mentah-jadi-kunci-penyimpanan',
    why: 'IP mentah di kunci KV = data lokasi per-orang tersimpan di penyimpanan bersama',
    file: OWNER,
    from: '  return digest.slice(0, 32);   // 128 bit',
    to: '  return loginClientIp(request);   // MUTASI: IP mentah',
    expect: ['(b-d)'],
  },
  {
    id: 'M8-IP-mentah-dicatat-ke-log',
    why: 'log Cloudflare menjadi tempat IP murid/owner mengendap tanpa pernah diputuskan',
    file: OWNER,
    from: '  loginMemoryPrune(nowMs);\n  if (loginMemoryCount(keys, source) >= state.limit) {',
    to: "  console.warn('rem login dari ' + loginClientIp(request));   // MUTASI\n  loginMemoryPrune(nowMs);\n  if (loginMemoryCount(keys, source) >= state.limit) {",
    expect: ['(b-d)'],
  },
  {
    id: 'M9-header-yang-bisa-dipalsukan-memecah-ember',
    why: 'kalau X-Forwarded-For menang, penyerang memecah embernya sendiri tanpa batas',
    file: OWNER,
    from: "  const cf = headers ? headers.get('cf-connecting-ip') : '';",
    to: "  const cf = headers ? (headers.get('x-forwarded-for') || headers.get('cf-connecting-ip')) : '';   // MUTASI",
    expect: ['(b-b)'],
  },
  {
    id: 'M10-penanda-buku-kembali-403',
    why: 'CACAT 3: owner yang membuka bookmark disambut {"error":"forbidden"}',
    file: OWNER,
    from: "    if (path === '/' && method === 'GET') return loginRedirect();",
    to: '    if (false) return loginRedirect();   // MUTASI',
    expect: ['(b-e)'],
  },
  {
    id: 'M11-pengalihan-membocorkan-keadaan-konfigurasi',
    why: '`curl -I /` menjadi cara mengetahui apakah dashboard sudah dikonfigurasi',
    file: OWNER,
    from: "    if (path === '/' && method === 'GET') return loginRedirect();",
    to: "    if (path === '/' && method === 'GET') return configured(env) ? loginRedirect() : deny();   // MUTASI",
    expect: ['(g-f)'],
  },
  {
    id: 'M12-pengalihan-membawa-badan-dan-cookie',
    why: 'pengalihan yang membawa badan/cookie mengubah bentuknya menurut keadaan klien',
    file: OWNER,
    from: '  return new Response(null, {\n    status: 303,\n    headers: {\n      location: \'/login\',',
    to: '  return new Response(\'{"error":"forbidden"}\', {\n    status: 303,\n    headers: {\n      \'set-cookie\': sessionCookieHeader(\'\', 0),\n      location: \'/login\',',
    expect: ['(b-e)'],
  },
  {
    id: 'M13-penjaga-tepi-lapis-1-dimatikan',
    why: '*.workers.dev kembali menjadi pintu kedua yang tidak dilewati Cloudflare Access',
    file: OWNER,
    from: '  const edgeDenial = edgeGuard(request, env, path);\n  if (edgeDenial) return edgeDenial;',
    to: '  const edgeDenial = null;   // MUTASI\n  if (edgeDenial) return edgeDenial;',
    expect: ['(b-f)'],
  },
  {
    id: 'M14-rem-dipanggil-sebelum-penjaga-tepi',
    why: 'urutan terbalik = permintaan dari hostname asing ikut menulis ke penyimpanan rem',
    file: OWNER,
    from: '  const edgeDenial = edgeGuard(request, env, path);\n  if (edgeDenial) return edgeDenial;',
    to: '  await loginBrakeCheck(env, request, \'custom-domain\', now);   // MUTASI\n  const edgeDenial = edgeGuard(request, env, path);\n  if (edgeDenial) return edgeDenial;',
    expect: ['(b-f)'],
  },
  {
    id: 'M15-galat-penyimpanan-mengunci-owner',
    why: 'KEBALIKAN dari keputusan yang diambil: KV tersendat tidak boleh mengunci satu-satunya pengguna',
    file: OWNER,
    from: "    state.storage = 'error';\n    return state;",
    to: "    state.storage = 'error';\n    state.throttled = true;   // MUTASI: fail-closed\n    return state;",
    expect: ['(b-g)'],
  },
  {
    id: 'M16-login-berhasil-ikut-menulis',
    why: 'anggaran 720 tulis/hari dihitung dari "hanya kegagalan yang menulis"',
    file: OWNER,
    from: '      const accepted = ctEq(presentedDigest,',
    to: '      await loginBrakeRecordFailure(env, brake, now);   // MUTASI\n      const accepted = ctEq(presentedDigest,',
    expect: ['(b-b)'],
  },
  {
    id: 'M17-permintaan-yang-sudah-429-ikut-menulis',
    why: 'ember penuh yang tetap menulis = penyerang membakar kuota tulis KV harian',
    file: OWNER,
    from: '      if (brake.throttled) return loginThrottleResponse();',
    to: '      if (brake.throttled) { await loginBrakeRecordFailure(env, brake, now); return loginThrottleResponse(); }   // MUTASI',
    expect: ['(b-a)'],
  },
  {
    id: 'M18-batas-jembatan-disamakan-dengan-per-IP',
    why: 'ember BERSAMA dengan batas per-IP = satu penyerang mengunci semua lewat jembatan',
    file: OWNER,
    from: 'const LOGIN_MAX_SHARED = 20;',
    to: 'const LOGIN_MAX_SHARED = 5;   // MUTASI',
    expect: ['(b-b)'],
  },
  {
    id: 'M19-Retry-After-dihitung-dari-riwayat',
    why: 'nilai yang dihitung memberi tahu penyerang kapan ia terakhir mencoba (oracle)',
    file: OWNER,
    from: "  return html(renderLogin(LOGIN_THROTTLE_TEXT), 429, { 'retry-after': String(LOGIN_RETRY_AFTER_S) });",
    to: "  return html(renderLogin(LOGIN_THROTTLE_TEXT), 429, { 'retry-after': String(Math.floor(Date.now() / 1000) % 97) });   // MUTASI",
    expect: ['(b-a)'],
  },
  {
    id: 'M20-binding-KV-dicabut-dari-wrangler',
    why: 'tanpa binding, rem lintas isolate tidak pernah ada di produksi meski kodenya benar',
    file: TOML,
    from: '[[kv_namespaces]]\nbinding = "CFG"',
    to: '# [[kv_namespaces]]   MUTASI\n# binding = "CFG"',
    expect: ['(g-g)'],
  },
  {
    id: 'M21-binding-KV-kedua-diselundupkan',
    why: 'satu binding untuk rem sudah dijelaskan; binding kedua adalah pelebaran tanpa alasan',
    file: TOML,
    from: '[observability]',
    to: '[[kv_namespaces]]\nbinding = "SESSIONS"\nid = "00000000000000000000000000000000"\n\n[observability]',
    expect: ['(g-g)'],
  },
  {
    id: 'M22-klaim-nol-tulis-KV-dikembalikan',
    why: 'dokumen yang mengklaim "Nol tulis KV" sesudah rem menulis KV adalah dokumen yang bohong',
    file: TOML,
    from: '# · Nol tulis D1: Worker ini hanya SELECT',
    to: '# · Nol tulis KV, nol tulis D1: Worker ini hanya SELECT',
    expect: ['(g-g)'],
  },
  {
    id: 'M23-alasan-fail-open-dihapus-dari-kode',
    why: 'keputusan fail-open tanpa alasan tertulis akan dibalik orang berikutnya tanpa tahu harganya',
    file: OWNER,
    from: '// YANG DIPILIH: **FAIL-OPEN terhadap PENGUNCIAN**',
    to: '// YANG DIPILIH: (alasan dihapus)',
    expect: ['(b-g)'],
  },
  {
    id: 'M24-kejujuran-token-bocor-dihapus',
    why: 'rem ini tidak menolong terhadap token yang bocor; menghapus kalimat itu menjual rasa aman palsu',
    file: OWNER,
    from: 'token yang BOCOR',
    to: 'semua ancaman kredensial',
    expect: ['(b-g)'],
  },
];

function runGate() {
  try {
    execFileSync('node', [GATE], { cwd: ROOT, stdio: 'pipe' });
    return 0;
  } catch (err) {
    return err.status === undefined ? -1 : err.status;
  }
}

function readReport() {
  try {
    return JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  } catch (_) {
    return null;
  }
}

const results = [];
for (const m of MUTATIONS) {
  const original = fs.readFileSync(m.file, 'utf8');
  if (!original.includes(m.from)) {
    results.push({ id: m.id, ok: false, why: 'jangkar mutasi tidak ditemukan: ' + m.from.slice(0, 70) });
    continue;
  }
  let exit = -1;
  let failed = [];
  try {
    fs.writeFileSync(m.file, original.replace(m.from, m.to));
    exit = runGate();
    const rep = readReport();
    failed = ((rep && rep.checks) || []).filter((c) => !c.ok).map((c) => c.message);
  } finally {
    fs.writeFileSync(m.file, original);
  }
  const groups = Array.from(new Set(failed.map((msg) => (/^\((?:g-|b-)?[a-z*0-9]+\)/.exec(msg) || ['(?)'])[0]))).sort();
  const hit = m.expect.filter((tag) => failed.some((msg) => msg.startsWith(tag)));
  results.push({
    id: m.id,
    kenapaIniLubang: m.why,
    berkas: path.relative(ROOT, m.file),
    exit,
    merah: exit !== 0,
    butirYangJatuh: groups,
    butirDiharapkanJatuh: m.expect,
    butirDiharapkanYangBenarJatuh: hit,
    contohAssertMerah: failed.slice(0, 3),
    ok: exit !== 0 && hit.length > 0,
  });
}

// Pemulihan wajib TERBUKTI, bukan diasumsikan.
const pulih = runGate();

const out = {
  schema: 'fiezel-d4-owner-brake-red-proof-v1',
  generatedAt: new Date().toISOString(),
  gate: GATE,
  mutations: results,
  pulihSesudahSemuaMutasi: pulih,
  pass: results.every((r) => r.ok) && pulih === 0,
};
fs.writeFileSync(path.join(ROOT, 'reports', 'd4-owner-brake-red-proof.json'), JSON.stringify(out, null, 2) + '\n');

for (const r of results) {
  console.log((r.ok ? 'MERAH-OK  ' : 'GAGAL     ') + r.id.padEnd(46) + ' exit=' + r.exit
    + '  butir jatuh: ' + (r.butirYangJatuh || []).join(' ') + (r.why ? '  ' + r.why : ''));
}
console.log('pulih (gerbang hijau lagi): exit=' + pulih);
console.log(out.pass ? 'RED-PROOF PASS' : 'RED-PROOF GAGAL');
process.exit(out.pass ? 0 : 1);
