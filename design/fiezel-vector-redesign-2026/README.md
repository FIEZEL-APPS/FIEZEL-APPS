# FIEZEL — Full Vector Redesign v1

This is a visual direction/prototype package only. It does not replace production assets yet.

## Direction
- FIEZEL-authentic rather than generic children's-app artwork.
- PAW remains the central brand character and keeps the canonical yellow/maroon/cream identity.
- Flat vector geometry: scalable SVG, crisp rounded shapes, no raster textures, no photorealism.
- Warm FIEZEL palette: sun yellow, cream, pastel pink, mint/forest green, maroon.
- Indonesian exploration/learning cues are subtle and integrated rather than decorative noise.
- Visual language should feel premium, cheerful, scientific/curious, and educational — not babyish.
- Custom iconography and illustration shapes should be proprietary-looking, not stock/icon-library derived.

## Files
- `paw-adventure-hero.svg` — full hero illustration direction.
- `paw-icon.svg` — PAW head/app icon direction.

## Important production rule
Do not overwrite the canonical production PAW rig automatically. The existing `features/mascot/fiezel-mascot.js` is the source of the current motion/interaction rig, and existing generated PAW assets are explicitly marked as generated from that source. This branch is a visual redesign proposal; integration should preserve behavior, accessibility, animation contracts, and the existing design system.

## Next pass
Expand the same vector language across onboarding, home, practice/lesson, progress, school/class, profile, empty states, badges, navigation icons, and marketing assets. Preview before production integration.
