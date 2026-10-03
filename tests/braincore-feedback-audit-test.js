#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('./app.js', 'utf8').replace(/\r\n/g, '\n');
const tokenStart = app.indexOf('function tokenOrderInversionClue(');
const tokenEnd = app.indexOf('/**\n * Alasan Indonesia mengapa pilihan yang diambil murid gagal.', tokenStart);
assert.ok(tokenStart >= 0 && tokenEnd > tokenStart, 'helper diagnosis urutan tidak ditemukan');
const tokenSource = app.slice(tokenStart, tokenEnd);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${tokenSource}\nthis.tokenOrderInversionClue=tokenOrderInversionClue;`, ctx);

let pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`ok - ${name}`); }
  catch (error) { console.error(`FAIL - ${name}\n    ${error.message}`); process.exitCode = 1; }
}

test('urutan subjek-kata bantu yang terbalik disebut spesifik', () => {
  const clue = ctx.tokenOrderInversionClue(
    ['Is', 'she', 'working', 'today'],
    ['She', 'is', 'working', 'today']
  );
  assert.match(clue, /subjek dan kata kerjanya terbalik/);
  assert.match(clue, /she/i);
  assert.match(clue, /is/i);
});

test('permutasi umum menunjuk posisi kata pertama yang berbeda', () => {
  const clue = ctx.tokenOrderInversionClue(
    ['I', 'coffee', 'drink', 'every', 'morning'],
    ['I', 'drink', 'coffee', 'every', 'morning']
  );
  assert.match(clue, /Urutan katanya belum tepat/);
  assert.match(clue, /coffee/);
  assert.match(clue, /drink/);
});

test('data bukan permutasi jatuh ke fallback jujur', () => {
  assert.strictEqual(ctx.tokenOrderInversionClue(['I', 'drink'], ['I', 'drink', 'coffee']), '');
});

test('fadeCredit dan diagnosis meta benar-benar terhubung di app.js', () => {
  assert.match(app, /fadeCredit:Number\(diagnosis\.fadeCredit/);
  assert.match(app, /optionMisconceptions:grammarOptionMisconceptions\(item,marked\)/);
  assert.match(app, /function grammarOptionMisconceptions\(item,marked\)/);
});

console.log(`Braincore feedback audit: ${pass}/4 PASS`);
if (process.exitCode) process.exit(1);
