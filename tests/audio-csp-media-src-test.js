#!/usr/bin/env node
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const results = [];
let failures = 0;

function check(name, ok, details) {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', details: details || '' });
  if (!ok) {
    failures += 1;
    console.error(`  ✗ ${name}: ${details || 'failed'}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

function parseMediaSrcTokens(cspMeta) {
  if (!cspMeta) return null;
  const directives = cspMeta.split(';').map(d => d.trim()).filter(Boolean);
  for (const dir of directives) {
    const parts = dir.split(/\s+/);
    if (parts[0].toLowerCase() === 'media-src') {
      return parts.slice(1);
    }
  }
  return null;
}

function extractOriginsFromManifest(manifest) {
  const origins = new Set();
  if (manifest && typeof manifest.assetBaseUrl === 'string' && manifest.assetBaseUrl.startsWith('http')) {
    try { origins.add(new URL(manifest.assetBaseUrl).origin); } catch (_) {}
  }
  if (manifest && manifest.assets) {
    for (const key of Object.keys(manifest.assets)) {
      const u = manifest.assets[key]?.url;
      if (typeof u === 'string' && u.startsWith('http')) {
        try { origins.add(new URL(u).origin); } catch (_) {}
      }
    }
  }
  return origins;
}

function extractOriginsFromConfig(coreConfigSrc, cfTransportSrc) {
  const origins = new Set();
  // core-config.js FIEZEL_CF_CONFIG.base
  const baseMatch = coreConfigSrc.match(/base:\s*['"](https:\/\/[^'"]+)['"]/);
  if (baseMatch) {
    try { origins.add(new URL(baseMatch[1]).origin); } catch (_) {}
  }
  // cf transport AUDIO_PUBLIC_BASE (audio.fiezel.my.id)
  const audioBaseMatch = cfTransportSrc.match(/https:\/\/audio\.fiezel\.my\.id/);
  if (audioBaseMatch) {
    origins.add('https://audio.fiezel.my.id');
  }
  return origins;
}

function validateMediaSrc(mediaTokens, requiredOrigins) {
  if (!mediaTokens || !Array.isArray(mediaTokens)) {
    return { ok: false, reason: 'media-src directive missing or empty' };
  }
  const tokenSet = new Set(mediaTokens);

  // Check wildcards
  if (tokenSet.has('*') || tokenSet.has('https:') || tokenSet.has('http:')) {
    return { ok: false, reason: 'Wildcard or generic scheme in media-src is strictly forbidden' };
  }

  // Check required standard sources
  for (const std of ["'self'", 'blob:', 'data:']) {
    if (!tokenSet.has(std)) {
      return { ok: false, reason: `Standard source ${std} missing from media-src` };
    }
  }

  // Check required origins
  for (const origin of requiredOrigins) {
    if (!tokenSet.has(origin)) {
      return { ok: false, reason: `Required origin ${origin} missing from media-src` };
    }
  }

  return { ok: true };
}

// 1. Baca index.html CSP
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cspMatch = indexHtml.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content="([^"]+)"/i)
  || indexHtml.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content='([^']+)'/i)
  || indexHtml.match(/<meta[^>]+content="([^"]+)"[^>]+http-equiv=["']Content-Security-Policy["']/i)
  || indexHtml.match(/<meta[^>]+content='([^']+)'[^>]+http-equiv=["']Content-Security-Policy["']/i);

check('index.html mendefinisikan Content-Security-Policy meta tag', !!cspMatch, 'meta CSP ditemukan');

const cspContent = cspMatch ? cspMatch[1] : '';
const mediaTokens = parseMediaSrcTokens(cspContent);
check('CSP index.html memuat direktif media-src', Array.isArray(mediaTokens) && mediaTokens.length > 0, mediaTokens ? mediaTokens.join(' ') : 'none');

// 2. Inventaris origin manifest
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/manifest.json'), 'utf8'));
const manifestOrigins = extractOriginsFromManifest(manifest);
check('Manifest audio memiliki assetBaseUrl yang sah', manifestOrigins.size > 0, Array.from(manifestOrigins).join(', '));

// 3. Inventaris origin Cloudflare transport & config
const coreConfigSrc = fs.readFileSync(path.join(ROOT, 'core-config.js'), 'utf8');
const cfTransportSrc = fs.readFileSync(path.join(ROOT, 'features/neural-voice/fiezel-cf-tts-transport.js'), 'utf8');
const cfOrigins = extractOriginsFromConfig(coreConfigSrc, cfTransportSrc);
check('Transport Cloudflare & config memiliki origin audio yang sah', cfOrigins.size > 0, Array.from(cfOrigins).join(', '));

// 4. Gabungkan seluruh origin yang diwajibkan
const allRequiredOrigins = new Set([...manifestOrigins, ...cfOrigins]);
const validationResult = validateMediaSrc(mediaTokens, allRequiredOrigins);
check('Seluruh origin audio terdaftar persis di media-src tanpa wildcard', validationResult.ok, validationResult.reason);

// 5. Verifikasi kepatuhan: gerbang ini HARUS GAGAL bila manifest berganti origin tanpa CSP diperbarui
{
  const simulatedChangedOrigins = new Set([...allRequiredOrigins, 'https://fiezel-audio-v2.another-worker.dev']);
  const failCheck = validateMediaSrc(mediaTokens, simulatedChangedOrigins);
  check('Gerbang terbukti mendeteksi dan menolak origin baru manifest yang belum masuk CSP',
    !failCheck.ok && failCheck.reason.includes('https://fiezel-audio-v2.another-worker.dev'),
    failCheck.reason);
}

// 6. Verifikasi penolakan wildcard
{
  const wildcardTokens = ["'self'", 'blob:', 'data:', 'https:', ...allRequiredOrigins];
  const failWildcard = validateMediaSrc(wildcardTokens, allRequiredOrigins);
  check('Gerbang menolak wildcard https: di media-src', !failWildcard.ok && failWildcard.reason.includes('forbidden'), failWildcard.reason);
}

const report = {
  status: failures === 0 ? 'PASS' : 'FAIL',
  counts: { pass: results.filter(r => r.status === 'PASS').length, fail: failures },
  requiredOrigins: Array.from(allRequiredOrigins),
  mediaSrcTokens: mediaTokens
};
console.log(JSON.stringify(report, null, 2));

if (failures > 0) {
  process.exit(1);
}
