#!/usr/bin/env node
/**
 * tools/edge-latency-probe.mjs — ukur latensi jembatan edge `api.fiezel.my.id`.
 *
 * KENAPA ADA. Klaim "hop PHP mahal" sebelumnya hanya punya angka sekali-tembak
 * (`/health` 2.214 ms dingin, 847-1.163 ms hangat) yang dicatat manual. Satu angka
 * tidak bisa membuktikan sebuah perbaikan: ia tidak punya sebaran, tidak punya p95,
 * dan tidak memisahkan dingin dari hangat. Berkas ini membuat klaim latensi bisa
 * dibantah — itu gunanya.
 *
 * SIFAT
 * - Node murni. Nol dependency, nol berkas konfigurasi, NOL RAHASIA: alat ini tidak
 *   pernah membaca env secret, tidak mengirim `X-Fiezel-Edge`, tidak mengirim cookie.
 *   Ia hanya menembak jalur PUBLIK dari luar, persis seperti murid.
 * - Target datang dari ARGUMEN, bukan dari nilai bawaan. Tanpa argumen ia mencetak
 *   cara pakai lalu keluar 2 — supaya ia tidak bisa tersangkut di CI dan menembak
 *   produksi pada setiap push.
 * - BUKAN gerbang CI. Ia berada di `tools/` dan namanya bukan `*-test.js` justru
 *   supaya `no-network-test.js` tidak perlu memberinya pengecualian: gerbang mutu
 *   tetap nol jaringan, alat ukur tetap alat ukur.
 *
 * PEMAKAIAN
 *   node tools/edge-latency-probe.mjs https://api.fiezel.my.id [--n=30] [--json=berkas]
 *   node tools/edge-latency-probe.mjs https://api.fiezel.my.id --baseline=SEBELUM.json
 *
 *   --n=N            jumlah permintaan per jalur (bawaan 20). Permintaan pertama
 *                    setiap jalur dilaporkan TERSENDIRI sebagai `cold` dan TIDAK
 *                    masuk hitungan p50/p95 — mencampurnya akan membuat p95 palsu
 *                    yang sebenarnya hanya biaya penyalaan proses PHP pertama.
 *   --json=BERKAS    tulis hasil mentah (untuk dipakai sebagai baseline nanti).
 *   --baseline=FILE  bandingkan dengan hasil sebelumnya dan cetak delta.
 *   --insecure       JANGAN dipakai untuk produksi; hanya untuk origin uji dengan
 *                    sertifikat sendiri. Ditandai jelas di keluaran.
 *
 * JALUR YANG DIUKUR — tiga, dan alasan masing-masing:
 *   /healthz     jawaban terkecil yang mungkin ({"ok":true,...}); ia mengukur biaya
 *                HOP-nya sendiri, hampir tanpa kerja Worker.
 *   /health      jawaban kecil tetapi rute terlindungi gerbang; pembanding langsung
 *                terhadap angka sejarah 2.214 ms / 847-1.163 ms.
 *   /api/config  satu baca KV di Worker; ia menunjukkan berapa dari total yang
 *                sesungguhnya milik Worker, bukan milik hop PHP.
 *
 * Bila respons membawa `Server-Timing` dari jembatan (edge_dns/edge_tcp/edge_tls/
 * upstream_ttfb/edge_total), uraian itu ikut dirangkum — di situlah pertanyaan
 * "handshake TLS atau Worker yang mahal?" dijawab dengan angka, bukan dengan opini.
 */

'use strict';

import { readFileSync, writeFileSync } from 'node:fs';

const PATHS = ['/healthz', '/health', '/api/config'];

function usage(msg) {
  if (msg) console.error('galat: ' + msg + '\n');
  console.error([
    'pemakaian:',
    '  node tools/edge-latency-probe.mjs <base-url> [--n=20] [--json=out.json] [--baseline=in.json] [--insecure]',
    '',
    'contoh:',
    '  node tools/edge-latency-probe.mjs https://api.fiezel.my.id --n=30 --json=A7-SEBELUM.json',
    '  node tools/edge-latency-probe.mjs https://api.fiezel.my.id --n=30 --baseline=A7-SEBELUM.json',
    '',
    'catatan: alat ini tidak mengirim cookie, tidak mengirim header rahasia, dan',
    'tidak membaca env apa pun. Ia hanya menembak jalur publik.'
  ].join('\n'));
  process.exit(2);
}

const argv = process.argv.slice(2);
if (!argv.length) usage(null);

let base = null;
let n = 20;
let jsonOut = null;
let baselineFile = null;
let insecure = false;
for (const arg of argv) {
  if (arg.startsWith('--n=')) n = Number(arg.slice(4));
  else if (arg.startsWith('--json=')) jsonOut = arg.slice(7);
  else if (arg.startsWith('--baseline=')) baselineFile = arg.slice(11);
  else if (arg === '--insecure') insecure = true;
  else if (arg.startsWith('--')) usage('argumen tidak dikenal: ' + arg);
  else if (base === null) base = arg.replace(/\/+$/, '');
  else usage('base URL ganda: ' + arg);
}
if (!base) usage('base URL wajib (mis. https://api.fiezel.my.id)');
if (!/^https?:\/\//.test(base)) usage('base URL harus diawali http:// atau https://');
if (!Number.isFinite(n) || n < 2 || n > 500) usage('--n harus 2..500');

// Angka p95 dari sampel kecil tidak berarti apa-apa. Ini bukan kesalahan yang boleh
// diam: kalau n kecil, keluaran HARUS mengaku bahwa p95-nya lemah.
const weakTail = n < 20;

/** Percentile dengan interpolasi terdekat-rendah; deterministik, nol dependency. */
function pct(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarize(samples) {
  const sorted = samples.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: sorted.length ? round(sorted[0]) : null,
    p50: round(pct(sorted, 50)),
    p95: round(pct(sorted, 95)),
    max: sorted.length ? round(sorted[sorted.length - 1]) : null,
    mean: sorted.length ? round(sum / sorted.length) : null
  };
}

const round = (v) => (v === null || v === undefined ? null : Math.round(v * 1000) / 1000);

/** Parse header `Server-Timing: nama;dur=1.2, lain;dur=3.4` menjadi objek ms. */
function parseServerTiming(header) {
  if (!header) return null;
  const out = {};
  for (const part of String(header).split(',')) {
    const m = /^\s*([A-Za-z0-9_\-]+)\s*;\s*dur\s*=\s*([0-9.]+)/.exec(part);
    if (m) out[m[1]] = Number(m[2]);
  }
  return Object.keys(out).length ? out : null;
}

async function once(url) {
  const started = process.hrtime.bigint();
  let status = 0;
  let bytes = 0;
  let timing = null;
  let error = null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      // Sengaja TIDAK mengirim cookie/credential apa pun: alat ukur tidak boleh
      // bisa membuat identitas atau menyentuh kuota murid.
      headers: { accept: 'application/json', 'accept-encoding': 'gzip' }
    });
    status = res.status;
    timing = parseServerTiming(res.headers.get('server-timing'));
    const body = await res.arrayBuffer();
    bytes = body.byteLength;
  } catch (err) {
    error = (err && err.message) ? err.message : String(err);
  }
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { ms, status, bytes, timing, error };
}

function mergeTiming(list) {
  const keys = new Set();
  for (const t of list) if (t) for (const k of Object.keys(t)) keys.add(k);
  if (!keys.size) return null;
  const out = {};
  for (const k of keys) {
    const vals = list.filter((t) => t && typeof t[k] === 'number').map((t) => t[k]);
    out[k] = summarize(vals);
  }
  return out;
}

(async () => {
  if (insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('PERINGATAN: --insecure aktif. Verifikasi TLS MATI. Jangan pakai angka ini untuk produksi.');
  }
  console.log('target      : ' + base);
  console.log('permintaan  : ' + n + ' per jalur (1 pertama dihitung sebagai `cold`, di luar p50/p95)');
  console.log('waktu       : ' + new Date().toISOString());
  if (weakTail) console.log('CATATAN     : n < 20, jadi p95 di bawah LEMAH secara statistik. Naikkan --n.');
  console.log('');

  const report = {
    schema: 'fiezel-edge-latency-probe-v1',
    generatedAt: new Date().toISOString(),
    target: base,
    requestsPerPath: n,
    weakTail,
    insecure,
    paths: {}
  };

  for (const p of PATHS) {
    const url = base + p;
    const cold = await once(url);
    const warm = [];
    for (let i = 1; i < n; i += 1) warm.push(await once(url));

    const ok = warm.filter((r) => !r.error && r.status >= 200 && r.status < 400);
    const stats = summarize(ok.map((r) => r.ms));
    const entry = {
      cold: { ms: round(cold.ms), status: cold.status, bytes: cold.bytes, error: cold.error, serverTiming: cold.timing },
      warm: stats,
      warmFailures: warm.length - ok.length,
      statuses: [...new Set(warm.concat([cold]).map((r) => r.error ? 'ERR' : String(r.status)))].sort(),
      bytes: ok.length ? ok[0].bytes : null,
      serverTiming: mergeTiming(warm.map((r) => r.timing))
    };
    report.paths[p] = entry;

    console.log(p);
    console.log('  cold : ' + entry.cold.ms + ' ms (status ' + (entry.cold.error ? 'ERR ' + entry.cold.error : entry.cold.status) + ')');
    console.log('  warm : p50 ' + stats.p50 + ' ms | p95 ' + stats.p95 + ' ms | min ' + stats.min + ' | max ' + stats.max + ' | n=' + stats.count);
    if (entry.warmFailures) console.log('  GAGAL: ' + entry.warmFailures + ' dari ' + warm.length + ' permintaan hangat');
    if (entry.serverTiming) {
      const st = entry.serverTiming;
      const line = Object.keys(st).sort().map((k) => k + ' p50=' + st[k].p50).join(' | ');
      console.log('  uraian jembatan (Server-Timing, ms): ' + line);
    } else {
      console.log('  uraian jembatan: TIDAK ADA header Server-Timing — versi proxy di server belum yang baru,');
      console.log('                   atau jalur ini tidak lewat jembatan PHP.');
    }
    console.log('');
  }

  if (baselineFile) {
    let prev = null;
    try {
      prev = JSON.parse(readFileSync(baselineFile, 'utf8'));
    } catch (err) {
      console.error('baseline tidak bisa dibaca: ' + (err && err.message ? err.message : err));
    }
    if (prev && prev.paths) {
      console.log('SEBELUM -> SESUDAH (baseline: ' + baselineFile + ')');
      if (prev.target !== base) {
        console.log('  PERINGATAN: baseline menembak target lain (' + prev.target + '). Perbandingan ini TIDAK sah.');
      }
      for (const p of PATHS) {
        const a = prev.paths[p];
        const b = report.paths[p];
        if (!a || !b) { console.log('  ' + p + ': tidak ada di salah satu sisi'); continue; }
        const d50 = round(b.warm.p50 - a.warm.p50);
        const d95 = round(b.warm.p95 - a.warm.p95);
        const sign = (v) => (v > 0 ? '+' + v : String(v));
        console.log('  ' + p.padEnd(12) + ' p50 ' + a.warm.p50 + ' -> ' + b.warm.p50 + ' (' + sign(d50) + ' ms)'
          + '   p95 ' + a.warm.p95 + ' -> ' + b.warm.p95 + ' (' + sign(d95) + ' ms)');
      }
      console.log('');
      report.baseline = { file: baselineFile, target: prev.target, generatedAt: prev.generatedAt };
    }
  }

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n');
    console.log('hasil mentah ditulis: ' + jsonOut);
  }

  const anyFail = PATHS.some((p) => report.paths[p].warmFailures > 0 || report.paths[p].cold.error);
  if (anyFail) {
    console.error('SEBAGIAN PERMINTAAN GAGAL. Angka di atas tidak boleh dipakai sebagai bukti perbaikan.');
    process.exit(1);
  }
})().catch((err) => {
  console.error('edge-latency-probe ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
