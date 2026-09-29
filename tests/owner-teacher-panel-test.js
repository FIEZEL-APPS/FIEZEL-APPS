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
  assert(typeof ownerMod.triggerMasterSeed === 'function', 'triggerMasterSeed diekspor');
  assert(typeof ownerMod.readCurriculumStatus === 'function', 'readCurriculumStatus diekspor');
  assert(typeof ownerMod.renderCurriculumSyncSection === 'function', 'renderCurriculumSyncSection diekspor');

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

    // Test deleteClass (single)
    const delSingle = await ownerMod.deleteClass(env, { code: 'FZ-7A9X2K' }, mockFetch);
    assert(delSingle.state === 'ok', 'deleteClass single ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/class/delete', 'url deleteClass benar');
    const bDel = JSON.parse(captured.opt.body);
    assert(bDel.code === 'FZ-7A9X2K', 'code terkirim ke deleteClass');

    // Test deleteClass (all)
    const delAll = await ownerMod.deleteClass(env, { mode: 'all' }, mockFetch);
    assert(delAll.state === 'ok', 'deleteClass all ok');
    assert(captured.url === 'https://api.fiezel.my.id/api/owner/class/delete', 'url deleteClass all benar');
    const bDelAll = JSON.parse(captured.opt.body);
    assert(bDelAll.mode === 'all', 'mode all terkirim ke deleteClass');
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

  // 8b. triggerMasterSeed: status-dulu, lewati-bila-penuh, tolak-anonim-dengan-jujur.
  // 8b-i. Backend belum tersemai → 3 GET status + 3 POST seed, hasil ok.
  {
    const captured = [];
    const mockFetch = async (url, opt) => {
      captured.push({ url, opt });
      if ((opt && opt.method) === 'POST') {
        return { ok: true, status: 200, json: async () => ({ ok: true, seeded: true }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, seeded: false, in_this_wave: 1137, from_this_seeder: 0 }) };
    };
    const env = { CURRICULUM_API_URL: 'https://fiezel-apps.onrender.com' };
    const res = await ownerMod.triggerMasterSeed(env, mockFetch);
    assert(res.state === 'ok', 'triggerMasterSeed state ok');
    assert(res.ok === true, 'triggerMasterSeed ok true');
    const posts = captured.filter((c) => c.opt && c.opt.method === 'POST');
    const gets = captured.filter((c) => !c.opt || c.opt.method !== 'POST');
    assert(gets.length === 3, 'membaca 3 status dulu, dapat ' + gets.length);
    assert(posts.length === 3, 'memicu 3 endpoint yang kurang, dapat ' + posts.length);
    assert(posts.some(c => c.url.includes('/api/seed/mapel')), 'memanggil seed mapel');
    assert(posts.some(c => c.url.includes('/api/seed/english')), 'memanggil seed english');
    assert(posts.some(c => c.url.includes('/api/seed/soal')), 'memanggil seed soal');
  }

  // 8b-ii. Backend sudah penuh → NOL POST (POST anonim pasti 401, tak perlu ditembakkan).
  {
    const captured = [];
    const mockFetch = async (url, opt) => {
      captured.push({ url, opt });
      return {
        ok: true, status: 200,
        json: async () => ({ ok: true, seeded: true, in_this_wave: 1137, from_this_seeder: 1137, competencies_with_questions: 291 })
      };
    };
    const env = { CURRICULUM_API_URL: 'https://fiezel-apps.onrender.com' };
    const res = await ownerMod.triggerMasterSeed(env, mockFetch);
    assert(res.state === 'ok' && res.ok === true, 'sudah-penuh tetap hijau jujur');
    assert(res.skipped === true, 'menandai skipped');
    assert(!captured.some((c) => c.opt && c.opt.method === 'POST'), 'nol POST saat sudah penuh');
    assert(res.message.includes('1137'), 'pesan menyebut hitungan riil');
  }

  // 8b-iii. POST ditolak 401 → state auth (bukan sukses palsu, bukan pending abadi).
  {
    const mockFetch = async (url, opt) => {
      if (opt && opt.method === 'POST') return { ok: false, status: 401, json: async () => ({ detail: 'Not authenticated' }) };
      return { ok: true, status: 200, json: async () => ({ ok: true, seeded: false, in_this_wave: 1137, from_this_seeder: 0 }) };
    };
    const env = { CURRICULUM_API_URL: 'https://fiezel-apps.onrender.com' };
    const res = await ownerMod.triggerMasterSeed(env, mockFetch);
    assert(res.state === 'auth', 'penolakan 401 menjadi state auth, dapat ' + res.state);
    assert(res.ok === false, 'auth tidak berpura-pura ok');
    assert(res.error === 'seed_auth_required', 'kode galat jujur');
    assert(/tetap aktif/i.test(res.message), 'pesan menegaskan data lama tetap aktif');
  }

  // 8b-iv. Banner auth merender penjelasan, bukan banner hijau 100%.
  {
    const modelAuth = {
      teachers: { state: 'ok', invites: [], teachers: [] },
      schools: { state: 'ok', schools: [] },
      classes: { state: 'ok', classes: [] },
      teacherAction: { ok: false, action: 'master_seed', state: 'auth', error: 'seed_auth_required', message: 'Backend menolak pemicu anonim. Data lama tetap aktif.' }
    };
    const renderedAuth = ownerMod.renderTeacherSection(modelAuth);
    assert(renderedAuth.includes('tetap aktif'), 'banner auth menegaskan data aktif');
    assert(!renderedAuth.includes('Berhasil 100%!'), 'banner auth tidak memakai label 100%');
  }

  // 8c. renderCurriculumSyncSection merender kartu dan panduan sinkronisasi
  {
    const syncHtml = ownerMod.renderCurriculumSyncSection({});
    assert(syncHtml.includes('id="curriculum-sync"'), 'memiliki anchor id curriculum-sync');
    assert(syncHtml.includes('value="master_seed"'), 'memiliki form action master_seed');
    assert(syncHtml.includes('17 Mapel Nasional'), 'memiliki kartu 17 Mapel');
    assert(syncHtml.includes('Bahasa Inggris Kurmer'), 'memiliki kartu Bahasa Inggris Kurmer');
    assert(syncHtml.includes('Bank Soal'), 'memiliki kartu Bank Soal');
    assert(syncHtml.includes('Kapan Owner Harus Menekan Tombol Ini?'), 'memiliki panduan kapan harus ditekan');
    assert(syncHtml.includes('Bagaimana Cara Tahu Kalau Sudah Bekerja &amp; Aktif?'), 'memiliki panduan verifikasi aktif');
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
    assert(rendered.includes('Bersihkan Semua Kelas'), 'Tombol bersihkan semua kelas tersedia');
    assert(rendered.includes('Hapus Kelas'), 'Tombol hapus kelas tersedia');

    // Asersi Fitur Master Kurikulum 1-Klik:
    assert(rendered.includes('id="curriculum-sync"'), 'Panel Master Kurikulum tertampil di teacher section');
    assert(rendered.includes('value="master_seed"'), 'Form One-Click Master Sync tersedia');
    assert(rendered.includes('Semai &amp; Aktifkan Semua Kurikulum Sekarang'), 'Tombol One-Click Master Sync tertampil');
  }

  // 10. Banner sukses saat action === 'master_seed'
  {
    const modelWithSeed = {
      teachers: { state: 'ok', invites: [], teachers: [] },
      schools: { state: 'ok', schools: [] },
      classes: { state: 'ok', classes: [] },
      teacherAction: {
        ok: true,
        action: 'master_seed',
        message: 'Seluruh 17 Mapel Nasional, Bahasa Inggris (144 Kompetensi), dan Bank Soal telah berhasil diaktifkan 100%!'
      }
    };
    const renderedSeed = ownerMod.renderTeacherSection(modelWithSeed);
    assert(renderedSeed.includes('Sinkronisasi Master Kurikulum &amp; Bank Soal Berhasil 100%!'), 'Banner sukses master_seed tertampil');
    assert(renderedSeed.includes('17 Mata Pelajaran Aktif'), 'Indikator 17 Mapel aktif di banner');
    assert(renderedSeed.includes('72 TP · 144 Kompetensi'), 'Indikator Bahasa Inggris di banner');
  }

  // 10b. Status seed jujur: pending saat sebagian gagal, error saat semua gagal
  {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    const partialFetch = async (url) => {
      if (String(url).includes('/api/seed/soal')) throw abortErr;
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    const env = { CURRICULUM_API_URL: 'https://fiezel-apps.onrender.com' };
    const partial = await ownerMod.triggerMasterSeed(env, partialFetch);
    assert(partial.state === 'pending', 'seed sebagian gagal harus pending, bukan ok palsu');
    assert(partial.ok === true, 'pending tetap ok true (sinyal terkirim, proses di background)');
    assert(partial.details && partial.details.soal && partial.details.soal.aborted === true, 'detail mencatat endpoint yang abort');

    const deadFetch = async () => { throw new Error('connect refused'); };
    const total = await ownerMod.triggerMasterSeed(env, deadFetch);
    assert(total.state === 'error', 'seed total gagal harus error');
    assert(total.ok === false, 'error harus ok false');
  }

  // 10c. readCurriculumStatus: terukur saat backend menjawab, unavailable saat mati
  {
    assert(typeof ownerMod.readCurriculumStatus === 'function', 'readCurriculumStatus diekspor');
    const env = { CURRICULUM_API_URL: 'https://fiezel-apps.onrender.com' };
    const goodFetch = async (url) => ({
      ok: true, status: 200,
      json: async () => (String(url).includes('/soal/') ? { from_this_seeder: 10, competencies_with_questions: 5 } : { competencies: 144 })
    });
    const measured = await ownerMod.readCurriculumStatus(env, goodFetch);
    assert(measured.state === 'measured', 'backend menjawab harus measured');
    assert(measured.soal.body.from_this_seeder === 10, 'body soal diteruskan apa adanya');

    const deadFetch = async () => { throw new Error('down'); };
    const unavailable = await ownerMod.readCurriculumStatus(env, deadFetch);
    assert(unavailable.state === 'unavailable', 'backend mati harus unavailable, bukan throw');
  }

  // 10d. Strip hitungan riil muncul bila status diukur, hilang bila tidak ada
  {
    const cs = {
      state: 'measured',
      mapel: { ok: true, body: { competencies: 210 } },
      english: { ok: true, body: { competencies: 144 } },
      soal: { ok: true, body: { from_this_seeder: 40, competencies_with_questions: 30 } }
    };
    const withStrip = ownerMod.renderCurriculumSyncSection({ curriculumStatus: cs });
    assert(withStrip.includes('Hitungan riil backend'), 'strip hitungan riil tidak tampil saat terukur');
    assert(withStrip.includes('TERUKUR'), 'label TERUKUR tidak tampil');
    const withoutStrip = ownerMod.renderCurriculumSyncSection({});
    assert(!withoutStrip.includes('Hitungan riil backend'), 'strip hitungan riil tampil padahal tidak ada status — angka dari udara');
  }

  console.log('owner-teacher-panel-test: SEMUA ASERSI LULUS (100% PASS)');
})().catch((err) => {
  console.error('owner-teacher-panel-test GAGAL:', err);
  process.exit(1);
});
