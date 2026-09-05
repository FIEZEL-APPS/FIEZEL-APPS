/**
 * tools/print-live-evidence.mjs — cetak ulang laporan gerbang live di AKHIR log CI.
 *
 * KENAPA BERKAS INI ADA, dan kenapa ia bukan hiasan.
 * Kedua gerbang live (`tests/cf-live-contract-test.js`, `tools/ai-live-verify.mjs`) menghasilkan
 * bukti terkaya di seluruh workflow: assert per assert terhadap sistem yang sungguhan hidup,
 * panggilan model sungguhan, kuota yang benar-benar terpakai. Lalu bukti itu terkubur di
 * TENGAH log job, di belakang keluaran simulasi adaptivitas yang puluhan ribu baris — jadi
 * siapa pun yang membuka log dari bawah tidak akan pernah sampai ke sana, dan yang tersisa
 * untuk dikutip hanya satu centang hijau. Centang hijau BUKAN bukti: ia tidak memberi tahu
 * assert mana yang lulus, berapa panggilan model yang terjadi, atau berapa jatah yang habis.
 * Audit rilis 30 Agustus 2026 tersandung persis di situ.
 *
 * Ditulis sebagai berkas repo, bukan skrip sebaris di `quality.yml`, karena runner MENGGEMAKAN
 * badan setiap langkah `run:` ke log — skrip sebaris sepanjang 40 baris justru mendorong
 * bukti yang mau diselamatkan keluar dari jendela ekor log. Obatnya jangan jadi penyakitnya.
 *
 * Berkas hilang => dicetak sebagai SKIP, bukan diam: SKIP bukan PASS.
 */
import fs from 'node:fs';

const NILAI_MAKS = 200;      // potong nilai panjang; artefak menyimpan yang utuh
const ENTRI_MAKS = 60;       // batas entri per larik, supaya ekor log tetap terbaca

function cetak(nilai, dalam) {
  for (const [kunci, isi] of Object.entries(nilai || {})) {
    if (Array.isArray(isi)) {
      console.log(`${dalam}${kunci}: ${isi.length} entri`);
      for (const butir of isi.slice(0, ENTRI_MAKS)) {
        if (butir && typeof butir === 'object') {
          const nama = butir.id ?? butir.name ?? butir.assert ?? butir.task ?? '(tanpa nama)';
          const status = butir.status ?? (butir.pass === true ? 'PASS' : butir.pass === false ? 'FAIL' : '');
          const nota = String(butir.detail ?? butir.note ?? butir.reason ?? '').slice(0, 150);
          console.log(`${dalam}  [${status}] ${nama}${nota ? ' :: ' + nota : ''}`);
        } else {
          console.log(`${dalam}  ${String(butir).slice(0, 150)}`);
        }
      }
      if (isi.length > ENTRI_MAKS) console.log(`${dalam}  ... ${isi.length - ENTRI_MAKS} lagi (lihat artefak fiezel-bukti-live)`);
    } else if (isi && typeof isi === 'object') {
      console.log(`${dalam}${kunci}:`);
      cetak(isi, dalam + '  ');
    } else {
      console.log(`${dalam}${kunci}: ${String(isi).slice(0, NILAI_MAKS)}`);
    }
  }
}

for (const berkas of process.argv.slice(2)) {
  const nama = berkas.split('/').pop();
  console.log('==============================================================');
  console.log('BUKTI LIVE: ' + nama);
  console.log('==============================================================');
  if (!fs.existsSync(berkas)) {
    console.log('(tidak ada — langkahnya SKIP pada jalan ini; SKIP bukan PASS)');
    continue;
  }
  try {
    cetak(JSON.parse(fs.readFileSync(berkas, 'utf8')), '');
  } catch (galat) {
    // Laporan rusak adalah temuan, bukan alasan menggagalkan jalan: gerbangnya sendiri
    // sudah memberi vonis lewat exit code, dan langkah ini hanya membacakannya.
    console.log('(laporan tidak bisa dibaca: ' + String(galat && galat.message).slice(0, 200) + ')');
  }
}
