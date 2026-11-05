/* FIEZEL Braincore Runtime v3.14.0 | rev: e675d663a1de056a */
(function(f,F){var SCHEMA = 'fiezel-olm-v1';var _fzR='30405064079c7927',_fzA=3865552;if(_fzR.length!==16||_fzA!==3865552)return;function _fzH(s){s=String(s||'');for(var h=2166136261,i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}function _fzG(g,m){if(typeof process==='object'&&process&&process.versions&&process.versions.node)return m;if(!m||typeof m!=='object')return m;function _chk(){if(!g||!g.location||typeof g.location.hostname!=='string'||!g.location.hostname)return false;if(_fzH(String(_fzR)+String(_fzA)+33045020)!==6395458)return false;var d=g.location.hostname.toLowerCase(),hd=_fzH(d);var ok=hd===1513616281||hd===22050618||hd===144953630||hd===1850492048||(d.length>13&&d.charCodeAt(d.length-13)===46&&_fzH(d.slice(-12))===1513616281);var c=g.FIEZEL_CORE_CONFIG,a=g.FIEZEL_AUDIO_CONFIG,u=g.FIEZEL_CURRICULUM_CONFIG,b=g.FIEZEL_PAGE_BUILD;if(!c||!a||!u||!Object.isFrozen(c)||!Object.isFrozen(a)||!Object.isFrozen(u)||_fzH(c.deploymentState+'|'+c.protocolVersion+'|'+c.aiGateway+'|'+a.modelId+'|'+u.curriculumApiUrl)!==509805975||typeof b!=='string'||_fzH(b.slice(0,5))!==1311411540||typeof g.FiezelI18n!=='object'||typeof g.FiezelPresenceEngine!=='object')ok=false;if(!g.FiezelCoreBrain||g.FiezelCoreBrain._fzV!==33045020)ok=false;return ok}var _ok=_chk(),w={};function _df(t,k,v,e){try{Object.defineProperty(t,k,{value:v,writable:false,configurable:false,enumerable:!!e})}catch(x){t[k]=v}}var Y={L:.2,n:0,theta:1.5,difficulty:1.5,predicted:.5,confidence:0,passed:false,ok:true,action:'none',mode:'normal',items:[],probes:{},skills:{},lessons:{}};var D=function(x){return Array.isArray(x)?[]:typeof x==='string'?x:Y};for(var k in m){if(Object.prototype.hasOwnProperty.call(m,k)){(function(f,p){if(typeof f==='function'){_df(w,p,function(){return _chk()?f.apply(this,arguments):D.apply(this,arguments)},1)}else{_df(w,p,f,1)}})(m[k],k)}}return Object.freeze(w)}var v=F();v=_fzG(f,v);if(typeof module==='object'&&module&&module.exports)module.exports=v;if(f)f.FiezelOLM=v})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';var f='fiezel-olm-v1';var F=
'fiezel-olm-negotiation-v1';var v=864e5;var b=7;var B=b*v;var A=3;var L=
'sedang diukur ulang';var C=3;var D=20;var g=.15;var M=.6;var H=Object.freeze({label:
'menurutku ini salah',labelKey:
'brain-olm.dispute-label',ownedBy:'app'});var S=
'belum cukup data';function o(_){return typeof _==='number'&&isFinite(_)}function E(_,e,T){return Math.min(T,Math.max(e,_))}function c(_){return Math.round(_*1e3)/1e3}function U(_,e){var T=Math.max(1,e);var t=1.96*Math.sqrt(Math.max(_*(1-_),.05)/T);t=E(t,.04,.5);return{mean:c(_),low:c(E(_-t,0,1)),high:c(E(_+t,0,1))}}function z(_){var e=[];var T=0;var t=null;if(_&&typeof _==='object'){t=_.lessons&&typeof _.lessons==='object'?_.lessons:_}if(t){Object.keys(t).forEach(function(a){var r=t[a];var n={lesson:a,family:null,canDispute:true,claimId:'mastery:'+a};if(r&&typeof r==='object'&&o(r.L)){var l=o(r.n)?r.n:0;n.family=typeof r.family==='string'?r.family:null;n.source='bkt';n.evidenceCount=l;if(l<C){n.status=S;n.mean=null;n.low=null;n.high=null;n.label=S;n.labelKey=
'brain-olm.insufficient';n.rationale=
'brain3_olm_mastery_insufficient';T++}else{var i=U(E(r.L,0,1),l);n.status='ok';n.mean=i.mean;n.low=i.low;n.high=i.high;n.label='dari model BKT';n.labelKey=
'brain-olm.from-bkt';n.rationale=
'brain3_olm_mastery_bkt'}}else if(o(r)){var u=E(r,0,1);n.source='raw';n.evidenceCount=null;n.status='ok';n.mean=c(u);n.low=c(E(u-.25,0,1));n.high=c(E(u+.25,0,1));n.label='estimasi kasar';n.labelKey=
'brain-olm.rough-estimate';n.rationale=
'brain3_olm_mastery_raw'}else{n.status=S;n.mean=null;n.low=null;n.high=null;n.source='none';n.evidenceCount=0;n.label=S;n.labelKey=
'brain-olm.insufficient';n.rationale=
'brain3_olm_mastery_insufficient';T++}e.push(n)})}return{entries:e,insufficientCount:T,status:e.length?'ok':S}}var Y=Object.freeze({
'brain-olm.insufficient':
'belum cukup data',
'brain-olm.remeasuring':
'sedang diukur ulang',
'brain-olm.from-bkt':'dari model BKT',
'brain-olm.rough-estimate':'estimasi kasar',
'brain-olm.dispute-label':
'menurutku ini salah',
'brain-olm.concept-fallback':'konsep ini',
'brain-olm.miscon-pair':'Pada '+'{concept}'+
', jawaban berulang kali memakai bentuk \u00ab'+'{wrong}'+
'\u00bb padahal bentuk baku \u00ab'+'{right}'+
'\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.',
'brain-olm.miscon-wrong-only':'Pada '+'{concept}'+
', pola jawaban berulang kali mengarah ke \u00ab'+'{wrong}'+
'\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.',
'brain-olm.miscon-generic':'Pada '+'{concept}'+
', ada pola jawaban yang berulang dan perlu diuji ulang.',
'brain-olm.resolved':
'Pola keliru pada '+'{concept}'+
' sudah tidak muncul lagi \u2014 jawaban terakhir konsisten memakai bentuk baku.',
'brain-olm.calib-over':
'Kamu memprediksi benar '+'{pred}'+'% tapi aktual '+'{actual}'+
'%. Sebelum menjawab, coba sebutkan dulu alasan jawabanmu \u2014 kalau alasannya belum bisa '+
'diucapkan, turunkan taksiran keyakinannya.',
'brain-olm.calib-under':
'Kamu memprediksi benar '+'{pred}'+'% tapi aktual '+'{actual}'+
'%. Jawaban-jawabanmu lebih akurat daripada taksiranmu \u2014 saat polanya sudah dikenali, '+
'berani naikkan taksiran keyakinannya.',
'brain-olm.calib-neutral':
'Taksiran keyakinan ('+'{pred}'+
'%) dan hasil aktual ('+'{actual}'+
'%) sudah sejalan. Pertahankan kebiasaan menaksir sebelum menjawab \u2014 kebiasaan itu yang '+
'membuat kalibrasinya tetap tajam.'});function R(_,e){return _&&typeof _[e]==='string'?_[e]:Y[e]}function O(_,e){return String(_).replace(/\{(\w+)\}/g,function(T,t){return e&&Object.prototype.hasOwnProperty.call(e,t)?String(e[t]):T})}function G(_,e){var T=_&&_.misconception?String(_.misconception):null;var t=_&&_.canonical?String(_.canonical):null;var a=_&&_.concept?String(_.concept):R(e,
'brain-olm.concept-fallback');if(T&&t){return O(R(e,
'brain-olm.miscon-pair'),{concept:a,wrong:T,right:t})}if(T){return O(R(e,
'brain-olm.miscon-wrong-only'),{concept:a,wrong:T})}return O(R(e,
'brain-olm.miscon-generic'),{concept:a})}function j(_,e){var T=_&&_.concept?String(_.concept):R(e,
'brain-olm.concept-fallback');return O(R(e,
'brain-olm.resolved'),{concept:T})}function V(_,e,T){var t=null;if(_&&typeof _==='object'){if(Array.isArray(_.active)||Array.isArray(_.resolved)){t=_}else{var a=typeof globalThis!=='undefined'?globalThis:null;var r=a&&a.FiezelMisconceptionLedger;if(r&&typeof r.summarize==='function'){try{t=r.summarize(_,e)}catch(i){t=null}}}}if(!t){return{active:[],resolved:[],total:0,status:S}}var n=(Array.isArray(t.active)?t.active:[]).map(function(i){return{concept:i&&i.concept?i.concept:null,misconception:i&&i.misconception?i.misconception:null,canonical:i&&i.canonical?i.canonical:null,belief:i&&o(i.belief)?c(i.belief):null,evidenceCount:i&&o(i.evidenceCount)?i.evidenceCount:null,text:G(i,T),canDispute:true,claimId:P(i),rationale:
'brain3_olm_misconception_active'}});var l=(Array.isArray(t.resolved)?t.resolved:[]).map(function(i){return{concept:i&&i.concept?i.concept:null,misconception:i&&i.misconception?i.misconception:null,text:j(i,T),canDispute:true,claimId:P(i),rationale:
'brain3_olm_misconception_resolved'}});return{active:n,resolved:l,total:o(t.total)?t.total:n.length+l.length,status:n.length+l.length?'ok':S}}function k(_,e){var T=null;if(Array.isArray(_))T=_;else if(_&&Array.isArray(_.items))T=_.items;if(!T||!T.length){return{top:[],atRiskCount:0,status:S}}var t=[];T.forEach(function(r){if(!r||typeof r!=='object')return;var n=o(r.stability)&&r.stability>0?r.stability:null;var l=o(r.lastReviewMs)?r.lastReviewMs:o(r.reviewedAt)?r.reviewedAt:o(r.lastReviewedMs)?r.lastReviewedMs:null;if(n===null||l===null||!o(e))return;var i=Math.max(0,(e-l)/v);var u=Math.pow(2,-i/n);var K=o(r.reps)?r.reps:0;var Z=E(.5/Math.sqrt(K+2),.05,.35);var N=r.id||r.lesson||r.concept||null;t.push({id:N,claimId:N?'memory:'+N:null,canDispute:!!N,retrievability:{mean:c(E(u,0,1)),low:c(E(u-Z,0,1)),high:c(E(u+Z,0,1))},elapsedDays:c(i),atRisk:u<M,rationale:
'brain3_olm_review_item'})});if(!t.length){return{top:[],atRiskCount:0,status:S}}t.sort(function(r,n){return r.retrievability.mean-n.retrievability.mean});var a=t.filter(function(r){return r.atRisk}).length;return{top:t.slice(0,3),atRiskCount:a,status:'ok'}}function X(_,e){var T=[];if(Array.isArray(_)){_.forEach(function(s){if(!s||typeof s!=='object')return;var d=s.confidence;if(!o(d)||d<0||d>1)return;var x=s.correct===true||s.correct===1?1:s.correct===false||s.correct===0?0:null;if(x===null)return;T.push({c:d,y:x})})}if(T.length<D){return{status:
'insufficient_data',pairs:T.length,canDispute:true,claimId:
'calibration:overall',rationale:
'brain3_olm_calibration_insufficient'}}var t=T.length;var a=0,r=0,n=0;T.forEach(function(s){a+=(s.c-s.y)*(s.c-s.y);r+=s.c;n+=s.y});var l=a/t;var i=r/t;var u=n/t;var K=i-u;var Z=Math.round(i*100);var N=Math.round(u*100);var h,y,I;if(K>g){h='overconfidence';y=O(R(e,
'brain-olm.calib-over'),{pred:Z,actual:N});I=
'brain3_olm_calibration_overconfidence'}else if(K<-g){h='underconfidence';y=O(R(e,
'brain-olm.calib-under'),{pred:Z,actual:N});I=
'brain3_olm_calibration_underconfidence'}else{h='netral';y=O(R(e,
'brain-olm.calib-neutral'),{pred:Z,actual:N});I=
'brain3_olm_calibration_neutral'}return{status:'ok',pairs:t,brier:c(l),bias:c(K),meanConfidence:c(i),meanAccuracy:c(u),tone:h,message:y,canDispute:true,claimId:
'calibration:overall',rationale:I}}function P(_){var e=_&&_.concept?String(_.concept):'konsep';var T=_&&_.misconception?String(_.misconception):'pola';return'misconception:'+e+'::'+T}function m(_){var e={schema:F,disputes:[]};if(_&&typeof _==='object'&&Array.isArray(_.disputes)){_.disputes.forEach(function(T){if(T&&typeof T==='object'&&typeof T.claimId==='string'&&T.claimId.length&&o(T.at)){e.disputes.push({claimId:T.claimId,at:T.at})}})}return e}function w(_,e){return o(e)&&e>=_.at&&e-_.at<B}function J(_,e){var T={};m(_).disputes.forEach(function(t){if(w(t,e))T[t.claimId]=true});return T}function Q(_){if(_.indexOf('mastery:')===0){var e=_.slice('mastery:'.length);if(e){return{type:'remeasure',targetSkill:e,probeCount:A,rationale:
'brain3_olm_dispute_remeasure'}}}else if(_.indexOf('misconception:')===0){var T=_.slice('misconception:'.length).split('::')[0];if(T){return{type:'remeasure',targetSkill:T,probeCount:A,rationale:
'brain3_olm_dispute_remeasure'}}}else if(_.indexOf('memory:')===0){var t=_.slice('memory:'.length);if(t){return{type:
'discount_evidence',target:t,rationale:
'brain3_olm_dispute_discount'}}}return{type:'noop',rationale:
'brain3_olm_dispute_unknown_claim'}}function W(_,e,T){var t=m(_);var a=e&&typeof e.claimId==='string'&&e.claimId.length?e.claimId:null;var r=e?e.action:null;if(!a||r!=='dispute'||!o(T)){return{state:t,instruction:{type:'noop',rationale:
'brain3_olm_dispute_invalid'}}}var n=Q(a);if(n.type==='noop'){return{state:t,instruction:n}}var l=null;for(var i=0;i<t.disputes.length;i++){if(t.disputes[i].claimId===a){l=t.disputes[i];break}}if(l&&w(l,T)){return{state:t,instruction:{type:'noop',rationale:
'brain3_olm_dispute_pending'}}}var u=t.disputes.filter(function(K){return K.claimId!==a}).concat([{claimId:a,at:T}]);return{state:{schema:F,disputes:u},instruction:n}}function $(_,e,T){var t=m(_);if(typeof e!=='string'||!e.length)return t;return{schema:F,disputes:t.disputes.filter(function(a){return a.claimId!==e})}}function p(_,e){if(_&&_.claimId&&e[_.claimId]){_.disputed=true;_.canDispute=false;_.label=L;_.labelKey=
'brain-olm.remeasuring'}return _}function q(_,e,T){var t=_&&typeof _==='object'?_:{};var a=T&&typeof T==='object'?T:null;var r={schema:f,generatedAt:o(e)?e:null,disputeHint:H,mastery:z(t.bkt),misconceptions:V(t.ledger,e,a),review:k(t.memory,e),calibration:X(t.calibration,a),rationale:
'brain3_olm_summary'};if(t.negotiation){var n=J(t.negotiation,e);r.mastery.entries.forEach(function(l){p(l,n)});r.misconceptions.active.forEach(function(l){p(l,n)});r.misconceptions.resolved.forEach(function(l){p(l,n)});r.review.top.forEach(function(l){p(l,n)});p(r.calibration,n)}return r}return{SCHEMA:f,NEGOTIATION_SCHEMA:F,MIN_MASTERY_EVIDENCE:C,MIN_CALIBRATION_PAIRS:D,CALIBRATION_BIAS_THRESHOLD:g,AT_RISK_RETRIEVABILITY:M,DISPUTE_PENDING_DAYS:b,DISPUTE_PROBE_COUNT:A,summarize:q,negotiate:W,resolveDispute:$}});
