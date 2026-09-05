/**
 * FIEZEL — jam bersama koreografi splash (m025-86, direvisi untuk splash v4).
 *
 * Satu tabel ketukan untuk SEMUA yang bergerak dan berbunyi di pembukaan:
 *
 *   - features/brand/fiezel-splash-particles.js membaca fase pembentukan huruf F,
 *   - features/brand/fiezel-splash-equalizer.js membaca ketukan bar (field `bar`/`gain`),
 *   - features/audio/fiezel-ui-sfx.js menurunkan grid MOTIF-nya dari audioBeats(),
 *   - style.css membaca jeda modus kurangi-gerak lewat var(--fz-bN),
 *   - index.html menyalin nilainya sebagai default frame-pertama (cssDefaults()).
 *
 * Splash v4 mengganti koreografi CSS lama (stem/arm/sheen) dengan sekuens partikel:
 *
 *   0-950     partikel emas mengalir dan mengunci diri menjadi huruf F (p1-p5)
 *   1060-1450 dua batang emas memadat dari kabut; wordmark kecil naik (q1, q2)
 *   1400-1980 kedua batang menjadi ekualiser yang memantul pada ketukan skor (e1-e4)
 *   1900-2140 batang menetap, kanvas partikel memudar (s1)
 *   2200      stempel PAW menghantam (fiezel-splash-pawstamp.js; bunyinya paw_greet -
 *             ketukan ini TIDAK ada di tabel karena ia bukan gerak logo, ia penutup)
 *
 * m025-82/86 tetap berlaku: jeda di tabel ini TIDAK boleh diubah tanpa memikirkan
 * bunyinya - splash_intro.ogg dimaster mengikuti grid ini.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelChoreography = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Akor pembuka: F mayor add9 yang diurai naik. Frekuensi sama dengan palet nada
   * seluruh SFX transisi (diperiksa tests/splash-choreography-test.js) - satu produk, satu akor.
   */
  var PITCH = Object.freeze({
    F2: 87.31, F3: 174.61, C4: 261.63, F4: 349.23, A4: 440, C5: 523.25, G5: 783.99
  });

  /**
   * Tabel ketukan. Field:
   *   id     - nama pendek ketukan (p=partikel, q=batang emas, e=ekualiser, s=settle)
   *   css    - custom property yang dibaca CSS modus kurangi-gerak / default frame-pertama
   *   at/dur - mulai dan panjang gerakan, milidetik dari frame pertama splash
   *   moves  - APA yang bergerak (wajib, dibaca manusia dan tes)
   *   pitch  - nada yang jatuh tepat di ketukan ini (null = ketukan visual tanpa nada)
   *   role   - peran nadanya dalam akor
   *   bar    - (ketukan ekualiser) batang emas mana yang memantul: 1 atau 2
   *   gain   - (ketukan ekualiser) seberapa kuat pantulannya, 0..1
   *   strong - ketukan yang boleh terasa paling keras
   */
  var BEATS = Object.freeze([
    Object.freeze({ id: 'p1', css: '--fz-b1', at: 0, dur: 950, pitch: PITCH.F2, role: 'root',
      strong: true, sound: 'splash_intro',
      moves: 'partikel emas menyala dari kegelapan dan mulai mengalir mencari huruf F' }),
    Object.freeze({ id: 'p2', css: '--fz-b2', at: 240, dur: 300, pitch: null, role: 'flow',
      moves: 'arus partikel melengkung; kabut emas menepi menunggu di sisi kanan' }),
    Object.freeze({ id: 'p3', css: '--fz-b3', at: 470, dur: 300, pitch: PITCH.F3, role: 'root',
      moves: 'batang tegak huruf F mengental lebih dulu dari kabut partikel' }),
    Object.freeze({ id: 'p4', css: '--fz-b4', at: 690, dur: 260, pitch: PITCH.C4, role: 'fifth',
      moves: 'dua lengan huruf F menebal dan menyusun dirinya' }),
    Object.freeze({ id: 'p5', css: '--fz-b5', at: 870, dur: 200, pitch: PITCH.F4, role: 'root',
      moves: 'huruf F krem terkunci penuh - partikel berhenti menjadi kabut' }),
    Object.freeze({ id: 'q1', css: '--fz-b6', at: 1060, dur: 300, pitch: null, role: 'colour',
      bar: 1, gain: 0.7,
      moves: 'batang emas pertama memadat dari kabut yang menunggu' }),
    Object.freeze({ id: 'q2', css: '--fz-b7', at: 1150, dur: 300, pitch: PITCH.A4, role: 'colour',
      bar: 2, gain: 0.75,
      moves: 'batang emas kedua memadat; wordmark kecil naik dari tepi bawah' }),
    Object.freeze({ id: 'e1', css: '--fz-b8', at: 1400, dur: 220, pitch: null, role: 'pulse',
      bar: 1, gain: 1, strong: true,
      moves: 'ekualiser mengayun: batang pertama memantul pada ketukan skor' }),
    Object.freeze({ id: 'e2', css: '--fz-b9', at: 1520, dur: 220, pitch: PITCH.C5, role: 'fifth',
      bar: 2, gain: 0.85,
      moves: 'ekualiser: batang kedua menjawab pantulan pertama' }),
    Object.freeze({ id: 'e3', css: '--fz-b10', at: 1655, dur: 200, pitch: null, role: 'pulse',
      bar: 1, gain: 0.9,
      moves: 'ekualiser: pantulan ketiga, ayunannya mulai mengecil' }),
    Object.freeze({ id: 'e4', css: '--fz-b11', at: 1780, dur: 200, pitch: PITCH.G5, role: 'add9',
      bar: 2, gain: 1, strong: true,
      moves: 'ekualiser: ketukan penutup naik ke nada kesembilan yang menggantung' }),
    Object.freeze({ id: 's1', css: '--fz-b12', at: 1900, dur: 240, pitch: null, role: 'settle',
      moves: 'kedua batang menetap ke tinggi wajarnya; kanvas partikel memudar habis' })
  ]);

  /** Kapan gerakan terakhir logo selesai (ms). Stempel PAW baru boleh datang setelahnya. */
  function motionEndsAt() {
    var end = 0;
    for (var i = 0; i < BEATS.length; i++) {
      var t = BEATS[i].at + BEATS[i].dur;
      if (t > end) end = t;
    }
    return end;
  }

  /** Ketukan bernada, waktunya dalam DETIK - bentuk yang dimakan fiezel-ui-sfx.js. */
  function audioBeats() {
    var out = [];
    for (var i = 0; i < BEATS.length; i++) {
      var b = BEATS[i];
      if (b.pitch === null) continue;
      out.push({ id: b.id, freq: b.pitch, at: b.at / 1000, role: b.role });
    }
    return out;
  }

  /** Menyuntikkan jeda ketukan sebagai custom property ke elemen splash. */
  function applyTo(el) {
    if (!el || !el.style || typeof el.style.setProperty !== 'function') return false;
    for (var i = 0; i < BEATS.length; i++) {
      el.style.setProperty(BEATS[i].css, BEATS[i].at + 'ms');
    }
    return true;
  }

  /** Nilai default untuk disalin ke index.html (frame pertama, sebelum JS jalan). */
  function cssDefaults() {
    var parts = [];
    for (var i = 0; i < BEATS.length; i++) {
      parts.push(BEATS[i].css + ':' + BEATS[i].at + 'ms');
    }
    return parts.join(';');
  }

  return {
    PITCH: PITCH,
    BEATS: BEATS,
    motionEndsAt: motionEndsAt,
    audioBeats: audioBeats,
    applyTo: applyTo,
    cssDefaults: cssDefaults
  };
});
