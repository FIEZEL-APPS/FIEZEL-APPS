/* FIEZEL Braincore Runtime v3.14.0 | rev: 599fe2ffdf5e42b1 */
(function(o,l){var SCHEMA = 'fiezel-listening-adaptive-v1';var _fzR='14ad227ced4e7cd4',_fzA=1677094;if(_fzR.length!==16||_fzA!==1677094)return;var t=l();if(typeof module==='object'&&module.exports)module.exports=t;if(o)o.FiezelListeningAdaptive=t})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';var o=
'fiezel-listening-adaptive-v1';var l=['slow','natural','fast'];var t=['short','medium','long'];var S=3;var F=0;var c=6;var K=3;var Z=.8;var O=.1;var g=2;var N={rateBand:'natural',replayQuota:2,clipLength:'medium'};var B=35;var Q=70;var y={brain3_listening_default:
'Belum ada bukti listening yang bisa dibaca, jadi kesulitan diset ke titik tengah yang aman: kecepatan natural, 2 replay, klip sedang.',brain3_listening_baseline_low:
'Mastery masih rendah, jadi titik awal diambil dari kombinasi termudah: pelan, replay penuh, klip pendek.',brain3_listening_baseline_mid:
'Mastery menengah, jadi titik awal di tengah tangga kesulitan.',brain3_listening_baseline_high:
'Mastery sudah tinggi, jadi titik awal langsung menantang: cepat, replay terbatas, klip panjang.',brain3_listening_insufficient_evidence:
'Bukti pada jendela terakhir terlalu tipis untuk dipercaya, jadi kesulitan ditahan dulu — kebijakan yang berayun karena satu jawaban lebih berbahaya daripada yang diam.',brain3_listening_step_up_rate:
'Akurasi jauh di atas target, jadi kecepatan putar dinaikkan satu pita — hanya kecepatan, supaya kalau hasil berubah kita tahu tombol mana penyebabnya.',brain3_listening_step_up_clip:
'Akurasi jauh di atas target dan kecepatan sudah maksimal, jadi giliran panjang klip yang dinaikkan satu tingkat.',brain3_listening_step_up_replay:
'Akurasi jauh di atas target pada kecepatan dan klip maksimal, jadi jaring pengaman terakhir dikurangi: kuota replay turun satu.',brain3_listening_step_down_replay:
'Akurasi di bawah target, jadi jaring pengaman dikembalikan dulu: kuota replay naik satu — tombol termurah, materi tidak berubah.',brain3_listening_step_down_clip:
'Akurasi di bawah target dan replay sudah penuh, jadi klip dipendekkan satu tingkat.',brain3_listening_step_down_rate:
'Akurasi di bawah target meski replay penuh dan klip pendek, jadi kecepatan diperlambat satu pita.',brain3_listening_hold_in_band:
'Akurasi berada di dalam pita target (±0.1), jadi kesulitan dipertahankan — di sinilah belajar paling efisien.',brain3_listening_hidden_load_replays:
'Akurasi memang tinggi, tetapi rata-rata replay >= 2 menandakan murid bekerja jauh lebih keras daripada yang terlihat — kenaikan ditahan sampai bebannya turun.',brain3_listening_ceiling:
'Semua dimensi sudah di tingkat tersulit; tidak ada yang bisa dinaikkan lagi.',brain3_listening_floor:
'Semua dimensi sudah di tingkat termudah; tidak ada yang bisa diturunkan lagi.'};function f(_,a){var e=Number(_);return Number.isFinite(e)?e:a}function R(_,a,e){return Math.min(e,Math.max(a,_))}function I(_){if(!Array.isArray(_))return[];var a=[];for(var e=0;e<_.length;e++){var r=_[e];if(!r||typeof r!=='object')continue;a.push({replays:R(f(r.replays,0),0,99),correct:r.correct===true})}return a}function s(_){var a=I(_).slice(-c);if(!a.length)return{n:0,accuracy:null,meanReplays:null};var e=0;var r=0;for(var i=0;i<a.length;i++){if(a[i].correct)e++;r+=a[i].replays}return{n:a.length,accuracy:e/a.length,meanReplays:r/a.length}}function D(_){if(_===null){return{dims:{rateBand:N.rateBand,replayQuota:N.replayQuota,clipLength:N.clipLength},rationale:
'brain3_listening_default'}}if(_<B){return{dims:{rateBand:'slow',replayQuota:3,clipLength:'short'},rationale:
'brain3_listening_baseline_low'}}if(_<Q){return{dims:{rateBand:'natural',replayQuota:2,clipLength:'medium'},rationale:
'brain3_listening_baseline_mid'}}return{dims:{rateBand:'fast',replayQuota:1,clipLength:'long'},rationale:
'brain3_listening_baseline_high'}}function L(_){var a=l.indexOf(_.rateBand);if(a>=0&&a<l.length-1){return{dims:{rateBand:l[a+1],replayQuota:_.replayQuota,clipLength:_.clipLength},rationale:
'brain3_listening_step_up_rate'}}var e=t.indexOf(_.clipLength);if(e>=0&&e<t.length-1){return{dims:{rateBand:_.rateBand,replayQuota:_.replayQuota,clipLength:t[e+1]},rationale:
'brain3_listening_step_up_clip'}}if(_.replayQuota>F){return{dims:{rateBand:_.rateBand,replayQuota:_.replayQuota-1,clipLength:_.clipLength},rationale:
'brain3_listening_step_up_replay'}}return{dims:{rateBand:_.rateBand,replayQuota:_.replayQuota,clipLength:_.clipLength},rationale:
'brain3_listening_ceiling'}}function h(_){if(_.replayQuota<S){return{dims:{rateBand:_.rateBand,replayQuota:_.replayQuota+1,clipLength:_.clipLength},rationale:
'brain3_listening_step_down_replay'}}var a=t.indexOf(_.clipLength);if(a>0){return{dims:{rateBand:_.rateBand,replayQuota:_.replayQuota,clipLength:t[a-1]},rationale:
'brain3_listening_step_down_clip'}}var e=l.indexOf(_.rateBand);if(e>0){return{dims:{rateBand:l[e-1],replayQuota:_.replayQuota,clipLength:_.clipLength},rationale:
'brain3_listening_step_down_rate'}}return{dims:{rateBand:_.rateBand,replayQuota:_.replayQuota,clipLength:_.clipLength},rationale:
'brain3_listening_floor'}}function H(_){var a=_&&typeof _==='object'?_:{};var e=f(a.mastery,NaN);var r=Number.isFinite(e)?R(e,0,100):null;var i=R(f(a.targetSuccess,Z),.5,.95);var d=D(r);var T=s(a.replayHistory);var n=[d.rationale];var u=Math.round(T.n/c*100)/100;var E=d.dims;if(T.n<K){n.push(T.n===0?
'brain3_listening_default':
'brain3_listening_insufficient_evidence');if(n[0]===n[1])n=[n[0]];return p(E,n,u)}if(T.accuracy>i+O){if(T.meanReplays>=g){n.push(
'brain3_listening_hidden_load_replays');return p(E,n,u)}var A=L(E);n.push(A.rationale);return p(A.dims,n,u)}if(T.accuracy<i-O){var b=h(E);n.push(b.rationale);return p(b.dims,n,u)}n.push(
'brain3_listening_hold_in_band');return p(E,n,u)}function p(_,a,e){return{rateBand:_.rateBand,replayQuota:R(_.replayQuota,F,S),clipLength:_.clipLength,rationale:a.slice(),confidence:e}}function v(_,a){var e=a&&typeof a==='object'?a:null;if(typeof _==='string'){var r=e&&typeof e[_]==='string'?e[_]:y[_];return r||
'Keputusan listening adaptif tanpa penjelasan terdaftar ('+_+').'}if(_&&Array.isArray(_.rationale)){return _.rationale.map(function(i){return v(i,e)}).join(' ')}return e&&typeof e.brain3_listening_default==='string'?e.brain3_listening_default:y.brain3_listening_default}return{SCHEMA:o,RATE_BANDS:l,CLIP_LENGTHS:t,REPLAY_MAX:S,REPLAY_MIN:F,WINDOW:c,MIN_EVIDENCE:K,TARGET_DEFAULT:Z,BAND_HALF_WIDTH:O,HIDDEN_LOAD_REPLAYS:g,DEFAULTS:N,policy:H,explain:v,stepUp:L,stepDown:h,windowStats:s}});
