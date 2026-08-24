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
 * validasi, unggah ke R2, ambil ulang dari R2, baru catat di manifest - adalah pasal 7
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
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AudioKey = require(path.join(ROOT, 'features/audio-assets/fiezel-audio-key.js'));

const MANIFEST_PATH = path.join(ROOT, 'audio/manifest.json');
const API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_RETRIES = 3;

/**
 * m025-150 biner disimpan di Cloudflare R2, manifest tetap di Git.
 *
 * Pembagian ini yang diminta pasal 3: Git memegang sumber kebenaran yang bisa ditinjau
 * manusia - indeks, profil suara, anggaran - sementara ribuan MP3 tinggal di object storage
 * tempat mereka memang seharusnya berada. Repositori tidak menggemuk, dan riwayat commit
 * tetap bisa dibaca.
 *
 * Unggahan lewat REST API Cloudflare, bukan subproses wrangler per berkas. Satu batch bisa
 * berisi ratusan aset; memanggil wrangler ratusan kali menambah menit demi menit ke runner
 * tanpa memberi jaminan tambahan apa pun.
 */
const R2_API = 'https://api.cloudflare.com/client/v4/accounts';

function r2Url(env, key) {
  return `${R2_API}/${env.accountId}/r2/buckets/${env.bucket}/objects/${encodeURIComponent(key)}`;
}

/**
 * REST API R2 dibatasi 1.200 permintaan per 5 menit untuk seluruh akun, dan satu aset
 * memakan tiga panggilan. Batas itu akan tersentuh begitu anggaran dinaikkan - dan
 * menyerah pada 429 berarti membuang aset yang kreditnya sudah terbayar.
 */
async function r2Put(env, key, body, contentType) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await fetch(r2Url(env, key), {
        method: 'PUT',
        headers: { authorization: `Bearer ${env.token}`, 'content-type': contentType },
        body
      });
    } catch (error) {
      if (attempt === 3) return `r2_network_${error?.message || 'error'}`;
      await new Promise((r) => setTimeout(r, attempt * 3000));
      continue;
    }
    if (response.ok) return '';
    if (response.status !== 429 && response.status < 500) return `r2_put_${response.status}`;
    if (attempt === 3) return `r2_put_${response.status}`;
    await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  return 'r2_put_exhausted';
}

/** Mengambil objek dari R2. Objek yang tidak ada bukan galat - ia jawaban yang sah. */
async function r2Fetch(env, key) {
  let response;
  try {
    response = await fetch(r2Url(env, key), { headers: { authorization: `Bearer ${env.token}` } });
  } catch (error) {
    return { error: `r2_network_${error?.message || 'error'}` };
  }
  if (response.status === 404) return { absent: true };
  if (!response.ok) return { error: `r2_get_${response.status}` };
  return { bytes: Buffer.from(await response.arrayBuffer()) };
}

/**
 * Membaca ulang objek dari R2 setelah menulisnya. Pasal 7: balasan sukses dari API bukan
 * bukti bahwa berkasnya benar-benar bisa diambil kembali, dan aset tidak boleh masuk
 * manifest sebelum hal itu terbukti.
 *
 * Dicoba dua kali. Pembacaan pertama kadang mendahului objeknya sendiri, dan menganggap itu
 * sebagai kegagalan berarti membuang aset yang sebenarnya baik-baik saja - beserta kredit
 * yang sudah terpakai untuk membuatnya.
 */
async function r2Verify(env, key, expectedBytes) {
  let last = 'unknown';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await r2Fetch(env, key);
    if (result.bytes) {
      if (result.bytes.length !== expectedBytes) { last = 'r2_size_mismatch'; }
      else if (validateMp3(result.bytes)) { last = 'r2_corrupt'; }
      else return '';
    } else {
      last = result.error || 'r2_absent';
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

/** Bentuk satu entri manifest. Dipakai jalur produksi dan jalur pemulihan. */
function manifestEntry(identity, objectKey, bytes, sourceRef) {
  return {
    url: `a/${objectKey}`,
    contentType: identity.contentType,
    locale: identity.locale,
    voiceId: identity.voiceId,
    modelId: identity.modelId,
    bytes: bytes.length,
    // crypto, bukan AudioKey.sha256. Yang terakhir itu menerima string dan mengkodekannya
    // sebagai UTF-8, jadi setiap byte di atas 0x7f akan berlipat menjadi dua sebelum
    // dihitung - digest-nya tidak akan cocok dengan berkasnya sendiri maupun sha256sum.
    checksum: crypto.createHash('sha256').update(bytes).digest('hex'),
    sourceRef,
    createdAt: new Date().toISOString(),
    status: 'ready'
  };
}

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

/**
 * Memastikan suaranya benar-benar ada SEBELUM satu karakter pun dikirim.
 *
 * Tanpa ini, voice ID yang salah muncul sebagai `BERHENTI: http_404` - benar, tetapi tidak
 * memberi tahu apa pun tentang apa yang harus diperbaiki. Kesalahan yang sudah terjadi
 * sekali di sini adalah ID yang tersalin kurang satu karakter, dan bentuk kegagalannya
 * identik dengan kunci API yang salah, model yang salah, atau jaringan yang putus.
 *
 * Pemeriksaan ini gratis: endpoint daftar suara tidak memakai kredit.
 */
async function verifyVoice(voiceId, apiKey) {
  let response;
  try {
    response = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
      headers: { 'xi-api-key': apiKey, accept: 'application/json' }
    });
  } catch (error) {
    return `jaringan ke ElevenLabs gagal: ${error?.message || 'error'}`;
  }
  if (response.status === 401 || response.status === 403) {
    return 'ELEVENLABS_API_KEY ditolak. Periksa kuncinya di secret repositori.';
  }
  if (response.status === 404) {
    const hint = voiceId.length === 20
      ? 'Panjangnya benar, jadi kemungkinan suara itu belum ditambahkan ke My Voices di akunmu.'
      : `Panjangnya ${voiceId.length} karakter, sedangkan voice ID ElevenLabs selalu 20 - kemungkinan tersalin tidak utuh.`;
    return `Voice ID "${voiceId}" tidak ditemukan di akun ini. ${hint}`;
  }
  if (!response.ok) return `ElevenLabs menjawab HTTP ${response.status} saat memeriksa suara.`;
  try {
    const doc = await response.json();
    if (doc?.name) console.log(`suara         : ${doc.name} (${voiceId})`);
  } catch (_) { /* nama hanya untuk kenyamanan; ketiadaannya bukan kegagalan */ }
  return '';
}

async function synthesize(identity, apiKey) {
  const url = `${API_URL}/${encodeURIComponent(identity.voiceId)}?output_format=mp3_44100_128`;
  const body = {
    text: identity.canonicalText,
    model_id: identity.modelId,
    // speed ikut dikirim, dan itu wajib: audioKey menghitung SETIAP setelan suara,
    // termasuk speed. Kalau ia dihitung tetapi tidak dikirim, mengubahnya melahirkan
    // kunci baru untuk permintaan yang byte-nya identik - membayar ulang produksi audio
    // yang persis sama dengan yang sudah dimiliki.
    voice_settings: {
      stability: Number(identity.settings.stability ?? 0.5),
      similarity_boost: Number(identity.settings.similarityBoost ?? 0.75),
      speed: Number(identity.settings.speed ?? 1)
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
      // Badan responsnya ikut dibaca. "http_422" sendirian tidak memberi tahu apa pun;
      // ElevenLabs biasanya menjelaskan persis field mana yang ditolaknya.
      let detail = '';
      try { detail = (await response.text()).slice(0, 300).replace(/\s+/g, ' '); } catch (_) {}
      lastError = detail ? `http_${response.status}: ${detail}` : `http_${response.status}`;
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
    // Syaratnya sama persis dengan yang dipakai klien: ready DAN punya url. Entri ready
    // tanpa url tidak akan pernah bisa diputar, dan kalau ia dilewati di sini ia juga tidak
    // akan pernah diperbaiki - aset yang hilang selamanya tanpa satu pun galat.
    const known = manifest.assets[identity.audioKey];
    if (known?.status === 'ready' && known.url) { alreadyReady++; continue; }
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

  const storage = {
    token: String(process.env.CLOUDFLARE_API_TOKEN || '').trim(),
    accountId: String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim(),
    bucket: String(process.env.R2_BUCKET || 'fiezel-audio').trim()
  };
  if (!storage.token || !storage.accountId) {
    console.error('Kredensial Cloudflare tidak ada. Produksi dibatalkan sebelum satu kredit pun terpakai.');
    process.exit(2);
  }
  // Tanpa alamat publik, aset yang berhasil diunggah tidak akan bisa ditemukan aplikasi -
  // dan kreditnya sudah terlanjur terpakai. Diperiksa di sini, bukan setelah batch selesai.
  if (!manifest.assetBaseUrl) {
    console.error('assetBaseUrl belum ada di manifest. Jalankan workflow deploy Worker lebih dulu.');
    process.exit(2);
  }

  const voiceProblem = await verifyVoice(voiceId, apiKey);
  if (voiceProblem) {
    console.error(voiceProblem);
    process.exit(2);
  }

  let generated = 0;
  let failed = 0;
  let recovered = 0;
  manifest.voiceProfile = { voiceId, modelId, settings };

  for (const job of affordable) {
    const { identity, sourceRef } = job;
    const objectKeyEarly = `${identity.audioKey}.mp3`;

    // R2 diperiksa SEBELUM ElevenLabs dipanggil, bukan hanya manifest.
    //
    // Keduanya bisa berbeda, dan justru pada jalan yang gagal: unggahan yang berhasil tetapi
    // verifikasinya meleset - 5xx sesaat, atau pembacaan yang datang terlalu cepat - membuat
    // aset tidak tercatat padahal objeknya sudah ada di sana. Tanpa pemeriksaan ini, jalan
    // berikutnya akan membayar ulang untuk berkas yang sudah dimiliki.
    const existing = await r2Fetch(storage, objectKeyEarly);
    if (existing.bytes && !validateMp3(existing.bytes)) {
      manifest.assets[identity.audioKey] = manifestEntry(identity, objectKeyEarly, existing.bytes, sourceRef);
      recovered++;
      continue;
    }

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

    const objectKey = `${identity.audioKey}.mp3`;
    const putError = await r2Put(storage, objectKey, result.bytes, 'audio/mpeg');
    if (putError) {
      failed++;
      console.error(`gagal unggah ${identity.audioKey.slice(0, 8)} (${putError})`);
      continue;
    }

    const verifyError = await r2Verify(storage, objectKey, result.bytes.length);
    if (verifyError) {
      failed++;
      console.error(`gagal verifikasi ${identity.audioKey.slice(0, 8)} (${verifyError})`);
      continue;
    }

    manifest.assets[identity.audioKey] = manifestEntry(identity, objectKey, result.bytes, sourceRef);
    generated++;
    if (generated % 25 === 0) console.log(`  ${generated}/${affordable.length}…`);
  }

  saveManifest(manifest);

  // Salinan manifest di R2 melayani /manifest.json pada Worker. Sumber kebenarannya tetap
  // yang di Git - yang ini hanya cermin, dan ditulis setelah versinya naik supaya tidak
  // pernah lebih baru daripada yang sudah ditinjau.
  const mirrorError = await r2Put(
    storage, 'manifest.json', fs.readFileSync(MANIFEST_PATH), 'application/json'
  );
  if (mirrorError) console.error(`cermin manifest di R2 gagal (${mirrorError}); manifest di Git tetap sah.`);

  console.log(`\nselesai: ${generated} aset baru, ${recovered} dipulihkan dari R2 tanpa biaya, ${failed} gagal, manifest v${manifest.version}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error?.message || error));
  process.exit(1);
});
