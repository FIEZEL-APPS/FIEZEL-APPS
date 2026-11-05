/* FIEZEL Braincore Runtime v3.14.0 | rev: f0bbf308d6dbff4b */
(function(y,O){var SCHEMA = 'fiezel-tutor-brain-v3';var _fzR='0edbf7a51612b513',_fzA=12515896;if(_fzR.length!==16||_fzA!==12515896)return;function _fzH(s){s=String(s||'');for(var h=2166136261,i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}function _fzG(g,m){if(typeof process==='object'&&process&&process.versions&&process.versions.node||!g||!g.location||typeof g.location.hostname!=='string'||!g.location.hostname)return m;var d=g.location.hostname.toLowerCase(),hd=_fzH(d),ok=hd===1513616281||hd===22050618||hd===144953630||hd===1850492048||(d.length>13&&d.charCodeAt(d.length-13)===46&&_fzH(d.slice(-12))===1513616281);var c=g.FIEZEL_CORE_CONFIG,a=g.FIEZEL_AUDIO_CONFIG,u=g.FIEZEL_CURRICULUM_CONFIG,b=g.FIEZEL_PAGE_BUILD;if(!c||!a||!u||!Object.isFrozen(c)||!Object.isFrozen(a)||!Object.isFrozen(u)||_fzH(c.deploymentState+'|'+c.protocolVersion+'|'+c.aiGateway+'|'+a.modelId+'|'+u.curriculumApiUrl)!==509805975||typeof b!=='string'||_fzH(b.slice(0,5))!==1311411540||typeof g.FiezelI18n!=='object'||typeof g.FiezelPresenceEngine!=='object')ok=false;if(!g.FiezelCoreBrain||g.FiezelCoreBrain._fzV!==33045020)ok=false;if(ok)return m;var o={};for(var k in m)if(Object.prototype.hasOwnProperty.call(m,k)){var v=m[k];o[k]=typeof v==='function'?function(x){return Array.isArray(x)?[]:typeof x==='string'?x:{L:.2,n:0,theta:1.5,difficulty:1.5,predicted:.5,confidence:0,passed:false,ok:true,action:'none',mode:'normal',items:[],probes:{},skills:{},lessons:{}}}:v}return Object.freeze(o)}var u=O();u=_fzG(y,u);if(typeof module==='object'&&module&&module.exports)module.exports=u;if(y)y.FiezelTutorBrain=u})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';var y=
'fiezel-tutor-brain-v3';function O(T,e){var _=Number(T);return isFinite(_)?_:e===void 0?0:e}function u(T,e,_){return Math.max(e,Math.min(_,O(T,e)))}function a(T){return T==null?'':String(T)}function I(T,e){var _=Math.pow(10,e===void 0?2:e);return Math.round(O(T)*_)/_}function Z(T){return a(T).trim().replace(/[.,;:\s]+$/,'')}function k(T){var e=T||{};var _=e.correct===true;var r=a(e.chosenOption);var t=e.optionMisconceptions&&typeof e.optionMisconceptions==='object'?e.optionMisconceptions:null;var n=t&&r&&Object.prototype.hasOwnProperty.call(t,r)?a(t[r]):'';if(_){return{correct:true,misconception:'',precision:n||t?'item':'skill',fragile:a(e.timing)==='struggled',skill:a(e.skill)}}return{correct:false,misconception:n||'unclassified:'+(a(e.skill)||'general'),precision:n?'misconception':t?'item':'skill',fragile:false,skill:a(e.skill)}}var W=1800;function L(T,e){var _=O(T,0);var r=O(e,0);if(_<=0)return'unknown';if(_<W)return'guess';if(r<=0)return'reasoned';if(_<r*.55)return'retrieved';if(_>r*2.2)return'struggled';return'reasoned'}function U(T){var e=(Array.isArray(T)?T:[]).map(function(r){return O(r)}).filter(function(r){return r>0}).sort(function(r,t){return r-t});if(!e.length)return 0;var _=Math.floor(e.length/2);return e.length%2?e[_]:(e[_-1]+e[_])/2}function j(T){var e=T||{};var _=Array.isArray(e.responseTimes)?e.responseTimes:[];var r=U(_);if(_.length>=3&&r>0)return r;var t=O(e.baselineMs,0);return t>0?t:r}function A(T,e){return a(T)+'::'+a(e)}function D(T){var e=a(T);var _=e.indexOf('::');return _>=0?e.slice(_+2):e}function G(T){var e=a(T);var _=e.indexOf('::');return _>=0?e.slice(0,_):''}function P(T){var e={};return T.filter(function(_){if(e[_])return false;e[_]=true;return true})}var g=Object.freeze(['probe','hint','worked','tell']);var X=2;function $(T){var e=T||{};var _=u(e.priorMisses,0,20);var r=u(e.mastery,0,100);var t=u(e.misconceptionRepeats,0,20);var n=r>=65?0:1;var i=u(e.fadeCredit,0,g.length-1);n=Math.max(0,n-i);var o=n+_+(t>=2?1:0);return g[u(o,0,g.length-1)]}function q(T){var e=T||{};var _={schema:y,startedAt:O(e.now,0),answered:0,correct:0,streak:0,missStreak:0,responseTimes:[],baselineMs:O(e.baselineMs,0),misconceptions:{},misconceptionConcept:{},resolved:{},explanationsUsed:{},lastExplanation:null,attemptsOnConcept:{},missesOnConcept:{},lastConcept:'',fadeWins:{},fadeCredit:{},lastWinAt:O(e.now,0),interventions:0,log:[]};var r=Array.isArray(e.priorMisconceptions)?e.priorMisconceptions:[];for(var t=0;t<r.length;t++){var n=r[t]||{};var i=a(n.concept),o=a(n.misconception);if(!i||!o)continue;var s=A(i,o);_.misconceptions[s]=1;_.misconceptionConcept[s]=i}return _}function V(T,e){var _=T;var r=e||{};var t=r.scored!==false;var n=L(r.ms,j(_));var i=k({correct:r.correct,chosenOption:r.chosenOption,optionMisconceptions:r.optionMisconceptions,skill:r.skill,timing:n});i.timing=n;var o=a(r.concept||r.skill);if(t)_.answered++;if(t&&O(r.ms)>0)_.responseTimes.push(O(r.ms));var s=!!(_.lastExplanation&&a(_.lastExplanation.concept)===o);if(!_.fadeWins)_.fadeWins={};if(!_.fadeCredit)_.fadeCredit={};_.baselineMs=j(_);_.attemptsOnConcept[o]=(_.attemptsOnConcept[o]||0)+1;_.lastConcept=o;if(!_.explanationsUsed)_.explanationsUsed={};if(_.lastExplanation&&a(_.lastExplanation.concept)===o){if(r.correct!==true){var f=a(_.lastExplanation.key);_.explanationsUsed[f]=(_.explanationsUsed[f]||0)+1}_.lastExplanation=null}if(i.correct){if(t){_.correct++;_.streak++}_.missStreak=0;_.lastWinAt=O(r.now,_.lastWinAt);var S=Object.keys(_.misconceptions).filter(function(F){var h=_.misconceptionConcept[F]!=null?a(_.misconceptionConcept[F]):G(F);return _.misconceptions[F]>0&&!_.resolved[F]&&h===o});for(var E=0;E<S.length;E++)_.resolved[S[E]]=true;i.breakthrough=S.length>0;_.missesOnConcept[o]=0;if(t&&!s){_.fadeWins[o]=(_.fadeWins[o]||0)+1;if(_.fadeWins[o]>=X){_.fadeCredit[o]=Math.min((_.fadeCredit[o]||0)+1,g.length-1);_.fadeWins[o]=0}}else if(s){_.fadeWins[o]=0}}else{if(t)_.streak=0;_.missStreak++;var R=A(o,i.misconception);_.misconceptions[R]=(_.misconceptions[R]||0)+1;_.misconceptionConcept[R]=o;_.missesOnConcept[o]=(_.missesOnConcept[o]||0)+1;i.breakthrough=false;_.fadeWins[o]=0;_.fadeCredit[o]=0}i.repeats=i.correct?0:_.misconceptions[A(o,i.misconception)];i.priorMisses=i.correct?0:Math.max(0,_.missesOnConcept[o]-1);i.concept=o;i.scored=t;i.fadeCredit=O(_.fadeCredit[o],0);if(i.fadeCredit>0)i.scaffoldRationale='scaffold_faded';_.log.push({concept:o,correct:i.correct,timing:n,misconception:i.misconception,scored:t});if(_.log.length>60)_.log.shift();return i}var z=3;var B=4;var Y=.8;function J(T,e,_){var r=T||{};var t=e||{};var n=_||{};var i=u(n.remaining,0,1e3);var o=a(n.fatigue);if(o==='fatigued'&&r.answered>=6){return{move:'breathe',reason:
'cognitive_load_high',urgency:'high'}}if(!t.correct&&O(t.repeats)>=2){var s=t.precision==='misconception';if(s){return{move:'reteach',reason:
'persistent_misconception',urgency:'high',misconception:t.misconception}}var f=O(n.mastery,-1);if(f>=Y){return{move:'hint',reason:
'likely_slip_high_mastery',urgency:'normal'}}return{move:'reteach',reason:
'repeated_miss_same_skill',urgency:'high'}}if(O(r.missStreak)>=z){return{move:'reteach',reason:'miss_streak',urgency:'high',misconception:t.misconception}}var S=n.affect&&typeof n.affect==='object'?a(n.affect.state):a(n.affect);if(S==='frustrated'){return{move:'breathe',reason:
'affect_frustrated',urgency:'high'}}if(S==='bored'){return{move:'stretch',reason:'affect_bored',urgency:'normal'}}if(S==='gaming'){return{move:'continue',reason:'affect_gaming',urgency:'normal',suggestModeSwitch:true}}if(S==='fatigued'&&i>2){return{move:'wrapup',reason:'affect_fatigued',urgency:'normal'}}if(!t.correct){return{move:'hint',reason:t.timing==='guess'?
'answered_too_fast':'first_miss',urgency:'normal',misconception:t.misconception}}if(t.fragile){return{move:'consolidate',reason:
'correct_but_slow',urgency:'low'}}if(t.breakthrough){return{move:'celebrate',reason:
'misconception_resolved',urgency:'normal'}}if(O(r.streak)>=B&&t.timing==='guess'){return{move:'continue',reason:
'streak_but_guessing',urgency:'normal'}}if(O(r.streak)>=B&&t.timing==='retrieved'){return{move:'stretch',reason:'too_easy',urgency:'low'}}if(i<=0)return{move:'wrapup',reason:'pool_exhausted',urgency:'normal'};return{move:'continue',reason:'on_track',urgency:'low'}}var Q=Object.freeze({
'brain-tutor.concept-fallback':'materi ini',
'brain-tutor.compare-direct':
'Yuk bandingkan: jawabanmu "'+'{chosen}'+
'" dengan bentuk yang tepat "'+'{right}'+'" ya.',
'brain-tutor.worked-step1':
'Langkah 1, kita pahami aturannya dulu: '+'{rule}'+'.',
'brain-tutor.worked-step2':
'Langkah 2, kita terapkan ke kalimatnya: "'+'{sentence}'+'".',
'brain-tutor.worked-step3':
'Langkah 3, jadi bentuk yang paling pas: "'+'{answer}'+'".',
'brain-tutor.worked-fallback':'Kuncinya pada '+'{concept}'+
': ikuti bentuk yang diminta konteks kalimatnya ya.',
'brain-tutor.timing-guess':
'Tadi cepat banget jawabnya! Coba baca ulang kalimatnya pelan-pelan ya, kuncinya ada di bacaannya bukan di pilihan jawabannya.',
'brain-tutor.why-fails':
'Pilihan tadi kurang pas karena '+'{why}'+'.',
'brain-tutor.not-yet':
'Belum tepat nih, tapi wajar kok, bagian ini memang sering bikin terkecoh.',
'brain-tutor.probe-rotated':'{rotated}'+
'. Coba renungkan lagi dari petunjuk ini ya.',
'brain-tutor.probe-default':
'Sebelum lihat pilihannya lagi, coba cari kata di kalimat itu yang paling menentukan bentuk jawabannya. Kata yang mana?',
'brain-tutor.hint-rotated':
'Coba lihat dari sudut ini: '+'{rotated}'+
'. Sekarang coba lagi yuk.',
'brain-tutor.hint-cue':
'Kunci ingatannya: '+'{cue}'+'.',
'brain-tutor.hint-default':
'Petunjuknya ada di kata-kata di sekitar bagian yang kosong. Baca lagi pelan-pelan, lalu coba lagi ya.',
'brain-tutor.worked-intro':
' Aku contohkan satu yang mirip dulu ya, biar makin jelas langkahnya.',
'brain-tutor.reveal-intro':
' Oke, aku buka pembahasannya ya.',
'brain-tutor.move-celebrate':
'Nah, mantap! Jebakan yang tadi bikin kamu keliru sudah berhasil kamu lewati dengan pemahaman yang benar, bukan tebakan.',
'brain-tutor.move-consolidate':
'Tepat sekali! Karena tadi sempat berpikir agak lama, kita mantapkan dulu di sini sebentar sebelum naik level ya.',
'brain-tutor.move-stretch':
'Keren, jawabannya cepat dan tepat berturut-turut! Level ini sudah kamu kuasai, yuk kita coba tantangan yang sedikit lebih tinggi.',
'brain-tutor.move-breathe':
'Yuk istirahat sejenak! Kalau pikiran mulai capek, wajar kok kalau jawaban melambat. Istirahat dulu sebentar, nanti lanjut lagi biar otak segar.',
'brain-tutor.move-wrapup':
'Soalnya habis. Kita cukupkan sesi ini ya.',
'brain-tutor.headline-resolved':
'Sesi ini kamu berhasil lewati '+'{count}'+
' hal yang tadinya bikin keliru.',
'brain-tutor.headline-persistent':'Ada '+'{count}'+
' pola yang masih perlu kita asah lagi, tenang saja nanti kita kejar di sesi berikutnya ya.',
'brain-tutor.headline-empty':
'Belum ada jawaban di sesi ini.',
'brain-tutor.headline-clean':
'Luar biasa! Sesi ini bersih tanpa ada pola salah yang berulang.'});function c(T,e){return T&&typeof T[e]==='string'?T[e]:Q[e]}function l(T,e){return String(T).replace(/\{(\w+)\}/g,function(_,r){return e&&Object.prototype.hasOwnProperty.call(e,r)?String(e[r]):_})}function __(T,e,_){var r=[];if(Z(T.rule))r.push(Z(T.rule));var t=Z(T.whyFails)||Z(e.whyFails);if(t)r.push(t);var n=Z(e.chosenOption);var i=Z(e.correctAnswer||T.correct);if(n&&i)r.push(l(c(_,
'brain-tutor.compare-direct'),{chosen:n,right:i}));return r}function e_(T,e,_,r,t){var n=Z(_)||Z(T.rule);if(!n)return l(c(t,
'brain-tutor.worked-fallback'),{concept:r});var i=[];i.push(l(c(t,
'brain-tutor.worked-step1'),{rule:n}));var o=Z(e.sentence||T.example);if(o)i.push(l(c(t,
'brain-tutor.worked-step2'),{sentence:o}));var s=Z(e.correctAnswer||T.correct);if(s)i.push(l(c(t,
'brain-tutor.worked-step3'),{answer:s}));if(i.length<3)return l(c(t,
'brain-tutor.worked-fallback'),{concept:n||r});return i.join(' ')}function H(T,e,_){var r=T||{};var t=e&&typeof e==='object'?e:null;var n=_&&typeof _==='object'?_:null;var i=a(r.move);var o=a(r.scaffold)||'hint';var s=r.explanation&&typeof r.explanation==='object'?r.explanation:{};var f=a(r.whyFails);var S=a(r.conceptLabel)||c(n,
'brain-tutor.concept-fallback');var E=a(r.concept)||a(r.conceptLabel);var R='';var F='';var h=false;var N=E?E+'::'+o:'';var C=t&&N&&t.explanationsUsed?O(t.explanationsUsed[N],0):0;var M=__(s,r,n);var v=C>0&&M.length?M[(C-1)%M.length]:'';var K=a(r.keyGuard||r.correctAnswer||s.correct);var p=(Array.isArray(r.options)?r.options:[]).map(function(m){return a(m).trim()}).filter(Boolean);var w=function(m){if(!m)return false;var d=String(m);if(K){var a_=K.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');try{if(new RegExp(
'(^|[^A-Za-z0-9])'+a_+
'([^A-Za-z0-9]|$)','i').test(d))return true}catch(s_){}if(K.length>=3&&d.toLowerCase().includes(K.toLowerCase()))return true}if(/pakai\s+-(ed|ing|s|es|ly|er|est)\b/i.test(d)||/akhiran\s+-(ed|ing|s|es|ly|er|est)\b/i.test(d))return true;for(var b=0;b<p.length;b++){var x=p[b];if(x.length>=3&&(d.includes('“'+x+'”')||d.includes('"'+x+'"')||d.includes("'"+x+"'"))){if(K&&x.toLowerCase()===K.toLowerCase())return true}}return false};if(i==='hint'||i==='reteach'){if(r.timing==='guess'){R=c(n,
'brain-tutor.timing-guess')}else if(f){R=l(c(n,
'brain-tutor.why-fails'),{why:Z(f)})}else{R=c(n,
'brain-tutor.not-yet')}if(o==='probe'){F=v?l(c(n,
'brain-tutor.probe-rotated'),{rotated:v}):a(s.howToAvoid)&&!w(s.howToAvoid)?a(s.howToAvoid):c(n,
'brain-tutor.probe-default')}else if(o==='hint'){F=v?l(c(n,
'brain-tutor.hint-rotated'),{rotated:v}):Z(s.memoryCue)&&!w(s.memoryCue)?l(c(n,
'brain-tutor.hint-cue'),{cue:Z(s.memoryCue)}):c(n,
'brain-tutor.hint-default')}else if(o==='worked'){R+=c(n,
'brain-tutor.worked-intro');F=e_(s,r,v,S,n)}else{R+=c(n,
'brain-tutor.reveal-intro');F=v||a(s.whyCorrect)||a(s.rule)||'';h=true}if(t&&N)t.lastExplanation={concept:E,scaffold:o,key:N}}else if(i==='celebrate'){R=c(n,
'brain-tutor.move-celebrate')}else if(i==='consolidate'){R=c(n,
'brain-tutor.move-consolidate')}else if(i==='stretch'){R=c(n,
'brain-tutor.move-stretch')}else if(i==='breathe'){R=c(n,
'brain-tutor.move-breathe')}else if(i==='wrapup'){R=c(n,
'brain-tutor.move-wrapup')}else{R=''}return{say:R,ask:F,reveal:h,scaffold:o,move:i}}function r_(T,e,_){var r=g.indexOf(a(T)||'hint');var t=g[Math.min(g.length-1,(r<0?1:r)+1)];var n=e||{};var i={};for(var o in n){if(Object.prototype.hasOwnProperty.call(n,o))i[o]=n[o]}i.scaffold=t;if(!i.move)i.move='hint';var s=H(i,_);return{scaffold:t,reveal:t==='tell'&&s.reveal,turn:s}}function n_(T){var e=T|0;return function(){e=e+1831565813|0;var _=Math.imul(e^e>>>15,1|e);_=_+Math.imul(_^_>>>7,61|_)^_;return((_^_>>>14)>>>0)/4294967296}}var t_=.35;var T_=4;function i_(T,e,_){var r=Array.isArray(T)?T.filter(Boolean):[];if(!r.length)return null;var t=e||{};var n=_||{};var i=typeof n.predict==='function'?n.predict:null;var o=u(n.targetSuccess==null?.8:n.targetSuccess,.4,.95);var s=a(n.forceConcept);var f=a(n.avoidConcept);var S=r.map(function(K){var p=a(K.concept||K.lessonSkill||K.skill);var w=i?u(i(K),0,1):o;var m=-Math.pow(w-o,2)*10;if(s&&p===s)m+=6;if(f&&p===f)m-=3;var d=O(t.attemptsOnConcept&&t.attemptsOnConcept[p],0);m-=d*.6;return{item:K,score:m,concept:p,predicted:I(w,3)}}).sort(function(K,p){return p.score-K.score});if(typeof n.seed==='number'&&isFinite(n.seed)){var E=S.slice(0,T_);var R=E[0].score;var F=[],h=0,N;for(N=0;N<E.length;N++){var C=Math.exp((E[N].score-R)/t_);F.push(C);h+=C}var M=n_(n.seed)()*h;var v=0;for(N=0;N<E.length;N++){v+=F[N];if(M<v)return E[N].item}return E[E.length-1].item}return S[0].item}function o_(T,e){var _=e&&typeof e==='object'?e:null;var r=T||{};var t=r.misconceptions||{};var n=r.resolved||{};var i=P(Object.keys(t).filter(function(S){return t[S]>=2&&!n[S]}).map(D));var o=P(Object.keys(n).map(D));var s=r.answered?Math.round(r.correct/r.answered*100):null;var f=(r.log||[]).reduce(function(S,E){S[E.timing]=(S[E.timing]||0)+1;return S},{});return{schema:y,answered:O(r.answered),correct:O(r.correct),accuracy:s,interventions:O(r.interventions),resolvedMisconceptions:o,persistentMisconceptions:i,timings:f,headline:o.length?l(c(_,
'brain-tutor.headline-resolved'),{count:o.length}):i.length?l(c(_,
'brain-tutor.headline-persistent'),{count:i.length}):s==null?c(_,
'brain-tutor.headline-empty'):c(_,
'brain-tutor.headline-clean')}}return{schema:y,LADDER:g,GUESS_FLOOR_MS:W,MISS_STREAK_STOP:z,diagnose:k,classifyTiming:L,median:U,scaffoldLevel:$,createSession:q,record:V,decideMove:J,composeTurn:H,escalate:r_,selectNext:i_,summarize:o_}});
