# FIEZEL-M025604: KAWAN BICARA FEED SCROLLING & TOUCH INTERCEPTION FIX HANDOFF

**Tanggal**: 18 Oktober 2026<br>
**Build Target**: `m025-604`<br>
**Branch**: `fix/kawan-bicara-feed-scrolling`<br>
**Status**: HIJAU / LULUS SEMUA GERBANG MUTU & AUDIT EMPIRIS PLAYWRIGHT

---

## 1. Ringkasan Temuan Audit dan Akar Masalah

Pengguna melaporkan:
> *"scrolling atas bawahnya tidak bisa"*

Melalui audit penelusuran event gesture empiris dan pengujian Playwright Chromium mobile emulation, ditemukan 3 akar masalah yang membekukan scrolling feed di Kawan Bicara:

1. **Intersepsi Touchmove oleh Global Scroll Rubber Band (`app.js:22313`)**:
   - `installScrollRubberBand()` di `app.js` memasang event listener `touchmove` dengan `{ passive: false }` pada `window`.
   - Ketika berada di layar chat (`state.view === 'chat'`), dokumen utama (`html` dan `body`) dikunci dengan `overflow: hidden; height: 100%;` untuk mencegah double scroll dan layout jumping saat keyboard muncul.
   - Karena `document.scrollingElement.scrollHeight === window.innerHeight`, nilai `scrollTop === 0` dan `maxScroll === 0`.
   - Akibatnya, setiap kali murid menggeser jari ke atas (`dy < 0`) maupun ke bawah (`dy > 0`) di layar, kondisi `scrollTop >= maxScroll - 2 && dy < 0` (0 >= -2) atau `scrollTop <= 1 && dy > 0` (0 <= 1) selalu bernilai TRUE!
   - Fungsi tersebut menganggap murid sedang melakukan rubber-banding pada ujung dokumen dan memanggil `e.preventDefault()`. Pemanggilan `preventDefault()` ini seketika **MENGGAGALKAN DAN MEMATIKAN SELURUH SCROLL NATIVE** pada elemen `.fzc-feed` di perangkat sentuh (iOS Safari & Android PWA).
   - Layar chat (`fz-view-chat`, `.fzc-container`, `.fzc-feed`) sebelumnya belum dimasukkan ke dalam daftar pengecualian `installScrollRubberBand`.

2. **Touch-Action Scoping pada Child Bubbles & Rows (`interactive-chat.css`)**:
   - Anak-anak `.fzc-feed` (`.fzc-msg-row`, `.fzc-bubble`, `.fzc-msg-box`, `.fzc-scenario-card`) tidak memiliki deklarasi `touch-action: pan-y !important`.
   - Pada browser mobile modern, sentuhan langsung pada gelembung chat besar atau kartu skenario dapat memicu gesture recognition default browser yang ragu apakah elemen tersebut boleh mengalirkan swipe ke scrolling container induknya.

3. **Flex-Basis Ambiguity & Wheel Event Propagation (`interactive-chat.css` & `fiezel-interactive-chat.js`)**:
   - `.fzc-feed` memiliki `flex: 1 1 auto; max-height: 100%`. Nilai `flex-basis: auto` dapat memicu penghitungan intrinsic height sebelum flex clamping di beberapa engine WebKit.
   - Pada desktop atau laptop dengan mouse/trackpad, kursor yang melayang di atas `.fzc-header` (yang memakan ~180px area atas layar) tidak mengalirkan event `wheel` ke `.fzc-feed`, membuat pengguna merasa scroll macet saat kursor berada di sepertiga atas layar.

---

## 2. Solusi Perbaikan Sistemik

1. **Pengecualian Mutlak Kawan Bicara dari Rubber Band Lock (`app.js`)**:
   - Menambahkan `document.body.classList.contains('fz-view-chat')` serta selector `e.target.closest('.fzc-container, .fzc-feed')` ke dalam gerbang pengecualian awal di `installScrollRubberBand()`.
   - `touchmove` pada sesi chat kini dibiarkan 100% pasif dan alami, membebaskan akselerasi hardware sentuh GPU native untuk scrolling naik dan turun tanpa gangguan.

2. **Spesifikasi CSS Flex & Touch-Action Pan-Y (`features/interactive-chat/interactive-chat.css`)**:
   - Memperbarui `.fzc-feed`: menetapkan `flex: 1 1 0px !important; min-height: 0 !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important;`.
   - Menambahkan `touch-action: pan-y !important;` secara eksplisit pada `.fzc-msg-row`, `.fzc-msg-box`, `.fzc-bubble`, `.fzc-scenario-card`, `.fzc-reveal-box`, `.fzc-shadow-box`, dan `.fzc-japanese-text`.

3. **Wheel & Touch Event Forwarding Delegation (`features/interactive-chat/fiezel-interactive-chat.js`)**:
   - Menambahkan event delegation `wheel` pada `.fzc-container`: setiap scroll roda mouse di atas header, dock, atau padding samping otomatis mengalirkan `feed.scrollTop += e.deltaY`.
   - Menambahkan touch scroll delegation pada `.fzc-header` untuk swipe vertikal yang mengalir ke `.fzc-feed`.

---

## 3. Bukti Pengujian Empiris Nyata (Playwright Mobile Emulation)

1. **`tools/dev/probe-touch-scroll-repro.mjs`** (iPhone 14 Pro Touch Emulation):
   - **Sebelum Perbaikan**:
     `touchMoveDefaultPrevented: true` -> Scroll macet total pada Y=200.
   - **Sesudah Perbaikan**:
     `touchMoveDefaultPrevented: false` -> Event touchmove tidak dibatalkan, feed bebas bergerak.
2. **`tools/dev/probe-scroll-full.mjs`** (Pixel 5 Touch & Desktop Emulation):
   - **Test 1 (Mouse Wheel Scroll on Feed)**:
     `before = 100 -> afterWheelDown = 250 -> afterWheelUp = 150` -> **PASS (LANCAR)**.
   - **Test 2 (Touch Dragging on Feed)**:
     `start = 300 -> final = 400` -> **PASS (LANCAR)**.
   - **Test 3 (Wheel event on Header Delegation)**:
     `deltaY: 80 -> feed.scrollTop updated` -> **PASS (LANCAR)**.

---

## 4. Status Gerbang Mutu Lokal & Invarian

- `tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**.
- `tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**.
- `tests/th-ui-leak-test.js`: **PASS (0 kebocoran)**.
- `tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, selaras m025-604)**.
- `tools/bump-build.mjs --check`: **Selaras (m025-604)**.
- Git Protection Rule: Wajib Pull Request ke `main`.
