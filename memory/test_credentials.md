# FIEZEL — Kredensial uji (jangan dipakai di produksi)

## Owner / Guru (masuk lewat token, bukan pendaftaran mandiri)
| Peran | Cara masuk | Nilai |
| --- | --- | --- |
| Owner (master) | `/kurikulum.html` → kolom "Token guru" | `FZ-OWNER-2026-MASTER` |
| Owner (email+sandi, API) | `POST /api/auth/login` | `owner@fiezel.my.id` / `FiezelOwner#2026` |
| Guru undangan | Owner mint token: `POST /api/owner/teacher-invites` header `X-Owner-Token: FZ-OWNER-2026-MASTER` body `{"name":"Bu Rina"}` → token `FZG-XXXXXXXX` dipakai di halaman guru |

## Murid
| Peran | Cara masuk | Nilai |
| --- | --- | --- |
| Murid FIEZEL (email+sandi) | `/misi.html` → tab **Daftar** | buat baru, mis. `murid.demo@example.com` / `murid123`, kode kelas `FZ-DEMO7A` |
| Murid Google | `/misi.html` → **Masuk dengan Google** (Emergent-managed) | akun Google apa pun; tidak ada sandi yang dikelola aplikasi |

## Kelas & data demo
* Kode kelas demo: `FZ-DEMO7A` (Matematika Kelas 7A, 18 murid roster + evidence sintetis).
* Kurikulum seed: `KURMER` → `FASE-D` → `KELAS-7` → `MAT-7` / `ENG-7`.
* TP contoh: `TP-MAT-D-7-BIL-01`, `TP-MAT-D-7-BIL-02` (ada GAP), `TP-MAT-D-7-BIL-03` (MISSING, sengaja tanpa soal).

## Endpoint auth
`POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/teacher/token` ·
`POST /api/auth/google/session` · `POST /api/auth/join-class` · `GET /api/auth/me` ·
`POST /api/auth/refresh` · `POST /api/auth/logout` · `POST /api/owner/teacher-invites`

Catatan: login mengembalikan cookie httpOnly **dan** `access_token` di body (untuk klien non-browser / curl gunakan header `Authorization: Bearer <token>`).

## Intro baru (m025-300, sesi Emergent) — cara uji
- Reset alur: di console `localStorage.removeItem('fiezel-intro-v1'); localStorage.removeItem('fiezel-onboarding-v1'); location.reload()`.
- Urutan: `intro-lang-id|th` → `intro-next` ×3 / `intro-skip` → layar akun (`intro-auth-tab-login|register`, `intro-auth-handle`, `intro-auth-password`, `intro-auth-confirm`, `intro-auth-submit`, `intro-auth-google`, `intro-auth-skip`, `intro-auth-close`) → perkenalan lama (`[data-ob-name]`, `[data-ob-advance]`, `[data-ob-goal]`, `[data-ob-level]`).
- Login/daftar memanggil API produksi `api.fiezel.my.id` (menolak origin preview) → error "Servernya lagi nggak bisa dihubungi" adalah perilaku yang diharapkan di preview. Pakai "Lanjut tanpa akun".
- Tunggu splash selesai (~2–4 dtk) sebelum klik; splash berada di atas intro selama animasi keluar.
