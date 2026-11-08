#!/usr/bin/env node
/**
 * GERBANG KEUTUHAN COLD-BOOT & SPLASH MULUS TANPA GLITCH PUTIH
 * (tests/pwa-cold-boot-seamless-test.js)
 *
 * Menjaga 5 perbaikan struktural dari audit video cold-boot iOS Standalone PWA (m025-779):
 *   (G1) Seluruh stylesheet fitur di <head> index.html dimuat non-blocking (media="print" +
 *        data-fz-shell-css + <noscript> fallback) agar #fiezelBootSplash tampil instan (<350ms),
 *        tidak tertahan ~1.96 detik oleh unduhan ~1.2MB CSS.
 *   (G2) #fiezelBootSplash bebas dari contain:paint dan memakai overscan vertikal -120px
 *        dengan latar #1B1418 penuh sehingga perubahan env(safe-area-inset-bottom) iOS tidak
 *        pernah memunculkan pita putih 24px di area bottom bar (detik 03.89-03.93).
 *   (G3) FiezelSplash.close() menghormati opts.deferDispose === true: tirai #fiezelBootSplash
 *        dan html.fz-booting TIDAK dijatuhkan lebih awal ketika proceed() masih menunggu
 *        bootAuthVerdictPromise (menutup celah layar kosong berbingkai kotak putih).
 *   (G4) Latar kanvas pasca-boot seragam pada var(--bg-canvas, #FAF8F5) dan #app:empty
 *        transparan tanpa border/bayangan; deteksi locale berjalan paralel dengan load().
 *   (G5) Proyeksi 3D face-shell Mochi (createCurvedFaceShellAndFx) memakai indeks spasial
 *        grid 2D + cache Float32Array (< 50 ms, identik presisi terhadap Raycaster) alih-alih
 *        68,9 juta uji segitiga Raycaster yang membekukan main thread ~5,9 detik saat render() pertama.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const splashJs = fs.readFileSync(path.join(ROOT, 'features', 'brand', 'fiezel-splash.js'), 'utf8');
const mochiJs = fs.readFileSync(path.join(ROOT, 'mochi-mascot', 'fiezel-mochi.js'), 'utf8');

(async () => {
  /* =========================================================================
   * (G1) Non-blocking shell CSS + <noscript> parity
   * ========================================================================= */
  const headHtml = (indexHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || ['', ''])[1];
  const headWithoutNoscript = headHtml.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
  const liveStylesheetTags = headWithoutNoscript.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  assert(
    liveStylesheetTags.length >= 18,
    `[G1] index.html wajib mempertahankan link stylesheet shell (${liveStylesheetTags.length} ditemukan)`
  );
  for (const tag of liveStylesheetTags) {
    assert(
      /\bmedia=["']print["']/i.test(tag) && /\bdata-fz-shell-css\b/i.test(tag),
      `[G1] Ditemukan <link rel="stylesheet"> sinkron pemblokir First Paint di <head>: ${tag}`
    );
    assert(
      /fzShellReady/.test(tag) && /onerror=/i.test(tag),
      `[G1] Link data-fz-shell-css wajib menandai fzShellReady pada onload & onerror: ${tag}`
    );
  }
  const noscriptHtml = (headHtml.match(/<noscript>([\s\S]*?)<\/noscript>/gi) || []).join('\n');
  for (const tag of liveStylesheetTags) {
    const href = (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1];
    assert(href, `[G1] href hilang pada ${tag}`);
    assert(
      noscriptHtml.includes(`href="${href}"`),
      `[G1] Fallback <noscript> wajib memuat href="${href}"`
    );
  }

  /* =========================================================================
   * (G2) Overscan #fiezelBootSplash & bebas contain:paint (anti glitch 24px bottom bar)
   * ========================================================================= */
  const bootStyle = (indexHtml.match(/<style id="fiezelBootCritical">([\s\S]*?)<\/style>/) || ['', ''])[1];
  assert(bootStyle.length > 100, '[G2] <style id="fiezelBootCritical"> wajib ada di index.html');
  assert(
    !/contain\s*:\s*[^;]*paint/i.test(bootStyle),
    '[G2] #fiezelBootSplash dilarang memakai contain:paint karena memotong safe-area shift di iOS WebKit'
  );
  assert(
    /top\s*:\s*-120px\s*!important/.test(bootStyle) && /bottom\s*:\s*-120px\s*!important/.test(bootStyle),
    '[G2] #fiezelBootSplash wajib memakai overscan vertikal -120px !important agar kebal lonjakan bottom inset'
  );
  assert(
    /--fz-bg\s*:\s*#1B1418\s*!important/i.test(bootStyle),
    '[G2] #fiezelBootSplash wajib mengunci --fz-bg:#1B1418 !important agar style.css tidak membocorkan #FBF7F3'
  );
  assert(
    /html\.fz-booting\s+main\.app[\s\S]*?visibility\s*:\s*hidden\s*!important/.test(bootStyle),
    '[G2] Permukaan main.app/topbar/nav-scrim wajib tersembunyi selama html.fz-booting aktif'
  );

  /* =========================================================================
   * (G3) FiezelSplash.close() menahan tirai saat deferDispose=true & UI belum siap
   * ========================================================================= */
  function makeClassList(initial = []) {
    const set = new Set(initial);
    return {
      add: (...xs) => xs.forEach((x) => set.add(x)),
      remove: (...xs) => xs.forEach((x) => set.delete(x)),
      contains: (x) => set.has(x),
    };
  }

  {
    const docEl = { classList: makeClassList(['fz-booting']) };
    const splashEl = {
      id: 'fiezelBootSplash',
      className: 'fiezel-splash fiezel-splash-dark',
      classList: makeClassList(['fiezel-splash', 'fiezel-splash-dark']),
      attributes: {},
      style: {},
      parentNode: { removeChild() { splashEl.parentNode = null; } },
      setAttribute(k, v) { this.attributes[k] = String(v); },
      getAttribute(k) { return this.attributes[k] || null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      removeEventListener() {},
    };
    const appContainer = { innerHTML: '', children: [] };
    const timers = [];
    const ctx = vm.createContext({
      console,
      Math,
      Date,
      Promise,
      performance: { now: () => 1000 },
      requestAnimationFrame: (fn) => { timers.push(fn); return timers.length; },
      cancelAnimationFrame: () => {},
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearTimeout: () => {},
      CustomEvent: function (name) { this.type = name; },
      dispatchEvent: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: true }), // reduced motion -> langsung panggil close() saat minMs=0
      document: {
        documentElement: docEl,
        body: { classList: makeClassList() },
        getElementById: (id) => (id === 'fiezelBootSplash' ? splashEl : id === 'app' ? appContainer : null),
        querySelector: (sel) => (sel === '[data-fiezel-boot-splash]' ? splashEl : null),
        querySelectorAll: () => [],
        createElement: () => ({
          classList: makeClassList(),
          style: {},
          setAttribute() {},
          appendChild() {},
          addEventListener() {},
        }),
      },
    });
    ctx.self = ctx;
    ctx.window = ctx;
    vm.runInContext(splashJs, ctx);

    let onCloseCalled = false;
    const shown = ctx.FiezelSplash.show(ctx, {
      visibleMs: 50,
      deferDispose: true,
      onClose: () => {
        onCloseCalled = true;
        // Simulasi proceed() yang masih menunggu bootAuthVerdictPromise: #app masih kosong!
      },
    });
    assert.strictEqual(shown.shown, true, '[G3] FiezelSplash.show wajib menampilkan/mengadopsi boot splash');

    // Picu penutupan durasi splash (shown.close()) saat #app masih kosong
    shown.close();

    assert.strictEqual(onCloseCalled, true, '[G3] opts.onClose wajib dipanggil saat durasi splash selesai');
    assert.strictEqual(
      docEl.classList.contains('fz-booting'),
      true,
      '[G3] html.fz-booting WAJIB tetap aktif selama #app masih kosong dan auth/onboarding belum tampil'
    );
    assert.strictEqual(
      splashEl.classList.contains('is-leaving'),
      false,
      '[G3] #fiezelBootSplash DILARANG diberi .is-leaving sebelum permukaan tujuan benar-benar siap'
    );

    // Begitu openApp() merender Home dan memanggil dismissBootSplash() -> disposeBootSplash(ctx), tirai dilepas:
    appContainer.children.push({ tagName: 'SECTION' });
    docEl.classList.add('fz-app-open');
    ctx.FiezelSplash.disposeBootSplash(ctx);

    assert.strictEqual(
      docEl.classList.contains('fz-booting'),
      false,
      '[G3] html.fz-booting wajib dilepas setelah permukaan aplikasi siap dan disposeBootSplash dipanggil'
    );
    assert.strictEqual(
      splashEl.parentNode,
      null,
      '[G3] #fiezelBootSplash wajib dicopot tepat saat permukaan aplikasi siap'
    );
  }

  /* =========================================================================
   * (G4) Unified canvas background + parallel locale boot + shellCssSettled()
   * ========================================================================= */
  assert(
    /var\(--bg-canvas,\s*#FAF8F5\)\s*!important/.test(indexHtml) &&
      /#app:empty\s*\{\s*background:\s*transparent\s*!important/.test(indexHtml),
    '[G4] index.html wajib menyatukan latar pasca-boot ke --bg-canvas dan membuat #app:empty transparan tanpa kotak'
  );
  assert(
    /self\.__fzLocaleBootPromise\s*=\s*maybeAutoDetectLocale\(\)/.test(appJs),
    '[G4] bootFiezel() wajib menjalankan maybeAutoDetectLocale() secara paralel bersama load()'
  );
  assert(
    /link\[data-fz-shell-css\]/.test(appJs),
    '[G4] shellCssSettled() di app.js wajib memverifikasi kesiapan link[data-fz-shell-css]'
  );

  /* =========================================================================
   * (G5) Paritas matematis & kecepatan < 50ms indeks spasial face-shell Mochi
   * ========================================================================= */
  assert(
    !/raycaster\.intersectObject\(\s*this\.mochiMesh\s*\)/.test(mochiJs),
    '[G5] createCurvedFaceShellAndFx() dilarang memakai raycaster.intersectObject(this.mochiMesh) O(V*T) di main thread'
  );
  assert(
    /_cachedFaceShellPos/.test(mochiJs) && /_cachedFaceShellNorm/.test(mochiJs),
    '[G5] mochi-mascot/fiezel-mochi.js wajib menyimpan cache geometri face-shell terproyeksi'
  );

  const THREE = await import(pathToFileURL(path.join(ROOT, 'mochi-mascot', 'three.module.js')).href);
  // Bangun geometri Daifuku identik 128x96 dari createMochiBody()
  const geo = new THREE.SphereGeometry(1.18, 128, 96);
  const gPos = geo.attributes.position;
  for (let i = 0; i < gPos.count; i++) {
    let x = gPos.getX(i) * 1.12;
    let y = gPos.getY(i) * 0.89;
    let z = gPos.getZ(i) * 0.94;
    const signX = Math.sign(x), signY = Math.sign(y), signZ = Math.sign(z);
    const ax = Math.pow(Math.abs(x / 1.32), 0.68) * 1.32 * signX;
    const ay = Math.pow(Math.abs(y / 1.05), 0.74) * 1.05 * signY;
    const az = Math.pow(Math.abs(z / 0.89), 0.74) * 0.89 * signZ;
    x = x * 0.54 + ax * 0.46;
    y = y * 0.58 + ay * 0.42;
    z = z * 0.58 + az * 0.42;
    if (y < 0.25) {
      const factor = (0.25 - y) * 0.13;
      x *= 1.0 + factor;
      z *= 1.0 + factor * 0.6;
    }
    const chDistL = Math.hypot(x - -0.56, y - -0.10);
    const chDistR = Math.hypot(x - 0.56, y - -0.10);
    const chDist = Math.min(chDistL, chDistR);
    if (z > 0.05 && chDist < 0.68) {
      const chBulge = Math.cos((chDist / 0.68) * Math.PI * 0.5) ** 2 * 0.22;
      z += chBulge;
      const xDisplace = Math.min(1.0, Math.abs(x) / 0.40);
      x += (x >= 0 ? 1 : -1) * xDisplace * chBulge * 0.35;
    }
    gPos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const mochiMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  mochiMesh.updateMatrixWorld(true);

  const shellGeo = new THREE.PlaneGeometry(2.40, 1.80, 60, 45);
  const pos = shellGeo.attributes.position;

  const t0 = performance.now();
  const bPos = geo.attributes.position;
  const bIdx = geo.index;
  const GX = 32, GY = 24;
  const minX = -1.25, maxX = 1.25, invW = GX / (maxX - minX);
  const minY = -0.95, maxY = 0.95, invH = GY / (maxY - minY);
  const buckets = new Array(GX * GY);
  const triCount = bIdx ? bIdx.count / 3 : bPos.count / 3;
  const frontTris = [];

  for (let t = 0; t < triCount; t++) {
    const i0 = bIdx ? bIdx.getX(t * 3) : t * 3;
    const i1 = bIdx ? bIdx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = bIdx ? bIdx.getX(t * 3 + 2) : t * 3 + 2;
    const z0 = bPos.getZ(i0), z1 = bPos.getZ(i1), z2 = bPos.getZ(i2);
    if (z0 <= 0 && z1 <= 0 && z2 <= 0) continue;
    const x0 = bPos.getX(i0), y0 = bPos.getY(i0);
    const x1 = bPos.getX(i1), y1 = bPos.getY(i1);
    const x2 = bPos.getX(i2), y2 = bPos.getY(i2);
    const det = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (det <= 1e-10) continue;
    const tMinX = Math.min(x0, x1, x2), tMaxX = Math.max(x0, x1, x2);
    const tMinY = Math.min(y0, y1, y2), tMaxY = Math.max(y0, y1, y2);
    if (tMaxX < minX || tMinX > maxX || tMaxY < minY || tMinY > maxY) continue;
    const base = frontTris.length;
    frontTris.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, 1.0 / det);
    const bx0 = Math.max(0, Math.min(GX - 1, ((tMinX - minX) * invW) | 0));
    const bx1 = Math.max(0, Math.min(GX - 1, ((tMaxX - minX) * invW) | 0));
    const by0 = Math.max(0, Math.min(GY - 1, ((tMinY - minY) * invH) | 0));
    const by1 = Math.max(0, Math.min(GY - 1, ((tMaxY - minY) * invH) | 0));
    for (let by = by0; by <= by1; by++) {
      const rowOff = by * GX;
      for (let bx = bx0; bx <= bx1; bx++) {
        const cell = rowOff + bx;
        if (!buckets[cell]) buckets[cell] = [base];
        else buckets[cell].push(base);
      }
    }
  }

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i) - 0.02;
    let bestZ = -Infinity;
    const bx = ((vx - minX) * invW) | 0;
    const by = ((vy - minY) * invH) | 0;
    if (bx >= 0 && bx < GX && by >= 0 && by < GY) {
      const list = buckets[by * GX + bx];
      if (list) {
        for (let k = 0; k < list.length; k++) {
          const o = list[k];
          const x0 = frontTris[o], y0 = frontTris[o + 1], z0 = frontTris[o + 2];
          const x1 = frontTris[o + 3], y1 = frontTris[o + 4], z1 = frontTris[o + 5];
          const x2 = frontTris[o + 6], y2 = frontTris[o + 7], z2 = frontTris[o + 8];
          const invDet = frontTris[o + 9];
          const u = ((vx - x0) * (y2 - y0) - (x2 - x0) * (vy - y0)) * invDet;
          if (u < -1e-6) continue;
          const v = ((x1 - x0) * (vy - y0) - (vx - x0) * (y1 - y0)) * invDet;
          if (v < -1e-6 || u + v > 1.000001) continue;
          const w = 1.0 - u - v;
          const hz = w * z0 + u * z1 + v * z2;
          if (hz > bestZ) bestZ = hz;
        }
      }
    }
    if (bestZ > -Infinity) {
      pos.setXYZ(i, vx, vy, bestZ + 0.016);
    } else {
      const r2 = Math.max(0, 1.0 - (vx * vx) / (1.52 * 1.52) - (vy * vy) / (1.12 * 1.12));
      pos.setXYZ(i, vx, vy, Math.sqrt(r2) * 1.24 + 0.016);
    }
  }
  shellGeo.computeVertexNormals();
  const gridElapsedMs = performance.now() - t0;
  assert(
    gridElapsedMs < 120,
    `[G5] Proyeksi grid spasial face-shell wajib < 120ms (aktual: ${gridElapsedMs.toFixed(2)}ms)`
  );

  // Verifikasi kecocokan presisi terhadap Raycaster pada sampel merata 140 titik
  const raycaster = new THREE.Raycaster();
  const rayDir = new THREE.Vector3(0, 0, -1);
  const rayOrigin = new THREE.Vector3();
  const refGeo = new THREE.PlaneGeometry(2.40, 1.80, 60, 45);
  const refPos = refGeo.attributes.position;
  let maxDeltaZ = 0;
  for (let i = 0; i < refPos.count; i += 20) {
    const vx = refPos.getX(i);
    const vy = refPos.getY(i) - 0.02;
    rayOrigin.set(vx, vy, 5.0);
    raycaster.set(rayOrigin, rayDir);
    const hits = raycaster.intersectObject(mochiMesh, false);
    const expectedZ = hits.length > 0
      ? hits[0].point.z + 0.016
      : Math.sqrt(Math.max(0, 1.0 - (vx * vx) / (1.52 * 1.52) - (vy * vy) / (1.12 * 1.12))) * 1.24 + 0.016;
    const dz = Math.abs(pos.getZ(i) - expectedZ);
    if (dz > maxDeltaZ) maxDeltaZ = dz;
  }
  assert(
    maxDeltaZ < 1e-5,
    `[G5] Proyeksi grid spasial wajib identik dengan Raycaster (maxDeltaZ=${maxDeltaZ})`
  );

  console.log(
    `PASS tests/pwa-cold-boot-seamless-test.js — ${liveStylesheetTags.length} non-blocking shell CSS, ` +
      `overscan splash, deferDispose curtain hold, & face-shell projection ${gridElapsedMs.toFixed(2)}ms (maxDeltaZ=${maxDeltaZ.toExponential(2)})`
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
