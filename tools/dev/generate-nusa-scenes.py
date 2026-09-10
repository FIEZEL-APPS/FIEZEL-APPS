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

FLAT_STYLE = ("Corporate flat mascot illustration in the style of modern SaaS / productivity-app brand art: bold, uniform, "
              "thick dark-brown outlines on every shape, completely flat fill colours, minimal cel shading (one flat shadow tone per colour), "
              "a few small white glossy highlight shapes, simple geometric forms, no gradients, no texture, no 3D render look. "
              "The character is Nusa exactly as in the reference images (golden-brown cartoon monkey, round head, cream muzzle and belly, "
              "big amber eyes, maroon bandana with a cream paw-print, brown crossbody satchel, curly tail) but RE-DRAWN in this flat thick-outline style. "
              "Anatomy correct: two eyes, one nose, five fingers on the visible hand. No text, letters, watermark or signature.")

FLAT_SCENES = {
    'login-flat': ("Composition copied from a SaaS login-page hero card: portrait 3:4, the whole image is one flat pastel pink background (#FFE1DC). "
                   "Nusa is an EXTREME close-up, cropped by the frame: only the top of his head to his upper chest is visible in the lower-left two-thirds "
                   "of the frame, head tilted slightly, huge cheerful open smile with tongue peeking out, eyes squinting happily; his big open palm waving "
                   "hand is in the foreground on the lower-right, fingers spread, partially cropped by the bottom edge. Upper-right: a floating white flat "
                   "paper document with three grey rounded bars (no letters), tilted 15 degrees, with a soft flat drop shadow. Middle-right: a flat "
                   "checklist icon made of two dark-mauve circles with two rounded bars. Leave the top-left corner empty for a logo. Everything flat, thick outlines."),
    'login-flat-b': ("Portrait 3:4 hero-card composition on one flat pastel pink background (#FFE1DC). Nusa in extreme close-up cropped by the frame, "
                     "filling the left and bottom edges: head and shoulders large, waving with a big open palm toward the viewer on the right side, "
                     "very happy squinting eyes and wide smile. Floating flat props: a white paper card with grey bars top-right, a small flat speech "
                     "bubble near his head, two list-bullet lines bottom-right. Top-left corner empty. Thick uniform outlines, flat colours."),
}

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


async def render(name, prompt, refs, style=STYLE, keep_bg=False):
    chat = LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id='nusa-' + name,
                   system_message='You are a senior character illustrator who keeps a mascot perfectly on-model.')
    chat.with_model('gemini', 'gemini-3.1-flash-image-preview').with_params(modalities=['image', 'text'])
    msg = UserMessage(text=style + ' ' + prompt, file_contents=[ImageContent(x) for x in refs])
    for attempt in range(3):
        try:
            text, images = await chat.send_message_multimodal_response(msg)
            if images:
                raw = Image.open(io.BytesIO(base64.b64decode(images[0]['data'])))
                if keep_bg:
                    raw.convert('RGB').save(os.path.join(OUT, name + '.jpg'), quality=92)
                else:
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
    jobs = [render(n, SCENES[n], refs) if n in SCENES else render(n, FLAT_SCENES[n], refs, FLAT_STYLE, True) for n in names]
    await asyncio.gather(*jobs)


if __name__ == '__main__':
    asyncio.run(main())
