import json
import re

path = r'c:\Users\hp\fiezel-apps\tools\chunk_eng_8_c1.json'
with open(path, encoding='utf-8') as f:
    data = json.load(f)

assert data['code'] == 'KOMP-ENG-D-8-BAB1-01'
assert data['grade'] == 8
assert data['name'] == 'Chapter 1: Celebrating Independence Day'
assert data['materi'] == 'Describing Past Independence Day Events, Recount Text Structure, Simple Past Tense (Regular & Irregular Verbs), Past Time Connectors'
assert data['cpRef'] == 'English for Nusantara untuk SMP/MTs Kelas VIII'

items = data['items']
assert len(items) == 20, f'Expected 20 items, got {len(items)}'

forbidden_patterns = [
    r'pilihan\s+[a-d0-3]', r'opsi\s+[a-d0-3]', r'jawaban\s+[a-d0-3]',
    r'opsi\s+di\s+atas', r'pilihan\s+di\s+atas', r'jawaban\s+di\s+atas',
    r'opsi\s+pertama', r'pilihan\s+pertama', r'jawaban\s+pertama'
]

diff_counts = {}

for idx, item in enumerate(items):
    expected_id = f'eng-d-8-c1-q{idx+1:02d}'
    assert item['id'] == expected_id, f'Item id mismatch: {item["id"]} vs {expected_id}'
    assert item['difficulty'] in ['dasar', 'sedang', 'tinggi'], f'Invalid diff: {item["difficulty"]}'
    diff_counts[item['difficulty']] = diff_counts.get(item['difficulty'], 0) + 1
    
    assert len(item['options']) == 4, f'Options count error in {item["id"]}'
    assert len(set(item['options'])) == 4, f'Duplicate options in {item["id"]}'
    assert item['answer'] == 0, f'Answer must be 0 in {item["id"]}'
    assert '0' in item['why'], f'Missing why[0] in {item["id"]}'
    for k in ['1', '2', '3']:
        assert k in item['distractorWhy'], f'Missing distractorWhy[{k}] in {item["id"]}'
        
    full_str = json.dumps(item, ensure_ascii=False).lower()
    for pat in forbidden_patterns:
        match = re.search(pat, full_str)
        assert not match, f'Forbidden pattern "{pat}" matched in {item["id"]}: {match.group(0)}'

print('All validation checks passed successfully!')
print('Difficulty distribution:', diff_counts)
