# Antigravity Workspace Guidelines for FIEZEL-APPS

## Motion & Video Animation Guidelines (Remotion & Three.js 3D Master)

Whenever the user requests animation, motion graphics, commercial 3D film, or video generation:
1. **Mandatory Master Skill**: Always activate and strictly follow the skill `hollywood-film-choreography`.
2. **Strict User Prohibitions**:
   - ZERO occurrences of forbidden claims: `"100% Gratis"`, `"Latihan Bisa Offline"`, `"CEFR"`, `"JLPT"`.
   - ZERO mascots or characters: NEVER use `"PAW"` or cartoon avatars.
   - ZERO leftover scrap floor text or black voids.
   - ZERO faux bold fonts (strictly weight `800`, never `900` on Plus Jakarta Sans).
   - ZERO cropped text: Always enforce Title & Action Safe Zone margins ($\ge 64\text{px}$ horizontal, $\ge 120\text{px}$ vertical).
3. **Mandatory 5-Act Gemini Choreography**:
   - Act I: Clean logo opening -> damped spring split ($\omega=15, \zeta=0.44$, 25% overshoot) -> 4 UI pills -> Z-axis push-through micro-tunneling.
   - Act II: 3-tier iridescent glow (`#00E5FF` -> `#2979FF` -> `#FFD700`) + 360° trim sweep -> 3D golden curved telemetry ribbon landing at $t=14.5\text{s}$ with shockwave ring.
   - Act III: Dark Eclipse Flip to `#1B1418` (>16:1 contrast) -> coral warning strobe (`#FF3045`) on tab switch -> Hollywood rack focus -> freehand glowing Circle-to-Search gesture around Rian Pratama.
   - Act IV: 25° Dutch Angle macro framing on score 88 -> emerald breathing pulse on WhatsApp CTA -> 3D haptic card fold at $t=43.5\text{s}$.
   - Act V: Singularity implosion at $t=51.5\text{s}$ -> equalizer bar burst on "I" -> two-tone wordmark + "KelasKu untuk Guru" centered at $X=540.0\text{px}$ over daylight travertine quad `bgDay` (`#FDFAF3`).
4. **Mandatory Audio Engineering (EBU R128)**:
   - Voiceover TTS spelled phonetically `"Fizel"` (female educator tone).
   - Zero speech collision: atempo compression (1.10x–1.15x) ensuring $\ge 140\text{ms}$ breathing pockets.
   - Dynamic sidechain ducking: $-8.0\text{ dB}$ bed drop during speech ($150\text{ms}$ attack, $400\text{ms}$ release).
   - Integrated Loudness $-14.0 \pm 0.5\text{ LUFS}$, True Peak $\le -1.5\text{ dBTP}$.
5. **Mandatory Frame-by-Frame Visual Inspection**:
   - NEVER declare video ready based on unit tests alone. Always extract milestone stills via `ffmpeg` ($t=1.0, 2.5, 4.0, 14.5, 22.0, 27.0, 43.5, 58.0\text{s}$) and visually inspect with `view_file` to certify zero cropping, zero slop, and cinematic camera depth.

## Mandatory Protocol: Multi-Character Audio Pipeline for Listening (Chokai) Bank
Whenever creating, regenerating, or updating listening exercises or audio banks:
1. **ZERO Monotone Audio**: DILARANG KERAS merender naskah dialog percakapan dengan satu suara tunggal.
2. **Three Mandatory Personas**:
   - **Instruktor Ujian**: Suara pria dewasa tegas dan berwibawa (`ja-JP-KeitaNeural` pitch `-18Hz`, rate `-4%` atau Gemini `Charon`/`Fenrir`). Membacakan pembuka situasi dan pertanyaan penutup.
   - **Mahasiswa Laki-laki**: Suara pemuda natural (`ja-JP-KeitaNeural` pitch `+4Hz`, rate `+3%` atau Gemini `Puck`).
   - **Mahasiswi Perempuan**: Suara mahasiswi natural dan cerdas (`ja-JP-NanamiNeural` pitch `+3Hz`, rate `+1%` atau Gemini `Aoede`/`Kore`).
3. **Sequential 4-Stage Composition**:
   - Babak 1: Instruksi/Situasi oleh Instruktor (+500ms jeda nafas).
   - Babak 2: Dialog percakapan bergantian antar karakter (+350ms-450ms jeda respon antar giliran).
   - Babak 3: Pertanyaan oleh Instruktor (+1000ms jeda refleksi).
   - Babak 4: Thinking pocket (1.5-2.0 detik buffer jeda hening di akhir).
4. **Execution & CI**: Selalu jalankan pipeline otomatis melalui `tools/chokai-audio-pipeline/` dan pastikan gerbang validasi terpenuhi sebelum rilis.




## Google Stitch Collaboration Rules
When the user brings a Google Stitch design:
1. **Always ask for the code export** (`<>` Code view) first — it's the most reliable handoff method.
2. **Convert HTML/Tailwind to React components** with proper hierarchy, props, and accessibility.
3. **Enhance with animations**: scroll-triggered reveals, micro-interactions, parallax effects.
4. **Organize exports** in `stitch-export/` directory, production code in `website/`.
5. **Be specific in prompts**: Use exact color codes, font weights, spacing values — never "make it beautiful".

## Vibe Coding Best Practices
1. **Image-First Workflow**: Design images FIRST, then animate. Image-to-video gives more control than text-to-video.
2. **Small Iterative Prompts**: Refine one section at a time, not the whole page.
3. **Error-Paste Debugging**: Paste error logs directly back for fixes instead of manual debugging.
4. **Design-First, Code-Second**: Always have a clear visual reference before writing code.

## Git Protection Rule
- **NEVER COMMIT OR PUSH REDESIGN**: Jangan pernah melakukan `git commit` maupun `git push` untuk seluruh aset, berkas, mockup, dan kode redesign ini ke repositori git tanpa perintah tertulis eksplisit dari pengguna. Seluruh hasil kerja tetap berada di lingkungan lokal/preview.
