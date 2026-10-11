/**
 * FIEZEL · features/undercover/fiezel-undercover-data.js — DATASET KATA UNDERCOVER (m025-561)
 *
 * Isi berkas ini adalah KONTEN BELAJAR, bukan dekorasi: setiap pasangan adalah dua kata
 * Inggris yang mirip makna, dan setiap chip petunjuk adalah frasa Inggris pendek yang
 * benar (atau sengaja salah) tentang salah satunya. Murid diuji pada satu hal yang bisa
 * diukur jujur: apakah ia memilih frasa yang memang menggambarkan katanya sendiri.
 *
 * Hanya bahasa Inggris yang tinggal di sini. Arti tiap kata dan chip (Indonesia + Thai)
 * hidup di features/i18n/copy-(id|th)-undercover.js dengan kunci:
 *   undercover.word.<slug kata>          arti kata rahasia
 *   undercover.chip.<pair>.<chip>        arti chip petunjuk
 *   undercover.nuance.<pair>             komparasi semantik untuk debrief
 * tests/undercover-game-test.js menuntut setiap kunci itu ada di KEDUA bahasa.
 *
 * RISIKO CHIP (dibaca mesin bot DAN ditampilkan ke murid sebagai "risiko bocor"):
 *   low   cocok untuk KEDUA kata pasangan — aman dari bocor, tapi samar
 *   mid   condong ke kata pemiliknya
 *   high  hanya cocok untuk kata pemiliknya — membuktikan diri, tapi membocorkan kata
 *   none  tidak cocok untuk kata mana pun — kesalahan makna (inilah yang dicatat Braincore)
 *
 * BANK: `bank` + `vocabId` menunjuk entri vocabulary-master.json. Kata yang belum ada di
 * bank diberi null dan TIDAK PERNAH dikirim ke Braincore — mencatat bukti untuk kunci
 * karangan berarti mengotori state.vocab dengan id yang tidak dikenal bank mana pun.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelUndercoverData = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Bentuk chip: [id, frasa Inggris, risiko]. Chip `shared` berisiko low; chip `none` tidak
     membawa risiko karena tidak cocok untuk siapa pun. */
  var PAIRS = [
    {
      id: 'bike',
      civ: { en: 'BICYCLE', bank: 'bicycle', vocabId: 'vocab_00082' },
      spy: { en: 'MOTORCYCLE', bank: null, vocabId: null },
      a: {
        shared: ['ride-school', 'Ride it to school'],
        civ: [['exercise', 'Good exercise', 'mid'], ['leg-power', 'Powered by your legs', 'high']],
        spy: [['highway', 'Fast on the highway', 'mid'], ['fuel', 'Needs fuel', 'high']],
        none: [['flies', 'Flies in the sky'], ['floats', 'Floats on water']]
      },
      b: {
        shared: ['two-wheels', 'Two wheels'],
        civ: [['light-frame', 'Light frame', 'mid'], ['pedals', 'Pedals and a chain', 'high']],
        spy: [['heavy-body', 'Heavy body', 'mid'], ['engine', 'Loud engine', 'high']],
        none: [['paper', 'Made of paper'], ['keyboard', 'Has a keyboard']]
      },
      decoys: ['SKATEBOARD', 'SCOOTER', 'TRUCK']
    },
    {
      id: 'bus',
      civ: { en: 'BUS', bank: 'bus', vocabId: 'vocab_00130' },
      spy: { en: 'TRAIN', bank: 'train', vocabId: 'a1_curated_0114' },
      a: {
        shared: ['many-people', 'Carries many people'],
        civ: [['street-stops', 'Stops on the street', 'mid'], ['traffic', 'Gets stuck in traffic', 'high']],
        spy: [['station', 'Leaves from a station', 'mid'], ['rails', 'Runs on rails', 'high']],
        none: [['swims', 'Swims in the sea'], ['eggs', 'Lays eggs']]
      },
      b: {
        shared: ['seat-rows', 'Rows of seats'],
        civ: [['tires', 'Rubber tires', 'mid'], ['steering', 'A big steering wheel', 'high']],
        spy: [['long-body', 'Very long body', 'mid'], ['carriages', 'Many carriages', 'high']],
        none: [['feathers', 'Has feathers'], ['coin', 'Small as a coin']]
      },
      decoys: ['TAXI', 'SHIP', 'TRUCK']
    },
    {
      id: 'coffee',
      civ: { en: 'COFFEE', bank: 'coffee', vocabId: 'vocab_00196' },
      spy: { en: 'TEA', bank: null, vocabId: null },
      a: {
        shared: ['morning-drink', 'Hot morning drink'],
        civ: [['awake', 'Keeps you awake', 'mid'], ['beans', 'Made from roasted beans', 'high']],
        spy: [['gentle', 'Calm and gentle', 'mid'], ['leaves', 'Made from leaves', 'high']],
        none: [['crunchy', 'A crunchy snack'], ['frozen', 'Frozen solid']]
      },
      b: {
        shared: ['cup', 'Served in a cup'],
        civ: [['bitter', 'Bitter taste', 'mid'], ['dark-brown', 'Dark brown color', 'high']],
        spy: [['light-clear', 'Light and clear', 'mid'], ['small-bags', 'Sold in small bags', 'high']],
        none: [['teeth', 'Has sharp teeth'], ['square', 'Square and hard']]
      },
      decoys: ['MILK', 'JUICE', 'COCOA']
    },
    {
      id: 'camera',
      civ: { en: 'CAMERA', bank: 'camera', vocabId: 'vocab_00143' },
      spy: { en: 'PHONE', bank: 'phone', vocabId: 'a1_curated_0080' },
      a: {
        shared: ['photos', 'Takes photos'],
        civ: [['photographers', 'Used by photographers', 'mid'], ['only-pictures', 'Only takes pictures', 'high']],
        spy: [['messages', 'Sends messages', 'mid'], ['call-friends', 'You call friends with it', 'high']],
        none: [['cooks-rice', 'Cooks rice'], ['cleans-floor', 'Cleans the floor']]
      },
      b: {
        shared: ['lens', 'Has a lens'],
        civ: [['neck-strap', 'Has a neck strap', 'mid'], ['zoom-lens', 'Big zoom lens', 'high']],
        spy: [['pocket', 'Fits in a pocket', 'mid'], ['touch-screen', 'Big touch screen', 'high']],
        none: [['four-legs', 'Has four legs'], ['wood', 'Made of wood']]
      },
      decoys: ['TABLET', 'LAPTOP', 'RADIO']
    },
    {
      id: 'sky',
      civ: { en: 'AIRPLANE', bank: null, vocabId: null },
      spy: { en: 'HELICOPTER', bank: null, vocabId: null },
      a: {
        shared: ['flies-sky', 'Flies in the sky'],
        civ: [['far-trips', 'Travels very far', 'mid'], ['runway', 'Needs a long runway', 'high']],
        spy: [['rescues', 'Rescues people', 'mid'], ['hovers', 'Can hover in one place', 'high']],
        none: [['under-sea', 'Drives under the sea'], ['garden', 'Grows in a garden']]
      },
      b: {
        shared: ['pilot', 'Has a pilot'],
        civ: [['hundreds-seats', 'Hundreds of seats', 'mid'], ['fixed-wings', 'Long fixed wings', 'high']],
        spy: [['small-cabin', 'Small cabin', 'mid'], ['top-blades', 'Spinning top blades', 'high']],
        none: [['pillow', 'Soft like a pillow'], ['your-pocket', 'Fits in your pocket']]
      },
      decoys: ['DRONE', 'ROCKET', 'BALLOON']
    },
    {
      id: 'mountain',
      civ: { en: 'MOUNTAIN', bank: 'mountain', vocabId: 'vocab_02542' },
      spy: { en: 'HILL', bank: 'hill', vocabId: 'vocab_02603' },
      a: {
        shared: ['hiking', 'Good for hiking'],
        civ: [['hard-climb', 'Hard to climb', 'mid'], ['snow-top', 'Snow on the top', 'high']],
        spy: [['short-walk', 'An easy short walk', 'mid'], ['roll-down', 'Kids roll down it', 'high']],
        none: [['ocean', 'Lives in the ocean'], ['rings', 'Rings in the morning']]
      },
      b: {
        shared: ['rocks-grass', 'Rocks and grass'],
        civ: [['sharp-peak', 'A sharp high peak', 'mid'], ['above-clouds', 'Higher than clouds', 'high']],
        spy: [['gentle-slope', 'A gentle slope', 'mid'], ['small-round', 'Small and round', 'high']],
        none: [['glass', 'Made of glass'], ['two-doors', 'Has two doors']]
      },
      decoys: ['VALLEY', 'VOLCANO', 'CLIFF']
    },
    {
      id: 'pen',
      civ: { en: 'PEN', bank: 'pen', vocabId: 'a1_curated_0077' },
      spy: { en: 'PENCIL', bank: 'pencil', vocabId: 'a1_curated_0078' },
      a: {
        shared: ['writing', 'Used for writing'],
        civ: [['signs', 'Signs documents', 'mid'], ['cant-erase', 'You cannot erase it', 'high']],
        spy: [['drawing', 'Good for drawing', 'mid'], ['can-erase', 'You can erase it', 'high']],
        none: [['music', 'Plays music'], ['warm', 'Keeps you warm']]
      },
      b: {
        shared: ['long-thin', 'Long and thin'],
        civ: [['click', 'A click button on top', 'mid'], ['ink', 'Full of ink', 'high']],
        spy: [['wooden', 'Made of wood', 'mid'], ['sharpen', 'Needs sharpening', 'high']],
        none: [['fur', 'Has soft fur'], ['bigger-car', 'Bigger than a car']]
      },
      decoys: ['CRAYON', 'MARKER', 'BRUSH']
    },
    {
      id: 'cake',
      civ: { en: 'CAKE', bank: 'cake', vocabId: 'vocab_00141' },
      spy: { en: 'BREAD', bank: 'bread', vocabId: 'vocab_00114' },
      a: {
        shared: ['oven', 'Baked in an oven'],
        civ: [['dessert', 'A sweet dessert', 'mid'], ['birthdays', 'For birthdays', 'high']],
        spy: [['every-day', 'Eaten every day', 'mid'], ['sandwiches', 'Good for sandwiches', 'high']],
        none: [['straw', 'Drink it with a straw'], ['clean-shoes', 'Cleans your shoes']]
      },
      b: {
        shared: ['flour', 'Made with flour'],
        civ: [['creamy', 'Soft and creamy', 'mid'], ['candles', 'Candles on top', 'high']],
        spy: [['crust', 'A brown crust', 'mid'], ['not-sweet', 'Plain, not sweet', 'high']],
        none: [['metal', 'Made of metal'], ['wheels', 'Has two wheels']]
      },
      decoys: ['COOKIE', 'PIZZA', 'DONUT']
    }
  ];

  /* Bot berkepribadian. Angka-angka ini menggerakkan mesin, bukan hiasan:
     accuse  = peluang menuduh/melempar saat debat
     noise   = derau penilaian (pengamat jeli = derau kecil)
     risk    = selera risiko petunjuk saat menjadi warga
     bluff   = kemampuan meniru petunjuk warga saat menjadi penyusup
     throws  = barang favorit dilempar ke tersangka utama */
  var BOTS = [
    { id: 'rian', name: 'Rian', hue: 12, accuse: 0.8, noise: 0.24, risk: 'high', bluff: 0.35, throws: ['tomato', 'cuffs'] },
    { id: 'alya', name: 'Alya', hue: 182, accuse: 0.42, noise: 0.07, risk: 'mid', bluff: 0.6, throws: ['radar', 'rose'] },
    { id: 'dimas', name: 'Dimas', hue: 268, accuse: 0.5, noise: 0.2, risk: 'low', bluff: 0.9, throws: ['egg', 'coffee'] },
    { id: 'nadia', name: 'Nadia', hue: 320, accuse: 0.28, noise: 0.16, risk: 'low', bluff: 0.5, throws: ['coffee', 'rose'] },
    { id: 'kevin', name: 'Kevin', hue: 44, accuse: 0.55, noise: 0.1, risk: 'mid', bluff: 0.55, throws: ['radar', 'cuffs'] },
    { id: 'sari', name: 'Sari', hue: 340, accuse: 0.72, noise: 0.22, risk: 'high', bluff: 0.4, throws: ['tomato', 'egg'] }
  ];

  /* Barang meja. `social` = geser kecurigaan publik pada sasaran (positif = makin dicurigai). */
  var ITEMS = [
    { id: 'tomato', glyph: '🍅', social: 8, fx: 'splat' },
    { id: 'egg', glyph: '🥚', social: 6, fx: 'splat' },
    { id: 'cuffs', glyph: '🔒', social: 12, fx: 'clang' },
    { id: 'radar', glyph: '🔍', social: 4, fx: 'scan' },
    { id: 'coffee', glyph: '☕', social: -6, fx: 'steam' },
    { id: 'rose', glyph: '🌹', social: -10, fx: 'sparkle' }
  ];

  function slug(en) {
    return String(en || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function pairById(id) {
    for (var i = 0; i < PAIRS.length; i++) if (PAIRS[i].id === id) return PAIRS[i];
    return null;
  }

  /** Semua chip unik satu pasangan, sudah diberi pemilik: 'both' | 'civ' | 'spy' | 'none'. */
  function chipsOf(pair) {
    var out = [];
    ['a', 'b'].forEach(function (dim) {
      var d = pair[dim];
      out.push({ id: d.shared[0], en: d.shared[1], dim: dim, owner: 'both', risk: 'low' });
      d.civ.forEach(function (c) { out.push({ id: c[0], en: c[1], dim: dim, owner: 'civ', risk: c[2] }); });
      d.spy.forEach(function (c) { out.push({ id: c[0], en: c[1], dim: dim, owner: 'spy', risk: c[2] }); });
      d.none.forEach(function (c) { out.push({ id: c[0], en: c[1], dim: dim, owner: 'none', risk: 'low' }); });
    });
    return out;
  }

  function wordKey(en) { return 'undercover.word.' + slug(en); }
  function clueKey(pairId, chipId) { return 'undercover.chip.' + pairId + '.' + chipId; }
  function nuanceKey(pairId) { return 'undercover.nuance.' + pairId; }

  return {
    PAIRS: PAIRS,
    BOTS: BOTS,
    ITEMS: ITEMS,
    slug: slug,
    pairById: pairById,
    chipsOf: chipsOf,
    wordKey: wordKey,
    clueKey: clueKey,
    nuanceKey: nuanceKey
  };
}));
