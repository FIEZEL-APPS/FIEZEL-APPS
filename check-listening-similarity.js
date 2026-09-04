#!/usr/bin/env node
/**
 * m025-114 pemeriksa kemiripan naskah listening.
 *
 * OWNER meminta pemeriksa kemiripan yang berdiri sendiri di root, terpisah dari gerbang
 * mutu yang dipanggil generator. Bedanya bukan aturannya - aturannya sama dan datang dari
 * features/speaking-listening/listening-quality.js - melainkan APA YANG DIPERIKSA:
 *
 *   listening-quality.js  memeriksa bahan SEBELUM bank ditulis, dan melempar di pelanggaran
 *                         pertama, karena satu soal cacat cukup untuk menolak bank.
 *   berkas ini            memeriksa listening-bank-v1.json YANG SUDAH TERSIMPAN, melaporkan
 *                         SEMUA pasangan mirip sekaligus, dan tidak mengubah apa pun.
 *
 * Naskah dictation sengaja dikecualikan dari perbandingan: ia memang kutipan dari naskah
 * skenarionya sendiri, jadi kemiripannya dengan induknya bukan cacat.
 *
 * Pakai:
 *   node check-listening-similarity.js            laporan ringkas
 *   node check-listening-similarity.js --json     keluaran mesin
 *   node check-listening-similarity.js --threshold 0.25
 *
 * Keluar dengan kode 1 bila ada pasangan di atas ambang, supaya bisa dipasang di CI.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var quality = require('./features/speaking-listening/listening-quality.js');

var BANK = path.join(__dirname, 'features', 'speaking-listening', 'listening-bank-v1.json');

/** Ambang bawaan sama dengan gerbang mutu, supaya keduanya tidak pernah berbeda pendapat. */
var DEFAULT_THRESHOLD = 0.34;

function parseArgs(argv) {
  var out = { json: false, threshold: DEFAULT_THRESHOLD };
  for (var i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') out.json = true;
    else if (argv[i] === '--threshold') {
      var n = Number(argv[++i]);
      if (!(n > 0 && n <= 1)) throw new Error('--threshold harus di antara 0 dan 1');
      out.threshold = n;
    }
  }
  return out;
}

/**
 * Satu skenario memang dipakai beberapa soal dengan naskah yang sama persis. Yang
 * dibandingkan karena itu naskah UNIK per level, bukan tiap item - kalau tidak, setiap
 * skenario akan melaporkan dirinya sendiri sepuluh kali.
 */
function uniqueScripts(items) {
  var byLevel = Object.create(null);
  items.forEach(function (item) {
    if (item.mode === 'dictation') return;
    var level = item.level;
    var key = String(item.script).toLowerCase().trim();
    var bucket = byLevel[level] || (byLevel[level] = { seen: Object.create(null), rows: [] });
    if (bucket.seen[key]) return;
    bucket.seen[key] = true;
    bucket.rows.push({
      id: item.id,
      level: level,
      mode: item.mode,
      scenario: (item.pedagogy && item.pedagogy.scenario) || '',
      character: (item.pedagogy && item.pedagogy.character) || '',
      script: item.script,
      tri: quality.trigrams(item.script),
      opening: quality.content(item.script).slice(0, 4).join(' ')
    });
  });
  return byLevel;
}

function comparePairs(byLevel, threshold) {
  var findings = [];
  Object.keys(byLevel).forEach(function (level) {
    var rows = byLevel[level].rows;
    for (var i = 0; i < rows.length; i++) {
      for (var j = i + 1; j < rows.length; j++) {
        var a = rows[i], b = rows[j];
        var score = quality.jaccard(a.tri, b.tri);
        var sameOpening = !!a.opening && a.opening === b.opening;
        if (score < threshold && !sameOpening) continue;
        findings.push({
          level: level,
          similarity: Math.round(score * 100) / 100,
          sharedOpening: sameOpening ? a.opening : null,
          // Item listen_gen_* berasal dari generator lama; kalau salah satu pasangan
          // berasal dari sana, itulah yang harus ditulis ulang, bukan pasangannya.
          rewrite: /^listen_gen_/.test(b.id) ? b.id : (/^listen_gen_/.test(a.id) ? a.id : b.id),
          a: { id: a.id, mode: a.mode, character: a.character, scenario: a.scenario, script: a.script },
          b: { id: b.id, mode: b.mode, character: b.character, scenario: b.scenario, script: b.script }
        });
      }
    }
  });
  return findings.sort(function (x, y) { return y.similarity - x.similarity; });
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));
  var items = bank.items || [];
  var byLevel = uniqueScripts(items);
  var compared = Object.keys(byLevel).reduce(function (n, level) {
    var m = byLevel[level].rows.length;
    return n + m * (m - 1) / 2;
  }, 0);
  var findings = comparePairs(byLevel, args.threshold);

  if (args.json) {
    console.log(JSON.stringify({
      schema: 'fiezel-listening-similarity-v1',
      bank: path.relative(__dirname, BANK),
      items: items.length,
      scriptsCompared: compared,
      threshold: args.threshold,
      findings: findings
    }, null, 2));
  } else {
    console.log('Bank      : ' + path.relative(__dirname, BANK));
    console.log('Item      : ' + items.length + ' (naskah dictation dikecualikan dari perbandingan)');
    console.log('Pasangan  : ' + compared + ' dibandingkan, ambang Jaccard trigram ' + args.threshold);
    console.log('');
    if (!findings.length) {
      console.log('Tidak ada pasangan naskah yang mirip.');
    } else {
      console.log(findings.length + ' pasangan mirip. Tulis ulang kolom "tulis ulang":');
      findings.forEach(function (f) {
        console.log('');
        console.log('  [' + f.level + '] similarity ' + f.similarity
          + (f.sharedOpening ? '  · empat kata pembuka sama: "' + f.sharedOpening + '"' : ''));
        console.log('    A  ' + f.a.id + '  (' + f.a.character + ')  ' + f.a.script.slice(0, 90));
        console.log('    B  ' + f.b.id + '  (' + f.b.character + ')  ' + f.b.script.slice(0, 90));
        console.log('    tulis ulang: ' + f.rewrite);
      });
    }
  }
  process.exit(findings.length ? 1 : 0);
}

main();
