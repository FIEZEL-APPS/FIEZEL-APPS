#!/usr/bin/env node
/**
 * tools/mint-teacher-invite.mjs
 * CLI helper untuk Owner FIEZEL mencetak kode undangan guru resmi
 * yang mematuhi format Crockford Base32 32-karakter dan SHA-256 hash di D1.
 *
 * Penggunaan:
 *   node tools/mint-teacher-invite.mjs --name "Mardhiana Hamzah" --institution "MTsN 5 ACEH BESAR" --type "school"
 */

import { mintInvite, INSTITUTION_TYPES } from '../workers/api/auth/invite-core.js';

function parseArgs(args) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PANDUAN MENCETAK KODE UNDANGAN GURU FIEZEL:
node tools/mint-teacher-invite.mjs --name "Nama Guru" --institution "Nama Instansi" --type "school" --days 90

Parameter:
  --name         Nama lengkap guru (Contoh: "Budi Santoso, S.Pd.")
  --institution  Nama sekolah / lembaga (Contoh: "SMA Negeri 1 Banda Aceh")
  --type         Jenis instansi: 'school' (default), 'tutoring', 'course', atau 'other'
  --days         Masa berlaku kode dalam hari (default: 90)
    `);
    process.exit(0);
  }

  const result = {
    teacherName: '',
    institution: '',
    institutionType: 'school',
    days: 90
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' && args[i + 1]) {
      result.teacherName = args[++i];
    } else if (arg === '--institution' && args[i + 1]) {
      result.institution = args[++i];
    } else if (arg === '--type' && args[i + 1]) {
      result.institutionType = args[++i].toLowerCase();
    } else if (arg === '--days' && args[i + 1]) {
      result.days = parseInt(args[++i], 10) || 90;
    }
  }

  if (!result.teacherName) {
    result.teacherName = 'Guru FIEZEL';
  }
  if (!result.institution) {
    result.institution = 'Sekolah Mitra FIEZEL';
  }

  return result;
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  
  if (!INSTITUTION_TYPES.includes(input.institutionType)) {
    console.error(`Error: Jenis institusi tidak valid. Pilihan: ${INSTITUTION_TYPES.join(', ')}`);
    process.exit(1);
  }

  const nowMs = Date.now();
  const minted = await mintInvite(input, nowMs);
  const rec = minted.record;
  rec.expires_at = nowMs + (input.days * 24 * 60 * 60 * 1000);

  const sql = `INSERT INTO teacher_invite (code_hash, teacher_name, institution, institution_type, created_at, expires_at, created_by) VALUES ('${rec.code_hash}', '${rec.teacher_name.replace(/'/g, "''")}', '${rec.institution.replace(/'/g, "''")}', '${rec.institution_type}', ${rec.created_at}, ${rec.expires_at}, 'owner');`;

  console.log('\n=== KODE UNDANGAN GURU RESMI FIEZEL ===');
  console.log(`Guru       : ${rec.teacher_name}`);
  console.log(`Instansi   : ${rec.institution}`);
  console.log(`Jenis      : ${rec.institution_type}`);
  console.log(`Masa Aktif : ${input.days} Hari`);
  console.log('---------------------------------------');
  console.log(`KODE UNDANGAN : ${minted.code}`);
  console.log('---------------------------------------');
  console.log('\nPerintah D1 (Wrangler Remote):');
  console.log(`npx wrangler d1 execute fiezel-core --remote --command "${sql}"`);
  console.log('\nAtau perintah D1 lokal (Wrangler Local):');
  console.log(`npx wrangler d1 execute fiezel-core --local --command "${sql}"`);
  console.log('=======================================\n');
}

main().catch((err) => {
  console.error('Gagal membuat kode undangan:', err);
  process.exit(1);
});
