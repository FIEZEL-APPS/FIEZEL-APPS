/**
 * FIEZEL · features/i18n/naskah-th-brain.js — NASKAH THAI modul brain (W3-BRAIN-TH).
 *
 * ═══ DRAFT AI — WAJIB REVIEW PENUTUR ASLI THAI SEBELUM RILIS ═══
 *
 * KENAPA BERKAS INI ADA (AI-08 F01, desain W1-FEAT-A / W2-FEAT-A):
 * Modul brain (listening, speaking, step-tutor, tutor-brain, olm, srl-coach) MURNI —
 * tabel NASKAH_ID/EXPLANATIONS beku di dalam modul, dan modul TIDAK membaca FiezelI18n.
 * Terjemahan Thai karenanya tidak boleh masuk ke modul: ia dititipkan DARI LUAR oleh
 * app.js lewat parameter injeksi opsional yang dipasang W2-FEAT-A (explain(x, naskah),
 * summarize(state, naskah), opts.naskah, dst.). Berkas ini adalah tabel titipannya:
 * satu peta per modul, kunci PERSIS sama dengan kunci tabel internal modulnya —
 * listening/speaking per KODE rationale, step/tutor/olm/srl per kunci 'brain-*.…'.
 *
 * ATURAN NILAI (TH-STYLE):
 * 1. Placeholder {nama} TIDAK diterjemahkan — {n}, {obj}, {stem}, {concept}, dst. persis.
 * 2. Metabahasa yang di kanon id memang Inggris (mastery, replay, coverage, latency,
 *    recognizer, scaffold, cue, kappa, BKT, lesson, skill) TETAP Inggris.
 * 3. Register hangat-kasual sopan: sapaan คุณ, tanpa ครับ/ค่ะ, นะ hemat, tanpa emoji,
 *    angka Arab, tanpa jargon mesin (เซิร์ฟเวอร์/โควตา/เอนด์พอยต์ dilarang).
 * 4. Fallback per-kunci ada DI MODUL (lineFor): kunci yang hilang di sini jatuh ke
 *    NASKAH_ID — kesalahan di berkas ini tidak pernah mematikan sesi belajar.
 *
 * Pemakai: app.js (helper brainNaskahTh) saat FiezelI18n.getLocale()==='th'.
 * Locale id TIDAK menyentuh berkas ini — jalur lama byte-identik.
 */
(function () {
  'use strict';
  var g = (typeof self !== 'undefined') ? self
    : (typeof globalThis !== 'undefined') ? globalThis : this;

  var NASKAH = {
    // ---------- FiezelListeningAdaptive.explain(x, naskah) — kunci = kode rationale ----------
    listening: {
      brain3_listening_default: 'ยังไม่มีหลักฐานการฟังที่อ่านได้ ความยากจึงถูกตั้งไว้ที่จุดกึ่งกลางที่ปลอดภัย: ความเร็วปกติ ฟังซ้ำได้ 2 ครั้ง คลิปยาวปานกลาง',
      brain3_listening_baseline_low: 'Mastery ยังต่ำ จุดเริ่มต้นจึงใช้ชุดที่ง่ายที่สุด: ช้า ฟังซ้ำได้เต็มที่ คลิปสั้น',
      brain3_listening_baseline_mid: 'Mastery อยู่ระดับกลาง จุดเริ่มต้นจึงอยู่ตรงกลางบันไดความยาก',
      brain3_listening_baseline_high: 'Mastery สูงแล้ว จุดเริ่มต้นจึงท้าทายเลย: เร็ว ฟังซ้ำได้จำกัด คลิปยาว',
      brain3_listening_insufficient_evidence: 'หลักฐานในช่วงหลังสุดยังบางเกินกว่าจะเชื่อถือได้ จึงคงความยากไว้ก่อน — นโยบายที่แกว่งเพราะคำตอบเดียวอันตรายกว่านโยบายที่นิ่ง',
      brain3_listening_step_up_rate: 'ความแม่นยำสูงกว่าเป้าหมายมาก จึงเพิ่มความเร็วเสียงขึ้นหนึ่งขั้น — ปรับแค่ความเร็วอย่างเดียว เพื่อว่าถ้าผลเปลี่ยน เราจะรู้ว่าปุ่มไหนคือสาเหตุ',
      brain3_listening_step_up_clip: 'ความแม่นยำสูงกว่าเป้าหมายมากและความเร็วถึงขั้นสูงสุดแล้ว จึงถึงคราวเพิ่มความยาวคลิปขึ้นหนึ่งระดับ',
      brain3_listening_step_up_replay: 'ความแม่นยำสูงกว่าเป้าหมายมากทั้งที่ความเร็วและคลิปสูงสุดแล้ว จึงลดตาข่ายนิรภัยสุดท้ายลง: สิทธิ์ฟังซ้ำลดลงหนึ่งครั้ง',
      brain3_listening_step_down_replay: 'ความแม่นยำต่ำกว่าเป้าหมาย จึงคืนตาข่ายนิรภัยให้ก่อน: สิทธิ์ฟังซ้ำเพิ่มขึ้นหนึ่งครั้ง — ปุ่มที่ประหยัดที่สุด เนื้อหาไม่เปลี่ยน',
      brain3_listening_step_down_clip: 'ความแม่นยำต่ำกว่าเป้าหมายและสิทธิ์ฟังซ้ำเต็มแล้ว จึงย่อคลิปให้สั้นลงหนึ่งระดับ',
      brain3_listening_step_down_rate: 'ความแม่นยำต่ำกว่าเป้าหมายแม้ฟังซ้ำได้เต็มที่และคลิปสั้นแล้ว จึงลดความเร็วเสียงลงหนึ่งขั้น',
      brain3_listening_hold_in_band: 'ความแม่นยำอยู่ในช่วงเป้าหมาย (±0.1) จึงคงความยากไว้ — ตรงนี้แหละที่การเรียนได้ผลที่สุด',
      brain3_listening_hidden_load_replays: 'ความแม่นยำสูงจริง แต่ค่าเฉลี่ยการฟังซ้ำ >= 2 บ่งบอกว่าคุณกำลังใช้แรงมากกว่าที่ตัวเลขแสดง — จึงชะลอการเพิ่มความยากไว้จนภาระลดลง',
      brain3_listening_ceiling: 'ทุกมิติอยู่ระดับยากที่สุดแล้ว ไม่มีอะไรให้เพิ่มได้อีก',
      brain3_listening_floor: 'ทุกมิติอยู่ระดับง่ายที่สุดแล้ว ไม่มีอะไรให้ลดได้อีก'
    },

    // ---------- FiezelSpeakingAdaptive.explain(x, naskah) — kunci = kode rationale ----------
    speaking: {
      brain3_speaking_default: 'ยังไม่มีหลักฐานการพูดที่อ่านได้ ความยากจึงถูกตั้งไว้ที่จุดกึ่งกลางที่ปลอดภัย: โจทย์ระดับวลีพร้อม cue',
      brain3_speaking_baseline_low: 'Mastery ยังต่ำ จุดเริ่มต้นจึงใช้ชุดที่ง่ายที่สุด: ทีละคำ โดยมีเสียงต้นแบบพูดให้ฟังก่อน',
      brain3_speaking_baseline_mid: 'Mastery อยู่ระดับกลาง จุดเริ่มต้นจึงอยู่ตรงกลางบันได: วลีพร้อม cue',
      brain3_speaking_baseline_high: 'Mastery สูงแล้ว จุดเริ่มต้นจึงท้าทายเลย: ประโยคเต็มโดยไม่มีตัวช่วย',
      brain3_speaking_insufficient_evidence: 'หลักฐานในช่วงหลังสุดยังบางเกินกว่าจะเชื่อถือได้ จึงคงความยากไว้ก่อน — นโยบายที่แกว่งเพราะการลองครั้งเดียวอันตรายกว่านโยบายที่นิ่ง',
      brain3_speaking_step_up_scaffold: 'Coverage อยู่เหนือเป้าหมายอย่างมั่นคง จึงถอยตัวช่วยลงหนึ่งขั้น — เนื้อหาไม่เปลี่ยน เพื่อให้รู้ว่าคนที่ทำได้คือคุณ ไม่ใช่ scaffold',
      brain3_speaking_step_up_complexity: 'Coverage อยู่เหนือเป้าหมายอย่างมั่นคงและคุณพูดได้โดยไม่มีตัวช่วยแล้ว ความซับซ้อนของโจทย์จึงเพิ่มขึ้นหนึ่งระดับ',
      brain3_speaking_step_down_scaffold: 'Coverage ต่ำกว่าเป้าหมาย จึงคืนตัวช่วยให้ก่อนหนึ่งขั้น — ปุ่มที่ประหยัดที่สุด เนื้อหาไม่เปลี่ยน',
      brain3_speaking_step_down_complexity: 'Coverage ต่ำกว่าเป้าหมายแม้มีเสียงต้นแบบพูดให้ฟังก่อนแล้ว ความซับซ้อนของโจทย์จึงลดลงหนึ่งระดับ',
      brain3_speaking_hold_in_band: 'Coverage อยู่ในช่วงเป้าหมาย (±0.1) จึงคงความยากไว้ — ตรงนี้แหละที่การฝึกได้ผลที่สุด',
      brain3_speaking_noisy_evidence: 'หลักฐานล่าสุดส่วนใหญ่น่าสงสัย (coverage สูงแต่ latency สั้นจนเป็นไปไม่ได้) — recognizer อาจอ่านผิด จึงคงความยากไว้ ไม่เพิ่มบนหลักฐานปลอม',
      brain3_speaking_hidden_effort: 'Coverage สูงจริง แต่ latency ที่ยาวมากบ่งบอกว่าคุณกำลังใช้แรงมากกว่าที่ตัวเลขแสดง — จึงชะลอการเพิ่มความยากไว้จนพูดได้ลื่นขึ้น',
      brain3_speaking_ceiling: 'ทั้งสองมิติอยู่ระดับยากที่สุดแล้ว ไม่มีอะไรให้เพิ่มได้อีก',
      brain3_speaking_floor: 'ทั้งสองมิติอยู่ระดับง่ายที่สุดแล้ว ไม่มีอะไรให้ลดได้อีก',
      brain3_speaking_target_weak: 'เป้าหมายการฝึกเลือกจาก lesson ที่อ่อนที่สุดซึ่งพื้นฐานก่อนหน้าแข็งแรงแล้ว — การฝึกพูดบนฐานที่ยังไม่มั่นคงมีแต่จะฝึกความรู้สึกล้มเหลว',
      brain3_speaking_target_prereq_blocked: 'lesson ที่อ่อนทั้งหมดยังมีพื้นฐานก่อนหน้าไม่แข็งแรง จึงไม่มีเป้าหมายเฉพาะ — เสริมพื้นฐานผ่านโหมดอื่นก่อน แล้วค่อยฝึกพูดจริงจัง',
      brain3_speaking_target_none: 'ไม่มี lesson ที่อ่อนในบันทึก การฝึกพูดรอบนี้จึงเป็นแบบอิสระ ไม่มี skill เป้าหมายเฉพาะ',
      brain3_speaking_evidence_strong: 'Coverage สูงและ latency สมเหตุสมผลตามธรรมชาติของคน — เป็นหลักฐานการพูดที่ใช้ได้ โดยยังคงส่วนลดของ speaking ไว้',
      brain3_speaking_evidence_weak: 'Coverage ต่ำหรือ latency ยาวมาก — คุณอาจกำลังฝืนสุดแรง หรือ recognizer จับได้แค่บางส่วน น้ำหนักหลักฐานนี้จึงน้อย',
      brain3_speaking_evidence_noise: 'Coverage สูงแต่ latency สั้นเกินกว่าคนจะพูดได้จริง — แทบแน่นอนว่า recognizer อ่านผิด หลักฐานนี้แทบไม่ถูกนับ',
      brain3_speaking_evidence_replay_discount: 'คุณเปิดตัวอย่างซ้ำหลายครั้งก่อนพูด — ตอบถูกหลังฟังตัวอย่างหลายรอบไม่ใช่หลักฐานความสามารถแบบเดียวกับถูกตั้งแต่ฟังครั้งแรก kappa จึงถูกหักลงอีก'
    },

    // ---------- FiezelStepTutor — kunci 'brain-step.*' (dirakit ulang app: stepTutorThai) ----------
    step: {
      'brain-step.step-prefix': 'ขั้นที่ {n}: ',
      'brain-step.ask-identify': 'ลองหาก่อน — {obj} — คือส่วนไหนในประโยคนี้?',
      'brain-step.ask-select': 'จากคำใบ้เมื่อกี้ {obj} แบบไหนเหมาะที่สุด?',
      'brain-step.ask-apply': 'ทีนี้ลองใช้จริง — {obj} — ต้องเป็นรูปอะไร?',
      'brain-step.ask-compare': 'ชั่งน้ำหนักดูก่อน — {obj} — อันไหนเข้ากันมากกว่า?',
      'brain-step.ask-eliminate': 'ตัดตัวที่เป็นไปไม่ได้ทิ้ง — {obj} — ตัวเลือกไหนตกรอบ?',
      'brain-step.ask-check': 'ตรวจอีกครั้ง — {obj} — ถูกต้องแล้วหรือยัง?',
      'brain-step.final-combine': 'ทีนี้ลองรวมขั้นตอนเมื่อกี้เข้าด้วยกัน{quoted} — คำตอบของคุณคืออะไร?',
      'brain-step.final-quoted-stem': ' — โจทย์ก็คือ: "{stem}"',
      'brain-step.final-direct': 'ตอบโจทย์นี้เลย: "{stem}" — คำตอบของคุณคืออะไร?',
      'brain-step.final-fallback': 'คำตอบของคุณสำหรับโจทย์ข้อนี้คืออะไร?'
    },

    // ---------- FiezelTutorBrain.composeTurn/.summarize(…, naskah) — kunci 'brain-tutor.*' ----------
    tutor: {
      'brain-tutor.concept-fallback': 'เนื้อหานี้',
      'brain-tutor.compare-direct': 'เทียบกันตรง ๆ: คำตอบของคุณ "{chosen}" กับรูปที่ถูกต้อง "{right}"',
      'brain-tutor.worked-step1': 'ขั้นที่ 1 - จับกฎให้มั่น: {rule}.',
      'brain-tutor.worked-step2': 'ขั้นที่ 2 - ลองใช้กับประโยคนี้: "{sentence}".',
      'brain-tutor.worked-step3': 'ขั้นที่ 3 - รูปที่ต้องใช้ก็คือ: "{answer}".',
      'brain-tutor.worked-fallback': 'หัวใจของ {concept}: ใช้รูปตามที่บริบทต้องการ',
      'brain-tutor.timing-guess': 'เมื่อกี้ตอบเร็วมากเลย ลองอ่านประโยคช้า ๆ อีกรอบก่อนนะ - โจทย์แบบนี้ครึ่งหนึ่งชนะกันตอนอ่าน ไม่ใช่ตอนเลือก',
      'brain-tutor.why-fails': 'นี่คือเหตุผลที่ตัวเลือกเมื่อกี้ไม่ผ่าน - {why}.',
      'brain-tutor.not-yet': 'ยังไม่ถูกต้อง และนั่นเป็นเรื่องปกติของช่วงนี้',
      'brain-tutor.probe-rotated': '{rotated}. ลองคิดต่อจากตรงนั้นดูนะ',
      'brain-tutor.probe-default': 'ก่อนดูตัวเลือกอีกครั้ง - คำบอกใบ้เรื่องเวลาในประโยคนั้นคือคำไหน?',
      'brain-tutor.hint-rotated': 'อีกมุมหนึ่งที่มองได้: {rotated}. ทีนี้ลองอีกครั้ง',
      'brain-tutor.hint-cue': 'ตัวช่วยจำสั้น ๆ: {cue}. ทีนี้ลองอีกครั้ง',
      'brain-tutor.hint-default': 'คำใบ้อยู่ที่คำที่บอกว่าเหตุการณ์เกิดขึ้นเมื่อไหร่ ลองอีกครั้งนะ',
      'brain-tutor.worked-intro': ' เดี๋ยวทำข้อที่คล้ายกันให้ดูก่อนหนึ่งข้อ จะได้เห็นขั้นตอนชัด ๆ',
      'brain-tutor.reveal-intro': ' โอเค เฉลยเลยนะ',
      'brain-tutor.move-celebrate': 'นั่นไง สิ่งที่เมื่อกี้ทำให้คุณพลาด ตอนนี้คุณผ่านมันมาแล้ว - และผ่านด้วยเหตุผลที่ถูกต้อง ไม่ใช่การเดา',
      'brain-tutor.move-consolidate': 'ถูกต้อง แต่เมื่อกี้ใช้เวลาพอสมควร เราจึงอยู่ตรงนี้ให้แน่นอีกสักหน่อยก่อนขยับขึ้น',
      'brain-tutor.move-stretch': 'ถูกติดกันแถมเร็วด้วย ระดับนี้ต่ำกว่าความสามารถของคุณแล้ว - จะขยับขึ้นอีกนิดนะ',
      'brain-tutor.move-breathe': 'เราหยุดตรงนี้ก่อนนะ คำตอบของคุณเริ่มช้าลงและเริ่มพลาดพร้อมกัน นั่นคือสัญญาณของความเหนื่อย ไม่ใช่สัญญาณว่าคุณทำไม่ได้ ค่อยมาต่อทีหลัง ผลจะติดแน่นกว่ามาก',
      'brain-tutor.move-wrapup': 'โจทย์หมดแล้ว เราปิดรอบนี้กัน',
      'brain-tutor.headline-resolved': 'รอบนี้คุณผ่านสิ่งที่เคยทำให้พลาดไปได้จริง ๆ {count} เรื่อง',
      'brain-tutor.headline-persistent': 'ยังมี {count} รูปแบบที่ค้างอยู่ - นั่นคือสิ่งที่เราจะตามเก็บกันในรอบหน้า',
      'brain-tutor.headline-empty': 'รอบนี้ยังไม่มีคำตอบ',
      'brain-tutor.headline-clean': 'รอบนี้สะอาดหมดจด ไม่มีรูปแบบผิดซ้ำ'
    },

    // ---------- FiezelOLM.summarize(state, nowMs, naskah) — kunci 'brain-olm.*' ----------
    // Catatan: 5 label kontrak (insufficient/remeasuring/from-bkt/rough-estimate/dispute-label)
    // TIDAK dibaca modul lewat lineFor — field `label` id-nya beku untuk tes; nilai th di sini
    // untuk presenter yang membaca `labelKey` (ADDITIVE W2-FEAT-A).
    olm: {
      'brain-olm.insufficient': 'ข้อมูลยังไม่พอ',
      'brain-olm.remeasuring': 'กำลังวัดใหม่อยู่',
      'brain-olm.from-bkt': 'จากโมเดล BKT',
      'brain-olm.rough-estimate': 'ค่าประมาณคร่าว ๆ',
      'brain-olm.dispute-label': 'ฉันว่าข้อนี้ไม่ถูก',
      'brain-olm.concept-fallback': 'แนวคิดนี้',
      'brain-olm.miscon-pair': 'ใน {concept} คำตอบใช้รูป «{wrong}» ซ้ำหลายครั้งทั้งที่รูปมาตรฐานคือ «{right}» รูปแบบนี้จะถูกทดสอบอีกครั้งในแบบฝึกหัดถัดไป',
      'brain-olm.miscon-wrong-only': 'ใน {concept} รูปแบบคำตอบเอนไปทาง «{wrong}» ซ้ำหลายครั้ง รูปแบบนี้จะถูกทดสอบอีกครั้งในแบบฝึกหัดถัดไป',
      'brain-olm.miscon-generic': 'ใน {concept} มีรูปแบบคำตอบที่ซ้ำและต้องทดสอบใหม่',
      'brain-olm.resolved': 'รูปแบบที่เคยพลาดใน {concept} ไม่ปรากฏแล้ว — คำตอบหลังสุดใช้รูปมาตรฐานอย่างสม่ำเสมอ',
      'brain-olm.calib-over': 'คุณคาดว่าจะถูก {pred}% แต่ผลจริงคือ {actual}% ก่อนตอบ ลองพูดเหตุผลของคำตอบออกมาก่อน — ถ้าเหตุผลยังพูดไม่ออก ให้ลดระดับความมั่นใจลง',
      'brain-olm.calib-under': 'คุณคาดว่าจะถูก {pred}% แต่ผลจริงคือ {actual}% คำตอบของคุณแม่นกว่าที่คุณประเมินไว้ — เมื่อจับรูปแบบได้แล้ว กล้าเพิ่มระดับความมั่นใจขึ้นได้เลย',
      'brain-olm.calib-neutral': 'ระดับความมั่นใจ ({pred}%) กับผลจริง ({actual}%) สอดคล้องกันแล้ว รักษานิสัยประเมินก่อนตอบไว้นะ — นิสัยนี้แหละที่ทำให้การประเมินยังเฉียบคม'
    },

    // ---------- FiezelSrlCoach.sessionPlan/.predictPrompt(opts.naskah), .reflect(…, naskah) ----------
    srl: {
      'brain-srl.focus-named': 'เสริม {focus} ให้แข็งแรง — ช่วงหลังคำตอบของคุณพลาดตรงนั้นบ่อยที่สุด',
      'brain-srl.focus-generic': 'เสริมส่วนที่คำตอบพลาดบ่อยที่สุดในช่วงหลังให้แข็งแรง',
      'brain-srl.goal-ask': 'รอบนี้อยากไปทางไหน{size}?',
      'brain-srl.goal-size': ' ({n} ข้อ)',
      'brain-srl.option-review': 'ทวนเนื้อหาที่ใกล้ถึงรอบลืม จะได้ไม่ต้องเริ่มเรียนใหม่จากศูนย์',
      'brain-srl.option-free': 'อิสระ — คละเนื้อหา คุณเป็นคนถือพวงมาลัยเอง',
      'brain-srl.predict-ask': 'มั่นใจแค่ไหนว่าคำตอบจะถูก?',
      'brain-srl.group-fallback': 'เนื้อหาของรอบนี้',
      'brain-srl.calib-over': 'คุณมั่นใจ {conf} ใน {name} แต่ถูกจริง {acc} การประเมินของคุณสูงกว่าผล — ก่อนเลือกคำตอบ ลองพูดกฎออกมาหนึ่งประโยคก่อน ถ้าประโยคนั้นไม่ออกมา ให้ลดการประเมินลง',
      'brain-srl.calib-under': 'คุณประเมินไว้ {conf} ใน {name} ทั้งที่ถูกจริง {acc} คำตอบของคุณแม่นกว่าที่ประเมิน — เมื่อเจอรูปแบบโจทย์ที่เคยทำถูกแล้ว กล้าตั้งการประเมินให้สูงขึ้นได้เลย',
      'brain-srl.calib-good': 'การประเมินของคุณใน {name} ({conf}) ตรงกับผล ({acc}) วิธีประเมินแบบนี้ควรรักษาไว้ — ประเมินก่อนดูเฉลยต่อไปนะ',
      'brain-srl.reflect-no-data': 'รอบนี้ไม่มีการประเมินความมั่นใจที่เทียบกับผลได้',
      'brain-srl.faded-note': ' การประเมินของคุณแม่นติดกันมา 3 รอบแล้ว คำถามความมั่นใจจะหยุดปรากฏไปอีก {n} รอบข้างหน้า'
    }
  };

  // Beku dangkal + per-peta: tabel titipan tidak boleh berubah diam-diam di runtime.
  Object.keys(NASKAH).forEach(function (k) { Object.freeze(NASKAH[k]); });
  Object.freeze(NASKAH);

  if (g) g.FiezelNaskahThBrain = NASKAH;
  // Ekspor untuk rantai require Node (smoke test injeksi th me-require berkas ini).
  if (typeof module === 'object' && module.exports) module.exports = NASKAH;
}());
