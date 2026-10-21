'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'grammar-templates.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const inOnUnderToRule = 'Menentukan posisi letak benda (kata depan tempat):<br>• <b>in</b>: di dalam ruang tertutup atau wadah (contoh: <b>in the bag</b>).<br>• <b>on</b>: menempel di atas permukaan (contoh: <b>on the table</b>, <b>on the wall</b>).<br>• <b>under</b>: di bagian bawah sesuatu (contoh: <b>under the chair</b>).<br>• <b>to</b>: menunjukkan arah gerak ke suatu tujuan, bukan posisi diam.<br><br>💡 <b>RUMUS KILAT</b>:<br>Di dalam wadah ➡️ <b>in</b>.<br>Di atas permukaan ➡️ <b>on</b>.<br>Di bagian bawah ➡️ <b>under</b>.<br>Bukan tempat diam melainkan arah gerak ➡️ <b>to</b>.';

const nextToRule = 'Menentukan posisi di samping atau sebelah:<br>• <b>next to</b>: di samping atau di sebelah objek lain (contoh: <b>sit next to me</b>).<br>• <b>on</b>: di atas permukaan.<br>• <b>in</b>: di dalam ruang tertutup.<br>• <b>under</b>: di bagian bawah.<br><br>💡 <b>RUMUS KILAT</b>:<br>Di sebelah atau di samping orang/benda ➡️ Pakai <b>next to</b>.';

const onUnderAtRule = 'Menentukan posisi letak benda:<br>• <b>under</b>: di bawah sesuatu (contoh: <b>under the bed</b>).<br>• <b>on</b>: di atas permukaan.<br>• <b>at</b>: di titik lokasi tertentu.<br>• <b>to</b>: arah pergerakan.<br><br>💡 <b>RUMUS KILAT</b>:<br>Di bagian bawah tempat tidur ➡️ Pakai <b>under</b>.';

const inOnAtRule = 'Menentukan kata depan tempat dasar (in, on, at):<br>• <b>in</b>: di dalam wadah atau ruangan.<br>• <b>on</b>: di atas permukaan meja atau dinding.<br>• <b>at</b>: di titik lokasi tertentu.<br><br>💡 <b>RUMUS KILAT</b>:<br>Di atas permukaan meja (the table) ➡️ Wajib pakai <b>on</b>.';

const prepRules = {
  'A1-333': inOnUnderToRule,
  'A1-335': inOnUnderToRule,
  'A1-336': inOnUnderToRule,
  'A1-334': nextToRule,
  'PR-006': onUnderAtRule,
  'A1-013': inOnAtRule
};

const prepCues = {
  'A1-336': 'Jatuh ke lantai? Cari di bagian bawah (under) kursi!',
  'A1-334': 'Ada kursi kosong di sebelah? Duduk di sampingku: "sit next to me"!',
  'PR-006': 'Kucing bersembunyi di lantai? Cari di bawah ranjang: "under the bed"!',
  'A1-333': 'Di dalam tas atau kotak: pakai "in"!',
  'A1-335': 'Dinding dan meja itu permukaan: "on the wall", "on the table"!',
  'A1-013': 'Di dalam tas (in), di atas meja (on), di titik halte bus (at).'
};

// 1. Basic prepositions
['A1-333', 'A1-334', 'A1-335', 'A1-336', 'PR-006', 'A1-013'].forEach(id => {
  const t = data.templates.find(x => x.id === id);
  if (t) {
    if (!t.explanation) t.explanation = {};
    if (prepRules[id]) t.explanation.ruleId = prepRules[id];
    if (prepCues[id]) t.explanation.memoryCueId = prepCues[id];
  }
});

// 2. Habitual past
const ta018 = data.templates.find(x => x.id === 'TA-018');
if (ta018 && ta018.explanation) {
  ta018.explanation.ruleId = 'Membedakan kejadian lampau tunggal vs kebiasaan masa lalu:<br>• <b>Past Simple (Verb 2)</b>: Dipakai untuk kejadian tunggal yang selesai pada waktu tertentu di masa lalu (ada penanda waktu spesifik seperti <i>last Saturday afternoon, yesterday, in 2020</i>). Contoh: <b>We visited our grandmother last Saturday</b>.<br>• <b>used to + Verb 1</b>: Dipakai untuk kebiasaan berulang atau keadaan menetap di masa lalu yang kini sudah berhenti. TIDAK BISA dipakai untuk kejadian tunggal satu kali.<br>• <b>would + Verb 1</b>: Dipakai untuk kebiasaan aksi berulang di masa lalu. TIDAK BISA dipakai untuk kejadian tunggal satu kali.<br><br>💡 <b>RUMUS KILAT</b>:<br>Kejadian tunggal satu kali pada waktu lampau tertentu ➡️ Wajib <b>Past Simple (Verb 2)</b>.<br>Kebiasaan berulang di masa lalu ➡️ Boleh <b>used to</b>.<br>Dilarang memakai <i>used to</i> atau <i>would</i> untuk peristiwa satu kali ❌!';
  ta018.explanation.memoryCueId = 'Peristiwa terjadi satu kali pada waktu tertentu (last Saturday)? Pakai Past Simple (visited), bukan used to!';
}

const b5001 = data.templates.find(x => x.id === 'b5_001');
if (b5001 && b5001.explanation) {
  b5001.explanation.ruleId = 'Membedakan “used to” vs “would” untuk masa lalu:<br>• <b>used to + Verb 1</b>: Bisa dipakai untuk KEBIASAAN AKSI berulang (contoh: <i>used to play</i>) MAUPUN KEADAAN MENETAP / STATIVE VERBS (contoh: <i>used to live, used to have, used to be</i>).<br>• <b>would + Verb 1</b>: HANYA bisa dipakai untuk KEBIASAAN AKSI berulang (contoh: <i>would go fishing every summer</i>). DILARANG KERAS dipakai untuk kata kerja keadaan (stative verbs) seperti <i>live, have, be, know</i> ❌.<br><br>💡 <b>RUMUS KILAT</b>:<br>Kata kerja keadaan / tempat tinggal (live, be, have, like) ➡️ Wajib <b>used to</b> (bukan <i>would</i> ❌).<br>Aksi kegiatan berulang ➡️ Boleh <b>used to</b> atau <b>would</b>.<br>Ingat: <i>would live</i> atau <i>would be</i> itu keliru untuk kebiasaan lampau!';
  b5001.explanation.memoryCueId = 'Kata kerja keadaan (live, have, be)? Selalu "used to", jangan pernah "would"!';
}

// 3. English leaks
const enLeakFixes = {
  'b5_014': 'Pasangan tetap kata benda: solution TO (solusi untuk), reason FOR (alasan atas), answer TO (jawaban untuk).',
  'PR-201': 'Pintar atau mahir di bidang sesuatu: selalu "good at" (bukan good in)!',
  'MO-202': 'Menyatakan kemampuan di masa depan: setelah "will", wajib pakai "be able to" (jangan "will can")!',
  'CO-208': 'Inversi conditional tipe 3: buang "If", balik subjek jadi "Had we known"!',
  'QN-206': 'Inversi kata negatif di awal kalimat (Rarely): balik kata bantu di depan subjek: "Rarely have I seen"!',
  'CO-209': 'Inversi conditional tipe 2: "If she were to" menjadi "Were she to resign"!'
};
Object.entries(enLeakFixes).forEach(([id, cue]) => {
  const t = data.templates.find(x => x.id === id);
  if (t && t.explanation) t.explanation.memoryCueId = cue;
});

// 4. Orphan root-level ruleId
['A1-009', 'PS-001', 'A1-325', 'A1-326', 'A1-327', 'A1-328'].forEach(id => {
  const t = data.templates.find(x => x.id === id);
  if (t && t.ruleId) delete t.ruleId;
});

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('Successfully patched grammar-templates.json!');
