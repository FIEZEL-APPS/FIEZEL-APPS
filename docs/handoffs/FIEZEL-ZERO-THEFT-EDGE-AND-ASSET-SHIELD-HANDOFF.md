# FIEZEL Anti-Scraping Asset Shield & Cloudflare Edge Guard Dossier

## 1. Authority & Governance
- **Authority**: OWNER / MASTER Explicit Authorization
- **Status**: Production Edge & Asset Protection Active
- **Release Boundary**: Non-Product Internal & Server Infrastructure (Zero PWA Build-Bump per Owner Directive)
- **Scope**: `fix(pwa): anti-scraping asset shield in htaccess & cloudflare origin rate-limit [ALLOW-PROTECTED: pwa]`

---

## 2. Executive Summary & Purpose
To fully address Option 1 (Locking curriculum assets from unauthorized downloads) and Option 2 (Preventing AI quota theft on Cloudflare API):
1. **Curriculum JSON & MP3 Asset Shield (Option 1)**:
   - Added Apache/LiteSpeed rewrite rules in `website/.htaccess`.
   - Direct downloads via `curl`, Python scrapers, bots, and third-party websites without legitimate FIEZEL browser referer are rejected with `403 Forbidden`.
   - Legitimate browser learners on `https://fiezel.my.id/app/` load files transparently with zero disruption.
2. **Cloudflare Live Call & AI Quota Theft Shield (Option 2)**:
   - Added in-memory IP rate-limiting and origin verification in `workers/api/voice/route-voice-live.js`.
   - Protects `routeVoiceLiveSession`, `routeVoiceCopilotAssist`, and `routeVoicePartnerTurn` from rapid quota-draining script loops.

---

## 3. Verification & Quality Gates
- `node tests/id-golden-snapshot-test.js` -> PASS (Indonesian golden baseline 100% intact).
- `node tests/deploy-site-gate-test.js` -> PASS (32/32 assert PASS).
- `node tests/cf-api-contract-test.js` -> PASS (293/293 assert PASS).
- `node tests/cf-wiring-test.js` -> PASS (117/117 assert PASS).
- `node tests/mochi-voice-sos-test.js` -> PASS (25/25 assert PASS).

---

## 4. Next Steps & Roadmap (Langkah Berikut)
1. Monitor Cloudflare analytics for any blocked scraping attempts or rate-limit triggers.
2. Maintain strict CORS and origin allowlist across all edge endpoints.
