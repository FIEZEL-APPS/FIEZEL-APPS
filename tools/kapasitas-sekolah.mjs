#!/usr/bin/env node
/**
 * tools/kapasitas-sekolah.mjs — HITUNGAN KAPASITAS SATU SEKOLAH (R8, docs/KAPASITAS-SEKOLAH.md).
 *
 * Kenapa alat ini ada: "batas 250 pengguna" sering dikutip sebagai batas FIEZEL, padahal angka
 * itu adalah MAX_USERS milik worker inti lama (pengingat push lewat Puter), bukan batas murid di
 * Worker Cloudflare. Batas yang NYATA untuk satu sekolah penuh adalah jumlah permintaan per hari,
 * baris D1, dan jatah neuron AI akun — dan semuanya bergantung pada ritme polling yang tertulis
 * di kode. Alat ini MEMBACA ritme itu dari kode (bukan menyalinnya), supaya hitungan di dokumen
 * tidak diam-diam basi saat ritmenya diubah.
 *
 * Pakai:  node tools/kapasitas-sekolah.mjs            (tabel markdown)
 *         node tools/kapasitas-sekolah.mjs --json     (angka mentah)
 * Asumsi pemakaian bisa diubah: --menit=30 --ai=3 --laporan=4 --kelas=32 --papan=60
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
function num(src, re, nama) {
  const m = re.exec(src);
  if (!m) throw new Error('tidak menemukan ' + nama + ' di kode — alat ini harus diperbarui');
  return Number(m[1]);
}

/** Ritme dan batas yang dibaca dari kode. */
export function bacaKode() {
  const app = read('app.js'), shell = read('features/teacher/fiezel-teacher-shell.js');
  const wr = read('workers/api/wrangler.toml'), quota = read('workers/api/quota/quota-config.js');
  return {
    notifPollMs: num(app, /const NOTIF_POLL_MS=(\d+);/, 'NOTIF_POLL_MS'),
    stagePollMs: num(app, /setInterval\(pollStageInvites,(\d+)\)/, 'interval pollStageInvites'),
    guruSyncMs: num(shell, /var SYNC_EVERY_MS = (\d+);/, 'SYNC_EVERY_MS'),
    neuronCap: num(wr, /^\s*GLOBAL_NEURON_CAP\s*=\s*"(\d+)"/m, 'GLOBAL_NEURON_CAP'),
    aiPerMuridHarian: num(quota, /FREE_AI_DAILY_LIMIT:\s*(\d+)/, 'FREE_AI_DAILY_LIMIT'),
    maxUsersLama: num(wr, /^\s*MAX_USERS\s*=\s*"(\d+)"/m, 'MAX_USERS')
  };
}

/* Batas paket Cloudflare menurut dokumentasi publiknya (diperiksa 2026-10). PERIKSA ULANG di
   dasbor sebelum memutuskan: angka paket bisa berubah, dan alat ini tidak bisa melihatnya. */
export const PAKET = {
  /* Paket gratis MENOLAK permintaan di atas batas harian. */
  gratis: { label: 'Workers Free', reqHarian: 100000, d1TulisHarian: 100000, d1BacaHarian: 5000000, neuronHarian: 10000 },
  /* Paket berbayar TIDAK menolak: kelebihan ditagih. Jadi yang dihitung biaya, bukan "lewat". */
  berbayar: { label: 'Workers Paid', dasarUsd: 5, reqBulanTermasuk: 10e6, usdPerJutaReq: 0.30, d1BacaBulanTermasuk: 25e9, d1TulisBulanTermasuk: 50e6, neuronHarianGratis: 10000, usdPer1000Neuron: 0.011 }
};
export const HARI_SEKOLAH_PER_BULAN = 22;

export const ASUMSI_BAWAAN = {
  menit: 30,       // menit aplikasi TERLIHAT per murid per hari sekolah (timer polling diam saat tersembunyi)
  ai: 3,           // pertanyaan AI per murid per hari (rata-rata; batas kerasnya FREE_AI_DAILY_LIMIT)
  neuronPerAi: 30, // neuron per pertanyaan (model tingkat menengah di ai-tasks.js)
  laporan: 4,      // laporan kelas per murid per hari (selesai sesi + hasil tugas)
  kelas: 32,       // murid per rombel
  papan: 60,       // menit papan guru terbuka per rombel per hari (sinkron tiap SYNC_EVERY_MS)
  lainnya: 8       // permintaan lain per murid per hari (boot, konfigurasi, sesi akun)
};

/** Perkiraan beban harian untuk `murid` murid. */
export function hitung(murid, asumsi = ASUMSI_BAWAAN, kode = bacaKode()) {
  const a = Object.assign({}, ASUMSI_BAWAAN, asumsi);
  const detik = a.menit * 60;
  const perMurid = {
    notif: detik / (kode.notifPollMs / 1000),
    panggung: detik / (kode.stagePollMs / 1000),
    laporan: a.laporan,
    ai: a.ai,
    lainnya: a.lainnya
  };
  const reqMurid = Object.values(perMurid).reduce((x, y) => x + y, 0);
  const rombel = Math.ceil(murid / a.kelas);
  const reqGuru = rombel * (a.papan * 60) / (kode.guruSyncMs / 1000);
  const req = Math.round(murid * reqMurid + reqGuru);
  const d1Tulis = Math.round(murid * (a.laporan + a.ai * 2));
  const d1Baca = Math.round(murid * (perMurid.notif + perMurid.panggung) * 2 + reqGuru * a.kelas);
  const neuron = Math.round(murid * a.ai * a.neuronPerAi);
  const muridAiTerlayani = Math.floor(kode.neuronCap / (a.ai * a.neuronPerAi));
  const G = PAKET.gratis, P = PAKET.berbayar, hari = HARI_SEKOLAH_PER_BULAN;
  const gratis = { req: req <= G.reqHarian, d1Tulis: d1Tulis <= G.d1TulisHarian, d1Baca: d1Baca <= G.d1BacaHarian };
  gratis.cukup = gratis.req && gratis.d1Tulis && gratis.d1Baca;
  /* Biaya bulanan paket berbayar JIKA plafon neuron dinaikkan supaya semua murid terlayani AI. */
  const usdReq = Math.max(0, req * hari - P.reqBulanTermasuk) / 1e6 * P.usdPerJutaReq;
  const usdNeuron = Math.max(0, neuron - P.neuronHarianGratis) * hari / 1000 * P.usdPer1000Neuron;
  const d1Aman = d1Baca * hari <= P.d1BacaBulanTermasuk && d1Tulis * hari <= P.d1TulisBulanTermasuk;
  const berbayar = { usdBulan: Math.round((P.dasarUsd + usdReq + usdNeuron) * 100) / 100, usdReq: Math.round(usdReq * 100) / 100, usdNeuron: Math.round(usdNeuron * 100) / 100, d1Aman };
  return { murid, rombel, reqPerMurid: Math.round(reqMurid), perMurid, req, d1Tulis, d1Baca, neuron, neuronCap: kode.neuronCap, muridAiTerlayani, aiCukup: neuron <= kode.neuronCap, gratis, berbayar };
}

function tabel(asumsi) {
  const kode = bacaKode();
  const baris = [250, 500, 1000, 2000].map((n) => hitung(n, asumsi, kode));
  const ya = (b) => (b ? 'cukup' : '**lewat**');
  const out = [];
  out.push(`Ritme dari kode: polling murid ${kode.notifPollMs / 1000} dtk, undangan panggung ${kode.stagePollMs / 1000} dtk, papan guru ${kode.guruSyncMs / 1000} dtk. Plafon neuron AI akun ${kode.neuronCap}/hari.`);
  out.push('');
  out.push('| Murid | Permintaan/hari | Paket gratis (100 rb/hari) | Neuron AI/hari | Plafon AI sekarang | Paket berbayar, AI untuk semua |');
  out.push('|---|---|---|---|---|---|');
  for (const r of baris) out.push(`| ${r.murid} | ${r.req.toLocaleString('id-ID')} | ${ya(r.gratis.cukup)} | ${r.neuron.toLocaleString('id-ID')} | ${r.aiCukup ? 'cukup' : `**lewat** (cukup untuk ±${r.muridAiTerlayani} murid)`} | ±US$${r.berbayar.usdBulan}/bulan${r.berbayar.d1Aman ? '' : ' (D1 lewat)'} |`);
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const asumsi = {};
  for (const arg of process.argv.slice(2)) { const m = /^--(\w+)=(\d+(?:\.\d+)?)$/.exec(arg); if (m) asumsi[m[1]] = Number(m[2]); }
  if (process.argv.includes('--json')) console.log(JSON.stringify([250, 500, 1000, 2000].map((n) => hitung(n, asumsi)), null, 2));
  else console.log(tabel(asumsi));
}
export { tabel };
