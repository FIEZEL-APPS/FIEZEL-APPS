/**
 * workflow-actor-gate-test.js — GERBANG penjaga aktor untuk SEMUA workflow GitHub Actions.
 *
 * Node murni. Nol dependency, nol jaringan, nol parser YAML pihak ketiga (repo ini tidak
 * punya `js-yaml`, dan gerbang tidak boleh menambah dependensi hanya untuk membaca 15 berkas).
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * KENAPA GERBANG INI ADA
 * ────────────────────────────────────────────────────────────────────────────────────────
 * `reports/cf-a2-cf-existing.md` §(d) menemukan asimetri: workflow yang menyentuh Puter
 * (`deploy-core-worker.yml:17`, `configure-core.yml:12`, `push-reminders.yml:15`) bergerbang
 * `github.actor == 'FIEZEL-APPS'`, sedangkan workflow yang men-deploy Worker CLOUDFLARE dan
 * yang memegang kunci ElevenLabs TIDAK. Rekomendasi #2 laporan itu: pasang gate yang sama.
 * `reports/cf-a7-security.md` §2 dan §6 menaikkan urgensinya: token-token itu punya blast
 * radius akun penuh, dan workflow pemegangnya juga `git push` ke branch produksi.
 *
 * Menambahkan satu baris `if:` menutup celah HARI INI. Yang tidak ditutup oleh baris itu
 * adalah BESOK: workflow ke-16 yang di-deploy tanpa gate akan lolos review dengan mudah,
 * karena tidak ada satu pun yang mengeluh. Gerbang inilah yang mengeluh.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * ATURANNYA
 * ────────────────────────────────────────────────────────────────────────────────────────
 * Sebuah workflow WAJIB punya penjaga aktor kalau ia:
 *   (a) mereferensikan `secrets.` di luar komentar  — ia memegang kredensial; ATAU
 *   (b) memuat kata kunci deploy (`wrangler`, `deploy*`, `publish*`) di luar komentar —
 *       ia berpotensi mengubah infrastruktur.
 *
 * "Punya penjaga aktor" berarti: ada `if:` PADA TINGKAT JOB yang membandingkan
 * `github.actor` dengan login owner. Ini sengaja ketat pada dua sisi:
 *   - `env: ACTOR: ${{ github.actor }}` (master-authority-guard.yml:23) BUKAN penjaga; ia
 *     hanya membaca nama aktor untuk dilaporkan. Menghitungnya sebagai gate akan membuat
 *     gerbang ini hijau justru pada berkas yang paling mudah salah paham.
 *   - `if:` pada tingkat STEP juga bukan penjaga: langkah lain di job yang sama sudah
 *     berjalan (checkout, setup, dan step apa pun tanpa `if:`), dan gate yang bisa dilewati
 *     dengan menambah satu step bukan gate.
 *
 * Kalau sebuah workflow terjaring aturan (a)/(b) tetapi memang tidak butuh gate, ia harus
 * masuk `ALLOWLIST` di bawah DENGAN ALASAN tertulis per berkas. Allowlist tanpa alasan =
 * FAIL, dan entri allowlist yang basi (berkas hilang, atau berkas itu ternyata sudah punya
 * gate / sudah tidak terjaring) juga FAIL — supaya allowlist tidak berubah menjadi tempat
 * sampah yang menua tanpa ada yang tahu.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const WORKFLOW_DIR = path.join(root, '.github', 'workflows');

/**
 * Login owner. Bukan pilihan gerbang ini — ini yang SUDAH dipakai empat workflow di repo
 * (deploy-core-worker.yml:17, configure-core.yml:12, push-reminders.yml:15,
 * audio-prerender-cf.yml:55) dan cocok dengan subdomain produksi `fitrajft.workers.dev`
 * (audio/manifest.json:5). Governance-nya di MASTER-ONLY-GOVERNANCE.md.
 */
// m025-176: username lama 'FIEZEL-APPS' sudah diganti menjadi 'FIEZEL-APPS' oleh pemilik.
const OWNER_LOGIN = 'FIEZEL-APPS';

/** Kata kunci yang menandai "workflow ini bisa mengubah infrastruktur". */
const DEPLOY_PATTERNS = [
  /\bwrangler\b/i,
  /\bdeploy(s|ed|ing|ment|ments)?\b/i,
  /\bpublish(es|ed|ing)?\b/i
];

/**
 * ALLOWLIST — workflow yang TERJARING aturan (a)/(b) tetapi sah tanpa penjaga aktor.
 *
 * Setiap entri wajib menyebut (1) kenapa ia terjaring, dan (2) kenapa gate tidak menutup
 * risiko apa pun di berkas itu. Kalau alasan kedua tidak bisa ditulis dengan jujur, berkasnya
 * butuh gate — bukan entri di sini.
 *
 * Catatan bentuk: allowlist ini HANYA boleh memaafkan berkas yang terjaring karena kata
 * kunci deploy. Berkas yang benar-benar mereferensikan `secrets.` tidak bisa di-allowlist
 * (lihat pemeriksaan "allowlist tidak memaafkan pemegang secrets" di bawah) — memegang
 * kredensial owner tanpa gate tidak punya pembenaran yang bisa saya bayangkan, dan kalau
 * suatu hari ada, ia harus melewati diskusi manusia, bukan satu baris di berkas ini.
 */
const ALLOWLIST = {
  'a6-a7-verifiers.yml':
    'Terjaring hanya karena kata "deploy" muncul di dalam teks pesan galat verifier ' +
    '(mis. "product deploy must increment Diagnostics"). Berkas ini nol referensi `secrets.`, ' +
    'dipicu `pull_request` saja, `permissions` baca, dan seluruh isinya membaca berkas repo ' +
    'lalu membandingkan angka. Ia tidak memanggil satu pun API pihak ketiga. Memberinya gate ' +
    'aktor justru MERUSAK fungsinya: verifier PR harus jalan untuk PR siapa pun — kalau ia ' +
    'hanya jalan untuk owner, kontribusi luar tidak pernah diverifikasi.',
  'quality.yml':
    'Terjaring karena F5 menambahkan workflow_dispatch beserta langkah-langkah live yang ' +
    'membaca secrets.FIEZEL_STAGING_EDGE. Penjaga aktor tingkat JOB dilarang di sini: quality.yml ' +
    'adalah gerbang mutu untuk SETIAP push dan SETIAP PR, jadi menggerbanginya ke satu aktor ' +
    'akan mematikan 150+ gerbang untuk kontributor lain - obatnya lebih buruk dari ' +
    'penyakitnya. Yang dijaga adalah TIGA langkah live-nya (cf-live, staging-live, dan ' +
    'ai-live-verify yang membelanjakan jatah neuron akun), masing-masing dengan penjaga ' +
    'aktor pada tingkat LANGKAH, dan itu TIDAK dipercaya dari alasan ini: cek (H) ' +
    'memverifikasinya di sumber, jadi mencabut penjaga langkah tetap memerahkan gerbang ini.',
  'a9-a14-autonomous-guardians.yml':
    'Sama persis: kata "deploy" hanya ada di dalam satu `echo` yang menjelaskan bahwa A14 ' +
    '"never grants merge/deploy authority". Nol `secrets.`, `pull_request` saja, reviewer ' +
    'deterministik baca-saja. Gate aktor akan membuat penjaga PR berhenti menjaga PR orang lain.'
};


/* CEK (H) — allowlist BUKAN surat bebas.
 *
 * Entri allowlist sebelumnya hanya berupa kalimat; tidak ada yang memeriksa apakah
 * alasannya masih benar. Untuk `quality.yml` alasannya bergantung pada satu fakta yang bisa
 * hilang dalam satu suntingan: dua langkah live-nya punya penjaga aktor tingkat LANGKAH.
 * Jadi fakta itu diverifikasi di sumber, bukan dipercaya dari prosa. Kalau seseorang
 * mencabut `if:` dari langkah live, gerbang ini merah walau berkasnya ber-allowlist.
 */
function periksaPenjagaLangkah(file, source, checkFn) {
  const perluPenjaga = [];
  const blokLangkah = source.split(/^      - name: /m).slice(1);
  for (const blok of blokLangkah) {
    const nama = (blok.split('\n')[0] || '').replace(/^'|'$/g, '').slice(0, 70);
    const sentuhSecret = /secrets\./.test(blok);
    // `ai-live-verify.mjs` masuk daftar ini karena ia bukan hanya menembak sistem hidup, ia
    // MEMBELANJAKAN jatah neuron akun: satu panggilan model per tipe task. Tanpa namanya di
    // sini, langkah termahal di seluruh workflow justru satu-satunya yang penjaganya tidak
    // pernah diverifikasi.
    const sentuhLive = /(cf-live-contract-test|staging-live-test)\.js|ai-live-verify\.mjs/.test(blok);
    if (!sentuhSecret && !sentuhLive) continue;
    const berpenjaga = /if:\s*github\.event_name\s*==\s*'workflow_dispatch'\s*&&\s*github\.actor\s*==/.test(blok);
    perluPenjaga.push({ nama, berpenjaga });
  }
  checkFn(
    'H ' + file + ': setiap langkah bersecret/live punya penjaga aktor tingkat langkah',
    perluPenjaga.length > 0 && perluPenjaga.every((x) => x.berpenjaga),
    perluPenjaga.length === 0
      ? 'TIDAK ADA langkah bersecret/live yang terdeteksi — alasan allowlist jadi tak terverifikasi'
      : perluPenjaga.map((x) => (x.berpenjaga ? '[ok] ' : '[TANPA PENJAGA] ') + x.nama).join(' | ')
  );
}

/* ============================================================ pelaporan ================ */

const checks = [];
let failed = false;

function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details === undefined ? '' : String(details) });
  if (!ok) failed = true;
}

function finish(extra) {
  const report = {
    schema: 'fiezel-workflow-actor-gate-v1',
    pass: !failed,
    ownerLogin: OWNER_LOGIN,
    counts: {
      pass: checks.filter((c) => c.status === 'PASS').length,
      fail: checks.filter((c) => c.status === 'FAIL').length
    },
    ...extra,
    checks
  };
  fs.writeFileSync(
    path.join(root, 'WORKFLOW-ACTOR-GATE-REPORT.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

/* ============================================================ pembacaan berkas ========= */

/**
 * Baris komentar dibuang sebelum klasifikasi. Ini bukan kerapian: `audio-generate.yml:54-62`
 * dan `cf-a2` sendiri MENYEBUT nama secret di dalam komentar untuk menjelaskan risikonya.
 * Menghitung komentar sebagai "memegang secret" akan menjaring berkas hanya karena ia
 * mendokumentasikan dirinya dengan baik — insentif yang salah arah.
 *
 * Komentar di ujung baris (`run: node x  # deploy`) sengaja TIDAK dibuang: memisahkan `#`
 * komentar dari `#` di dalam string shell butuh parser YAML+shell utuh, dan salah-potong di
 * situ berarti gerbang bisa melewatkan `wrangler deploy` sungguhan. Terjaring-berlebih lalu
 * dijelaskan di allowlist jauh lebih murah daripada terlewat.
 */
function stripCommentLines(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

/**
 * Menelusuri blok `jobs:` dan mengembalikan { jobs, ifs }: nama setiap job, dan setiap kunci
 * `if:` yang merupakan anak LANGSUNG sebuah job.
 *
 * Bukan parser YAML utuh — hanya pelacak indentasi, yang cukup karena satu-satunya hal yang
 * dicari adalah dua bentuk di atas. Blok skalar (`if: >`) ikut ditangani dengan menggabungkan
 * baris lanjutan yang indentasinya lebih dalam.
 *
 * Menghitung job HARUS lewat penelusuran ini, bukan dengan menyapu seluruh berkas mencari
 * kunci berindentasi dua spasi: `on: { push:, pull_request: }` dan `permissions:` juga
 * berindentasi dua spasi, dan menghitungnya sebagai job membuat setiap workflow tampak punya
 * job tanpa gate. Percobaan pertama gerbang ini melakukan tepat itu dan merah pada keenam
 * berkas yang sebenarnya sudah benar.
 */
function walkJobs(text) {
  const lines = text.split('\n');
  const found = [];
  const jobs = [];

  let jobsIndent = null;   // indentasi kunci `jobs:`
  let jobKeyIndent = null; // indentasi nama-nama job
  let inJobs = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*#/.test(line) || line.trim() === '') continue;
    const indent = line.length - line.trimStart().length;

    if (!inJobs) {
      if (/^jobs\s*:\s*$/.test(line)) {
        inJobs = true;
        jobsIndent = indent;
      }
      continue;
    }

    // Kunci top-level lain setelah `jobs:` mengakhiri blok jobs.
    if (indent <= jobsIndent && /^\S/.test(line)) break;

    if (jobKeyIndent === null && indent > jobsIndent) jobKeyIndent = indent;

    if (indent === jobKeyIndent) {
      const jobName = /^\s*([A-Za-z0-9_-]+)\s*:\s*$/.exec(line);
      if (jobName) jobs.push(jobName[1]);
      continue;
    }
    if (indent !== jobKeyIndent + 2) continue; // bukan anak langsung sebuah job

    const m = /^\s*if\s*:\s*(.*)$/.exec(line);
    if (!m) continue;

    let value = m[1];
    // Blok skalar / lanjutan multi-baris.
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (next.trim() === '') continue;
      const nextIndent = next.length - next.trimStart().length;
      if (nextIndent <= indent) break;
      value += ' ' + next.trim();
    }
    found.push({ line: i + 1, value: value.trim() });
  }

  return { jobs, ifs: found };
}

/* ============================================================ gerbang ================== */

const ACTOR_COMPARE = /github\.actor\s*==\s*'([^']+)'/;

(function main() {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    check('.github/workflows/ ada', false, WORKFLOW_DIR);
    finish({ workflows: [] });
    return;
  }

  const files = fs.readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.yml')).sort();
  check('ada workflow untuk dipindai', files.length > 0, files.length + ' berkas .yml');

  const rows = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
    const body = stripCommentLines(raw);

    const secretNames = Array.from(new Set(
      (body.match(/secrets\.[A-Za-z0-9_]+/g) || []).map((s) => s.slice('secrets.'.length))
    )).sort();

    const deployHits = DEPLOY_PATTERNS
      .filter((re) => re.test(body))
      .map((re) => String(re));

    const usesSecrets = secretNames.length > 0;
    const looksLikeDeploy = deployHits.length > 0;
    const needsGate = usesSecrets || looksLikeDeploy;

    const walked = walkJobs(raw);
    const gateIfs = walked.ifs.filter((entry) => ACTOR_COMPARE.test(entry.value));
    const logins = Array.from(new Set(gateIfs.map((entry) => ACTOR_COMPARE.exec(entry.value)[1])));
    const hasGate = gateIfs.length > 0;

    // Jumlah job, supaya gate yang hanya menutup SEBAGIAN job tidak lolos sebagai "punya gate".
    const jobCount = walked.jobs.length;

    const allowReason = Object.prototype.hasOwnProperty.call(ALLOWLIST, file)
      ? ALLOWLIST[file]
      : null;

    rows.push({
      file,
      usesSecrets,
      secretNames,
      looksLikeDeploy,
      needsGate,
      hasGate,
      gateLogins: logins,
      gateLines: gateIfs.map((entry) => entry.line),
      jobs: walked.jobs,
      jobCount,
      allowlisted: allowReason !== null,
      decision: !needsGate
        ? 'tidak terjaring — tidak butuh gate'
        : hasGate
          ? 'terjaring, punya gate aktor'
          : allowReason !== null
            ? 'terjaring, di-allowlist dengan alasan'
            : 'TERJARING TANPA GATE'
    });

    /* --- H. allowlist yang menyentuh secret WAJIB berpenjaga per-langkah ----- */
    if (allowReason !== null && (usesSecrets || /(cf-live-contract-test|staging-live-test)\.js/.test(body))) {
      periksaPenjagaLangkah(file, body, check);
    }

    /* --- A. aturan utama ---------------------------------------------------- */
    if (needsGate && !hasGate) {
      check(
        'A ' + file + ' punya penjaga aktor atau ada di allowlist',
        allowReason !== null,
        'terjaring karena ' +
          (usesSecrets ? 'secrets: ' + secretNames.join(', ') : '') +
          (usesSecrets && looksLikeDeploy ? ' + ' : '') +
          (looksLikeDeploy ? 'kata kunci deploy' : '') +
          '. Tambahkan `if: ' +
          "github.event_name == 'workflow_dispatch' && github.actor == '" + OWNER_LOGIN + "'" +
          '` pada tingkat job (pola deploy-core-worker.yml:17), atau daftarkan berkas ini di ' +
          'ALLOWLIST workflow-actor-gate-test.js dengan alasan.'
      );
    } else if (needsGate) {
      check(
        'A ' + file + ' punya penjaga aktor atau ada di allowlist',
        true,
        hasGate
          ? 'gate di baris ' + gateIfs.map((e) => e.line).join(', ')
          : 'allowlist'
      );
    }

    /* --- B. gate memakai login owner, bukan login lain ---------------------- */
    if (hasGate) {
      check(
        'B ' + file + ' membandingkan github.actor dengan login owner',
        logins.length === 1 && logins[0] === OWNER_LOGIN,
        'login pada gate: ' + JSON.stringify(logins)
      );
    }

    /* --- C. gate menutup SEMUA job, bukan sebagian -------------------------- */
    if (needsGate && hasGate) {
      check(
        'C ' + file + ' menutup setiap job dengan gate (bukan sebagian)',
        gateIfs.length >= jobCount,
        jobCount + ' job, ' + gateIfs.length + ' gate. Job tanpa gate di berkas pemegang ' +
          'kredensial adalah pintu belakang yang tampak tertutup.'
      );
    }

    /* --- D. allowlist tidak boleh memaafkan pemegang secrets ---------------- */
    if (allowReason !== null) {
      /* Aturan D SEMULA: "di-allowlist berarti WAJIB nol secrets". Premis itu benar untuk dua
       * entri pertama (false positive gara-gara kata "deploy"), tetapi ia melarang satu kasus
       * yang sah dan justru lebih aman: workflow yang HARUS jalan untuk semua orang (gerbang
       * mutu tiap push) sementara segelintir langkahnya memegang secret dan sudah dijaga pada
       * tingkat LANGKAH. Menolak kasus itu memaksa dua pilihan yang lebih buruk — gerbangi
       * seluruh job (150+ gerbang mati untuk kontributor lain) atau buang langkah live-nya
       * (kembali ke keadaan yang membuat "semua hijau" mengandung gerbang yang tidak menguji
       * apa pun). Jadi D sekarang tunduk pada cek H: memegang secret boleh, TAPI hanya kalau
       * SETIAP langkah bersecret/live berpenjaga aktor, dan itu diverifikasi di sumber. */
      const langkahBersecretTakBerpenjaga = usesSecrets
        ? body.split(/^      - name: /m).slice(1).filter((blok) => {
            const sentuh = /secrets\./.test(blok) || /(cf-live-contract-test|staging-live-test)\.js/.test(blok);
            if (!sentuh) return false;
            return !/if:\s*github\.event_name\s*==\s*'workflow_dispatch'\s*&&\s*github\.actor\s*==/.test(blok);
          }).length
        : 0;
      check(
        'D ' + file + ' di-allowlist: nol secrets, ATAU setiap langkah bersecret berpenjaga aktor',
        !usesSecrets || langkahBersecretTakBerpenjaga === 0,
        !usesSecrets
          ? 'nol referensi secrets'
          : langkahBersecretTakBerpenjaga === 0
            ? 'memegang ' + secretNames.join(', ') + ' tetapi SETIAP langkah bersecret/live berpenjaga aktor tingkat langkah (lihat cek H)'
            : langkahBersecretTakBerpenjaga + ' langkah memegang secret TANPA penjaga aktor — allowlist bukan tempatnya; pasang penjaga per langkah atau gate job.'
      );
      check(
        'D ' + file + ' punya alasan allowlist yang ditulis, bukan kosong',
        typeof allowReason === 'string' && allowReason.trim().length >= 80,
        'panjang alasan: ' + String(allowReason).trim().length + ' karakter'
      );
    }
  }

  /* --- E. tidak ada entri allowlist yang basi ------------------------------- */
  for (const file of Object.keys(ALLOWLIST)) {
    const row = rows.find((r) => r.file === file);
    check(
      'E entri allowlist ' + file + ' masih menunjuk berkas yang ada',
      Boolean(row),
      row ? 'ada' : 'berkas tidak ada lagi di .github/workflows/ — hapus entrinya'
    );
    if (row) {
      check(
        'E entri allowlist ' + file + ' masih diperlukan',
        row.needsGate && !row.hasGate,
        row.hasGate
          ? 'berkas ini sekarang SUDAH punya gate aktor; hapus entri allowlist-nya'
          : !row.needsGate
            ? 'berkas ini tidak lagi terjaring aturan (a)/(b); hapus entri allowlist-nya'
            : 'masih terjaring dan masih tanpa gate'
      );
    }
  }

  /* --- F. temuan cf-a2 rekomendasi #2 tertutup secara eksplisit ------------- */
  // Diperiksa dengan nama berkas, bukan hanya lewat sapuan umum di atas: dua berkas inilah
  // yang jadi isi temuan laporan, dan kalau suatu hari sapuan umumnya salah longgar,
  // pemeriksaan bernama ini yang tetap merah.
  for (const file of ['audio-deploy-worker.yml', 'audio-generate.yml']) {
    const row = rows.find((r) => r.file === file);
    check(
      'F ' + file + ' (temuan cf-a2 §(d)) bergerbang owner',
      Boolean(row && row.hasGate && row.gateLogins.length === 1 && row.gateLogins[0] === OWNER_LOGIN),
      row ? row.decision : 'berkas tidak ditemukan'
    );
  }

  /* --- G. pendaftaran gerbang di quality.yml -------------------------------- */
  const qualityPath = path.join(WORKFLOW_DIR, 'quality.yml');
  if (fs.existsSync(qualityPath)) {
    const quality = fs.readFileSync(qualityPath, 'utf8');
    check(
      'G quality.yml memanggil node workflow-actor-gate-test.js',
      quality.includes('node workflow-actor-gate-test.js'),
      'gerbang yang tidak terdaftar tidak pernah merah'
    );
  } else {
    check('G quality.yml ada', false, qualityPath);
  }

  finish({
    scanned: rows.length,
    ungated: rows.filter((r) => r.decision === 'TERJARING TANPA GATE').map((r) => r.file),
    workflows: rows
  });
})();
