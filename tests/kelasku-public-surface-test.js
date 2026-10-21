#!/usr/bin/env node
'use strict';
/**
 * tests/kelasku-public-surface-test.js — AUDIT PERMUKAAN PUBLIK KELASKU (WORK ORDER FIEZEL + KELASKU)
 *
 * Memverifikasi:
 *   1. Berkas website/kelasku/index.html ada dan valid secara struktur.
 *   2. Tepat 1 <h1> pada halaman.
 *   3. Metadata lengkap: title, description, canonical (https://fiezel.my.id/kelasku/), og:*.
 *   4. JSON-LD terstruktur valid (WebPage, SoftwareApplication, BreadcrumbList, FAQPage).
 *   5. Pertanyaan FAQ kasatmata cocok 100% dengan FAQPage JSON-LD.
 *   6. Tidak ada klaim palsu (rating, ulasan, atau sertifikasi palsu).
 *   7. Tidak ada kebocoran tautan dashboard privat (/kelasku/dashboard atau token).
 *   8. Semua tautan internal lokal mengarah ke berkas nyata di repositori.
 *   9. Hubungan entitas FIEZEL -> KelasKu diungkapkan secara jelas.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'website', 'kelasku', 'index.html');

let checksPassed = 0;
function pass(msg) {
  checksPassed++;
  console.log('PASS ' + msg);
}

assert.ok(fs.existsSync(FILE), 'website/kelasku/index.html harus ada');
pass('1. Berkas website/kelasku/index.html ada');

const html = fs.readFileSync(FILE, 'utf8');

// 2. Exactly one <h1>
const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
assert.strictEqual(h1Matches.length, 1, 'Harus ada tepat satu <h1>');
assert.ok(h1Matches[0].includes('KelasKu'), '<h1> harus menyebut KelasKu');
pass('2. Tepat satu <h1> valid yang menyebut KelasKu');

// 3. Metadata & Canonical
assert.ok(/<title>[^<]*KelasKu[^<]*FIEZEL[^<]*<\/title>/i.test(html), 'Title harus memuat KelasKu dan FIEZEL');
assert.ok(/<meta\s+name="description"\s+content="[^"]*KelasKu[^"]*"/i.test(html), 'Description harus ada dan memuat KelasKu');
assert.ok(/<link\s+rel="canonical"\s+href="https:\/\/fiezel\.my\.id\/kelasku\/"\s*\/?>/i.test(html), 'Kanonik harus https://fiezel.my.id/kelasku/');
assert.ok(/<meta\s+property="og:url"\s+content="https:\/\/fiezel\.my\.id\/kelasku\/"\s*\/?>/i.test(html), 'og:url harus https://fiezel.my.id/kelasku/');
assert.ok(/<meta\s+property="og:image"\s+content="https:\/\/fiezel\.my\.id\/[^"]*"/i.test(html), 'og:image harus URL absolut');
pass('3. Metadata, Title, Description, Canonical, dan OpenGraph valid');

// 4. JSON-LD
const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(ldMatch, 'Blok application/ld+json harus ada');
let ldData;
try {
  ldData = JSON.parse(ldMatch[1]);
} catch (e) {
  assert.fail('JSON-LD gagal diurai: ' + e.message);
}
assert.ok(Array.isArray(ldData), 'JSON-LD berupa array simpul');
const types = ldData.map(node => node['@type']);
assert.ok(types.includes('WebPage'), 'Harus memuat WebPage');
assert.ok(types.includes('SoftwareApplication'), 'Harus memuat SoftwareApplication');
assert.ok(types.includes('BreadcrumbList'), 'Harus memuat BreadcrumbList');
assert.ok(types.includes('FAQPage'), 'Harus memuat FAQPage');
pass('4. JSON-LD struktur data valid dan lengkap (WebPage, SoftwareApplication, BreadcrumbList, FAQPage)');

// 5. FAQ parity
const faqNode = ldData.find(node => node['@type'] === 'FAQPage');
assert.ok(faqNode && Array.isArray(faqNode.mainEntity), 'FAQPage harus memiliki mainEntity');
const schemaQuestions = faqNode.mainEntity.map(q => q.name.trim().toLowerCase());

const visibleQuestions = (html.match(/<div class="faq-card">\s*<h3>([^<]+)<\/h3>/g) || [])
  .map(m => m.replace(/<[^>]+>/g, '').trim().toLowerCase());

assert.ok(schemaQuestions.length >= 10, 'Minimal 10 pertanyaan FAQ di schema');
assert.strictEqual(schemaQuestions.length, visibleQuestions.length, 'Jumlah FAQ di schema dan visual harus persis sama');
schemaQuestions.forEach((sq, i) => {
  assert.strictEqual(sq, visibleQuestions[i], 'Pertanyaan FAQ ke-' + (i + 1) + ' harus cocok persis');
});
pass('5. FAQ kasatmata (' + visibleQuestions.length + ' butir) cocok 100% dengan FAQPage schema');

// 6. No fake claims
assert.ok(!html.includes('aggregateRating'), 'Dilarang menggunakan aggregateRating tanpa pipeline ulasan');
assert.ok(!html.includes('ratingValue'), 'Dilarang menggunakan ratingValue tanpa sumber');
assert.ok(!html.includes('reviewCount'), 'Dilarang menggunakan reviewCount tanpa sumber');
assert.ok(!html.includes('ribuan sekolah'), 'Dilarang membuat klaim berlebihan ("ribuan sekolah")');
pass('6. Bebas dari klaim palsu dan ulasan/rating tanpa sumber');

// 7. No private dashboard leakage
assert.ok(!html.includes('/kelasku/dashboard'), 'Tidak boleh ada tautan /kelasku/dashboard privat');
assert.ok(!html.includes('token='), 'Tidak boleh membocorkan token');
pass('7. Rute privat tidak bocor di markup publik');

// 8. Internal links resolution
const hrefMatches = html.match(/href="([^"#:]+)"/g) || [];
const checkedPaths = new Set();
hrefMatches.forEach(m => {
  const target = m.replace(/^href="/, '').replace(/"$/, '');
  if (target.startsWith('http') || target.startsWith('mailto') || target.startsWith('tel')) return;
  const cleanTarget = target.split('?')[0];
  let resolved;
  if (cleanTarget === '../app/' || cleanTarget === '../app' || cleanTarget.startsWith('../app/')) {
    resolved = path.normalize(path.join(ROOT, 'index.html'));
  } else {
    resolved = path.normalize(path.join(ROOT, 'website', 'kelasku', cleanTarget));
  }
  if (!checkedPaths.has(resolved)) {
    checkedPaths.add(resolved);
    assert.ok(fs.existsSync(resolved), 'Tautan internal tidak ditemukan di disk: ' + cleanTarget + ' -> ' + resolved);
  }
});
pass('8. Seluruh tautan internal (' + checkedPaths.size + ' target) valid dan ada di disk');

// 9. FIEZEL -> KelasKu relationship
assert.ok(html.includes('KelasKu adalah ruang kerja (classroom workspace) FIEZEL'), 'Definisi KelasKu di paragraf awal harus eksplisit');
assert.ok(html.includes('Braincore'), 'Hubungan dengan Braincore harus dijelaskan');
assert.ok(!html.includes('diesel') && !html.includes('fizzle'), 'Tidak mencemari halaman KelasKu dengan kata diesel/fizzle');
pass('9. Hubungan entitas FIEZEL -> KelasKu terverifikasi');

console.log('\nkelasku-public-surface-test: ' + checksPassed + '/9 PASS');
