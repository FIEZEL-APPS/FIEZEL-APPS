# Braincore Distributed Foundation — Audit Cloudflare Cross-Device

**Basis repo:** `main@50e9fe7cb75c7960a87e8dc99482347ff7648a34`  
**Tanggal audit:** 2026-08-31  
**Issue kanonik:** #286  
**Keputusan OWNER:** Cloudflare menjadi backend Braincore Sync + global control plane. Braincore tetap local-first/offline. Analytics anonim tetap domain terpisah.

## 1. Kesimpulan singkat

FIEZEL lebih dekat ke cross-device daripada kelihatannya, tetapi belum aman untuk langsung "upload localStorage ke cloud".

Yang sudah ada:

- state utama aplikasi sudah mempunyai `stateRevision` dan sudah dipisah menurut akun pada key `fiezel-v5-state:<uuid>`;
- Cloudflare API sudah mempunyai opaque identity `sub`, signed session/cookie, dan route `/api/user/me`;
- continuity/backup sudah mempunyai deterministic bounded merge untuk sebagian state;
- event telemetry sudah memberi preseden `eventId` UUID untuk idempotent retry;
- Braincore v3 sudah menetapkan modul matematika harus murni dan host yang memegang storage/network.

Blocker nyata sebelum cloud sync:

1. side-state Braincore masih device-global, bukan account-scoped;
2. history memakai `row.id = questionId/signature`, bukan ID attempt unik;
3. deterministic backup merge bukan algoritma concurrency canonical;
4. Cloudflare `sub` belum punya login/account bridge Cloudflare-native yang memberi `sub` sama di perangkat kedua tanpa Puter;
5. kontrak privacy saat ini secara eksplisit mengatakan full learner state tidak pernah diunggah, sehingga Brain Sync harus menjadi domain data baru yang terpisah dan eksplisit — bukan perluasan analytics.

Arsitektur yang disarankan:

```text
                         FIEZEL CLOUDFLARE

              ┌─────────────────────────────────┐
              │ Auth/session -> opaque learner  │
              │ identity (`sub`)                │
              └───────────────┬─────────────────┘
                              │ server-derived only
                              ▼
                    Durable Object / learner
                 ┌─────────────────────────────┐
                 │ canonicalRevision           │
                 │ canonical server sequence   │
                 │ append-only attempt events  │
                 │ canonical Brain checkpoint  │
                 │ device watermarks           │
                 └──────────────┬──────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
        D1 identity/index/audit        Global Brain control plane
        (bukan analytics DB)           policy + item governance

        ─────────────────────────────────────────────────────────

           iPhone / Android / Web / Tablet
                 Braincore lokal
                       │
                 IndexedDB outbox
                       │
              sync opportunistically
```

Durable Object dipilih untuk koordinasi learner karena satu learner membutuhkan serialisasi perubahan dari banyak client. Cloudflare mendokumentasikan Durable Objects sebagai primitive koordinasi stateful; SQLite-backed Durable Object storage bersifat transactional dan strongly consistent. SQLite-backed Durable Objects juga tersedia pada Workers Free, sehingga prototipe tidak otomatis mewajibkan plan berbayar.

Referensi eksternal saat audit:
- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://developers.cloudflare.com/durable-objects/platform/pricing/

## 2. Identitas: jangan buat user ID baru di payload

Ada dua identitas yang jangan dicampur:

### 2.1 Analytics identity

Kontrak analytics hari ini sengaja unlinkable lintas hari. `visitor_token` harian / aggregate telemetry tidak boleh diubah menjadi account ID, device ID stabil, atau learner ID.

**Aturan:** tabel/route analytics tidak boleh menerima field Brain Sync seperti `userId`, `deviceId`, atau learner checkpoint.

### 2.2 Brain Sync identity

Cloudflare core API sudah mempunyai `identity.sub` yang opaque. Inilah bentuk ID yang cocok untuk storage server, karena raw Puter UUID tidak perlu masuk Durable Object/D1 learner state.

**Aturan keras:** route Brain Sync menurunkan learner identity dari authenticated context (`ctx.identity.sub`). Request body tidak mempunyai field `userId`. Request dengan field itu harus ditolak sebagai foreign field, bukan diabaikan.

Masalah yang belum selesai: route `/api/auth/claim` sekarang dirancang agar perangkat kedua mengadopsi `sub` yang sama, tetapi penerbit claim-ticket masih bergantung pada worker Puter yang belum tersedia. Karena OWNER memilih Cloudflare sebagai fondasi, migrasi login/account harus menjadi lane terpisah. Sampai account identity Cloudflare-native tersedia, guest tetap local-only dan Puter dapat dipakai hanya sebagai bridge sementara bila OWNER mengizinkan.

## 3. State boundary yang benar

### 3.1 Learner-scoped / harus mengikuti akun

State berikut merepresentasikan murid, bukan perangkat:

- progress utama: level/placement, `vocab`, `grammar`, `reading`;
- attempt history dan wrong-answer evidence;
- confidence history dan learning-day evidence;
- completed session history (bukan sesi yang sedang berjalan);
- level-trust / verified level state;
- adaptive policy outcome/history yang sudah final;
- BKT mastery;
- misconception ledger;
- learner-side item calibration;
- confusion matrix;
- retention probe schedule + `userSeed`;
- OLM negotiation/dispute state;
- SRL coach state;
- learner-scoped experiment assignment pada fase autonomy nanti.

Catatan penting: item calibration lokal adalah bukti **satu learner**. Ia tidak boleh menjadi global difficulty authority. Aggregate item health global harus dihitung server-side dari banyak learner secara privacy-preserving.

### 3.2 Device-local / jangan ikut canonical learner snapshot

- current `view` dan modal/UI state;
- `activeSession` / `inflightAttempt` yang belum committed;
- audio/haptic/device preferences;
- Neural Voice model/cache/prepared runtime assets;
- Service Worker/cache metadata;
- browser notification permission dan PushSubscription;
- report endpoint + device outbox yang belum ack;
- analytics queue dan daily unlinkability anchors;
- local Brain Sync outbox yang belum di-ack server;
- generated deviceId / local device sequence counter.

Sebagian reminder policy bisa kelak account-scoped agar dua device tidak mengirim reminder ganda, tetapi browser permission/subscription tetap device-local.

### 3.3 Global / bukan learner state

- canonical Brain policy version;
- item governance registry (`candidate/active/review_required/quarantined/retired`);
- exact contentRevision eligibility;
- privacy-preserving item-health aggregate;
- global content/policy release metadata.

Global governance tidak boleh berisi history satu learner.

## 4. Defect boundary saat ini: side-state belum account-scoped

State utama sudah memakai account-specific key, tetapi side-state Braincore masih memakai key tunggal seperti:

- `fiezel-mastery-bkt-v1`
- `fiezel-misconception-ledger-v1`
- `fiezel-item-calibration-v1`
- `fiezel-confusion-matrix-v1`
- `fiezel-post-test-v1`
- `fiezel-olm-negotiation-v1`
- SRL side-state

Akibatnya, sebelum bicara cloud sekalipun, akun A dan akun B pada browser yang sama berpotensi berbagi model learner side-state.

**Fase B harus membangun satu account state boundary**. Implementasinya boleh berupa namespace per account atau satu learner envelope, tetapi callsite tidak boleh lagi membaca key global tanpa account context.

Migrasi harus satu arah dan idempoten:

1. akun aktif diketahui;
2. bila key account-scoped belum ada dan legacy side-state ada, legacy di-claim sekali oleh akun itu;
3. owner marker mencegah akun berikutnya mengambil legacy yang sama;
4. logout/account-switch mengganti semua reader/writer learner state secara atomik;
5. reset progress menghapus semua learner side-state untuk account aktif saja.

## 5. Defect concurrency saat ini: question ID bukan attempt ID

History sekarang memberi `id` dari ID/signature soal. Itu cukup untuk UI lokal, tetapi tidak cukup untuk distributed log.

Contoh:

```text
HP:      question_27 -> salah
Laptop:  question_27 -> benar
```

Keduanya adalah **dua attempt sah**. Bila keduanya memakai `id=question_27`, merge berbasis `row.id` dapat menghapus salah satu bukti.

Kontrak baru:

```text
questionId = identitas konten
attemptId  = identitas satu jawaban learner
 eventId   = identitas satu record transport/idempotency
```

Untuk event attempt v1, `attemptId` dan `eventId` UUID dibuat host memakai WebCrypto. Modul protokol tidak membuat random sendiri.

Legacy history tanpa `attemptId` membutuhkan migrasi deterministik agar backup history yang sama pada dua device tidak diberi dua ID baru. Kandidat input hash migrasi:

```text
legacy-row-id | at | type | skill | selectedIndex | ok | ms | duplicateOrdinal
```

Hash/UUID migrasi harus dibuat satu kali dan dipersistenkan. Detail final masuk Fase B.

## 6. Kenapa bukan full snapshot setiap jawaban

Komentar performa `app.js` mencatat state utama dapat berukuran sekitar ratusan KB (sekitar 716 KB pada jalur yang diaudit). Mengirim JSON penuh setiap answer memperbesar biaya, latency, battery use, dan peluang collision.

Gunakan:

```text
APPEND EVENT -> ACK/WATERMARK -> periodic CHECKPOINT
```

Bukan:

```text
ANSWER -> upload seluruh localStorage -> overwrite server
```

Checkpoint adalah akselerator/recovery point. Append-only event adalah bukti yang mencegah concurrent offline learning hilang.

## 7. Event envelope v1

Fase A memperkenalkan modul murni `features/brain/fiezel-brain-sync-protocol.js`.

Event attempt minimum:

```text
schema
 eventId          UUID transport/idempotency
 attemptId        UUID learner attempt
 deviceId         UUID device-private-to-sync-domain
 deviceSeq        monotonic per device
 baseRevision     canonical revision terakhir yang dilihat device
 questionId
 contentRevision
 domain
 level? / skill? / practiceMode?
 correct
 kappa? / predicted? / responseMs?
 occurredAt       explicit client event time, bukan ordering authority
 brainBundle?
```

Tidak ada:

```text
userId
email
name
visitorToken
answerText
selectedAnswer
free-text transcript
```

Raw answer text bisa ditambahkan hanya bila ada kebutuhan pedagogis yang tidak dapat dipenuhi evidence terstruktur dan setelah privacy review terpisah. Default v1 adalah tidak mengirimkannya.

## 8. Ordering dan konflik

Tiga angka berbeda:

- `deviceSeq`: urutan lokal untuk dedup/collision detection;
- `baseRevision`: snapshot canonical yang menjadi dasar device saat menghasilkan perubahan;
- `serverSeq`: total order canonical yang diberikan server.

`occurredAt` tidak boleh menjadi tie-break authority lintas-device karena jam device bisa salah/manipulatif.

Revision rule:

```text
baseRevision == canonicalRevision  -> APPLY
baseRevision <  canonicalRevision  -> REBASE_REQUIRED
baseRevision >  canonicalRevision  -> INVALID_FUTURE_BASE
```

Yang dilarang:

```text
serverState = payloadTerakhir
```

atau last-write-wins berbasis timestamp device.

Pada implementasi service nanti, event evidence tidak boleh dibuang hanya karena base basi. Server dapat memilih menerima event idempoten lalu melakukan deterministic rebase/replay terhadap canonical sequence, tetapi respons harus eksplisit bahwa client harus mengadopsi canonical state/revision terbaru. Tidak boleh ada silent overwrite.

## 9. Durable Object learner model

Satu opaque learner identity -> satu Durable Object instance.

Kandidat tabel SQLite internal:

```text
brain_meta
  canonical_revision
  next_server_seq
  checkpoint_revision
  checkpoint_server_seq
  checkpoint_hash
  brain_bundle

events
  server_seq PRIMARY KEY
  event_id UNIQUE
  device_id
  device_seq
  base_revision
  attempt_id
  question_id
  content_revision
  domain
  level/skill/practice_mode
  correct/kappa/predicted/response_ms
  occurred_at
  received_at
  brain_bundle
  UNIQUE(device_id, device_seq)

checkpoints
  revision
  server_seq
  state_hash
  state_blob/json (setelah Fase B learner-envelope selesai)
```

`received_at` adalah server time dan tidak dikirim ke analytics.

Durable Object ID dibentuk **server-side** dari authenticated opaque `sub`. Client tidak boleh mengirim nama object atau learner key.

## 10. Sync lifecycle device

V1 tidak membutuhkan WebSocket permanen.

Sync dilakukan ketika:

- app startup setelah identity tersedia;
- resume / `visibilitychange` kembali visible;
- setelah committed answer (debounced/batched);
- akhir sesi;
- network kembali online;
- sebelum logout/account switch bila network tersedia.

Saat offline:

1. Braincore tetap berjalan lokal;
2. committed attempt masuk IndexedDB outbox;
3. local learner state terus maju;
4. reconnect mengirim batch idempoten;
5. server mengembalikan ACK + canonical revision/checkpoint atau rebase instruction;
6. client replay event lokal belum-ack di atas canonical checkpoint.

## 11. Retention probe seed lintas-device

`userSeed` sekarang lahir acak per perangkat. Cross-device memerlukan seed learner-scoped.

Pilihan yang disarankan: generate satu random `learnerSeed` saat account Brain state pertama dibuat, simpan dalam canonical learner envelope, lalu sync ke semua device. Seed ini:

- bukan analytics identifier;
- tidak keluar ke telemetry;
- tidak dipakai untuk auth;
- hanya input deterministik jadwal/experiment learner.

Jangan menurunkannya dari email/raw account ID; tidak ada kebutuhan menambah linkability.

## 12. Guest mode

Tanpa account identity yang stabil, cross-device continuity tidak dapat dijamin.

Guest:

```text
local-only Braincore
```

Saat user membuat/masuk account, aplikasi menawarkan explicit claim/merge local progress. Jangan diam-diam menempelkan guest progress device ke account berbeda.

## 13. Account deletion dan retention

Brain Sync membuat data pribadi baru di server, berbeda dari analytics aggregate hari ini. Maka sebelum production-on harus tersedia:

- delete learner state/event/checkpoint untuk authenticated account;
- bounded event retention/compaction setelah checkpoint aman;
- no cross-domain JOIN analytics x Brain Sync;
- audit log tanpa raw learner evidence bila tidak diperlukan;
- documented data export/portability path;
- explicit product/privacy copy yang tidak lagi mengklaim seluruh progress hanya ada di localStorage setelah sync dinyalakan.

## 14. Test matrix wajib sebelum production integration

1. device A + B online bersamaan converge;
2. A offline, B online, lalu A reconnect: tidak ada attempt hilang;
3. duplicate HTTP retry: satu event canonical;
4. eventId sama dengan evidence berbeda: reject;
5. `(deviceId,deviceSeq)` sama dengan event berbeda: reject;
6. stale baseRevision: rebase, bukan overwrite;
7. future baseRevision: fail closed;
8. body mencoba `userId` account lain: schema reject + server tetap pakai auth context;
9. account switch tidak mengirim outbox account lama;
10. guest queue tidak otomatis masuk ke account tanpa explicit merge;
11. corrupt checkpoint ditolak via hash/schema;
12. deterministic replay event order -> learner state byte-identik;
13. logout/delete menghapus learner cloud state sesuai contract;
14. analytics schema tetap menolak stable identity/device fields;
15. governance quarantine exact contentRevision tersebar ke semua device;
16. client tidak dapat mengirim `independentLearners` sebagai authority global;
17. iOS resume/reconnect bekerja tanpa background WebSocket.

## 15. Urutan implementasi yang disarankan

### Phase A — protocol foundation (issue #286, current lane)
Pure schema/validation/dedup/revision/checkpoint metadata. Tidak ada wiring.

### Phase B — account learner envelope
Per-account side-state + unique/migrated attempt identity + stable learner seed.

### Phase C — Cloudflare service
Worker route + SQLite Durable Object + authenticated server-derived identity + event ledger/checkpoints.

### Phase D — offline client sync
IndexedDB outbox + resume/reconnect/replay + account isolation.

### Phase E — global control plane
Canonical Brain policy + governance registry + server-derived privacy-preserving item health.

### Setelah itu baru lanjut autonomy
N-of-1, controlled parameter surface, dan bounded self-tuning harus membaca learner state yang sudah lintas-device konsisten.

## 16. Non-goals Phase A

Phase A tidak:

- mengubah `app.js`;
- mengubah analytics;
- memindahkan data ke Cloudflare;
- mengaktifkan Durable Objects;
- mengganti auth/login;
- mengubah Braincore learner decisions;
- menjalankan Langkah 2/3 autonomy;
- menyentuh Neural Voice.

Tujuannya membuat kontrak sync cukup sempit dan bisa dibuktikan merah/hijau sebelum menyentuh production wiring.
