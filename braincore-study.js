#!/usr/bin/env node
/**
 * FIEZEL — STUDI MURID SIMULASI: Braincore lawan mesin dasar (Fase 2 / Phase J).
 *
 * Fase H membandingkan keduanya pada 135 jalan dan mencetak selisihnya. Studi ini memperbesar
 * matriksnya dan — inilah bedanya — memasang SELANG KEPERCAYAAN pada setiap selisih, supaya
 * pertanyaan "apakah bedanya nyata?" dijawab, bukan dikira-kira dari besar angkanya.
 *
 * MESIN STATISTIKNYA DIPINJAM, BUKAN DITULIS SENDIRI. `ciBerpasangan`, `klasifikasiVerdict`,
 * dan `pesanArahFaktual` diambil apa adanya dari adaptivity-simulation-v3-extended.js, yang
 * mengambil bootstrap-nya dari fiezel-stat-gate.js. Menulis bootstrap kedua di sini akan
 * melahirkan dua mesin inferensi di satu repo yang suatu hari berselisih — persis yang
 * diperingatkan AUDIT/08 — dan yang kedua tidak akan pernah diaudit sebaik yang pertama.
 *
 * `pesanArahFaktual` dipakai apa adanya karena ia mengubur satu kelas bug yang nyata: versi
 * lama mencetak "RMSE TIDAK turun (0,2694 -> 0,2622)" untuk angka yang jelas-jelas TURUN.
 * Fungsi itu selalu menyebut arah faktual lebih dulu, lalu TERPISAH menyebut status
 * pembuktiannya. Laporan yang salah menyebut arah lebih buruk daripada laporan yang diam.
 *
 * KOSAKATA VONIS, dan ia dipatuhi kata per kata:
 *   terbukti_lebih_baik   CI seluruhnya di sisi baik DAN melewati margin praktis
 *   terbukti_lebih_buruk  CI seluruhnya di sisi buruk DAN melewati margin praktis
 *   terbukti_remeh        arahnya terbukti, besarnya di bawah margin praktis
 *   inconclusive          CI memeluk nol — TIDAK BOLEH ditulis sebagai "lebih baik"
 *   insufficient          pasangannya terlalu sedikit untuk menyimpulkan apa pun
 */
'use strict';

const fs = require('fs');
const path = require('path');
const V3 = require('./adaptivity-simulation-v3.js');
const Ext = require('./adaptivity-simulation-v3-extended.js');
const Cmp = require('./braincore-comparison.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

const OUT_DIR = path.join(__dirname, 'simulations');
const CI_SEED = 20260830;
const SEEDS = Array.from({ length: 20 }, (_, i) => 42 + i);

/**
 * Margin praktis — besar selisih yang layak disebut BERARTI, bukan sekadar terdeteksi.
 * Angkanya ditulis di sini supaya bisa dibantah. Dasarnya: galat taksiran 0,02 (2 poin persen)
 * tidak mengubah satu pun keputusan yang diambil mesin ini, sedangkan satu keputusan reteach
 * yang keliru adalah satu sesi belajar murid yang terbuang, jadi ambangnya jauh lebih ketat.
 */
const PRAKTIS = Object.freeze({ trackingError: 0.02, reteachSia2: 0.5, advanceLewat: 0.5 });

function jalankanMatriks() {
  const rows = [];
  for (const profil of V3.PROFILES) {
    for (const seed of SEEDS) {
      for (const gaya of ['normal', 'menebak', 'lambat']) {
        for (const refD of Cmp.REF_SWEEP) {
          for (const drift of Cmp.DRIFT_SWEEP) rows.push(Cmp.bandingkan(profil, seed, gaya, refD, drift));
        }
      }
    }
  }
  return rows;
}

/** Pisahkan satu matriks berpasangan menjadi dua lengan, urutannya DIPERTAHANKAN — pasangan
 *  ke-i di kedua lengan harus berasal dari murid dan bukti yang sama, atau CI-nya omong kosong. */
function belah(rows) {
  return {
    baseline: rows.map((r) => ({ ...r.baseline, profil: r.profil, seed: r.seed, gaya: r.gaya, refD: r.refD, kebenaran: r.kebenaran })),
    braincore: rows.map((r) => ({ ...r.braincore, profil: r.profil, seed: r.seed, gaya: r.gaya, refD: r.refD, kebenaran: r.kebenaran }))
  };
}

const SPEK = [
  { nama: 'trackingError', arah: 'turun', praktis: PRAKTIS.trackingError,
    ambil: (r) => r.trackingError,
    tanya: 'Seberapa dekat taksiran P(benar) pada kebenaran empiris?' },
  { nama: 'reteachSia2', arah: 'turun', praktis: PRAKTIS.reteachSia2,
    ambil: (r) => r.reteachSia2,
    saring: (r) => r.kebenaran < Cmp.HIGH,   // hanya murid yang memang sudah bisa
    tanya: 'Seberapa sering mesin mengajar ULANG murid yang sudah bisa?' },
  { nama: 'advanceLewat', arah: 'turun', praktis: PRAKTIS.advanceLewat,
    ambil: (r) => r.advanceLewat,
    saring: (r) => r.kebenaran > Cmp.LOW,    // hanya murid yang memang belum bisa
    tanya: 'Seberapa sering mesin menaikkan murid yang belum bisa?' }
];

/** Nama manusiawi untuk laju gerak kemampuan murid. */
function namaArm(drift) { return drift === 0 ? 'diam' : drift < 0 ? 'menurun' : 'membaik'; }

function ciUntuk(rows, label) {
  const arm = belah(rows);
  return SPEK.map((s) => {
    const row = Ext.ciBerpasangan(arm.baseline, arm.braincore, s, CI_SEED);
    row.arm = label;
    row.tanya = s.tanya;
    row.pesan = Ext.pesanArahFaktual(s.nama, row.meanBase, row.meanKandidat, row);
    return row;
  });
}

function jalankanStudi() {
  const rows = jalankanMatriks();
  const arm = belah(rows);
  // CI DIPISAH PER ARM GERAK. Menggabungkan murid yang diam, menurun, dan membaik ke dalam
  // satu angka akan menyembunyikan justru perbedaan yang paling menarik — dan pada versi
  // pertama studi ini, satu-satunya arm yang ada (diam) adalah arm yang paling memihak mesin
  // dasar. Satu angka gabungan akan mengulangi kesalahan itu dengan bentuk yang lebih rapi.
  const ciPerArm = {};
  for (const drift of Cmp.DRIFT_SWEEP) {
    ciPerArm[namaArm(drift)] = ciUntuk(rows.filter((r) => r.drift === drift), namaArm(drift));
  }
  const ci = ciUntuk(rows, 'gabungan');
  return {
    schema: 'fiezel-braincore-study-v1',
    braincoreVersion: Manifest.bundleVersion,
    lapisan: 'jalur keputusan per-jawaban (18 modul) — pemilihan soal BUKAN di sini, lihat AUDIT/08',
    konfigurasi: {
      profil: V3.PROFILES.map((p) => p.id), seeds: SEEDS,
      gaya: ['normal', 'menebak', 'lambat'], refDifficulty: Cmp.REF_SWEEP,
      driftSweep: Cmp.DRIFT_SWEEP, armGerak: Cmp.DRIFT_SWEEP.map(namaArm),
      jalanBerpasangan: rows.length, interaksiSimulasi: rows.length * Cmp.RUN_N,
      bootstrapIters: Ext.BOOT_ITERS, ciSeed: CI_SEED, praktis: PRAKTIS
    },
    ci, ciPerArm, rows, arm
  };
}

/** Ringkasan manusia. Ia HANYA boleh memakai kata dari kosakata vonis. */
function tulisRingkasan(studi) {
  const L = [];
  L.push('# Simulated Learner Study — Braincore vs baseline (Phase 2 / Phase J)');
  L.push('');
  L.push('**Braincore ' + studi.braincoreVersion + '** · ' + studi.konfigurasi.jalanBerpasangan
    + ' paired runs · ' + studi.konfigurasi.interaksiSimulasi + ' simulated interactions · '
    + studi.konfigurasi.bootstrapIters + '-iteration paired bootstrap (seed ' + studi.konfigurasi.ciSeed + ')');
  L.push('');
  L.push('Layer measured: ' + studi.lapisan + '.');
  L.push('');
  L.push('## Verdicts');
  L.push('');
  L.push('| metric | question | baseline | Braincore | mean diff | 95% CI | verdict |');
  L.push('|---|---|---|---|---|---|---|');
  for (const c of studi.ci) {
    L.push('| `' + c.metric + '` | ' + c.tanya + ' | ' + c.meanBase + ' | ' + c.meanKandidat
      + ' | ' + c.meanDiff + ' | [' + c.ciLo + ', ' + c.ciHi + '] | **' + c.verdict + '** |');
  }
  L.push('');
  L.push('Pairs used per metric: ' + studi.ci.map((c) => c.metric + ' ' + c.nPasangan).join(' · ') + '.');
  L.push('');
  L.push('## Per arm: does the learner move?');
  L.push('');
  L.push('The combined row above hides the most interesting split, so it is broken out. `diam` =');
  L.push('ability static, `menurun` = declining 0.035 theta/day, `membaik` = improving at the same');
  L.push('rate (the units are v3\'s own; its `menurun` profile declares -0.035/day).');
  L.push('');
  L.push('| arm | metric | baseline | Braincore | 95% CI | verdict |');
  L.push('|---|---|---|---|---|---|');
  for (const arm of Object.keys(studi.ciPerArm)) {
    for (const c of studi.ciPerArm[arm]) {
      if (c.insufficient) {
        L.push('| `' + arm + '` | `' + c.metric + '` | — | — | — | **insufficient** (no runs in band) |');
      } else {
        L.push('| `' + arm + '` | `' + c.metric + '` | ' + c.meanBase + ' | ' + c.meanKandidat
          + ' | [' + c.ciLo + ', ' + c.ciHi + '] | **' + c.verdict + '** |');
      }
    }
  }
  L.push('');
  L.push('**Read the split, not just the total.** Braincore\'s estimate is *proven better* for a');
  L.push('learner who is static or declining, and **inconclusive for a learner who is improving** —');
  L.push('its weakest case, and the one a learning product most wants to get right. A residual');
  L.push('negative bias remains: it still tends to under-estimate the learner, so it is slowest to');
  L.push('notice someone getting better.');
  L.push('');
  L.push('The over-reteaching finding survives every arm where it can be measured.');
  L.push('');
  L.push('## Direction and proof status, stated separately');
  L.push('');
  L.push('These lines come from `pesanArahFaktual`, reused verbatim from');
  L.push('`adaptivity-simulation-v3-extended.js`. It exists because an earlier report printed');
  L.push('*"RMSE did NOT fall (0.2694 → 0.2622)"* for a number that plainly fell. It always states');
  L.push('the factual direction first and the proof status separately.');
  L.push('');
  for (const c of studi.ci) L.push('- ' + c.pesan);
  L.push('');
  L.push('## How to read `inconclusive`');
  L.push('');
  L.push('`inconclusive` means the confidence interval **embraces zero**: on this evidence the');
  L.push('difference is not established in either direction. It does **not** mean "roughly equal",');
  L.push('and it must never be written up as "better". A metric marked `inconclusive` is an open');
  L.push('question, not a result.');
  L.push('');
  L.push('## This study previously reported the opposite, and the cause was a defect in the harness');
  L.push('');
  L.push('An earlier version of this study concluded that Braincore was **proven worse** than the');
  L.push('baseline on `trackingError`. That conclusion was wrong, and the reason was a bug in');
  L.push('`braincore-pipeline.js`, not in Braincore: the ability estimator was fed rows carrying');
  L.push('`correct`, while `FiezelCoreBrain.estimateAbility` reads `ok`. Every row therefore read');
  L.push('as a wrong answer. The estimate ran to its floor (0.40) and stayed pinned there while');
  L.push('true ability was 2.3-3.7 — and `predicted`, the quantity this whole comparison rests on,');
  L.push('is derived from that estimate. See `AUDIT/12`.');
  L.push('');
  L.push('## The over-reteaching is a design property, not the labelling defect');
  L.push('');
  L.push('`AUDIT/10` §4 found that `persistent_misconception` is reported without any misconception');
  L.push('evidence. The obvious question is whether `reteachSia2` is merely measuring that defect.');
  L.push('**It is not.** Applying the proposed fix to a copy of the tree and re-running this study');
  L.push('produced **byte-identical numbers**: the fix changes the reason *string*, not the *action*.');
  L.push('So there are two separate problems — a truthfulness problem in what the engine says, and');
  L.push('a behavioural one in what it does — and fixing the first will not move this metric.');
  L.push('');
  L.push('## What this study does NOT establish');
  L.push('');
  L.push('1. **Every learner is synthetic.** No real learner has been through this. Nothing here');
  L.push('   is evidence about learning outcomes.');
  L.push('2. **The latent learner shares Braincore\'s curve family** — it generates answers through');
  L.push('   Core Brain\'s `successProbability`. These numbers are an **upper bound for Braincore**,');
  L.push('   not a neutral estimate.');
  L.push('3. **Latent ability is static.** Nothing here measures whether Braincore *causes* learning.');
  L.push('4. **One layer.** Item selection is measured by `adaptivity-simulation-v3.js`, whose own');
  L.push('   verdict is a different trade-off (`AUDIT/08`). Do not merge the two into one headline.');
  // Tepat SATU baris baru di akhir. Versi pertama menutup dengan L.push('') lalu menambah '\n'
  // lagi, jadi berkasnya berakhir dengan baris kosong — `git diff --check` menandainya, `sh()`
  // di tools/fiezel-guardians.mjs melempar, dan A9 SERTA A10 ikut jatuh dengan stack trace.
  // Penjaganya benar; berkas sayalah yang cacat.
  return L.join('\n') + '\n';
}

function tulisSemua(studi) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const J = (o) => JSON.stringify(o, null, 2) + '\n';
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'),
    J({ schema: studi.schema, braincoreVersion: studi.braincoreVersion, lapisan: studi.lapisan,
        konfigurasi: studi.konfigurasi, ci: studi.ci, ciPerArm: studi.ciPerArm, rows: studi.rows }));
  fs.writeFileSync(path.join(OUT_DIR, 'baseline-results.json'),
    J({ arm: 'baseline', braincoreVersion: studi.braincoreVersion, rows: studi.arm.baseline }));
  fs.writeFileSync(path.join(OUT_DIR, 'braincore-results.json'),
    J({ arm: 'braincore', braincoreVersion: studi.braincoreVersion, rows: studi.arm.braincore }));
  fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), tulisRingkasan(studi));
}

module.exports = { SEEDS, PRAKTIS, SPEK, OUT_DIR, namaArm, jalankanStudi, tulisRingkasan, tulisSemua, belah };

// =========================================================================================
if (require.main === module) {
  const studi = jalankanStudi();
  if (process.argv.includes('--write')) {
    tulisSemua(studi);
    console.log('DITULIS → simulations/{results,baseline-results,braincore-results}.json + summary.md');
  }
  console.log('\n' + studi.konfigurasi.jalanBerpasangan + ' jalan berpasangan, '
    + studi.konfigurasi.interaksiSimulasi + ' interaksi simulasi\n');
  for (const c of studi.ci) {
    console.log('  ' + c.metric.padEnd(16) + String(c.verdict).padEnd(22)
      + 'n=' + String(c.nPasangan).padStart(4) + '  ' + c.pesan.slice(c.metric.length + 1));
  }
  console.log('\nSeluruh murid SINTETIS. Tidak ada satu pun angka di atas yang berbicara soal');
  console.log('hasil belajar murid sungguhan.');
}
