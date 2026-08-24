#!/usr/bin/env node
/**
 * m025-150 satu-satunya tempat kredit ElevenLabs bisa terpakai.
 *
 * MANDAT V2 pasal 8, 11, dan 12. Berkas ini berjalan di GitHub Actions dengan rahasia
 * tersimpan, tidak pernah di browser. Ia membaca konten tetap FIEZEL, menghitung audioKey
 * yang sama persis dengan yang dihitung aplikasi, melewati semua yang sudah ada di manifest,
 * lalu memproduksi sisanya.
 *
 * DRY-RUN ADALAH BAWAAN, dan itu bukan kehati-hatian yang berlebihan. Bank kosakata FIEZEL
 * berisi 1765 entri dengan contoh kalimatnya masing-masing; sekali jalan tanpa rem, satu
 * perintah yang salah ketik bisa menghabiskan jatah sebulan sebelum ada satu pun yang sempat
 * mendengarnya. Produksi baru terjadi kalau --apply diberikan, dan tetap berhenti begitu
 * anggaran karakter atau jumlah aset terlampaui.
 *
 * ASET TIDAK PERNAH DITANDAI SIAP SEBELUM BERKASNYA TERBUKTI ADA. Urutannya - hasilkan,
 * validasi, tulis biner, verifikasi ulang dari disk, baru catat di manifest - adalah pasal 7
 * apa adanya. Balasan 200 dari ElevenLabs saja bukan bukti apa pun: respons kosong, potongan
 * HTML halaman galat, dan body terpotong semuanya datang sebagai 200 di suatu hari.
 *
 * Manifest ditulis atomik lewat berkas sementara + rename. Runner yang mati di tengah
 * penulisan akan meninggalkan manifest lama yang utuh, bukan JSON separuh yang membuat
 * seluruh aplikasi kehilangan suara.
 *
 * Pemakaian:
 *   node tools/audio-batch-generate.mjs --content=vocabulary --limit=50
 *   node tools/audio-batch-generate.mjs --content=vocabulary --limit=50 --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AudioKey = require(path.join(ROOT, 'features/audio-assets/fiezel-audio-key.js'));

const MANIFEST_PATH = path.join(ROOT, 'audio/manifest.json');
const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_RETRIES = 3;

function parseArgs(argv) {
  const out = { content: 'vocabulary', limit: 0, apply: false, budgetChars: 0, budgetAssets: 0 };
  for (const arg of argv.slice(2)) {
    const [rawKey, rawValue] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg, ''];
    if (rawKey === 'apply') out.apply = true;
    else if (rawKey === 'content') out.content = String(rawValue || '').trim();
    else if (rawKey === 'limit') out.limit = Number(rawValue) || 0;
    else if (rawKey === 'budget-chars') out.budgetChars = Number(rawValue) || 0;
    else if (rawKey === 'budget-assets') out.budgetAssets = Number(rawValue) || 0;
  }
  return out;
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
}

/**
 * Daftar konten tetap FIEZEL. Setiap entri membawa rujukan sumbernya supaya manifest bisa
 * menjawab "berkas ini milik pelajaran mana" tanpa menebak dari teksnya.
 */
const REGISTRY = {
  vocabulary() {
    const items = [];
    for (const record of readJson('vocabulary-master.json')) {
      if (record?.word) {
        items.push({ text: record.word, contentType: 'word', locale: 'en-US', sourceRef: record.id });
      }
      for (const example of record?.examples || []) {
        if (example?.en) {
          items.push({ text: example.en, contentType: 'sentence', locale: 'en-US', sourceRef: record.id });
        }
      }
    }
    return items;
  },
  listening() {
    const bank = readJson('features/speaking-listening/listening-bank-v1.json');
    return (bank?.items || [])
      .filter((item) => item?.script)
      .map((item) => ({
        text: item.script,
        contentType: 'listening',
        locale: item.voiceLang || 'en-US',
        sourceRef: item.id
      }));
  },
  reading() {
    return readJson('reading-bank.json')
      .filter((item) => item?.text)
      .map((item) => ({ text: item.text, contentType: 'passage', locale: 'en-US', sourceRef: item.id }));
  }
};

function loadManifest() {
  const doc = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (doc.schema !== 'fiezel-audio-manifest-v1') throw new Error('manifest_schema_mismatch');
  if (!doc.assets || typeof doc.assets !== 'object') doc.assets = {};
  return doc;
}

/** Tulis-lalu-rename; lihat catatan kepala berkas. */
function saveManifest(doc) {
  doc.version = Number(doc.version || 0) + 1;
  doc.generatedAt = new Date().toISOString();
  const temp = MANIFEST_PATH + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, MANIFEST_PATH);
}

/**
 * MP3 yang sah dimulai dengan tag ID3 atau frame sync. Pemeriksaan ini murah dan menangkap
 * justru kegagalan yang paling menyesatkan: halaman galat HTML atau JSON kuota habis yang
 * datang dengan status 200 dan akan tersimpan diam-diam sebagai berkas .mp3.
 */
function validateMp3(bytes) {
  if (!bytes || bytes.length < 512) return 'too_small';
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (!id3 && !frame) return 'not_mpeg_audio';
  return '';
}

async function synthesize(identity, apiKey) {
  const url = `${API_URL}/${encodeURIComponent(identity.voiceId)}?output_format=mp3_44100_128`;
  const body = {
    text: identity.canonicalText,
    model_id: identity.modelId,
    voice_settings: {
      stability: Number(identity.settings.stability ?? 0.5),
      similarity_boost: Number(identity.settings.similarityBoost ?? 0.75)
    }
  };

  let lastError = 'unknown';
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify(body)
      });
    } catch (error) {
      lastError = `network_${error?.message || 'error'}`;
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }

    // Kuota habis dan kunci ditolak TIDAK diulang. Mengulangnya tidak pernah berhasil, dan
    // setiap percobaan tambahan hanya memperpanjang jalannya runner sebelum gagal juga.
    if (response.status === 401 || response.status === 403) return { fatal: 'auth_rejected' };
    if (response.status === 429) return { fatal: 'quota_or_rate_limited' };
    if (!response.ok) {
      lastError = `http_${response.status}`;
      if (response.status < 500) return { fatal: lastError };
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const invalid = validateMp3(bytes);
    if (invalid) { lastError = invalid; continue; }
    return { bytes };
  }
  return { error: lastError };
}

async function main() {
  const args = parseArgs(process.argv);
  const build = REGISTRY[args.content];
  if (!build) {
    console.error(`konten tidak dikenal: ${args.content}. Pilihan: ${Object.keys(REGISTRY).join(', ')}`);
    process.exit(2);
  }

  const manifest = loadManifest();
  const voiceId = String(process.env.ELEVENLABS_VOICE_ID || manifest.voiceProfile?.voiceId || '').trim();
  const modelId = String(process.env.ELEVENLABS_MODEL_ID || manifest.voiceProfile?.modelId || 'eleven_multilingual_v2').trim();
  const settings = manifest.voiceProfile?.settings || { stability: 0.5, similarityBoost: 0.75, speed: 1 };
  if (!voiceId) {
    console.error('ELEVENLABS_VOICE_ID belum diset. Tidak ada yang bisa dihitung tanpa profil suara.');
    process.exit(2);
  }

  const budgetChars = args.budgetChars || manifest.budget?.maxCharactersPerRun || 50000;
  const budgetAssets = args.budgetAssets || manifest.budget?.maxAssetsPerRun || 500;

  // Deduplikasi terjadi di sini, sebelum satu karakter pun dikirim: dua entri konten yang
  // teks kanoniknya sama akan jatuh ke audioKey yang sama dan hanya dihitung sekali.
  const planned = new Map();
  let alreadyReady = 0;
  let duplicates = 0;

  for (const item of build()) {
    let identity;
    try {
      identity = AudioKey.build({ ...item, voiceId, modelId, settings });
    } catch (_) {
      continue;
    }
    if (manifest.assets[identity.audioKey]?.status === 'ready') { alreadyReady++; continue; }
    if (planned.has(identity.audioKey)) { duplicates++; continue; }
    planned.set(identity.audioKey, { identity, sourceRef: item.sourceRef || '' });
  }

  let queue = [...planned.values()];
  if (args.limit > 0) queue = queue.slice(0, args.limit);

  let chars = 0;
  const affordable = [];
  for (const job of queue) {
    const cost = job.identity.canonicalText.length;
    if (affordable.length >= budgetAssets || chars + cost > budgetChars) break;
    chars += cost;
    affordable.push(job);
  }

  console.log(`konten        : ${args.content}`);
  console.log(`sudah siap    : ${alreadyReady}`);
  console.log(`duplikat      : ${duplicates} (tidak akan diproduksi ulang)`);
  console.log(`belum ada     : ${planned.size}`);
  console.log(`dalam anggaran: ${affordable.length} aset / ${chars} karakter`);
  console.log(`anggaran      : ${budgetAssets} aset / ${budgetChars} karakter`);

  if (!args.apply) {
    console.log('\nDRY-RUN. Tidak ada yang dikirim ke ElevenLabs. Tambahkan --apply untuk memproduksi.');
    return;
  }

  const apiKey = String(process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY tidak ada. Produksi dibatalkan.');
    process.exit(2);
  }

  let generated = 0;
  let failed = 0;
  manifest.voiceProfile = { voiceId, modelId, settings };

  for (const job of affordable) {
    const { identity, sourceRef } = job;
    const result = await synthesize(identity, apiKey);

    if (result.fatal) {
      // Kegagalan yang tidak akan membaik dengan aset berikutnya. Manifest tetap disimpan
      // supaya yang sudah berhasil tidak hilang dan pekerjaan bisa dilanjutkan nanti.
      console.error(`BERHENTI: ${result.fatal}`);
      break;
    }
    if (!result.bytes) {
      failed++;
      console.error(`gagal ${identity.audioKey.slice(0, 8)} (${result.error})`);
      continue;
    }

    const relative = AudioKey.assetPath(identity);
    const absolute = path.join(ROOT, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, result.bytes);

    // Dibaca ulang dari disk. Penulisan yang gagal separuh - disk penuh di runner adalah
    // contoh nyatanya - tidak terlihat dari writeFileSync yang tidak melempar.
    const persisted = fs.readFileSync(absolute);
    if (persisted.length !== result.bytes.length || validateMp3(persisted)) {
      failed++;
      try { fs.unlinkSync(absolute); } catch (_) {}
      console.error(`gagal simpan ${identity.audioKey.slice(0, 8)}`);
      continue;
    }

    manifest.assets[identity.audioKey] = {
      url: './' + relative,
      contentType: identity.contentType,
      locale: identity.locale,
      voiceId: identity.voiceId,
      modelId: identity.modelId,
      bytes: persisted.length,
      checksum: AudioKey.sha256(persisted.toString('latin1')),
      sourceRef,
      createdAt: new Date().toISOString(),
      status: 'ready'
    };
    generated++;
    if (generated % 25 === 0) console.log(`  ${generated}/${affordable.length}…`);
  }

  saveManifest(manifest);
  console.log(`\nselesai: ${generated} aset baru, ${failed} gagal, manifest v${manifest.version}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error?.message || error));
  process.exit(1);
});
