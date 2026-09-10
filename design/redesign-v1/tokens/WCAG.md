# MATRIKS KONTRAS WCAG — TOKEN FIEZEL FINAL v1.0

Metode: rasio kontras WCAG 2.x (luminansi relatif sRGB), dihitung programatik
(`contrast.py` / `final_matrix.py`, hasil mentah di `contrast_results.json`).
Ambang: **>=4,5:1 teks normal (AA)**, **>=3:1 teks besar (>=18px / >=14px bold) dan
indikator non-teks** (SC 1.4.3 & 1.4.11).

Warna dengan alpha (`--on-core-muted`, `--on-core-disabled`) dihitung sebagai warna
**komposit efektif** di atas permukaan targetnya.

## Hasil: 39/39 pasangan LULUS (setelah 5 penyesuaian token)

| Pasangan (peran) | Foreground | Background | Rasio | Ambang | Status | Catatan penyesuaian |
|---|---|---|---|---|---|---|
| Teks utama — body | `text` #241A11 | `bg` #FFF9EE | **16.28:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Teks utama di kartu putih | `text` #241A11 | `panel` #FFFFFF | **17.06:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Teks utama di panel-soft | `text` #241A11 | `panel-soft` #FFF3DC | **15.52:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Teks sekunder (muted) di bg | `muted` #6E5E47 | `bg` #FFF9EE | **5.97:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Muted di panel | `muted` #6E5E47 | `panel` #FFFFFF | **6.26:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Muted di panel-soft | `muted` #6E5E47 | `panel-soft` #FFF3DC | **5.69:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Muted-soft (tersier) di bg | `muted-soft` #7E6C4B | `bg` #FFF9EE | **4.85:1** | 4.5 (AA normal) | ✅ LULUS | digeser dari #857350 (4,39) |
| Muted-soft di panel | `muted-soft` #7E6C4B | `panel` #FFFFFF | **5.08:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Muted-soft di panel-soft | `muted-soft` #7E6C4B | `panel-soft` #FFF3DC | **4.62:1** | 4.5 (AA normal) | ✅ LULUS |  |
| On-core di panel AI (core) | `on-core` #FDFAF3 | `core` #1B1418 | **17.37:1** | 4.5 (AA normal) | ✅ LULUS |  |
| On-core di core-soft | `on-core` #FDFAF3 | `core-soft` #2A2126 | **14.99:1** | 4.5 (AA normal) | ✅ LULUS |  |
| On-core-muted (a=.68) di core | `on-core-muted@core` #B5B0AD | `core` #1B1418 | **8.43:1** | 4.5 (AA normal) | ✅ LULUS | komposit efektif |
| On-core-muted di core-soft | `on-core-muted@core-soft` #B9B5B1 | `core-soft` #2A2126 | **7.67:1** | 4.5 (AA normal) | ✅ LULUS | komposit efektif |
| Sun (aksen) di core | `sun` #FFC700 | `core` #1B1418 | **11.57:1** | 3.0 (AA besar/non-teks) | ✅ LULUS | ikon/teks besar AI |
| Ink di tombol Sun (CTA) | `text` #241A11 | `sun` #FFC700 | **10.90:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Ink di sun hover (sun-deep) | `text` #241A11 | `sun-deep` #E6A800 | **8.10:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Ink di sun press (sun-press) | `text` #241A11 | `sun-press` #CC9600 | **6.44:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Ink di sun-soft (chip/tile) | `text` #241A11 | `sun-soft` #FFF3C4 | **15.33:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Ink di gradasi CTA atas (#FFDE59) | `text` #241A11 | `grad-top` #FFDE59 | **12.87:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Ink di gradasi CTA bawah (#FFA500) | `text` #241A11 | `grad-bot` #FFA500 | **8.64:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Krem (bg) di CTA ink | `bg` #FFF9EE | `text` #241A11 | **16.28:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Krem di CTA ink hover | `bg` #FFF9EE | `ink-hover` #3A2B1C | **12.99:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Krem di CTA ink press | `bg` #FFF9EE | `ink-press` #120C07 | **18.53:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Good di good-soft | `good` #1F6B4E | `good-soft` #E9F7F0 | **5.82:1** | 4.5 (AA normal) | ✅ LULUS | digeser dari #2E8B69 (3,80) |
| Good di bg | `good` #1F6B4E | `bg` #FFF9EE | **6.12:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Good di panel | `good` #1F6B4E | `panel` #FFFFFF | **6.42:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Good-bright (ikon/teks besar) | `good-bright` #2E8B69 | `good-soft` #E9F7F0 | **3.80:1** | 3.0 (AA besar/non-teks) | ✅ LULUS | hanya >=18px/ikon |
| Bad di bad-soft | `bad` #AC3E2A | `bad-soft` #FDE3DE | **4.95:1** | 4.5 (AA normal) | ✅ LULUS | digeser dari #B8432D (4,44) |
| Bad di bg | `bad` #AC3E2A | `bg` #FFF9EE | **5.76:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Bad di panel | `bad` #AC3E2A | `panel` #FFFFFF | **6.04:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Info di info-soft | `info` #7A5F1B | `info-soft` #FFF3C4 | **5.42:1** | 4.5 (AA normal) | ✅ LULUS | digeser dari #8C6D1F (4,37) |
| Info di bg | `info` #7A5F1B | `bg` #FFF9EE | **5.76:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Disabled text di panel-soft | `text-disabled` #75654C | `panel-soft` #FFF3DC | **5.13:1** | 4.5 (AA normal) | ✅ LULUS | token baru |
| Disabled text di bg | `text-disabled` #75654C | `bg` #FFF9EE | **5.38:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Disabled text di panel | `text-disabled` #75654C | `panel` #FFFFFF | **5.64:1** | 4.5 (AA normal) | ✅ LULUS |  |
| Focus ring vs bg (non-teks) | `focus-ring` #A67A00 | `bg` #FFF9EE | **3.71:1** | 3.0 (AA besar/non-teks) | ✅ LULUS | token baru; sun-deep gagal (2,01) |
| Focus ring vs panel | `focus-ring` #A67A00 | `panel` #FFFFFF | **3.89:1** | 3.0 (AA besar/non-teks) | ✅ LULUS |  |
| Focus ring vs panel-soft | `focus-ring` #A67A00 | `panel-soft` #FFF3DC | **3.53:1** | 3.0 (AA besar/non-teks) | ✅ LULUS |  |
| Muted di sun-soft | `muted` #6E5E47 | `sun-soft` #FFF3C4 | **5.62:1** | 4.5 (AA normal) | ✅ LULUS | meta di chip kuning |

## Penyesuaian token dari draf DIRECTION (semua dicatat juga di header tokens.css)

| Token | Draf | Rasio draf (gagal) | Final | Rasio final | Alasan |
|---|---|---|---|---|---|
| `--muted-soft` | #857350 | 4,39:1 di `--bg` | **#7E6C4B** | 4,85:1 | DIRECTION membatasi "hanya >=14px", tapi 14px regular tetap teks *normal* menurut WCAG (large = 18px / 14px **bold**) — digeser agar aman dipakai di semua ukuran >=12px |
| `--good` | #2E8B69 | 3,80:1 di `--good-soft`; 4,00:1 di `--bg` | **#1F6B4E** | 5,82:1 / 6,12:1 | Teks feedback "benar" sering 13–15px; nilai draf hanya layak teks besar. Selaras rekomendasi audit (±#1F6B4E) |
| `--bad` | #B8432D | 4,44:1 di `--bad-soft` | **#AC3E2A** | 4,95:1 | Meleset tipis di soft; digeser satu langkah lebih gelap tanpa mengubah karakter hangat |
| `--info` | #8C6D1F | 4,37:1 di `--info-soft` | **#7A5F1B** | 5,42:1 | Toast/info di atas kuning lembut butuh margin; 4,64:1 di bg juga terlalu mepet |
| `--focus-ring` | (draf memakai `--sun-deep` #E6A800) | 2,01:1 vs `--bg`; 2,11:1 vs `--panel` | **#A67A00** (token baru) | 3,71:1 / 3,89:1 / 3,53:1 | Ring fokus = indikator non-teks, wajib >=3:1 (SC 1.4.11). `--sun-deep` tetap hidup sebagai warna hover CTA sun (ink di atasnya 8,10:1) |

Nilai draf `#2E8B69` dan `#B8432D` **tidak dibuang**: dipertahankan sebagai
`--good-bright` / `--bad-bright` khusus ikon dan teks >=18px (ambang 3:1 terpenuhi).

## Aturan pakai yang mengikat

1. **Teks normal (<18px / <14px bold)**: hanya token dengan rasio >=4,5:1 pada permukaannya — semua baris berlabel "AA normal" di atas.
2. **`--good-bright` / `--bad-bright` / `--sun` di `--core`**: hanya ikon, angka besar, atau teks >=18px.
3. **Disabled**: permukaan `--panel-soft` + teks `--text-disabled` (5,13:1) + ikon gembok. Dilarang menurunkan opacity teks (audit menemukan 2,28:1 dan 1,45:1 di app lama).
4. **Focus ring**: `--focus-ring` 2px offset 2px di permukaan terang; `--focus-ring-on-core` (#FFC700) di panel AI.
5. **Toast**: permukaan `--ink` + teks `--bg` (16,28:1) — menggantikan navy+teks gelap yang gagal berat di audit.
6. **CTA**: dua varian sah — `--sun` + ink (10,90:1) atau `--ink` + krem (16,28:1); gradasi `--sun-grad` aman di kedua ujung (12,87:1 / 8,64:1).
