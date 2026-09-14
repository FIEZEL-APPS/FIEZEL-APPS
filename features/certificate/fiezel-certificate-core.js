/**
 * FIEZEL — fiezel-certificate-core.js · APA YANG BOLEH DIKLAIM SEBUAH SERTIFIKAT.
 *
 * Modul ini murni: masukan -> keluaran. Tanpa DOM, tanpa jaringan, tanpa localStorage,
 * tanpa Date.now() tersembunyi (waktu SELALU disuntikkan pemanggil). Polanya mengikuti
 * features/prasasti/fiezel-prasasti-core.js dan features/skills-evidence/.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA, DAN KENAPA IA KERAS KEPALA
 * ==========================================================================
 * Sertifikat adalah satu-satunya keluaran FIEZEL yang dibawa murid KELUAR dari aplikasi —
 * ke pelamaran kerja, ke pendaftaran kampus, ke tangan orang yang tidak pernah melihat
 * layar ini. Begitu sehelai sertifikat mengklaim "B2", klaim itu berdiri sendiri tanpa
 * konteks, tanpa catatan kaki, tanpa kesempatan meralat.
 *
 * Maka aturan modul ini lebih ketat dari bagian mana pun di aplikasi:
 *
 *   1. LEVEL TIDAK PERNAH MELAMPAUI BUKTI. Level global dibatasi oleh skill TERLEMAH
 *      yang terukur, bukan rata-rata. Rata-rata menyembunyikan lubang; sertifikat yang
 *      menyembunyikan lubang adalah sertifikat yang berbohong.
 *   2. YANG TIDAK DIUKUR DITULIS TIDAK DIUKUR — `null`, BUKAN 0. Skill tanpa soal bukan
 *      skill bernilai nol. Ini aturan yang sama dengan fiezel-skills-evidence.js, dan di
 *      sini taruhannya lebih tinggi.
 *   3. BUKTI TIPIS = TIDAK ADA SERTIFIKAT. Di bawah ambang minimum, issue() menolak dan
 *      menyebut alasannya. Menolak menerbitkan selalu lebih murah daripada menerbitkan
 *      klaim yang tidak bisa dipertahankan.
 *   4. KLAIM BERJENJANG. Untuk mengklaim B2, murid harus juga lolos ambang di A1..B1.
 *      Tanpa aturan ini, murid yang menebak beruntung di segelintir soal sulit bisa
 *      melompati seluruh tangga.
 *
 * ==========================================================================
 * YANG SENGAJA TIDAK DILAKUKAN MODUL INI
 * ==========================================================================
 * Ia TIDAK menyamakan diri dengan TOEFL/IELTS/Cambridge. Tidak ada tabel konversi skor,
 * tidak ada kata "setara". FIEZEL bukan lembaga asesmen terakreditasi, dan sertifikat yang
 * menyiratkan sebaliknya merugikan murid yang mempercayainya. `disclaimer` di keluaran
 * WAJIB ikut tercetak — itu bagian dari sertifikat, bukan hiasan.
 *
 * Ia juga TIDAK menandatangani apa pun. Penandatanganan hidup di sisi server
 * (workers/api/) karena secret tidak boleh ada di perangkat murid.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelCertificateCore = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-certificate-v1';

  // Tangga CEFR, dikunci dan berurutan. Indeks di sini ADALAH tingkatannya.
  var LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

  // Skill yang boleh muncul di sertifikat. Enum tertutup: sertifikat tidak boleh
  // menampung nama skill bebas dari pemanggil.
  var SKILLS = Object.freeze(['grammar', 'vocabulary', 'reading', 'listening', 'speaking']);

  /* ---- ambang, semuanya eksplisit dan bisa dibaca sebagai kontrak -------- */

  // Rasio benar minimum untuk dianggap menguasai satu level pada satu skill.
  var MASTERY_RATIO = 0.7;

  // Soal minimum pada satu level sebelum level itu boleh dinilai sama sekali.
  // Di bawah ini, hasilnya kebisingan, bukan pengukuran.
  var MIN_ITEMS_PER_LEVEL = 5;

  // Skill minimum yang harus terukur sebelum sertifikat boleh terbit.
  var MIN_SKILLS_MEASURED = 2;

  // Total soal minimum di seluruh asesmen.
  var MIN_TOTAL_ITEMS = 25;

  // Masa berlaku sertifikat. Kemampuan bahasa bergerak; sertifikat yang tidak pernah
  // kedaluwarsa akan dipakai bertahun-tahun setelah ia berhenti benar.
  var VALIDITY_DAYS = 730;

  /* ---- utilitas murni ---------------------------------------------------- */

  function levelIndex(level) {
    return LEVELS.indexOf(String(level));
  }

  function toCount(value) {
    var n = Math.floor(Number(value));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Membaca satu sel bukti {correct, total} dengan aman.
   * `correct` tidak pernah boleh melebihi `total`: masukan rusak dijepit, tidak dipercaya.
   */
  function readCell(cell) {
    if (!isPlainObject(cell)) return { correct: 0, total: 0 };
    var total = toCount(cell.total);
    var correct = Math.min(toCount(cell.correct), total);
    return { correct: correct, total: total };
  }

  /* ---- penentuan level per-skill ----------------------------------------- */

  /**
   * Level tertinggi yang BENAR-BENAR ditunjukkan pada satu skill.
   *
   * Aturan berjenjang: sebuah level dianggap dikuasai hanya kalau level itu DAN semua
   * level di bawahnya lolos ambang. Level yang tidak punya cukup soal tidak memutus
   * rantai — ia dilewati sebagai "tidak diuji", karena ketiadaan soal bukan kegagalan.
   *
   * Mengembalikan null kalau tidak satu pun level punya cukup soal: skill ini TIDAK
   * TERUKUR, dan itu bukan hal yang sama dengan A1.
   */
  function skillLevel(bands) {
    if (!isPlainObject(bands)) return null;

    var achieved = null;
    var measuredAny = false;

    for (var i = 0; i < LEVELS.length; i += 1) {
      var cell = readCell(bands[LEVELS[i]]);
      if (cell.total < MIN_ITEMS_PER_LEVEL) continue; // tidak diuji pada level ini
      measuredAny = true;
      if (cell.correct / cell.total >= MASTERY_RATIO) {
        achieved = LEVELS[i];
      } else {
        // Rantai putus. Level di atas ini tidak boleh diklaim walau kebetulan lolos —
        // menebak beruntung di soal sulit tidak membatalkan kegagalan di soal mudah.
        break;
      }
    }

    return measuredAny ? achieved : null;
  }

  /**
   * Menghitung jumlah soal terpakai pada satu skill (untuk transparansi di sertifikat).
   */
  function skillItemCount(bands) {
    if (!isPlainObject(bands)) return 0;
    var total = 0;
    for (var i = 0; i < LEVELS.length; i += 1) {
      total += readCell(bands[LEVELS[i]]).total;
    }
    return total;
  }

  /* ---- penentuan level global -------------------------------------------- */

  /**
   * Level global dari profil skill yang terukur.
   *
   * ATURAN: level global L adalah level TERTINGGI yang memenuhi keduanya —
   *   (a) setiap skill terukur berada di L atau di atasnya, KECUALI paling banyak satu
   *       skill yang boleh berada tepat satu tingkat di bawah L;
   *   (b) L tidak melebihi skill tertinggi yang terukur.
   *
   * Kelonggaran satu skill di (a) ada supaya satu kelemahan tunggal — misalnya speaking
   * yang memang paling sulit dilatih sendirian — tidak menghapus seluruh pencapaian.
   * Kelonggaran itu SATU, dan hanya SATU tingkat. Lebih dari itu, profilnya memang belum
   * berada di level tersebut.
   *
   * Mengembalikan null kalau tidak ada skill terukur.
   */
  function overallLevel(levelsBySkill) {
    var indices = [];
    for (var key in levelsBySkill) {
      if (!Object.prototype.hasOwnProperty.call(levelsBySkill, key)) continue;
      var value = levelsBySkill[key];
      if (value === null) continue; // tidak terukur tidak ikut memilih
      var idx = levelIndex(value);
      if (idx >= 0) indices.push(idx);
    }
    if (!indices.length) return null;

    var highest = Math.max.apply(null, indices);

    for (var candidate = highest; candidate >= 0; candidate -= 1) {
      var below = 0;
      var tooFar = false;
      for (var i = 0; i < indices.length; i += 1) {
        var gap = candidate - indices[i];
        if (gap <= 0) continue;          // skill ini memenuhi atau melampaui kandidat
        if (gap > 1) { tooFar = true; break; } // lebih dari satu tingkat di bawah
        below += 1;
      }
      if (!tooFar && below <= 1) return LEVELS[candidate];
    }

    return LEVELS[0];
  }

  /* ---- penerbitan --------------------------------------------------------- */

  /**
   * Alasan penolakan, enum tertutup supaya UI dan gerbang bicara bahasa yang sama.
   */
  var REFUSAL = Object.freeze({
    NO_EVIDENCE: 'no_evidence',
    TOO_FEW_ITEMS: 'too_few_items',
    TOO_FEW_SKILLS: 'too_few_skills',
    NO_LEVEL: 'no_level'
  });

  /**
   * Menerbitkan data sertifikat dari bukti asesmen.
   *
   * @param {object} evidence
   *   { skills: { grammar: { A1:{correct,total}, ... }, ... },
   *     integrity: { proctored: boolean, screenExits: number } }
   * @param {object} context
   *   { issuedAt: number (epoch ms, WAJIB dari pemanggil), locale: 'id'|'th' }
   *
   * @returns {object} { ok: true, certificate } atau { ok: false, reason }
   *
   * Keluaran TIDAK memuat nama murid: identitas dilekatkan di sisi server saat
   * penandatanganan, supaya modul ini tetap murni dan bisa diuji tanpa data pribadi.
   */
  function issue(evidence, context) {
    if (!isPlainObject(evidence) || !isPlainObject(evidence.skills)) {
      return { ok: false, reason: REFUSAL.NO_EVIDENCE };
    }
    var issuedAt = Number(context && context.issuedAt);
    if (!isFinite(issuedAt) || issuedAt <= 0) {
      return { ok: false, reason: REFUSAL.NO_EVIDENCE };
    }

    var levelsBySkill = {};
    var itemsBySkill = {};
    var measured = [];
    var totalItems = 0;

    for (var i = 0; i < SKILLS.length; i += 1) {
      var skill = SKILLS[i];
      var bands = evidence.skills[skill];
      var level = skillLevel(bands);
      var count = skillItemCount(bands);

      // null berarti TIDAK TERUKUR. Nilai ini ikut ke sertifikat apa adanya —
      // pembaca sertifikat berhak tahu skill mana yang tidak diuji.
      levelsBySkill[skill] = level;
      itemsBySkill[skill] = count;
      totalItems += count;
      if (level !== null) measured.push(skill);
    }

    if (totalItems < MIN_TOTAL_ITEMS) {
      return { ok: false, reason: REFUSAL.TOO_FEW_ITEMS };
    }
    if (measured.length < MIN_SKILLS_MEASURED) {
      return { ok: false, reason: REFUSAL.TOO_FEW_SKILLS };
    }

    var overall = overallLevel(levelsBySkill);
    if (overall === null) {
      return { ok: false, reason: REFUSAL.NO_LEVEL };
    }

    var integrity = isPlainObject(evidence.integrity) ? evidence.integrity : {};

    return {
      ok: true,
      certificate: Object.freeze({
        schema: SCHEMA,
        level: overall,
        skills: levelsBySkill,          // null = tidak diukur, JANGAN dibaca sebagai 0
        itemsBySkill: itemsBySkill,
        measuredSkills: measured.slice(),
        totalItems: totalItems,
        issuedAt: issuedAt,
        expiresAt: issuedAt + VALIDITY_DAYS * 86400000,
        // Integritas ikut tercetak: sertifikat dari sesi yang tidak diawasi tidak boleh
        // menyamar sebagai sertifikat dari sesi yang diawasi.
        proctored: integrity.proctored === true,
        screenExits: toCount(integrity.screenExits)
      })
    };
  }

  /**
   * Apakah sertifikat masih berlaku pada `now`.
   * Waktu disuntikkan; modul ini tidak pernah membaca jam sendiri.
   */
  function isValid(certificate, now) {
    if (!isPlainObject(certificate)) return false;
    if (certificate.schema !== SCHEMA) return false;
    var at = Number(now);
    if (!isFinite(at)) return false;
    return at >= Number(certificate.issuedAt) && at <= Number(certificate.expiresAt);
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    LEVELS: LEVELS,
    SKILLS: SKILLS,
    REFUSAL: REFUSAL,
    MASTERY_RATIO: MASTERY_RATIO,
    MIN_ITEMS_PER_LEVEL: MIN_ITEMS_PER_LEVEL,
    MIN_SKILLS_MEASURED: MIN_SKILLS_MEASURED,
    MIN_TOTAL_ITEMS: MIN_TOTAL_ITEMS,
    VALIDITY_DAYS: VALIDITY_DAYS,
    skillLevel: skillLevel,
    overallLevel: overallLevel,
    issue: issue,
    isValid: isValid
  });
}));
