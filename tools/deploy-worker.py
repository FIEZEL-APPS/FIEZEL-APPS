#!/usr/bin/env python3
"""Deploy Worker fiezel-api ke Cloudflare lewat REST API (multipart ESM)."""
import json,os,subprocess,secrets,pathlib,sys,tempfile

ACC="5873d77925352c66c02cdf45afe14977"
BASE=f"https://api.cloudflare.com/client/v4/accounts/{ACC}"
ROOT=pathlib.Path("/home/user/workspace/FIEZEL-APPS/workers/api")
NAME="fiezel-api"
CORE="7bc356dc-8aff-41e1-b682-ae2039c58c55"
STATS="c712000c-aab9-4a1d-b43d-e6d4c9b36ee8"
KV="6386fc9752e14afd8a8f76a8d45e47d1"
SECFILE=pathlib.Path("/home/user/workspace/.cf-secrets.json")

# VARS DIBACA DARI wrangler.toml, TIDAK LAGI DIKETIK DI SINI.
#
# Sebelum ini berkas ini memegang daftar var sendiri, dan daftar itu menyimpang: ia mengirim
# AI_LIMIT_PER_DAY=20 dan TTS_CHARS_PER_DAY=6000 sementara workers/api/wrangler.toml (dan
# quota-config.js yang MENEGAKKAN kuota) sudah 25 dan 12000. Akibatnya Worker terpasang
# menyajikan angka jatah yang BOHONG ke murid: /api/config bilang 20, /api/quota menegakkan 25.
# Deploy berkali-kali tidak memperbaikinya karena yang salah bukan repo, melainkan alat ini.
#
# Ini kelas bug yang sama dengan tabrakan nomor build: dua sumber kebenaran untuk satu angka.
# Obatnya sama: satu sumber. wrangler.toml yang menang, dan berkas ini membacanya.

def load_vars(path="/home/user/workspace/FIEZEL-APPS/workers/api/wrangler.toml"):
    """Ambil blok [vars] dari wrangler.toml. Sengaja parser kecil, bukan pustaka TOML:
    yang dibutuhkan hanya `KUNCI = "nilai"` di dalam satu blok, dan ketergantungan baru
    di jalur deploy adalah risiko yang tidak sepadan."""
    import re as _re, pathlib as _pl
    isi = _pl.Path(path).read_text()
    m = _re.search(r'^\[vars\]\s*$(.*?)(?=^\[|\Z)', isi, _re.M | _re.S)
    if not m:
        raise SystemExit("BLOK [vars] TIDAK DITEMUKAN di " + path + " - jangan deploy dengan var kosong")
    out = {}
    for baris in m.group(1).splitlines():
        baris = baris.split('#', 1)[0].strip()
        if not baris or '=' not in baris:
            continue
        k, v = baris.split('=', 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k:
            out[k] = v
    if not out:
        raise SystemExit("BLOK [vars] terbaca kosong - berhenti, jangan kirim Worker tanpa var")
    return out


VARS = load_vars()
# Pagar: kalau angka jatah hilang dari wrangler.toml, JANGAN diam-diam mengirim Worker tanpa
# angka itu. Worker yang kehilangan AI_LIMIT_PER_DAY menyajikan limits 0 ke murid.
for _wajib in ("AI_LIMIT_PER_DAY", "TTS_CHARS_PER_DAY", "PROTOCOL_VERSION", "ALLOWED_ORIGINS"):
    if _wajib not in VARS:
        raise SystemExit("var wajib hilang dari wrangler.toml: " + _wajib)
print("vars dibaca dari wrangler.toml:", len(VARS), "kunci | AI_LIMIT_PER_DAY=" + VARS["AI_LIMIT_PER_DAY"],
      "TTS_CHARS_PER_DAY=" + VARS["TTS_CHARS_PER_DAY"])

SECRET_NAMES=["SESSION_HMAC_KEY_CURRENT","SESSION_HMAC_KEY_PREVIOUS",
 "PUTER_CLAIM_SECRET_CURRENT","PUTER_CLAIM_SECRET_PREVIOUS",
 "IDENTITY_PEPPER","ANALYTICS_PEPPER","RATE_SALT","OWNER_SUBJECT","CRON_TOKEN","EDGE_SHARED_SECRET"]

def load_secrets():
    if SECFILE.exists(): return json.loads(SECFILE.read_text())
    s={n:secrets.token_hex(32) for n in SECRET_NAMES}
    SECFILE.write_text(json.dumps(s,indent=1)); SECFILE.chmod(0o600)
    return s

def modules():
    out=[]
    for p in sorted(ROOT.rglob("*.js")):
        rel=p.relative_to(ROOT).as_posix()
        if rel.startswith("migrations/"): continue
        out.append((rel,p))
    return out

def build_metadata(sec):
    b=[{"type":"d1","name":"CORE_DB","id":CORE},
       {"type":"d1","name":"STATS_DB","id":STATS},
       {"type":"kv_namespace","name":"CFG","namespace_id":KV},
       {"type":"r2_bucket","name":"AUDIO","bucket_name":"fiezel-audio"},
       {"type":"ai","name":"AI"}]
    # AE (Analytics Engine) SENGAJA DILEWATI: butuh diaktifkan sekali lewat dashboard
    # (error 10089). AE hanya untuk event operasional, BUKAN sumber kebenaran DAU/MAU
    # (itu D1 fiezel-stats). Jadi ketiadaannya tidak melumpuhkan apa pun di fase ini.
    if os.environ.get("CF_AE")=="1":
        b.append({"type":"analytics_engine","name":"AE","dataset":"fiezel_events"})
    for k,v in VARS.items(): b.append({"type":"plain_text","name":k,"text":v})
    for k in SECRET_NAMES: b.append({"type":"secret_text","name":k,"text":sec[k]})
    return {"main_module":"index.js","compatibility_date":"2026-06-01","bindings":b}

def deploy():
    sec=load_secrets(); meta=build_metadata(sec)
    with tempfile.TemporaryDirectory() as td:
        mp=pathlib.Path(td)/"metadata.json"; mp.write_text(json.dumps(meta))
        cmd=["curl","-s","--max-time","300","-X","PUT",f"{BASE}/workers/scripts/{NAME}",
             "-F",f"metadata=@{mp};type=application/json"]
        for rel,p in modules():
            cmd+=["-F",f"{rel}=@{p};type=application/javascript+module;filename={rel}"]
        r=subprocess.run(cmd,capture_output=True,text=True)
    try: d=json.loads(r.stdout)
    except Exception: print("RAW:",r.stdout[:800]); return None
    return d

if __name__=="__main__":
    mods=modules(); print("modul:",len(mods))
    d=deploy()
    if d is None: sys.exit(1)
    if d.get("success"):
        print("DEPLOY OK", d["result"].get("id"), "etag",str(d["result"].get("etag"))[:12])
    else:
        print("DEPLOY GAGAL"); print(json.dumps(d.get("errors"),indent=1)[:1500])
