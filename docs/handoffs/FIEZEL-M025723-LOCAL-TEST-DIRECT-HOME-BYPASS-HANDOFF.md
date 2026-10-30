# FIEZEL Handoff: m025-723 Local Test Server Direct Home Dashboard Auto-Bypass

**Build ID:** `m025-723`  
**Tanggal:** 30 Oktober 2026  
**Topik:** Auto-bypass autentikasi & onboarding khusus server uji lokal (`isLocalTestServer()`) langsung ke Beranda Utama  
**Cabang:** `feat/local-bypass-m025-723`  
**Target:** `main` via PR  

---

## 1. Latar Belakang & Masalah
Pengembang membutuhkan kemudahan menguji dan meninjau UI aplikasi secara lokal tanpa harus berulang kali mengetik nama, memilih peran/kursus, atau login akun Gmail/Puter setiap kali cache/penyimpanan browser lokal dibersihkan.
Namun, aturan ketat dari owner adalah:
> *"ingat ya bypass authlogin ini hanya untuk local server test, bukan di pwa user"*

Pada implementasi sebelumnya, `authGateNeeded()` berhasil dilewati, namun `showOnboarding()` dan `askLearnerNameIfMissing()` masih mencegat saat browser berada dalam keadaan tanpa penyimpanan (*clean slate*), sehingga browser tetap tertahan di layar perkenalan / modal sebelum beranda sempat ter-render.

---

## 2. Solusi & Perubahan Teknis

### A. Guard Bertingkat pada Server Uji Lokal (`app.js`)
1. **`authGateNeeded()`**:
   - Jika `isLocalTestServer()` bernilai `true`, otomatis menyiapkan sesi murid uji (`saveSession`), menandai onboarding selesai di `localStorage` (`fiezel-onboarding-v1`), menginisialisasi state dasar (`level = 1`, `placementDone = true`, `streak = 1`, `userName = 'Pengguna Uji'`, `gems = {balance: 120}`, `view = 'home'`), dan mengembalikan `false` tanpa menampilkan modal auth.
2. **`showOnboarding()`**:
   - Menambahkan guard defensif `if (isLocalTestServer()) return null;` di awal fungsi agar perkenalan tidak pernah di-mount ke DOM di server pengujian lokal.
3. **`askLearnerNameIfMissing()`**:
   - Menambahkan guard `if (isLocalTestServer()) return false;` sehingga dialog penanya nama tidak pernah memotong alur boot di server pengujian lokal.

### B. Invarian Keamanan Produksi 100% Terjaga (Zero Production Risk)
Fungsi `isLocalTestServer()` melakukan evaluasi ketat terhadap `location.hostname` dan `location.port`:
```javascript
function isLocalTestServer(){
  try{
    if(typeof location==='undefined')return false;
    const h=location.hostname,p=location.port;
    if(h==='localhost'||h==='127.0.0.1'||h==='0.0.0.0'||h.startsWith('192.168.')||h.startsWith('10.')||h.endsWith('.local'))return true;
    if(p==='3000'||p==='3005'||p==='4173'||p==='5173')return true;
  }catch(_){}
  return false;
}
```
Pada lingkungan produksi PWA (`https://fiezel.my.id/app/`):
- `location.hostname === 'fiezel.my.id'`
- `location.port === ''` (port HTTPS default 443)
- `isLocalTestServer()` bernilai `false` 100% tanpa pengecualian. Seluruh alur autentikasi dan onboarding murid di produksi berjalan normal dan tidak terpengaruh sama sekali.

---

## 3. Bukti Pengujian Empiris (Playwright Headless)
Dijalankan probe browser Chromium Playwright terhadap server lokal `http://127.0.0.1:4173/` dengan konteks penyamaran baru tanpa data awal (`zero localStorage`):
```json
Probe evaluation result: {
  "hasAuthModal": false,
  "hasOnboarding": false,
  "appHtmlLength": 38153,
  "activeNav": "Hari ini",
  "title": "FIEZEL | Belajar Bahasa Inggris & Jepang — Indonesia & Thailand"
}
```
Hasil:
- `hasAuthModal`: `false` (Layar login tidak menghalangi)
- `hasOnboarding`: `false` (Layar perkenalan tidak menghalangi)
- `appHtmlLength`: 38,153 karakter (Beranda UI aktif ter-render sempurna)
- `activeNav`: `"Hari ini"` (Navigasi berada di dasbor Beranda)
- Tangkapan layar tersimpan: `local-bypass-verified-home.png`.

---

## 4. Hasil Pemeriksaan Gerbang Mutu Lokal (Quality Gates)
- `node tests/id-golden-snapshot-test.js` $\rightarrow$ **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js` $\rightarrow$ **PASS (HIJAU)**
- `node tests/curriculum-cache-version-test.js` $\rightarrow$ **PASS (HIJAU: 33 penegasan, build m025-723)**
- `node tests/boot-auth-verdict-test.js` $\rightarrow$ **PASS (HIJAU: 5 invarian boot terjaga)**
- `node tests/onboarding-test.js` $\rightarrow$ **PASS (HIJAU)**
- `node tests/gate-registry-test.js` $\rightarrow$ **PASS (HIJAU: 10 pass, 0 fail)**
- `node tools/bump-build.mjs --check` $\rightarrow$ **PASS (Selaras)**
- `git diff origin/main --check` $\rightarrow$ **PASS (0 whitespace error)**
