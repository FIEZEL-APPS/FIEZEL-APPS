/**
 * workers/api/teacher/class-sync-core.js — INTI MURNI sinkron Ruang Guru.
 * Tanpa D1, tanpa Request: hanya validasi bentuk, normalisasi, dan pembatas laju.
 * Handler-nya (route-class-sync.js) tipis; yang diuji gerbang adalah berkas ini.
 *
 * Kontrak privasi (bab 29): laporan murid HANYA memuat nama depan (<=24 huruf),
 * akurasi agregat per skill (benar/total), jumlah sesi, tujuan belajar, dan ID
 * tugas yang selesai. Tidak ada jawaban mentah, teks bebas, atau transkrip.
 */

export const CLASS_CODE_RE = /^FZ-[A-HJ-NP-Z2-9]{6}$/;
export const LIMITS = Object.freeze({
  NAME_MAX: 24, TITLE_MAX: 60, SKILLS_MAX: 12, SKILL_KEY_MAX: 32, COUNT_MAX: 5000,
  ASSIGN_MAX: 8, ASSIGN_ID_MAX: 40, REPORTS_PAGE: 200,
  LEARNER_MIN_INTERVAL_MS: 15000, TEACHER_MIN_INTERVAL_MS: 3000
});

/** normalizeClassCode(raw) -> 'FZ-XXXXXX' | null. Toleran terhadap huruf kecil dan tanpa strip. */
export function normalizeClassCode(raw) {
  let v = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.startsWith('FZ')) v = v.slice(2);
  const code = 'FZ-' + v;
  return CLASS_CODE_RE.test(code) ? code : null;
}

export function firstName(raw) {
  const s = String(raw || '').trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}'’.-]/gu, '');
  return s.slice(0, LIMITS.NAME_MAX);
}
export function learnerKey(name) { return firstName(name).toLocaleLowerCase('id'); }

function intIn(v, max) { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= max ? n : null; }

/**
 * normalizeReport(body, nowMs) -> { ok:true, code, name, key, report } | { ok:false, reason }
 * `report` adalah bentuk yang disimpan ke report_json dan dibaca klien guru
 * (sama dengan payload "kode hasil untuk tutor" versi 1).
 */
export function normalizeReport(body, nowMs) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'not_object' };
  const code = normalizeClassCode(body.cls);
  if (!code) return { ok: false, reason: 'bad_class_code' };
  const name = firstName(body.name);
  if (!name) return { ok: false, reason: 'bad_name' };
  const skillsIn = body.skills;
  if (!skillsIn || typeof skillsIn !== 'object' || Array.isArray(skillsIn)) return { ok: false, reason: 'bad_skills' };
  const keys = Object.keys(skillsIn);
  if (keys.length > LIMITS.SKILLS_MAX) return { ok: false, reason: 'too_many_skills' };
  const skills = {};
  for (const k of keys) {
    if (!/^[a-z0-9_]{1,32}$/.test(k)) return { ok: false, reason: 'bad_skill_key' };
    const c = intIn(skillsIn[k] && skillsIn[k].c, LIMITS.COUNT_MAX), t = intIn(skillsIn[k] && skillsIn[k].t, LIMITS.COUNT_MAX);
    if (c == null || t == null || c > t) return { ok: false, reason: 'bad_skill_count' };
    skills[k] = { c, t };
  }
  const at = Number(body.at);
  const reportedAt = Number.isFinite(at) && Math.abs(at - nowMs) < 3 * 86400000 ? Math.round(at) : nowMs;
  const lessons = intIn(body.lessons, LIMITS.COUNT_MAX) || 0;
  const goal = typeof body.goal === 'string' && /^[a-z_]{1,24}$/.test(body.goal) ? body.goal : undefined;
  let assign;
  if (body.assign !== undefined) {
    if (!Array.isArray(body.assign) || body.assign.length > LIMITS.ASSIGN_MAX) return { ok: false, reason: 'bad_assign' };
    assign = [];
    for (const a of body.assign) {
      const id = a && typeof a.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(a.id) ? a.id : null;
      if (!id) return { ok: false, reason: 'bad_assign_id' };
      const c = intIn(a.c, LIMITS.COUNT_MAX), t = intIn(a.t, LIMITS.COUNT_MAX);
      assign.push({ id, at: Number(a.at) || reportedAt, c: c == null ? undefined : c, t: t == null ? undefined : t });
    }
  }
  return { ok: true, code, name, key: learnerKey(name), report: { v: 1, name, at: reportedAt, goal, skills, lessons, cls: code, assign } };
}

/** normalizeClaim(body) -> { ok, code, title, level } | { ok:false, reason } */
export function normalizeClaim(body) {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'not_object' };
  const code = normalizeClassCode(body.code);
  if (!code) return { ok: false, reason: 'bad_class_code' };
  const title = String(body.title || '').trim().slice(0, LIMITS.TITLE_MAX) || 'Kelas';
  const level = typeof body.level === 'string' && /^[ABC][12]$/.test(body.level) ? body.level : null;
  return { ok: true, code, title, level };
}

/** Pembatas laju per kunci dalam memori isolate: cukup untuk menahan banjir satu perangkat. */
export function makeRateLimiter(minIntervalMs, capacity = 4000) {
  const last = new Map();
  return function allow(key, nowMs) {
    const prev = last.get(key) || 0;
    if (nowMs - prev < minIntervalMs) return false;
    if (last.size >= capacity) last.clear();
    last.set(key, nowMs);
    return true;
  };
}

/** Baris D1 -> objek yang dibaca klien guru. report_json yang rusak dibuang, bukan melempar. */
export function rowToReport(row) {
  let report = null;
  try { report = JSON.parse(row.report_json); } catch { report = null; }
  if (!report || typeof report !== 'object') return null;
  return { key: row.learner_key, name: row.display_name, reportedAt: Number(row.reported_at) || 0, updatedAt: Number(row.updated_at) || 0, report };
}
