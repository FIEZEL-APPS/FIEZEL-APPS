#!/usr/bin/env bash
# A5 cold-start pepper — BUKTI MERAH.
# Setiap mutasi di bawah HARUS memerahkan assert yang ditunjuk, lalu dipulihkan.
# Mutasi yang tetap hijau = lubang gerbang, dan itu wajib dilaporkan.
set -u
cd "$(dirname "$0")"

CORE=workers/api/analytics/analytics-core.js
STORE=workers/api/analytics/analytics-store-d1.js
ROUTE=workers/api/analytics/route-events.js
ROLL=workers/api/analytics/rollup.js

for f in "$CORE" "$STORE" "$ROUTE" "$ROLL"; do cp "$f" "/tmp/a5.$(basename "$f").bak"; done
restore() { for f in "$CORE" "$STORE" "$ROUTE" "$ROLL"; do cp "/tmp/a5.$(basename "$f").bak" "$f"; done; }
trap restore EXIT

py() { python3 -c "$1"; }

probe() { # $1=label  $2=pola nama assert yang harus FAIL
  rm -f ANALYTICS-PRIVACY-REPORT.json
  node analytics-privacy-test.js >/tmp/a5.probe.out 2>&1
  local verdict
  if [ ! -f ANALYTICS-PRIVACY-REPORT.json ]; then
    echo "TANPA-LAPORAN!! (gerbang meledak, bukan assert merah) | $1"
    tail -3 /tmp/a5.probe.out | sed 's/^/    /'
    restore; return
  fi
  verdict="$(python3 - "$2" <<'PY'
import json, sys
pat = sys.argv[1]
d = json.load(open('ANALYTICS-PRIVACY-REPORT.json'))
fails = [c['name'] for c in d['checks'] if c['status'] == 'FAIL']
hit = [n for n in fails if pat in n]
print(('MERAH-OK  | ' if hit else 'TIDAK-MERAH!! | ') + ('; '.join(hit[:2]) if hit else f'FAIL yang ada: {fails[:3]}'))
PY
)"
  echo "$verdict | $1"
  restore
}

echo "== hijau dasar =="
node analytics-privacy-test.js >/dev/null 2>&1 && echo "HIJAU (exit 0)" || echo "DASAR SUDAH MERAH — hentikan"

# (a) inisialisasi malas dibatalkan: kembali ke baca-saja seperti sebelum A5.
py "s=open('$ROUTE').read();s=s.replace('const ensured = await store.ensurePepperState(db, now);','const ensured = { state: await store.readPepperState(db), created: false };',1);open('$ROUTE','w').write(s)"
probe "(a) tanpa inisialisasi malas: basis data kosong => 503" "(a) permintaan pepper PERTAMA"

# (b) cek-lalu-tulis: tulis tanpa syarat menggantikan INSERT ... DO NOTHING.
py "s=open('$STORE').read();s=s.replace('await db.prepare(SQL.initPepper).bind(candidate.rotated_at, candidate.current).run();','await writePepperState(db, candidate);',1);open('$STORE','w').write(s)"
probe "(b) tulis tanpa syarat (balapan): baris pepper berubah dua kali" "(b) baris pepper hanya BERUBAH sekali"

# (b) calon lokal dikembalikan tanpa baca ulang: pemanggil yang kalah menyajikan pepper yatim.
py "s=open('$STORE').read();s=s.replace('''  const state = await readPepperState(db);
  if (!state || !state.current) return { state: null, created: false };''','''  const state = candidate;
  if (!state || !state.current) return { state: null, created: false };''',1);open('$STORE','w').write(s)"
probe "(b) tanpa baca-ulang: dua permintaan bersamaan menyajikan dua pepper" "(b) ensurePepperState MEMBACA ULANG"

# (b) ON CONFLICT DO NOTHING dilemahkan menjadi DO UPDATE (init jadi bisa menimpa).
py "s=open('$STORE').read();s=s.replace(\"'ON CONFLICT(id) DO NOTHING'\",\"'ON CONFLICT(id) DO UPDATE SET current = excluded.current'\",1);open('$STORE','w').write(s)"
probe "(b) init boleh menimpa: bukan lagi penulisan sekali-saja" "(b) inisialisasi memakai penulisan idempoten"

# (c) rotated_at diisi `now` (inisialisasi berpura-pura rotasi barusan).
py "s=open('$CORE').read();s=s.replace('return { rotated_at: pepperWindowStart(now), current, previous: null };','return { rotated_at: Number(now) || 0, current, previous: null };',1);open('$CORE','w').write(s)"
probe "(c) rotated_at = now: jendela bergeser, cron berikutnya terlewat" "(c) \`rotated_at\` inisialisasi"

# (c) `previous` dikarang dari `current`.
py "s=open('$CORE').read();s=s.replace('return { rotated_at: pepperWindowStart(now), current, previous: null };','return { rotated_at: pepperWindowStart(now), current, previous: current };',1);open('$CORE','w').write(s)"
probe "(c) previous dikarang saat inisialisasi" "(c) initialPepperState() murni"

# (d) jangkar jendela digeser ke tengah malam UTC: rotasi tidak lagi jatuh di cron.
py "s=open('$CORE').read();s=s.replace('export const PEPPER_WINDOW_ANCHOR_UTC_MINUTES = 17 * 60 + 5;','export const PEPPER_WINDOW_ANCHOR_UTC_MINUTES = 0;',1);open('$CORE','w').write(s)"
probe "(d) jangkar salah: cron berikutnya tidak merotasi" "(d) cron berikutnya MEROTASI"

# (d) rotasi harian dimatikan di rollup.
py "s=open('$ROLL').read();s=s.replace('if (rotatePepperDue(now, state && state.rotated_at)) {','if (false && rotatePepperDue(now, state && state.rotated_at)) {',1);open('$ROLL','w').write(s)"
probe "(d) rotasi dimatikan: pepper hari-1 hidup selamanya" "(d) cron berikutnya MEROTASI"

# (e) pepper dicetak ke log.
python3 - "$ROUTE" <<'MUT'
import sys
p = sys.argv[1]; s = open(p).read()
needle = "  return json({\n    ok: true,\n    day: dayKey(now),"
assert needle in s, 'pola log tidak ditemukan'
s = s.replace(needle, "  console.log('pepper aktif', state.current);\n" + needle, 1)
open(p, 'w').write(s)
MUT
probe "(e) pepper dicetak ke console" "(e) tidak ada satu pun panggilan console"

# (e) pepper diselipkan ke amplop galat.
python3 - "$ROUTE" <<'MUT'
import sys
p = sys.argv[1]; s = open(p).read()
needle = "return json({ ok: false, error: 'rate_limited' }, 429);"
assert needle in s, 'pola amplop tidak ditemukan'
s = s.replace(needle, "return json({ ok: false, error: 'rate_limited', pepper: 'bocor' }, 429);", 1)
open(p, 'w').write(s)
MUT
probe "(e) pepper masuk amplop galat" "(e) tidak ada amplop galat"

# (f) app_open berhenti menyumbang DAU (keadaan sebelum A5).
py "s=open('$CORE').read();s=s.replace('''        if (e.has_identity === true) bump(m, 'app_open_with_identity');
        noteDau(day, e.visitor_token);''','''        if (e.has_identity === true) bump(m, 'app_open_with_identity');''',1);open('$CORE','w').write(s)"
probe "(f) app_open tidak dicatat: token dikumpulkan tanpa dipakai" "(f) satu perangkat yang HANYA mengirim app_open"

# (f) dedup di aggregate() dilepas: satu perangkat bisa menyumbang dua baris.
py "s=open('$CORE').read();s=s.replace('''    if (dauSeen.has(key)) return;
    dauSeen.add(key);''','''    dauSeen.add(key);''',1);open('$CORE','w').write(s)"
probe "(f) aggregate berhenti men-dedup (day, token)" "(f) aggregate() sendiri sudah men-dedup"

echo "== selesai; berkas dipulihkan =="
node analytics-privacy-test.js >/dev/null 2>&1 && echo "HIJAU kembali (exit 0)" || echo "MASIH MERAH — periksa pemulihan"
