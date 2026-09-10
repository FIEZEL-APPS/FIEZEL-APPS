"""Render pose Nusa untuk intro (onboarding + login) memakai aset PR#399 sebagai acuan.

Jalankan: /root/.venv/bin/python tools/dev/generate-nusa-scenes.py
Hasil: assets/characters/scenes/intro/<nama>.png (latar hijau di-key -> transparan).
"""
import asyncio, base64, io, os, sys
import numpy as np
from PIL import Image
from dotenv import load_dotenv

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
load_dotenv(os.path.join(ROOT, 'backend', '.env'))
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent  # noqa: E402

CH = os.path.join(ROOT, 'assets', 'characters')
OUT = os.path.join(CH, 'scenes', 'intro')
os.makedirs(OUT, exist_ok=True)

STYLE = ("Flat 2D vector storybook illustration, clean smooth shapes, soft cel shading, crisp edges, "
         "exactly the same character as the reference images: Nusa, a small golden-brown cartoon monkey with "
         "a round head, cream muzzle and belly, big amber eyes with white highlights, small dark eyebrows, "
         "a maroon (dark red) bandana around the neck with a cream paw-print, a brown leather crossbody satchel, "
         "long curly tail. Keep proportions, colours and outfit IDENTICAL to the reference. "
         "Anatomy must be correct: exactly two arms, two hands with five fingers each, two eyes, one tail. "
         "No text, no letters, no watermark, no signature. Background must be a completely flat, uniform, "
         "pure bright green (#00FF00) with no gradient, no shadow, no floor, and nothing green in the character or props.")

SCENES = {
    'login-wave': ("Close-up of Nusa from the waist up, filling the frame, leaning slightly toward the viewer, "
                   "big happy open-mouth smile, right hand raised waving hello with an open palm, left hand "
                   "holding the strap of the satchel. Small floating props around him: an open notebook with "
                   "blank lines, and a blank rounded speech bubble. Portrait composition 3:4."),
    'slide-learn': ("Nusa standing, holding a big open book with both hands and reading it with a delighted "
                    "expression, three wooden alphabet blocks (blank faces, no letters) stacked next to him. "
                    "Square composition, character centred, full body visible."),
    'slide-listen': ("Nusa sitting cross-legged wearing big cream over-ear headphones, eyes closed, gentle smile, "
                     "one hand raised with index finger up as if listening carefully, three soft blank "
                     "music-note shapes and a blank speech bubble floating beside him. Square composition."),
    'slide-level': ("Nusa jumping joyfully with both arms up, holding a golden trophy cup in one hand, "
                    "confetti pieces in soft pastel yellow, coral and blue around him (no green confetti), "
                    "a small blank rosette badge floating. Square composition, full body visible."),
}


def b64(path):
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    buf = io.BytesIO(); bg.convert('RGB').save(buf, 'JPEG', quality=92)
    return base64.b64encode(buf.getvalue()).decode()


def key_green(im):
    a = np.array(im.convert('RGBA')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # hijau chroma: g dominan jauh di atas r & b
    green = (g > 120) & (g - r > 60) & (g - b > 60)
    alpha = np.where(green, 0, 255).astype(np.uint8)
    # tepi: piksel non-hijau yang bersebelahan dengan hijau dibuat semi (anti-alias) + hilangkan bocoran hijau
    from scipy.ndimage import binary_dilation, binary_erosion
    edge = binary_dilation(green, iterations=1) & ~green
    a[..., 3] = alpha
    a[edge, 3] = 200
    spill = edge & (g > r) & (g > b)
    m = np.maximum(a[..., 0], a[..., 2])
    a[spill, 1] = np.minimum(a[spill, 1], m[spill])
    out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    bbox = out.getchannel('A').getbbox()
    return out.crop(bbox) if bbox else out


async def render(name, prompt, refs):
    chat = LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id='nusa-' + name,
                   system_message='You are a senior character illustrator who keeps a mascot perfectly on-model.')
    chat.with_model('gemini', 'gemini-3.1-flash-image-preview').with_params(modalities=['image', 'text'])
    msg = UserMessage(text=STYLE + ' ' + prompt, file_contents=[ImageContent(x) for x in refs])
    for attempt in range(3):
        try:
            text, images = await chat.send_message_multimodal_response(msg)
            if images:
                raw = Image.open(io.BytesIO(base64.b64decode(images[0]['data'])))
                raw.convert('RGB').save(os.path.join(OUT, name + '.raw.jpg'), quality=90)
                key_green(raw).save(os.path.join(OUT, name + '.png'), optimize=True)
                print('ok', name, raw.size); return
            print('no image', name, (text or '')[:80])
        except Exception as e:
            print('retry', name, attempt, str(e)[:120])
    print('FAILED', name)


async def main():
    refs = [b64(os.path.join(CH, '_reference', 'nusa-sheet.jpg')),
            b64(os.path.join(CH, 'nusa', 'png', 'full-wave.png')),
            b64(os.path.join(CH, 'nusa', 'png', 'head-happy.png'))]
    names = sys.argv[1:] or list(SCENES)
    await asyncio.gather(*(render(n, SCENES[n], refs) for n in names))


if __name__ == '__main__':
    asyncio.run(main())
