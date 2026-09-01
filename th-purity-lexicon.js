'use strict';
/**
 * th-purity-lexicon.js — DETEKTOR SISA BAHASA INDONESIA DI PERMUKAAN THAI
 *
 * MENGAPA BUKAN DAFTAR KATA FUNGSI. Percobaan pertama gerbang ini memakai daftar kata fungsi
 * Indonesia (yang, dan, untuk, tidak…). Daftar itu menangkap kalimat penuh, tetapi BUTA pada
 * frasa pendek yang justru mendominasi bank soal: "Tangannya kedinginan", "Sebuah kuas",
 * "Dibawa temannya" — tidak satu pun memuat kata fungsi, semuanya bahasa Indonesia tulen.
 * Diukur terhadap bank listening: 580 dari 1.600 opsi A1/A2 lolos secara keliru. Gerbang yang
 * buta pada mayoritas permukaannya bukan gerbang.
 *
 * PENDEKATAN YANG DIPAKAI: LEKSIKON DARI KORPUS REPO SENDIRI. Repo ini punya dua korpus besar
 * yang sudah terlabeli oleh strukturnya sendiri — bidang yang KONTRAKNYA bahasa Indonesia
 * (penjelasan cloze, whyFailsId, soal reading A1/A2, seluruh copy-id) dan bidang yang
 * KONTRAKNYA bahasa Inggris (kalimat cloze, bacaan, transkrip listening, stem ujian). Dari
 * keduanya dibangun himpunan "kata yang HANYA muncul di korpus Indonesia". Kata yang muncul di
 * kedua korpus (data, film, ide, radio, video) ambigu dan sengaja DIBIARKAN lolos — gerbang
 * ini harus bebas positif palsu, karena satu tuduhan keliru membuat orang mematikannya.
 *
 * Sebuah token Latin di permukaan Thai adalah RESIDU bila kata itu ada di himpunan Indonesia-
 * saja. Nama karakter (Hana, Bayu) aman: semuanya muncul di transkrip Inggris, jadi masuk
 * korpus Inggris. Dibangun ulang tiap kali dijalankan — tidak ada berkas data yang bisa basi.
 */
const fs = require('fs');
const path = require('path');

const RE_THAI = /[฀-๿]/;
const RE_LATIN = /[A-Za-z]/;
const TOKEN = /[A-Za-z][A-Za-z'-]*/g;
const tokens = (s) => String(s == null ? '' : s).match(TOKEN) || [];

/** Istilah teknis/ujian yang sah muncul apa adanya di permukaan Thai mana pun. */
const ALLOWLIST = new Set([
  'part', 'task', 'independent', 'integrated', 'ielts', 'toefl', 'fiezel', 'cefr',
  // Nama TIPE SOAL ujian. Ia muncul apa adanya di teks Indonesia juga ("jebakan klasik
  // matching headings"), jadi leksikon menghitungnya sebagai kata Indonesia-saja padahal ia
  // istilah Inggris yang memang tidak diterjemahkan di locale mana pun.
  'matching', 'headings', 'heading', 'summary', 'completion'
]);

function buildLexicon(ROOT) {
  const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
  const ID = new Set();
  const EN = new Set();
  const addID = (s) => tokens(s).forEach((w) => ID.add(w.toLowerCase()));
  const addEN = (s) => tokens(s).forEach((w) => EN.add(w.toLowerCase()));

  for (const p of J('reading-bank.json')) {
    addEN(p.text); addEN(p.title);
    const scaffolded = p.level === 'A1' || p.level === 'A2';
    for (const q of p.qs || []) {
      const push = scaffolded ? addID : addEN;
      push(q[0]); (q[1] || []).forEach(push);
      if (q[3]) { push(q[3].answer); addEN(q[3].evidence); if (scaffolded) { addID(q[3].why); addID(q[3].whyOthersFail); } }
    }
  }
  for (const it of J('cloze-bank-v1.json').items) {
    addEN(it.sentence); addEN(it.blank && it.blank.answer);
    ((it.blank && it.blank.alternates) || []).forEach(addEN);
    for (const d of it.distractors || []) { addEN(d.text); addEN(d.misconception); addID(d.whyFailsId); addID(d.misconceptionId); }
    for (const k of ['why', 'rule', 'memory', 'avoid']) addID(it.explain && it.explain[k]);
  }
  for (const e of Object.values(J('cloze-explains-v1.json').explains)) {
    for (const k of ['why', 'rule', 'memory', 'avoid']) addID(e[k]);
  }
  for (const t of Object.values(J('grammar-explanations-id.json').templates || {})) {
    for (const k of ['objective', 'misconception', 'reasoning', 'rule', 'whyCorrect', 'whyOthersFail', 'howToAvoid', 'memoryCue']) addID(t[k]);
    for (const d of Object.values(t.distractors || {})) { addID(d.misconception); addID(d.whyFails); }
  }
  {
    const w = J('writing-prompts-v1.json');
    for (const p of w.prompts || []) { addID(p.id_hint); addID(p.focus); addEN(p.en); }
    for (const c of (w.rubric && w.rubric.criteria) || []) { addID(c.label); addID(c.asks); (c.levels || []).forEach(addID); addEN(c.labelEn); }
  }
  {
    const r = J('reading-exam-v1.json');
    for (const f of Object.values(r.examFormats || {})) { addID(f.note); addEN(f.label); }
    for (const p of r.passages || []) {
      addEN(p.text); addEN(p.title);
      for (const q of p.questions || []) {
        addEN(q.stem); (q.options || []).forEach(addEN);
        if (q.explain) { addEN(q.explain.evidence); addID(q.explain.why); addID(q.explain.whyOthersFail); }
      }
    }
  }
  for (const v of Object.values(J('grammar-misconception-id.json').diagnoses)) addID(v);
  for (const c of Object.values(J('misconception-taxonomy-v1.json').codes)) { addID(c.label); addID(c.description_id); }
  for (const it of J('features/speaking-listening/listening-bank-v1.json').items || []) {
    addEN(it.script); addEN(it.answerText);
    if (it.pedagogy) { addEN(it.pedagogy.character); addEN(it.pedagogy.scenario); addEN(it.pedagogy.focus); }
    const scaffolded = it.level === 'A1' || it.level === 'A2';
    if (scaffolded) {
      addID(it.question); addID(it.explain);
      (it.options || []).forEach(it.mode === 'paraphrase' ? addEN : addID);
    } else {
      addEN(it.question); (it.options || []).forEach(addEN); addID(it.explain);
    }
  }
  // copy-id-*.js: seluruh teks antarmuka Indonesia. Literal string diambil kasar dengan regex —
  // yang ikut terangkut (nama kelas CSS, kunci) disaring oleh syarat /^[a-z]{3,}$/ di bawah.
  const i18nDir = path.join(ROOT, 'features/i18n');
  for (const f of fs.readdirSync(i18nDir)) {
    if (!/^copy-id-.*\.js$/.test(f)) continue;
    const src = fs.readFileSync(path.join(i18nDir, f), 'utf8');
    for (const m of src.match(/'[^'\\]{4,}'|"[^"\\]{4,}"/g) || []) addID(m.slice(1, -1));
  }

  const indonesiaSaja = new Set();
  for (const w of ID) {
    if (EN.has(w) || ALLOWLIST.has(w)) continue;
    if (!/^[a-z]{3,}$/.test(w)) continue; // buang identifier/CSS/singkatan dari copy-id
    indonesiaSaja.add(w);
  }
  return indonesiaSaja;
}

/** Kata Indonesia yang tersisa di sebuah nilai — kosong berarti bersih. */
function residuIndonesia(value, lexicon) {
  const s = String(value == null ? '' : value);
  if (!RE_LATIN.test(s)) return [];
  const out = [];
  for (const w of tokens(s)) {
    const lw = w.toLowerCase();
    if (lexicon.has(lw) && !out.includes(w)) out.push(w);
  }
  return out;
}

/**
 * true bila string Thai memikul jejak penerjemah kata-per-kata.
 *
 * Aksara Thai TIDAK menaruh spasi antar-kata, tapi ia memang memakai spasi untuk memisahkan
 * KLAUSA — jadi "ada spasi" saja bukan bukti apa pun. Yang membedakan adalah PANJANG gugusnya:
 * penerjemah token menghasilkan rentetan gugus pendek ("รถบัส นั้น สาย นานเท่าใด?" → 5,4,3,9
 * aksara), Thai tulisan manusia memisahkan klausa panjang (31,9,21). Yang diukur hanya
 * rentetan Thai-spasi-Thai murni: angka dan sisipan Inggris yang sah ("ขอน้ำ 1 ขวด") memecah
 * gugus tanpa ada yang salah. ๆ (mai yamok) disatukan dulu ke kata sebelumnya — "เล็ก ๆ"
 * adalah satu kata, bukan dua.
 */
function thaiKataPerKata(value) {
  const s = String(value == null ? '' : value).replace(/ +ๆ/g, 'ๆ');
  if (!RE_THAI.test(s)) return false;
  for (const rentetan of s.match(/[฀-๿]+(?: [฀-๿]+)+/g) || []) {
    const gugus = rentetan.split(' ').map((x) => x.length);
    const rerata = gugus.reduce((a, b) => a + b, 0) / gugus.length;
    // Dua ambang, karena Thai yang SAH juga memakai spasi untuk memisahkan butir daftar
    // pendek ("สั้น กระชับ และตอบกลับผู้อื่น" → 3 gugus, rerata 9,0). Diukur terhadap kedua
    // korpus: keluaran penerjemah token hampir selalu ≥4 gugus (rerata 5,2–9,0), sedangkan
    // daftar Thai yang benar berhenti di 3 gugus dengan rerata ≥8,7. Rentetan 3 gugus baru
    // dituduh bila gugusnya benar-benar seukuran kata tunggal (rerata <8).
    if (gugus.length >= 4 && rerata < 13) return true;
    if (gugus.length >= 3 && rerata < 8) return true;
  }
  return false;
}

module.exports = { buildLexicon, residuIndonesia, thaiKataPerKata, tokens, RE_THAI, RE_LATIN, ALLOWLIST };
