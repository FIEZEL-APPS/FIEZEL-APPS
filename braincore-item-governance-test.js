#!/usr/bin/env node
'use strict';
const assert = require('assert');
const G = require('./braincore-item-governance.js');
const T0 = 1_700_000_000_000;
const cleanQa = { schema: G.QA_SCHEMA, version: 'proof', blockingFindings: [], reviewQueue: [] };
const qa = (blockingFindings, reviewQueue) => ({ schema: G.QA_SCHEMA, version: 'proof', blockingFindings: blockingFindings || [], reviewQueue: reviewQueue || [] });
const item = (id, contentRevision='rev-a') => ({ id, contentRevision });
const agg = (o={}) => ({ schema:G.AGGREGATE_SCHEMA, contentRevision:'rev-a', exposures:30, independentLearners:10, ...o });
let failures=0; function test(n,f){try{f();console.log('ok - '+n)}catch(e){failures++;console.error('FAIL - '+n+'\n    '+(e.stack||e.message))}}

test('unknown item fail-closed and clean deterministic QA activates exact revision',()=>{
  let s=G.createState(); assert.strictEqual(G.isEligible(s,item('q1')),false); s=G.admitFromQa(s,item('q1'),cleanQa,T0); assert.strictEqual(G.statusFor(s,item('q1')).status,G.STATUS.ACTIVE); assert.strictEqual(G.isEligible(s,item('q1')),true); assert.strictEqual(G.isEligible(s,item('q1','rev-b')),false);
});
test('deterministic blocker quarantines before exposure',()=>{
  const report=qa([{itemId:'q1',category:'ambiguity',severity:'blocker'}],[]); const s=G.admitFromQa(G.createState(),item('q1'),report,T0); const st=G.statusFor(s,'q1'); assert.strictEqual(st.status,G.STATUS.QUARANTINED); assert.strictEqual(st.eligible,false); assert(st.reasonCodes.includes('brain3_item_qa_ambiguity'));
});
test('review finding is withheld rather than optimistically exposed',()=>{
  const report=qa([],[{itemId:'q1',category:'weak_distractor',severity:'review'}]); const s=G.admitFromQa(G.createState(),item('q1'),report,T0); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.REVIEW_REQUIRED); assert.strictEqual(G.isEligible(s,'q1'),false);
});
test('passage-level finding applies to a reading question id',()=>{
  const report=qa([{itemId:'r0001',category:'evidence_mismatch',severity:'blocker'}],[]); const s=G.admitFromQa(G.createState(),item('r0001#3'),report,T0); assert.strictEqual(G.statusFor(s,'r0001#3').status,G.STATUS.QUARANTINED);
});
test('clean QA on same content revision cannot silently clear quarantine; changed revision can',()=>{
  let s=G.admitFromQa(G.createState(),item('q1'),qa([{itemId:'q1',category:'ambiguity',severity:'blocker'}],[]),T0); s=G.admitFromQa(s,item('q1'),cleanQa,T0+1); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.QUARANTINED); s=G.admitFromQa(s,item('q1','rev-b'),cleanQa,T0+2); assert.strictEqual(G.statusFor(s,item('q1','rev-b')).status,G.STATUS.ACTIVE);
});
test('single learner or too few exposures can never empirically quarantine',()=>{
  let s=G.admitFromQa(G.createState(),item('q1'),cleanQa,T0); s=G.observeAggregate(s,'q1',agg({exposures:200,independentLearners:1,graderDisagreements:100}),T0+1); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.ACTIVE); assert.deepStrictEqual(G.statusFor(s,'q1').reasonCodes,['brain3_item_health_insufficient_evidence']);
});
test('qualified strong grader disagreement quarantines and is sticky across healthy windows',()=>{
  let s=G.admitFromQa(G.createState(),item('q1'),cleanQa,T0); s=G.observeAggregate(s,'q1',agg({exposures:40,independentLearners:12,graderDisagreements:8}),T0+1); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.QUARANTINED); s=G.observeAggregate(s,'q1',agg({exposures:100,independentLearners:30,graderDisagreements:0,answerDisputes:0,renderFailures:0,correctRate:.7,expectedCorrectRate:.7,discrimination:.4,distractorCoverage:.8}),T0+2); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.QUARANTINED); assert(G.statusFor(s,'q1').reasonCodes.includes('brain3_item_quarantine_sticky_manual_review_required'));
});
test('difficulty mismatch yields review hold; two healthy qualified windows recover review item',()=>{
  let s=G.admitFromQa(G.createState(),item('q1'),cleanQa,T0); s=G.observeAggregate(s,'q1',agg({exposures:40,independentLearners:12,correctRate:.95,expectedCorrectRate:.4}),T0+1); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.REVIEW_REQUIRED); const healthy=agg({exposures:60,independentLearners:20,correctRate:.7,expectedCorrectRate:.65,discrimination:.3,distractorCoverage:.8}); s=G.observeAggregate(s,'q1',healthy,T0+2); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.REVIEW_REQUIRED); s=G.observeAggregate(s,'q1',healthy,T0+3); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.ACTIVE);
});
test('stale empirical evidence fails closed',()=>{
  const s=G.admitFromQa(G.createState(),item('q1'),cleanQa,T0); assert.throws(()=>G.observeAggregate(s,'q1',agg({contentRevision:'old'}),T0+1),e=>e.code==='BRAINCORE_ITEM_STALE_EVIDENCE');
});
test('manual review is explicit, referenced and auditable',()=>{
  let s=G.admitFromQa(G.createState(),item('q1'),qa([{itemId:'q1',category:'ambiguity',severity:'blocker'}],[]),T0); s=G.reviewItem(s,'q1',{approved:true,reviewRef:'review-42',note:'answer key independently checked'},T0+1); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.ACTIVE); assert.strictEqual(s.items.q1.history.at(-1).source,'manual_review'); assert.strictEqual(s.items.q1.history.at(-1).evidence.reviewRef,'review-42');
});
test('selector returns only admitted active exact revisions',()=>{
  let s=G.createState(); s=G.admitFromQa(s,item('good'),cleanQa,T0); s=G.admitFromQa(s,item('bad'),qa([{itemId:'bad',category:'ambiguity',severity:'blocker'}],[]),T0); const rows=[item('good'),item('bad'),item('unknown'),item('good','old')]; assert.deepStrictEqual(G.filterEligible(s,rows).map(x=>x.id),['good']);
});
test('state export/import detached and hostile/invalid state rejected',()=>{
  let s=G.admitFromQa(G.createState(),item('q1'),cleanQa,T0); const e=G.exportState(s),i=G.importState(e); e.items.q1.status='retired'; i.items.q1.reasonCodes.push('poison'); assert.strictEqual(G.statusFor(s,'q1').status,G.STATUS.ACTIVE); assert.throws(()=>G.importState({...s,schema:'alien'}),/schema/); const bad=JSON.parse(JSON.stringify(s)); bad.items.q1.eligible=false; assert.throws(()=>G.importState(bad),/eligibility/);
});
test('module has no clock, DOM, network, storage or randomness',()=>{
  const fs=require('fs'),src=fs.readFileSync(__dirname+'/braincore-item-governance.js','utf8'); for(const banned of ['Date.now','Math.random','localStorage','sessionStorage','document.','window.','fetch(','XMLHttpRequest','WebSocket']) assert.strictEqual(src.includes(banned),false,'touches '+banned);
});
if(failures){console.error('\nBraincoreItemGovernance: FAIL ('+failures+')');process.exit(1)} console.log('BraincoreItemGovernance: PASS');
