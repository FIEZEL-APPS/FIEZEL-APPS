// Test gate promosi berbasis statistik (rewire temuan council §3.2):
// keputusan promote/reject datang dari FiezelStatGate.verdict, ambang lama 8-attempt
// hanya guard runtime-safety, dan 'hold' tanpa batas waktu adalah hasil SAH.
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const gate=require('./content-patch-gate.js'),canary=require('./content-canary.js'),builder=require('./content-canary-config-builder.js'),promotion=require('./content-promotion.js');
const ok=m=>console.log('ok - '+m);
(async()=>{
  const input=gate.loadCanonical(),candidate=gate.proofCandidate(input),gated=gate.validateCandidate(candidate,input);assert(gated.ok,'proof candidate must pass guarded gate');ok('proof candidate passes guarded gate');
  const config=builder.buildConfig(candidate,{mode:'canary',canaryId:'promotion-proof-5.17.0',exposurePercent:10,maxExposureSessions:20,expiresAt:'2026-08-20T00:00:00Z',targetLearnerKey:'Jahran'}).config;
  const at=Date.parse('2026-08-12T00:00:00Z');
  const empty=canary.initialEvidence(config.canaryId);
  // Kontrak brain3: setiap keputusan membawa rationale brain3_ + confidence numerik.
  const holdEmpty=promotion.evaluate(config,empty,at);
  assert(holdEmpty.status==='hold'&&holdEmpty.reason==='insufficient_exposure_sessions','empty evidence must hold');
  assert(typeof holdEmpty.rationale==='string'&&holdEmpty.rationale.startsWith('brain3_')&&typeof holdEmpty.confidence==='number','decision must carry brain3_ rationale and numeric confidence');
  ok('empty evidence holds and carries brain3_ rationale + confidence');
  // ---- DATA TIPIS: ambang lama (8 attempt/lengan, toleransi 5pp) lolos, tapi gate
  // statistik WAJIB menahan — inilah perbaikan lempar-koin §3.2. Hold di sini adalah
  // hasil sah tanpa batas waktu, BUKAN kegagalan. ----
  const thin={...empty,exposureSessions:5,controlAttempts:8,controlCorrect:6,controlIncorrect:2,canaryAttempts:8,canaryCorrect:6,canaryIncorrect:2};
  const thinDecision=promotion.evaluate(config,thin,at);
  assert(thinDecision.status==='hold'&&thinDecision.reason==='stat_underpowered','thin data (8/arm) must hold, never promote');
  assert(thinDecision.metrics.statRationale==='brain3_stat_hold_underpowered','underpowered rationale must surface');
  assert(Number.isFinite(thinDecision.metrics.statNeedPerArm)&&thinDecision.metrics.statNeedPerArm>8,'hold must report true evidence price per arm');
  ok('thin data (8 attempts/arm) holds as underpowered — 8 attempts is runtime safety, not promotion evidence');
  // Bahkan kandidat 8/8 sempurna pada n=8 TIDAK promote — gate lama akan mempromosikannya.
  const thinPerfect={...thin,canaryCorrect:8,canaryIncorrect:0};
  assert(promotion.evaluate(config,thinPerfect,at).status==='hold','perfect-looking 8/8 canary must still hold at n=8');
  ok('perfect 8/8 canary at n=8 still holds (old gate would have promoted)');
  // ---- SKENARIO NULL: lengan identik TIDAK boleh promote (dulu: promote 53,9%). ----
  const nullThin={...thin};// identik 6/8 vs 6/8
  assert(promotion.evaluate(config,nullThin,at).status!=='promote','identical arms at n=8 must not promote');
  const nullBig={...empty,exposureSessions:5,controlAttempts:400,controlCorrect:300,controlIncorrect:100,canaryAttempts:400,canaryCorrect:300,canaryIncorrect:100};
  const nullDecision=promotion.evaluate(config,nullBig,at);
  assert(nullDecision.status==='hold'&&nullDecision.reason==='stat_inconclusive','identical arms at n=400 must hold inconclusive, not promote');
  ok('null scenario (identical arms) never promotes: hold at n=8 and n=400');
  // ---- PROMOTE hanya lewat bukti non-inferioritas gate + lantai akurasi absolut. ----
  const enough={...empty,exposureSessions:5,controlAttempts:400,controlCorrect:300,controlIncorrect:100,canaryAttempts:400,canaryCorrect:328,canaryIncorrect:72};
  const promote=promotion.evaluate(config,enough,at);
  assert(promote.status==='promote'&&promote.reason==='evidence_threshold_pass','statistically non-inferior evidence must promote');
  assert(promote.rationale==='brain3_stat_promote_noninferior'&&promote.confidence>=0.5,'promote must carry stat gate rationale + confidence');
  assert(promote.thresholds.minNPerArm>=25&&promote.thresholds.attemptFloorSemantics==='runtime_safety_threshold_not_learning_promotion_evidence','thresholds must expose minNPerArm and runtime-safety semantics');
  assert(typeof promote.metrics.statCiLoPp==='number'&&promote.metrics.statCiLoPp>-5,'promotion must be justified by CI lower bound above -margin');
  ok('promotion requires stat-gate non-inferiority verdict with CI evidence');
  const active=await canary.prepare(input,config,'Jahran',enough,at,promote);assert(active.status==='promoted','promotion decision must activate overlay');
  const activeLoc=canary.locate(active.dataset,candidate.domain,candidate.target.itemId);assert(activeLoc?.item?.__fiezelCanary?.phase==='promoted','promoted overlay marker missing');
  ok('stat-gated promote decision activates overlay');
  const ledger1=canary.recordPromotionDecision(enough,config.canaryId,promote,'2026-08-12T00:00:00Z'),ledger2=canary.recordPromotionDecision(ledger1,config.canaryId,promote,'2026-08-12T00:01:00Z');
  assert(ledger1.promotionLedger.length===1&&ledger2.promotionLedger.length===1,'promotion ledger must be bounded/deduplicated');
  assert(!JSON.stringify(ledger2.promotionLedger).includes('selectedAnswer'),'promotion ledger must not contain raw answers');
  ok('promotion ledger stays bounded, deduplicated, and raw-answer free');
  // ---- REGRESI NYATA: seluruh CI selisih < 0 → reject gate → rollback. ----
  const regressing={...empty,exposureSessions:5,controlAttempts:400,controlCorrect:320,controlIncorrect:80,canaryAttempts:400,canaryCorrect:240,canaryIncorrect:160};
  const regressionDecision=promotion.evaluate(config,regressing,at);
  assert(regressionDecision.status==='rollback'&&regressionDecision.reason==='canary_learning_regression','proven regression must rollback');
  assert(regressionDecision.metrics.statRationale==='brain3_stat_reject_significant_regression','rollback must be justified by stat gate reject');
  ok('proven regression (CI entirely below 0) rejects to rollback');
  // ---- Lantai akurasi absolut lama: non-inferior tapi mutlak lemah → HOLD (bukan
  // rollback — kandidat tidak memburukkan apa pun, hanya belum layak promote). ----
  const lowAbsolute={...empty,exposureSessions:5,controlAttempts:400,controlCorrect:220,controlIncorrect:180,canaryAttempts:400,canaryCorrect:248,canaryIncorrect:152};
  const absoluteDecision=promotion.evaluate(config,lowAbsolute,at);
  assert(absoluteDecision.status==='hold'&&absoluteDecision.reason==='below_absolute_accuracy_floor','absolute accuracy floor must block promote via hold');
  ok('absolute accuracy floor blocks promote (hold, not rollback)');
  // ---- Guard runtime-safety lama tetap berlaku sebagai lantai kewarasan data. ----
  const insufficientControl={...thin,controlAttempts:7,controlCorrect:6,controlIncorrect:1};
  assert(promotion.evaluate(config,insufficientControl,at).reason==='insufficient_control_evidence','control runtime-safety threshold must be enforced');
  const insufficientCanary={...thin,canaryAttempts:7,canaryCorrect:6,canaryIncorrect:1,targetAttempts:7,targetCorrect:6,targetIncorrect:1};
  assert(promotion.evaluate(config,insufficientCanary,at).reason==='insufficient_canary_evidence','canary runtime-safety threshold must be enforced');
  ok('runtime-safety attempt floors (8/arm) still enforced as necessary-but-insufficient guards');
  // ---- Pemantauan pasca-promosi (guard runtime, tidak berubah). ----
  const stablePost={...enough,promotedAttempts:5,promotedCorrect:4,promotedIncorrect:1};
  assert(promotion.evaluate(config,stablePost,at).status==='promote','stable promoted overlay must remain active');
  const badPost={...enough,promotedAttempts:5,promotedCorrect:2,promotedIncorrect:3};
  const postRollback=promotion.evaluate(config,badPost,at);
  assert(postRollback.status==='rollback'&&postRollback.reason==='post_promotion_regression','post-promotion learning regression must rollback');
  ok('post-promotion monitoring keeps stable overlays and rolls back regressions');
  const priorRollback={...enough,rollbackCount:1,lastRollbackReason:'tamper'};
  assert(promotion.evaluate(config,priorRollback,at).reason==='prior_runtime_rollback','prior runtime rollback must fail closed');
  const privacy={...enough,privacy:{rawAnswersIncluded:true,rawHistoryIncluded:false}};
  assert(promotion.evaluate(config,privacy,at).reason==='privacy_violation','raw answer evidence must be rejected');
  assert(promotion.evaluate({...config,expiresAt:'2026-08-11T00:00:00Z'},enough,at).reason==='expired','expired promotion must rollback');
  ok('fail-closed guards intact: prior rollback, privacy violation, expiry');
  const wrong={...promote,patchId:'other-patch'};const wrongRun=await canary.prepare(input,config,'Jahran',enough,at,wrong);
  assert(wrongRun.status==='canary','mismatched promotion decision must not activate overlay');
  ok('mismatched promotion decision cannot activate overlay');
  const files=['grammar-templates.json','vocabulary-master.json','reading-bank.json'],hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,f))).digest('hex'),before=Object.fromEntries(files.map(f=>[f,hash(f)]));
  await canary.prepare(input,config,'Jahran',enough,at,promote);const after=Object.fromEntries(files.map(f=>[f,hash(f)]));
  assert.deepStrictEqual(after,before,'promotion mutated canonical files');
  ok('canonical content files remain immutable');
  const proof={schema:promotion.PROMOTION_SCHEMA,version:input.version,status:'PASS',patchId:candidate.patchId,thresholds:promote.thresholds,statGateWired:true,nullScenarioNeverPromotes:true,thinDataHolds:true,indefiniteHoldIsValidOutcome:true,eightAttemptIsRuntimeSafetyOnly:true,provenRegressionRejects:true,absoluteFloorHolds:true,postPromotionRollback:true,priorRuntimeRollbackBlocksPromotion:true,privacyFailClosed:true,auditableBoundedLedger:true,canonicalImmutable:true,activeOverlayOnly:true};
  fs.writeFileSync(path.join(__dirname,'CONTENT-PROMOTION-PROOF.json'),JSON.stringify(proof,null,2)+'\n');
  console.log('ContentPromotion: PASS');
})().catch(e=>{console.error('ContentPromotion: FAIL\n'+e.stack);process.exit(1)});
