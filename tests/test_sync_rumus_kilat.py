import ast
import json
import os
import py_compile
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AUTHORING_DIR = os.path.join(ROOT, 'tools', 'dev', 'grammar-authoring')
if AUTHORING_DIR not in sys.path:
    sys.path.insert(0, AUTHORING_DIR)

from sync_rumus_kilat import (
    sync_rules,
    inspect_subskill,
    format_py_string_literal,
    compute_line_byte_offsets,
    get_node_byte_range,
    verify_syntax,
    list_source_files,
)


class TestSyncRumusKilat(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.sources_dir = os.path.join(self.temp_dir.name, 'sources')
        os.makedirs(self.sources_dir, exist_ok=True)

        # Mock source file mirroring format of a1_part2.py
        self.sample_code = '''# Test grammar source
LESSONS = {
    "have_got_has_got": dict(
        obj=("Use have got or has got to say what someone owns or has.",
             "Pakai “have got” atau “has got” untuk menyebut apa yang dimiliki seseorang.",
             "ใช้ 'have got' หรือ 'has got' เพื่อบอกว่าใครมีอะไร"),
        mis=("Learner uses 'have' for every subject, or builds questions and negatives with 'do', since 'punya' and 'มี' never change.",
             "Kamu pakai “have” untuk semua subjek, atau membuat kalimat tanya dan negatifnya dengan “do”, karena kata “punya” nggak pernah berubah.",
             "คุณใช้ 'have' กับทุกประธาน หรือสร้างคำถามและประโยคปฏิเสธด้วย 'do' เพราะคำว่า 'มี' ไม่เคยเปลี่ยนรูป"),
        rule=("I, you, we, they: have got. He, she, it: has got. Question: Have or Has + subject + got? Negative: haven't got, hasn't got.",
              "“I”, “you”, “we”, “they” pakai “have got”. “He”, “she”, “it” pakai “has got”.",
              "ประธาน 'I', 'you', 'we', 'they' ใช้ 'have got' ส่วน 'he', 'she', 'it' ใช้ 'has got'"),
        avoid=("Find the subject first: he, she, or it takes has; the others take have. Never add do.",
               "Cari subjeknya dulu: “he”, “she”, “it” pakai “has”, yang lain pakai “have”.",
               "หาประธานก่อน ถ้าเป็น 'he', 'she', 'it' ใช้ 'has'"),
    ),
}

ITEMS = [
    dict(s="have_got_has_got", id="A1-325",
         stem="My grandparents ___ got a big garden.", opts=["have", "has", "are", "do"], ans="have",
         why=("'My grandparents' are more than one person, like 'they', so we use 'have got'.",
              "“My grandparents” itu lebih dari satu orang, sama seperti “they”, jadi pakai “have got”.",
              "ปู่ย่าตายาย ('my grandparents') มีมากกว่าหนึ่งคน เหมือน 'they' จึงใช้ 'have got'"),
         others=("'Has' is only for he, she, or it.",
                 "“Has” cuma untuk “he”, “she”, atau “it”.",
                 "'has' ใช้กับ 'he', 'she', 'it' เท่านั้น"),
         cue=("They have got; he has got.", "“They have got”, tapi “he has got”.", "จำไว้ว่า"),
         rsn=("find the subject -> count one or more people",
              "cari subjeknya → hitung satu orang atau lebih",
              "หาประธาน → นับว่าคนเดียวหรือหลายคน"),
         d=[]),
]
'''
        self.sample_file = os.path.join(self.sources_dir, 'sample_part.py')
        with open(self.sample_file, 'w', encoding='utf-8') as f:
            f.write(self.sample_code)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_format_py_string_literal(self):
        text = '💡 <b>RUMUS KILAT</b>:<br>Pakai got ➡️ haven\'t / hasn\'t got'
        lit = format_py_string_literal(text)
        self.assertEqual(ast.literal_eval(lit), text)

    def test_sync_lesson_rule_update(self):
        new_rule = '“I”, “you”, “we”, “they” pakai “have got”.<br><br>💡 <b>RUMUS KILAT</b>:<br>Kalau ADA kata “got” ➡️ haven\'t / hasn\'t.'
        res = sync_rules({'have_got_has_got': new_rule}, sources_dir=self.sources_dir, dry_run=False)

        self.assertEqual(len(res['files_modified']), 1)
        self.assertEqual(len(res['edits_applied']), 1)

        # Syntax must compile cleanly
        py_compile.compile(self.sample_file, doraise=True)

        # Inspect updated file
        inspected = inspect_subskill('have_got_has_got', sources_dir=self.sources_dir)
        self.assertEqual(inspected['lesson']['rule'][1], new_rule)
        # en and th must remain unchanged
        self.assertTrue(inspected['lesson']['rule'][0].startswith('I, you, we, they: have got.'))
        self.assertTrue(inspected['lesson']['rule'][2].startswith("ประธาน 'I', 'you', 'we', 'they'"))

    def test_sync_item_why_update(self):
        new_why = '“My grandparents” itu jamak, jadi wajib have got!'
        res = sync_rules({'A1-325': {'why': new_why}}, sources_dir=self.sources_dir, dry_run=False)

        self.assertEqual(len(res['files_modified']), 1)
        py_compile.compile(self.sample_file, doraise=True)

        with open(self.sample_file, 'rb') as f:
            content = f.read()
        tree = ast.parse(content)
        found_why = None
        for node in ast.walk(tree):
            if isinstance(node, ast.keyword) and node.arg == 'why':
                found_why = node.value.elts[1].value
        self.assertEqual(found_why, new_why)

    def test_dry_run_does_not_modify_file(self):
        with open(self.sample_file, 'rb') as f:
            before_bytes = f.read()

        new_rule = 'Perubahan dummy'
        res = sync_rules({'have_got_has_got': new_rule}, sources_dir=self.sources_dir, dry_run=True)
        self.assertEqual(len(res['files_modified']), 1)

        with open(self.sample_file, 'rb') as f:
            after_bytes = f.read()
        self.assertEqual(before_bytes, after_bytes)


if __name__ == '__main__':
    unittest.main()
