#!/usr/bin/env python3
"""
sync_rumus_kilat.py — Utilitas Sinkronisasi Aturan Bahasa Indonesia & Rumus Kilat
ke Berkas Sumber Python Grammar Authoring (tools/dev/grammar-authoring/sources/).

KENAPA ALAT INI DIBUTUHKAN:
  Berkas sumber di `sources/` (a1_part1.py, a1_part2.py, dst) adalah single source of
  truth bagi paket grammar (`new-templates-<x>.json`) yang dibangun oleh `build_pack.py`.
  Aturan penjelasan bahasa Indonesia disimpan di dalam tuple 3-bahasa:
    - Di LESSONS: dict(obj=(en, id, th), mis=(en, id, th), rule=(en, id, th), avoid=(en, id, th))
    - Di ITEMS: dict(why=(en, id, th), others=(en, id, th), cue=(en, id, th), rsn=(en, id, th), d=[...])

  Skrip ini memperbarui teks bahasa Indonesia (`id`, index ke-1 dari tuple) secara presisi
  menggunakan analisis AST (Abstract Syntax Tree) dan pemotongan byte-level UTF-8 langsung
  di berkas sumber Python, TANPA:
    1. Merusak sintaks tuple (en, id, th)
    2. Merusak karakter UTF-8 multi-byte (tanda kutip lengkung “...”, huruf Thai, emoji 💡, panah ➡️)
    3. Merusak indentasi, komentar, atau pemformatan sekitarnya.

CARA PAKAI (CLI):
  # 1. Update satu skill langsung dari CLI:
  python tools/dev/grammar-authoring/sync_rumus_kilat.py --skill have_got_has_got --rule "Teks aturan baru..."

  # 2. Update dari file kamus JSON:
  python tools/dev/grammar-authoring/sync_rumus_kilat.py updates.json

  # 3. Dry-run untuk melihat rencana perubahan tanpa menulis ke disk:
  python tools/dev/grammar-authoring/sync_rumus_kilat.py updates.json --dry-run

  # 4. Verifikasi sintaks semua file sumber:
  python tools/dev/grammar-authoring/sync_rumus_kilat.py --verify-all

  # 5. Inspeksi isi saat ini dari suatu skill:
  python tools/dev/grammar-authoring/sync_rumus_kilat.py --inspect have_got_has_got
"""

import argparse
import ast
import glob
import json
import os
import py_compile
import sys
import tempfile
from typing import Any, Dict, List, Optional, Tuple

# Pastikan stdout/stderr mendukung UTF-8 di Windows Console
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SOURCES_DIR = os.path.join(SCRIPT_DIR, 'sources')


def get_sources_dir(custom_path: Optional[str] = None) -> str:
    """Mengembalikan direktori sumber Python grammar authoring."""
    if custom_path:
        return os.path.abspath(custom_path)
    return DEFAULT_SOURCES_DIR


def list_source_files(sources_dir: Optional[str] = None) -> List[str]:
    """Mengembalikan daftar semua berkas .py di direktori sources."""
    sdir = get_sources_dir(sources_dir)
    pattern = os.path.join(sdir, '*.py')
    files = sorted(glob.glob(pattern))
    if not files:
        raise FileNotFoundError(f"Tidak ada berkas Python ditemukan di {sdir}")
    return files


def format_py_string_literal(text: str) -> str:
    """
    Format string sebagai literal Python yang aman dan valid UTF-8.
    json.dumps(..., ensure_ascii=False) menghasilkan string double-quoted yang
    menge-escape karakter khusus (" -> \", newline -> \n, backslash -> \\)
    tetapi mempertahankan karakter UTF-8 (seperti “...”, huruf Thai, 💡, ➡️).
    """
    return json.dumps(text, ensure_ascii=False)


def compute_line_byte_offsets(content_bytes: bytes) -> List[int]:
    """Menghitung byte offset awal setiap baris (0-indexed)."""
    offsets = []
    curr = 0
    for line in content_bytes.splitlines(keepends=True):
        offsets.append(curr)
        curr += len(line)
    return offsets


def get_node_byte_range(line_offsets: List[int], node: ast.AST) -> Tuple[int, int]:
    """Menghitung range byte global [start_byte, end_byte) untuk sebuah AST node."""
    start_byte = line_offsets[node.lineno - 1] + node.col_offset
    end_byte = line_offsets[node.end_lineno - 1] + node.end_col_offset
    return start_byte, end_byte


def verify_syntax(file_path: str, content_bytes: Optional[bytes] = None) -> None:
    """Memverifikasi sintaks Python dengan ast.parse dan py_compile."""
    if content_bytes is not None:
        ast.parse(content_bytes, filename=file_path)
        with tempfile.NamedTemporaryFile('wb', suffix='.py', delete=False) as tmp:
            tmp.write(content_bytes)
            tmp_name = tmp.name
        try:
            py_compile.compile(tmp_name, doraise=True)
        finally:
            if os.path.exists(tmp_name):
                os.unlink(tmp_name)
    else:
        with open(file_path, 'rb') as f:
            raw = f.read()
        ast.parse(raw, filename=file_path)
        py_compile.compile(file_path, doraise=True)


def verify_all_sources(sources_dir: Optional[str] = None) -> bool:
    """Verifikasi sintaks seluruh berkas Python di sources/."""
    files = list_source_files(sources_dir)
    print(f"Memverifikasi sintaks {len(files)} berkas di {get_sources_dir(sources_dir)}...")
    all_ok = True
    for fp in files:
        try:
            verify_syntax(fp)
            print(f"  [OK] {os.path.basename(fp)}")
        except Exception as e:
            print(f"  [FAIL] {os.path.basename(fp)}: {e}")
            all_ok = False
    return all_ok


def inspect_subskill(subskill: str, sources_dir: Optional[str] = None) -> Dict[str, Any]:
    """Mengambil informasi detail LESSON dan ITEMS untuk suatu subskill."""
    files = list_source_files(sources_dir)
    result = {'subskill': subskill, 'file': None, 'lesson': None, 'items': []}

    for fp in files:
        with open(fp, 'rb') as f:
            content = f.read()
        tree = ast.parse(content, filename=fp)

        # Cari di LESSONS
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'LESSONS':
                        for k, v in zip(node.value.keys, node.value.values):
                            k_val = k.value if isinstance(k, ast.Constant) else getattr(k, 's', None)
                            if k_val == subskill:
                                result['file'] = fp
                                lesson_fields = {}
                                for kw in v.keywords:
                                    if isinstance(kw.value, ast.Tuple):
                                        tup_vals = []
                                        for elt in kw.value.elts:
                                            if isinstance(elt, ast.Constant):
                                                tup_vals.append(elt.value)
                                            else:
                                                tup_vals.append(ast.unparse(elt))
                                        lesson_fields[kw.arg] = tup_vals
                                result['lesson'] = lesson_fields

        # Cari di ITEMS
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'ITEMS':
                        for elt in node.value.elts:
                            item_sub = None
                            item_id = None
                            for kw in elt.keywords:
                                if kw.arg == 's':
                                    item_sub = kw.value.value if isinstance(kw.value, ast.Constant) else getattr(kw.value, 's', None)
                                elif kw.arg == 'id':
                                    item_id = kw.value.value if isinstance(kw.value, ast.Constant) else getattr(kw.value, 's', None)
                            if item_sub == subskill:
                                result['items'].append(item_id)

        if result['file']:
            break

    return result


def collect_target_edits(
    content_bytes: bytes,
    file_path: str,
    lesson_updates: Dict[str, Dict[str, str]],
    item_updates: Dict[str, Dict[str, str]]
) -> List[Dict[str, Any]]:
    """
    Menganalisis AST file dan mengumpulkan rencana edit byte-level.
    lesson_updates: {subskill: {field_name: new_indonesian_text}}
    item_updates: {item_id: {field_name: new_indonesian_text}}
    """
    tree = ast.parse(content_bytes, filename=file_path)
    line_offsets = compute_line_byte_offsets(content_bytes)
    edits = []

    # 1. Edit LESSONS
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'LESSONS':
                    for k, v in zip(node.value.keys, node.value.values):
                        subskill = k.value if isinstance(k, ast.Constant) else getattr(k, 's', None)
                        if subskill in lesson_updates:
                            updates_for_skill = lesson_updates[subskill]
                            for kw in v.keywords:
                                field_name = kw.arg
                                if field_name in updates_for_skill:
                                    new_val = updates_for_skill[field_name]
                                    tup = kw.value
                                    if not isinstance(tup, ast.Tuple) or len(tup.elts) < 2:
                                        continue
                                    id_node = tup.elts[1]  # index 1 = Bahasa Indonesia (en, id, th)
                                    start, end = get_node_byte_range(line_offsets, id_node)
                                    old_val = id_node.value if isinstance(id_node, ast.Constant) else None
                                    edits.append({
                                        'type': 'lesson',
                                        'subskill': subskill,
                                        'field': field_name,
                                        'start': start,
                                        'end': end,
                                        'old_val': old_val,
                                        'new_val': new_val,
                                        'replacement_bytes': format_py_string_literal(new_val).encode('utf-8')
                                    })

    # 2. Edit ITEMS
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == 'ITEMS':
                    for elt in node.value.elts:
                        item_id = None
                        for kw in elt.keywords:
                            if kw.arg == 'id':
                                item_id = kw.value.value if isinstance(kw.value, ast.Constant) else getattr(kw.value, 's', None)
                        if item_id and item_id in item_updates:
                            updates_for_item = item_updates[item_id]
                            for kw in elt.keywords:
                                field_name = kw.arg
                                if field_name in updates_for_item:
                                    new_val = updates_for_item[field_name]
                                    tup = kw.value
                                    if not isinstance(tup, ast.Tuple) or len(tup.elts) < 2:
                                        continue
                                    id_node = tup.elts[1]  # index 1 = Bahasa Indonesia
                                    start, end = get_node_byte_range(line_offsets, id_node)
                                    old_val = id_node.value if isinstance(id_node, ast.Constant) else None
                                    edits.append({
                                        'type': 'item',
                                        'item_id': item_id,
                                        'field': field_name,
                                        'start': start,
                                        'end': end,
                                        'old_val': old_val,
                                        'new_val': new_val,
                                        'replacement_bytes': format_py_string_literal(new_val).encode('utf-8')
                                    })

    return edits


def apply_edits_to_content(content_bytes: bytes, edits: List[Dict[str, Any]]) -> bytes:
    """
    Menerapkan daftar edit ke content_bytes.
    Edits diurutkan menurun berdasarkan byte start (reverse order), sehingga
    perubahan di baris/byte belakang tidak menggeser offset byte depan.
    """
    # Urutkan mundur dari offset terbesar ke terkecil
    sorted_edits = sorted(edits, key=lambda e: e['start'], reverse=True)
    buffer = bytearray(content_bytes)

    for e in sorted_edits:
        start, end = e['start'], e['end']
        repl = e['replacement_bytes']
        buffer[start:end] = repl

    return bytes(buffer)


def sync_rules(
    updates: Any,
    sources_dir: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Memperbarui aturan bahasa Indonesia di berkas-berkas sumber Python.

    Format `updates` yang didukung:
      1. Dict sederhana {subskill: "aturan baru...", ...}
      2. Dict dengan field eksplisit {subskill: {"rule": "aturan baru...", ...}, ...}
      3. Dict dengan item IDs {"A1-325": {"why": "..."}, ...}
      4. List objek [ {"concepts": ["have_got_has_got"], "newRule": "..."}, ... ]
    """
    sdir = get_sources_dir(sources_dir)
    files = list_source_files(sdir)

    # Normalisasi format input menjadi lesson_updates dan item_updates
    lesson_updates: Dict[str, Dict[str, str]] = {}
    item_updates: Dict[str, Dict[str, str]] = {}

    if isinstance(updates, list):
        for entry in updates:
            if not isinstance(entry, dict):
                continue
            concepts = entry.get('concepts') or entry.get('subskills') or []
            if isinstance(concepts, str):
                concepts = [concepts]
            new_rule = entry.get('newRule') or entry.get('rule') or entry.get('ruleId')
            if new_rule and concepts:
                for c in concepts:
                    lesson_updates.setdefault(c, {})['rule'] = str(new_rule)
    elif isinstance(updates, dict):
        for k, v in updates.items():
            if isinstance(v, str):
                # Default: k adalah subskill, v adalah new rule
                lesson_updates.setdefault(k, {})['rule'] = v
            elif isinstance(v, dict):
                # k bisa berupa subskill atau itemId
                if any(k.startswith(prefix) for prefix in ('A1-', 'A2-', 'B1-', 'B2-', 'PS-')):
                    item_updates[k] = {str(fk): str(fv) for fk, fv in v.items()}
                else:
                    lesson_updates[k] = {str(fk): str(fv) for fk, fv in v.items()}
            else:
                continue

    summary = {
        'total_files_examined': len(files),
        'files_modified': [],
        'edits_applied': [],
        'dry_run': dry_run,
        'success': True
    }

    for fp in files:
        with open(fp, 'rb') as f:
            content_bytes = f.read()

        edits = collect_target_edits(content_bytes, fp, lesson_updates, item_updates)
        if not edits:
            continue

        fname = os.path.basename(fp)
        for e in edits:
            desc = f"{fname}: [{e['type']}] {e.get('subskill') or e.get('item_id')}.{e['field']}"
            summary['edits_applied'].append({
                'file': fname,
                'target': e.get('subskill') or e.get('item_id'),
                'field': e['field'],
                'old_preview': (e['old_val'][:60] + '...') if e['old_val'] and len(e['old_val']) > 60 else e['old_val'],
                'new_preview': (e['new_val'][:60] + '...') if len(e['new_val']) > 60 else e['new_val'],
            })

        new_bytes = apply_edits_to_content(content_bytes, edits)

        # Verifikasi sintaks sebelum menulis ke disk
        try:
            verify_syntax(fp, new_bytes)
        except Exception as err:
            summary['success'] = False
            raise RuntimeError(f"Gagal memverifikasi sintaks hasil edit untuk {fname}: {err}") from err

        if not dry_run:
            with open(fp, 'wb') as f:
                f.write(new_bytes)
            # Re-compile verifikasi akhir file asli
            py_compile.compile(fp, doraise=True)

        summary['files_modified'].append(fname)

    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Sinkronisasi Aturan Bahasa Indonesia & Rumus Kilat ke Python Grammar Sources"
    )
    parser.add_argument('json_file', nargs='?', default=None, help='Path ke file JSON berisi kamus updates')
    parser.add_argument('-f', '--file', dest='explicit_file', help='Path ke file JSON berisi kamus updates')
    parser.add_argument('--skill', help='Nama subskill (misal: have_got_has_got)')
    parser.add_argument('--rule', help='Teks aturan bahasa Indonesia baru (Rumus Kilat)')
    parser.add_argument('--field', default='rule', help='Field yang diupdate di LESSONS (default: rule)')
    parser.add_argument('--item', help='Item ID di ITEMS (misal: A1-325)')
    parser.add_argument('--why', help='Teks why baru untuk item')
    parser.add_argument('--sources-dir', help='Path alternatif ke direktori sources/')
    parser.add_argument('--dry-run', action='store_true', help='Preview perubahan tanpa menulis ke berkas')
    parser.add_argument('--verify-all', action='store_true', help='Verifikasi sintaks seluruh berkas di sources/')
    parser.add_argument('--inspect', help='Inspeksi detail subskill tertentu')
    parser.add_argument('--list-skills', action='store_true', help='Tampilkan daftar semua 46 skill')

    args = parser.parse_args()

    target_json = args.explicit_file or (args.json_file if args.json_file and (args.json_file.endswith('.json') or os.path.exists(args.json_file)) else None)

    if args.verify_all:
        ok = verify_all_sources(args.sources_dir)
        sys.exit(0 if ok else 1)

    if args.inspect:
        data = inspect_subskill(args.inspect, args.sources_dir)
        if not data['file']:
            print(f"Subskill '{args.inspect}' tidak ditemukan.")
            sys.exit(1)
        print(f"Subskill: {data['subskill']}")
        print(f"Berkas  : {os.path.basename(data['file'])}")
        print("Lesson  :")
        for k, v in (data['lesson'] or {}).items():
            print(f"  {k}:")
            for idx, lang in enumerate(('en', 'id', 'th')):
                val = v[idx] if idx < len(v) else ''
                preview = (val[:80] + '...') if len(val) > 80 else val
                print(f"    [{lang}] {preview}")
        print(f"Items   : {', '.join(data['items'])}")
        sys.exit(0)

    if args.list_skills:
        files = list_source_files(args.sources_dir)
        count = 0
        for fp in files:
            print(f"--- {os.path.basename(fp)} ---")
            with open(fp, 'rb') as f:
                tree = ast.parse(f.read())
            for node in tree.body:
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and target.id == 'LESSONS':
                            for k in node.value.keys:
                                sub = k.value if isinstance(k, ast.Constant) else getattr(k, 's', '')
                                count += 1
                                print(f"  {count}. {sub}")
        print(f"Total: {count} skills.")
        sys.exit(0)

    # Bangun updates dict dari argumen CLI atau file JSON
    updates: Dict[str, Any] = {}

    if target_json:
        if not os.path.exists(target_json):
            print(f"Error: Berkas JSON '{target_json}' tidak ditemukan.")
            sys.exit(1)
        with open(target_json, 'r', encoding='utf-8') as f:
            updates = json.load(f)
    elif args.skill and args.rule:
        updates = {args.skill: {args.field: args.rule}}
    elif args.item and args.why:
        updates = {args.item: {'why': args.why}}
    else:
        parser.print_help()
        sys.exit(0)

    res = sync_rules(updates, sources_dir=args.sources_dir, dry_run=args.dry_run)

    mode_str = "[DRY-RUN] " if args.dry_run else ""
    print(f"{mode_str}Hasil Sinkronisasi:")
    print(f"  Berkas dimodifikasi: {len(res['files_modified'])} ({', '.join(res['files_modified']) or 'tidak ada'})")
    print(f"  Total edit          : {len(res['edits_applied'])}")
    for e in res['edits_applied']:
        print(f"    * {e['file']} -> {e['target']}.{e['field']}")
        print(f"        Lama : {e['old_preview']}")
        print(f"        Baru : {e['new_preview']}")

    sys.exit(0 if res['success'] else 1)


if __name__ == '__main__':
    main()
