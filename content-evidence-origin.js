const fs=require('fs'),path=require('path'),crypto=require('crypto');
const attestation=require('./content-adoption-evidence.js');
const ORIGIN_SCHEMA='fiezel-evidence-origin-envelope-v1';
const ORIGIN_PAYLOAD_SCHEMA='fiezel-evidence-origin-signed-payload-v1';
const TRUST_SCHEMA='fiezel-evidence-origin-trust-policy-v1';
const ORIGIN_GATE_VERSION='evidence-origin-verification-v1';
const text=v=>String(v??'').trim();
const canonicalize=v=>Array.isArray(v)?v.map(canonicalize):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalize(v[k])])):v);
const canonicalJson=v=>JSON.stringify(canonicalize(v));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const digest=v=>sha(canonicalJson(v));
const allowed=(obj,keys,label)=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error(`${label}_object_required`);const bad=Object.keys(obj).filter(k=>!keys.includes(k));if(bad.length)throw new Error(`${label}_unknown_field:${bad[0]}`);};
const bounded=(v,min,max,label)=>{const s=text(v);if(s.length<min||s.length>max)throw new Error(`${label}_out_of_bounds`);return s;};
const iso=(v,label)=>{const s=text(v);if(s.length>40||!Number.isFinite(Date.parse(s)))throw new Error(`${label}_invalid_timestamp`);return s;};
function publicKeyId(publicKey){const key=crypto.createPublicKey(publicKey);if(key.asymmetricKeyType!=='ed25519')throw new Error('ed25519_public_key_required');const der=key.export({type:'spki',format:'der'});return`ed25519-sha256:${sha(der)}`;}
function buildSigningPayload(bundle,metadata){
  if(!bundle||bundle.schema!==attestation.ATTESTATION_SCHEMA||bundle.gateVersion!==attestation.ATTESTATION_GATE_VERSION||!/^[a-f0-9]{64}$/.test(text(bundle.integrity?.payloadSha256)))throw new Error('verified_attestation_shape_required');
  allowed(metadata||{},['originId','exporterId','environment','issuedAt','exportId','keyId'],'origin_metadata');
  const environment=text(metadata.environment);if(!['production','staging','controlled-test'].includes(environment))throw new Error('origin_environment_invalid');
  const payload={schema:ORIGIN_PAYLOAD_SCHEMA,gateVersion:ORIGIN_GATE_VERSION,origin:{originId:bounded(metadata.originId,3,120,'originId'),exporterId:bounded(metadata.exporterId,3,120,'exporterId'),environment,issuedAt:iso(metadata.issuedAt,'issuedAt'),exportId:bounded(metadata.exportId,6,160,'exportId'),keyId:bounded(metadata.keyId,20,120,'keyId')},evidenceReference:{attestationSha256:bundle.integrity.payloadSha256,sourceVersion:text(bundle.sourceVersion),candidateSha256:text(bundle.candidateSha256),sourceItemSha256:text(bundle.sourceItemSha256),canaryConfigSha256:text(bundle.canaryConfigSha256),canaryId:text(bundle.canaryId),observationEndedAt:iso(bundle.observation?.endedAt,'observationEndedAt')},privacy:{aggregateOnly:true,rawAnswersIncluded:false,rawHistoryIncluded:false}};
  for(const k of ['attestationSha256','candidateSha256','sourceItemSha256','canaryConfigSha256'])if(!/^[a-f0-9]{64}$/.test(payload.evidenceReference[k]))throw new Error(`${k}_invalid_digest`);
  return payload;
}
function signingBytes(payload){return Buffer.from(canonicalJson(payload),'utf8');}
function assembleEnvelope(payload,signatureBase64){
  if(payload?.schema!==ORIGIN_PAYLOAD_SCHEMA||payload?.gateVersion!==ORIGIN_GATE_VERSION)throw new Error('origin_payload_invalid');
  const sig=text(signatureBase64);if(sig.length<40||sig.length>512||!/^[A-Za-z0-9+/]+={0,2}$/.test(sig))throw new Error('signature_invalid_encoding');
  return{schema:ORIGIN_SCHEMA,gateVersion:ORIGIN_GATE_VERSION,payload:canonicalize(payload),signature:{algorithm:'ed25519',encoding:'base64',value:sig}};
}
function validateTrustPolicy(policy,now){
  allowed(policy||{},['schema','gateVersion','policyId','authority','environment','validFrom','validUntil','keys','constraints'],'trust_policy');
  if(policy.schema!==TRUST_SCHEMA||policy.gateVersion!==ORIGIN_GATE_VERSION||policy.authority!=='operator-trust')throw new Error('invalid_trust_policy_contract');
  if(policy.environment!=='production')throw new Error('production_trust_policy_required');
  bounded(policy.policyId,6,120,'policyId');const validFrom=Date.parse(iso(policy.validFrom,'trustPolicy_validFrom')),validUntil=Date.parse(iso(policy.validUntil,'trustPolicy_validUntil'));if(validUntil<=validFrom||now<validFrom||now>validUntil)throw new Error('trust_policy_not_current');
  allowed(policy.constraints||{},['maxSignatureAgeHours','allowedClockSkewSeconds'],'trust_constraints');const age=Number(policy.constraints.maxSignatureAgeHours),skew=Number(policy.constraints.allowedClockSkewSeconds);if(!Number.isInteger(age)||age<1||age>8760)throw new Error('maxSignatureAgeHours_out_of_bounds');if(!Number.isInteger(skew)||skew<0||skew>900)throw new Error('allowedClockSkewSeconds_out_of_bounds');
  if(!Array.isArray(policy.keys)||policy.keys.length<1||policy.keys.length>20)throw new Error('trust_keys_out_of_bounds');
  return{policyId:policy.policyId,validFrom,validUntil,maxSignatureAgeHours:age,allowedClockSkewSeconds:skew,keys:policy.keys};
}
function verifyOrigin(envelope,bundle,trustPolicy,context={},now=Date.now()){
  try{
    allowed(envelope||{},['schema','gateVersion','payload','signature'],'origin_envelope');if(envelope.schema!==ORIGIN_SCHEMA||envelope.gateVersion!==ORIGIN_GATE_VERSION)throw new Error('invalid_origin_contract');
    allowed(envelope.signature||{},['algorithm','encoding','value'],'origin_signature');if(envelope.signature.algorithm!=='ed25519'||envelope.signature.encoding!=='base64')throw new Error('unsupported_origin_signature');
    const att=attestation.verifyAttestation(bundle,context);if(!att.ok)throw new Error(`attestation_invalid:${att.reason}`);
    const payload=envelope.payload;allowed(payload||{},['schema','gateVersion','origin','evidenceReference','privacy'],'origin_payload');if(payload.schema!==ORIGIN_PAYLOAD_SCHEMA||payload.gateVersion!==ORIGIN_GATE_VERSION)throw new Error('invalid_origin_payload_contract');
    allowed(payload.origin||{},['originId','exporterId','environment','issuedAt','exportId','keyId'],'origin_identity');allowed(payload.evidenceReference||{},['attestationSha256','sourceVersion','candidateSha256','sourceItemSha256','canaryConfigSha256','canaryId','observationEndedAt'],'origin_evidence_reference');allowed(payload.privacy||{},['aggregateOnly','rawAnswersIncluded','rawHistoryIncluded'],'origin_privacy');
    if(payload.privacy.aggregateOnly!==true||payload.privacy.rawAnswersIncluded!==false||payload.privacy.rawHistoryIncluded!==false)throw new Error('origin_privacy_violation');
    if(payload.origin.environment!=='production')throw new Error('production_origin_required');
    const expected=buildSigningPayload(bundle,payload.origin);if(canonicalJson(expected)!==canonicalJson(payload))throw new Error('origin_payload_attestation_mismatch');
    const policy=validateTrustPolicy(trustPolicy,now),issued=Date.parse(payload.origin.issuedAt),obsEnd=Date.parse(payload.evidenceReference.observationEndedAt),skewMs=policy.allowedClockSkewSeconds*1000,maxAgeMs=policy.maxSignatureAgeHours*3600000;
    if(issued>now+skewMs)throw new Error('origin_signature_from_future');if(now-issued>maxAgeMs)throw new Error('origin_signature_too_old');if(issued+skewMs<obsEnd)throw new Error('origin_signed_before_observation_end');
    const matches=policy.keys.filter(k=>text(k.originId)===text(payload.origin.originId)&&text(k.keyId)===text(payload.origin.keyId));if(matches.length!==1)throw new Error('untrusted_origin_key');const keyEntry=matches[0];allowed(keyEntry,['originId','keyId','algorithm','publicKeyPem','status','notBefore','notAfter'],'trust_key');if(keyEntry.algorithm!=='ed25519'||keyEntry.status!=='active')throw new Error('origin_key_not_active');const nb=Date.parse(iso(keyEntry.notBefore,'key_notBefore')),na=Date.parse(iso(keyEntry.notAfter,'key_notAfter'));if(issued<nb||issued>na||now>na+skewMs)throw new Error('origin_key_outside_validity');
    if(publicKeyId(keyEntry.publicKeyPem)!==keyEntry.keyId)throw new Error('origin_key_id_mismatch');const sig=Buffer.from(text(envelope.signature.value),'base64');if(sig.length!==64)throw new Error('origin_signature_length_invalid');if(!crypto.verify(null,signingBytes(payload),crypto.createPublicKey(keyEntry.publicKeyPem),sig))throw new Error('origin_signature_invalid');
    return{ok:true,originId:payload.origin.originId,exporterId:payload.origin.exporterId,keyId:payload.origin.keyId,exportId:payload.origin.exportId,issuedAt:payload.origin.issuedAt,environment:'production',attestationSha256:att.attestationSha256,originEnvelopeSha256:digest(envelope),trustPolicySha256:digest(trustPolicy),trustPolicyId:policy.policyId,productionOriginVerified:true};
  }catch(e){return{ok:false,reason:e.message};}
}
function writeJsonAtomic(file,value,noNewline=false){const target=path.resolve(file),tmp=`${target}.tmp`;fs.writeFileSync(tmp,noNewline?canonicalJson(value):JSON.stringify(value,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,target);}
function cli(){const a=process.argv.slice(2),has=x=>a.includes(x),arg=x=>{const i=a.indexOf(x);return i>=0?a[i+1]:null};if(has('--payload-out')){const bundle=JSON.parse(fs.readFileSync(path.resolve(arg('--attestation')),'utf8')),meta=JSON.parse(fs.readFileSync(path.resolve(arg('--metadata')),'utf8')),payload=buildSigningPayload(bundle,meta);writeJsonAtomic(arg('--payload-out'),payload,true);console.log(JSON.stringify({status:'PAYLOAD_READY',sha256:sha(signingBytes(payload)),bytes:signingBytes(payload).length}));return;}if(has('--assemble')){const payload=JSON.parse(fs.readFileSync(path.resolve(arg('--payload')),'utf8')),sig=fs.readFileSync(path.resolve(arg('--signature-file')),'utf8').trim(),env=assembleEnvelope(payload,sig);writeJsonAtomic(arg('--out'),env);console.log(JSON.stringify({status:'ENVELOPE_READY',originEnvelopeSha256:digest(env)}));return;}if(has('--verify')){const env=JSON.parse(fs.readFileSync(path.resolve(arg('--origin')),'utf8')),bundle=JSON.parse(fs.readFileSync(path.resolve(arg('--attestation')),'utf8')),req=JSON.parse(fs.readFileSync(path.resolve(arg('--request')),'utf8')),policy=JSON.parse(fs.readFileSync(path.resolve(arg('--trust-policy')),'utf8')),v=verifyOrigin(env,bundle,policy,{sourceVersion:req.sourceVersion,candidate:req.candidate,canaryConfig:req.canaryConfig});console.log(JSON.stringify(v,null,2));process.exit(v.ok?0:1);return;}throw new Error('usage: --payload-out <file> --attestation <file> --metadata <file> | --assemble --payload <file> --signature-file <file> --out <file> | --verify --origin <file> --attestation <file> --request <file> --trust-policy <file>');}
if(require.main===module){try{cli()}catch(e){console.error(`FIEZEL evidence origin: FAIL\n${e.stack}`);process.exit(1)}}
module.exports={ORIGIN_SCHEMA,ORIGIN_PAYLOAD_SCHEMA,TRUST_SCHEMA,ORIGIN_GATE_VERSION,canonicalJson,digest,publicKeyId,buildSigningPayload,signingBytes,assembleEnvelope,verifyOrigin};
