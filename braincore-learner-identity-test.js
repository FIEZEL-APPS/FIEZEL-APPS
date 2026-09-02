#!/usr/bin/env node
'use strict';
/**
 * FIEZEL gerbang — lane BUKTI BELAJAR PER-MURID (`fiezel-braincore-learner-evidence-v1`).
 *
 * Yang dibuktikan, satu bab per tuntutan:
 *  A. IDENTITAS SERVER — `sub` datang dari cookie fz_id, TIDAK PERNAH dari body.
 *  B. KEPEMILIKAN      — bukti murid A tersimpan di bawah A; bukti B di bawah B.
 *  C. ISOLASI          — murid TIDAK BISA membaca bukti murid lain (rute owner 403
 *                        untuk cookie murid, dengan atau tanpa `?sub=` orang lain).
 *  D. SPOOFING         — body yang menitipkan `sub`/`userId`/`cohort` DITOLAK 400,
 *                        dan tidak menulis satu baris pun ke siapa pun.
 *  E. OWNER            — owner bisa MENDAFTAR murid, MEMILIH satu, dan membaca bukti
 *                        murid itu saja.
 *  F. PERSETUJUAN      — tanpa consent = 403 + NOL baris; mencabut = bukti DIHAPUS.
 *  G. FAIL-CLOSED      — flag mati / KV tak terbaca / tanpa identitas = tolak.
 *  H. LANE AGREGAT     — `evidence_daily`/`evidence_dedup`/`evidence_learner_day` TIDAK
 *                        berubah, dan lane anonim tetap bekerja berdampingan.
 *  I. NOL KUNCI BERSAMA— `toIdentityEvent` membuang cohort dan mengganti eventId,
 *                        sehingga dua lane tidak bisa disambungkan lewat kunci apa pun.
 *  J. MURNI            — validator/agregator lane ini diuji langsung tanpa Worker.
 *  K. NAMA LEARNER     — nama WAJIB di perkenalan, dikirim ke server, terikat
 *                        identity.sub, dan mengganti nama TIDAK memutus bukti.
 *
 * Worker dibangkitkan lengkap (D1 palsu) lewat tools/cf-worker-boot.js: gerbang yang
 * hanya menguji fungsi murni tidak akan pernah membuktikan bahwa cookie -> sub -> baris
 * benar-benar tersambung, dan itulah satu-satunya klaim yang penting di sini.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const boot = require('./tools/cf-worker-boot.js');

const ROOT = __dirname;
const checks = [];
let failed = false;
function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL' });
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ==========================================================================
 * Alat bantu
 * ========================================================================== */
const OWNER_TOKEN = 'token-owner-uji-braincore-per-murid-0123456789';
const OWNER_HASH = crypto.createHash('sha256').update(OWNER_TOKEN).digest('hex');
const CLOCK_ISO = '2026-09-01T03:00:00.000Z';
const DAY = '2026-09-01';

const FLAGS_ON = JSON.stringify({
  flags: { cfAiEnabled: true, cfTtsEnabled: true, cfSocialEnabled: true, cfLearnerEvidenceEnabled: true },
  enabled: { ai: true, tts: true, social: true, learnerEvidence: true },
});

let uuidSeq = 0;
/** UUID v4 deterministik: dua lane tidak boleh pernah kebetulan memakai id yang sama. */
function uuid() {
  uuidSeq += 1;
  const hex = uuidSeq.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

function evidencePayload(over) {
  return Object.assign({
    level: 'A2',
    masteryBucket: 'm40-60',
    masteryTrend: 'up',
    misconceptionBucket: 'mc1',
    misconceptionSkill: 'tense-past',
    difficultyCalibration: 'calibrated',
    calibrationErrorBucket: 'e0-10',
    consistencyBucket: 'c50-75',
    retentionRiskBucket: 'r30-60',
    evidenceVolumeBucket: 'n21-100',
    improvementTrend: 'improving',
  }, over || {});
}
function decisionPayload(over) {
  return Object.assign({
    level: 'A2',
    policyId: 'core-brain-v3-default',
    decision: 'weak_skill',
    outcome: 'positive',
    recommendation: 'keep_or_progress',
    masteryDeltaBucket: 'd1-10',
    adherenceBucket: 'a80-100',
  }, over || {});
}
function evEvent(over) {
  return Object.assign({ eventId: uuid(), type: 'learner_evidence', payload: evidencePayload() }, over || {});
}
function decEvent(over) {
  return Object.assign({ eventId: uuid(), type: 'braincore_decision', payload: decisionPayload() }, over || {});
}
function envelope(events, over) {
  return Object.assign({
    schema: 'fiezel-braincore-learner-evidence-v1',
    batchId: uuid(),
    day: DAY,
    events,
  }, over || {});
}

/** Boot Worker dengan lane per-murid HIDUP + migrasi 0009 + 0006 (profil sosial). */
async function bootLane(options = {}) {
  const worker = await boot.loadWorker();
  const app = boot.bootWorker(worker, {
    clockIso: CLOCK_ISO,
    kvEntries: options.kvEntries === undefined ? { 'cfg:flags': FLAGS_ON } : options.kvEntries,
    vars: Object.assign({
      FEATURE_LEARNER_EVIDENCE: 'on',
      FEATURE_SOCIAL: 'on',
      OWNER_TOKEN_HASH: OWNER_HASH,
    }, options.vars || {}),
  });
  await boot.prepareDb(app);
  await boot.applyMigration(app.core, 'migrations/0006_social.sql');
  await boot.applyMigration(app.core, 'migrations/0009_learner_evidence.sql');
  await boot.applyMigration(app.core, 'migrations/0010_learner_name.sql');
  return app;
}

const ownerHeaders = { 'x-fiezel-owner-token': OWNER_TOKEN };

/** Hitung baris `learner_evidence` per sub langsung dari D1 palsu — kebenaran terakhir. */
async function rowsFor(app, sub) {
  const res = await app.core
    .prepare('SELECT day, received_at, event, dims FROM learner_evidence WHERE sub = ?1 AND day >= ?2 AND day <= ?3 ORDER BY day ASC LIMIT ?4')
    .bind(sub, '2000-01-01', '2999-12-31', 500)
    .all();
  return (res && res.results) || [];
}

/* ==========================================================================
 * J. MURNI — validator & agregator, tanpa Worker
 * ========================================================================== */
async function babJ() {
  const core = await boot.importApiModule('evidence/learner-evidence-core.js');

  check('(J) event sah lolos normalisasi',
    core.normalizeLearnerEvidenceEvent(evEvent()).ok === true);

  for (const [label, field] of [['sub', 'sub'], ['userId', 'userId'], ['cohort', 'cohort']]) {
    const raw = evEvent();
    raw[field] = field === 'cohort' ? '0123456789abcdef' : '11111111-1111-4111-8111-111111111111';
    const res = core.normalizeLearnerEvidenceEvent(raw);
    check(`(J) field "${label}" di event DITOLAK sebagai foreign_field`,
      res.ok === false && res.reason === 'foreign_field' && res.field === field, JSON.stringify(res));
  }

  check('(J) enum di luar daftar ditolak',
    core.normalizeLearnerEvidenceEvent(evEvent({ payload: evidencePayload({ masteryTrend: 'naik' }) })).reason === 'invalid_field');
  check('(J) field wajib yang hilang ditolak',
    (() => { const p = evidencePayload(); delete p.masteryTrend; return core.normalizeLearnerEvidenceEvent(evEvent({ payload: p })).reason === 'missing_field'; })());
  check('(J) tipe event tak dikenal ditolak',
    core.normalizeLearnerEvidenceEvent(evEvent({ type: 'apa_saja' })).reason === 'bad_type');

  const now = Date.parse(CLOCK_ISO);
  check('(J) amplop lane AGREGAT ditolak lane ini (schema berbeda)',
    core.normalizeLearnerEvidenceEnvelope(envelope([evEvent()], { schema: 'fiezel-braincore-evidence-v1' }), now).reason === 'bad_schema');
  check('(J) hari di luar toleransi 2 hari ditolak',
    core.normalizeLearnerEvidenceEnvelope(envelope([evEvent()], { day: '2026-08-01' }), now).reason === 'day_out_of_range');
  check('(J) batchId bukan UUID ditolak',
    core.normalizeLearnerEvidenceEnvelope(envelope([evEvent()], { batchId: 'bukan-uuid' }), now).reason === 'bad_batch_id');
  check('(J) batch > MAX_EVENTS ditolak',
    core.normalizeLearnerEvidenceEnvelope(envelope(Array.from({ length: 21 }, () => evEvent())), now).reason === 'too_many_events');
  {
    const dup = evEvent();
    check('(J) eventId duplikat DI DALAM satu batch ditolak',
      core.normalizeLearnerEvidenceEnvelope(envelope([dup, dup]), now).reason === 'duplicate_event_id');
  }
  check('(J) amplop sah lolos',
    core.normalizeLearnerEvidenceEnvelope(envelope([evEvent(), decEvent()]), now).ok === true);

  // stateFromEvents — penghitung dan nilai TERAKHIR
  const st1 = core.stateFromEvents(null, '2026-08-20', [evEvent(), decEvent()], now);
  check('(J) stateFromEvents menghitung dua lane event terpisah',
    st1.evidence_n === 1 && st1.decision_n === 1 && st1.first_day === '2026-08-20' && st1.last_day === '2026-08-20', JSON.stringify(st1));
  const st2 = core.stateFromEvents(st1, '2026-09-01', [evEvent({ payload: evidencePayload({ masteryBucket: 'm80-100' }) })], now);
  check('(J) stateFromEvents menjaga first_day dan memajukan last_day',
    st2.first_day === '2026-08-20' && st2.last_day === '2026-09-01' && st2.evidence_n === 2 && st2.last_mastery === 'm80-100', JSON.stringify(st2));
  const st3 = core.stateFromEvents(st2, '2026-08-10', [], now);
  check('(J) batch lama yang menyusul memundurkan first_day, bukan last_day',
    st3.first_day === '2026-08-10' && st3.last_day === '2026-09-01', JSON.stringify(st3));

  // summarizeLearnerRows
  const empty = core.summarizeLearnerRows([], { from: 'a', to: 'b' });
  check('(J) ringkasan tanpa baris: measured=false dan calibratedShare=null (bukan 0%)',
    empty.measured === false && empty.calibratedShare === null);
  const rows = [
    { day: '2026-08-30', event: 'learner_evidence', dims: evidencePayload({ masteryBucket: 'm40-60' }) },
    { day: '2026-08-31', event: 'learner_evidence', dims: evidencePayload({ masteryBucket: 'm80-100', difficultyCalibration: 'too_hard' }) },
    { day: '2026-09-01', event: 'braincore_decision', dims: decisionPayload() },
  ];
  const sum = core.summarizeLearnerRows(rows, { from: '2026-08-30', to: '2026-09-01' });
  check('(J) ringkasan menghitung bukti/keputusan/hari aktif',
    sum.evidenceCount === 2 && sum.decisionCount === 1 && sum.activeDays === 3, JSON.stringify(sum));
  check('(J) perpindahan mastery = bucket pertama -> terakhir',
    sum.masteryFirst === 'm40-60' && sum.masteryLast === 'm80-100');
  check('(J) calibratedShare dihitung dari penyebut yang benar (1 dari 2 = 50%)',
    sum.calibratedShare === 50, String(sum.calibratedShare));
  check('(J) keputusan terbaru muncul di daftar recentDecisions',
    sum.recentDecisions.length === 1 && sum.recentDecisions[0].day === '2026-09-01');
  check('(J) parseStoredDims membuang nilai di luar enum',
    (() => {
      const d = core.parseStoredDims('learner_evidence', JSON.stringify(evidencePayload({ masteryTrend: 'melesat' })));
      return d && d.masteryTrend === undefined && d.masteryBucket === 'm40-60';
    })());

  check('(J) retensi lane ini EKSPLISIT 180 hari (bukan tak terbatas)',
    core.LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS === 180, String(core.LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS));
}

/* ==========================================================================
 * I. NOL KUNCI BERSAMA — pembangun event sisi klien
 * ========================================================================== */
function babI() {
  const M = require('./features/telemetry/fiezel-braincore-evidence.js');
  const agg = M.buildLearnerEvidenceEvent(Object.assign(
    { eventId: '11111111-1111-4111-8111-111111111111', cohort: '0123456789abcdef' },
    M.fromSnapshot({ skills: { weakest: [{ skill: 'tense-past', accuracy: 70 }], measured: 30, recurringErrorSkills: 1 }, behavior: { consistency14d: 60 }, memory: { maxForgettingRisk: 40 }, confidence: { evidence: 30 } },
      { level: 'A2', mastery: 55, masteryDelta: 4, accuracy: 70, improvementDelta: 3 })
  ));
  check('(I) event lane agregat terbangun (prasyarat uji)', agg.ok === true, JSON.stringify(agg));
  const idEvent = M.toIdentityEvent(agg.event, '22222222-2222-4222-8222-222222222222');
  check('(I) toIdentityEvent MEMBUANG cohort',
    !!idEvent && idEvent.cohort === undefined && !('cohort' in idEvent), JSON.stringify(idEvent));
  check('(I) toIdentityEvent MENGGANTI eventId (nol kunci join antar-lane)',
    !!idEvent && idEvent.eventId !== agg.event.eventId);
  check('(I) toIdentityEvent MEMPERTAHANKAN seluruh payload bucket',
    !!idEvent && JSON.stringify(idEvent.payload) === JSON.stringify(agg.event.payload));
  check('(I) eventId yang SAMA dengan lane agregat ditolak (null)',
    M.toIdentityEvent(agg.event, agg.event.eventId) === null);
  check('(I) eventId bukan UUID ditolak',
    M.toIdentityEvent(agg.event, 'x') === null);
  check('(I) event tanpa payload ditolak',
    M.toIdentityEvent({ eventId: 'a', type: 'learner_evidence' }, '22222222-2222-4222-8222-222222222222') === null);
}

/* ==========================================================================
 * A-G. RANTAI PENUH lewat Worker
 * ========================================================================== */
async function babWorker() {
  const app = await bootLane();
  const cookieA = await app.issueIdentity();
  const cookieB = await app.issueIdentity();
  check('(A) dua identitas berbeda diterbitkan server', cookieA !== cookieB);

  // --- F. tanpa persetujuan: tolak, dan NOL baris ------------------------------
  const noConsent = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieA, body: envelope([evEvent()]) });
  check('(F) tanpa persetujuan -> 403 consent_required',
    noConsent.status === 403 && noConsent.json && noConsent.json.error === 'consent_required', JSON.stringify(noConsent.json));

  // --- G. tanpa identitas sama sekali ------------------------------------------
  const anon = await app.call('POST', '/api/braincore/learner-evidence', { body: envelope([evEvent()]) });
  check('(G) tanpa cookie identitas -> 401', anon.status === 401, String(anon.status));

  // --- persetujuan ------------------------------------------------------------
  const grantA = await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieA, body: { granted: true } });
  const grantB = await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieB, body: { granted: true } });
  check('(F) persetujuan tercatat untuk kedua murid',
    grantA.status === 200 && grantA.json.granted === true && grantB.status === 200, JSON.stringify(grantA.json));
  const badConsent = await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieA, body: { granted: true, sub: 'x' } });
  check('(D) body persetujuan yang menitipkan `sub` ditolak 400',
    badConsent.status === 400 && badConsent.json.error === 'schema_invalid', JSON.stringify(badConsent.json));

  // --- B. kepemilikan ---------------------------------------------------------
  const postA = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieA, body: envelope([evEvent(), decEvent()]) });
  check('(B) murid A menulis 2 event -> 202 accepted:2',
    postA.status === 202 && postA.json.accepted === 2, JSON.stringify(postA.json));
  const postB = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieB, body: envelope([evEvent()]) });
  check('(B) murid B menulis 1 event -> 202 accepted:1',
    postB.status === 202 && postB.json.accepted === 1, JSON.stringify(postB.json));

  // Identitas dibaca dari baris D1, bukan dari jawaban HTTP.
  const dirRes = await app.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
  check('(E) owner mendapat direktori 2 murid',
    dirRes.status === 200 && dirRes.json.migrated === true && dirRes.json.learners.length === 2,
    JSON.stringify(dirRes.json));
  const subA = dirRes.json.learners.find((x) => x.evidenceCount === 1 && x.decisionCount === 1);
  const subB = dirRes.json.learners.find((x) => x.evidenceCount === 1 && x.decisionCount === 0);
  check('(B) direktori memisahkan penghitung per murid', !!subA && !!subB && subA.sub !== subB.sub,
    JSON.stringify(dirRes.json.learners));

  const rowsA = await rowsFor(app, subA.sub);
  const rowsB = await rowsFor(app, subB.sub);
  check('(B) baris D1 murid A = 2, murid B = 1', rowsA.length === 2 && rowsB.length === 1,
    `${rowsA.length}/${rowsB.length}`);

  // --- idempotensi ------------------------------------------------------------
  const replay = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieB, body: envelope((await (async () => [])()) || []) });
  check('(B) batch kosong ditolak 400 (bukan diterima diam-diam)',
    replay.status === 400, String(replay.status));
  {
    const ev = evEvent();
    const body = envelope([ev]);
    const first = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieB, body });
    const again = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieB, body });
    const after = await rowsFor(app, subB.sub);
    check('(B) replay batch yang sama tidak menambah baris',
      first.json.accepted === 1 && again.json.accepted === 0 && again.json.duplicate === 1 && after.length === 2,
      JSON.stringify({ first: first.json, again: again.json, rows: after.length }));
  }

  // --- D. SPOOFING ------------------------------------------------------------
  {
    const before = (await rowsFor(app, subB.sub)).length;
    const spoofEvent = evEvent();
    spoofEvent.sub = subB.sub;
    const res = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieA, body: envelope([spoofEvent]) });
    const after = (await rowsFor(app, subB.sub)).length;
    check('(D) event dengan `sub` orang lain ditolak 400 dan NOL baris ditulis untuk korban',
      res.status === 400 && res.json.error === 'schema_invalid' && after === before,
      JSON.stringify({ status: res.status, json: res.json, before, after }));
  }
  {
    const beforeB = (await rowsFor(app, subB.sub)).length;
    const beforeA = (await rowsFor(app, subA.sub)).length;
    // Amplop yang MENITIPKAN sub di tingkat amplop (bukan event).
    const res = await app.call('POST', '/api/braincore/learner-evidence', {
      cookie: cookieA,
      body: Object.assign(envelope([evEvent()]), { sub: subB.sub }),
    });
    check('(D) amplop dengan `sub` ditolak 400 (foreign_field di tingkat amplop)',
      res.status === 400, JSON.stringify(res.json));
    check('(D) tidak ada baris tertulis untuk siapa pun dari amplop yang ditolak',
      (await rowsFor(app, subB.sub)).length === beforeB && (await rowsFor(app, subA.sub)).length === beforeA);
  }
  {
    // Bahkan permintaan yang SAH dari A tidak pernah bisa mendarat di B.
    const beforeB = (await rowsFor(app, subB.sub)).length;
    await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieA, body: envelope([evEvent()]) });
    check('(D) tulisan sah murid A tidak menambah satu baris pun milik murid B',
      (await rowsFor(app, subB.sub)).length === beforeB);
  }

  // --- C. ISOLASI: murid tidak boleh membaca rute owner ------------------------
  const learnerDir = await app.call('GET', '/api/owner/learners?days=30', { cookie: cookieA });
  check('(C) murid memanggil /api/owner/learners -> 403 (cookie sah tidak cukup)',
    learnerDir.status === 403, String(learnerDir.status));
  const learnerPeek = await app.call('GET', `/api/owner/learner-evidence?sub=${subB.sub}`, { cookie: cookieA });
  check('(C) murid A meminta bukti murid B -> 403',
    learnerPeek.status === 403, String(learnerPeek.status));
  const wrongToken = await app.call('GET', `/api/owner/learner-evidence?sub=${subB.sub}`, { headers: { 'x-fiezel-owner-token': 'token-salah' } });
  check('(C) token owner salah -> 403', wrongToken.status === 403, String(wrongToken.status));

  // --- E. OWNER memilih satu murid --------------------------------------------
  const detailA = await app.call('GET', `/api/owner/learner-evidence?sub=${subA.sub}&days=30`, { headers: ownerHeaders });
  check('(E) owner membuka murid A dan mendapat ringkasannya',
    detailA.status === 200 && detailA.json.migrated === true && detailA.json.learner.sub === subA.sub && detailA.json.summary.measured === true,
    JSON.stringify(detailA.json && detailA.json.learner));
  check('(E) ringkasan murid A memuat 1 keputusan Braincore',
    detailA.json.summary.decisionCount === 1, JSON.stringify(detailA.json.summary));
  const detailB = await app.call('GET', `/api/owner/learner-evidence?sub=${subB.sub}&days=30`, { headers: ownerHeaders });
  check('(E) ringkasan murid B TIDAK memuat keputusan milik murid A',
    detailB.json.summary.decisionCount === 0 && detailB.json.summary.evidenceCount >= 1,
    JSON.stringify(detailB.json.summary));
  const badSub = await app.call('GET', '/api/owner/learner-evidence?sub=bukan-uuid', { headers: ownerHeaders });
  check('(E) `sub` cacat -> 400, bukan 404 (nol oracle keberadaan identitas)',
    badSub.status === 400, String(badSub.status));
  const unknownSub = await app.call('GET', '/api/owner/learner-evidence?sub=99999999-9999-4999-8999-999999999999', { headers: ownerHeaders });
  check('(E) `sub` tak dikenal -> 200 dengan ringkasan measured:false (bukan kebocoran)',
    unknownSub.status === 200 && unknownSub.json.summary.measured === false, JSON.stringify(unknownSub.json && unknownSub.json.summary));

  // --- nama tampilan dari social_profile ---------------------------------------
  check('(E) murid tanpa profil sosial muncul TANPA nama (bukan disembunyikan)',
    dirRes.json.learners.every((x) => x.displayName === null && x.handle === null));
  {
    const created = await app.call('POST', '/api/social/profile/create', {
      cookie: cookieA, body: { handle: 'andi_belajar', displayName: 'Andi' },
    });
    check('(E) profil sosial murid A dibuat (prasyarat nama)', created.status === 201, JSON.stringify(created.json));
    const dir2 = await app.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
    const namedA = dir2.json.learners.find((x) => x.sub === subA.sub);
    check('(E) direktori owner kini menampilkan nama murid A dari social_profile',
      !!namedA && namedA.displayName === 'Andi' && namedA.handle === 'andi_belajar', JSON.stringify(namedA));
    const detail2 = await app.call('GET', `/api/owner/learner-evidence?sub=${subA.sub}`, { headers: ownerHeaders });
    check('(E) halaman satu murid juga membawa namanya',
      detail2.json.learner.displayName === 'Andi', JSON.stringify(detail2.json.learner));
    const stillB = dir2.json.learners.find((x) => x.sub === subB.sub);
    check('(E) murid B tetap tanpa nama, dan tetap ada di daftar', !!stillB && stillB.displayName === null);
  }

  // --- F. PENCABUTAN menghapus ---------------------------------------------------
  {
    const before = (await rowsFor(app, subB.sub)).length;
    const revoke = await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieB, body: { granted: false } });
    const after = (await rowsFor(app, subB.sub)).length;
    check('(F) mencabut persetujuan MENGHAPUS bukti murid itu',
      revoke.status === 200 && revoke.json.granted === false && before > 0 && after === 0,
      JSON.stringify({ before, after, json: revoke.json }));
    const dir3 = await app.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
    check('(F) murid yang mencabut hilang dari direktori owner',
      dir3.json.learners.every((x) => x.sub !== subB.sub), JSON.stringify(dir3.json.learners.map((x) => x.sub)));
    check('(F) murid A TIDAK ikut terhapus oleh pencabutan murid B',
      (await rowsFor(app, subA.sub)).length > 0);
    const afterRevoke = await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieB, body: envelope([evEvent()]) });
    check('(F) sesudah dicabut, tulisan berikutnya ditolak 403',
      afterRevoke.status === 403 && afterRevoke.json.error === 'consent_required');
  }
}

/* ==========================================================================
 * K. NAMA LEARNER — dari perkenalan, ke server, terikat identity.sub
 * ========================================================================== */
async function babK() {
  const app = await bootLane();
  const cookieA = await app.issueIdentity();
  const cookieB = await app.issueIdentity();

  // --- tanpa identitas: tidak ada nama yang bisa disimpan --------------------
  const anon = await app.call('POST', '/api/learner/name', { body: { name: 'Andi' } });
  check('(K) POST nama tanpa cookie -> 401', anon.status === 401, String(anon.status));

  // --- jalur normal ---------------------------------------------------------
  const putA = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: '  Budi   Santoso ' } });
  check('(K) nama tersimpan dan dipantulkan dalam bentuk TERNORMALISASI',
    putA.status === 200 && putA.json.ok === true && putA.json.name === 'Budi Santoso', JSON.stringify(putA.json));
  const putB = await app.call('POST', '/api/learner/name', { cookie: cookieB, body: { name: 'Siti' } });
  check('(K) murid kedua menyimpan namanya sendiri', putB.status === 200 && putB.json.name === 'Siti');

  const getA = await app.call('GET', '/api/learner/name', { cookie: cookieA });
  const getB = await app.call('GET', '/api/learner/name', { cookie: cookieB });
  check('(K) tiap murid membaca namanya SENDIRI, bukan nama orang lain',
    getA.json.name === 'Budi Santoso' && getB.json.name === 'Siti',
    JSON.stringify({ a: getA.json, b: getB.json }));

  // --- spoofing -------------------------------------------------------------
  const spoof = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: 'Andi', sub: '11111111-1111-4111-8111-111111111111' } });
  check('(K) body nama yang menitipkan `sub` ditolak 400',
    spoof.status === 400 && spoof.json.error === 'schema_invalid', JSON.stringify(spoof.json));
  const spoofUser = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: 'Andi', userId: 'x' } });
  check('(K) body nama yang menitipkan `userId` ditolak 400', spoofUser.status === 400);
  check('(K) nama murid B TIDAK berubah oleh percobaan spoof murid A',
    (await app.call('GET', '/api/learner/name', { cookie: cookieB })).json.name === 'Siti');

  // --- normalisasi + penolakan ---------------------------------------------
  const empty = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: '   ' } });
  check('(K) nama kosong sesudah normalisasi -> 400 empty_name',
    empty.status === 400 && empty.json.reason === 'empty_name', JSON.stringify(empty.json));
  const angled = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: '<b>Andi</b>' } });
  check('(K) kurung sudut dibuang, bukan ditolak', angled.status === 200 && angled.json.name === 'bAndi/b', JSON.stringify(angled.json));
  const longName = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: 'A'.repeat(60) } });
  check('(K) nama kepanjangan DIPOTONG ke 24, bukan ditolak',
    longName.status === 200 && longName.json.name.length === 24, String(longName.json && longName.json.name && longName.json.name.length));

  // --- nama muncul di Owner Dashboard TANPA social_profile ------------------
  await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieA, body: { granted: true } });
  await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieB, body: { granted: true } });
  await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: 'Budi' } });
  await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieA, body: envelope([evEvent(), decEvent()]) });
  await app.call('POST', '/api/braincore/learner-evidence', { cookie: cookieB, body: envelope([evEvent()]) });

  const dir = await app.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
  const budi = dir.json.learners.find((x) => x.name === 'Budi');
  const siti = dir.json.learners.find((x) => x.name === 'Siti');
  check('(K) owner melihat NAMA murid, bukan 8 hex sub — tanpa social_profile sama sekali',
    !!budi && !!siti && budi.sub !== siti.sub, JSON.stringify(dir.json.learners));
  check('(K) asal nama dilaporkan sebagai `onboarding`',
    budi.nameSource === 'onboarding' && siti.nameSource === 'onboarding',
    JSON.stringify([budi.nameSource, siti.nameSource]));
  check('(K) murid TANPA profil sosial tetap punya nama (tidak lagi bergantung social_profile)',
    budi.displayName === null && budi.handle === null && budi.name === 'Budi');

  const detail = await app.call('GET', `/api/owner/learner-evidence?sub=${budi.sub}`, { headers: ownerHeaders });
  check('(K) halaman satu murid juga memakai nama perkenalan',
    detail.json.learner.name === 'Budi' && detail.json.learner.nameSource === 'onboarding',
    JSON.stringify(detail.json.learner));

  // --- GANTI NAMA: bukti tetap melekat pada sub yang sama --------------------
  {
    const before = detail.json.summary.decisionCount;
    const renamed = await app.call('POST', '/api/learner/name', { cookie: cookieA, body: { name: 'Budiman' } });
    check('(K) murid mengganti namanya', renamed.status === 200 && renamed.json.name === 'Budiman');
    const after = await app.call('GET', `/api/owner/learner-evidence?sub=${budi.sub}`, { headers: ownerHeaders });
    check('(K) GANTI NAMA TIDAK memutus bukti: sub sama, hitungan sama, nama baru',
      after.json.learner.sub === budi.sub &&
      after.json.learner.name === 'Budiman' &&
      after.json.summary.decisionCount === before,
      JSON.stringify({ sub: after.json.learner.sub, name: after.json.learner.name, before, after: after.json.summary.decisionCount }));
    const dir2 = await app.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
    check('(K) direktori TIDAK memunculkan murid kedua akibat ganti nama',
      dir2.json.learners.length === 2 && dir2.json.learners.some((x) => x.name === 'Budiman'),
      JSON.stringify(dir2.json.learners.map((x) => x.name)));
  }

  // --- profil sosial hanya CADANGAN ----------------------------------------
  {
    const app2 = await bootLane();
    const cookieC = await app2.issueIdentity();
    await app2.call('POST', '/api/braincore/learner-evidence/consent', { cookie: cookieC, body: { granted: true } });
    await app2.call('POST', '/api/braincore/learner-evidence', { cookie: cookieC, body: envelope([evEvent()]) });
    await app2.call('POST', '/api/social/profile/create', { cookie: cookieC, body: { handle: 'citra_x', displayName: 'Citra' } });
    const d1 = await app2.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
    check('(K) murid LAMA tanpa learner_name jatuh ke display_name sosial (cadangan)',
      d1.json.learners[0].name === 'Citra' && d1.json.learners[0].nameSource === 'social_display',
      JSON.stringify(d1.json.learners[0]));
    await app2.call('POST', '/api/learner/name', { cookie: cookieC, body: { name: 'Citra Dewi' } });
    const d2 = await app2.call('GET', '/api/owner/learners?days=30', { headers: ownerHeaders });
    check('(K) begitu nama perkenalan ada, IA yang menang atas profil sosial',
      d2.json.learners[0].name === 'Citra Dewi' && d2.json.learners[0].nameSource === 'onboarding',
      JSON.stringify(d2.json.learners[0]));
  }
}

/* ==========================================================================
 * K2. NAMA — sumber klien: WAJIB, dinormalkan sama, dikirim ke server
 * ========================================================================== */
async function babK2() {
  const onboarding = read('features/onboarding/fiezel-onboarding.js');
  // Langkah nama tidak boleh punya jalan keluar. Tiga pagar, ketiganya diperiksa.
  check('(K) langkah nama TANPA tombol "Lewati" dan tanpa "Kembali" (topbar(false, false))',
    /function nameMarkup\(env, typed\)[\s\S]{0,200}topbar\(false, false\)/.test(onboarding));
  check('(K) tombol lanjut MATI selama nama kosong',
    /btn\(T\('onboarding\.next'\), 'data-ob-advance' \+ \(clean \? '' : ' disabled'\)\)/.test(onboarding));
  check('(K) jalur Enter pada papan ketik juga dijaga (tidak melewati tombol)',
    /if \(step === NAME_STEP\)[\s\S]{0,300}if \(!typedName\) return;/.test(onboarding));

  // Normalisasi klien dan server WAJIB satu aturan.
  const core = await boot.importApiModule('evidence/learner-evidence-core.js');
  const M = require('./features/onboarding/fiezel-onboarding.js');
  const clientNormalize = M && typeof M.normalizeName === 'function' ? M.normalizeName : null;
  check('(K) modul perkenalan memaparkan normalizeName untuk diadu', typeof clientNormalize === 'function');
  if (clientNormalize) {
    const kasus = ['  Andi   Pratama  ', "O'Neil-Ré", '<b>Budi</b>', 'A'.repeat(60), '   ', 'Siti\tNur'];
    const beda = kasus.filter((k) => clientNormalize(k) !== core.normalizeLearnerName(k));
    check('(K) normalisasi nama KLIEN == SERVER (nama tidak menyimpang antar dua layar)',
      beda.length === 0, JSON.stringify(beda.map((k) => ({ k, klien: clientNormalize(k), server: core.normalizeLearnerName(k) }))));
    check('(K) batas panjang nama sama di kedua sisi (24)', core.LEARNER_NAME_MAX === 24);
  }

  const app = read('app.js');
  check('(K) klien mengirim nama ke server saat nama DISET (force, tidak menunggu besok)',
    /learnerNameSyncToServer\(name,\{force:true\}\)/.test(app));
  check('(K) klien menyegarkan nama maksimum SEKALI SEHARI (rem tulis)',
    /LEARNER_NAME_SYNC_KEY/.test(app) && /last\.day===day&&last\.name===clean/.test(app));
  check('(K) penanda kirim ditulis HANYA sesudah server mengonfirmasi',
    /if\(!r\|\|!r\.ok\)return false;[\s\S]{0,240}setItem\(LEARNER_NAME_SYNC_KEY/.test(app));
  check('(K) klien TIDAK PERNAH mengirim sub bersama nama (hanya {name})',
    /body:JSON\.stringify\(\{name:clean\}\)/.test(app));
  check('(K) nama tidak meninggalkan perangkat selama lane per-murid mati',
    /function learnerNameSyncToServer[\s\S]{0,200}identityEvidenceMode\(\)==='off'\)return Promise\.resolve\(false\)/.test(app));
  check('(K) penyegaran harian dipanggil dari jalur boot SESUDAH perkenalan',
    /askLearnerNameIfMissing\(at\)\)return null;[\s\S]{0,400}maybeSyncLearnerName\(at\)/.test(app));

  // Naskah privasi WAJIB benar apa adanya.
  const copyId = read('features/i18n/copy-id-feat-b.js');
  check('(K) naskah perkenalan TIDAK lagi menjanjikan "nggak dibagi ke siapa pun"',
    !/Nggak dibagi ke siapa pun/.test(copyId));
  check('(K) naskah perkenalan menyebut nama ikut ke akun FIEZEL dan bisa diganti',
    /akun FIEZEL/.test(copyId) && /(ganti|Pengaturan)/.test(copyId));
}

/* ==========================================================================
 * G. FAIL-CLOSED — tiga sakelar AND
 * ========================================================================== */
async function babG() {
  {
    const app = await bootLane({ vars: { FEATURE_LEARNER_EVIDENCE: 'off' } });
    const cookie = await app.issueIdentity();
    const res = await app.call('POST', '/api/braincore/learner-evidence/consent', { cookie, body: { granted: true } });
    check('(G) FEATURE_LEARNER_EVIDENCE="off" -> 403 learner_evidence_disabled',
      res.status === 403 && res.json.error === 'learner_evidence_disabled', JSON.stringify(res.json));
    const nameOff = await app.call('POST', '/api/learner/name', { cookie, body: { name: 'Andi' } });
    check('(G) nama pun TIDAK tersimpan selama lane mati -> 403',
      nameOff.status === 403, String(nameOff.status));
  }
  {
    const app = await bootLane({ kvEntries: {} });
    const cookie = await app.issueIdentity();
    const res = await app.call('POST', '/api/braincore/learner-evidence', { cookie, body: envelope([evEvent()]) });
    check('(G) KV cfg:flags belum ditulis -> TOLAK (fail-closed, bukan izin-lolos)',
      res.status === 403, String(res.status));
  }
  {
    const app = await bootLane({
      kvEntries: { 'cfg:flags': JSON.stringify({ flags: { cfLearnerEvidenceEnabled: true }, enabled: { learnerEvidence: false } }) },
    });
    const cookie = await app.issueIdentity();
    const res = await app.call('POST', '/api/braincore/learner-evidence', { cookie, body: envelope([evEvent()]) });
    check('(G) kill switch enabled.learnerEvidence=false -> 403 walau flag klien true',
      res.status === 403, String(res.status));
  }
  {
    const app = await bootLane({ vars: { OWNER_TOKEN_HASH: undefined } });
    const res = await app.call('GET', '/api/owner/learners', { headers: ownerHeaders });
    check('(G) tanpa OWNER_TOKEN_HASH -> rute owner 403 (fail-closed)',
      res.status === 403, String(res.status));
  }
}

/* ==========================================================================
 * H. LANE AGREGAT TIDAK TERGANGGU
 * ========================================================================== */
function babH() {
  const mig8 = read('workers/api/migrations/0008_evidence.sql');
  for (const table of ['evidence_daily', 'evidence_dedup', 'evidence_learner_day']) {
    check(`(H) tabel lane agregat "${table}" MASIH ADA di 0008_evidence.sql`,
      new RegExp('CREATE TABLE IF NOT EXISTS ' + table + '\\b').test(mig8));
  }
  check('(H) 0008_evidence.sql tetap NOL kolom identitas (sub/user_id/account_id)',
    !/\b(sub|user_id|account_id|learner_name|email)\b/.test(mig8.replace(/--[^\n]*/g, '')));

  const mig9 = read('workers/api/migrations/0009_learner_evidence.sql');
  const ddl9 = mig9.replace(/--[^\n]*/g, '');
  check('(H) 0009 TIDAK menyentuh satu pun tabel lane agregat',
    !/evidence_daily|evidence_dedup|evidence_learner_day/.test(ddl9));
  for (const forbidden of ['learner_name', 'email', 'ip_address', 'user_agent', 'password', 'answer', 'transcript', 'cohort']) {
    check(`(H) 0009 tidak memuat kolom terlarang "${forbidden}"`,
      !new RegExp('\\b' + forbidden + '\\b', 'i').test(ddl9));
  }
  check('(H) 0009 memakai `sub` sebagai kunci (bukan nama murid)',
    /PRIMARY KEY \(sub, event_id\)/.test(ddl9) && /learner_evidence_state \(\s*\n\s*sub\s+TEXT\s+PRIMARY KEY/.test(mig9));

  // Komentar BOLEH menyebut binding lain (larangannya justru ditulis di sana); yang
  // dilarang adalah KODE yang menyentuhnya. Karena itu komentar dibuang dulu.
  const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const mig10 = read('workers/api/migrations/0010_learner_name.sql');
  const ddl10 = mig10.replace(/--[^\n]*/g, '');
  check('(K) 0010 menyimpan nama di TABEL SENDIRI, bukan kolom di `identity`',
    /CREATE TABLE IF NOT EXISTS learner_name/.test(ddl10) && !/ALTER TABLE identity/i.test(ddl10));
  check('(K) `sub` tetap primary key; nama BUKAN kunci dan BUKAN unik',
    /sub\s+TEXT\s+NOT NULL\s+PRIMARY KEY/.test(ddl10) && !/UNIQUE[\s\S]{0,40}name/i.test(ddl10));
  for (const forbidden of ['email', 'phone', 'school', 'birth', 'ip_address', 'user_agent', 'password', 'answer']) {
    check(`(K) 0010 tidak memuat kolom terlarang "${forbidden}"`,
      !new RegExp('\\b' + forbidden + '\\b', 'i').test(ddl10));
  }
  check('(K) tidak ada indeks atas kolom `name` (mencari murid by nama tidak dimurahkan)',
    !/CREATE INDEX[^\n]*learner_name\(name\)/i.test(mig10));

  const store = stripComments(read('workers/api/evidence/learner-evidence-store-d1.js'));
  check('(H) store lane per-murid TIDAK PERNAH menyebut EVIDENCE_DB/LEARNING_DB/STATS_DB',
    !/EVIDENCE_DB|LEARNING_DB|STATS_DB|ANALYTICS/.test(store), store.match(/EVIDENCE_DB|LEARNING_DB|STATS_DB|ANALYTICS/g));
  const route = read('workers/api/evidence/route-learner-evidence.js');
  check('(H) rute lane per-murid hanya memegang CORE_DB/DB',
    /env\.CORE_DB \|\| env\.DB/.test(route) && !/EVIDENCE_DB|STATS_DB|LEARNING_DB/.test(stripComments(route)));

  const routeAgg = read('workers/api/evidence/route-evidence.js');
  check('(H) rute lane AGREGAT tetap tidak menyebut CORE_DB',
    !/CORE_DB|STATS_DB|LEARNING_DB/.test(routeAgg));

  // Transport bersama TIDAK dilemahkan: lane anonim tetap mengirim tanpa kredensial.
  const transport = read('features/telemetry/fiezel-learning-transport.js');
  check('(H) transport bersama TIDAK menambahkan credentials (lane anonim tetap tanpa cookie)',
    !/credentials/.test(transport));
  const app = read('app.js');
  check('(H) hanya lane per-murid yang menambahkan credentials:\'include\' pada fetchFn',
    /fetchFn:\(u,init\)=>fetch\(u,\{\.\.\.init,credentials:'include'/.test(app));
  check('(H) lane agregat di app.js tetap memakai fetchFn tanpa kredensial',
    /fetchFn:\(u,init\)=>fetch\(u,init\)/.test(app));
}

/* ==========================================================================
 * Klien: pagar persetujuan + antrean terpisah
 * ========================================================================== */
function babKlien() {
  const app = read('app.js');
  check('(F) klien: lane per-murid hanya aktif bila mode != off DAN murid menyetujui',
    /function identityEvidenceActive\(\)\{\s*return identityEvidenceMode\(\)!=='off'&&identityEvidenceConsented\(\);?\s*\}/.test(app.replace(/\n\s*/g, '\n')) ||
    /identityEvidenceMode\(\)!=='off'&&identityEvidenceConsented\(\)/.test(app));
  check('(F) klien: persetujuan fail-closed (=== true persis)',
    /learnerEvidenceConsent===true/.test(app));
  /* Versi pertama gerbang ini meng-assert `q.clear` — dan LULUS, padahal makeQueue()
   * tidak pernah punya metode bernama itu: `q.clear&&q.clear()` di app.js diam-diam
   * tidak melakukan apa pun, jadi antrean lane D SELAMAT dari pencabutan persetujuan.
   * Itu bentuk vakum yang paling mahal: gerbang yang mencocokkan TEKS, bukan metode
   * yang benar-benar ada. Karena itu nama metodenya sekarang diadu langsung ke daftar
   * yang dikembalikan makeQueue(). */
  const queueSrc = read('features/telemetry/fiezel-learning-queue.js');
  const queueApi = (queueSrc.match(/return \{\s*put: put[^}]*\}/) || [''])[0];
  check('(F) modul antrean memang mengekspor purge() dan TIDAK mengekspor clear()',
    /\bpurge: purge\b/.test(queueApi) && !/\bclear\s*:/.test(queueApi), queueApi.slice(0, 160));
  check('(F) klien: mencabut persetujuan mengosongkan antrean lokal (purge, metode yang ada)',
    /setLearnerEvidenceConsent[\s\S]{0,900}q\.purge\(\)/.test(app));
  check('(F) klien: reset progres ikut mengosongkan antrean lane per-murid',
    /function resetProgress\(\)[\s\S]{0,4000}identityEvidenceQueue\(\)[\s\S]{0,200}q\.purge\(\)/.test(app));
  check('(F) klien: reset progres menghapus penanda lane per-murid dari localStorage',
    /resetProgress\(\)[\s\S]{0,4000}IDENTITY_EVIDENCE_ATTEMPT_KEY,LEARNER_NAME_SYNC_KEY\]/.test(app));
  check('(B) klien: antrean IndexedDB lane per-murid TERPISAH dari lane agregat',
    /IDENTITY_EVIDENCE_DB_NAME='fiezel-braincore-learner-evidence-v1'/.test(app) &&
    /EVIDENCE_DB_NAME='fiezel-braincore-evidence-v1'/.test(app));
  check('(A) klien: TIDAK PERNAH mengirim sub/userId sendiri',
    !/sub:\s*(state|activeAccountUuid)/.test(app));
  // Menyalakan lane per-murid TIDAK boleh menyalakan pengenal lane anonim: saat lane
  // agregat 'off', cohort yang dipakai pembangun adalah sekali pakai dan TIDAK ditulis
  // ke localStorage.
  check('(I) klien: cohort tidak dipersistenkan saat lane agregat mati',
    /function braincoreEvidenceCohortForBuild/.test(app) &&
    /if\(braincoreEvidenceMode\(\)!=='off'\)return braincoreEvidenceCohort\(nowMs\);/.test(app) &&
    !/const cohort=braincoreEvidenceCohort\(nowMs\);/.test(app));
  check('(D) klien: identitas lane ini datang dari cookie (POST /api/auth/anon), bukan dari state',
    /identityEvidenceEnsureAnon/.test(app) && /anonEndpoint/.test(app));

  const cfg = read('features/telemetry/fiezel-telemetry-config.js');
  /* AKTIVASI m025-232. Sampai rilis ini, gerbang menuntut `mode: 'off'` — invarian
   * PRA-AKTIVASI yang benar selama migrasi 0009/0010 belum jalan di remote. Sesudah
   * Owner menyelesaikan langkah 1-3 (§7 handoff m025-230), invarian itu berubah, dan
   * gerbangnya ikut berubah dengan sadar — pola yang sama seperti m025-229 waktu lane
   * agregat dinyalakan. Yang TIDAK boleh berkurang: nilai di luar dua fase itu (typo,
   * nilai rusak) tetap harus merah, dan `mode: 'on'` tanpa endpoint terisi juga merah —
   * sebab lane hidup yang menunjuk endpoint kosong adalah lane yang gagal dalam diam. */
  const identityBlok = (cfg.match(/identityEvidence: Object\.freeze\(\{[\s\S]*?\}\)/) || [''])[0];
  const identityMode = (identityBlok.match(/mode: '([^']*)'/) || [, ''])[1];
  check('(G) mode klien lane per-murid bernilai sah (off pra-aktivasi / on pasca-aktivasi)',
    identityMode === 'off' || identityMode === 'on', identityMode);
  check('(G) mode on WAJIB berpasangan dengan keempat endpoint https yang terisi',
    identityMode !== 'on' || ['endpoint', 'consentEndpoint', 'anonEndpoint', 'nameEndpoint']
      .every((k) => new RegExp(k + ": 'https://[^']+'").test(identityBlok)), identityBlok.slice(0, 200));
  check('(H) lane agregat tetap punya sakelarnya sendiri (tidak ikut dimatikan)',
    /evidence: Object\.freeze\(\{[\s\S]{0,200}mode: 'on'/.test(cfg));

  const toml = read('workers/api/wrangler.toml');
  /* Alasan yang sama seperti di atas: dua nilai sah menurut fase, string lain merah. */
  check('(G) FEATURE_LEARNER_EVIDENCE bernilai sah ("off" pra-aktivasi atau "on" pasca-aktivasi)',
    /FEATURE_LEARNER_EVIDENCE\s*=\s*"(off|on)"/.test(toml), (toml.match(/FEATURE_LEARNER_EVIDENCE.*/) || [''])[0]);
  /* Sakelar server dan sakelar klien harus sefase. Server 'off' + klien 'on' berarti
   * setiap perangkat murid memanggil endpoint yang menjawab 403 selamanya; server 'on' +
   * klien 'off' berarti infrastruktur hidup tanpa satu pun yang mengisinya. Keduanya
   * gagal dalam diam, dan keduanya lolos kalau masing-masing hanya diperiksa sendiri. */
  const tomlMode = (toml.match(/FEATURE_LEARNER_EVIDENCE\s*=\s*"(off|on)"/) || [, ''])[1];
  check('(G) sakelar server dan klien lane per-murid sefase',
    tomlMode === identityMode, 'wrangler=' + tomlMode + ' klien=' + identityMode);
}

/* ==========================================================================
 * Owner Dashboard: SATU dashboard, bukan dua
 * ========================================================================== */
async function babDashboard() {
  const src = read('workers/owner/index.js');
  check('(E) panel murid ditempel ke dashboard yang SUDAH ADA (renderDashboard)',
    /\$\{renderEvidenceSection\(m\)\}\s*\n\s*\$\{renderLearnerSection\(m\)\}/.test(src));
  /* Versi pertama membekukan literal SATU BARIS `const OWNER_ROUTES = [...];`. Itu memerah
   * bukan karena lane per-murid menambah rute, melainkan karena m025-229 (ekspor CSV owner)
   * memperpanjang inventarisnya dan memecahnya ke beberapa baris — gerbang yang membekukan
   * BENTUK, bukan klaimnya. Klaimnya cuma satu: lane per-murid tidak menambah SATU pun rute
   * owner (pemilihan murid numpang `?learner=` pada `/`). Jadi yang diperiksa sekarang: enam
   * rute dasar masih ada, dan TIDAK ADA satu pun entri rute yang menyebut learner. */
  const ownerRoutesSrc = (src.match(/const OWNER_ROUTES = \[[\s\S]*?\];/) || [''])[0];
  const ownerRoutes = (ownerRoutesSrc.match(/'[^']*'/g) || []).map((x) => x.slice(1, -1));
  const rutaDasar = ['/', '/api/summary', '/api/series', '/api/retention', '/api/cost', '/logout'];
  check('(E) NOL rute owner baru: tidak ada rute ber-learner di OWNER_ROUTES',
    ownerRoutes.length > 0 &&
    rutaDasar.every((r) => ownerRoutes.includes(r)) &&
    !ownerRoutes.some((r) => /learner/i.test(r)), ownerRoutes.join(' '));
  check('(E) pemilihan murid lewat parameter kueri `?learner=` pada rute `/`',
    /url\.searchParams\.get\('learner'\)/.test(src));
  check('(E) Worker owner tetap membaca lewat subrequest, TANPA binding D1 kedua',
    /x-fiezel-owner-token/.test(src) && !/env\.CORE_DB|env\.DB\b/.test(src));
  check('(E) panel agregat LAMA tetap ada (bukan diganti)', /function renderEvidenceSection\(/.test(src));

  const ownerToml = read('workers/owner/wrangler.toml');
  const d1Blocks = ownerToml.split('[[d1_databases]]').slice(1);
  check('(E) Worker owner tetap punya TEPAT SATU binding D1 (ANALYTICS)',
    d1Blocks.length === 1 && /binding\s*=\s*"ANALYTICS"/.test(d1Blocks[0]), String(d1Blocks.length));

  // Render sungguhan: model palsu -> HTML, dan HTML itu harus memuat nama + tautan.
  const mod = await import('data:text/javascript;base64,' + Buffer.from(
    read('workers/owner/index.js').replace("'./queries.js'", "'data:text/javascript;base64," +
      Buffer.from(read('workers/owner/queries.js')).toString('base64') + "'")
  ).toString('base64'));
  const model = {
    period: '30d',
    learnerSub: '11111111-1111-4111-8111-111111111111',
    learners: {
      state: 'measured',
      learners: [
        { sub: '11111111-1111-4111-8111-111111111111', name: 'Andi', nameSource: 'onboarding', displayName: 'Andi', handle: 'andi_belajar', firstDay: '2026-08-01', lastDay: '2026-09-01', evidenceCount: 4, decisionCount: 42, lastLevel: 'A2', lastMastery: 'm60-80', lastTrend: 'up', lastOutcome: 'positive' },
        { sub: '22222222-2222-4222-8222-222222222222', name: null, nameSource: 'none', displayName: null, handle: null, firstDay: '2026-08-20', lastDay: '2026-08-30', evidenceCount: 1, decisionCount: 0, lastLevel: null, lastMastery: null, lastTrend: null, lastOutcome: null },
      ],
    },
    learnerDetail: {
      state: 'measured',
      learner: { sub: '11111111-1111-4111-8111-111111111111', name: 'Andi', nameSource: 'onboarding', displayName: 'Andi', handle: 'andi_belajar' },
      summary: {
        measured: true, evidenceCount: 4, decisionCount: 42, activeDays: 12,
        firstDay: '2026-08-01', lastDay: '2026-09-01',
        level: { A2: 4 }, mastery: { 'm60-80': 3, 'm80-100': 1 }, masteryTrend: { up: 3, flat: 1 },
        misconception: { mc1: 4 }, misconceptionSkill: { 'tense-past': 4 },
        difficultyCalibration: { calibrated: 3, too_hard: 1 }, calibrationError: { 'e0-10': 4 },
        improvementTrend: { improving: 4 }, decision: { weak_skill: 42 }, outcome: { positive: 40, mixed: 2 },
        recommendation: { keep_or_progress: 12 }, masteryDelta: { 'd1-10': 42 },
        masteryFirst: 'm60-80', masteryLast: 'm80-100', calibratedShare: 84,
        recentDecisions: [{ day: '2026-09-01', level: 'A2', decision: 'weak_skill', outcome: 'positive', recommendation: 'keep_or_progress', masteryDelta: 'd1-10', adherence: 'a80-100' }],
        days: [{ day: '2026-09-01', evidence: 1, decisions: 3 }],
      },
    },
  };
  const html = mod.renderLearnerSection(model);
  check('(E) HTML dashboard memuat nama murid', /Andi/.test(html));
  check('(K) label memakai `name` dari server, bukan mengulang urutan pemilihan',
    mod.learnerLabel({ sub: '1', name: 'Budi', nameSource: 'onboarding', displayName: 'X', handle: 'y' }) === 'Budi');
  check('(K) handle sosial ditandai @, nama perkenalan tidak',
    mod.learnerLabel({ sub: '1', name: 'citra_x', nameSource: 'social_handle' }) === '@citra_x' &&
    mod.learnerLabel({ sub: '1', name: 'Citra', nameSource: 'onboarding' }) === 'Citra');
  check('(K) tanpa nama sama sekali -> "murid <8 hex>" (legacy/galat, bukan normal)',
    mod.learnerLabel({ sub: 'a83f21c4-0000-4000-8000-000000000000', name: null, nameSource: 'none' }) === 'murid a83f21c4');
  check('(K) nameSource asing dari API dinormalkan ke "none"',
    mod.sanitizeLearnerRow({ sub: '11111111-1111-4111-8111-111111111111', name: 'X', nameSource: 'karangan' }).nameSource === 'none');
  check('(E) HTML dashboard memuat tautan pilih-murid ber-sub', /learner=11111111-1111-4111-8111-111111111111/.test(html));
  check('(E) HTML dashboard memuat angka keputusan Braincore murid itu', /42/.test(html));
  check('(E) HTML dashboard memuat kalibrasi 84%', /84%/.test(html));
  check('(E) HTML dashboard memuat perpindahan mastery m60-80 -> m80-100',
    /m60-80/.test(html) && /m80-100/.test(html));
  check('(E) murid tanpa nama dirender sebagai "murid <8 hex>", bukan disembunyikan',
    /murid 22222222/.test(html));
  check('(E) HTML menyebut retensi 180 hari secara eksplisit', /180 hari/.test(html));

  const kosong = mod.renderLearnerSection({ period: '7d', learners: { state: 'measured', learners: [] }, learnerSub: null, learnerDetail: null });
  check('(E) daftar kosong dicetak sebagai "BELUM ADA MURID", bukan angka nol',
    /BELUM ADA MURID/.test(kosong) && !/>0</.test(kosong));
  const gagal = mod.renderLearnerSection({ period: '7d', learners: { state: 'unavailable', status: 502, learners: null }, learnerSub: null, learnerDetail: null });
  check('(E) kegagalan baca dicetak sebagai "tidak tersedia", bukan nol murid',
    /TIDAK TERSEDIA/i.test(gagal));
  const belum = mod.renderLearnerSection({ period: '7d', learners: { state: 'unconfigured', learners: null }, learnerSub: null, learnerDetail: null });
  check('(E) "belum dikonfigurasi" dibedakan dari "nol murid"', /BELUM DIKONFIGURASI/.test(belum));

  // Sanitasi: apa pun di luar daftar putih tidak pernah sampai ke HTML.
  check('(E) baris tanpa `sub` berbentuk UUID dibuang sanitizer',
    mod.sanitizeLearnerRow({ sub: 'bukan-uuid', displayName: 'X' }) === null);
  check('(E) field asing dari API dibuang sanitizer',
    (() => {
      const r = mod.sanitizeLearnerRow({ sub: '11111111-1111-4111-8111-111111111111', email: 'a@b.c', cohort: '0123456789abcdef' });
      return r && r.email === undefined && r.cohort === undefined;
    })());
}

/* ==========================================================================
 * Dokumentasi & pendaftaran gerbang
 * ========================================================================== */
function babDokumen() {
  const retention = read('docs/D1-RETENTION.md');
  check('(F) retensi lane per-murid TERTULIS di docs/D1-RETENTION.md',
    /learner_evidence/.test(retention) && /180 hari/.test(retention));
  check('(F) dokumen retensi menjelaskan jalur pencabutan persetujuan',
    /revokeConsent/.test(retention));
  const migDoc = read('workers/api/migrations/MIGRATIONS.md');
  check('(H) 0009 terdaftar di MIGRATIONS.md sebagai migrasi fiezel-core',
    /d1 execute fiezel-core --remote --file=migrations\/0009_learner_evidence\.sql/.test(migDoc));
  check('(K) 0010 terdaftar di MIGRATIONS.md sebagai migrasi fiezel-core',
    /d1 execute fiezel-core --remote --file=migrations\/0010_learner_name\.sql/.test(migDoc));
  check('(K) retensi nama learner tertulis di docs/D1-RETENTION.md',
    /learner_name/.test(retention));
  const privacy = read('BRAIN-DATA-PRIVACY.md');
  check('(F) BRAIN-DATA-PRIVACY.md mendokumentasikan lane per-murid',
    /learner_evidence/.test(privacy) && /180/.test(privacy));
  check('(K) BRAIN-DATA-PRIVACY.md mendokumentasikan nama learner di server',
    /learner_name/.test(privacy));
  const workflow = read('.github/workflows/quality.yml');
  check('gerbang ini dipanggil quality.yml',
    /node braincore-learner-identity-test\.js/.test(workflow));
}

/* ========================================================================== */
(async () => {
  await babJ();
  babI();
  await babWorker();
  await babK();
  await babK2();
  await babG();
  babH();
  babKlien();
  await babDashboard();
  babDokumen();

  const pass = checks.filter((c) => c.status === 'PASS').length;
  console.log(`\nbraincore-learner-identity-test: ${failed ? 'GAGAL' : 'LULUS'} ${pass}/${checks.length}`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('braincore-learner-identity-test MELEDAK:', err && err.stack ? err.stack : err);
  process.exit(1);
});
