# FIEZEL UI/UX Master Specification & Design System
**Version:** 2.0.0 · **Target Build:** FIEZEL 5.19.0 · **Design Baseline:** Daylight Travertine & Warm Neutral

---

## 1. Design Philosophy

FIEZEL is an intimate, focused, and distraction-free mobile-first learning world. 
* **Zero Cognitive Clutter:** The UI never shouts. No flashy gambling banners, no annoying cartoon interruptions.
* **Warm & Editorial:** Travertine, cream, and deep ink tones with purposeful accent colors.
* **Braincore in Disguise:** The learner never sees internal algorithms, machine learning parameters, or formula names. Intelligence is felt solely through effortless adaptation, thoughtful pacing, and meaningful feedback.

---

## 2. Core Color Tokens

```css
:root {
  /* Surfaces */
  --bg-day: #FDFAF3;             /* Daylight Travertine quad */
  --surface-card: #FFFFFF;        /* Elevated card surface */
  --surface-subtle: #F6F2E9;      /* Inset wells & secondary containers */
  --border-subtle: #EAE3D2;       /* Subtle dividers */

  /* Typography & Ink */
  --ink-primary: #1F1B18;         /* Deep primary text (>16:1 contrast) */
  --ink-secondary: #575047;       /* Body secondary & labels */
  --ink-muted: #8A8175;           /* Timestamps & hints */

  /* Accents & States */
  --primary-accent: #2563EB;      /* Interactive blue CTA */
  --accent-gold: #F59E0B;         /* Streak & achievements */
  --state-success: #10B981;       /* Correct verification */
  --state-error: #EF4444;         /* Correction highlight */
  --state-warning: #F59E0B;       /* Review due / caution */

  /* PAW Mascot Rig Palette */
  --paw-yellow: #FFD94F;
  --paw-yellow-dark: #EDB93A;
  --paw-cream: #FFF4DA;
  --paw-maroon: #8C2233;
  --paw-cocoa: #33201F;
}
```

---

## 3. Typography & Hierarchy

* **Font Family:** Plus Jakarta Sans (`font-family: 'Plus Jakarta Sans', system-ui, sans-serif;`)
* **Strict Weight Rule:** Standard weights `400`, `500`, `600`, `700`, `800`. **ZERO faux-bold 900** weight on Plus Jakarta Sans.
* **Scale:**
  * Hero/Title: `24px` / `32px` (weight `800`)
  * Section Headers: `18px` / `24px` (weight `700`)
  * Body/Stem: `16px` / `24px` (weight `500` - `600`)
  * Microcopy/Tags: `12px` / `16px` (weight `600`)

---

## 4. Spacing, Radii, & Safe Zones

* **Safe Margin:** Horizontal padding $\ge 16\text{px}$ (mobile), $\ge 32\text{px}$ (tablet/desktop).
* **Corner Radius:**
  * Cards: `16px` (`border-radius: 1rem`)
  * Buttons/Pills: `12px` or fully rounded `9999px` for chips.
  * Inputs: `12px`.
* **Touch Targets:** Minimum interactive touch target $\ge 48\text{px} \times 48\text{px}$ for accessibility.

---

## 5. PAW Presence & Motion Guidelines

* **Attentive, Not Annoying:** PAW speaks or animates only when it enhances comprehension or marks a genuine milestone.
* **Respect Reduced Motion:** When `prefers-reduced-motion: reduce` or `state.preferences.motion === false`, all PAW animations collapse into calibrated static keyframe expressions (`studying`, `reading`, `listening`, etc.) without layout shift.
* **Layout Stability:** Maximum one panel-scale PAW mascot instance per viewport to prevent duplicate SVG rendering and layout reflow.
