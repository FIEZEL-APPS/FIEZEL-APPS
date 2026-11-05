/* FIEZEL Braincore Runtime v3.14.0 | rev: 2072729ad82909e9 */
(function(T,i){var SCHEMA = 'fiezel-content-chain-v1';var _fzR='aaf933724a993c3d',_fzA=4063879;if(_fzR.length!==16||_fzA!==4063879)return;var r=i();if(typeof module==='object'&&module.exports)module.exports=r;if(T)T.FiezelContentChain=r})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';var T=
'fiezel-content-chain-v1';var i=['candidate','local_gate','canary','verdict','owner_decision'];function r(e){return typeof e==='string'?e.trim():''}function t(e){return e&&typeof e==='object'&&!Array.isArray(e)?e:null}function E(e){var a=t(e)&&t(e.privacy);return!!a&&(a.rawAnswersIncluded===true||a.rawHistoryIncluded===true)}function N(e,a){var n=t(e);var _={schema:T,stage:'candidate',blockers:[],ownerDecisionRequired:true,ready:false,at:typeof a==='number'&&isFinite(a)?Math.floor(a):null,chain:{candidate:null,localGate:null,canary:null,verdict:null,receipt:null}};if(!n){_.blockers.push('chain_no_input');return _}var c=t(n.candidate);var o=c?r(c.patchId):'';_.chain.candidate=o||null;if(!c||!o){_.blockers.push(
'chain_no_candidate');return _}if(E(c)){_.blockers.push(
'chain_privacy_violation');return _}var u=t(n.localGate);if(!u){_.blockers.push(
'chain_local_gate_not_run');return _}_.chain.localGate={ok:u.ok===true,patchId:r(u.patchId)||null};if(r(u.patchId)&&r(u.patchId)!==o){_.blockers.push(
'chain_local_gate_patch_mismatch');return _}if(u.ok!==true){_.blockers.push(
'chain_local_gate_failed');return _}if(u.canonicalImmutable===false){_.blockers.push(
'chain_canonical_mutated');return _}_.stage='local_gate';var F=t(n.canaryConfig),S=t(n.canaryEvidence);if(!F){_.blockers.push(
'chain_canary_not_configured');return _}if(!S){_.blockers.push(
'chain_canary_no_evidence');return _}if(E(S)){_.blockers.push(
'chain_privacy_violation');return _}_.chain.canary={canaryId:r(F.canaryId)||null,exposureSessions:Number(S.exposureSessions||0)};_.stage='canary';var s=t(n.verdict);if(!s||!r(s.status)){_.blockers.push(
'chain_verdict_absent');return _}_.chain.verdict={status:r(s.status),reason:r(s.reason)||null};if(r(s.status)==='rollback'){_.blockers.push(
'chain_verdict_rollback');return _}if(r(s.status)!=='promote'){_.blockers.push(
'chain_verdict_hold');return _}var l=t(n.receiptLedger);if(!l){_.blockers.push(
'chain_receipt_ledger_absent');return _}_.chain.receipt={ok:l.ok===true,length:Number(l.length||0)};if(l.ok!==true){_.blockers.push(
'chain_receipt_ledger_broken');return _}_.stage='owner_decision';_.ready=true;return _}return{SCHEMA:T,STAGES:i,assess:N}});
