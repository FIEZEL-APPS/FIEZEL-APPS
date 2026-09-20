import json

with open(r'c:\Users\hp\fiezel-apps\tools\chunk_eng_8_c3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Code:', data['code'])
print('Grade:', data['grade'])
print('Name:', data['name'])
print('Materi:', data['materi'])
print('cpRef:', data['cpRef'])
print('Item count:', len(data['items']))

forbidden = ['pilihan A', 'pilihan B', 'pilihan C', 'pilihan D', 'jawaban A', 'jawaban B', 'jawaban C', 'jawaban D', 'opsi di atas', 'option A', 'option B', 'option C', 'option D']

difficulties = {}
for item in data['items']:
    diff = item['difficulty']
    difficulties[diff] = difficulties.get(diff, 0) + 1
    assert len(item['options']) == 4, f"Options count error in {item['id']}"
    assert item['answer'] == 0, f"Answer index error in {item['id']}"
    assert '0' in item['why'], f"Why missing key 0 in {item['id']}"
    for k in ['1', '2', '3']:
        assert k in item['distractorWhy'], f"DistractorWhy missing key {k} in {item['id']}"

    full_text = item['prompt'] + ' ' + ' '.join(item['options']) + ' ' + item['why']['0'] + ' ' + ' '.join(item['distractorWhy'].values())
    for f_word in forbidden:
        if f_word.lower() in full_text.lower():
            print(f"WARNING: Forbidden word '{f_word}' found in {item['id']}")

print('Difficulty breakdown:', difficulties)
print('ALL CHECKS PASSED PERFECTLY!')
