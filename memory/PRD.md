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

## Backlog / Future (P2)
- Optional: persist a one-time toast informing auto-detected Thai users they can switch back.
- Optional: cache country_code to skip fetch entirely on repeat first-run edge cases.
