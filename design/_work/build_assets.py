import os, json, hashlib, shutil
from PIL import Image
import vtracer

ROOT = '/app/assets/characters'
CUT = '/app/design/_work/cut'
GEN = '/app/design/_work/gen'

MAP = {
    'nusa': ['nusa_full_neutral','nusa_full_wave','nusa_full_celebrate','nusa_full_thinking','nusa_full_oops','nusa_full_sleep',
             'nusa_head_happy','nusa_head_curious','nusa_head_thinking','nusa_head_oops'],
    'mira': ['mira_full_neutral','mira_full_wave','mira_full_explain','mira_full_cheer','mira_full_thinking',
             'mira_head_happy','mira_head_explain','mira_head_proud','mira_head_thinking'],
    'team': ['team_shoulder_wave','team_highfive','team_teaching','team_hat_peek','team_walking'],
}
SCENES = ['scene_hero_landing','scene_onboarding','scene_celebration','scene_empty_offline']
REFS = ['ref_nusa_sheet','ref_mira_sheet','ref_nusa_scene','ref_mira_scene']

def slug(n):
    return n.split('_',1)[1].replace('_','-') if not n.startswith(('scene','ref')) else n.split('_',1)[1].replace('_','-')

manifest = {'version': 1, 'style': 'storybook-flat', 'characters': {}, 'scenes': {}, 'refs': {}}

for ch, names in MAP.items():
    for sub in ('png','png@1x','webp','svg'):
        os.makedirs(f'{ROOT}/{ch}/{sub}', exist_ok=True)
    for n in names:
        s = slug(n)
        im = Image.open(f'{CUT}/{n}.png').convert('RGBA')
        p2x = f'{ROOT}/{ch}/png/{s}.png'; im.save(p2x, optimize=True)
        im1 = im.copy(); im1.thumbnail((im.width//2, im.height//2))
        im1.save(f'{ROOT}/{ch}/png@1x/{s}.png', optimize=True)
        im.save(f'{ROOT}/{ch}/webp/{s}.webp', quality=88, method=6)
        svg_path = f'{ROOT}/{ch}/svg/{s}.svg'
        vtracer.convert_image_to_svg_py(p2x, svg_path, colormode='color', hierarchical='stacked', mode='spline',
                                        filter_speckle=8, color_precision=6, layer_difference=24,
                                        corner_threshold=60, length_threshold=4.0, max_iterations=10,
                                        splice_threshold=45, path_precision=2)
        manifest['characters'].setdefault(ch, {})[s] = {
            'w': im.width, 'h': im.height,
            'png': f'assets/characters/{ch}/png/{s}.png',
            'png1x': f'assets/characters/{ch}/png@1x/{s}.png',
            'webp': f'assets/characters/{ch}/webp/{s}.webp',
            'svg': f'assets/characters/{ch}/svg/{s}.svg',
        }
        print('built', ch, s, im.size, os.path.getsize(svg_path)//1024, 'KB svg')

for sub in ('jpg','webp'):
    os.makedirs(f'{ROOT}/scenes/{sub}', exist_ok=True)
for n in SCENES:
    s = slug(n)
    im = Image.open(f'{GEN}/{n}.jpg').convert('RGB')
    im.save(f'{ROOT}/scenes/jpg/{s}.jpg', quality=90, optimize=True)
    im.save(f'{ROOT}/scenes/webp/{s}.webp', quality=86, method=6)
    manifest['scenes'][s] = {'w': im.width, 'h': im.height,
                             'jpg': f'assets/characters/scenes/jpg/{s}.jpg',
                             'webp': f'assets/characters/scenes/webp/{s}.webp'}
    print('scene', s, im.size)

os.makedirs(f'{ROOT}/_reference', exist_ok=True)
for n in REFS:
    s = slug(n)
    shutil.copy(f'{GEN}/{n}.jpg', f'{ROOT}/_reference/{s}.jpg')
    manifest['refs'][s] = f'assets/characters/_reference/{s}.jpg'

json.dump(manifest, open(f'{ROOT}/manifest.json','w'), indent=2)
print('manifest ok')
