/* ============================================================
   FIEZEL Mascot Motion System — <fiezel-mascot>  [PATCHED — review 08]
   Disalin apa adanya dari paket motion (/fiezel-motion/fiezel-mascot.js).
   Satu tambahan di bagian bawah berkas: corong global self.FiezelPaw, supaya
   app.js dan fiezel-coach-bubble.js punya SATU pintu yang aman dipanggil di
   mana saja - tanpanya setiap pemanggil harus menulis try/catch sendiri, dan
   sebuah maskot yang belum ter-mount bisa menjatuhkan jalur penilaian.
   Versi hasil code review produksi. Perubahan vs original:
   [P0-1] id mask SVG unik per instance (fzTailMask-<uid>)
   [P0-2] lifecycle connect/disconnect aman: blink hidup lagi saat
          re-connect, state transien tidak macet setelah DOM move
   [P1-1] semua timer dibersihkan saat disconnect (_stT,_lookT,blink,confetti)
   [P1-2] validasi input setState/react/lookAt (+ getter publik .state)
   [P1-3] confetti dibatasi (cap global per instance + reduced-motion)
   [P1-4] guard SSR/no-DOM + guard double-define
   [P2-1] restart keyframes tanpa forced reflow (getAnimations, hanya
          saat re-enter state yang sama)
   ============================================================ */
(function () {
  /* [P1-4] Guard SSR / no-DOM: jangan crash saat file di-import di Node,
     service worker, atau saat prerender tanpa DOM. */
  if (typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof HTMLElement === "undefined" ||
      !("customElements" in window)) return;
  /* [P1-4] Guard double-load: define kedua kali = NotSupportedError. */
  if (customElements.get("fiezel-mascot")) return;

  const YEL = "#FFD94F", YEL_D = "#EDB93A", CREAM = "#FFF4DA",
        MAROON = "#8C2233", COCOA = "#33201F", GOLD = "#D8B36B",
        BLUSH = "#F0A0AC", RED = "#D9536A";

  /* [P0-1] SVG jadi factory: id mask unik per instance. */
  let UID = 0;
  const svgMarkup = (maskId) => `
  <svg viewBox="0 0 320 300" class="fz-svg" aria-label="Maskot FIEZEL">
    <ellipse class="fz-shadow" cx="160" cy="284" rx="86" ry="10" fill="#000" opacity=".08"/>
    <g class="fz-all">
      <!-- ekor: melengkung dari belakang kanan, ring + ujung marun -->
      <g class="fz-tail">
        <defs>
          <mask id="${maskId}" maskUnits="userSpaceOnUse" x="180" y="120" width="160" height="170">
            <path d="M212 244 C 266 258 298 238 296 200 C 295 180 284 164 268 158"
                  stroke="#fff" stroke-width="25" fill="none" stroke-linecap="round"/>
          </mask>
        </defs>
        <path d="M212 244 C 266 258 298 238 296 200 C 295 180 284 164 268 158"
              stroke="${YEL_D}" stroke-width="25" fill="none" stroke-linecap="round"/>
        <g mask="url(#${maskId})">
          <circle class="fz-ring" cx="268" cy="158" r="15" fill="${MAROON}"/>
        </g>
      </g>

      <g class="fz-body">
        <!-- badan duduk -->
        <rect x="102" y="164" width="116" height="96" rx="42" fill="${YEL}"/>
        <ellipse cx="132" cy="257" rx="24" ry="11" fill="${YEL_D}"/>
        <ellipse cx="188" cy="257" rx="24" ry="11" fill="${YEL_D}"/>
        <!-- dada + emblem paw -->
        <ellipse cx="160" cy="226" rx="36" ry="28" fill="${CREAM}"/>
        <g transform="translate(160,224)" fill="${MAROON}">
          <ellipse cx="0" cy="5" rx="10" ry="8"/>
          <circle cx="-10" cy="-7" r="4"/><circle cx="0" cy="-10" r="4"/><circle cx="10" cy="-7" r="4"/>
        </g>
        <!-- telinga segitiga geometris -->
        <g class="fz-ear fz-ear-l">
          <path d="M76 66 L 95 0 L 140 34 Z" fill="${YEL}"/>
          <path d="M90 52 L 101 17 L 125 35 Z" fill="${MAROON}"/>
        </g>
        <g class="fz-ear fz-ear-r">
          <path d="M244 66 L 225 0 L 180 34 Z" fill="${YEL}"/>
          <path d="M230 52 L 219 17 L 195 35 Z" fill="${MAROON}"/>
        </g>
        <!-- kepala bulat besar -->
        <circle cx="160" cy="106" r="88" fill="${YEL}"/>

        <!-- wajah -->
        <g class="fz-face">
          <ellipse cx="160" cy="140" rx="36" ry="25" fill="${CREAM}"/>
          <path d="M153 126 L 167 126 L 160 136 Z" fill="${MAROON}"/>
          <circle class="fz-blush" cx="102" cy="126" r="11" fill="${BLUSH}"/>
          <circle class="fz-blush" cx="218" cy="126" r="11" fill="${BLUSH}"/>
          <g class="fz-eyes">
            <g class="fz-eye-open">
              <g><circle cx="126" cy="98" r="14.5" fill="${COCOA}"/>
                 <circle cx="130" cy="93" r="5" fill="#fff"/>
                 <circle cx="122" cy="103" r="2.6" fill="#fff" opacity=".7"/></g>
              <g><circle cx="194" cy="98" r="14.5" fill="${COCOA}"/>
                 <circle cx="198" cy="93" r="5" fill="#fff"/>
                 <circle cx="190" cy="103" r="2.6" fill="#fff" opacity=".7"/></g>
            </g>
            <g class="fz-eye-happy" opacity="0">
              <path d="M112 101 C 119 90 133 90 140 101" stroke="${COCOA}" stroke-width="7"
                    stroke-linecap="round" fill="none"/>
              <path d="M180 101 C 187 90 201 90 208 101" stroke="${COCOA}" stroke-width="7"
                    stroke-linecap="round" fill="none"/>
            </g>
            <g class="fz-eye-love" opacity="0" fill="${RED}">
              <g transform="translate(126,98)"><g class="fz-heart-eye">
                <path d="M0 13 C -8.5 5.5 -15 1 -15 -5.5 C -15 -11.5 -10.6 -15 -6.8 -15 C -3.4 -15 -0.9 -12.8 0 -10.2 C 0.9 -12.8 3.4 -15 6.8 -15 C 10.6 -15 15 -11.5 15 -5.5 C 15 1 8.5 5.5 0 13 Z"/>
                <circle cx="-5" cy="-8" r="3" fill="#fff" opacity=".85"/>
              </g></g>
              <g transform="translate(194,98)"><g class="fz-heart-eye">
                <path d="M0 13 C -8.5 5.5 -15 1 -15 -5.5 C -15 -11.5 -10.6 -15 -6.8 -15 C -3.4 -15 -0.9 -12.8 0 -10.2 C 0.9 -12.8 3.4 -15 6.8 -15 C 10.6 -15 15 -11.5 15 -5.5 C 15 1 8.5 5.5 0 13 Z"/>
                <circle cx="-5" cy="-8" r="3" fill="#fff" opacity=".85"/>
              </g></g>
            </g>
            <g class="fz-lids">
              <g class="fz-lid"><circle cx="126" cy="98" r="16.5" fill="${YEL}"/>
                <path d="M114 99 C 120 105 132 105 138 99" stroke="${COCOA}" stroke-width="5" stroke-linecap="round" fill="none"/></g>
              <g class="fz-lid fz-lid-r"><circle cx="194" cy="98" r="16.5" fill="${YEL}"/>
                <path d="M182 99 C 188 105 200 105 206 99" stroke="${COCOA}" stroke-width="5" stroke-linecap="round" fill="none"/></g>
            </g>
          </g>
          <g class="fz-brows" stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" opacity="0">
            <path class="fz-brow-l" d="M112 74 L 138 70"/>
            <path class="fz-brow-r" d="M182 70 L 208 74"/>
          </g>
          <g class="fz-mouth">
            <path class="fz-m fz-m-smile" d="M148 148 C 154 155 166 155 172 148"
                  stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
            <path class="fz-m fz-m-open" style="display:none"
                  d="M145 146 C 148 162 172 162 175 146 C 165 150 155 150 145 146 Z" fill="${COCOA}"/>
            <circle class="fz-m fz-m-o" style="display:none" cx="160" cy="151" r="6.5" fill="${COCOA}"/>
            <path class="fz-m fz-m-wave" style="display:none" d="M147 150 Q 153 145 160 150 Q 167 155 173 150"
                  stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
            <path class="fz-m fz-m-flat" style="display:none" d="M150 150 L 170 150"
                  stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
            <path class="fz-m fz-m-sad" style="display:none"
                  d="M148 154 C 154 147 166 147 172 154"
                  stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
          </g>
          <g class="fz-acc fz-sweat" opacity="0">
            <path d="M80 72 C 88 84 90 92 90 98 A 10 10 0 1 1 70 98 C 70 92 72 84 80 72 Z"
                  fill="#9CC7E8"/>
          </g>
        </g>

        <!-- lengan depan (setelah kepala agar tampak saat diangkat) -->
        <g class="fz-arm fz-arm-l"><ellipse cx="122" cy="206" rx="14" ry="30" fill="${YEL}"/>
          <ellipse cx="122" cy="206" rx="14" ry="30" fill="#000" opacity=".04"/></g>
        <g class="fz-arm fz-arm-r"><ellipse cx="198" cy="206" rx="14" ry="30" fill="${YEL}"/>
          <g class="fz-pads" opacity="0" transform="translate(198,228) scale(.85)">
            <ellipse cx="0" cy="6" rx="9" ry="7" fill="${MAROON}"/>
            <circle cx="-9" cy="-5" r="3.6" fill="${MAROON}"/>
            <circle cx="0" cy="-8" r="3.6" fill="${MAROON}"/>
            <circle cx="9" cy="-5" r="3.6" fill="${MAROON}"/>
          </g></g>

        <!-- headphone di dalam badan agar ikut goyangan groove -->
        <g class="fz-acc fz-headphones" opacity="0">
          <path d="M76 70 C 92 10 228 10 244 70" stroke="${GOLD}" stroke-width="14" fill="none"
                stroke-linecap="round"/>
          <rect x="52" y="66" width="38" height="54" rx="18" fill="${MAROON}"/>
          <rect x="230" y="66" width="38" height="54" rx="18" fill="${MAROON}"/>
        </g>
      </g>

      <!-- aksesori kontekstual -->
      <g class="fz-acc fz-notes" fill="${GOLD}" opacity="0">
        <g class="fz-note n1">
          <circle cx="0" cy="10" r="7"/><rect x="5" y="-18" width="4.5" height="28" rx="2"/>
          <rect x="5" y="-18" width="16" height="5" rx="2.5"/></g>
        <g class="fz-note n2">
          <circle cx="0" cy="8" r="6"/><rect x="4" y="-14" width="4" height="22" rx="2"/></g>
      </g>
      <g class="fz-acc fz-dots" fill="${MAROON}" opacity="0">
        <circle class="d1" cx="252" cy="54" r="7"/>
        <circle class="d2" cx="262" cy="32" r="8.5"/>
        <circle class="d3" cx="286" cy="18" r="10"/>
      </g>
      <g class="fz-acc fz-bulb" opacity="0">
        <circle cx="262" cy="34" r="20" fill="${GOLD}"/>
        <circle cx="262" cy="34" r="20" fill="#fff" opacity=".25"/>
        <rect x="254" y="50" width="16" height="10" rx="4" fill="${MAROON}"/>
        <g stroke="${GOLD}" stroke-width="5" stroke-linecap="round">
          <path d="M232 16 L 224 10"/><path d="M292 16 L 300 10"/><path d="M262 6 L 262 -4"/>
        </g>
      </g>
      <g class="fz-acc fz-stars" fill="${GOLD}" opacity="0">
        <path class="s1" d="M42 46 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z"/>
        <path class="s2" d="M282 78 l3.5 9 9 3.5 -9 3.5 -3.5 9 -3.5 -9 -9 -3.5 9 -3.5 Z"/>
        <path class="s3" d="M258 6 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="${RED}"/>
      </g>
      <g class="fz-acc fz-zzz" opacity="0" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="fz-z z1" d="M246 40 L 268 40 L 246 62 L 268 62" stroke="${MAROON}" stroke-width="6"/>
        <path class="fz-z z2" d="M274 18 L 290 18 L 274 34 L 290 34" stroke="${GOLD}" stroke-width="5"/>
      </g>
      <g class="fz-acc fz-tear" opacity="0">
        <path d="M120 114 C 126 123 127 128 127 132.5 A 7 7 0 1 1 113 132.5 C 113 128 114 123 120 114 Z"
              fill="#9CC7E8"/>
      </g>
      <g class="fz-acc fz-hearts" opacity="0" fill="${RED}">
        <g transform="translate(58,78)">
          <path class="fz-heart hh1" d="M0 6.5 C -4.2 2.7 -7.5 .5 -7.5 -2.8 C -7.5 -5.8 -5.3 -7.5 -3.4 -7.5 C -1.7 -7.5 -.5 -6.4 0 -5.1 C .5 -6.4 1.7 -7.5 3.4 -7.5 C 5.3 -7.5 7.5 -5.8 7.5 -2.8 C 7.5 .5 4.2 2.7 0 6.5 Z"/>
        </g>
        <g transform="translate(266,64)">
          <path class="fz-heart hh2" fill="${BLUSH}" d="M0 6.5 C -4.2 2.7 -7.5 .5 -7.5 -2.8 C -7.5 -5.8 -5.3 -7.5 -3.4 -7.5 C -1.7 -7.5 -.5 -6.4 0 -5.1 C .5 -6.4 1.7 -7.5 3.4 -7.5 C 5.3 -7.5 7.5 -5.8 7.5 -2.8 C 7.5 .5 4.2 2.7 0 6.5 Z"/>
        </g>
      </g>
    </g>
  </svg>
  <div class="fz-confetti-layer" aria-hidden="true"></div>`;

  const STATES = ["idle","greeting","curious","thinking","listening","encouraging",
                  "celebrating","confused","hinting","completion",
                  "proud","sleepy","sad","love"];
  const TRANSIENT = { greeting:1600, encouraging:1500, celebrating:1900,
                      confused:1800, hinting:1900, completion:2600,
                      proud:2200, sad:2400, love:2000 };
  const CONF_COLORS = [MAROON, GOLD, RED, "#F8CF4D", "#4FC79B"];
  const CONFETTI_MAX = 120;          // [P1-3] cap partikel hidup per instance
  const NO_BLINK = ["listening","celebrating","completion","proud","love"];

  class FiezelMascot extends HTMLElement {
    /* [P0-2] connect/disconnect bisa terjadi berulang (appendChild = move
       men-trigger disconnect+connect sinkron). Init DOM hanya sekali,
       tapi loop kedip & pemulihan state jalan setiap connect. */
    connectedCallback() {
      if (!this._init) {
        this._init = true;
        this._uid = ++UID;                       // [P0-1]
        this.classList.add("fz-mascot");
        this.innerHTML = svgMarkup("fzTailMask-" + this._uid);
        this._layer = this.querySelector(".fz-confetti-layer");
        this._mem = { streak: 0, wrongRow: 0, greets: 0, looks: 0 };
        this._state = "idle";
        this._stGen = 0;                          // generasi timer transien
        this._confettiLive = 0;                   // [P1-3]
        this.setState("idle");
      } else if (TRANSIENT[this._state]) {
        // [P0-2] disconnect membatalkan timer revert; jangan macet di
        // state transien setelah element dipindah/di-attach ulang.
        this.setState("idle");
      }
      this._blinkLoop();                          // [P0-2] selalu restart
    }

    disconnectedCallback() {
      /* [P1-1] bersihkan SEMUA timer, bukan cuma blink & _stT */
      clearTimeout(this._blinkT);   this._blinkT = null;
      clearTimeout(this._blinkHideT);   this._blinkHideT = null;
      clearTimeout(this._blinkDoubleT); this._blinkDoubleT = null;
      clearTimeout(this._stT);      this._stT = null;
      clearTimeout(this._lookT);    this._lookT = null;
      this.classList.remove("blink");
      if (this._layer) this._layer.textContent = "";  // buang confetti tersisa
      this._confettiLive = 0;
      this._stGen = (this._stGen || 0) + 1;       // batalkan callback nyasar
    }

    /* [P1-2] getter publik — konsumen tidak perlu baca this._state */
    get state() { return this._state; }
    static get states() { return STATES.slice(); }

    /* ---------- inti ---------- */
    /**
     * setState(name, opts)
     *  name : salah satu FiezelMascot.states (wajib, string)
     *  opts.level : int 1..3 (di-clamp & dibulatkan) — intensitas celebrating
     *  opts.hold  : ms > 0 (finite) sebelum kembali; null/0 = tidak revert;
     *               default: TRANSIENT[name]
     *  opts.then  : state tujuan setelah hold (divalidasi; default "idle")
     *  return     : true bila state diterapkan, false bila ditolak
     */
    setState(name, opts = {}) {
      if (!this._init) return false;              // dipanggil sebelum connect
      if (typeof name !== "string" || !STATES.includes(name)) {
        console.warn(`[fiezel-mascot] setState: state tidak dikenal: "${name}"`);
        return false;
      }
      // [P1-2] normalisasi opts
      const level = Number.isFinite(opts.level)
        ? Math.min(3, Math.max(1, Math.round(opts.level))) : 0;
      let hold = opts.hold ?? TRANSIENT[name];
      if (hold != null && (!Number.isFinite(hold) || hold <= 0)) hold = null;
      const then = (typeof opts.then === "string" &&
                    STATES.includes(opts.then) && opts.then !== name)
        ? opts.then : "idle";

      clearTimeout(this._stT); this._stT = null;
      const gen = ++this._stGen;                  // [P0-2/race] token generasi

      const reenter = this._state === name;
      STATES.forEach(s => this.classList.remove("st-" + s));
      this.classList.remove("lv-1","lv-2","lv-3");
      this._state = name;
      this.classList.add("st-" + name);
      if (level) this.classList.add("lv-" + level);
      // [P2-1] hanya perlu restart paksa saat masuk ulang state yang sama;
      // pergantian state lain sudah otomatis restart lewat perubahan class.
      if (reenter) this._restartAnimations();
      this._mouth(name);
      if (name === "celebrating" || name === "completion")
        this._confetti(name === "completion" ? 46 : 18 + 10 * (level || 1));
      if (hold) this._stT = setTimeout(() => {
        this._stT = null;
        // [race] hanya jalan bila belum ada setState/disconnect lebih baru
        if (gen !== this._stGen || !this.isConnected) return;
        this.setState(then);
      }, hold);
      this.dispatchEvent(new CustomEvent("fz-state", { detail: { state: name } }));
      return true;
    }

    /**
     * react(evt, detail) — reaksi kontekstual.
     * Event valid: onboard | question-shown | hover-answer | answer-picked |
     *   correct | wrong | hint | listening-start | listening-stop |
     *   lesson-complete | streak-lost | favorite | badge-earned |
     *   idle-timeout | wake.  detail.target: Element atau {x,y} (opsional).
     * return: hasil setState (boolean) atau false untuk event tak dikenal.
     */
    react(evt, d) {
      if (!this._init) return false;
      if (d == null || typeof d !== "object") d = {};   // [P1-2]
      const m = this._mem;
      switch (evt) {
        case "onboard":
          m.greets++;
          return this.setState("greeting", { hold: m.greets === 1 ? 1900 : 1600 });
        case "question-shown":
          m.wrongRow = 0;
          this.lookAt(d.target);
          return this.setState("curious", { hold: 1400, then: "idle" });
        case "hover-answer":
          this.lookAt(d.target);
          if (this._state === "idle") this.setState("curious", { hold: 900 });
          return true;
        case "answer-picked":
          this.lookAt(d.target);
          return this.setState("thinking", { hold: 700, then: "idle" });
        case "correct":
          m.streak++; m.wrongRow = 0;
          return this.setState("celebrating", { level: Math.min(3, m.streak) });
        case "wrong":
          m.streak = 0; m.wrongRow++;
          return m.wrongRow >= 2
            ? this.setState("encouraging")
            : this.setState("confused");
        case "hint":
          return this.setState("hinting");
        case "listening-start":
          return this.setState("listening");
        case "listening-stop":
          return this.setState("idle");
        case "lesson-complete":
          m.streak = 0;
          return this.setState("completion", { hold: 3200 });
        case "streak-lost":
          m.streak = 0; m.wrongRow = 0;
          return this.setState("sad", { hold: 2400, then: "encouraging" });
        case "favorite":
          this.lookAt(d.target);
          return this.setState("love", { hold: 2000 });
        case "badge-earned":
          return this.setState("proud", { hold: 2200 });
        case "idle-timeout":
          return this.setState("sleepy");
        case "wake":
          if (this._state === "sleepy") this.setState("greeting", { hold: 1200 });
          return true;
        default:
          console.warn(`[fiezel-mascot] react: event tidak dikenal: "${evt}"`);
          return false;
      }
    }

    /**
     * lookAt(target) — target: Element ATAU {x,y} koordinat viewport (finite).
     * Input tidak valid diabaikan (tidak lagi menulis --lx:NaNpx).
     */
    lookAt(target) {
      if (!this._init || !target) return;
      let x, y;
      if (target instanceof Element) {
        const r = target.getBoundingClientRect();
        x = r.left + r.width / 2; y = r.top + r.height / 2;
      } else { x = Number(target.x); y = Number(target.y); }
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;   // [P1-2]
      const me = this.getBoundingClientRect();
      if (!me.width || !me.height) return;   // element disembunyikan → hindari /0
      const dx = Math.max(-1, Math.min(1, (x - (me.left + me.width / 2)) / (me.width)));
      const dy = Math.max(-1, Math.min(1, (y - (me.top + me.height / 2)) / (me.height)));
      this.style.setProperty("--lx", (dx * 7).toFixed(1) + "px");
      this.style.setProperty("--ly", (dy * 5).toFixed(1) + "px");
      clearTimeout(this._lookT);
      this._lookT = setTimeout(() => {
        this._lookT = null;
        this.style.setProperty("--lx", "0px");
        this.style.setProperty("--ly", "0px");
      }, 2200);
    }

    /* ---------- detail ---------- */
    _mouth(state) {
      const map = { idle:"smile", greeting:"open", curious:"o", thinking:"flat",
        listening:"smile", encouraging:"open", celebrating:"open",
        confused:"wave", hinting:"smile", completion:"open",
        proud:"smile", sleepy:"o", sad:"sad", love:"open" };
      this.querySelectorAll(".fz-m").forEach(p => p.style.display = "none");
      const el = this.querySelector(".fz-m-" + (map[state] || "smile"));
      if (el) el.style.display = "";
    }

    /* [P2-1] pengganti `void this.offsetWidth`: restart CSS animation via
       Web Animations API — tanpa forced synchronous layout. */
    _restartAnimations() {
      if (typeof this.getAnimations === "function") {
        this.getAnimations({ subtree: true }).forEach(a => {
          if (typeof CSSAnimation === "undefined" || a instanceof CSSAnimation) {
            a.cancel(); a.play();
          }
        });
      } else {
        void this.offsetWidth; // fallback browser lawas
      }
    }

    _blinkLoop() {
      clearTimeout(this._blinkT);            // [P0-2] jangan dobel loop
      const go = () => {
        if (!this.isConnected) return;       // [P1-1] stop saat detached
        if (!NO_BLINK.includes(this._state)) {
          this.classList.add("blink");
          this._blinkHideT = setTimeout(() => this.classList.remove("blink"), 130);
          if (Math.random() < .2) this._blinkDoubleT = setTimeout(() => {
            this.classList.add("blink");
            this._blinkHideT = setTimeout(() => this.classList.remove("blink"), 110);
          }, 200);
        }
        this._blinkT = setTimeout(go, 1800 + Math.random() * 3800);
      };
      this._blinkT = setTimeout(go, 1200);
    }

    /* [P1-3] confetti dibatasi: maksimum CONFETTI_MAX partikel hidup per
       instance; panggilan beruntun tidak menumpuk node tanpa batas. */
    _confetti(n) {
      if (!this._layer) return;
      if (typeof matchMedia === "function" &&
          matchMedia("(prefers-reduced-motion: reduce)").matches) n = Math.min(n, 8);
      n = Math.max(0, Math.min(n, CONFETTI_MAX - this._confettiLive));
      if (!n) return;
      this._confettiLive += n;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("i");
        const a = Math.random() * Math.PI - Math.PI / 2;
        const v = 60 + Math.random() * 140;
        s.style.cssText = `left:50%;top:44%;
          background:${CONF_COLORS[i % CONF_COLORS.length]};
          --cx:${Math.sin(a) * v * 1.6}px; --cy:${-Math.abs(Math.cos(a)) * v - 60}px;
          --cr:${(Math.random() * 520 - 260)}deg;
          width:${6 + Math.random() * 7}px;height:${5 + Math.random() * 5}px;
          animation-delay:${Math.random() * .12}s`;
        this._layer.appendChild(s);
        setTimeout(() => {
          s.remove();
          this._confettiLive = Math.max(0, this._confettiLive - 1);
        }, 1400);
      }
    }
  }
  customElements.define("fiezel-mascot", FiezelMascot);
})();


/* ============================================================
   CORONG GLOBAL self.FiezelPaw
   Ditambahkan saat integrasi ke fiezel-apps. Tiga alasan ia ada:

   1. TIDAK PERNAH MELEMPAR. Titik pasangnya adalah jalur panas penilaian
      (answerFeedbackSignal), penutup sesi (finishQuiz), dan callback
      perkenalan (onName). Kalau maskot belum ter-mount atau custom element
      gagal terdaftar, reaksi hilang - penilaian dan penyimpanan nama tidak.
   2. SATU pemanggilan mengenai SEMUA instance yang sedang hidup: wajah di
      gelembung pembimbing (persisten, di luar <main>) dan wajah panel
      "Kata FIEZEL" di Home (dicat ulang tiap render). Keduanya harus
      bereaksi bersamaan, kalau tidak maskotnya terasa dua ekor.
   3. Memori reaksi (streak internal, hitungan sapaan) hidup di instance,
      dan instance Home mati tiap render. Corong ini menjadikan instance
      gelembung sebagai yang berumur panjang, jadi eskalasi celebrating
      lv1-lv3 tetap terbaca meski Home dicat ulang.
   ============================================================ */
(function (global) {
  if (!global || !global.document) return;
  if (global.FiezelPaw) return;

  function nodes() {
    try { return Array.prototype.slice.call(global.document.querySelectorAll('fiezel-mascot')); }
    catch (_) { return []; }
  }

  /** Menjalankan method komponen pada setiap instance; galat satu instance
   *  tidak boleh menghentikan instance lain, dan tidak boleh keluar dari sini. */
  function each(method, a, b) {
    var hit = false;
    nodes().forEach(function (el) {
      try { if (typeof el[method] === 'function' && el[method](a, b) !== false) hit = true; }
      catch (_) { /* satu maskot bermasalah bukan alasan menjatuhkan pemanggil */ }
    });
    return hit;
  }

  global.FiezelPaw = {
    /** true bila custom element benar-benar terdaftar. Dipakai pemanggil untuk
     *  memilih antara <fiezel-mascot> dan ikon paw sebagai cadangan. */
    ready: function () {
      try { return !!(global.customElements && global.customElements.get('fiezel-mascot')); }
      catch (_) { return false; }
    },
    count: function () { return nodes().length; },
    react: function (evt, detail) { return each('react', evt, detail); },
    setState: function (name, opts) { return each('setState', name, opts); },
    lookAt: function (target) { return each('lookAt', target); },
    /** Markup wajah dengan cadangan. `fallback` adalah HTML ikon paw yang
     *  sudah dirender pemanggil - satu sumber bentuk paw tetap di
     *  features/ui/fiezel-icons.js, berkas ini tidak menggambar ulang. */
    faceMarkup: function (className, fallback) {
      var cls = String(className || '');
      return this.ready()
        ? '<fiezel-mascot class="' + cls + '" aria-hidden="true"></fiezel-mascot>'
        : String(fallback || '');
    }
  };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null));
