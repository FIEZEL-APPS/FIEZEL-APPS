# PROTOKOL PELENGKAP — Sistem Orkestrasi FIEZEL

> Dokumen ini melengkapi arsitektur yang sudah ada (Agent 5 Coordinator →
> Agent 1-4 Worker Pool → Integrate → Test → Verifier → Remediation →
> Final Report). Arsitekturnya sudah benar; dokumen ini mengisi bagian
> yang tadinya kosong: **format konkret** yang dipakai di tiap titik
> serah-terima, supaya tidak ada ruang untuk klaim tanpa bukti, kerja di
> luar scope, atau regresi yang lolos tanpa ketahuan — pola kegagalan
> yang sudah tiga kali terjadi di FIEZEL sebelum sistem ini dibangun.
>
> Empat bagian di bawah ini masing-masing menutup satu titik lemah:
> 1. **Scope-lock** — menutup celah worker kerja di luar yang diminta.
> 2. **Context-injection** — menutup celah worker mendiagnosis ulang atau lari ke root cause yang salah.
> 3. **Checklist Verifier** — menutup celah klaim "selesai" diterima tanpa bukti dan tanpa cek regresi.
> 4. **Kriteria selesai Coordinator** — menutup celah "selesai" yang subjektif.

---

## 1. SCOPE-LOCK — Format Wajib Saat Agent 5 Delegasi ke Agent 1-4

Setiap task yang di-assign ke worker manapun (Agent 1-4 atau Squad
Member lewat `TASKS-LEDGER.json`) **wajib** memakai format ini. Task
yang tidak lengkap field-nya **ditolak oleh worker sendiri** — worker
tidak boleh mulai kerja dari instruksi yang longgar.

```yaml
task_id: <unique>
assigned_to: <agent_id>
scope:
  files_allowed:        # daftar eksplisit, bukan direktori umum
    - features/neural-voice/fiezel-neural-voice-ios-cache-fix.js
  functions_allowed:    # kalau berlaku, sebutkan fungsi spesifik
    - prepare()
  files_forbidden:      # eksplisit, bukan "yang lain"
    - NEURAL-VOICE-SOURCE-LOCK.json
    - fiezel-neural-voice-bootstrap.js (kontrak publik FiezelVoiceRuntime)
objective: >
  <satu kalimat, tanpa ambiguitas, tentang apa yang harus berubah
  dan gejala apa yang harus hilang>
forbidden_actions:
  - "Jangan tambah file baru di luar yang disebutkan di scope"
  - "Jangan ubah pendekatan/strategi tanpa lapor ke Coordinator dulu"
  - "Jangan diagnosis ulang root cause -- lihat root_cause_context"
done_when:
  - <kriteria konkret #1, harus bisa diverifikasi objektif>
  - <kriteria konkret #2>
evidence_required:
  - diff kode aktual (git diff, bukan deskripsi)
  - hasil eksekusi test/uji manual (log/output nyata)
```

**Aturan keras:** kalau selama pengerjaan worker menemukan sesuatu di
luar `files_allowed` yang menurutnya perlu diubah juga — **worker
berhenti, laporkan ke Agent 5, tunggu task baru.** Tidak ada
"sekalian dibenerin". Ini yang mencegah insiden `ios-cache-fix.js`
menambahkan file `audibility-fix.js` yang tidak diminta.

Kalau dua worker paralel (Agent 1 & Agent 2) punya `files_allowed` yang
beririsan — Agent 5 **wajib** mencegah ini di tahap PLANNING, bukan
diselesaikan belakangan di tahap INTEGRATE lewat merge conflict.

---

## 2. CONTEXT-INJECTION — Format Wajib Saat Ada Root Cause yang Sudah Diketahui

Kalau sebuah bug punya sejarah (root cause sudah pernah ditemukan di
sesi/task sebelumnya), Agent 5 **wajib** menyuntikkan blok ini ke setiap
worker yang di-assign — supaya worker tidak mengulang investigasi dari
nol atau (lebih buruk) menyimpulkan root cause yang berbeda dan
mengerjakan solusi yang salah arah.

```yaml
root_cause_context:
  status: CONFIRMED   # CONFIRMED | SUSPECTED | UNKNOWN
  summary: >
    <root cause dalam 1-3 kalimat>
  evidence: >
    <bukti konkret yang sudah ditemukan -- file, baris, hasil test>
  previously_attempted_fixes:
    - attempt: "<ringkasan percobaan sebelumnya>"
      result: "GAGAL -- <kenapa gagal, spesifik>"
  do_not_repeat:
    - "<pendekatan yang sudah terbukti tidak menyelesaikan masalah>"
```

**Aturan keras:** kalau `status: CONFIRMED`, worker **dilarang**
menghabiskan waktu re-investigasi dari nol. Kalau worker punya alasan
kuat untuk meragukan root cause yang CONFIRMED, dia harus mengajukan itu
ke Agent 5 sebagai temuan baru **sebelum** mengubah pendekatan — bukan
diam-diam mengganti strategi.

**Contoh isi untuk task Neural Voice FIEZEL saat ini:**
```yaml
root_cause_context:
  status: CONFIRMED
  summary: >
    WASM Neural Voice adalah varian threaded, wajib butuh
    SharedArrayBuffer (self.crossOriginIsolated === true), yang hanya
    aktif kalau response dokumen punya header
    Cross-Origin-Opener-Policy: same-origin dan
    Cross-Origin-Embedder-Policy: require-corp. Header ini sebelumnya
    tidak ada di manapun dalam konfigurasi hosting/service worker.
  evidence: >
    Grep ke seluruh repo (.github/workflows/*.yml, sw.js) tidak
    menemukan header ini di percobaan pertama dan kedua.
  previously_attempted_fixes:
    - attempt: "Set wasmEnv.numThreads=1 saat crossOriginIsolated false"
      result: >
        GAGAL -- mengubah config JS tidak mengganti file binary WASM
        yang dimuat; binary threaded tetap butuh SharedArrayBuffer
        untuk instantiate, terlepas dari numThreads.
    - attempt: "Tambah ios-cache-fix.js untuk priming asset lebih awal"
      result: >
        GAGAL + REGRESI BARU -- tidak menyentuh root cause, dan langkah
        priming tanpa timeout menyebabkan tombol download macet total.
  do_not_repeat:
    - "Mengubah numThreads atau config env lain tanpa mengganti binary/header"
    - "Menambah langkah caching baru tanpa timeout eksplisit"
  fix_applied_this_round: >
    sw.js sudah disuntik header COOP/COEP + pembungkusan CORP untuk
    js.puter.com. ios-cache-fix.js sudah diberi timeout 45 detik
    (PRIME_TIMEOUT_MS = 45.000 ms; lihat fiezel-neural-voice-ios-cache-fix.js:21).
    Catatan sinkronisasi M-017/T-019 (2026-08-14): teks sebelumnya menyebut
    "25 detik" — dikoreksi agar selaras dengan kode (45.000 ms).
    STATUS: BELUM ADA KONFIRMASI TERUJI dari user di device asli.
```

---

## 3. CHECKLIST VERIFIER — Wajib Dijalankan Sebelum Status VERIFIED

Verifier sudah didesain benar (tidak boleh ubah source, cek kode & test
& CI). Ini checklist konkret yang harus dijalankan **satu per satu**,
bukan sekadar "jalankan test lalu lihat hasilnya":

```
[ ] 1. DIFF CHECK
      Apakah semua file yang berubah ada di dalam files_allowed task
      ini? Kalau ada file di luar itu -> REFUTED, alasan: out-of-scope change.

[ ] 2. EVIDENCE CHECK
      Apakah worker menyertakan hasil eksekusi test/uji NYATA (bukan
      "seharusnya berhasil")? Tidak ada bukti eksekusi -> UNVERIFIED,
      bukan VERIFIED, sampai bukti disediakan.

[ ] 3. OBJECTIVE CHECK
      Apakah semua item di done_when task ini terbukti tercapai secara
      spesifik, satu per satu? Tidak boleh "kebanyakan sudah" -> semua
      atau REFUTED.

[ ] 4. REGRESSION CHECK  <-- paling sering dilewatkan, JANGAN dilewati
      Jalankan test/skenario pada fitur-fitur yang SEBELUMNYA sudah
      berhasil (bukan cuma fitur yang baru diperbaiki). Untuk FIEZEL:
      minimal cek ulang bahwa (a) browser TTS fallback tetap jalan,
      (b) asset validation tetap tidak false-positive, (c) tidak ada
      loop stuck baru di UI manapun yang terpengaruh perubahan ini.
      Regresi baru ditemukan -> REFUTED, walau objective utama tercapai.

[ ] 5. FORBIDDEN-ACTION CHECK
      Apakah ada larangan eksplisit di task (forbidden_actions,
      files_forbidden) yang dilanggar? Sekecil apa pun -> REFUTED
      otomatis, tanpa pengecualian, tanpa mempertimbangkan apakah
      pelanggaran itu "membantu".

[ ] 6. CI CHECK
      Apakah pipeline CI (kalau ada) benar-benar hijau, bukan di-skip
      atau di-override manual oleh worker?
```

Output Verifier wajib salah satu dari tiga, tidak ada status lain:

| Status | Syarat |
|---|---|
| **VERIFIED** | Semua 6 poin di atas lolos |
| **REFUTED** | Ada bukti konkret yang gagal (sebutkan poin mana) |
| **UNVERIFIED** | Bukti belum cukup untuk memutuskan — kembalikan ke worker untuk melengkapi, JANGAN ditebak jadi VERIFIED atau REFUTED |

Verifier melaporkan hasil ke Agent 5 dengan format:
```
STATUS: VERIFIED | REFUTED | UNVERIFIED
task_id: <id>
checklist_result:
  diff_check: PASS/FAIL - <detail>
  evidence_check: PASS/FAIL - <detail>
  objective_check: PASS/FAIL - <detail>
  regression_check: PASS/FAIL - <detail>
  forbidden_action_check: PASS/FAIL - <detail>
  ci_check: PASS/FAIL - <detail>
reasoning: <kenapa status ini diberikan, rujuk poin checklist yang gagal kalau REFUTED/UNVERIFIED>
```

---

## 4. KRITERIA "SELESAI" — Wajib Dipakai Agent 5 di Tahap FINAL REPORT

Agent 5 **tidak boleh** menyatakan task selesai ke user hanya karena
Verifier mengembalikan VERIFIED untuk satu putaran. Sebelum menulis
FINAL REPORT, Agent 5 wajib cek:

```
[ ] Apakah SEMUA subtask dari tahap PLANNING berstatus VERIFIED
    (bukan sebagian VERIFIED, sebagian masih UNVERIFIED yang
    "keburu dilaporkan" karena waktu)?
[ ] Kalau original request punya beberapa gejala terkait (contoh:
    "suara tidak keluar" + "tombol stuck" + "reload minta download
    ulang") -- apakah status masing-masing gejala disebutkan
    terpisah di laporan, bukan disimpulkan jadi satu kalimat umum
    "sudah diperbaiki"?
[ ] Apakah ada regresi yang ditemukan Verifier selama proses --
    dan kalau ada, apakah itu disebutkan eksplisit ke user, bukan
    disembunyikan karena task utamanya sudah VERIFIED?
[ ] Apakah laporan membedakan dengan jelas: (a) yang sudah
    diverifikasi lolos test otomatis, vs (b) yang masih butuh
    konfirmasi manual dari user di device asli (relevan untuk bug
    FIEZEL yang sifatnya device/browser-specific)?
```

Format FINAL REPORT ke user:
```
RINGKASAN: <1-2 kalimat, proporsional -- jangan lebih optimis dari fakta>

SELESAI & TERVERIFIKASI:
  - <item> [bukti: <ringkas>]

BELUM SELESAI / PERLU KONFIRMASI MANUAL:
  - <item> [alasan: <ringkas>]

REGRESI YANG DITEMUKAN SELAMA PROSES (kalau ada):
  - <item> [status penanganan: <ringkas>]
```

---

## 5. Ringkasan Alur dengan Titik Kontrol Ditambahkan

```
REQUEST
  ↓
ANALYZE
  ↓
PLAN  ──────────────► [cek overlap scope antar worker SEBELUM delegasi]
  ↓
DELEGATE ───────────► [wajib pakai format SCOPE-LOCK (§1) + ROOT-CAUSE CONTEXT (§2)]
  ↓
PARALLEL WORK
  ↓
INTEGRATE
  ↓
TEST
  ↓
VERIFY ─────────────► [wajib checklist 6 poin (§3), output VERIFIED/REFUTED/UNVERIFIED]
  ↓
┌────────────────────────────┐
│ VERIFIED     → lanjut       │
│ REFUTED      → REWORK       │──→ TEST → VERIFY (ulangi checklist penuh, bukan cek sebagian)
│ UNVERIFIED   → lengkapi bukti, JANGAN dipaksa jadi salah satu│
└────────────────────────────┘
  ↓
Agent 5 cek KRITERIA SELESAI (§4) untuk SEMUA subtask
  ↓
FINAL REPORT (format §4)
  ↓
USER
```

---

*Dokumen ini bersifat pelengkap protokol, bukan pengganti arsitektur
yang sudah ada. Agent 5 dan Verifier membaca ulang dokumen ini di
setiap sesi baru sebelum memproses request terkait FIEZEL.*
