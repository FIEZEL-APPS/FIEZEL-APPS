// A1 — gerbang RENCANA pra-render: angka, dua harga model, frasa berisiko, override per-item.
//
// Berkas ini node murni dan NOL JARINGAN. Ia melengkapi `prerender-dryrun-test.js` (yang menjaga
// bentuk pipeline dan workflow) dengan hal yang paling mudah bergeser tanpa suara: ARITMETIKANYA.
//
// Tiga kekeliruan nyata yang gerbang ini ada untuk mencegahnya terulang:
//
//   1. ANGKA KORPUS LAMA. Draf cf-b4/cf-a10 memakai 591.898 karakter; angka kanonik adalah
//      604.962 (cf-c1 §K1). Selisih 13.064 karakter itu kecil di layar dan bukan apa-apa dalam
//      dolar (US$0,20), tetapi ia menular: setiap laporan yang mengutipnya menjadi salah, dan
//      keputusan "bayar sekali" ditandatangani di atas anggaran yang bukan anggarannya. Sesudah
//      dedup kunci v2, yang benar-benar akan dibayar pada jalan pertama adalah 5.657 objek unik
//      / 286.851 karakter — juga dipaku di sini, karena itulah bilangan yang muncul di tagihan.
//
//   2. SATU HARGA DIPAKAI UNTUK DUA MODEL. aura-1 US$0,015 per 1.000 karakter, aura-2-en
//      US$0,030 — persis dua kali. Skrip yang menghitung anggaran dengan tarif bawaan sementara
//      sebagian item dipindah ke aura-2-en akan melewati batas anggaran tanpa satu pun
//      peringatan, dan justru pada jalan yang dijalankan owner karena ia MEMILIH model yang
//      lebih akurat.
//
//   3. "On balance" TERDENGAR "Unbalanced". Ini bukan cacat kosmetik. aura-1 melebur frasa itu
//      sampai Whisper menuliskannya sebagai satu kata dengan arti BERLAWANAN, dan frasa itu
//      adalah awalan puluhan stem soal C1 di reading-bank.json. Soal yang menanyakan "secara
//      keseluruhan, klaim mana yang dibela penulis" terdengar sebagai soal tentang sesuatu yang
//      "tidak seimbang". aura-2-en membacanya benar (WER 0,018 vs 0,038). Karena itu daftar frasa
//      berisiko wajib tidak kosong, wajib memuat frasa itu, dan mekanisme override per-item wajib
//      benar-benar mengubah model DAN harga item — bukan hanya mencatat niat di komentar.
//
// Jaring jaringan dipasang sebelum modul diimpor, sama seperti gerbang dry-run: satu permintaan
// HTTP pada jalur rencana membuat gerbang ini merah, karena "dry-run" yang bisa memanggil
// jaringan adalah tagihan yang menyebut dirinya rencana.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

const netCalls = [];
const trap = (label) => (...args) => {
  netCalls.push(`${label} ${String(args[0]).slice(0, 120)}`);
  throw new Error(`prerender-plan menyentuh jaringan: ${label}`);
};
// HANYA `fetch` yang dijerat di sini, dan itu keputusan sadar, bukan kelalaian: `no-network-test.js`
// menolak gerbang non-allowlist yang me-`require` modul socket (http/https/net/dns) dan menjaga
// daftar "jerat saja"-nya tetap SATU nama (`prerender-dryrun-test.js`, yang sudah memasang jerat
// http/https untuk modul yang sama). Menambah nama kedua ke daftar itu akan melemahkan gerbang
// no-network demi kenyamanan gerbang ini. Sebagai gantinya lapis kedua dipasang sebagai
// pemeriksaan teks di bawah: skrip pra-render dilarang memuat http/https/net/dns sama sekali,
// sehingga satu-satunya pintu jaringannya memang `fetch` yang dijerat di baris ini.
globalThis.fetch = trap('fetch');

const near = (got, want, tolerance) => Math.abs(got - want) / want <= tolerance;

(async () => {
  const mod = await import('./tools/prerender-tts.mjs');
  const TtsKey = require(path.join(root, 'workers/api/tts/tts-key.js'));
  const src = fs.readFileSync(path.join(root, 'tools/prerender-tts.mjs'), 'utf8');

  const census = mod.censusCorpus({ content: 'all' });
  const plan = mod.buildPlan({ content: 'all' });

  // --- 1. KORPUS 604.962 dan 5.657 OBJEK UNIK ------------------------------------------
  check('Korpus terukur dari bank = 604.962 karakter ±1%',
    near(census.totalChars, 604962, 0.01),
    `${census.totalChars} karakter (selisih ${(Math.abs(census.totalChars - 604962) / 604962 * 100).toFixed(3)}%)`);
  check('Angka lama 591.898 tidak dipakai di mana pun (konstanta maupun hasil hitung)',
    census.totalChars !== 591898 && mod.CANONICAL.totalChars !== 591898 && !src.includes('591898'),
    'cf-c1 §K1 yang berlaku');
  check('Objek unik yang belum ada di R2 = 5.657 ±1%',
    near(plan.pending.length, 5657, 0.01), `${plan.pending.length} objek`);
  check('Karakter yang akan dibayar = 286.851 ±1%',
    near(plan.plannedChars, 286851, 0.01), `${plan.plannedChars} karakter`);
  check('Dedup nyata: baris bank > objek unik, dan sisanya dihitung sebagai duplikat',
    plan.rows > plan.uniqueKeys && plan.duplicates === plan.rows - plan.uniqueKeys && plan.duplicates > 0,
    `${plan.rows} baris ⇒ ${plan.uniqueKeys} objek (${plan.duplicates} duplikat)`);
  check('Konstanta dedup dipaku sesuai ukuran nyata (5.657 / 286.851)',
    mod.CANONICAL.uniqueObjectsPending === 5657 && mod.CANONICAL.pendingChars === 286851,
    `${mod.CANONICAL.uniqueObjectsPending} objek / ${mod.CANONICAL.pendingChars} karakter`);

  // --- 2. BIAYA aura-1 UNTUK MASUKAN CONTOH --------------------------------------------
  // Aritmetika diperiksa pada masukan yang bisa dihitung tangan, bukan hanya pada korpus penuh:
  // kalau rumusnya salah bagi 1.000 atau memakai tarif yang salah, contoh kecil ini yang
  // menunjukkannya dengan jelas.
  const aura1 = mod.MODELS['@cf/deepgram/aura-1'];
  const aura2 = mod.MODELS['@cf/deepgram/aura-2-en'];
  check('Tarif aura-1 = US$0,015 per 1.000 karakter (harga API Cloudflare)',
    aura1.usdPer1kChars === 0.015, String(aura1.usdPer1kChars));
  check('Tarif aura-2-en = US$0,030 per 1.000 karakter (tepat dua kali aura-1)',
    aura2.usdPer1kChars === 0.030 && aura2.usdPer1kChars === aura1.usdPer1kChars * 2,
    String(aura2.usdPer1kChars));
  const samples = [
    [84, 0.00126],       // uji nyata 84 karakter
    [1000, 0.015],       // satu unit harga
    [286851, 4.302765],  // batch pertama
    [604962, 9.07443]    // seluruh korpus
  ];
  for (const [chars, want] of samples) {
    const got = (chars / 1000) * aura1.usdPer1kChars;
    check(`Biaya aura-1 untuk ${chars} karakter = US$${want}`,
      Math.abs(got - want) < 1e-9, `US$${got}`);
  }
  check('Biaya korpus di aura-1 ≈US$9,07 dan di aura-2-en ≈US$18,15, keduanya dilaporkan',
    Math.abs(census.costByModel[aura1.id] - 9.07) < 0.05 &&
    Math.abs(census.costByModel[aura2.id] - 18.15) < 0.05,
    `US$${census.costByModel[aura1.id].toFixed(2)} / US$${census.costByModel[aura2.id].toFixed(2)}`);
  check('Batch pertama: US$4,30 di aura-1, US$8,61 di aura-2-en',
    Math.abs(plan.plannedCostAllAura1Usd - 4.30) < 0.02 &&
    Math.abs(plan.plannedCostAllAura2Usd - 8.61) < 0.02,
    `US$${plan.plannedCostAllAura1Usd.toFixed(2)} / US$${plan.plannedCostAllAura2Usd.toFixed(2)}`);
  check('Biaya campuran = jumlah biaya per item (bukan total karakter × tarif bawaan)',
    Math.abs(plan.plannedCostUsd - plan.pending.reduce((a, e) => a + e.costUsd, 0)) < 1e-9,
    `US$${plan.plannedCostUsd.toFixed(4)}`);
  check('Biaya campuran berada di antara dua batas satu-model',
    plan.plannedCostUsd >= plan.plannedCostAllAura1Usd - 1e-9 &&
    plan.plannedCostUsd <= plan.plannedCostAllAura2Usd + 1e-9,
    `US$${plan.plannedCostUsd.toFixed(2)}`);

  // --- 3. DURASI, PENYIMPANAN, DAN JATAH GRATIS ----------------------------------------
  check('Durasi audio diestimasi untuk korpus dan batch (jam, bukan hanya karakter)',
    census.estimatedSeconds > 3600 && plan.plannedSeconds > 3600 &&
    Math.abs(census.estimatedSeconds - census.totalChars / mod.CANONICAL.charsPerSecond) < 1e-6,
    `korpus ±${(census.estimatedSeconds / 3600).toFixed(1)} jam, batch ±${(plan.plannedSeconds / 3600).toFixed(1)} jam`);
  check('Penyimpanan R2 diestimasi dari kalibrasi 925 B/char DAN dari probe nyata tiap model',
    census.estimatedBytes === census.totalChars * 925 &&
    census.estimatedBytesByModel[aura1.id] === Math.round(census.totalChars * (aura1.probe.bytes / aura1.probe.chars)) &&
    census.estimatedBytesByModel[aura2.id] > census.estimatedBytesByModel[aura1.id],
    `${(census.estimatedBytes / 1e9).toFixed(2)} GB batas atas, ${(census.estimatedBytesByModel[aura1.id] / 1e9).toFixed(2)} GB dari probe`);
  check('Seluruh estimasi penyimpanan tetap di dalam free tier R2 10 GB',
    census.estimatedBytes / 1e9 < 10, `${(census.estimatedBytes / 1e9).toFixed(2)} GB`);
  check('Kebutuhan neuron ≈825.000 dan jatah gratis 10.000/hari dipaku',
    mod.CANONICAL.freeNeuronsPerDay === 10000 && near(census.estimatedNeurons, 825000, 0.01) &&
    census.freeDaysNeeded > 30,
    `${census.estimatedNeurons} neuron = ${census.freeDaysNeeded} hari jatah gratis`);

  // --- 4. UJI NYATA DAN MODEL YANG DITOLAK --------------------------------------------
  check('Probe nyata 84 karakter tercatat apa adanya (aura-1 961 ms/25.704 B; aura-2-en 2.510 ms/32.688 B)',
    aura1.probe.chars === 84 && aura1.probe.ms === 961 && aura1.probe.bytes === 25704 &&
    aura2.probe.chars === 84 && aura2.probe.ms === 2510 && aura2.probe.bytes === 32688,
    'angka uji, bukan taksiran');
  check('WER Whisper tercatat: aura-1 0,038, aura-2-en 0,018 (separuh)',
    aura1.wer === 0.038 && aura2.wer === 0.018 && aura2.wer < aura1.wer,
    `${aura1.wer} vs ${aura2.wer}`);
  check('melotts terdaftar DITOLAK dengan alasan 500 3/4 + keluaran WAV base64',
    !!mod.REJECTED_MODELS['@cf/myshell-ai/melotts'] &&
    /500/.test(mod.REJECTED_MODELS['@cf/myshell-ai/melotts'].reason) &&
    /WAV/i.test(mod.REJECTED_MODELS['@cf/myshell-ai/melotts'].reason),
    'ditolak sebagai data, bukan sebagai catatan');
  check('Memilih melotts MELEMPAR, bukan diam-diam dipakai pada jalan berbayar',
    (() => { try { mod.modelOf('@cf/myshell-ai/melotts'); return false; } catch (e) { return /rejected/.test(e.message); } })(),
    'model_rejected');
  check('Model tak dikenal juga ditolak (salah ketik gagal sebelum ada dolar bergerak)',
    (() => { try { mod.modelOf('@cf/deepgram/aura-3'); return false; } catch (e) { return /unknown/.test(e.message); } })(),
    'model_unknown');

  // --- 5. FRASA BERISIKO --------------------------------------------------------------
  const risky = mod.scanRiskyPhrases({ content: 'all' });
  check('Daftar frasa berisiko tidak kosong',
    Array.isArray(mod.RISKY_PHRASES) && mod.RISKY_PHRASES.length > 0, `${mod.RISKY_PHRASES.length} frasa`);
  check('Daftar memuat "On balance" dan mencatat bahwa ia terdengar "Unbalanced"',
    mod.RISKY_PHRASES.some((r) => r.phrase === 'On balance' && /unbalanced/i.test(r.heardAs)),
    'temuan aura-1 vs Whisper terekam di data');
  check('"On balance" ditandai confirmed (bukti transkripsi), bukan dugaan',
    mod.RISKY_PHRASES.find((r) => r.phrase === 'On balance').severity === 'confirmed', 'confirmed');
  check('Deteksi otomatis menemukan kemunculan nyata di bank, bukan daftar id tangan',
    risky.hits.length > 0 && risky.byPhrase['On balance'] > 0 && !/r0202|r0204/.test(
      fs.readFileSync(path.join(root, 'tools/prerender-tts.mjs'), 'utf8')),
    `${risky.hits.length} kemunculan, "On balance" ${risky.byPhrase['On balance']}×`);
  check('Stem C1 reading-bank yang berawalan frasa itu terdeteksi seluruhnya (puluhan, bukan satu)',
    risky.readingHits.filter((h) => h.phrase === 'On balance').length >= 25 &&
    risky.readingHits.every((h) => h.model === mod.RISK_MODEL_ID),
    `${risky.readingHits.length} stem/teks di ${risky.readingItems} soal`);
  check('Setiap temuan berisiko membawa tindakan eksplisit: aura-2-en atau verifikasi manual',
    risky.hits.every((h) => /aura-2-en/.test(h.action)) &&
    risky.readingHits.every((h) => /manual_verify/.test(h.action)),
    mod.RISK_MODEL_ID);
  check('Model risiko adalah aura-2-en (yang WER-nya separuh), bukan model default',
    mod.RISK_MODEL_ID === '@cf/deepgram/aura-2-en' && mod.RISK_MODEL_ID !== mod.ENGINE.id,
    mod.RISK_MODEL_ID);
  check('Pencocokan menuntut batas kata (kata "balance" biasa tidak ikut tertangkap)',
    (() => {
      const hit = mod.scanRiskyPhrases({ rows: [{ domain: 'listening', sourceId: 'x1', contentType: 'sentence', text: 'On balance, the plan works.' }] });
      const miss = mod.scanRiskyPhrases({ rows: [{ domain: 'listening', sourceId: 'x2', contentType: 'sentence', text: 'The balance in her account is low.' }] });
      return hit.corpusHits.length === 1 && miss.corpusHits.length === 0;
    })(), 'satu kena, satu bersih');
  check('Frasa sejenis (lebur preposisi) juga dijaga, bukan hanya satu kasus',
    mod.RISKY_PHRASES.length >= 4 &&
    mod.scanRiskyPhrases({ rows: [{ domain: 'book', sourceId: 'b1', contentType: 'sentence', text: 'The work is on going for now.' }] }).corpusHits.length === 1,
    mod.RISKY_PHRASES.map((r) => r.phrase).join(' | '));

  // --- 6. OVERRIDE MODEL PER-ITEM -----------------------------------------------------
  const target = plan.pending[0];
  const overridden = mod.buildPlan({
    content: 'all',
    overrides: { [`${target.domain}:${target.sourceId}`]: '@cf/deepgram/aura-2-en' }
  });
  const after = overridden.pending.find((e) => e.sourceId === target.sourceId && e.domain === target.domain);
  check('Override per-item memindahkan SATU item ke aura-2-en',
    !!after && after.modelId === '@cf/deepgram/aura-2-en' && after.overridden === true,
    after ? after.modelId : 'item tidak ditemukan');
  check('Override mengubah harga item itu tepat dua kali (0,030 vs 0,015)',
    !!after && Math.abs(after.costUsd - (after.chars / 1000) * 0.030) < 1e-12 &&
    Math.abs(after.costUsd - target.costUsd * 2) < 1e-12,
    `US$${after ? after.costUsd.toFixed(5) : '-'} vs US$${target.costUsd.toFixed(5)}`);
  check('Override mengubah kunci objek (engineId/engineVersion memang masuk hash)',
    !!after && after.audioKey !== target.audioKey &&
    after.audioKey === TtsKey.build({
      text: after.text, locale: mod.ENGINE.locale, voiceId: mod.MODELS['@cf/deepgram/aura-2-en'].voiceId,
      engineId: '@cf/deepgram/aura-2-en', engineVersion: mod.MODELS['@cf/deepgram/aura-2-en'].engineVersion,
      contentType: after.contentType, settings: mod.ENGINE.settings
    }).audioKey, 'kunci jujur soal apa yang tersimpan');
  check('Item lain TIDAK terpengaruh oleh satu override (jumlah objek dan model tetap)',
    overridden.pending.length === plan.pending.length &&
    overridden.overridden === 1 &&
    overridden.byModel['@cf/deepgram/aura-2-en'].items === 1,
    `${overridden.overridden} item dipindah dari ${overridden.pending.length}`);
  check('Ringkasan biaya per model dipecah, dan totalnya naik sebesar selisih item itu',
    Math.abs((overridden.plannedCostUsd - plan.plannedCostUsd) - target.costUsd) < 1e-9,
    `US$${overridden.plannedCostUsd.toFixed(4)} vs US$${plan.plannedCostUsd.toFixed(4)}`);
  check('Override berbasis teks juga bekerja (kalimat sama di dua bank ikut pindah)',
    (() => {
      const byText = mod.buildPlan({ content: 'all', overrides: { [`text:${target.canonicalText}`]: '@cf/deepgram/aura-2-en' } });
      return byText.pending.some((e) => e.canonicalText === target.canonicalText && e.modelId === '@cf/deepgram/aura-2-en');
    })(), 'kunci teks kanonik');
  check('--model global memindahkan seluruh batch, dan harganya ikut',
    (() => {
      const all2 = mod.buildPlan({ content: 'vocabulary', engineId: '@cf/deepgram/aura-2-en' });
      return all2.pending.every((e) => e.modelId === '@cf/deepgram/aura-2-en') &&
        Math.abs(all2.plannedCostUsd - (all2.plannedChars / 1000) * 0.030) < 1e-9;
    })(), 'seluruh domain di aura-2-en');
  check('Override risiko HIDUP secara bawaan dan bisa dimatikan secara sadar',
    /riskOverride === false/.test(fs.readFileSync(path.join(root, 'tools/prerender-tts.mjs'), 'utf8')) &&
    mod.buildPlan({ content: 'vocabulary', riskOverride: false }).risky.corpusHits === 0,
    '--no-risk-override');
  check('Override tidak bisa memilih model yang ditolak',
    (() => {
      try { mod.buildPlan({ content: 'all', overrides: { [`${target.domain}:${target.sourceId}`]: '@cf/myshell-ai/melotts' } }); return false; }
      catch (e) { return /rejected/.test(e.message); }
    })(), 'melotts tetap tertutup di jalur rencana');

  // --- 7. KUNCI DARI tts-key.js, BUKAN SALINAN ----------------------------------------
  check('Skrip memuat workers/api/tts/tts-key.js secara langsung',
    /require\(path\.join\(ROOT, 'workers\/api\/tts\/tts-key\.js'\)\)/.test(src), 'satu sumber kunci');
  check('Tidak ada implementasi hash/normalisasi kunci yang disalin ke dalam skrip',
    !/function sha256/.test(src) && !/function canonicalText/.test(src) &&
    !/0x6a09e667/.test(src) && !/createHash/.test(src),
    'nol duplikasi logika kunci');
  check('Skema kunci dibaca dari modul, tidak ditulis ulang sebagai literal',
    !/fiezel-tts-key-v2/.test(src) && /TtsKey\.SCHEMA/.test(src), 'TtsKey.SCHEMA');
  check('Kunci rencana identik dengan hasil modul kunci untuk vektor yang sama',
    plan.pending.slice(0, 200).every((e) => e.audioKey === TtsKey.build({
      text: e.text, locale: mod.ENGINE.locale, voiceId: e.voiceId, engineId: e.modelId,
      engineVersion: e.engineVersion, contentType: e.contentType, settings: mod.ENGINE.settings
    }).audioKey), '200 vektor pertama cocok');
  check('Nama objek tetap <64-hex>.mp3 seperti yang dilayani worker audio',
    plan.pending.every((e) => TtsKey.isValidObjectName(e.objectName)), `${plan.pending.length} objek`);
  check('Skrip pra-render tidak punya pintu jaringan selain fetch (tanpa http/https/net/dns/curl)',
    !/require\(\s*'(?:node:)?(?:http|https|net|tls|dns)'/.test(src) &&
    !/from\s+'(?:node:)?(?:http|https|net|tls|dns)'/.test(src) &&
    !/child_process|execSync|\bcurl\b|\bwget\b/.test(src),
    'satu pintu, dan pintu itu dijerat gerbang ini');

  // --- 8. DRY-RUN BAWAAN, NOL FETCH ---------------------------------------------------
  const printed = [];
  const realLog = console.log;
  console.log = (...args) => { printed.push(args.join(' ')); };
  let exitCode;
  try {
    exitCode = await mod.main([]);          // tanpa argumen = dry-run bawaan
    await mod.main(['--content=listening', '--limit=25']);
  } finally {
    console.log = realLog;
  }
  const output = printed.join('\n');
  check('main() tanpa argumen adalah DRY-RUN dan keluar 0', exitCode === 0, `exit ${exitCode}`);
  check('Dry-run tidak pernah memanggil fetch/http/net/dns — nol panggilan',
    netCalls.length === 0, netCalls.length ? netCalls.join(' | ') : 'nol panggilan');
  check('Laporan mencetak jumlah objek dan jumlah karakter',
    /belum ada\s+:\s*5657/.test(output) && /286851 karakter/.test(output), 'objek + karakter');
  check('Laporan mencetak biaya untuk aura-1 DAN aura-2-en',
    /@cf\/deepgram\/aura-1\s+US\$0\.015/.test(output) && /@cf\/deepgram\/aura-2-en\s+US\$0\.030/.test(output),
    'dua harga berdampingan');
  check('Laporan mencetak estimasi durasi audio dan estimasi penyimpanan R2',
    /durasi audio/.test(output) && /jam/.test(output) && /ukuran R2/.test(output) && /GB/.test(output),
    'durasi + penyimpanan');
  check('Laporan memuat peringatan jatah gratis 10.000 neuron/hari tidak cukup (~825.000 dibutuhkan)',
    /10000 neuron\/hari/.test(output) && /825000/.test(output) &&
    /JATAH GRATIS TIDAK CUKUP/.test(output) && /WAJIB dibayar sekali/.test(output),
    'pra-render dibelanjakan, bukan ditunggu');
  check('Laporan menyebut model yang ditolak beserta buktinya',
    /melotts/.test(output) && /wav-base64/.test(output), 'melotts dilaporkan ditolak');
  check('Laporan menyebut frasa berisiko beserta jumlah kemunculannya',
    /frasa risiko/.test(output) && /On balance/.test(output), 'frasa berisiko dilaporkan');
  check('Dry-run menyatakan dirinya dry-run dan cara memproduksinya',
    /DRY-RUN \(bawaan\)/.test(output) && /--apply/.test(output), 'bawaan aman');

  // --- 9. WORKFLOW: gate aktor pola repo, APPLY, anggaran, dry-run bawaan -------------
  const wf = fs.readFileSync(path.join(root, '.github/workflows/audio-prerender-cf.yml'), 'utf8');
  check('Gate aktor memakai pola repo: event_name == workflow_dispatch DAN actor == FIEZEL-APPS',
    /if:\s*github\.event_name\s*==\s*'workflow_dispatch'\s*&&\s*github\.actor\s*==\s*'FIEZEL-APPS'/.test(wf),
    'pola deploy-core-worker.yml:17');
  check('Input APPLY ada, bawaannya kosong, dan produksi hanya jalan bila APPLY',
    /apply:[\s\S]{0,220}default:\s*''/.test(wf) &&
    /if:\s*\$\{\{\s*inputs\.apply\s*==\s*'APPLY'\s*\}\}/.test(wf), "dry-run bawaan");
  check('Batas anggaran USD dieja sebagai input dan diteruskan ke skrip',
    /budget_usd:/.test(wf) && /--budget-usd/.test(wf), 'budget_usd');
  check('Gerbang rencana ini dijalankan di workflow pra-render sebelum apply',
    wf.includes('prerender-plan-test.js') &&
    wf.indexOf('prerender-plan-test.js') < wf.indexOf('name: Produksi'), 'gerbang dulu');
  const quality = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
  check('Gerbang ini terdaftar di quality.yml', /node prerender-plan-test\.js/.test(quality), 'terdaftar');

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'prerender-plan-test',
    corpus: {
      totalChars: census.totalChars,
      uniqueObjectsPending: plan.pending.length,
      pendingChars: plan.plannedChars,
      duplicatesRemoved: plan.duplicates,
      costUsd: {
        corpusAura1: Number(census.costByModel['@cf/deepgram/aura-1'].toFixed(2)),
        corpusAura2En: Number(census.costByModel['@cf/deepgram/aura-2-en'].toFixed(2)),
        batchAura1: Number(plan.plannedCostAllAura1Usd.toFixed(2)),
        batchAura2En: Number(plan.plannedCostAllAura2Usd.toFixed(2)),
        batchBlended: Number(plan.plannedCostUsd.toFixed(2))
      },
      audioHours: Number((census.estimatedSeconds / 3600).toFixed(1)),
      r2GbUpperBound: Number((census.estimatedBytes / 1e9).toFixed(2)),
      neurons: census.estimatedNeurons,
      freeDaysNeeded: census.freeDaysNeeded
    },
    risky: {
      phrases: mod.RISKY_PHRASES.map((r) => r.phrase),
      corpusHits: risky.corpusHits.length,
      readingBankHits: risky.readingHits.length,
      readingBankItems: risky.readingItems,
      byPhrase: risky.byPhrase,
      model: mod.RISK_MODEL_ID
    },
    network: { calls: netCalls.length },
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    checks
  };
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
