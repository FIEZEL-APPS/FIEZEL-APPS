// FIEZEL — Worker dashboard owner (`fiezel-owner`). E6.
//
// ============================================================================================
// MENGAPA HTML DIRENDER WORKER, BUKAN BERKAS DI REPO
// ============================================================================================
// Kalau dashboard ini berupa `owner.html` di repo PWA, tiga hal buruk terjadi sekaligus:
//   1. sw.js melakukan PRECACHE atas daftar ASSETS-nya. Berkas owner akan ikut diunduh ke
//      perangkat MURID — markup dan nama endpoint owner jadi bacaan publik. Itu melanggar
//      bab 20 ("jangan kirim data owner ke browser lalu sembunyikan dengan CSS") pada tingkat
//      yang lebih dasar lagi: bahkan strukturnya tidak boleh sampai ke sana.
//   2. Invarian rilis SW_REV = DIAG_BUILD = FIEZEL_PAGE_BUILD harus dinaikkan setiap kali satu
//      label dashboard berubah. Dashboard owner adalah alat internal; ia tidak boleh menyeret
//      rilis aplikasi murid. Dan invarian itu hanya boleh dinaikkan MASTER, bukan subagent.
//   3. Perubahan dashboard jadi terikat siklus deploy PWA (main auto-deploy tiap 5 menit),
//      padahal ia hanya perlu `wrangler deploy` Worker ini.
// Karena itu: nol byte owner di bundle PWA, nol dampak pada invarian build, dan gate yang sama
// melindungi HTML maupun JSON. Putusan ini mengikuti cf-b5-analytics.md §5.1.
//
// ============================================================================================
// KEJUJURAN ANGKA (KONTRAK ANALYTICS PRIVASI-MAKSIMAL = otoritas)
// ============================================================================================
// Dashboard ini hanya boleh membaca AGREGAT, dan WAJIB menampilkan bahwa angkanya adalah
// ESTIMASI PERANGKAT, bukan orang: satu orang dua perangkat = dua hitungan; hapus data browser
// = perangkat baru. Label itu bukan catatan kaki opsional — ia dirender di setiap panel
// pengguna dan diassert gerbang test. Owner harus tahu ini, jangan dipoles.

import { QUERIES } from './queries.js';

/* ============================ Konstanta yang boleh dilihat ================================= */

// Rate card biaya — SUMBER: reports/cf-a10-cost-model.json + reports/cf-a10-cost.md.
// Ini nilai seed/fallback untuk menampilkan asumsi. Angka yang DIPAKAI untuk hari tertentu
// selalu tarif yang tersimpan bersama baris biaya hari itu, supaya angka lama tetap bisa
// diaudit setelah tarif berubah.
const RATE_CARD = {
  ttsUsdPer1MChars: {
    'workers-ai aura-1': 15.0,
    'workers-ai aura-2-en': 30.0,
    'workers-ai melotts': 0.2,
    'elevenlabs flash': 90.91,
  },
  charsPerAudioMin: 1005,          // dikalibrasi dari 273 aset R2 nyata (cf-a10-cost.md §kalibrasi)
  llmUsdPer1MIn: 0.045,            // @cf/meta/llama-3.1-8b-instruct-fp8-fast
  llmUsdPer1MOut: 0.384,
  workersPaidUsdPerMonth: 5.0,     // hanya berlaku bila owner pindah ke Workers Paid
  freeAiCreditUsdPerMonth: 3.3,    // kredit Workers AI yang sudah termasuk
};

const PERIODS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const SESSION_COOKIE = 'fz_owner';
const SESSION_TTL_MS = 30 * 60 * 1000;   // sesi owner berumur PENDEK: 30 menit, diperbarui tiap akses
const RETENTION_MIN_COHORT = 30;         // di bawah ini persentase tidak dicetak (derau, bukan sinyal)

// Inventaris rute. Semua rute di daftar ini WAJIB lewat ownerGate(). Rute yang tidak dikenal
// juga 403 (default deny), sehingga menambah rute tanpa gate tidak mungkin lolos diam-diam.
const OWNER_ROUTES = ['/', '/api/summary', '/api/series', '/api/retention', '/api/cost', '/logout'];
// Hanya halaman masuk yang publik. Ia tidak pernah memuat satu angka metrik pun.
const PUBLIC_ROUTES = ['/login'];

/* ============================ Utilitas perbandingan & kripto ============================== */

// Perbandingan waktu-konstan. Dipakai untuk SEMUA pembandingan nilai rahasia
// (digest token owner dan tanda tangan cookie sesi). Tidak ada operator kesetaraan langsung
// yang pernah diterapkan pada nilai rahasia di berkas ini — itu diassert gerbang test.
function ctEq(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a == null ? '' : a));
  const y = enc.encode(String(b == null ? '' : b));
  // Panjang berbeda tetap dijalankan sampai habis atas panjang tetap agar tidak bocor lewat waktu.
  const len = Math.max(x.length, y.length, 1);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(key)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(String(message)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ============================ Sesi owner (stateless, umur pendek) ========================= */
// Sesi ditandatangani HMAC, jadi nol tulis KV/D1 (free-tier-safe) dan tidak ada daftar sesi
// yang bisa dibocorkan. Konsekuensi jujur: revocation sebelum kedaluwarsa hanya bisa dilakukan
// dengan memutar OWNER_SESSION_KEY. Umur 30 menit dipilih supaya jendela itu kecil.

function cookieValue(request, wanted) {
  const raw = (request.headers && request.headers.get && request.headers.get('cookie')) || '';
  for (const part of String(raw).split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === wanted) return part.slice(idx + 1).trim();
  }
  return null;
}

async function issueSession(env, nowMs) {
  const payload = JSON.stringify({ sub: 'owner', iat: nowMs, exp: nowMs + SESSION_TTL_MS });
  const body = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sig = await hmacHex(env.OWNER_SESSION_KEY, body);
  return body + '.' + sig;
}

async function verifySession(env, value, nowMs) {
  if (!value || !env.OWNER_SESSION_KEY) return null;
  const dot = String(value).lastIndexOf('.');
  if (dot <= 0) return null;
  const body = String(value).slice(0, dot);
  const presented = String(value).slice(dot + 1);
  const expected = await hmacHex(env.OWNER_SESSION_KEY, body);
  // Tanda tangan dibandingkan waktu-konstan; tanpa ini, panjang prefiks yang cocok bisa terukur.
  if (!ctEq(presented, expected)) return null;
  let claims = null;
  try {
    claims = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
  if (!claims || claims.sub !== 'owner') return null;
  if (!Number.isFinite(claims.exp) || claims.exp <= nowMs) return null;   // kedaluwarsa → ditolak
  return claims;
}

function sessionCookieHeader(value, maxAgeSeconds) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

/* ============================ Gate owner ================================================== */
// Pola yang ditiru: fiezel-core-worker.js:184-186 (identitas diputuskan SERVER, nol masukan
// klien, 403 SEBELUM data dibentuk). Yang diganti hanya SUMBER identitas owner: kini Secret,
// bukan "kebetulan pemilik Worker" (cf-a7-security.md rekomendasi baris 154).
//
// Yang TIDAK PERNAH mempengaruhi keputusan: query `?admin=true`, header apa pun, isi body.

function configured(env) {
  return !!(env && env.OWNER_TOKEN_HASH && env.OWNER_SESSION_KEY);
}

async function ownerSession(request, env, nowMs) {
  if (!configured(env)) return null;                      // fail-closed: tanpa Secret, tidak ada owner
  return verifySession(env, cookieValue(request, SESSION_COOKIE), nowMs);
}

// Respons penolakan seragam. Tidak memuat satu pun angka metrik — tidak ada data yang dibentuk
// sebelum gate lulus, jadi tidak ada apa pun untuk dibocorkan.
function deny() {
  return new Response(JSON.stringify({ error: 'forbidden' }), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/* ============================ Rumus biaya (cf-a10) ======================================== */
// Rumus, bukan angka ajaib. Semua asumsi ikut dikembalikan supaya UI bisa mencetaknya di kartu.
//
//   tts_usd   = tts_chars_rendered / 1e6 × tts_usd_per_1m_chars     (HANYA cache-miss)
//   llm_usd   = ai_tokens_in / 1e6 × in_rate + ai_tokens_out / 1e6 × out_rate
//   kredit    = min(kredit_gratis_Workers_AI, belanja_Workers_AI)
//   total_usd = tts_usd + llm_usd + infra_usd − kredit
//
// Kalibrasi wajib (cf-a10-cost-model.json: scenarios): 1.000 pengguna, aura-1, cache 70% →
// total ≈ US$162,01/bulan dan ≈US$0,162/pengguna. Kalau rumus di sini memberi angka lain untuk
// masukan yang sama, rumus di sini yang salah. Itu yang diuji gerbang (bab 32 #24).
function estimateCost(input = {}) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const ttsChars = Math.max(0, num(input.ttsCharsRendered));
  const tokensIn = Math.max(0, num(input.aiTokensIn));
  const tokensOut = Math.max(0, num(input.aiTokensOut));
  const ttsRate = num(input.ttsUsdPer1MChars != null ? input.ttsUsdPer1MChars : RATE_CARD.ttsUsdPer1MChars['workers-ai aura-1']);
  const inRate = num(input.llmUsdPer1MIn != null ? input.llmUsdPer1MIn : RATE_CARD.llmUsdPer1MIn);
  const outRate = num(input.llmUsdPer1MOut != null ? input.llmUsdPer1MOut : RATE_CARD.llmUsdPer1MOut);
  const infraUsd = num(input.infraUsd);
  const ttsOnWorkersAi = input.ttsOnWorkersAi !== false;

  const ttsUsd = (ttsChars / 1e6) * ttsRate;
  const llmUsd = (tokensIn / 1e6) * inRate + (tokensOut / 1e6) * outRate;
  const workersAiUsd = llmUsd + (ttsOnWorkersAi ? ttsUsd : 0);
  const creditCap = Math.max(0, num(input.freeAiCreditUsd));
  const credit = Math.min(creditCap, workersAiUsd);
  const totalUsd = ttsUsd + llmUsd + infraUsd - credit;

  const activeDevices = Math.max(0, Math.trunc(num(input.activeDevices)));
  const registeredDevices = Math.max(0, Math.trunc(num(input.registeredDevices)));

  return {
    ttsUsd, llmUsd, infraUsd, creditUsd: credit, totalUsd,
    // Pembagi nol TIDAK menghasilkan Infinity/NaN: ia menghasilkan null, dan UI menulis "—".
    usdPerActiveDevice: activeDevices > 0 ? totalUsd / activeDevices : null,
    usdPerRegisteredDevice: registeredDevices > 0 ? totalUsd / registeredDevices : null,
    audioMinutesRendered: ttsChars / RATE_CARD.charsPerAudioMin,
    assumptions: {
      ttsUsdPer1MChars: ttsRate,
      llmUsdPer1MIn: inRate,
      llmUsdPer1MOut: outRate,
      charsPerAudioMin: RATE_CARD.charsPerAudioMin,
      freeAiCreditUsd: creditCap,
      ttsProvider: input.ttsProvider || 'workers-ai aura-1',
      llmModel: input.llmModel || '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      tokensAreEstimated: !!input.tokensAreEstimated,
      billableCharsAreCacheMissOnly: true,
    },
  };
}

/* ============================ Pembacaan data (agregat saja) =============================== */

function dayShift(day, deltaDays) {
  const t = Date.parse(String(day) + 'T00:00:00Z');
  if (!Number.isFinite(t)) return String(day);
  return new Date(t + deltaDays * 86400000).toISOString().slice(0, 10);
}

// Hari WIB (zona murid, bukan UTC) — batas hari mengikuti studyDayKey() di app.js:1085.
function wibDay(nowMs) {
  return new Date(Number(nowMs) + 7 * 3600000).toISOString().slice(0, 10);
}

function periodRange(period, anchorDay) {
  const span = PERIODS[period] || PERIODS['7d'];
  return { from: dayShift(anchorDay, -(span - 1)), to: anchorDay, span };
}

async function readModel(env, period, nowMs) {
  const db = env.ANALYTICS;
  const one = async (sql, ...binds) => {
    const stmt = db.prepare(sql);
    return (binds.length ? stmt.bind(...binds) : stmt).first();
  };
  const many = async (sql, ...binds) => {
    const stmt = db.prepare(sql);
    const res = await (binds.length ? stmt.bind(...binds) : stmt).all();
    return (res && res.results) || [];
  };

  const latest = (await one(QUERIES.LATEST_DAY)) || null;
  const anchorDay = (latest && latest.day) || wibDay(nowMs);
  const { from, to, span } = periodRange(period, anchorDay);

  const [totals, peak, series, retention, retentionRollup, costPeriod, costRates, start, growth] =
    await Promise.all([
      one(QUERIES.PERIOD_TOTALS, from, to),
      one(QUERIES.ACTIVE_PEAK, from, to),
      many(QUERIES.SERIES, from, to),
      many(QUERIES.RETENTION, from, to),
      many(QUERIES.RETENTION_ROLLUP, from, to),
      one(QUERIES.COST_PERIOD, from, to),
      one(QUERIES.COST_RATES, from, to),
      one(QUERIES.COLLECTION_START),
      one(QUERIES.GROWTH_STOCK, from, to),
    ]);

  const rates = costRates || {};
  const cost = estimateCost({
    ttsCharsRendered: (costPeriod && costPeriod.tts_chars_rendered) || 0,
    aiTokensIn: (costPeriod && costPeriod.ai_tokens_in) || 0,
    aiTokensOut: (costPeriod && costPeriod.ai_tokens_out) || 0,
    ttsUsdPer1MChars: rates.tts_usd_per_1m_chars,
    llmUsdPer1MIn: rates.llm_usd_per_1m_in,
    llmUsdPer1MOut: rates.llm_usd_per_1m_out,
    infraUsd: (costPeriod && costPeriod.infra_usd) || 0,
    freeAiCreditUsd: 0,   // kredit gratis sudah diperhitungkan job rollup harian di infra_usd
    ttsProvider: rates.tts_provider,
    llmModel: rates.llm_model,
    tokensAreEstimated: !!(costPeriod && costPeriod.tokens_are_estimated),
    activeDevices: (latest && latest.dau) || 0,
    registeredDevices: (growth && growth.registered_total) || 0,
  });

  return {
    period, span, from, to, anchorDay,
    latest: latest || {},
    totals: totals || {},
    peak: peak || {},
    series, retention, retentionRollup,
    costStored: costPeriod || {},
    cost,
    growth: growth || {},
    collection: start || {},
    generatedAtIso: new Date(Number(nowMs)).toISOString(),
  };
}

/* ============================ Render HTML (tanpa CDN, tanpa framework) ==================== */
// Palet FIEZEL: cream #FFF8ED, ink #2B2118, kuning #FFD23F. Mobile-first: satu kolom di bawah
// 640 px, grid otomatis di atasnya. Nol berkas eksternal, nol font remote, nol JavaScript
// pihak ketiga — pemilihan periode adalah tautan biasa (muat ulang), bukan kerangka kerja.

const CSS = `
:root{--cream:#FFF8ED;--ink:#2B2118;--yellow:#FFD23F;--line:#E7DCC9;--muted:#6B5C49;--warn:#8A5A00}
*{box-sizing:border-box}
body{margin:0;background:var(--cream);color:var(--ink);font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
header{padding:18px 16px 8px;border-bottom:3px solid var(--yellow)}
h1{margin:0;font-size:20px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13px;margin-top:4px}
nav{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px}
nav a{padding:7px 13px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--ink);font-size:14px;background:#fff}
nav a[aria-current="page"]{background:var(--yellow);border-color:var(--ink);font-weight:600}
main{padding:0 16px 40px;display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:640px){main{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:24px}}
@media(min-width:1024px){main{grid-template-columns:repeat(3,minmax(0,1fr))}}
section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px}
section h2{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.kv{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:15px}
.kv:last-of-type{border-bottom:0}
.kv b{font-variant-numeric:tabular-nums;font-weight:700}
.big{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1;margin:2px 0 8px}
.note{margin-top:10px;font-size:12px;color:var(--muted);border-left:3px solid var(--yellow);padding-left:9px}
.warn{margin-top:10px;font-size:12px;color:var(--warn);background:#FFF4D6;border:1px solid var(--yellow);border-radius:9px;padding:8px 9px}
.assume{margin-top:10px;font-size:12px;color:var(--muted);background:var(--cream);border:1px dashed var(--line);border-radius:9px;padding:8px 9px}
.assume code{font-size:11px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:right;padding:5px 4px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums}
th:first-child,td:first-child{text-align:left}
svg{display:block;width:100%;height:52px;margin:6px 0 2px}
footer{padding:0 16px 34px;color:var(--muted);font-size:12px}
form{padding:16px;max-width:420px}
input{width:100%;padding:11px;font-size:16px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink)}
button{margin-top:10px;padding:11px 16px;font-size:15px;font-weight:700;border:1px solid var(--ink);border-radius:10px;background:var(--yellow);color:var(--ink)}
`;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtNum(v, digits) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const fixed = n.toFixed(digits == null ? 2 : digits);
  const [a, b] = fixed.split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (b ? ',' + b : '');
}

function fmtUsd(v, digits) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return 'US$' + fmtNum(n, digits == null ? 2 : digits);
}

function fmtPct(part, whole, digits) {
  const p = Number(part), w = Number(whole);
  if (!Number.isFinite(p) || !Number.isFinite(w) || w <= 0) return '—';
  return fmtNum((p / w) * 100, digits == null ? 1 : digits) + '%';
}

function row(label, value, hint) {
  return `<div class="kv"><span>${esc(label)}${hint ? ` <small style="color:var(--muted)">${esc(hint)}</small>` : ''}</span><b>${esc(value)}</b></div>`;
}

// Sparkline: hari dengan collection_ok=0 digambar PUTUS, tidak diinterpolasi. Grafik yang
// mulus di atas hari yang gagal dikumpulkan adalah kebohongan visual.
function sparkline(series, key) {
  const points = (series || []).map((r) => Number(r[key]) || 0);
  if (points.length < 2) return '<div class="note">Belum cukup hari untuk digambar.</div>';
  const max = Math.max(...points, 1);
  const stepX = 100 / (points.length - 1);
  const segments = [];
  let current = [];
  (series || []).forEach((r, i) => {
    const ok = Number(r.collection_ok) !== 0;
    if (!ok) { if (current.length > 1) segments.push(current); current = []; return; }
    current.push(`${(i * stepX).toFixed(2)},${(46 - (Number(r[key]) || 0) / max * 42).toFixed(2)}`);
  });
  if (current.length > 1) segments.push(current);
  const paths = segments.map((s) => `<polyline fill="none" stroke="#2B2118" stroke-width="2" points="${s.join(' ')}"/>`).join('');
  return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label="tren ${esc(key)}">
    <rect x="0" y="0" width="100" height="50" fill="#FFF8ED"/>${paths}</svg>`;
}

const DEVICE_TRUTH = 'Angka ini ESTIMASI PERANGKAT, bukan orang. Satu orang dengan dua perangkat = dua hitungan; menghapus data browser = perangkat baru; dua orang satu perangkat = satu hitungan.';

function renderDashboard(m) {
  const t = m.totals || {}, l = m.latest || {}, c = m.cost || {}, a = (c.assumptions || {});
  const periodLabel = { today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' }[m.period] || m.period;
  const nav = Object.keys(PERIODS).map((p) => `<a href="/?period=${esc(p)}"${p === m.period ? ' aria-current="page"' : ''}>${esc({ today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', '90d': '90 hari' }[p])}</a>`).join('');
  const brokenDays = Number(t.days_broken) || 0;
  const ttsTotal = (Number(t.tts_cache_hits) || 0) + (Number(t.tts_cache_misses) || 0);
  const aiErr = (Number(t.ai_err_429) || 0) + (Number(t.ai_err_timeout) || 0) + (Number(t.ai_err_5xx) || 0);

  const retentionRows = (m.retentionRollup || []).map((r) => {
    const n = Number(r.cohort_total) || 0;
    const kept = Number(r.retained_total) || 0;
    const pct = n >= RETENTION_MIN_COHORT ? fmtPct(kept, n) : 'belum cukup data';
    return `<tr><td>D${esc(r.day_offset)}</td><td>${esc(fmtInt(kept))}</td><td>n=${esc(fmtInt(n))}</td><td>${esc(pct)}</td></tr>`;
  }).join('') || '<tr><td colspan="4">Belum ada cohort dalam rentang ini.</td></tr>';

  return `<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>FIEZEL · Dashboard Owner</title>
<style>${CSS}</style></head><body>
<header>
  <h1>FIEZEL · Dashboard Owner</h1>
  <div class="sub">Periode <b>${esc(periodLabel)}</b> · ${esc(m.from)} → ${esc(m.to)} (hari WIB, zona murid) ·
  rollup terakhir ${esc(l.day || '—')} · dirender ${esc(m.generatedAtIso)}</div>
</header>
<nav>${nav}<a href="/logout" style="margin-left:auto">Keluar</a></nav>
<main>

  <section>
    <h2>👥 User growth</h2>
    <div class="big">${esc(fmtInt(m.growth.registered_total))}</div>
    ${row('Perangkat terdaftar (kumulatif)', fmtInt(m.growth.registered_total))}
    ${row('Perangkat baru (periode)', fmtInt(t.new_users))}
    ${row('Pengunjung tercatat', fmtInt(t.visitors), 'batas bawah')}
    ${row('Perangkat kembali (hari terakhir)', fmtInt(l.returning_users))}
    ${sparkline(m.series, 'new_users')}
    <div class="warn">${esc(DEVICE_TRUTH)}</div>
    <div class="note">Pengunjung adalah BATAS BAWAH: PWA yang dibuka dari precache tanpa jaringan tidak terhitung.</div>
  </section>

  <section>
    <h2>🔥 Active users (DAU / WAU / MAU)</h2>
    <div class="big">${esc(fmtInt(l.dau))}</div>
    ${row('DAU (hari rollup terakhir)', fmtInt(l.dau))}
    ${row('WAU', fmtInt(l.wau))}
    ${row('MAU', fmtInt(l.mau))}
    ${row('Stickiness DAU/MAU', fmtPct(l.dau, l.mau))}
    ${row('Puncak DAU pada periode', fmtInt(m.peak.dau_peak))}
    ${row('Rata-rata DAU pada periode', fmtNum(m.peak.dau_avg, 1))}
    ${sparkline(m.series, 'dau')}
    <div class="warn">${esc(DEVICE_TRUTH)} "Aktif" = hari dengan ≥5 jawaban (ambang yang sama dengan cincin misi murid).</div>
    <div class="note">DAU/WAU/MAU dibaca dari tabel agregat harian yang dibekukan job rollup — dashboard tidak pernah memindai baris per-perangkat.</div>
  </section>

  <section>
    <h2>↩️ Retention (observed)</h2>
    <table><thead><tr><th>Offset</th><th>Kembali</th><th>Cohort</th><th>%</th></tr></thead>
    <tbody>${retentionRows}</tbody></table>
    <div class="warn">PERINGATAN ESTIMASI PERANGKAT: cohort dibangun dari perangkat, bukan orang.
    Ganti perangkat atau hapus data browser terlihat sebagai "berhenti" walau muridnya tetap belajar.
    Belajar offline berhari-hari juga menurunkan retensi tanpa ada murid yang hilang.
    Safari membatasi storage skrip 7 hari → cohort iOS bisa tampak berhenti di D7.</div>
    <div class="note">Persentase disembunyikan bila cohort &lt; ${esc(RETENTION_MIN_COHORT)}: angka presisi di atas cohort kecil adalah derau, bukan sinyal.</div>
  </section>

  <section>
    <h2>📚 Learning activity</h2>
    ${row('Jawaban', fmtInt(t.answers))}
    ${row('Sesi', fmtInt(t.sessions))}
    ${row('Pelajaran dimulai', fmtInt(t.lessons_started))}
    ${row('Pelajaran tuntas', fmtInt(t.lessons_completed))}
    ${row('Rasio tuntas', fmtPct(t.lessons_completed, t.lessons_started))}
    ${sparkline(m.series, 'answers')}
    <div class="note">Dilaporkan sendiri oleh klien (self-reported): bisa kurang (murid offline) dan bisa lebih (klien dimodifikasi). Angka biaya TIDAK pernah memakai kanal ini.</div>
  </section>

  <section>
    <h2>🤖 AI usage</h2>
    ${row('Permintaan AI', fmtInt(t.ai_calls))}
    ${row('Permintaan / perangkat aktif', fmtNum((Number(t.ai_calls) || 0) / Math.max(1, Number(l.dau) || 0), 2))}
    ${row('Token keluaran', fmtInt(t.ai_tokens_out))}
    ${row('Error 429', fmtInt(t.ai_err_429))}
    ${row('Timeout', fmtInt(t.ai_err_timeout))}
    ${row('Error 5xx', fmtInt(t.ai_err_5xx))}
    ${row('Error rate', fmtPct(aiErr, t.ai_calls))}
    ${sparkline(m.series, 'ai_calls')}
    ${a.tokensAreEstimated ? '<div class="warn">Token = PROKSI (karakter ÷ 4): penyedia tidak mengembalikan objek usage untuk hari-hari ini.</div>' : ''}
    <div class="note">Semua angka AI lahir di Worker (server-side), bukan dari klien — di situlah biaya lahir.</div>
  </section>

  <section>
    <h2>🗣️ TTS usage</h2>
    ${row('Permintaan TTS', fmtInt(t.tts_calls))}
    ${row('Cache hit', fmtInt(t.tts_cache_hits))}
    ${row('Cache miss (berbayar)', fmtInt(t.tts_cache_misses))}
    ${row('Cache hit rate', fmtPct(t.tts_cache_hits, ttsTotal))}
    ${row('Karakter dirender', fmtInt(t.tts_chars_rendered))}
    ${row('≈ Menit audio', fmtNum((Number(t.tts_chars_rendered) || 0) / RATE_CARD.charsPerAudioMin, 1), `${fmtInt(RATE_CARD.charsPerAudioMin)} char/menit`)}
    ${row('Gagal', fmtInt(t.tts_failures))}
    <div class="note">Hanya cache MISS yang berbiaya. Mesin suara on-device dihitung terpisah dan tidak masuk biaya; bandwidth model on-device (±152 MB/perangkat) TIDAK terukur skema ini.</div>
  </section>

  <section>
    <h2>🏗️ Infrastructure</h2>
    ${row('Permintaan Worker', fmtInt(t.worker_requests))}
    ${row('Objek R2', fmtInt(l.r2_objects))}
    ${row('Byte R2', fmtInt(l.r2_bytes))}
    ${row('Breaker terbuka', fmtInt(t.breaker_trips))}
    ${row('Error backend', fmtInt(t.backend_errors))}
    <div class="note">Permintaan Worker dan angka R2 diisi job rollup dari Analytics API Cloudflare, bukan hitungan-sendiri di Worker: hitungan-sendiri tidak melihat permintaan yang ditolak di tepi. Panel latensi p50/p95 belum ada — membacanya butuh SQL API Analytics Engine (token akun), lihat README §Batas.</div>
  </section>

  <section>
    <h2>💰 Cost estimation</h2>
    <div class="big">${esc(fmtUsd(c.totalUsd))}</div>
    ${row('TTS', fmtUsd(c.ttsUsd))}
    ${row('LLM', fmtUsd(c.llmUsd))}
    ${row('Infrastruktur', fmtUsd(c.infraUsd))}
    ${row('Kredit gratis', c.creditUsd ? '−' + fmtUsd(c.creditUsd) : fmtUsd(0))}
    ${row('Biaya / perangkat aktif', c.usdPerActiveDevice == null ? '—' : fmtUsd(c.usdPerActiveDevice, 4))}
    ${row('Biaya / perangkat terdaftar', c.usdPerRegisteredDevice == null ? '—' : fmtUsd(c.usdPerRegisteredDevice, 4))}
    <div class="assume">ASUMSI YANG DIPAKAI (bukan angka ajaib — sumber: reports/cf-a10-cost.md + cf-a10-cost-model.json):<br>
      · TTS <code>${esc(a.ttsProvider)}</code> = <code>${esc(fmtUsd(a.ttsUsdPer1MChars))}</code> per 1 juta karakter<br>
      · <code>chars_per_audio_min = ${esc(fmtInt(a.charsPerAudioMin))}</code> (kalibrasi 273 aset audio nyata)<br>
      · LLM <code>${esc(a.llmModel)}</code> = <code>${esc(fmtUsd(a.llmUsdPer1MIn, 3))}</code> masuk / <code>${esc(fmtUsd(a.llmUsdPer1MOut, 3))}</code> keluar per 1 juta token<br>
      · Rumus: <code>tts = char_dirender/1e6 × tarif</code>; <code>llm = tok_in/1e6 × tarif_in + tok_out/1e6 × tarif_out</code>; <code>total = tts + llm + infra − kredit</code><br>
      · Hanya cache MISS yang ditagih; tarif yang dipakai disimpan bersama baris hari itu sehingga angka lama tetap bisa diaudit.
    </div>
    <div class="warn">Penyebut "perangkat aktif" adalah UNDER-COUNT (murid offline tidak terlihat), jadi biaya/perangkat aktif adalah BATAS ATAS, bukan angka pasti.${a.tokensAreEstimated ? ' Token keluaran = proksi char/4 → biaya LLM adalah estimasi kasar.' : ''} Bila TTS berjalan on-device, biaya TTS nyata NOL dan yang perlu dipantau justru bandwidth model.</div>
  </section>

  <section>
    <h2>⚠️ Quota exhaustion</h2>
    <div class="big">${esc(fmtInt(t.quota_hit_users))}</div>
    ${row('Perangkat kena batas kuota', fmtInt(t.quota_hit_users))}
    ${row('Porsi dari perangkat aktif', fmtPct(t.quota_hit_users, (Number(l.dau) || 0) * (Number(t.days_counted) || 1)))}
    ${row('429 dari AI', fmtInt(t.ai_err_429))}
    ${row('Breaker terbuka', fmtInt(t.breaker_trips))}
    <div class="note">Dicatat server-side tepat di cabang yang mengembalikan 429. Angka naik = murid ditolak; itu keputusan biaya yang terlihat, bukan bug yang disembunyikan.</div>
  </section>

  <section>
    <h2>🔎 Data quality</h2>
    ${row('Pengumpulan dimulai', m.collection.day_first_collected || '—')}
    ${row('Hari terkumpul', fmtInt(m.collection.days_total))}
    ${row('Hari dalam periode', fmtInt(t.days_counted), `dari ${esc(m.span)}`)}
    ${row('Hari rollup GAGAL', fmtInt(brokenDays))}
    ${row('Event terlambat (>24 jam)', fmtInt(t.offline_late_events))}
    ${brokenDays > 0 ? `<div class="warn">${esc(brokenDays)} hari punya collection_ok=0. Grafik digambar PUTUS di hari itu — tidak diinterpolasi. Jangan bandingkan periode yang memuat hari rusak.</div>` : ''}
    <div class="note">Semua angka historis dimulai dari tanggal pengumpulan di atas. Sebelum tanggal itu tidak ada data — bukan nol, tetapi tidak diketahui.</div>
  </section>

</main>
<footer>Sumber: hanya tabel AGREGAT (metrik harian, cohort retensi, biaya harian). Dashboard ini tidak punya jalan untuk membaca baris per-orang, dan tidak menampilkan nama, surel, isi jawaban, maupun percakapan AI.
Kontrak: EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL" · desain panel: reports/cf-b5-analytics.md §5 · rumus biaya: reports/cf-a10-cost.md.</footer>
</body></html>`;
}

function renderLogin(message) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>FIEZEL · Masuk Owner</title><style>${CSS}</style></head><body>
<header><h1>FIEZEL · Masuk Owner</h1><div class="sub">Halaman ini tidak memuat satu angka metrik pun.</div></header>
<form method="POST" action="/login">
  <label for="t">Token owner</label>
  <input id="t" name="t" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>
  <button type="submit">Masuk</button>
  ${message ? `<div class="warn">${esc(message)}</div>` : ''}
  <div class="note">Token tidak disimpan di repo. Yang ada di server hanya sha256 HEX-nya (Secret <code>OWNER_TOKEN_HASH</code>). Sesi berumur 30 menit.</div>
</form></body></html>`;
}

function html(body, status, extraHeaders) {
  return new Response(body, {
    status: status || 200,
    headers: Object.assign({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      // Tanpa CDN dan tanpa framework, jadi CSP bisa seketat ini.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    }, extraHeaders || {}),
  });
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/* ============================ Rem sederhana untuk halaman masuk =========================== */
// Per-isolate, dalam memori: nol tulis KV (free-tier-safe). Kejujuran: rem ini hanya
// menyulitkan penebakan cepat pada satu isolate, bukan akuntansi global. Pertahanan
// sebenarnya adalah token 32 byte acak + Cloudflare Access di depan hostname (README).
const loginAttempts = new Map();
const LOGIN_MAX = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

function loginThrottled(bucketKey, nowMs) {
  const entry = loginAttempts.get(bucketKey);
  if (!entry || nowMs - entry.start > LOGIN_WINDOW_MS) {
    loginAttempts.set(bucketKey, { start: nowMs, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX;
}

/* ============================ Handler ===================================================== */

async function handle(request, env, ctx, nowMs) {
  const now = Number.isFinite(nowMs) ? Number(nowMs) : Date.now();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = (request.method || 'GET').toUpperCase();

  // --- Halaman masuk: satu-satunya rute publik. Tetap fail-closed bila Secret belum dipasang.
  if (PUBLIC_ROUTES.includes(path)) {
    if (!configured(env)) return deny();
    if (method === 'GET') return html(renderLogin(url.searchParams.has('gagal') ? 'Token tidak cocok.' : ''));
    if (method === 'POST') {
      // Rem penebakan: kunci rem dibuang segera, IP tidak pernah disimpan.
      if (loginThrottled('login', now)) return html(renderLogin('Terlalu banyak percobaan. Tunggu.'), 429);
      let presented = '';
      try {
        const ctype = request.headers.get('content-type') || '';
        if (ctype.includes('application/json')) presented = String(((await request.json()) || {}).t || '');
        else presented = String((await request.formData()).get('t') || '');
      } catch { presented = ''; }
      // Yang dibandingkan adalah DIGEST, bukan token; dan dibandingkan waktu-konstan.
      const presentedDigest = await sha256Hex(presented);
      const accepted = ctEq(presentedDigest, String(env.OWNER_TOKEN_HASH || '').trim().toLowerCase());
      if (!accepted) {
        return html(renderLogin('Token tidak cocok.'), 403, {
          // Cookie apa pun yang tersisa dimatikan pada percobaan gagal.
          'set-cookie': sessionCookieHeader('', 0),
        });
      }
      const value = await issueSession(env, now);
      return new Response(null, {
        status: 303,
        headers: {
          location: '/',
          'cache-control': 'no-store',
          'set-cookie': sessionCookieHeader(value, Math.floor(SESSION_TTL_MS / 1000)),
        },
      });
    }
    return deny();
  }

  // --- Default deny untuk SEMUA sisa rute, termasuk rute yang belum ada.
  //     Tidak satu byte data pun dibentuk sebelum baris ini lulus (bab 20, bab 32 #20).
  const session = await ownerSession(request, env, now);
  if (!session) return deny();

  // Jejak audit akses owner: tanpa IP, tanpa identitas, hanya rute.
  try {
    if (env.AE && typeof env.AE.writeDataPoint === 'function') {
      env.AE.writeDataPoint({ blobs: ['owner_access', path], doubles: [1], indexes: ['owner'] });
    }
  } catch { /* audit tidak boleh pernah menjatuhkan dashboard */ }

  if (path === '/logout') {
    return new Response(null, {
      status: 303,
      headers: { location: '/login', 'cache-control': 'no-store', 'set-cookie': sessionCookieHeader('', 0) },
    });
  }

  const period = PERIODS[url.searchParams.get('period')] ? url.searchParams.get('period') : '7d';
  // Sesi diperbarui tiap akses supaya umurnya tetap pendek tanpa memaksa owner masuk ulang
  // di tengah pekerjaan.
  const refreshed = sessionCookieHeader(await issueSession(env, now), Math.floor(SESSION_TTL_MS / 1000));

  if (path === '/') {
    const model = await readModel(env, period, now);
    return html(renderDashboard(model), 200, { 'set-cookie': refreshed });
  }
  if (path === '/api/summary') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-summary-v1', period: model.period, from: model.from, to: model.to,
      measurementBasis: 'perangkat-estimasi', latest: model.latest, totals: model.totals,
      peak: model.peak, growth: model.growth, collection: model.collection,
      honesty: DEVICE_TRUTH,
    });
  }
  if (path === '/api/series') {
    const model = await readModel(env, period, now);
    return json({ schema: 'fiezel-owner-series-v1', period: model.period, series: model.series });
  }
  if (path === '/api/retention') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-retention-v1', period: model.period,
      cohorts: model.retention, rollup: model.retentionRollup,
      minCohortForPercent: RETENTION_MIN_COHORT, honesty: DEVICE_TRUTH,
    });
  }
  if (path === '/api/cost') {
    const model = await readModel(env, period, now);
    return json({
      schema: 'fiezel-owner-cost-v1', period: model.period,
      stored: model.costStored, computed: model.cost, assumptions: model.cost.assumptions,
      honesty: 'Penyebut perangkat aktif adalah under-count; biaya per perangkat aktif adalah batas atas.',
    });
  }

  return deny();
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx, Date.now());
    } catch (err) {
      // Galat tidak boleh membocorkan apa pun, bahkan ke owner: pesan vendor bisa memuat SQL.
      return json({ error: 'internal' }, 500);
    }
  },
};

export {
  handle, ctEq, sha256Hex, hmacHex, issueSession, verifySession, estimateCost,
  renderDashboard, renderLogin, readModel, periodRange, wibDay, dayShift,
  RATE_CARD, PERIODS, OWNER_ROUTES, PUBLIC_ROUTES, SESSION_COOKIE, SESSION_TTL_MS,
  RETENTION_MIN_COHORT, DEVICE_TRUTH,
};
