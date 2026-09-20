import json

with open(r'c:\Users\hp\fiezel-apps\tools\chunk_ips_7_t2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Code:', data['code'])
print('Grade:', data['grade'])
print('Name:', data['name'])
print('Materi:', data['materi'])
print('cpRef:', data['cpRef'])
print('Items count:', len(data['items']))

forbidden = ['posisi', 'pilihan a', 'pilihan b', 'pilihan c', 'pilihan d', 'opsi a', 'opsi b', 'opsi c', 'opsi d', 'jawaban a', 'jawaban b', 'jawaban c', 'jawaban d', 'pilihan pertama', 'opsi pertama']
errors = []

diff_count = {}

for idx, item in enumerate(data['items']):
    d_level = item['difficulty']
    diff_count[d_level] = diff_count.get(d_level, 0) + 1
    
    if len(item['options']) != 4:
        errors.append(item['id'] + ': options count is not 4')
    if item['answer'] != 0:
        errors.append(item['id'] + ': answer is not 0')
    if list(item['why'].keys()) != ['0']:
        errors.append(item['id'] + ': why keys is not ["0"]')
    if set(item['distractorWhy'].keys()) != {'1', '2', '3'}:
        errors.append(item['id'] + ': distractorWhy keys mismatch')
    
    full_text = (item['prompt'] + ' ' + ' '.join(item['options']) + ' ' + item['why']['0'] + ' ' + ' '.join(item['distractorWhy'].values())).lower()
    for w in forbidden:
        if w in full_text:
            errors.append(item['id'] + ': contains forbidden word "' + w + '"')

print('Difficulty distribution:', diff_count)

if errors:
    print('ERRORS FOUND:')
    for e in errors:
        print(' -', e)
else:
    print('ALL VALIDATIONS PASSED SUCCESSFULY!')
