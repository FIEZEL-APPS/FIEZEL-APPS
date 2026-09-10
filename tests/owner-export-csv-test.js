// tests/owner-export-csv-test.js — gerbang EKSPOR CSV dashboard owner.
//
// Kenapa berkas ini ada, terpisah dari tests/owner-dashboard-test.js: ekspor menerbitkan berkas yang
// BEREDAR LEPAS dari dashboard. Begitu sebuah CSV masuk email atau folder Unduhan calon
// pembeli, seluruh konteks kejujuran yang dirender halaman HTML (banner "belum ada
// pengukuran", peringatan estimasi perangkat, batas UNMEASURABLE) hilang — kecuali kalau
// konteks itu ikut TERTULIS DI DALAM berkasnya. Gerbang ini menjaga bahwa ia ikut.
//
// Yang dibuktikan:
//   A. GATE      — keempat rute ekspor 403 tanpa sesi owner, sama seperti rute data lain.
//   B. KEJUJURAN — setiap berkas membawa measurement_state + notice + basis pengukuran, dan
//                  keadaan "belum ada pengukuran" TIDAK PERNAH terbit sebagai angka 0 polos.
//   C. RFC 4180  — sel bertanda koma/kutip/baris-baru di-escape benar; null jadi sel KOSONG,
//                  bukan teks "null" (yang di spreadsheet merusak kolom angka).
//   D. PRIVASI   — nol identitas per-orang di seluruh badan CSV, termasuk cohort lane bukti.
//   E. HEADER    — content-type CSV + Content-Disposition attachment bernama periode, supaya
//                  dua unduhan periode berbeda tidak saling menimpa.
//   F. PARITAS   — angka di CSV = angka di /api/summary. Ekspor yang menyimpang dari sumber
//                  yang sama adalah ekspor yang tidak bisa dipercaya untuk due diligence.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__fzRoot, 'workers', 'owner');
const indexSource = fs.readFileSync(path.join(DIR, 'index.js'), 'utf8');
const queriesSource = fs.readFileSync(path.join(DIR, 'queries.js'), 'utf8');

let failed = false;
function check(name, ok, detail) {
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');
const dataUrl = (t) => 'data:text/javascript;base64,' + b64(t);
const sha256Hex = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const OWNER_TOKEN = 'token-uji-ekspor';
const NOW = Date.parse('2026-09-01T02:00:00Z');
const EXPORTS = [
  '/api/export/summary.csv', '/api/export/series.csv',
  '/api/export/retention.csv', '/api/export/evidence.csv',
];

/* ---------------------------------------------------------------------------- D1 tiruan */
function makeD1(rows) {
  const { days = [], usage = [], retention = [] } = rows || {};
  return {
    prepare(sql) {
      const binds = [];
      const api = {
        bind(...args) { binds.push(...args); return api; },
        async all() {
          if (/FROM\s+usage_daily/i.test(sql)) return { results: usage };
          if (/FROM\s+retention_daily/i.test(sql)) return { results: retention };
          if (/MAX\(day\)/i.test(sql)) return { results: [{ day: days.length ? days[days.length - 1].day : null }] };
          // GROUP BY metric DIPERIKSA LEBIH DULU: PERIOD_TOTALS memuat "COUNT(DISTINCT day)"
          // JUGA, jadi urutan terbalik membuat kueri total terjawab bentuk ringkasan hari dan
          // seluruh panel total tampak kosong — persis cara fixture bisa menghijaukan gerbang
          // atas perilaku yang salah.
          if (/GROUP BY metric/i.test(sql)) {
            const agg = new Map();
            for (const r of days) {
              const cur = agg.get(r.metric) || { metric: r.metric, total: 0, days: 0 };
              cur.total += Number(r.value) || 0; cur.days += 1; agg.set(r.metric, cur);
            }
            return { results: [...agg.values()] };
          }
          if (/COUNT\(DISTINCT day\)/i.test(sql)) {
            const uniq = [...new Set(days.map((d) => d.day))];
            return { results: [{ days_counted: uniq.length, days_total: uniq.length, day_first_collected: uniq[0] || null, day_from: uniq[0] || null, day_to: uniq[uniq.length - 1] || null }] };
          }
          if (/AVG\(value\)/i.test(sql)) return { results: [{ days: 1, peak: 17, avg: 10.5 }] };
          if (/value = 0/i.test(sql)) return { results: [{ days_broken: 0 }] };
          return { results: days };
        },
        async first() { return (await api.all()).results[0] || null; },
      };
      return api;
    },
  };
}

const METRICS_FIXTURE = [
  { day: '2026-08-30', metric: 'answers', value: 120 },
  { day: '2026-08-30', metric: 'answers_ok', value: 90 },
  { day: '2026-08-30', metric: 'dau', value: 17 },
  { day: '2026-08-30', metric: 'collection_ok', value: 1 },
  { day: '2026-08-31', metric: 'answers', value: 80 },
  { day: '2026-08-31', metric: 'dau', value: 11 },
  { day: '2026-08-31', metric: 'collection_ok', value: 1 },
];
const RETENTION_FIXTURE = [
  { cohort_day: '2026-08-20', day_index: 0, count: 40 },
  { cohort_day: '2026-08-20', day_index: 1, count: 22 },
  { cohort_day: '2026-08-20', day_index: 7, count: 9 },
];

function makeEnv(overrides) {
  return Object.assign({
    ANALYTICS: makeD1({ days: METRICS_FIXTURE, usage: [], retention: RETENTION_FIXTURE }),
    AE: { writeDataPoint() {} },
    OWNER_TOKEN_HASH: sha256Hex(OWNER_TOKEN),
    OWNER_SESSION_KEY: 'kunci-hmac-sesi-uji-ekspor',
    ALLOW_NO_EDGE_SECRET: 'true',
  }, overrides || {});
}

const req = (url, opts) => new Request('https://owner.fiezel.my.id' + url, opts || {});

/* Pembaca CSV minimal yang MENGHORMATI kutip — kalau uji memakai split(',') polos, ia akan
 * lulus pada berkas yang justru rusak di Excel. */
function parseCsv(text) {
  const rows = [[]];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuote = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { inQuote = true; continue; }
    if (c === ',') { rows[rows.length - 1].push(cell); cell = ''; continue; }
    if (c === '\r' && text[i + 1] === '\n') { rows[rows.length - 1].push(cell); cell = ''; rows.push([]); i++; continue; }
    cell += c;
  }
  if (cell !== '' || rows[rows.length - 1].length) rows[rows.length - 1].push(cell);
  return rows.filter((r) => r.length && !(r.length === 1 && r[0] === ''));
}

(async () => {
  const mod = await import(dataUrl(indexSource.replace("'./queries.js'", `'${dataUrl(queriesSource)}'`)));

  /* ===================== A. GATE ===================== */
  for (const route of EXPORTS) {
    check(`A · ${route} terdaftar di inventaris OWNER_ROUTES`, mod.OWNER_ROUTES.includes(route));
    const res = await mod.handle(req(route), makeEnv(), {}, NOW);
    check(`A · ${route} ditolak tanpa sesi owner`, res.status === 403, 'status=' + res.status);
    const body = await res.text();
    check(`A · ${route} tanpa sesi tidak membocorkan satu angka pun`,
      !/answers|dau|learner|cohort/i.test(body), body.slice(0, 120));
  }

  const env = makeEnv();
  const cookie = mod.SESSION_COOKIE + '=' + (await mod.issueSession(env, NOW));
  const unduh = async (route, e) => {
    const res = await mod.handle(req(route, { headers: { cookie } }), e || env, {}, NOW);
    return { res, text: await res.text() };
  };

  /* ===================== E. HEADER ===================== */
  for (const route of EXPORTS) {
    const { res } = await unduh(route);
    check(`E · ${route} status 200 untuk owner sah`, res.status === 200, 'status=' + res.status);
    check(`E · ${route} content-type text/csv`,
      /text\/csv/.test(res.headers.get('content-type') || ''), res.headers.get('content-type'));
    const cd = res.headers.get('content-disposition') || '';
    check(`E · ${route} diunduh sebagai attachment bernama periode`,
      /attachment; filename="fiezel-[a-z-]+-7d_?/.test(cd) && cd.includes('.csv'), cd);
    check(`E · ${route} tidak boleh di-cache`,
      (res.headers.get('cache-control') || '').includes('no-store'));
  }

  /* ===================== B. KEJUJURAN ===================== */
  for (const route of EXPORTS) {
    const { text } = await unduh(route);
    const rows = parseCsv(text);
    const kunci = rows.map((r) => r[0]);
    for (const wajib of ['fiezel_export', 'schema', 'period', 'measurement_state', 'measurement_basis', 'honesty']) {
      check(`B · ${route} membawa baris '${wajib}'`, kunci.includes(wajib), kunci.slice(0, 12).join('|'));
    }
  }

  // Keadaan KOSONG: berkas tetap terbit, tetapi tidak boleh menyamar sebagai nol terukur.
  {
    const envKosong = makeEnv({ ANALYTICS: makeD1({ days: [], usage: [], retention: [] }) });
    const ck = mod.SESSION_COOKIE + '=' + (await mod.issueSession(envKosong, NOW));
    const res = await mod.handle(req('/api/export/summary.csv', { headers: { cookie: ck } }), envKosong, {}, NOW);
    const text = await res.text();
    const rows = parseCsv(text);
    const state = (rows.find((r) => r[0] === 'measurement_state') || [])[1];
    check('B · keadaan kosong tetap menerbitkan berkas (200)', res.status === 200);
    check('B · keadaan kosong menuliskan measurement_state BUKAN "measured"',
      state && state !== 'measured', 'state=' + state);
    const notice = (rows.find((r) => r[0] === 'measurement_notice') || [])[1];
    check('B · keadaan kosong membawa notice yang menjelaskan kenapa', !!notice, notice);
  }

  // Lane bukti belum dikonfigurasi -> berkas menjelaskan, bukan diam.
  {
    const { text } = await unduh('/api/export/evidence.csv');
    check('B · evidence.csv menyebut evidence_state', /evidence_state/.test(text));
    check('B · evidence.csv tanpa ringkasan menyatakan "BUKAN nol murid"',
      /BUKAN nol murid/i.test(text), text.slice(0, 300));
  }

  /* ===================== C. RFC 4180 ===================== */
  {
    // UNMEASURABLE memuat kalimat panjang berkoma — kalau escaping salah, kolomnya bergeser
    // dan seluruh berkas jadi tidak terbaca di spreadsheet. Ini bukan uji teoretis: baris itu
    // BENAR-BENAR ikut di summary.csv.
    const { text } = await unduh('/api/export/summary.csv');
    const rows = parseCsv(text);
    const unmeas = rows.filter((r) => r[0] === 'tidak_bisa_diukur');
    check('C · baris batas pengukuran ikut diekspor', unmeas.length > 0, unmeas.length);
    check('C · alasan berkoma tetap utuh dalam SATU sel (escaping benar)',
      unmeas.every((r) => r.length === 4), JSON.stringify(unmeas[0] || []));
    check('C · tidak ada sel berisi teks "null"/"undefined"',
      !rows.some((r) => r.some((c) => c === 'null' || c === 'undefined')));
    check('C · pemisah baris CRLF (RFC 4180)', text.includes('\r\n'));
  }

  /* ===================== D. PRIVASI ===================== */
  for (const route of EXPORTS) {
    const { text } = await unduh(route);
    for (const re of [/user_id/i, /install_id/i, /\bemail\b/i, /learner_?name/i, /ip_address/i]) {
      check(`D · ${route} nol penanda identitas ${re}`, !re.test(text));
    }
    // Cohort adalah SATU-SATUNYA pengenal perangkat di seluruh sistem; ia tidak boleh
    // pernah keluar lewat ekspor apa pun.
    check(`D · ${route} tidak pernah memuat kolom cohort`, !/\bcohort\b/i.test(text.replace(/cohort_day|kohor/gi, '')));
  }

  /* ===================== F. PARITAS dengan /api/summary ===================== */
  {
    const sumRes = await mod.handle(req('/api/summary?period=7d', { headers: { cookie } }), env, {}, NOW);
    const summary = JSON.parse(await sumRes.text());
    const { text } = await unduh('/api/export/summary.csv?period=7d');
    const rows = parseCsv(text);
    const csvTotals = new Map(rows.filter((r) => r[0] === 'totals').map((r) => [r[1], r[2]]));
    let cocok = 0;
    for (const [metric, nilai] of Object.entries(summary.totals || {})) {
      if (csvTotals.has(metric)) {
        cocok += 1;
        check(`F · total '${metric}' sama di CSV dan /api/summary`,
          String(csvTotals.get(metric)) === String(nilai), `csv=${csvTotals.get(metric)} json=${nilai}`);
      }
    }
    check('F · setidaknya satu metrik benar-benar dibandingkan (uji tidak kosong)', cocok > 0, cocok);
    const period = (rows.find((r) => r[0] === 'period') || [])[1];
    check('F · periode di CSV sama dengan periode di JSON', period === summary.period, `${period} vs ${summary.period}`);
  }

  console.log(failed ? 'owner-export-csv-test: FAIL' : 'owner-export-csv-test: PASS');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
