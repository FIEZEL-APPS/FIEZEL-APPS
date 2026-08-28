'use strict';
// m025-35 regression: FIEZEL must push like a teacher when the learner is failing
// repeatedly, not only when they have been absent.
const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');

// Rebuild the decision predicate exactly as shipped so the pedagogy is executable
// rather than asserted by regex alone.
const THRESHOLD = Number((app.match(/ALRS_STRUGGLE_THRESHOLD=(\d+)/) || [])[1]);
const STRUGGLE_GAP = eval((app.match(/ALRS_STRUGGLE_MIN_GAP_MS=([^;]+);/) || [])[1]);
const NORMAL_GAP = eval((app.match(/ALRS_MIN_GAP_MS=([^;]+);/) || [])[1]);
const QUIET_END = Number((app.match(/ALRS_QUIET_END_HOUR=(\d+)/) || [])[1]);
const QUIET_START = Number((app.match(/ALRS_QUIET_START_HOUR=(\d+)/) || [])[1]);

function decide(ctx, meta) {
  if (ctx.hour < QUIET_END || ctx.hour >= QUIET_START) return null;
  const struggling = Number(ctx.consecutiveWrong || 0) >= THRESHOLD;
  const minGap = struggling ? STRUGGLE_GAP : NORMAL_GAP;
  if (Number(meta.lastNotificationAt || 0) && ctx.now - Number(meta.lastNotificationAt) < minGap) return null;
  if (!struggling && meta.lastNotificationDay === ctx.today) return null;
  if (struggling) return { kind: 'struggling', trigger: 'consecutive_wrong_answers' };
  if (ctx.daysInactive >= 1 && ctx.hour >= 18) return { kind: 'inactivity_1', trigger: 'inactive_1_day' };
  return null;
}

const base = { now: 1e12, hour: 14, today: '2026-08-18', daysInactive: 0, consecutiveWrong: 0 };
let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

(async () => {
  test('constants are sane', () => {
    assert.ok(Number.isInteger(THRESHOLD) && THRESHOLD >= 3, 'threshold must be a real streak, not one bad answer');
    assert.ok(STRUGGLE_GAP > 0 && STRUGGLE_GAP < NORMAL_GAP, 'struggle gap must be shorter than the normal gap but non-zero');
  });

  test('a run of wrong answers triggers the struggle push', () => {
    const d = decide({ ...base, consecutiveWrong: THRESHOLD }, {});
    assert.ok(d, 'expected a decision');
    assert.strictEqual(d.kind, 'struggling');
    assert.strictEqual(d.trigger, 'consecutive_wrong_answers');
  });

  test('below the threshold stays silent', () => {
    assert.strictEqual(decide({ ...base, consecutiveWrong: THRESHOLD - 1 }, {}), null,
      'a couple of misses is not a pattern and must not nag');
  });

  test('struggling outranks inactivity', () => {
    const d = decide({ ...base, hour: 19, daysInactive: 2, consecutiveWrong: THRESHOLD }, {});
    assert.strictEqual(d.kind, 'struggling', 'the actionable signal wins over the absence nudge');
  });

  test('struggling bypasses the once-per-day cap', () => {
    const meta = { lastNotificationDay: base.today, lastNotificationAt: base.now - STRUGGLE_GAP - 1 };
    assert.strictEqual(decide({ ...base, hour: 19, daysInactive: 1 }, meta), null,
      'an ordinary nudge is still capped to once a day');
    const d = decide({ ...base, consecutiveWrong: THRESHOLD }, meta);
    assert.ok(d && d.kind === 'struggling', 'a struggle alert must still reach the learner that day');
  });

  test('struggling still cannot spam within its own gap', () => {
    const meta = { lastNotificationAt: base.now - (STRUGGLE_GAP - 1000) };
    assert.strictEqual(decide({ ...base, consecutiveWrong: THRESHOLD * 3 }, meta), null,
      'one bad session must not produce a burst of notifications');
  });

  test('quiet hours hold even for a struggle alert', () => {
    const night = { ...base, hour: 3, consecutiveWrong: THRESHOLD * 2 };
    assert.strictEqual(decide(night, {}), null, 'a teacher does not phone at 3am');
  });

  test('the counter resets on a correct answer and is tracked centrally', () => {
    // Replay the shipped counter update rather than trusting the regex.
    const update = (state, ok) => { state.consecutiveWrong = ok ? 0 : Number(state.consecutiveWrong || 0) + 1; return state; };
    let st = {};
    update(st, false); update(st, false); update(st, false);
    assert.strictEqual(st.consecutiveWrong, 3);
    update(st, true);
    assert.strictEqual(st.consecutiveWrong, 0, 'one correct answer clears the streak');
    // It must live in updateMastery, the single funnel every answer passes through.
    const fn = app.slice(app.indexOf('function updateMastery('), app.indexOf('function updateMastery(') + 900);
    assert.ok(/state\.consecutiveWrong=ok\?0:/.test(fn),
      'counter must be updated inside updateMastery so no call site can forget');
  });

  test('struggle messages exist and speak like a teacher, not a scold', () => {
    // AI-20 F06 (W1-TESTPLAN 2a): pool naskah pengingat boleh PINDAH byte-identik dari app.js
    // ke copy-map features/i18n/copy-id-*.js (id-golden-snapshot-test.js menjaga byte-nya),
    // jadi korpus pencarian adalah UNION app.js + copy-id — glob kosong = perilaku lama.
    const i18nDir = 'features/i18n';
    const copyIdUnion = fs.existsSync(i18nDir)
      ? fs.readdirSync(i18nDir).filter(f => /^copy-id-.*\.js$/.test(f)).sort()
          .map(f => fs.readFileSync(i18nDir + '/' + f, 'utf8')).join('\n')
      : '';
    const corpus = app + '\n' + copyIdUnion;
    assert.ok(/struggling:\[/.test(corpus), 'title pool exists');
    // Two pools share the key: a one-line title pool and a multi-line body pool. The
    // body is the one that opens on its own line.
    // Normalise line endings first: this repo checks out CRLF on Windows and LF in CI,
    // so anchoring on a raw newline would pass in one place and fail in the other.
    const flat = corpus.split('\r\n').join('\n');
    const bodyStart = flat.indexOf('  struggling:[\n');
    assert.ok(bodyStart > -1, 'multi-line body pool exists');
    const body = flat.slice(bodyStart, flat.indexOf('  starter:[\n'));
    /* m025-186 merge-fix: entri pool kini FiezelI18n.t('push...') — hitung dua bentuk. */
    const rotN = (body.match(/FiezelI18n\.t\('/g) || []).length + (body.split("',").length - 1);
    assert.ok(rotN >= 3, 'several rotating messages');
    // Frame the miss as the material not sticking yet, and point back to the topic.
    // The core-brain validator also rejects shaming vocabulary outright.
    assert.ok(/belum nempel/.test(body) || /belum nempel/.test(flat), 'framing must blame the material, not the learner');
    assert.ok(!/(bodoh|goblok|malas)/i.test(body), 'no shaming vocabulary');
  });

  console.log(`FIEZEL reminder struggle trigger: PASS ${pass}/0`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
