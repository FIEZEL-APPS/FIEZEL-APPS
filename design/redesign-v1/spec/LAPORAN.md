# LAPORAN — Rebrand: spec + migrasi

Status: **selesai**. Repo `fiezel-apps` TIDAK diubah (read-only; branch tetap `main` @ `a06c9dc`).

## Deliverable

| File | Isi |
|---|---|
| `redesign/spec/SPEC.md` | Pemetaan token LAMA→BARU satu per satu dengan **jumlah kemunculan `var()` per token** (di-grep dari style.css + app.js + index.html + sw.js + seluruh features/), demosi coral per-pemakaian (17 titik `var(--coral*)` + hex mentah, masing-masing dengan baris & pengganti), blok `:root` target + alias kompatibilitas, spesifikasi komponen inti (tombol/toast/nav/option/feedback/confidence/topbar/focus/disabled — padding/radius/typography), aturan maskot dock 88px, matriks kontras nilai baru, lantai font 12px dengan daftar pelanggar per baris CSS. |
| `redesign/spec/MIGRATION.md` | Rencana 5 fase aman untuk app live: F0 branch `redesign-v1`+preview (main tak tersentuh), F1 token swap in-place + fix kontras wajib (risiko rendah), F2 komponen, F3 panel AI+layar+maskot, F4 QA gate; **inventaris lengkap 91 file `*-test.js`** yang wajib hijau (dikelompokkan; termasuk onboarding-test, contrast-test, a11y-test, pastel-field-contrast-test, topbar-logo-contrast-test, install-health-test); rollback path per fase (git revert atomik + aturan `SW_REV` hanya-maju, sw.js b.9); aturan JANGAN hapus fungsi & JANGAN ubah IA; estimasi effort ≈12–17 hari kerja. |

## Temuan penting yang mengubah rencana (bukan sekadar mapping)

1. **Dua blok `:root`** di style.css (b.6 pastel v5, b.594 v6 yang menang untuk token kembar) — swap token wajib di keduanya; kesalahan "hanya blok atas" pernah terjadi dan didokumentasikan di komentar CSS-nya sendiri.
2. **`tokens.css` terpisah TIDAK aman**: `contrast-test.js` & `pastel-field-contrast-test.js` memarse `style.css`+`tutor-v3.css` secara statis. `pastel-field-contrast-test.js` **memaku literal** `--yellow:#FFD23F` dkk. Jadi Fase 1 = edit nilai in-place + pindahkan kunci test di commit yang sama (preseden resmi ada di komentar style.css).
3. **Toast bug terparah** terlokalisasi: `.toast` b.277 (bg coral, teks ink) + override `.toast{background:#101628}` b.806 → ink di navy. Fix satu baris hapus + satu resep `--core`/`--on-core`.
4. **FZ Fredoka belum ada di repo app** — hanya Instrument Serif + Jakarta di `assets/fonts/`; `Fredoka-var.woff2` tersedia di `redesign/screens/a/assets/fonts/` dan harus disalin (self-host wajib, onboarding-test melarang CDN).
5. **DESIGN-SYSTEM.md basi** (masih maroon #8C2233 + dark mode yang sudah dihapus m025-134); aturannya (token-only, lucide subset, reduced-motion, urutan gate) tetap diwariskan.
6. **Biaya rilis nyata**: tiap kenaikan `SW_REV` memicu klien mengunduh ulang shell ±152MB (komentar sw.js b.24) → fase dirancang sebagai rilis batch, rollback juga = SW_REV baru (tidak pernah mundur).
7. Coral aman didemosi bertahap: `.quiz-listen-btn` punya fallback `var(--coral,var(--panel))`, tapi 10+ titik lain TANPA fallback → token coral baru dihapus di Fase 2 setelah semua pemakaian diganti, bukan di Fase 1.

## Angka kunci

- Token paling banyak dipakai: `--muted` 70×, `--line` 68×, `--ink` 59×, `--ease` 55×, `--accent` 51×, `--text` 45×, `--panel` 37×.
- Kemunculan yang dimigrasi bernama: `--yellow` 18× (+6 hex #FFD23F), keluarga coral 17× `var()` + 4 hex, `--gold` 5× (2 di antaranya focus ring), hex mentah `#C2402C` 36 titik.
- Test suite: 91 file; 3 di antaranya memaku literal warna (contrast, pastel-field-contrast, topbar-logo-contrast).
