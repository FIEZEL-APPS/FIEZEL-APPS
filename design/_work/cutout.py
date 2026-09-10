import sys, os
from PIL import Image
from rembg import remove, new_session
sess = new_session("isnet-general-use")
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not (f.startswith(('nusa_','mira_','team_')) and f.endswith('.jpg')): continue
    im = Image.open(os.path.join(src,f)).convert('RGB')
    res = remove(im, session=sess, alpha_matting=False, post_process_mask=True)
    bbox = res.getbbox()
    if bbox: res = res.crop(bbox)
    res.save(os.path.join(out, f[:-4]+'.png'))
    print('ok', f, res.size)
