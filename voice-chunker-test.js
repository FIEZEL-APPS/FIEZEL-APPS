'use strict';
/**
 * V3 GERBANG PEMECAH TEKS (voice-chunker-test.js)
 *
 * Keluhan OWNER: "setiap akhir kalimat, setiap ada titik, setiap menyambung ke kalimat
 * atau paragraf baru, selalu delay."
 *
 * Penyebab yang dijaga berkas ini adalah aritmetikanya, bukan selera: strategi lama
 * memotong teks pada SETIAP tanda akhir kalimat, sehingga satu passage reading B1
 * sepanjang 1044 karakter menjadi 13 potongan. Setiap potongan berarti satu putaran
 * generate penuh ditambah satu sambungan penjadwalan, jadi setiap titik adalah tempat
 * murid menunggu. Strategi baru mengelompokkan kalimat berdasarkan ANGGARAN KARAKTER.
 *
 * Gerbang ini mengunci delapan sifat sekaligus, semuanya dengan angka:
 *   (a) tidak ada potongan melebihi ambang aman model
 *   (b) tidak ada potongan memotong kata
 *   (c) singkatan umum ("Mr.", "e.g.") bukan batas kalimat
 *   (d) angka desimal ("3.5") bukan batas kalimat
 *   (e) batas paragraf SELALU menjadi batas potongan
 *   (f) setiap potongan membawa penanda jenis batas (comma|sentence|paragraph)
 *   (g) jumlah potongan untuk contoh NYATA dari bank FIEZEL turun dibanding per-titik
 *   (h) pemecahnya murni: input sama -> keluaran sama, tanpa jaringan dan tanpa DOM
 *
 * Node murni, tanpa dependency.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const P = require(path.join(ROOT, 'features/neural-voice/fiezel-prosody.js'));
const NV = require(path.join(ROOT, 'features/neural-voice/fiezel-neural-voice.js'));

let pass = 0;
const test = (name, fn) => { fn(); pass += 1; console.log('PASS', name); };

const MAX = P.CHUNK_CHARS.max;
const TARGET = P.CHUNK_CHARS.target;
const BOUNDARIES = ['comma', 'sentence', 'paragraph'];

// Contoh NYATA dari bank FIEZEL. Bukan teks buatan: keluhan OWNER muncul justru pada
// materi ini, jadi angka sebelum/sesudah harus diukur pada materi ini juga.
const reading = JSON.parse(fs.readFileSync(path.join(ROOT, 'reading-bank.json'), 'utf8'));
const listening = JSON.parse(fs.readFileSync(path.join(ROOT, 'features/speaking-listening/listening-bank-v1.json'), 'utf8')).items;
const passage = reading.find((item) => item.id === 'r0123');
const script = listening.find((item) => item.id === 'listen_sc_b1_gist_007');
assert.ok(passage && passage.level === 'B1', 'passage reading B1 r0123 harus ada di bank');
assert.ok(script && script.level === 'B1', 'skrip listening B1 listen_sc_b1_gist_007 harus ada di bank');

/**
 * Strategi LAMA, ditulis ulang di sini sebagai pembanding: satu potongan per tanda akhir
 * kalimat. Ini persis regex yang dipakai planStream/phrases sebelum perubahan, jadi
 * angka (g) di bawah membandingkan strategi, bukan implementasi.
 */
function perFullStopChunks(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return (flat.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [flat])
    .map((part) => part.trim())
    .filter(Boolean);
}

const words = (text) => String(text).split(/\s+/).filter(Boolean);

// ---------------------------------------------------------------------------------------
// (a) AMBANG
// ---------------------------------------------------------------------------------------
test('(a) tidak ada potongan melebihi ambang aman model', () => {
  assert.ok(MAX >= 180 && MAX <= 400, 'ambang harus konstanta yang wajar, bukan tak terbatas: ' + MAX);
  assert.ok(TARGET <= MAX, 'target packing tidak boleh melewati ambang keras');
  const samples = [passage.text, script.script, reading[0].text, reading[150].text,
    'Satu kalimat pendek.', script.script + '\n\n' + passage.text];
  samples.forEach((sample, at) => {
    P.groupChunks(sample).forEach((chunk) => {
      // Satu kata yang lebih panjang dari ambang tidak bisa dipenuhi tanpa memotong kata;
      // dalam kasus itu kata dikeluarkan utuh. Karena itu pengecualiannya SATU token.
      const single = words(chunk.text).length === 1;
      assert.ok(chunk.chars <= MAX || single,
        'contoh ' + at + ' potongan ' + chunk.index + ' = ' + chunk.chars + ' char melewati ' + MAX);
      assert.strictEqual(chunk.chars, chunk.text.length, 'chars harus konsisten dengan teksnya');
    });
  });
  // Ambang bisa disetel, dan setelan itu benar-benar dihormati.
  P.groupChunks(passage.text, { max: 120, target: 100 }).forEach((chunk) => {
    assert.ok(chunk.chars <= 120, 'ambang yang disetel harus dipatuhi: ' + chunk.chars);
  });
});

// ---------------------------------------------------------------------------------------
// (b) TIDAK MEMOTONG KATA
// ---------------------------------------------------------------------------------------
test('(b) tidak ada potongan memotong kata di tengah', () => {
  const sources = [passage.text, script.script,
    // Satu kalimat panjang tanpa tanda baca klausa sama sekali: jalur paling rawan,
    // karena di sinilah pemecah harus jatuh ke batas kata.
    words(passage.text.replace(/[.,;:]/g, '')).join(' ')];
  sources.forEach((source, at) => {
    const chunks = P.groupChunks(source, { max: 90, target: 80 });
    const rejoined = chunks.map((chunk) => chunk.text).join(' ');
    assert.deepStrictEqual(words(rejoined), words(source.replace(/\s+/g, ' ')),
      'contoh ' + at + ': daftar kata harus identik sebelum dan sesudah dipecah');
    chunks.forEach((chunk) => {
      assert.ok(!/^\s|\s$/.test(chunk.text), 'potongan tidak boleh berspasi di ujung');
      assert.ok(/^\S/.test(chunk.text) && /\S$/.test(chunk.text), 'potongan harus mulai dan berakhir pada kata utuh');
    });
  });
  // Kata yang lebih panjang dari ambang tetap keluar UTUH, tidak dibelah.
  const longWord = 'Pneumonoultramicroscopicsilicovolcanoconiosis';
  const chunks = P.groupChunks('Kata ini panjang: ' + longWord + ' dan itu saja.', { max: 24, target: 20 });
  assert.ok(chunks.some((chunk) => chunk.text.indexOf(longWord) >= 0),
    'kata panjang harus tetap utuh di salah satu potongan');
});

// ---------------------------------------------------------------------------------------
// (c) SINGKATAN
// ---------------------------------------------------------------------------------------
test('(c) singkatan umum tidak menjadi batas kalimat', () => {
  const cases = [
    ['Mr. Smith arrived late.', 1, 'Mr.'],
    ['Dr. Aisyah met Mrs. Lestari yesterday.', 1, 'Dr./Mrs.'],
    ['Bring a pen, e.g. a blue one, to the exam.', 1, 'e.g.'],
    ['We study grammar, i.e. sentence structure, every Monday.', 1, 'i.e.'],
    ['Bawa alat tulis, buku, dll. lalu datang pagi.', 1, 'dll.'],
    ['Bpk. Ahmad mengajar kelas itu.', 1, 'Bpk.'],
    ['J. K. Rowling wrote it.', 1, 'inisial nama'],
    ['She left. He stayed.', 2, 'dua kalimat sungguhan tetap dua']
  ];
  cases.forEach(([text, expected, label]) => {
    const sentences = P.splitSentences(text);
    assert.strictEqual(sentences.length, expected,
      label + ' -> ' + JSON.stringify(sentences));
  });
  // Dan konsekuensinya pada potongan: nama tidak boleh terbelah dari gelarnya.
  const chunks = P.groupChunks('Mr. Smith arrived late. ' + 'x'.repeat(0) + 'Dr. Aisyah agreed.', { max: 40, target: 36 });
  chunks.forEach((chunk) => {
    assert.ok(!/\b(Mr|Mrs|Dr|Bpk|dll|e\.g|i\.e)\.$/.test(chunk.text),
      'potongan tidak boleh berakhir pada singkatan: ' + chunk.text);
  });
});

// ---------------------------------------------------------------------------------------
// (d) ANGKA DESIMAL
// ---------------------------------------------------------------------------------------
test('(d) angka berpoin desimal tidak menjadi batas', () => {
  assert.deepStrictEqual(P.splitSentences('The rope is 3.5 metres long.'),
    ['The rope is 3.5 metres long.'], 'desimal tunggal');
  assert.deepStrictEqual(P.splitSentences('Versi 5.19.0 dipakai sekarang.'),
    ['Versi 5.19.0 dipakai sekarang.'], 'nomor versi bertitik ganda');
  assert.deepStrictEqual(P.splitSentences('Harganya 1.500 rupiah. Itu murah.'),
    ['Harganya 1.500 rupiah.', 'Itu murah.'], 'pemisah ribuan tetap satu kalimat');
  P.groupChunks('The rope is 3.5 metres long and it holds 12.75 kilograms.', { max: 30, target: 26 })
    .forEach((chunk) => {
      assert.ok(!/\d\.$/.test(chunk.text), 'potongan tidak boleh berakhir di tengah angka: ' + chunk.text);
      assert.ok(!/^\d+\s/.test(chunk.text) || !/\.\d/.test(chunk.text), 'desimal tidak boleh terbelah');
    });
});

// ---------------------------------------------------------------------------------------
// (e) PARAGRAF
// ---------------------------------------------------------------------------------------
test('(e) batas paragraf selalu menjadi batas potongan', () => {
  const paragraphs = P.splitParagraphs(passage.text);
  assert.strictEqual(paragraphs.length, 3, 'passage r0123 memang tiga paragraf');
  const chunks = P.groupChunks(passage.text);
  paragraphs.forEach((paragraph, index) => {
    const own = chunks.filter((chunk) => chunk.paragraphIndex === index);
    assert.ok(own.length >= 1, 'setiap paragraf harus punya potongan');
    // Tidak ada potongan yang berisi teks dari dua paragraf sekaligus.
    own.forEach((chunk) => {
      assert.ok(paragraph.indexOf(chunk.text) >= 0,
        'potongan harus berada utuh di dalam satu paragraf: ' + chunk.text.slice(0, 40));
    });
    const last = own[own.length - 1];
    assert.strictEqual(last.boundary, 'paragraph', 'potongan penutup paragraf ' + index + ' harus ditandai paragraph');
    assert.strictEqual(last.endsParagraph, true, 'endsParagraph harus benar di penutup paragraf');
  });
  assert.strictEqual(chunks.filter((chunk) => chunk.boundary === 'paragraph').length, 3,
    'tepat tiga batas paragraf, tidak lebih dan tidak kurang');
  // Dua kalimat pendek yang dipisah baris kosong TIDAK boleh digabung walaupun anggaran
  // masih longgar - itulah bedanya batas struktural dengan batas tanda baca.
  const split = P.groupChunks('Halo semua.\n\nSampai jumpa.');
  assert.strictEqual(split.length, 2, 'baris kosong memaksa potongan terpisah');
  assert.strictEqual(split[0].boundary, 'paragraph', 'paragraf pertama ditandai paragraph');
});

// ---------------------------------------------------------------------------------------
// (f) PENANDA BATAS
// ---------------------------------------------------------------------------------------
test('(f) setiap potongan punya penanda jenis batas', () => {
  const samples = [passage.text, script.script, 'Sebuah kalimat, dengan koma panjang sekali'];
  samples.forEach((sample) => {
    const chunks = P.groupChunks(sample, { max: 70, target: 60 });
    assert.ok(chunks.length > 0, 'harus ada potongan');
    chunks.forEach((chunk) => {
      assert.ok(BOUNDARIES.indexOf(chunk.boundary) >= 0, 'penanda tak dikenal: ' + chunk.boundary);
      assert.strictEqual(typeof chunk.index, 'number', 'setiap potongan tahu posisinya');
    });
  });
  // Penandanya harus BERARTI: potongan yang berakhir di tengah kalimat adalah 'comma',
  // yang berakhir pada tanda akhir kalimat adalah 'sentence' (kecuali penutup paragraf).
  const mixed = P.groupChunks('Kalimat pertama ini cukup panjang untuk dipecah, lalu ada klausa kedua. Kalimat kedua.\n\nParagraf dua.', { max: 60, target: 50 });
  mixed.forEach((chunk) => {
    if (chunk.boundary === 'comma') {
      assert.ok(!/[.!?…]$/.test(chunk.text), 'penanda comma tetapi teksnya berakhir seperti kalimat: ' + chunk.text);
    }
    if (chunk.boundary === 'sentence') {
      assert.ok(/[.!?…]["'”’)\]]*$/.test(chunk.text), 'penanda sentence harus benar-benar akhir kalimat: ' + chunk.text);
    }
  });
  assert.ok(mixed.some((chunk) => chunk.boundary === 'comma'), 'ada seam klausa yang ditandai comma');
  assert.ok(mixed.some((chunk) => chunk.boundary === 'paragraph'), 'ada batas paragraf yang ditandai paragraph');
  // Lapisan ini hanya MENANDAI. Ia tidak boleh menyisipkan keheningan sendiri: tidak ada
  // ms, tidak ada padding, hanya jenis batas.
  P.groupChunks(passage.text).forEach((chunk) => {
    assert.strictEqual(chunk.gapMs, undefined, 'pemecah teks tidak menentukan durasi jeda');
    assert.strictEqual(chunk.silence, undefined, 'pemecah teks tidak menyisipkan keheningan');
  });
});

// ---------------------------------------------------------------------------------------
// (g) JUMLAH POTONGAN TURUN PADA CONTOH NYATA
// ---------------------------------------------------------------------------------------
test('(g) jumlah potongan untuk contoh nyata TURUN dibanding strategi per-titik', () => {
  const cases = [
    { label: 'reading B1 r0123', text: passage.text, before: 13, after: 6 },
    { label: 'listening B1 listen_sc_b1_gist_007', text: script.script, before: 4, after: 2 }
  ];
  cases.forEach((item) => {
    const before = perFullStopChunks(item.text).length;
    const after = P.groupChunks(item.text).length;
    // Angka, bukan pernyataan: kalau salah satu strategi bergeser, gerbang ini gagal.
    assert.strictEqual(before, item.before, item.label + ': strategi per-titik harus tetap ' + item.before + ' potongan, terukur ' + before);
    assert.strictEqual(after, item.after, item.label + ': strategi anggaran harus ' + item.after + ' potongan, terukur ' + after);
    assert.ok(after < before, item.label + ': jumlah potongan harus turun (' + before + ' -> ' + after + ')');
    // Setiap potongan yang hilang adalah satu batas yang tidak lagi bisa menimbulkan jeda.
    assert.ok(before - after >= Math.ceil(before / 3),
      item.label + ': penurunannya harus berarti, bukan satu potongan saja (' + before + ' -> ' + after + ')');
  });
  // Jalur runtime yang sesungguhnya (normalizeText -> planBudget) harus memberi angka yang
  // sama, supaya bukti di atas bukan cuma soal fungsi prosody yang dipanggil langsung.
  const normalized = NV.normalizeText(passage.text, 3600);
  assert.ok(/\n\n/.test(normalized), 'normalizeText harus mempertahankan batas paragraf');
  const plan = NV.planBudget(normalized, { chunker: P });
  assert.strictEqual(plan.length, 6, 'rencana runtime harus 6 potongan, terukur ' + plan.length);
  plan.forEach((entry) => {
    assert.strictEqual(typeof entry.text, 'string', 'rencana runtime membawa teks');
    assert.ok(BOUNDARIES.indexOf(entry.boundary) >= 0, 'rencana runtime membawa penanda batas');
    assert.ok(entry.text.indexOf('\n') < 0, 'teks yang dikirim ke mesin tidak boleh berisi penanda paragraf');
  });
  assert.strictEqual(NV.planBudget(normalized, { chunker: null }), null,
    'tanpa chunker, jalur lama harus dipakai apa adanya - bukan gagal diam-diam');
});

// ---------------------------------------------------------------------------------------
// (h) MURNI
// ---------------------------------------------------------------------------------------
test('(h) fungsi pemecahnya murni: input sama selalu keluaran sama', () => {
  const source = passage.text + '\n\n' + script.script;
  const once = JSON.stringify(P.groupChunks(source));
  for (let i = 0; i < 5; i += 1) {
    assert.strictEqual(JSON.stringify(P.groupChunks(source)), once, 'pemanggilan ke-' + i + ' berbeda');
  }
  // Argumennya tidak boleh berubah, dan hasilnya tidak boleh membagi acuan dengan hasil lain.
  const first = P.groupChunks(source);
  first[0].text = 'MUTATED';
  assert.notStrictEqual(P.groupChunks(source)[0].text, 'MUTATED', 'hasil tidak boleh dibagikan antar pemanggilan');
  // Tanpa jaringan dan tanpa DOM: berkasnya sendiri tidak menyebut satupun.
  const src = fs.readFileSync(path.join(ROOT, 'features/neural-voice/fiezel-prosody.js'), 'utf8');
  const chunkerSource = src.slice(src.indexOf('CHARACTER-BUDGET CHUNKER'), src.indexOf('/** Silence that should follow a unit'));
  ['fetch(', 'XMLHttpRequest', 'document.', 'window.', 'localStorage', 'Date.now', 'Math.random', 'setTimeout']
    .forEach((forbidden) => {
      assert.ok(chunkerSource.indexOf(forbidden) < 0, 'pemecah harus murni, ditemukan ' + forbidden);
    });
  // Masukan kosong dan aneh tidak boleh melempar.
  [undefined, null, '', '   ', '\n\n\n', '...', '3.5'].forEach((weird) => {
    assert.ok(Array.isArray(P.groupChunks(weird)), 'masukan ' + JSON.stringify(weird) + ' harus mengembalikan array');
  });
  assert.deepStrictEqual(P.groupChunks(''), [], 'teks kosong tidak menghasilkan potongan');
});

// ---------------------------------------------------------------------------------------
// (i) API TEKS UTUH: potongan HARUS lebih sedikit daripada jumlah kalimat
//
// Audit V1 dengan mesin asli (supertonic-3) mengukur jeda produksi rata-rata 4.422 ms, dan
// 647 ms bila SELURUH teks dikirim dalam satu speak(). Sebabnya: pemanggil mengirim satu
// kalimat per panggilan, sehingga chunks.length === 1 dan seluruh mesin gapless mati
// (`joined = chunks.length > 1` di fiezel-neural-voice.js). Jadi pengelompokan ini hanya
// berdampak kalau pemecah menerima teks UTUH - dan itulah kontrak planUtterance().
// ---------------------------------------------------------------------------------------
test('(i) satu panggilan teks utuh: potongan lebih sedikit daripada jumlah kalimat', () => {
  const cases = [
    { label: 'reading B1 r0123', text: passage.text, sentences: 13, chunks: 6, paragraphs: 3 },
    { label: 'listening B1 listen_sc_b1_gist_007', text: script.script, sentences: 4, chunks: 2, paragraphs: 1 }
  ];
  cases.forEach((item) => {
    const plan = P.planUtterance(item.text);
    const stats = plan.stats;
    // Angka, bukan pernyataan.
    assert.strictEqual(stats.sentences, item.sentences, item.label + ': jumlah kalimat harus ' + item.sentences + ', terukur ' + stats.sentences);
    assert.strictEqual(stats.chunks, item.chunks, item.label + ': jumlah potongan harus ' + item.chunks + ', terukur ' + stats.chunks);
    assert.strictEqual(stats.paragraphs, item.paragraphs, item.label + ': jumlah paragraf harus ' + item.paragraphs);
    assert.ok(stats.chunks < stats.sentences,
      item.label + ': potongan (' + stats.chunks + ') harus lebih sedikit daripada kalimat (' + stats.sentences + ')');
    assert.strictEqual(stats.boundariesRemoved, item.sentences - item.chunks,
      item.label + ': batas yang hilang harus ' + (item.sentences - item.chunks));
    assert.strictEqual(stats.chunks, plan.chunks.length, 'stats harus cocok dengan daftar potongannya');
    assert.strictEqual(stats.boundaries.length, plan.chunks.length, 'setiap potongan punya satu penanda batas');
    assert.ok(stats.maxChars <= MAX, 'stats.maxChars harus di bawah ambang');
    // Teks utuh masuk, daftar potongan berurutan keluar: tidak ada kata yang hilang dan
    // tidak ada potongan yang tertukar urutannya.
    assert.deepStrictEqual(words(plan.chunks.map((chunk) => chunk.text).join(' ')),
      words(item.text.replace(/\s+/g, ' ')), item.label + ': teks utuh harus terjaga');
    plan.chunks.forEach((chunk, at) => assert.strictEqual(chunk.index, at, 'urutan potongan harus stabil'));
  });
  // Satu panggilan untuk gabungan passage + skrip tetap satu rencana berurutan, yaitu
  // bentuk yang membuat satu speak() bisa menggantikan belasan panggilan per kalimat.
  const combined = P.planUtterance(passage.text + '\n\n' + script.script);
  assert.strictEqual(combined.stats.paragraphs, 4, 'gabungan harus empat paragraf');
  assert.ok(combined.stats.chunks < combined.stats.sentences,
    'gabungan: ' + combined.stats.chunks + ' potongan untuk ' + combined.stats.sentences + ' kalimat');
});

// ---------------------------------------------------------------------------------------
// (j) PENANDA PARAGRAF TEPAT DI TEMPAT PARAGRAF BERGANTI
// ---------------------------------------------------------------------------------------
test('(j) penanda paragraph muncul tepat di tempat paragraf berganti', () => {
  const source = passage.text + '\n\n' + script.script;
  const paragraphs = P.splitParagraphs(source);
  const chunks = P.groupChunks(source);
  const marked = chunks.filter((chunk) => chunk.boundary === 'paragraph').map((chunk) => chunk.index);
  const expected = paragraphs.map((_, index) => {
    const own = chunks.filter((chunk) => chunk.paragraphIndex === index);
    return own[own.length - 1].index;
  });
  assert.deepStrictEqual(marked, expected,
    'penanda paragraph harus di indeks ' + JSON.stringify(expected) + ', terukur ' + JSON.stringify(marked));
  assert.strictEqual(marked.length, paragraphs.length, 'tepat satu penanda paragraph per paragraf');
  // Penandanya harus berakhir pada kalimat penutup paragraf yang sesungguhnya.
  paragraphs.forEach((paragraph, index) => {
    const sentences = P.splitSentences(paragraph);
    const closing = sentences[sentences.length - 1];
    const chunk = chunks[expected[index]];
    assert.ok(chunk.text.endsWith(closing) || closing.endsWith(chunk.text),
      'paragraf ' + index + ': potongan bertanda paragraph harus berakhir pada kalimat penutupnya');
  });
  // Tidak ada penanda paragraph di tengah paragraf.
  chunks.forEach((chunk) => {
    if (chunk.boundary !== 'paragraph') return;
    const next = chunks[chunk.index + 1];
    assert.ok(!next || next.paragraphIndex === chunk.paragraphIndex + 1,
      'sesudah penanda paragraph harus paragraf berikutnya, bukan lanjutan paragraf yang sama');
  });
});

// ---------------------------------------------------------------------------------------
// (k) LAYANAN SUARA MENERIMA TEKS UTUH LEWAT SATU PANGGILAN
//
// Ini yang membuat mesin gapless hidup: chunks.length > 1 dalam SATU speak().
// ---------------------------------------------------------------------------------------
test('(k) layanan suara: satu rencana untuk teks utuh, bukan satu potongan per kalimat', () => {
  const service = NV.createVoiceService({
    prosody: P,
    streamSentences: true,
    adapter: { generate: async () => ({}) },
    player: { play: async () => ({}) }
  });
  const plan = service.planUtterance(passage.text);
  assert.strictEqual(plan.stats.strategy, 'character-budget-v3', 'strategi harus anggaran karakter');
  assert.strictEqual(plan.stats.chunks, 6, 'passage r0123 harus 6 potongan, terukur ' + plan.stats.chunks);
  assert.strictEqual(plan.stats.sentences, 13, 'passage r0123 punya 13 kalimat');
  assert.strictEqual(plan.stats.boundariesRemoved, 7, '7 batas hilang dibanding satu kalimat per panggilan');
  assert.ok(plan.stats.chunks > 1,
    'chunks.length harus > 1 supaya `joined` benar dan penjadwalan berkelanjutan aktif');
  plan.chunks.forEach((chunk) => {
    assert.ok(chunk.text.length <= MAX, 'potongan layanan tidak boleh melebihi ambang');
    assert.ok(['comma', 'sentence', 'paragraph'].includes(chunk.boundary), 'penanda batas harus sah');
  });
  // Murni juga di tingkat layanan: dua panggilan, hasil sama.
  assert.deepStrictEqual(service.planUtterance(passage.text).chunks, plan.chunks,
    'planUtterance di tingkat layanan harus deterministik');
});

console.log('\nFIEZEL voice chunker: PASS ' + pass + '/11 pemeriksaan');
