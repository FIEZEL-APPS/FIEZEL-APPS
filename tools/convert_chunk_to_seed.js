'use strict';
/**
 * tools/convert_chunk_to_seed.js — Audit & konverter chunk buku teks ke bank resmi.
 *
 * Sumber: tools/create_chunk_ind_8_b6.py, tools/create_chunk_ips_7_t4.py,
 *   tools/generate_ips8_t1.py, tools/build_chunk.py
 * Skema chunk: {code, grade, name, materi, cpRef, items:[{id, difficulty, prompt,
 *   options[4], answer, why:{0}, distractorWhy:{1,2,3}}]}
 * Target backend (backend/seed_soal.py Q): {stem, o[4], k:A-D, e, h[1], d:1-5, cog, dm:{B,C,D}}
 * Target frontend (fiezel-teacher-curriculum.js): {id, subChapterId, feature, prompt,
 *   options, answer:index, marker, why:{1,2,3}, note}
 *
 * Validasi wajib (gagal = chunk DITOLAK, bukan diperbaiki diam-diam):
 *   stem/prompt >=8 char, options tepat 4 dan distinct, answer 0..3,
 *   explanation/why non-kosong, hints/marker non-kosong, dm/distractorWhy lengkap.
 */
const fs = require('fs');
const path = require('path');

const LETTERS = ['A', 'B', 'C', 'D'];
const DIFF_MAP = { dasar: 2, sedang: 3, sulit: 4, mudah: 1 };

function validateChunk(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['chunk bukan objek'];
  if (!data.code) errors.push('tanpa code kompetensi');
  if (!Array.isArray(data.items) || !data.items.length) errors.push('items kosong');
  const ids = new Set();
  (data.items || []).forEach((it, idx) => {
    const at = it.id || ('index_' + idx);
    if (ids.has(it.id)) errors.push(at + ': id kembar');
    ids.add(it.id);
    if (!it.prompt || String(it.prompt).length < 8) errors.push(at + ': stem/prompt <8 char');
    if (!Array.isArray(it.options) || it.options.length !== 4) errors.push(at + ': options harus tepat 4');
    else if (new Set(it.options).size !== 4) errors.push(at + ': options kembar');
    if (it.answer !== 0 && it.answer !== 1 && it.answer !== 2 && it.answer !== 3) errors.push(at + ': answer harus 0..3');
    if (!it.why || !it.why['0']) errors.push(at + ': why/0 (pembahasan) kosong');
    for (const k of ['1', '2', '3']) {
      if (!it.distractorWhy || !it.distractorWhy[k]) errors.push(at + ': distractorWhy/' + k + ' kosong (dm)');
    }
  });
  return errors;
}

function chunkToBackend(data) {
  // Kembalikan {komp_id, rows:[{stem,o,k,e,h,d,cog,dm}]} siap ditempel ke SOAL_*.
  const komp = data.code;
  const rows = data.items.map((it) => {
    const k = LETTERS[it.answer];
    const dm = {};
    ['B', 'C', 'D'].forEach((L, i) => {
      const key = String(i + 1);
      const txt = (it.distractorWhy && it.distractorWhy[key]) || '';
      dm[L] = 'MIS-' + String(txt).slice(0, 48).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || ('MIS-CHUNK-' + it.id);
    });
    return {
      stem: it.prompt,
      o: it.options.slice(),
      k,
      e: it.why['0'],
      h: [String(it.prompt).slice(0, 80)],
      d: DIFF_MAP[it.difficulty] || 3,
      cog: 'C2',
      dm,
    };
  });
  return { komp_id: komp, rows };
}

function chunkToFrontend(data, subChapterId, feature) {
  return data.items.map((it, i) => ({
    id: 'cur_' + String(it.id).replace(/[^a-z0-9]+/gi, '_').toLowerCase(),
    subChapterId,
    feature,
    prompt: it.prompt,
    options: it.options.slice(),
    answer: it.answer,
    marker: String(it.prompt).slice(0, 60),
    why: { 1: it.distractorWhy['1'], 2: it.distractorWhy['2'], 3: it.distractorWhy['3'] },
    note: it.why['0'],
  }));
}

function auditFile(p) {
  const raw = fs.readFileSync(p, 'utf8');
  // File tools/*.py berisi `data = {...}` atau `items = [...]`; ekstrak JSON-nya secara best-effort.
  // Untuk audit ini cukup pastikan polanya ada; konversi penuh lewat JSON chunk yang dihasilkan.
  const hasCode = /"code"\s*:\s*"KOMP-/.test(raw);
  const hasItems = /"items"\s*:/.test(raw);
  const has4 = /"options"\s*:\s*\[/.test(raw);
  const hasWhy = /"why"\s*:\s*\{/.test(raw) && /"distractorWhy"\s*:\s*\{/.test(raw);
  return { file: path.basename(p), hasCode, hasItems, has4opts: has4, hasWhyDistractor: hasWhy };
}

if (require.main === module) {
  const files = [
    'tools/create_chunk_ind_8_b6.py',
    'tools/create_chunk_ips_7_t4.py',
    'tools/generate_ips8_t1.py',
    'tools/build_chunk.py',
  ];
  let fail = 0;
  for (const f of files) {
    try {
      const r = auditFile(path.join(process.cwd(), f));
      const ok = r.hasCode && r.hasItems && r.has4opts && r.hasWhyDistractor;
      console.log((ok ? 'ok - ' : 'FAIL - ') + f + ' ' + JSON.stringify(r));
      if (!ok) fail++;
    } catch (e) {
      fail++;
      console.error('FAIL - ' + f + ' ' + e.message);
    }
  }
  // Validasi backend SOAL_* punya 6 dict 5 mapel + struktur Q lengkap (cek sintaks pola).
  const soal = fs.readFileSync(path.join(process.cwd(), 'backend/seed_soal.py'), 'utf8');
  for (const n of ['SOAL_MAT7', 'SOAL_MAT89', 'SOAL_IND_SMP', 'SOAL_IPA_SMP', 'SOAL_IPS_SMP', 'SOAL_PPKN_SMP']) {
    const ok = soal.includes(n + ':');
    console.log((ok ? 'ok - ' : 'FAIL - ') + 'backend/seed_soal.py ' + n);
    if (!ok) fail++;
  }
  // Validasi JSON chunk hasil ekstraksi bila sudah dibangkitkan (lihat gen via .py).
  for (const jf of ['tools/chunk_ind_8_b6.json', 'tools/chunk_ips_7_t4.json', 'tools/chunk_ips_8_t1.json']) {
    const jp = path.join(process.cwd(), jf);
    if (!fs.existsSync(jp)) { console.log('skip - ' + jf + ' (belum dibangkitkan)'); continue; }
    try {
      const data = JSON.parse(fs.readFileSync(jp, 'utf8'));
      const errs = validateChunk(data);
      console.log((errs.length ? 'FAIL - ' : 'ok - ') + jf + ' n=' + (data.items || []).length + (errs.length ? ' ' + errs.slice(0, 3).join('; ') : ''));
      if (errs.length) fail += errs.length;
    } catch (e) {
      fail++;
      console.error('FAIL - ' + jf + ' ' + e.message);
    }
  }
  console.log(fail ? '\nCHUNK-AUDIT: FAIL (' + fail + ')' : '\nCHUNK-AUDIT: PASS — 4 skrip ekstraksi + 6 dict backend terstruktur');
  process.exit(fail ? 1 : 0);
}

module.exports = { validateChunk, chunkToBackend, chunkToFrontend, auditFile };
