/**
 * FIEZEL — fiezel-exam-lock.js · SATU PENANDA "SEDANG UJIAN" UNTUK SELURUH APLIKASI.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Pendeteksi keluar layar (m025-269) hanya hidup di satu tempat: runner tugas Kelas dengan
 * mode 'ujian'. Ujian lain — set berformat ujian di Reading dan Skills Lab, tes penempatan,
 * ujian Skip Level — berjalan lewat jalur yang sama sekali berbeda, jadi murid yang
 * mengerjakannya bisa keluar layar tanpa satu pun catatan. Pada saat yang sama pembimbing
 * PAW dan layar Tanya FIEZEL tetap hidup DI DALAM ujian, jadi murid cukup bertanya ke AI.
 * Dua lubang, satu sebab yang sama: tidak ada satu pun tempat di aplikasi ini yang tahu
 * jawaban atas pertanyaan "apakah murid sedang ujian sekarang?".
 *
 * Berkas ini menjadi tempat itu. Ia tidak memantau apa pun dan tidak melarang apa pun; ia
 * hanya MENJAWAB. Pendeteksi memakainya untuk tahu kapan harus memasang telinga, dan pintu
 * AI memakainya untuk tahu kapan harus menutup diri. Dua perilaku, satu kebenaran.
 *
 * KENAPA DISIMPAN, BUKAN SEKADAR VARIABEL
 * ---------------------------------------
 * Memuat ulang halaman adalah cara paling murah untuk melarikan diri dari penjagaan apa pun
 * yang hidup di memori. Penandanya karena itu ditulis ke localStorage dan dibaca lagi saat
 * boot. Konsekuensinya harus dijinakkan: sesi yang tidak pernah ditutup (aplikasi mati di
 * tengah ujian) akan mengunci pembimbing SELAMANYA. Maka setiap kunci membawa waktu
 * kedaluwarsa — lebih panjang dari ujian mana pun yang wajar, cukup pendek untuk tidak
 * menyandera murid sampai besok.
 *
 * JENIS UJIAN ADALAH ENUM TERTUTUP. Ia ikut ke guru sebagai satu kata, jadi ia tidak boleh
 * bisa menampung teks bebas: laporan kelas dilarang membawa kalimat, dan penanda ini adalah
 * satu-satunya bagian dari ujian non-tugas yang sampai ke sana.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelExamLock = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* `root` ditangkap lagi DI DALAM pabrik: pembungkus UMD di atas memberi root sebagai
     argumen pemanggil, bukan sebagai variabel pabrik ini — menyebutnya di sini tanpa baris
     ini akan menunjuk variabel bebas yang undefined, dan seluruh penyimpanan gagal DIAM. */
  var root = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this);

  var KEY = 'fiezel-exam-lock-v1';
  var SCHEMA = 'fiezel-exam-lock-v1';
  /* 4 jam. Ujian terpanjang di FIEZEL (set reading berformat ujian) dianggarkan di bawah satu
     jam; sisanya adalah ruang untuk murid yang menaruh ponselnya lalu kembali. Di atas itu,
     kunci yang masih berdiri hampir pasti sisa sesi yang mati, bukan ujian yang berjalan. */
  var MAX_MS = 4 * 3600000;
  var KINDS = Object.freeze(['assignment', 'reading_exam', 'listening_exam', 'speaking_exam', 'writing_exam', 'placement', 'level_exam']);
  var LABEL = Object.freeze({
    assignment: 'ujian dari guru', reading_exam: 'ujian membaca', listening_exam: 'ujian menyimak',
    speaking_exam: 'ujian berbicara', writing_exam: 'ujian menulis', placement: 'tes penempatan', level_exam: 'ujian naik level'
  });

  function store() { try { return root && root.localStorage ? root.localStorage : null; } catch (_) { return null; } }
  function now() { try { return Date.now(); } catch (_) { return 0; } }
  function normKind(k) { return KINDS.indexOf(String(k)) > -1 ? String(k) : ''; }

  function read() {
    var s = store(); if (!s) return null;
    try {
      var raw = JSON.parse(s.getItem(KEY));
      if (!raw || raw.schema !== SCHEMA || !normKind(raw.kind)) return null;
      if (!(Number(raw.until) > now())) { clear(); return null; }   // kedaluwarsa: kunci sisa sesi mati
      return raw;
    } catch (_) { return null; }
  }
  function write(v) { var s = store(); if (!s) return false; try { s.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { return false; } }
  function clear() { var s = store(); if (!s) return false; try { s.removeItem(KEY); return true; } catch (_) { return false; } }
  function announce() { try { if (root && root.document && root.document.dispatchEvent) root.document.dispatchEvent(new root.CustomEvent('fiezel-exam-lock', { detail: snapshot() })); } catch (_) {} }

  /**
   * begin(kind, meta) — sesi ujian dimulai. `meta.id` boleh membawa id tugas guru (dipakai
   * pendeteksi untuk melampirkan catatannya ke tugas yang benar); selain itu tidak ada
   * data lain yang disimpan di sini.
   */
  function begin(kind, meta) {
    var k = normKind(kind); if (!k) return false;
    var m = meta || {};
    write({ schema: SCHEMA, kind: k, id: m.id ? String(m.id).slice(0, 40) : '', at: now(), until: now() + MAX_MS });
    announce();
    return true;
  }
  /** end(kind) — sesi selesai. Kunci milik jenis LAIN tidak ikut dilepas: dua permukaan ujian
   *  tidak pernah berjalan bersamaan, dan melepas kunci orang lain adalah cara paling halus
   *  untuk membuka pintu AI di tengah ujian yang masih berjalan. */
  function end(kind) {
    var cur = read(); if (!cur) return false;
    var k = normKind(kind);
    if (k && cur.kind !== k) return false;
    clear(); announce(); return true;
  }
  function active() { return !!read(); }
  function kind() { var c = read(); return c ? c.kind : ''; }
  function assignmentId() { var c = read(); return c && c.id ? c.id : ''; }
  function label(k) { return LABEL[normKind(k || kind())] || 'ujian'; }
  function startedAt() { var c = read(); return c ? Number(c.at) || 0 : 0; }
  function snapshot() { var c = read(); return c ? { active: true, kind: c.kind, id: c.id || '', at: Number(c.at) || 0 } : { active: false, kind: '', id: '', at: 0 }; }

  return {
    SCHEMA: SCHEMA, KEY: KEY, KINDS: KINDS, MAX_MS: MAX_MS, LABEL: LABEL,
    begin: begin, end: end, active: active, kind: kind, label: label,
    assignmentId: assignmentId, startedAt: startedAt, snapshot: snapshot, _clear: clear
  };
});
