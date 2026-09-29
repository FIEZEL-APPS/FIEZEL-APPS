"""E2E anti-IDOR: dua guru, dua kelas, dua murid — semua akses lintas kepemilikan harus 403.

Jalan melawan server HIDUP (uvicorn + MongoDB nyata), bukan stub:
    API_URL=http://localhost:8001 python -m pytest backend/tests/test_idor_e2e.py -q
Tiket KelasKu diterbitkan lokal dengan CURRICULUM_TICKET_KEY yang sama dengan server
(dibaca dari backend/.env) memakai kelasku.sign_ticket — penerbit uji yang memang disediakan.
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


def _ticket(role: str, name: str) -> str:
    now = int(time.time())
    return sign_ticket(KEY, {"v": TICKET_VERSION, "aud": TICKET_AUDIENCE, "sub": f"e2e-{RUN}-{uuid.uuid4().hex[:8]}",
                             "role": role, "name": name, "iat": now, "exp": now + 120, "jti": uuid.uuid4().hex})


def _login(role: str, name: str, class_code: str | None = None) -> httpx.Client:
    c = httpx.Client(base_url=API, timeout=30)
    body = {"ticket": _ticket(role, name)}
    if class_code:
        body["class_code"] = class_code
    r = c.post("/api/auth/kelasku", json=body)
    assert r.status_code == 200, r.text
    c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    c.user = r.json()  # type: ignore[attr-defined]
    return c


@pytest.fixture(scope="module")
def world():
    ga = _login("teacher", "Guru A")
    gb = _login("teacher", "Guru B")
    owner = _login("owner", "Owner")
    cls_a = ga.post("/api/classes", json={"name": f"Kelas A {RUN}", "subject_id": "MAT-7", "grade_id": "KELAS-7"}).json()
    cls_b = gb.post("/api/classes", json={"name": f"Kelas B {RUN}", "subject_id": "MAT-7", "grade_id": "KELAS-7"}).json()
    mx = _login("learner", "Murid X", cls_a["code"])
    my = _login("learner", "Murid Y", cls_b["code"])
    tp = ga.get("/api/coverage", params={"class_id": cls_a["id"]}).json()["rows"]
    tp_id = next((r["tp_id"] for r in tp if r["questions_published"] > 0), tp[0]["tp_id"])
    asm = ga.post("/api/assessments", json={"title": "Formatif A", "class_id": cls_a["id"],
                                             "tp_ids": [tp_id], "question_count": 4}).json()
    assert asm.get("id"), asm
    comp_id = (asm.get("competency_ids") or ["COMP-NONE"])[0]
    return dict(ga=ga, gb=gb, owner=owner, mx=mx, my=my, cls_a=cls_a, cls_b=cls_b,
                asm=asm, tp_id=tp_id, comp_id=comp_id)


def test_coverage_cross_teacher_403(world):
    a, b = world["ga"], world["gb"]
    cid = world["cls_a"]["id"]
    assert b.get("/api/coverage", params={"class_id": cid}).status_code == 403
    assert a.get("/api/coverage", params={"class_id": cid}).status_code == 200
    assert world["owner"].get("/api/coverage", params={"class_id": cid}).status_code == 200


def test_braincore_teacher_endpoints_403(world):
    b, cid, tp = world["gb"], world["cls_a"]["id"], world["tp_id"]
    assert b.get("/api/braincore/recommendations", params={"class_id": cid}).status_code == 403
    assert b.post("/api/braincore/groups", json={"class_id": cid, "tp_id": tp}).status_code == 403
    assert b.post("/api/braincore/lesson-plan", json={"class_id": cid, "tp_id": tp}).status_code == 403
    assert b.get("/api/braincore/tp-detail", params={"class_id": cid, "tp_id": tp}).status_code == 403
    a = world["ga"]
    assert a.get("/api/braincore/recommendations", params={"class_id": cid}).status_code == 200
    assert a.get("/api/braincore/tp-detail", params={"class_id": cid, "tp_id": tp}).status_code == 200


def test_class_detail_and_roster(world):
    cid = world["cls_a"]["id"]
    assert world["gb"].get(f"/api/classes/{cid}").status_code == 403
    assert world["my"].get(f"/api/classes/{cid}").status_code == 403
    assert world["mx"].get(f"/api/classes/{cid}").status_code == 200
    assert world["gb"].post(f"/api/classes/{cid}/roster", json={"names": ["Penyusup"]}).status_code == 403
    assert world["ga"].post(f"/api/classes/{cid}/roster", json={"names": ["Roster Sah"]}).status_code == 200
    assert world["gb"].get("/api/classes/CLS-TIDAKADA").status_code == 404


def test_assessment_ownership(world):
    cid, asm = world["cls_a"]["id"], world["asm"]
    r = world["gb"].post("/api/assessments", json={"title": "Sabotase", "class_id": cid, "tp_ids": [world["tp_id"]]})
    assert r.status_code == 403
    r = world["gb"].post("/api/assessments/from-recommendation",
                         json={"kind": "remedial", "class_id": cid, "tp_id": world["tp_id"]})
    assert r.status_code == 403
    assert world["gb"].get("/api/assessments", params={"class_id": cid}).status_code == 403
    ids_b = {a["id"] for a in world["gb"].get("/api/assessments").json()}
    assert asm["id"] not in ids_b
    ids_a = {a["id"] for a in world["ga"].get("/api/assessments").json()}
    assert asm["id"] in ids_a
    assert world["gb"].get(f"/api/assessments/{asm['id']}").status_code == 403
    assert world["my"].get(f"/api/assessments/{asm['id']}").status_code == 403
    assert world["mx"].get(f"/api/assessments/{asm['id']}").status_code == 200
    assert world["gb"].get(f"/api/assessments/{asm['id']}/analytics").status_code == 403
    assert world["ga"].get(f"/api/assessments/{asm['id']}/analytics").status_code == 200
    ids_y = {a["id"] for a in world["my"].get("/api/assessments").json()}
    assert asm["id"] not in ids_y


def test_student_data_isolation(world):
    x, y, a, b = world["mx"], world["my"], world["ga"], world["gb"]
    xid, comp = x.user["user_id"], world["comp_id"]
    p = {"student_id": xid, "competency_id": comp}
    assert y.get("/api/braincore/student-state", params=p).status_code == 403
    assert b.get("/api/braincore/student-state", params=p).status_code == 403
    assert x.get("/api/braincore/student-state", params=p).status_code == 200
    assert a.get("/api/braincore/student-state", params=p).status_code == 200
    assert y.get(f"/api/braincore/passport/{xid}").status_code == 403
    assert b.get(f"/api/braincore/passport/{xid}").status_code == 403
    assert a.get(f"/api/braincore/passport/{xid}").status_code == 200
    assert y.get(f"/api/braincore/evidence-graph/{xid}").status_code == 403
    assert b.get("/api/learning/events", params={"student_id": xid}).status_code == 403
    assert b.get("/api/learning/events").status_code == 400
    assert a.get("/api/learning/events", params={"student_id": xid}).status_code == 200
    # murid meminta event murid lain -> tetap hanya miliknya sendiri
    evs = y.get("/api/learning/events", params={"student_id": xid}).json()
    assert all(e["student_id"] == y.user["user_id"] for e in evs)


def test_session_isolation(world):
    asm = world["asm"]
    assert world["my"].post("/api/learning/sessions/start", json={"assessment_id": asm["id"]}).status_code == 403
    r = world["mx"].post("/api/learning/sessions/start", json={"assessment_id": asm["id"]})
    assert r.status_code == 200, r.text
    ses = r.json()["id"]
    assert world["my"].get(f"/api/learning/sessions/{ses}").status_code == 403
    assert world["gb"].get(f"/api/learning/sessions/{ses}").status_code == 403
    assert world["ga"].get(f"/api/learning/sessions/{ses}").status_code == 200
    nxt = world["mx"].get(f"/api/learning/sessions/{ses}/next")
    assert nxt.status_code == 200, nxt.text


def test_b7_coverage_note_counts_students(world):
    """Note GAP harus menyebut proporsi murid nyata, bukan 100 - rerata posterior."""
    rows = world["ga"].get("/api/coverage", params={"class_id": world["cls_a"]["id"]}).json()["rows"]
    for r in rows:
        if r["status"] == "GAP":
            assert "dari" in r["note"] and "yang aktif" in r["note"], r["note"]
            assert r["students_exposed"] >= r["students_mastered"]
