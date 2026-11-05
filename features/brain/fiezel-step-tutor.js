/* FIEZEL Braincore Runtime v3.14.0 | rev: 903b3c33992a3baf */
(function(K,N){var _fzR='968445289e724434',_fzA=11669746;if(_fzR.length!==16||_fzA!==11669746)return;var Z=N();if(typeof module==='object'&&module.exports)module.exports=Z;if(K)K.FiezelStepTutor=Z})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';var K=3;var N=Object.freeze({identify:'identify',detect:'identify',spot:'identify',find:'identify',locate:'identify',recognize:'identify',notice:'identify',track:'identify',recall:'identify',select:'select',choose:'select',pick:'select',decide:'select',determine:'select',apply:'apply',insert:'apply',fill:'apply',add:'apply',supply:'apply',form:'apply',generate:'apply',convert:'apply',complete:'apply',combine:'apply',place:'apply',reposition:'apply',substitute:'apply',encode:'apply',mark:'apply',shift:'apply',backshift:'apply',restore:'apply',revert:'apply',punctuate:'apply',compare:'compare',weigh:'compare',count:'compare',separate:'compare',classify:'compare',assess:'compare',evaluate:'compare',judge:'compare',match:'compare',align:'compare',eliminate:'eliminate',avoid:'eliminate',reject:'eliminate',remove:'eliminate',reduce:'eliminate',check:'check',confirm:'check',inspect:'check',verify:'check',keep:'check',require:'check'});var Z=Object.freeze({
'brain-step.step-prefix':'Langkah '+'{n}'+': ',
'brain-step.ask-identify':
'coba kenali dulu — '+'{obj}'+
' — yang mana di kalimat ini?',
'brain-step.ask-select':
'dari petunjuk tadi, '+'{obj}'+
' mana yang paling cocok?',
'brain-step.ask-apply':
'sekarang terapkan — '+'{obj}'+
' — jadi bentuk apa?',
'brain-step.ask-compare':'timbang dulu — '+'{obj}'+
' — mana yang lebih sesuai?',
'brain-step.ask-eliminate':
'singkirkan yang tidak mungkin — '+'{obj}'+
' — pilihan mana yang gugur?',
'brain-step.ask-check':'periksa lagi — '+'{obj}'+' — sudah benar?',
'brain-step.final-combine':
'Sekarang gabungkan langkah-langkah tadi'+'{quoted}'+
' — apa jawabanmu?',
'brain-step.final-quoted-stem':
' — j\u0061di j\u0061waban so\u0061lnya: "'+'{stem}'+'"',
'brain-step.final-direct':
'Jawab soalnya: "'+'{stem}'+
'" — apa jawabanmu?',
'brain-step.final-fallback':
'\u0041pa jaw\u0061banmu \u0075ntuk so\u0061l ini?'});function F(T,_){return T&&typeof T[_]==='string'?T[_]:Z[_]}function R(T,_){return String(T).replace(/\{(\w+)\}/g,function(S,O){return _&&Object.prototype.hasOwnProperty.call(_,O)?String(_[O]):S})}function i(T,_,S,O){var E=R(F(O,
'brain-step.step-prefix'),{n:_});if(T==='identify')return E+R(F(O,
'brain-step.ask-identify'),{obj:S});if(T==='select')return E+R(F(O,
'brain-step.ask-select'),{obj:S});if(T==='apply')return E+R(F(O,
'brain-step.ask-apply'),{obj:S});if(T==='compare')return E+R(F(O,
'brain-step.ask-compare'),{obj:S});if(T==='eliminate')return E+R(F(O,
'brain-step.ask-eliminate'),{obj:S});if(T==='check')return E+R(F(O,
'brain-step.ask-check'),{obj:S});return E+S+'?'}function t(T){if(typeof T!=='string'||!T.trim())return[];var _=T.split(/->|;/).map(function(S){return S.trim().replace(/[.\s]+$/,'')}).filter(function(S){return S.length>0});if(_.length<=K)return _;return _.slice(0,K-1).concat([_[_.length-1]])}function s(T){var _=String(T).toLowerCase().match(/^[a-z']+/);return _?_[0]:''}function o(T,_){var S=String(T).slice(_.length).trim();S=S.replace(/^(whether|if|that)\s+/i,'');return S||T}function r(T){if(!T||typeof T!=='object')return[];var _=t(T.reasoningOperation);var S=[];for(var O=0;O<_.length;O++){var E=s(_[O]);var e=N[E]||null;var n=e?o(_[O],E):_[O];S.push({ask:i(e,O+1,n),expect:n,rationale:e?'brain3_step_'+e:
'brain3_step_fallback'})}return S}function a(T){var _=Array.isArray(T)?T:T&&Array.isArray(T.templates)?T.templates:[];var S=0;for(var O=0;O<_.length;O++){if(r(_[O]).length>=2)S++}return{total:_.length,withSteps:S,share:_.length?S/_.length:0}}function f(T,_){var S=r(_);var O=typeof T==='string'&&T.trim()?T.trim():_&&typeof _.stem==='string'?_.stem.trim():'';var E=S.length?
'Sekarang gabungkan langkah-langkah tadi'+(O?
' — jadi jawaban soalnya: "'+O+'"':'')+
' — apa jawabanmu?':O?
'Jawab soalnya: "'+O+
'" — apa jawabanmu?':
'Apa jawabanmu untuk soal ini?';return{steps:S,finalAsk:E,rationale:S.length>=2?
'brain3_step_tutor_decomposed':S.length===1?
'brain3_step_tutor_single':
'brain3_step_tutor_passthrough'}}return{MAX_STEPS:K,VERB_CATEGORY:N,parseOps:t,stepsFor:r,coverage:a,decompose:f}});
