#!/usr/bin/env node
/**
 * tools/dev/google-auth-csp-probe.js — PROBE EMPIRIS "Masuk dengan Google" (m025-752).
 *
 * Membuka layar login ASLI (`?fz_real_auth=1`) di Chromium headless, lalu mencatat:
 *   - setiap pelanggaran CSP (event `securitypolicyviolation` + pesan konsol),
 *   - apakah skrip GSI `accounts.google.com/gsi/client` termuat (`google.accounts.id`),
 *   - apakah iframe tombol resmi Google tergambar,
 *   - apakah `fetch()` ke API FIEZEL (`api.fiezel.my.id`) diizinkan CSP halaman.
 *
 * Pakai:
 *   node tools/dev/google-auth-csp-probe.js                       # produksi live
 *   node tools/dev/google-auth-csp-probe.js --url=http://127.0.0.1:4173/
 *   node tools/dev/google-auth-csp-probe.js --csp-header="<nilai CSP>"   # simulasikan header CSP
 *
 * Keluar kode 1 bila tombol Google tidak tergambar atau ada pelanggaran CSP pada
 * origin yang dibutuhkan login (accounts.google.com / api.fiezel.my.id).
 */
'use strict';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
}));
const BASE = String(args.url || 'https://fiezel.my.id/app/');
const SIM_HEADER = args['csp-header'] ? String(args['csp-header']) : '';

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require('@playwright/test')); }
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
    serviceWorkers: 'block',
    extraHTTPHeaders: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  });
  const page = await ctx.newPage();
  const violations = [];
  const consoleCsp = [];

  if (SIM_HEADER) {
    // Ganti header CSP dokumen dengan nilai yang diuji (meniru .htaccess baru) tanpa menyentuh server.
    await page.route('**/*', async (route) => {
      const req = route.request();
      if (req.resourceType() !== 'document' || !req.url().startsWith(new URL(BASE).origin)) return route.continue();
      const resp = await route.fetch();
      const headers = { ...resp.headers() };
      headers['content-security-policy'] = SIM_HEADER;
      return route.fulfill({ response: resp, headers });
    });
  }

  page.on('console', (m) => {
    const txt = m.text();
    if (/Content Security Policy|violates/i.test(txt)) consoleCsp.push(txt.slice(0, 300));
  });
  await page.addInitScript(() => {
    window.__fzCsp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__fzCsp.push({ directive: e.effectiveDirective, blocked: e.blockedURI, disposition: e.disposition });
    });
    try {
      localStorage.setItem('fz_target_course', 'ja');
    } catch (_) {}
  });

  const sep = BASE.includes('?') ? '&' : '?';
  const url = BASE + sep + 'fz_real_auth=1&fz_probe=' + Date.now();
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const headerCsp = (resp && resp.headers()['content-security-policy']) || '';

  // Beri waktu layar auth tergambar lalu panggil renderButton secara eksplisit di host uji.
  await page.waitForTimeout(6000);
  const result = await page.evaluate(async () => {
    const out = { hasFiezelGoogle: !!window.FiezelGoogle, available: false, render: null, gsiLoaded: false, iframe: false, apiFetch: null };
    try { out.available = !!(window.FiezelGoogle && window.FiezelGoogle.available()); } catch (_) {}
    if (window.FiezelGoogle && out.available) {
      const host = document.createElement('div');
      host.id = 'fzProbeGoogleHost';
      host.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483647;background:#fff;padding:4px';
      document.body.appendChild(host);
      try { out.render = await window.FiezelGoogle.renderButton(host, function () {}, { locale: 'id' }); } catch (e) { out.render = { ok: false, error: String(e) }; }
      await new Promise((r) => setTimeout(r, 3500));
      out.gsiLoaded = !!(window.google && window.google.accounts && window.google.accounts.id);
      out.iframe = !!document.querySelector('#fzProbeGoogleHost iframe[src*="accounts.google.com"]');
    }
    try {
      const base = (window.FIEZEL_CF_CONFIG && window.FIEZEL_CF_CONFIG.base) || 'https://api.fiezel.my.id';
      const r = await fetch(base + '/api/auth/google', { method: 'OPTIONS', mode: 'cors', credentials: 'include' });
      out.apiFetch = { ok: true, status: r.status };
    } catch (e) { out.apiFetch = { ok: false, error: String(e && e.message || e) }; }
    out.violations = window.__fzCsp || [];
    return out;
  });
  violations.push(...(result.violations || []));

  await page.screenshot({ path: args.shot || 'reports/google-auth-csp-probe.png', fullPage: false }).catch(() => {});
  await browser.close();

  const loginBlocked = violations.filter((v) => /accounts\.google\.com|api\.fiezel\.my\.id/.test(v.blocked || ''));
  const report = {
    url,
    headerCspPresent: !!headerCsp,
    headerCsp: headerCsp.slice(0, 600),
    fiezelGoogle: result.hasFiezelGoogle,
    googleConfigured: result.available,
    renderButton: result.render,
    gsiScriptLoaded: result.gsiLoaded,
    googleButtonIframe: result.iframe,
    apiFetch: result.apiFetch,
    cspViolations: violations,
    consoleCsp: consoleCsp.slice(0, 8),
    verdict: (result.iframe && result.apiFetch && result.apiFetch.ok && loginBlocked.length === 0) ? 'PASS' : 'FAIL'
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { console.error('PROBE ERROR', e); process.exit(2); });
