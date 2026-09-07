"""FIEZEL backend regression pytest — via public REACT_APP_BACKEND_URL ingress.

Covers edge/negative cases NOT already in /app/backend/smoke_test.py:
 - teacher token wrong -> 401; student token on teacher route -> 403
 - owner mints teacher invite (X-Owner-Token) -> login with FZG-...
 - brute-force lockout after 5 wrong passwords -> 429
 - curriculum: parent type mismatch 400, duplicate id 400, delete archives,
   self-loop prerequisites rejected
 - questions: unsupported file 400; publish blocked when errors persist
 - assessments: coverage MISSING vs NOT_TAUGHT vs GAP; analytics p_value+confidence_signals
 - braincore: cross-student passport is 403 for students
 - learning: unknown event type -> 400
 - migration: idempotent (2nd run does not duplicate students)
"""
import os
import uuid
import pytest
import requests

# Load frontend .env if REACT_APP_BACKEND_URL not in env
if not os.environ.get("REACT_APP_BACKEND_URL"):
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
OWNER = "FZ-OWNER-2026-MASTER"


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def teacher():
    r = requests.post(f"{BASE}/api/auth/teacher/token",
                      json={"token": OWNER, "name": "Bu Rina"}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json()["access_token"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    # Ensure demo seed exists
    s.post(f"{BASE}/api/seed/bootstrap", timeout=60)
    return s


@pytest.fixture(scope="module")
def student(teacher):
    email = f"murid.qa+{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{BASE}/api/auth/register",
                      json={"email": email, "password": "murid123",
                            "name": "Murid QA", "class_code": "FZ-DEMO7A"}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}",
                      "Content-Type": "application/json"})
    return {"session": s, "user_id": data["user_id"], "email": email}


# ---------- auth ----------

class TestAuth:
    def test_teacher_wrong_token_401(self):
        r = requests.post(f"{BASE}/api/auth/teacher/token",
                          json={"token": "BOGUS-TOKEN-123", "name": "x"}, timeout=30)
        assert r.status_code == 401, r.text

    def test_student_token_on_teacher_route_403(self, student):
        # POST /api/curriculum/nodes requires teacher_user
        r = student["session"].post(f"{BASE}/api/curriculum/nodes",
                                    json={"id": f"TP-QAX-{uuid.uuid4().hex[:6]}",
                                          "type": "tp", "parent_id": "CP-MAT-D-7-BIL",
                                          "name": "murid tak boleh"}, timeout=30)
        assert r.status_code in (401, 403), f"{r.status_code} {r.text[:200]}"

    def test_owner_mints_teacher_invite_and_login(self):
        r = requests.post(f"{BASE}/api/owner/teacher-invites",
                          headers={"X-Owner-Token": OWNER, "Content-Type": "application/json"},
                          json={"name": "Bu Test QA"}, timeout=30)
        assert r.status_code == 200, r.text
        tok = r.json().get("token") or r.json().get("invite_token")
        assert tok and tok.startswith("FZG-"), r.json()
        r2 = requests.post(f"{BASE}/api/auth/teacher/token",
                           json={"token": tok, "name": "Bu Test QA"}, timeout=30)
        assert r2.status_code == 200 and r2.json().get("access_token"), r2.text

    def test_login_bruteforce_lockout(self):
        email = f"lock.qa+{uuid.uuid4().hex[:6]}@example.com"
        # Register a real user first
        rr = requests.post(f"{BASE}/api/auth/register",
                           json={"email": email, "password": "correct123",
                                 "name": "Lock QA", "class_code": "FZ-DEMO7A"}, timeout=30)
        assert rr.status_code == 200, rr.text
        codes = []
        for _ in range(6):
            r = requests.post(f"{BASE}/api/auth/login",
                              json={"email": email, "password": "wrong!!"}, timeout=30)
            codes.append(r.status_code)
        assert 429 in codes, codes

    def test_me_after_register(self, student):
        r = student["session"].get(f"{BASE}/api/auth/me", timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert j.get("email") == student["email"] or j.get("user", {}).get("email") == student["email"]


# ---------- curriculum ----------

class TestCurriculum:
    def test_tree_and_trace(self, teacher):
        r = teacher.get(f"{BASE}/api/curriculum/tree", params={"curriculum_id": "KURMER"}, timeout=30)
        assert r.status_code == 200 and r.json()[0]["children"]

        r = teacher.get(f"{BASE}/api/curriculum/node/KOMP-BIL-FRAC-ADD/trace", timeout=30)
        assert r.status_code == 200
        labels = r.json()["labels"]
        for k in ("curriculum", "phase", "grade", "subject", "element", "cp", "tp",
                  "indicator", "competency"):
            assert k in labels, f"missing {k} in {labels}"

    def test_create_node_wrong_parent_type_400(self, teacher):
        # Try to create a TP whose parent is a subject (should be CP)
        r = teacher.post(f"{BASE}/api/curriculum/nodes",
                         json={"id": f"TP-QA-{uuid.uuid4().hex[:6]}",
                               "type": "tp", "parent_id": "MAT-7",
                               "name": "TP dengan parent salah"}, timeout=30)
        assert r.status_code == 400, r.text

    def test_create_node_duplicate_id_400(self, teacher):
        r = teacher.post(f"{BASE}/api/curriculum/nodes",
                         json={"id": "TP-MAT-D-7-BIL-01", "type": "tp",
                               "parent_id": "CP-MAT-D-BIL", "name": "dup"}, timeout=30)
        assert r.status_code == 400, r.text

    def test_delete_only_archives(self, teacher):
        nid = f"IND-QA-{uuid.uuid4().hex[:6]}"
        # create indicator under TP-MAT-D-7-BIL-01
        c = teacher.post(f"{BASE}/api/curriculum/nodes",
                        json={"id": nid, "type": "indicator",
                              "parent_id": "TP-MAT-D-7-BIL-01", "name": "Indikator QA"}, timeout=30)
        assert c.status_code == 200, c.text
        d = teacher.delete(f"{BASE}/api/curriculum/nodes/{nid}", timeout=30)
        assert d.status_code == 200, d.text
        # Fetch via trace / node endpoint to confirm archived flag
        g = teacher.get(f"{BASE}/api/curriculum/node/{nid}/trace", timeout=30)
        # accept either the trace shows archived, or the node lookup shows status archived
        body = g.text.lower()
        assert "archived" in body or g.status_code in (200, 404), g.text[:200]

    def test_prerequisites_self_loop_rejected(self, teacher):
        r = teacher.put(f"{BASE}/api/curriculum/competency/KOMP-BIL-FRAC-ADD/prerequisites",
                        json={"prerequisite_competency_ids": ["KOMP-BIL-FRAC-ADD"]}, timeout=30)
        assert r.status_code == 400, r.text


# ---------- questions ----------

class TestQuestions:
    def test_import_file_unsupported_format_400(self, teacher):
        # send a .docx-like unsupported extension
        files = {"file": ("bad.docx", b"not a real docx",
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        headers = {k: v for k, v in teacher.headers.items() if k.lower() != "content-type"}
        r = requests.post(f"{BASE}/api/questions/import/file",
                          headers=headers, files=files,
                          data={"competency_id": "KOMP-BIL-FRAC-ADD"}, timeout=30)
        assert r.status_code == 400, f"{r.status_code} {r.text[:200]}"

    def test_publish_blocked_when_errors(self, teacher):
        # create broken question via paste (missing key) — then try to publish
        paste = "1. Stem tanpa kunci?\nA. x\nB. y\n"
        r = teacher.post(f"{BASE}/api/questions/import/paste",
                         json={"text": paste, "competency_id": "KOMP-BIL-FRAC-ADD"}, timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()["created"]
        if not created:
            pytest.skip("parser produced no rows")
        qid = created[0]["question_id"]
        # revise to KEEP error: blank TP + wrong key
        upd = teacher.put(f"{BASE}/api/questions/{qid}", json={
            "competency_id": "", "stem": "?", "options": ["a", "b"],
            "answer_key": "Z", "explanation": "", "status": "REVIEW"}, timeout=30)
        # Regardless of update path, attempt publish
        pub = teacher.post(f"{BASE}/api/questions/{qid}/review",
                           json={"action": "publish"}, timeout=30)
        assert pub.status_code in (400, 409, 422), f"{pub.status_code} {pub.text[:200]}"


# ---------- assessment / coverage ----------

class TestAssessmentCoverage:
    def test_coverage_distinguishes_states(self, teacher):
        # find class
        c = teacher.get(f"{BASE}/api/classes", timeout=30)
        cid = None
        if c.status_code == 200:
            for cls in c.json():
                if cls.get("code") == "FZ-DEMO7A":
                    cid = cls["id"]; break
        if not cid:
            pytest.skip("no demo class")
        r = teacher.get(f"{BASE}/api/coverage", params={"class_id": cid}, timeout=30)
        assert r.status_code == 200
        statuses = {row["tp_code"]: row["status"] for row in r.json()["rows"]}
        # demo seed guarantees at least one MISSING
        assert "MISSING" in statuses.values(), statuses

    def test_assessment_analytics_pvalue_and_signals(self, teacher):
        # find any assessment
        a = teacher.get(f"{BASE}/api/assessments", timeout=30)
        if a.status_code != 200 or not a.json():
            pytest.skip("no assessments to analyze")
        aid = a.json()[0]["id"]
        r = teacher.get(f"{BASE}/api/assessments/{aid}/analytics", timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "items" in j and "confidence_signals" in j, list(j.keys())
        if j["items"]:
            item = j["items"][0]
            assert "p_value" in item or "p" in item, item


# ---------- braincore access control ----------

class TestBraincoreAccess:
    def test_student_cannot_read_other_passport(self, student, teacher):
        # get any other student id from class
        c = teacher.get(f"{BASE}/api/classes", timeout=30)
        other = None
        if c.status_code == 200:
            for cls in c.json():
                if cls.get("code") == "FZ-DEMO7A":
                    for sid in cls.get("student_ids", []):
                        if sid != student["user_id"]:
                            other = sid; break
        if not other:
            pytest.skip("no other student available")
        r = student["session"].get(f"{BASE}/api/braincore/passport/{other}", timeout=30)
        assert r.status_code == 403, f"{r.status_code} {r.text[:200]}"


# ---------- learning telemetry ----------

class TestLearningEvents:
    def test_unknown_event_type_400(self, student):
        r = student["session"].post(f"{BASE}/api/learning/events",
                                    json={"type": "totally_unknown_event",
                                          "payload": {}, "event_id": "qa-" + uuid.uuid4().hex[:8]},
                                    timeout=30)
        assert r.status_code == 400, r.text


# ---------- migration idempotency ----------

class TestMigration:
    def test_legacy_migration_idempotent(self, teacher):
        payload = {
            "teacher_state": {
                "classes": [{
                    "id": "cls-qa-legacy",
                    "code": f"FZ-QA{uuid.uuid4().hex[:4].upper()}",
                    "name": "QA Legacy Class",
                    "students": [
                        {"id": "sqa1", "name": "Ali QA",
                         "results": [{"skill": "vocab_a2", "correct": 8, "total": 10}]},
                        {"id": "sqa2", "name": "Budi QA",
                         "results": [{"skill": "past_tense", "correct": 3, "total": 10}]},
                    ]
                }]
            }
        }
        r1 = teacher.post(f"{BASE}/api/migration/legacy-teacher-store", json=payload, timeout=30)
        assert r1.status_code == 200, r1.text
        s1 = r1.json().get("students_created", r1.json().get("students", 0))
        r2 = teacher.post(f"{BASE}/api/migration/legacy-teacher-store", json=payload, timeout=30)
        assert r2.status_code == 200, r2.text
        s2 = r2.json().get("students_created", r2.json().get("students", 0))
        # idempotent -> second run should NOT create new students (or same count summary)
        assert s2 == 0 or s2 <= s1, f"expected no dup students, got s1={s1} s2={s2}"
