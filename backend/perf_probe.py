"""Ukur jumlah operasi Mongo & latensi jalur guru (coverage/recommendations/passport) pada kelas demo."""
import os, sys, time, uuid
import httpx
from dotenv import load_dotenv
from pymongo import MongoClient

here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
load_dotenv(os.path.join(here, ".env"))
from kelasku import sign_ticket, TICKET_AUDIENCE, TICKET_VERSION

API = os.environ.get("API_URL", "http://localhost:8001")
mc = MongoClient(os.environ["MONGO_URL"])

def ops():
    c = mc.admin.command("serverStatus")["opcounters"]
    return c["query"] + c["command"]

def login(role, name):
    now = int(time.time())
    t = sign_ticket(os.environ["CURRICULUM_TICKET_KEY"], {"v": TICKET_VERSION, "aud": TICKET_AUDIENCE,
        "sub": f"perf-{uuid.uuid4().hex[:8]}", "role": role, "name": name, "iat": now, "exp": now + 120,
        "jti": uuid.uuid4().hex})
    c = httpx.Client(base_url=API, timeout=60)
    r = c.post("/api/auth/kelasku", json={"ticket": t}); r.raise_for_status()
    c.headers["Authorization"] = "Bearer " + r.json()["access_token"]
    return c

g = login("teacher", "Guru Perf")
boot = g.post("/api/seed/bootstrap").json()
cls = boot["class"]
print("kelas demo:", cls["id"], "murid:", len(cls.get("student_ids") or []), "evidence:", boot.get("evidence_created"))
sid = (cls.get("student_ids") or [None])[0]

for label, fn in [
    ("coverage", lambda: g.get("/api/coverage", params={"class_id": cls["id"]})),
    ("recommendations", lambda: g.get("/api/braincore/recommendations", params={"class_id": cls["id"]})),
    ("tp-detail", lambda: g.get("/api/braincore/tp-detail", params={"class_id": cls["id"], "tp_id": "TP-MAT-D-7-BIL-01"})),
    ("passport", lambda: g.get(f"/api/braincore/passport/{sid}")),
    ("assessments", lambda: g.get("/api/assessments", params={"class_id": cls["id"]})),
]:
    fn()  # pemanasan
    o0, t0 = ops(), time.perf_counter()
    r = fn()
    dt, do = (time.perf_counter() - t0) * 1000, ops() - o0
    print(f"{label:16s} status={r.status_code} mongo_ops={do:4d} latency={dt:7.1f} ms")
