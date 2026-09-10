# Handoff — Intro baru (3 slide + Masuk/Daftar) dengan maskot Nusa · m025-300

Ringkasan ada di `memory/PRD.md` (bagian m025-300). Berkas kunci:

| Berkas | Peran |
| --- | --- |
| `features/onboarding/fiezel-intro.js` | Membungkus `FiezelOnboarding.show()`; bahasa → 3 slide → Masuk/Daftar → perkenalan lama. State `fiezel-intro-v1`. |
| `features/onboarding/intro.css` | Layar intro (`.fz-intro`) + restyle perkenalan lama (`.fiezel-ob:not(.fz-intro)`), Nusa menggantikan Paw. |
| `features/i18n/copy-id-intro.js`, `copy-th-intro.js` | Naskah dwibahasa (th = draft AI, perlu review). |
| `assets/characters/**` | Aset PR#399 (Nusa & Mira). `scenes/intro/*.png` = pose Nusa baru untuk intro. |
| `tools/fix-mira-assets.py` | Perbaikan artefak papan-catur pada Mira (jalankan ulang bila aset `_orig` berubah). |
| `tools/dev/generate-nusa-scenes.py` | Regenerasi pose Nusa (butuh `EMERGENT_LLM_KEY` di `backend/.env`). |

Aturan yang dijaga: tidak ada endpoint baru; akun tetap `FiezelAccount`/`FiezelGoogle`; setiap teks lewat `FiezelI18n.t`; setiap layar muat 100dvh (mobile & desktop ≥900px).
