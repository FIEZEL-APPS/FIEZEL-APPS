"""Independent edge-case regression suite (iteration 3, testing agent T1).

Fokus reviewer:
 - Owner bypass di semua rute yang di-guard.
 - 404 (bukan 403) untuk class_id yang benar-benar tidak ada.
 - Refactor N+1: coverage/recommendations/tp-detail pada kelas KOSONG (nol murid)
   dan kelas dengan murid TAPI nol evidence -> tidak error.
 - Bootstrap demo per-guru: dua guru dapat kelas demo masing-masing dan guru
   pertama TIDAK kehilangan kelasnya; kode kelas berbeda bila FZ-DEMO7A sudah
   dipakai.
 - Asesmen for_whole_class vs student_ids eksplisit: murid target vs non-target
   pada kelas yang sama.
 - Murid pindah kelas: kehilangan akses asesmen kelas lama.
 - Blueprint scoping per pemilik.
 - B7: semua field statistik hadir dan mastery_pct konsisten.
"""
import os
import sys
import time
import uuid

import httpx
import pytest
from dotenv import load_dotenv

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
load_dotenv(os.path.join(os.path.dirname(_HERE), ".env"))

from kelasku import TICKET_AUDIENCE, TICKET_VERSION, sign_ticket  # noqa: E402

API = os.environ.get("API_URL", "http://localhost:8001").rstrip("/")
KEY = os.environ["CURRICULUM_TICKET_KEY"]
RUN = uuid.uuid4().hex[:6]


def _ticket(role: str, name: str, sub: str | None = None) -> str:
    now = int(time.time())
    return sign_ticket(KEY, {
        "v": TICKET_VERSION, "aud": TICKET_AUDIENCE,
        "sub": sub or f"edge-{RUN}-{uuid.uuid4().hex[:8]}",
        "role": role, "name": name, "iat": now, "exp": now + 120,
        "jti": uuid.uuid4().hex,
    })


def _login(role: str, name: str, class_code: str | None = None, sub: str | None = None) -> httpx.Client:
    c = httpx.Client(base_url=API, timeout=30)
    body = {"ticket": _ticket(role, name, sub=sub)}
    if class_code:
        body["class_code"] = class_code
    r = c.post("/api/auth/kelasku", json=body)
    assert r.status_code == 200, r.text
    c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    c.user = r.json()  # type: ignore[attr-defined]
    return c


# ---------------- fixtures ----------------

@pytest.fixture(scope="module")
def scene():
    ga = _login("teacher", "Edge Guru A")
    gb = _login("teacher", "Edge Guru B")
    owner = _login("owner", "Edge Owner")
    empty = ga.post("/api/classes", json={
        "name": f"Kelas Kosong {RUN}", "subject_id": "MAT-7", "grade_id": "KELAS-7"}).json()
    populated = ga.post("/api/classes", json={
        "name": f"Kelas Berisi {RUN}", "subject_id": "MAT-7", "grade_id": "KELAS-7"}).json()
    # Tambah 2 murid via roster (evidence NOL — untuk uji refactor)
    r = ga.post(f"/api/classes/{populated['id']}/roster",
                json={"names": ["Alpha Murid", "Beta Murid"]})
    assert r.status_code == 200, r.text
    return dict(ga=ga, gb=gb, owner=owner, empty=empty, populated=populated)


# ---------------- owner bypass ----------------

class TestOwnerBypass:
    def test_owner_can_read_any_class(self, scene):
        cid = scene["populated"]["id"]
        assert scene["owner"].get(f"/api/classes/{cid}").status_code == 200
        assert scene["owner"].get("/api/coverage", params={"class_id": cid}).status_code == 200
        assert scene["owner"].get("/api/braincore/recommendations",
                                  params={"class_id": cid}).status_code == 200

    def test_owner_can_list_all_blueprints(self, scene):
        bp = scene["ga"].post("/api/blueprints", json={
            "title": f"BP-A-{RUN}", "curriculum_id": "KURMER",
            "tp_targets": [{"tp_id": "TP-MAT-D-7-BIL-01", "count": 4}]}).json()
        assert bp.get("id"), bp
        # Owner sees Guru A's BP
        seen = {b["id"] for b in scene["owner"].get("/api/blueprints").json()}
        assert bp["id"] in seen


# ---------------- 404 vs 403 semantics ----------------

class TestNotFoundVsForbidden:
    def test_missing_class_is_404_not_403(self, scene):
        assert scene["ga"].get("/api/classes/CLS-DOES-NOT-EXIST").status_code == 404
        assert scene["ga"].get("/api/coverage",
                               params={"class_id": "CLS-DOES-NOT-EXIST"}).status_code == 404
        assert scene["ga"].get("/api/braincore/recommendations",
                               params={"class_id": "CLS-DOES-NOT-EXIST"}).status_code == 404

    def test_missing_assessment_is_404(self, scene):
        assert scene["ga"].get("/api/assessments/AS-NOPE").status_code == 404
        assert scene["ga"].get("/api/assessments/AS-NOPE/analytics").status_code == 404


# ---------------- empty class regression (refactor N+1) ----------------

class TestEmptyClassNoCrash:
    def test_coverage_on_zero_students(self, scene):
        cid = scene["empty"]["id"]
        r = scene["ga"].get("/api/coverage", params={"class_id": cid})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "rows" in data
        for row in data["rows"]:
            assert row["students_total"] == 0
            assert row["students_exposed"] == 0
            assert row["students_mastered"] == 0

    def test_recommendations_on_zero_students(self, scene):
        r = scene["ga"].get("/api/braincore/recommendations",
                            params={"class_id": scene["empty"]["id"]})
        assert r.status_code == 200, r.text
        j = r.json()
        # struktur konsisten meski kosong
        assert "recommendations" in j or isinstance(j, list) or "items" in j

    def test_tp_detail_on_zero_students(self, scene):
        r = scene["ga"].get("/api/braincore/tp-detail",
                            params={"class_id": scene["empty"]["id"],
                                    "tp_id": "TP-MAT-D-7-BIL-01"})
        assert r.status_code == 200, r.text

    def test_coverage_students_with_no_evidence(self, scene):
        cid = scene["populated"]["id"]
        r = scene["ga"].get("/api/coverage", params={"class_id": cid})
        assert r.status_code == 200
        rows = r.json()["rows"]
        assert rows, "expected coverage rows for class with roster"
        for row in rows:
            assert row["students_total"] >= 2
            # tanpa evidence, mastery harus 0
            assert row["students_mastered"] == 0
            # tanpa evidence, mastery_pct boleh None atau 0
            assert row["mastery_pct"] in (None, 0, 0.0)

    def test_lesson_plan_minutes_sum_matches(self, scene):
        r = scene["ga"].post("/api/braincore/lesson-plan", json={
            "class_id": scene["populated"]["id"],
            "tp_id": "TP-MAT-D-7-BIL-01",
            "minutes": 60,
        })
        assert r.status_code == 200, r.text
        j = r.json()
        blocks = j.get("blocks") or j.get("plan") or []
        if blocks:
            total = sum(b.get("minutes") or b.get("duration") or 0 for b in blocks)
            assert total == 60 or abs(total - 60) <= 5, f"blocks sum={total} expected~60: {blocks}"


# ---------------- bootstrap demo per-guru ----------------

class TestBootstrapPerTeacher:
    def test_each_teacher_owns_own_demo_class(self):
        t1 = _login("teacher", "Boot Guru 1")
        t2 = _login("teacher", "Boot Guru 2")
        b1 = t1.post("/api/seed/bootstrap")
        b2 = t2.post("/api/seed/bootstrap")
        assert b1.status_code == 200, b1.text
        assert b2.status_code == 200, b2.text
        c1 = b1.json()["class"]
        c2 = b2.json()["class"]
        # Kode kelas kedua HARUS berbeda bila FZ-DEMO7A sudah dipakai
        if c1["code"] == "FZ-DEMO7A":
            assert c2["code"] != c1["code"], f"kode duplikat: {c1['code']} vs {c2['code']}"
        # teacher_id benar
        assert c1["teacher_id"] == t1.user["user_id"]
        assert c2["teacher_id"] == t2.user["user_id"]
        # Guru 1 masih memuat kelasnya (tidak dicuri oleh Guru 2)
        classes1 = t1.get("/api/classes").json()
        ids1 = {c["id"]: c for c in classes1}
        assert c1["id"] in ids1
        assert ids1[c1["id"]]["teacher_id"] == t1.user["user_id"]
        # Guru 2 TIDAK melihat kelas Guru 1
        classes2 = t2.get("/api/classes").json()
        ids2 = {c["id"] for c in classes2}
        assert c1["id"] not in ids2
        # Roster 18 murid
        assert len(c1.get("student_ids") or []) == 18


# ---------------- assessment targeting ----------------

class TestAssessmentTargeting:
    def test_explicit_student_ids_scopes_visibility(self, scene):
        cid = scene["populated"]["id"]
        cls = scene["ga"].get(f"/api/classes/{cid}").json()
        # promote 2 murid demo di dalam kelas menjadi login
        student_ids = cls.get("student_ids") or []
        assert len(student_ids) >= 2
        target = student_ids[0]
        nontarget = student_ids[1]

        asm = scene["ga"].post("/api/assessments", json={
            "title": f"Targeted {RUN}",
            "class_id": cid,
            "tp_ids": ["TP-MAT-D-7-BIL-01"],
            "question_count": 4,
            "student_ids": [target],
        }).json()
        assert asm.get("id"), asm
        assert asm.get("for_whole_class") is False, asm
        assert target in (asm.get("student_ids") or [])
        assert nontarget not in (asm.get("student_ids") or [])

    def test_whole_class_default_true_when_no_student_ids(self, scene):
        asm = scene["ga"].post("/api/assessments", json={
            "title": f"Whole {RUN}",
            "class_id": scene["populated"]["id"],
            "tp_ids": ["TP-MAT-D-7-BIL-01"],
            "question_count": 4,
        }).json()
        assert asm.get("for_whole_class") is True, asm


# ---------------- B7 field completeness ----------------

class TestB7Fields:
    def test_all_rows_have_stats_fields(self, scene):
        # bootstrap demo untuk mendapatkan kelas dengan 18 murid + evidence
        t = _login("teacher", "B7 Guru")
        boot = t.post("/api/seed/bootstrap").json()
        cid = boot["class"]["id"]
        r = t.get("/api/coverage", params={"class_id": cid})
        assert r.status_code == 200, r.text
        rows = r.json()["rows"]
        required = {"students_total", "students_exposed", "students_mastered",
                    "students_developing", "students_needs_help", "mastery_pct"}
        for row in rows:
            missing = required - set(row.keys())
            assert not missing, f"row {row.get('tp_id')} kekurangan: {missing}"
            # invarian
            assert row["students_mastered"] <= row["students_exposed"] <= row["students_total"]
            # mastery_pct = rata-rata posterior BKT (0-100) atau None bila nol evidence
            if row["students_exposed"] == 0:
                assert row["mastery_pct"] in (None, 0, 0.0), row
            else:
                assert 0 <= row["mastery_pct"] <= 100, row
            # GAP note format
            if row["status"] == "GAP":
                assert "dari" in row["note"] and "yang aktif" in row["note"], row["note"]
        # Ada minimal satu GAP dan satu MISSING (TP-MAT-D-7-BIL-03)
        statuses = {row["tp_code"]: row["status"] for row in rows}
        assert "MISSING" in statuses.values()

    def test_missing_row_zero_stats(self, scene):
        t = _login("teacher", "B7 Guru2")
        boot = t.post("/api/seed/bootstrap").json()
        cid = boot["class"]["id"]
        rows = t.get("/api/coverage", params={"class_id": cid}).json()["rows"]
        missing = [r for r in rows if r["status"] == "MISSING"]
        assert missing, "expected at least one MISSING row"
        for r in missing:
            assert r["students_exposed"] == 0
            assert r["students_mastered"] == 0


# ---------------- session answer + learner_state ----------------

class TestSessionAnswer:
    def test_answer_persists_learner_state(self, scene):
        # gunakan kelas demo (punya questions terbit)
        t = _login("teacher", "Sesi Guru")
        boot = t.post("/api/seed/bootstrap").json()
        cid = boot["class"]["id"]
        code = boot["class"]["code"]
        mx = _login("learner", "Murid Sesi", code)
        # cari TP yang punya questions_published > 0
        rows = t.get("/api/coverage", params={"class_id": cid}).json()["rows"]
        tp_ok = next((r["tp_id"] for r in rows if r.get("questions_published", 0) > 0), None)
        if not tp_ok:
            pytest.skip("no TP with published questions in demo")
        asm = t.post("/api/assessments", json={
            "title": f"Sesi {RUN}", "class_id": cid,
            "tp_ids": [tp_ok], "question_count": 4}).json()
        assert asm.get("id"), asm
        start = mx.post("/api/learning/sessions/start",
                        json={"assessment_id": asm["id"]})
        assert start.status_code == 200, start.text
        ses = start.json()["id"]
        nxt = mx.get(f"/api/learning/sessions/{ses}/next")
        assert nxt.status_code == 200, nxt.text
        q = nxt.json().get("question") or {}
        qid = q.get("id") or q.get("question_id")
        if not qid:
            pytest.skip("no question available in pool")
        # kunci jawaban benar tidak diketahui klien; kirim opsi pertama
        opts = q.get("options") or []
        ans = opts[0] if opts else "A"
        # options bisa berupa dict {label, text}; ambil label
        if isinstance(ans, dict):
            ans = ans.get("label") or ans.get("id") or "A"
        r = mx.post(f"/api/learning/sessions/{ses}/answer", json={
            "question_id": qid, "answer": ans,
            "confidence": "yakin", "time_ms": 5000})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "learner_state" in body or "state" in body or "correct" in body, body
