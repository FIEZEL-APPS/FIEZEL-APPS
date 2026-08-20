/**
 * FIEZEL audio lane gate — potongan yang diseimbangkan.
 *
 * Bukti perangkat OWNER pada m025-72, dua angka yang saling mengunci:
 *
 *   4 langkah  : teks bertanda petik terjeda ~10 detik
 *   8 langkah  : teks yang sama terjeda ~20 detik
 *
 * Tepat dua kali lipat. Itu bukan tanda baca yang bikin diam, itu satu putaran GENERATE.
 *
 * Penyebabnya pemotongan serakah: potongan diisi sampai batas 128 karakter, lalu sisanya
 * menjadi serpihan seperti `serempak.` sepanjang 9 karakter. Serpihan itu hanya berbunyi
 * setengah detik tetapi tetap menuntut satu putaran generate penuh, dan prefetch tidak
 * mungkin menyembunyikan enam detik pembuatan di balik setengah detik pemutaran. Tanda petik
 * hanya menggeser letak potongannya sehingga serpihan itu muncul.
 *
 * Gate ini menjaga agar serpihan itu tidak kembali.
 */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console, Promise, setTimeout, clearTimeout, Date, Math, JSON, String, Number, Object, Array, Error
};
context.globalThis = context;
context.self = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('./features/neural-voice/fiezel-neural-voice.js', 'utf8'), context);
const nv = context.FiezelNeuralVoice;

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const APPLE_LIMIT = 128;
const kutipan = 'Bab satu. Dia menatap papan itu dan membaca keras: "Selamat datang di kelas baru." Semua murid terdiam sejenak sebelum menjawab serempak.';
const judul = 'Judul bacaan hari ini adalah "Air dan Kehidupan." Bacalah dengan saksama dan catat tiga hal penting yang kamu temukan di dalamnya hari ini.';

function chunks(text, limit) {
  // Array-nya lahir di dalam VM, jadi prototipenya berasal dari realm lain dan
  // assert.deepStrictEqual akan menolaknya tanpa ada yang salah pada isinya. Disalin ke
  // array realm ini supaya yang diuji benar-benar isinya.
  return Array.from(nv.splitIntoChunks(text, 140, 190, limit === undefined ? APPLE_LIMIT : limit));
}

test('teks bertanda petik tidak lagi meninggalkan serpihan', () => {
  // Sebelum m025-73 teks ini menghasilkan 128 lalu 9 karakter. Yang 9 karakter itulah
  // sepuluh detik yang OWNER dengar.
  const parts = chunks(kutipan);
  assert.ok(parts.length >= 2, 'teks ini memang lebih panjang dari batas Apple');
  const shortest = Math.min(...parts.map(p => p.length));
  assert.ok(shortest > 20, `masih ada serpihan sepanjang ${shortest} karakter`);
});

test('potongan berdurasi mirip, bukan satu penuh dan satu sisa', () => {
  for (const text of [kutipan, judul]) {
    const parts = chunks(text);
    const longest = Math.max(...parts.map(p => p.length));
    const shortest = Math.min(...parts.map(p => p.length));
    // Prefetch hanya bisa menyembunyikan pembuatan potongan berikutnya kalau potongan
    // sekarang cukup panjang untuk dimainkan selama itu.
    assert.ok(longest - shortest < APPLE_LIMIT / 2,
      `selisih panjang terlalu jauh: ${shortest} vs ${longest}`);
  }
});

test('batas keras perangkat tetap dihormati', () => {
  for (const text of [kutipan, judul, 'kata '.repeat(400)]) {
    for (const part of chunks(text)) {
      assert.ok(part.length <= APPLE_LIMIT, `potongan ${part.length} melewati batas ${APPLE_LIMIT}`);
    }
  }
});

test('tidak ada potongan kosong atau tanpa isi yang bisa dibunyikan', () => {
  const teks = [kutipan, judul, '"Halo." Itu saja.', 'Satu. "Dua." Tiga. "Empat." Lima.'];
  for (const text of teks) {
    for (const part of chunks(text)) {
      assert.ok(part.trim().length > 0, 'potongan kosong tidak boleh ada');
      assert.ok(/[a-z0-9]/i.test(part), `potongan tanpa huruf tetap menuntut generate penuh: ${JSON.stringify(part)}`);
    }
  }
});

test('teks pendek tidak dipotong sama sekali', () => {
  const pendek = 'Halo, apa kabar hari ini?';
  assert.deepStrictEqual(chunks(pendek), [pendek], 'satu napas tetap satu potongan');
});

test('kata tunggal yang lebih panjang dari batas tetap dipotong keras', () => {
  // Perilaku lama yang harus dipertahankan: satu kata raksasa tidak boleh menggantung mesin.
  const raksasa = 'x'.repeat(300);
  const parts = chunks(raksasa);
  assert.ok(parts.length >= 3);
  for (const part of parts) assert.ok(part.length <= APPLE_LIMIT);
  assert.strictEqual(parts.join('').length, 300, 'tidak ada huruf yang hilang');
});

test('tanpa batas keras, perilakunya sama persis seperti sebelumnya', () => {
  // Jalur non-Apple tidak boleh ikut berubah oleh perbaikan ini.
  const parts = chunks(kutipan, 0);
  assert.strictEqual(parts.length, 1, 'tanpa batas, teks ini tetap satu potongan');
});

test('isi teks tidak berubah, hanya tempat memotongnya', () => {
  const normalise = value => value.replace(/\s+/g, ' ').trim();
  for (const text of [kutipan, judul]) {
    const joined = normalise(chunks(text).join(' '));
    assert.strictEqual(joined, normalise(text), 'tidak ada kata yang hilang atau tertukar');
  }
});

test('potongan pembuka dipendekkan supaya kata pertama cepat terdengar', () => {
  // Bukti perangkat OWNER pada m025-73: jeda tanda petik jauh membaik, tetapi jeda SAAT MULAI
  // MEMBACA masih sangat lama. Jeda lain bisa bersembunyi di balik pemutaran potongan
  // sebelumnya; potongan pertama tidak punya apa pun untuk bersembunyi, jadi waktu sampai kata
  // pertama sama dengan waktu membuat potongan pertama.
  const parts = chunks(kutipan);
  const lead = Math.max(24, Math.round(APPLE_LIMIT / 3));
  const withLead = Array.from(nv.withFastLeadIn(parts, lead, APPLE_LIMIT));
  assert.ok(withLead[0].length <= lead, `pembuka ${withLead[0].length} karakter, seharusnya <= ${lead}`);
  assert.ok(withLead[0].length > 10, 'pembuka tetap satu frasa yang wajar, bukan sepotong kata');
  assert.ok(/[a-z0-9]/i.test(withLead[0]), 'pembuka harus punya isi yang bisa dibunyikan');
});

test('sisa potongan pembuka tidak menjadi serpihan baru', () => {
  // Memendekkan pembuka tidak boleh menghidupkan lagi cacat yang dibereskan m025-73.
  const lead = Math.max(24, Math.round(APPLE_LIMIT / 3));
  for (const text of [kutipan, judul]) {
    const withLead = Array.from(nv.withFastLeadIn(chunks(text), lead, APPLE_LIMIT));
    for (const part of withLead.slice(1)) {
      assert.ok(part.length > 20, `serpihan sepanjang ${part.length} karakter muncul lagi`);
      assert.ok(part.length <= APPLE_LIMIT, `potongan ${part.length} melewati batas`);
    }
  }
});

test('pembuka cepat tidak mengubah isi teks sama sekali', () => {
  const normalise = value => value.replace(/\s+/g, ' ').trim();
  const lead = Math.max(24, Math.round(APPLE_LIMIT / 3));
  for (const text of [kutipan, judul]) {
    const parts = chunks(text);
    const withLead = Array.from(nv.withFastLeadIn(parts, lead, APPLE_LIMIT));
    assert.strictEqual(normalise(withLead.join(' ')), normalise(parts.join(' ')));
  }
});

test('teks yang sudah pendek tidak dipecah lagi oleh pembuka cepat', () => {
  const pendek = ['Halo, apa kabar?'];
  assert.strictEqual(nv.withFastLeadIn(pendek, 43, APPLE_LIMIT), pendek, 'dikembalikan apa adanya');
  assert.strictEqual(nv.withFastLeadIn([], 43, APPLE_LIMIT).length, 0);
  const tanpaBatas = chunks(kutipan);
  assert.strictEqual(nv.withFastLeadIn(tanpaBatas, 0, APPLE_LIMIT), tanpaBatas, 'tanpa lead-in, tidak ada yang berubah');
});

console.log('');
if (failures) { console.error('FIEZEL balanced chunks: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL balanced chunks: PASS');
