#!/usr/bin/env node
/**
 * tools/dev/surface-transition-leak-probe.js
 * Probe empirical untuk mengaudit transisi permukaan visual, kebocoran CSS, dan z-index.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const pw = (() => {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
})();
if (!pw) { console.error('playwright tidak ditemukan'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(buf);
  });
});

async function runProbe() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Probe Server] Listening on ${baseUrl}`);

  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const report = {
    splashExitAudit: null,
    shellCloakAudit: null,
    teacherModeAudit: null,
    authGateEntranceAudit: null,
    zIndexHierarchy: null
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });

    const page = await context.newPage();

    // 1. Audit Z-Index & CSS Rules directly by loading index.html
    console.log('\n--- 1. AUDITING STATIC DOM & Z-INDEX HIERARCHY ---');
    await page.goto(`${baseUrl}/index.html?probe=1`, { waitUntil: 'domcontentloaded' });

    report.zIndexHierarchy = await page.evaluate(() => {
      const getZ = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          selector: sel,
          zIndex: style.zIndex,
          position: style.position,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          background: style.backgroundColor || style.background
        };
      };

      return {
        bootSplash: getZ('#fiezelBootSplash'),
        globalSky: getZ('#globalSky'),
        topbar: getZ('header.topbar'),
        bottomnav: getZ('nav.bottomnav'),
        navScrim: getZ('.nav-scrim'),
        app: getZ('#app'),
        modal: getZ('#modal'),
        welcome: getZ('#welcome'),
        authGate: getZ('#authGate')
      };
    });

    console.log('Computed Z-Index Hierarchy:', JSON.stringify(report.zIndexHierarchy, null, 2));

    // 2. Audit Splash Leaving Transition & Sudden display:none
    console.log('\n--- 2. AUDITING SPLASH LEAVING TRANSITION BEHAVIOR ---');
    report.splashExitAudit = await page.evaluate(() => {
      const splash = document.getElementById('fiezelBootSplash');
      const html = document.documentElement;

      // Condition 1: html has fz-booting (default boot)
      const bootingStyle = window.getComputedStyle(splash);
      const state1 = {
        htmlClass: html.className,
        display: bootingStyle.display,
        visibility: bootingStyle.visibility,
        opacity: bootingStyle.opacity,
        zIndex: bootingStyle.zIndex
      };

      // Condition 2: simulate endBootBackground removing fz-booting, BEFORE adding is-leaving
      html.classList.remove('fz-booting');
      const noBootingStyle = window.getComputedStyle(splash);
      const state2 = {
        htmlClass: html.className,
        display: noBootingStyle.display,
        visibility: noBootingStyle.visibility,
        opacity: noBootingStyle.opacity
      };

      // Condition 3: simulate adding is-leaving
      splash.classList.add('is-leaving');
      const isLeavingStyle = window.getComputedStyle(splash);
      const state3 = {
        htmlClass: html.className,
        splashClass: splash.className,
        display: isLeavingStyle.display,
        visibility: isLeavingStyle.visibility,
        opacity: isLeavingStyle.opacity,
        animationName: isLeavingStyle.animationName,
        animationDuration: isLeavingStyle.animationDuration,
        transform: isLeavingStyle.transform
      };

      return { state1_booting: state1, state2_no_booting: state2, state3_is_leaving: state3 };
    });

    console.log('Splash Exit Audit:', JSON.stringify(report.splashExitAudit, null, 2));

    // 3. Audit Shell Cloak before render (html:not(.fz-app-open))
    console.log('\n--- 3. AUDITING SHELL CLOAK & PRE-RENDER LEAKAGE ---');
    report.shellCloakAudit = await page.evaluate(() => {
      const html = document.documentElement;
      html.classList.remove('fz-booting');
      html.classList.remove('fz-app-open');

      const topbar = document.querySelector('header.topbar');
      const bottomnav = document.querySelector('nav.bottomnav');
      const navScrim = document.querySelector('.nav-scrim');
      const app = document.querySelector('#app');
      const body = document.body;

      return {
        htmlClass: html.className,
        bodyBg: window.getComputedStyle(body).backgroundColor,
        topbar: {
          display: window.getComputedStyle(topbar).display,
          visibility: window.getComputedStyle(topbar).visibility
        },
        bottomnav: {
          display: window.getComputedStyle(bottomnav).display,
          visibility: window.getComputedStyle(bottomnav).visibility
        },
        navScrim: {
          display: window.getComputedStyle(navScrim).display,
          visibility: window.getComputedStyle(navScrim).visibility,
          height: window.getComputedStyle(navScrim).height,
          background: window.getComputedStyle(navScrim).background
        },
        app: {
          display: window.getComputedStyle(app).display,
          visibility: window.getComputedStyle(app).visibility
        }
      };
    });

    console.log('Shell Cloak Audit:', JSON.stringify(report.shellCloakAudit, null, 2));

    // 4. Audit Teacher Mode FOUC (Before teacher-shell.css finishes loading)
    console.log('\n--- 4. AUDITING TEACHER MODE TRANSITION LEAKAGE ---');
    report.teacherModeAudit = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;

      // Simulate teacher mode entered and render() called, BUT teacher-shell.css is NOT yet loaded
      body.classList.add('fz-teacher-mode');
      html.classList.add('fz-app-open');

      const topbar = document.querySelector('header.topbar');
      const bottomnav = document.querySelector('nav.bottomnav');
      const navScrim = document.querySelector('.nav-scrim');

      return {
        bodyClass: body.className,
        htmlClass: html.className,
        topbar: {
          display: window.getComputedStyle(topbar).display,
          visibility: window.getComputedStyle(topbar).visibility
        },
        bottomnav: {
          display: window.getComputedStyle(bottomnav).display,
          visibility: window.getComputedStyle(bottomnav).visibility
        },
        navScrim: {
          display: window.getComputedStyle(navScrim).display,
          visibility: window.getComputedStyle(navScrim).visibility
        }
      };
    });

    console.log('Teacher Mode Audit (without teacher-shell.css):', JSON.stringify(report.teacherModeAudit, null, 2));

    // 5. Audit Auth Gate Screen Entrance (fzAuthIn opacity 0)
    console.log('\n--- 5. AUDITING AUTH GATE ENTRANCE TRANSITION ---');
    report.authGateEntranceAudit = await page.evaluate(() => {
      const body = document.body;
      const host = document.createElement('div');
      host.className = 'fz-auth';
      body.appendChild(host);
      body.classList.add('fz-auth-open');

      const authStyle = window.getComputedStyle(host);
      const topbar = document.querySelector('header.topbar');
      const bottomnav = document.querySelector('nav.bottomnav');
      const navScrim = document.querySelector('.nav-scrim');

      const res = {
        authZIndex: authStyle.zIndex,
        authPosition: authStyle.position,
        authAnimation: authStyle.animationName,
        authBg: authStyle.backgroundColor,
        topbarDisplay: window.getComputedStyle(topbar).display,
        topbarVisibility: window.getComputedStyle(topbar).visibility,
        bottomnavDisplay: window.getComputedStyle(bottomnav).display,
        bottomnavVisibility: window.getComputedStyle(bottomnav).visibility,
        navScrimDisplay: window.getComputedStyle(navScrim).display,
        navScrimVisibility: window.getComputedStyle(navScrim).visibility
      };

      host.remove();
      body.classList.remove('fz-auth-open');
      return res;
    });

    console.log('Auth Gate Entrance Audit:', JSON.stringify(report.authGateEntranceAudit, null, 2));

  } finally {
    await browser.close();
    server.close();
  }

  return report;
}

runProbe().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
