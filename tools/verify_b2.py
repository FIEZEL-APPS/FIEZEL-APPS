import json

with open(r'c:\Users\hp\fiezel-apps\tools\chunk_ind_7_b2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('=== VALIDATION REPORT ===')
print('Code:', data.get('code'))
print('Grade:', data.get('grade'))
print('Name:', data.get('name'))
print('Materi:', data.get('materi'))
print('cpRef:', data.get('cpRef'))
print('Total Items:', len(data['items']))

diffs = [it['difficulty'] for it in data['items']]
print('Difficulty counts:', {d: diffs.count(d) for d in set(diffs)})

forbidden_terms = ['pilihan a', 'pilihan b', 'pilihan c', 'pilihan d', 'opsi a', 'opsi b', 'opsi c', 'opsi d', 'jawaban a', 'jawaban b', 'jawaban c', 'jawaban d', 'opsi di atas', 'pilihan di atas', 'jawaban di atas']

clean = True
for idx, item in enumerate(data['items']):
    req_keys = ['id', 'difficulty', 'prompt', 'options', 'answer', 'why', 'distractorWhy']
    for k in req_keys:
        if k not in item:
            print(f'Item {idx} missing key {k}')
            clean = False
    if len(item['options']) != 4:
        print(f'Item {idx} does not have exactly 4 options')
        clean = False
    if item['answer'] != 0:
        print(f'Item {idx} answer index is not 0')
        clean = False
    if '0' not in item['why']:
        print(f'Item {idx} why missing key "0"')
        clean = False
    
    item_str = json.dumps(item, ensure_ascii=False).lower()
    for term in forbidden_terms:
        if term in item_str:
            print(f'Item {item["id"]} contains forbidden term: "{term}"')
            clean = False

if clean:
    print('ALL VERIFICATIONS PASSED 100%!')
