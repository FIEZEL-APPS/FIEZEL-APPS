// m025-306 — gerbang untuk OVERLAY Thai pada WRITING dan READING-EXAM.
//
// Kenapa gerbang ini ada, dan kenapa bentuknya seperti ini.
//
// Sebelum m025-306, `applyContentLocale()` menyalin dari `writing-prompts-th.json` hanya
// `honesty` dan `rubric.criteria`, dan dari `reading-exam-th.json` hanya `honesty` dan
// `formats`. Sisanya MENGANGGUR — bukan "belum diterjemahkan", melainkan sudah
// diterjemahkan, sudah ikut terunduh ke perangkat murid, lalu tidak pernah dibaca:
//
//   - 45 prompt writing (`hint` + `focus`) dan 5 catatan tugas ujian;
//   - 8 set / 96 soal reading-exam (`why` + `whyOthersFail`).
//
// Akibatnya murid Thai membaca petunjuk Writing dan SELURUH umpan balik sesudah menjawab
// di reading-exam dalam bahasa Indonesia, di dalam cangkang antarmuka yang sudah Thai.
//
// Tidak ada satu pun gerbang yang berubah merah karenanya, dan sebabnya struktural:
// `th-bank-purity-test.js` dan `scan-th-bank-leak` bertanya "apakah ISI sidecar bersih?"
// — jawabannya selalu ya. Tidak ada yang bertanya "apakah isinya SAMPAI ke penyaji?".
// Itu kelas bug yang sama dengan m025-231 (overlay bank ujian Listening yang id-nya tidak
// pernah kena sasaran), dan gerbang ini memakai obat yang sama: panggil overlay yang
// SUNGGUHAN, lalu baca hasilnya lewat jalur baca yang dipakai penyaji.
//
// Karena itu yang diuji BUKAN mutu terjemahan, melainkan satu hal: teks Thai yang ada di
// sidecar benar-benar keluar dari `writingPromptPool()`, `writingExamTask()`, dan
// `makeExamReadingQuestion()`. Fixture-nya sintetis dan mencolok (awalan `TH-`) supaya
// pencocokan id yang meleset tidak bisa menyamar sebagai keberhasilan — persis pelajaran
// m025-231. Sesudah itu sidecar NYATA diperiksa terpisah, supaya fixture yang lolos tidak
// menutupi id sungguhan yang tidak kena sasaran.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = __fzRoot;

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok: !!ok, details: details === undefined ? '' : String(details) });
  if (!ok) failed = true;
};
const selesai = () => {
  for (const c of checks) if (!c.ok) console.error('  - ' + c.name + (c.details ? ' :: ' + c.details : ''));
  const lulus = checks.filter(c => c.ok).length;
  if (failed) { console.error('FIEZEL th content overlay: FAIL (' + lulus + '/' + checks.length + ')'); process.exit(1); }
  console.log('FIEZEL th content overlay: PASS (' + lulus + '/' + checks.length + ')');
  process.exit(0);
};

// ---------------------------------------------------------------------------------------
// Harness app.js (pola tests/adaptive-policy-test.js). Muat i18n + copy-id dulu karena
// app.js memanggil FiezelI18n.t saat evaluasi.
// ---------------------------------------------------------------------------------------
const store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {} }); }
const document = { baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {} }), addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } } };
const localStorage = { getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };
const fetch = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = { console, document, localStorage, fetch, location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null, Date, Intl, Math, URL, Error, Promise, setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} } };
context.window = context; context.self = context; context.window.scrollTo = () => {};
vm.createContext(context);
const i18nPath = path.join(root, 'features', 'i18n', 'fiezel-i18n.js');
if (fs.existsSync(i18nPath)) {
  vm.runInContext(fs.readFileSync(i18nPath, 'utf8'), context, { filename: 'fiezel-i18n.js' });
  for (const n of fs.readdirSync(path.join(root, 'features', 'i18n')).filter(x => /^copy-id-.*\.js$/.test(x)).sort()) {
    vm.runInContext(fs.readFileSync(path.join(root, 'features', 'i18n', n), 'utf8'), context, { filename: n });
  }
}
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);

// Sumber pristine dibaca dari disk, BUKAN dari objek runtime — objek runtime adalah yang
// dimutasi overlay, jadi memakainya sebagai pembanding membuat pemeriksaan pemulihan
// membandingkan sesuatu dengan dirinya sendiri.
const wSrc = JSON.parse(fs.readFileSync(path.join(root, 'writing-prompts-v1.json'), 'utf8'));
const rSrc = JSON.parse(fs.readFileSync(path.join(root, 'reading-exam-v1.json'), 'utf8'));
const wTh = JSON.parse(fs.readFileSync(path.join(root, 'features/i18n/writing-prompts-th.json'), 'utf8'));
const rTh = JSON.parse(fs.readFileSync(path.join(root, 'features/i18n/reading-exam-th.json'), 'utf8'));

const THAI = /[\u0E00-\u0E7F]/;
// Yang dituntut: ADA aksara Thai, bukan 100% aksara Thai. Ambangnya serendah itu dengan
// sengaja, karena istilah tata bahasa dan nama ujian (present simple, IELTS Task 2) memang
// tetap Inggris di dalam kalimat Thai yang benar — menuntut kemurnian di sini akan
// memerahkan terjemahan yang betul. Konsekuensinya jujur: pemeriksaan ini menangkap bidang
// yang TIDAK tersentuh overlay (jatuh utuh ke bahasa Indonesia, kasus yang m025-306 tutup),
// dan TIDAK menangkap kalimat Thai yang kebetulan menyelipkan satu frasa Indonesia. Yang
// kedua itu tugas tests/th-bank-purity-test.js, yang memeriksa isi sidecar-nya.
const cukupThai = s => { const t = String(s || ''); return t.length > 0 && THAI.test(t); };

// setLocale: overlay memutuskan lewat FiezelI18n.getLocale(), jadi itulah satu-satunya
// yang di-stub. Sisanya berjalan apa adanya.
const setLocale = loc => { context.FiezelI18n.getLocale = () => loc; };
const localeAwal = context.FiezelI18n && context.FiezelI18n.getLocale ? context.FiezelI18n.getLocale() : 'id';

// app.js memuat banknya secara async (load() memakai fetch stub di atas), jadi tunggu
// sampai CONTENT_BASE terisi — ditandai oleh WRITING_BANK/READING_EXAM yang sudah ada.
setTimeout(() => { try { jalankan(); } catch (e) { check('gerbang berjalan tanpa melempar', false, e && e.stack || String(e)); selesai(); } }, 400);

function jalankan() {
  const A = context.__fiezelAudit;
  check('app.js memapar kait overlay untuk gerbang', !!(A && A.applyContentLocale && A.writingPromptPool && A.writingExamTask && A.readingExamSets && A.makeExamReadingQuestion),
    'kait: ' + ['applyContentLocale', 'writingPromptPool', 'writingExamTask', 'readingExamSets', 'makeExamReadingQuestion'].filter(k => A && A[k]).join(', '));
  if (!A || !A.applyContentLocale) return selesai();

  const sets = A.readingExamSets();
  check('bank reading-exam termuat di harness', Array.isArray(sets) && sets.length > 0, 'set: ' + (sets ? sets.length : 'null'));
  const poolAwal = A.writingPromptPool(wSrc.prompts[0].level);
  check('bank writing termuat di harness', poolAwal.length > 0, 'prompt level ' + wSrc.prompts[0].level + ': ' + poolAwal.length);
  if (!sets.length || !poolAwal.length) return selesai();

  // =====================================================================================
  // BAGIAN 1 — fixture sintetis: apakah teks Thai SAMPAI ke penyaji?
  // =====================================================================================
  const pSrc = wSrc.prompts.find(p => p.examTask) || wSrc.prompts[0];
  const examKey = String(pSrc.examTask || '');
  const set0 = rSrc.passages[0];
  const q0 = set0.questions[0];

  context.FiezelThData = {
    writing: {
      prompts: { [pSrc.id]: { hint: 'TH-HINT', focus: 'TH-FOCUS' } },
      examTasks: examKey ? { [examKey]: { note: 'TH-NOTE' } } : {},
    },
    reading: {
      passages: { [set0.id]: { questions: { [q0.id]: { why: 'TH-WHY', whyOthersFail: 'TH-DISTRACTOR' } } } },
    },
  };
  setLocale('th');
  A.applyContentLocale();

  const pTh = A.writingPromptPool(pSrc.level).find(p => p.id === pSrc.id);
  check('writing: petunjuk th sampai ke penyaji (slot warisan id_hint)', pTh && pTh.id_hint === 'TH-HINT', pTh ? String(pTh.id_hint).slice(0, 60) : 'prompt hilang dari pool');
  check('writing: fokus th sampai ke penyaji', pTh && pTh.focus === 'TH-FOCUS', pTh ? String(pTh.focus).slice(0, 60) : 'prompt hilang dari pool');
  // Yang tidak boleh ikut bergeser: `en` adalah SOAL-nya (teks yang harus ditanggapi murid).
  check('writing: teks prompt berbahasa Inggris tidak tersentuh', pTh && pTh.en === pSrc.en, pTh ? String(pTh.en).slice(0, 60) : '-');

  if (examKey) {
    const exTh = A.writingExamTask(pTh || pSrc);
    check('writing: catatan tugas ujian th sampai ke penyaji', exTh && exTh.note === 'TH-NOTE', exTh ? String(exTh.note).slice(0, 60) : 'tugas ujian hilang');
    // Kontrak penilaian. Satu angka bergeser = murid dinilai atas target yang berbeda dari
    // ujian aslinya, dan `label` adalah nama ujian, bukan naskah.
    const exSrc = wSrc.examTasks[examKey];
    check('writing: label/minWords/minutes tugas ujian TIDAK diterjemahkan (kontrak penilaian)',
      exTh && exTh.label === exSrc.label && exTh.minWords === exSrc.minWords && exTh.minutes === exSrc.minutes,
      exTh ? JSON.stringify({ label: exTh.label, minWords: exTh.minWords, minutes: exTh.minutes }) : '-');

    // Penjaga aktif, bukan sekadar "sidecar hari ini kebetulan hanya berisi note". Sidecar
    // sintetis di bawah MENCOBA menggeser angkanya; overlay harus menolak dan hanya mengambil
    // `note`. Tanpa pemeriksaan ini, Object.assign yang menelan apa pun akan lolos hijau
    // sampai ada yang menambahkan minWords ke sidecar — dan lolosnya berbentuk murid yang
    // dinilai atas target berbeda dari ujian aslinya.
    context.FiezelThData = { writing: { examTasks: { [examKey]: { note: 'TH-NOTE-2', minWords: 1, minutes: 1, label: 'TH-LABEL' } } }, reading: null };
    A.applyContentLocale();
    const exSerang = A.writingExamTask({ examTask: examKey });
    check('writing: sidecar tidak bisa menggeser minWords/minutes/label lewat bidang tak terduga',
      exSerang && exSerang.note === 'TH-NOTE-2' && exSerang.minWords === exSrc.minWords && exSerang.minutes === exSrc.minutes && exSerang.label === exSrc.label,
      exSerang ? JSON.stringify({ note: String(exSerang.note).slice(0, 12), minWords: exSerang.minWords, minutes: exSerang.minutes, label: exSerang.label }) : '-');

    // Pulihkan fixture Bagian 1 supaya pemeriksaan reading-exam di bawah tetap membaca
    // keadaan yang sama seperti sebelum penyisipan ini.
    context.FiezelThData = {
      writing: { prompts: { [pSrc.id]: { hint: 'TH-HINT', focus: 'TH-FOCUS' } }, examTasks: { [examKey]: { note: 'TH-NOTE' } } },
      reading: { passages: { [set0.id]: { questions: { [q0.id]: { why: 'TH-WHY', whyOthersFail: 'TH-DISTRACTOR' } } } } },
    };
    A.applyContentLocale();
  }

  const setTh = A.readingExamSets().find(s => s.id === set0.id);
  const qTh = A.makeExamReadingQuestion(setTh, setTh.questions[0], 0);
  check('reading-exam: "why" th sampai ke penyaji', qTh.explain.why === 'TH-WHY', String(qTh.explain.why).slice(0, 60));
  check('reading-exam: "whyOthersFail" th sampai ke penyaji sebagai distractor', qTh.explain.distractor === 'TH-DISTRACTOR', String(qTh.explain.distractor).slice(0, 60));
  // Objek ujinya. Satu pilihan bergeser menilai murid SALAH atas jawaban yang BENAR, tanpa
  // jejak — jadi ini diperiksa eksplisit, bukan dipercayakan pada niat overlay.
  check('reading-exam: stem tidak tersentuh', qTh.question === String(q0.stem), String(qTh.question).slice(0, 60));
  check('reading-exam: pilihan tidak tersentuh (jumlah DAN isi)',
    JSON.stringify(qTh.options) === JSON.stringify(q0.options), JSON.stringify(qTh.options).slice(0, 90));
  check('reading-exam: indeks jawaban tidak tersentuh', qTh.answerIndex === Number(q0.answerIndex), qTh.answerIndex + ' vs ' + q0.answerIndex);
  // `evidence` adalah kutipan VERBATIM dari bacaan berbahasa Inggris. Menerjemahkannya
  // menyuruh murid mencari kalimat yang tidak ada di teks.
  check('reading-exam: evidence tetap kutipan verbatim berbahasa Inggris',
    qTh.explain.evidence === String(q0.explain.evidence || ''), String(qTh.explain.evidence).slice(0, 70));

  // =====================================================================================
  // BAGIAN 2 — pulih ke id. Overlay yang menulis ke objek bersama wajib bisa dibalik;
  // kalau tidak, murid Indonesia yang pernah menyentuh locale th membaca Thai.
  // =====================================================================================
  setLocale('id');
  A.applyContentLocale();
  const pId = A.writingPromptPool(pSrc.level).find(p => p.id === pSrc.id);
  check('pulih id: petunjuk writing byte-identik dengan sumber', pId && pId.id_hint === pSrc.id_hint, pId ? String(pId.id_hint).slice(0, 60) : '-');
  check('pulih id: fokus writing byte-identik dengan sumber', pId && pId.focus === pSrc.focus, pId ? String(pId.focus).slice(0, 60) : '-');
  if (examKey) {
    const exId = A.writingExamTask(pId || pSrc);
    check('pulih id: catatan tugas ujian byte-identik dengan sumber', exId && exId.note === wSrc.examTasks[examKey].note, exId ? String(exId.note).slice(0, 60) : '-');
  }
  const setId = A.readingExamSets().find(s => s.id === set0.id);
  const qId = A.makeExamReadingQuestion(setId, setId.questions[0], 0);
  check('pulih id: "why" reading-exam byte-identik dengan sumber', qId.explain.why === String(q0.explain.why || ''), String(qId.explain.why).slice(0, 60));
  check('pulih id: distractor reading-exam byte-identik dengan sumber', qId.explain.distractor === String(q0.explain.whyOthersFail || ''), String(qId.explain.distractor).slice(0, 60));

  // =====================================================================================
  // BAGIAN 3 — gagal-LUNAK. Sidecar th mendarat lebih lambat daripada bank (dua fetch
  // terpisah), jadi ada jendela nyata di mana locale sudah th tapi datanya belum ada.
  // Overlay tidak boleh melempar di situ: yang melempar di sini mematikan sesi belajar.
  // =====================================================================================
  setLocale('th');
  context.FiezelThData = null;
  let lempar = null;
  try { A.applyContentLocale(); } catch (e) { lempar = e; }
  check('th tanpa sidecar terunduh: overlay gagal-lunak, tidak melempar', !lempar, lempar ? String(lempar.message || lempar) : 'aman');
  const pKosong = A.writingPromptPool(pSrc.level).find(p => p.id === pSrc.id);
  check('th tanpa sidecar terunduh: naskah jatuh ke sumber id, bukan kosong', pKosong && pKosong.id_hint === pSrc.id_hint, pKosong ? String(pKosong.id_hint).slice(0, 50) : '-');

  // Sidecar setengah jadi (writing sudah mendarat, reading belum) — bentuk nyata dari
  // Promise.all yang sebagian gagal.
  context.FiezelThData = { writing: { prompts: { [pSrc.id]: { hint: 'TH-SEPARUH' } } }, reading: null };
  lempar = null;
  try { A.applyContentLocale(); } catch (e) { lempar = e; }
  check('sidecar separuh mendarat: tidak melempar', !lempar, lempar ? String(lempar.message || lempar) : 'aman');
  const pSep = A.writingPromptPool(pSrc.level).find(p => p.id === pSrc.id);
  const setSep = A.readingExamSets().find(s => s.id === set0.id);
  const qSep = A.makeExamReadingQuestion(setSep, setSep.questions[0], 0);
  check('sidecar separuh mendarat: writing th terpakai, reading tetap sumber id',
    pSep && pSep.id_hint === 'TH-SEPARUH' && qSep.explain.why === String(q0.explain.why || ''),
    'writing=' + (pSep && pSep.id_hint) + ' reading=' + String(qSep.explain.why).slice(0, 40));

  // =====================================================================================
  // BAGIAN 4 — sidecar NYATA. Fixture di atas membuktikan jalurnya tersambung; bagian ini
  // membuktikan id sungguhan benar-benar kena sasaran. Tanpa ini, sidecar yang id-nya
  // meleset seluruhnya (pelajaran m025-231) tetap lolos hijau.
  // =====================================================================================
  context.FiezelThData = { writing: wTh, reading: rTh };
  A.applyContentLocale();

  const idSumber = new Set(wSrc.prompts.map(p => p.id));
  const idTh = Object.keys(wTh.prompts || {});
  check('sidecar nyata: setiap id prompt th ada di bank sumber (nol id meleset)',
    idTh.length > 0 && idTh.every(i => idSumber.has(i)), 'th ' + idTh.length + ' id, meleset: ' + idTh.filter(i => !idSumber.has(i)).join(', '));
  check('sidecar nyata: SETIAP prompt sumber punya terjemahan th (nol prompt tertinggal)',
    wSrc.prompts.every(p => wTh.prompts && wTh.prompts[p.id]),
    'tanpa th: ' + wSrc.prompts.filter(p => !(wTh.prompts && wTh.prompts[p.id])).map(p => p.id).join(', '));

  let hintThai = 0, hintBocor = [];
  for (const p of wSrc.prompts) {
    const hidup = A.writingPromptPool(p.level).find(x => x.id === p.id);
    if (!hidup) { hintBocor.push(p.id + ':hilang'); continue; }
    if (cukupThai(hidup.id_hint)) hintThai++; else hintBocor.push(p.id + ':' + String(hidup.id_hint).slice(0, 30));
  }
  check('sidecar nyata: petunjuk SETIAP prompt keluar ber-aksara Thai di jalur penyaji',
    hintThai === wSrc.prompts.length, hintThai + '/' + wSrc.prompts.length + (hintBocor.length ? ' bocor: ' + hintBocor.slice(0, 4).join(' | ') : ''));

  let noteThai = 0, noteBocor = [];
  for (const k of Object.keys(wSrc.examTasks || {})) {
    const ex = A.writingExamTask({ examTask: k });
    if (ex && cukupThai(ex.note)) noteThai++; else noteBocor.push(k + ':' + String(ex && ex.note).slice(0, 30));
  }
  const jumlahTask = Object.keys(wSrc.examTasks || {}).length;
  check('sidecar nyata: catatan SETIAP tugas ujian keluar ber-aksara Thai',
    noteThai === jumlahTask, noteThai + '/' + jumlahTask + (noteBocor.length ? ' bocor: ' + noteBocor.slice(0, 3).join(' | ') : ''));

  let whyThai = 0, whyTotal = 0, dThai = 0, dTotal = 0, rBocor = [];
  for (const s of A.readingExamSets()) {
    for (let i = 0; i < (s.questions || []).length; i++) {
      const q = s.questions[i], asal = (rSrc.passages.find(x => x.id === s.id) || {}).questions[i];
      const hasil = A.makeExamReadingQuestion(s, q, i);
      if (String(asal.explain && asal.explain.why || '').trim()) { whyTotal++; if (cukupThai(hasil.explain.why)) whyThai++; else rBocor.push(q.id + ':why'); }
      if (String(asal.explain && asal.explain.whyOthersFail || '').trim()) { dTotal++; if (cukupThai(hasil.explain.distractor)) dThai++; else rBocor.push(q.id + ':distractor'); }
    }
  }
  check('sidecar nyata: SETIAP "why" reading-exam keluar ber-aksara Thai',
    whyTotal > 0 && whyThai === whyTotal, whyThai + '/' + whyTotal + (rBocor.length ? ' bocor: ' + rBocor.slice(0, 5).join(', ') : ''));
  check('sidecar nyata: SETIAP distractor reading-exam keluar ber-aksara Thai',
    dTotal > 0 && dThai === dTotal, dThai + '/' + dTotal);

  // Kunci pilihan jawaban di seluruh bank, bukan cuma soal pertama: ini invarian yang
  // kalau rusak tidak terlihat sebagai teks salah, melainkan sebagai nilai murid yang salah.
  let geser = [];
  for (const s of A.readingExamSets()) {
    const asal = rSrc.passages.find(x => x.id === s.id);
    for (let i = 0; i < (s.questions || []).length; i++) {
      const a = asal.questions[i], b = s.questions[i];
      if (JSON.stringify(a.options) !== JSON.stringify(b.options) || Number(a.answerIndex) !== Number(b.answerIndex) || String(a.stem) !== String(b.stem)) geser.push(b.id);
    }
  }
  check('sidecar nyata: nol soal bergeser (stem, pilihan, indeks jawaban) di SELURUH bank',
    geser.length === 0, geser.length ? 'bergeser: ' + geser.slice(0, 6).join(', ') : 'utuh ' + dTotal + '+ soal');

  setLocale(localeAwal);
  selesai();
}
