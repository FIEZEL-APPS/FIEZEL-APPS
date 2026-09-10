# FIEZEL Repository Map — Pau / Mascot Assets

Authoritative repository: `FIEZEL-APPS/FIEZEL-APPS` (GitHub, public — "AI-Powered Learning Platform").

Access via `bash` with `api_credentials=["github"]` using `gh` / `git` CLIs.

## Known Pau / mascot asset locations (verified 2026-08-27)

### Brand assets — `assets/brand/`
- `assets/brand/paw-mascot-full.svg` — full-body Pau master SVG (primary source of truth)
- `assets/brand/paw-mascot-head.svg` — Pau head SVG
- `assets/brand/paw-mascot-full-512.png` — full-body PNG export
- `assets/brand/paw-mascot-head-512.png` — head PNG export
- `assets/brand/fiezel-paw.svg` — paw brand mark
- `assets/brand/fiezel-icon.svg` — app icon
- `assets/brand/fiezel-wordmark.svg` / `fiezel-wordmark-mono.svg` — wordmarks
- `assets/brand/fiezel-ask.svg` — ask mark

### Existing poses — `assets/marketing/mascot-poses/`
- `paw-mascot-full-celebrating.svg`
- `paw-mascot-head-listening.svg`
- `paw-mascot-head-proud.svg`

### Marketing illustration
- `assets/marketing/ilustrasi/cat_mascot.png`

### Mascot feature code — `features/mascot/`
- `features/mascot/README.md`
- `features/mascot/fiezel-mascot.js` — existing mascot runtime/behavior
- `features/mascot/fiezel-motion.css` — existing motion CSS

### Redesign design system — `design/redesign-v1/`
- `design/redesign-v1/components/assets/mascot/paw-mascot-head.svg`
- `design/redesign-v1/screens/c/assets/paw-mascot-head.svg`
- `design/redesign-v1/screens/d/assets/mascot/paw-mascot-full.svg`
- `design/redesign-v1/screens/d/assets/mascot/paw-mascot-head.svg`
- `design/redesign-v1/tokens/board-assets/mascot-full.svg`
- `design/redesign-v1/tokens/board-assets/mascot-head.svg`

### Handoff / documentation
- `FIEZEL-BRAND-MASCOT-VECTOR-HANDOFF.md` — brand mascot vector handoff document
- `DESIGN-SYSTEM.md` — overall design system

## Notes
- The mascot is a cat ("paw" naming, `cat_mascot.png`). "Pau" = the paw-mascot character.
- Multiple copies of the head/full SVG exist across `assets/brand/` and `design/redesign-v1/`. Auditors must diff them and determine the authoritative/current version (check `FIEZEL-BRAND-MASCOT-VECTOR-HANDOFF.md` and git history first).
- The repo also contains a neural voice system (see `fiezel-neural-voice-audit` history and workflows like `audio-*`). Do NOT replace it; integrate with it (master prompt §24).
- Re-verify this map at run time with:
  `gh api repos/FIEZEL-APPS/FIEZEL-APPS/git/trees/HEAD?recursive=1 --jq '.tree[].path' | grep -iE 'pau|paw|mascot|character'`
