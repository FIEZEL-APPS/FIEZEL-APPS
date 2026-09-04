# Test Credentials

Tidak ada akun server yang bisa dipakai di lingkungan pratinjau ini (API produksi `api.fiezel.my.id` menolak origin selain fiezel.my.id).

## Mode pratinjau Ruang Guru (UI-only, host pengembangan saja)
- Buka: `<PREVIEW_URL>/?teacher=preview` → flag `fz-teacher-preview=1` tersimpan di sessionStorage.
- Lalu jalankan `go('tutor')` (tombol "Ruang Guru" di Home juga muncul), atau langsung di console: `window.go('tutor')`.
- Splash/onboarding murid bisa dilewati dengan memilih bahasa; atau hapus elemen `.fiezel-splash,.fiezel-ob,.fz-tour`.
- Di produksi (fiezel.my.id / github.io) flag ini TIDAK berlaku; peran guru datang dari server (`FiezelAccount.role()==='teacher'`).

## Data
- Semua data Ruang Guru lokal: localStorage key `fiezel-teacher-v1`.
- Kelas contoh: tombol "Coba dengan kelas contoh (18 siswa)" (`data-testid="tg-welcome-demo"`).
