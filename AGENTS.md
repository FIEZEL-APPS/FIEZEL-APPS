# Antigravity Workspace Guidelines for FIEZEL-APPS

## Motion & Video Animation Guidelines (Remotion)

Whenever the user requests animation, motion graphics, character animation, or video generation:
1. **Always Use Remotion**: The Remotion environment is already set up and configured in `./remotion`.
2. **Component Creation**:
   - Write pure React/SVG/CSS vector motion components in `remotion/src/<Name>Motion.jsx`.
   - Use continuous procedural mathematical easing (`Math.sin`, `interpolate`, `Easing.inOut`, etc.) rather than static/flipbook images.
   - For looping animations, ensure $C^1$ continuity where frame 0 matches the end frame identically ($0\text{ms}$ jump cut).
3. **Register Composition**:
   - Register every new composition in `remotion/src/Root.jsx` with exact `id`, `durationInFrames`, `fps` (default: 60 fps for ultra-smooth UI motion, or 30 fps for standard web), and resolution (1920x1080 for landscape, or 1080x1920 for mobile stories).
4. **Rendering Commands**:
   - Render MP4: `cd remotion; npx remotion render <CompositionId> ../assets/motion/<filename>.mp4`
   - Render WebM: `cd remotion; npx remotion render <CompositionId> ../assets/motion/<filename>.webm --codec=vp8`
   - Render Poster Still: `cd remotion; npx remotion still <CompositionId> ../assets/motion/posters/<filename>.jpg --frame=<midFrame>`
5. **Interactive Preview**:
   - Always update or provide an interactive HTML player in `mockups/preview-<name>.html` with loop controls, speed pills (0.25x/0.5x/1.0x), and frame-stepping so the user can easily view and evaluate the motion.


## OpenCode Autonomous Execution Rules (Rate Limit Prevention)
1. **Strict Sequential Execution**:
   - Always execute all plans, edits, and tool calls sequentially within the main session thread.
   - **NEVER** spawn parallel sub-agents or fork concurrent background sub-agents.
   - Spawning parallel sub-agents triggers provider concurrency rate limits (HTTP 429: "Rate limit exceeded").
2. **Deterministic Step-by-Step Delivery**:
   - Complete tasks step-by-step: inspect -> modify -> test -> verify.

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
