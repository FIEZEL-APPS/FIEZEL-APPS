/**
 * A8 · bukti tanpa peramban. Mesin ini nggak punya Chromium/Chrome (Playwright ada sebagai
 * modul, tetapi `npx playwright install chromium` menolak: "Playwright does not support
 * chromium on ubuntu26.04-x64", dan e2e-level-grammar-test.js sendiri melaporkan SKIPPED
 * dengan alasan yang sama). Jadi bukti visualnya belum bisa diambil di sini.
 *
 * Yang MASIH bisa dibuktikan tanpa peramban dicetak di sini: markup persis yang akan dilihat
 * murid, urutan bacanya, peran ARIA-nya, dan jumlah elemen bayar di panel jatah. Screenshot
 * 390px-nya diambil oleh reports/add-a8-shots/shoot.js begitu ada mesin dengan peramban.
 */
const fs = require('fs');
const path = require('path');
const copy = require(path.join(__dirname, '..', '..', 'features', 'quota', 'quota-copy.js'));

const kasus = [
  ['jatah suara habis · benar-benar tanpa suara', { copyKey: 'quota.tts.exhausted', spoken: false, online: true, resetAt: Date.UTC(2026, 7, 28, 17, 0, 0) }],
  ['jatah suara habis · masih ada suara perangkat', { copyKey: 'quota.tts.exhausted', spoken: true, online: true }],
  ['perangkat lepas dari internet', { copyKey: 'quota.ai.exhausted', online: false, spoken: false }],
  ['penghitung jatah rusak (temuan bohong)', { reason: 'quota_unavailable', online: true, spoken: false }],
  ['sesi kedaluwarsa (satu-satunya role=alert)', { sessionExpired: true, online: true, spoken: false }],
  ['jatah suara habis SAAT sesi listening jalan', { copyKey: 'quota.tts.exhausted', spoken: false, online: true, listeningActive: true }]
];

const baris = [];
for (const [label, facts] of kasus) {
  const n = copy.build(facts);
  baris.push('=== ' + label);
  baris.push('kunci        : ' + n.key + (n.requestedCopyKey && n.requestedCopyKey !== n.key ? '  (diminta: ' + n.requestedCopyKey + ')' : ''));
  baris.push('role/aria    : role="' + n.role + '" aria-live="' + n.ariaLive + '" announce=' + n.announce + ' tunda=' + n.deferUntilSessionEnd);
  baris.push('fokus/umur   : stealsFocus=' + n.stealsFocus + ' autoHideMs=' + n.autoHideMs + ' persist=' + n.persistUntilDismissed);
  baris.push('markup       : ' + copy.panelMarkup(n));
  baris.push('');
}
const plan = copy.planPanelMarkup({ used: 12, limit: 30, paymentEnabled: false, resetAt: Date.UTC(2026, 7, 28, 17, 0, 0) });
baris.push('=== panel jatah (paymentEnabled=false)');
baris.push('elemen <a>   : ' + (plan.match(/<a[\s>]/g) || []).length);
baris.push('elemen <btn> : ' + (plan.match(/<button[\s>]/g) || []).length);
baris.push('markup       : ' + plan);
baris.push('');
let lempar = 'TIDAK MELEMPAR (bug)';
try { copy.planPanelMarkup({ paymentEnabled: true }); } catch (e) { lempar = 'melempar: ' + e.message; }
baris.push('paymentEnabled=true → ' + lempar);

const out = path.join(__dirname, 'a8-notice-markup.txt');
fs.writeFileSync(out, baris.join('\n') + '\n');
console.log(baris.join('\n'));
