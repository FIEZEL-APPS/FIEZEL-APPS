'use strict';
const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const ui=read('features/ui/fiezel-owner-redesign-v1.js');
const css=read('features/ui/fiezel-owner-redesign-v1.css');
const lessons=JSON.parse(read('features/classroom/classroom-lessons-v1.json'));

for(const label of ['Today','Learn','Classroom','Practice','Journey']){
  assert.ok(index.includes(`>${label}<`) || index.includes(`>${label}</span>`),`primary nav must expose ${label}`);
}
assert.strictEqual((index.match(/class="nav/g)||[]).length,5,'primary nav must stay exactly five destinations');
assert.ok(index.indexOf('./features/ui/fiezel-owner-redesign-v1.js')>index.indexOf('./app.js'),'owner layer must load after app.js');
assert.ok(ui.includes("'learn'") && ui.includes("'practice'"),'learn/practice hubs must be routable');
assert.ok(ui.includes('FiezelIndonesianVoice'),'Classroom must route tutor narration through Indonesian neural bundle');
assert.ok(ui.includes("lang:'id-ID'") || ui.includes('lang:"id-ID"'),'Classroom Indonesian tutor speech must declare id-ID');
assert.ok(ui.includes('allowFallback:false'),'Classroom tutor must remain neural-only');
assert.ok(!ui.includes('Belajar dengan suara Inggris + subtitle Indonesia'),'owner Classroom layer must not advertise the old English-tutor contract');
assert.strictEqual(lessons.voiceContract.speech,'id-ID neural tutor','lesson pack must declare Indonesian neural tutor speech');
assert.ok(css.includes('FIEZEL Owner Redesign v1'),'owner redesign stylesheet marker missing');
for(const cls of ['learning-hub-grid','classroom-workspace','tutor-rail']) assert.ok(css.includes(`.${cls}`),`redesign class ${cls} missing`);
console.log('owner redesign contract PASS');
