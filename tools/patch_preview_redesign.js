// tools/patch_preview_redesign.js
const fs = require('fs');
const path = require('path');

const bankPath = path.join(__dirname, '../features/speaking-listening/jlpt-listening-bank-v1.json');
const previewPath = path.join(__dirname, '../preview-redesign.html');

const jlptBank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
let html = fs.readFileSync(previewPath, 'utf8');

console.log(`Loaded JLPT Bank with ${jlptBank.items.length} questions.`);

// 1. Update Practice Screen card
const oldCardSearch = `          <!-- 4. SPEAKING & LISTENING RING -->
          <div class="skill-matrix-card" onclick="triggerToast('Membuka modul Speaking & Listening')">
            <div class="skill-card-top">
              <div class="skill-icon-pill">🎧</div>
              <div class="skill-ring-wrap" title="Penguasaan: 70%">
                <svg class="skill-ring-svg" viewBox="0 0 36 36">
                  <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="ring-fill" stroke="#D48220" stroke-dasharray="70, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="ring-text">70%</span>
              </div>
            </div>
            <div class="skill-title-block">
              <b>Speaking & Lab</b>
              <span>Audio dialog & pelafalan</span>
            </div>
            <span class="skill-submetric">28 Sesi Lab</span>
          </div>`;

const newCardReplacement = `          <!-- 4. SPEAKING & LISTENING RING -->
          <div class="skill-matrix-card" onclick="openListeningPanel()" style="cursor:pointer;" title="Klik untuk membuka Bank Soal Listening JLPT N5 & N4">
            <div class="skill-card-top">
              <div class="skill-icon-pill" style="background:#FFF3C4;">🎧</div>
              <div class="skill-ring-wrap" title="Bank Soal JLPT: 30 Soal">
                <svg class="skill-ring-svg" viewBox="0 0 36 36">
                  <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="ring-fill" stroke="#D48220" stroke-dasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="ring-text">N5/N4</span>
              </div>
            </div>
            <div class="skill-title-block">
              <b>Listening & Chōkai</b>
              <span>Bank Soal JLPT N5 & N4</span>
            </div>
            <span class="skill-submetric" style="color:var(--accent);">⭐ 30 Soal + Audio Resmi</span>
          </div>`;

if (html.includes(oldCardSearch)) {
  html = html.replace(oldCardSearch, newCardReplacement);
  console.log('Practice Screen card replaced successfully!');
} else if (!html.includes('onclick="openListeningPanel()"')) {
  console.log('Checking partial replace for Practice card...');
  html = html.replace("triggerToast('Membuka modul Speaking & Listening')", "openListeningPanel()");
} else {
  console.log('Practice Screen card already updated.');
}

// Update home chip
if (html.includes('<span class="session-tag-chip">🎧 1 Dialog Listening</span>')) {
  html = html.replace(
    '<span class="session-tag-chip">🎧 1 Dialog Listening</span>',
    '<span class="session-tag-chip" onclick="openListeningPanel()" style="cursor:pointer;" title="Buka Bank Soal Listening JLPT N5 & N4">🎧 1 Dialog Listening (JLPT)</span>'
  );
  console.log('Home chip updated successfully!');
} else {
  console.log('Home chip already updated or not found.');
}

// 2. Add CSS
const listeningCss = `
    /* =========================================================================
       PANEL BANK SOAL LISTENING JLPT (N5 & N4)
       ========================================================================= */
    .listening-modal {
      position: fixed;
      inset: 0;
      background: rgba(36,26,17,0.78);
      backdrop-filter: blur(5px);
      z-index: 2500;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.22s ease;
    }
    .listening-modal.open {
      opacity: 1;
      pointer-events: auto;
    }
    .listening-modal-box {
      background: #FFFDF9;
      width: min(100%, 540px);
      max-height: 90vh;
      border-radius: 24px;
      box-shadow: 0 24px 48px rgba(36, 26, 17, 0.32);
      border: 1.5px solid var(--line);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: fzModalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fzModalPop {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .listening-head {
      padding: 16px 20px;
      background: #F9F3E6;
      border-bottom: 1.5px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .listening-body {
      padding: 16px 18px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .jlpt-level-tabs {
      display: flex;
      gap: 8px;
      background: #EFE6D8;
      padding: 4px;
      border-radius: 12px;
    }
    .jlpt-lvl-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: transparent;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      border-radius: 9px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .jlpt-lvl-btn.active {
      background: #FFFFFF;
      color: #241A11;
      box-shadow: 0 2px 6px rgba(36, 26, 17, 0.1);
    }
    .jlpt-mondai-scroll {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 0 4px;
      scrollbar-width: thin;
    }
    .jlpt-mondai-chip {
      padding: 6px 12px;
      background: #FAF5EB;
      border: 1px solid var(--line);
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }
    .jlpt-mondai-chip.active {
      background: #241A11;
      color: #FFD94F;
      border-color: #241A11;
    }
    .jlpt-player-card {
      background: #241A11;
      color: #FFFDF9;
      border-radius: 16px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(36, 26, 17, 0.15);
    }
    .jlpt-player-card .p-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      color: #D6CBC2;
    }
    .jlpt-player-card .p-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .jlpt-play-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #FFD94F;
      color: #241A11;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
      transition: transform 0.1s, background 0.15s;
    }
    .jlpt-play-btn:hover {
      background: #FFE382;
      transform: scale(1.05);
    }
    .jlpt-eq-bars {
      display: flex;
      align-items: center;
      gap: 3px;
      flex: 1;
      height: 28px;
      background: rgba(255,255,255,0.06);
      padding: 0 8px;
      border-radius: 8px;
    }
    .jlpt-eq-bar {
      width: 4px;
      height: 6px;
      background: #FFD94F;
      border-radius: 2px;
      transition: height 0.15s;
    }
    .jlpt-eq-bars.playing .jlpt-eq-bar {
      animation: fzEqPulse 0.5s infinite alternate ease-in-out;
    }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(2) { animation-delay: 0.1s; }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(3) { animation-delay: 0.2s; }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(4) { animation-delay: 0.15s; }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(5) { animation-delay: 0.25s; }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(6) { animation-delay: 0.05s; }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(7) { animation-delay: 0.3s; }
    .jlpt-eq-bars.playing .jlpt-eq-bar:nth-child(8) { animation-delay: 0.18s; }
    @keyframes fzEqPulse {
      from { height: 5px; }
      to { height: 24px; }
    }
    .jlpt-q-card {
      background: #FFFFFF;
      border: 1.5px solid var(--line);
      border-radius: 16px;
      padding: 14px 16px;
      box-shadow: 0 2px 8px rgba(36,26,17,0.04);
    }
    .jlpt-opt-btn {
      width: 100%;
      text-align: left;
      padding: 11px 13px;
      margin-top: 8px;
      border: 1.5px solid var(--line);
      border-radius: 12px;
      background: #FAF8F4;
      font-family: inherit;
      font-size: 13px;
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      transition: all 0.15s ease;
    }
    .jlpt-opt-btn:hover:not(.locked) {
      background: #F3EBDD;
      border-color: #D1C2AF;
    }
    .jlpt-opt-btn.correct {
      background: #E8F5E9 !important;
      border-color: #2E8B69 !important;
      color: #1B5E20 !important;
      font-weight: 600;
    }
    .jlpt-opt-btn.wrong {
      background: #FFEBEE !important;
      border-color: #D32F2F !important;
      color: #B71C1C !important;
    }
    .jlpt-opt-badge {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: #E9DFCE;
      font-weight: 700;
      font-size: 11.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .jlpt-acc-btn {
      width: 100%;
      background: #FAF5EB;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 9px 12px;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
      text-align: left;
    }
    .jlpt-acc-content {
      padding: 11px 13px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-top: none;
      border-radius: 0 0 10px 10px;
      font-size: 12.5px;
      line-height: 1.55;
      color: #33201F;
    }
`;

if (!html.includes('PANEL BANK SOAL LISTENING JLPT') && html.includes('/* SPEC MODAL OVERLAY */')) {
  html = html.replace('/* SPEC MODAL OVERLAY */', listeningCss + '\n    /* SPEC MODAL OVERLAY */');
  console.log('Listening CSS added successfully!');
} else {
  console.log('Listening CSS already present.');
}

// 3. Add Modal HTML markup
const modalHtml = `
  <!-- PANEL BANK SOAL LISTENING JLPT (N5 & N4) -->
  <div class="listening-modal" id="listeningPanelModal" onclick="if(event.target===this)closeListeningPanel()">
    <div class="listening-modal-box">
      <div class="listening-head">
        <div>
          <div class="f-tag" style="background:#FFF3C4;color:#7A5F1B;margin:0 0 4px;">🎧 RESMI JAPAN FOUNDATION &amp; JEES</div>
          <h2 class="f-h2" style="font-size:17px;margin:0;">Bank Soal Listening (Chōkai / 聴解)</h2>
          <span style="font-size:11.5px;color:var(--text-muted);">Simulasi Ujian Asli JLPT N5 &amp; N4 Lengkap</span>
        </div>
        <button type="button" class="top-btn" onclick="closeListeningPanel()" style="width:34px;height:34px;border-radius:50%;font-size:18px;">✕</button>
      </div>

      <div class="listening-body">
        <!-- Level Switcher -->
        <div class="jlpt-level-tabs">
          <button type="button" class="jlpt-lvl-btn active" id="btnLvlN5" onclick="setListeningLevel('N5')">⭐ JLPT N5 (Dasar)</button>
          <button type="button" class="jlpt-lvl-btn" id="btnLvlN4" onclick="setListeningLevel('N4')">🌟 JLPT N4 (Menengah)</button>
        </div>

        <!-- Mondai Category Scroll -->
        <div class="jlpt-mondai-scroll">
          <div class="jlpt-mondai-chip active" data-mondai="all" onclick="setListeningMondai('all')">Semua Mondai</div>
          <div class="jlpt-mondai-chip" data-mondai="mondai_1" onclick="setListeningMondai('mondai_1')">Mondai 1: Tugas (課題)</div>
          <div class="jlpt-mondai-chip" data-mondai="mondai_2" onclick="setListeningMondai('mondai_2')">Mondai 2: Poin (ポイント)</div>
          <div class="jlpt-mondai-chip" data-mondai="mondai_3" onclick="setListeningMondai('mondai_3')">Mondai 3: Ungkapan (発話)</div>
          <div class="jlpt-mondai-chip" data-mondai="mondai_4" onclick="setListeningMondai('mondai_4')">Mondai 4: Respon (即時)</div>
        </div>

        <!-- Dynamic Question Card Slot -->
        <div id="listeningQuestionSlot"></div>

        <!-- Official Download Section Footer -->
        <div style="background:#F6EFE3;border-radius:12px;padding:12px 14px;border:1px solid var(--line);">
          <b style="font-size:12px;color:var(--text);display:block;margin-bottom:4px;">📥 Unduh Bahan Asli JLPT:</b>
          <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:11.5px;">
            <a href="https://www.jlpt.jp/samples/sample2018/pdf/N5L.pdf" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:700;">📄 PDF Soal N5</a> ·
            <a href="https://www.jlpt.jp/samples/sample2018/pdf/N5script.pdf" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:700;">📝 Naskah N5</a> ·
            <a href="https://www.jlpt.jp/samples/sample2018/pdf/N4L.pdf" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:700;">📄 PDF Soal N4</a> ·
            <a href="https://www.jlpt.jp/samples/sample2018/pdf/N4script.pdf" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:700;">📝 Naskah N4</a>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="listeningPanelModal"') && html.includes('<!-- SPEC MODAL -->')) {
  html = html.replace('<!-- SPEC MODAL -->', modalHtml + '\n  <!-- SPEC MODAL -->');
  console.log('Modal HTML added successfully!');
} else {
  console.log('Modal HTML already present.');
}

// 4. Add JavaScript logic
const bankJsonStr = JSON.stringify(jlptBank.items);

const listeningJs = `
    // =========================================================================
    // LISTENING & CHOUKAI INTERACTIVE ENGINE (JLPT N5 & N4)
    // =========================================================================
    const JLPT_QUESTIONS = ${bankJsonStr};
    let curJlptLevel = 'N5';
    let curJlptMondai = 'all';
    let curJlptIndex = 0;
    let jlptAudioPlaying = false;
    let jlptAudioObj = null;
    let jlptSelectedChoice = null;
    let jlptReplayCount = 0;
    let jlptScriptOpen = false;
    let jlptExplainOpen = false;
    let jlptVocabOpen = false;

    function openListeningPanel() {
      const modal = document.getElementById('listeningPanelModal');
      if (modal) modal.classList.add('open');
      curJlptIndex = 0;
      jlptSelectedChoice = null;
      jlptReplayCount = 0;
      jlptScriptOpen = false;
      jlptExplainOpen = false;
      jlptVocabOpen = false;
      renderListeningQuestion();
    }

    function closeListeningPanel() {
      const modal = document.getElementById('listeningPanelModal');
      if (modal) modal.classList.remove('open');
      stopJlptAudio();
    }

    function setListeningLevel(lvl) {
      curJlptLevel = lvl;
      const btnN5 = document.getElementById('btnLvlN5');
      const btnN4 = document.getElementById('btnLvlN4');
      if (btnN5) btnN5.classList.toggle('active', lvl === 'N5');
      if (btnN4) btnN4.classList.toggle('active', lvl === 'N4');
      curJlptIndex = 0;
      jlptSelectedChoice = null;
      stopJlptAudio();
      renderListeningQuestion();
    }

    function setListeningMondai(m) {
      curJlptMondai = m;
      document.querySelectorAll('.jlpt-mondai-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-mondai') === m);
      });
      curJlptIndex = 0;
      jlptSelectedChoice = null;
      stopJlptAudio();
      renderListeningQuestion();
    }

    function getFilteredQuestions() {
      return JLPT_QUESTIONS.filter(q => {
        const matchLvl = q.level === curJlptLevel;
        const matchMondai = (curJlptMondai === 'all') || (q.mondai === curJlptMondai);
        return matchLvl && matchMondai;
      });
    }

    function renderListeningQuestion() {
      const slot = document.getElementById('listeningQuestionSlot');
      if (!slot) return;
      const list = getFilteredQuestions();
      if (!list.length) {
        slot.innerHTML = '<p class="f-body" style="text-align:center;padding:24px;">Belum ada soal untuk kategori ini.</p>';
        return;
      }

      if (curJlptIndex >= list.length) curJlptIndex = 0;
      const q = list[curJlptIndex];

      const optHtml = q.options.map((opt, i) => {
        const letter = ['1', '2', '3', '4'][i] || (i + 1);
        let cls = 'jlpt-opt-btn';
        if (jlptSelectedChoice !== null) {
          cls += ' locked';
          if (i === q.answerIndex) cls += ' correct';
          else if (i === jlptSelectedChoice) cls += ' wrong';
        }
        return '<button type="button" class="' + cls + '" onclick="selectJlptChoice(' + i + ')">' +
          '<span class="jlpt-opt-badge">' + letter + '</span>' +
          '<div>' +
            '<b style="display:block;margin-bottom:2px;">' + opt.text + '</b>' +
            '<span style="font-size:11.5px;color:var(--text-muted);">' + opt.textId + '</span>' +
          '</div>' +
        '</button>';
      }).join('');

      let feedbackHtml = '';
      if (jlptSelectedChoice !== null) {
        const isRight = (jlptSelectedChoice === q.answerIndex);
        feedbackHtml = '<div style="background:' + (isRight ? '#E8F5E9' : '#FFEBEE') + ';border:1.5px solid ' + (isRight ? '#2E8B69' : '#D32F2F') + ';border-radius:12px;padding:10px 14px;margin-top:10px;">' +
          '<b style="color:' + (isRight ? '#1B5E20' : '#B71C1C') + ';font-size:13px;">' +
            (isRight ? '✓ Jawabanmu Benar!' : '✗ Jawabanmu Belum Tepat') +
          '</b>' +
          '<p style="margin:4px 0 0;font-size:12px;color:#241A11;">' +
            'Kunci: <b>Pilihan ' + (q.answerIndex + 1) + ' (' + q.options[q.answerIndex].text + ')</b>' +
          '</p>' +
        '</div>';
      }

      let scriptHtml = '';
      if (jlptScriptOpen) {
        scriptHtml = '<div class="jlpt-acc-content">' +
          '<b style="color:var(--accent);display:block;margin-bottom:4px;">Naskah Asli (Jepang):</b>' +
          '<div style="white-space:pre-line;margin-bottom:8px;font-size:13px;background:#FAF8F4;padding:8px 10px;border-radius:6px;">' + q.scriptJapanese + '</div>' +
          '<b style="color:var(--text);display:block;margin-bottom:4px;">Romaji:</b>' +
          '<div style="white-space:pre-line;margin-bottom:8px;font-size:12px;color:#555;">' + q.scriptRomaji + '</div>' +
          '<b style="color:#2E8B69;display:block;margin-bottom:4px;">Terjemahan Bahasa Indonesia:</b>' +
          '<div style="white-space:pre-line;font-size:12.5px;color:#241A11;">' + q.scriptIndonesian + '</div>' +
        '</div>';
      }

      let explainHtml = '';
      if (jlptExplainOpen) {
        explainHtml = '<div class="jlpt-acc-content">' +
          '<p style="margin:0;font-size:12.5px;line-height:1.6;">' + q.explain + '</p>' +
        '</div>';
      }

      let vocabHtml = '';
      if (jlptVocabOpen) {
        const vItems = q.vocabularyKey.map(v => '<li><b>' + v.ja + '</b>: ' + v.id + '</li>').join('');
        vocabHtml = '<div class="jlpt-acc-content">' +
          '<ul style="margin:0;padding-left:18px;font-size:12px;">' + vItems + '</ul>' +
        '</div>';
      }

      slot.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<span style="font-size:11.5px;font-weight:700;color:var(--accent);background:var(--accent-soft);padding:3px 8px;border-radius:6px;">' +
            q.mondaiLabel +
          '</span>' +
          '<span style="font-size:12px;font-weight:700;color:var(--text-muted);">' +
            'Soal ' + (curJlptIndex + 1) + ' dari ' + list.length +
          '</span>' +
        '</div>' +

        '<div style="background:#FDF8EE;border:1px dashed #DFC89D;border-radius:10px;padding:8px 12px;font-size:12px;color:#614E36;margin-bottom:12px;">' +
          '<b>Konteks:</b> ' + q.situation +
        '</div>' +

        '<div class="jlpt-player-card">' +
          '<div class="p-meta">' +
            '<span>🎵 ' + q.audioTrack + '</span>' +
            '<span id="jlptReplayStatus">Diputar ' + jlptReplayCount + '×</span>' +
          '</div>' +
          '<div class="p-controls">' +
            '<button type="button" class="jlpt-play-btn" id="jlptPlayBtn" onclick="toggleJlptAudio(\\'' + q.audioUrl + '\\', \\'' + encodeURIComponent(q.scriptJapanese) + '\\')">' +
              (jlptAudioPlaying ? '⏸' : '▶') +
            '</button>' +
            '<div class="jlpt-eq-bars ' + (jlptAudioPlaying ? 'playing' : '') + '" id="jlptEqBars">' +
              '<div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div>' +
              '<div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div><div class="jlpt-eq-bar"></div>' +
            '</div>' +
            '<a href="' + q.audioUrl + '" target="_blank" download style="color:#FFD94F;text-decoration:none;font-size:11.5px;font-weight:700;white-space:nowrap;padding:4px 8px;background:rgba(255,255,255,0.1);border-radius:6px;" title="Unduh file MP3">' +
              '⬇ MP3' +
            '</a>' +
          '</div>' +
        '</div>' +

        '<div class="jlpt-q-card" style="margin-top:12px;">' +
          '<h3 style="font-size:15px;color:var(--text);margin:0 0 4px;font-weight:700;">' + q.questionJapanese + '</h3>' +
          '<p style="font-size:12px;color:var(--text-muted);margin:0 0 12px;">(' + q.questionIndonesian + ')</p>' +
          '<div>' + optHtml + '</div>' +
        '</div>' +

        feedbackHtml +

        '<div style="margin-top:10px;">' +
          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptScript()">' +
            '<span>📜 Naskah Dialog &amp; Terjemahan</span>' +
            '<span>' + (jlptScriptOpen ? '▲ Tutup' : '▼ Lihat') + '</span>' +
          '</button>' +
          scriptHtml +

          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptExplain()">' +
            '<span>💡 Pembahasan &amp; Analisis Kunci</span>' +
            '<span>' + (jlptExplainOpen ? '▲ Tutup' : '▼ Lihat') + '</span>' +
          '</button>' +
          explainHtml +

          '<button type="button" class="jlpt-acc-btn" onclick="toggleJlptVocab()">' +
            '<span>🔑 Kosakata &amp; Tata Bahasa Penting</span>' +
            '<span>' + (jlptVocabOpen ? '▲ Tutup' : '▼ Lihat') + '</span>' +
          '</button>' +
          vocabHtml +
        '</div>' +

        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;">' +
          '<button type="button" class="btn-secondary" style="flex:1;padding:10px;' + (curJlptIndex === 0 ? 'opacity:0.5;pointer-events:none;' : '') + '" onclick="prevJlptQuestion()">' +
            '← Soal Sebelumnya' +
          '</button>' +
          '<button type="button" class="btn-primary" style="flex:1;padding:10px;' + (curJlptIndex >= list.length - 1 ? 'opacity:0.5;pointer-events:none;' : '') + '" onclick="nextJlptQuestion()">' +
            'Soal Berikutnya →' +
          '</button>' +
        '</div>';
    }

    function selectJlptChoice(idx) {
      if (jlptSelectedChoice !== null) return;
      jlptSelectedChoice = idx;
      const list = getFilteredQuestions();
      const q = list[curJlptIndex];
      if (idx === q.answerIndex) {
        triggerToast('🎉 Benar! Pilihan tepat.');
      } else {
        triggerToast('💡 Belum tepat, periksa pembahasannya ya.');
      }
      renderListeningQuestion();
    }

    function toggleJlptScript() {
      jlptScriptOpen = !jlptScriptOpen;
      renderListeningQuestion();
    }

    function toggleJlptExplain() {
      jlptExplainOpen = !jlptExplainOpen;
      renderListeningQuestion();
    }

    function toggleJlptVocab() {
      jlptVocabOpen = !jlptVocabOpen;
      renderListeningQuestion();
    }

    function nextJlptQuestion() {
      const list = getFilteredQuestions();
      if (curJlptIndex < list.length - 1) {
        curJlptIndex++;
        jlptSelectedChoice = null;
        jlptScriptOpen = false;
        jlptExplainOpen = false;
        jlptVocabOpen = false;
        stopJlptAudio();
        renderListeningQuestion();
      }
    }

    function prevJlptQuestion() {
      if (curJlptIndex > 0) {
        curJlptIndex--;
        jlptSelectedChoice = null;
        jlptScriptOpen = false;
        jlptExplainOpen = false;
        jlptVocabOpen = false;
        stopJlptAudio();
        renderListeningQuestion();
      }
    }

    function toggleJlptAudio(url, textEncoded) {
      if (jlptAudioPlaying) {
        stopJlptAudio();
        return;
      }

      jlptAudioPlaying = true;
      jlptReplayCount++;
      const playBtn = document.getElementById('jlptPlayBtn');
      const eqBars = document.getElementById('jlptEqBars');
      const status = document.getElementById('jlptReplayStatus');
      if (playBtn) playBtn.textContent = '⏸';
      if (eqBars) eqBars.classList.add('playing');
      if (status) status.textContent = 'Diputar ' + jlptReplayCount + '×';

      try {
        if (!jlptAudioObj) {
          jlptAudioObj = new Audio();
        }
        jlptAudioObj.src = url;
        jlptAudioObj.play().then(() => {
          jlptAudioObj.onended = () => {
            stopJlptAudio();
          };
        }).catch(err => {
          console.warn("Direct mp3 playback error, fallback to SpeechSynthesis or timer:", err);
          if ('speechSynthesis' in window) {
            const ut = new SpeechSynthesisUtterance(decodeURIComponent(textEncoded));
            ut.lang = 'ja-JP';
            ut.rate = 0.9;
            ut.onend = () => stopJlptAudio();
            ut.onerror = () => stopJlptAudio();
            window.speechSynthesis.speak(ut);
          } else {
            setTimeout(() => stopJlptAudio(), 8000);
          }
        });
      } catch (e) {
        setTimeout(() => stopJlptAudio(), 8000);
      }
    }

    function stopJlptAudio() {
      jlptAudioPlaying = false;
      if (jlptAudioObj) {
        try { jlptAudioObj.pause(); jlptAudioObj.currentTime = 0; } catch(_) {}
      }
      try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch(_) {}
      const playBtn = document.getElementById('jlptPlayBtn');
      const eqBars = document.getElementById('jlptEqBars');
      if (playBtn) playBtn.textContent = '▶';
      if (eqBars) eqBars.classList.remove('playing');
    }
`;

if (!html.includes('const JLPT_QUESTIONS =') && html.includes('// INITIAL MOUNT')) {
  html = html.replace('// INITIAL MOUNT', listeningJs + '\n    // INITIAL MOUNT');
  console.log('Listening JS added successfully!');
} else {
  console.log('Listening JS already present.');
}

fs.writeFileSync(previewPath, html, 'utf8');
console.log('preview-redesign.html patched successfully!');
