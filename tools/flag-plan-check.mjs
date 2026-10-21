#!/usr/bin/env node
/**
 * tools/flag-plan-check.mjs — kalkulator KEADAAN EFEKTIF flag Cloudflare.
 *
 * Node murni. NOL jaringan, NOL dependency, NOL tulis berkas. Ia hanya membaca dua hal:
 *   1. `core-config.js` (flag STATIS `FIEZEL_CF_CONFIG`) — dievaluasi di dalam `node:vm`,
 *      bukan di-regex, supaya yang terbaca adalah NILAI yang benar-benar dipakai klien.
 *   2. keluaran JSON `GET /api/config` dari STDIN — dipipe oleh operator, mis.
 *        curl -s https://api.fiezel.my.id/api/config | node tools/flag-plan-check.mjs
 *      Berkas ini TIDAK PERNAH memanggil `curl` maupun HTTP sendiri: alat yang boleh
 *      menembak produksi tidak boleh sama dengan alat yang dipakai saat panik.
 *
 * KENAPA ALAT INI ADA. Ada DUA lapis flag dengan kosakata BERBEDA, dan itu bukan pilihan
 * yang bisa dihapus hari ini:
 *   · statis  = tri-state per endpoint  `off | shadow | on`   (core-config.js)
 *   · server  = boolean per fitur       `flags.cf*Enabled` + `enabled.{ai,tts,coach,analytics}`
 *               (workers/api/schema.js: CLIENT_FLAG_DEFAULTS + KILL_SWITCH_DEFAULTS)
 * Mengalikan tri-state dengan boolean di dalam kepala, saat insiden, jam 11 malam, adalah
 * cara termurah memutar flag yang salah. Jadi perkaliannya dikerjakan di sini, sekali,
 * dengan satu aturan yang tidak bisa dibantah:
 *
 *   SERVER HANYA BISA MEMATIKAN, TIDAK BISA MENYALAKAN.
 *   effective = 'off'  bila  enabled=false | base='' | statis='off' | flag server false
 *                            | kill switch fitur itu false
 *   effective = statis bila semuanya true. `shadow` TIDAK PERNAH naik jadi `on` karena
 *   server bilang true — kenaikan adalah rilis, dan rilis butuh commit yang bisa dibaca.
 *
 * Keluaran: satu baris per endpoint (`EFFECTIVE …`), lalu daftar temuan.
 * Exit code:  0 = tidak ada temuan berbahaya · 3 = ada DANGER · 1 = masukan tidak bisa dibaca.
 * `--json` mencetak objek tunggal untuk dipakai gerbang/otomasi.
 *
 * Kelas temuan:
 *   DANGER = kombinasi yang MERUGIKAN MURID atau MENAGIH DOMPET bila dieksekusi.
 *   WARN   = kombinasi yang sah tetapi mudah disalahpahami (mis. rencana yang mandul).
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/* ---------------------------------------------------------------------------------------
 * Peta endpoint statis -> flag server. Sumber: app.js CF_ENDPOINT_ROUTES (peta path->flag)
 * dan workers/api/schema.js. Ditulis eksplisit, bukan diturunkan: endpoint yang lupa
 * dipetakan harus TERLIHAT sebagai 'unmapped', bukan diam-diam dianggap boleh hidup.
 * ------------------------------------------------------------------------------------- */
export const ENDPOINT_MAP = Object.freeze({
  health: { paths: ['/health'], serverFlag: 'cfApiEnabled', kill: null, costly: false },
  config: { paths: ['/api/config'], serverFlag: 'cfApiEnabled', kill: null, costly: false },
  auth: { paths: ['/api/auth/*'], serverFlag: 'cfIdentityEnabled', kill: null, costly: false },
  quota: { paths: ['/api/quota/*'], serverFlag: 'cfQuotaEnabled', kill: null, costly: false },
  ai: { paths: ['/api/ai/*', '/api/coach/*'], serverFlag: 'cfAiEnabled', kill: 'ai', costly: true },
  tts: { paths: ['/api/tts/*'], serverFlag: 'cfTtsEnabled', kill: 'tts', costly: true },
  usage: { paths: ['/api/usage/*', '/api/activity', '/api/feedback', '/api/policy/*'], serverFlag: 'cfAnalyticsEnabled', kill: 'analytics', costly: false }
});

const MODES = new Set(['off', 'shadow', 'on']);

/** Baca FIEZEL_CF_CONFIG dari core-config.js dengan MENJALANKANNYA di sandbox. */
export function readStaticConfig(source) {
  const box = { Object, console: { log() {}, warn() {}, error() {}, debug() {} } };
  box.self = box;
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(String(source), box, { filename: 'core-config.js', timeout: 2000 });
  const cf = box.FIEZEL_CF_CONFIG;
  if (!cf || typeof cf !== 'object') throw new Error('FIEZEL_CF_CONFIG tidak ditemukan di core-config.js');
  return {
    enabled: cf.enabled === true,
    base: String(cf.base || '').trim().replace(/\/$/, ''),
    endpoints: { ...(cf.endpoints || {}) }
  };
}

/**
 * Normalisasi jawaban /api/config. Masukan kosong/rusak BUKAN kesalahan fatal: klien pun
 * memperlakukan kegagalan /api/config sebagai "pakai default off" (route-config.js header),
 * jadi alat ini harus memodelkan keadaan itu, bukan menolaknya.
 */
export function readServerConfig(raw) {
  const text = String(raw || '').trim();
  if (!text) return { reachable: false, flags: {}, kill: {}, protocol: null };
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { reachable: false, flags: {}, kill: {}, protocol: null, parseError: true }; }
  if (!parsed || typeof parsed !== 'object') return { reachable: false, flags: {}, kill: {}, protocol: null, parseError: true };
  return {
    reachable: true,
    flags: parsed.flags && typeof parsed.flags === 'object' ? parsed.flags : {},
    kill: parsed.enabled && typeof parsed.enabled === 'object' ? parsed.enabled : {},
    protocol: parsed.protocol == null ? null : String(parsed.protocol),
    limits: parsed.limits && typeof parsed.limits === 'object' ? parsed.limits : {}
  };
}

/** statis × server = hasil. Satu fungsi, satu arah: server hanya bisa MEMATIKAN. */
export function effectiveState(staticCfg, serverCfg) {
  const master = staticCfg.enabled && staticCfg.base !== '';
  const rows = [];
  for (const [name, meta] of Object.entries(ENDPOINT_MAP)) {
    const rawStatic = String(staticCfg.endpoints?.[name] ?? 'missing');
    const staticMode = MODES.has(rawStatic) ? rawStatic : 'off';
    const serverFlagRaw = serverCfg.flags?.[meta.serverFlag];
    const serverFlag = serverFlagRaw === true;
    const killRaw = meta.kill ? serverCfg.kill?.[meta.kill] : undefined;
    const killOpen = meta.kill ? killRaw === true : true;

    let effective = staticMode;
    const reasons = [];
    if (!staticCfg.enabled) { effective = 'off'; reasons.push('enabled=false'); }
    if (staticCfg.base === '') { effective = 'off'; reasons.push("base=''"); }
    if (!MODES.has(rawStatic)) reasons.push(`nilai statis '${rawStatic}' tidak dikenali -> off`);
    if (staticMode === 'off') { effective = 'off'; reasons.push('statis=off'); }
    if (effective !== 'off' && !serverCfg.reachable) { effective = 'off'; reasons.push('/api/config tidak terbaca -> default off'); }
    if (effective !== 'off' && !serverFlag) { effective = 'off'; reasons.push(`server ${meta.serverFlag}=${serverFlagRaw === undefined ? 'absen' : String(serverFlagRaw)}`); }
    if (effective !== 'off' && !killOpen) { effective = 'off'; reasons.push(`kill switch enabled.${meta.kill}=${killRaw === undefined ? 'absen' : String(killRaw)}`); }

    rows.push({
      endpoint: name,
      paths: meta.paths,
      staticMode: rawStatic,
      serverFlag: meta.serverFlag,
      serverValue: serverFlagRaw === undefined ? null : serverFlagRaw,
      killName: meta.kill,
      killValue: killRaw === undefined ? null : killRaw,
      costly: meta.costly,
      effective,
      // Server bilang boleh, statis bilang tidak: bukan bahaya, tapi sumber salah paham.
      serverWantsOnStaticOff: serverFlag && staticMode === 'off',
      reasons
    });
  }
  return { master, rows };
}

const by = (rows, name) => rows.find(r => r.endpoint === name) || { effective: 'off', staticMode: 'off' };
const live = row => row.effective !== 'off';

/** Kombinasi berbahaya. Setiap aturan menyebut AKIBATNYA, bukan hanya namanya. */
export function findings(staticCfg, serverCfg, state) {
  const out = [];
  const push = (severity, code, message) => out.push({ severity, code, message });
  const rows = state.rows;
  const ai = by(rows, 'ai'), tts = by(rows, 'tts'), auth = by(rows, 'auth');
  const quota = by(rows, 'quota'), config = by(rows, 'config'), usage = by(rows, 'usage');

  // 1. AI hidup tanpa identitas: tidak ada subjek yang bisa dikenai kuota per murid, jadi
  //    setiap pemanggil anonim membawa jatah barunya sendiri (reports/work-e9-edge.md §1).
  if (live(ai) && !live(auth)) {
    push('DANGER', 'AI_TANPA_AUTH',
      `ai=${ai.effective} sementara auth=off: kuota per murid tidak punya subjek, setiap pemanggil anonim membawa jatah baru. Nyalakan auth lebih dulu atau matikan ai.`);
  }
  // 2. AI hidup tanpa kuota = BIAYA TAK TERBATAS. Ini aturan yang paling penting di berkas ini.
  if (live(ai) && !live(quota)) {
    push('DANGER', 'AI_TANPA_KUOTA',
      `ai=${ai.effective} sementara quota=off: tidak ada plafon harian per murid yang ditegakkan di jalur ini = BIAYA TAK TERBATAS (neuron akun 10.000/hari dikuras siapa pun). Matikan ai sampai quota=on.`);
  }
  // 3. TTS punya biaya per karakter; alasannya identik dengan #2.
  if (live(tts) && !live(quota)) {
    push('DANGER', 'TTS_TANPA_KUOTA',
      `tts=${tts.effective} sementara quota=off: karakter TTS tidak berplafon = biaya tak terbatas dan jatah neuron akun bisa habis untuk semua murid sekaligus.`);
  }
  // 4. Kill switch yang tidak terbaca sama dengan tidak ada kill switch.
  const liveOthers = rows.filter(r => r.endpoint !== 'config' && live(r)).map(r => r.endpoint);
  if (liveOthers.length && !live(config)) {
    push('DANGER', 'KILL_SWITCH_TAK_TERBACA',
      `config=off sementara ${liveOthers.join(',')} hidup: klien tidak pernah membaca /api/config, jadi memutar KV cfg:flags TIDAK akan mematikan apa pun. Nyalakan config lebih dulu.`);
  }
  // 5. Tiga endpoint paling berisiko naik bersamaan = tidak ada satu rilis per endpoint,
  //    dan kalau ada gejala tidak ada cara tahu mana penyebabnya.
  const riskyOn = ['auth', 'tts', 'ai'].filter(n => by(rows, n).effective === 'on');
  if (riskyOn.length >= 2) {
    push('DANGER', 'BANYAK_RISIKO_SEKALIGUS',
      `${riskyOn.join(' + ')} bernilai 'on' sekaligus: melanggar satu rilis per endpoint, dan gejala apa pun tidak bisa diatribusikan. Turunkan sampai tinggal satu.`);
  }
  // 6. Shadow pada endpoint berbayar tetap membakar uang (runbook 4.6 tabel status).
  for (const row of [ai, tts]) {
    if (row.effective === 'shadow') {
      push('WARN', 'SHADOW_BERBAYAR',
        `${row.endpoint}=shadow: jawabannya dibuang TETAPI biaya neuron/karakter tetap terpakai. Batasi durasinya dan pantau angka neuron harian.`);
    }
  }
  // 7. Rencana mandul: seseorang menaikkan endpoint padahal sakelar induk mati. Bukan bahaya,
  //    tapi ia membuat orang percaya sesuatu sudah menyala padahal belum.
  const wanted = rows.filter(r => r.staticMode === 'shadow' || r.staticMode === 'on').map(r => r.endpoint);
  if (!state.master && wanted.length) {
    push('WARN', 'RENCANA_MANDUL',
      `${wanted.join(',')} bernilai non-off di core-config.js tetapi enabled=${staticCfg.enabled} base='${staticCfg.base}' -> seluruh jalur CF mati. Tidak ada yang benar-benar menyala.`);
  }
  // 8. Server menyalakan sesuatu yang statisnya off: harus tidak berpengaruh, dan itu
  //    ditegaskan supaya tidak ada yang menunggu efek yang tidak akan datang.
  for (const row of rows) {
    if (row.serverWantsOnStaticOff) {
      push('WARN', 'SERVER_TIDAK_BISA_MENYALAKAN',
        `server ${row.serverFlag}=true tetapi statis ${row.endpoint}=off -> hasil tetap off. Server hanya bisa MEMATIKAN; penyalaan butuh rilis klien.`);
    }
  }
  // 9. Protokol. Frontend menolak apa pun selain 1.7 di tiga tempat (app.js).
  if (serverCfg.reachable && serverCfg.protocol && serverCfg.protocol !== '1.7') {
    push('DANGER', 'PROTOKOL_TIDAK_COCOK',
      `/api/config melaporkan protocol='${serverCfg.protocol}', klien mengunci '1.7'. Setiap jalur CF akan ditolak klien.`);
  }
  // 10. usage hidup tanpa kill switch analytics terbuka sudah tertangkap di effectiveState;
  //     yang perlu diperingatkan adalah kebalikannya: analytics dihidupkan server sementara
  //     ANALYTICS_ENABLED di Worker masih 'off' -> event dibuang senyap.
  if (live(usage) && serverCfg.kill?.analytics === true && serverCfg.flags?.cfAnalyticsEnabled === true) {
    push('WARN', 'ANALYTICS_BISA_SENYAP',
      "usage hidup: pastikan var Worker ANALYTICS_ENABLED bukan 'off', kalau tidak /api/usage/* menjawab 202 {disabled:true} dan nol baris ditulis — hijau tapi hampa.");
  }
  return out;
}

/* --------------------------------------------------------------------------------------- */

function parseArgs(argv) {
  const args = { config: path.join(REPO_ROOT, 'core-config.js'), json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--config') { args.config = argv[i + 1]; i += 1; }
    else if (a.startsWith('--config=')) args.config = a.slice('--config='.length);
  }
  return args;
}

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function render(state, results, staticCfg, serverCfg) {
  const lines = [];
  lines.push('FIEZEL flag-plan-check — keadaan efektif (statis × server = hasil)');
  lines.push(`sakelar induk: enabled=${staticCfg.enabled} base='${staticCfg.base}' => ${state.master ? 'HIDUP' : 'MATI (semua endpoint off)'}`);
  lines.push(`/api/config: ${serverCfg.reachable ? `terbaca (protocol=${serverCfg.protocol || '?'})` : 'TIDAK terbaca -> default off (gagal ke arah aman)'}`);
  lines.push('');
  for (const row of state.rows) {
    const server = row.serverValue === null ? 'absen' : String(row.serverValue);
    const kill = row.killName ? `${row.killName}=${row.killValue === null ? 'absen' : String(row.killValue)}` : 'n/a';
    lines.push(`EFFECTIVE ${row.endpoint.padEnd(7)} statis=${row.staticMode.padEnd(7)} server=${server.padEnd(6)} kill=${kill.padEnd(14)} => ${row.effective.toUpperCase()}`);
    if (row.reasons.length) lines.push(`          alasan: ${row.reasons.join('; ')}`);
  }
  lines.push('');
  if (!results.length) {
    lines.push('TEMUAN: tidak ada. Tidak ada kombinasi berbahaya pada keadaan ini.');
  } else {
    for (const f of results) lines.push(`${f.severity}: ${f.code} — ${f.message}`);
  }
  const dangers = results.filter(f => f.severity === 'DANGER').length;
  lines.push('');
  lines.push(`RINGKASAN: ${dangers} DANGER, ${results.length - dangers} WARN`);
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let staticCfg;
  try {
    staticCfg = readStaticConfig(fs.readFileSync(args.config, 'utf8'));
  } catch (error) {
    console.error(`flag-plan-check: tidak bisa membaca ${args.config}: ${error?.message || error}`);
    process.exit(1);
  }
  const serverCfg = readServerConfig(readStdin());
  const state = effectiveState(staticCfg, serverCfg);
  const results = findings(staticCfg, serverCfg, state);
  if (args.json) {
    console.log(JSON.stringify({
      schema: 'fiezel-flag-plan-check-v1',
      master: state.master,
      serverReachable: serverCfg.reachable,
      endpoints: state.rows.map(r => ({ endpoint: r.endpoint, staticMode: r.staticMode, server: r.serverValue, kill: r.killValue, effective: r.effective, reasons: r.reasons })),
      findings: results,
      dangerCount: results.filter(f => f.severity === 'DANGER').length
    }, null, 2));
  } else {
    console.log(render(state, results, staticCfg, serverCfg));
  }
  process.exit(results.some(f => f.severity === 'DANGER') ? 3 : 0);
}

// Dijalankan sebagai CLI, tetapi tetap bisa di-`import` oleh gerbang tanpa efek samping.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
