#!/usr/bin/env node
/**
 * tests/th-bank-purity-test.js — GERBANG: KEMURNIAN BAHASA BANK SOAL DI SESI MURID THAI
 *
 * MENGAPA GERBANG INI ADA, TERPISAH DARI tests/th-coverage-test.js. Gerbang cakupan yang lama
 * menghitung empat permukaan: copy-map, naskah brain, grammar-explanations-th, vocabulary-th.
 * Keempatnya hijau 143/143 — dan murid Thai TETAP membaca bahasa Indonesia sepanjang sesi,
 * karena permukaan yang dihitung itu bukan permukaan tempat SOAL berada. Bank soal punya
 * jalur hidrasi sendiri (reading-bank.json, cloze-bank-v1.json, reading-exam-v1.json,
 * writing-prompts-v1.json, grammar-misconception-id.json) yang tidak pernah lewat copy-map,
 * jadi tidak ada satu pun pemeriksaan yang melihatnya. Gerbang ini melihatnya.
 *
 * DUA CACAT YANG DICARI — keduanya nyata, keduanya pernah lolos ke rilis:
 *   1. LUBANG: string Indonesia sampai ke layar murid th karena sidecar th-nya tidak ada.
 *      Seluruh reading A1/A2, seluruh umpan balik cloze, dan seluruh diagnosis miskonsepsi
 *      dulu masuk kategori ini.
 *   2. KOLASE: sidecar th-nya ADA tapi isinya campuran — "เขา ไม่ punya pena" (Thai+Indonesia
 *      dalam satu kalimat) atau "รถบัส นั้น สาย นานเท่าใด?" (Thai kata-per-kata dengan spasi
 *      antar-kata, yang bukan cara aksara Thai ditulis). Keduanya lahir dari penerjemah
 *      kata-per-kata; keduanya terbaca sebagai omong kosong bagi penutur Thai, tetapi lolos
 *      pemeriksaan "apakah ada aksara Thai di sini" mana pun.
 *
 * ATURAN LEVEL (kenapa B1+ boleh berbahasa Inggris). Bank reading dan listening memakai
 * perancah bahasa ibu HANYA di A1/A2; mulai B1 pertanyaan dan pilihannya memang berbahasa
 * Inggris — itu imersi yang disengaja, sama untuk murid id maupun th, jadi BUKAN lubang.
 * Yang tidak pernah sah di level mana pun adalah bahasa Indonesia: murid Thai tidak
 * membacanya. Mode paraphrase juga dikecualikan — pilihan Inggris memang objek ujinya.
 *
 * Print-only; exit 1 bila ada FAIL. ENV: FIEZEL_ROOT → root repo (default __fzRoot).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.FIEZEL_ROOT || __fzRoot;
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok: !!ok, details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

const { buildLexicon, residuIndonesia, thaiKataPerKata } = require(path.join(ROOT, 'th-purity-lexicon.js'));

// Leksikon "kata yang hanya muncul di korpus Indonesia repo ini", dibangun ulang tiap jalan
// (lihat th-purity-lexicon.js untuk alasan pendekatannya). Satu kali untuk semua permukaan.
const LEKSIKON = buildLexicon(ROOT);

/** Pemeriksa satu permukaan: kumpulkan pelanggaran, lapor dua hitungan sekaligus. */
function periksaPermukaan(nama, entri) {
  const indonesia = [];
  const kataPerKata = [];
  for (const [lokasi, nilai] of entri) {
    if (typeof nilai !== 'string' || !nilai.trim()) continue;
    const sisa = residuIndonesia(nilai, LEKSIKON);
    if (sisa.length) indonesia.push(lokasi + ' [' + sisa.slice(0, 3).join(', ') + '] :: ' + nilai.slice(0, 60));
    else if (thaiKataPerKata(nilai)) kataPerKata.push(lokasi + ' :: ' + nilai.slice(0, 70));
  }
  check(nama + ': nol sisa bahasa Indonesia di jalur murid th (' + entri.length + ' bidang)',
    indonesia.length === 0,
    indonesia.length + ' bidang, contoh: ' + indonesia.slice(0, 4).join(' | '));
  check(nama + ': nol Thai kata-per-kata (jejak penerjemah token)',
    kataPerKata.length === 0,
    kataPerKata.length + ' bidang, contoh: ' + kataPerKata.slice(0, 4).join(' | '));
}

/* ============ 1 · READING (reading-bank.json A1/A2 → features/i18n/reading-bank-th.json) === */
{
  const bank = readJson('reading-bank.json');
  const th = readJson('features/i18n/reading-bank-th.json');
  const items = th.items || {};
  const scaffolded = bank.filter((p) => p.level === 'A1' || p.level === 'A2');

  const hilang = [];
  const entri = [];
  for (const p of scaffolded) {
    const e = items[p.id];
    if (!e) { hilang.push(p.id); continue; }
    const qs = Array.isArray(e.qs) ? e.qs : [];
    if (qs.length !== (p.qs || []).length) { hilang.push(p.id + ' (qs ' + qs.length + '/' + (p.qs || []).length + ')'); continue; }
    p.qs.forEach((q, i) => {
      const t = qs[i] || {};
      entri.push([p.id + '.q' + i + '.stem', t.stem]);
      (t.options || []).forEach((o, j) => entri.push([p.id + '.q' + i + '.opt' + j, o]));
      if (t.why) entri.push([p.id + '.q' + i + '.why', t.why]);
      if (t.whyOthersFail) entri.push([p.id + '.q' + i + '.whyOthersFail', t.whyOthersFail]);
      // Jumlah pilihan WAJIB sama: satu pilihan hilang = kunci jawaban bergeser diam-diam.
      if ((t.options || []).length !== (q[1] || []).length) hilang.push(p.id + '.q' + i + ' opsi ' + (t.options || []).length + '/' + (q[1] || []).length);
    });
  }
  check('reading: seluruh bacaan A1/A2 punya sidecar th utuh (' + scaffolded.length + ' bacaan)',
    hilang.length === 0, hilang.length + ' tanpa/tidak utuh: ' + hilang.slice(0, 8).join(', '));
  periksaPermukaan('reading', entri);
}

/* ================= 2 · CLOZE (cloze-bank-v1.json → features/i18n/cloze-bank-th.json) ====== */
{
  const bank = readJson('cloze-bank-v1.json');
  const th = readJson('features/i18n/cloze-bank-th.json');
  const items = th.items || {};
  const hilang = [];
  const entri = [];
  for (const it of bank.items) {
    const e = items[it.id];
    if (!e) { hilang.push(it.id); continue; }
    for (const k of ['why', 'rule', 'memory', 'avoid']) {
      if (it.explain && it.explain[k]) {
        if (!e.explain || !e.explain[k]) hilang.push(it.id + '.explain.' + k);
        else entri.push([it.id + '.explain.' + k, e.explain[k]]);
      }
    }
    for (const d of it.distractors || []) {
      const dt = (e.distractors || {})[String(d.text)];
      // Kunci distraktor = teks pilihan persis; meleset satu byte = umpan balik tak ditemukan.
      if (!dt) { hilang.push(it.id + '.distractors[' + d.text + ']'); continue; }
      for (const k of ['whyFailsId', 'misconceptionId']) {
        if (d[k]) {
          if (!dt[k]) hilang.push(it.id + '.distractors[' + d.text + '].' + k);
          else entri.push([it.id + '.d[' + d.text + '].' + k, dt[k]]);
        }
      }
    }
  }
  check('cloze: seluruh butir bank punya sidecar th utuh (' + bank.items.length + ' butir)',
    hilang.length === 0, hilang.length + ' bolong: ' + hilang.slice(0, 8).join(', '));
  periksaPermukaan('cloze', entri);
}

/* ============ 3 · READING EXAM (reading-exam-v1.json → features/i18n/reading-exam-th.json) = */
{
  const bank = readJson('reading-exam-v1.json');
  const th = readJson('features/i18n/reading-exam-th.json');
  const hilang = [];
  const entri = [];
  for (const [key, f] of Object.entries(bank.examFormats || {})) {
    const tf = (th.formats || {})[key];
    if (!tf) { hilang.push('format ' + key); continue; }
    for (const k of ['label', 'note']) {
      if (f[k] && !tf[k]) hilang.push('format ' + key + '.' + k);
      else if (tf[k]) entri.push(['format ' + key + '.' + k, tf[k]]);
    }
  }
  for (const p of bank.passages || []) {
    const tp = (th.passages || {})[p.id];
    if (!tp) { hilang.push('passage ' + p.id); continue; }
    for (const q of p.questions || []) {
      const tq = (tp.questions || {})[q.id];
      if (!tq) { hilang.push(p.id + '.' + q.id); continue; }
      for (const k of ['why', 'whyOthersFail']) {
        if (q.explain && q.explain[k]) {
          if (!tq[k]) hilang.push(p.id + '.' + q.id + '.' + k);
          else entri.push([p.id + '.' + q.id + '.' + k, tq[k]]);
        }
      }
    }
  }
  check('reading-exam: format + penjelasan tiap soal tercakup th', hilang.length === 0,
    hilang.length + ' bolong: ' + hilang.slice(0, 8).join(', '));
  periksaPermukaan('reading-exam', entri);
}

/* ========== 4 · WRITING (writing-prompts-v1.json → features/i18n/writing-prompts-th.json) == */
{
  const bank = readJson('writing-prompts-v1.json');
  const th = readJson('features/i18n/writing-prompts-th.json');
  const hilang = [];
  const entri = [];
  for (const p of bank.prompts || []) {
    const tp = (th.prompts || {})[p.id];
    if (!tp) { hilang.push('prompt ' + p.id); continue; }
    for (const [src, dst] of [['id_hint', 'hint'], ['focus', 'focus']]) {
      if (p[src]) {
        if (!tp[dst]) hilang.push(p.id + '.' + dst);
        else entri.push([p.id + '.' + dst, tp[dst]]);
      }
    }
  }
  // examTasks: PETA ber-kunci id ujian, bukan larik ber-field id.
  const examTasks = Array.isArray(bank.examTasks)
    ? bank.examTasks.map((t) => [String((t && (t.id || t.task)) || ''), t])
    : Object.entries(bank.examTasks || {});
  for (const [key, t] of examTasks) {
    const tt = (th.examTasks || {})[key];
    if (!tt) { hilang.push('examTask ' + key); continue; }
    for (const [k, v] of Object.entries(t)) {
      if (typeof v !== 'string' || !residuIndonesia(v, LEKSIKON).length) continue;
      if (!tt[k]) hilang.push('examTask ' + key + '.' + k);
      else entri.push(['examTask ' + key + '.' + k, tt[k]]);
    }
  }
  for (const c of (bank.rubric && bank.rubric.criteria) || []) {
    const tc = (th.rubric && th.rubric.criteria || {})[c.id];
    if (!tc) { hilang.push('rubric ' + c.id); continue; }
    for (const k of ['label', 'asks']) if (tc[k]) entri.push(['rubric ' + c.id + '.' + k, tc[k]]);
    (tc.levels || []).forEach((l, i) => entri.push(['rubric ' + c.id + '.levels[' + i + ']', l]));
    if ((tc.levels || []).length !== (c.levels || []).length) hilang.push('rubric ' + c.id + '.levels');
  }
  check('writing: prompt + examTask + rubrik tercakup th', hilang.length === 0,
    hilang.length + ' bolong: ' + hilang.slice(0, 8).join(', '));
  periksaPermukaan('writing', entri);
}

/* == 5 · MISCONCEPTION (grammar-misconception-id + taxonomy → features/i18n/misconception-th.json) */
{
  const diagnoses = readJson('grammar-misconception-id.json').diagnoses || {};
  const taxonomy = readJson('misconception-taxonomy-v1.json').codes || {};
  const th = readJson('features/i18n/misconception-th.json');
  const hilang = [];
  const entri = [];
  for (const k of Object.keys(diagnoses)) {
    const v = (th.diagnoses || {})[k];
    if (!v) { hilang.push('diagnosis ' + k); continue; }
    entri.push(['diagnosis ' + k, v]);
  }
  for (const [code, c] of Object.entries(taxonomy)) {
    const tc = (th.codes || {})[code];
    if (!tc) { hilang.push('code ' + code); continue; }
    for (const [src, dst] of [['label', 'label'], ['description_id', 'description']]) {
      if (c[src]) {
        if (!tc[dst]) hilang.push(code + '.' + dst);
        else entri.push([code + '.' + dst, tc[dst]]);
      }
    }
  }
  check('misconception: seluruh diagnosis + kode taksonomi tercakup th ('
    + Object.keys(diagnoses).length + ' diagnosis, ' + Object.keys(taxonomy).length + ' kode)',
    hilang.length === 0, hilang.length + ' bolong: ' + hilang.slice(0, 8).join(', '));
  periksaPermukaan('misconception', entri);
}

/* ===== 6 · LISTENING (features/i18n/listening-bank-th.json — sidecar rilis, diperiksa ulang) */
{
  const src = readJson('features/speaking-listening/listening-bank-v1.json');
  const th = readJson('features/i18n/listening-bank-th.json');
  const meta = Object.create(null);
  for (const it of src.items || []) meta[it.id] = it;
  const entri = [];
  const hilang = [];
  for (const it of src.items || []) {
    const e = (th.items || {})[it.id];
    if (!e) { hilang.push(it.id); continue; }
    entri.push([it.id + '.question', e.question]);
    entri.push([it.id + '.explain', e.explain]);
    // Mode paraphrase: pilihan Inggris ADALAH objek uji — tidak diterjemahkan, tidak diperiksa.
    if (it.mode !== 'paraphrase') (e.options || []).forEach((o, i) => entri.push([it.id + '.opt' + i, o]));
  }
  check('listening: seluruh butir bank punya sidecar th (' + (src.items || []).length + ' butir)',
    hilang.length === 0, hilang.length + ' tanpa sidecar: ' + hilang.slice(0, 8).join(', '));
  periksaPermukaan('listening', entri);
}

/* ============================ 7 · SPEAKING (speaking-bank-th.json) ======================== */
{
  const th = readJson('features/i18n/speaking-bank-th.json');
  const entri = Object.entries(th.items || {}).map(([k, v]) => [k + '.instruction', v && v.instruction]);
  periksaPermukaan('speaking', entri);
}

/* ==================== 8 · LISTENING EXAM (listening-exam-th.json) ======================== */
/* Bank ujian Listening sempat SELURUHNYA lolos audit: overlay lama memakai id set lx-*
   terhadap peta listen_sc_* di listening-bank-th.json, jadi tidak pernah kena sasaran dan
   tidak ada satu pun gerbang yang melihat permukaan ini. Empat permukaan diperiksa di sini
   karena keempatnya benar-benar sampai ke layar murid: judul set, penjelasan tiap soal,
   label/catatan format ujian, dan paragraf honesty + audioSource.
   prompt dan options TIDAK diperiksa: keduanya bahasa Inggris by design (B1+ imersi). */
{
  const src = readJson('features/speaking-listening/listening-exam-v1.json');
  const th = readJson('features/i18n/listening-exam-th.json');
  const thSets = th.sets || {};
  const entri = [];
  const hilang = [];
  const soalHilang = [];
  const kutipan = [];
  for (const set of src.sets || []) {
    const e = thSets[set.id];
    if (!e) { hilang.push(set.id); continue; }
    entri.push([set.id + '.title', e.title]);
    for (const q of set.questions || []) {
      const thQ = (e.questions || {})[q.id];
      if (!thQ) { soalHilang.push(q.id); continue; }
      const luarKutip = String(thQ.explain == null ? '' : thQ.explain).replace(/"[^"]*"/g, ' ');
      entri.push([q.id + '.explain', luarKutip]);
      kutipan.push([q.id, String(thQ.explain == null ? '' : thQ.explain)]);
    }
  }
  for (const [k, v] of Object.entries(th.examFormats || {})) {
    entri.push([k + '.label', v && v.label]);
    entri.push([k + '.note', v && v.note]);
  }
  entri.push(['honesty', th.honesty]);
  for (const [k, v] of Object.entries(th.audioSource || {})) entri.push(['audioSource.' + k, v]);

  check('listening-exam: seluruh set punya sidecar th (' + (src.sets || []).length + ' set)',
    hilang.length === 0, hilang.length + ' tanpa sidecar: ' + hilang.slice(0, 8).join(', '));
  check('listening-exam: seluruh soal punya penjelasan th',
    soalHilang.length === 0, soalHilang.length + ' tanpa penjelasan: ' + soalHilang.slice(0, 8).join(', '));
  /* Kontrak format: setiap format yang dipakai set mana pun WAJIB punya padanan th, kalau
     tidak catatan formatnya jatuh ke teks Indonesia di dalam cangkang Thai. */
  const formatDipakai = [...new Set((src.sets || []).map((x) => x.exam).filter(Boolean))];
  const formatHilang = formatDipakai.filter((k) => !(th.examFormats || {})[k]);
  check('listening-exam: seluruh format ujian punya padanan th (' + formatDipakai.length + ' format)',
    formatHilang.length === 0, 'tanpa padanan: ' + formatHilang.join(', '));
  /* Kutipan skrip WAJIB tetap Inggris. Kalau ada aksara Thai di dalam tanda kutip,
     penerjemah menyentuh bukti jawabannya - murid membaca kutipan yang tidak pernah
     terdengar di audio, dan soalnya jadi tidak bisa dijawab dari rekaman. */
  const kutipanTersentuh = kutipan.filter(([, v]) => (v.match(/"[^"]*"/g) || []).some((k) => /[\u0E00-\u0E7F]/.test(k)));
  check('listening-exam: kutipan skrip audio tetap bahasa Inggris',
    kutipanTersentuh.length === 0,
    kutipanTersentuh.length + ' tersentuh: ' + kutipanTersentuh.slice(0, 4).map(([k]) => k).join(', '));
  periksaPermukaan('listening-exam', entri);
}

/* ======================================== Laporan ======================================== */

let pass = 0;
for (const c of checks) {
  if (c.ok) pass += 1;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.details ? '' : `\n      → ${c.details}`}`);
}
console.log(`\nth-bank-purity-test: ${pass}/${checks.length} PASS${failed ? ' — GAGAL (murid Thai masih membaca bahasa Indonesia di bank soal)' : ''}`);
process.exit(failed ? 1 : 0);
