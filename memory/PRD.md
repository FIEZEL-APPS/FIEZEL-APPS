# FIEZEL — PRD

## Problem Statement (user, Indonesian)
Website: fiezel.my.id (PWA "FIEZEL — Adaptive English", Vanilla JS, no framework, local-first).
User request: tambahkan deteksi lokasi berbasis IP — ketika pengunjung dari Thailand membuka
website, antarmuka otomatis berganti dari Bahasa Indonesia ke Bahasa Thai. Toggle bahasa
manual (di onboarding & Pengaturan) TETAP ada.

## Architecture
- Static PWA served from /app root (python3 -m http.server 3000). No backend for this app.
- i18n engine: `features/i18n/fiezel-i18n.js` (window.FiezelI18n; SUPPORTED=['id','th'];
  DEFAULT 'id'; setLocale/getLocale/onChange). Thai content fully translated & tested
  (grammar-explanations-th, vocabulary-th, listening/speaking banks, copy-th-*).
- Locale = STATE (`state.preferences.learnerLocale`), not route. Boot reads it at app.js ~L904.

## Implemented
### 2026-06 — IP-based auto-detection of Thai locale (DONE, tested)
- Added prefs flags `learnerLocaleExplicit` + `localeAutoDetected` to `defaultPreferences` (app.js ~L217).
- `fetchCountryCode(timeoutMs)` + `maybeAutoDetectLocale()` added before `bootFiezel` (app.js end).
  - Service: `https://ipwho.is/?fields=success,country_code` (free, no key, HTTPS). CSP allows `connect-src https:`.
  - 2s AbortController timeout; fail-soft → stays 'id' on offline/timeout/error (no flag set, retries next visit).
  - Runs only when NOT `learnerLocaleExplicit` and NOT already `localeAutoDetected` (once per device).
  - If country_code==='TH' → sets learnerLocale='th' + FiezelI18n.setLocale('th') before first render.
- `bootFiezel()` now `maybeAutoDetectLocale().then(load)` — non-blocking beyond 2s cap.
- Manual choice wins: `learnerLocaleExplicit:true` set in onboarding `onLocale` (~L6656) and
  settings `setLearnerLocalePreference` (~L9597). Once manual → IP never overrides.
- Verified via Playwright: US IP → lang=id; mocked TH IP → lang=th-TH, locale='th'.
- Regression: id-golden-snapshot-test PASS, th-coverage-test 143/143 PASS.

### 2026-06 — Landing page (website/) IP auto-redirect to Thai (DONE, tested)
- Landing pages: `/` = website/index.html (ID), `/th/` = website/th/index.html (Thai, pre-existing).
  The PWA lives at `/app/`. hreflang id/th already present.
- Added inline <head> geo-redirect script in `website/index.html`:
  - localStorage `fiezel-site-locale`: 'id' → no redirect (manual ID wins); 'th' → instant redirect to `th/`.
  - unset → fetch `https://ipwho.is/?fields=success,country_code` (2s AbortController timeout, fail-soft).
    country_code==='TH' → save 'th' + `location.replace('th/')`. Non-TH/err → stay ID, no flag set.
- Manual language switcher pill (`.lang-switch` in style.css) added to topnav on BOTH pages:
  - ID page → "ไทย" (sets localStorage 'th', → th/). TH page → "Indonesia" (sets 'id', → ../).
- TH page does NOT redirect (loop-safe). Verified via Playwright: US IP stays `/` (id); mocked TH IP
  redirects `/` → `/th/` (lang=th, localStorage='th'); switcher present both sides.

## Backlog / Future (P2)
