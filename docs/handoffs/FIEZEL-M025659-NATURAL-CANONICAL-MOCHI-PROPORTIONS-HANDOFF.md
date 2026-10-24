# FIEZEL HANDOFF DOSSIER: RESTORATION OF CANONICAL DAIFUKU MOCHI PROPORTIONS (m025-659)

## 1. Executive Summary & Problem Diagnosis
- **Context & User Feedback:**
  Following user feedback *"BENTAR, TAPI KENAPA BENTUKNYA JADI ANEH, TIDAK NATURAL LAGI BENTUKNYA"* on build `m025-657`.
- **Root Cause Analysis:**
  In build `m025-657`, attempting to satisfy an earlier request to "widen Mochi's dimensions", the mesh vertex scaling was directly altered on the X-axis ($x \times 1.38, y \times 1.04$). Additionally, ear base anchors were pushed outward to $\pm 0.54$ and earcups to $\pm 1.56$.
  This non-uniform deformation warped Mochi from a cute, chubby Japanese Daifuku into a flattened, oblong egg shape. Because the eyes, cheeks, and mouth stayed in their centered positions, expansive empty flat cheeks emerged on both flanks, breaking Mochi's beloved kawaii anatomical harmony.
- **Engineered Solution:**
  1. **Canonical Anatomy Restoration:** 100% restored Mochi's authentic Daifuku 3D mesh curvature ($X \times 1.32, Y \times 1.05, Z \times 0.89$, power curve $0.68 / 0.74$).
  2. **Anatomical Alignment:** Restored ear bases to $\pm 0.50$, headset spline anchor points to $\pm 1.50$, and earcup centers to $\pm 1.50$.
  3. **Prominent Magnification via Optics & Framing:** Rather than deforming Mochi's 3D anatomy, Mochi is made large, cuddly, and unclipped on Beranda through uniform optical framing ($Z = 5.05$, FOV $= 46^\circ$) and an expanded $142 \times 142\text{px}$ container (`.fz-vissol-mascot-wrap`).
  4. **Unclipped Paw Margins:** Paw positions and bounds stay comfortably within the camera frustum with zero cropping.

## 2. Empirical Verification & Evidence
- **Headless Playwright Probe (`tools/dev/probe-3d-mochi-home.mjs`):**
  - Container Rect: $142 \times 142\text{px}$ (clean fit within hero header card).
  - WebGL Canvas: $142 \times 142\text{px}$, hardware accelerated.
  - Interactive Tap/Hop Squish: Squish velocity $\approx 0.70$, jiggle amplitude $0.0016$, spring damping active.
  - Visual Crop Artifacts:
    - `mascot-crop.png`: Confirms round, chubby, organic Daifuku geometry, centered facial features, pink ear interiors, unclipped waving paws, and arched headband running smoothly behind ears.
    - `mochi-3d-home-mobile.png`: Full home screen verification certifying zero overlap with text or UI controls.
- **Practice Sessions Integration (`tests/test-all-practices-mochi-wire.js`):**
  - Chōkai Listening, Standard Quiz, Writing Stage, and Skills Lab 100% pass.
  - Zero browser console errors.

## 3. Files Modified
- `mochi-mascot/fiezel-mochi.js`: Restored canonical geometry ratios, ear anchors, headband curve, and close-up camera framing.
- `features/ui/fiezel-tactile-clay.css`: Sized `.fz-vissol-mascot-wrap` to $142 \times 142\text{px}$ and `.fz-vissol-mascot-cloud-bg` to $158 \times 154\text{px}$.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`: Hexa-sync bumped to `m025-659`.

## 4. Verification Checklists & Invariants
- [x] Zero cartoon avatars or forbidden claims.
- [x] Hexa-sync verified with `node tools/bump-build.mjs --check`.
- [x] Golden snapshot, UI leak, multi-device, and practice test suites pass.
- [x] PR mandatory before merging to `main`.
