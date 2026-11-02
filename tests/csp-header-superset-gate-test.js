#!/usr/bin/env node
/**
 * tests/csp-header-superset-gate-test.js — GERBANG "LOGIN GOOGLE & API TIDAK BOLEH DIBLOKIR CSP" (m025-752).
 *
 * INSIDEN: m025-748 memasang header Content-Security-Policy di website/.htaccess yang
 * berlaku untuk SELURUH situs termasuk PWA /app/. Peramban menegakkan IRISAN header +
 * <meta> CSP, sehingga header yang lebih sempit diam-diam mematikan:
 *   - skrip tombol Google (script-src https://accounts.google.com/gsi/client),
 *   - iframe tombol Google (frame-src https://accounts.google.com),
 *   - SEMUA fetch ke https://api.fiezel.my.id (auth/anon, account/me, auth/google, braincore),
 *   - audio dari audio.fiezel.my.id / api.fiezel.my.id.
 * Hasilnya: "Masuk dengan Google" tidak berfungsi di semua perangkat.
 *
 * INVARIAN yang dikunci di sini:
 *   1. Untuk setiap direktif di <meta> CSP index.html, setiap sumber yang diizinkan meta
 *      WAJIB juga diizinkan oleh header .htaccess (header ⊇ meta).
 *   2. Origin wajib login & API eksplisit diizinkan header.
 *   3. Gerbang ini TERBUKTI MERAH terhadap CSP m025-748 (pemeriksaan yang tidak bisa merah = bohong).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;
function ok(cond, msg) { assert.ok(cond, msg); pass++; console.log('PASS ' + pass + ': ' + msg); }

function parseCsp(str) {
  const map = {};
  String(str || '').split(';').map((d) => d.trim()).filter(Boolean).forEach((d) => {
    const parts = d.split(/\s+/);
    map[parts[0].toLowerCase()] = parts.slice(1);
  });
  return map;
}

/** Sumber efektif sebuah direktif (fallback ke default-src seperti peramban). */
function effective(csp, dir) {
  if (csp[dir]) return csp[dir];
  if ((dir === 'script-src-elem' || dir === 'script-src-attr') && csp['script-src']) return csp['script-src'];
  if ((dir === 'style-src-elem' || dir === 'style-src-attr') && csp['style-src']) return csp['style-src'];
  if (dir === 'worker-src' && csp['script-src']) return csp['script-src'];
  return csp['default-src'] || [];
}

/** Apakah daftar sumber `list` mengizinkan sumber/URL `src`? (pencocokan CSP3 disederhanakan) */
function allows(list, src) {
  const s = String(src);
  if (list.includes(s)) return true;
  if (/^'/.test(s)) return list.includes(s);
  const schemeOnly = s.match(/^([a-z][a-z0-9+.-]*):$/i);
  if (schemeOnly) return list.includes(s);
  let u;
  try { u = new URL(s.replace(/\*$/, '')); } catch (_) { return false; }
  const scheme = u.protocol; // 'https:'
  if (list.includes(scheme)) return true;
  return list.some((tok) => {
    if (/^'/.test(tok) || /^[a-z]+:$/i.test(tok)) return false;
    let t;
    try { t = new URL(tok.replace('://*.', '://wildcard-host.')); } catch (_) { return false; }
    const schemeOk = t.protocol === scheme || (t.protocol === 'http:' && scheme === 'https:') || (t.protocol === 'wss:' && scheme === 'https:');
    if (!schemeOk) return false;
    if (tok.includes('://*.')) {
      const suffix = t.hostname.replace(/^wildcard-host/, '');
      return u.hostname.endsWith(suffix);
    }
    return t.hostname === u.hostname;
  });
}

function supersetViolations(header, meta) {
  const out = [];
  const IGNORE = /^http:\/\/(127\.0\.0\.1|localhost)/; // jalur dev lokal; tidak relevan di produksi
  Object.keys(meta).forEach((dir) => {
    if (dir === 'default-src') return;
    const h = effective(header, dir);
    meta[dir].forEach((src) => {
      if (IGNORE.test(src)) return;
      // 'wasm-unsafe-eval' juga tercakup 'unsafe-eval'
      if (src === "'wasm-unsafe-eval'" && h.includes("'unsafe-eval'")) return;
      if (!allows(h, src)) out.push(dir + ' ' + src);
    });
  });
  return out;
}

function requiredViolations(header) {
  const REQUIRED = [
    ['script-src-elem', 'https://accounts.google.com/gsi/client'],
    ['frame-src', 'https://accounts.google.com/gsi/button'],
    ['style-src-elem', 'https://accounts.google.com/gsi/style'],
    ['connect-src', 'https://accounts.google.com/gsi/'],
    ['connect-src', 'https://api.fiezel.my.id/api/auth/google'],
    ['connect-src', 'https://api.fiezel.my.id/api/auth/anon'],
    ['connect-src', 'https://api.fiezel.my.id/api/account/me'],
    ['connect-src', 'https://api.fiezel.my.id/api/braincore/item-difficulty'],
    ['connect-src', 'https://api.fiezel.my.id/api/voice/copilot-assist'],
    ['connect-src', 'wss://fiezel.my.id/api/live-call'],
    ['media-src', 'https://audio.fiezel.my.id/a.mp3'],
    ['media-src', 'https://api.fiezel.my.id/api/tts']
  ];
  return REQUIRED.filter(([dir, url]) => !allows(effective(header, dir), url)).map(([d, u]) => d + ' ' + u);
}

// ---------------------------------------------------------------- baca berkas
const htaccess = fs.readFileSync(path.join(ROOT, 'website', '.htaccess'), 'utf8');
const hMatch = htaccess.match(/Header\s+always\s+set\s+Content-Security-Policy\s+"([^"]+)"/i);
ok(!!hMatch, '.htaccess memasang header Content-Security-Policy');
const header = parseCsp(hMatch[1]);
ok((header['object-src'] || []).includes("'none'"), "header CSP tetap mengunci object-src 'none'");
ok((header['base-uri'] || []).includes("'self'"), "header CSP tetap mengunci base-uri 'self'");

const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const mMatch = indexHtml.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]+)"/i);
ok(!!mMatch, 'index.html punya <meta> CSP');
const meta = parseCsp(mMatch[1]);

// ---------------------------------------------------------------- invarian 1 & 2
const sv = supersetViolations(header, meta);
ok(sv.length === 0, 'header CSP .htaccess ⊇ meta CSP index.html' + (sv.length ? ' — KURANG: ' + sv.join(' | ') : ''));
const rv = requiredViolations(header);
ok(rv.length === 0, 'header CSP mengizinkan Google GSI, api.fiezel.my.id, Gemini Live wss, dan audio' + (rv.length ? ' — DIBLOKIR: ' + rv.join(' | ') : ''));

// ---------------------------------------------------------------- invarian 3: terbukti bisa merah
const M025_748 = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https://fiezel.my.id wss://fiezel.my.id https://*.cloudflare.com https://generativelanguage.googleapis.com; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self';";
const bad = parseCsp(M025_748);
const badReq = requiredViolations(bad);
ok(badReq.some((v) => v.includes('accounts.google.com/gsi/client')) && badReq.some((v) => v.includes('api.fiezel.my.id/api/auth/google')),
  'gerbang TERBUKTI MERAH pada CSP m025-748 (GSI + /api/auth/google terdeteksi diblokir)');
ok(supersetViolations(bad, meta).length > 0, 'pemeriksaan superset TERBUKTI MERAH pada CSP m025-748');

console.log('\ncsp-header-superset-gate: ' + pass + ' PASS — login Google & API FIEZEL tidak diblokir CSP.');
