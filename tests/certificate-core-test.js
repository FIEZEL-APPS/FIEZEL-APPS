/**
 * FIEZEL gerbang — tests/certificate-core-test.js · Inti sertifikat CEFR.
 *
 * Sertifikat adalah satu-satunya keluaran FIEZEL yang dibawa murid KELUAR dari aplikasi,
 * ke tangan orang yang tidak pernah melihat layarnya. Gerbang ini menjaga agar klaim di
 * atasnya tidak pernah melampaui bukti yang menopangnya.
 *
 * Kontrak yang dijaga berkas ini:
 *
 *   C1  kemurnian      — modul berjalan di sandbox KOSONG (tanpa DOM, storage, jaringan);
 *                        tidak ada Date.now tersembunyi — waktu SELALU disuntikkan
 *   C2  tak terukur    — skill tanpa soal => null, BUKAN 0 dan BUKAN 'A1'
 *   C3  berjenjang     — gagal di level bawah membatalkan klaim level atas, walau soal
 *                        sulitnya kebetulan benar (anti tebak-beruntung)
 *   C4  bukti tipis    — di bawah ambang soal/skill, issue() MENOLAK dan menyebut alasan
 *   C5  dibatasi lemah — level global dibatasi skill terlemah, dengan kelonggaran tepat
 *                        satu skill sejauh satu tingkat — tidak pernah rata-rata
 *   C6  determinisme   — masukan sama => keluaran sama persis
 *   C7  masa berlaku   — sertifikat kedaluwarsa; isValid() menolak di luar jendela
 *   C8  integritas     — sesi tak diawasi tidak menyamar sebagai sesi diawasi
 *   C9  beku ke dalam  — sertifikat terbit tidak bisa disunting SETELAH diterbitkan,
 *                        termasuk struktur bersarangnya; Object.freeze dangkal saja
 *                        meninggalkan jendela pemalsuan sebelum server menandatangani
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const coreSource = fs.readFileSync(
  path.join(root, 'features', 'certificate', 'fiezel-certificate-core.js'), 'utf8');

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };

/* ---- C1 · kemurnian ------------------------------------------------------ */

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(coreSource, sandbox, { timeout: 2000 });
const C = sandbox.FiezelCertificateCore;

ok(C && typeof C.issue === 'function' && typeof C.skillLevel === 'function',
  'C1: modul hidup di sandbox kosong');

const codeOnly = coreSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/localStorage|document\.|fetch\(|Date\.now\(|Math\.random\(/.test(codeOnly),
  'C1: inti bebas DOM/penyimpanan/jaringan/jam/acak (komentar tidak dihitung)');

/* ---- C2 · yang tidak diukur ditulis tidak diukur -------------------------- */

const band = (correct, total) => ({ correct, total });
const solidA2 = { A1: band(9, 10), A2: band(8, 10) };

const twoSkills = {
  skills: { grammar: solidA2, reading: solidA2 }
};
const issuedAt = 1750000000000;
const r1 = C.issue(twoSkills, { issuedAt });

ok(r1.ok === true, 'C2: bukti dua skill yang cukup menerbitkan sertifikat');
ok(r1.certificate.skills.listening === null,
  'C2: skill tanpa soal bernilai null');
ok(r1.certificate.skills.listening !== 0 && r1.certificate.skills.listening !== 'A1',
  'C2: skill tanpa soal BUKAN 0 dan BUKAN A1');
ok(r1.certificate.itemsBySkill.listening === 0,
  'C2: jumlah soal skill tak terukur adalah 0 (jumlah, bukan level)');
ok(r1.certificate.measuredSkills.length === 2 &&
   r1.certificate.measuredSkills.indexOf('listening') === -1,
  'C2: measuredSkills hanya memuat skill yang benar-benar diuji');

// Soal terlalu sedikit pada satu level => level itu tidak diuji, bukan gagal.
ok(C.skillLevel({ A1: band(2, 2) }) === null,
  'C2: level dengan soal di bawah ambang tidak dinilai sama sekali');

/* ---- C3 · klaim berjenjang (anti tebak-beruntung) ------------------------- */

ok(C.skillLevel({ A1: band(9, 10), A2: band(8, 10), B1: band(3, 10) }) === 'A2',
  'C3: rantai berhenti di level yang gagal');

ok(C.skillLevel({ A1: band(9, 10), A2: band(2, 10), B1: band(10, 10), B2: band(10, 10) }) === 'A1',
  'C3: benar di soal sulit TIDAK melompati kegagalan di soal mudah');

ok(C.skillLevel({}) === null, 'C3: tanpa bukti sama sekali => null');

// `correct` yang melebihi `total` adalah masukan rusak, harus dijepit — bukan dipercaya.
ok(C.skillLevel({ A1: band(999, 10) }) === 'A1',
  'C3: correct > total dijepit, tidak menaikkan level');

/* ---- C4 · bukti tipis ditolak -------------------------------------------- */

const thin = C.issue({ skills: { grammar: { A1: band(5, 5) } } }, { issuedAt });
ok(thin.ok === false && thin.reason === C.REFUSAL.TOO_FEW_ITEMS,
  'C4: total soal di bawah ambang ditolak dengan alasan TOO_FEW_ITEMS');

const oneSkill = C.issue({
  skills: { grammar: { A1: band(9, 10), A2: band(8, 10), B1: band(8, 10) } }
}, { issuedAt });
ok(oneSkill.ok === false && oneSkill.reason === C.REFUSAL.TOO_FEW_SKILLS,
  'C4: satu skill saja ditolak dengan alasan TOO_FEW_SKILLS');

ok(C.issue(null, { issuedAt }).ok === false, 'C4: bukti null ditolak tanpa melempar');
ok(C.issue(twoSkills, {}).ok === false,
  'C4: tanpa issuedAt dari pemanggil, sertifikat TIDAK terbit (jam tidak dikarang sendiri)');

/* ---- C5 · level global dibatasi skill terlemah ---------------------------- */

ok(C.overallLevel({ grammar: 'B2', reading: 'B2', listening: 'B2' }) === 'B2',
  'C5: semua skill sama => level itu');

ok(C.overallLevel({ grammar: 'B2', reading: 'B2', listening: 'B1' }) === 'B2',
  'C5: satu skill satu tingkat di bawah masih ditoleransi');

ok(C.overallLevel({ grammar: 'B2', reading: 'B2', listening: 'A2' }) === 'B1',
  'C5: satu skill DUA tingkat di bawah menurunkan level global');

ok(C.overallLevel({ grammar: 'B2', reading: 'B1', listening: 'B1' }) === 'B1',
  'C5: dua skill di bawah => turun, kelonggaran hanya untuk satu skill');

ok(C.overallLevel({ grammar: 'C2', reading: 'A1' }) === 'A2',
  'C5: jurang lebar ditarik mendekati skill terlemah, bukan dirata-rata');

// Rata-rata C2 dan A1 akan menghasilkan sekitar B1/B2. Kontraknya justru menolak itu.
ok(C.overallLevel({ grammar: 'C2', reading: 'A1' }) !== 'B1' &&
   C.overallLevel({ grammar: 'C2', reading: 'A1' }) !== 'B2',
  'C5: level global BUKAN rata-rata — lubang tidak boleh tersembunyi');

ok(C.overallLevel({ grammar: null, reading: null }) === null,
  'C5: tanpa skill terukur => null');

ok(C.overallLevel({ grammar: 'B1', reading: null }) === 'B1',
  'C5: skill tak terukur tidak ikut menurunkan level global');

/* ---- C6 · determinisme ---------------------------------------------------- */

const a = C.issue(twoSkills, { issuedAt });
const b = C.issue(twoSkills, { issuedAt });
ok(JSON.stringify(a) === JSON.stringify(b),
  'C6: masukan sama menghasilkan keluaran identik');

/* ---- C7 · masa berlaku ---------------------------------------------------- */

const cert = r1.certificate;
ok(cert.expiresAt > cert.issuedAt, 'C7: sertifikat punya batas kedaluwarsa');
ok(C.isValid(cert, issuedAt + 1000) === true, 'C7: berlaku di dalam jendela');
ok(C.isValid(cert, cert.expiresAt + 1) === false, 'C7: ditolak setelah kedaluwarsa');
ok(C.isValid(cert, issuedAt - 1) === false, 'C7: ditolak sebelum diterbitkan');
ok(C.isValid({ schema: 'palsu' }, issuedAt) === false, 'C7: schema asing ditolak');

/* ---- C8 · integritas sesi ikut tercetak ----------------------------------- */

ok(cert.proctored === false,
  'C8: tanpa keterangan pengawasan, sertifikat TIDAK mengaku diawasi');

const proctored = C.issue(
  Object.assign({}, twoSkills, { integrity: { proctored: true, screenExits: 2 } }),
  { issuedAt }
);
ok(proctored.certificate.proctored === true && proctored.certificate.screenExits === 2,
  'C8: status pengawasan dan jumlah keluar layar ikut ke sertifikat');

/* ---- C9 · beku sampai ke struktur bersarang ------------------------------- */

// Nilai diperiksa SETELAH percobaan tulis, bukan lewat assert.throws: dalam mode
// non-strict penulisan ke objek beku gagal DIAM, dan yang dijaga kontrak ini adalah
// nilainya tidak berubah — bukan cara kegagalannya.
const frozen = C.issue(twoSkills, { issuedAt }).certificate;

try { frozen.level = 'C2'; } catch (e) { /* strict mode melempar; itu sah */ }
ok(frozen.level === 'A2', 'C9: level tidak bisa ditimpa setelah terbit');

try { frozen.skills.reading = 'C2'; } catch (e) { /* idem */ }
ok(frozen.skills.reading === 'A2',
  'C9: level per-skill tidak bisa dinaikkan lewat objek bersarang');

try { frozen.skills.listening = 'B2'; } catch (e) { /* idem */ }
ok(frozen.skills.listening === null,
  'C9: skill tak terukur tidak bisa diisi belakangan');

try { frozen.measuredSkills.push('speaking'); } catch (e) { /* idem */ }
ok(frozen.measuredSkills.indexOf('speaking') === -1,
  'C9: daftar skill terukur tidak bisa ditambahi skill yang tak pernah diuji');

try { frozen.itemsBySkill.grammar = 9999; } catch (e) { /* idem */ }
ok(frozen.itemsBySkill.grammar === 20,
  'C9: jumlah soal tidak bisa digelembungkan setelah terbit');

ok(Object.isFrozen(frozen) && Object.isFrozen(frozen.skills) &&
   Object.isFrozen(frozen.itemsBySkill) && Object.isFrozen(frozen.measuredSkills),
  'C9: sertifikat DAN ketiga struktur bersarangnya beku');

/* -------------------------------------------------------------------------- */

console.log(`certificate-core-test: ${passed}/${passed} assert PASS`);
