# Playbook pengujian auth FIEZEL

Auth FIEZEL menggabungkan **dua playbook**: JWT email+sandi kustom (murid & owner) dan Emergent-managed Google OAuth (murid).
Guru **tidak** mendaftar sendiri: guru masuk dengan token undangan yang dicetak owner.

## 1. Verifikasi MongoDB
```
mongosh fiezel_learning --quiet --eval 'db.users.find({role:{$in:["owner","teacher"]}},{password_hash:1,role:1,email:1}).pretty()'
mongosh fiezel_learning --quiet --eval 'db.users.getIndexes()'
```
Harus terlihat: hash bcrypt dimulai `$2b$`, index unik pada `users.email` (partial: hanya string), `users.user_id`, `user_sessions.session_token`, `teacher_invites.token`.

## 2. API (gunakan REACT_APP_BACKEND_URL untuk uji e2e)
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)

# guru: token owner
curl -s -X POST $API/api/auth/teacher/token -H 'Content-Type: application/json' \
  -d '{"token":"FZ-OWNER-2026-MASTER","name":"Bu Rina"}'
# -> body memuat access_token; pakai sebagai Bearer untuk route guru

# owner mencetak token guru
curl -s -X POST $API/api/owner/teacher-invites -H 'X-Owner-Token: FZ-OWNER-2026-MASTER' \
  -H 'Content-Type: application/json' -d '{"name":"Pak Dimas"}'

# murid: daftar & masuk
curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"murid.demo@example.com","password":"murid123","name":"Nadia","class_code":"FZ-DEMO7A"}'
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"murid.demo@example.com","password":"murid123"}'

# sesi
curl -s $API/api/auth/me -H "Authorization: Bearer $TOKEN"
```
Yang harus benar:
* token guru salah → 401 dengan pesan bahasa Indonesia.
* 5 kali gagal login murid → 429 (lockout 15 menit) pada kombinasi ip+email yang sama.
* route guru dipanggil dengan token murid → 403.
* murid hanya bisa melihat paspor/evidence miliknya sendiri (403 untuk `student_id` lain).

## 3. Google (Emergent-managed)
* Halaman `/misi.html` → tombol **Masuk dengan Google** mengarah ke `https://auth.emergentagent.com/?redirect=<origin>/misi.html`.
* Kembali dengan `#session_id=…`; frontend mendeteksi fragmen **sebelum** cek sesi lama, lalu memanggil `POST /api/auth/google/session`.
* Backend menukar `session_id` di `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` (header `X-Session-ID`) dan menyimpan `session_token` 7 hari di `user_sessions` + cookie httpOnly.
* Uji tanpa akun Google nyata: sisipkan user + `user_sessions` manual, lalu panggil API dengan header `X-Session-Token: <token>` atau cookie `session_token`.

```
mongosh fiezel_learning --quiet --eval '
var uid="user_test"+Date.now(), tok="test_session_"+Date.now();
db.users.insertOne({user_id:uid,email:"g."+Date.now()+"@example.com",name:"Google Test",role:"student",provider:"google",class_ids:[],created_at:new Date()});
db.user_sessions.insertOne({user_id:uid,session_token:tok,expires_at:new Date(Date.now()+7*864e5),created_at:new Date()});
print(tok);'
```

## 4. Halaman ber-gerbang
* `/kurikulum.html` tanpa sesi → layar token guru (`data-testid="teacher-login-btn"`).
* `/misi.html` tanpa sesi → layar masuk/daftar murid (`data-testid="login-btn"`, `register-btn`, `google-btn`).
* Setelah masuk, `GET /api/auth/me` adalah sumber kebenaran; frontend tidak menebak dari cookie.
