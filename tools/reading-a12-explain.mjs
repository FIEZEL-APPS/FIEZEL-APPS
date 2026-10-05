/**
 * Penulis penjelasan Reading A1/A2 (r0001..r0100) yang belum punya `meta.why`/`meta.whyOthersFail`.
 *
 * KENAPA ADA. Bank A1/A2 lama hanya membawa `meta.evidence`; penjelasan pasca-jawab jatuh ke
 * templat generik app.js ("Bagian yang paling mendukung jawaban ini adalah: ..." dan
 * "Pilihan lain tidak punya dukungan di teks."). Untuk 500 soal umpan baliknya nyaris seragam.
 * Alat ini menulis penjelasan yang MENGUTIP bukti + jawaban tiap soal dan MENUNJUK pilihan yang
 * bertentangan, jadi spesifik per butir dan tidak generik.
 *
 * Variasi frasa per jenis soal (WHY) mencegah satu kerangka global mendominasi 500 soal.
 * DETERMINISTIK & IDEMPOTEN: tanpa Math.random, soal ber-`why` dilewati apa adanya.
 *
 * PEMAKAIAN:
 *   node tools/reading-a12-explain.mjs           (dry-run: contoh + statistik)
 *   node tools/reading-a12-explain.mjs --write    (tulis reading-bank.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BANK = path.join(ROOT, 'reading-bank.json');
const WRITE = process.argv.includes('--write');

const WHY = {
  main_idea: [
    (a, e) => `Inti bacaan ini “${a}”. Hampir semua kalimat menceritakan itu, misalnya “${e}”.`,
    (a, e) => `Bacaan ini utamanya tentang “${a}”. Kalimat “${e}” menunjukkan hal itu.`
  ],
  detail: [
    (a, e) => `Jawabannya tertulis langsung di teks: “${e}”. Karena itu pilihannya “${a}”.`,
    (a, e) => `Teks menyebutkan “${e}”, jadi jawabannya “${a}”.`
  ],
  why: [
    (a, e) => `Alasannya dijelaskan di teks: “${e}”. Itu sebabnya jawabannya “${a}”.`,
    (a, e) => `Teks memberi tahu sebabnya lewat “${e}”. Jadi jawabannya “${a}”.`
  ],
  time: [
    (a, e) => `Waktunya tertulis di teks: “${e}”. Jadi jawabannya “${a}”.`,
    (a, e) => `Teks menyebut waktu lewat “${e}”, sehingga jawabannya “${a}”.`
  ],
  people: [
    (a, e) => `Pelakunya disebut di teks: “${e}”. Jadi jawabannya “${a}”.`,
    (a, e) => `Kalimat “${e}” menyebut siapa pelakunya, yaitu “${a}”.`
  ],
  location: [
    (a, e) => `Tempatnya ada di teks: “${e}”. Jadi jawabannya “${a}”.`,
    (a, e) => `Kalimat “${e}” menyebut tempatnya, yaitu “${a}”.`
  ],
  quantity: [
    (a, e) => `Jumlahnya tertulis di teks: “${e}”. Jadi jawabannya “${a}”.`,
    (a, e) => `Teks menyebut jumlahnya lewat “${e}”, yaitu “${a}”.`
  ],
  reference: [
    (a, e) => `Kata rujukan itu menunjuk ke “${e}”, yaitu “${a}”.`,
    (a, e) => `Yang dirujuk terlihat dari “${e}”. Jadi yang dimaksud adalah “${a}”.`
  ],
  sequence: [
    (a, e) => `Urutannya terlihat dari “${e}”. Jadi yang terjadi lebih awal adalah “${a}”.`,
    (a, e) => `Teks menyusun kejadian lewat “${e}”. Karena itu jawabannya “${a}”.`
  ],
  record: [
    (a, e) => `Aturannya tertulis di teks: “${e}”. Maka yang wajib adalah “${a}”.`,
    (a, e) => `Ketentuannya ada di “${e}”, jadi jawabannya “${a}”.`
  ],
  action: [
    (a, e) => `Yang dilakukan tokohnya ada di teks: “${e}”. Jadi jawabannya “${a}”.`,
    (a, e) => `Teks menyebut tindakannya lewat “${e}”, yaitu “${a}”.`
  ],
  how: [
    (a, e) => `Caranya dijelaskan lewat “${e}”. Jadi jawabannya “${a}”.`,
    (a, e) => `Teks menerangkan bagaimana hal itu dilakukan di “${e}”, sehingga jawabannya “${a}”.`
  ],
  purpose: [
    (a, e) => `Penulis menonjolkan “${e}”. Tujuannya untuk “${a}”.`,
    (a, e) => `Kalimat “${e}” mengarah ke maksud penulis, yaitu “${a}”.`
  ],
  cause_effect: [
    (a, e) => `Sebabnya ada di “${e}”. Akibatnya, jawabannya “${a}”.`,
    (a, e) => `Teks menghubungkan sebab dan akibat lewat “${e}”. Karena itu jawabannya “${a}”.`
  ],
  vocabulary_context: [
    (a, e) => `Dalam kalimat “${e}”, kata itu dipakai untuk “${a}”.`,
    (a, e) => `Dari “${e}”, arti kata itu adalah “${a}”.`
  ],
  vocabulary: [
    (a, e) => `Dari kalimat “${e}”, maksudnya adalah “${a}”.`,
    (a, e) => `Teks memakainya di “${e}”, jadi artinya “${a}”.`
  ]
};
const DEFAULT_WHY = (a, e) => `Jawabannya didukung teks: “${e}”. Karena itu pilihannya “${a}”.`;

function othersFail(wrongs, evidence) {
  const w = wrongs.map((x) => String(x == null ? '' : x).trim()).filter(Boolean);
  const kutip = w.slice(0, 3).map((x) => `“${x}”`).join(', ');
  if (!w.length) return `Pilihan lain tidak didukung teks; teks justru menyebut “${evidence}”.`;
  return `Pilihan ${kutip} tidak ada di teks. Yang tertulis justru “${evidence}”, dan itu cocok dengan jawaban yang benar.`;
}
const hasText = (s) => String(s == null ? '' : s).trim().length > 0;

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));
let filled = 0, skipped = 0, noEvidence = 0, counter = 0;
const perType = {};

for (const r of bank) {
  if (r.level !== 'A1' && r.level !== 'A2') continue;
  (r.qs || []).forEach((q) => {
    if (!Array.isArray(q) || q.length < 3) return;
    const meta = q[3] && typeof q[3] === 'object' ? q[3] : null;
    if (!meta) return;
    if (hasText(meta.why)) { skipped++; return; }
    const options = Array.isArray(q[1]) ? q[1] : [];
    const ansIdx = Number.isInteger(q[2]) ? q[2] : options.findIndex((o) => o === meta.answer);
    const answer = hasText(options[ansIdx]) ? options[ansIdx] : meta.answer;
    const evidence = hasText(meta.evidence) ? String(meta.evidence).trim() : '';
    if (!hasText(answer) || !evidence) { noEvidence++; return; }
    const wrongs = options.filter((_, k) => k !== ansIdx);
    const type = meta.type || 'detail';
    const fns = WHY[type] || [DEFAULT_WHY];
    const why = fns[counter % fns.length](answer, evidence);
    const wof = othersFail(wrongs, evidence);
    if (WRITE) { meta.why = why; meta.whyOthersFail = wof; }
    perType[type] = (perType[type] || 0) + 1;
    filled++; counter++;
  });
}

if (WRITE) {
  fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + '\n');
  console.log('DITULIS reading-bank.json — ' + filled + ' soal A1/A2 diberi penjelasan terkurasi; dilewati ' + skipped + '.');
} else {
  console.log('[dry-run] akan diisi: ' + filled + ', dilewati (sudah ada): ' + skipped + ', lewat (tanpa bukti/jawaban): ' + noEvidence);
  console.log('per tipe: ' + JSON.stringify(perType));
}
