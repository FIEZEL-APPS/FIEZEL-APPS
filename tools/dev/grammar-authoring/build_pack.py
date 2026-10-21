#!/usr/bin/env python3
"""Bangun paket tools/grammar-upgrade/new-templates-<x>.json dari sumber ringkas + periksa mutunya.

Sumber (modul Python) mendefinisikan:
  LESSONS = { subskill: dict(obj=(en,id,th), mis=(en,id,th), rule=(en,id,th), avoid=(en,id,th)) }
  ITEMS   = [ dict(s=subskill, id=..., stem=..., opts=[...], ans=..., why=(en,id,th), others=(en,id,th),
                   cue=(en,id,th), rsn=(en,id,th), d=[(opt, LABEL, en, id, th), ...]) ]
LABEL:
  '@N'        -> distraktor ke-N template PERTAMA lesson (diselesaikan pipa resmi sebagai @sibling:N)
  '=TID:N'    -> label distraktor ke-N template TID (label Inggris + teks id + th disalin)
  (en, id, th)-> label baru (didaftarkan ke newLabels)
"""
import importlib.util, json, os, re, sys, unicodedata

ROOT = os.environ.get('FZ_ROOT') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
BANK = json.load(open(os.path.join(ROOT, 'grammar-templates.json'), encoding='utf-8'))['templates']
TH = json.load(open(os.path.join(ROOT, 'grammar-explanations-th.json'), encoding='utf-8'))['templates']
DIAG = json.load(open(os.path.join(ROOT, 'grammar-misconception-id.json'), encoding='utf-8'))['diagnoses']
# Bank dasar = bank dikurangi isi paket yang dibangun alat ini (g, h, i). Tanpa ini, menjalankan ulang
# pembangun di checkout yang paketnya sudah terpasang akan melihat ID/stem/label paket itu sebagai ganda.
_own_ids, _own_labels = set(), set()
for _k in 'ghi':
    _p = os.path.join(ROOT, 'tools', 'grammar-upgrade', f'new-templates-{_k}.json')
    if os.path.exists(_p):
        _pk = json.load(open(_p, encoding='utf-8'))
        _own_ids |= {t['id'] for t in _pk.get('templates', [])}
        _own_labels |= set(_pk.get('newLabels', {}))
BANK = [t for t in BANK if t['id'] not in _own_ids]
TH = {k: v for k, v in TH.items() if k not in _own_ids}
DIAG = {k: v for k, v in DIAG.items() if k not in _own_labels}
BY_ID = {t['id']: t for t in BANK}
FIRST = {}
for t in BANK:
    FIRST.setdefault(t['subskill'], t)

VERBS = set('identify detect spot find locate recognize notice track recall select choose pick decide determine apply insert fill add supply form generate convert complete combine place reposition substitute encode mark shift backshift restore revert punctuate compare weigh count separate classify assess evaluate judge match align eliminate avoid reject remove reduce check confirm inspect verify keep require'.split())
BANNED_ID = re.compile(r'(miskonsepsi|distraktor|polaritas|takrif|kuantifier|pemunduran|nomina|tercacah|refleksif|partisip|klausa|\bSiswa\b|doang|ngegambarin|keulang|nyatain|gimana)', re.I)
THAI = re.compile(r'[\u0E00-\u0E7F]')
# Sama persis dengan EN_MARKERS di tests/misconception-diagnosis-test.js (teks di dalam '...' dikecualikan).
EN_MARKERS = re.compile(r"\b(the|is|are|was|were|this|that|with|because|verb|noun|tense|sentence|answer|option|which|would|should|does|form|clause|subject)\b", re.I)
DIAG_TEXTS = {v.lower().strip(): k for k, v in DIAG.items()}
ALT_OK = re.compile(r'grammatically (?:valid|possible|correct)|not incorrect|acceptable', re.I)
GENERIC = re.compile(r'Each distractor conflicts|Check the subject, time reference|Match form to function and context|identify grammatical cue\s*->\s*select form', re.I)

TUTOR_ID = re.compile(r'\b(yang|tidak|belum|bukan|karena|dengan|untuk|kalimat|bentuk|makna|jawaban|pilihan|ini|itu|dan|atau|harus|bisa|sudah|pada|dari|jadi|kata|waktu|agar|saat|lalu)\b', re.I)
TUTOR_EN = re.compile(r"\b(the|is|are|was|were|this|that|with|because|verb|noun|tense|sentence|answer|option|when|which|requires|implies|signals|does|doesn't|must|should)\b", re.I)

def tutor_rejects_id(v):
    # sama dengan tutorIndonesian() di app.js: ditolak kalau penanda Inggris >= 3 dan lebih banyak dari penanda Indonesia
    en, id_ = len(TUTOR_EN.findall(v)), len(TUTOR_ID.findall(v))
    return en >= 3 and en > id_

def thai_share(v):
    letters = re.findall(r'[A-Za-z\u0E00-\u0E7F]', v)
    return (len([c for c in letters if THAI.match(c)]) / len(letters)) if letters else 0.0

def load(path):
    spec = importlib.util.spec_from_file_location('src', path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def words(s):
    return len(re.findall(r"[A-Za-z']+", s))

def strip_quoted(s):
    return re.sub(r'“[^”]*”|\'[^\']*\'', '', s)

def build(mods, out_path, prefix_ok=None):
    problems, warns = [], []
    templates, new_labels, new_texts = [], {}, {}
    global reused
    reused = []
    existing_stems = {re.sub(r'\W+', ' ', t['stem'].lower()).strip(): t['id'] for t in BANK}
    seen_ids = set(BY_ID)
    for m in mods:
        for it in m.ITEMS:
            sid = it['id']
            def P(msg): problems.append(f'{sid}: {msg}')
            def W(msg): warns.append(f'{sid}: {msg}')
            if sid in seen_ids: P('ID ganda')
            seen_ids.add(sid)
            L = m.LESSONS[it['s']]
            first = FIRST.get(it['s'])
            if not first: P('subskill tidak dikenal'); continue
            stem, opts, ans = it['stem'], it['opts'], it['ans']
            if stem.count('___') != 1 or '____' in stem: P('stem harus punya tepat satu ___')
            if len(opts) != 4 or len(set(opts)) != 4: P('opsi harus 4 unik')
            # grammar-quality-audit & content-integrity-audit membandingkan opsi setelah tanda baca/apostrof dibuang
            if len({re.sub(r'[^a-z0-9]+', ' ', o.lower()).strip() for o in opts}) != len(opts): P('opsi bentrok setelah normalisasi audit (apostrof/tanda baca dibuang)')
            if ans not in opts: P('jawaban tidak ada di opsi')
            key = re.sub(r'\W+', ' ', stem.lower()).strip()
            if key in existing_stems: P('stem sama dengan ' + existing_stems[key])
            existing_stems[key] = sid
            lim = 11 if first['cefr'] == 'A1' else 14
            if words(stem) > lim: W(f'stem {words(stem)} kata (> {lim})')
            wrong = [o for o in opts if o != ans]
            dopts = [d[0] for d in it['d']]
            if sorted(dopts) != sorted(wrong): P(f'distraktor {dopts} != opsi salah {wrong}')
            lens = [len(o) for o in opts]
            if max(lens) > 2.2 * max(3, min(lens)) and max(lens) - min(lens) > 6: W(f'panjang opsi timpang {lens}')
            # teks
            en = {k: (L[k][0] if k in L else it[k][0]) for k in ('obj', 'mis', 'rule', 'avoid')}
            en.update({k: it[k][0] for k in ('why', 'others', 'cue', 'rsn')})
            id_ = {k: (L[k][1] if k in L else it[k][1]) for k in ('obj', 'mis', 'rule', 'avoid')}
            id_.update({k: it[k][1] for k in ('why', 'others', 'cue', 'rsn')})
            th = {k: (L[k][2] if k in L else it[k][2]) for k in ('obj', 'mis', 'rule', 'avoid')}
            th.update({k: it[k][2] for k in ('why', 'others', 'cue', 'rsn')})
            filled = stem.replace('___', ans)
            quoted = '“' in filled
            en['obj'] = f"{en['obj']} Example: {filled}"
            id_['obj'] = f"{id_['obj']} Contoh: {filled if quoted else '“' + filled + '”'}"
            th['obj'] = f"{th['obj']} ตัวอย่าง: {filled if quoted else chr(39) + filled + chr(39)}"
            if GENERIC.search(' '.join([en['rsn'], en['why'], en['rule'], en['others'], en['avoid'], en['cue']])): P('teks generik terlarang')
            steps_en = [s.strip() for s in en['rsn'].split('->')]
            steps_id = [s.strip() for s in re.split('→', id_['rsn'])]
            steps_th = [s.strip() for s in re.split('→', th['rsn'])]
            if len(steps_en) < 2: P('reasoning < 2 langkah')
            for s in steps_en:
                v = re.match(r"[a-z']+", s.lower())
                if not v or v.group(0) not in VERBS: P('langkah tanpa kata kerja kamus: ' + s)
            if not (len(steps_en) == len(steps_id) == len(steps_th)): P('jumlah langkah en/id/th beda')
            # kartu repair merangkai "Yang benar “X”: <whyCorrect>" - jangan ada titik dua kedua di ujungnya
            if re.search(r':\s*“[^”]+”\.?$', id_['why']) or re.search(r":\s*'[^']+'\s*$", th['why']): P('whyCorrect berakhir dengan titik dua + jawaban (kartu repair jadi dobel titik dua)')
            # tuntunan langkah tampil SEBELUM murid memilih lagi: langkah terakhir tidak boleh menyebut jawabannya
            kre_last = re.compile(r'(^|[^A-Za-z0-9])' + re.escape(ans.strip()) + r'($|[^A-Za-z0-9])', re.I)
            for lang, st in (('id', steps_id), ('th', steps_th)):
                if st and kre_last.search(st[-1]): P(f'langkah terakhir rsn {lang} menyebut jawabannya: {st[-1]}')
            for k, v in id_.items():
                if len(v) > (240 if k == 'obj' else 170): P(f'id.{k} {len(v)} karakter terlalu panjang')
                if BANNED_ID.search(strip_quoted(v)): P(f'id.{k} memuat istilah terlarang: {v}')
                if '"' in v: P(f'id.{k} memakai kutip lurus; pakai “…”')
                if k != 'obj' and tutor_rejects_id(v): P(f'id.{k} ditolak tutorIndonesian (penanda Inggris kebanyakan): {v}')
            for k, v in th.items():
                if k != 'obj' and re.search(r"'[^']*' '[^']*'", v): P(f'th.{k} dua kutipan Inggris berdempetan tanpa kata penyambung: {v}')
                letters = re.findall(r'[A-Za-z\u0E00-\u0E7F]', v)
                thai = [c for c in letters if THAI.match(c)]
                if not letters or len(thai) * 10 < len(letters) * 3: P(f'th.{k} Thai < 30%: {v}')
                elif len(thai) * 2 < len(letters): W(f'th.{k} Thai < 50% (tutor th melewatinya): {v}')
            dist_en, dist_id, dist_th = [], {}, {}
            for (opt, label, wen, wid, wth) in it['d']:
                if len(wid) > 170: P(f'whyFailsId {opt} > 170')
                if ALT_OK.search(wen): P(f'whyFails en {opt} mengakui jawaban lain sah (audit ambiguitas)')
                # panel merender '“opsi” <whyFails>' - teksnya harus predikat untuk opsi itu
                if re.match(r'\s*([“"\'\-]|sesudah\b|setelah\b|kalau\b|jika\b)', wid, re.I): P(f'whyFails id {opt} bukan predikat (panel: “{opt}” {wid})')
                if re.match(r"\s*(['\-]|หลัง|ถ้า)", wth): P(f'whyFails th {opt} bukan predikat (panel: \'{opt}\' {wth})')
                kre = re.compile(r'(^|[^A-Za-z0-9])' + re.escape(ans.strip()) + r'($|[^A-Za-z0-9])', re.I)
                if kre.search(wid) or kre.search(wth): P(f'whyFails {opt} menyebut kunci {ans!r} (mode justify membuangnya)')
                ore = re.compile(r'(^|[^A-Za-z0-9])' + re.escape(opt.strip()) + r'($|[^A-Za-z0-9])', re.I)
                if ore.search(wid): W(f'whyFails {opt} menyebut opsinya sendiri (petunjuk di mode diagnose): {wid}')
                if BANNED_ID.search(strip_quoted(wid)): P(f'whyFailsId {opt} istilah terlarang')
                letters = re.findall(r'[A-Za-z\u0E00-\u0E7F]', wth)
                tl = len([c for c in letters if THAI.match(c)])
                if not letters or tl * 2 < len(letters): P(f'whyFails th {opt} Thai < 50% (panel Thai jatuh ke kalimat umum): {wth}')
                if tutor_rejects_id(wid): P(f'whyFails id {opt} ditolak tutorIndonesian: {wid}')
                if ore_th := re.compile(r'(^|[^A-Za-z0-9])' + re.escape(opt.strip()) + r'($|[^A-Za-z0-9])', re.I).search(wth): W(f'whyFails th {opt} menyebut opsinya sendiri: {wth}')
                if isinstance(label, tuple):
                    len_, lid, lth = label[:3]
                    item_id, item_th = (label[3], label[4]) if len(label) == 5 else (lid, lth)
                    if re.match(r'^[A-Z]', lid): P(f'label baru id harus huruf kecil: {lid}')
                    if len_ in DIAG: reused.append((sid, opt, len_, DIAG[len_], lid))
                    if len_ not in DIAG:
                        prev = new_labels.get(len_)
                        if prev and (prev['id'] != lid or prev['th'] != lth): P(f'label baru {len_!r} ditulis dengan dua teks berbeda')
                        key = lid.lower().strip()
                        other = DIAG_TEXTS.get(key) or new_texts.get(key)
                        if other and other != len_: P(f'teks label {lid!r} sudah dipakai label {other!r}')
                        new_texts[key] = len_
                        if len(lid) < 25: P(f'teks label terlalu pendek (<25): {lid}')
                        if not lid.strip().endswith('.'): P(f'teks label tanpa titik akhir: {lid}')
                        if EN_MARKERS.search(re.sub(r"'[^']*'", '', lid)): P(f'teks label memuat kata penanda Inggris di luar kutip tunggal: {lid}')
                        if len_.lower() in lid.lower(): P(f'teks label mengutip nama Inggrisnya: {lid}')
                        if thai_share(lth) < 0.5: P(f'label th kurang Thai: {lth}')
                        new_labels[len_] = {'id': lid, 'th': lth}
                    mis_en, mis_id, mis_th = len_, item_id, item_th
                elif label.startswith('@'):
                    n = int(label[1:])
                    mis_en = mis_id = mis_th = f'@sibling:{n}'
                elif label.startswith('='):
                    tid, n = label[1:].split(':')
                    src = BY_ID[tid]['distractors'][int(n)]
                    mis_en = src['misconception']; mis_id = src.get('misconceptionId', '')
                    mis_th = TH[tid]['distractors'][src['option']]['misconception']
                else:
                    P('label tak dikenal ' + repr(label)); continue
                dist_en.append({'option': opt, 'misconception': mis_en, 'whyFails': wen})
                dist_id[opt] = {'misconception': mis_id, 'whyFails': wid}
                dist_th[opt] = {'misconception': mis_th, 'whyFails': wth}
            templates.append({
                'id': sid, 'family': first['family'], 'subskill': it['s'], 'cefr': first['cefr'], 'questionType': 'multiple_choice',
                'en': {'objective': en['obj'], 'misconception': en['mis'], 'reasoning': en['rsn'], 'stem': stem, 'options': opts,
                       'correctIndex': opts.index(ans) if ans in opts else -1, 'distractors': dist_en,
                       'explanation': {'whyCorrect': en['why'], 'rule': en['rule'], 'whyOthersFail': en['others'], 'howToAvoid': en['avoid'], 'memoryCue': en['cue']}},
                'id_': {'objective': id_['obj'], 'misconception': id_['mis'], 'reasoning': id_['rsn'], 'rule': id_['rule'], 'whyCorrect': id_['why'],
                        'whyOthersFail': id_['others'], 'howToAvoid': id_['avoid'], 'memoryCue': id_['cue'], 'distractors': dist_id},
                'th': {'objective': th['obj'], 'misconception': th['mis'], 'reasoning': th['rsn'], 'rule': th['rule'], 'whyCorrect': th['why'],
                       'whyOthersFail': th['others'], 'howToAvoid': th['avoid'], 'memoryCue': th['cue'], 'distractors': dist_th},
            })
    pack = {'schema': 'fiezel-grammar-new-templates-v1', 'newLabels': new_labels, 'templates': templates}
    # Thai: residu Indonesia + jejak kata-per-kata, memakai heuristik repo sendiri (th-purity-lexicon.js)
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump(pack, f, ensure_ascii=False)
    res = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'thcheck.js'), f.name],
                         capture_output=True, text=True, env=dict(os.environ, FZ_ROOT=ROOT))
    os.unlink(f.name)
    if res.returncode != 0: problems.append('thcheck gagal: ' + res.stderr[-400:])
    else:
        for x in json.loads(res.stdout or '[]'): problems.append('TH ' + x)
    # satu templat tidak boleh memakai label yang sama untuk dua distraktor (content-integrity-gate)
    for t in templates:
        labs = [d['misconception'] for d in t['en']['distractors']]
        if len(set(labs)) != len(labs): problems.append(f"{t['id']}: dua distraktor berbagi label {labs}")
    return pack, problems, warns

if __name__ == '__main__':
    out = sys.argv[1]
    mods = [load(p) for p in sys.argv[2:]]
    pack, problems, warns = build(mods, out)
    if os.environ.get('REUSED'):
        for r in reused: print('REUSE', r[0], r[1], '|', r[2], '| DIAG:', r[3], '| item:', r[4])
    for w in warns: print('WARN ', w)
    for p in problems: print('ERROR', p)
    print(f'{len(pack["templates"])} template, {len(pack["newLabels"])} label baru, {len(problems)} error, {len(warns)} peringatan')
    if not problems:
        json.dump(pack, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(out, 'a', encoding='utf-8').write('\n')
        print('ditulis', out)
    sys.exit(1 if problems else 0)
