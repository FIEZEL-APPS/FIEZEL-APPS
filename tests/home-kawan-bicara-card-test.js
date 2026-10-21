#!/usr/bin/env node
/**
 * tests/home-kawan-bicara-card-test.js
 * Kawan Bicara / Mitra Kaiwa di panel Hari Ini (m025-596, brief owner).
 *
 * Yang dikunci:
 *  1. Pintu utama fitur percakapan ada di panel Hari Ini, TEPAT di bawah sapaan (homeTop),
 *     dan membuka go('chat').
 *  2. Nama "Ngobrol AI" DILARANG di naskah murid (id + th) dan di kode yang dirender.
 *  3. Nama per kursus datang dari FiezelI18n: 'chat.nama' (Kawan Bicara) dan lapisan kursus
 *     'kursus-ja.chat.nama' (Mitra Kaiwa), lengkap id + th.
 *  4. Lencana membaca simpanan chat yang nyata (jumlah pesan murid per kursus, saklar koreksi).
 *  5. Tata letak: grid desktop memberi kartu baris sendiri, dan tombolnya dikecualikan dari
 *     gaya tombol global (kalau tidak, CTA memutih seperti yang terukur di probe 390 px).
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const app = read('app.js');

console.log('--- 1. Posisi di panel Hari Ini ---');
const ret = app.slice(app.indexOf('return `<div class="today-home-cockpit fz-edu-cockpit tactile-home-cockpit">'));
assert.ok(/^return `<div class="today-home-cockpit[^>]*>\s*\$\{homeTop\}\s*\$\{conversationPartnerHomeCardMarkup\(\)\}\s*\$\{heroQuestCard\}/.test(ret),
  'kartu Kawan Bicara wajib tepat sesudah homeTop dan sebelum kartu misi');
const fnSrc = app.slice(app.indexOf('function conversationPartnerChatSnapshot'), app.indexOf('function braincoreHomeCardMarkup'));
assert.ok(/onclick="go\('chat'\)"/.test(fnSrc) && /data-testid="kawan-bicara-cta"[^>]*go\('chat'\)/.test(fnSrc), 'kartu dan tombolnya membuka go(\'chat\')');
console.log('✓ kartu tepat di bawah sapaan, membuka chat');

console.log('--- 2. Lencana dari simpanan chat yang nyata ---');
const sandbox = {
  localStorage: { getItem: (k) => (k === 'fiezel-interactive-chat-v1' ? JSON.stringify({
    correctionMode: true,
    scenarioHistories: {
      en_free: [{ role: 'assistant', text: 'Hi' }, { role: 'user', text: 'a' }, { role: 'user', text: 'b' }],
      en_cafe: [{ role: 'user', text: 'c' }],
      ja_free: [{ role: 'user', text: 'あ' }]
    }
  }) : null) }
};
vm.createContext(sandbox);
vm.runInContext(fnSrc.slice(0, fnSrc.indexOf('function conversationPartnerHomeCardMarkup')) + ';this.snap=conversationPartnerChatSnapshot;', sandbox);
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.snap('en'))), { userTurns: 3, correctionOn: true }, 'menghitung pesan murid kursus en saja');
assert.strictEqual(sandbox.snap('ja').userTurns, 1, 'kursus ja dihitung terpisah');
sandbox.localStorage.getItem = () => '{rusak';
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.snap('en'))), { userTurns: 0, correctionOn: false }, 'simpanan rusak = kartu tetap tampil sebagai obrolan baru');
console.log('✓ lencana jujur');

console.log('--- 3. Naskah id + th, nama per kursus ---');
const regs = { id: {}, th: {} };
const add = (l, m) => Object.assign(regs[l], m);
const ctx = { FiezelI18n: { registerCopy: add, overrideCopy: add } };
ctx.self = ctx;
vm.createContext(ctx);
for (const f of ['copy-id-student.js', 'copy-th-student.js', 'copy-id-bahasa.js', 'copy-th-bahasa.js', 'copy-id-quota.js', 'copy-th-quota.js']) {
  vm.runInContext(read('features/i18n/' + f), ctx);
}
const keys = ['chat.nama', 'chat.nama-tag', 'chat.lead', 'chat.title', 'chat.label', 'chat.note',
  'kursus-ja.chat.nama', 'kursus-ja.chat.nama-tag', 'kursus-ja.chat.lead', 'kursus-ja.chat.label',
  'home.kawan.cta-mulai', 'home.kawan.cta-lanjut', 'home.kawan.badge-online', 'home.kawan.badge-lanjut',
  'home.kawan.badge-baru', 'home.kawan.badge-koreksi', 'home.kawan.aria'];
for (const k of keys) {
  assert.ok(regs.id[k], 'kunci id hilang: ' + k);
  assert.ok(regs.th[k], 'kunci th hilang: ' + k);
}
assert.strictEqual(regs.id['chat.nama'], 'Kawan Bicara');
assert.strictEqual(regs.id['kursus-ja.chat.nama'], 'Mitra Kaiwa');
assert.ok(/会話パートナー/.test(regs.id['kursus-ja.chat.nama-tag']), 'tag kursus Jepang');
assert.ok(/[฀-๿]/.test(regs.th['chat.nama']) && /[฀-๿]/.test(regs.th['home.kawan.cta-mulai']), 'naskah th beraksara Thai');
assert.ok(/\{n\}/.test(regs.id['home.kawan.badge-lanjut']) && /\{n\}/.test(regs.th['home.kawan.badge-lanjut']), 'placeholder {n} sama di id dan th');
console.log('✓ nama baru dua bahasa, adaptif kursus');

console.log('--- 4. "Ngobrol AI" dilarang di naskah murid ---');
const bocor = [];
for (const l of ['id', 'th']) for (const [k, v] of Object.entries(regs[l])) if (/ngobrol ai/i.test(String(v))) bocor.push(l + ':' + k);
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
for (const f of ['app.js', 'features/interactive-chat/fiezel-interactive-chat.js', 'features/quota/quota-copy.js']) {
  if (/ngobrol ai/i.test(stripComments(read(f)))) bocor.push(f);
}
assert.deepStrictEqual(bocor, [], 'nama lama masih terlihat murid: ' + bocor.join(', '));
console.log('✓ nama lama tidak tersisa');

console.log('--- 5. Tata letak & tombol ---');
const css = read('features/ui/fiezel-tactile-clay.css');
assert.ok(/\.today-home-cockpit > \.fz-kawan-card \{ grid-column: 1 \/ -1 !important; grid-row: 2 !important; \}/.test(css), 'grid desktop memberi kartu baris kedua');
assert.ok(/\.today-home-cockpit > #heroCard \{ grid-row: 3 !important; \}/.test(css), 'kartu misi turun satu baris di desktop');
const globalBtn = css.split('\n').filter((l) => /^button:not\(\.primary\)/.test(l));
assert.ok(globalBtn.length >= 2 && globalBtn.every((l) => l.indexOf(':not(.fz-kawan-cta)') !== -1), 'CTA dikecualikan dari gaya tombol global');
assert.ok(/prefers-reduced-motion: reduce\)[\s\S]{0,200}fz-kawan-avatar/.test(css), 'animasi menghormati reduced-motion');
console.log('✓ tata letak & tombol');

console.log('ALL KAWAN BICARA HOME CARD TESTS PASSED (5/5).');
