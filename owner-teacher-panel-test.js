// owner-teacher-panel-test.js — Pengujian panel kelola token guru di Dashboard Owner.
'use strict';

const assert = require('assert');

(async () => {
  console.log('Memulai owner-teacher-panel-test...');
  const ownerMod = await import('./workers/owner/index.js');

  // 1. Ekspor fungsi wajib ada
  assert(typeof ownerMod.readTeachers === 'function', 'readTeachers diekspor');
  assert(typeof ownerMod.mintTeacherInvite === 'function', 'mintTeacherInvite diekspor');
  assert(typeof ownerMod.revokeTeacherInvite === 'function', 'revokeTeacherInvite diekspor');
  assert(typeof ownerMod.renderTeacherSection === 'function', 'renderTeacherSection diekspor');

  // 2. mintTeacherInvite mengirim method POST dan body JSON yang tepat
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: '23456789ABCDEFGHJKMNPQRSTVWXYZ12',
          invite: {
            teacherName: 'Mardhiana Hamzah',
            institution: 'MTsN 5 ACEH BESAR',
            institutionType: 'school',
            status: 'ACTIVE',
            expiresAt: Date.now() + 90 * 86400000
          }
        })
      };
    };

    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };
    const res = await ownerMod.mintTeacherInvite(env, {
      teacherName: 'Mardhiana Hamzah',
      institution: 'MTsN 5 ACEH BESAR',
      institutionType: 'school',
      days: 90
    }, mockFetch);

    assert(res.state === 'ok', 'state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher-invite', 'url benar');
    assert(captured.opt.method === 'POST', 'method POST');
    const parsedBody = JSON.parse(captured.opt.body);
    assert(parsedBody.teacherName === 'Mardhiana Hamzah', 'teacherName sesuai');
    assert(parsedBody.institution === 'MTsN 5 ACEH BESAR', 'institution sesuai');
    assert(parsedBody.institutionType === 'school', 'institutionType sesuai');
    assert(parsedBody.days === 90, 'days 90 hari');
  }

  // 3. revokeTeacherInvite mengirim code atau codeHash
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, revoked: true }) };
    };

    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };
    const res = await ownerMod.revokeTeacherInvite(env, { codeHash: 'a'.repeat(64) }, mockFetch);
    assert(res.state === 'ok', 'revoke state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher-invite/revoke', 'revoke url benar');
    const body = JSON.parse(captured.opt.body);
    assert(body.codeHash === 'a'.repeat(64), 'codeHash terkirim');
  }

  // 4. renderTeacherSection mematuhi CSP (Zero inline script & inline on* handlers)
  {
    const model = {
      teachers: {
        state: 'ok',
        invites: [
          {
            teacherName: 'Mardhiana Hamzah',
            institution: 'MTsN 5 ACEH BESAR',
            institutionType: 'school',
            status: 'ACTIVE',
            codeHash: 'b'.repeat(64),
            createdAt: Date.now() - 3600000,
            expiresAt: Date.now() + 89 * 86400000
          },
          {
            teacherName: 'Guru Lama',
            institution: 'SMA 1',
            institutionType: 'school',
            status: 'REVOKED',
            createdAt: Date.now() - 86400000,
            expiresAt: Date.now() + 10 * 86400000
          }
        ],
        teachers: [
          {
            handle: 'mardhiana',
            teacherName: 'Mardhiana Hamzah',
            institution: 'MTsN 5 ACEH BESAR',
            institutionType: 'school',
            status: 'active',
            activatedAt: Date.now() - 1000
          }
        ]
      },
      teacherAction: {
        ok: true,
        action: 'mint',
        code: 'TESTTOKEN123456789ABCDEFGHJKMNPQ',
        invite: {
          teacherName: 'Mardhiana Hamzah',
          institution: 'MTsN 5 ACEH BESAR',
          institutionType: 'school',
          expiresAt: Date.now() + 90 * 86400000
        }
      }
    };

    const rendered = ownerMod.renderTeacherSection(model);

    // Assert kepatuhan CSP: tidak boleh ada inline JS / script / event handler
    assert(!/<script\b/i.test(rendered), 'CSP: NOL tag script');
    assert(!/\son[a-z]+\s*=/i.test(rendered), 'CSP: NOL event handler on* (seperti onclick, onsubmit)');

    // Assert komponen esensial
    assert(rendered.includes('TESTTOKEN123456789ABCDEFGHJKMNPQ'), 'Kode token baru tertampil di banner');
    assert(rendered.includes('user-select:all'), 'Kode token punya styling user-select:all untuk mudah disalin');
    assert(rendered.includes('HANYA DITAMPILKAN SEKALI'), 'Peringatan one-time view tertampil');
    assert(rendered.includes('Mardhiana Hamzah'), 'Nama guru tertampil');
    assert(rendered.includes('MTsN 5 ACEH BESAR'), 'Nama instansi tertampil');
    assert(rendered.includes('90 Hari'), 'Opsi 90 hari tersedia');
    assert(rendered.includes('Cabut'), 'Tombol cabut tersedia');
    assert(rendered.includes('AKTIF'), 'Badge status AKTIF tertampil');
    assert(rendered.includes('DICABUT'), 'Badge status DICABUT tertampil');
    assert(rendered.includes('mardhiana'), 'Handle akun guru aktif tertampil');
  }

  console.log('owner-teacher-panel-test: SEMUA ASERSI LULUS (100% PASS)');
})().catch((err) => {
  console.error('owner-teacher-panel-test GAGAL:', err);
  process.exit(1);
});
