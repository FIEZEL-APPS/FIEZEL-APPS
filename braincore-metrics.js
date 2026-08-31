#!/usr/bin/env node
/**
 * FIEZEL — METRIK HASIL BELAJAR untuk Braincore (Fase 2 / Phase I).
 *
 * LIMA PERTANYAAN, LIMA ANGKA. Berkas ini mendefinisikan — sebagai kode, bukan sebagai prosa —
 * apa artinya Braincore "bekerja", supaya dua rilis bisa dinilai pada mistar yang sama dan
 * supaya pembeli bisa MEMBANTAH mistarnya, bukan menebaknya.
 *
 *   1. masteryAccuracy      Apakah taksiran mesin mengikuti kemampuan murid yang sebenarnya?
 *   2. retention            Apakah model ingatan bereaksi benar pada lupa dan pengulangan?
 *   3. misconceptionRecovery Apakah remediasi yang menyasar benar-benar mengurangi miskonsepsinya?
 *   4. adaptationQuality    Apakah kesulitan soal mengikuti keadaan murid, bukan berjalan sendiri?
 *   5. interventionEfficiency Apakah mesin menahan diri terhadap murid yang sudah jelas bisa?
 *
 * ATURAN YANG BERLAKU UNTUK KELIMANYA, DAN ALASANNYA NYATA.
 *
 * Setiap metrik mengembalikan `null` bila ia tidak bisa diukur — TIDAK PERNAH 0. Ini bukan
 * kerapian gaya: cacat itu sudah pernah terjadi di proyek ini. Pada Fase B, `Number(null)` yang
 * bernilai 0 mengubah "belum diukur" menjadi "nol", dan trace pertama yang dibangun melaporkan
 * `predicted: 0` — "murid ini pasti gagal" — padahal yang benar adalah "belum ada bukti".
 * Sebuah metrik yang melaporkan 0 untuk "tidak terukur" akan membuat rilis yang tidak diuji
 * terlihat seperti rilis yang buruk, atau lebih berbahaya lagi, sebaliknya.
 *
 * Dan setiap metrik membawa `n` — banyaknya pengamatan yang menyusunnya. Angka tanpa n adalah
 * angka yang tidak bisa ditimbang: 0,02 dari 3 pengamatan dan 0,02 dari 3.000 bukan klaim yang
 * sama, dan laporan yang menyembunyikan bedanya sedang membujuk, bukan melapor.
 */
'use strict';

const V3 = require('./adaptivity-simulation-v3.js');
const Brain = require('./braincore-pipeline.js');
const Cmp = require('./braincore-comparison.js');

const DAY = 86_400_000;
const T0 = Date.parse('2026-08-24T10:00:00Z');
const FAMILY = 'tense_aspect';

const Q = {
  id: 'met-tense-aspect-1', concept: 'tense_aspect', lesson: 'tense_aspect',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
};

/** Bungkus hasil: nilai + jumlah pengamatan + kalimat yang menyebut apa artinya. */
function metric(value, n, arti) {
  return { value: (n > 0 && isFinite(value)) ? Number(value.toFixed(4)) : null, n, arti };
}

/* =========================================================================================
 * 1. MASTERY ACCURACY — apakah taksiran mengikuti kemampuan yang sebenarnya?
 *
 * Diukur sebagai rata-rata |predicted − kebenaran empiris|, di mana `predicted` adalah P(benar)
 * milik Braincore pada kesulitan yang disajikan dan kebenarannya adalah proporsi benar empiris
 * pada soal uji terpisah. LEBIH KECIL LEBIH BAIK; 0 berarti taksirannya sempurna.
 *
 * KENAPA BUKAN `L` MILIK BKT: `L` adalah P(sudah menguasai), bukan P(menjawab benar), dan
 * menilainya terhadap kebenaran berbasis akurasi adalah membandingkan dua besaran berbeda.
 * Kekeliruan itu nyata dan sempat hampir diterbitkan — lihat AUDIT/10 §3.
 * ====================================================================================== */
function masteryAccuracy(traces, kebenaran) {
  let err = 0, n = 0;
  for (const t of traces) {
    const p = t.evidence.predicted;
    if (p === null || p === undefined) continue;   // belum ada bukti untuk memprediksi
    err += Math.abs(p - kebenaran); n++;
  }
  return metric(err / (n || 1), n, 'galat rata-rata taksiran P(benar); lebih kecil lebih baik');
}

/* =========================================================================================
 * 2. RETENTION — apakah model ingatan bereaksi benar pada lupa dan pengulangan?
 *
 * Bukan "berapa stabilitasnya", melainkan APAKAH ARAHNYA BENAR, dua arah:
 *   - berhasil sesudah jeda panjang  -> stabilitas HARUS naik (efek spasi)
 *   - gagal sesudah jeda             -> stabilitas HARUS turun (lapse)
 * Nilainya adalah proporsi transisi yang arahnya benar. LEBIH BESAR LEBIH BAIK; 1 = selalu benar.
 *
 * Arah diuji, bukan besaran, karena besaran yang "benar" menuntut teori ingatan yang tidak
 * dimiliki siapa pun di sini. Arah yang salah adalah cacat tanpa perlu teori.
 * ====================================================================================== */
function retention(traces) {
  let benar = 0, n = 0;
  for (let i = 1; i < traces.length; i++) {
    const before = traces[i].memoryBefore, after = traces[i].memoryAfter;
    if (!before || !after) continue;               // jawaban pertama: tidak ada "sebelum"
    const ok = traces[i].evidence.correct;
    if (ok === null) continue;
    const naik = after.stabilityDays > before.stabilityDays;
    if (ok === naik) benar++;                      // benar->naik, salah->turun
    n++;
  }
  return metric(benar / (n || 1), n, 'proporsi transisi ingatan yang ARAHNYA benar; lebih besar lebih baik');
}

/**
 * RETENTION, bagian kedua — dan alasan bagian ini ditambahkan.
 *
 * `retention()` di atas selalu mengembalikan 1,0 pada 45 murid. Itu bukan prestasi, itu
 * TAUTOLOGI: `CoreBrain.updateMemory` MEMANG didefinisikan menaikkan stabilitas pada sukses dan
 * meruntuhkannya pada lapse, jadi metriknya mustahil gagal kecuali modulnya tersambung terbalik.
 * Nilai 1,0 seperti itu berguna sebagai deteksi salah-kabel dan TIDAK berguna sebagai ukuran
 * mutu — dan melaporkannya sebagai "retensi sempurna" akan melebih-lebihkan mesin ini.
 * (Cacat yang sama dengan metrik remediasi degenerate di Fase H; lihat AUDIT/10 §3.)
 *
 * Yang di bawah BISA gagal: efek spasi harus MONOTON pada panjang jeda — mengulang setelah 30
 * hari harus memberi kenaikan stabilitas lebih besar daripada setelah 1 hari. Itu klaim tentang
 * bentuk kurvanya, bukan tentang tandanya, dan sebuah model ingatan yang salah bisa
 * melanggarnya sambil tetap lolos uji tanda.
 */
function retentionSpacingMonotonic(gaps = [1, 3, 7, 14, 30, 60]) {
  const gains = [];
  for (const gap of gaps) {
    let learner = Brain.createLearner({ level: 'A2', now: T0 });
    let r = Brain.answer(learner, Q, { correct: true, ms: 7000 }, T0 + DAY);
    learner = Brain.newSession(r.learner, T0 + (1 + gap) * DAY);
    r = Brain.answer(learner, Q, { correct: true, ms: 7000 }, T0 + (1 + gap) * DAY);
    const b = r.trace.memoryBefore, a = r.trace.memoryAfter;
    if (!b || !a) continue;
    gains.push({ gap, gain: a.stabilityDays - b.stabilityDays });
  }
  let monoton = 0, n = 0;
  for (let i = 1; i < gains.length; i++) { if (gains[i].gain > gains[i - 1].gain) monoton++; n++; }
  return { ...metric(monoton / (n || 1), n,
    'proporsi pasangan jeda yang efek spasinya MONOTON naik; 1 = kurvanya berperilaku benar'),
    gains: gains.map((g) => ({ gap: g.gap, gain: Number(g.gain.toFixed(3)) })) };
}

/* =========================================================================================
 * 3. MISCONCEPTION RECOVERY — apakah remediasi yang menyasar mengurangi miskonsepsinya?
 *
 * Dijalankan sebagai skenario, bukan dibaca dari trace yang lewat: bangun satu miskonsepsi
 * sampai AKTIF, lalu berikan jawaban benar berulang, dan catat berapa banyak bukti benar yang
 * dibutuhkan sampai ia RESOLVED. Nilainya jumlah jawaban benar itu; `null` bila tidak pernah
 * pulih dalam batas percobaan — dan "tidak pernah pulih" adalah temuan, bukan nol.
 * LEBIH KECIL LEBIH BAIK, tetapi terlalu kecil juga buruk: tuduhan yang bisa dihapus satu
 * jawaban benar tidak menjaga siapa pun. Karena itu metrik ini dibaca berpasangan dengan
 * gerbang misconception-04 di Fase G, yang menuntut pemulihan TIDAK instan.
 * ====================================================================================== */
function misconceptionRecovery(maxBenar = 20) {
  let learner = Brain.createLearner({ level: 'A2', now: T0 });
  let hari = 0, sesi = 0;
  const salah = () => {
    hari += 1; sesi += 1;
    learner = Brain.newSession(learner, T0 + hari * DAY);
    return Brain.answer(learner, Q, { correct: false, ms: 7000, chosenMisconception: 'm_ed_ending' },
                        T0 + hari * DAY);
  };
  let r = null;
  for (let i = 0; i < 4; i++) { r = salah(); learner = r.learner; }
  if (!r.trace.misconceptionState || r.trace.misconceptionState.activeCount < 1) {
    return metric(NaN, 0, 'miskonsepsi tidak pernah menjadi aktif — metrik ini tidak bisa diukur di sini');
  }
  for (let i = 1; i <= maxBenar; i++) {
    hari += 3; sesi += 1;
    learner = Brain.newSession(learner, T0 + hari * DAY);
    r = Brain.answer(learner, Q, { correct: true, ms: 7000 }, T0 + hari * DAY);
    learner = r.learner;
    if (r.trace.misconceptionState.activeCount === 0) {
      return metric(i, 1, 'jumlah jawaban benar sampai miskonsepsi PULIH; null = tidak pernah pulih');
    }
  }
  return metric(NaN, 0, 'tidak pulih dalam ' + maxBenar + ' jawaban benar — TEMUAN, bukan nol');
}

/* =========================================================================================
 * 4. ADAPTATION QUALITY — apakah kesulitan mengikuti keadaan murid?
 *
 * Korelasi tanda antara perubahan kesulitan efektif dan hasil jawaban sebelumnya: sesudah
 * benar, kesulitan seharusnya tidak turun; sesudah salah, tidak naik. Nilainya proporsi
 * langkah yang arahnya masuk akal. LEBIH BESAR LEBIH BAIK.
 *
 * BATAS YANG HARUS IKUT DIBACA: pipeline menyajikan kesulitan yang DITENTUKAN PEMANGGIL, jadi
 * yang bergerak di sini hanya koreksi kalibrasi item, bukan pemilihan soal. Pemilihan soal
 * adalah lapisan milik adaptivity-simulation-v3.js (AUDIT/08). Metrik ini karena itu mengukur
 * "apakah taksiran kesulitan item bergerak masuk akal", BUKAN "apakah murid mendapat soal yang
 * tepat" — dan menyamakan keduanya akan melebih-lebihkan apa yang diukur di sini.
 * ====================================================================================== */
function adaptationQuality(traces) {
  let masukAkal = 0, n = 0;
  for (let i = 1; i < traces.length; i++) {
    const d0 = traces[i - 1].difficultyState, d1 = traces[i].difficultyState;
    if (!d0 || !d1 || d0.effective === null || d1.effective === null) continue;
    const delta = d1.effective - d0.effective;
    if (delta === 0) continue;                     // diam bukan arah; tidak dihitung
    const okSebelumnya = traces[i - 1].evidence.correct;
    if (okSebelumnya === null) continue;
    if ((okSebelumnya && delta <= 0) || (!okSebelumnya && delta >= 0)) masukAkal++;
    n++;
  }
  return metric(masukAkal / (n || 1), n,
    'proporsi langkah kesulitan yang arahnya masuk akal (benar->tidak naik, salah->tidak turun)');
}

/* =========================================================================================
 * 5. INTERVENTION EFFICIENCY — apakah mesin menahan diri terhadap murid yang sudah bisa?
 *
 * Proporsi keputusan reteach yang dijatuhkan pada murid yang kebenaran empirisnya TINGGI.
 * LEBIH KECIL LEBIH BAIK; 0 berarti tidak pernah mengajar ulang orang yang sudah bisa.
 *
 * Fase H sudah mengukur ini lawan mesin dasar dan hasilnya TIDAK menyenangkan: 24 lawan 9.
 * Metrik ini adalah bentuk mandirinya, supaya ia bisa dilacak antar rilis tanpa harus
 * menjalankan seluruh pembanding.
 * ====================================================================================== */
function interventionEfficiency(traces, kebenaran, ambang) {
  const HIGH = isFinite(ambang) ? ambang : Cmp.HIGH;
  if (kebenaran < HIGH) {
    return metric(NaN, 0, 'murid ini tidak berada di pita "sudah bisa" — metrik tidak berlaku, BUKAN nol');
  }
  let reteach = 0;
  for (const t of traces) if (t.decision === 'reteach') reteach++;
  return metric(reteach / (traces.length || 1), traces.length,
    'proporsi keputusan reteach pada murid yang SUDAH bisa; lebih kecil lebih baik');
}

/* ======================================================================================= */

/** Jalankan satu murid laten dan kumpulkan trace-nya — masukan untuk metrik 1, 2, 4, 5. */
function jalankan(profil, seed, refD, gaya = 'normal') {
  const bukti = Cmp.deretBukti(profil, seed, gaya, refD);
  let learner = Brain.createLearner({ level: 'A2', now: T0 });
  let sesi = -1;
  const traces = [];
  for (const ev of bukti) {
    const now = T0 + ev.day * DAY;
    if (ev.session !== sesi) { learner = Brain.newSession(learner, now); sesi = ev.session; }
    const r = Brain.answer(learner, Q, { correct: ev.correct, ms: ev.ms }, now);
    learner = r.learner;
    traces.push(r.trace);
  }
  return traces;
}

/** Seluruh metrik untuk satu murid. */
function ukurSatu(profil, seed, refD) {
  const traces = jalankan(profil, seed, refD);
  const truth = Cmp.kebenaran(profil, seed, refD);
  return {
    profil: profil.id, seed, refD, kebenaran: Number(truth.toFixed(4)),
    masteryAccuracy: masteryAccuracy(traces, truth),
    retention: retention(traces),
    adaptationQuality: adaptationQuality(traces),
    interventionEfficiency: interventionEfficiency(traces, truth)
  };
}

function ukurSemua(seeds = [42, 43, 44, 45, 46]) {
  const rows = [];
  for (const p of V3.PROFILES) for (const s of seeds) for (const d of Cmp.REF_SWEEP) rows.push(ukurSatu(p, s, d));
  return { rows, misconceptionRecovery: misconceptionRecovery(),
           retentionSpacingMonotonic: retentionSpacingMonotonic() };
}

/** Rata-rata sebuah metrik LINTAS murid, mengabaikan yang null dan MELAPORKAN berapa yang null. */
function rangkum(rows, nama) {
  let jml = 0, n = 0, kosong = 0;
  for (const r of rows) {
    const m = r[nama];
    if (!m || m.value === null) { kosong++; continue; }
    jml += m.value; n++;
  }
  return { value: n ? Number((jml / n).toFixed(4)) : null, dariMurid: n, tidakTerukur: kosong };
}

module.exports = { masteryAccuracy, retention, retentionSpacingMonotonic, misconceptionRecovery, adaptationQuality,
                   interventionEfficiency, jalankan, ukurSatu, ukurSemua, rangkum, metric };

// =========================================================================================
if (require.main === module) {
  const hasil = ukurSemua();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(hasil, null, 2)); process.exit(0); }
  console.log('METRIK HASIL BELAJAR BRAINCORE — ' + hasil.rows.length + ' murid laten\n');
  for (const nama of ['masteryAccuracy', 'retention', 'adaptationQuality', 'interventionEfficiency']) {
    const r = rangkum(hasil.rows, nama);
    console.log('  ' + nama.padEnd(24) + String(r.value).padStart(9)
      + '   dari ' + String(r.dariMurid).padStart(3) + ' murid'
      + (r.tidakTerukur ? ', ' + r.tidakTerukur + ' TIDAK TERUKUR (null, bukan nol)' : ''));
  }
  const rs = hasil.retentionSpacingMonotonic;
  console.log('  ' + 'retention(spacing monoton)'.padEnd(24) + String(rs.value).padStart(9)
    + '   dari ' + rs.n + ' pasangan jeda; kenaikan: '
    + rs.gains.map((g) => g.gap + 'h=' + g.gain).join(' '));
  console.log('  ' + '  ^ retention di atas selalu 1,0 karena TAUTOLOGI — baris ini yang bisa gagal');
  const mr = hasil.misconceptionRecovery;
  console.log('  ' + 'misconceptionRecovery'.padEnd(24) + String(mr.value).padStart(9) + '   ' + mr.arti);
  console.log('\nSetiap angka di atas dihitung dari murid SINTETIS. Tidak satu pun murid sungguhan');
  console.log('pernah melewati jalur ini, jadi tidak satu pun angka ini berbicara soal hasil belajar.');
}
