# python3 tools/cuesheet.py — tulis CUE-SHEET.md dari audio/events.json (sumber tunggal waktu).
import json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(R, 'audio', 'events.json'))); T = d['T']
f = lambda x: ('%.2f' % x).replace('.', ',')
fr = lambda x: str(round(x * 30))
L = ['# FIEZEL · "Satu Kelas, Dua Layar" — cue sheet', '',
     'Dihasilkan dari `audio/events.json` (`node events.mjs` membacanya langsung dari `web/film.js`).',
     '72,00 dtk · 2160 frame · 30 fps · 100 BPM (1 ketuk = 0,6 dtk = 18 frame; 1 bar = 2,4 dtk = 72 frame).', '',
     '## Tiga titik yang tidak boleh bergeser', '',
     '| Titik | Detik | Frame |', '|---|---|---|',
     '| Drop (dasbor membuka) | %s | %s |' % (f(T['drop']), fr(T['drop'])),
     '| Hening digital (sebelum logo) | %s–%s | %s–%s |' % (f(T['black']), f(T['splash']), fr(T['black']), fr(T['splash'])),
     '| Splash resmi + sonic logo | %s | %s |' % (f(T['splash']), fr(T['splash'])), '',
     '## VO', '', '| # | Mulai | Jendela maks | Teks | Ucapan TTS |', '|---|---|---|---|---|']
for v in d['VO']:
    L.append('| %s | %s | %s dtk | %s | %s |' % (v['id'], f(v['at']), f(min(v['max'], 4.1 if v['id'] == '23' else v['max'])), v['text'], v.get('say', '—')))
L += ['', '## Shot', '', '| Shot | Mulai | Selesai | Frame |', '|---|---|---|---|']
for s in d['SHOTS']:
    if s['t0'] >= 72: continue
    L.append('| %s | %s | %s | %s–%s |' % (s['name'], f(s['t0']), f(min(72, s['t1'])), fr(s['t0']), fr(min(72, s['t1'])) ))
L += ['', '## Titik gerak (T)', '', '| Kunci | Detik |', '|---|---|']
for k, v in T.items():
    L.append('| `%s` | %s |' % (k, ' – '.join(f(x) for x in v) if isinstance(v, list) else f(v)))
L += ['', '## Peta harmoni', '',
      '| Bar | Detik | Akor | Isi |', '|---|---|---|---|',
      '| 1–2 | 0,0–4,8 | Dm | drone D/A, piano Salamander bertanya (A4 F4 E4 D4 · A4 G4 F4 E4), detak jantung tiap 1,2 dtk |',
      '| 3 | 4,8–7,2 | B♭add9 | dentum taiko + sub saat monolit bangkit, senar masuk |',
      '| 4–11 | 7,2–26,4 | F · C/E · Dm7 · B♭maj7 · F/A · C · Dm9 · B♭ | motif "Terhubung" (C5 D5 F5 A5 — G5 F5), pluck 16-an + gema, kick setengah tempo |',
      '| — | 26,25–26,40 | — | hening musik (napas) |',
      '| 12–23 | 26,4–55,2 | Dm · B♭ · F · C ×2 · Gm · B♭ · Dm · C | DROP: kick 4, tepuk 2&4, hat 16-an, taiko per bar, bas oktaf, senar ostinato, brass tiap 4 bar, bel motif |',
      '| 24 | 55,2–57,6 | B♭maj7 | napas: piano F5 E5 D5 C5, senar |',
      '| 25 | 57,6–60,0 | F | puncak: brass, koor, bel motif, taiko isian |',
      '| 26 | 60,0–62,05 | C7sus4 | implosi: riser + swell terbalik, putus keras |',
      '| — | 62,05–62,40 | — | nol digital |',
      '| logo | 62,40–64,36 | F add9 | `splash_intro.ogg` resmi, tidak diolah (±2 LU di bawah puncak) |',
      '| ekor | 64,4–71,6 | Fmaj9 | pad lembut, piano A5 C6 G5 F5, senar — di bawah VO 24 |',
      '', '## Loudness', '',
      '- `audio/stems/bed.flac` (musik + SFX + logo): −16 LUFS, true peak ≤ −2,5 dBTP — masukan skrip VO.',
      '- `audio/mix-tanpa-vo.flac`: −14 LUFS, true peak ≤ −1,5 dBTP.',
      '- `out/mix-final.wav` (dengan VO): −14 LUFS, true peak ≤ −1,5 dBTP; musik turun ±7 dB di bawah suara (sidechain).',
      '- Nol digital: 62,05–62,40 dan 71,6–72,0.']
open(os.path.join(R, 'CUE-SHEET.md'), 'w').write('\n'.join(L) + '\n'); print('CUE-SHEET.md', len(L), 'baris')
