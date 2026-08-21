/**
 * FIEZEL audio lane gate — conditioning tidak boleh lagi memotong transien ucapan.
 *
 * Bukti perangkat, uji fisik OWNER pada m025-66:
 *   Normal        : pecah berat
 *   CONDITIONED   : pecah berat
 *   RAW           : pecah SEDANG
 *
 * RAW berarti conditionSamples() dimatikan. Jadi mematikan conditioning membuat suaranya
 * LEBIH BAIK - conditioning memperburuk, bukan memperbaiki. Itu perbedaan terukur pertama
 * yang pernah didapat dari perangkat setelah tiga rilis yang gagal.
 *
 * Bukti mekanismenya ada di test pertama di bawah: `findImpulses()` menandai letupan
 * konsonan biasa sebagai "impuls", lalu sampelnya ditimpa rata-rata tetangga. Itu memenggal
 * serangan konsonan dan menyisipkan diskontinuitas baru - persis pada batas kata dan kalimat
 * tempat OWNER berulang kali mendengar bunyi retak.
 *
 * Gate ini menjaga agar transformasi itu tidak kembali tanpa disadari, DAN agar perbaikan
 * yang memang aman tidak ikut terbuang.
 */
const assert = require('assert');
const fs = require('fs');
const player = require('./features/neural-voice/fiezel-web-audio-player.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Sinyal mirip ucapan: nada dasar + harmonik, dengan letupan konsonan yang wajar. */
function speechLike(plosiveAt) {
  const rate = 24000, n = rate;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    s[i] = 0.25 * Math.sin(2 * Math.PI * 120 * t) + 0.12 * Math.sin(2 * Math.PI * 240 * t) + 0.06 * Math.sin(2 * Math.PI * 480 * t);
  }
  for (const k of (plosiveAt || [])) { s[k] += 0.45; s[k + 1] -= 0.30; }
  return s;
}

test('letupan konsonan yang wajar tidak lagi diubah sedikit pun', () => {
  const plosives = [3000, 7000, 11000, 15000, 19000, 23000];
  const samples = speechLike(plosives);
  const out = player.conditionSamples(samples);
  assert.strictEqual(out, samples, 'sinyal yang sehat harus kembali apa adanya, tanpa disalin ulang');
  // Sebelum m025-67, keenam transien ini ditimpa dan puncaknya turun dari 0,45 ke 0,30.
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  assert.ok(peak > 0.4, `puncak transien ikut terpangkas: ${peak.toFixed(3)}`);
});

test('transformasi pemotong impuls benar-benar hilang dari sumber', () => {
  const source = fs.readFileSync('./features/neural-voice/fiezel-web-audio-player.js', 'utf8');
  assert.ok(!/out\[index\]\s*=\s*\(out\[index - 1\] \+ out\[index \+ 1\]\) \/ 2/.test(source),
    'penimpaan sampel dengan rata-rata tetangga tidak boleh kembali');
  assert.ok(!/const impulses = hasNonFinite \? \[\] : findImpulses\(samples\)/.test(source),
    'conditioning tidak boleh lagi memanggil findImpulses untuk memperbaiki apa pun');
});

test('findImpulses tetap ada sebagai alat ukur, bukan alat ubah', () => {
  // Telemetri A/B memakai hitungan impuls untuk MENJELASKAN sinyal. Mengukur boleh; yang
  // dilarang adalah mengubah gelombangnya berdasarkan pengukuran itu.
  const stats = player.analyzeSamples(speechLike([3000, 7000]));
  assert.strictEqual(typeof stats.impulses, 'number', 'analyzeSamples tetap melaporkan impuls');
  assert.ok(stats.impulses >= 2, 'pengukurannya masih bekerja seperti dulu');
});

test('sampah yang benar-benar rusak tetap diperbaiki', () => {
  const out = player.conditionSamples(Float32Array.from([NaN, 0.5, Infinity, -0.4, -Infinity]));
  assert.strictEqual(out[0], 0, 'NaN menjadi diam');
  assert.strictEqual(out[2], 0, 'Infinity menjadi diam');
  assert.strictEqual(out[4], 0);
  assert.strictEqual(Math.round(out[1] * 1000) / 1000, 0.5, 'sampel sehat di sekitarnya tidak ikut diubah');
});

test('headroom tetap dijaga supaya tidak clipping', () => {
  const out = player.conditionSamples(Float32Array.from([1.4, -1.3, 0.2]));
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  assert.ok(peak <= player.PEAK_CEILING + 1e-6, `puncak ${peak} melewati batas`);
  assert.ok(peak > 0.9, 'penurunannya sekadar cukup, bukan meredam sinyal');
});

test('offset DC yang benar-benar bertahan tetap dibuang', () => {
  const rate = 24000, n = rate;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = 0.2 * Math.sin(2 * Math.PI * 150 * (i / rate)) + 0.05;
  const out = player.conditionSamples(s);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += out[i];
  assert.ok(Math.abs(sum / n) < 0.003, `offset DC tidak terbuang: ${(sum / n).toFixed(4)}`);
});

test('desis pelan tidak dianggap perlu diperbaiki', () => {
  const rate = 24000, n = 4800;
  const s = new Float32Array(n);
  // Derau deterministik supaya hasil test tidak berubah-ubah.
  let seed = 7;
  for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) % 2147483648; s[i] = (seed / 2147483648 - 0.5) * 0.02; }
  assert.strictEqual(player.conditionSamples(s), s, 'sinyal pelan dan sehat dikembalikan apa adanya');
});

test('mode RAW dan CONDITIONED tetap berbeda, supaya A/B masih bisa dijalankan', () => {
  // Kalau conditioning menjadi tanpa-efek untuk SEMUA masukan, arm CONDITIONED kehilangan
  // maknanya. Ia harus tetap berbeda ketika ada sesuatu yang memang perlu diperbaiki.
  const rusak = Float32Array.from([NaN, 0.5, 0.4, 1.5]);
  assert.notStrictEqual(player.conditionSamples(rusak), rusak);
  const sehat = speechLike([3000]);
  assert.strictEqual(player.conditionSamples(sehat), sehat);
});

console.log('');
if (failures) { console.error('FIEZEL conditioning repair: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL conditioning repair: PASS');
