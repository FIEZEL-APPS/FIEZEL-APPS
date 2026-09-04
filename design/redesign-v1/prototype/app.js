/* ============================================================
   FIEZEL Prototype Flow — Warm Paper, Bright Mind
   6 langkah klik-able: Home → Lesson select → Quiz (benar) →
   Quiz (salah + hint bertahap) → Listening → Completion.
   Maskot: SVG STATIS pose berbeda per state (diturunkan dari
   geometri promo-v7/shared/mascot/fiezel-mascot.js — bukan
   komponen animasi penuh).
   ============================================================ */
(function () {
  "use strict";
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Maskot statis: factory pose ---------------- */
  var C = { YEL:"#FFD94F", YEL_D:"#EDB93A", CREAM:"#FFF4DA", MAROON:"#8C2233",
            COCOA:"#33201F", GOLD:"#D8B36B", BLUSH:"#F0A0AC", RED:"#D9536A" };
  var UID = 0;

  function mascot(pose, label) {
    UID++;
    var mid = "fzMask" + UID;
    var p = poses[pose] || poses.wave;

    var eyes = "";
    if (p.eyes === "happy") {
      eyes = '<path d="M112 101 C 119 90 133 90 140 101" stroke="'+C.COCOA+'" stroke-width="7" stroke-linecap="round" fill="none"/>' +
             '<path d="M180 101 C 187 90 201 90 208 101" stroke="'+C.COCOA+'" stroke-width="7" stroke-linecap="round" fill="none"/>';
    } else if (p.eyes === "love") {
      var heart = '<path d="M0 13 C -8.5 5.5 -15 1 -15 -5.5 C -15 -11.5 -10.6 -15 -6.8 -15 C -3.4 -15 -0.9 -12.8 0 -10.2 C 0.9 -12.8 3.4 -15 6.8 -15 C 10.6 -15 15 -11.5 15 -5.5 C 15 1 8.5 5.5 0 13 Z"/><circle cx="-5" cy="-8" r="3" fill="#fff" opacity=".85"/>';
      eyes = '<g fill="'+C.RED+'"><g transform="translate(126,98)">'+heart+'</g><g transform="translate(194,98)">'+heart+'</g></g>';
    } else if (p.eyes === "closed") {
      eyes = '<path d="M114 99 C 120 105 132 105 138 99" stroke="'+C.COCOA+'" stroke-width="5.5" stroke-linecap="round" fill="none"/>' +
             '<path d="M182 99 C 188 105 200 105 206 99" stroke="'+C.COCOA+'" stroke-width="5.5" stroke-linecap="round" fill="none"/>';
    } else { // open
      eyes = '<g><circle cx="126" cy="98" r="14.5" fill="'+C.COCOA+'"/><circle cx="130" cy="93" r="5" fill="#fff"/><circle cx="122" cy="103" r="2.6" fill="#fff" opacity=".7"/></g>' +
             '<g><circle cx="194" cy="98" r="14.5" fill="'+C.COCOA+'"/><circle cx="198" cy="93" r="5" fill="#fff"/><circle cx="190" cy="103" r="2.6" fill="#fff" opacity=".7"/></g>';
    }

    var mouths = {
      smile: '<path d="M148 148 C 154 155 166 155 172 148" stroke="'+C.COCOA+'" stroke-width="5.5" stroke-linecap="round" fill="none"/>',
      open : '<path d="M145 146 C 148 162 172 162 175 146 C 165 150 155 150 145 146 Z" fill="'+C.COCOA+'"/>',
      o    : '<circle cx="160" cy="151" r="6.5" fill="'+C.COCOA+'"/>',
      wave : '<path d="M147 150 Q 153 145 160 150 Q 167 155 173 150" stroke="'+C.COCOA+'" stroke-width="5.5" stroke-linecap="round" fill="none"/>',
      flat : '<path d="M150 150 L 170 150" stroke="'+C.COCOA+'" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
    };
    var mouth = mouths[p.mouth] || mouths.smile;

    var brows = p.brows ?
      '<g stroke="'+C.COCOA+'" stroke-width="5.5" stroke-linecap="round"><path d="M110 76 L 138 70"/><path d="M182 70 L 210 76"/></g>' : "";

    var padsAt = function (tx, ty, rot) {
      return '<g transform="translate('+tx+','+ty+') rotate('+rot+') scale(.8)" fill="'+C.MAROON+'">' +
             '<ellipse cx="0" cy="6" rx="9" ry="7"/><circle cx="-9" cy="-5" r="3.6"/><circle cx="0" cy="-8" r="3.6"/><circle cx="9" cy="-5" r="3.6"/></g>';
    };
    var armL = p.armL === "up"
      ? '<g transform="rotate(160 122 180)"><ellipse cx="122" cy="206" rx="14" ry="30" fill="'+C.YEL+'"/>'+padsAt(122,228,-160)+'</g>'
      : '<g><ellipse cx="122" cy="206" rx="14" ry="30" fill="'+C.YEL+'"/><ellipse cx="122" cy="206" rx="14" ry="30" fill="#000" opacity=".04"/></g>';
    var armR = p.armR === "up"
      ? '<g transform="rotate(-160 198 180)"><ellipse cx="198" cy="206" rx="14" ry="30" fill="'+C.YEL+'"/>'+padsAt(198,228,160)+'</g>'
      : '<g><ellipse cx="198" cy="206" rx="14" ry="30" fill="'+C.YEL+'"/><ellipse cx="198" cy="206" rx="14" ry="30" fill="#000" opacity=".04"/></g>';

    var acc = "";
    if (p.stars) acc +=
      '<g fill="'+C.GOLD+'"><path d="M42 46 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z"/>' +
      '<path d="M282 78 l3.5 9 9 3.5 -9 3.5 -3.5 9 -3.5 -9 -9 -3.5 9 -3.5 Z"/>' +
      '<path d="M258 6 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="'+C.RED+'"/></g>';
    if (p.bulb) acc +=
      '<g><circle cx="262" cy="34" r="20" fill="'+C.GOLD+'"/><circle cx="262" cy="34" r="20" fill="#fff" opacity=".25"/>' +
      '<rect x="254" y="50" width="16" height="10" rx="4" fill="'+C.MAROON+'"/>' +
      '<g stroke="'+C.GOLD+'" stroke-width="5" stroke-linecap="round"><path d="M232 16 L 224 10"/><path d="M292 16 L 300 10"/><path d="M262 6 L 262 -4"/></g></g>';
    if (p.sweat) acc +=
      '<path d="M80 72 C 88 84 90 92 90 98 A 10 10 0 1 1 70 98 C 70 92 72 84 80 72 Z" fill="#9CC7E8"/>';
    if (p.notes) acc +=
      '<g fill="'+C.GOLD+'"><g transform="translate(280,60)"><circle cx="0" cy="10" r="7"/><rect x="5" y="-18" width="4.5" height="28" rx="2"/><rect x="5" y="-18" width="16" height="5" rx="2.5"/></g>' +
      '<g transform="translate(36,84)"><circle cx="0" cy="8" r="6"/><rect x="4" y="-14" width="4" height="22" rx="2"/></g></g>';
    if (p.hearts) acc +=
      '<g fill="'+C.RED+'"><g transform="translate(52,60)"><path d="M0 9 C -6 3.5 -10.5 .7 -10.5 -3.9 C -10.5 -8.1 -7.4 -10.5 -4.8 -10.5 C -2.4 -10.5 -.7 -9 0 -7.1 C .7 -9 2.4 -10.5 4.8 -10.5 C 7.4 -10.5 10.5 -8.1 10.5 -3.9 C 10.5 .7 6 3.5 0 9 Z"/></g>' +
      '<g transform="translate(288,44)" fill="'+C.BLUSH+'"><path d="M0 9 C -6 3.5 -10.5 .7 -10.5 -3.9 C -10.5 -8.1 -7.4 -10.5 -4.8 -10.5 C -2.4 -10.5 -.7 -9 0 -7.1 C .7 -9 2.4 -10.5 4.8 -10.5 C 7.4 -10.5 10.5 -8.1 10.5 -3.9 C 10.5 .7 6 3.5 0 9 Z"/></g></g>';

    var headphones = p.headphones ?
      '<g><path d="M76 70 C 92 10 228 10 244 70" stroke="'+C.GOLD+'" stroke-width="14" fill="none" stroke-linecap="round"/>' +
      '<rect x="52" y="66" width="38" height="54" rx="18" fill="'+C.MAROON+'"/>' +
      '<rect x="230" y="66" width="38" height="54" rx="18" fill="'+C.MAROON+'"/></g>' : "";

    var tilt = p.tilt ? ' transform="rotate('+p.tilt+' 160 200)"' : "";

    return '<svg viewBox="-10 -10 340 314" role="img" aria-label="'+(label || "Maskot PAW — " + pose)+'">' +
      '<ellipse cx="160" cy="284" rx="86" ry="10" fill="#000" opacity=".08"/>' +
      '<g'+tilt+'>' +
      /* ekor */
      '<g><defs><mask id="'+mid+'" maskUnits="userSpaceOnUse" x="180" y="120" width="160" height="170">' +
      '<path d="M212 244 C 266 258 298 238 296 200 C 295 180 284 164 268 158" stroke="#fff" stroke-width="25" fill="none" stroke-linecap="round"/></mask></defs>' +
      '<path d="M212 244 C 266 258 298 238 296 200 C 295 180 284 164 268 158" stroke="'+C.YEL_D+'" stroke-width="25" fill="none" stroke-linecap="round"/>' +
      '<g mask="url(#'+mid+')"><circle cx="268" cy="158" r="15" fill="'+C.MAROON+'"/></g></g>' +
      /* badan */
      '<rect x="102" y="164" width="116" height="96" rx="42" fill="'+C.YEL+'"/>' +
      '<ellipse cx="132" cy="257" rx="24" ry="11" fill="'+C.YEL_D+'"/>' +
      '<ellipse cx="188" cy="257" rx="24" ry="11" fill="'+C.YEL_D+'"/>' +
      '<ellipse cx="160" cy="226" rx="36" ry="28" fill="'+C.CREAM+'"/>' +
      '<g transform="translate(160,224)" fill="'+C.MAROON+'"><ellipse cx="0" cy="5" rx="10" ry="8"/><circle cx="-10" cy="-7" r="4"/><circle cx="0" cy="-10" r="4"/><circle cx="10" cy="-7" r="4"/></g>' +
      /* telinga */
      '<path d="M76 66 L 95 0 L 140 34 Z" fill="'+C.YEL+'"/><path d="M90 52 L 101 17 L 125 35 Z" fill="'+C.MAROON+'"/>' +
      '<path d="M244 66 L 225 0 L 180 34 Z" fill="'+C.YEL+'"/><path d="M230 52 L 219 17 L 195 35 Z" fill="'+C.MAROON+'"/>' +
      /* kepala + wajah */
      '<circle cx="160" cy="106" r="88" fill="'+C.YEL+'"/>' +
      '<ellipse cx="160" cy="140" rx="36" ry="25" fill="'+C.CREAM+'"/>' +
      '<path d="M153 126 L 167 126 L 160 136 Z" fill="'+C.MAROON+'"/>' +
      '<circle cx="102" cy="126" r="11" fill="'+C.BLUSH+'"/><circle cx="218" cy="126" r="11" fill="'+C.BLUSH+'"/>' +
      eyes + brows + mouth +
      /* lengan (di atas kepala agar tampak saat diangkat) */
      armL + armR + headphones +
      '</g>' + acc + '</svg>';
  }

  var poses = {
    wave:        { eyes:"open",  mouth:"open",  armR:"up" },
    curious:     { eyes:"open",  mouth:"o",     tilt:-6 },
    happy:       { eyes:"happy", mouth:"open",  stars:true },
    encouraging: { eyes:"open",  mouth:"wave",  armR:"up", sweat:true },
    hinting:     { eyes:"open",  mouth:"smile", bulb:true, brows:true, tilt:4 },
    listening:   { eyes:"closed",mouth:"smile", headphones:true, notes:true, tilt:-3 },
    celebrating: { eyes:"love",  mouth:"open",  armL:"up", armR:"up", stars:true, hearts:true }
  };

  /* ---------------- Ikon (Lucide-style stroke 1.75) ---------------- */
  function icon(name, s) {
    s = s || 20;
    var d = {
      home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
      chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      map:  '<path d="M9 3 3.6 5.2A1 1 0 0 0 3 6.1V20l6-2.5 6 2.5 5.4-2.2a1 1 0 0 0 .6-.9V3l-6 2.5z"/><path d="M9 3v14.5"/><path d="M15 5.5V20"/>',
      az:   '<circle cx="12" cy="12" r="9"/><path d="M9.5 15.5 12 8l2.5 7.5"/><path d="M10.4 13h3.2"/>',
      back: '<path d="M15 18 9 12l6-6"/>',
      lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
      check:'<path d="M20 6 9 17l-5-5"/>',
      x:    '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      play: '<path d="M7 4.5 19 12 7 19.5z" fill="currentColor" stroke="none"/>',
      pause:'<rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none"/>',
      bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.7 10.7c.7.6 1.2 1.4 1.4 2.3h4.6c.2-.9.7-1.7 1.4-2.3A6 6 0 0 0 12 3z"/>',
      spark:'<path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="m5.6 5.6 2.1 2.1"/><path d="m16.3 16.3 2.1 2.1"/><path d="m5.6 18.4 2.1-2.1"/><path d="m16.3 7.7 2.1-2.1"/>',
      volume:'<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9.2 9.2 0 0 1 0 13"/>',
      arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
      flame:'<path d="M12 21c4 0 6.5-2.5 6.5-6 0-3-2-5-3.5-6.5C13.5 7 13 5 13.5 3c-3 1.5-5 4-5 7-1-.5-1.6-1.4-2-2.5C5.5 9 5 11 5 13c0 4.5 3 8 7 8z"/>',
      target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
      zap:  '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>'
    }[name] || "";
    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  }

  /* garis neural halus untuk panel Bright Mind */
  function neural() {
    return '<svg class="core-neural" viewBox="0 0 340 120" preserveAspectRatio="none" aria-hidden="true">' +
      '<g stroke="#FFC700" stroke-width="1" fill="none" opacity=".35">' +
      '<path d="M-10 84 C 60 60 90 96 150 74 S 260 40 350 62"/>' +
      '<path d="M-10 40 C 70 22 130 54 200 30 S 300 10 350 26"/></g>' +
      '<g fill="#FFC700"><circle cx="150" cy="74" r="2.5"/><circle cx="200" cy="30" r="2.5"/><circle cx="90" cy="66" r="2"/><circle cx="282" cy="49" r="2"/></g></svg>';
  }

  /* ---------------- Data quiz ---------------- */
  var QUIZ = [
    { tag: "GRAMMAR · SIMPLE PAST · SOAL 1/2",
      q: "Yesterday, Maya ___ to the library.",
      opts: ["walks", "walked", "walking", "walk"], correct: 1,
      why: "\u2018Yesterday\u2019 adalah sinyal waktu lampau. \u2018Walk\u2019 termasuk verba regular, jadi cukup tambah \u2011ed \u2192 walked.",
      hints: ["Cari kata sinyal waktu di awal kalimat: \u2018Yesterday\u2019 = sudah lewat.",
              "Verba regular membentuk lampau dengan akhiran \u2011ed."] },
    { tag: "GRAMMAR · SIMPLE PAST · SOAL 2/2",
      q: "Last night, they ___ dinner together.",
      opts: ["eat", "eats", "ate", "eaten"], correct: 2,
      why: "\u2018Last night\u2019 menandai simple past. \u2018Eat\u2019 verba irregular: eat \u2192 ate \u2192 eaten. Bentuk lampau aktifnya ate.",
      hints: ["Cari sinyal waktu: \u2018Last night\u2019 berarti kejadian sudah selesai.",
              "\u2018Eat\u2019 itu irregular \u2014 bentuk lampaunya BUKAN +ed. eat \u2192 a\u2026?"] }
  ];

  var state = { qIndex: 0, attempts: 0, correct: 0, hintsUsed: 0, listened: false };

  /* ---------------- Template layar ---------------- */
  var viewport = document.getElementById("viewport");

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* --- 1. HOME --- */
  var homeScr = el('<section class="screen" id="scr-home" aria-label="Home">' +
    '<header class="apph">' +
      '<svg width="30" height="30" viewBox="0 0 32 32" aria-label="Logo FIEZEL"><rect width="32" height="32" rx="10" fill="#FFC700"/><g transform="translate(16,17.5)" fill="#241A11"><ellipse cx="0" cy="3.4" rx="5.4" ry="4.4"/><circle cx="-5.6" cy="-3.4" r="2.3"/><circle cx="0" cy="-5.2" r="2.3"/><circle cx="5.6" cy="-3.4" r="2.3"/></g></svg>' +
      '<div class="grow"><div class="label" style="font-weight:700;letter-spacing:.06em">FIEZEL</div></div>' +
      '<span class="chip">A2 · Level</span>' +
      '<span class="chip chip-line">'+icon("flame",14)+' <span class="num">4</span></span>' +
    '</header>' +
    '<div class="screen-scroll">' +
      '<h1 class="display" tabindex="-1" style="margin:6px 2px 4px">Sore, Rara!</h1>' +
      '<p class="body muted" style="margin:0 2px 14px">Ritme hari ini tinggal satu lesson lagi.</p>' +

      '<div class="core-card rise" style="margin-bottom:14px">' + neural() +
        '<div style="position:relative">' +
        '<p class="eyebrow" style="color:#FFC700">BrainCore · Adaptif</p>' +
        '<p class="body" style="margin:8px 0 10px;font-weight:600">PAW membaca pola latihanmu: verba lampau masih naik-turun.</p>' +
        '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--core-soft);border:1px solid var(--core-line);border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;color:#FFC700">'+icon("spark",14)+' Fokus hari ini: Simple Past</span>' +
        '</div></div>' +

      '<div class="card continue-card rise" style="animation-delay:60ms;margin-bottom:14px">' +
        '<p class="eyebrow">Lanjut belajar</p>' +
        '<h2 class="h2" style="margin-top:-2px">Grammar · Simple Past</h2>' +
        '<div class="lesson-meta">' +
          '<span class="chip chip-line">2 soal</span><span class="chip chip-line">±4 menit</span><span class="chip">+30 XP</span>' +
        '</div>' +
        '<button class="btn btn-ink" id="btnStart" type="button">Mulai lesson '+icon("arrow",18)+'</button>' +
      '</div>' +

      '<div class="stat-row rise" style="animation-delay:120ms">' +
        '<div class="stat"><div class="num">4</div><div class="micro">Runtun hari</div></div>' +
        '<div class="stat"><div class="num">82%</div><div class="micro">Akurasi</div></div>' +
        '<div class="stat"><div class="num">320</div><div class="micro">XP minggu ini</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="coach" id="coach" role="status">Gue udah siapin rencana hari ini — tinggal jalan.</div>' +
    '<div class="paw-dock"><div class="paw-anim">'+mascot("wave","Maskot PAW melambai")+'</div></div>' +
    '<nav class="tabbar" aria-label="Navigasi utama">' +
      '<button class="tab" aria-current="page" type="button">'+icon("home")+'Home</button>' +
      '<button class="tab" type="button">'+icon("az")+'Vocab</button>' +
      '<button class="tab" type="button">'+icon("chat")+'Grammar</button>' +
      '<button class="tab" type="button">'+icon("book")+'Reading</button>' +
      '<button class="tab" type="button">'+icon("map")+'Peta</button>' +
    '</nav>' +
  '</section>');

  /* --- 2. LESSON SELECT --- */
  var lessonsScr = el('<section class="screen" id="scr-lessons" aria-label="Pilih lesson">' +
    '<header class="apph">' +
      '<button class="btn-icon" data-back="home" aria-label="Kembali ke Home" type="button">'+icon("back")+'</button>' +
      '<div class="grow"><h1 class="h1" tabindex="-1">Grammar</h1></div>' +
      '<span class="chip">A2</span>' +
    '</header>' +
    '<div class="screen-scroll">' +
      '<p class="eyebrow" style="margin:4px 2px 12px">Pilih lesson</p>' +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
        '<button class="lesson-card rise" id="lesson1" type="button">' +
          '<span class="lesson-ico sun">'+icon("chat",22)+'</span>' +
          '<span style="flex:1;min-width:0">' +
            '<span class="badge-paw">'+icon("spark",12)+' Direkomendasikan PAW</span>' +
            '<span class="h2" style="display:block;margin-top:5px">Simple Past — Regular</span>' +
            '<span class="micro muted" style="display:block;margin-top:2px">2 soal + 1 listening · ±4 menit</span>' +
          '</span>' + icon("arrow",18) +
        '</button>' +
        '<div class="lesson-card locked rise" style="animation-delay:60ms" role="listitem" aria-disabled="true">' +
          '<span class="lesson-ico lock">'+icon("lock",22)+'</span>' +
          '<span style="flex:1;min-width:0">' +
            '<span class="h2" style="display:block;color:var(--muted)">Simple Past — Irregular</span>' +
            '<span class="micro" style="display:block;margin-top:2px;color:var(--muted)">Terkunci · selesaikan lesson pertama</span>' +
          '</span>' +
        '</div>' +
        '<div class="lesson-card locked rise" style="animation-delay:120ms" role="listitem" aria-disabled="true">' +
          '<span class="lesson-ico lock">'+icon("lock",22)+'</span>' +
          '<span style="flex:1;min-width:0">' +
            '<span class="h2" style="display:block;color:var(--muted)">Past Continuous</span>' +
            '<span class="micro" style="display:block;margin-top:2px;color:var(--muted)">Terkunci · butuh akurasi ≥80%</span>' +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card card-soft rise" style="animation-delay:180ms;display:flex;gap:12px;align-items:center;margin-top:16px">' +
        '<div class="paw-inline">'+mascot("curious","Maskot PAW penasaran")+'</div>' +
        '<p class="label" style="color:var(--muted);line-height:1.4">Yang pertama pas buat kamu — kemarin verba regular sempat kepeleset dikit.</p>' +
      '</div>' +
    '</div>' +
  '</section>');

  /* --- 3/4. QUIZ --- */
  var quizScr = el('<section class="screen" id="scr-quiz" aria-label="Quiz grammar">' +
    '<header class="apph">' +
      '<button class="btn-icon" data-back="lessons" aria-label="Kembali ke daftar lesson" type="button">'+icon("back")+'</button>' +
      '<div class="pbar" role="progressbar" aria-label="Progres quiz" aria-valuemin="0" aria-valuemax="2" aria-valuenow="0"><i id="quizBar"></i></div>' +
      '<span class="chip chip-line num" id="quizStep">1/2</span>' +
    '</header>' +
    '<div class="screen-scroll" id="quizBody"></div>' +
  '</section>');

  /* --- 5. LISTENING --- */
  var listenScr = el('<section class="screen" id="scr-listen" aria-label="Latihan listening">' +
    '<header class="apph">' +
      '<button class="btn-icon" data-back="lessons" aria-label="Kembali ke daftar lesson" type="button">'+icon("back")+'</button>' +
      '<div class="grow"><h1 class="h1" tabindex="-1">Listening</h1></div>' +
      '<span class="chip">A2 · Baru</span>' +
    '</header>' +
    '<div class="screen-scroll">' +
      '<p class="eyebrow" style="margin:4px 2px 8px">Langkah 3 dari 3</p>' +
      '<p class="body muted" style="margin:0 2px 14px">Dengarkan kalimatnya, lalu lanjut ke ringkasan. Belum nangkep? Ulang — itu bagian dari latihan.</p>' +
      '<div class="player rise" id="player">' +
        '<div class="play-row">' +
          '<button class="play-btn" id="btnPlay" aria-label="Putar audio" aria-pressed="false" type="button">'+icon("play",26)+'</button>' +
          '<div style="flex:1;display:flex;flex-direction:column;gap:8px">' +
            '<div class="wave" id="wave" aria-hidden="true"></div>' +
            '<div class="ptrack"><i id="ptFill"></i></div>' +
            '<div class="ptime"><span id="tCur">0:00</span><span id="tDur">0:04</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn btn-sun" id="btnReplay" type="button" style="min-height:48px">'+icon("volume",18)+' Dengarkan ulang</button>' +
          '<button class="btn btn-ghost" type="button" style="min-height:48px;width:auto;padding:0 16px" aria-label="Kecepatan putar 1x">1.0×</button>' +
        '</div>' +
        '<div class="transcript" id="transcript">' +
          '<p class="eyebrow" style="margin-bottom:6px">Transkrip</p>' +
          '<p class="body">\u201CYesterday, Maya <strong>walked</strong> to the library and <strong>ate</strong> dinner with her friends.\u201D</p>' +
        '</div>' +
      '</div>' +
      '<div class="card card-soft rise" style="animation-delay:80ms;display:flex;gap:12px;align-items:center;margin:14px 0 16px">' +
        '<div class="paw-inline">'+mascot("listening","Maskot PAW mendengarkan dengan headphone")+'</div>' +
        '<p class="label" style="color:var(--muted);line-height:1.4">Dua kata dari quiz tadi muncul lagi di sini. Kedengaran?</p>' +
      '</div>' +
      '<button class="btn" id="btnFinish" disabled type="button">'+icon("lock",18)+' Putar audio dulu untuk lanjut</button>' +
    '</div>' +
  '</section>');

  /* --- 6. COMPLETION --- */
  var doneScr = el('<section class="screen" id="scr-done" aria-label="Lesson selesai">' +
    '<div class="confetti" id="confetti" aria-hidden="true"></div>' +
    '<div class="screen-scroll">' +
      '<div class="done-hero">' +
        '<div class="paw-big">'+mascot("celebrating","Maskot PAW merayakan dengan mata hati")+'</div>' +
        '<h1 class="display" tabindex="-1">Lesson selesai!</h1>' +
        '<p class="body muted">Simple Past — Regular · Grammar A2</p>' +
        '<div class="ring" role="img" aria-label="Progres lesson 100 persen">' +
          '<svg width="150" height="150" viewBox="0 0 150 150">' +
            '<defs><linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDE59"/><stop offset="1" stop-color="#FFA500"/></linearGradient></defs>' +
            '<circle cx="75" cy="75" r="64" fill="none" stroke="var(--line-soft)" stroke-width="12"/>' +
            '<circle class="ring-fg" id="ringFg" cx="75" cy="75" r="64" fill="none" stroke-width="12" stroke-dasharray="402" stroke-dashoffset="402"/>' +
          '</svg>' +
          '<div class="ring-center"><span class="num" style="font-size:30px" id="ringPct">0%</span><span class="micro muted">selesai</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="stat-row" style="margin:8px 0 14px">' +
        '<div class="stat"><div class="num" style="color:var(--sun-deep)">+30</div><div class="micro">XP</div></div>' +
        '<div class="stat"><div class="num" id="statAcc">—</div><div class="micro">Akurasi</div></div>' +
        '<div class="stat"><div class="num">5</div><div class="micro">Runtun hari</div></div>' +
      '</div>' +
      '<div class="core-card" style="margin-bottom:16px">' + neural() +
        '<div style="position:relative">' +
        '<p class="eyebrow" style="color:#FFC700">Catatan PAW</p>' +
        '<p class="body" style="margin-top:8px;font-weight:600" id="pawNote">Kamu kuat di verba regular. Besok kita seriusin yang irregular, ya.</p>' +
        '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button class="btn btn-sun" id="btnHome" type="button">Kembali ke Home</button>' +
        '<button class="btn btn-ghost" id="btnRestart" type="button">'+icon("x",16)+' Ulangi alur (reset)</button>' +
      '</div>' +
    '</div>' +
  '</section>');

  [homeScr, lessonsScr, quizScr, listenScr, doneScr].forEach(function (s) { viewport.appendChild(s); });

  /* ---------------- Navigasi + transisi 240ms ---------------- */
  var screens = { home: homeScr, lessons: lessonsScr, quiz: quizScr, listen: listenScr, done: doneScr };
  var current = null;

  function go(name, opts) {
    opts = opts || {};
    var next = screens[name];
    if (!next || next === current) return;
    var prev = current;
    current = next;

    if (prev) {
      prev.classList.remove("active", "entering", "back");
      prev.classList.add("leaving");
      var pRef = prev;
      setTimeout(function () { pRef.classList.remove("leaving"); }, RM ? 20 : 260);
    }
    next.classList.add("active", "entering");
    next.classList.toggle("back", !!opts.back);
    setTimeout(function () { next.classList.remove("entering", "back"); }, RM ? 20 : 260);

    /* fokus ke judul layar (aksesibilitas keyboard) */
    var h = next.querySelector('[tabindex="-1"]');
    if (h && !opts.noFocus) setTimeout(function () { h.focus({ preventScroll: true }); }, RM ? 30 : 200);
    var sc = next.querySelector(".screen-scroll");
    if (sc) sc.scrollTop = 0;

    if (name === "quiz") renderQuestion();
    if (name === "listen") initListening();
    if (name === "done") initDone();
  }

  viewport.addEventListener("click", function (e) {
    var b = e.target.closest("[data-back]");
    if (b) go(b.getAttribute("data-back"), { back: true });
  });

  /* ---------------- Quiz ---------------- */
  var quizBody = quizScr.querySelector("#quizBody");
  var quizBar = quizScr.querySelector("#quizBar");
  var quizStep = quizScr.querySelector("#quizStep");

  function renderQuestion() {
    var i = state.qIndex, Q = QUIZ[i];
    if (!Q) return;
    quizBar.style.width = (i / QUIZ.length) * 100 + "%";
    quizBar.parentElement.setAttribute("aria-valuenow", String(i));
    quizStep.textContent = (i + 1) + "/2";

    quizBody.innerHTML =
      '<div class="qcard rise">' +
        '<p class="eyebrow" style="margin:4px 2px 8px">' + Q.tag + '</p>' +
        '<h1 class="h1" tabindex="-1" style="margin:0 2px">Lengkapi kalimatnya</h1>' +
        '<div class="card" style="margin-top:12px"><p class="body" style="font-size:17px;font-weight:600">' +
          Q.q.replace("___", '<span style="display:inline-block;min-width:74px;border-bottom:2.5px solid var(--sun-deep);text-align:center;color:var(--sun-deep)">___</span>') +
        '</p></div>' +
        '<div class="opts" role="group" aria-label="Pilihan jawaban">' +
          Q.opts.map(function (o, k) {
            return '<button class="opt" data-k="' + k + '" type="button"><span class="key">' +
              "ABCD"[k] + '</span>' + o + '</button>';
          }).join("") +
        '</div>' +
        '<div class="feedback" id="fb" aria-live="polite"></div>' +
      '</div>';

    var h = quizBody.querySelector('[tabindex="-1"]');
    if (h) h.focus({ preventScroll: true });

    quizBody.querySelectorAll(".opt").forEach(function (btn) {
      btn.addEventListener("click", function () { answer(parseInt(btn.dataset.k, 10), btn); });
    });
  }

  function answer(k, btn) {
    var Q = QUIZ[state.qIndex];
    var fb = quizBody.querySelector("#fb");
    if (btn.disabled || quizBody.dataset.solved === "1") return;
    state.attempts++;

    if (k === Q.correct) {
      quizBody.dataset.solved = "1";
      state.correct++;
      quizBody.querySelectorAll(".opt").forEach(function (b) { b.disabled = true; });
      btn.classList.add("correct");
      quizBar.style.width = ((state.qIndex + 1) / QUIZ.length) * 100 + "%";
      quizBar.parentElement.setAttribute("aria-valuenow", String(state.qIndex + 1));

      var last = state.qIndex === QUIZ.length - 1;
      fb.innerHTML =
        '<div class="verdict good rise">' + icon("check", 20) +
          '<span>Benar! +10 XP</span><span class="paw-slot">' + mascot("happy", "PAW senang") + '</span></div>' +
        '<div class="why-card rise" style="animation-delay:70ms">' +
          '<p class="eyebrow" style="color:var(--info);margin-bottom:6px">Kenapa benar?</p>' +
          '<p class="body">' + Q.why + '</p></div>' +
        '<button class="btn btn-ink rise" style="animation-delay:130ms" id="btnNext" type="button">' +
          (last ? "Lanjut ke Listening " : "Soal berikutnya ") + icon("arrow", 18) + '</button>';
      fb.querySelector("#btnNext").addEventListener("click", function () {
        if (last) { go("listen"); }
        else { state.qIndex++; delete quizBody.dataset.solved; renderQuestion(); }
      });
      var nb = fb.querySelector("#btnNext");
      nb.focus({ preventScroll: true });
      nb.scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
    } else {
      btn.disabled = true;
      btn.classList.add("wrong", "shake");
      var fbFirst = !fb.querySelector(".verdict");
      if (fbFirst) {
        fb.innerHTML =
          '<div class="verdict bad rise">' + icon("x", 20) +
            '<span style="font-size:14px;line-height:1.3">Belum tepat — dan itu nggak apa-apa. Coba sekali lagi!</span>' +
            '<span class="paw-slot" id="pawWrong">' + mascot("encouraging", "PAW menyemangati") + '</span></div>' +
          '<div id="hintZone"></div>' +
          '<button class="btn btn-ghost rise" style="animation-delay:60ms" id="btnHint" type="button">' +
            icon("bulb", 18) + ' Lihat petunjuk</button>';
        fb.querySelector("#btnHint").addEventListener("click", showHint);
      }
      var live = fb.querySelector(".verdict span");
      if (live) live.textContent = "Belum tepat — dan itu nggak apa-apa. Coba sekali lagi!";
    }
  }

  function showHint() {
    var Q = QUIZ[state.qIndex];
    var fb = quizBody.querySelector("#fb");
    var zone = fb.querySelector("#hintZone");
    var btn = fb.querySelector("#btnHint");
    var n = zone.children.length;
    if (n < Q.hints.length) {
      state.hintsUsed++;
      var h = document.createElement("div");
      h.className = "hint-card rise";
      h.style.marginTop = "10px";
      h.innerHTML = icon("bulb", 18) + '<p class="label" style="color:var(--info);line-height:1.4"><strong>Petunjuk ' + (n + 1) + ':</strong> ' + Q.hints[n] + '</p>';
      zone.appendChild(h);
      var slot = fb.querySelector("#pawWrong");
      if (slot) slot.innerHTML = mascot("hinting", "PAW memberi petunjuk");
      n++;
      if (n >= Q.hints.length) {
        btn.style.display = "none";
        h.setAttribute("tabindex", "-1");
        h.focus({ preventScroll: true }); /* fokus tak hilang saat tombol hint disembunyikan */
      }
      else { btn.innerHTML = icon("bulb", 18) + " Petunjuk berikutnya (" + (n + 1) + "/" + Q.hints.length + ")"; }
    }
  }

  /* ---------------- Listening ---------------- */
  var AUDIO_S = 4;
  var lt = { playing: false, t: 0, timer: null };
  var btnPlay = listenScr.querySelector("#btnPlay");
  var btnReplay = listenScr.querySelector("#btnReplay");
  var btnFinish = listenScr.querySelector("#btnFinish");
  var player = listenScr.querySelector("#player");
  var wave = listenScr.querySelector("#wave");
  var ptFill = listenScr.querySelector("#ptFill");
  var tCur = listenScr.querySelector("#tCur");
  var transcript = listenScr.querySelector("#transcript");
  var NBARS = 22;
  wave.innerHTML = new Array(NBARS + 1).join("<i></i>");
  var bars = wave.querySelectorAll("i");
  bars.forEach(function (b, i) {
    b.style.height = (12 + Math.abs(Math.sin(i * 1.7)) * 26) + "px";
  });

  function initListening() { /* state dipertahankan; tak ada yang perlu di-reset saat masuk */ }

  function renderPlayer() {
    var frac = Math.min(lt.t / AUDIO_S, 1);
    ptFill.style.width = frac * 100 + "%";
    tCur.textContent = "0:0" + Math.min(Math.floor(lt.t), 9);
    bars.forEach(function (b, i) { b.classList.toggle("on", i / NBARS <= frac); });
    player.classList.toggle("playing", lt.playing && !RM);
    btnPlay.innerHTML = icon(lt.playing ? "pause" : "play", 26);
    btnPlay.setAttribute("aria-label", lt.playing ? "Jeda audio" : "Putar audio");
    btnPlay.setAttribute("aria-pressed", String(lt.playing));
  }

  function tick() {
    lt.t += 0.1;
    if (lt.t >= AUDIO_S) {
      lt.t = AUDIO_S; stopAudio();
      state.listened = true;
      transcript.classList.add("show");
      btnFinish.disabled = false;
      btnFinish.classList.add("btn-sun");
      btnFinish.innerHTML = "Selesaikan lesson " + icon("arrow", 18);
    }
    renderPlayer();
  }
  function stopAudio() { lt.playing = false; clearInterval(lt.timer); lt.timer = null; renderPlayer(); }
  function startAudio() {
    if (lt.t >= AUDIO_S) lt.t = 0;
    lt.playing = true;
    clearInterval(lt.timer);
    lt.timer = setInterval(tick, 100);
    renderPlayer();
  }
  btnPlay.addEventListener("click", function () { lt.playing ? stopAudio() : startAudio(); });
  btnReplay.addEventListener("click", function () { lt.t = 0; startAudio(); });
  btnFinish.addEventListener("click", function () { if (!btnFinish.disabled) go("done"); });

  /* ---------------- Completion ---------------- */
  function initDone() {
    var acc = state.attempts ? Math.round((state.correct / state.attempts) * 100) : 100;
    doneScr.querySelector("#statAcc").textContent = acc + "%";
    doneScr.querySelector("#pawNote").textContent = state.hintsUsed
      ? "Petunjuk dipakai " + state.hintsUsed + "× di verba irregular — wajar banget. Besok kita seriusin eat/ate lagi, ya."
      : "Mulus tanpa petunjuk! Besok naik level ke verba irregular, ya.";

    var ring = doneScr.querySelector("#ringFg");
    var pct = doneScr.querySelector("#ringPct");
    ring.style.strokeDashoffset = "402";
    pct.textContent = "0%";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ring.style.strokeDashoffset = "0";
        if (RM) { pct.textContent = "100%"; }
        else {
          var s = Date.now();
          (function count() {
            var f = Math.min((Date.now() - s) / 900, 1);
            pct.textContent = Math.round(f * 100) + "%";
            if (f < 1) requestAnimationFrame(count);
          })();
        }
      });
    });

    /* confetti statis-ringan (dinonaktifkan oleh prefers-reduced-motion via CSS) */
    var conf = doneScr.querySelector("#confetti");
    conf.innerHTML = "";
    var colors = ["#FFC700", "#FFA500", "#2E8B69", "#B8432D", "#8C2233", "#FFDE59"];
    for (var i = 0; i < 26; i++) {
      var f = document.createElement("i");
      f.style.left = (Math.random() * 100) + "%";
      f.style.top = "-20px";
      f.style.width = (5 + Math.random() * 6) + "px";
      f.style.height = (8 + Math.random() * 8) + "px";
      f.style.background = colors[i % colors.length];
      f.style.animationDelay = (Math.random() * 500) + "ms";
      conf.appendChild(f);
    }
    doneScr.classList.remove("celebrate");
    void conf.offsetWidth;
    doneScr.classList.add("celebrate");
  }

  doneScr.querySelector("#btnHome").addEventListener("click", function () { resetFlow(true); });
  doneScr.querySelector("#btnRestart").addEventListener("click", function () { resetFlow(true); });

  /* ---------------- Reset flow ---------------- */
  function resetFlow(navigate) {
    state.qIndex = 0; state.attempts = 0; state.correct = 0; state.hintsUsed = 0; state.listened = false;
    delete quizBody.dataset.solved;
    stopAudio(); lt.t = 0; renderPlayer();
    transcript.classList.remove("show");
    btnFinish.disabled = true;
    btnFinish.classList.remove("btn-sun");
    btnFinish.innerHTML = icon("lock", 18) + " Putar audio dulu untuk lanjut";
    quizBar.style.width = "0%";
    var coach = document.getElementById("coach");
    coach.classList.remove("hide");
    clearTimeout(coach._t);
    coach._t = setTimeout(function () { coach.classList.add("hide"); }, 4500);
    if (navigate) go("home", { back: true });
  }

  document.getElementById("globalReset").addEventListener("click", function () { resetFlow(true); });
  homeScr.querySelector("#btnStart").addEventListener("click", function () { go("lessons"); });
  lessonsScr.querySelector("#lesson1").addEventListener("click", function () { go("quiz"); });

  /* ---------------- Boot ---------------- */
  renderPlayer();
  go("home", { noFocus: true });
  var coach = document.getElementById("coach");
  coach._t = setTimeout(function () { coach.classList.add("hide"); }, 4500);
  window.__fz = { go: go, state: state }; /* hook QA */
})();
