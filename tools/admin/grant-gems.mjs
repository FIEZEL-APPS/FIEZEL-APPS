#!/usr/bin/env node
/**
 * tools/admin/grant-gems.mjs — Injeksi Hadiah GEM Jarak Jauh ke Akun Siswa
 *
 * Penggunaan:
 *   node tools/admin/grant-gems.mjs --handle=zara --gems=100 --reason="Uji Coba Remote Inject GEM"
 *   node tools/admin/grant-gems.mjs --email=mulia22@students.unnes.ac.id --gems=50 --reason="Reward Ulasan Fitur AI"
 *   node tools/admin/grant-gems.mjs --sub=8e845e5e-713f-4df4-a185-c21d243f0e6c --gems=25
 */

import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...vals] = arg.slice(2).split('=');
      args[key] = vals.join('=');
    }
  }
  return args;
}

function runD1Sql(sql) {
  const cmd = `npx wrangler d1 execute fiezel-core --remote --json --command "${sql.replace(/"/g, '\\"')}"`;
  try {
    const raw = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const parsed = JSON.parse(raw);
    return (parsed && parsed[0] && parsed[0].results) || [];
  } catch (err) {
    console.error('❌ Gagal mengeksekusi D1:', err.stderr || err.message);
    throw err;
  }
}

async function main() {
  const args = parseArgs();
  const gems = Math.max(1, Math.floor(Number(args.gems) || 50));
  const reason = (args.reason || 'Apresiasi Tim Pengembang Fiezel').trim().slice(0, 160);

  let targetSub = (args.sub || '').trim();
  let resolvedLabel = targetSub;

  if (!targetSub && args.email) {
    const emailNorm = args.email.trim().toLowerCase();
    resolvedLabel = `Email: ${emailNorm}`;
    const rows = runD1Sql(`SELECT sub FROM auth_email WHERE email = '${emailNorm}' LIMIT 1;`);
    if (rows && rows.length > 0 && rows[0].sub) {
      targetSub = rows[0].sub;
    }
  }

  if (!targetSub && args.handle) {
    const handleNorm = args.handle.trim().replace(/^@/, '').toLowerCase();
    resolvedLabel = `@${handleNorm}`;
    const rows = runD1Sql(`SELECT sub FROM social_handle WHERE handle = '${handleNorm}' LIMIT 1;`);
    if (rows && rows.length > 0 && rows[0].sub) {
      targetSub = rows[0].sub;
    }
  }

  if (!targetSub) {
    console.error('❌ Harap tentukan penerima: --handle=<username>, --email=<surel>, atau --sub=<uuid>');
    process.exit(1);
  }

  const grantId = crypto.randomUUID();
  const nowMs = Date.now();
  const safeReason = reason.replace(/'/g, "''");

  const insertSql = `INSERT INTO gem_grant (id, sub, amount, reason, granted_by, created_at, claimed_at) VALUES ('${grantId}', '${targetSub}', ${gems}, '${safeReason}', 'admin', ${nowMs}, NULL);`;
  runD1Sql(insertSql);

  console.log('\n================================================================');
  console.log('💎 SUKSES MENYUNTIKKAN REWARD GEM KE SERVER D1');
  console.log('================================================================');
  console.log(`Penerima   : ${resolvedLabel}`);
  console.log(`UUID Sub   : ${targetSub}`);
  console.log(`Jumlah GEM : +${gems} GEM`);
  console.log(`Alasan     : "${reason}"`);
  console.log(`Grant ID   : ${grantId}`);
  console.log(`Waktu      : ${new Date(nowMs).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
  console.log(`Status     : 🟢 PENDING CLAIM`);
  console.log('----------------------------------------------------------------');
  console.log('💡 Catatan: GEM ini akan otomatis masuk seketika ke saldo aplikasi');
  console.log('   murid beserta notifikasi pop-up Mochi saat mereka membuka Fiezel!');
  console.log('================================================================\n');
}

main().catch(() => process.exit(1));
