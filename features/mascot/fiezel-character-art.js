/* HASIL GENERATE - jangan diedit tangan.
   Sumber: assets/characters/manifest.json + assets/characters/face-rig.json
   Regenerasi: node tools/gen-character-art-table.mjs

   Peta 19 state komponen ke seni Nusa/Mira/team. Ditanam (bukan di-fetch) supaya
   wajah karakter tidak menunggu jaringan untuk tahu gambar mana yang harus dipakai;
   gambarnya sendiri tetap dimuat malas oleh <img>.

   w/h ikut manifest supaya rasio aspek tidak pernah ditebak dan tata letak tidak
   bergeser saat gambar selesai dimuat. 'blink' null = pose itu tidak punya frame
   kedip. 'mouth'/'eyes' = kotak ternormalisasi [x,y,w,h] dari face-rig, dipakai
   lapisan viseme; null = pose itu belum diukur. 'muzzle' = warna kulit sekitar
   mulut, DIUKUR dari aset (tools/sample-muzzle.py), dipakai menutup mulut lama
   sebelum viseme menggambar yang baru. */
(function (global) {
  'use strict';
  if (!global) return;
  var ART = {
    "idle": { char: "nusa", pose: "full-neutral", src: "assets/characters/nusa/webp/full-neutral.webp", w: 558, h: 1129, blink: "assets/characters/nusa/png/blink/full-neutral.png", mouth: [0.22634,0.19265,0.54194,0.44207], eyes: [0.27419,0.15412,0.44982,0.1178], muzzle: "#F5DDB2" },
    "greeting": { char: "team", pose: "shoulder-wave", src: "assets/characters/team/webp/shoulder-wave.webp", w: 772, h: 1104, blink: "assets/characters/team/png/blink/shoulder-wave.png", mouth: [0.39132,0.3365,0.19275,0.05208], eyes: [0.33808,0.24873,0.29728,0.09764], muzzle: "#F2A684" },
    "curious": { char: "nusa", pose: "head-curious", src: "assets/characters/nusa/webp/head-curious.webp", w: 760, h: 889, blink: null, mouth: null, eyes: null, muzzle: null },
    "thinking": { char: "nusa", pose: "full-thinking", src: "assets/characters/nusa/webp/full-thinking.webp", w: 650, h: 838, blink: null, mouth: null, eyes: null, muzzle: null },
    "listening": { char: "nusa", pose: "full-neutral", src: "assets/characters/nusa/webp/full-neutral.webp", w: 558, h: 1129, blink: "assets/characters/nusa/png/blink/full-neutral.png", mouth: [0.22634,0.19265,0.54194,0.44207], eyes: [0.27419,0.15412,0.44982,0.1178], muzzle: "#F5DDB2" },
    "encouraging": { char: "mira", pose: "full-explain", src: "assets/characters/mira/webp/full-explain.webp", w: 790, h: 1103, blink: "assets/characters/mira/png/blink/full-explain.png", mouth: [0.41696,0.33137,0.16608,0.08132], eyes: [0.35316,0.24805,0.29114,0.09773], muzzle: "#F6AB8A" },
    "celebrating": { char: "nusa", pose: "full-celebrate", src: "assets/characters/nusa/webp/full-celebrate.webp", w: 681, h: 1010, blink: null, mouth: null, eyes: null, muzzle: null },
    "confused": { char: "nusa", pose: "full-oops", src: "assets/characters/nusa/webp/full-oops.webp", w: 736, h: 1052, blink: "assets/characters/nusa/png/blink/full-oops.png", mouth: [0.41943,0.26188,0.28478,0.08527], eyes: [0.39878,0.15532,0.32201,0.11711], muzzle: "#F5DEB4" },
    "hinting": { char: "mira", pose: "full-explain", src: "assets/characters/mira/webp/full-explain.webp", w: 790, h: 1103, blink: "assets/characters/mira/png/blink/full-explain.png", mouth: [0.41696,0.33137,0.16608,0.08132], eyes: [0.35316,0.24805,0.29114,0.09773], muzzle: "#F6AB8A" },
    "completion": { char: "team", pose: "highfive", src: "assets/characters/team/webp/highfive.webp", w: 783, h: 864, blink: null, mouth: null, eyes: null, muzzle: null },
    "proud": { char: "mira", pose: "head-proud", src: "assets/characters/mira/webp/head-proud.webp", w: 1024, h: 1032, blink: null, mouth: null, eyes: null, muzzle: null },
    "sleepy": { char: "nusa", pose: "full-sleep", src: "assets/characters/nusa/webp/full-sleep.webp", w: 802, h: 661, blink: null, mouth: null, eyes: null, muzzle: null },
    "sad": { char: "nusa", pose: "head-oops", src: "assets/characters/nusa/webp/head-oops.webp", w: 782, h: 819, blink: null, mouth: null, eyes: null, muzzle: null },
    "love": { char: "mira", pose: "full-cheer", src: "assets/characters/mira/webp/full-cheer.webp", w: 775, h: 1102, blink: null, mouth: null, eyes: null, muzzle: null },
    "speaking": { char: "nusa", pose: "head-happy", src: "assets/characters/nusa/webp/head-happy.webp", w: 816, h: 927, blink: "assets/characters/nusa/png/blink/head-happy.png", mouth: [0.27451,0.452,0.45098,0.28781], eyes: [0.26348,0.29018,0.47304,0.21359], muzzle: "#F4DAAE" },
    "welcome-back": { char: "team", pose: "shoulder-wave", src: "assets/characters/team/webp/shoulder-wave.webp", w: 772, h: 1104, blink: "assets/characters/team/png/blink/shoulder-wave.png", mouth: [0.39132,0.3365,0.19275,0.05208], eyes: [0.33808,0.24873,0.29728,0.09764], muzzle: "#F2A684" },
    "lesson-start": { char: "team", pose: "teaching", src: "assets/characters/team/webp/teaching.webp", w: 937, h: 761, blink: null, mouth: null, eyes: null, muzzle: null },
    "level-up": { char: "mira", pose: "full-cheer", src: "assets/characters/mira/webp/full-cheer.webp", w: 775, h: 1102, blink: null, mouth: null, eyes: null, muzzle: null },
    "milestone": { char: "team", pose: "highfive", src: "assets/characters/team/webp/highfive.webp", w: 783, h: 864, blink: null, mouth: null, eyes: null, muzzle: null }
  };
  global.FiezelCharacterArt = Object.freeze({
    art: ART,
    states: Object.keys(ART),
    /** Aset satu state, atau null kalau namanya tidak dikenal. */
    forState: function (name) { return ART[name] || null; },
    /** Berkas yang wajib ikut precache supaya boot pertama tidak berkedip kosong. */
    bootSrcs: ['idle', 'greeting', 'speaking'].map(function (s) { return ART[s].src; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; })
  });
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this));
