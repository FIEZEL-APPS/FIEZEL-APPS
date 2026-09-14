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
