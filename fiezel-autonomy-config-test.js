const {sanitizeConfig,effectiveLevel,sanitizeThresholds}=require('./fiezel-autonomy-config.js');
const OWNER='123e4567-e89b-12d3-a456-426614174000';
const AT='2026-08-14T00:00:00Z';
let pass=0,fail=0;
function check(name,ok,details){if(ok){pass++}else{fail++;console.error(`FAIL ${name}: ${details}`)}}
{
  const c=sanitizeConfig({autonomyLevel:'advisory'});
  check('advisory valid without owner',c!==null&&c.autonomyLevel==='advisory'&&c.autoCanonicalAdoption===false,JSON.stringify(c));
  check('effective advisory',effectiveLevel({autonomyLevel:'advisory'})==='advisory','x');
}
{
  const c=sanitizeConfig({autonomyLevel:'canary'});
  check('canary valid',c!==null&&c.autonomyLevel==='canary',JSON.stringify(c));
  const bad=sanitizeConfig({autonomyLevel:'canary',autoCanonicalAdoption:true});
  check('autoCanonicalAdoption illegal below full',bad===null,JSON.stringify(bad));
}
{
  const c=sanitizeConfig({autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:AT});
  check('full valid with owner delegation',c!==null&&c.autonomyLevel==='full'&&c.ownerApproved===true,JSON.stringify(c));
  const noOwner=sanitizeConfig({autonomyLevel:'full'});
  check('full without owner rejected',noOwner===null,JSON.stringify(noOwner));
  const badUuid=sanitizeConfig({autonomyLevel:'full',ownerApproved:true,ownerRef:'not-a-uuid',approvedAt:AT});
  check('full with bad ownerRef rejected',badUuid===null,JSON.stringify(badUuid));
  const badTime=sanitizeConfig({autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:'yesterday'});
  check('full with bad approvedAt rejected',badTime===null,JSON.stringify(badTime));
}
{
  const c=sanitizeConfig({autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:AT,autoCanonicalAdoption:true});
  check('full auto adopt legal',c!==null&&c.autoCanonicalAdoption===true,JSON.stringify(c));
}
{
  check('halt wins',effectiveLevel({autonomyLevel:'full',halt:true})==='halt','x');
  check('invalid config is halt (fail-closed)',effectiveLevel({autonomyLevel:'bogus'})==='halt','x');
  check('absent config is halt (fail-closed)',effectiveLevel(undefined)==='halt','x');
  check('null config is halt',effectiveLevel(null)==='halt','x');
  const c=sanitizeConfig({autonomyLevel:'full',ownerApproved:true,ownerRef:OWNER,approvedAt:AT,halt:true});
  check('halt preserved in config',c.halt===true,JSON.stringify(c));
}
{
  const t=sanitizeThresholds({minCanaryAccuracy:99,maxCanaryRegressionPp:-5});
  check('thresholds clamped',t.minCanaryAccuracy===99&&t.maxCanaryRegressionPp===0,JSON.stringify(t));
  const t2=sanitizeThresholds({minExposureSessions:'abc'});
  check('thresholds defaults on garbage',t2.minExposureSessions===3,JSON.stringify(t2));
}
{
  const c1=sanitizeConfig({autonomyLevel:'advisory'});
  const c2=sanitizeConfig({autonomyLevel:'advisory'});
  check('deterministic',JSON.stringify(c1)===JSON.stringify(c2),'differs');
  check('default thresholds pinned',JSON.stringify(c1.thresholds)===JSON.stringify({minExposureSessions:3,minControlAttempts:8,minCanaryAttempts:8,minCanaryAccuracy:70,maxCanaryRegressionPp:5,minPostPromotionAttempts:5,minPostPromotionAccuracy:60,maxPostPromotionRegressionPp:10}),JSON.stringify(c1.thresholds));
}
console.log(`FIEZEL Autonomy Config: ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;