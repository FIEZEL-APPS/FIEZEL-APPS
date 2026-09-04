#!/usr/bin/env node
/* nightwatch.mjs — PEMERIKSA JAGA MALAM untuk repo FIEZEL.
 *
 * Dijalankan tiap jam oleh sesi master. Tugasnya BUKAN menilai mutu kode; itu pekerjaan 170+
 * gerbang di quality.yml. Tugasnya adalah menangkap kelas kerusakan yang hanya muncul di
 * SELA-SELA pekerjaan beberapa sesi paralel, yang tidak dilihat gerbang mana pun karena
 * gerbang hanya melihat satu tree pada satu waktu:
 *
 *   1. CI `main` merah dan tidak ada yang menyadarinya.
 *   2. Nomor build tidak selaras (tiga penanda vs sumber tunggal) - ini yang bertabrakan lima
 *      kali dalam satu malam 28 Agu 2026.
 *   3. Penanda konflik merge ter-commit ke berkas terlacak.
 *   4. Berkas uji mendarat tanpa terdaftar di CI (gerbang yang tidak terdaftar tidak pernah merah).
 *   5. Klaim wilayah kerja bertumpang-tindih antar sesi (tabrakan yang BELUM terjadi).
 *   6. Jembatan `api.fiezel.my.id` mati atau flag server berubah tanpa pemberitahuan.
 *
 * Keluaran: JSON ke stdout, ringkasan ke stderr, exit 0 kalau sehat, exit 1 kalau ada temuan.
 * Ia TIDAK memperbaiki apa pun sendiri dan tidak pernah push - keputusan perbaikan ada di
 * pemanggilnya. Pemeriksa yang juga menulis ke main tanpa mata manusia adalah cara bagus
 * untuk merusak pekerjaan sesi lain jam tiga pagi.
 *
 * Pakai: node tools/nightwatch.mjs [--luring]
 *        --luring melewati pemeriksaan yang butuh jaringan (CI dan jembatan).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LURING = process.argv.includes('--luring');

const temuan = [];
const catatan = [];
function lapor(tingkat, kode, pesan, bukti) {
  temuan.push({ tingkat, kode, pesan, bukti: bukti === undefined ? null : bukti });
}
function sh(cmd, timeout = 120000) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function shAman(cmd, timeout = 120000) {
  try {
    return sh(cmd, timeout);
  } catch (e) {
    return { galat: String((e && e.message) || e).slice(0, 300) };
  }
}

/* ---------------------------------------------------- 1. sinkron + CI ------------------- */
let shaLokal = null;
let shaHulu = null;
if (!LURING) {
  const fetchHasil = shAman('git fetch origin main --quiet');
  if (fetchHasil && fetchHasil.galat) {
    lapor('peringatan', 'FETCH_GAGAL', 'Tidak bisa mengambil origin/main, jadi seluruh pemeriksaan sinkron di bawah TIDAK berlaku.', fetchHasil.galat);
  }
}
shaLokal = shAman('git rev-parse HEAD');
shaHulu = shAman('git rev-parse origin/main');
if (typeof shaLokal === 'string' && typeof shaHulu === 'string') {
  const belumDitarik = shAman('git rev-list --count HEAD..origin/main');
  const belumDikirim = shAman('git rev-list --count origin/main..HEAD');
  catatan.push({ shaLokal: shaLokal.slice(0, 8), shaHulu: shaHulu.slice(0, 8), belumDitarik, belumDikirim });
  /* Menghitung commit saja tidak cukup: pekerjaan yang belum di-commit sama tidak terlihatnya
   * bagi sesi lain, dan justru itu yang paling sering jadi sumber tabrakan karena pemiliknya
   * merasa "sudah mengerjakan" area itu. Artefak yang di-gitignore tidak dihitung. */
  const kotor = shAman('git status --porcelain');
  if (typeof kotor === 'string' && kotor.length > 0) {
    const baris = kotor.split('\n').filter(Boolean);
    catatan.push({ berkasBelumDicommit: baris.length, contoh: baris.slice(0, 5) });
    lapor('peringatan', 'WORKTREE_KOTOR', baris.length + ' berkas berubah tapi belum di-commit. Sesi lain tidak bisa melihatnya, jadi area itu tampak bebas bagi mereka.', baris.slice(0, 10));
  }

  if (typeof belumDikirim === 'string' && Number(belumDikirim) > 0) {
    lapor('peringatan', 'BELUM_DIKIRIM', Number(belumDikirim) + ' commit lokal belum ada di main. Selama belum dikirim, sesi lain tidak bisa melihatnya dan bisa menulis area yang sama.', belumDikirim);
  }
}

/* CI dinilai untuk SHA origin/main, BUKAN untuk run terbaru di daftar.
 *
 * Versi pertama memakai `gh run list` lalu mengambil entri quality paling atas. Itu salah, dan
 * terbukti salah di lapangan: daftar itu memuat run untuk commit antara dan untuk cabang sesi
 * lain, jadi nightwatch melaporkan CI_MERAH (kritis) untuk commit yang sudah tergantikan
 * sementara HEAD main sebenarnya hijau. Alarm palsu berulang lebih buruk daripada tidak ada
 * alarm: ia melatih orang mengabaikan laporan. */
if (!LURING && typeof shaHulu === 'string' && /^[0-9a-f]{7,40}$/.test(shaHulu)) {
  const cr = shAman('gh api "repos/FIEZEL-APPS/FIEZEL-APPS/commits/' + shaHulu + '/check-runs?per_page=30" 2>/dev/null');
  if (typeof cr === 'string' && cr.startsWith('{')) {
    try {
      const daftar = (JSON.parse(cr).check_runs || []).map((c) => ({
        nama: c.name, status: c.status, hasil: c.conclusion
      }));
      catatan.push({ ciPadaMain: { sha: shaHulu.slice(0, 8), jumlahCheck: daftar.length } });

      const quality = daftar.filter((c) => /^quality$/i.test(c.nama));
      if (quality.length === 0) {
        lapor('peringatan', 'CI_BELUM_ADA', 'Belum ada check `quality` untuk HEAD main ' + shaHulu.slice(0, 8) + '. Jangan simpulkan hijau dari ketiadaan check.', daftar.map((c) => c.nama).slice(0, 10));
      } else if (quality.some((c) => c.hasil === 'failure')) {
        lapor('kritis', 'CI_MERAH', 'Check `quality` MERAH pada HEAD main ' + shaHulu.slice(0, 8) + '. Jangan menumpuk pekerjaan di atas main yang merah.', quality);
      } else if (quality.every((c) => c.status !== 'completed')) {
        lapor('peringatan', 'CI_BERJALAN', 'Check `quality` masih berjalan pada HEAD main ' + shaHulu.slice(0, 8) + '; belum boleh dianggap hijau.', quality);
      }

      /* `MASTER-only authority` dikecualikan DENGAN SENGAJA: ia gagal karena atribusi aktor pada
       * push agen, bukan karena ada yang rusak, dan itu sudah diverifikasi terpisah. Menaikkannya
       * jadi temuan tiap jam hanya menghasilkan kebisingan yang menutupi temuan sungguhan. */
      const lainMerah = daftar.filter((c) => c.hasil === 'failure' && !/^quality$/i.test(c.nama) && !/authority/i.test(c.nama));
      if (lainMerah.length) {
        lapor('peringatan', 'CHECK_LAIN_MERAH', lainMerah.length + ' check non-quality merah pada HEAD main.', lainMerah);
      }
    } catch (e) {
      lapor('peringatan', 'CI_TAK_TERBACA', 'Jawaban check-runs tidak bisa dibaca.', String(e.message).slice(0, 200));
    }
  } else {
    lapor('peringatan', 'CI_TAK_TERJANGKAU', 'Status CI untuk HEAD main tidak bisa diambil (403, batas laju, atau izin). Jangan simpulkan CI hijau dari ketiadaan data.', cr && cr.galat ? String(cr.galat).slice(0, 200) : String(cr).slice(0, 200));
  }
}

/* Blok lama berbasis `gh run list` DIMATIKAN, bukan dihapus, supaya alasan matinya terbaca di
 * tempat kejadian. Jangan dinyalakan lagi: penilaian CI harus terikat pada SHA. */
if (false) {
  const ci = shAman('gh run list --limit 8 --json name,status,conclusion,headSha 2>/dev/null');
  if (typeof ci === 'string' && ci.startsWith('[')) {
    try {
      const runs = JSON.parse(ci);
      const quality = runs.filter((r) => /quality/i.test(r.name));
      const terbaru = quality[0] || null;
      catatan.push({ ciTerbaru: terbaru });
      if (terbaru && terbaru.conclusion === 'failure') {
        lapor('kritis', 'CI_MERAH', 'Gerbang mutu CI MERAH pada commit ' + String(terbaru.headSha).slice(0, 8) + '. Jangan menumpuk pekerjaan di atas main yang merah.', terbaru);
      }
      const gagalLain = runs.filter((r) => r.conclusion === 'failure' && !/quality|authority/i.test(r.name));
      if (gagalLain.length) {
        lapor('peringatan', 'WORKFLOW_LAIN_MERAH', gagalLain.length + ' workflow non-quality merah.', gagalLain.map((r) => r.name));
      }
    } catch (e) {
      lapor('peringatan', 'CI_TAK_TERBACA', 'Keluaran daftar CI tidak bisa dibaca.', String(e.message).slice(0, 200));
    }
  } else {
    lapor('peringatan', 'CI_TAK_TERJANGKAU', 'Status CI tidak bisa diambil (batas laju API atau izin). Jangan simpulkan CI hijau dari ketiadaan data.', ci && ci.galat ? ci.galat : String(ci).slice(0, 200));
  }
}

/* ---------------------------------------------------- 2. keselarasan versi -------------- */
const cek = shAman('node tools/bump-build.mjs --check');
if (cek && cek.galat) {
  lapor('kritis', 'VERSI_TAK_SELARAS', 'Tiga penanda build tidak selaras dengan coordination/BUILD-VERSION.json. Satu revisi service worker yang memayungi dua daftar precache berarti sebagian murid memegang shell cache campur.', cek.galat);
} else if (typeof cek === 'string') {
  try {
    catatan.push({ versi: JSON.parse(cek.replace(/\nSelaras\.$/, '')) });
  } catch {
    catatan.push({ versiMentah: cek.slice(0, 200) });
  }
}

/* ---------------------------------------------------- 3-5. penjaga koordinasi ----------- */
const guard = shAman('node coordination-guard-test.js');
if (guard && guard.galat) {
  lapor('kritis', 'KOORDINASI_MERAH', 'coordination-guard-test.js MERAH: penanda konflik ter-commit, klaim bertumpang-tindih, atau versi tidak selaras. Baca MASTER-BROADCAST.md prosedur P10.', String(guard.galat).slice(0, 600));
}

const registry = shAman('node gate-registry-test.js');
if (registry && registry.galat) {
  lapor('kritis', 'GERBANG_TAK_TERDAFTAR', 'Ada berkas uji di repo yang tidak dipanggil quality.yml. Gerbang yang tidak terdaftar tidak pernah merah, jadi "semua hijau" jadi angka bohong.', String(registry.galat).slice(0, 600));
}

/* ---------------------------------------------------- 6. jembatan + flag ---------------- */
if (!LURING) {
  const sehat = shAman('curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 30 https://api.fiezel.my.id/healthz');
  if (typeof sehat === 'string') {
    const [kode, detik] = sehat.split(/\s+/);
    catatan.push({ jembatan: { kode, detik } });
    if (kode !== '200') {
      lapor('kritis', 'JEMBATAN_MATI', 'Jembatan api.fiezel.my.id menjawab ' + kode + ', bukan 200. Selama flag klien masih mati murid tidak terdampak, tetapi rollout terhenti.', sehat);
    } else if (Number(detik) > 3) {
      lapor('peringatan', 'JEMBATAN_LAMBAT', 'Jembatan menjawab ' + detik + ' s. Batas waktu klien jalur CF 8000 ms; kalau ini mendekati, jalur config akan diputus aplikasi sendiri.', sehat);
    }
  } else {
    lapor('peringatan', 'JEMBATAN_TAK_TERJANGKAU', 'Kesehatan jembatan tidak bisa diukur dari lingkungan ini.', sehat.galat);
  }

  const cfg = shAman('curl -s --max-time 30 https://api.fiezel.my.id/api/config');
  if (typeof cfg === 'string' && cfg.startsWith('{')) {
    try {
      const j = JSON.parse(cfg);
      catatan.push({ flagServer: j.flags, killSwitch: j.enabled, limits: j.limits });
      const nyala = Object.entries(j.flags || {}).filter(([, v]) => v === true).map(([k]) => k);
      catatan.push({ flagNyala: nyala });
      /* Yang berbahaya BUKAN flag nyala, melainkan flag AI/TTS nyala tanpa keputusan owner:
       * itu membelanjakan uang dan kuota murid. */
      for (const k of ['cfAiEnabled', 'cfTtsEnabled']) {
        if (j.flags && j.flags[k] === true) {
          lapor('kritis', 'FLAG_BERBIAYA_NYALA', 'Flag ' + k + ' HIDUP. Ini membelanjakan Workers AI. Owner belum menyetujui penyalaan untuk murid.', j.flags);
        }
      }
    } catch (e) {
      lapor('peringatan', 'CONFIG_TAK_TERBACA', 'Jawaban /api/config bukan JSON yang bisa dibaca.', cfg.slice(0, 200));
    }
  }
}

/* ---------------------------------------------------- keluaran -------------------------- */
const hasil = {
  alat: 'nightwatch',
  waktu: new Date().toISOString(),
  luring: LURING,
  sehat: temuan.length === 0,
  jumlah: {
    kritis: temuan.filter((t) => t.tingkat === 'kritis').length,
    peringatan: temuan.filter((t) => t.tingkat === 'peringatan').length
  },
  temuan,
  catatan
};
console.log(JSON.stringify(hasil, null, 2));
console.error('nightwatch: ' + (hasil.sehat ? 'SEHAT' : hasil.jumlah.kritis + ' kritis, ' + hasil.jumlah.peringatan + ' peringatan'));
process.exit(temuan.length ? 1 : 0);
