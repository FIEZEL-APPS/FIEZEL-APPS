"""Smoke test end-to-end: guru -> kurikulum -> soal -> asesmen -> murid -> braincore -> insight."""
import json
import sys
import httpx

BASE = "http://localhost:8001"
ok, fail = [], []


def check(name, cond, extra=""):
    (ok if cond else fail).append(name)
    print(("PASS " if cond else "FAIL ") + name + (f"  {extra}" if extra and not cond else ""))


def main():
    t = httpx.Client(base_url=BASE, timeout=60)
    r = t.post("/api/auth/teacher/token", json={"token": "FZ-OWNER-2026-MASTER", "name": "Bu Rina"})
    check("teacher token login", r.status_code == 200, r.text)
    teacher = r.json()
    t.headers["Authorization"] = "Bearer " + teacher["access_token"]

    r = t.post("/api/seed/bootstrap")
    check("bootstrap", r.status_code == 200, r.text)
    boot = r.json()
    cls = boot["class"]
    print("   class:", cls["id"], cls["code"], "students:", len(cls["student_ids"]))

    r = t.get("/api/curriculum/tree", params={"curriculum_id": "KURMER"})
    check("curriculum tree", r.status_code == 200 and r.json()[0]["children"], r.text[:200])

    r = t.get("/api/curriculum/node/KOMP-BIL-FRAC-ADD/trace")
    tr = r.json()
    check("trace metadata lengkap", all(k in tr["labels"] for k in
          ["curriculum", "phase", "grade", "subject", "element", "cp", "tp", "indicator", "competency"]),
          json.dumps(tr.get("labels", {})))

    r = t.get("/api/curriculum/health-check", params={"subject_id": "MAT-7"})
    check("curriculum health-check", r.status_code == 200, r.text[:200])

    # ingestion: paste
    paste = """1. Hitunglah 1/2 + 1/4
A. 3/4
B. 2/6
C. 1/6
D. 2/4
Jawaban: A
Penjelasan: Samakan penyebut jadi 4.
2. Hitunglah 7/8 - 1/2
A. 3/8
B. 6/6
C. 1/2
D. 8/6
Kunci: A
"""
    r = t.post("/api/questions/import/paste", json={"text": paste, "competency_id": "KOMP-BIL-FRAC-ADD"})
    check("import paste -> REVIEW", r.status_code == 200 and len(r.json()["created"]) == 2, r.text[:300])
    if r.status_code == 200:
        created = r.json()["created"]
        check("hasil parser masuk REVIEW", all(c["status"] == "REVIEW" for c in created))
        qid = created[0]["question_id"]
        r2 = t.post(f"/api/questions/{qid}/review", json={"action": "publish"})
        check("publish soal hasil parser", r2.status_code == 200 and r2.json()["status"] == "PUBLISHED", r2.text[:200])
        r3 = t.put(f"/api/questions/{qid}", json={"competency_id": "KOMP-BIL-FRAC-ADD",
                                                  "stem": "Hitunglah 1/2 + 1/4 (revisi)",
                                                  "options": ["3/4", "2/6", "1/6", "2/4"],
                                                  "answer_key": "A", "explanation": "Penyebut 4.",
                                                  "status": "PUBLISHED"})
        check("versioning naik ke v2", r3.status_code == 200 and r3.json()["question"]["version"] == 2, r3.text[:200])
        r4 = t.get(f"/api/questions/{qid}/history")
        check("history 2 versi", len(r4.json()) == 2)
        r5 = t.post(f"/api/questions/{qid}/variants", json={"count": 2, "transfer": True})
        check("varian transfer dibuat", r5.status_code == 200 and len(r5.json()["created"]) == 2, r5.text[:200])
        for v in r5.json()["created"]:
            t.post(f"/api/questions/{v['question_id']}/review", json={"action": "publish"})

    # validasi menangkap soal buruk
    r = t.post("/api/questions/validate", json={"competency_id": "KOMP-BIL-FRAC-ADD", "stem": "2+2?",
                                                "options": ["4"], "answer_key": "Z"})
    codes = [i["code"] for i in r.json()["issues"]]
    check("validasi menolak soal cacat", not r.json()["publishable"] and "answer_key_invalid" in codes, str(codes))

    # blueprint
    bp = {"title": "Formatif Bilangan", "assessment_type": "formative",
          "tp_targets": [{"tp_id": "TP-MAT-D-7-BIL-01", "count": 5}, {"tp_id": "TP-MAT-D-7-BIL-02", "count": 5}],
          "cognitive_distribution": {"C1": 60, "C2": 40}, "transfer_ratio": 0.0}
    r = t.post("/api/blueprints/check", json=bp)
    msgs = [w["message"] for w in r.json()["warnings"]]
    check("blueprint memberi peringatan ketidakseimbangan", any("C3+" in m for m in msgs), str(msgs))
    bp["cognitive_distribution"] = {"C1": 20, "C2": 30, "C3": 30, "C4": 20}
    bp["transfer_ratio"] = 0.2
    r = t.post("/api/blueprints", json=bp)
    check("blueprint dibuat", r.status_code == 200, r.text[:200])
    bp_id = r.json()["id"]

    r = t.post("/api/assessments", json={"title": "Formatif Bilangan Bulat & Pecahan",
                                         "assessment_type": "formative", "class_id": cls["id"],
                                         "blueprint_id": bp_id})
    check("asesmen dari blueprint", r.status_code == 200 and r.json()["question_count"] >= 8, r.text[:300])
    assessment = r.json()
    print("   distribusi:", assessment.get("distribution"))

    r = t.get("/api/coverage", params={"class_id": cls["id"]})
    rows = r.json()["rows"]
    statuses = {row["tp_code"]: row["status"] for row in rows}
    check("coverage membedakan MISSING/NOT_TAUGHT/GAP", "MISSING" in statuses.values() or
          "NOT_TAUGHT" in statuses.values(), str(statuses))
    print("   coverage:", json.dumps(statuses))
    for row in rows:
        print(f"   {row['tp_code']}: soal={row['questions_published']} exposed={row['students_exposed']} "
              f"mastery={row['mastery_pct']} status={row['status']} — {row['note']}")

    r = t.get("/api/braincore/recommendations", params={"class_id": cls["id"]})
    recs = r.json()["recommendations"]
    check("rekomendasi guru muncul", len(recs) >= 1, r.text[:300])
    for rc in recs:
        print(f"   REKOM: {rc['title']} — {rc['why']}")

    exec_rec = next((x for x in recs if x["kind"] in ("remedial", "practice", "enrichment")), None)
    if exec_rec:
        a = exec_rec["actions"][0]
        r = t.post(a["endpoint"], json=a["payload"])
        check("rekomendasi bisa langsung dieksekusi", r.status_code == 200 and r.json().get("id"), r.text[:300])

    r = t.post("/api/braincore/lesson-plan", json={"class_id": cls["id"],
                                                   "tp_id": "TP-MAT-D-7-BIL-02", "minutes": 45})
    plan = r.json()
    check("rencana mengajar 45 menit", r.status_code == 200 and plan["blocks"][-1]["to"] == 45, r.text[:200])

    r = t.post("/api/braincore/groups", json={"class_id": cls["id"], "tp_id": "TP-MAT-D-7-BIL-02"})
    check("kelompok dinamis", r.status_code == 200 and len(r.json()["groups"]) >= 1, r.text[:200])
    for g in r.json()["groups"]:
        print(f"   GRUP: {g['name']} ({len(g['members'])}) — {g['reason']}")

    # ---------- murid ----------
    s = httpx.Client(base_url=BASE, timeout=60)
    import uuid as _u
    email = f"murid.{_u.uuid4().hex[:6]}@example.com"
    r = s.post("/api/auth/register", json={"email": email, "password": "murid123",
                                           "name": "Murid Uji", "class_code": cls["code"]})
    check("murid register + join kelas", r.status_code == 200, r.text[:200])
    student = r.json()
    s.headers["Authorization"] = "Bearer " + student["access_token"]

    r = t.post("/api/assessments", json={"title": "Latihan adaptif pecahan", "assessment_type": "practice",
                                         "class_id": cls["id"], "tp_ids": ["TP-MAT-D-7-BIL-02"],
                                         "question_count": 6, "student_ids": [student["user_id"]]})
    check("guru menugaskan murid", r.status_code == 200, r.text[:300])
    prac = r.json()

    r = s.get("/api/learning/today")
    check("today plan murid", r.status_code == 200 and r.json()["missions"], r.text[:200])

    r = s.post("/api/learning/sessions/start", json={"assessment_id": prac["id"]})
    check("sesi dimulai + mission", r.status_code == 200 and r.json()["mission"]["why_this_matters"], r.text[:300])
    ses = r.json()
    print("   MISSION goal:", ses["mission"]["today_goal"], "|", ses["mission"]["why_this_matters"][:60])

    reasons, diagnoses, wrong_then_help = [], [], False
    for i in range(8):
        r = s.get(f"/api/learning/sessions/{ses['id']}/next")
        d = r.json()
        if d.get("done"):
            break
        q = d["question"]
        reasons.append(d.get("reason", "")[:40])
        # jawab salah dua kali pertama (sengaja), lalu benar
        key = t.get(f"/api/questions/{q['question_id']}").json().get("answer_key", "A").upper()
        if i < 2:
            ans = next(c for c in "ABCD" if c != key)
            conf = "yakin"
        else:
            ans = key
            conf = "lumayan"
        if i == 1:
            hr = s.post(f"/api/learning/sessions/{ses['id']}/hint")
            check("hint tersedia", hr.status_code == 200 and hr.json()["hint"], hr.text[:200])
        r = s.post(f"/api/learning/sessions/{ses['id']}/answer",
                   json={"question_id": q["question_id"], "answer": ans, "confidence": conf,
                         "time_ms": 25000})
        res = r.json()
        if r.status_code != 200:
            check("submit answer", False, r.text[:300])
            break
        diagnoses.append(res["diagnosis"]["label"])
        if res.get("correct") is False and res["next_action"]["kind"] in ("targeted_retry", "micro_remediation"):
            wrong_then_help = True
        # idempotensi
        r2 = s.post(f"/api/learning/sessions/{ses['id']}/answer",
                    json={"question_id": q["question_id"], "answer": ans, "confidence": conf,
                          "time_ms": 25000})
        if not r2.json().get("duplicate"):
            pass
    check("loop salah -> bantuan/retry", wrong_then_help, str(diagnoses))
    check("alasan adaptif berbahasa manusia", any(len(x) > 10 for x in reasons), str(reasons))
    check("diagnosis mendeteksi false_confidence/misconception",
          any(x in ("false_confidence", "misconception", "knowledge_gap") for x in diagnoses), str(diagnoses))

    r = s.post(f"/api/learning/sessions/{ses['id']}/finish")
    check("sesi selesai + ringkasan", r.status_code == 200 and r.json()["summary"]["competency_states"], r.text[:200])

    r = s.get("/api/learning/passport")
    p = r.json()
    check("learning passport murid", r.status_code == 200 and p["rows"], r.text[:200])
    print("   passport totals:", p["totals"])

    r = t.get(f"/api/braincore/evidence-graph/{student['user_id']}")
    check("evidence graph terbentuk", r.status_code == 200 and r.json()["attempt_count"] > 0, r.text[:200])

    r = t.get(f"/api/assessments/{prac['id']}/analytics")
    check("analitik asesmen", r.status_code == 200 and "items" in r.json(), r.text[:200])

    r = t.get("/api/braincore/tp-detail", params={"class_id": cls["id"], "tp_id": "TP-MAT-D-7-BIL-02"})
    check("detail TP untuk guru", r.status_code == 200 and "summary" in r.json(), r.text[:200])

    # idempotensi event
    dup_id = "dup-" + _u.uuid4().hex[:8]
    r = s.post("/api/learning/events", json={"type": "lesson_started",
                                             "payload": {"session_id": ses["id"]}, "event_id": dup_id})
    r2 = s.post("/api/learning/events", json={"type": "lesson_started",
                                              "payload": {"session_id": ses["id"]}, "event_id": dup_id})
    check("event idempoten", r.json()["stored"] and not r2.json()["stored"], r2.text[:200])

    # migrasi legacy
    legacy = {"classes": [{"id": "cls-legacy", "code": "FZ-LEGA01", "name": "English A2 — 10A",
                            "students": [{"id": "s1", "name": "Fikri",
                                          "results": [{"skill": "past_tense", "correct": 3, "total": 10},
                                                      {"skill": "vocab_a2", "correct": 8, "total": 10}]}]}]}
    r = t.post("/api/migration/legacy-teacher-store", json={"teacher_state": legacy})
    check("migrasi data lama", r.status_code == 200 and r.json()["evidence"] == 2, r.text[:300])

    print(f"\n=== {len(ok)} PASS / {len(fail)} FAIL ===")
    if fail:
        print("GAGAL:", fail)
        sys.exit(1)


main()
