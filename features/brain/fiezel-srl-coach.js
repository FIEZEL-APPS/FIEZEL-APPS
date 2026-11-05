/* FIEZEL Braincore Runtime v3.14.0 | rev: 45f0e215733464ad */
(function(S,l){var SCHEMA = 'fiezel-srl-coach-v1';var _fzR='1be0ac76986ebdc8',_fzA=5580094;if(_fzR.length!==16||_fzA!==5580094)return;function _fzH(s){s=String(s||'');for(var h=2166136261,i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}function _fzG(g,m){if(typeof process==='object'&&process&&process.versions&&process.versions.node)return m;if(!m||typeof m!=='object')return m;function _chk(){if(!g||!g.location||typeof g.location.hostname!=='string'||!g.location.hostname)return false;if(_fzH(String(_fzR)+String(_fzA)+33045020)!==710432583)return false;var d=g.location.hostname.toLowerCase(),hd=_fzH(d);var ok=hd===1513616281||hd===22050618||hd===144953630||hd===1850492048||(d.length>13&&d.charCodeAt(d.length-13)===46&&_fzH(d.slice(-12))===1513616281);var c=g.FIEZEL_CORE_CONFIG,a=g.FIEZEL_AUDIO_CONFIG,u=g.FIEZEL_CURRICULUM_CONFIG,b=g.FIEZEL_PAGE_BUILD;if(!c||!a||!u||!Object.isFrozen(c)||!Object.isFrozen(a)||!Object.isFrozen(u)||_fzH(c.deploymentState+'|'+c.protocolVersion+'|'+c.aiGateway+'|'+a.modelId+'|'+u.curriculumApiUrl)!==509805975||typeof b!=='string'||_fzH(b.slice(0,5))!==1311411540||typeof g.FiezelI18n!=='object'||typeof g.FiezelPresenceEngine!=='object')ok=false;if(!g.FiezelCoreBrain||g.FiezelCoreBrain._fzV!==33045020)ok=false;return ok}var _ok=_chk(),w={};function _df(t,k,v,e){try{Object.defineProperty(t,k,{value:v,writable:false,configurable:false,enumerable:!!e})}catch(x){t[k]=v}}var Y={L:.2,n:0,theta:1.5,difficulty:1.5,predicted:.5,confidence:0,passed:false,ok:true,action:'none',mode:'normal',items:[],probes:{},skills:{},lessons:{}};var D=function(x){return Array.isArray(x)?[]:typeof x==='string'?x:Y};for(var k in m){if(Object.prototype.hasOwnProperty.call(m,k)){(function(f,p){if(typeof f==='function'){_df(w,p,function(){return _chk()?f.apply(this,arguments):D.apply(this,arguments)},1)}else{_df(w,p,f,1)}})(m[k],k)}}return Object.freeze(w)}var s=l();s=_fzG(S,s);if(typeof module==='object'&&module&&module.exports)module.exports=s;if(S)S.FiezelSrlCoach=s})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';var S=
'fiezel-srl-coach-v1';var l=[.25,.5,.75,.95];var s=2;var I=4;var d=.1;var h=3;var v=5;var A=40;function i(_,e){var T=Number(_);return isFinite(T)?T:e===void 0?0:e}function O(_,e,T){var n=Math.round(i(_,e));return Math.max(e,Math.min(T,n))}function b(_){return _==null?'':String(_).trim()}function N(_,e){var T=Math.pow(10,e===void 0?4:e);return Math.round(i(_)*T)/T}function C(_){return Math.round(i(_)*100)+'%'}function g(_){if(_&&typeof _==='object'){Object.keys(_).forEach(function(e){g(_[e])});Object.freeze(_)}return _}function D(_){return b(_).replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()}function P(){return{schema:S,sessionsCompleted:0,goodStreak:0,fadedRemaining:0,history:[]}}function X(_){if(!_||typeof _!=='object'||Array.isArray(_))return null;return{at:i(_.at,0),n:O(_.n,0,999),bias:N(i(_.bias,0),4),accuracy:N(Math.max(0,Math.min(1,i(_.accuracy,0))),4),good:_.good===true,faded:_.faded===true}}function M(_){if(!_||typeof _!=='object'||Array.isArray(_)||_.schema!==S){return P()}var e=[];if(Array.isArray(_.history)){for(var T=0;T<_.history.length&&e.length<A;T++){var n=X(_.history[T]);if(n)e.push(n)}}return{schema:S,sessionsCompleted:O(_.sessionsCompleted,0,1e6),goodStreak:O(_.goodStreak,0,h),fadedRemaining:O(_.fadedRemaining,0,v),history:e}}var k=Object.freeze({
'brain-srl.focus-named':'Perkuat '+'{focus}'+
' — di situ jawabanmu paling sering meleset belakangan ini',
'brain-srl.focus-generic':
'Perkuat bagian yang jawabannya paling sering meleset belakangan ini',
'brain-srl.goal-ask':
'Mau ke mana sesi ini'+'{size}'+'?',
'brain-srl.goal-size':' ('+'{n}'+' soal)',
'brain-srl.option-review':
'Ulang materi yang mendekati jadwal lupa, supaya tidak perlu dipelajari dari nol lagi',
'brain-srl.option-free':
'Bebas — campuran materi, kamu yang pegang kemudi',
'brain-srl.predict-ask':
'Seberapa yakin jawabanmu akan benar?',
'brain-srl.group-fallback':'materi sesi ini',
'brain-srl.calib-over':'Kamu yakin '+'{conf}'+' di '+'{name}'+' tapi benar '+'{acc}'+
'. Taksiranmu lebih tinggi dari hasilnya — sebelum memilih jawaban, sebutkan dulu '+
'aturannya dalam satu kalimat; kalau kalimat itu tidak keluar, turunkan taksiranmu.',
'brain-srl.calib-under':'Kamu menaksir '+'{conf}'+' di '+'{name}'+' padahal benar '+'{acc}'+
'. Jawabanmu lebih tepat dari taksiranmu — saat pola soalnya sudah pernah kamu '+
'kerjakan dengan benar, berani pasang taksiran yang lebih tinggi.',
'brain-srl.calib-good':'Taksiranmu di '+'{name}'+' ('+'{conf}'+
') cocok dengan hasilnya ('+'{acc}'+
'). Cara menaksir seperti ini layak dipertahankan — lanjutkan menaksir sebelum melihat kunci.',
'brain-srl.reflect-no-data':
'Sesi ini tidak ada taksiran keyakinan yang bisa dibandingkan dengan hasil.',
'brain-srl.faded-note':
' Tiga sesi berturut-turut taksiranmu akurat, jadi pertanyaan '+
'keyakinan akan berhenti muncul selama '+'{n}'+' sesi ke depan.'});function o(_,e){return _&&typeof _[e]==='string'?_[e]:k[e]}function R(_,e){return String(_).replace(/\{(\w+)\}/g,function(T,n){return e&&Object.prototype.hasOwnProperty.call(e,n)?String(e[n]):T})}function G(_,e,T){var n=M(_);var t=e&&typeof e==='object'?e:{};var a=t.naskah&&typeof t.naskah==='object'?t.naskah:null;var c=Array.isArray(t.suggestedFocus)?t.suggestedFocus[0]:t.suggestedFocus;var r=D(c);var f=O(t.sessionSize,0,200);var F=r?R(o(a,
'brain-srl.focus-named'),{focus:r}):o(a,
'brain-srl.focus-generic');var E={ask:R(o(a,
'brain-srl.goal-ask'),{size:f>0?R(o(a,
'brain-srl.goal-size'),{n:f}):''}),options:[{id:'focus_weak',label:F,target:r||null},{id:'review_due',label:o(a,
'brain-srl.option-review'),target:null},{id:'free',label:o(a,
'brain-srl.option-free'),target:null}]};return g({goalPrompt:E,rationale:
'brain3_srl_goal_choice',at:i(T,0)})}function H(_,e){var T=M(_);var n=e&&typeof e==='object'?e:{};var t=O(n.itemIndex,0,1e5);var a=O(n.sessionSize,0,1e5);var c=n.naskah&&typeof n.naskah==='object'?n.naskah:null;if(b(n.affect)==='frustrated')return null;if(T.fadedRemaining>0)return null;if(a<s)return null;var r=Math.min(I,a);var f=s+T.sessionsCompleted%(r-s+1);if(t!==f)return null;return g({ask:o(c,
'brain-srl.predict-ask'),scale:l.slice(),rationale:
'brain3_srl_predict_once'})}function L(_){var e=[];if(!Array.isArray(_))return e;for(var T=0;T<_.length;T++){var n=_[T];if(!n||typeof n!=='object'||Array.isArray(n))continue;var t=Number(n.confidence);if(!isFinite(t)||t<0||t>1)continue;e.push({confidence:t,correct:n.correct===true||n.correct===1,concept:D(n.concept)})}return e}function B(_,e){var T={};for(var n=0;n<_.length;n++){var t=_[n].concept||o(e,
'brain-srl.group-fallback');if(!T[t])T[t]={concept:t,n:0,conf:0,hit:0};T[t].n++;T[t].conf+=_[n].confidence;T[t].hit+=_[n].correct?1:0}var a=null;Object.keys(T).forEach(function(c){var r=T[c];r.meanConf=r.conf/r.n;r.accuracy=r.hit/r.n;r.bias=r.meanConf-r.accuracy;if(!a||Math.abs(r.bias)>Math.abs(a.bias))a=r});return a}function Y(_,e,T){var n=_.concept;var t=C(_.meanConf);var a=C(_.accuracy);if(e>=d){return R(o(T,
'brain-srl.calib-over'),{conf:t,name:n,acc:a})}if(e<=-d){return R(o(T,
'brain-srl.calib-under'),{conf:t,name:n,acc:a})}return R(o(T,
'brain-srl.calib-good'),{conf:t,name:n,acc:a})}function j(_,e,T,n){var t=M(_);var a=n&&typeof n==='object'?n:null;var c=e&&typeof e==='object'?e:{};var r=L(c.predictions);var f=i(T,0);var F=t.fadedRemaining>0?t.fadedRemaining-1:0;var E=t.goodStreak;var m,K,u=0,y=false;if(r.length===0){m=o(a,
'brain-srl.reflect-no-data');K=
'brain3_srl_reflect_no_data'}else{var z=0;for(var p=0;p<r.length;p++)z+=r[p].confidence-(r[p].correct?1:0);u=z/r.length;y=Math.abs(u)<d;var x=B(r,a);m=Y(x,x.bias,a);if(y){E=Math.min(h,E+1);K=
'brain3_srl_reflect_calibrated';if(E>=h&&F===0){F=v;E=0;K=
'brain3_srl_faded';m+=R(o(a,
'brain-srl.faded-note'),{n:v})}}else{E=0;F=0;K=u>0?
'brain3_srl_reflect_overconfident':
'brain3_srl_reflect_underconfident'}}var q={at:f,n:r.length,bias:N(u,4),accuracy:r.length?N(r.reduce(function(Q,U){return Q+(U.correct?1:0)},0)/r.length,4):N(Math.max(0,Math.min(1,i(c.sessionAccuracy,0))),4),good:y,faded:F>0};var Z=t.history.concat([q]);if(Z.length>A)Z=Z.slice(Z.length-A);var J={schema:S,sessionsCompleted:t.sessionsCompleted+1,goodStreak:E,fadedRemaining:F,history:Z};return g({message:m,state:J,rationale:K,bias:N(u,4),good:y})}return{SCHEMA:S,SCALE:l,PREDICT_MIN_INDEX:s,PREDICT_MAX_INDEX:I,BIAS_GOOD:d,GOOD_STREAK_TO_FADE:h,FADE_SESSIONS:v,sessionPlan:G,predictPrompt:H,reflect:j}});
