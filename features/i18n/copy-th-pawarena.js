/**
 * FIEZEL · features/i18n/copy-th-pawarena.js — COPY-MAP THAI, naskah PAW ARENA (m025-276).
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum rilis (kanon copy-th-* FIEZEL).
 *
 * Pasangan copy-id-pawarena.js: kunci & {placeholder} SAMA PERSIS. "PAW ARENA" adalah nama
 * merek yang dikunci owner — TIDAK diterjemahkan (sama di id & th, tugas §3); hanya kalimat
 * di sekelilingnya yang ber-aksara Thai. Istilah: bot = บอต; ronde = รอบ; petunjuk = คำใบ้.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    // --- cangkang arena ---
    'pawarena.title': 'PAW ARENA',
    'pawarena.subtitle': 'สนามเล่นของ FIEZEL — เรียนไปแข่งไป',
    'pawarena.pick-game': 'เลือกเกม',
    'pawarena.solo-vs-bot': 'เล่นคนเดียวสู้กับบอต',
    'pawarena.with-friend': 'เล่นสองคนผ่านโค้ด',
    'pawarena.friend': 'เพื่อน',
    'pawarena.back': 'กลับ',
    'pawarena.help': 'คำแนะนำ',
    'pawarena.close': 'ปิด',
    'pawarena.start': 'เริ่ม',
    'pawarena.skip': 'ข้าม',
    'pawarena.round': 'รอบที่ {n}',
    'pawarena.bot.vs': 'คู่แข่ง: {name}',
    'pawarena.turn.you': 'ตาของคุณ',
    'pawarena.turn.bot': 'ตาของ {name}',
    'pawarena.result.win': 'คุณชนะ!',
    'pawarena.result.lose': 'คราวนี้ {name} ชนะ — ท้ากลับเลย!',
    'pawarena.result.tie': 'เสมอ!',
    'pawarena.save-artifact': 'บันทึกเรื่องราว',
    'pawarena.story-done': 'เรื่องราวของพวกคุณจบแล้ว — นี่คือผลงานของมัน',

    // --- STORY CHAIN ---
    'pawarena.game.story.name': 'ห่วงโซ่เรื่องราว',
    'pawarena.game.story.tag': 'สร้างเรื่องราวสลับกันทีละตา',
    'pawarena.game.story.rule-goal': 'ช่วยกันสร้างเรื่องราวหนึ่งเรื่อง — แต่ละประโยคต้อง "ซื้อ" ด้วยการตอบโจทย์หนึ่งข้อ',
    'pawarena.game.story.rule-step1': 'ตอบโจทย์ภาษาอังกฤษหนึ่งข้อเพื่อปลดล็อกตาของคุณ',
    'pawarena.game.story.rule-step2': 'เลือกประโยคต่อหนึ่งประโยคจากการ์ดที่ระบบเสนอให้',
    'pawarena.game.story.rule-step3': 'เรื่องราวจะยาวขึ้นจนจบรอบ — แล้วบันทึกไว้เป็นผลงาน',

    // --- SINYAL ---
    'pawarena.game.signal.name': 'สัญญาณ',
    'pawarena.game.signal.tag': 'ให้คำใบ้ แล้วทายคำ',
    'pawarena.game.signal.rule-goal': 'นำทางคู่แข่งไปหาคำลับด้วยคำใบ้ภาษาอังกฤษเท่านั้น — ห้ามพูดคำนั้นออกมา',
    'pawarena.game.signal.rule-step1': 'คุณได้คำลับหนึ่งคำ เลือกการ์ดคำใบ้ 2–3 ใบที่ระบบเสนอให้',
    'pawarena.game.signal.rule-step2': 'คู่แข่งอ่านคำใบ้ของคุณแล้วทายคำจากสี่ตัวเลือก',
    'pawarena.game.signal.rule-step3': 'สลับกันเป็นผู้ให้คำใบ้และผู้ทายจนกว่าจะหมดรอบ',

    // --- TARUHAN ---
    'pawarena.game.stakes.name': 'เดิมพัน',
    'pawarena.game.stakes.tag': 'เดิมพันกับความมั่นใจของคุณ',
    'pawarena.game.stakes.rule-goal': 'ชนะด้วยการตอบถูก — แต่จะชนะมากแค่ไหน คุณเป็นคนเดิมพันเอง',
    'pawarena.game.stakes.rule-step1': 'ก่อนตอบ วางเดิมพัน: น้อย ปานกลาง หรือมาก',
    'pawarena.game.stakes.rule-step2': 'ตอบถูก = ได้พอต; ตอบผิด = พอตหาย',
    'pawarena.game.stakes.rule-step3': 'คู่แข่งก็ร่วมเดิมพันด้วย — บางทีก็บ้าบิ่นจนหมดตัว เก็บคะแนนให้ได้มากที่สุด'
  });
}());
