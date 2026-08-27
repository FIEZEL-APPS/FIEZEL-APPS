// V4 — gerbang bentuk jawaban Workers AI + kontrak mutu keluaran
// (workers/api/ai/ai-tasks.js + workers/api/ai/route-ai.js).
//
// KENAPA GERBANG INI ADA. Semua yang diuji di bawah berasal dari pengujian langsung ke Workers AI,
// bukan dari dugaan, dan tiga temuannya semuanya BERBENTUK HIJAU DI JALUR LAMA — artinya kode lama
// menganggapnya sukses:
//
//   1. DUA BENTUK JAWABAN. `@cf/meta/llama-*` mengembalikan `result.response`; `granite-4.0-h-micro`,
//      `gemma-*`, dan `gemma-sea-lion-v4-27b-it` mengembalikan bentuk OpenAI
//      (`result.choices[0].message.content`). Kode yang membaca satu bentuk saja mengembalikan
//      STRING KOSONG SECARA SENYAP: murid melihat kotak jawaban kosong (bukan galat), owner tetap
//      dibayari token, dan monitoring melihat 200 OK. Karena itu di sini "kosong" wajib menjadi
//      KEGAGALAN yang jatuh ke fallback deterministik.
//
//   2. MODEL YANG MEMBAKAR KELUARAN DI REASONING. `@cf/google/gemma-4-26b-a4b-it` mengembalikan
//      `message.content` KOSONG dengan `finish_reason:"length"` sementara seluruh anggaran token
//      habis di `message.reasoning_content`. Itu punya nama sendiri di kode (`reasoning_overflow`)
//      supaya bisa dibedakan dari model yang benar-benar mati — dan isi reasoning TIDAK PERNAH
//      boleh sampai ke murid.
//
//   3. BATAS KALIMAT TIDAK DITAATI HANYA KARENA DIMINTA. `llama-3.1-8b-instruct-fp8` mengeluarkan
//      7-8 kalimat dari maksimal 6. Karena itu batas kalimat, kanon kata FIEZEL ("nggak", bukan
//      "tidak"), dan "tidak kosong" ditegakkan sesudah jawaban datang — kontrak, bukan harapan.
//
// Node murni, nol jaringan. Stub Worker datang dari tools/cf-test-harness.js (`makeEnv`/`fakeAI`)
// supaya gerbang ini tidak menumbuhkan stub keduanya sendiri yang bisa menyimpang.
'use strict';

const fs = require('fs');
const path = require('path');
const harness = require('./tools/cf-test-harness.js');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

const AiTasks = require(path.join(root, 'workers/api/ai/ai-tasks.js'));
const RouteAi = require(path.join(root, 'workers/api/ai/route-ai.js'));

const VALID_INPUT = {
  tutor_turn: { question: 'Apa beda "in" dan "on"?', surface: 'ask', level: 'A2', focusLabel: 'Preposisi tempat' },
  writing_feedback: { text: 'I go to school every day. My teacher is kind.', promptId: 'wp_01', level: 'A2', rubricId: 'rubric_a2' },
  context_coach: {
    snapshot: { attempts: 12, accuracy: 0.42 }, evidence: { sessions: 3 }, policy: { id: 'p1' },
    outcomes: ['slow'], profile: { level: 'A2' }, privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false }
  },
  translate_subtitle: { en: 'It is raining and I am at the school gate.', bankVersion: 'v2' },
  session_recap: { level: 'A2', bankVersion: 'v2', weakSkills: ['past simple', 'prepositions'], missedItemIds: ['q1'] }
};

const req = (task, input, extra) => ({ schema: 'fiezel-ai-task-v2', task, input: input || VALID_INPUT[task], locale: 'id', ...(extra || {}) });

// Teks yang SENGAJA lulus kontrak: 3 kalimat, memakai "nggak", tanpa "tidak".
const GOOD_TEXT = 'Bedanya ada di ruang yang kamu maksud. Pakai "in" buat ruang tertutup, "on" buat permukaan. Kalau masih ragu, kamu nggak perlu hafal, cukup bayangin tempatnya.';
const REASONING_TEXT = 'Let me think step by step about prepositions: first I consider LOKASI RAHASIA MODEL, then...';

/**
 * Satu pemanggil handler untuk semua kasus. `answers` memetakan model → jawaban mentah, jadi
 * bentuk jawaban yang diuji adalah bentuk yang benar-benar dikembalikan model itu.
 */
async function run(task, rawAnswer, extraDeps) {
  const answers = {};
  const modelId = AiTasks.pickModel(task, {}).id;
  answers[modelId] = typeof rawAnswer === 'function' ? rawAnswer : () => rawAnswer;
  const built = harness.makeEnv({ ai: { answers } });
  const request = new Request('https://api.fiezel.my.id/api/ai/task', {
    method: 'POST', body: JSON.stringify(req(task)), headers: { 'content-type': 'application/json' }
  });
  const response = await RouteAi.handleAiTask({
    request, env: built.env, ctx: built.ctx, deps: extraDeps || {}
  });
  return { status: response.status, body: await response.json(), ai: built.ai, model: modelId };
}

const F = AiTasks.OUTPUT_FAILURES;

(async () => {
  // --- 1. DUA BENTUK JAWABAN TERBACA ---------------------------------------------------
  {
    const llama = AiTasks.readModelText({ response: 'jawaban bentuk llama' });
    check('Bentuk llama (`result.response`) terbaca',
      llama.text === 'jawaban bentuk llama' && llama.shape === 'llama', JSON.stringify(llama));

    const openai = AiTasks.readModelText({
      choices: [{ message: { role: 'assistant', content: 'jawaban bentuk OpenAI' }, finish_reason: 'stop' }]
    });
    check('Bentuk OpenAI (`choices[0].message.content`) terbaca',
      openai.text === 'jawaban bentuk OpenAI' && openai.shape === 'openai' && openai.finishReason === 'stop',
      JSON.stringify(openai));

    check('Pembungkus `result.result.response` tetap terbaca (bukan kosong senyap)',
      AiTasks.readModelText({ result: { response: 'terbungkus' } }).text === 'terbungkus',
      AiTasks.readModelText({ result: { response: 'terbungkus' } }).text);

    // Model yang benar-benar diukur hari ini, dengan bentuk jawabannya masing-masing.
    const shapeOf = {
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast': 'llama',
      '@cf/meta/llama-3.1-8b-instruct-fp8': 'llama',
      '@cf/ibm-granite/granite-4.0-h-micro': 'openai',
      '@cf/aisingapore/gemma-sea-lion-v4-27b-it': 'openai',
      '@cf/google/gemma-4-26b-a4b-it': 'openai'
    };
    const declared = ['cheap', 'standard', 'reasoning', 'candidate', 'rejected']
      .map((k) => AiTasks.MODELS[k])
      .every((m) => shapeOf[m.id] === m.responseShape);
    check('Bentuk jawaban tiap model terukur dicatat di registry, bukan ditebak runtime',
      declared, Object.keys(shapeOf).map((id) => `${id}=${shapeOf[id]}`).join(' '));

    const okOpenAi = await run('translate_subtitle', {
      choices: [{ message: { content: 'Hujan turun dan aku ada di gerbang sekolah.' }, finish_reason: 'stop' }]
    });
    check('Handler menerima jawaban bentuk OpenAI sebagai jawaban provider yang sah',
      okOpenAi.status === 200 && okOpenAi.body.source === 'provider' && okOpenAi.body.degraded === false &&
      /gerbang sekolah/.test(okOpenAi.body.text),
      `${okOpenAi.body.source} ${okOpenAi.body.text}`);

    const okLlama = await run('tutor_turn', { response: GOOD_TEXT });
    check('Handler menerima jawaban bentuk llama sebagai jawaban provider yang sah',
      okLlama.status === 200 && okLlama.body.source === 'provider' && okLlama.body.degraded === false &&
      okLlama.body.text === GOOD_TEXT,
      `${okLlama.body.source} (${AiTasks.countSentences(okLlama.body.text)} kalimat)`);
  }

  // --- 2. reasoning_overflow ------------------------------------------------------------
  {
    const read = AiTasks.readModelText({
      choices: [{ message: { content: '', reasoning_content: REASONING_TEXT }, finish_reason: 'length' }]
    });
    check('content kosong + reasoning_content terisi ⇒ classifyModelFailure = reasoning_overflow',
      AiTasks.classifyModelFailure(read) === F.reasoningOverflow && F.reasoningOverflow === 'reasoning_overflow',
      AiTasks.classifyModelFailure(read));
    check('finish_reason:"length" ikut terbaca supaya sebabnya bisa dibedakan',
      read.finishReason === 'length' && read.reasoning === REASONING_TEXT, read.finishReason);

    const overflow = await run('tutor_turn', {
      choices: [{ message: { content: '', reasoning_content: REASONING_TEXT }, finish_reason: 'length' }]
    });
    check('reasoning_overflow ⇒ 200 + degraded + fallback deterministik (bukan sukses)',
      overflow.status === 200 && overflow.body.degraded === true &&
      overflow.body.source === 'deterministic-fallback' && overflow.body.text.length > 30,
      `${overflow.status} ${overflow.body.source}`);
    check('Sebab spesifik reasoning_overflow DICATAT, bukan disamakan dengan "AI mati"',
      overflow.body.reason === F.reasoningOverflow, String(overflow.body.reason));
    check('Isi reasoning TIDAK PERNAH muncul di respons ke klien',
      !JSON.stringify(overflow.body).includes('LOKASI RAHASIA MODEL') &&
      !JSON.stringify(overflow.body).includes('step by step'),
      JSON.stringify(overflow.body.text).slice(0, 60));

    // Bahkan ketika model mengirim keduanya, yang tampil hanya `content`.
    const both = await run('tutor_turn', {
      choices: [{ message: { content: GOOD_TEXT, reasoning_content: REASONING_TEXT }, finish_reason: 'stop' }]
    });
    check('Jawaban sah + reasoning: hanya content yang ditampilkan, reasoning dibuang',
      both.body.source === 'provider' && both.body.text === GOOD_TEXT &&
      !JSON.stringify(both.body).includes('LOKASI RAHASIA MODEL'),
      both.body.text.slice(0, 40));
  }

  // --- 3. JAWABAN KOSONG TIDAK PERNAH LOLOS SEBAGAI SUKSES -------------------------------
  {
    const emptyShapes = [
      ['bentuk llama kosong', { response: '' }],
      ['bentuk OpenAI kosong', { choices: [{ message: { content: '' }, finish_reason: 'stop' }] }],
      ['hanya spasi', { response: '   \n  ' }],
      ['objek tanpa field yang dikenal', { id: 'x', usage: { prompt_tokens: 4 } }],
      ['null', null]
    ];
    for (const [label, raw] of emptyShapes) {
      const res = await run('tutor_turn', raw);
      check(`Jawaban kosong (${label}) ⇒ KEGAGALAN, bukan sukses`,
        res.status === 200 && res.body.degraded === true && res.body.source === 'deterministic-fallback' &&
        res.body.source !== 'provider' && res.body.text.length > 30,
        `${res.body.source} reason=${res.body.reason}`);
      check(`Jawaban kosong (${label}) ⇒ sebab dicatat sebagai ${F.empty} atau ${F.reasoningOverflow}`,
        res.body.reason === F.empty || res.body.reason === F.reasoningOverflow, String(res.body.reason));
    }

    check('classifyModelFailure: kosong tanpa reasoning ⇒ empty_output',
      AiTasks.classifyModelFailure(AiTasks.readModelText({ response: '' })) === F.empty,
      AiTasks.classifyModelFailure(AiTasks.readModelText({ response: '' })));
    check('checkOutputContract menolak string kosong untuk setiap task',
      AiTasks.list().every((t) => AiTasks.checkOutputContract(t, '   ').reason === F.empty), 'kosong = gagal');
  }

  // --- 4. BATAS KALIMAT DITEGAKKAN, BUKAN DIHARAPKAN -------------------------------------
  {
    check('countSentences tidak tertipu daftar bernomor',
      AiTasks.countSentences('1. past simple 2. prepositions') <= 1 &&
      AiTasks.countSentences('Satu kalimat. Dua kalimat.') === 2,
      `${AiTasks.countSentences('1. past simple 2. prepositions')} / ${AiTasks.countSentences('Satu kalimat. Dua kalimat.')}`);

    const limit = AiTasks.sentenceLimitFor('tutor_turn');
    const tooMany = Array.from({ length: limit + 2 }, (_, i) => `Ini kalimat nomor ${i + 1} yang panjangnya wajar.`).join(' ');
    const rejected = await run('tutor_turn', { response: tooMany });
    check(`Jawaban ${limit + 2} kalimat melebihi batas ${limit} ⇒ DITOLAK, fallback dipakai`,
      rejected.status === 200 && rejected.body.degraded === true &&
      rejected.body.source === 'deterministic-fallback' && rejected.body.reason === F.sentenceLimit &&
      !rejected.body.text.includes('kalimat nomor 7'),
      `${rejected.body.reason} (${AiTasks.countSentences(tooMany)} kalimat)`);

    const atLimit = Array.from({ length: limit }, (_, i) => `Ini kalimat nomor ${i + 1} yang nggak panjang.`).join(' ');
    const accepted = await run('tutor_turn', { response: atLimit });
    check(`Jawaban tepat ${limit} kalimat DITERIMA (batas adalah batas, bukan tebakan)`,
      accepted.body.source === 'provider' && accepted.body.degraded === false,
      `${accepted.body.source} (${AiTasks.countSentences(atLimit)} kalimat)`);

    // Ini bentuk kegagalan llama-3.1-8b yang terukur hari ini: 7-8 kalimat dari maksimal 6.
    check('Pola pelanggaran terukur llama-3.1-8b (7-8 kalimat) tertangkap pemeriksa',
      [7, 8].every((n) => AiTasks.checkOutputContract('tutor_turn',
        Array.from({ length: n }, (_, i) => `Kalimat ${i + 1} soal aturan ini.`).join(' ')).reason === F.sentenceLimit),
      'batas 6 ditegakkan');

    check('Task tanpa batas (0) tidak ditolak karena panjang',
      AiTasks.checkOutputContract('translate_subtitle',
        Array.from({ length: 12 }, (_, i) => `Baris ${i + 1} terjemahan.`).join(' ')).ok === true,
      'translate_subtitle mengikuti kalimat asli');
  }

  // --- 5. KANON KATA FIEZEL: "nggak", BUKAN "tidak" --------------------------------------
  {
    const banned = await run('context_coach', { response: 'Hari ini kamu tidak perlu menambah sesi baru.' });
    check('Jawaban memuat "tidak" pada task naskah ⇒ DITOLAK dengan sebab banned_word',
      banned.body.source === 'deterministic-fallback' && banned.body.degraded === true &&
      banned.body.reason === `${F.bannedWord}:tidak`,
      String(banned.body.reason));
    check('Jawaban yang ditolak tidak pernah bocor ke murid',
      !banned.body.text.includes('tidak perlu menambah sesi baru'), banned.body.text.slice(0, 50));

    check('Kata dicocokkan sebagai kata utuh, bukan potongan',
      AiTasks.bannedWordsIn('Pertidaksamaan itu materi matematika.').length === 0 &&
      AiTasks.bannedWordsIn('Ini tidak benar.').length === 1,
      JSON.stringify(AiTasks.bannedWordsIn('Ini tidak benar.')));

    const subtitle = await run('translate_subtitle', {
      choices: [{ message: { content: 'Aku tidak tahu jawabannya.' }, finish_reason: 'stop' }]
    });
    check('Terjemahan subtitle sengaja DI LUAR pemeriksaan kanon kata (terjemahan verbatim)',
      subtitle.body.source === 'provider' && subtitle.body.degraded === false &&
      AiTasks.OUTPUT_CONTRACT.styleCheckedTasks.indexOf('translate_subtitle') === -1,
      subtitle.body.text);

    check('Batas kalimat dan daftar kata bisa disetel di SATU tempat',
      Object.isFrozen(AiTasks.OUTPUT_CONTRACT) &&
      AiTasks.OUTPUT_CONTRACT.bannedWords.join(',') === 'tidak' &&
      Object.keys(AiTasks.OUTPUT_CONTRACT.sentenceLimits).sort().join(',') === AiTasks.list().sort().join(','),
      JSON.stringify(AiTasks.OUTPUT_CONTRACT.sentenceLimits));
  }

  // --- 6. SEBAB DICATAT, DAN BREAKER TIDAK DIBUKA OLEH SOAL MUTU ------------------------
  {
    const seen = [];
    const quality = await run('tutor_turn', { response: 'Ini jawaban yang tidak boleh tampil.' },
      { recordFailure: (row) => seen.push(row) });
    check('Penolakan mutu dicatat server-side dengan sebabnya',
      seen.length === 1 && seen[0].reason === `${F.bannedWord}:tidak` && seen[0].task === 'tutor_turn',
      JSON.stringify(seen[0] || null));
    // Provider yang MENJAWAB tidak boleh mematikan AI untuk semua murid hanya karena satu
    // jawaban tidak layak tampil; itu sebabnya penolakan mutu tidak dihitung breaker.
    check('Penolakan mutu TIDAK dihitung kegagalan breaker (breaker tetap CLOSED)',
      seen[0] && seen[0].breakerCounted === false && quality.body.breaker === 'CLOSED',
      `${quality.body.breaker} breakerCounted=${seen[0] && seen[0].breakerCounted}`);

    const seenEmpty = [];
    const empty = await run('tutor_turn', { choices: [{ message: { content: '', reasoning_content: REASONING_TEXT } }] },
      { recordFailure: (row) => seenEmpty.push(row) });
    check('reasoning_overflow DIHITUNG kegagalan breaker (badan kosong = model gagal)',
      seenEmpty.length === 1 && seenEmpty[0].reason === F.reasoningOverflow && seenEmpty[0].breakerCounted === true,
      JSON.stringify(seenEmpty[0] || null));
    check('Sebab yang dikirim ke klien memakai kosakata kami, tanpa nama model/akun',
      !/@cf\//.test(JSON.stringify(empty.body)) && !/@cf\//.test(JSON.stringify(quality.body)),
      String(empty.body.reason));
    check('Penolakan mutu tetap memberi murid jawaban (fallback terisi, bukan layar kosong)',
      quality.body.text === AiTasks.fallbackFor('tutor_turn', VALID_INPUT.tutor_turn) && quality.body.text.length > 30,
      quality.body.text.slice(0, 45));
  }

  // --- 7. REGISTRY: GRANITE BUKAN UNTUK TUGAS ANALISA ----------------------------------
  {
    const granite = AiTasks.MODELS.cheap.id;
    check('Granite tetap model termurah yang diukur (US$0,017/M) dan ditandai tidak dipercaya',
      granite === '@cf/ibm-granite/granite-4.0-h-micro' &&
      AiTasks.MODELS.cheap.priceInPerMillionUsd === 0.017 &&
      AiTasks.MODELS.cheap.pedagogicallyTrusted === false,
      `${granite} ${AiTasks.MODELS.cheap.priceInPerMillionUsd}`);
    check('Registry TIDAK memakai granite untuk tugas analisa (model maupun tier degradasi)',
      AiTasks.TRUTH_TASKS.length >= 3 &&
      AiTasks.TRUTH_TASKS.every((t) => AiTasks.modelsUsedBy(t).every((m) => m.id !== granite)),
      AiTasks.TRUTH_TASKS.map((t) => `${t}:${AiTasks.modelsUsedBy(t).map((m) => m.id).join('+')}`).join(' '));
    check('Model tugas analisa adalah satu-satunya yang lulus benchmark (llama-3.3-70b)',
      AiTasks.TRUTH_TASKS.every((t) => AiTasks.get(t).model.pedagogicallyTrusted === true &&
        AiTasks.get(t).model.id === '@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
      AiTasks.TRUTH_TASKS.map((t) => AiTasks.get(t).model.id).join(','));
    check('sea-lion disebut kandidat yang butuh uji lanjutan, bukan dipakai diam-diam',
      /uji lanjutan/i.test(AiTasks.MODELS.candidate.reason) &&
      /nggak salah banget sih/.test(AiTasks.MODELS.candidate.reason) &&
      AiTasks.MODELS.candidate.usedByTasks === false,
      AiTasks.MODELS.candidate.id);
    check('gemma-4-26b (sumber reasoning_overflow) tidak dirujuk task mana pun',
      AiTasks.list().every((t) => AiTasks.modelsUsedBy(t).every((m) => m.id !== AiTasks.MODELS.rejected.id)),
      AiTasks.MODELS.rejected.id);
  }

  // --- 8. PEMBACAAN BENTUK JAWABAN HIDUP DI SATU TEMPAT --------------------------------
  {
    const srcRouteRaw = fs.readFileSync(path.join(root, 'workers/api/ai/route-ai.js'), 'utf8');
    // Komentar dibuang sebelum diperiksa: berkas itu MENJELASKAN kedua bentuk jawaban dalam prosa
    // (`choices[0].message.content`), dan menyebut bentuknya di penjelasan bukan menyalin logikanya.
    const srcRoute = srcRouteRaw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
    check('route-ai.js membaca jawaban lewat AiTasks.readModelText (bukan salinan logika sendiri)',
      /AiTasks\.readModelText\(/.test(srcRoute) && !/message\.content/.test(srcRoute) && !/choices\[0\]/.test(srcRoute),
      'satu pembaca bentuk');
    check('route-ai.js menegakkan kontrak keluaran sesudah jawaban datang',
      /AiTasks\.checkOutputContract\(/.test(srcRoute) && /AiTasks\.classifyModelFailure\(/.test(srcRoute),
      'pemeriksa pasca-jawaban terpasang');
    check('route-ai.js tidak pernah menyalin reasoning ke teks jawaban',
      !/reasoning[^\n]*\btext\s*=/.test(srcRoute) && /read\.text/.test(srcRoute), 'reasoning hanya untuk klasifikasi');
    check('Ambang/daftar kata tidak diketik ulang di route-ai.js',
      !/'tidak'/.test(srcRoute) && !/maxSentences\s*[:=]\s*\d/.test(srcRoute), 'satu sumber konstanta');
  }

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'ai-response-shape-test',
    evidence: 'pengujian langsung Workers AI 2026-08-27 (reports/voice-v4-aifix.md)',
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    checks
  };
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
