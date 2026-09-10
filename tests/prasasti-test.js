/**
 * FIEZEL gerbang — tests/prasasti-test.js · Prasasti (lencana berbasis bukti, P1 audit §9/§14).
 *
 * Kontrak yang dijaga berkas ini:
 *
 *   P1  kemurnian     — fiezel-prasasti-core.js berjalan di sandbox KOSONG (tanpa DOM,
 *                       tanpa localStorage, tanpa jaringan); ada Date.now tersembunyi =>
 *                       gagal saat dipanggil, bukan nanti di perangkat murid
 *   P2  hanya bukti   — setiap lencana menunjuk satu metrik bukti + ambang; evaluasi
 *                       bukti kosong TIDAK menerbitkan apa pun
 *   P3  daftar wajib  — lencana yang diminta spek ada semua: lesson pertama, ujian lulus,
 *                       buku tamat, runtun 7/30/100, 10 lesson dikuasai, 5 sesi ber-gem
 *   P4  tidak dicabut — settle() tidak pernah menghapus lencana yang sudah terukir,
 *                       walau buktinya menyusut (runtun putus, ledger terpangkas)
 *   P5  sekali ukir   — settle() kedua dengan bukti sama menghasilkan fresh kosong
 *   P6  sanitasi      — schema asing / timestamp busuk => keadaan bersih tanpa melempar
 *   P7  integrasi     — app.js punya state.prasasti default, titik ukir di finishQuiz dan
 *                       Home, momen lencana memicu badge-earned + celebrate + uiSfx,
 *                       galeri tampil di Peta Belajar; index.html + sw.js memuat modulnya
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const coreSource = fs.readFileSync(path.join(root, 'features', 'prasasti', 'fiezel-prasasti-core.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };

// P1 — sandbox sengaja kosong.
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox, { timeout: 2000 });
const P = sandbox.FiezelPrasasti;
ok(P && typeof P.settle === 'function' && typeof P.sanitizePrasasti === 'function', 'P1: modul hidup di sandbox kosong');
const coreCodeOnly = coreSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/localStorage|document\.|fetch\(|Date\.now\(/.test(coreCodeOnly), 'P1: inti bebas DOM/penyimpanan/jaringan/jam tersembunyi (komentar tidak dihitung)');

// P2 + P3 — definisi.
const ids = P.BADGES.map(b => b.id);
for (const want of ['lesson_pertama', 'ujian_lulus', 'buku_tamat', 'runtun_7', 'runtun_30', 'runtun_100', 'sepuluh_dikuasai', 'gem_lima_sesi']) {
  ok(ids.includes(want), `P3: lencana ${want} terdefinisi`);
}
ok(P.BADGES.every(b => typeof b.metric === 'string' && Number(b.min) > 0), 'P2: setiap lencana = satu metrik + ambang');
// JSON.stringify, bukan deepStrictEqual: nilai lahir di context vm (prototype Array beda realm).
ok(JSON.stringify(P.evaluateBadges({})) === '[]', 'P2: bukti kosong tidak menerbitkan lencana');
ok(JSON.stringify(P.evaluateBadges({ streakDays: 6 })) === '[]', 'P2: runtun 6 belum 7');
ok(JSON.stringify(P.evaluateBadges({ streakDays: 30 })) === '["runtun_7","runtun_30"]', 'P2: runtun 30 menerbitkan 7 dan 30');

// P4 + P5 — settle menambah, tidak pernah mencabut; sekali ukir.
const t1 = P.settle(P.freshPrasasti(), { lessonSessions: 1, streakDays: 7 }, 1000);
ok(t1.fresh.map(b => b.id).sort().join(',') === 'lesson_pertama,runtun_7', 'P4: dua lencana terukir bersamaan');
ok(t1.prasasti.earned.lesson_pertama === 1000, 'P4: timestamp ukir tersimpan');
const t2 = P.settle(t1.prasasti, { lessonSessions: 1, streakDays: 0 }, 2000);
ok(t2.fresh.length === 0, 'P5: bukti sama / menyusut => tidak ada ukiran baru');
ok(t2.prasasti.earned.runtun_7 === 1000, 'P4: runtun putus TIDAK mencabut prasasti runtun');

// P6 — sanitasi.
ok(P.sanitizePrasasti(null).schema === P.SCHEMA, 'P6: null => keadaan bersih');
ok(Object.keys(P.sanitizePrasasti({ schema: 'asing', earned: { runtun_7: 1 } }).earned).length === 0, 'P6: schema asing dibuang');
ok(Object.keys(P.sanitizePrasasti({ schema: P.SCHEMA, earned: { runtun_7: 'busuk', tak_dikenal: 5 } }).earned).length === 0, 'P6: entri busuk/asing dibuang tanpa melempar');

// P7 — integrasi runtime (pemeriksaan sumber, pola gerbang statis suite ini).
ok(/prasasti:\{schema:'fiezel-prasasti-v1',earned:\{\}\}/.test(app), 'P7: defaultState punya prasasti');
ok(/ritualMeta:\{lastDay:''\}/.test(app), 'P7: defaultState punya ritualMeta (ritual pembuka sekali per hari)');
ok(/checkPrasasti\('session'\)/.test(app) && /checkPrasasti\('home'\)/.test(app), 'P7: titik ukir di finishQuiz dan Home');
ok(/function showPrasastiMoment/.test(app) && /pawReact\('badge-earned'\)/.test(app.split('function showPrasastiMoment')[1].split('\nfunction ')[0]), 'P7: momen lencana memicu maskot proud');
// [SFX-WIRING impl-11] 20 §4 baris PENCAPAIAN: bunyi lencana = notif_achievement, bukan
// alias celebrate→lesson_complete (bisa dobel dengan penutup finishQuiz). Invarian yang
// dijaga tetap sama: momennya berbunyi lewat gerbang uiSfx (preferensi feedbackSounds).
ok(/uiSfx\('notif_achievement'\)/.test(app.split('function showPrasastiMoment')[1].split('\nfunction ')[0]), 'P7: momen lencana berbunyi lewat gerbang uiSfx');
ok(/prasastiGalleryMarkup/.test(app) && /<h3>(?:\$\{FiezelI18n\.t\('progress\.prasasti-judul'\)\}|Prasasti)<\/h3>/.test(app), 'P7: galeri Prasasti ada di Peta Belajar');
ok(/features\/prasasti\/fiezel-prasasti-core\.js/.test(html), 'P7: index.html memuat inti prasasti sebelum app.js');
ok(html.indexOf('features/prasasti/fiezel-prasasti-core.js') < html.indexOf('<script defer src="./app.js">'), 'P7: deklarasi mendahului app.js');
ok(/'\.\/features\/prasasti\/fiezel-prasasti-core\.js'/.test(sw), 'P7: sw.js meng-precache inti prasasti (offline-first)');

console.log(JSON.stringify({ status: 'PASS', checks: passed }, null, 2));
