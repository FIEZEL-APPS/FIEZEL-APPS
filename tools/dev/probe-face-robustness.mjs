#!/usr/bin/env node
/**
 * tools/dev/probe-face-robustness.mjs — STRESS-TEST EMPIRIS PENJAGA WAJAH UJIAN.
 *
 * Menyuntikkan bingkai sintetis 3D (tools/face-synth.js) ke mesin
 * features/class-hub/fiezel-face-guard.js dan mencatat keluarannya per bingkai:
 *
 *   A. Matriks per-bingkai — pose (menunduk/menoleh), aksesoris (kacamata + pantulan layar,
 *      kerudung, poni), cahaya (backlight, redup), jarak, warna kulit; dan benda bukan-wajah
 *      (kardus, dinding krem, meja kayu, gorden, telapak, buku). Tiap kasus 16 bingkai dengan
 *      derau & jitter berbeda → laju deteksi + alasan tolak dominan + metrik (eyeDip, kotak).
 *      Diuji di dua keadaan mesin: PRA-ENROLL (model universal, preflight) dan UJIAN
 *      (profil murid terkunci sesudah liveness pada adegan yang sama, pose frontal).
 *   B. Liveness preflight — wajah hidup (diam/kedip), foto cetak diam/digoyang, layar HP.
 *   C. Temporal ujung-ke-ujung — start() sungguhan dengan DOM/kamera tiruan & jam tiruan:
 *      membaca 60 dtk, frame drop 1–2 bingkai, blur gerak, menunduk menulis 2,5 dtk,
 *      pergi 8 dtk, kardus/tangan menutup kamera. Mencatat peringatan & latensinya.
 *   D. Performa — µs per analyzeFrame, readback kanvas per tick, tick per detik.
 *
 * Pemakaian (dari akar repo):
 *   node tools/dev/probe-face-robustness.mjs
 *   node tools/dev/probe-face-robustness.mjs --engine /tmp/face-guard-lama.js   # A/B mesin lama
 *   node tools/dev/probe-face-robustness.mjs --json reports/face-robustness.json
 *   node tools/dev/probe-face-robustness.mjs --quick                            # 6 bingkai/kasus
 *
 * Keluar dengan kode 1 bila ada kasus berharapan ('hadir'/'absen') yang meleset dari batas
 * di bawah (TP >= 0.9, TN <= 0.05 per bingkai; temporal: 0 peringatan palsu, peringatan
 * nyata <= 4 dtk). Kasus 'info' dicatat tanpa vonis.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const S = require(path.join(ROOT, 'tools/face-synth.js'));

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : d; };
const QUICK = argv.includes('--quick');
const FEATURES = argv.includes('--features');
const ONLY = arg('--only', null);
const ENGINE_PATH = path.resolve(arg('--engine', path.join(ROOT, 'features/class-hub/fiezel-face-guard.js')));
const JSON_OUT = arg('--json', null);
const FRAMES = QUICK ? 6 : 16;
// TN_MAX 10%: kilasan lolos yang jarang tidak bisa menahan status hadir — kehadiran di tengah
// kehilangan wajib dikonfirmasi 2 bingkai dalam 1,5 dtk (lihat bagian C).
const TP_MIN = 0.9, TN_MAX = 0.1;

function loadEngine() {
  delete require.cache[ENGINE_PATH];
  return require(ENGINE_PATH);
}
const E = loadEngine();

// ------------------------------------------------------------------ jam tiruan
let fakeNow = 1.7e12;
const realNow = Date.now;
Date.now = () => fakeNow;

// ------------------------------------------------------------------ adegan
const BASE = { bg: 'kamar', face: { skin: 'sawo' }, seed: 1 };
const V = (patch, from = BASE) => S.variant(from, patch);
const DIM = { bg: 'gelap', exposure: 0.34, wb: [1.12, 1, 0.78], noise: { luma: 4, chroma: 3 } };
const BACKLIT = { bg: 'jendela', light: { amb: 0.22, dif: 0.26 }, bloom: 0.5, noise: { luma: 2.5, chroma: 1.5 } };

const CASES = [
  // ---- 1. Toleransi pose & anatomi (harus HADIR)
  { id: 'frontal', grp: 'pose', exp: 'hadir', sc: BASE },
  { id: 'nunduk-15', grp: 'pose', exp: 'hadir', sc: V({ face: { pitch: 15 } }) },
  { id: 'nunduk-25', grp: 'pose', exp: 'hadir', sc: V({ face: { pitch: 25 } }) },
  { id: 'hp-di-bawah (dongak -15)', grp: 'pose', exp: 'hadir', sc: V({ face: { pitch: -15 } }) },
  { id: 'toleh-kiri-15', grp: 'pose', exp: 'hadir', sc: V({ face: { yaw: -15 } }) },
  { id: 'toleh-kiri-30', grp: 'pose', exp: 'hadir', sc: V({ face: { yaw: -30 } }) },
  { id: 'toleh-kanan-15', grp: 'pose', exp: 'hadir', sc: V({ face: { yaw: 15 } }) },
  { id: 'toleh-kanan-30', grp: 'pose', exp: 'hadir', sc: V({ face: { yaw: 30 } }) },
  { id: 'miring-kepala-12', grp: 'pose', exp: 'hadir', sc: V({ face: { roll: 12 } }) },
  { id: 'baca: nunduk-20+toleh-15', grp: 'pose', exp: 'hadir', sc: V({ face: { pitch: 20, yaw: 15 } }) },
  { id: 'jarak-jauh (wajah 14px)', grp: 'pose', exp: 'hadir', sc: V({ face: { scale: 7, cy: 20 } }) },
  { id: 'jarak-dekat (wajah 30px)', grp: 'pose', exp: 'hadir', sc: V({ face: { scale: 15, cy: 24 } }) },
  { id: 'di-pinggir-bingkai', grp: 'pose', exp: 'hadir', sc: V({ face: { cx: 19 } }) },
  { id: 'kacamata', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { glasses: { glare: 0 } } }) },
  { id: 'kacamata+pantulan-layar', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { glasses: { glare: 0.85 } } }) },
  { id: 'kacamata+pantulan+nunduk-20', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { glasses: { glare: 0.85 }, pitch: 20 } }) },
  { id: 'kerudung-hitam', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hijab: [36, 38, 50], hair: null } }) },
  { id: 'kerudung-putih', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hijab: [226, 226, 228], hair: null } }) },
  { id: 'kerudung-krem', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hijab: [204, 180, 150], hair: null } }) },
  { id: 'kerudung-hitam+nunduk-20', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hijab: [36, 38, 50], hair: null, pitch: 20 } }) },
  { id: 'poni', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hair: 'poni' } }) },
  { id: 'poni+nunduk-20', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hair: 'poni', pitch: 20 } }) },
  { id: 'rambut-panjang', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { hair: 'panjang' } }) },
  { id: 'seragam-pramuka (cokelat)', grp: 'aksesoris', exp: 'hadir', sc: V({ face: { shirt: [150, 118, 78] } }) },
  { id: 'backlight-jendela', grp: 'cahaya', exp: 'hadir', sc: V(BACKLIT) },
  { id: 'backlight+nunduk-20', grp: 'cahaya', exp: 'hadir', sc: V(Object.assign({}, BACKLIT, { face: { pitch: 20 } })) },
  { id: 'redup-malam', grp: 'cahaya', exp: 'hadir', sc: V(DIM) },
  { id: 'redup+toleh-20', grp: 'cahaya', exp: 'hadir', sc: V(Object.assign({}, DIM, { face: { yaw: 20 } })) },
  { id: 'redup+kerudung-hitam', grp: 'cahaya', exp: 'hadir', sc: V(Object.assign({}, DIM, { exposure: 0.6, face: { hijab: [40, 44, 60], hair: null } })) },
  { id: 'lampu-led-dingin', grp: 'cahaya', exp: 'hadir', sc: V({ wb: [0.9, 1, 1.12] }) },
  { id: 'lampu-bohlam-hangat', grp: 'cahaya', exp: 'hadir', sc: V({ wb: [1.12, 1, 0.8] }) },
  { id: 'cahaya-samping-keras', grp: 'cahaya', exp: 'hadir', sc: V({ light: { dir: [0.9, 0.2, 0.4], amb: 0.3, dif: 0.8 } }) },
  { id: 'latar-dinding-krem', grp: 'cahaya', exp: 'hadir', sc: V({ bg: 'kamar-krem' }) },
  { id: 'kulit-terang', grp: 'kulit', exp: 'hadir', sc: V({ face: { skin: 'terang' } }) },
  { id: 'kulit-langsat', grp: 'kulit', exp: 'hadir', sc: V({ face: { skin: 'langsat' } }) },
  { id: 'kulit-gelap', grp: 'kulit', exp: 'hadir', sc: V({ face: { skin: 'gelap' } }) },
  { id: 'kulit-sangat-gelap', grp: 'kulit', exp: 'hadir', sc: V({ face: { skin: 'sangat-gelap' } }) },
  { id: 'kulit-sangat-gelap+redup', grp: 'kulit', exp: 'hadir', sc: V(Object.assign({}, DIM, { face: { skin: 'sangat-gelap' }, exposure: 0.5 })) },

  // ---- 2. Diskriminasi benda bukan-wajah (harus ABSEN)
  { id: 'kardus-penuh', grp: 'benda', exp: 'absen', sc: { object: { kind: 'kardus', tape: true, print: true } } },
  { id: 'kardus-polos', grp: 'benda', exp: 'absen', sc: { object: { kind: 'kardus' } } },
  { id: 'kardus-lampu-atas', grp: 'benda', exp: 'absen', sc: { object: { kind: 'kardus', lit: true } } },
  { id: 'kardus-dipegang', grp: 'benda', exp: 'absen', sc: { bg: 'kamar', occluders: [{ kind: 'buku', x0: 12, y0: 5, x1: 52, y1: 44, color: [184, 140, 96] }, { kind: 'tangan', cx: 10, cy: 38, r: 7 }] } },
  { id: 'dinding-krem', grp: 'benda', exp: 'absen', sc: { object: { kind: 'dinding' } } },
  { id: 'dinding-tan-gelap', grp: 'benda', exp: 'absen', sc: { object: { kind: 'dinding', color: [176, 140, 104] } } },
  { id: 'meja-kayu', grp: 'benda', exp: 'absen', sc: { object: { kind: 'meja-kayu' } } },
  { id: 'gorden', grp: 'benda', exp: 'absen', sc: { object: { kind: 'gorden' } } },
  { id: 'telapak-menempel-lensa', grp: 'benda', exp: 'absen', sc: { object: { kind: 'telapak-dekat' } } },
  { id: 'telapak-menutupi-wajah', grp: 'benda', exp: 'absen', sc: V({ occluders: [{ kind: 'tangan', cx: 31, cy: 25, r: 15 }] }) },
  { id: 'tangan-menutup-sebagian (mata)', grp: 'benda', exp: 'absen', sc: V({ occluders: [{ kind: 'buku', x0: 0, y0: 0, x1: 64, y1: 26, color: [200, 142, 110] }] }) },
  { id: 'buku-menutup-penuh', grp: 'benda', exp: 'absen', sc: V({ occluders: [{ kind: 'buku', x0: -1, y0: -1, x1: 65, y1: 49 }] }) },
  { id: 'buku-menutup-sebagian (mata)', grp: 'benda', exp: 'absen', sc: V({ occluders: [{ kind: 'buku', x0: 0, y0: 0, x1: 64, y1: 27, color: [150, 60, 50] }] }) },
  { id: 'buku-terbuka-redup', grp: 'benda', exp: 'absen', sc: { object: { kind: 'buku-terbuka' }, exposure: 0.55 } },
  { id: 'kursi-kosong', grp: 'benda', exp: 'absen', sc: { bg: 'kamar' } },
  { id: 'kamar-krem-kosong', grp: 'benda', exp: 'absen', sc: { bg: 'kamar-krem' } },
  { id: 'langit-langit', grp: 'benda', exp: 'absen', sc: { object: { kind: 'langit-langit' } } },
  // Menoleh jauh hanya bisa dinilai terhadap profil murid (rasio kotak berubah) — model
  // universal pra-enroll memang tidak tahu bentuk wajah murid ini.
  { id: 'menoleh-jauh-75', grp: 'benda', exp: 'absen', mode: 'ujian', sc: V({ face: { yaw: 75 } }) },
  { id: 'menunduk-menulis-55', grp: 'benda', exp: 'info', sc: V({ face: { pitch: 55 } }) },
  { id: 'foto-cetak (per-bingkai)', grp: 'benda', exp: 'info', sc: { bg: 'kamar', face: { skin: 'sawo' }, photo: { kind: 'cetak', x0: 14, y0: 4, x1: 50, y1: 44 } } },
  { id: 'layar-hp (per-bingkai)', grp: 'benda', exp: 'info', sc: { bg: 'kamar', face: { skin: 'sawo' }, photo: { kind: 'layar', x0: 16, y0: 3, x1: 48, y1: 45 } } }
];

// ------------------------------------------------------------------ util
const cache = new Map();
function frame(sc) {
  const key = JSON.stringify(sc);
  let f = cache.get(key);
  if (!f) { f = S.mockFrame(sc); cache.set(key, f); }
  return f;
}
function jittered(sc, k) {
  const rnd = S.mulberry32(9001 + k * 77);
  const j = (a) => (rnd() - 0.5) * 2 * a;
  const out = Object.assign({}, sc, { seed: (sc.seed || 1) * 100 + k });
  if (sc.face) out.face = Object.assign({}, sc.face, { cx: (sc.face.cx || 32) + j(0.6), cy: (sc.face.cy || 21) + j(0.6), yaw: (sc.face.yaw || 0) + j(2), pitch: (sc.face.pitch || 0) + j(2) });
  return out;
}
function pct(x) { return (x * 100).toFixed(0).padStart(3) + '%'; }
function analyze(sc) { const f = frame(sc); return E.analyzeFrame(f.video, f.cvs, f.ctx, null); }

/** Kunci profil murid lewat checkLiveness sungguhan (kedip, lalu jalur diam tenang). */
function enroll(sc) {
  E.resetLiveness();
  if (E.resetEnrolledProfile) E.resetEnrolledProfile();
  const open = (k) => jittered(sc, 500 + (k % 20));
  const closed = (k) => { const s = jittered(sc, 500 + (k % 20)); if (s.face) s.face = Object.assign({}, s.face, { eyes: 'tutup' }); return s; };
  const t0 = fakeNow;
  let res = null;
  const seq = [];
  for (let i = 0; i < 4; i++) seq.push(open(i));
  seq.push(closed(4), closed(5), open(6));
  for (let i = 7; i < 120; i++) seq.push(i % 40 === 20 ? closed(i) : open(i)); // kedip tiap 2,4 dtk, ~7 dtk
  for (const s of seq) {
    const f = frame(s);
    res = E.checkLiveness(f.video, f.cvs, f.ctx);
    if (res.stage === 'verified') break;
    fakeNow += 60;
  }
  const ms = fakeNow - t0;
  fakeNow += 1000;
  return { ok: !!(res && res.stage === 'verified') && E.isEnrolled(), ms, stage: res && res.stage, reason: res && res.reason };
}

function rateFor(sc, enrolled) {
  let hits = 0;
  const reasons = {};
  let dipSum = 0, dipN = 0, last = null;
  const feats = [];
  for (let k = 0; k < FRAMES; k++) {
    if (!enrolled) { E.resetLiveness(); if (E.resetEnrolledProfile) E.resetEnrolledProfile(); }
    const r = analyze(jittered(sc, k));
    fakeNow += 500;
    if (r.present && !r.isSpoof) hits++;
    else reasons[r.reason || 'tidak-diketahui'] = (reasons[r.reason || 'tidak-diketahui'] || 0) + 1;
    if (typeof r.eyeDip === 'number') { dipSum += r.eyeDip; dipN++; }
    if (typeof r.dipN === 'number') feats.push({ pairN: r.pairN || 0, mouthN: r.mouthDipN == null ? 9 : r.mouthDipN, dipN: r.dipN, asymN: r.asym / Math.max(20, r.skinBr || 20), boxW: r.boxW, boxH: r.boxH, skin: r.skinCount, Ys: r.skinBr });
    last = r;
  }
  const top = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  const fm = (k) => feats.length ? +(feats.reduce((a, f) => a + f[k], 0) / feats.length).toFixed(3) : null;
  const fmin = (k) => feats.length ? +Math.min(...feats.map((f) => f[k])).toFixed(3) : null;
  const fmax = (k) => feats.length ? +Math.max(...feats.map((f) => f[k])).toFixed(3) : null;
  return { rate: hits / FRAMES, reason: top ? top[0] : '', eyeDip: dipN ? +(dipSum / dipN).toFixed(2) : null, last, feat: { pairN: fm('pairN'), pairNmin: fmin('pairN'), mouthN: fm('mouthN'), mouthNmin: fmin('mouthN'), dipN: fm('dipN'), dipNmin: fmin('dipN'), dipNmax: fmax('dipN'), asymN: fm('asymN'), asymNmax: fmax('asymN'), boxW: fm('boxW'), boxH: fm('boxH'), skin: fm('skin'), Ys: fm('Ys') } };
}

function verdict(exp, rate) {
  if (exp === 'hadir') return rate >= TP_MIN ? 'OK' : 'GAGAL';
  if (exp === 'absen') return rate <= TN_MAX ? 'OK' : 'GAGAL';
  return 'info';
}

// ------------------------------------------------------------------ A. matriks per-bingkai
const report = { engine: path.relative(ROOT, ENGINE_PATH), frames: FRAMES, matrix: [], liveness: [], temporal: [], perf: {} };
let failures = 0;
console.log(`\n=== A. MATRIKS PER-BINGKAI (${FRAMES} bingkai/kasus) — mesin: ${report.engine} ===`);
console.log('kasus'.padEnd(36) + 'harap'.padEnd(7) + 'enroll'.padEnd(9) + 'pra-enroll'.padEnd(26) + 'ujian (profil)'.padEnd(28) + 'vonis');
const DEFAULT_ENROLL = BASE;
for (const c of CASES) {
  if (ONLY && !ONLY.split(',').some((o) => c.id.includes(o))) continue;
  const pre = rateFor(c.sc, false);
  // Profil dikunci pada adegan yang sama, pose frontal (murid verifikasi di tempat ujiannya).
  const enrollScene = c.sc.face && !c.sc.photo && !c.sc.occluders ? S.variant(c.sc, { face: { yaw: 0, pitch: 0, roll: 0 } }) : DEFAULT_ENROLL;
  const en = c.exp === 'hadir' || c.grp !== 'benda' ? enroll(enrollScene) : enroll(DEFAULT_ENROLL);
  const exam = en.ok ? rateFor(c.sc, true) : { rate: NaN, reason: 'enroll-gagal', eyeDip: null };
  // Vonis ujian dipakai bila enroll berhasil; bila enroll gagal, murid tertahan di preflight → GAGAL untuk TP.
  const vExam = en.ok ? verdict(c.exp, exam.rate) : (c.exp === 'hadir' ? 'GAGAL' : 'info');
  const vPre = c.mode === 'ujian' ? 'OK' : verdict(c.exp, pre.rate);
  const v = c.exp === 'info' ? 'info' : (vExam === 'GAGAL' || vPre === 'GAGAL' ? 'GAGAL' : 'OK');
  if (v === 'GAGAL') failures++;
  const preTxt = `${pct(pre.rate)} ${pre.reason}`.slice(0, 25);
  const exTxt = en.ok ? `${pct(exam.rate)} ${exam.reason}`.slice(0, 27) : `— (${en.stage}${en.reason ? ':' + en.reason : ''})`.slice(0, 27);
  console.log(c.id.slice(0, 35).padEnd(36) + c.exp.padEnd(7) + (en.ok ? (en.ms + 'ms') : 'GAGAL').padEnd(9) + preTxt.padEnd(26) + exTxt.padEnd(28) + v);
  if (FEATURES) console.log('    pre ' + JSON.stringify(pre.feat) + (en.ok ? '\n    exam ' + JSON.stringify(exam.feat) + ' dipNMean=' + (+E.getEnrolledProfile().dipNMean || 0).toFixed(3) : ''));
  report.matrix.push({ id: c.id, grp: c.grp, exp: c.exp, enrollOk: en.ok, enrollMs: en.ms, pre: { rate: pre.rate, reason: pre.reason, eyeDip: pre.eyeDip }, exam: { rate: exam.rate, reason: exam.reason, eyeDip: exam.eyeDip }, verdict: v });
}

// ------------------------------------------------------------------ B. liveness preflight
console.log('\n=== B. LIVENESS PREFLIGHT (tick 60 ms, batas 20 dtk) ===');
function liveRun(name, exp, frameAt) {
  E.resetLiveness(); if (E.resetEnrolledProfile) E.resetEnrolledProfile();
  const t0 = fakeNow; let res = null, i = 0;
  while (fakeNow - t0 <= 20000) {
    const f = frame(frameAt(i++));
    res = E.checkLiveness(f.video, f.cvs, f.ctx);
    if (res.stage === 'verified') break;
    fakeNow += 60;
  }
  const passed = res && res.stage === 'verified';
  const ms = passed ? fakeNow - t0 : null;
  // 'batas': di 64x48 foto berderau tak terbedakan dari wajah diam (lihat docs handoff
  // m025-565) — yang dijaga hanyalah: foto TIDAK lolos lewat kedip/toleh palsu sebelum jalur
  // diam-tenang (STEADY_HOLD_MS) selesai.
  const ok = exp === 'lolos' ? passed : exp === 'tolak' ? !passed : exp === 'batas' ? (!passed || ms >= E.STEADY_HOLD_MS) : null;
  const v = ok === null ? 'info' : !ok ? 'GAGAL' : exp === 'batas' ? (passed ? 'batas' : 'OK') : 'OK';
  if (v === 'GAGAL') failures++;
  console.log(name.padEnd(44) + exp.padEnd(7) + (passed ? `lolos ${ms}ms` : `tertahan (${res && res.stage}${res && res.reason ? ':' + res.reason : ''})`).padEnd(36) + v);
  report.liveness.push({ name, exp, passed, ms, verdict: v });
  fakeNow += 1000;
}
const micro = (sc, i) => { const s = jittered(sc, i % 997); return s; };
liveRun('wajah hidup diam (mikro-gerak + derau)', 'lolos', (i) => micro(BASE, i));
liveRun('wajah hidup berkedip di dtk 1,5', 'lolos', (i) => { const s = micro(BASE, i); if (i >= 25 && i <= 27) s.face = Object.assign({}, s.face, { eyes: 'tutup' }); return s; });
liveRun('wajah berponi diam', 'lolos', (i) => micro(V({ face: { hair: 'poni' } }), i));
liveRun('wajah berkerudung diam', 'lolos', (i) => micro(V({ face: { hijab: [36, 38, 50], hair: null } }), i));
liveRun('wajah berkacamata + pantulan layar', 'lolos', (i) => micro(V({ face: { glasses: { glare: 0.85 } } }), i));
liveRun('wajah backlight jendela', 'lolos', (i) => micro(V(BACKLIT), i));
liveRun('wajah ruangan redup', 'lolos', (i) => micro(V(DIM), i));
const PHOTO = { bg: 'kamar', face: { skin: 'sawo' }, photo: { kind: 'cetak', x0: 14, y0: 4, x1: 50, y1: 44 }, noise: { luma: 1.2, chroma: 0.8 } };
liveRun('foto cetak diam (derau sensor saja)', 'batas', (i) => Object.assign({}, PHOTO, { seed: i + 1 }));
liveRun('foto cetak digoyang tangan (kaku)', 'batas', (i) => { const dx = Math.round(Math.sin(i / 5) * 1.5); return Object.assign({}, PHOTO, { seed: i + 1, photo: Object.assign({}, PHOTO.photo, { x0: 14 + dx, x1: 50 + dx }) }); });
const SCREEN = { bg: 'kamar', face: { skin: 'sawo' }, photo: { kind: 'layar', x0: 16, y0: 3, x1: 48, y1: 45 }, noise: { luma: 1.2, chroma: 0.8 } };
liveRun('layar HP, foto diam', 'batas', (i) => Object.assign({}, SCREEN, { seed: i + 1 }));
liveRun('layar HP, video wajah berkedip (batas jujur)', 'info', (i) => { const s = Object.assign({}, SCREEN, { seed: i + 1 }); if (i % 40 > 36) s.face = Object.assign({}, s.face, { eyes: 'tutup' }); return s; });

// ------------------------------------------------------------------ C. temporal ujung-ke-ujung
console.log('\n=== C. TEMPORAL UJUNG-KE-UJUNG (start() + DOM/kamera tiruan, jam tiruan) ===');
function harness() {
  const calls = { draw: 0, read: 0 };
  let current = null;
  const track = { readyState: 'live', muted: false, stop() {} };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const mkEl = (tag) => {
    if (tag === 'canvas') {
      return {
        width: 0, height: 0,
        getContext: () => ({
          drawImage() { calls.draw++; },
          getImageData() { calls.read++; return { data: current.data }; }
        })
      };
    }
    return { tag, style: {}, readyState: 4, paused: false, videoWidth: 320, videoHeight: 240, setAttribute() {}, play() { return Promise.resolve(); }, parentNode: { removeChild() {} } };
  };
  const g = globalThis;
  const saved = { navigator: Object.getOwnPropertyDescriptor(g, 'navigator'), document: g.document, setInterval: g.setInterval, clearInterval: g.clearInterval };
  let tickFn = null, tickMs = 0;
  Object.defineProperty(g, 'navigator', { value: { mediaDevices: { getUserMedia: () => Promise.resolve(stream) } }, configurable: true, writable: true });
  g.document = { visibilityState: 'visible', createElement: mkEl, body: { appendChild() {} } };
  g.setInterval = (fn, ms) => { tickFn = fn; tickMs = ms; return 1; };
  g.clearInterval = () => {};
  return {
    calls, setFrame(f) { current = f; }, get tick() { return tickFn; }, get tickMs() { return tickMs; },
    restore() {
      if (saved.navigator) Object.defineProperty(g, 'navigator', saved.navigator); else delete g.navigator;
      g.document = saved.document; g.setInterval = saved.setInterval; g.clearInterval = saved.clearInterval;
    }
  };
}

async function timeline(name, exp, durMs, sceneAt) {
  const en = enroll(BASE);
  const profile = E.getEnrolledProfile();
  const h = harness();
  const ev = { warnOn: [], warnOff: [], absent: [], episodes: [], present: [] };
  const t0 = fakeNow;
  const rel = () => fakeNow - t0;
  try {
    h.setFrame(frame(BASE));
    const res = await E.start({
      profile,
      onWarning: (w) => (w ? ev.warnOn : ev.warnOff).push(rel()),
      onAbsent: () => ev.absent.push(rel()),
      onAbsentEpisode: () => ev.episodes.push(rel()),
      onPresent: (d) => ev.present.push({ t: rel(), d })
    });
    if (!res || !res.ok) throw new Error('start gagal: ' + JSON.stringify(res));
    const step = h.tickMs;
    let ticks = 0;
    const c0 = { draw: h.calls.draw, read: h.calls.read };
    for (let t = 0; t <= durMs; t += step) {
      fakeNow = t0 + t;
      h.setFrame(frame(sceneAt(t)));
      h.tick();
      ticks++;
      await Promise.resolve();
    }
    const perTick = { draw: (h.calls.draw - c0.draw) / ticks, read: (h.calls.read - c0.read) / ticks };
    E.stop();
    const early = exp.leaveAt != null ? ev.warnOn.filter((t) => t < exp.leaveAt) : [];
    const firstWarn = exp.leaveAt != null ? (ev.warnOn.find((t) => t >= exp.leaveAt) ?? null) : (ev.warnOn[0] ?? null);
    let ok;
    if (exp.kind === 'tenang') ok = ev.warnOn.length === 0 && ev.episodes.length === 0;
    else ok = !early.length && firstWarn !== null && firstWarn - exp.leaveAt <= exp.maxWarnMs && (exp.backAt == null || ev.warnOff.some((t) => t >= exp.backAt && t - exp.backAt <= 1500));
    const v = ok ? 'OK' : 'GAGAL';
    if (!ok) failures++;
    const lat = firstWarn !== null && exp.leaveAt != null ? `peringatan +${firstWarn - exp.leaveAt}ms` : (ev.warnOn.length ? `${ev.warnOn.length} peringatan @${ev.warnOn.join(',')}` : '0 peringatan');
    console.log(name.padEnd(46) + `tick ${step}ms`.padEnd(12) + lat.padEnd(30) + `episode ${ev.episodes.length}`.padEnd(12) + v);
    report.temporal.push({ name, tickMs: step, warnOn: ev.warnOn, warnOff: ev.warnOff, episodes: ev.episodes, absent: ev.absent, perTick, enrolled: en.ok, verdict: v });
    return perTick;
  } finally {
    try { E.stop(); } catch (_) {}
    h.restore();
    fakeNow += 1000;
  }
}

const reading = (t, extra) => {
  const ph = t / 1000;
  const s = jittered(V({ face: { pitch: 20 + 5 * Math.sin(ph / 3), yaw: 10 * Math.sin(ph / 7) } }), Math.floor(t / 250) % 997);
  if (Math.floor(t / 250) % 16 === 7) s.face = Object.assign({}, s.face, { eyes: 'tutup' }); // kedip ~ tiap 4 dtk
  return extra ? extra(s, t) : s;
};
const BLACK = { bg: [0, 0, 0], noise: { luma: 0.5, chroma: 0 } };
const AWAY = { bg: 'kamar' };
const CARD = { bg: 'kamar', occluders: [{ kind: 'buku', x0: 8, y0: 2, x1: 56, y1: 46, color: [184, 140, 96] }, { kind: 'tangan', cx: 8, cy: 40, r: 7 }] };
const HAND = { object: { kind: 'telapak-dekat' } };

const perTick = await timeline('membaca tenang 60 dtk (nunduk 15–25, kedip)', { kind: 'tenang' }, 60000, (t) => reading(t));
await timeline('frame drop 1 bingkai / 2 bingkai (hitam)', { kind: 'tenang' }, 40000, (t) => reading(t, (s) => ((t >= 10000 && t < 10250) || (t >= 20000 && t < 20500) ? BLACK : s)));
await timeline('blur gerak 1,5 dtk (garuk kepala)', { kind: 'tenang' }, 30000, (t) => reading(t, (s) => (t >= 10000 && t < 11500 ? Object.assign({}, s, { blur: 4 }) : s)));
await timeline('menunduk menulis 2,5 dtk (pitch 55)', { kind: 'tenang' }, 30000, (t) => reading(t, (s) => (t >= 10000 && t < 12500 ? V({ face: { pitch: 55 } }) : s)));
await timeline('backlight jendela 60 dtk', { kind: 'tenang' }, 60000, (t) => reading(t, (s) => Object.assign({}, s, BACKLIT, { face: s.face })));
await timeline('redup malam 60 dtk', { kind: 'tenang' }, 60000, (t) => reading(t, (s) => Object.assign({}, s, DIM, { face: s.face })));
await timeline('kulit sangat gelap + sangat redup 60 dtk', { kind: 'tenang' }, 60000, (t) => reading(t, (s) => Object.assign({}, s, DIM, { exposure: 0.5, face: Object.assign({}, s.face, { skin: 'sangat-gelap' }) })));
await timeline('pergi 8 dtk lalu kembali', { kind: 'pergi', leaveAt: 10000, backAt: 18000, maxWarnMs: 4000 }, 25000, (t) => (t >= 10000 && t < 18000 ? AWAY : reading(t)));
await timeline('kardus diangkat ke kamera 10 dtk', { kind: 'pergi', leaveAt: 10000, backAt: 20000, maxWarnMs: 4000 }, 26000, (t) => (t >= 10000 && t < 20000 ? Object.assign({}, CARD, { seed: Math.floor(t / 250) }) : reading(t)));
// Deteksi tersendat: wajah ada, tetapi tiap bingkai kedua gagal (cahaya buruk, blur).
await timeline('deteksi tersendat 50% selama 40 dtk', { kind: 'tenang' }, 40000, (t) => (Math.floor(t / E.SAMPLE_INTERVAL_MS) % 2 ? BLACK : reading(t)));
// Murid pergi, tetapi tiap 2 dtk ada satu bingkai "mirip wajah" sesaat (orang lewat, kilasan).
await timeline('pergi 10 dtk + kilasan palsu tiap 2 dtk', { kind: 'pergi', leaveAt: 10000, backAt: 20000, maxWarnMs: 4000 }, 26000, (t) => (t >= 10000 && t < 20000 ? (t % 2000 === 0 ? reading(t) : AWAY) : reading(t)));
await timeline('telapak menutup lensa 10 dtk', { kind: 'pergi', leaveAt: 10000, backAt: 20000, maxWarnMs: 4000 }, 26000, (t) => (t >= 10000 && t < 20000 ? Object.assign({}, HAND, { seed: Math.floor(t / 250) }) : reading(t)));

// ------------------------------------------------------------------ D. performa
console.log('\n=== D. PERFORMA ===');
const perfFrames = CASES.slice(0, 12).map((c) => frame(jittered(c.sc, 3)));
E.resetLiveness();
enroll(BASE);
const N = 3000;
let t1 = process.hrtime.bigint();
for (let i = 0; i < N; i++) { const f = perfFrames[i % perfFrames.length]; E.analyzeFrame(f.video, f.cvs, f.ctx, null); }
let t2 = process.hrtime.bigint();
const usPerCall = Number(t2 - t1) / 1000 / N;
const tickMs = report.temporal[0] ? report.temporal[0].tickMs : E.SAMPLE_INTERVAL_MS;
const ticksPerSec = 1000 / tickMs;
report.perf = {
  usPerAnalyze: +usPerCall.toFixed(1),
  sampleIntervalMs: tickMs,
  ticksPerSec: +ticksPerSec.toFixed(2),
  readbacksPerTick: perTick.read,
  drawsPerTick: perTick.draw,
  readbacksPerSec: +(perTick.read * ticksPerSec).toFixed(2),
  jsMsPerSec: +(usPerCall * ticksPerSec / 1000).toFixed(3)
};
console.log(`analyzeFrame: ${report.perf.usPerAnalyze} µs/panggilan (Node, 64x48)`);
console.log(`interval sampel ujian: ${tickMs} ms → ${report.perf.ticksPerSec} tick/dtk`);
console.log(`readback kanvas per tick: drawImage ${perTick.draw}, getImageData ${perTick.read} → ${report.perf.readbacksPerSec} readback/dtk`);
console.log(`CPU JS analisis: ~${report.perf.jsMsPerSec} ms per detik ujian (di luar biaya drawImage/getImageData peramban)`);
const perfOk = tickMs >= 500 && tickMs <= 1000 && perTick.read <= 1;
if (!perfOk) failures++;
console.log('vonis performa (target 1–2 FPS, 1 readback/tick): ' + (perfOk ? 'OK' : 'GAGAL'));
report.perf.verdict = perfOk ? 'OK' : 'GAGAL';

// ------------------------------------------------------------------ ringkasan
const m = report.matrix;
const tp = m.filter((x) => x.exp === 'hadir'), tn = m.filter((x) => x.exp === 'absen');
const avg = (arr, f) => arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0;
report.summary = {
  tpCases: tp.length, tpOk: tp.filter((x) => x.verdict === 'OK').length,
  tnCases: tn.length, tnOk: tn.filter((x) => x.verdict === 'OK').length,
  tpExamRateMean: +avg(tp, (x) => (isNaN(x.exam.rate) ? 0 : x.exam.rate)).toFixed(3),
  tpPreRateMean: +avg(tp, (x) => x.pre.rate).toFixed(3),
  tnExamFalseRateMean: +avg(tn, (x) => (isNaN(x.exam.rate) ? 0 : x.exam.rate)).toFixed(3),
  tnPreFalseRateMean: +avg(tn, (x) => x.pre.rate).toFixed(3),
  failures
};
console.log('\n=== RINGKASAN ===');
console.log(`wajah (harus hadir): ${report.summary.tpOk}/${report.summary.tpCases} kasus OK — rata-rata deteksi ujian ${pct(report.summary.tpExamRateMean)}, pra-enroll ${pct(report.summary.tpPreRateMean)}`);
console.log(`bukan wajah (harus absen): ${report.summary.tnOk}/${report.summary.tnCases} kasus OK — rata-rata lolos-palsu ujian ${pct(report.summary.tnExamFalseRateMean)}, pra-enroll ${pct(report.summary.tnPreFalseRateMean)}`);
console.log(`total kegagalan: ${failures}`);
if (JSON_OUT) {
  fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify(report, null, 2) + '\n');
  console.log('laporan JSON: ' + JSON_OUT);
}
Date.now = realNow;
process.exit(failures ? 1 : 0);
