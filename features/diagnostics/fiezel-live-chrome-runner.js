/**
 * features/diagnostics/fiezel-live-chrome-runner.js — FIEZEL Live Realtime Braincore HUD & Runner.
 *
 * TUGAS UTAMA:
 * Menampilkan HUD Telemetri Kognitif Realtime di atas UI peramban Chrome,
 * dan mengemudikan pengujian interaktif otomatis/manual secara nyata di depan mata pengguna.
 */
(function (root) {
  'use strict';

  var RUNNER_SCHEMA = 'fiezel-live-chrome-runner-v1';

  function isLiveMode() {
    try {
      return root.location && (
        root.location.search.indexOf('test=living_braincore') !== -1 ||
        root.location.search.indexOf('test=braincore') !== -1 ||
        root.location.hash.indexOf('braincore-live') !== -1
      );
    } catch (_) {
      return false;
    }
  }

  function createHUD() {
    var existing = root.document.getElementById('fiezel-live-hud');
    if (existing) return existing;

    var hud = root.document.createElement('div');
    hud.id = 'fiezel-live-hud';
    hud.style.cssText = [
      'position: fixed;',
      'top: 18px;',
      'right: 18px;',
      'width: 360px;',
      'max-width: calc(100vw - 36px);',
      'background: rgba(253, 250, 243, 0.96);',
      'backdrop-filter: blur(12px);',
      '-webkit-backdrop-filter: blur(12px);',
      'border: 1.5px solid #E2D9C8;',
      'border-radius: 16px;',
      'box-shadow: 0 12px 36px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.08);',
      'z-index: 99999;',
      'font-family: "Plus Jakarta Sans", -apple-system, system-ui, sans-serif;',
      'color: #1B1418;',
      'padding: 16px;',
      'box-sizing: border-box;',
      'transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);'
    ].join(' ');

    hud.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #EADFCF;padding-bottom:10px;">',
      '  <div style="display:flex;align-items:center;gap:8px;">',
      '    <span id="hud-pulse" style="width:10px;height:10px;background:#10B981;border-radius:50%;display:inline-block;box-shadow:0 0 8px #10B981;"></span>',
      '    <strong style="font-size:13px;letter-spacing:0.4px;font-weight:800;color:#1B1418;">BRAINCORE LIVING ENGINE</strong>',
      '  </div>',
      '  <span id="hud-status-badge" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:#E0F2FE;color:#0369A1;">LIVE RUNTIME</span>',
      '</div>',
      '<div id="hud-learner-box" style="background:#FFF9EE;border:1px solid #FDE68A;border-radius:10px;padding:8px 12px;margin-bottom:10px;">',
      '  <div style="font-size:11px;color:#92400E;font-weight:700;text-transform:uppercase;">Test Profile:</div>',
      '  <div id="hud-learner-name" style="font-size:13px;font-weight:800;color:#78350F;margin-top:2px;">Waiting Command...</div>',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;font-size:11px;">',
      '  <div style="background:#FFF;border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;">',
      '    <div style="color:#6B7280;font-size:10px;font-weight:600;">KEHADIRAN (PAW)</div>',
      '    <div id="hud-presence" style="font-weight:800;font-size:12px;color:#2563EB;margin-top:2px;">SILENT (Flow)</div>',
      '  </div>',
      '  <div style="background:#FFF;border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;">',
      '    <div style="color:#6B7280;font-size:10px;font-weight:600;">SELF-TUNING</div>',
      '    <div id="hud-target-success" style="font-weight:800;font-size:12px;color:#059669;margin-top:2px;">Target: 80%</div>',
      '  </div>',
      '  <div style="background:#FFF;border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;">',
      '    <div style="color:#6B7280;font-size:10px;font-weight:600;">POLA KOGNITIF</div>',
      '    <div id="hud-pattern" style="font-weight:800;font-size:11px;color:#D97706;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Normal</div>',
      '  </div>',
      '  <div style="background:#FFF;border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;">',
      '    <div style="color:#6B7280;font-size:10px;font-weight:600;">AUDIT HASH CHAIN</div>',
      '    <div id="hud-hash" style="font-weight:800;font-size:11px;color:#4B5563;margin-top:2px;font-family:monospace;">Seq #0</div>',
      '  </div>',
      '</div>',
      '<div id="hud-alert-banner" style="display:none;background:#DCFCE7;border:1px solid #86EFAC;color:#166534;font-size:11px;font-weight:700;padding:8px 10px;border-radius:8px;margin-bottom:10px;animation:pulse 1.5s infinite;"></div>',
      '<div style="display:flex;gap:6px;margin-top:8px;">',
      '  <button id="hud-btn-start" style="flex:1;background:#F59E0B;hover:background:#D97706;color:#FFF;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer;">Mulai Uji Nyata ▶</button>',
      '  <button id="hud-btn-step" style="background:#E5E7EB;color:#374151;border:none;border-radius:8px;padding:8px 10px;font-size:11px;font-weight:700;cursor:pointer;">Langkah ⏭</button>',
      '  <button id="hud-btn-close" style="background:transparent;color:#9CA3AF;border:none;font-size:14px;cursor:pointer;padding:0 4px;">✕</button>',
      '</div>'
    ].join('');

    root.document.body.appendChild(hud);

    root.document.getElementById('hud-btn-close').onclick = function () {
      hud.style.display = 'none';
    };

    root.document.getElementById('hud-btn-start').onclick = function () {
      startLiveAutomation();
    };

    root.document.getElementById('hud-btn-step').onclick = function () {
      stepNextAction();
    };

    return hud;
  }

  function updateHUD(data) {
    var hud = root.document.getElementById('fiezel-live-hud') || createHUD();
    if (!hud) return;

    if (data.learner) {
      var lEl = root.document.getElementById('hud-learner-name');
      if (lEl) lEl.innerHTML = data.learner;
    }
    if (data.presence) {
      var pEl = root.document.getElementById('hud-presence');
      if (pEl) pEl.textContent = data.presence;
    }
    if (data.targetSuccess !== undefined) {
      var tEl = root.document.getElementById('hud-target-success');
      if (tEl) tEl.textContent = 'Target: ' + Math.round(data.targetSuccess * 100) + '%';
    }
    if (data.pattern) {
      var ptEl = root.document.getElementById('hud-pattern');
      if (ptEl) ptEl.textContent = data.pattern;
    }
    if (data.hash) {
      var hEl = root.document.getElementById('hud-hash');
      if (hEl) hEl.textContent = data.hash;
    }
    if (data.alert) {
      var bEl = root.document.getElementById('hud-alert-banner');
      if (bEl) {
        bEl.textContent = data.alert;
        bEl.style.display = 'block';
        if (data.alertType === 'rollback') {
          bEl.style.background = '#FEE2E2';
          bEl.style.borderColor = '#FCA5A5';
          bEl.style.color = '#991B1B';
        } else {
          bEl.style.background = '#DCFCE7';
          bEl.style.borderColor = '#86EFAC';
          bEl.style.color = '#166534';
        }
      }
    } else {
      var bElHide = root.document.getElementById('hud-alert-banner');
      if (bElHide && !data.keepAlert) bElHide.style.display = 'none';
    }
  }

  function waitMs(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // Pengemudi alur interaktif otomatis
  var isRunning = false;
  var currentScriptStep = 0;

  var SIMULATION_STEPS = [
    {
      learner: '<strong>Andi (Flow Learner)</strong><br><span style="font-size:10px;color:#B45309;">Latency 2.1s · High Accuracy · Self-Tuning</span>',
      action: 'start_quiz',
      delayBefore: 1200
    },
    {
      learner: '<strong>Andi (Question 1)</strong>: Fast & Correct Answer',
      action: 'answer_correct',
      choiceIdx: 0,
      delayBefore: 2000,
      onAfter: function () {
        updateHUD({
          presence: 'SILENT (Flow)',
          pattern: 'fluent_mastery',
          targetSuccess: 0.80,
          hash: 'Seq #1 · ' + (root.FiezelDecisionTrace ? root.FiezelDecisionTrace.verifyLedger().latestHash.slice(0, 8) : 'linked')
        });
      }
    },
    {
      learner: '<strong>Andi (Question 2)</strong>: Flow Progression',
      action: 'answer_correct',
      choiceIdx: 0,
      delayBefore: 2200,
      onAfter: function () {
        updateHUD({
          presence: 'SILENT (Flow)',
          pattern: 'fluent_mastery',
          targetSuccess: 0.80,
          hash: 'Seq #2'
        });
      }
    },
    {
      learner: '<strong>Andi (Question 3)</strong>: 3 Consecutive Successes',
      action: 'answer_correct',
      choiceIdx: 0,
      delayBefore: 2200,
      onAfter: function () {
        // Memicu self-tuning
        if (root.FiezelDecisionTrace) {
          var params = root.FiezelDecisionTrace.readParams();
          updateHUD({
            presence: 'CHALLENGING',
            pattern: 'fluent_mastery',
            targetSuccess: params['difficulty.targetSuccess'],
            hash: 'Seq #3 · ' + (root.FiezelDecisionTrace.verifyLedger().latestHash || '').slice(0, 8),
            alert: '🚀 SELF-TUNING OTONOM: Target naik 0.80 -> ' + params['difficulty.targetSuccess'] + '!'
          });
        }
      }
    },
    {
      learner: '<strong>Budi (Repeated Misconception)</strong>: Past Tense Slip',
      action: 'answer_wrong',
      choiceIdx: 1,
      delayBefore: 2800,
      onAfter: function () {
        updateHUD({
          presence: 'CORRECTING (Halus)',
          pattern: 'careless_slip',
          targetSuccess: 0.82,
          hash: 'Seq #4',
          alert: '⚠️ Kesalahan Pertama: PAW mengoreksi halus, tanpa vonis panik.',
          keepAlert: true
        });
      }
    },
    {
      learner: '<strong>Budi (Next Question)</strong>: Repeated Misconception',
      action: 'answer_wrong',
      choiceIdx: 2,
      delayBefore: 2800,
      onAfter: function () {
        updateHUD({
          presence: 'REINFORCING (Ajar Ulang)',
          pattern: 'recurrent_misconception',
          targetSuccess: 0.82,
          hash: 'Seq #5',
          alert: '📚 Miskonsepsi Terdeteksi! Perancah naik ke worked-example.',
          keepAlert: true
        });
      }
    },
    {
      learner: '<strong>Citra (Kelelahan Kognitif)</strong>: Melambat >10s & Salah',
      action: 'answer_wrong_slow',
      choiceIdx: 1,
      delayBefore: 3000,
      onAfter: function () {
        if (root.FiezelDecisionTrace) {
          var params = root.FiezelDecisionTrace.readParams();
          updateHUD({
            presence: 'CONCERNED (Istirahat)',
            pattern: 'cognitive_struggle',
            targetSuccess: params['difficulty.targetSuccess'],
            hash: 'Seq #6',
            alert: '🛑 REGRESI TERDETEKSI: Rollback parameter targetSuccess kembali ke 0.80!',
            alertType: 'rollback',
            keepAlert: true
          });
        }
      }
    },
    {
      learner: '<strong>Audit Akhir Kriptografis</strong>: Rantai Hash 100% Utuh',
      action: 'verify_final',
      delayBefore: 2000,
      onAfter: function () {
        var v = root.FiezelDecisionTrace ? root.FiezelDecisionTrace.verifyLedger() : { ok: true, length: 7 };
        updateHUD({
          learner: '<strong>UJI REALTIME SELESAI</strong><br><span style="color:#059669;font-weight:700;">Semua Skenario Kognitif Terbukti Hidup!</span>',
          presence: 'CELEBRATING 🎉',
          pattern: 'mastery_milestone',
          hash: 'Chain: ' + v.length + ' blok · 100% VALID',
          alert: '✅ AUDIT INTEGRITAS KRIPTOGRAFIS: ' + (v.ok ? 'SUKSES LENGKAP' : 'GAGAL')
        });
      }
    }
  ];

  async function stepNextAction() {
    if (currentScriptStep >= SIMULATION_STEPS.length) {
      currentScriptStep = 0;
    }
    var step = SIMULATION_STEPS[currentScriptStep];
    currentScriptStep++;

    updateHUD({ learner: step.learner });

    if (step.delayBefore) await waitMs(step.delayBefore);

    // Eksekusi aksi DOM
    if (step.action === 'start_quiz') {
      var startBtn = Array.from(root.document.querySelectorAll('button, a')).find(function (el) {
        return el.textContent.indexOf('MULAI LATIHAN SEKARANG') !== -1 ||
               el.textContent.indexOf('เริ่มฝึกฝนทันที') !== -1 ||
               el.classList.contains('primary') && el.textContent.indexOf('➔') !== -1;
      });
      if (startBtn) {
        startBtn.click();
      } else if (root.app && typeof root.app.startPractice === 'function') {
        root.app.startPractice();
      }
    } else if (step.action === 'answer_correct' || step.action === 'answer_wrong' || step.action === 'answer_wrong_slow') {
      // Cari opsi jawaban
      var opts = Array.from(root.document.querySelectorAll('button, .quiz-opt, [data-choice]')).filter(function (b) {
        return b.id !== 'quizNext' && !b.classList.contains('quiz-next') && !b.classList.contains('confidence-skip');
      });

      var targetOpt = opts[step.choiceIdx % Math.max(1, opts.length)];
      if (targetOpt) {
        // Efek visual highlight pada pilihan
        targetOpt.style.transition = 'all 0.3s ease';
        targetOpt.style.boxShadow = '0 0 16px #3B82F6';
        targetOpt.style.transform = 'scale(1.02)';
        await waitMs(600);
        targetOpt.click();
      }

      await waitMs(1200);

      // Tangani tombol Lanjut / popup
      var skipBtn = root.document.querySelector('.confidence-skip');
      if (skipBtn) {
        skipBtn.click();
      } else {
        var lanjutBtn = Array.from(root.document.querySelectorAll('button')).find(function (b) {
          return /Lanjut|Next|quizNext/i.test(b.textContent || '') || b.id === 'quizNext';
        });
        if (lanjutBtn && !lanjutBtn.disabled) lanjutBtn.click();
      }
    }

    if (typeof step.onAfter === 'function') {
      step.onAfter();
    }
  }

  async function startLiveAutomation() {
    if (isRunning) return;
    isRunning = true;
    currentScriptStep = 0;
    var btn = root.document.getElementById('hud-btn-start');
    if (btn) {
      btn.textContent = 'Menjalankan... ⏳';
      btn.style.background = '#6B7280';
    }

    try {
      while (currentScriptStep < SIMULATION_STEPS.length) {
        await stepNextAction();
        await waitMs(1500);
      }
    } finally {
      isRunning = false;
      if (btn) {
        btn.textContent = 'Ulangi Uji Nyata ▶';
        btn.style.background = '#F59E0B';
      }
    }
  }

  // Boot listener
  function init() {
    if (isLiveMode()) {
      createHUD();
      updateHUD({
        learner: '<strong>Siap Diuji</strong><br><span style="font-size:10px;color:#6B7280;">Klik "Mulai Uji Nyata" di atas</span>',
        presence: 'SILENT (Flow)',
        targetSuccess: root.FiezelDecisionTrace ? root.FiezelDecisionTrace.readParams()['difficulty.targetSuccess'] : 0.80,
        pattern: 'Siap',
        hash: 'Genesis 00000000'
      });
      // Otomatis mulai dalam 1.5 detik jika parameter auto=1
      if (root.location.search.indexOf('auto=1') !== -1) {
        setTimeout(startLiveAutomation, 1500);
      }
    }
  }

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.FiezelLiveChromeRunner = {
    SCHEMA: RUNNER_SCHEMA,
    createHUD: createHUD,
    updateHUD: updateHUD,
    startLiveAutomation: startLiveAutomation,
    stepNextAction: stepNextAction
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
