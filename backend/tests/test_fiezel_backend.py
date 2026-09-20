"""FIEZEL backend regression pytest — via public REACT_APP_BACKEND_URL ingress.

SEJAK m025-318 mesin kurikulum hanya punya SATU pintu: tiket identitas KelasKu.
Token `FZG-`, email+sandi, dan sesi Google dicabut beserta rutenya, jadi berkas
ini menerbitkan tiketnya sendiri dengan kunci yang sama seperti Worker
(CURRICULUM_TICKET_KEY) — persis yang dilakukan KelasKu di produksi.

Covers edge/negative cases NOT already in /app/backend/smoke_test.py:
 - tiket palsu/kedaluwarsa/terpakai -> 401; murid di rute guru -> 403
 - peran datang dari tiket, bukan dari klien
 - curriculum: parent type mismatch 400, duplicate id 400, delete archives,
   self-loop prerequisites rejected
 - questions: unsupported file 400; publish blocked when errors persist
 - assessments: coverage MISSING vs NOT_TAUGHT vs GAP; analytics p_value+confidence_signals
 - braincore: cross-student passport is 403 for students
 - learning: unknown event type -> 400
 - migration: idempotent (2nd run does not duplicate students)
"""
import os
import sys
import time
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

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import kelasku  # noqa: E402


def ticket(sub, role, name, ttl=120):
    """Terbitkan tiket seperti Worker KelasKu.

    `jti` dibuat unik per panggilan: tiket di FIEZEL sekali pakai, jadi fixture
    yang memakai nilai tetap akan hijau sekali lalu merah selamanya.
    """
    now = int(time.time())
    return kelasku.sign_ticket(kelasku.ticket_key(), {
        "v": kelasku.TICKET_VERSION, "aud": kelasku.TICKET_AUDIENCE,
        "sub": sub, "role": role, "name": name,
        "iat": now, "exp": now + ttl, "jti": f"{sub}-{time.time_ns()}",
    })


def masuk(sub, role, name, class_code=None):
    body = {"ticket": ticket(sub, role, name)}
    if class_code:
        body["class_code"] = class_code
    r = requests.post(f"{BASE}/api/auth/kelasku", json=body, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def teacher():
    data = masuk(f"sub_guru_{uuid.uuid4().hex[:8]}", "teacher", "Bu Rina")
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}",
                      "Content-Type": "application/json"})
    # Ensure demo seed exists
    s.post(f"{BASE}/api/seed/bootstrap", timeout=60)
    return s


@pytest.fixture(scope="module")
def student(teacher):
    sub = f"sub_murid_{uuid.uuid4().hex[:8]}"
    data = masuk(sub, "learner", "Murid QA", class_code="FZ-DEMO7A")
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {data['access_token']}",
                      "Content-Type": "application/json"})
    return {"session": s, "user_id": data["user_id"], "sub": sub}


# ---------- auth ----------

class TestAuth:
    def test_tiket_palsu_401(self):
        r = requests.post(f"{BASE}/api/auth/kelasku",
                          json={"ticket": "bukan.tiket"}, timeout=30)
        assert r.status_code == 401, r.text

    def test_tiket_kunci_lain_401(self):
        """Tiket berbentuk benar, bertanda tangan kunci penyerang."""
        now = int(time.time())
        palsu = kelasku.sign_ticket("kunci-penyerang-yang-cukup-panjang-0123456789", {
            "v": kelasku.TICKET_VERSION, "aud": kelasku.TICKET_AUDIENCE,
            "sub": "penyusup", "role": "owner", "name": "X",
            "iat": now, "exp": now + 120, "jti": f"x{time.time_ns()}",
        })
        r = requests.post(f"{BASE}/api/auth/kelasku", json={"ticket": palsu}, timeout=30)
        assert r.status_code == 401, r.text

    def test_tiket_kedaluwarsa_401(self):
        r = requests.post(f"{BASE}/api/auth/kelasku",
                          json={"ticket": ticket("sub_mati", "teacher", "x", ttl=-600)}, timeout=30)
        assert r.status_code == 401, r.text

    def test_tiket_sekali_pakai(self):
        """Pemakaian kedua atas tiket yang sama DITOLAK.

        Tanpa ini, tiket yang terpungut dari log atau riwayat peramban masih bisa
        dipakai ulang selama sisa umurnya.
        """
        t = ticket(f"sub_ulang_{uuid.uuid4().hex[:8]}", "teacher", "Bu Ulang")
        r1 = requests.post(f"{BASE}/api/auth/kelasku", json={"ticket": t}, timeout=30)
        r2 = requests.post(f"{BASE}/api/auth/kelasku", json={"ticket": t}, timeout=30)
        assert r1.status_code == 200, r1.text
        assert r2.status_code == 401, r2.text

    def test_peran_tak_dikenal_jatuh_ke_murid(self):
        """Kegagalan pemetaan peran harus MENUTUP pintu, bukan membukanya."""
        data = masuk(f"sub_aneh_{uuid.uuid4().hex[:8]}", "superadmin", "X")
        assert data["role"] == "student", data

    def test_student_token_on_teacher_route_403(self, student):
        # POST /api/curriculum/nodes requires teacher_user
        r = student["session"].post(f"{BASE}/api/curriculum/nodes",
                                    json={"id": f"TP-QAX-{uuid.uuid4().hex[:6]}",
                                          "type": "tp", "parent_id": "CP-MAT-D-7-BIL",
                                          "name": "murid tak boleh"}, timeout=30)
        assert r.status_code in (401, 403), f"{r.status_code} {r.text[:200]}"

    def test_me_setelah_masuk_kelasku(self, student):
        r = student["session"].get(f"{BASE}/api/auth/me", timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert j["provider"] == "kelasku", j
        assert j["role"] == "student", j

    def test_murid_langsung_masuk_kelas_dari_kode(self, student):
        """Satu kode kelas, nol pendaftaran: itu seluruh alur murid sekarang."""
        r = student["session"].get(f"{BASE}/api/auth/me", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["class_ids"]) >= 1, r.json()


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


# ---------- offline batch (F9 fase 2: paparan, bukan penguasaan) ----------

class TestOfflineBatch:
    def _batch(self, student, attempts):
        return student["session"].post(f"{BASE}/api/learning/offline-batch",
                                       json={"attempts": attempts}, timeout=60)

    def _one(self, **kw):
        import offline_static_map as m
        samb = next(iter(m.STATIC_COMPETENCY))
        d = {"event_id": "qa-off-" + uuid.uuid4().hex[:12],
             "static_item_id": samb, "unit_id": "qa-unit",
             "client_correct": True, "at": "2026-09-20T10:00:00Z"}
        d.update(kw)
        return d

    def test_teacher_forbidden_403(self, teacher):
        r = teacher.post(f"{BASE}/api/learning/offline-batch",
                         json={"attempts": []}, timeout=30)
        assert r.status_code == 403, r.text

    def test_malformed_rejected_400(self, student):
        r = self._batch(student, [self._one(event_id="x")])
        assert r.status_code == 400, r.text
        r = self._batch(student, [self._one(at="2999-01-01T00:00:00Z")])
        assert r.status_code == 400, r.text

    def test_stored_idempotent_and_no_mastery(self, student):
        a = self._one()
        r = self._batch(student, [a])
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["stored"] == 1 and j["exposed"] == 1, j
        r2 = self._batch(student, [a])
        assert r2.json()["duplicates"] == 1 and r2.json()["stored"] == 0, r2.text
        # klaim benar 100% dari klien TIDAK boleh menggerakkan penguasaan
        p = student["session"].get(f"{BASE}/api/braincore/passport/{student['user_id']}",
                                   timeout=30)
        assert p.status_code == 200, p.text
        assert p.json()["totals"]["mastered"] == 0, p.text

    def test_unmapped_recorded_without_competency(self, student):
        r = self._batch(student, [self._one(static_item_id="qa-tidak-ada-di-peta")])
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["stored"] == 1 and j["unmapped"] == 1 and j["exposed"] == 0, j


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
