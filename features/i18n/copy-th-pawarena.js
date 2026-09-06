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
    'pawarena.story-saved': 'บันทึกเรื่องราวแล้ว',
    'pawarena.you': 'คุณ',
    'pawarena.points': 'คะแนน',
    'pawarena.next': 'ต่อไป',
    'pawarena.play-again': 'เล่นอีกครั้ง',
    'pawarena.to-lobby': 'กลับไปหน้ารายการเกม',
    'pawarena.thinking': '{name} กำลังคิดอยู่…',
    'pawarena.bank-missing': 'คลังโจทย์ยังโหลดไม่เสร็จ',
    'pawarena.dialogue': 'บทสนทนาสั้น',
    'pawarena.passage': 'ข้อความสั้น',
    'pawarena.story.so-far': 'เรื่องราวจนถึงตอนนี้',
    'pawarena.story.empty': 'ยังไม่มีประโยค ตาแรกเป็นของคุณ',
    'pawarena.story.challenge': 'ผ่านโจทย์เพื่อปลดล็อกตาของคุณ',
    'pawarena.story.pick-sentence': 'เลือกประโยคต่อหนึ่งประโยค',
    'pawarena.signal.your-word': 'คำลับของคุณ',
    'pawarena.signal.pick-clues': 'เลือกการ์ดคำใบ้ 2–3 ใบเพื่อนำทาง {name}',
    'pawarena.signal.send': 'ส่งคำใบ้',
    'pawarena.signal.bot-clues': 'คำใบ้จาก {name}',
    'pawarena.signal.guess-prompt': 'ทายคำลับให้ถูก',
    'pawarena.signal.bot-got-it': '{name} ทายถูก: {word}',
    'pawarena.signal.bot-missed': '{name} ทายผิด — คำคือ {word}',
    'pawarena.wager.prompt': 'วางเดิมพันก่อนตอบ',
    'pawarena.wager.low': 'น้อย',
    'pawarena.wager.mid': 'ปานกลาง',
    'pawarena.wager.high': 'มาก',
    'pawarena.stakes.you-line': 'คุณ: เดิมพัน {w} → {pts} คะแนน',
    'pawarena.stakes.bot-line': '{name}: เดิมพัน {w} → {pts} คะแนน',
    'pawarena.challenge-friend': 'ท้าเพื่อน',
    'pawarena.have-code': 'มีโค้ดจากเพื่อนไหม?',
    'pawarena.paste-code': 'วางโค้ด / ลิงก์ ?arena=… ตรงนี้',
    'pawarena.play-code': 'เล่นโจทย์ชุดเดียวกัน',
    'pawarena.code-invalid': 'ยังอ่านโค้ดไม่ออก — ตรวจว่าคัดลอกมาครบไหม',
    'pawarena.friend-mode-note': 'พวกคุณทำโจทย์ชุดเดียวกัน แล้วเทียบคะแนนกันผ่านโค้ด',
    'pawarena.share-code': 'แชร์โค้ดท้าประลอง',
    'pawarena.reply-code': 'ส่งคะแนนกลับ',
    'pawarena.copy': 'คัดลอก',
    'pawarena.copied': 'คัดลอกแล้ว',
    'pawarena.your-score': 'คะแนนของคุณ: {n} คะแนน',
    'pawarena.vs-friend-win': 'คุณนำ {name} อยู่! ({mine} ต่อ {theirs})',
    'pawarena.vs-friend-lose': '{name} นำอยู่ ({theirs} ต่อ {mine}) — ท้ากลับเลย!',
    'pawarena.vs-friend-tie': 'เสมอกับ {name} ({mine})',
    'pawarena.stories-title': 'คลังเรื่องราว',
    'pawarena.open-story': 'เปิด',

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
