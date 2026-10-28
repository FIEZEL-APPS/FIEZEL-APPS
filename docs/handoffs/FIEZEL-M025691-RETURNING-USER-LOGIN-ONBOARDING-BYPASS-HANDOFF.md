# FIEZEL-M025691 — Bypass Onboarding Pengguna Kembali (Gmail / Akun Lama) Langsung ke Beranda (`m025-691`)

**Status:** Siap review OWNER & Merge via Pull Request.  
**Build:** `m025-691` (Hexa-Sync Selaras).

---

## 1. Ringkasan Permasalahan & Temuan Audit

### Keluhan & Pertanyaan OWNER:
> *"Coba kamu cek apakah setelah user telah melakukan logout ataupun mendaftar pakai akun GMAIL, saat mereka masuk kembali, misalnya mereka sudah keluar nih menggunakan akun A, sudah keluar dari aplikasi FIEZEL ataupun menghapus atau login di HP lain, kemudian saat mereka login di HP baru menggunakan email yang sama akun A yang tadi, apakah akan masuk lagi ke onboarding atau langsung ke homepage ataupun ke landing page FIEZEL langsung ke beranda? Coba kamu cek."*

### Akar Masalah Teknis (Sebelum Perbaikan):
1. **Penyimpanan Status Onboarding Terisolasi di LocalStorage:**
   Flag penyelesaian onboarding (`fiezel-onboarding-v1`) sebelumnya hanya tersimpan di `localStorage` lokal klien tanpa dipulihkan dari server saat login.
2. **Perilaku di HP Baru / Setelah Hapus Data:**
   Saat membuka aplikasi di HP baru, `localStorage` kosong (`completed(env) === false`). Walaupun user berhasil login dengan akun Gmail lama via `FiezelAuthScreen`, boot `proceed()` tetap memanggil `showOnboarding()` karena `onboardingDone` telah dievaluasi `false` saat inisialisasi awal.
3. **Penyebab Mengulang Onboarding:**
   User lama dipaksa mengulang dialog perkenalan 6 langkah (*"Halo! Aku Mochi. Nama kamu siapa?"*, pilih kursus, pilih tujuan, dan tes penempatan) alih-alih langsung masuk ke Beranda (Homepage).

---

## 2. Perubahan Solusi

1. **`features/onboarding/fiezel-onboarding.js`:**
   - Mengekspos fungsi `markCompleted: markCompleted` pada objek return pabrik global `FiezelOnboarding` agar dapat dipanggil secara resmi oleh modul autentikasi dan boot.
2. **`features/auth/fiezel-auth-screen.js`:**
   - Menambahkan metadata konteks login ke fungsi `finish(detail)`:
     - `action: ui.screen` (`'masuk'` vs `'daftar'`)
     - `isNew: daftar` / `res.linked === true`
     - `handle` / `email`
3. **`app.js` (`showAuthGate` & `proceed`):**
   - Mendeteksi apakah user yang masuk adalah murid yang kembali (`isReturningStudent`):
     - Masuk via tab/form `'masuk'`, ATAU
     - Masuk via Google/Gmail (`via === 'google'` dan bukan pendaftaran baru murni), ATAU
     - Akun yang sudah memiliki histori belajar (`state.totalAnswered > 0`, `state.placementDone`, dsb).
   - Jika terdeteksi user lama:
     - Menetapkan nama pengguna aktif secara cerdas dari `state.userName`, handle, atau username Google (mencegah popup `askLearnerNameIfMissing`).
     - Memanggil `FiezelOnboarding.markCompleted(self, { ... })` dengan detail yang valid.
   - Di `proceed()` boot FIEZEL:
     - Mengevaluasi ulang `const obComplete = self.FiezelOnboarding?.completed?.(self) === true;` sebelum memanggil `showOnboarding()`. Jika sudah `true`, onboarding dilewati 100% dan user langsung diarahkan ke Beranda (`home`).
4. **Android Asset Sync & Arbiter Build:**
   - Seluruh aset web shell disinkronkan ke `android/app/src/main/assets/public` via `tools/sync-android-assets.mjs`.
   - Build dinaikkan ke `m025-691` via `tools/bump-build.mjs`.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Chromium)

Pengujian simulasi browser nyata menggunakan skrip probe `tools/dev/probe-login-routing.js`:

```text
================================================================
AUDIT EMPIRIS: RUTE LOGIN HP BARU VS LOGOUT HP LAMA (SETELAH PERBAIKAN)
================================================================

[SKENARIO 1] Pengguna akun lama login di HP BARU (localStorage kosong)
1.1 Masuk ke form login...
1.2 Menekan submit login di HP baru...
1.3 Status antarmuka setelah login di HP Baru: {
  authVisible: false,
  authScreen: null,
  onboardingVisible: false,
  onboardingStepTitle: null,
  onboardingDoneInStorage: true,
  authSessionInStorage: '{"v":1,"signedIn":true,"at":1793147048859,"role":"murid","via":"akun"}',
  currentView: 'home'
}
===> SUKSES SKENARIO 1: Pengguna akun lama LANGSUNG KE BERANDA (view: home)!

----------------------------------------------------------------
[SKENARIO 2] LOGOUT -> LOGIN KEMBALI di HP yang SAMA
2.1 Status sesaat setelah logout: {
  authVisible: true,
  authScreen: 'welcome',
  onboardingDoneInStorage: true
}
2.2 Keadaan setelah login kembali di HP yang sama: {
  authVisible: false,
  authScreen: null,
  onboardingVisible: false,
  onboardingStepTitle: null,
  onboardingDoneInStorage: true,
  authSessionInStorage: '{"v":1,"signedIn":true,"at":1793147053258,"role":"murid","via":"akun"}',
  currentView: 'home'
}
===> SUKSES SKENARIO 2: Pengguna LANGSUNG KE BERANDA (view: home)!

----------------------------------------------------------------
[SKENARIO 3] Login via GMAIL (Google Auth) di HP BARU (Storage Kosong)
3.1 Membuka layar Masuk...
3.2 Menekan tombol login Google (Gmail)...
3.3 Keadaan setelah login Gmail di HP Baru: {
  authVisible: false,
  authScreen: null,
  onboardingVisible: false,
  onboardingStepTitle: null,
  onboardingDoneInStorage: true,
  authSessionInStorage: '{"v":1,"signedIn":true,"at":1793147064344,"role":"murid","via":"google"}',
  currentView: 'home'
}
===> SUKSES SKENARIO 3: Login GMAIL di HP Baru LANGSUNG KE BERANDA (view: home)!

----------------------------------------------------------------
[SKENARIO 4] Murid BARU mendaftar via "Daftar" di HP Baru
4.1 Status antarmuka setelah DAFTAR murid baru: {
  authVisible: false,
  authScreen: null,
  onboardingVisible: true,
  onboardingStepTitle: 'Halo! Aku Mochi. Nama kamu siapa?',
  onboardingDoneInStorage: false,
  authSessionInStorage: '{"v":1,"signedIn":true,"at":1793147074038,"role":"murid","via":"akun"}',
  currentView: 'home'
}
===> SUKSES SKENARIO 4: Murid baru tetap MASUK KE ONBOARDING (langkah: Halo! Aku Mochi. Nama kamu siapa?)!
```

---

## 4. Status Gerbang Mutu Lokal

- `node tests/auth-screen-test.js`: **11/11 PASS** (Termasuk C1, C2, C3, C4 Playwright).
- `node tests/gate-registry-test.js`: **10 PASS, 0 FAIL**.
- `node tests/id-golden-snapshot-test.js`: **100% HIJAU**.
- `node tests/th-ui-leak-test.js`: **100% PASS**.
- `node tests/curriculum-cache-version-test.js`: **PASS (build m025-691)**.
- `node tools/bump-build.mjs --check`: **Hexa-Sync Selaras (m025-691)**.
- `tools/sync-android-assets.mjs`: **Bundle integrity certified 100% PASS (787 files, 66.99 MB)**.
