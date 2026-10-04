#!/usr/bin/env node
'use strict';
/**
 * tests/braincore-wave2-kelasku-test.js — Gelombang 2 audit kabel BrainCore (m025-459): KelasKu.
 *
 * reports/BRAINCORE-WIRING-AUDIT-2026-10-04.md menemukan KelasKu sama sekali tidak tersambung ke
 * model belajar BrainCore. Gerbang ini menjaga tiga kabel yang sekarang tersambung:
 *   K1  laporan kelas membawa ringkasan BrainCore `bc` (level, arah, jumlah ulangan, pelajaran
 *       lemah, pelajaran yang perlu diperbaiki). Server memvalidasinya dengan ketat: enum,
 *       bilangan, dan kunci pelajaran berpola mesin saja; teks bebas DITOLAK.
 *   K2  layar guru (tab Saran Braincore) membaca `bc` tiap murid: pelajaran yang paling banyak
 *       lemah, jumlah murid yang perlu didampingi, dan baris per murid.
 *   K3  Papan Kelas murid: streak dari semua hari belajar, penguasaan pelajaran dari BrainCore,
 *       dan kartu "Kata Braincore Hari Ini" yang sama dengan Beranda.
 */
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); } else { fails.push(name); console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')); }
}

(async () => {
  // ---- K1: server ----
  const core = await import(path.join(__fzRoot, 'workers/api/teacher/class-sync-core.js'));
  const now = Date.now();
  const base = { cls: 'FZ-ABC234', name: 'Rani', skills: { grammar: { c: 3, t: 5 } } };
  const ok = core.normalizeReport(Object.assign({}, base, { bc: { lv: 'A1', dir: 'up', due: 4, weak: ['subject_object_pronouns_and_possessives'], fix: 'time_prepositions_in_on_at' } }), now);
  check('K1 server menyimpan ringkasan BrainCore yang valid', ok.ok && ok.report.bc && ok.report.bc.lv === 'A1' && ok.report.bc.weak.length === 1 && ok.report.bc.fix === 'time_prepositions_in_on_at', JSON.stringify(ok));
  const noBc = core.normalizeReport(base, now);
  check('K1 laporan lama tanpa bc tetap diterima', noBc.ok && noBc.report.bc === undefined);
  const bad = [
    { lv: 'A1', dir: 'up', due: 1, weak: ['Halo guru, saya bingung!'] },
    { lv: 'Z9', dir: 'up', due: 1 },
    { lv: 'A1', dir: 'sideways', due: 1 },
    { lv: 'A1', dir: 'up', due: -1 },
    { lv: 'A1', dir: 'up', due: 1, weak: ['a', 'b', 'c', 'd'] },
    { lv: 'A1', dir: 'up', due: 1, fix: 'kalimat bebas' },
    'teks'
  ];
  check('K1 server menolak teks bebas dan nilai di luar enum', bad.every(bc => !core.normalizeReport(Object.assign({}, base, { bc }), now).ok));

  // ---- K1: klien ----
  const app = read('app.js');
  const lf = read('features/learner-flow/fiezel-learner-flow.js');
  check('K1 app.js menyusun ringkasan dari BrainCore (momentum, ulangan, BKT, pasangan tertukar)', /function braincoreClassDigest\(\)/.test(app) && /coreBrainSnapshot\(\)\?\.momentum/.test(app) && /dueItems\(\)/.test(app) && /M\.mastery\(raw,k,now\)/.test(app) && /braincoreFixSkill\(braincoreConfusedPair\(\)\)/.test(app));
  check('K1 laporan kelas murid menempelkan bc', /payload\.bc = bc/.test(lf) && /root\.braincoreClassDigest/.test(lf));

  // ---- K2: guru ----
  global.self = global; global.window = global;
  global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
  const store = read('features/teacher/fiezel-teacher-store.js');
  check('K2 penyimpan guru menormalkan bc lagi (jalur kode tempel tidak lewat server)', /\/\^\(A1\|A2\|B1\|B2\|C1\|C2\)\$\//.test(store) && /s\.braincore = parsed\.braincore/.test(store));
  const hub = read('features/class-hub/fiezel-class-hub.js');
  check('K2 tab Saran Braincore guru merender model BrainCore murid', /tBraincoreLearnerModel\(c\) \+ '<section class="ch-card ch-card-ink">/.test(hub) && /data-testid="tclass-braincore-model"/.test(hub));

  // ---- K3: murid ----
  check('K3 streak Papan Kelas memakai semua hari belajar', /var belajar = learningDays\(\)/.test(hub));
  check('K3 skill Papan Kelas ikut penguasaan BrainCore', /\.concat\(braincoreLessonSkills\(\)\)/.test(hub));
  check('K3 kartu "Kata Braincore Hari Ini" tampil di Papan Kelas', /braincoreCardMarkup\(\) \+\s*\n\s*\/\* Streak card \*\//.test(hub));

  // ---- bahasa ----
  const id = read('features/i18n/copy-id-classjoin.js'), th = read('features/i18n/copy-th-classjoin.js');
  const keys = ['kelas.bc-judul', 'kelas.bc-lemah-kelas', 'kelas.bc-n-murid', 'kelas.bc-ringkas', 'kelas.bc-arah-naik', 'kelas.bc-arah-datar', 'kelas.bc-arah-turun', 'kelas.bc-arah-baru', 'kelas.streak-sub-belajar'];
  const val = (src, k) => { const m = src.match(new RegExp("'" + k.replace(/[.-]/g, '\\$&') + "':\\s*'((?:[^'\\\\]|\\\\.)*)'")); return m ? m[1] : null; };
  check('Setiap teks baru punya id dan th beraksara Thai', keys.every(k => val(id, k) && /[฀-๿]/.test(val(th, k) || '')), keys.filter(k => !(val(id, k) && /[฀-๿]/.test(val(th, k) || ''))).join(', '));
  check('Tanpa tanda pisah dan tanpa istilah mesin di teks baru', keys.every(k => !/[–—]|\b(BKT|IRT|FSRS|theta|probabilitas)\b/i.test(val(id, k) + ' ' + val(th, k))));

  console.log(`\nbraincore-wave2-kelasku-test: ${pass}/${pass + fails.length} PASS`);
  if (fails.length) { console.error('GAGAL: ' + fails.join(' | ')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
