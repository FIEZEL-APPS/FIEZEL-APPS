"""Seed & migrasi: Kurikulum Merdeka (Fase D / Kelas 7) + bank soal contoh + kelas demo.
Idempoten — aman dijalankan berulang. Tidak menghapus data existing.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db import db
from auth import owner_guard, teacher_user
from curriculum import NodeIn, create_node
from questions import QuestionIn, _dna, validate_doc
import assessment as asm

router = APIRouter(prefix="/api", tags=["seed"])


def now():
    return datetime.now(timezone.utc)


async def node(node_id, ntype, parent, name, desc="", order=0, meta=None):
    ex = await db.curriculum_nodes.find_one({"id": node_id}, {"_id": 0})
    if ex:
        return ex
    return await create_node(NodeIn(id=node_id, code=node_id, type=ntype, parent_id=parent,
                                    name=name, description=desc, order=order, meta=meta or {}),
                             actor="seed")


# ---------------- struktur kurikulum ----------------
MAT_TPS = [
    ("TP-MAT-D-7-BIL-01", "Melakukan operasi hitung bilangan bulat dan menerapkannya pada masalah sehari-hari", [
        ("IND-BIL-01-1", "Menentukan hasil operasi penjumlahan/pengurangan bilangan bulat", [
            ("KOMP-BIL-INT-ADD", "Menjumlahkan dan mengurangkan bilangan bulat bertanda", []),
        ]),
        ("IND-BIL-01-2", "Menerapkan operasi bilangan bulat pada konteks nyata", [
            ("KOMP-BIL-INT-CTX", "Memodelkan situasi nyata (suhu, utang, ketinggian) dengan bilangan bulat",
             ["KOMP-BIL-INT-ADD"]),
        ]),
    ]),
    ("TP-MAT-D-7-BIL-02", "Melakukan operasi hitung pecahan dan menggunakannya dalam pemecahan masalah", [
        ("IND-BIL-02-1", "Menentukan hasil operasi pecahan berpenyebut berbeda", [
            ("KOMP-BIL-FRAC-ADD", "Menjumlahkan pecahan berpenyebut berbeda", ["KOMP-BIL-INT-ADD"]),
        ]),
        ("IND-BIL-02-2", "Menyelesaikan masalah kontekstual yang memuat pecahan", [
            ("KOMP-BIL-FRAC-CTX", "Menyelesaikan masalah sehari-hari dengan pecahan",
             ["KOMP-BIL-FRAC-ADD"]),
        ]),
    ]),
    ("TP-MAT-D-7-BIL-03", "Menggunakan rasio dan perbandingan senilai untuk menyelesaikan masalah", [
        ("IND-BIL-03-1", "Menentukan perbandingan senilai", [
            ("KOMP-BIL-RATIO", "Menyelesaikan perbandingan senilai", ["KOMP-BIL-FRAC-ADD"]),
        ]),
    ]),
]

ENG_TPS = [
    ("TP-ENG-D-7-REC-01", "Menceritakan pengalaman lampau secara lisan dan tulis", [
        ("IND-ENG-01-1", "Menggunakan simple past tense dengan tepat", [
            ("KOMP-ENG-PAST-TENSE", "Menggunakan simple past tense pada kalimat pernyataan",
             [], {"legacy_skill": "past_tense"}),
            ("KOMP-ENG-PAST-QUESTION", "Membentuk pertanyaan bentuk lampau",
             ["KOMP-ENG-PAST-TENSE"], {"legacy_skill": "past_questions"}),
        ]),
        ("IND-ENG-01-2", "Menggunakan kosakata A2 pada cerita pengalaman", [
            ("KOMP-ENG-VOCAB-A2", "Menggunakan kosakata level A2 secara tepat konteks",
             [], {"legacy_skill": "vocab_a2"}),
        ]),
    ]),
    ("TP-ENG-D-7-LIS-01", "Memahami informasi rinci dari teks lisan dan bacaan pendek", [
        ("IND-ENG-02-1", "Menangkap detail dari teks lisan", [
            ("KOMP-ENG-LISTEN-DETAIL", "Menangkap informasi rinci dari audio pendek",
             [], {"legacy_skill": "listening_detail"}),
        ]),
        ("IND-ENG-02-2", "Menyimpulkan makna tersirat dari bacaan", [
            ("KOMP-ENG-READ-INFER", "Menyimpulkan informasi tersirat dari bacaan pendek",
             ["KOMP-ENG-VOCAB-A2"], {"legacy_skill": "reading_inference"}),
            ("KOMP-ENG-SPEAKING", "Berbicara runtut tentang pengalaman pribadi",
             ["KOMP-ENG-PAST-TENSE"], {"legacy_skill": "speaking"}),
        ]),
    ]),
]


async def seed_curriculum():
    await node("KURMER", "curriculum", None, "Kurikulum Merdeka",
               "Struktur resmi: Fase > Kelas > Mapel > Elemen > CP > TP > Indikator > Kompetensi")
    await node("FASE-D", "phase", "KURMER", "Fase D", "Kelas 7–9", order=4)
    await node("KELAS-7", "grade", "FASE-D", "Kelas 7", order=7)
    await node("MAT-7", "subject", "KELAS-7", "Matematika", order=1)
    await node("ENG-7", "subject", "KELAS-7", "Bahasa Inggris", order=2)
    await node("EL-MAT-BIL", "element", "MAT-7", "Bilangan",
               "Peserta didik memahami dan menggunakan bilangan bulat, pecahan, rasio.", order=1)
    await node("CP-MAT-D-BIL", "cp", "EL-MAT-BIL",
               "Di akhir Fase D peserta didik dapat menyelesaikan masalah yang berkaitan dengan bilangan bulat, "
               "pecahan, rasio, dan proporsi.", order=1)
    await node("EL-ENG-REC", "element", "ENG-7", "Menyimak – Berbicara – Membaca", order=1)
    await node("CP-ENG-D-REC", "cp", "EL-ENG-REC",
               "Di akhir Fase D peserta didik menggunakan bahasa Inggris untuk berinteraksi dan "
               "memahami teks lisan/tulis pendek pada konteks yang dikenal.", order=1)

    for cp_id, tps in (("CP-MAT-D-BIL", MAT_TPS), ("CP-ENG-D-REC", ENG_TPS)):
        for i, (tp_id, tp_name, inds) in enumerate(tps):
            await node(tp_id, "tp", cp_id, tp_name, order=i + 1)
            for j, (ind_id, ind_name, comps) in enumerate(inds):
                await node(ind_id, "indicator", tp_id, ind_name, order=j + 1)
                for k, comp in enumerate(comps):
                    cid, cname, prereq = comp[0], comp[1], comp[2]
                    meta = dict(comp[3]) if len(comp) > 3 else {}
                    meta["prerequisite_competency_ids"] = prereq
                    await node(cid, "competency", ind_id, cname, order=k + 1, meta=meta)
                    await node(f"TOP-{cid[5:][:20]}", "topic", cid, f"Topik: {cname[:50]}", order=1)
                    await node(f"MAT-{cid[5:][:20]}", "material", f"TOP-{cid[5:][:20]}",
                               f"Materi ajar: {cname[:50]}",
                               "Ringkasan konsep, contoh dikerjakan, dan latihan terbimbing.", order=1)


# ---------------- bank soal contoh ----------------
Q = dict
SEED_QUESTIONS: list[dict] = [
    # KOMP-BIL-INT-ADD
    Q(c="KOMP-BIL-INT-ADD", stem="Hitunglah -7 + 12", o=["5", "-5", "19", "-19"], k="A", d=1, cog="C1",
      e="-7 + 12 berarti bergerak 12 langkah ke kanan dari -7, hasilnya 5.",
      h=["Bayangkan garis bilangan: mulai dari -7 lalu maju 12 langkah."],
      dm={"B": "MIS-TANDA-HASIL-IKUT-BILANGAN-PERTAMA", "C": "MIS-ABAIKAN-TANDA-NEGATIF"}),
    Q(c="KOMP-BIL-INT-ADD", stem="Hitunglah 8 - (-5)", o=["3", "13", "-13", "-3"], k="B", d=2, cog="C2",
      e="Mengurangi bilangan negatif sama dengan menambah: 8 + 5 = 13.",
      h=["Dua tanda negatif berdampingan menjadi positif."],
      dm={"A": "MIS-KURANG-NEGATIF-DIANGGAP-KURANG", "C": "MIS-ABAIKAN-TANDA-NEGATIF"}),
    Q(c="KOMP-BIL-INT-ADD", stem="Hitunglah -15 + (-9)", o=["-24", "-6", "6", "24"], k="A", d=2, cog="C1",
      e="Dua bilangan negatif dijumlahkan menjadi lebih negatif: -24.",
      h=["Kalau keduanya negatif, hasilnya makin ke kiri di garis bilangan."],
      dm={"B": "MIS-NEGATIF-DIJUMLAH-JADI-SELISIH"}),
    Q(c="KOMP-BIL-INT-ADD", stem="Nilai dari (-4) + 9 - 11 adalah ...", o=["-6", "6", "-16", "16"], k="A", d=3,
      cog="C2", e="(-4) + 9 = 5; 5 - 11 = -6.",
      h=["Kerjakan dari kiri ke kanan, dua langkah."],
      dm={"B": "MIS-TANDA-HASIL-IKUT-BILANGAN-PERTAMA"}),
    Q(c="KOMP-BIL-INT-ADD", stem="Sebuah lift berada di lantai -3, lalu naik 7 lantai, kemudian turun 2 lantai. "
      "Di lantai berapa lift sekarang?", o=["2", "-2", "8", "12"], k="A", d=3, cog="C3", t=True,
      e="-3 + 7 - 2 = 2. Konteks berubah, operasinya sama.",
      h=["Ubah cerita menjadi kalimat matematika dulu."],
      dm={"B": "MIS-TANDA-HASIL-IKUT-BILANGAN-PERTAMA"}),
    # KOMP-BIL-INT-CTX
    Q(c="KOMP-BIL-INT-CTX", stem="Suhu di puncak gunung -6°C, lalu naik 9°C pada siang hari. Suhu siang itu adalah ...",
      o=["3°C", "-3°C", "15°C", "-15°C"], k="A", d=2, cog="C2",
      e="-6 + 9 = 3. Kenaikan suhu berarti penjumlahan.",
      h=["Naik berarti tambah, turun berarti kurang."], dm={"B": "MIS-ABAIKAN-TANDA-NEGATIF"}),
    Q(c="KOMP-BIL-INT-CTX", stem="Rani punya utang Rp15.000 lalu membayar Rp9.000. Sisa utangnya dinyatakan sebagai ...",
      o=["-6.000", "6.000", "-24.000", "24.000"], k="A", d=3, cog="C3",
      e="Utang = negatif: -15.000 + 9.000 = -6.000.",
      h=["Utang ditulis sebagai bilangan negatif."], dm={"C": "MIS-NEGATIF-DIJUMLAH-JADI-SELISIH"}),
    Q(c="KOMP-BIL-INT-CTX", stem="Kapal selam berada 40 m di bawah permukaan laut, lalu naik 12 m dan turun lagi 5 m. "
      "Posisi akhirnya adalah ...", o=["-33 m", "-57 m", "33 m", "-27 m"], k="A", d=4, cog="C3", t=True,
      e="-40 + 12 - 5 = -33 m.", h=["Di bawah permukaan = negatif."],
      dm={"D": "MIS-URUTAN-OPERASI-DIABAIKAN"}),
    # KOMP-BIL-FRAC-ADD
    Q(c="KOMP-BIL-FRAC-ADD", stem="Hitunglah 2/3 + 1/6", o=["5/6", "3/9", "1/2", "3/6"], k="A", d=2, cog="C1",
      e="Samakan penyebut menjadi 6: 4/6 + 1/6 = 5/6.",
      h=["Cari KPK dari 3 dan 6 lebih dulu."],
      dm={"B": "MIS-PEMBILANG-DAN-PENYEBUT-DIJUMLAH", "D": "MIS-PENYEBUT-DIJUMLAH"}),
    Q(c="KOMP-BIL-FRAC-ADD", stem="Hitunglah 3/4 + 2/5", o=["23/20", "5/9", "6/20", "1"], k="A", d=3, cog="C2",
      e="KPK 20: 15/20 + 8/20 = 23/20.",
      h=["Ubah keduanya ke penyebut 20."],
      dm={"B": "MIS-PEMBILANG-DAN-PENYEBUT-DIJUMLAH", "C": "MIS-PEMBILANG-DIKALI-SILANG"}),
    Q(c="KOMP-BIL-FRAC-ADD", stem="Hitunglah 5/6 - 1/4", o=["7/12", "4/2", "1/3", "6/10"], k="A", d=3, cog="C2",
      e="KPK 12: 10/12 - 3/12 = 7/12.", h=["Samakan penyebut ke 12."],
      dm={"B": "MIS-PENYEBUT-DIKURANGI", "D": "MIS-PEMBILANG-DAN-PENYEBUT-DIJUMLAH"}),
    Q(c="KOMP-BIL-FRAC-ADD", stem="Sebuah resep butuh 1/2 cangkir gula dan 1/3 cangkir madu. Berapa total bahan cair "
      "dalam cangkir?", o=["5/6", "2/5", "1/6", "2/6"], k="A", d=3, cog="C3", t=True,
      e="1/2 + 1/3 = 3/6 + 2/6 = 5/6 cangkir.", h=["Terjemahkan cerita ke penjumlahan pecahan."],
      dm={"B": "MIS-PEMBILANG-DAN-PENYEBUT-DIJUMLAH"}),
    # KOMP-BIL-FRAC-CTX
    Q(c="KOMP-BIL-FRAC-CTX", stem="Ayah mengecat 2/5 dinding pada pagi hari dan 1/4 pada siang hari. Bagian dinding "
      "yang sudah dicat adalah ...", o=["13/20", "3/9", "3/20", "1/2"], k="A", d=3, cog="C3",
      e="2/5 + 1/4 = 8/20 + 5/20 = 13/20.", h=["Samakan penyebut ke 20."],
      dm={"B": "MIS-PEMBILANG-DAN-PENYEBUT-DIJUMLAH"}),
    Q(c="KOMP-BIL-FRAC-CTX", stem="Dari 3/4 kg tepung, dipakai 1/3 kg. Sisa tepung adalah ... kg",
      o=["5/12", "2/1", "1/2", "4/12"], k="A", d=4, cog="C3",
      e="3/4 - 1/3 = 9/12 - 4/12 = 5/12 kg.", h=["Kurangkan setelah penyebut sama."],
      dm={"C": "MIS-PENYEBUT-DIKURANGI"}),
    Q(c="KOMP-BIL-FRAC-CTX", stem="Sebuah tangki terisi 2/3 bagian. Setelah dipakai 1/6 bagian, lalu diisi lagi 1/4 "
      "bagian, berapa bagian tangki terisi sekarang?", o=["3/4", "5/6", "1/2", "7/12"], k="A", d=5, cog="C4", t=True,
      e="2/3 - 1/6 + 1/4 = 8/12 - 2/12 + 3/12 = 9/12 = 3/4.",
      h=["Kerjakan berurutan dengan penyebut 12."], dm={"D": "MIS-URUTAN-OPERASI-DIABAIKAN"}),
    # Bahasa Inggris
    Q(c="KOMP-ENG-PAST-TENSE", stem="Yesterday I ___ to my grandmother's house.",
      o=["went", "go", "gone", "going"], k="A", d=1, cog="C1",
      e="“Yesterday” menandakan bentuk lampau, jadi verb 2: went.",
      h=["Cari penanda waktu lampau di kalimat."],
      dm={"B": "MIS-VERB1-DIPAKAI-UNTUK-LAMPAU", "C": "MIS-VERB3-DIPAKAI-TANPA-HAVE"}),
    Q(c="KOMP-ENG-PAST-TENSE", stem="She ___ her homework two hours ago.",
      o=["finished", "finish", "finishes", "finishing"], k="A", d=2, cog="C1",
      e="“ago” = lampau, gunakan verb + -ed: finished.",
      h=["Kata “ago” selalu menandai lampau."], dm={"C": "MIS-VERB1-DIPAKAI-UNTUK-LAMPAU"}),
    Q(c="KOMP-ENG-PAST-TENSE", stem="Choose the correct sentence about last weekend.",
      o=["We watched a movie last Sunday.", "We watch a movie last Sunday.",
         "We are watching a movie last Sunday.", "We watches a movie last Sunday."], k="A", d=3, cog="C3", t=True,
      e="Hanya pilihan A memakai verb 2 dengan penanda waktu lampau.",
      h=["Periksa bentuk verb pada setiap pilihan."], dm={"B": "MIS-VERB1-DIPAKAI-UNTUK-LAMPAU"}),
    Q(c="KOMP-ENG-PAST-QUESTION", stem="___ you visit the museum last week?",
      o=["Did", "Do", "Does", "Are"], k="A", d=2, cog="C2",
      e="Pertanyaan lampau memakai “Did” + verb 1.",
      h=["Untuk pertanyaan lampau, auxiliary-nya “did”."],
      dm={"B": "MIS-AUX-DO-UNTUK-LAMPAU", "C": "MIS-AUX-DOES-UNTUK-LAMPAU"}),
    Q(c="KOMP-ENG-PAST-QUESTION", stem="Which question is correct?",
      o=["Where did she go yesterday?", "Where she went yesterday?",
         "Where did she went yesterday?", "Where does she go yesterday?"], k="A", d=3, cog="C3", t=True,
      e="Setelah “did”, verb kembali ke bentuk dasar: did she go.",
      h=["Setelah did, verb tidak berubah bentuk."],
      dm={"C": "MIS-DID-DENGAN-VERB2"}),
    Q(c="KOMP-ENG-VOCAB-A2", stem="The weather was very ___ so we stayed at home.",
      o=["terrible", "delicious", "punctual", "narrow"], k="A", d=2, cog="C2",
      e="“terrible” cocok untuk cuaca buruk.", h=["Pilih kata yang biasa dipakai untuk cuaca."],
      dm={"B": "MIS-KOLOKASI-SALAH"}),
]


async def seed_questions(actor="seed"):
    made = 0
    for row in SEED_QUESTIONS:
        exists = await db.questions.find_one({"stem": row["stem"], "is_current": True}, {"_id": 0})
        if exists:
            continue
        body = QuestionIn(competency_id=row["c"], stem=row["stem"], options=row.get("o") or [],
                          answer_key=row.get("k", ""), explanation=row.get("e", ""),
                          hints=[row["h"][0]] if row.get("h") else [],
                          difficulty=row.get("d", 2), cognitive_level=row.get("cog", "C2"),
                          distractor_misconceptions=row.get("dm") or {},
                          misconception_id=(list((row.get("dm") or {}).values()) or [None])[0],
                          is_transfer=bool(row.get("t")), estimated_time=60 + 20 * row.get("d", 2),
                          question_type="mcq", status="PUBLISHED", source="seed")
        doc = await _dna(body, actor)
        doc["issues"] = await validate_doc(doc)
        await db.questions.insert_one(dict(doc))
        made += 1
    return made


async def seed_demo_class(teacher_id: str):
    cls = await db.classes.find_one({"code": "FZ-DEMO7A"}, {"_id": 0})
    if cls:
        return cls
    names = ["Rina", "Dimas", "Sari", "Bagas", "Nadia", "Fikri", "Rizky", "Ayu", "Bayu", "Citra",
             "Dewi", "Eko", "Farel", "Gita", "Hana", "Ilham", "Joko", "Kirana"]
    student_ids = []
    for n in names:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": uid, "name": n, "role": "student", "provider": "roster", "class_ids": [], "created_at": now()})
        student_ids.append(uid)
    doc = {"id": f"CLS-{uuid.uuid4().hex[:8].upper()}", "code": "FZ-DEMO7A",
           "name": "Matematika — Kelas 7A (demo)", "grade_id": "KELAS-7", "subject_id": "MAT-7",
           "teacher_id": teacher_id, "student_ids": student_ids, "demo": True, "created_at": now()}
    await db.classes.insert_one(dict(doc))
    await db.users.update_many({"user_id": {"$in": student_ids}}, {"$addToSet": {"class_ids": doc["id"]}})
    doc.pop("_id", None)
    return doc


async def seed_demo_evidence(class_id: str):
    """Evidence sintetis deterministik supaya dashboard guru langsung bermakna."""
    import braincore as bc
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    sids = (cls or {}).get("student_ids") or []
    qs = await db.questions.find({"tp_id": {"$in": ["TP-MAT-D-7-BIL-01", "TP-MAT-D-7-BIL-02"]},
                                   "is_current": True, "status": "PUBLISHED"}, {"_id": 0}).to_list(200)
    if not qs or await db.attempts.find_one({"class_id": class_id, "source": "seed"}):
        return 0
    made = 0
    for i, sid in enumerate(sids):
        strength = (i % 5) / 4.0  # 0..1 deterministik
        for j, q in enumerate(qs):
            if (i + j) % 3 == 2:
                continue
            correct = ((j * 7 + i * 3) % 10) / 10.0 < (0.25 + 0.6 * strength) - 0.06 * (q["difficulty"] - 2)
            conf = 1.0 if correct and strength > 0.6 else 0.6 if correct else 0.2 if strength < 0.4 else 0.9
            chosen = q["answer_key"] if correct else next(iter((q.get("distractor_misconceptions") or {"B": ""})), "B")
            mis = None if correct else (q.get("distractor_misconceptions") or {}).get(chosen) or q.get("misconception_id")
            att = {"id": f"AT-{uuid.uuid4().hex[:12].upper()}",
                   "idempotency_key": f"seed:{sid}:{q['question_id']}",
                   "session_id": None, "assessment_id": None, "student_id": sid, "class_id": class_id,
                   "question_id": q["question_id"], "question_version": q["version"],
                   "competency_id": q["competency_id"], "tp_id": q.get("tp_id"), "cp_id": q.get("cp_id"),
                   "indicator_id": q.get("indicator_id"), "curriculum_id": q.get("curriculum_id"),
                   "difficulty": q["difficulty"], "cognitive_level": q["cognitive_level"],
                   "chosen": chosen, "correct": bool(correct), "confidence": conf, "time_ms": 30000,
                   "hints_used": 0 if correct else 1, "retry_of": None,
                   "is_transfer": q.get("is_transfer", False), "misconception_id": mis,
                   "diagnosis": bc.diagnose(bool(correct), conf, 30000, 0, q["estimated_time"], mis)["label"],
                   "source": "seed", "at": now()}
            try:
                await db.attempts.insert_one(dict(att))
            except Exception:
                continue
            await bc.apply_attempt(att)
            made += 1
    return made


class SeedIn(BaseModel):
    with_demo_class: bool = True
    teacher_id: str | None = None


@router.post("/seed/curriculum")
async def seed_route(body: SeedIn, actor=Depends(owner_guard)):
    await seed_curriculum()
    n = await seed_questions()
    out = {"curriculum": "KURMER", "questions_created": n}
    if body.with_demo_class:
        cls = await seed_demo_class(body.teacher_id or actor["user_id"])
        out["class"] = cls
        out["evidence_created"] = await seed_demo_evidence(cls["id"])
    return out


@router.post("/seed/bootstrap")
async def bootstrap(u=Depends(teacher_user)):
    """Bootstrap untuk guru yang baru masuk: kurikulum + bank soal + kelas demo miliknya."""
    await seed_curriculum()
    n = await seed_questions()
    existing = await db.classes.find_one({"teacher_id": u["user_id"]}, {"_id": 0})
    if existing:
        return {"questions_created": n, "class": existing, "evidence_created": 0}
    cls = await seed_demo_class(u["user_id"])
    if cls.get("teacher_id") != u["user_id"]:
        await db.classes.update_one({"id": cls["id"]}, {"$set": {"teacher_id": u["user_id"]}})
        cls["teacher_id"] = u["user_id"]
    ev = await seed_demo_evidence(cls["id"])
    return {"questions_created": n, "class": cls, "evidence_created": ev}


# ---------------- migrasi backward-compatible ----------------
class LegacyIn(BaseModel):
    """Impor state Ruang Guru lama (localStorage fiezel-teacher-v1) tanpa merusak data lama."""
    teacher_state: dict


@router.post("/migration/legacy-teacher-store")
async def migrate_legacy(body: LegacyIn, u=Depends(teacher_user)):
    import braincore as bc
    await seed_curriculum()
    legacy = await db.curriculum_nodes.find({"type": "competency", "meta.legacy_skill": {"$exists": True}},
                                             {"_id": 0}).to_list(100)
    skill_map = {n["meta"]["legacy_skill"]: n for n in legacy}
    report = {"classes": 0, "students": 0, "evidence": 0, "unmapped_skills": set()}
    for c in (body.teacher_state.get("classes") or []):
        code = (c.get("code") or "").upper() or f"FZ-LEG{uuid.uuid4().hex[:4].upper()}"
        cls = await db.classes.find_one({"code": code}, {"_id": 0})
        if not cls:
            cls = {"id": f"CLS-{uuid.uuid4().hex[:8].upper()}", "code": code,
                   "name": c.get("name") or "Kelas impor", "grade_id": "KELAS-7", "subject_id": "ENG-7",
                   "teacher_id": u["user_id"], "student_ids": [], "legacy_id": c.get("id"),
                   "migrated_at": now(), "created_at": now()}
            await db.classes.insert_one(dict(cls))
            cls.pop("_id", None)
            report["classes"] += 1
        for s in (c.get("students") or []):
            existing = await db.users.find_one({"legacy_id": s.get("id")}, {"_id": 0})
            if existing:
                sid = existing["user_id"]
            else:
                sid = f"user_{uuid.uuid4().hex[:12]}"
                await db.users.insert_one({"user_id": sid, "name": s.get("name") or "Murid",
                                           "role": "student", "provider": "legacy_import",
                                           "legacy_id": s.get("id"),
                                           "class_ids": [cls["id"]], "created_at": now()})
                report["students"] += 1
            await db.classes.update_one({"id": cls["id"]}, {"$addToSet": {"student_ids": sid}})
            for r in (s.get("results") or []):
                comp = skill_map.get(r.get("skill"))
                if not comp:
                    report["unmapped_skills"].add(r.get("skill"))
                    continue
                total = int(r.get("total") or 0)
                correct = int(r.get("correct") or 0)
                if total <= 0:
                    continue
                st = await bc.get_state(sid, comp["id"])
                st["attempts"] += total
                st["correct"] += correct
                st["exposures"] = max(1, st["exposures"])
                p = st["p_mastery"]
                for i in range(total):
                    p = bc.bkt_update(p, i < correct)
                st["p_mastery"] = round(p, 4)
                st["tp_id"] = comp.get("tp_id")
                st["last_at"] = now()
                st["state"] = bc.derive_state(st)
                await db.learner_competency.update_one(
                    {"student_id": sid, "competency_id": comp["id"]},
                    {"$set": {**st, "migrated_from": "legacy_skill_aggregate"}}, upsert=True)
                report["evidence"] += 1
    report["unmapped_skills"] = sorted(report["unmapped_skills"])
    report["note"] = ("Agregat skill lama dipetakan ke kompetensi kurikulum. Data lama tetap utuh di "
                      "perangkat guru; ini penambahan, bukan penggantian.")
    return report
