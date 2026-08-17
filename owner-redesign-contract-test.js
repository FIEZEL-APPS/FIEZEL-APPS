'use strict';
const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const app=read('app.js');
const css=read('style.css');
const lessons=JSON.parse(read('features/classroom/classroom-lessons-v1.json'));

for(const label of ['Today','Learn','Classroom','Practice','Journey']){
  assert.ok(index.includes(`>${label}<`) || index.includes(`>${label}</span>`),`primary nav must expose ${label}`);
}
assert.ok(app.includes("'learn'") && app.includes("'practice'"),'learn/practice hubs must be routable');
assert.ok(app.includes('FiezelIndonesianVoice'),'Classroom must route tutor narration through Indonesian neural bundle');
assert.ok(app.includes("lang:'id-ID'") || app.includes('lang:"id-ID"'),'Classroom Indonesian tutor speech must declare id-ID');
assert.ok(app.includes('allowFallback:false'),'Classroom tutor must remain neural-only');
assert.ok(!app.includes('Belajar dengan suara Inggris + subtitle Indonesia'),'old English-tutor Classroom contract must be removed');
assert.strictEqual(lessons.voiceContract.speech,'id-ID neural tutor','lesson pack must declare Indonesian neural tutor speech');
assert.ok(css.includes('FIEZEL Owner Redesign v1'),'owner redesign stylesheet marker missing');
for(const cls of ['learning-hub-grid','classroom-workspace','tutor-rail']) assert.ok(css.includes(`.${cls}`),`redesign class ${cls} missing`);
console.log('owner redesign contract PASS');
