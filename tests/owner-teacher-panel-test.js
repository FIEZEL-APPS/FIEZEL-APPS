// tests/owner-teacher-panel-test.js — Pengujian panel kelola token guru di Dashboard Owner.
'use strict';

const assert = require('assert');

(async () => {
  console.log('Memulai owner-teacher-panel-test...');
  const ownerMod = await import('../workers/owner/index.js');

  // 1. Ekspor fungsi wajib ada
  assert(typeof ownerMod.readTeachers === 'function', 'readTeachers diekspor');
  assert(typeof ownerMod.mintTeacherInvite === 'function', 'mintTeacherInvite diekspor');
  assert(typeof ownerMod.revokeTeacherInvite === 'function', 'revokeTeacherInvite diekspor');
  assert(typeof ownerMod.updateTeacherInvite === 'function', 'updateTeacherInvite diekspor');
  assert(typeof ownerMod.deleteTeacherInvite === 'function', 'deleteTeacherInvite diekspor');
  assert(typeof ownerMod.deleteTeacherAccount === 'function', 'deleteTeacherAccount diekspor');
  assert(typeof ownerMod.renderTeacherSection === 'function', 'renderTeacherSection diekspor');
  assert(typeof ownerMod.readSchools === 'function', 'readSchools diekspor');
  assert(typeof ownerMod.createSchool === 'function', 'createSchool diekspor');
  assert(typeof ownerMod.updateSchool === 'function', 'updateSchool diekspor');
  assert(typeof ownerMod.deleteSchool === 'function', 'deleteSchool diekspor');
  assert(typeof ownerMod.readClasses === 'function', 'readClasses diekspor');
  assert(typeof ownerMod.createClass === 'function', 'createClass diekspor');
  assert(typeof ownerMod.regenerateTeacherInvite === 'function', 'regenerateTeacherInvite diekspor');

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
      days: 90,
      class_code: 'FZ-7A9X2K'
    }, mockFetch);

    assert(res.state === 'ok', 'state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher-invite', 'url benar');
    assert(captured.opt.method === 'POST', 'method POST');
    const parsedBody = JSON.parse(captured.opt.body);
    assert(parsedBody.teacherName === 'Mardhiana Hamzah', 'teacherName sesuai');
    assert(parsedBody.institution === 'MTsN 5 ACEH BESAR', 'institution sesuai');
    assert(parsedBody.institutionType === 'school', 'institutionType sesuai');
    assert(parsedBody.days === 90, 'days 90 hari');
    assert(parsedBody.class_code === 'FZ-7A9X2K', 'class_code terkirim');
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

  // 4. updateTeacherInvite mengirim codeHash, subject_id, grade_id
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, updated: true }) };
    };

    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };
    const res = await ownerMod.updateTeacherInvite(env, {
      codeHash: 'a'.repeat(64),
      subject_id: 'IND',
      grade_id: 'SMA'
    }, mockFetch);
    assert(res.state === 'ok', 'update state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher-invite/update', 'update url benar');
    const body = JSON.parse(captured.opt.body);
    assert(body.codeHash === 'a'.repeat(64), 'codeHash terkirim');
    assert(body.subject_id === 'IND', 'subject_id terkirim');
    assert(body.grade_id === 'SMA', 'grade_id terkirim');
  }

  // 5. deleteTeacherInvite mengirim codeHash atau mode bulk
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, deleted: true }) };
    };

    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };
    const res = await ownerMod.deleteTeacherInvite(env, { codeHash: 'b'.repeat(64) }, mockFetch);
    assert(res.state === 'ok', 'delete state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher-invite/delete', 'delete url benar');
    const body = JSON.parse(captured.opt.body);
    assert(body.codeHash === 'b'.repeat(64), 'codeHash terkirim');

    // bulk mode
    await ownerMod.deleteTeacherInvite(env, { mode: 'revoked' }, mockFetch);
    const bodyBulk = JSON.parse(captured.opt.body);
    assert(bodyBulk.mode === 'revoked', 'bulk mode terkirim');
  }

  // 5b. deleteTeacherAccount mengirim sub/handle atau mode all
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, deleted: true }) };
    };

    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };
    const res = await ownerMod.deleteTeacherAccount(env, { sub: 'usr-123', handle: 'pakbudi' }, mockFetch);
    assert(res.state === 'ok', 'deleteTeacherAccount state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher/delete', 'deleteTeacherAccount url benar');
    const body = JSON.parse(captured.opt.body);
    assert(body.sub === 'usr-123' && body.handle === 'pakbudi', 'sub dan handle terkirim');

    // bulk mode
    await ownerMod.deleteTeacherAccount(env, { mode: 'all' }, mockFetch);
    const bodyBulk = JSON.parse(captured.opt.body);
    assert(bodyBulk.mode === 'all', 'bulk mode all terkirim');
  }

  // 6. createSchool, updateSchool, deleteSchool mengirim endpoint dan body yang sesuai
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, id: 'SCH-TEST1234', name: 'MTsN 5 ACEH BESAR' }) };
    };
    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };

    const res = await ownerMod.createSchool(env, {
      name: 'MTsN 5 ACEH BESAR',
      npsn: '10101234',
      level: 'SMP',
      type: 'school',
      city: 'Aceh Besar'
    }, mockFetch);
    assert(res.state === 'ok', 'createSchool state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/school', 'url createSchool benar');
    assert(captured.opt.method === 'POST', 'method POST');
    const b = JSON.parse(captured.opt.body);
    assert(b.name === 'MTsN 5 ACEH BESAR', 'name terkirim');
    assert(b.npsn === '10101234', 'npsn terkirim');

    await ownerMod.updateSchool(env, { id: 'SCH-TEST1234', city: 'Banda Aceh' }, mockFetch);
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/school/update', 'url updateSchool benar');

    await ownerMod.deleteSchool(env, { id: 'SCH-TEST1234' }, mockFetch);
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/school/delete', 'url deleteSchool benar');
  }

  // 7. createClass dan readClasses bekerja presisi
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, code: 'FZ-7A9X2K', title: 'Kelas 7-A' }) };
    };
    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };

    const res = await ownerMod.createClass(env, { title: 'Kelas 7-A', level: 'SMP', code: 'FZ-7A9X2K' }, mockFetch);
    assert(res.state === 'ok', 'createClass state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/class', 'url createClass benar');
    const b = JSON.parse(captured.opt.body);
    assert(b.code === 'FZ-7A9X2K', 'code terkirim');
    assert(b.title === 'Kelas 7-A', 'title terkirim');

    await ownerMod.readClasses(env, mockFetch);
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/classes', 'url readClasses benar');
  }

  // 8. regenerateTeacherInvite mengirim codeHash dan endpoint regenerasi
  {
    let captured = null;
    const mockFetch = async (url, opt) => {
      captured = { url, opt };
      return { ok: true, status: 200, json: async () => ({ ok: true, code: 'REGENCODE123456789ABCDEFGHJKMNPQ' }) };
    };
    const env = { EVIDENCE_API_BASE: 'https://api.fiezel.my.id', EVIDENCE_API_TOKEN: 'secret-owner-token' };

    const res = await ownerMod.regenerateTeacherInvite(env, { codeHash: 'c'.repeat(64) }, mockFetch);
    assert(res.state === 'ok', 'regenerate state ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/teacher-invite/regenerate', 'url regenerate benar');
    const b = JSON.parse(captured.opt.body);
    assert(b.codeHash === 'c'.repeat(64), 'codeHash terkirim');
  }

  // 9. renderTeacherSection mematuhi CSP (Zero inline script & inline on* handlers)
  {
    const model = {
      schools: {
        state: 'ok',
        schools: [
          {
            id: 'SCH-TEST1234',
            name: 'MTsN 5 ACEH BESAR',
            npsn: '10101234',
            level: 'SMP',
            type: 'school',
            city: 'Aceh Besar',
            created_at: Date.now() - 86400000
          }
        ]
      },
      classes: {
        state: 'ok',
        classes: [
          {
            code: 'FZ-7A9X2K',
            title: 'Kelas 7-A Unggulan',
            level: 'SMP',
            school_id: 'SCH-TEST1234',
            created_at: Date.now() - 86400000
          }
        ]
      },
      selectedClass: 'FZ-7A9X2K',
      teachers: {
        state: 'ok',
        invites: [
          {
            teacherName: 'Mardhiana Hamzah',
            institution: 'MTsN 5 ACEH BESAR',
            institutionType: 'school',
            status: 'ACTIVE',
            codeHash: 'b'.repeat(64),
            rawCode: '23456789ABCDEFGHJKMNPQRSTVWXYZ12',
            subject_id: 'MAT',
            grade_id: 'SMP',
            classCode: 'FZ-7A9X2K',
            createdAt: Date.now() - 3600000,
            expiresAt: Date.now() + 89 * 86400000
          },
          {
            teacherName: 'Guru Lama',
            institution: 'SMA 1',
            institutionType: 'school',
            status: 'REVOKED',
            codeHash: 'c'.repeat(64),
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
    assert(rendered.includes('23456789ABCDEFGHJKMNPQRSTVWXYZ12'), 'Kode token terlihat di kolom Kode Token');
    assert(rendered.includes('user-select:all'), 'Kode token punya styling user-select:all untuk mudah disalin');
    assert(rendered.includes('HANYA DITAMPILKAN SEKALI'), 'Peringatan one-time view tertampil');
    assert(rendered.includes('Mardhiana Hamzah'), 'Nama guru tertampil');
    assert(rendered.includes('MTsN 5 ACEH BESAR'), 'Nama instansi tertampil');
    assert(rendered.includes('90 Hari'), 'Opsi 90 hari tersedia');
    assert(rendered.includes('Cabut'), 'Tombol cabut tersedia');
    assert(rendered.includes('Edit'), 'Tombol/opsi edit tersedia');
    assert(rendered.includes('value="update_invite"'), 'Form update invite tersedia');
    assert(rendered.includes('value="delete_invite"'), 'Form delete invite tersedia');
    assert(rendered.includes('value="clear_invites"'), 'Toolbar bersihkan token tersedia');
    assert(rendered.includes('AKTIF'), 'Badge status AKTIF tertampil');
    assert(rendered.includes('DICABUT'), 'Badge status DICABUT tertampil');
    assert(rendered.includes('mardhiana'), 'Handle akun guru aktif tertampil');
    assert(rendered.includes('Panel Kelas &amp; Token Guru (17 Mata Pelajaran)'), 'Panel Kelas 17 Mapel tertampil');
    assert(rendered.includes('Bahasa Inggris'), 'Mapel Bahasa Inggris tertampil di grid mapel');
    assert(rendered.includes('Matematika'), 'Mapel Matematika tertampil di grid mapel');
    assert(rendered.includes('Kode Kelas'), 'Kolom/info Kode Kelas tertampil');

    // Asersi Fitur Baru Rekonstruksi:
    assert(rendered.includes('id="school-panel"'), 'Panel khusus sekolah mitra tertampil');
    assert(rendered.includes('value="create_school"'), 'Form registrasi sekolah mitra tersedia');
    assert(rendered.includes('value="create_class"'), 'Form pembuatan kelas persisten D1 tersedia');
    assert(rendered.includes('TERSIMPAN PERMANEN'), 'Badge kelas persisten D1 tertampil');
    assert(rendered.includes('value="regenerate_invite"'), 'Aksi regenerasi token guru tersedia');
    assert(rendered.includes('extend_days'), 'Pilihan perpanjang masa aktif token tersedia di edit');
    assert(rendered.includes('FZ-7A9X2K'), 'Kode kelas persisten dari database tertampil');
    assert(rendered.includes('value="delete_teacher"'), 'Form delete_teacher tersedia');
    assert(rendered.includes('Bersihkan Semua Akun Guru'), 'Tombol bersihkan semua guru aktif tersedia');
  }

  console.log('owner-teacher-panel-test: SEMUA ASERSI LULUS (100% PASS)');
})().catch((err) => {
  console.error('owner-teacher-panel-test GAGAL:', err);
  process.exit(1);
});
