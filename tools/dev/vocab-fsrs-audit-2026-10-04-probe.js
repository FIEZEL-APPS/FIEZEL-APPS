#!/usr/bin/env node
/**
 * tools/dev/vocab-fsrs-audit-2026-10-04-probe.js — bukti untuk
 * reports/VOCAB-FSRS-AUDIT-2026-10-04.md. BUKAN gerbang: mencetak angka, selalu exit 0.
 *
 *   node tools/dev/vocab-fsrs-audit-2026-10-04-probe.js
 *
 * Menjalankan index.html sungguhan di Chromium (Playwright). Berkas repo disajikan lewat
 * page.route (tanpa server, tanpa egress). Jam halaman DIPALSUKAN (Date.now) supaya jadwal
 * ulangan bisa diuji maju hari demi hari tanpa menunggu.
 *
 * V1  Kartu BARU dijawab salah -> kapan jatuh tempo lagi (FSRS-lite: updateMemory + gap 0.9).
 * V2  Kartu MATANG (5 ulangan berhasil sesuai jadwalnya sendiri) lalu salah -> jatuh tempo kapan.
 * V3  Kartu yang salah benar-benar muncul di "Review jatuh tempo" sesudah jedanya, tidak sebelumnya.
 * V4  "Uji kosakata" (startVocabQuiz): apakah kartu jatuh tempo didahulukan, atau acak murni.
 * V5  "Sudah hafal" (markMastered) vs model FSRS: jadwal 30 hari, tetapi risiko lupa dibaca
 *     dari stabilityDays lama.
 * V6  Naik level: kartu level lama yang jatuh tempo masih ditagih atau hilang dari ulangan.
 * V7  Flashcard "Masih belajar" dicatat sebagai jawaban SALAH (lapse) atau tidak.
 * V8  Matematika modul: R(gap) = 0.9 tepat; sukses prematur (R≈1) tidak menumbuhkan stabilitas.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { console.log('Playwright tidak tersedia — probe dilewati.'); process.exit(0); }

const ORIGIN = 'http://localhost:4173';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const DAY = 86400000;
const out = (id, title, data) => { console.log(`\n=== ${id} — ${title}`); for (const [k, v] of Object.entries(data)) console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
const fmt = ms => { const m = ms / 60000; return m < 120 ? `${m.toFixed(1)} menit` : (m < 2880 ? `${(m / 60).toFixed(1)} jam` : `${(m / 1440).toFixed(2)} hari`); };

async function boot(browser) {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== ORIGIN) return route.abort();
    const t = path.resolve(ROOT, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname).slice(1));
    if (!t.startsWith(ROOT + path.sep) || !fs.existsSync(t) || fs.statSync(t).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(t)] || 'application/octet-stream', body: fs.readFileSync(t) });
  });
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
    // Jam palsu yang bisa dimajukan: __fz.shift(ms).
    const realNow = Date.now.bind(Date);
    window.__fzClock = { offset: 0 };
    Date.now = () => realNow() + window.__fzClock.offset;
  });
  await page.goto(ORIGIN + '/');
  await page.waitForFunction(() => typeof window.updateMastery === 'function' && typeof window.startVocabQuiz === 'function' && self.FiezelCoreBrain, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove(); document.querySelector('.fiezel-ob')?.remove();
    window.__getFiezelState().preferences.activeLevel = 'A1';
  });
  return page;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await boot(browser);

    // ---- V8 dulu: matematika modul (murni) ---------------------------------------------
    const v8 = await page.evaluate(() => {
      const B = self.FiezelCoreBrain;
      const h = 3.2, gap = B.nextReviewGapDays(h);
      const early = B.updateMemory({ stability: 5, retrievability: 0.999, difficulty: 2, ok: true }).stability;
      const onTime = B.updateMemory({ stability: 5, retrievability: 0.9, difficulty: 2, ok: true }).stability;
      const late = B.updateMemory({ stability: 5, retrievability: 0.5, difficulty: 2, ok: true }).stability;
      return { halfLife: h, gapDays: gap, R_at_gap: B.retrievability(h, gap), stabilitasSukses_R0999: early, stabilitasSukses_R09: onTime, stabilitasSukses_R05: late };
    });
    out('V8', 'matematika FSRS-lite di fiezel-core-brain.js', v8);

    // V tidak ada di window: baca langsung dari berkas bank (bank yang sama yang dimuat app).
    const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'vocabulary-master.json'), 'utf8'));
    const levelWords = bank.filter(v => v.level === 'A1').map(v => v.id);
    const [w1, w2, w3] = levelWords;

    // ---- V1: kartu baru salah ---------------------------------------------------------
    const v1 = await page.evaluate(([id]) => {
      const t0 = Date.now();
      window.updateMastery('vocab', id, false, 6000, null, t0);
      const b = window.__getFiezelState().vocab[id];
      return { gapMs: b.nextReview - t0, stabilityDays: b.stabilityDays, lapses: b.lapses, mastery: b.mastery };
    }, [w1]);
    out('V1', 'kartu BARU dijawab salah', { jatuhTempoLagiDalam: fmt(v1.gapMs), stabilityDays: v1.stabilityDays, lapses: v1.lapses, besokHari: v1.gapMs >= 20 * 3600000 });

    // ---- V3: muncul di Review jatuh tempo sesudah jedanya --------------------------------
    const v3 = await page.evaluate(([id, gap]) => {
      const inDue = () => { try { return window.__fiezelDueReviews(); } catch (_) { return -1; } };
      const before = inDue();
      window.__fzClock.offset += gap + 60000;
      const after = inDue();
      return { dueSebelumJeda: before, dueSesudahJeda: after };
    }, [w1, v1.gapMs]);
    out('V3', 'kartu salah masuk "Review jatuh tempo"', v3);

    // ---- V2: kartu matang lalu salah ---------------------------------------------------
    const v2 = await page.evaluate(([id]) => {
      const st = window.__getFiezelState();
      const trail = [];
      let t = Date.now();
      window.updateMastery('vocab', id, true, 4000, null, t);
      for (let i = 0; i < 5; i++) {
        const b = st.vocab[id];
        t = b.nextReview; // ulang tepat saat jatuh tempo (R≈0.9), seperti murid yang disiplin
        window.__fzClock.offset += (t - Date.now());
        window.updateMastery('vocab', id, true, 4000, null, t);
        trail.push(Number(((st.vocab[id].nextReview - t) / 86400000).toFixed(2)));
      }
      const tW = st.vocab[id].nextReview;
      window.__fzClock.offset += (tW - Date.now());
      const sBefore = st.vocab[id].stabilityDays;
      window.updateMastery('vocab', id, false, 6000, null, tW);
      const b = st.vocab[id];
      return { jedaHariSesudahTiapSukses: trail, stabilitySebelumLupa: sBefore, stabilitySesudahLupa: b.stabilityDays, gapMs: b.nextReview - tW };
    }, [w2]);
    out('V2', 'kartu MATANG (5 sukses tepat waktu) lalu salah', { jedaHariSesudahTiapSukses: v2.jedaHariSesudahTiapSukses, stabilitySebelumLupa: v2.stabilitySebelumLupa, stabilitySesudahLupa: v2.stabilitySesudahLupa, jatuhTempoLagiDalam: fmt(v2.gapMs) });

    // ---- V5: markMastered vs FSRS ------------------------------------------------------
    const v5 = await page.evaluate(([id]) => {
      const st = window.__getFiezelState(), t = Date.now();
      window.updateMastery('vocab', id, false, 6000, null, t);
      const sd = st.vocab[id].stabilityDays;
      window.markMastered('vocab', id);
      const b = st.vocab[id];
      window.__fzClock.offset += 86400000; // sehari kemudian
      const B = self.FiezelCoreBrain;
      const rDayLater = B.retrievability(b.stabilityDays, 1);
      return { stabilityDaysTetap: b.stabilityDays === sd ? sd : b.stabilityDays, nextReviewHari: Number(((b.nextReview - t) / 86400000).toFixed(1)), risikoLupaSehariKemudian: Number((1 - rDayLater).toFixed(3)) };
    }, [w3]);
    out('V5', '"Sudah hafal" (markMastered) vs model FSRS', v5);

    // ---- V7: flashcard "Masih belajar" --------------------------------------------------
    const w4 = levelWords[3];
    const v7 = await page.evaluate(async ([id]) => {
      const st = window.__getFiezelState();
      window.updateMastery('vocab', id, true, 4000, null, Date.now());
      const before = JSON.parse(JSON.stringify(st.vocab[id]));
      const cw0 = st.consecutiveWrong || 0;
      // Tombol "Masih belajar" memanggil updateMastery('vocab', v.id, false) - dipanggil persis begitu.
      window.updateMastery('vocab', id, false);
      const after = st.vocab[id];
      return { totalSebelum: before.total, totalSesudah: after.total, lapsesSebelum: before.lapses, lapsesSesudah: after.lapses, masterySebelum: before.mastery, masterySesudah: after.mastery, consecutiveWrongNaik: (st.consecutiveWrong || 0) - cw0 };
    }, [w4]);
    out('V7', 'flashcard "Masih belajar" = jawaban salah?', v7);

    // ---- V6: naik level --------------------------------------------------------------
    const v6 = await page.evaluate(() => {
      const st = window.__getFiezelState(), keep = st.preferences.activeLevel;
      st.preferences.activeLevel = 'A1';
      const a1 = window.__fiezelDueReviews();
      st.preferences.activeLevel = 'A2';
      const a2 = window.__fiezelDueReviews();
      st.preferences.activeLevel = keep;
      return { dueSaatLevelA1: a1, dueSesudahPindahKeA2: a2 };
    });
    out('V6', 'kartu A1 yang jatuh tempo sesudah murid naik ke A2', v6);

    await page.close();

    // ---- V4: Uji kosakata mendahulukan kartu jatuh tempo? -------------------------------
    // 20 kartu A1 dibuat jatuh tempo; sesi "Uji kosakata" dibuka 15 kali; dihitung berapa
    // kata pertama tiap sesi adalah kartu jatuh tempo. Acak murni ≈ 20/jumlah kata A1.
    const page2 = await boot(browser);
    const dueSet = levelWords.slice(10, 30);
    const v4 = await page2.evaluate(async ([due, totalA1]) => {
      const st = window.__getFiezelState(), now = Date.now();
      for (const id of due) st.vocab[id] = { correct: 1, total: 2, streak: 0, mastery: 20, nextReview: now - 3600000, stability: 1, lapses: 1, lapseBurden: 1, lastSeen: now - 86400000, lastWrong: now - 86400000, stabilityDays: 0.5 };
      const firstWords = [];
      for (let i = 0; i < 15; i++) {
        window.startVocabQuiz();
        await new Promise(r => setTimeout(r, 450));
        const w = (document.querySelector('.vocab-focus-word')?.innerText || '').trim().toLowerCase();
        firstWords.push(w);
      }
      return { firstWords, dueCount: window.__fiezelDueReviews() };
    }, [dueSet, levelWords.length]);
    const dueWords = new Set(bank.filter(v => dueSet.includes(v.id)).map(v => String(v.word).toLowerCase()));
    const hits = v4.firstWords.filter(w => dueWords.has(w)).length;
    out('V4', '"Uji kosakata": kartu jatuh tempo didahulukan?', {
      kartuJatuhTempo: dueSet.length, kataA1: levelWords.length, dueMenurutApp: v4.dueCount,
      sesiDibuka: v4.firstWords.length, kataPertamaYangJatuhTempo: hits,
      harapanJikaAcakMurni: (v4.firstWords.length * dueSet.length / levelWords.length).toFixed(2),
      contohKataPertama: v4.firstWords.slice(0, 5)
    });
    await page2.close();
  } catch (e) {
    console.log('\n[probe berhenti]', e && e.stack || e);
  } finally {
    await browser.close();
  }
})();
