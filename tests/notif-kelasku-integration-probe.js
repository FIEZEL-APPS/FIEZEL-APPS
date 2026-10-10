#!/usr/bin/env node
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('=== TEST NOTIFIKASI KELASKU INTEGRATION & RUNNER TRANSITION ===');

// 1. Validasi app.js wiring
const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
assert.ok(appSrc.includes("self.FiezelClassHub.openAssignment(e.aid)"), 'openAssignmentFromNotif memanggil openAssignment(e.aid)');
assert.ok(appSrc.includes("go('classroom');return true"), 'openAssignmentFromNotif navigasi ke classroom');
assert.ok(appSrc.includes("uiSfx('notif_general')"), 'inboxPoll memainkan audio notif_general');
assert.ok(appSrc.includes("self.FiezelClassHub?.renderStudent?.()"), 'inboxPoll merefresh student view seketika');
assert.ok(appSrc.includes("new BroadcastChannel('fiezel-assignment-sync')"), 'BroadcastChannel terpasang di app.js');

// 2. Validasi fiezel-class-hub.js
const hubSrc = fs.readFileSync(path.join(ROOT, 'features/class-hub/fiezel-class-hub.js'), 'utf8');
assert.ok(hubSrc.includes('assignmentSubjectId(a)'), 'assignmentSubjectId terdefinisi di class hub');
assert.ok(hubSrc.includes('root.FiezelInbox.get(id)'), 'openAssignment memiliki fallback ke FiezelInbox');
assert.ok(hubSrc.includes('cleanId = String(id).replace(/^ta-/, \'\')'), 'openAssignment menangani prefix ta-');

// 3. Validasi fiezel-inbox.js
const inboxSrc = fs.readFileSync(path.join(ROOT, 'features/notify/fiezel-inbox.js'), 'utf8');
assert.ok(inboxSrc.includes("e.aid === sId || e.id === ('ta-' + sId)"), 'get(id) di inbox memeriksa prefix ta- dan aid');
assert.ok(inboxSrc.includes('TS.acceptAssignmentPayload(payload)'), 'add(entry) di inbox menginjeksi payload ke TeacherStore');

// 4. Validasi fiezel-ui-sfx.js
const sfxSrc = fs.readFileSync(path.join(ROOT, 'features/audio/fiezel-ui-sfx.js'), 'utf8');
assert.ok(sfxSrc.includes("notif:        'notif_general'"), 'notif dialiaskan ke notif_general');

console.log('PASS: Semua kabel notifikasi, SFX, filter subject, dan transisi runner valid!');
