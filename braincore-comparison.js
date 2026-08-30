#!/usr/bin/env node
/**
 * FIEZEL — PEMBANDING: Braincore lawan mesin dasar, pada BUKTI YANG IDENTIK (Fase 2 / Phase H).
 *
 * PERTANYAAN YANG DIJAWAB, dan yang SENGAJA tidak dijawab di sini.
 *
 * adaptivity-simulation-v3.js sudah menjawab "kebijakan mana yang memilih SOAL lebih baik",
 * berseed, multi-seed, dengan CI bootstrap, dan jawabannya sebuah PERTUKARAN, bukan kemenangan
 * (lihat AUDIT/08). Berkas ini tidak mengulanginya dan tidak boleh dibaca seolah mengulanginya.
 *
 * Yang ditanya di sini satu tingkat lebih dalam: DIBERI BUKTI YANG SAMA PERSIS, mesin mana yang
 * MEMBACA murid lebih benar, dan siapa yang keliru bertindak? Karena kedua mesin diberi deret
 * jawaban yang identik — dibangkitkan sekali, lalu disodorkan ke keduanya — perbandingannya
 * BERPASANGAN: tidak ada perbedaan yang bisa datang dari keberuntungan sampel.
 *
 * KEBENARAN DASAR (ground truth) diukur sebagai HASIL, bukan sebagai rumus. Untuk setiap murid
 * laten, kebenarannya adalah proporsi benar empiris pada 200 soal uji terpisah di kesulitan
 * rujukan, dibangkitkan dari aliran acak SENDIRI supaya tidak mengganggu jalannya. Memakai
 * rumus IRT sebagai kebenaran akan lebih rapi dan LEBIH BERAT SEBELAH: rumus itu keluarga yang
 * sama dengan yang dipakai penaksir kemampuan Braincore.
 *
 * BATAS YANG TETAP ADA, DAN HARUS IKUT DIKUTIP. Murid latennya tetap MODEL — model yang ditulis
 * simulator v3, yang membangkitkan jawaban lewat successProbability milik Core Brain. Jadi
 * bahkan dengan kebenaran berbasis hasil, Braincore diuji di dunia yang bentuk kurvanya ia
 * kenal. Murid sungguhan tidak memberi keuntungan itu. Angka apa pun di bawah adalah batas
 * ATAS bagi Braincore, bukan taksiran netral.
 */
'use strict';

const V3 = require('./adaptivity-simulation-v3.js');
const Brain = require('./braincore-pipeline.js');
const Baseline = require('./braincore-baseline.js');

const DAY = 86_400_000;
const T0 = Date.parse('2026-08-24T10:00:00Z');
const FAMILY = 'tense_aspect';
const REF_DIFFICULTY = 3;      // kesulitan rujukan bawaan
// TIGA kesulitan rujukan, dan alasannya adalah temuan: pada 3 saja, kebenaran empiris seluruh
// profil jatuh di 0,24-0,60, jadi pita "murid ini jelas sudah bisa" (>= 0,8) TIDAK PERNAH
// tersentuh dan metrik remediasi-sia-sia melaporkan 0 lawan 0 seolah itu hasil. Nol yang tidak
// pernah diuji bukan hasil, itu metrik yang diam. Menyapu kesulitan membuat ketiga pita hidup.
const REF_SWEEP = Object.freeze([1.5, 3, 4.5]);
const PROBE_N = 200;           // panjang uji terpisah untuk kebenaran empiris
const RUN_N = 40;              // panjang deret bukti per murid
const HIGH = 0.8;              // "murid ini jelas sudah bisa"
const LOW = 0.4;               // "murid ini jelas belum bisa"

/** Kebenaran empiris: jalankan PROBE_N soal di kesulitan rujukan pada aliran acak terpisah. */
function kebenaran(profil, seed, refD = REF_DIFFICULTY) {
  const murid = V3.buatMurid(profil, V3.mulberry32(seed ^ 0x9e3779b9));
  let benar = 0;
  for (let i = 0; i < PROBE_N; i++) if (V3.jawab(murid, FAMILY, refD)) benar++;
  return benar / PROBE_N;
}

/**
 * Satu deret bukti, dibangkitkan SEKALI dari murid laten dan dipakai kedua mesin.
 *
 * Kesulitan yang disajikan mengikuti jadwal tetap, bukan pilihan salah satu mesin. Itu
 * disengaja: begitu tiap mesin memilih soalnya sendiri, keduanya melihat bukti yang berbeda
 * dan perbandingannya berhenti berpasangan — dan pertanyaan "siapa memilih soal lebih baik"
 * memang bukan pertanyaan berkas ini.
 */
function deretBukti(profil, seed, gaya, refD = REF_DIFFICULTY) {
  const murid = V3.buatMurid(profil, V3.mulberry32(seed));
  const rows = [];
  for (let i = 0; i < RUN_N; i++) {
    const d = refD;
    const benar = V3.jawab(murid, FAMILY, d);
    // Gaya menjawab mengubah BUKTI-nya, bukan kebenarannya: murid yang sama, cara menjawab
    // berbeda. Di sinilah kredibilitas bukti seharusnya berbicara — atau terbukti tidak.
    const ms = gaya === 'menebak' ? 700 : gaya === 'lambat' ? 26000 : 9000;
    rows.push({ correct: benar, ms, day: i + 1, session: Math.floor(i / 5) });
  }
  return rows;
}

const Q = {
  id: 'cmp-tense-aspect-1', concept: 'tense_aspect', lesson: 'tense_aspect',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
};

/** Jalankan SATU deret bukti lewat kedua mesin dan kumpulkan metriknya. */
function bandingkan(profil, seed, gaya, refD = REF_DIFFICULTY) {
  const bukti = deretBukti(profil, seed, gaya, refD);
  const truth = kebenaran(profil, seed, refD);

  let bl = Baseline.createLearner({ level: 'A2' });
  let bc = Brain.createLearner({ level: 'A2', now: T0 });
  let sesiBc = -1;

  const m = {
    baseline: { err: 0, n: 0, errM: 0, nM: 0, reteachSia2: 0, advanceLewat: 0, akhir: null, keputusan: [] },
    braincore: { err: 0, n: 0, errM: 0, nM: 0, reteachSia2: 0, advanceLewat: 0, akhir: null, keputusan: [] }
  };

  for (const ev of bukti) {
    const now = T0 + ev.day * DAY;
    const a = { correct: ev.correct, ms: ev.ms };

    const rb = Baseline.answer(bl, Q, a, now); bl = rb.learner;
    if (ev.session !== sesiBc) { bc = Brain.newSession(bc, now); sesiBc = ev.session; }
    const rc = Brain.answer(bc, Q, a, now); bc = rc.learner;

    // DUA UKURAN, dan hanya SATU dari keduanya yang sah. Lihat catatan besar di bawah fungsi
    // ini: `L` milik BKT bukan besaran yang sama dengan akurasi bergulir baseline, jadi
    // membandingkan keduanya terhadap kebenaran berbasis akurasi adalah membandingkan apel
    // dengan jeruk. Keduanya tetap dihitung — yang keliru TIDAK dihapus, karena menghapusnya
    // berarti menyembunyikan kekeliruan saya sendiri.
    const pasangan = [
      ['baseline',  rb.belief, rb.belief, rb.decision],
      ['braincore', rc.trace.evidence.predicted, rc.trace.masteryAfter ? rc.trace.masteryAfter.L : null, rc.trace.decision]
    ];
    for (const [nama, sebanding, mastery, putusan] of pasangan) {
      const s = m[nama];
      s.keputusan.push(putusan);
      if (sebanding !== null && sebanding !== undefined) {
        s.err += Math.abs(sebanding - truth); s.n++; s.akhir = sebanding;
      }
      if (mastery !== null && mastery !== undefined) { s.errM += Math.abs(mastery - truth); s.nM++; }
      // TEMUAN METODOLOGIS, dan metrik lamanya dibuang karena ini. Menghitung SEMUA remediasi
      // (hint + reteach) menghasilkan angka yang identik untuk kedua mesin — 114 lawan 114,
      // 786 lawan 786 — dan itu bukan kebetulan: keduanya meremediasi tepat ketika jawabannya
      // salah, dan jumlah jawaban salah SAMA karena buktinya dibagi. Metrik itu mengukur
      // "berapa kali murid salah", bukan "mesin mana yang lebih bijak". Ia degenerate: dua
      // angka yang tidak mungkin berbeda tidak pernah bisa membedakan apa pun.
      //
      // Yang membedakan adalah PILIHAN di antara tindakan yang tersedia pada momen yang sama:
      // reteach adalah intervensi berat, advance adalah promosi. Keduanya bisa berbeda
      // sekalipun buktinya identik.
      if (truth >= HIGH && putusan === 'reteach') s.reteachSia2++;   // mengajar ULANG yang sudah bisa
      if (truth <= LOW && putusan === 'advance') s.advanceLewat++;   // menaikkan yang belum bisa
    }
  }

  let beda = 0;
  for (let i = 0; i < m.baseline.keputusan.length; i++) {
    if (m.baseline.keputusan[i] !== m.braincore.keputusan[i]) beda++;
  }

  const ringkas = (s) => ({
    trackingError: s.n ? Number((s.err / s.n).toFixed(4)) : null,
    trackingErrorMasteryTIDAKSEBANDING: s.nM ? Number((s.errM / s.nM).toFixed(4)) : null,
    keyakinanAkhir: s.akhir === null ? null : Number(s.akhir.toFixed(4)),
    reteachSia2: s.reteachSia2,
    advanceLewat: s.advanceLewat
  });

  return {
    profil: profil.id, seed, gaya, refD,
    kebenaran: Number(truth.toFixed(4)),
    keputusanBerbeda: beda,
    jumlahKeputusan: m.baseline.keputusan.length,
    baseline: ringkas(m.baseline),
    braincore: ringkas(m.braincore)
  };
}

/* ==========================================================================================
 * CATATAN YANG HARUS DIBACA BERSAMA ANGKA `trackingErrorMasteryTIDAKSEBANDING`.
 *
 * Versi pertama pembanding ini memakai `L` milik BKT sebagai keyakinan Braincore, lalu
 * melaporkan bahwa mesin DASAR menang telak: 40 dari 45 jalan, selisih rata-rata +0,105.
 * Angka itu benar sebagai aritmetika dan SALAH sebagai perbandingan.
 *
 * `L` adalah P(murid sudah menguasai keterampilan). Akurasi bergulir baseline adalah taksiran
 * P(murid menjawab benar). Kebenaran dasar di berkas ini diukur sebagai proporsi benar empiris
 * — yaitu besaran yang KEDUA. Jadi baseline sedang dinilai pada besaran yang secara definisi
 * memang ia taksir, sementara Braincore dinilai pada besaran yang bukan miliknya. Kemenangan
 * seperti itu nyaris tautologi.
 *
 * Besaran Braincore yang sebanding sudah ada dan sudah tercatat di trace: `evidence.predicted`
 * — P(benar) pada kesulitan yang DISAJIKAN, dari penaksir kemampuan. Itulah yang dipakai
 * `trackingError` sekarang.
 *
 * Kekeliruan itu tidak dihapus, hanya diberi nama yang menyebut cacatnya. Menghapusnya akan
 * menghapus satu-satunya bukti bahwa perbandingan ini pernah salah — dan pembanding yang
 * menyembunyikan salah bandingnya sendiri tidak pantas dipercaya untuk membandingkan apa pun.
 * ======================================================================================== */

/** Seluruh matriks: setiap profil x seed x gaya menjawab. */
function jalankanSemua(seeds = [42, 43, 44, 45, 46]) {
  const out = [];
  for (const profil of V3.PROFILES) {
    for (const seed of seeds) {
      for (const gaya of ['normal', 'menebak', 'lambat']) {
        for (const refD of REF_SWEEP) out.push(bandingkan(profil, seed, gaya, refD));
      }
    }
  }
  return out;
}

/** Agregat berpasangan: selisih per baris, lalu rata-rata. Tanpa uji signifikansi — jumlah
 *  barisnya kecil, dan mengarang signifikansi persis yang dilarang brief fase ini. */
function agregat(rows) {
  const acc = { n: rows.length, trackingBraincoreLebihBaik: 0, trackingBaselineLebihBaik: 0,
                seri: 0, dTracking: 0, sia2Baseline: 0, sia2Braincore: 0,
                lewatBaseline: 0, lewatBraincore: 0,
                keputusanBerbeda: 0, jumlahKeputusan: 0 };
  for (const r of rows) {
    const a = r.baseline.trackingError, b = r.braincore.trackingError;
    if (a === null || b === null) continue;
    acc.dTracking += (b - a);
    acc.keputusanBerbeda += r.keputusanBerbeda;
    acc.jumlahKeputusan += r.jumlahKeputusan;
    if (b < a) acc.trackingBraincoreLebihBaik++;
    else if (a < b) acc.trackingBaselineLebihBaik++;
    else acc.seri++;
    acc.sia2Baseline += r.baseline.reteachSia2;
    acc.sia2Braincore += r.braincore.reteachSia2;
    acc.lewatBaseline += r.baseline.advanceLewat;
    acc.lewatBraincore += r.braincore.advanceLewat;
  }
  acc.dTracking = Number((acc.dTracking / (acc.n || 1)).toFixed(4));
  return acc;
}

module.exports = { REF_DIFFICULTY, REF_SWEEP, PROBE_N, RUN_N, HIGH, LOW, kebenaran, deretBukti,
                   bandingkan, jalankanSemua, agregat };

// =========================================================================================
if (require.main === module) {
  const rows = jalankanSemua();
  const a = agregat(rows);
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ rows, agregat: a }, null, 2)); process.exit(0); }

  console.log('BUKTI IDENTIK, DUA MESIN. ' + rows.length + ' jalan ('
    + V3.PROFILES.length + ' profil x 5 seed x 3 gaya menjawab)\n');
  const pitaTinggi = rows.filter((r) => r.kebenaran >= HIGH).length;
  const pitaRendah = rows.filter((r) => r.kebenaran <= LOW).length;
  console.log('  pita terpakai: kebenaran >= ' + HIGH + ' pada ' + pitaTinggi + ' jalan, <= '
    + LOW + ' pada ' + pitaRendah + ' jalan (kalau salah satu 0, metriknya diam, bukan bagus)\n');
  console.log('  ' + 'profil/gaya/d'.padEnd(28) + 'benar'.padStart(7)
    + 'trackErr:dasar'.padStart(16) + 'trackErr:brain'.padStart(16)
    + 'sia2 d/b'.padStart(11) + 'lewat d/b'.padStart(11));
  for (const r of rows) {
    console.log('  ' + (r.profil + '/' + r.gaya + '/' + r.refD).padEnd(28)
      + String(r.kebenaran).padStart(7)
      + String(r.baseline.trackingError).padStart(16)
      + String(r.braincore.trackingError).padStart(16)
      + (r.baseline.reteachSia2 + '/' + r.braincore.reteachSia2).padStart(11)
      + (r.baseline.advanceLewat + '/' + r.braincore.advanceLewat).padStart(11));
  }
  console.log('\nAGREGAT (berpasangan, ' + a.n + ' jalan)');
  console.log('  galat pelacakan lebih kecil : Braincore ' + a.trackingBraincoreLebihBaik
    + ' jalan, dasar ' + a.trackingBaselineLebihBaik + ' jalan, seri ' + a.seri);
  console.log('  selisih rata-rata galat     : ' + a.dTracking
    + '  (negatif = Braincore lebih dekat pada kebenaran)');
  console.log('  reteach pada yang sudah bisa: dasar ' + a.sia2Baseline + ', Braincore ' + a.sia2Braincore);
  console.log('  advance pada yang belum bisa: dasar ' + a.lewatBaseline + ', Braincore ' + a.lewatBraincore);
  console.log('  keputusan yang berbeda      : ' + a.keputusanBerbeda + ' dari ' + a.jumlahKeputusan);
  console.log('\nBACA DENGAN BATASNYA. Murid latennya MODEL, dan modelnya membangkitkan jawaban');
  console.log('lewat kurva yang sekeluarga dengan penaksir Braincore. Angka di atas adalah batas');
  console.log('ATAS bagi Braincore, bukan taksiran netral, dan bukan bukti soal murid sungguhan.');
}
