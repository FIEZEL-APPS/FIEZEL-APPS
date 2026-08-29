/**
 * social-api-contract-test.js — GERBANG kontrak lapisan SOSIAL (`workers/api/route-social.js`).
 *
 * Node murni, nol dependency, nol jaringan. Worker SUNGGUHAN dijalankan lewat
 * `tools/cf-worker-boot.js` (mesin D1/KV/R2 palsu yang sama dengan cf-wiring-test),
 * jadi yang diuji adalah jalur produksi: mw-edge -> mw-guard -> mw-identity ->
 * route-social, bukan handler yang dipanggil telanjang.
 *
 * Yang dijamin gerbang ini:
 *   1. FAIL-CLOSED tiga lapis: fitur lahir MATI (FEATURE_SOCIAL off = 403),
 *      KV flag tak terbaca = 403, CORE_DB absen = 503, tanpa cookie = 401.
 *   2. Identitas HANYA dari cookie HMAC; body yang menitipkan userId/sub = 400.
 *   3. Profil pseudonim: aturan handle (3-20 a-z0-9_, blocklist, anti deret
 *      digit), keunikan case-insensitive atomik, availability tanpa oracle.
 *   4. Undangan: server-minted, TTL 7 hari, SINGLE-USE atomik, maks 3 aktif,
 *      SATU galat generik untuk semua sebab kode (anti-oracle), pertemanan
 *      dua arah, kode sendiri ditolak.
 *   5. Sorakan: 6 stiker enum tertutup, NOL teks bebas, 5/hari/teman, hanya ke
 *      teman; "tidak ada" dan "bukan teman" dijawab identik.
 *   6. Poin Bukti: PB dihitung SERVER dari tabel beku; cap harian/mingguan
 *      atomik; count klien di-clamp; jti anti-replay; hari masa depan/basi/
 *      pekan lain dibuang DIAM-DIAM; batch/hari dibatasi; presence granularitas
 *      HARI (nol jam di respons).
 *   7. Papan: teman default, liga opt-in, kohor <=20 dan disembunyikan bila <3,
 *      opt-out melenyapkan baris seketika (PB pribadi tetap terlihat sendiri).
 *   8. Nol kunci PII (termasuk `username`, `sub`, `userId`) di SEMUA respons sosial.
 *   9. Skema runtime: rute bekerja TANPA migrasi 0006 diterapkan lebih dulu
 *      (ensureSocialSchema), DAN tetap benar bila migrasi sudah diterapkan.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const boot = require('./tools/cf-worker-boot.js');
const H = boot.harness;

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

/** KV flag yang menyalakan sosial (tiga sakelar AND; var di `vars`). */
const SOCIAL_FLAGS_ON = JSON.stringify({
  flags: { cfSocialEnabled: true },
  enabled: { social: true }
});

const SOCIAL_VARS = { FEATURE_SOCIAL: 'on' };

/** Semua body respons sosial yang terkumpul, untuk pemindaian PII menyeluruh. */
const socialBodies = [];

async function callSocial(app, method, pathname, opt = {}) {
  const r = await app.call(method, pathname, opt);
  if (r.json) socialBodies.push({ pathname, json: r.json });
  return r;
}

/* Kunci yang DILARANG muncul di respons sosial. `username` ada di
 * PII_FORBIDDEN_KEYS schema.js; `sub`/`userId` adalah identitas internal yang
 * tidak boleh bocor lewat papan/daftar teman. */
const PII_KEYS = [
  'name', 'learnerName', 'userName', 'username', 'email', 'ip', 'ipAddress',
  'userAgent', 'ua', 'lat', 'lon', 'location', 'puterUuid', 'uuid', 'password',
  'secret', 'token', 'prompt', 'transcript', 'answer', 'answers', 'ref',
  'legacyRef', 'sub', 'userId', 'user_id', 'account_id', 'accountId'
];
function scanForPii(value, trail, hits) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((v, i) => scanForPii(v, trail + '[' + i + ']', hits)); return; }
  for (const [key, child] of Object.entries(value)) {
    if (PII_KEYS.includes(key)) hits.push(trail + '.' + key);
    scanForPii(child, trail + '.' + key, hits);
  }
}

/** Boot ber-sosial-AKTIF. `withMigration` = terapkan 0006 lebih dulu (jalur owner). */
async function bootSocial(worker, options = {}) {
  const app = boot.bootWorker(worker, {
    clockIso: options.clockIso,
    kvEntries: { 'cfg:flags': SOCIAL_FLAGS_ON },
    vars: Object.assign({}, SOCIAL_VARS, options.vars || {})
  });
  await boot.prepareDb(app); // 0001_identity + 0001_quota + 0005 + 0002(stats)
  if (options.withMigration) await boot.applyMigration(app.core, 'migrations/0006_social.sql');
  return app;
}

async function makeProfile(app, handle, extra = {}) {
  const cookie = await app.issueIdentity();
  const r = await callSocial(app, 'POST', '/api/social/profile/create', {
    body: Object.assign({ handle }, extra), cookie
  });
  if (r.status !== 201) throw new Error('gagal membuat profil uji ' + handle + ': ' + r.status + ' ' + r.text);
  return { cookie, handle: r.json.profile.handle };
}

async function befriend(app, inviter, redeemer) {
  const mint = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: inviter.cookie });
  if (mint.status !== 200) throw new Error('gagal mint kode uji: ' + mint.status + ' ' + mint.text);
  const redeem = await callSocial(app, 'POST', '/api/social/friends/redeem', {
    body: { code: mint.json.code }, cookie: redeemer.cookie
  });
  if (redeem.status !== 200) throw new Error('gagal redeem kode uji: ' + redeem.status + ' ' + redeem.text);
  return redeem;
}

function evidenceBody(jti, day, events) {
  return { jti, day, events };
}

(async () => {
  const worker = await boot.loadWorker();
  assert(worker && typeof worker.fetch === 'function', 'Worker mengekspor default.fetch');

  /* ---------- 1. Gerbang flag: fitur LAHIR MATI, fail-closed ---------------- */
  {
    // (a) FEATURE_SOCIAL tidak dipasang (default produksi) walau KV menyala.
    const app = boot.bootWorker(worker, { kvEntries: { 'cfg:flags': SOCIAL_FLAGS_ON } });
    await boot.prepareDb(app);
    const cookie = await app.issueIdentity();
    const r = await app.call('GET', '/api/social/profile/me', { cookie });
    assert(r.status === 403 && r.json && r.json.error === 'social_disabled',
      'FEATURE_SOCIAL absen => 403 social_disabled (fitur lahir MATI), dapat ' + r.status);

    // (b) var on tetapi KV tidak memuat kunci sosial => tolak (AND, bukan OR).
    const app2 = boot.bootWorker(worker, { vars: SOCIAL_VARS }); // FLAGS_ALL_ON tanpa social
    await boot.prepareDb(app2);
    const c2 = await app2.issueIdentity();
    const r2 = await app2.call('GET', '/api/social/profile/me', { cookie: c2 });
    assert(r2.status === 403 && r2.json.error === 'social_disabled',
      'KV tanpa kunci social => 403 (tiga sakelar AND), dapat ' + r2.status);

    // (c) KV KOSONG (flag tidak terbaca) => tolak. Flag yang tak terbaca bukan izin.
    const app3 = boot.bootWorker(worker, { vars: SOCIAL_VARS, kvEntries: null });
    await boot.prepareDb(app3);
    const c3 = await app3.issueIdentity();
    const r3 = await app3.call('GET', '/api/social/profile/me', { cookie: c3 });
    assert(r3.status === 403 && r3.json.error === 'social_disabled',
      'KV kosong => 403 fail-closed, dapat ' + r3.status);
  }

  /* ---------- 2. 401 tanpa cookie; 503 tanpa CORE_DB (fail-closed) ---------- */
  {
    const app = await bootSocial(worker);
    for (const [method, pathname, body] of [
      ['GET', '/api/social/profile/me', undefined],
      ['POST', '/api/social/profile/create', { handle: 'tanpa_cookie' }],
      ['POST', '/api/social/rank/evidence', evidenceBody('jti-anon-001', '2026-08-27', [{ kind: 'meaningful_day' }])],
      ['GET', '/api/social/rank/board/friends', undefined],
      ['POST', '/api/social/cheer', { handle: 'x', sticker: 'clap' }]
    ]) {
      const r = await app.call(method, pathname, { body });
      assert(r.status === 401 && r.json && r.json.error === 'unauthenticated',
        method + ' ' + pathname + ' tanpa cookie = 401 generik, dapat ' + r.status);
    }
    // 401 mendahului 403: identitas dulu, baru flag (urutan wrapMetered).
    const appOff = boot.bootWorker(worker, { kvEntries: { 'cfg:flags': SOCIAL_FLAGS_ON } });
    await boot.prepareDb(appOff);
    const rOrder = await appOff.call('GET', '/api/social/profile/me', {});
    assert(rOrder.status === 401, 'tanpa cookie DAN flag mati => tetap 401 dulu, dapat ' + rOrder.status);

    const cookie = await app.issueIdentity();
    const brokenEnv = Object.assign(Object.create(null), app.env, { CORE_DB: null, DB: null });
    const req = new Request('https://api.fiezel.my.id/api/social/profile/me', {
      method: 'GET',
      headers: { origin: boot.ORIGIN, cookie }
    });
    const res = await worker.fetch(req, brokenEnv, H.fakeExecutionContext());
    assert(res.status === 503, 'CORE_DB absen => 503 fail-closed (belajar tak terganggu), dapat ' + res.status);
  }

  /* ---------- 3. Profil: handle pseudonim + keunikan + anti-PII ------------- */
  const app = await bootSocial(worker); // TANPA 0006: membuktikan ensureSocialSchema
  let alice; let bob; let carol;
  {
    const cookie = await app.issueIdentity();
    // Availability sebelum dibuat.
    const avail = await callSocial(app, 'POST', '/api/social/profile/check', {
      body: { handle: 'rida_belajar' }, cookie
    });
    assert(avail.status === 200 && avail.json.available === true, 'handle bebas => available:true');

    // Handle tidak sah: SEMUA 400 schema_invalid pada create (tanpa detail sebab).
    for (const bad of [
      'ab',                    // terlalu pendek
      'a'.repeat(21),          // terlalu panjang
      '1abc',                  // huruf pertama bukan alfabet
      'ab__cd',                // __ dilarang
      'abc_',                  // akhiran _
      'ab.cd',                 // karakter di luar a-z0-9_
      'Fiezel_Fan',            // blocklist peniruan (di-lowercase dulu)
      'admin_kelas',           // blocklist
      'agent12345678',         // deret >= 6 digit (pola nomor HP)
      'bangsat_99'             // kata kasar
    ]) {
      const r = await callSocial(app, 'POST', '/api/social/profile/create', { body: { handle: bad }, cookie });
      assert(r.status === 400 && r.json.error === 'schema_invalid',
        'handle tidak sah "' + bad + '" => 400 schema_invalid, dapat ' + r.status + ' ' + (r.json && r.json.error));
      const c = await callSocial(app, 'POST', '/api/social/profile/check', { body: { handle: bad }, cookie });
      assert(c.status === 200 && c.json.available === false,
        'availability handle tidak sah "' + bad + '" => available:false (anti-oracle format)');
    }

    // Field asing = 400 (deny-by-default; klien tidak bisa menitipkan identitas).
    const injected = await callSocial(app, 'POST', '/api/social/profile/create', {
      body: { handle: 'rida_belajar', userId: 'punya-orang', sub: 'x' }, cookie
    });
    assert(injected.status === 400, 'body dengan userId/sub asing DITOLAK 400, dapat ' + injected.status);

    // Display name kotor ditolak.
    for (const badName of ['http://spam.id', 'hub 081234567890', 'aku@mail.id', 'x'.repeat(21)]) {
      const r = await callSocial(app, 'POST', '/api/social/profile/create', {
        body: { handle: 'rida_belajar', displayName: badName }, cookie
      });
      assert(r.status === 400, 'displayName "' + badName.slice(0, 20) + '" ditolak 400, dapat ' + r.status);
    }

    // Sukses: input campur huruf besar DISIMPAN lowercase; default flag aman.
    const created = await callSocial(app, 'POST', '/api/social/profile/create', {
      body: { handle: 'Rida_Belajar9', displayName: 'Rida', avatarId: 3 }, cookie
    });
    assert(created.status === 201, 'profil sah => 201, dapat ' + created.status + ' ' + created.text);
    assert(created.json.profile.handle === 'rida_belajar9', 'handle disimpan lowercase (unik case-insensitive)');
    assert(created.json.profile.flags.friendsVisible === true &&
      created.json.profile.flags.leagueOptIn === false &&
      created.json.profile.flags.boardHidden === false,
      'default privasi AMAN: friendsVisible on, liga opt-IN off, papan tampil');
    alice = { cookie, handle: 'rida_belajar9' };

    // Profil kedua untuk sub yang sama = 409 profile_exists.
    const again = await callSocial(app, 'POST', '/api/social/profile/create', {
      body: { handle: 'rida_kedua' }, cookie
    });
    assert(again.status === 409 && again.json.error === 'profile_exists', 'sub yang sama tidak bisa punya dua profil');

    // Handle terpakai (case-insensitive) => 409 handle_taken; availability false.
    const other = await app.issueIdentity();
    const taken = await callSocial(app, 'POST', '/api/social/profile/create', {
      body: { handle: 'RIDA_BELAJAR9' }, cookie: other
    });
    assert(taken.status === 409 && taken.json.error === 'handle_taken', 'handle terpakai => 409 handle_taken');
    const checkTaken = await callSocial(app, 'POST', '/api/social/profile/check', {
      body: { handle: 'RIDA_belajar9' }, cookie: other
    });
    assert(checkTaken.json.available === false, 'availability handle terpakai => false');

    // GET /me: profil ada; identitas dari cookie, bukan dari mana pun di body.
    const me = await callSocial(app, 'GET', '/api/social/profile/me', { cookie });
    assert(me.status === 200 && me.json.profile.handle === 'rida_belajar9', '/profile/me membaca profil dari cookie');
    const noProfile = await callSocial(app, 'GET', '/api/social/profile/me', { cookie: other });
    assert(noProfile.status === 404 && noProfile.json.error === 'profile_required',
      'identitas tanpa profil => 404 profile_required');
  }

  /* ---------- 4. Undangan: single-use, TTL, anti-oracle, dua arah ----------- */
  {
    bob = await makeProfile(app, 'bob_rajin');
    const noProfileCookie = await app.issueIdentity();

    // Tanpa profil tidak bisa mengundang.
    const early = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: noProfileCookie });
    assert(early.status === 404 && early.json.error === 'profile_required', 'mint kode butuh profil');

    const mint = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: alice.cookie });
    assert(mint.status === 200 && typeof mint.json.code === 'string', 'mint kode => 200 {code}');
    assert(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/.test(mint.json.code),
      'kode 8 char Crockford base32 tanpa 0/O/1/I, dapat ' + mint.json.code);
    assert(mint.json.expiresDay === '2026-09-03', 'TTL kode = 7 hari WIB, dapat ' + mint.json.expiresDay);
    assert(mint.json.singleUse === true, 'kode dinyatakan single-use');

    // Kode sendiri ditolak dengan galat generik.
    const selfRedeem = await callSocial(app, 'POST', '/api/social/friends/redeem', {
      body: { code: mint.json.code }, cookie: alice.cookie
    });
    assert(selfRedeem.status === 400 && selfRedeem.json.error === 'code_invalid', 'redeem kode sendiri => code_invalid');

    // Redeem sah: pertemanan DUA ARAH.
    const redeem = await callSocial(app, 'POST', '/api/social/friends/redeem', {
      body: { code: mint.json.code.toLowerCase() }, cookie: bob.cookie
    });
    assert(redeem.status === 200 && redeem.json.friend.handle === 'rida_belajar9',
      'redeem sah => 200 {friend.handle pengundang} (input kode case-insensitive)');
    const aliceList = await callSocial(app, 'GET', '/api/social/friends', { cookie: alice.cookie });
    const bobList = await callSocial(app, 'GET', '/api/social/friends', { cookie: bob.cookie });
    assert(aliceList.json.friends.some((f) => f.handle === 'bob_rajin') &&
      bobList.json.friends.some((f) => f.handle === 'rida_belajar9'),
      'pertemanan tercatat DUA ARAH otomatis');

    // SINGLE-USE: pemakaian kedua atas kode yang sama = galat generik yang sama.
    const third = await makeProfile(app, 'cindy_baca');
    const replay = await callSocial(app, 'POST', '/api/social/friends/redeem', {
      body: { code: mint.json.code }, cookie: third.cookie
    });
    assert(replay.status === 400 && replay.json.error === 'code_invalid', 'kode SINGLE-USE: pemakaian kedua ditolak');

    // Kode sampah + kode kedaluwarsa => body IDENTIK (anti-oracle).
    const garbage = await callSocial(app, 'POST', '/api/social/friends/redeem', {
      body: { code: 'AAAA9999' }, cookie: bob.cookie
    });
    const malformed = await callSocial(app, 'POST', '/api/social/friends/redeem', {
      body: { code: '!!nope!!' }, cookie: bob.cookie
    });
    const mint2 = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: alice.cookie });
    const dayBefore = app.env.TEST_CLOCK_MS;
    app.env.TEST_CLOCK_MS = String(Number(dayBefore) + 8 * 86400000); // maju 8 hari > TTL
    const expired = await callSocial(app, 'POST', '/api/social/friends/redeem', {
      body: { code: mint2.json.code }, cookie: third.cookie
    });
    app.env.TEST_CLOCK_MS = dayBefore;
    const bodies401 = [selfRedeem, replay, garbage, malformed, expired].map((r) => JSON.stringify(r.json));
    assert(new Set(bodies401).size === 1 && expired.status === 400,
      'SEMUA penolakan kode (sendiri/replay/sampah/salah bentuk/kedaluwarsa) memakai body identik');

    // Maks 3 kode aktif. (mint2 masih aktif => tinggal 2 slot.)
    const m3 = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: alice.cookie });
    const m4 = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: alice.cookie });
    assert(m3.status === 200 && m4.status === 200, 'kode aktif ke-2 dan ke-3 masih boleh');
    const m5 = await callSocial(app, 'POST', '/api/social/friends/invite', { body: {}, cookie: alice.cookie });
    assert(m5.status === 409 && m5.json.error === 'limit_reached', 'kode aktif ke-4 ditolak 409 limit_reached');
  }

  /* ---------- 5. Evidence -> PB: cap beku, clamp, anti-replay, hari server --- */
  {
    // Batch pertama Alice: hari bermakna + ring penuh = 10 + 15 = 25 PB.
    const b1 = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0001', '2026-08-27', [
        { kind: 'meaningful_day' }, { kind: 'daily_target' }
      ]),
      cookie: alice.cookie
    });
    assert(b1.status === 200 && b1.json.accepted === 25 && b1.json.pbWeek === 25,
      'PB dihitung SERVER dari tabel beku: meaningful(10)+target(15)=25, dapat ' + JSON.stringify(b1.json));
    assert(b1.json.week === '2026-08-24', 'kunci pekan = Senin WIB, dapat ' + b1.json.week);

    // Replay jti yang sama = DIBUANG DIAM-DIAM (bentuk sama, accepted 0).
    const replay = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0001', '2026-08-27', [{ kind: 'daily_target' }]),
      cookie: alice.cookie
    });
    assert(replay.status === 200 && replay.json.accepted === 0 && replay.json.pbWeek === 25,
      'replay jti => accepted:0, pbWeek tidak bergerak (anti-replay)');

    // Cap yang sudah penuh tidak bisa diisi lagi hari yang sama.
    const again = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0002', '2026-08-27', [{ kind: 'meaningful_day' }, { kind: 'daily_target' }]),
      cookie: alice.cookie
    });
    assert(again.json.accepted === 0 && again.json.pbWeek === 25,
      'cap 1x/hari: mengirim ulang event yang sama = 0 PB');

    // count dari klien DI-CLAMP: srs_review count 25 -> 20 (cap harian) = 40 PB.
    const srs = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0003', '2026-08-27', [{ kind: 'srs_review', count: 25 }]),
      cookie: alice.cookie
    });
    assert(srs.json.accepted === 40 && srs.json.pbWeek === 65,
      'srs_review count 25 di-clamp ke cap 20 => +40 PB, dapat ' + JSON.stringify(srs.json));
    const srs2 = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0004', '2026-08-27', [{ kind: 'srs_review', count: 5 }]),
      cookie: alice.cookie
    });
    assert(srs2.json.accepted === 0, 'cap srs 20/hari sudah penuh => 0');

    // lesson_mastered count 99 => clamp 20 lalu cap 3 => 75 PB.
    const mastered = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0005', '2026-08-27', [{ kind: 'lesson_mastered', count: 99 }]),
      cookie: alice.cookie
    });
    assert(mastered.json.accepted === 75 && mastered.json.pbWeek === 140,
      'lesson_mastered cap 3/hari: count 99 => +75, dapat ' + JSON.stringify(mastered.json));

    // exam_passed + band enum => +150 dan chip level ter-update; band sampah diabaikan.
    const exam = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0006', '2026-08-27', [{ kind: 'exam_passed', band: 'B1' }]),
      cookie: alice.cookie
    });
    assert(exam.json.accepted === 150 && exam.json.pbWeek === 290, 'exam_passed => +150 PB');
    const meAfter = await callSocial(app, 'GET', '/api/social/profile/me', { cookie: alice.cookie });
    assert(meAfter.json.profile.band === 'B1', 'band CEFR ter-set dari event yang DITERIMA (enum)');
    assert(meAfter.json.profile.streakDays === 1, 'streak dihitung server: hari bermakna pertama = 1');

    // kind di luar enum + angka skor titipan => diabaikan; TIDAK ada jalur skor klien.
    const junk = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0007', '2026-08-27', [{ kind: 'give_me_points', count: 20 }]),
      cookie: alice.cookie
    });
    assert(junk.status === 200 && junk.json.accepted === 0, 'kind tak dikenal diabaikan sunyi');
    const cheat = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: { jti: 'jti-alice-0008', day: '2026-08-27', events: [{ kind: 'srs_review' }], pbWeek: 99999 },
      cookie: alice.cookie
    });
    assert(cheat.status === 400, 'field asing (pbWeek titipan) => 400 deny-by-default');

    // Hari masa depan & hari basi (skew > 2) dibuang diam-diam.
    const future = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0009', '2026-08-28', [{ kind: 'exam_passed' }]),
      cookie: alice.cookie
    });
    assert(future.json.accepted === 0, 'day masa depan => dibuang diam-diam');
    const stale = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0010', '2026-08-24', [{ kind: 'exam_passed' }]),
      cookie: alice.cookie
    });
    assert(stale.json.accepted === 0, 'day lebih tua dari DAY_SKEW 2 hari => dibuang diam-diam');

    // Streak beruntun & putus (jam server WIB digeser oleh harness, bukan klien).
    const t0 = app.env.TEST_CLOCK_MS;
    app.env.TEST_CLOCK_MS = String(Number(t0) + 1 * 86400000); // 2026-08-28
    const d2 = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0011', '2026-08-28', [{ kind: 'meaningful_day' }]),
      cookie: alice.cookie
    });
    assert(d2.json.accepted === 10, 'hari bermakna hari berikutnya diterima');
    const me2 = await callSocial(app, 'GET', '/api/social/profile/me', { cookie: alice.cookie });
    assert(me2.json.profile.streakDays === 2, 'streak beruntun => 2');
    app.env.TEST_CLOCK_MS = String(Number(t0) + 3 * 86400000); // 2026-08-30 (lewati 08-29)
    await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0012', '2026-08-30', [{ kind: 'meaningful_day' }]),
      cookie: alice.cookie
    });
    const me3 = await callSocial(app, 'GET', '/api/social/profile/me', { cookie: alice.cookie });
    assert(me3.json.profile.streakDays === 1, 'satu hari bolong => streak kembali 1 (server yang menghitung)');
    app.env.TEST_CLOCK_MS = t0;

    // Tanpa profil => 404; cap byte 8KB => 413 SEBELUM routing.
    const naked = await app.issueIdentity();
    const noProf = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-naked-01', '2026-08-27', [{ kind: 'meaningful_day' }]), cookie: naked
    });
    assert(noProf.status === 404 && noProf.json.error === 'profile_required', 'evidence butuh profil');
    const fat = await app.call('POST', '/api/social/rank/evidence', {
      body: '{"jti":"x","day":"2026-08-27","events":[' + '"p",'.repeat(4000) + '"p"]}', cookie: alice.cookie
    });
    assert(fat.status === 413, 'evidence > 8KB => 413 (cap byte mw-guard), dapat ' + fat.status);
    const tooMany = await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-alice-0013', '2026-08-27',
        Array.from({ length: 21 }, () => ({ kind: 'srs_review' }))),
      cookie: alice.cookie
    });
    assert(tooMany.status === 400, 'batch > 20 event => 400, dapat ' + tooMany.status);
  }

  /* ---------- 6. Evidence pekan lalu dibuang (pergantian pekan offline) ------ */
  {
    // Jam server Senin 2026-08-31; klaim hari Minggu 2026-08-30 (skew 1 hari,
    // TETAPI pekan lalu) => dibuang: PB pekan lalu tidak bisa dicicil ke pekan baru.
    const appMon = await bootSocial(worker, { clockIso: '2026-08-31T03:00:00.000Z' });
    const u = await makeProfile(appMon, 'senin_pagi');
    const r = await callSocial(appMon, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-senin-001', '2026-08-30', [{ kind: 'meaningful_day' }]), cookie: u.cookie
    });
    assert(r.status === 200 && r.json.accepted === 0 && r.json.week === '2026-08-31',
      'day pekan lalu (walau dalam skew) => dibuang diam-diam, pekan berjalan ' + r.json.week);
  }

  /* ---------- 7. Plausibility: maks 40 batch/hari --------------------------- */
  {
    const app2 = await bootSocial(worker);
    const u = await makeProfile(app2, 'rajin_sync');
    let last = null;
    for (let i = 0; i < 41; i += 1) {
      last = await app2.call('POST', '/api/social/rank/evidence', {
        body: evidenceBody('jti-flood-' + String(i).padStart(4, '0'), '2026-08-27',
          [{ kind: 'srs_review', count: 1 }]),
        cookie: u.cookie
      });
    }
    assert(last.status === 200 && last.json.accepted === 0,
      'batch ke-41 dalam sehari dibuang diam-diam (cadence skrip, bukan murid), dapat ' + JSON.stringify(last.json));
  }

  /* ---------- 8. Daftar teman: presence granularitas HARI + opt-out presence - */
  {
    carol = await makeProfile(app, 'carol_diam', { friendsVisible: false });
    // Alice sudah memakai 3 slot kode aktifnya di bagian 4 — Carol yang mengundang.
    await befriend(app, carol, alice);

    const list = await callSocial(app, 'GET', '/api/social/friends', { cookie: alice.cookie });
    assert(list.status === 200, 'GET friends 200');
    const bobRow = list.json.friends.find((f) => f.handle === 'bob_rajin');
    const carolRow = list.json.friends.find((f) => f.handle === 'carol_diam');
    assert(bobRow && bobRow.visible === true && typeof bobRow.studiedToday === 'boolean' &&
      Array.isArray(bobRow.milestones), 'kartu teman memuat sinyal belajar (hari-bermakna, milestone enum)');
    assert(carolRow && carolRow.visible === false && !('streakDays' in carolRow) &&
      !('studiedToday' in carolRow) && !('milestones' in carolRow) && !('band' in carolRow),
      'teman yang TIDAK opt-in tidak menampilkan progres apa pun — bahkan kepada teman');

    // Milestone Alice tampil di daftar teman Bob (feed 7 hari, enum + hari).
    const bobView = await callSocial(app, 'GET', '/api/social/friends', { cookie: bob.cookie });
    const aliceRow = bobView.json.friends.find((f) => f.handle === 'rida_belajar9');
    assert(aliceRow && aliceRow.milestones.some((m) => m.kind === 'exam_passed' && m.day === '2026-08-27'),
      'milestone exam_passed muncul sebagai enum {kind, day} di feed teman');
    // Jam harness sudah dikembalikan ke 2026-08-27, sedangkan hari-bermakna
    // terakhir Alice (uji streak) adalah 2026-08-30: `studiedToday` WAJIB false
    // karena ia dihitung dari hari SERVER, bukan dari klaim klien.
    assert(aliceRow.band === 'B1' && aliceRow.studiedToday === false,
      'chip level dari server; studiedToday dihitung dari hari SERVER');

    // Granularitas HARI: tidak ada satu pun jejak jam:menit di respons sosial.
    const dump = JSON.stringify([list.json, bobView.json]);
    assert(!/\d{2}:\d{2}/.test(dump), 'NOL jam:menit di respons teman (presence maksimal granularitas hari)');
  }

  /* ---------- 9. Sorakan: enum tertutup, 5/hari/teman, hanya teman ----------- */
  {
    const freeText = await callSocial(app, 'POST', '/api/social/cheer', {
      body: { handle: 'bob_rajin', sticker: 'kamu pasti bisa!' }, cookie: alice.cookie
    });
    assert(freeText.status === 400, 'stiker di luar enum (teks bebas) => 400 — tidak ada kanal teks');

    const ok = await callSocial(app, 'POST', '/api/social/cheer', {
      body: { handle: 'bob_rajin', sticker: 'fire' }, cookie: alice.cookie
    });
    assert(ok.status === 200 && ok.json.sent === true && !('pb' in ok.json) && !('gems' in ok.json),
      'sorakan terkirim TANPA imbalan poin/gem apa pun');
    for (let i = 0; i < 4; i += 1) {
      await callSocial(app, 'POST', '/api/social/cheer', {
        body: { handle: 'bob_rajin', sticker: 'clap' }, cookie: alice.cookie
      });
    }
    const sixth = await callSocial(app, 'POST', '/api/social/cheer', {
      body: { handle: 'bob_rajin', sticker: 'gem' }, cookie: alice.cookie
    });
    assert(sixth.status === 429 && sixth.json.error === 'rate_limited',
      'sorakan ke-6 untuk teman yang sama dalam sehari => 429');

    // Bukan teman vs tidak ada: DUA-DUANYA 404 dengan body identik (anti-oracle).
    const dave = await makeProfile(app, 'dave_sendiri');
    const notFriend = await callSocial(app, 'POST', '/api/social/cheer', {
      body: { handle: 'dave_sendiri', sticker: 'clap' }, cookie: alice.cookie
    });
    const ghost = await callSocial(app, 'POST', '/api/social/cheer', {
      body: { handle: 'tidak_ada_orangnya', sticker: 'clap' }, cookie: alice.cookie
    });
    assert(notFriend.status === 404 && ghost.status === 404 &&
      JSON.stringify(notFriend.json) === JSON.stringify(ghost.json),
      'bukan-teman dan tidak-ada dijawab identik 404 (anti-oracle keanggotaan)');
    void dave;

    // Penerima melihat sorakan hari ini (feed penerima; pengirim TIDAK diberi poin).
    const bobFeed = await callSocial(app, 'GET', '/api/social/friends', { cookie: bob.cookie });
    const cheer = bobFeed.json.cheersToday.find((c) => c.handle === 'rida_belajar9' && c.sticker === 'fire');
    assert(cheer && cheer.cnt === 1, 'penerima melihat sorakan {handle, sticker, cnt} hari ini');
  }

  /* ---------- 10. Papan teman + opt-out ------------------------------------- */
  {
    // Bob mengumpulkan PB supaya papan berisi dua baris bermakna.
    await callSocial(app, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-bob-0001', '2026-08-27', [{ kind: 'meaningful_day' }, { kind: 'daily_target' }]),
      cookie: bob.cookie
    });
    const board = await callSocial(app, 'GET', '/api/social/rank/board/friends', { cookie: alice.cookie });
    assert(board.status === 200 && board.json.week === '2026-08-24', 'papan teman berkunci pekan WIB');
    const handles = board.json.rows.map((r) => r.handle);
    assert(handles[0] === 'rida_belajar9' && handles.includes('bob_rajin'),
      'papan teman terurut PB menurun; aku (310) di atas bob (25); dapat ' + handles.join(','));
    // 310 = 290 (bagian 5) + 2x meaningful_day (10) dari uji streak 08-28 & 08-30
    // yang masih di pekan 2026-08-24.
    assert(board.json.me && board.json.me.rank === 1 && board.json.me.pb === 310,
      'me:{rank,pb} disertakan, dapat ' + JSON.stringify(board.json.me));
    const rowKeys = Object.keys(board.json.rows[0]).sort().join(',');
    assert(rowKeys === 'avatarId,band,handle,me,pb',
      'baris papan HANYA {handle, avatarId, band, pb, me} — tanpa jam, tanpa identitas internal; dapat ' + rowKeys);

    // Opt-out Bob: hilang SEKETIKA dari papan Alice; PB pribadi tetap terlihat sendiri.
    const opt = await callSocial(app, 'POST', '/api/social/rank/optout', {
      body: { hidden: true }, cookie: bob.cookie
    });
    assert(opt.status === 200 && opt.json.hidden === true, 'optout => 200 {hidden:true}');
    const after = await callSocial(app, 'GET', '/api/social/rank/board/friends', { cookie: alice.cookie });
    assert(!after.json.rows.some((r) => r.handle === 'bob_rajin'),
      'sesudah opt-out, bob hilang dari papan temanku SEKETIKA');
    const bobOwn = await callSocial(app, 'GET', '/api/social/rank/board/friends', { cookie: bob.cookie });
    assert(bobOwn.json.me && bobOwn.json.me.pb === 25,
      'PB pribadi TETAP terlihat oleh pemiliknya sendiri walau Mode privat');
    // Kembali tampil bila opt-in lagi.
    await callSocial(app, 'POST', '/api/social/rank/optout', { body: { hidden: false }, cookie: bob.cookie });
    const back = await callSocial(app, 'GET', '/api/social/rank/board/friends', { cookie: alice.cookie });
    assert(back.json.rows.some((r) => r.handle === 'bob_rajin'), 'optout bisa dibatalkan kapan pun');
  }

  /* ---------- 11. Liga kohor: opt-in, <=20, sembunyi bila <3 ----------------- */
  {
    const appLg = await bootSocial(worker, { withMigration: true }); // jalur migrasi resmi
    const u1 = await makeProfile(appLg, 'liga_satu', { leagueOptIn: true });
    const u2 = await makeProfile(appLg, 'liga_dua', { leagueOptIn: true });
    const u3 = await makeProfile(appLg, 'liga_tiga', { leagueOptIn: true });
    const uOut = await makeProfile(appLg, 'tidak_ikut'); // default TIDAK opt-in

    const closed = await callSocial(appLg, 'GET', '/api/social/rank/board/league', { cookie: uOut.cookie });
    assert(closed.status === 200 && closed.json.optedIn === false && closed.json.rows.length === 0,
      'tanpa opt-in liga: papan liga tidak tersedia (bukan galat)');

    const first = await callSocial(appLg, 'GET', '/api/social/rank/board/league', { cookie: u1.cookie });
    assert(first.json.optedIn === true && first.json.leagueOpen === false,
      'kohor < 3 anggota => papan liga disembunyikan (tanpa bot/ghost palsu)');
    await callSocial(appLg, 'GET', '/api/social/rank/board/league', { cookie: u2.cookie });
    // u3 mengumpulkan PB supaya urutan teruji.
    await callSocial(appLg, 'POST', '/api/social/rank/evidence', {
      body: evidenceBody('jti-liga-0001', '2026-08-27', [{ kind: 'daily_target' }]), cookie: u3.cookie
    });
    const open = await callSocial(appLg, 'GET', '/api/social/rank/board/league', { cookie: u3.cookie });
    assert(open.json.optedIn === true && open.json.leagueOpen === true && open.json.rows.length === 3,
      'kohor 3 anggota => papan liga terbuka, dapat ' + JSON.stringify(open.json).slice(0, 160));
    assert(open.json.rows.length <= 20, 'kohor tidak pernah melebihi 20 baris');
    assert(open.json.rows[0].handle === 'liga_tiga' && open.json.me.rank === 1,
      'papan liga terurut PB; pengumpul PB di peringkat 1');
  }

  /* ---------- 12. Skema runtime vs migrasi: dua jalur, satu perilaku --------- */
  {
    // `app` utama TIDAK pernah menjalankan 0006 — semua bagian di atas berjalan
    // atas ensureSocialSchema(). Sekarang buktikan idempoten: migrasi resmi
    // dijalankan MENYUSUL pada database yang sudah diisi runtime, tanpa galat
    // dan tanpa kehilangan data.
    await boot.applyMigration(app.core, 'migrations/0006_social.sql');
    const me = await callSocial(app, 'GET', '/api/social/profile/me', { cookie: alice.cookie });
    assert(me.status === 200 && me.json.profile.handle === 'rida_belajar9',
      'migrasi 0006 dijalankan menyusul = no-op idempoten (data runtime utuh)');
  }

  /* ---------- 13. NOL PII di seluruh respons sosial -------------------------- */
  {
    const hits = [];
    for (const body of socialBodies) scanForPii(body.json, body.pathname, hits);
    assert(socialBodies.length >= 60, 'pemindaian PII mencakup >= 60 respons sosial, dapat ' + socialBodies.length);
    assert(hits.length === 0, 'NOL kunci PII/identitas internal (termasuk username/sub/userId) di respons sosial; temuan: ' + hits.join(', '));
    const dump = JSON.stringify(socialBodies);
    assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(dump),
      'tidak ada UUID (sub identitas) yang bocor di respons sosial mana pun');
  }

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('social-api-contract-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('social-api-contract-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('social-api-contract-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
