#!/usr/bin/env node
/**
 * GERBANG VERDICT KEBIJAKAN (policy-verdict-test.js)
 *
 * YANG DIJAGA
 * -----------
 * Otak menilai kebijakannya sendiri. Selama penilaian itu memakai skor bobot-tangan dengan
 * ambang, ia mengulang cacat yang sudah dibuktikan council lewat 200.000 trial Monte Carlo:
 * kandidat identik dipromosikan 53,9%, kandidat 15pp lebih buruk lolos 27,5%. Modul ini
 * memindahkan keputusan ke INTERVAL, dan gerbang ini menuntut sifat yang membuat pemindahan
 * itu berarti — terutama sifat yang paling mudah dikorbankan: kesediaan untuk TIDAK
 * memutuskan.
 *
 * V1 data 8-attempt WAJIB 'hold', bahkan ketika kandidatnya tampak jauh lebih buruk.
 *    Ini uji terpenting di berkas ini. Godaannya justru di sini: 6/8 vs 2/8 "kelihatan"
 *    seperti regresi telak, dan gerbang lama akan menyebutnya negative. Pada n=8 lebar CI
 *    ±30pp — yang terlihat telak itu masih derau.
 * V2 bukti besar yang benar-benar lebih baik -> promote; yang benar-benar lebih buruk -> reject.
 *    Tanpa ini, 'hold' yang selalu benar juga akan lulus, dan modul yang tidak pernah
 *    memutuskan sama tidak bergunanya dengan modul yang selalu memutuskan.
 * V3 fail-safe: masukan rusak, lengan tak sah, stat-gate absen -> 'hold', tidak pernah melempar.
 * V4 keputusan membawa intervalnya dan kode alasan stat-gate aslinya.
 * V5 harga klaim dilaporkan: ~900 attempt per lengan untuk margin 5pp pada baseline 0,80.
 * RED gerbang terbukti sensitif: ambang gaya lama menyebut 8-attempt 'negative'.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const V = require('./features/brain/fiezel-policy-verdict.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

test('V1 · data 8-attempt selalu HOLD, bahkan saat kandidat tampak jauh lebih buruk', () => {
  const kasus = [
    [{ n: 8, ok: 6 }, { n: 8, ok: 6 }, 'identik'],
    [{ n: 8, ok: 6 }, { n: 8, ok: 2 }, 'tampak jauh lebih buruk'],
    [{ n: 8, ok: 2 }, { n: 8, ok: 8 }, 'tampak jauh lebih baik'],
    [{ n: 12, ok: 9 }, { n: 12, ok: 3 }, 'n=12 tampak telak']
  ];
  for (const [c, k, label] of kasus) {
    const v = V.verdict({ control: c, candidate: k });
    assert.strictEqual(v.decision, 'hold',
      'bukti tipis (' + label + ') menghasilkan keputusan, bukan hold — inilah cacat 8-attempt yang terulang');
  }
});

test('V2 · bukti besar benar-benar memutuskan (modul yang tidak pernah memutus juga tak berguna)', () => {
  const baik = V.verdict({ control: { n: 400, ok: 300 }, candidate: { n: 400, ok: 330 } });
  assert.strictEqual(baik.decision, 'promote', 'bukti kuat yang lebih baik tidak dipromosikan');
  const buruk = V.verdict({ control: { n: 400, ok: 340 }, candidate: { n: 400, ok: 240 } });
  assert.strictEqual(buruk.decision, 'reject', 'regresi besar yang jelas tidak ditolak');
  const seri = V.verdict({ control: { n: 400, ok: 300 }, candidate: { n: 400, ok: 299 } });
  assert.strictEqual(seri.decision, 'hold', 'selisih yang tak berarti dipaksa jadi keputusan');
});

test('V3 · fail-safe ke hold pada setiap masukan rusak, tanpa pernah melempar', () => {
  const rusak = [
    undefined, null, 42, 'x', [], {},
    { control: { n: 8, ok: 6 } },
    { control: { n: 0, ok: 0 }, candidate: { n: 8, ok: 4 } },
    { control: { n: 8, ok: 20 }, candidate: { n: 8, ok: 4 } },
    { control: { n: -5, ok: 1 }, candidate: { n: 8, ok: 4 } },
    { control: { n: 'delapan', ok: 6 }, candidate: { n: 8, ok: 4 } },
    { control: { n: NaN, ok: 6 }, candidate: { n: 8, ok: 4 } }
  ];
  for (const input of rusak) {
    let v;
    assert.doesNotThrow(() => { v = V.verdict(input); }, 'melempar pada ' + JSON.stringify(input));
    assert.strictEqual(v.decision, 'hold', 'masukan rusak tidak jatuh ke hold: ' + JSON.stringify(input));
    assert.ok(/^brain4_verdict_/.test(v.rationale), 'rationale tidak berprefix brain4_verdict_');
  }
});

test('V4 · keputusan membawa interval dan kode alasan stat-gate aslinya', () => {
  const v = V.verdict({ control: { n: 400, ok: 300 }, candidate: { n: 400, ok: 330 } });
  assert.ok(v.ci && typeof v.ci.lo === 'number' && typeof v.ci.hi === 'number',
    'keputusan tanpa interval — itu ambang lagi, hanya berganti nama');
  assert.ok(v.ci.lo <= v.ci.hi, 'interval terbalik');
  assert.ok(/^brain3_stat_/.test(v.basis), 'alasan asli stat-gate hilang: ' + v.basis);
  assert.deepStrictEqual(v.n, { control: 400, candidate: 400 }, 'jumlah bukti tidak dilaporkan');
});

test('V5 · harga klaim dilaporkan, bukan disembunyikan', () => {
  const perlu = V.requiredPerArm(0.8, 0.05);
  assert.ok(perlu > 800 && perlu < 1000,
    'kebutuhan sampel di luar rentang yang didokumentasikan council (~905/lengan): ' + perlu);
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · gerbang ini sensitif: ambang gaya lama menyebut 8-attempt sebagai keputusan', () => {
  // Tiru pemutus lama pada data V1. Kalau ia TIDAK menghasilkan keputusan, V1 hijau tanpa
  // membuktikan apa pun tentang perbaikannya.
  const skorLama = (c, k) => {
    const pc = c.ok / c.n, pk = k.ok / k.n;
    const score = Math.round(pk * 100);
    return score < 45 ? 'negative' : score >= 72 ? 'positive' : 'mixed';
  };
  assert.strictEqual(skorLama({ n: 8, ok: 6 }, { n: 8, ok: 2 }), 'negative',
    'pemutus lama tidak menyebut 8-attempt negative — perbandingannya tidak berarti');
  assert.strictEqual(V.verdict({ control: { n: 8, ok: 6 }, candidate: { n: 8, ok: 2 } }).decision, 'hold',
    'modul baru ikut memutuskan pada bukti yang sama tipisnya');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node policy-verdict-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL policy verdict: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL policy verdict: PASS (' + checks + ' uji · keputusan dari interval, bukan ambang)');
