#!/usr/bin/env bash
# Bukti-merah: setiap mutasi HARUS memerahkan assert yang ditunjuk, lalu dipulihkan.
set -u
cd "$(dirname "$0")"
APP=app.js
MOD=features/analytics/fiezel-analytics-client.js
SRV=workers/api/analytics/analytics-core.js
cp "$APP" /tmp/a1.app.bak; cp "$MOD" /tmp/a1.mod.bak; cp "$SRV" /tmp/a1.srv.bak
restore() { cp /tmp/a1.app.bak "$APP"; cp /tmp/a1.mod.bak "$MOD"; cp /tmp/a1.srv.bak "$SRV"; }
trap restore EXIT

run() { node tests/analytics-client-test.js 2>&1; }

probe() { # $1=label  $2=grep pattern of expected FAIL
  local out; out="$(run)"
  if echo "$out" | grep -q "^FAIL.*$2"; then
    echo "MERAH-OK  | $1 | $(echo "$out" | grep "^FAIL" | head -1 | cut -c1-110)"
  else
    echo "TIDAK-MERAH!! | $1 | pola '$2' tidak muncul di FAIL. FAIL yang ada: $(echo "$out" | grep -c '^FAIL')"
    echo "$out" | grep "^FAIL" | head -3
  fi
  restore
}

py() { python3 -c "$1"; }

echo "== hijau dasar =="; run | tail -1

# (a) lapis statis diabaikan
py "s=open('$APP').read();s=s.replace(\"if(cfStaticMode('usage')!=='on')return false;\",'',1);open('$APP','w').write(s)"
probe "(a) lapis statis dilewati di anGateOpen()" "lapis STATIS mati"

# (a) lapis server diabaikan
py "s=open('$APP').read();s=s.replace(\"if(!cfServerAllows('usage'))return false;\",'',1);open('$APP','w').write(s)"
probe "(a) lapis server dilewati di anGateOpen()" "lapis SERVER mati"

# (a) 'shadow' dianggap izin kirim
py "s=open('$APP').read();s=s.replace(\"if(cfStaticMode('usage')!=='on')return false;\",\"if(cfStaticMode('usage')==='off')return false;\",1);open('$APP','w').write(s)"
probe "(a) 'shadow' diperlakukan sebagai izin" "shadow"

# (a) timer dipasang walau statis mati
py "s=open('$APP').read();s=s.replace(\"if(cfStaticMode('usage')!=='off')anBootSchedule();\",'anBootSchedule();',1);open('$APP','w').write(s)"
probe "(a) timer dipasang walau lapis statis mati" "NOL timer dipasang"

# (b) field asing lolos pagar pemanggil -> tertangkap pagar kedua (modul/kontrak)
py "s=open('$APP').read();s=s.replace(\"const allow=AN_FIELD_ALLOWLIST[name]||[],out={};\",\"const allow=AN_FIELD_ALLOWLIST[name]||[],out={debug_note:'x'};\",1);open('$APP','w').write(s)"
probe "(b/c) field asing disisipkan di pemancar" "field asing"

# (b) skema SERVER digeser -> perbandingan klien-vs-server memerah
py "s=open('$SRV').read();s=s.replace('duration_bucket: T.enum(DURATION_BUCKETS) } },','} },',1);open('$SRV','w').write(s)"
probe "(b) skema server digeser (duration_bucket dicabut)" "diterima server"

# (b) enum mode diteruskan apa adanya
py "s=open('$APP').read();s=s.replace('return Object.prototype.hasOwnProperty.call(AN_SESSION_MODES,t)?AN_SESSION_MODES[t]:AN_DEFAULT_MODE','return AN_SESSION_MODES[t]||t',1);open('$APP','w').write(s)"
probe "(b) tipe internal tak dikenal diteruskan apa adanya" "practice"

# (b) durasi mentah, bukan ember
py "s=open('$APP').read();s=s.replace(\"duration_bucket:anBucket(session&&session.durationMs)\",\"duration_bucket:String(session&&session.durationMs)\",1);open('$APP','w').write(s)"
probe "(b) durasi mentah menggantikan ember" "ember durasi"

# (b) kunci single-flight dicabut -> batch ganda
py "s=open('$MOD').read();s=s.replace('if (memory.flushing) return memory.flushing;','',1);open('$MOD','w').write(s)"
probe "(b) kunci single-flight dicabut -> batch terkirim dua kali" "batch ganda"

# (c) allowlist pemancar dicabut
py "s=open('$APP').read();s=s.replace('for(const key of allow){','for(const key of Object.keys(fields||{})){',1);open('$APP','w').write(s)"
probe "(c) allowlist pemancar dicabut" "field asing"

# (c) isi belajar disisipkan DAN kedua pagar allowlist dijebol
py "
s=open('$APP').read()
s=s.replace(\"session_ended:Object.freeze(['mode','level','completed','answered','duration_bucket'])\",\"session_ended:Object.freeze(['mode','level','completed','answered','duration_bucket','jawaban'])\",1)
s=s.replace('answered:anAnswered(session&&session.answered)',\"jawaban:'She go school',answered:anAnswered(session&&session.answered)\",1)
s=s.replace(\"if(typeof v==='string'&&v.length>16)continue;\",'',1)
open('$APP','w').write(s)
m=open('$MOD').read()
m=m.replace(\"if (!Object.prototype.hasOwnProperty.call(spec, key)) { droppedKeys.push(key); continue; }\",\"if (!Object.prototype.hasOwnProperty.call(spec, key)) { event[key] = input[key]; continue; }\",1)
open('$MOD','w').write(m)"
probe "(c) teks jawaban murid disisipkan + kedua allowlist dijebol" "kata terlarang"

# (c) batas panjang string dicabut
py "s=open('$APP').read();s=s.replace(\"if(typeof v==='string'&&v.length>16)continue;\",'',1);open('$APP','w').write(s)"
probe "(c) batas panjang string dicabut" "string panjang"

# (d) KEDUA penangkap galat di anEmit dicabut sekaligus.
# Catatan jujur: mencabut hanya SATU dari keduanya tetap hijau, karena keduanya
# saling menutupi (galat sinkron di dalam .then() jadi penolakan yang ditangkap
# .catch luar, dan sebaliknya). Itu pertahanan berlapis, bukan assert mati.
py "
s=open('$APP').read()
s=s.replace(\"try{fn(c)}catch{anLastError='emit_threw'}\",'fn(c)',1)
s=s.replace(\".catch(()=>{anLastError='emit_rejected'})\",'',1)
open('$APP','w').write(s)"
probe "(d) kedua penangkap galat di anEmit dicabut" "(d)"

# (d) anSwallow dilumpuhkan -> janji modul jadi unhandledRejection
py "s=open('$APP').read();s=s.replace(\"function anSwallow(p){try{if(p&&typeof p.then==='function')p.then(()=>{},()=>{anLastError='module_rejected'})}catch{}return undefined}\",'function anSwallow(p){return undefined}',1);open('$APP','w').write(s)"
probe "(d) anSwallow dilumpuhkan (janji modul dibiarkan menolak)" "unhandledRejection"

# (e) pemancar diselipkan ke jalur jawaban
py "s=open('$APP').read();s=s.replace('function record(q,ok,ms,selectedIndex){','function record(q,ok,ms,selectedIndex){anMarkActive();/*A1-EMIT*/',1);open('$APP','w').write(s)"
probe "(e) anMarkActive() diselipkan ke record()" "NOL pemancar di record"

# (e) titik pemanggil tanpa tanda
py "s=open('$APP').read();s=s.replace('anSessionStarted(state.activeSession);/*A1-EMIT*/','anSessionStarted(state.activeSession);',1);open('$APP','w').write(s)"
probe "(e) tanda /*A1-EMIT*/ dihapus dari satu titik" "ditandai"

# (e) satu titik session_ended dihapus
py "s=open('$APP').read();s=s.replace('anSessionEnded(session);/*A1-EMIT*/','',1);open('$APP','w').write(s)"
probe "(e) satu titik session_ended dihapus" "Dua titik session_ended"

# (e) baris pemanggil menyentuh objek soal
py "s=open('$APP').read();s=s.replace('anSessionStarted(state.activeSession);/*A1-EMIT*/','anSessionStarted(state.activeSession,q.options);/*A1-EMIT*/',1);open('$APP','w').write(s)"
probe "(e) baris pemanggil menyentuh q.options" "objek soal"

# (f) token dilepas dari pepper: kunci HMAC jadi konstanta
py "
m=open('$MOD').read()
m=m.replace(\"enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }\", \"enc.encode('konstanta-tetap'), { name: 'HMAC', hash: 'SHA-256' }\", 1)
open('$MOD','w').write(m)"
probe "(f) kunci HMAC dilepas dari pepper (jadi konstanta)" "(f)"

# blok dihapus seluruhnya
py "
s=open('$APP').read()
a=s.index('/* A1-ANALYTICS-EMITTER-BEGIN'); b=s.index('/* A1-ANALYTICS-EMITTER-END */')
s=s[:a]+s[b+len('/* A1-ANALYTICS-EMITTER-END */'):]
open('$APP','w').write(s)"
probe "blok pemancar dihapus dari app.js" "penanda BEGIN/END"

# await disisipkan ke blok (bisa menahan jalur belajar)
py "s=open('$APP').read();s=s.replace('function anMarkActive(){return anEmit','async function anMarkActive(){await 0;return anEmit',1);open('$APP','w').write(s)"
probe "await disisipkan ke blok pemancar" "await"

echo "== hijau setelah semua pemulihan =="; restore; run | tail -1
