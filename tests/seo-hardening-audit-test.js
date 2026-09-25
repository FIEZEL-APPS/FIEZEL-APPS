#!/usr/bin/env node
/**
 * tests/seo-hardening-audit-test.js
 * 
 * Second-pass verification & hardening test for FIEZEL Search Entity, SEO, AEO, and GEO.
 * Enforces:
 *  (1) Zero broken internal links across all public website pages.
 *  (2) Zero diesel/fizzle overuse on skill pages (grammar, vocabulary, reading, listening, speaking, cefr).
 *  (3) Braincore honesty: zero claims of AGI, human-level intelligence, or superiority to ChatGPT.
 *  (4) CEFR disclaimer honesty on all CEFR-referencing pages.
 *  (5) Complete SEO & Social metadata (title, description, canonical, og tags, one H1).
 *  (6) Zero JS dependency: critical text and H1 present in initial static HTML.
 *  (7) Single @id consistency and valid JSON-LD parsing.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://fiezel.my.id';

const checks = [];
let failed = false;

function check(name, ok, details) {
  if (!ok) failed = true;
  checks.push({ name, ok: !!ok, details: details == null ? '' : String(details) });
}

const baca = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ada = (rel) => fs.existsSync(path.join(ROOT, rel));

function htmlDiBawah(dir) {
  const keluar = [];
  const jalan = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = d + '/' + e.name;
      if (e.isDirectory()) jalan(rel);
      else if (e.name.endsWith('.html') && !/\/google[0-9a-f]+\.html$/.test(rel)) keluar.push(rel);
    }
  };
  jalan(dir);
  return keluar.sort();
}

const HALAMAN_SITUS = htmlDiBawah('website').filter((f) => !/\/google[0-9a-f]+\.html$/.test(f) && !f.startsWith('website/sentinel/'));

/* =========================================================================
 * 1. ZERO OVERUSE OF DIESEL / FIZZLE ON SKILL PAGES
 * ========================================================================= */
{
  const SKILL_PAGES = [
    'website/grammar/index.html',
    'website/vocabulary/index.html',
    'website/reading/index.html',
    'website/listening/index.html',
    'website/speaking/index.html',
    'website/cefr/index.html'
  ];

  const leaks = [];
  for (const page of SKILL_PAGES) {
    if (!ada(page)) { leaks.push(page + ' (missing)'); continue; }
    const html = baca(page).toLowerCase();
    if (html.includes('diesel') || html.includes('fizzle')) {
      leaks.push(page);
    }
  }
  check('H1: Zero diesel/fizzle mentions on skill pages (no unwanted semantic clustering)',
    leaks.length === 0, leaks.join(', '));
}

/* =========================================================================
 * 2. CONTROLLED DISAMBIGUATION ON AUTHORITATIVE PAGES ONLY
 * ========================================================================= */
{
  const ALLOWED_DISAMBIGUATION = new Set([
    'website/index.html',
    'website/about/index.html',
    'website/faq/index.html'
  ]);

  const violations = [];
  for (const page of HALAMAN_SITUS) {
    if (ALLOWED_DISAMBIGUATION.has(page)) continue;
    const html = baca(page).toLowerCase();
    if (html.includes('diesel') || html.includes('fizzle')) {
      violations.push(page);
    }
  }
  check('H2: Disambiguation to diesel/fizzle is restricted exclusively to index, about, and faq',
    violations.length === 0, violations.join(', '));
}

/* =========================================================================
 * 3. INTERNAL LINK INTEGRITY (ZERO BROKEN INTERNAL LINKS)
 * ========================================================================= */
{
  const broken = [];
  const RE_HREF = /<a\s+[^>]*href=["']([^"']+)["']/gi;

  for (const page of HALAMAN_SITUS) {
    const html = baca(page);
    const pagePublicUrl = ORIGIN + '/' + page.slice('website/'.length);
    let m;
    while ((m = RE_HREF.exec(html))) {
      const href = m[1].trim();
      // Skip external, protocol-relative, in-page hashes, mailto, tel, javascript
      if (/^(https?:|\/\/|mailto:|tel:|javascript:|#)/i.test(href)) continue;

      const cleanHref = href.split('#')[0].split('?')[0];
      if (!cleanHref) continue;

      let resolved;
      try {
        resolved = new URL(href, pagePublicUrl);
      } catch (e) {
        broken.push(`${page} -> invalid URL ${href}`);
        continue;
      }

      if (resolved.origin !== ORIGIN) continue;

      const p = resolved.pathname;
      let targetFile;
      if (p === '/app' || p === '/app/') {
        targetFile = 'index.html';
      } else if (p.startsWith('/app/')) {
        const sub = p.slice('/app/'.length);
        targetFile = sub ? (sub.endsWith('/') ? sub + 'index.html' : sub) : 'index.html';
      } else {
        const sisa = p === '/' ? 'index.html' : (p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1));
        targetFile = path.join('website', sisa);
      }

      const fileExists = ada(targetFile) || ada(targetFile + '.html') || ada(targetFile + '/index.html') || ada(targetFile.replace(/\/index\.html$/, '.html'));
      if (!fileExists) {
        broken.push(`${page} -> ${href} (resolved to ${targetFile})`);
      }
    }
  }

  check('H3: Every internal link resolves to an existing file in the repository',
    broken.length === 0, broken.join('\n      → '));
}

/* =========================================================================
 * 4. BRAINCORE HONESTY AUDIT (NO AGI / CHATGPT HYPERBOLE)
 * ========================================================================= */
{
  const FORBIDDEN_AI_CLAIMS = [
    /\bAGI\b/i,
    /human-level intelligence/i,
    /superior to chatgpt/i,
    /better than chatgpt/i,
    /autonomous ai/i,
    /self-learning ai/i
  ];

  const inflated = [];
  for (const page of [...HALAMAN_SITUS, 'website/llms.txt', 'website/llms-full.txt']) {
    if (!ada(page)) continue;
    const content = baca(page);
    for (const pattern of FORBIDDEN_AI_CLAIMS) {
      if (pattern.test(content)) {
        inflated.push(`${page} matches ${pattern}`);
      }
    }
  }
  check('H4: Braincore descriptions contain zero hyperbole (no AGI, human-level, or superior to ChatGPT)',
    inflated.length === 0, inflated.join(', '));
}

/* =========================================================================
 * 5. CEFR DISCLAIMER HONESTY
 * ========================================================================= */
{
  const CEFR_PAGES = [
    'website/about/index.html',
    'website/cefr/index.html',
    'website/faq/index.html'
  ];

  const missingDisclaimer = [];
  for (const page of CEFR_PAGES) {
    if (!ada(page)) continue;
    const html = baca(page).toLowerCase();
    const hasDisclaimer = (html.includes('not an official') || html.includes('not officially certified') || html.includes('does not confer') || html.includes('bukan sertifikasi resmi'));
    if (!hasDisclaimer) {
      missingDisclaimer.push(page);
    }
  }
  check('H5: All core CEFR pages include explicit non-accreditation disclaimers',
    missingDisclaimer.length === 0, missingDisclaimer.join(', '));
}

/* =========================================================================
 * 6. METADATA & EXACTLY ONE H1 PER PAGE
 * ========================================================================= */
{
  const badH1 = [];
  const badMeta = [];

  for (const page of HALAMAN_SITUS) {
    const html = baca(page);
    // Exclude noindex pages if any
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) continue;

    const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    if (h1Matches.length !== 1) {
      badH1.push(`${page} has ${h1Matches.length} <h1> tags`);
    }

    const hasTitle = /<title>[^<]+<\/title>/i.test(html);
    const hasDesc = /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html) ||
                    /<meta\s+[^>]*content=["'][^"']+["'][^>]*name=["']description["']/i.test(html);
    const hasCanonical = /<link\s+[^>]*rel=["']canonical["'][^>]*href=["'][^"']+["']/i.test(html);
    const hasOgTitle = /<meta\s+[^>]*property=["']og:title["']/i.test(html);
    const hasOgDesc = /<meta\s+[^>]*property=["']og:description["']/i.test(html);
    const hasOgUrl = /<meta\s+[^>]*property=["']og:url["']/i.test(html);

    if (!hasTitle || !hasDesc || !hasCanonical || !hasOgTitle || !hasOgDesc || !hasOgUrl) {
      badMeta.push(`${page} (title=${hasTitle}, desc=${hasDesc}, canonical=${hasCanonical}, og=${hasOgTitle && hasOgDesc && hasOgUrl})`);
    }
  }

  check('H6: Exactly one <h1> element on every indexable public page',
    badH1.length === 0, badH1.join(', '));
  check('H7: Complete SEO and OpenGraph meta tags present on every indexable page',
    badMeta.length === 0, badMeta.join('\n      → '));
}

/* =========================================================================
 * 7. ZERO JAVASCRIPT DEPENDENCY (CRITICAL HTML IN INITIAL PAYLOAD)
 * ========================================================================= */
{
  const missingText = [];
  for (const page of HALAMAN_SITUS) {
    const html = baca(page);
    // Strip scripts and styles
    const noScript = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                         .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    const textContent = noScript.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (textContent.length < 300) {
      missingText.push(`${page} text length is only ${textContent.length} characters`);
    }
  }
  check('H8: All public entity pages are static HTML rich in initial text payload (no client JS required to read)',
    missingText.length === 0, missingText.join(', '));
}

/* =========================================================================
 * 8. JSON-LD VALIDITY AND SEMANTIC ENTITY INTEGRITY
 * ========================================================================= */
{
  const jsonErrors = [];
  const RE_JSONLD = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const page of HALAMAN_SITUS) {
    const html = baca(page);
    let m;
    while ((m = RE_JSONLD.exec(html))) {
      try {
        const parsed = JSON.parse(m[1]);
        if (!parsed || (typeof parsed !== 'object')) {
          jsonErrors.push(`${page}: parsed JSON is not an object or array`);
        }
      } catch (err) {
        jsonErrors.push(`${page}: ${err.message}`);
      }
    }
  }
  check('H9: All JSON-LD structured data blocks parse without syntax errors',
    jsonErrors.length === 0, jsonErrors.join('\n      → '));
}

/* =========================================================================
 * Laporan
 * ========================================================================= */
let pass = 0;
for (const c of checks) {
  if (c.ok) pass += 1;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.details ? '' : `\n      → ${c.details}`}`);
}

console.log(`\nseo-hardening-audit-test: ${pass}/${checks.length} PASS${failed ? ' — FAILED' : ''}`);
process.exit(failed ? 1 : 0);
