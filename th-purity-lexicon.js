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
// Apostrof dan hubung hanya SAH DI ANTARA huruf ("don't", "so-called"). Versi sebelumnya
// memasukkan keduanya ke kelas ekor, jadi kata di dalam kutip menyerap kutip penutupnya:
// kunci "onto 'deny'," menghasilkan token "deny'" alih-alih "deny", sehingga kata Inggris itu
// tidak pernah masuk korpus Inggris dan penerjemahnya dituduh menulis bahasa Indonesia.
// Apostrof KURUS (') dan TIPOGRAFIS (\u2019) diperlakukan sama: "mustn\u2019t" dan "mustn't"
// adalah kata yang sama. Sebelum ini hanya (') yang dikenal, jadi "mustn\u2019t" pecah jadi
// "mustn" + "t"; "mustn" tidak pernah masuk korpus Inggris (yang memakai apostrof kurus),
// hanya korpus Indonesia, sehingga kalimat Thai yang mengutip "mustn\u2019t" dituduh berbahasa
// Indonesia. Nyata: 31 bidang cloze-th tertuduh karena ini.
const TOKEN = /[A-Za-z]+(?:['\u2019-][A-Za-z]+)*/g;
const tokens = (s) => String(s == null ? '' : s).match(TOKEN) || [];

/** Istilah teknis/ujian yang sah muncul apa adanya di permukaan Thai mana pun. */
const ALLOWLIST = new Set([
  'part', 'task', 'independent', 'integrated', 'ielts', 'toefl', 'fiezel', 'cefr',
  // Nama TIPE SOAL ujian. Ia muncul apa adanya di teks Indonesia juga ("jebakan klasik
  // matching headings"), jadi leksikon menghitungnya sebagai kata Indonesia-saja padahal ia
  // istilah Inggris yang memang tidak diterjemahkan di locale mana pun.
  'matching', 'headings', 'heading', 'summary', 'completion',
  // Kata INGGRIS yang di repo ini hanya pernah DIKUTIP di dalam teks penjelasan Indonesia
  // ("good jadi better, far jadi farther"), tidak pernah muncul di bidang berbahasa Inggris
  // mana pun, sehingga selisih korpus salah menggolongkannya Indonesia-saja. Penjelasan tata
  // bahasa Thai mengutip kata yang sama persis, jadi tanpa ini kalimat Thai yang benar
  // dituduh berbahasa Indonesia.
  'farther', 'further', 'republic',
  // NAMA KOTA. 'Malang' juga kata sifat Indonesia ('sial'), jadi selisih korpus
  // menggolongkannya Indonesia-saja; sebagai nama tempat ia memang tidak diterjemahkan
  // ke locale mana pun dan muncul apa adanya di pilihan jawaban Thai.
  'malang',
  // MORFEM Inggris yang dikutip telanjang di penjelasan tata bahasa: '-est' hanya pernah
  // muncul MENEMPEL pada kata di korpus Inggris ('largest'), tidak pernah sebagai token
  // sendiri, jadi kutipan telanjangnya jatuh ke selisih Indonesia-saja.
  'est'
]);

function buildLexicon(ROOT) {
  const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
  const ID = new Set();
  const EN = new Set();
  const addID = (s) => tokens(s).forEach((w) => ID.add(w.toLowerCase()));
  const addEN = (s) => tokens(s).forEach((w) => EN.add(w.toLowerCase()));

  // Prosa Inggris yang MENGUTIP bahasa Indonesia di dalam tanda kutip — pola yang dipakai
  // konsisten di bank grammar dan kunci miskonsepsi: "mirroring the Indonesian order 'minum
  // selalu'", "transferring Indonesian 'untuk'". Kutipannya WAJIB dibuang sebelum masuk korpus
  // Inggris. Tanpa ini kata Indonesia yang dikutip terhapus dari selisih ID−EN, dan detektor
  // jadi buta terhadap kata itu DI SELURUH permukaan — persis cara 'yang' dan 'minum' hilang.
  const addENKutip = (v) => addEN(String(v == null ? '' : v).replace(/'[^']*'/g, ' '));


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
    for (const d of it.distractors || []) { addEN(d.text); addENKutip(d.misconception); addID(d.whyFailsId); addID(d.misconceptionId); }
    for (const k of ['why', 'rule', 'memory', 'avoid']) addID(it.explain && it.explain[k]);
  }
  // vocabulary-master.json: 2.440 entri kosakata INGGRIS (kata, sinonim, antonim, kolokasi,
  // kalimat contoh en). Korpus Inggris murni terbesar di repo, dan tanpa ia kata Inggris yang
  // hanya pernah DIKUTIP di dalam teks penjelasan Indonesia — 'farther', 'excited' — jatuh ke
  // selisih "Indonesia-saja" dan menuduh kalimat Thai yang mengutipnya.
  for (const v of Object.values(J('vocabulary-master.json'))) {
    if (!v || typeof v !== 'object') continue;
    addEN(v.word); addEN(v.partOfSpeech); addEN(v.topic);
    (v.synonyms || []).forEach(addEN);
    (v.antonyms || []).forEach(addEN);
    (v.collocations || []).forEach(addEN);
    (v.examples || []).forEach((ex) => addEN(ex && ex.en));
  }
  for (const e of Object.values(J('cloze-explains-v1.json').explains)) {
    for (const k of ['why', 'rule', 'memory', 'avoid']) addID(e[k]);
  }
  // grammar-templates.json: bank grammar itu sendiri. Seluruh isinya berbahasa INGGRIS
  // (kalimat soal, pilihan, nama objektif dan miskonsepsi) dan ia korpus Inggris terbesar
  // kedua di repo setelah reading-bank. Tanpa ia, istilah tata bahasa yang hanya muncul di
  // sini — 'phrasal', 'particle' — dihitung Indonesia-saja oleh selisih korpus.
  for (const t of J('grammar-templates.json').templates || []) {
    addEN(t.stem); addEN(t.pedagogicalObjective); addENKutip(t.misconceptionTargeted);
    addEN(t.reasoningOperation); addENKutip(t.explanation); addEN(t.subskill); addEN(t.family);
    (t.options || []).forEach(addEN);
    for (const d of t.distractors || []) { addEN(d.option); addENKutip(d.misconception); addENKutip(d.whyFails); }
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
        // KOREKSI KONTRAK: stem dan pilihan ujian ini BERBAHASA INDONESIA ("Paragraf mana yang
        // memuat..."), bukan Inggris. Salah label di sini menyuntikkan delapan kata Indonesia
        // paling umum — dan, yang, adalah, untuk, tidak, dulu, jalan, kembali — ke korpus
        // Inggris, dan selisih ID−EN menghapus semuanya dari leksikon. Akibatnya detektor buta
        // pada kata-kata itu di SELURUH bank, dan gerbang sempat melaporkan 20/20 sementara
        // kalimat Indonesia utuh masih duduk di sidecar th.
        addID(q.stem); (q.options || []).forEach(addID);
        if (q.explain) { addEN(q.explain.evidence); addID(q.explain.why); addID(q.explain.whyOthersFail); }
      }
    }
  }
  // KUNCI kedua berkas ini berbahasa INGGRIS (nama miskonsepsi yang dipakai bank soal untuk
  // menjodohkan); hanya NILAINYA yang Indonesia. Tanpa memasukkan kuncinya ke korpus Inggris,
  // istilah tata bahasa yang memang tidak diterjemahkan — 'phrasal', 'deny', 'gerund' — jatuh
  // ke himpunan Indonesia-saja dan penerjemahnya dituduh menyelundupkan bahasa Indonesia.
  for (const [k, v] of Object.entries(J('grammar-misconception-id.json').diagnoses)) { addENKutip(k); addID(v); }
  for (const [k, c] of Object.entries(J('misconception-taxonomy-v1.json').codes)) {
    addEN(k); addENKutip(c.familyHint); addID(c.label); addID(c.description_id);
  }
  for (const it of J('features/speaking-listening/listening-bank-v1.json').items || []) {
    addEN(it.script); addEN(it.answerText);
    if (it.pedagogy) { addEN(it.pedagogy.character); addEN(it.pedagogy.scenario); addEN(it.pedagogy.focus); }
    const scaffolded = it.level === 'A1' || it.level === 'A2';
    if (scaffolded) {
      addID(it.question); addID(it.explain);
      (it.options || []).forEach(it.mode === 'paraphrase' ? addEN : addID);
    } else {
      // Mode dictation: pertanyaannya BUKAN soal Inggris melainkan instruksi antarmuka
      // berbahasa Indonesia ("Ketik kalimat yang kamu dengar..."), 134 butir di B1+. Tanpa
      // pengecualian ini 'yang' dan 'tidak' ikut masuk korpus Inggris dan hilang dari leksikon.
      if (it.mode === 'dictation') addID(it.question); else addEN(it.question);
      (it.options || []).forEach(addEN); addID(it.explain);
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
/**
 * Kalimat Thai yang SUDAH DITINJAU MANUSIA dan benar, tetapi bentuknya kebetulan sama persis
 * dengan keluaran penerjemah token: daftar berisi kata-kata Thai pendek yang dipisah spasi
 * ("ภาพวาด หนังสือ ความคิด" = lukisan, buku, gagasan). Tidak ada aturan mekanis yang bisa
 * memisahkan daftar sah semacam itu dari "เขา โกรธ โจทย์ เงิน" (omong kosong keluaran token) —
 * keduanya tiga gugus Thai pendek; yang membedakan hanya MAKNA.
 *
 * Kenapa daftar-kecualian, bukan ambang yang dilonggarkan: sudah diukur. Menaikkan ambang
 * tier-1 dari >=3 ke >=4 gugus memang memulihkan tiga kalimat di bawah, TAPI daya tangkap
 * pada keluaran token nyata jatuh dari 77 ke 37 string; ke >=5 gugus jatuh ke 8. Menukar
 * separuh daya tangkap demi empat kalimat adalah tukar yang buruk, jadi ambangnya dibiarkan
 * setajam aslinya dan pengecualiannya ditulis satu per satu di sini — terlihat di diff,
 * bisa ditinjau, dan tidak diam-diam melemahkan gerbang untuk string lain mana pun.
 */
const KATA_PER_KATA_DITINJAU = new Set([
  '\u201cAlong\u201d \u0e43\u0e0a\u0e49\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e44\u0e1b\u0e15\u0e32\u0e21\u0e41\u0e19\u0e27\u0e40\u0e2a\u0e49\u0e19 (\u0e0a\u0e32\u0e22\u0e2b\u0e32\u0e14 \u0e16\u0e19\u0e19 \u0e41\u0e21\u0e48\u0e19\u0e49\u0e33) \u201cAcross\u201d \u0e43\u0e0a\u0e49\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e02\u0e49\u0e32\u0e21\u0e08\u0e32\u0e01\u0e1d\u0e31\u0e48\u0e07\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e44\u0e1b\u0e2d\u0e35\u0e01\u0e1d\u0e31\u0e48\u0e07 \u201cThrough\u201d \u0e43\u0e0a\u0e49\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e17\u0e30\u0e25\u0e38\u0e1c\u0e48\u0e32\u0e19\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e17\u0e35\u0e48\u0e42\u0e2d\u0e1a\u0e25\u0e49\u0e2d\u0e21\u0e2d\u0e22\u0e39\u0e48 \u201cOver\u201d \u0e43\u0e0a\u0e49\u0e01\u0e31\u0e1a\u0e01\u0e32\u0e23\u0e1c\u0e48\u0e32\u0e19\u0e02\u0e49\u0e32\u0e21\u0e40\u0e2b\u0e19\u0e37\u0e2d\u0e2a\u0e34\u0e48\u0e07\u0e01\u0e35\u0e14\u0e02\u0e27\u0e32\u0e07',

  "“Mustn't” = ห้าม อย่าทำ ส่วน “Needn't” / “don't have to” = ไม่จำเป็น เลือกได้ตามใจ รูปปฏิเสธพลิกความหมาย เพราะ “must” กับ “have to” คล้ายกัน แต่ “mustn't” กับ “needn't” ต่างกันมาก",
  "ภาพวาด หนังสือ ความคิด ใช้ “some of WHICH” ส่วนอาสาสมัคร นักเรียน ใช้ “many of WHOM”",
  "“Because” ใช้บอกเหตุผล ส่วน “so” ใช้บอกผล คือ เหตุผล + “so” + ผล หรือ ผล + “because” + เหตุผล ให้ใช้อย่างใดอย่างหนึ่งต่อหนึ่งประโยคเท่านั้น",
  "ผลไม้ ขนม และชา",
  "ขนมปัง นม และข้าว",
  "ข้าว ไข่ และซุป",
  "ปลา น้ำ และขนม",
  "ขนมปัง ข้าวสาร และชา",
  "ไข่ น้ำตาล และนม",
  "ขนมปัง น้ำตาล และนม",
  "ผลไม้ ขนมปัง และน้ำ",
  "นม น้ำแข็ง และส้มหนึ่งลูก",
  "ตามเนื้อเรื่อง ชั้น ม.3 ทาสีอะไรบนผนัง?",
  "ตามเนื้อเรื่อง ชั้น ม.1 ปลูกอะไรในกระบะ?",
]);

function thaiKataPerKata(value) {
  const s = String(value == null ? '' : value).replace(/ +ๆ/g, 'ๆ');
  if (!RE_THAI.test(s)) return false;
  if (KATA_PER_KATA_DITINJAU.has(String(value == null ? '' : value).trim())) return false;
  for (const rentetan of s.match(/[฀-๿]+(?: [฀-๿]+)+/g) || []) {
    const gugus = rentetan.split(' ').map((x) => x.length);
    const rerata = gugus.reduce((a, b) => a + b, 0) / gugus.length;
    // SENGAJA konservatif. Thai yang sah memakai spasi untuk memisahkan butir daftar, dan
    // daftar 4 butir yang benar ("(ความจำเป็น การอนุญาต คำแนะนำ การอนุมาน)", rerata 8,75)
    // bertabrakan dengan keluaran penerjemah token 4 gugus (rerata 9,0) — tidak ada ambang
    // numerik yang memisahkan keduanya. Karena satu tuduhan keliru membuat orang mematikan
    // gerbang, ambangnya ditarik ke wilayah yang tidak mungkin ditulis manusia: rerata <8 di
    // panjang berapa pun, ATAU rentetan >=5 gugus pendek. Konsekuensinya jujur: rentetan
    // 4-gugus dengan rerata 8-13 lolos. Itu bisa diterima karena bukan pertahanan utama —
    // pertahanan utamanya adalah pemeriksaan residu Indonesia di atas, dan sidecar listening
    // kini dibangun dari peta KALIMAT UTUH sehingga cacat ini tidak punya jalan lahir lagi.
    // Tidak ada kata Thai sepanjang 16 aksara. Rentetan yang memuat gugus sepanjang itu
    // PASTI bukan keluaran kata-per-kata (penerjemah token memuntahkan satu kata kamus per
    // spasi), jadi rentetan begitu dilewati. Diukur, bukan ditebak: pada 77 string keluaran
    // token yang HANYA pemeriksaan ini yang menangkapnya, gugus terpanjang di dalam rentetan
    // yang memicu adalah 12 aksara — jadi ambang 16 tidak menurunkan daya tangkap sama
    // sekali, dan ia memulihkan kalimat Thai sah yang mengutip istilah panjang.
    if (Math.max(...gugus) >= 16) continue;
    if (gugus.length >= 3 && rerata < 8) return true;
    if (gugus.length >= 5 && rerata < 13) return true;
  }
  return false;
}

module.exports = { buildLexicon, residuIndonesia, thaiKataPerKata, tokens, RE_THAI, RE_LATIN, ALLOWLIST };
