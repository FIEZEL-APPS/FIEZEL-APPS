#!/usr/bin/env python3
"""tools/dev/api-qa/run_backend.py — SUITE QA backend FastAPI (`backend/`).

Jalankan dari akar repo (butuh paket uji: fastapi, starlette, httpx, bcrypt,
pyjwt, python-dotenv, email-validator, mongomock_motor):

    python3 tools/dev/api-qa/run_backend.py
    python3 tools/dev/api-qa/run_backend.py --json

Transport IN-PROCESS: MongoDB diganti `mongomock_motor` (ditambal SEBELUM `db`
diimpor), lalu `server.app` diuji lewat Starlette TestClient. Tidak ada jaringan,
tidak ada Mongo sungguhan. Login lewat SATU pintu produksi: tiket KelasKu yang
ditandatangani di sini dengan kunci yang sama (persis seperti smoke_test.py).

Lingkup mengikuti brief QA: contract, boundary/negative (SQLi/XSS/kosong/tipe
salah), auth & RBAC/IDOR (lintas murid/guru/owner), concurrency/idempotency,
dan kebocoran error. Keluar kode 2 bila ada temuan HIGH/CRITICAL.
"""
import os
import sys
import json
import time
import uuid
import importlib
import traceback

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BACKEND = os.path.join(REPO_ROOT, "backend")
sys.path.insert(0, BACKEND)

TICKET_KEY = "qa-curriculum-ticket-key-" + "k" * 24  # >= 32 char (bootstrap menuntutnya)
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "fiezel_qa")
os.environ.setdefault("JWT_SECRET", "qa-jwt-secret-" + "j" * 40)
os.environ.setdefault("CURRICULUM_TICKET_KEY", TICKET_KEY)
os.environ.setdefault("CORS_ORIGINS", "https://fiezel.my.id")

# --- Tambal motor dengan mongomock SEBELUM db.py diimpor -------------------
try:
    import mongomock_motor
    import motor.motor_asyncio as _motor
    _motor.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
except Exception as e:  # noqa
    print("GAGAL menyiapkan mongomock_motor:", e, file=sys.stderr)
    print("pip install mongomock_motor motor fastapi starlette httpx bcrypt pyjwt python-dotenv email-validator", file=sys.stderr)
    sys.exit(3)

from starlette.testclient import TestClient  # noqa: E402
import kelasku  # noqa: E402

TICKET_VERSION = getattr(kelasku, "TICKET_VERSION")
TICKET_AUDIENCE = getattr(kelasku, "TICKET_AUDIENCE")


def ticket(sub, role, name, ttl=120, **over):
    now = int(time.time())
    payload = {"v": TICKET_VERSION, "aud": TICKET_AUDIENCE, "sub": sub, "role": role,
               "name": name, "iat": now, "exp": now + ttl, "jti": f"{sub}-{uuid.uuid4().hex}"}
    payload.update(over)
    return kelasku.sign_ticket(TICKET_KEY, payload)


# ---------------------------------------------------------------------------
matrix = []    # (endpoint, test, pass, expected, got, detail)
findings = []  # (severity, endpoint, title, payload, detail)
SEV = dict(CRIT="CRITICAL", HIGH="HIGH", MED="MEDIUM", LOW="LOW", INFO="INFO")


def rec(endpoint, test, ok, expected, got, detail=""):
    matrix.append((endpoint, test, bool(ok), str(expected), str(got), detail))
    return ok


def finding(sev, endpoint, title, payload="", detail=""):
    findings.append((sev, endpoint, title, str(payload), detail))


SQLI = ["x' OR '1'='1", "'; DROP TABLE users;--", "admin'--",
        "{'$ne': None}", '{"$gt": ""}', "' UNION SELECT NULL--"]
XSS = ["<script>alert(1)</script>", '"><img src=x onerror=alert(1)>', "javascript:alert(document.cookie)"]
NOSQLI = [{"$ne": None}, {"$gt": ""}, {"$regex": ".*"}]  # operator injection via JSON

LEAK_RE = __import__("re").compile(
    r"Traceback|File \"/|site-packages|motor\.|pymongo|mongomock|"
    r"JWT_SECRET|CURRICULUM_TICKET_KEY|/home/user/|\.py\", line|bcrypt|"
    r"AsyncIOMotor|KeyError|AttributeError|TypeError|ValueError", __import__("re").I)


def scan_leak(endpoint, label, resp, payload=""):
    body = resp.text or ""
    if LEAK_RE.search(body):
        sev = SEV["HIGH"] if resp.status_code >= 500 else SEV["MED"]
        finding(sev, endpoint, f"Kebocoran detail internal di body ({label})", payload,
                f"status={resp.status_code} cuplikan={body[:180]!r}")
        rec(endpoint, f"leak:{label}", False, "no internal detail", "LEAK", body[:100])
        return False
    return True


def hdr(tok):
    return {"Authorization": "Bearer " + tok}


# ---------------------------------------------------------------------------
def build_app():
    # server mengimpor db + seluruh router; startup event menyemai kurikulum.
    server = importlib.import_module("server")
    client = TestClient(server.app)  # memicu lifespan startup -> ensure_indexes + seed
    return server, client


def login(client, sub, role, name, class_code=None):
    body = {"ticket": ticket(sub, role, name)}
    if class_code:
        body["class_code"] = class_code
    r = client.post("/api/auth/kelasku", json=body)
    if r.status_code != 200:
        return None
    return r.json().get("access_token")


# ========================= 1. CONTRACT =====================================
def suite_contract(client):
    r = client.get("/api/health")
    rec("/api/health", "health 200 + shape", r.status_code == 200 and "ok" in r.json(),
        "200 {ok}", r.status_code)

    # Pintu tunggal: login tiket guru sah -> 200 + access_token.
    tok = login(client, "sub_contract_teacher", "teacher", "Bu Rina")
    rec("/api/auth/kelasku", "valid ticket -> 200 token", bool(tok), "token", "ok" if tok else "FAIL")

    # Rute tak dikenal -> 404.
    r = client.get("/api/nope-xyz")
    rec("/api/nope-xyz", "unknown -> 404", r.status_code == 404, 404, r.status_code)

    # Metode salah -> 405.
    r = client.delete("/api/health")
    rec("/api/health", "wrong method -> 405", r.status_code == 405, 405, r.status_code)
    return tok


# ========================= 2. NEGATIVE / BOUNDARY ===========================
def suite_negative(client, teacher_tok):
    # body kosong {} pada POST ber-skema -> 4xx (validasi), bukan 5xx.
    for path, auth in [("/api/auth/kelasku", None), ("/api/classes", teacher_tok),
                       ("/api/questions", teacher_tok), ("/api/learning/events", teacher_tok)]:
        h = hdr(auth) if auth else {}
        r = client.post(path, json={}, headers=h)
        rec(path, "empty {} no-5xx", r.status_code < 500, "<500", r.status_code)
        scan_leak(path, "empty", r, "{}")

    # tipe salah: string di tempat objek / angka di tempat string.
    bad_bodies = ['"juststring"', "12345", "[1,2,3]", "null", "true"]
    for path in ["/api/auth/kelasku", "/api/classes"]:
        for raw in bad_bodies:
            r = client.post(path, content=raw, headers={"content-type": "application/json",
                                                        **(hdr(teacher_tok) if path != "/api/auth/kelasku" else {})})
            rec(path, f"type {raw[:8]} no-5xx", r.status_code < 500, "<500", r.status_code)
            scan_leak(path, "typed", r, raw)

    # SQLi / NoSQLi / XSS ke tiket + field kelas.
    for bad in SQLI + XSS:
        r = client.post("/api/auth/kelasku", json={"ticket": bad})
        rec("/api/auth/kelasku", f"inject ticket {bad[:16]}", r.status_code in (401, 422) and r.status_code < 500,
            "401/422", r.status_code)
        scan_leak("/api/auth/kelasku", "inject", r, bad)
    # NoSQL operator injection pada class_code (harus ditolak oleh pydantic str, bukan dieksekusi).
    for inj in NOSQLI:
        r = client.post("/api/auth/kelasku", json={"ticket": ticket("s_nosqli", "student", "X"),
                                                   "class_code": inj})
        rec("/api/auth/kelasku", f"nosql class_code {str(inj)[:16]}", r.status_code < 500, "<500", r.status_code)
        scan_leak("/api/auth/kelasku", "nosql", r, str(inj))

    # join-class dengan kode XSS/SQLi -> 404 bersih, tidak 5xx.
    stok = login(client, "s_neg_join", "student", "Cici")
    if stok:
        for bad in SQLI + XSS:
            r = client.post("/api/auth/join-class", json={"code": bad}, headers=hdr(stok))
            rec("/api/auth/join-class", f"bad code {bad[:12]}", r.status_code < 500, "<500", r.status_code)
            scan_leak("/api/auth/join-class", "code", r, bad)


# ========================= 3. AUTH / RBAC / IDOR ============================
def suite_auth(client):
    # (1) tanpa token -> 401 pada rute terlindung.
    for method, path in [("get", "/api/auth/me"), ("get", "/api/learning/passport"),
                         ("post", "/api/classes"), ("get", "/api/assessments"),
                         ("get", "/api/owner/overview")]:
        r = getattr(client, method)(path, **({"json": {}} if method == "post" else {}))
        ok = r.status_code in (401, 403, 404, 422)
        rec(path, f"{method} no-token rejected", ok and r.status_code != 200, "not 200", r.status_code)
        if r.status_code == 200:
            finding(SEV["HIGH"], path, "Rute terlindung 200 tanpa token", "(none)", "status=200")

    # (2) token JWT palsu / tanda tangan salah -> 401.
    import jwt as _jwt
    forged = _jwt.encode({"sub": "ghost", "role": "owner", "type": "access",
                          "exp": int(time.time()) + 999}, "WRONG-SECRET", algorithm="HS256")
    r = client.get("/api/auth/me", headers=hdr(forged))
    rec("/api/auth/me", "forged JWT rejected", r.status_code == 401, 401, r.status_code)
    if r.status_code == 200:
        finding(SEV["CRIT"], "/api/auth/me", "JWT tanda tangan salah diterima", forged[:24], "status=200")

    # (3) tiket kedaluwarsa / aud salah / tanda tangan salah -> 401 identik (anti-oracle).
    bodies = {
        "expired": {"ticket": ticket("s_exp", "student", "E", ttl=-9999)},
        "bad_aud": {"ticket": ticket("s_aud", "student", "A", aud="wrong-aud")},
        "bad_sig": {"ticket": ticket("s_sig", "student", "S")[:-4] + "aaaa"},
        "bad_ver": {"ticket": ticket("s_ver", "student", "V", v=999)},
    }
    seen = set()
    for label, b in bodies.items():
        r = client.post("/api/auth/kelasku", json=b)
        rec("/api/auth/kelasku", f"reject {label} -> 401", r.status_code == 401, 401, r.status_code)
        seen.add((r.status_code, r.text))
        scan_leak("/api/auth/kelasku", label, r, label)
    rec("/api/auth/kelasku", "rejections are identical (anti-oracle)", len(seen) == 1, "1 shape", len(seen),
        "; ".join(sorted({t for _, t in seen}))[:120])
    if len(seen) != 1:
        finding(SEV["LOW"], "/api/auth/kelasku", "Pesan penolakan tiket berbeda-beda (oracle halus)", "",
                "; ".join(sorted({t for _, t in seen}))[:200])

    # (4) owner_guard: guru biasa -> 403 pada rute owner-only yang NYATA.
    teacher = login(client, "s_rbac_teacher", "teacher", "Pak Budi")
    r = client.post("/api/seed/curriculum", json={}, headers=hdr(teacher))
    rec("/api/seed/curriculum", "teacher hits owner-guarded route -> 403", r.status_code == 403, 403, r.status_code)
    if r.status_code in (200, 201):
        finding(SEV["HIGH"], "/api/seed/curriculum", "Guru menembus owner_guard (RBAC)", "(teacher token)", f"status={r.status_code}")
    # Pembanding positif: owner sah boleh.
    owner = login(client, "s_rbac_owner", "owner", "Owner")
    ro = client.post("/api/seed/curriculum", json={}, headers=hdr(owner))
    rec("/api/seed/curriculum", "owner allowed on owner route", ro.status_code in (200, 201), "200/201", ro.status_code)

    # (5) IDOR murid->murid: murid A membaca event murid B lewat ?student_id=.
    a = login(client, "sub_idor_A", "student", "Ani")
    b = login(client, "sub_idor_B", "student", "Beni")
    if a and b:
        # kedua murid perlu user_id; ambil dari /me.
        ua = client.get("/api/auth/me", headers=hdr(a)).json()
        ub = client.get("/api/auth/me", headers=hdr(b)).json()
        # B menanam event unik; A lalu MENCOBA membacanya lewat ?student_id=B.
        secret_eid = "idor-probe-" + uuid.uuid4().hex[:8]
        client.post("/api/learning/events",
                    json={"type": "lesson_started", "payload": {"session_id": "s", "seq": 1}, "event_id": secret_eid},
                    headers=hdr(b))
        r = client.get("/api/learning/events", params={"student_id": ub["user_id"]}, headers=hdr(a))
        # Isolasi benar = respons A TIDAK memuat event milik B (handler memaksa sid=A).
        leaked = secret_eid in (r.text or "")
        rec("/api/learning/events", "student param cannot pull another student's data",
            not leaked, "no B data in A's view", "LEAK" if leaked else f"isolated({r.status_code})",
            "A requests ?student_id=B")
        if leaked:
            finding(SEV["HIGH"], "/api/learning/events", "IDOR: murid membaca event milik murid lain via ?student_id=",
                    ub["user_id"], f"status={r.status_code} body={r.text[:120]}")
        # murid A membaca passport murid B lewat braincore path kalau ada param.
        r2 = client.get(f"/api/braincore/passport/{ub['user_id']}", headers=hdr(a))
        rec("/api/braincore/passport/{id}", "student cannot read other's passport",
            r2.status_code in (401, 403, 404), "403/404", r2.status_code)
        if r2.status_code == 200:
            finding(SEV["HIGH"], "/api/braincore/passport/{id}", "IDOR: murid membaca paspor murid lain",
                    ub["user_id"], "status=200")

    # (6) IDOR guru->guru: guru B membaca kelas yang diampu guru A.
    ta = login(client, "sub_teacher_A", "teacher", "Guru A")
    tb = login(client, "sub_teacher_B", "teacher", "Guru B")
    if ta and tb:
        cr = client.post("/api/classes", json={"name": "Kelas Rahasia A", "grade_id": "7", "subject_id": "ENG"}, headers=hdr(ta))
        rec("/api/classes", "teacher can create own class", cr.status_code in (200, 201), "200/201", cr.status_code)
        if cr.status_code in (200, 201):
            cls = cr.json()
            cid = cls.get("id") or cls.get("class_id")
            # Guru A boleh baca kelasnya sendiri (pembanding positif).
            ra = client.get(f"/api/classes/{cid}", headers=hdr(ta))
            rec("/api/classes/{id}", "owner-teacher can read own class", ra.status_code == 200, 200, ra.status_code)
            # Guru B TIDAK boleh.
            r = client.get(f"/api/classes/{cid}", headers=hdr(tb))
            leaked = r.status_code == 200
            rec("/api/classes/{id}", "teacher cannot read other teacher's class", not leaked, "403", r.status_code)
            if leaked:
                finding(SEV["HIGH"], "/api/classes/{id}", "IDOR: guru membaca kelas milik guru lain", cid, "status=200")
            # Guru B mencoba menambah roster ke kelas A (mutasi lintas-penyewa).
            r2 = client.post(f"/api/classes/{cid}/roster", json={"names": ["Penyusup"]}, headers=hdr(tb))
            rec("/api/classes/{id}/roster", "teacher cannot mutate other's roster", r2.status_code in (403, 404), "403/404", r2.status_code)
            if r2.status_code in (200, 201):
                finding(SEV["HIGH"], "/api/classes/{id}/roster", "IDOR: guru menulis roster ke kelas guru lain", cid, f"status={r2.status_code}")


# ========================= 4. CONCURRENCY / IDEMPOTENCY =====================
def suite_concurrency(client):
    # Ticket jti sekali-pakai: tiket SAMA ditukar dua kali -> yang kedua 401.
    t = ticket("sub_replay", "student", "Replay")
    r1 = client.post("/api/auth/kelasku", json={"ticket": t})
    r2 = client.post("/api/auth/kelasku", json={"ticket": t})
    rec("/api/auth/kelasku", "ticket replay -> 2nd rejected",
        r1.status_code == 200 and r2.status_code == 401, "200 then 401",
        f"{r1.status_code}/{r2.status_code}")
    if r1.status_code == 200 and r2.status_code == 200:
        finding(SEV["HIGH"], "/api/auth/kelasku", "Tiket KelasKu bisa di-replay (jti tidak dibakar)", "", "200/200")

    # Idempotensi event: event_id stabil -> record_event dedup (stored:false kedua kali).
    # EventIn (learning.py): {type, payload, event_id}. student_id DITURUNKAN server dari
    # identitas, bukan dari body — jadi mengirim student_id/event_type akan 422 dan uji
    # TIDAK PERNAH menyentuh handler dedup (temuan Fiezel Bot v2). Pakai skema yang benar
    # dan assert dedup-nya BENAR-BENAR terjadi, bukan sekadar "< 500".
    tok = login(client, "sub_idem_student", "student", "Idem")
    if tok:
        ev = {"type": "lesson_started", "payload": {"session_id": "s1", "seq": 1},
              "event_id": "dedup-" + uuid.uuid4().hex[:8]}
        e1 = client.post("/api/learning/events", json=ev, headers=hdr(tok))
        e2 = client.post("/api/learning/events", json=ev, headers=hdr(tok))
        reached = e1.status_code == 200 and e2.status_code == 200
        j1 = e1.json() if reached else {}
        j2 = e2.json() if reached else {}
        deduped = reached and j1.get("stored") is True and j2.get("stored") is False
        rec("/api/learning/events", "duplicate event_id deduped (handler reached)",
            deduped, "stored=True then False", f"{e1.status_code}:{j1.get('stored')}/{e2.status_code}:{j2.get('stored')}")
        if reached and not deduped:
            finding(SEV["MED"], "/api/learning/events",
                    "Idempotensi event_id tidak men-dedup (handler tercapai tapi tak terdedup)",
                    ev["event_id"], f"e1={j1} e2={j2}")


# ========================= 5. LEAKS / RESILIENCE ============================
def suite_leaks(client):
    tok = login(client, "sub_leak_student", "student", "Leak")
    weird = [
        ("/api/learning/events", {"event_type": {"x": 1}, "payload": "nope"}),
        ("/api/classes", {"name": {"$ne": 1}, "grade": ["x"]}),
        ("/api/questions", {"stem": 123, "options": "not-list"}),
    ]
    for path, body in weird:
        r = client.post(path, json=body, headers=hdr(tok) if tok else {})
        rec(path, "type confusion no stack-leak", scan_leak(path, "weird", r, json.dumps(body)[:60]),
            "no leak", r.status_code)


# ---------------------------------------------------------------------------
def main():
    want_json = "--json" in sys.argv
    print("# FIEZEL FastAPI backend — QA suite (in-process, mongomock)\n")
    try:
        server, client = build_app()
    except Exception as e:
        print("GAGAL memuat server:", e, file=sys.stderr)
        traceback.print_exc()
        sys.exit(3)

    with client:
        steps = [
            ("1. Contract", lambda: suite_contract(client)),
            ("2. Boundary & negative", None),
            ("3. Auth & RBAC/IDOR", lambda: suite_auth(client)),
            ("4. Concurrency & idempotency", lambda: suite_concurrency(client)),
            ("5. Error leaks & resilience", lambda: suite_leaks(client)),
        ]
        teacher_tok = None
        for name, fn in steps:
            sys.stdout.write(f"## {name} ... ")
            try:
                if name.startswith("1."):
                    teacher_tok = fn()
                elif name.startswith("2."):
                    suite_negative(client, teacher_tok or login(client, "sub_neg_teacher", "teacher", "Neg"))
                else:
                    fn()
                print("selesai")
            except Exception as e:
                print("GAGAL HARNESS")
                finding(SEV["INFO"], "(suite)", f"Harness error di {name}", "", str(e))
                traceback.print_exc()

    fails = [m for m in matrix if not m[2]]
    print(f"\n## Matriks: {len(matrix)} pemeriksaan, {len(matrix) - len(fails)} PASS, {len(fails)} FAIL")
    for ep, test, _ok, exp, got, det in fails[:80]:
        print(f"  FAIL  {ep}  [{test}]  harap={exp} dapat={got}  {det}")

    order = [SEV["CRIT"], SEV["HIGH"], SEV["MED"], SEV["LOW"], SEV["INFO"]]
    findings.sort(key=lambda f: order.index(f[0]) if f[0] in order else 99)
    print(f"\n## Temuan: {len(findings)}")
    for sev, ep, title, payload, det in findings:
        print(f"  [{sev}] {ep} — {title}")
        if payload:
            print(f"         payload: {payload[:100]}")
        if det:
            print(f"         {det}")

    out = {
        "mode": "in-process-mongomock", "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checks": len(matrix), "passed": len(matrix) - len(fails), "failed": len(fails),
        "findings": [{"severity": s, "endpoint": e, "title": t, "payload": p, "detail": d} for s, e, t, p, d in findings],
        "matrix": [{"endpoint": e, "test": t, "pass": o, "expected": x, "got": g, "detail": d}
                   for e, t, o, x, g, d in matrix],
    }
    try:
        with open(os.path.join(REPO_ROOT, "reports", "api-qa-backend-results.json"), "w") as f:
            json.dump(out, f, indent=2)
        print("\nJSON -> reports/api-qa-backend-results.json")
    except Exception:
        pass
    if want_json:
        print(json.dumps(out, indent=2))

    severe = sum(1 for s, *_ in findings if s in (SEV["CRIT"], SEV["HIGH"]))
    sys.exit(2 if severe else 0)


if __name__ == "__main__":
    main()
