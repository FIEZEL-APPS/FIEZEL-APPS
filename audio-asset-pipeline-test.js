// m025-150 — gate perilaku untuk pipeline aset audio ElevenLabs (mandat V2 pasal 13).
//
// Gate ini MENJALANKAN resolver yang asli di atas manifest dan fetch tiruan, bukan membaca
// kodenya. Pertanyaan yang dijawabnya - "berapa kali ElevenLabs terpanggil kalau seratus
// orang menekan putar" - tidak bisa dijawab dengan membaca: jawabannya terletak pada urutan
// janji yang saling menunggu, dan urutan itu hanya terlihat saat dijalankan.
//
// Satu berkas ini juga dipakai workflow audio-generate.yml sebelum meng-commit aset, karena
// pemeriksaan yang paling mahal kalau terlewat - kunci API bocor ke berkas publik - justru
// yang paling murah dijalankan.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};

const VOICE = { voiceId: 'voice-alpha', modelId: 'eleven_multilingual_v2', settings: { stability: 0.5 } };

/**
 * Satu "pengguna": konteks bersih dengan modul yang dimuat ulang dari nol, sehingga tidak ada
 * indeks atau janji yang bocor antar-skenario. Pengguna kedua dalam pengujian ini benar-benar
 * berangkat tanpa cache, persis seperti orang yang baru memasang FIEZEL.
 */
function makeUser(manifestDoc, options = {}) {
  const fetchLog = [];
  const sandbox = {
    console,
    FIEZEL_AUDIO_CONFIG: options.config === null ? undefined : (options.config || VOICE),
    fetch(url, init) {
      fetchLog.push(String(url));
      if (options.offline) return Promise.reject(new Error('offline'));
      if (String(url).includes('manifest.json')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(manifestDoc) });
      }
      return Promise.resolve({ ok: true, status: 200 });
    }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const file of ['fiezel-audio-key.js', 'fiezel-audio-manifest.js', 'fiezel-audio-resolver.js']) {
    const src = fs.readFileSync(path.join(root, 'features/audio-assets', file), 'utf8');
    vm.runInContext(src, sandbox, { filename: file });
  }
  return { sandbox, fetchLog, resolver: sandbox.FiezelAudioResolver, keys: sandbox.FiezelAudioKey };
}

/** Manifest yang berisi satu aset siap untuk teks yang diberikan. */
function manifestWith(text, extra = {}) {
  const AudioKey = require(path.join(root, 'features/audio-assets/fiezel-audio-key.js'));
  const identity = AudioKey.build({ text, locale: 'en-US', contentType: 'sentence', ...VOICE });
  return {
    doc: {
      schema: 'fiezel-audio-manifest-v1',
      version: 3,
      voiceProfile: VOICE,
      assets: {
        [identity.audioKey]: {
          url: './' + AudioKey.assetPath(identity),
          contentType: 'sentence',
          locale: 'en-US',
          voiceId: VOICE.voiceId,
          modelId: VOICE.modelId,
          bytes: 4096,
          status: 'ready',
          ...extra
        }
      }
    },
    identity
  };
}

(async () => {
  const AudioKey = require(path.join(root, 'features/audio-assets/fiezel-audio-key.js'));

  // 1. Satu kalimat diputar seratus kali menghasilkan satu kunci, dan nol produksi.
  {
    const { doc } = manifestWith('Good morning, class.');
    const user = makeUser(doc);
    const results = [];
    for (let i = 0; i < 100; i++) results.push(await user.resolver.resolve('Good morning, class.'));
    const distinct = new Set(results.map(r => r.audioKey));
    const metrics = user.resolver.status().metrics;
    check('100 pemutaran = satu aset, nol produksi',
      distinct.size === 1 && results.every(r => r.state === 'READY') && metrics.clientGenerations === 0,
      `kunci berbeda=${distinct.size} produksi=${metrics.clientGenerations}`);
    check('Manifest hanya diunduh sekali untuk 100 permintaan',
      user.fetchLog.filter(u => u.includes('manifest.json')).length === 1,
      `unduhan=${user.fetchLog.length}`);
  }

  // 2. Pengguna kedua tanpa cache lokal menerima berkas yang sama.
  {
    const { doc } = manifestWith('She works at a hospital.');
    const first = makeUser(doc);
    const second = makeUser(doc);
    const a = await first.resolver.resolve('She works at a hospital.');
    const b = await second.resolver.resolve('She works at a hospital.');
    check('Pengguna baru memakai ulang aset yang sama',
      a.state === 'READY' && a.url === b.url && a.audioKey === b.audioKey,
      `${a.url} vs ${b.url}`);
  }

  // 3. Seratus permintaan serentak untuk kunci yang belum ada.
  {
    const empty = { schema: 'fiezel-audio-manifest-v1', version: 1, voiceProfile: VOICE, assets: {} };
    const user = makeUser(empty);
    const all = await Promise.all(Array.from({ length: 100 }, () => user.resolver.resolve('An unseen sentence.')));
    const metrics = user.resolver.status().metrics;
    check('100 cache-miss serentak = nol pekerjaan produksi di klien',
      all.every(r => r.state === 'ABSENT') && metrics.clientGenerations === 0,
      `produksi=${metrics.clientGenerations}`);
    check('100 permintaan serentak = satu unduhan manifest',
      user.fetchLog.filter(u => u.includes('manifest.json')).length === 1,
      `unduhan=${user.fetchLog.filter(u => u.includes('manifest.json')).length}`);
  }

  // 4. Locale dan suara yang berbeda memang menghasilkan aset berbeda.
  {
    const base = { text: 'Thank you.', contentType: 'sentence', ...VOICE };
    const us = AudioKey.build({ ...base, locale: 'en-US' });
    const gb = AudioKey.build({ ...base, locale: 'en-GB' });
    const other = AudioKey.build({ ...base, locale: 'en-US', voiceId: 'voice-beta' });
    check('Locale berbeda = aset berbeda', us.audioKey !== gb.audioKey, us.audioKey.slice(0, 8));
    check('Suara berbeda = aset berbeda', us.audioKey !== other.audioKey, other.audioKey.slice(0, 8));
  }

  // 5. Derau spasi, baris baru, dan karakter tak terlihat tidak melahirkan aset kedua.
  {
    const clean = AudioKey.build({ text: 'I am ready.', locale: 'en-US', contentType: 'sentence', ...VOICE });
    // Spasi ganda, ZWSP, nbsp, baris baru, locale bergaris bawah, dan contentType kapital -
    // enam bentuk derau yang benar-benar muncul saat konten disalin dari sumber luar.
    const noisy = AudioKey.build({ text: '  I \u200bam\u00a0 ready.\n ', locale: 'en_us', contentType: 'SENTENCE', ...VOICE });
    check('Derau spasi/karakter tak terlihat tidak menduplikasi aset',
      clean.audioKey === noisy.audioKey, `${clean.audioKey.slice(0, 8)} vs ${noisy.audioKey.slice(0, 8)}`);

    // Sebaliknya: tanda tanya mengubah intonasi, jadi ia HARUS tetap membedakan.
    const asked = AudioKey.build({ text: 'I am ready?', locale: 'en-US', contentType: 'sentence', ...VOICE });
    check('Tanda baca yang mengubah intonasi tetap membedakan aset',
      clean.audioKey !== asked.audioKey, asked.audioKey.slice(0, 8));
  }

  // 6. Produksi berhasil tetapi penyimpanan gagal: entri tidak boleh terbaca sebagai siap.
  {
    const { doc } = manifestWith('Storage failed here.', { status: 'persisting' });
    const user = makeUser(doc);
    const result = await user.resolver.resolve('Storage failed here.');
    check('Entri yang belum ready tidak pernah disajikan', result.state === 'ABSENT', result.state);
  }

  // 7. Berkas ada di penyimpanan tetapi manifest tidak mencatatnya: jawabannya tetap ABSENT,
  //    bukan tebakan nama berkas.
  {
    const empty = { schema: 'fiezel-audio-manifest-v1', version: 1, voiceProfile: VOICE, assets: {} };
    const user = makeUser(empty);
    const result = await user.resolver.resolve('Orphaned file.');
    check('Aset tanpa catatan manifest tidak ditebak dari nama berkas',
      result.state === 'ABSENT' && !result.url, result.state);
  }

  // 8. Mode luring tidak boleh terlihat sebagai aset yang siap, dan tidak boleh menyimpulkan
  //    aset itu tidak ada selamanya.
  {
    const { doc } = manifestWith('Offline sentence.');
    const user = makeUser(doc, { offline: true });
    const result = await user.resolver.resolve('Offline sentence.');
    check('Luring = FAILED yang boleh dicoba lagi, bukan READY',
      result.state === 'FAILED' && result.retryable === true, result.state);
    check('Luring tidak mengaku memproduksi apa pun',
      user.resolver.status().metrics.clientGenerations === 0, 'produksi=0');
  }

  // 9. Tanpa profil suara, resolver diam - FIEZEL berbunyi lewat mesin lama seperti biasa.
  {
    const { doc } = manifestWith('No profile yet.');
    delete doc.voiceProfile;
    const user = makeUser(doc, { config: null });
    const result = await user.resolver.resolve('No profile yet.');
    check('Tanpa profil suara resolver menjawab ABSENT, bukan galat',
      result.state === 'ABSENT' && result.reason === 'no_voice_profile', result.reason);
  }

  // 10. Tidak ada rahasia di berkas yang disajikan ke browser. Pasal 6.
  {
    const publicFiles = [];
    const walk = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'vendor' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(js|mjs|html|json|css)$/.test(entry.name) && !/-test\.js$|^tools[\\/]/.test(path.relative(root, full))) {
          publicFiles.push(full);
        }
      }
    };
    walk(root);

    // Kunci ElevenLabs berbentuk sk_ diikuti hex panjang; token GitHub memakai awalan ghp_,
    // gho_, dan github_pat_. Pola inilah yang dicari, bukan kata "key" - mencari kata itu
    // hanya akan menghasilkan ratusan kecocokan tak berbahaya dan gate yang dimatikan orang.
    const secretPattern = /(sk_[a-f0-9]{32,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xi-api-key['"]?\s*[:=]\s*['"][^'"]{8,})/;
    const offenders = publicFiles.filter(file => secretPattern.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(root, file));
    check('Tidak ada kunci ElevenLabs atau token GitHub di berkas publik',
      offenders.length === 0, offenders.join(', ') || `${publicFiles.length} berkas diperiksa`);

    const resolverSrc = fs.readFileSync(path.join(root, 'features/audio-assets/fiezel-audio-resolver.js'), 'utf8');
    check('Resolver tidak punya jalur apa pun menuju api.elevenlabs.io',
      !/elevenlabs\.io/i.test(resolverSrc), 'resolver hanya membaca manifest dan memutar berkas');
  }

  // 11. Generator batch bawaannya dry-run.
  {
    const toolSrc = fs.readFileSync(path.join(root, 'tools/audio-batch-generate.mjs'), 'utf8');
    check('Generator batch tidak memproduksi tanpa --apply',
      /if \(!args\.apply\)[\s\S]{0,200}DRY-RUN/.test(toolSrc), 'jalur produksi berada di balik --apply');
    check('Generator batch punya anggaran karakter dan jumlah aset',
      /budgetChars/.test(toolSrc) && /budgetAssets/.test(toolSrc), 'rem anggaran ada');
    check('Generator batch memvalidasi MP3 sebelum menyimpan',
      /function validateMp3/.test(toolSrc) && /not_mpeg_audio/.test(toolSrc), 'validasi biner ada');
    check('Manifest ditulis atomik (tulis sementara lalu rename)',
      /renameSync/.test(toolSrc), 'penulisan atomik ada');

    const workflowSrc = fs.readFileSync(path.join(root, '.github/workflows/audio-generate.yml'), 'utf8');
    check('Workflow audio hanya berjalan atas perintah manusia',
      /workflow_dispatch/.test(workflowSrc) && !/^on:[\s\S]*?\n\s+push:/m.test(workflowSrc),
      'tidak ada pemicu otomatis');
    check('Workflow audio memakai concurrency group tunggal',
      /concurrency:/.test(workflowSrc), 'satu jalan pada satu waktu');
  }

  // 12. Service worker: manifest ikut shell (agar bisa dibatalkan per rilis), berkas MP3
  //     tidak - ia kekal dan tidak boleh menggemukkan setiap kenaikan SW_REV.
  {
    const swSrc = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    check('Manifest audio ikut precache shell', /'\.\/audio\/manifest\.json'/.test(swSrc), 'manifest ada di ASSETS');
    check('Tidak ada berkas MP3 di precache shell', !/\.mp3'/.test(swSrc), 'MP3 diambil sesuai kebutuhan');
    check('Modul audio-assets ikut precache shell',
      /features\/audio-assets\/fiezel-audio-resolver\.js/.test(swSrc), 'resolver tersedia luring');

    const indexSrc = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    check('Modul audio-assets dimuat sebelum voice-say',
      indexSrc.indexOf('fiezel-audio-resolver.js') < indexSrc.indexOf('fiezel-voice-say.js'),
      'urutan muat benar');
  }

  // 13. Seam suara memang menanyakan aset lebih dulu.
  {
    const saySrc = fs.readFileSync(path.join(root, 'features/neural-voice/fiezel-voice-say.js'), 'utf8');
    check('voice-say menanyakan resolver sebelum mesin runtime',
      saySrc.indexOf('store.resolve(') < saySrc.indexOf('function speakWithEngine'),
      'aset didahulukan');
    check('voice-say tetap punya jalur mesin untuk aset yang belum ada',
      /speakWithEngine\(english, opts, band_\)/.test(saySrc), 'jalur cadangan tetap ada');
  }

  // 14. Cloudflare R2 (mandat V2 pasal 3 Tier A): biner tinggal di object storage, dan
  //     jalannya ke sana hanya satu arah - baca.
  {
    const { doc, identity } = manifestWith('Where is the library?');
    doc.assetBaseUrl = 'https://fiezel-audio.example.workers.dev';
    doc.assets[identity.audioKey].url = `a/${identity.audioKey}.mp3`;
    const user = makeUser(doc);
    const found = await user.resolver.resolve('Where is the library?');
    check('URL relatif digabung dengan assetBaseUrl menjadi alamat R2',
      found.state === 'READY' && found.url === `https://fiezel-audio.example.workers.dev/a/${identity.audioKey}.mp3`,
      String(found.url));

    // Manifest yang belum punya alamat tidak boleh melahirkan URL setengah jadi yang
    // dijawab 404 oleh GitHub Pages - itu akan terdengar sebagai "aset rusak", padahal
    // yang terjadi adalah deploy Worker belum pernah dijalankan.
    const orphan = manifestWith('Orphan line');
    orphan.doc.assets[orphan.identity.audioKey].url = `a/${orphan.identity.audioKey}.mp3`;
    const orphanUser = makeUser(orphan.doc);
    const orphanFound = await orphanUser.resolver.resolve('Orphan line');
    check('Tanpa assetBaseUrl, url tetap relatif apa adanya',
      orphanFound.state === 'READY' && orphanFound.url === `a/${orphan.identity.audioKey}.mp3`,
      String(orphanFound.url));

    const workerSrc = fs.readFileSync(path.join(root, 'workers/fiezel-audio-worker.js'), 'utf8');
    check('Worker menolak setiap metode tulis',
      /!== 'GET' && request\.method !== 'HEAD'/.test(workerSrc) && /405/.test(workerSrc),
      'PUT/POST/DELETE dijawab 405');
    // Komentar dibuang lebih dulu. Catatan kepala Worker memang menyebut ElevenLabs dan
    // endpoint /generate - justru untuk menjelaskan mengapa keduanya tidak ada di sana.
    // Memindai teksnya mentah-mentah akan menghukum penjelasan itu, bukan kodenya.
    const workerCode = workerSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check('Worker tidak punya endpoint produksi',
      !/elevenlabs/i.test(workerCode) && !/generate/i.test(workerCode),
      'tidak ada jalur ke ElevenLabs di kode');
    check('Worker hanya melayani nama objek berbentuk audioKey',
      /\[0-9a-f\]\{64\}/.test(workerSrc), 'pola kunci dijaga');

    const wranglerSrc = fs.readFileSync(path.join(root, 'workers/wrangler.toml'), 'utf8');
    check('Binding R2 dipakai, bukan access key S3',
      /r2_buckets/.test(wranglerSrc) && !/access_key|secret_access_key/i.test(wranglerSrc),
      'tidak ada kredensial bucket di repo');

    const toolSrc = fs.readFileSync(path.join(root, 'tools/audio-batch-generate.mjs'), 'utf8');
    check('Objek diambil ulang dari R2 sebelum ditandai ready',
      toolSrc.indexOf('r2Verify(') < toolSrc.indexOf('manifest.assets[identity.audioKey] ='),
      'verifikasi mendahului pencatatan');
    check('Produksi berhenti bila alamat aset belum ada',
      /assetBaseUrl[\s\S]{0,200}process\.exit\(2\)/.test(toolSrc),
      'tidak ada kredit terpakai untuk aset tak teralamat');
    check('Kredensial Cloudflare dibaca dari environment, bukan berkas repo',
      /process\.env\.CLOUDFLARE_API_TOKEN/.test(toolSrc) && !/CLOUDFLARE_API_TOKEN\s*=\s*['"][^'"]+['"]/.test(toolSrc),
      'token hanya dari secret');

    const deploySrc = fs.readFileSync(path.join(root, '.github/workflows/audio-deploy-worker.yml'), 'utf8');
    check('Deploy memverifikasi Worker menolak tulis sebelum dianggap selesai',
      /PUT/.test(deploySrc) && /405/.test(deploySrc),
      'gate hanya-baca dijalankan tiap deploy');
  }

  // 15. Keadaan produksi yang sebenarnya: FIEZEL_AUDIO_CONFIG.voiceId KOSONG, dan profil
  //     suara hanya ada di dalam manifest.
  //
  //     Ini yang lolos dari 14 bagian di atas dan baru terlihat di aplikasi sungguhan.
  //     Semua skenario sebelumnya menyuplai config berisi voiceId, sehingga urutan
  //     "muat manifest dulu, baru hitung identitas" tidak pernah teruji - padahal
  //     terbaliknya membuat resolver menyerah sebelum manifest sempat dibuka, lalu
  //     menjawab ABSENT selamanya untuk aset yang sudah dibayar.
  {
    const { doc, identity } = manifestWith('Good afternoon.');
    const user = makeUser(doc, { config: null });
    const found = await user.resolver.resolve('Good afternoon.');
    check('Profil suara dari manifest cukup, tanpa config di halaman',
      found.state === 'READY' && found.audioKey === identity.audioKey,
      `${found.state} ${found.reason || ''}`);

    // Dan kalau memang tidak ada profil di mana pun, jawabannya harus tetap tenang -
    // ABSENT dengan sebab yang jujur, bukan galat yang menghentikan pemanggil.
    const blank = manifestWith('Nowhere line');
    delete blank.doc.voiceProfile;
    const blankUser = makeUser(blank.doc, { config: null });
    const blankFound = await blankUser.resolver.resolve('Nowhere line');
    check('Tanpa profil di mana pun, jawabannya ABSENT yang jujur',
      blankFound.state === 'ABSENT' && blankFound.reason === 'no_voice_profile',
      `${blankFound.state} ${blankFound.reason || ''}`);
  }

  // 16. Pemutaran tidak boleh mengambil aset dengan mode no-cors.
  //
  //     Respons opaque berstatus 0 dan badannya tidak bisa dibaca, jadi .blob() memberi
  //     0 byte. Lapisan cache membangun object URL dari blob itu, dan setiap aset gagal
  //     diputar TANPA satu pun galat: resolve() tetap READY, play() menjawab false, dan
  //     seluruh katalog berbayar diam-diam jatuh ke mesin lama. Terjadi di produksi dan
  //     hanya ketahuan karena diuji di aplikasi sungguhan - gate ini menutup jalan itu.
  {
    const src = fs.readFileSync(path.join(root, 'features/audio-assets/fiezel-audio-resolver.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check('Pengambilan aset tidak memakai mode no-cors',
      !/no-cors/.test(code),
      'tidak ada no-cors di kode');
    check('Respons yang tidak ok tidak diperlakukan sebagai berhasil',
      /response\.ok/.test(code) && /res\.ok/.test(code),
      'status respons diperiksa di kedua jalur');

    // Worker: 206 hanya boleh keluar untuk permintaan yang memang membawa Range. R2 mengisi
    // object.range bahkan pada pengambilan penuh, dan Cache API MENOLAK menyimpan 206 - jadi
    // memeriksa object.range saja mematikan seluruh cache klien tanpa satu pun galat.
    // Terukur di produksi sebelum diperbaiki: stores 0, entri cache 0, meski pemutarannya
    // sendiri berhasil dan tak ada yang tampak salah.
    const workerCode = fs.readFileSync(path.join(root, 'workers/fiezel-audio-worker.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check('206 hanya untuk permintaan yang membawa header Range',
      /rangeRequested\s*&&\s*object\.range/.test(workerCode),
      'header Range diperiksa sebelum menjawab parsial');
  }

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    counts: { pass: checks.filter(i => i.status === 'PASS').length, fail: checks.filter(i => i.status === 'FAIL').length },
    checks
  };
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
