#!/usr/bin/env node
/**
 * FIEZEL — job harian jalur kesulitan soal gabungan (Braincore langkah 2 + 3).
 * Dijalankan GitHub Actions (.github/workflows/braincore-item-pool.yml), BUKAN cron Worker:
 * penaksirnya butuh ~9-19 ms CPU untuk 1.000-3.000 soal (melewati batas 10 ms Worker gratis),
 * dan penyetelan angka rumus butuh validasi silang + bootstrap (ratusan milidetik).
 *
 * Yang dikerjakan, berurutan:
 *   1. saklar: ITEM_POOL_ENABLED di workers/api/wrangler.toml harus "on" — kalau tidak, keluar
 *      sukses tanpa menyentuh apa pun (job terjadwal tidak boleh merah sebelum owner menyalakan);
 *   2. baca penghitung jendela 56 hari dari D1 fiezel-evidence lewat API D1 HTTP;
 *   3. bangun ulang item_pool_table (langkah 2) — rencana tulis yang SAMA dengan gerbang
 *      (tableWritePlan di item-pool-store-d1.js);
 *   4. penyetelan angka rumus (langkah 3, tools/brain-param-tune.mjs) -> laporan Markdown ke
 *      ringkasan job + JSON. TIDAK mengubah angka apa pun: usulan masuk lewat PR owner.
 *
 * Rahasia hanya dari lingkungan (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID) — token yang
 * sama dengan deploy, izin D1 (edit) terbukti di docs/CF-MIGRATION-RUNBOOK.md §3.4.
 *
 * Pakai:
 *   node tools/item-pool-job.mjs [--today YYYY-MM-DD] [--out file.json] [--summary file.md]
 *   node tools/item-pool-job.mjs --input fixture.json --dry-run   (tanpa jaringan; gerbang)
 *   node tools/item-pool-job.mjs --toml path/wrangler.toml        (saklar dari berkas lain; gerbang)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimateItemDifficulty, buildDifficultyTable } from '../workers/api/evidence/item-pool-core.js';
import { SQL, estimatorSince, tableWritePlan } from '../workers/api/evidence/item-pool-store-d1.js';
import { tune, renderReport } from './brain-param-tune.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATABASE_NAME = 'fiezel-evidence';

/** Saklar server dibaca dari wrangler.toml di repo (sumber yang sama dengan deploy). */
export function itemPoolFlagOn(tomlText) {
  const m = /^ITEM_POOL_ENABLED\s*=\s*"([^"]*)"/m.exec(String(tomlText || ''));
  return !!(m && m[1] === 'on');
}

/** Klien D1 lewat API HTTP Cloudflare: { query(sql, params) -> rows[] }. */
export function httpD1Client({ token, accountId, fetchFn = globalThis.fetch }) {
  if (!token || !accountId) throw new Error('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID tidak tersedia');
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(accountId) + '/d1/database';
  const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
  let dbId = null;
  async function resolve() {
    if (dbId) return dbId;
    const res = await fetchFn(base + '?name=' + encodeURIComponent(DATABASE_NAME), { headers });
    const body = await res.json().catch(() => null);
    const hit = body && Array.isArray(body.result) ? body.result.find((d) => d && d.name === DATABASE_NAME) : null;
    if (!res.ok || !hit || !hit.uuid) throw new Error('database ' + DATABASE_NAME + ' tidak ditemukan (HTTP ' + res.status + ')');
    dbId = hit.uuid;
    return dbId;
  }
  return {
    async query(sql, params = []) {
      const id = await resolve();
      const res = await fetchFn(base + '/' + id + '/query', { method: 'POST', headers, body: JSON.stringify({ sql, params }) });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.success === false) {
        const msg = body && Array.isArray(body.errors) && body.errors[0] ? body.errors[0].message : 'HTTP ' + res.status;
        throw new Error('D1: ' + msg);
      }
      const first = Array.isArray(body.result) ? body.result[0] : null;
      return (first && Array.isArray(first.results)) ? first.results : [];
    }
  };
}

function collapseFolds(foldRows) {
  const map = new Map();
  for (const r of foldRows) {
    const key = r.item_id + '|' + r.pb;
    const row = map.get(key) || { item_id: r.item_id, pb: Number(r.pb), n: 0, k: 0 };
    row.n += Number(r.n) || 0;
    row.k += Number(r.k) || 0;
    map.set(key, row);
  }
  return [...map.values()];
}

/**
 * Inti job (tanpa jaringan di dalamnya): client.query untuk baca DAN tulis. Mengembalikan
 * { table: {...}, tuning: {...}, report }. `write:false` = tidak menulis tabel (dry run).
 */
export async function runJob({ client, today, write = true }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) throw new Error('hari tidak sah: ' + today);
  const since = estimatorSince(today);
  const foldRows = await client.query(SQL.selectItemPoolWindowByFold, [since]);
  let probeRows = [];
  try { probeRows = await client.query(SQL.selectItemPoolProbeWindow, [since]); }
  catch (e) { probeRows = []; /* migrasi 0016 belum diterapkan: penyetelan ingatan menunggu */ }

  const windowRows = collapseFolds(foldRows);
  const estimate = estimateItemDifficulty(windowRows);
  const table = buildDifficultyTable(estimate, today);
  const plan = tableWritePlan(table, today);
  if (write) for (const step of plan) await client.query(step.sql, step.params);

  const tuning = tune(foldRows, probeRows, { day: today });
  const answers = windowRows.reduce((s, r) => s + r.n, 0);
  return {
    table: { day: today, since, answers, published: Object.keys(table.items).length, median: estimate.median, tau: estimate.tau, statements: plan.length, written: write },
    tuning,
    report: renderReport(tuning)
  };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const today = arg('--today') || new Date().toISOString().slice(0, 10);
  const out = arg('--out');
  const summary = arg('--summary');
  const input = arg('--input');
  const dry = process.argv.includes('--dry-run');
  let client;
  if (input) {
    // Fixture gerbang: { foldRows, probeRows } — tidak ada tulisan ke mana pun.
    const fx = JSON.parse(fs.readFileSync(input, 'utf8'));
    client = { async query(sql) { return sql === SQL.selectItemPoolProbeWindow ? (fx.probeRows || []) : sql === SQL.selectItemPoolWindowByFold ? (fx.foldRows || []) : []; } };
  } else {
    const toml = fs.readFileSync(arg('--toml') || path.join(ROOT, 'workers', 'api', 'wrangler.toml'), 'utf8');
    if (!itemPoolFlagOn(toml)) {
      const note = 'ITEM_POOL_ENABLED belum "on" di workers/api/wrangler.toml — job tidak menyentuh apa pun. Lihat reports/ITEM_POOL_ACTIVATION.md.';
      console.log(note);
      if (summary) fs.appendFileSync(summary, '## Braincore item pool\n\n' + note + '\n');
      return;
    }
    client = httpD1Client({ token: process.env.CLOUDFLARE_API_TOKEN, accountId: process.env.CLOUDFLARE_ACCOUNT_ID });
  }
  const result = await runJob({ client, today, write: !input && !dry });
  const line = 'tabel: ' + result.table.published + ' soal diterbitkan dari ' + result.table.answers + ' jawaban-pertama (sejak ' + result.table.since + ')' + (result.table.written ? '' : ' [tidak ditulis]');
  console.log(line);
  console.log(result.report);
  if (out) fs.writeFileSync(out, JSON.stringify({ table: result.table, tuning: result.tuning }, null, 2) + '\n');
  if (summary) fs.appendFileSync(summary, '## Braincore item pool\n\n' + line + '\n\n' + result.report + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error('item-pool-job GAGAL: ' + (e && e.message)); process.exit(1); });
}
