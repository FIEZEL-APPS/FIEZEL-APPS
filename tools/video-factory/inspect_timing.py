import subprocess
import whisper
import os

input_file = 'mockups/media/cake-lucy-5q.mp4'
temp_file = 'temp_p2.mp4'

subprocess.run([
    'ffmpeg', '-y', '-ss', '24.8', '-i', input_file, '-t', '17.24',
    '-c:v', 'libx264', '-c:a', 'aac', temp_file
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

model = whisper.load_model('base')
res = model.transcribe(temp_file, word_timestamps=True)

for seg in res['segments']:
    print(f"[{seg['start']:.2f} -> {seg['end']:.2f}] {seg['text']}")
    for w in seg.get('words', []):
        print(f"   {w['start']:.2f}-{w['end']:.2f}: {w['word']}")

if os.path.exists(temp_file):
    os.remove(temp_file)
