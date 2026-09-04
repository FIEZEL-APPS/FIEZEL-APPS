// m025-198 — gerbang: soal listening TIDAK BOLEH menampilkan terjemahan.
//
// LAPORAN OWNER, dan ia menyebutnya fatal: saat ujian tes kemampuan, bagian listening
// memunculkan terjemahan Indonesia di layar sambil rekaman berbunyi. Murid MEMBACA
// jawabannya alih-alih mendengarnya, jadi enam soal listening tes penempatan berhenti
// mengukur listening dan berubah menjadi soal membaca - persis yang tes ini dibuat untuk
// dihindari (`makeListeningQuestion` sendiri menulis: "Naskahnya TIDAK ikut ke question").
//
// KENAPA m025-148 TIDAK CUKUP. Rilis itu memasang tombol `suppressSubtitles` di
// FiezelVoiceSay dan memakainya di Skills Lab. Tombolnya benar; jalur kuisnya yang tidak
// pernah menekannya, di DUA mata rantai:
//   1. AudioService.play() hanya meneruskan speed/contentType/locale ke say(), jadi bendera
//      dari pemanggil mana pun HILANG di pintu itu;
//   2. titik panggil listening tes penempatan memang tidak pernah mengirimnya.
// Menambal salah satu saja meninggalkan cacatnya hidup lewat yang lain.
//
// Gerbang ini MENJALANKAN AudioService yang asli - diekstrak dari app.js, bukan disalin -
// dengan FiezelVoiceSay tiruan yang mencatat options yang benar-benar diterimanya. Jadi yang
// diuji adalah PERILAKU pintunya, bukan ada-tidaknya sebuah kata di dalam berkas. Assert
// berbasis pola teks persis yang membuat cacat ini lolos dua rilis berturut-turut.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const APP = 'app.js';
const src = fs.readFileSync(path.join(ROOT, APP), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details || '' });
  if (!ok) failed = true;
};

/* ---------------------------------------------------------------- ekstraksi AudioService --
 * Diambil dari `function AudioService(){` sampai `}const audio=AudioService();` yang menutupnya.
 * Kalau penanda itu berubah, gerbang ini GAGAL keras alih-alih diam-diam berhenti menguji. */
const mulai = src.indexOf('function AudioService(){');
const tutup = src.indexOf('}const audio=AudioService();');
check('AudioService ditemukan di ' + APP, mulai !== -1 && tutup > mulai,
  mulai === -1 ? 'penanda awal hilang' : (tutup <= mulai ? 'penanda akhir hilang' : 'baris ' + (src.slice(0, mulai).split('\n').length)));

if (mulai !== -1 && tutup > mulai) {
  const kode = src.slice(mulai, tutup + 1);

  /* Semua yang dipakai AudioService di luar dirinya sendiri distub. Yang PENTING adalah
   * FiezelVoiceSay.say tiruan: ia mencatat options apa adanya, lalu menjawab true - satu
   * pemutaran yang BERHASIL, supaya yang diukur di sini murni soal subtitle.
   *
   * m025-232: alasan lama untuk `window: {}` adalah "tanpa speechSynthesis -> browserSupported
   * =false", yakni mematikan cadangan peramban supaya ia tidak mengaburkan pengukuran.
   * Cadangan itu sudah dihapus dan `browserSupported` tidak ada lagi, jadi window kosong kini
   * hanya membuktikan hal yang tetap berharga: AudioService bisa dikonstruksi di luar peramban. */
  const dicatat = [];
  const prefetched = [];
  const sandbox = {
    window: {},                    // AudioService tidak boleh butuh apa pun dari window saat dikonstruksi
    self: { FiezelVoiceSay: { say: (text, options) => { dicatat.push({ text, options }); return true; } } },
    selectedNeuralRate: () => 1,
    prefetchNextVoice: (teks, opsi) => { prefetched.push({ teks, opsi }); return Promise.resolve(false); },
    showToast: () => {},
    cancelVoicePrefetch: () => {},
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(kode + '\nvar audio = AudioService();', sandbox, { filename: APP });

  const audio = sandbox.audio;
  check('AudioService dapat dijalankan di luar peramban', audio && typeof audio.play === 'function');

  const opsiTerakhir = () => (dicatat.length ? dicatat[dicatat.length - 1].options || {} : null);

  /* m025-202: assert PENGIKAT, ditambahkan sesudah gerbang ini menangkap penghapusannya.
   *
   * `const say=self.FiezelVoiceSay?.say` sempat terhapus dari AudioService di ec2b119, dan
   * tidak ada satu pun galat yang muncul: `typeof say` pada identifier tak-dideklarasikan
   * menjawab 'undefined' alih-alih melempar, jadi seluruh tangga suara neural dilewati
   * DIAM-DIAM dan murid mendengar suara bawaan perangkat. Empat assert di bawah memang
   * memerah karenanya, tetapi pesannya ("say() tidak pernah dipanggil") butuh penyelidikan
   * untuk dipahami. Assert ini menamai sebabnya langsung, supaya diagnosis berikutnya
   * memakan detik, bukan setengah jam. */
  const potongan = src.slice(mulai, tutup + 1);
  check('PENGIKAT `say` terdeklarasi DI DALAM AudioService (tanpa ini tangga suara neural mati senyap)',
    /\b(?:const|let|var)\s+say\s*=\s*self\.FiezelVoiceSay/.test(potongan),
    'typeof pada identifier tak-dideklarasikan menjawab undefined, bukan melempar - jadi tidak ada galat yang menandainya');

  return Promise.resolve()
    /* (A) INTI LAPORAN OWNER: pemutaran listening tanpa bendera eksplisit pun harus bisu
     * subtitle. Ini yang menutup KELASNYA - pemanggil yang ditulis nanti tidak perlu tahu
     * benderanya ada. */
    .then(() => audio.play('the train leaves at nine', { contentType: 'listening' }))
    .then(() => {
      const o = opsiTerakhir();
      check('A listening TANPA bendera eksplisit tetap bisu subtitle (kelasnya tertutup, bukan satu pemanggil)',
        !!o && o.suppressSubtitles === true,
        o ? 'suppressSubtitles=' + o.suppressSubtitles : 'say() tidak pernah dipanggil');
    })
    /* (B) Bendera eksplisit dari pemanggil harus SAMPAI. Sebelum m025-198 pintu ini
     * menjatuhkannya diam-diam, jadi Skills Lab pun bergantung pada jalurnya sendiri. */
    .then(() => audio.play('a quiet sentence', { suppressSubtitles: true }))
    .then(() => {
      const o = opsiTerakhir();
      check('B bendera suppressSubtitles dari pemanggil DITERUSKAN, tidak dijatuhkan pintu',
        !!o && o.suppressSubtitles === true,
        o ? 'suppressSubtitles=' + o.suppressSubtitles : 'say() tidak pernah dipanggil');
    })
    /* (C) Batasnya nyata. Kalau subtitle mati untuk SEMUA hal, Vocabulary dan Reading
     * kehilangan terjemahan yang memang gunanya - "perbaikan" yang merusak tiga layar lain
     * bukan perbaikan. */
    .then(() => audio.play('umbrella', { contentType: 'word' }))
    .then(() => {
      const o = opsiTerakhir();
      check('C Vocabulary (contentType word) TETAP menampilkan terjemahan',
        !!o && o.suppressSubtitles !== true,
        o ? 'suppressSubtitles=' + o.suppressSubtitles : 'say() tidak pernah dipanggil');
    })
    .then(() => audio.play('She takes the bus every morning.', { contentType: 'sentence' }))
    .then(() => {
      const o = opsiTerakhir();
      check('C Reading/contoh kalimat TETAP menampilkan terjemahan',
        !!o && o.suppressSubtitles !== true,
        o ? 'suppressSubtitles=' + o.suppressSubtitles : 'say() tidak pernah dipanggil');
    })
    /* (F) REGRESI RACE INTERRUPT -> STALE COMPLETION.
     *
     * Ini sengaja behavioural: AudioService PRODUKSI dijalankan lagi dengan say() yang
     * penyelesaiannya bisa kita tahan. Panggilan kedua memanggil stop() seperti produksi,
     * lalu selesai sukses. Setelah itu panggilan LAMA dipaksa resolve(false). Panggilan lama
     * tidak boleh lagi masuk ke fallback/no-audio milik giliran baru. Di browser yang punya
     * speechSynthesis cabang yang sama akan mencoba membunyikan fallback lama; di sandbox
     * tanpa speechSynthesis jejak cabang itu tetap terukur lewat showToast(). */
    .then(async () => {
      const pending = [];
      let staleToast = 0;
      let stopCalls = 0;
      const raceSandbox = {
        window: {},
        self: { FiezelVoiceSay: {
          say: (text, options) => new Promise((resolve) => pending.push({ text, options, resolve })),
          stop: () => { stopCalls += 1; }
        } },
        selectedNeuralRate: () => 1,
        prefetchNextVoice: () => Promise.resolve(false),
        showToast: () => { staleToast += 1; },
        cancelVoicePrefetch: () => {},
        console
      };
      raceSandbox.globalThis = raceSandbox;
      vm.createContext(raceSandbox);
      vm.runInContext(kode + '\nvar raceAudio = AudioService();', raceSandbox, { filename: APP + '#race' });
      const raceAudio = raceSandbox.raceAudio;

      const oldPlay = raceAudio.play('old sentence that must stay cancelled', { contentType: 'sentence' });
      await new Promise((resolve) => setImmediate(resolve));
      const newPlay = raceAudio.play('new sentence that owns playback now', { contentType: 'sentence' });
      await new Promise((resolve) => setImmediate(resolve));

      check('F harness menahan dua say() berbeda dan play kedua benar-benar menginterupsi yang lama',
        pending.length === 2 && stopCalls >= 2,
        'pending=' + pending.length + ' stopCalls=' + stopCalls);

      pending[1].resolve(true);
      await newPlay;
      pending[0].resolve(false);
      await oldPlay;
      await new Promise((resolve) => setImmediate(resolve));

      check('F completion dari play LAMA sesudah interrupt DIABAIKAN (tidak masuk fallback/no-audio)',
        staleToast === 0,
        'showToast dipanggil ' + staleToast + 'x oleh promise lama; di browser bersuara cabang yang sama dapat memulai speechSynthesis stale');
    })
    /* (D) Titik panggil tes penempatan mengirim benderanya sendiri juga. Bukan mubazir:
     * ia yang membuat maksudnya terbaca di tempat soalnya dibangun, dan ia bertahan kalau
     * suatu hari contentType di sana diganti. */
    .then(() => {
      check('D soal listening tes penempatan mengirim suppressSubtitles secara eksplisit',
        /audio\.play\(q\.script,\{contentType:'listening',suppressSubtitles:true/.test(src),
        'lapisan kedua, supaya maksudnya terbaca di titik soalnya dibangun');
      /* (E) Naskah tidak boleh bocor lewat pintu lain: question/options soal listening tidak
       * pernah memuat skripnya. Ini invarian yang sudah ditulis app.js sebagai komentar;
       * di sini ia jadi assert. */
      check('E naskah listening TIDAK ikut ke badan soal (kalau ikut, ia jadi soal membaca)',
        /Naskahnya TIDAK ikut ke question/.test(src) && /script:item\.script/.test(src),
        'script disimpan terpisah untuk diputar, bukan untuk ditampilkan');
      selesai();
    })
    .catch((e) => { check('gerbang berjalan sampai selesai', false, String(e && e.message || e)); selesai(); });
}

selesai();

function selesai() {
  fs.writeFileSync(path.join(ROOT, 'LISTENING-SUBTITLE-SUPPRESSION-REPORT.json'),
    JSON.stringify({ schema: 'fiezel-listening-subtitle-suppression-v1', pass: !failed, checks }, null, 2));
  const lulus = checks.filter((c) => c.status === 'PASS').length;
  for (const c of checks) if (c.status === 'FAIL') console.error('FAIL ' + c.name + (c.details ? ' — ' + c.details : ''));
  console.log('listening-subtitle-suppression-test: ' + lulus + '/' + checks.length + ' assert ' + (failed ? 'ADA YANG FAIL' : 'PASS'));
  process.exit(failed ? 1 : 0);
}
