# FIEZEL Handoff Dossier — `m025-816`: Socratic Whiteboard 100% Worker Schema Parity & Zero-Slop Pedagogical Precision

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Setelah pengujian *roleplay* 150 pertanyaan (`Q1–Q50` + `Q101–Q200`) pada `m025-815` dan audit mendalam per kata (`deep-pedagogy-smell-audit.mjs` + inspeksi langsung endpoint Cloudflare Worker `https://api.fiezel.my.id/api/voice/whiteboard-stream`), ditemukan empat celah spesifik yang wajib dituntaskan hingga 100% sempurna:

1. **Penyaringan Skema Interaktif di Cloudflare Worker (`workers/api/voice/route-voice-live.js`)**:
   - Gemini berhasil memproduksi properti Sokratik (`mechanic`, `bucketZones`, `bucketChips`, `wirePairs`, `magnetTargetTokens`, `scratch*`, `seesaw*`, `dial*`, `derivationSteps`, `strikeTokens`, `socraticPrompt`, `successVoiceFeedback`, `pauseForInteraction`, `inkPalette`, `roughHatch`), namun daftar putih (*whitelist*) sanitasi objek `uiAction.whiteboardSteps` hanya menyalin properti generasi lama sehingga cangkang langkah tiba di peramban tanpa isi interaktifnya.
   - Solusi: Memperluas sanitasi tervalidasi untuk 100% properti interaktif Sokratik dan polimorfik, menambahkan inferensi otomatis `mechanic`, serta menaikkan kunci cache Worker ke `wb-v6-socratic-live` / `wb-v6-socratic`.
2. **Eliminasi Total Label *Meta-Slop* & Pemotongan Kalimat Pendek (`whiteboardDirector.ts` & `RoughScratchEngine.tsx`)**:
   - Menghapus seluruh label generik (`"Pola Inti"`, `"Contoh Tepat"`, `"Kunci 1"`, `"Bentuk Tepat"`, `"Gunakan Ini"`, `"Hindari Ini"`, `"Bagian 1 -> Bagian 2"`) dari seluruh jalur sintesis dan komponen UI (`34 -> 0` dan `21 -> 0` pada audit 150 papan).
   - Membedakan label bahasa asing (`Kalimat Alami ✓` / `Keliru (Hindari) ✕`) dari fakta sains/matematika/konsep (`Fakta Tepat ✓` / `Miskonsepsi ✕`), mewariskan kata induk pada kontras sufiks (`Adjective -ing` vs `Adjective -ed`), dan melarang pemecahan kalimat penjelasan bahasa Indonesia atau rumus pembanding `vs`/`|` ke dalam puzzle susun kata palsu.
   - Menaikkan batas pemotongan teks kata utuh pada kartu/simpul dari 32 menjadi 58–68 karakter agar penjelasan konseptual tidak terpotong di tengah kalimat.
3. **Pembersihan Judul Meta `"Langkah 0"` & Sapaan Pembuka Robotik (`boardSpeechText.ts` & `route-voice-live.js`)**:
   - Menghapus awalan `"Langkah 0:"` / `"Step 0:"` pada judul langkah (`12 -> 0`) serta kalimat basa-basi pembuka seperti `"Halo, saya Alex..."` atau `"Halo! Mari kita perbaiki pemahamanmu..."` (`2 -> 0`), baik di sisi server maupun klien.
   - Merapikan format bacaan kosakata Kanji/Hanzi (`木曜日 (もくようび · mokuyoubi)`) tanpa tanda kurung bersarang ganda.
4. **6 Parser STEM Parametrik Baru & Tata Letak *Header* Mobile**:
   - Menambahkan parser kalkulasi eksak di `synthesizePolymathStemBeats` untuk Statistika (**Mean, Median, Modus** dari deret angka murid), **Barisan Aritmatika** ($U_n$), **Luas Segitiga** ($\frac{1}{2} \cdot a \cdot t$), **Volume Tabung** ($\pi r^2 t$), **Perbandingan Berbalik Nilai** ($p_1 \cdot h_1 = p_2 \cdot h_2$), dan **Prioritas Operasi Hitung / KuKaBaTaKu** ($a + b \times c$), serta menampilkan eksplisit kedua persamaan pada judul Beat 1 **SPLDV** (`Eliminasi: $x + y = 10$ & $x - y = 4$`).
   - Merapikan tata letak *header* seluruh 8 komponen lab di `RoughScratchEngine.tsx` (`items-start`, `flex-wrap`, `overflow-x-hidden`) sehingga tombol `Lanjut ›` lapang dan bebas geser horizontal di layar ponsel `390×844`.

## 2. Bukti Pengujian Empiris (Playwright Headless Chromium)

1. **Audit Roleplay 150 Pertanyaan (`roleplay-50-questions-audit.mjs` + `roleplay-100-new-questions-audit.mjs` + `deep-pedagogy-smell-audit.mjs`)**:
   - `generic_fallback_label`: **0 / 150** (turun dari 34)
   - `generic_bagian_slots`: **0 / 150** (turun dari 21)
   - `langkah_0_meta_title`: **0 / 150** (turun dari 12)
   - `robotic_self_intro`: **0 / 150** (turun dari 2)
   - `rawLatexLeakCount`: **0 / 150**
   - `emptyParensCount`: **0 / 150**
   - `boardsWithTinyTouchTargetsCount`: **0 / 150**
   - `errorBoundaryCrashCount` & `pageErrorCount`: **0 / 150**
   - `studentPlaythroughSolved`: **100%** (68/68 papan interaktif berhasil diselesaikan otomatis oleh simulasi klik murid)
2. **Simulasi *Multi-Beat* Berurutan (`multi-beat-e2e-quiz-probe.mjs`)**:
   - Membuktikan secara empiris di peramban Chromium *mobile* (`390×844`) bahwa papan tulis berhenti pada Beat 1 (`waiting-socratic`), menunggu murid menyelesaikan interaksi Beat 1, lanjut dan berhenti kembali pada Beat 2 (`waiting-socratic`), lalu membuka kesimpulan Beat 3 setelah Beat 2 tuntas.
   - Seluruh tangkapan layar *mobile* (`m025816-mobile-1..6.png`) telah diinspeksi secara visual.

## 3. Daftar Seluruh Berkas yang Disentuh

- `workers/api/voice/route-voice-live.js`: Pelestarian penuh skema Sokratik pada `uiAction.whiteboardSteps`, inferensi otomatis `mechanic`, pembersihan `"Langkah 0"` & sapaan robotik di `runFastOpenerOnly` dan respons utama, serta kenaikan versi cache ke `wb-v6-socratic-live` / `wb-v6-socratic`.
- `features/voice-studio/src/lib/boardSpeechText.ts`: Penambahan `stripMetaStepTitle`, `stripRoboticMentorIntro` (termasuk penghapusan kalimat pembuka basa-basi `"Halo! Mari kita..."`), dan perataan kurung bacaan bersarang CJK.
- `features/voice-studio/src/lib/whiteboardDirector.ts`: 6 parser STEM parametrik baru, judul eksplisit persamaan SPLDV, pewarisan kata induk pada pasangan sufiks (`-ing vs -ed`), penghapusan total label generik *fallback*, serta pembedaan label bahasa asing vs fakta konseptual.
- `features/voice-studio/src/components/RoughScratchEngine.tsx`: Penataan ulang *header* `items-start` + `flex-wrap` di seluruh 8 komponen lab, pengamanan `overflow-x-hidden` untuk layar sempit `390px`, dan pembersihan label cadangan internal.
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`: Hasil kompilasi produksi Vite.
- `tests/snapshots/id-golden-baseline.json`: Pembaruan *baseline* teks bahasa Indonesia resmi untuk *bundle* `voice-studio`.
- Enam titik sinkronisasi versi `m025-816` melalui `node tools/bump-build.mjs`: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.

## 4. Status Kelulusan Gerbang Mutu Lokal & Utang Teknis

- Seluruh gerbang kontrak lokal (`id-golden-snapshot-test.js`, `th-ui-leak-test.js`, `curriculum-cache-version-test.js`, `gate-registry-test.js`, `bump-build.mjs --check`, dan `fiezel-guardians.mjs` `self-test`, `a9`, `a10`, `a11`, `a13`) **100% HIJAU**.
- Tidak ada permukaan terproteksi (`auth`, `onboarding`, `manifest.json`, `website`, `.github/workflows`) yang disentuh.
## 5. Perbaikan Tambahan `m025-817`: Paritas CORS Kredensial pada SSE `whiteboard-stream`

- Pada verifikasi peramban Chromium produksi tanpa *mock* terhadap `https://fiezel.my.id/app/call.html` -> `https://api.fiezel.my.id/api/voice/whiteboard-stream` (`credentials: 'include'`), ditemukan bahwa `routeVoiceWhiteboardStream` menuliskan `'access-control-allow-origin': '*'` secara statis.
- Sesuai spesifikasi Fetch/CORS W3C, peramban memblokir respons `Access-Control-Allow-Origin: *` saat `credentials: 'include'` aktif (`net::ERR_FAILED`), dan keberadaan header tersebut membuat `needsCorsHeaders()` di `workers/api/index.js` melewati penempelan `ctx.corsHeaders`.
- Mengganti `'access-control-allow-origin': '*'` dengan `...(ctx?.corsHeaders || {})` memulihkan `Access-Control-Allow-Origin: https://fiezel.my.id` + `Access-Control-Allow-Credentials: true` secara presisi pada aliran SSE papan tulis *real-time*.
