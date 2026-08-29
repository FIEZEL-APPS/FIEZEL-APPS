/* ============================================================
   FIEZEL Mascot Motion System — <fiezel-mascot>  [RIG DIRECTION C — Wave I]
   Disalin apa adanya dari paket motion (/fiezel-motion/fiezel-mascot.js),
   lalu rig-nya diganti dengan master kanonik redesign PAW (Fase 1–3).

   PROVENANS RIG (sumber desain yang mengikat):
   - pau-redesign/assets/paw-master.svg          — geometri master Direction C
     (perbaikan nesting, pembungkus fz-head, lid kedip, fillet dasar telinga,
      10 bentuk mulut fz-m-*, kaki pil 48x22 rx11 [17 R-6], jangkar fz-outfit)
   - pau-redesign/assets/README.md               — pohon layer, pivot P1–P20,
     aturan id per-instance [P0-1], konvensi tanda literal-SVG [17 R-3]
   - pau-redesign/systems/07-expressions.md §1–2 — pustaka 14 ekspresi
   - pau-redesign/systems/08-poses.md §0–1 + proof sheet v2 — pustaka 16 pose
   - pau-redesign/implementation/code-plan.md Fase 1–3
   KEPUTUSAN OWNER (2026-08-27/28): glyph fiezel-paw HANYA di emblem dada
   (geometri persis assets/brand/fiezel-paw.svg, SHA-256 e52cf230…, skala
   lewat transform grup saja); bantalan tangan (fz-pads) DIHAPUS — lengan
   adalah kapsul kuning polos. Ditagih oleh pawprint-geometry-gate-test.js,
   yang juga menuntut geometri literal DI DALAM grup fz-emblem — karena itu
   glyph ditulis inline di sana (bukan defs+<use> seperti di paw-master.svg;
   satu-satunya instance, indireksi defs tidak diperlukan).

   Satu tambahan di bagian bawah berkas: corong global self.FiezelPaw, supaya
   app.js dan fiezel-coach-bubble.js punya SATU pintu yang aman dipanggil di
   mana saja - tanpanya setiap pemanggil harus menulis try/catch sendiri, dan
   sebuah maskot yang belum ter-mount bisa menjatuhkan jalur penilaian.
   Versi hasil code review produksi. Perubahan vs original:
   [P0-1] id mask/clip SVG unik per instance (fzcEyeL/R-<uid>, fzcTailTip-<uid>,
          fz-pawprint-<uid>); id statis paw-* dari paw-master.svg TIDAK dibawa
          ke runtime (dua instance hidup bersamaan = polusi id duplikat;
          kontrak runtime adalah KELAS fz-*)
   [P0-2] lifecycle connect/disconnect aman: blink hidup lagi saat
          re-connect, state transien tidak macet setelah DOM move
   [P1-1] semua timer dibersihkan saat disconnect (_stT,_lookT,blink,confetti)
   [P1-2] validasi input setState/react/lookAt (+ getter publik .state)
   [P1-3] confetti dibatasi (cap global per instance + reduced-motion)
   [P1-4] guard SSR/no-DOM + guard double-define
   [P2-1] restart keyframes tanpa forced reflow (getAnimations, hanya
          saat re-enter state yang sama)
   [FASE-2] pustaka 14 ekspresi sebagai data + applyFace(name)
   [FASE-3] pustaka 16 pose sebagai data + applyPose(name) — dipakai
          koreografi state di Wave II; tabel + fungsinya dikirim sekarang
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

  /* [P0-1] SVG jadi factory: seluruh id defs unik per instance (uid).
     Geometri = transplantasi 1:1 dari pau-redesign/assets/paw-master.svg. */
  let UID = 0;
  /* [FASE-4] Rujukan memori reaksi lintas-instance: instance pertama yang hidup
     menjadi sumber salinan bagi instance berikutnya (panel kuis dibuat ulang tiap
     soal). Objek TIDAK dibagi — tiap instance menyalin — supaya event broadcast
     tidak menaikkan streak dobel. */
  let PAW_MEM_RUJUKAN = null;
  const svgMarkup = (uid) => `
  <svg viewBox="0 0 320 300" class="fz-svg" aria-label="Maskot FIEZEL">
    <defs>
      <!-- clip per-mata: pupil/lid tidak pernah keluar dari cakram mata -->
      <clipPath id="fzcEyeL-${uid}"><circle cx="126" cy="98" r="16"/></clipPath>
      <clipPath id="fzcEyeR-${uid}"><circle cx="194" cy="98" r="16"/></clipPath>
      <!-- mask ujung ekor (koordinat lokal fz-tail-tip, ikut berputar) -->
      <mask id="fzcTailTip-${uid}" maskUnits="userSpaceOnUse" x="230" y="120" width="110" height="120">
        <path d="M296 200 C 295 180 284 164 268 158" stroke="#fff" stroke-width="25"
              fill="none" stroke-linecap="round"/>
      </mask>
    </defs>

    <ellipse class="fz-shadow" cx="160" cy="284" rx="86" ry="10" fill="#000" opacity=".08"/>

    <g class="fz-all"><!-- P1 nafas: scale 1<->(1.015,.985) -->
      <!-- JANGKAR OUTFIT (belakang): item kelas-ransel; anak pertama fz-all
           supaya dirender di belakang ekor/badan. Kosong by design (README §7). -->
      <g class="fz-outfit-back"></g>

      <!-- ================= EKOR: 2 tulang, kanal emosi sekunder ========= -->
      <g class="fz-tail">
        <g class="fz-tail-base"><!-- P14: rotate -8..+8 deg @ (212,244); netral 0 -->
          <path d="M212 244 C 266 258 298 238 296 200" stroke="${YEL_D}"
                stroke-width="25" fill="none" stroke-linecap="round"/>
        </g>
        <g class="fz-tail-tip"><!-- P15: rotate -20..+20 deg @ sendi (296,200); netral 0 -->
          <path d="M296 200 C 295 180 284 164 268 158" stroke="${YEL_D}"
                stroke-width="25" fill="none" stroke-linecap="round"/>
          <g mask="url(#fzcTailTip-${uid})">
            <circle class="fz-ring" cx="268" cy="158" r="15" fill="${MAROON}"/>
          </g>
        </g>
      </g>

      <!-- ================= BADAN (tidak pernah dirotasi/dicermin) ======= -->
      <g class="fz-body">
        <g class="fz-torso">
          <rect x="102" y="164" width="116" height="96" rx="42" fill="${YEL}"/>
          <!-- patch dada + emblem paw (kunci identitas) -->
          <g class="fz-chest"><!-- P19: scale 1..1.06 (busung proud) -->
            <ellipse cx="160" cy="226" rx="36" ry="28" fill="${CREAM}"/>
            <!-- emblem dada = glyph fiezel-paw.svg APA ADANYA: pusat tinta
                 (12.6,12.45) dijangkar ke (160,225), s=1.75 (F7, terkunci).
                 Koordinat TIDAK disentuh — skala hanya lewat transform grup. -->
            <g class="fz-emblem" transform="translate(160,225) scale(1.75) translate(-12.6,-12.45)">
              <g id="fz-pawprint-${uid}" fill="${MAROON}">
                <rect x="4.6" y="7.5" width="3.1" height="4.6" rx="1.55"/>
                <rect x="8.9" y="5.1" width="3.1" height="7" rx="1.55"/>
                <rect x="13.2" y="3.4" width="3.1" height="8.7" rx="1.55"/>
                <rect x="17.5" y="6.2" width="3.1" height="5.9" rx="1.55"/>
                <path d="M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z"/>
              </g>
            </g>
          </g>
          <!-- kaki: kapsul pil 48x22 rx11 (17 R-6), di depan dada -->
          <g class="fz-legs">
            <rect class="fz-foot fz-foot-l" x="108" y="246" width="48" height="22" rx="11" fill="${YEL_D}"/>
            <rect class="fz-foot fz-foot-r" x="164" y="246" width="48" height="22" rx="11" fill="${YEL_D}"/>
          </g>
        </g>

        <!-- ============ GRUP KEPALA: lean hanya lewat translate ========== -->
        <g class="fz-head"><!-- P2: tx -6..6, ty -4..4; netral 0,0 -->
          <!-- telinga: rotasi L/R independen, dasar ber-fillet anti-celah (Direction A C1) -->
          <g class="fz-ear fz-ear-l"><!-- P3: rotate @ (108,52); literal - = tegak, + = terkulai; -14..+18 -->
            <path d="M76 66 L95 0 L140 34 Q104 66 76 66 Z" fill="${YEL}"/>
            <path d="M90 52 L 101 17 L 125 35 Z" fill="${MAROON}"/>
          </g>
          <g class="fz-ear fz-ear-r"><!-- P4: rotate @ (212,52); literal + = tegak, - = terkulai; -18..+14 -->
            <path d="M244 66 L225 0 L180 34 Q216 66 244 66 Z" fill="${YEL}"/>
            <path d="M230 52 L 219 17 L 195 35 Z" fill="${MAROON}"/>
          </g>
          <circle cx="160" cy="106" r="88" fill="${YEL}"/>

          <!-- ============ RIG WAJAH ============ -->
          <g class="fz-face">
            <ellipse cx="160" cy="140" rx="36" ry="25" fill="${CREAM}"/>
            <path d="M153 126 L 167 126 L 160 136 Z" fill="${MAROON}"/>
            <circle class="fz-blush" cx="102" cy="126" r="11" fill="${BLUSH}"/>
            <circle class="fz-blush" cx="218" cy="126" r="11" fill="${BLUSH}"/>

            <g class="fz-eyes"><!-- P9 gaze: translate ±7/±5 (kontrak lookAt lama) -->
              <g class="fz-eye-open"><!-- P10 eye pop: scale .95..1.12 -->
                <!-- mata KIRI: cakram r16 + klaster highlight terpisah + lid parametrik -->
                <g class="fz-eye fz-eye-l">
                  <circle cx="126" cy="98" r="16" fill="${COCOA}"/>
                  <g class="fz-pupil" clip-path="url(#fzcEyeL-${uid})"><!-- P8: tx ±6, ty ±5 di dalam clip -->
                    <circle cx="130.5" cy="92.5" r="5.5" fill="#fff"/>
                    <circle cx="121.5" cy="104" r="2.8" fill="#fff" opacity=".7"/>
                  </g>
                  <g class="fz-lid-up" clip-path="url(#fzcEyeL-${uid})"><!-- P5: ty 0..34 (0=buka, 34=tutup) -->
                    <circle cx="126" cy="62" r="17" fill="${YEL}"/>
                  </g>
                  <g class="fz-lid-low" clip-path="url(#fzcEyeL-${uid})"><!-- P7: ty 0..-14 (squint senyum) -->
                    <circle cx="126" cy="134" r="17" fill="${YEL}"/>
                  </g>
                </g>
                <!-- mata KANAN -->
                <g class="fz-eye fz-eye-r">
                  <circle cx="194" cy="98" r="16" fill="${COCOA}"/>
                  <g class="fz-pupil" clip-path="url(#fzcEyeR-${uid})"><!-- P8 -->
                    <circle cx="198.5" cy="92.5" r="5.5" fill="#fff"/>
                    <circle cx="189.5" cy="104" r="2.8" fill="#fff" opacity=".7"/>
                  </g>
                  <g class="fz-lid-up" clip-path="url(#fzcEyeR-${uid})"><!-- P6 -->
                    <circle cx="194" cy="62" r="17" fill="${YEL}"/>
                  </g>
                  <g class="fz-lid-low" clip-path="url(#fzcEyeR-${uid})"><!-- P7 -->
                    <circle cx="194" cy="134" r="17" fill="${YEL}"/>
                  </g>
                </g>
              </g>
              <!-- set mata varian dipertahankan dari rig lama (kontinuitas identitas) -->
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
              <!-- layer kedip cepat (P20, berbasis scale). Tersembunyi saat diam
                   lewat transform inline (padanan statis .fz-lid{transform:scale(1,0);
                   transform-origin:50% 0%} di fiezel-motion.css); CSS runtime
                   menimpanya. JANGAN diganti opacity:0 — itu mematikan loop kedip. -->
              <g class="fz-lids">
                <g class="fz-lid" transform="translate(0,80) scale(1,0)">
                  <circle cx="126" cy="98" r="18" fill="${YEL}"/>
                  <path d="M114 99 C 120 105 132 105 138 99" stroke="${COCOA}" stroke-width="5" stroke-linecap="round" fill="none"/>
                </g>
                <g class="fz-lid fz-lid-r" transform="translate(0,80) scale(1,0)">
                  <circle cx="194" cy="98" r="18" fill="${YEL}"/>
                  <path d="M182 99 C 188 105 200 105 206 99" stroke="${COCOA}" stroke-width="5" stroke-linecap="round" fill="none"/>
                </g>
              </g>
            </g>

            <!-- ALIS: kapsul lengkung kelas satu; TERSEMBUNYI saat netral -->
            <g class="fz-brows" opacity="0" stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none">
              <path class="fz-brow-l" d="M115 70 Q 125 63.5 135 66.5" stroke-width="5"/><!-- P11: ty -8..6, rot -14..14 @ (125,67) -->
              <path class="fz-brow-r" d="M185 66.5 Q 195 63.5 205 70" stroke-width="5"/><!-- P12: idem @ (195,67) -->
            </g>

            <!-- SET MULUT (bentuk fz-m-* di-toggle display; netral = smile) -->
            <g class="fz-mouth"><!-- P13: tepat satu bentuk terlihat -->
              <path class="fz-m fz-m-smile" d="M148 148 C 154 155 166 155 172 148"
                    stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
              <path class="fz-m fz-m-soft" style="display:none" d="M152 149 C 156 153 164 153 168 149"
                    stroke="${COCOA}" stroke-width="5" stroke-linecap="round" fill="none"/>
              <path class="fz-m fz-m-open" style="display:none"
                    d="M145 146 C 148 162 172 162 175 146 C 165 150 155 150 145 146 Z" fill="${COCOA}"/>
              <circle class="fz-m fz-m-o" style="display:none" cx="160" cy="151" r="6.5" fill="${COCOA}"/>
              <ellipse class="fz-m fz-m-sp1" style="display:none" cx="160" cy="151" rx="5" ry="3.4" fill="${COCOA}"/>
              <ellipse class="fz-m fz-m-sp2" style="display:none" cx="160" cy="151" rx="7.5" ry="6" fill="${COCOA}"/>
              <path class="fz-m fz-m-wave" style="display:none" d="M147 150 Q 153 145 160 150 Q 167 155 173 150"
                    stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
              <path class="fz-m fz-m-flat" style="display:none" d="M150 150 L 170 150"
                    stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
              <path class="fz-m fz-m-concern" style="display:none" d="M150 152 C 155 148.5 165 148.5 170 152"
                    stroke="${COCOA}" stroke-width="5" stroke-linecap="round" fill="none"/>
              <path class="fz-m fz-m-sad" style="display:none" d="M148 154 C 154 147 166 147 172 154"
                    stroke="${COCOA}" stroke-width="5.5" stroke-linecap="round" fill="none"/>
            </g>

            <g class="fz-acc fz-sweat" opacity="0">
              <path d="M80 72 C 88 84 90 92 90 98 A 10 10 0 1 1 70 98 C 70 92 72 84 80 72 Z" fill="#9CC7E8"/>
            </g>
          </g><!-- /fz-face -->
        </g><!-- /fz-head -->

        <!-- ============ LENGAN: pivot di bahu; netral = istirahat ======== -->
        <!-- Lengan = kapsul kuning POLOS, tanpa marka bantalan apa pun
             (keputusan OWNER: glyph paw hanya di dada; fz-pads pensiun). -->
        <g class="fz-arm fz-arm-l"><!-- P16: rotate @ bahu (115,185); literal -115..+130 (+ = keluar/angkat) -->
          <ellipse cx="115" cy="211" rx="14" ry="30" fill="${YEL}"/>
        </g>
        <g class="fz-arm fz-arm-r"><!-- P17: rotate @ bahu (198,182); literal -130..+115 (- = keluar/angkat) -->
          <ellipse cx="198" cy="206" rx="14" ry="30" fill="${YEL}"/>
        </g>

        <!-- headphone di dalam badan agar ikut goyangan groove -->
        <g class="fz-acc fz-headphones" opacity="0">
          <path d="M76 70 C 92 10 228 10 244 70" stroke="${GOLD}" stroke-width="14" fill="none"
                stroke-linecap="round"/>
          <rect x="52" y="66" width="38" height="54" rx="18" fill="${MAROON}"/>
          <rect x="230" y="66" width="38" height="54" rx="18" fill="${MAROON}"/>
        </g>
      </g><!-- /fz-body -->

      <!-- ============ aksesori kontekstual (tersembunyi saat netral) ====== -->
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

      <!-- JANGKAR OUTFIT (atas): anak terakhir fz-all supaya item outfit
           dirender di atas segalanya. Kosong by design (README §7). -->
      <g class="fz-outfit">
        <g class="fz-outfit-head"></g><!-- topi/bunga; ikut fz-head (cermin translate P2) -->
        <g class="fz-outfit-front"></g><!-- item level dada; cermin busung P19 bila menempel dada -->
      </g>
    </g><!-- /fz-all -->
  </svg>
  <div class="fz-confetti-layer" aria-hidden="true"></div>`;

  /* [FASE-4] 09 §1: mesin state tumbuh 14 → 19. Lima state baru:
     speaking (persisten, kanal mulut — jembatan suaranya Fase 11),
     welcome-back (sambutan kembali, lebih hangat dari greeting),
     lesson-start (pengarah perhatian ke soal pertama),
     level-up & milestone (tingkat tertinggi tangga selebrasi, 13 §4). */
  const STATES = ["idle","greeting","curious","thinking","listening","encouraging",
                  "celebrating","confused","hinting","completion",
                  "proud","sleepy","sad","love",
                  "speaking","welcome-back","lesson-start","level-up","milestone"];
  /* Durasi transien state baru mengikat 17 R-2: welcome-back 2200 (R-2b),
     lesson-start 1600 (R-2c), level-up 2800 (09 §2.13), milestone 3400
     (09 §2.15 / 13 §4.3). speaking SENGAJA tidak transien (persisten). */
  const TRANSIENT = { greeting:1600, encouraging:1500, celebrating:1900,
                      confused:1800, hinting:1900, completion:2600,
                      proud:2200, sad:2400, love:2000,
                      "welcome-back":2200, "lesson-start":1600,
                      "level-up":2800, milestone:3400 };
  /* Tangga prioritas interupsi 09 §4.2. speaking TIDAK masuk NO_BLINK
     (PAW berkedip saat bicara — hidup, bukan robot; 09 §1). */
  const PRIO = { milestone:4, "level-up":4, completion:4,
                 celebrating:3, proud:3, "welcome-back":3,
                 greeting:2, confused:2, encouraging:2, "lesson-start":2,
                 hinting:2, sad:2, love:2,
                 speaking:1, listening:1, thinking:1,
                 idle:0, curious:0, sleepy:0 };
  // Confetti di-retint ke palet tertutup G1 (palette-gate-test.js): dua warna
  // lama (kuning drift dokumen + hijau liar) tidak pernah ada di palet mana pun.
  const CONF_COLORS = [MAROON, GOLD, RED, YEL, BLUSH];
  const CONFETTI_MAX = 120;          // [P1-3] cap partikel hidup per instance
  const NO_BLINK = ["listening","celebrating","completion","proud","love"];

  /* ============================================================
     [FASE-2/3] DATA RIG — pivot + pustaka ekspresi + pustaka pose.
     SEMUA nilai sudah dalam konvensi tanda LITERAL-SVG (17 R-3, searah
     jarum jam positif) — tidak ada konversi tanda saat runtime:
     - telinga: literal earR = -(nilai semantik); pengecualian flag-1
       (Curious/Welcoming di 07 §2: earR literal +4 mengikuti serialisasi
       direction-c.svg; pose looking/waving memakai -4 per mandat
       build_sheet di proof sheet v2 08 — divergensi kosmetik 8° yang
       terdokumentasi).
     - lengan: armL + = keluar/angkat, armR - = keluar/angkat; rentang
       diamendemen ke ±(115..130) untuk chin-reach (08 §0.2).
     - lidUp: ty 0(buka)..34(tutup); lidLow: ty 0..-14 (squint senyum).
     Flag pads dari tuple spec = no-op terdokumentasi (keputusan OWNER:
     glyph hanya di dada; lengan polos).
     ============================================================ */
  const PIVOTS = {
    earL: [108, 52], earR: [212, 52],
    armL: [115, 185], armR: [198, 182],
    tailBase: [212, 244], tailTip: [296, 200],
    browL: [125, 67], browR: [195, 67],
    eyeCenter: [160, 98], chest: [160, 226],
    blushL: [102, 126], blushR: [218, 126],
    footL: [132, 257], footR: [188, 257],
    ground: [160, 284]
  };

  /* 14 ekspresi (07 §2). Field yang tidak ada = netral.
     brow*: [ty, rot]; pupil/head: [tx, ty]; acc: daftar kelas aksesori. */
  const EXPRESSIONS = {
    neutral:     { mouth:"smile" },
    happy:       { earL:-4,  earR:4,   lidLow:-6, mouth:"smile", tailT:8,  blush:1.05 },
    excited:     { earL:-8,  earR:8,   pupil:[0,-2], pop:1.04, browL:[-4,0], browR:[-4,0],
                   mouth:"open", tailT:16, armL:60,  armR:-60, head:[0,-2], blush:1.1 },
    curious:     { earL:-10, earR:4,   pupil:[4,-3], browL:[-6,-4], browR:[0,0],
                   mouth:"soft", tailT:14, head:[4,0] },
    thinking:    { earL:2,   earR:6,   lidUp:10, pupil:[6,-5], browL:[4,6], browR:[4,-6],
                   mouth:"flat", tailT:-4, armR:96, head:[2,-1] },
    confused:    { earL:8,   earR:8,   lidUp:6, pupil:[-3,0], browL:[0,-10], browR:[0,10],
                   mouth:"wave", tailT:-8, head:[-3,0], acc:["fz-sweat"] },
    encouraging: { earL:-6,  earR:6,   browL:[-3,0], browR:[-3,0],
                   mouth:"open", tailT:10, armR:-90, head:[0,-1] },
    proud:       { earL:-6,  earR:6,   lidUp:8, mouth:"soft", tailT:12,
                   armL:-10, armR:10,  chest:1.06, head:[0,-2], blush:1.1 },
    surprised:   { earL:-12, earR:12,  pop:1.1, browL:[-7,0], browR:[-7,0],
                   mouth:"o", tailT:20, armL:20, armR:-20, head:[0,-3] },
    celebrating: { earL:-10, earR:10,  pupil:[0,-2], pop:1.04, browL:[-5,0], browR:[-5,0],
                   mouth:"open", tailB:6, tailT:18, armL:115, armR:-115, blush:1.15 },
    calm:        { earL:4,   earR:-4,  lidUp:14, pupil:[0,1], mouth:"soft" },
    sleepy:      { earL:10,  earR:-12, lidUp:26, pupil:[0,3], mouth:"flat",
                   tailT:-6, head:[0,2] },
    welcoming:   { earL:-8,  earR:4,   browL:[-4,0], browR:[-4,0], mouth:"open",
                   tailT:18, armL:105, armR:-14, head:[2,-2], blush:1.05 },
    concern:     { earL:9,   earR:-9,  lidUp:8, pupil:[-2,1], browL:[2,-8], browR:[2,8],
                   mouth:"concern", tailT:-10, armL:12, armR:-12, head:[-2,1] }
  };

  /* 16 pose (08 §1, frame statis proof sheet v2). Field tambahan vs ekspresi:
     gaze: [--lx,--ly] px · all: {tx,ty,sx,sy} @ titik tanah (160,284) ·
     footL/R: {tx,ty,sx,sy} @ pusat kaki · shadow: {s,o} · lidsHold: lid kedip
     ditahan tertutup (pose sleeping — garis bulunya = read tidur).
     HANYA rotasi anggota badan pada pivotnya sendiri; TANPA rotasi/cermin tubuh.
     Alis thinking/studying memakai bentuk fokus 07 §1.3 (inner-down: browL rot +,
     browR rot -); urutan "-6/+6" pada teks 08 §1.5 dibaca sebagai daftar nilai,
     bukan urutan L/R — dicatat di impl-01-rig.md. */
  const POSES = {
    idle:        { tailT:4 },
    waving:      { head:[2,-2], earL:-8, earR:-4, browL:[-3,-4], browR:[-3,4],
                   mouth:"open", tailT:18, armL:105, armR:-14 },
    pointing:    { armL:88, head:[-3,0], gaze:[-6,0], pupil:[-4,0], earL:-10, earR:-2,
                   browL:[-3,0], browR:[0,0], mouth:"soft", tailT:8 },
    looking:     { head:[4,0], gaze:[6,-3], pupil:[4,-3], earL:-10, earR:-4,
                   browL:[0,0], browR:[-3,4], mouth:"soft", tailT:14 },
    thinking:    { head:[2,-1], earL:2, earR:6, lidUp:10, pupil:[5,-4],
                   browL:[4,6], browR:[4,-6], mouth:"flat", tailT:-4, armR:96 },
    reading:     { all:{sx:1.03,sy:0.95}, footL:{tx:-7,ty:3,sx:1.12,sy:0.9},
                   footR:{tx:7,ty:3,sx:1.12,sy:0.9}, head:[0,3], gaze:[0,4],
                   pupil:[0,4], lidUp:8, earL:2, earR:-2, mouth:"soft",
                   armL:-18, armR:18, tailB:-4, tailT:-6 },
    studying:    { all:{sx:1.03,sy:0.95}, footL:{tx:-7,ty:3,sx:1.12,sy:0.9},
                   footR:{tx:7,ty:3,sx:1.12,sy:0.9}, head:[0,2], gaze:[0,4],
                   pupil:[0,4], lidUp:6, earL:2, earR:-2, browL:[3,5], browR:[3,-5],
                   mouth:"soft", armL:-18, armR:18, tailB:-4, tailT:-6,
                   acc:["fz-dots"] },
    listening:   { earL:-4, earR:4, lidLow:-8, mouth:"smile", acc:["fz-headphones"] },
    presenting:  { armL:60, armR:-60, chest:1.04, head:[0,-1],
                   browL:[-3,0], browR:[-3,0], mouth:"open", tailT:10 },
    encouraging: { armR:-90, browL:[-3,0], browR:[-3,0], mouth:"open",
                   earL:-6, earR:6, tailT:10 },
    celebrating: { earL:-10, earR:10, pupil:[0,-2], browL:[-4,0], browR:[-4,0],
                   mouth:"open", tailB:6, tailT:18, armL:112, armR:-112,
                   all:{ty:-12,sx:0.97,sy:1.05}, shadow:{s:0.85,o:0.06} },
    jumping:     { all:{ty:-22,sx:0.95,sy:1.06}, footL:{tx:2,ty:-2,sx:0.95,sy:0.9},
                   footR:{tx:-2,ty:-2,sx:0.95,sy:0.9}, armL:115, armR:-115,
                   earL:-12, earR:12, mouth:"open", tailB:8, tailT:20,
                   shadow:{s:0.7,o:0.05} },
    sitting:     { all:{sx:1.03,sy:0.95}, head:[0,2], earL:4, earR:-4, lidUp:14,
                   mouth:"soft", footL:{tx:-7,ty:3,sx:1.12,sy:0.9},
                   footR:{tx:7,ty:3,sx:1.12,sy:0.9}, armL:-10, armR:10,
                   tailB:-8, tailT:-12 },
    walking:     { footL:{tx:7,ty:-9}, footR:{tx:-4,ty:0}, armL:24, armR:-18,
                   all:{ty:-3}, head:[4,0], gaze:[5,0], earL:-4, earR:-2,
                   mouth:"soft", tailB:5, tailT:10 },
    running:     { footL:{tx:10,ty:-13}, footR:{tx:-8,ty:-2}, armL:45, armR:-40,
                   all:{ty:-5,sx:1.05,sy:0.96}, head:[6,1], earL:8, earR:-10,
                   gaze:[6,0], mouth:"sp2", tailB:-6, tailT:-18, shadow:{s:0.8} },
    sleeping:    { lidsHold:true, head:[0,3], earL:10, earR:-12, mouth:"soft",
                   footL:{tx:4,ty:1}, footR:{tx:-4,ty:1}, tailT:-8,
                   all:{ty:2}, acc:["fz-zzz"] }
  };

  /* Helper serialisasi transform (nilai literal, spasi sebagai pemisah). */
  const rotAt = (v, p) => `rotate(${v} ${p[0]} ${p[1]})`;
  const trXY = (x, y) => `translate(${x} ${y})`;
  const scaleAt = (p, sx, sy) =>
    `translate(${p[0]} ${p[1]}) scale(${sx} ${sy}) translate(${-p[0]} ${-p[1]})`;

  /* [P0 rig-repair 2026-08-28, audit O3 §4] Helper transform CSS untuk kanal
     rotasi/skala tuple. fiezel-motion.css memasang transform-box pada SELURUH
     turunan rig (:123 fill-box global, :131-137 view-box lengan/telinga/ekor)
     + transform-origin — dan atribut transform SVG ikut terkena origin CSS,
     sehingga pivot yang dibake di atribut (rotate(a cx cy)) terpasang DUA KALI
     (armR pose thinking terlempar ke x=542 pada viewBox 320). Perbaikannya:
     kanal rotasi/skala ditulis sebagai gaya inline — transform-box:view-box +
     transform-origin = pivot PIVOTS + fungsi transform polos tanpa pivot —
     satu model origin dengan sistem keyframe. Kanal translate murni tetap
     atribut (translate kebal transform-origin). Dibersihkan _rigReset/_costumeReset. */
  const rotCss = (v) => `rotate(${v}deg)`;
  const trCss = (x, y) => `translate(${x}px, ${y}px)`;
  const scCss = (sx, sy) => `scale(${sx}, ${sy})`;
  const styleAt = (el, p, v) => {
    el.style.transformBox = "view-box";
    el.style.transformOrigin = `${p[0]}px ${p[1]}px`;
    el.style.transform = v;
  };

  class FiezelMascot extends HTMLElement {
    /* [P0-2] connect/disconnect bisa terjadi berulang (appendChild = move
       men-trigger disconnect+connect sinkron). Init DOM hanya sekali,
       tapi loop kedip & pemulihan state jalan setiap connect. */
    connectedCallback() {
      if (!this._init) {
        this._init = true;
        this._uid = ++UID;                       // [P0-1]
        this.classList.add("fz-mascot");
        this.innerHTML = svgMarkup(this._uid);
        this._layer = this.querySelector(".fz-confetti-layer");
        /* [FASE-4] 09 §4.3: _mem diperluas — lastFire (stempel waktu cooldown
           per event, hidup sebatas sesi instance) dan lastTier (aturan tier-entry
           13 §1.2: koreografi tier penuh hanya saat streak MENYEBERANG ke tier).
           milestoneKeys TIDAK di sini — gerbang once-ever hidup di storage app.
           [FASE-4] Panel kuis membuat instance BARU tiap soal (setApp menulis ulang
           DOM), sehingga streak/tier-nya selalu mulai dari nol dan aturan tier-entry
           13 §1.2 tidak pernah tercapai di maskot yang justru paling terlihat.
           Solusi bedah: instance baru MENYALIN memori dari rujukan modul (satu murid,
           banyak titik render — semua menerima aliran event yang sama, jadi salinan
           tetap sinkron; TANPA berbagi objek supaya hitungan tidak dobel). */
        this._mem = PAW_MEM_RUJUKAN
          ? { ...PAW_MEM_RUJUKAN, lastFire: { ...PAW_MEM_RUJUKAN.lastFire } }
          : { streak: 0, wrongRow: 0, greets: 0, looks: 0,
              lastFire: {}, lastTier: 0 };
        // Rujukan selalu menunjuk instance terbaru yang hidup (paling akurat
        // saat panel kuis diganti soal berikutnya).
        PAW_MEM_RUJUKAN = this._mem;
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
      clearTimeout(this._p4QueueT); this._p4QueueT = null;  // [FASE-4] antrean P4
      this.classList.remove("blink");
      if (this._layer) this._layer.textContent = "";  // buang confetti tersisa
      this._confettiLive = 0;
      this._stGen = (this._stGen || 0) + 1;       // batalkan callback nyasar
    }

    /* [P1-2] getter publik — konsumen tidak perlu baca this._state */
    get state() { return this._state; }
    static get states() { return STATES.slice(); }
    /* [FASE-2/3] daftar nama pustaka — additive, tidak menyentuh states */
    static get expressions() { return Object.keys(EXPRESSIONS); }
    static get poses() { return Object.keys(POSES); }

    /* ---------- inti ---------- */
    /**
     * setState(name, opts)
     *  name : salah satu FiezelMascot.states (wajib, string)
     *  opts.level : int 1..3 (di-clamp & dibulatkan) — intensitas celebrating
     *  opts.hold  : ms > 0 (finite) sebelum kembali; null/0 = tidak revert;
     *               default: TRANSIENT[name]
     *  opts.then  : state tujuan setelah hold (divalidasi; default "idle")
     *  opts.confetti : int ≥0 (finite) — override jumlah confetti [FASE-4]
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
      // [FASE-4] override confetti per-reaksi (13 §1: lv1 28, entry lv2 38, dst.)
      const conf = Number.isFinite(opts.confetti)
        ? Math.max(0, Math.round(opts.confetti)) : null;

      clearTimeout(this._stT); this._stT = null;
      const gen = ++this._stGen;                  // [P0-2/race] token generasi

      const reenter = this._state === name;
      this._costumeReset();                       // [FASE-4] buang kostum inline
      STATES.forEach(s => this.classList.remove("st-" + s));
      this.classList.remove("lv-1","lv-2","lv-3");
      this._state = name;
      this._stAt = Date.now();                    // [FASE-4] stempel masuk state
      this._stHold = hold;                        //          sisa hold utk antrean P4
      this.classList.add("st-" + name);
      if (level) this.classList.add("lv-" + level);
      // [P2-1] hanya perlu restart paksa saat masuk ulang state yang sama;
      // pergantian state lain sudah otomatis restart lewat perubahan class.
      if (reenter) this._restartAnimations();
      this._mouth(name);
      if (name === "celebrating" || name === "completion")
        this._confetti(conf ?? (name === "completion" ? 46 : 18 + 10 * (level || 1)));
      this._choreo(name, gen);                    // [FASE-4] koreografi JS state baru
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
     *   idle-timeout | wake | reward | correct-streak (alias usang → reward) |
     *   lesson-start | welcome-back | level-up | milestone (butuh d.key) |
     *   speak-start | speak-end.  detail.target: Element atau {x,y} (opsional).
     * return: hasil setState (boolean) atau false untuk event tak dikenal.
     */
    react(evt, d) {
      if (!this._init) return false;
      if (d == null || typeof d !== "object") d = {};   // [P1-2]
      const m = this._mem;
      const now = Date.now();
      /* ---- [FASE-4] penjaga tangga interupsi (09 §4.2) -------------------
         Selama hold state berjalan (this._stT hidup), event berprioritas lebih
         rendah DISERAP (return true, _mem tetap dimutasi supaya streak/tier
         jujur). P4 menyusul P4 → diantre SEKALI (yang terbaru menang, 09 §4.2).
         sleepy hanya bisa dibangunkan wake/welcome-back (09 §4.4). ----------- */
      const TARGET = { onboard:"greeting", "question-shown":"curious",
        "hover-answer":"curious", "answer-picked":"thinking",
        correct:"celebrating", wrong:"confused", hint:"hinting",
        "listening-start":"listening", "listening-stop":"idle",
        "lesson-complete":"completion", "streak-lost":"sad",
        favorite:"love", "badge-earned":"proud", "idle-timeout":"sleepy",
        wake:"greeting", reward:"celebrating", "correct-streak":"celebrating",
        "lesson-start":"lesson-start", "welcome-back":"welcome-back",
        "level-up":"level-up", milestone:"milestone",
        "speak-start":"speaking", "speak-end":"idle" };
      const tgt = TARGET[evt];
      if (tgt) {
        const curP = PRIO[this._state] ?? 0;
        const nxtP = PRIO[tgt] ?? 0;
        // listening & idle TIDAK dianggap menahan — listening-stop dan alur
        // soal harus selalu bisa lewat (perilaku lama dipertahankan).
        const holding = !!this._stT || this._state === "speaking"
                        || this._state === "sleepy";
        if (holding && this._state === "sleepy") {
          /* 09 §4.4: dari sleepy yang tembus hanya wake / welcome-back — plus
             event mulai-aktivitas (implisit bangun; murid jelas sudah kembali). */
          const wakes = evt === "wake" || evt === "welcome-back"
            || evt === "onboard" || evt === "lesson-start"
            || evt === "question-shown" || evt === "listening-start";
          if (!wakes) {
            this._memTouch(evt, m);
            return true;                       // diserap, bukan error
          }
        } else if (holding && this._state === "speaking") {
          // Deviasi terdokumentasi: sebelum jembatan suara Fase 11, P≤2 saat
          // bicara dijatuhkan; P3+ menggantikan (selebrasi tidak boleh hilang).
          if (nxtP <= 2 && evt !== "speak-end") {
            this._memTouch(evt, m);
            return true;
          }
        } else if (holding && nxtP < curP) {
          this._memTouch(evt, m);
          return true;                         // prioritas kalah → diserap
        } else if (holding && nxtP >= 4 && curP >= 4 && this._state !== tgt) {
          // P4 menyusul P4: antre SEKALI setelah sisa hold (+50ms napas).
          const remain = Math.max(0, (this._stHold || 0) - (now - (this._stAt || now)));
          clearTimeout(this._p4QueueT);
          const gen = this._stGen;
          this._memTouch(evt, m);
          this._p4QueueT = setTimeout(() => {
            this._p4QueueT = null;
            if (gen !== this._stGen || !this.isConnected) return;
            this.react(evt, d);
          }, remain + 50);
          return true;
        }
      }
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
        case "correct": {
          /* [FASE-4/8] 13 §1.1-1.2: lv1 ≤1200ms; tier penuh HANYA saat entry
             (streak menyeberang tier); ulangan dalam tier = beat lv1 hemat. */
          if (now - (m.lastFire.correct || 0) < 250) return true;  // anti dobel-klik
          m.lastFire.correct = now;
          m.streak++; m.wrongRow = 0;
          const tier = Math.min(3, m.streak);
          const entry = tier > (m.lastTier || 0);
          m.lastTier = Math.max(m.lastTier || 0, tier);
          // Whiplash guard 13 §5: benar <1300ms setelah salah → tunda selesainya beat concern.
          const wait = Math.max(0, (m.lastFire.wrong || 0) + 1300 - now);
          const fire = () => {
            if (entry && tier === 3)
              return this.setState("celebrating", { level: 3, hold: 1900, confetti: this._burstOk(now) ? 48 : 0 });
            if (entry && tier === 2)
              return this.setState("celebrating", { level: 2, hold: 1600, confetti: this._burstOk(now) ? 38 : 0 });
            // lv1 / ulangan dalam tier: 1200ms, confetti hemat (gerbang burst 3s;
            // ulangan dalam tier hanya tiap jawaban benar ke-5).
            const conf = tier === 1
              ? (this._burstOk(now) ? 28 : 0)
              : (m.streak % 5 === 0 && this._burstOk(now) ? 24 : 0);
            return this.setState("celebrating", { level: 1, hold: 1200, confetti: conf });
          };
          if (wait > 0) {
            const gen = this._stGen;
            setTimeout(() => { if (gen === this._stGen && this.isConnected) fire(); }, wait);
            return true;
          }
          return fire();
        }
        case "wrong": {
          /* [FASE-8] 13 §2: Gentle concern — BUKAN alarm. Wajah concern (07 #14),
             tanpa sweat/goyang/air mata; ≤1000ms lalu mengalir ke encouraging. */
          m.lastFire.wrong = now;
          m.streak = 0; m.wrongRow++; m.lastTier = 0;
          if (m.wrongRow >= 2) return this.setState("encouraging");
          const ok = this.setState("confused", { hold: 1000, then: "encouraging" });
          if (ok) { this.applyFace("concern"); this._concernCostume(); }
          return ok;
        }
        case "hint":
          // 09 §4.5: hinting ber-cooldown 8s — jangan jadi metronom.
          if (now - (m.lastFire.hint || 0) < 8000) return true;
          m.lastFire.hint = now;
          return this.setState("hinting");
        case "listening-start":
          return this.setState("listening");
        case "listening-stop":
          return this.setState("idle");
        case "lesson-complete":
          /* [FASE-8] 13 §3: busur 2600ms (angkat → puncak → mereda), cincin ekor
             ikut lewat pose CSS completion — bukan 3200 gepeng yang lama. */
          m.streak = 0; m.lastTier = 0;
          return this.setState("completion", { hold: 2600 });
        case "streak-lost":
          /* [FASE-8] 09 §2.16: sad dibawakan sebagai kepedulian lembut —
             air mata & mulut sedih disingkir, wajah concern menimpa. */
          m.streak = 0; m.wrongRow = 0; m.lastTier = 0; {
            const ok = this.setState("sad", { hold: 2400, then: "encouraging" });
            if (ok) { this.applyFace("concern"); this._concernCostume(); }
            return ok;
          }
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
        /* ---------------- [FASE-4] event baru 09 §3.2 ---------------- */
        case "reward": {
          /* 13 §1.3 / 17 R-1: momen hadiah (gems dsb.) — celebrating lv2 1600ms,
             confetti 38, dada 1.06, cooldown 4s, dan TIDAK menyentuh m.streak. */
          if (now - (m.lastFire.reward || 0) < 4000) return true;
          m.lastFire.reward = now;
          this.lookAt(d.target);
          const ok = this.setState("celebrating", { level: 2, hold: 1600, confetti: 38 });
          if (ok) {
            const chest = this.querySelector(".fz-chest");
            // [P0 rig-repair] gaya CSS ber-origin, bukan atribut berpivot ganda
            if (chest) styleAt(chest, PIVOTS.chest, scCss(1.06, 1.06));
          }
          return ok;
        }
        case "correct-streak":
          /* 17 R-1: alias usang — satu peringatan per instance, lalu teruskan. */
          if (!this._warnedCS) {
            this._warnedCS = true;
            console.info('[fiezel-mascot] event "correct-streak" usang — pakai "reward"');
          }
          return this.react("reward", d);
        case "lesson-start":
          /* 09 §2.17: pengarah perhatian ke soal pertama, 1600ms (R-2c). */
          m.wrongRow = 0;
          this.lookAt(d.target);
          return this.setState("lesson-start");
        case "welcome-back":
          /* 09 §2.18: sambutan kembali 2200ms (R-2b). Gerbang 4h dipegang app. */
          m.greets++;
          return this.setState("welcome-back");
        case "level-up":
          /* 09 §2.13 / 13 §4.1: puncak seremoni naik level, 2800ms, cooldown 10s. */
          if (now - (m.lastFire.levelUp || 0) < 10000) return true;
          m.lastFire.levelUp = now;
          m.streak = 0; m.lastTier = 0;
          this.lookAt(d.target);
          return this.setState("level-up");
        case "milestone":
          /* 09 §2.15 / 13 §4.3: babak dua — wajib d.key (gerbang once-ever di app).
             Masuk dari ketenangan: kalau belum tenang ≥600ms, lewat proud dulu (R-2e). */
          if (typeof d.key !== "string" || !d.key) {
            console.warn("[fiezel-mascot] react: milestone butuh detail.key (string)");
            return false;
          }
          m.streak = 0; m.lastTier = 0;
          if ((this._state === "idle" || this._state === "proud")
              && now - (this._stAt || 0) >= 600) {
            return this.setState("milestone");
          }
          return this.setState("proud", { hold: 600, then: "milestone" });
        case "speak-start":
          /* 09 §2.19: kanal mulut persisten; selebrasi P4 tidak boleh direbut. */
          if ((PRIO[this._state] ?? 0) >= 4 && this._stT) return true;
          this._preSpeak = this._state === "listening" ? "listening" : "idle";
          return this.setState("speaking", { hold: 0 });
        case "speak-end":
          if (this._state === "speaking")
            return this.setState(this._preSpeak || "idle");
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

    /* ---------- [FASE-2/3] penerapan tuple ekspresi & pose ---------- */
    /**
     * applyFace(name) — terapkan satu tuple dari pustaka 14 ekspresi (07 §2)
     * sebagai frame statis di atas rig. Tidak mengubah state/kelas st-*;
     * kedip & lookAt tetap hidup. return true/false.
     */
    applyFace(name) {
      if (!this._init) return false;
      const t = EXPRESSIONS[name];
      if (!t) {
        console.warn(`[fiezel-mascot] applyFace: ekspresi tidak dikenal: "${name}"`);
        return false;
      }
      this._rigReset();
      this._applyTuple(t);
      return true;
    }

    /**
     * applyPose(name) — terapkan satu tuple dari pustaka 16 pose (08 §1)
     * sebagai frame statis. Dipakai koreografi state di Wave II; sudah bisa
     * dipanggil langsung sekarang. return true/false.
     */
    applyPose(name) {
      if (!this._init) return false;
      const t = POSES[name];
      if (!t) {
        console.warn(`[fiezel-mascot] applyPose: pose tidak dikenal: "${name}"`);
        return false;
      }
      this._rigReset();
      this._applyTuple(t);
      return true;
    }

    /** Kembalikan seluruh kanal rig ke netral (dipanggil sebelum tiap apply). */
    _rigReset() {
      const clr = (sel, fn) => this.querySelectorAll(sel).forEach(fn);
      // transform atribut yang dipasang _applyTuple — JANGAN sentuh .fz-emblem
      // (transform jangkar terkunci F7) ataupun atribut transform .fz-lid
      // (persembunyian statis layer kedip).
      clr(".fz-ear-l,.fz-ear-r,.fz-arm-l,.fz-arm-r,.fz-tail-base,.fz-tail-tip," +
          ".fz-head,.fz-lid-up,.fz-lid-low,.fz-pupil,.fz-eye-open,.fz-chest," +
          ".fz-blush,.fz-brow-l,.fz-brow-r,.fz-foot-l,.fz-foot-r,.fz-all,.fz-shadow",
          el => {
            el.removeAttribute("transform");
            // [P0 rig-repair] gaya transform inline yang dipasang styleAt/_applyTuple
            el.style.transform = ""; el.style.transformOrigin = ""; el.style.transformBox = "";
          });
      // animasi CSS yang sempat dimatikan inline (twitch telinga, nafas)
      clr(".fz-ear-l,.fz-ear-r,.fz-all", el => { el.style.animation = ""; });
      // opacity inline (alis, aksesori, bayangan) & lid kedip yang ditahan
      clr(".fz-brows,.fz-acc,.fz-shadow", el => { el.style.opacity = ""; });
      clr(".fz-lid", el => { el.style.transform = ""; });
      // gaze pose (properti host yang juga dipakai lookAt)
      this.style.removeProperty("--lx");
      this.style.removeProperty("--ly");
      // mulut kembali ke mulut state yang sedang berjalan
      this._mouth(this._state);
    }

    /* ---------- [FASE-4/8] pembantu mesin state ---------- */

    /** Bersihkan frame statis & kostum inline saat GANTI state — seperti
     *  _rigReset TANPA menyentuh gaze (--lx/--ly milik lookAt yang sering
     *  dipasang tepat sebelum setState) dan tanpa set mulut (setState sendiri
     *  yang memanggil _mouth setelahnya). */
    _costumeReset() {
      const clr = (sel, fn) => this.querySelectorAll(sel).forEach(fn);
      clr(".fz-ear-l,.fz-ear-r,.fz-arm-l,.fz-arm-r,.fz-tail-base,.fz-tail-tip," +
          ".fz-head,.fz-lid-up,.fz-lid-low,.fz-pupil,.fz-eye-open,.fz-chest," +
          ".fz-blush,.fz-brow-l,.fz-brow-r,.fz-foot-l,.fz-foot-r,.fz-all,.fz-shadow",
          el => {
            el.removeAttribute("transform");
            // [P0 rig-repair] gaya transform inline yang dipasang styleAt/_applyTuple
            el.style.transform = ""; el.style.transformOrigin = ""; el.style.transformBox = "";
          });
      clr(".fz-ear-l,.fz-ear-r,.fz-all,.fz-face,.fz-sweat,.fz-tear",
          el => { el.style.animation = ""; });
      clr(".fz-brows,.fz-acc,.fz-shadow", el => { el.style.opacity = ""; });
      clr(".fz-lid,.fz-brow-l,.fz-brow-r", el => { el.style.transform = ""; });
    }

    /** Kostum Gentle concern (13 §2.2) di atas kelas .st-confused/.st-sad:
     *  inline mengalahkan CSS kelas — sweat/air mata padam, goyang fzShakeX
     *  mati, alis diperlembut ke ±8° (separuh alarm ±14° bawaan kelas).
     *  fiezel-motion.css TIDAK disentuh; dibersihkan _costumeReset. */
    _concernCostume() {
      const s = (sel, fn) => this.querySelectorAll(sel).forEach(fn);
      s(".fz-sweat,.fz-tear", el => { el.style.opacity = "0"; el.style.animation = "none"; });
      s(".fz-face", el => { el.style.animation = "none"; });
      s(".fz-brow-l", el => { el.style.transform = "translateY(2px) rotate(8deg)"; });
      s(".fz-brow-r", el => { el.style.transform = "translateY(2px) rotate(-8deg)"; });
    }

    /** Gerbang ledakan confetti ≥28 partikel: maksimal sekali per 3 detik
     *  (13 §5 anti-spam) — beat state tetap jalan, ledakannya yang dijatah. */
    _burstOk(now) {
      const m = this._mem;
      if (now - (m.lastFire.burst || 0) < 3000) return false;
      m.lastFire.burst = now;
      return true;
    }

    /** Mutasi memori untuk event yang DISERAP penjaga interupsi — supaya
     *  streak/tier tetap jujur meski reaksinya tidak tampil (09 §4.2). */
    _memTouch(evt, m) {
      const now = Date.now();
      if (evt === "correct") { m.streak++; m.wrongRow = 0; m.lastFire.correct = now; }
      else if (evt === "wrong") { m.streak = 0; m.wrongRow++; m.lastTier = 0; m.lastFire.wrong = now; }
      else if (evt === "streak-lost") { m.streak = 0; m.wrongRow = 0; m.lastTier = 0; }
      else if (evt === "lesson-complete") { m.streak = 0; m.lastTier = 0; }
    }

    /** Koreografi JS untuk state tanpa kelas CSS khusus (level-up & milestone,
     *  13 §4): meminjam kelas .st-celebrating/.lv-3 sementara + urutan applyFace.
     *  Semua langkah dijaga token generasi — setState berikutnya membatalkannya. */
    _choreo(name, gen) {
      const at = (ms, fn) => setTimeout(() => {
        if (gen !== this._stGen || !this.isConnected) return;
        fn();
      }, ms);
      if (name === "level-up") {
        // 13 §4.1: terkejut-senang → selebrasi penuh (confetti 60) → mendarat proud.
        this.applyFace("surprised");
        at(150, () => { this.classList.add("st-celebrating", "lv-3"); this.applyFace("celebrating"); });
        at(200, () => this._confetti(60));
        at(2000, () => { this.classList.remove("st-celebrating", "lv-3"); this.applyFace("proud"); });
      } else if (name === "milestone") {
        // 13 §4.3 / 17 R-2e: tahan proud 600ms → ledakan (confetti 80 @700ms) → bangga panjang.
        this.applyFace("proud");
        at(600, () => { this.classList.add("st-celebrating", "lv-3"); this.applyFace("celebrating"); });
        at(700, () => this._confetti(80));
        at(2200, () => { this.classList.remove("st-celebrating", "lv-3"); this.applyFace("proud"); });
      }
    }

    /** Serialisasi satu tuple (nilai literal 17 R-3) ke atribut/gaya rig.
     *  [P0 rig-repair 2026-08-28] Kanal rotasi/skala kini gaya CSS inline
     *  (styleAt) — bukan atribut berpivot bake — supaya tidak berpivot ganda
     *  di bawah transform-box/transform-origin fiezel-motion.css (O3 §4). */
    _applyTuple(t) {
      const one = (sel) => this.querySelector(sel);
      const setT = (sel, v) =>
        this.querySelectorAll(sel).forEach(el => el.setAttribute("transform", v));
      const setC = (sel, p, v) =>
        this.querySelectorAll(sel).forEach(el => styleAt(el, p, v));
      // telinga: animasi twitch CSS selalu menang atas gaya inline → matikan inline
      if (t.earL != null || t.earR != null) {
        this.querySelectorAll(".fz-ear-l,.fz-ear-r")
          .forEach(el => { el.style.animation = "none"; });
        if (t.earL != null) setC(".fz-ear-l", PIVOTS.earL, rotCss(t.earL));
        if (t.earR != null) setC(".fz-ear-r", PIVOTS.earR, rotCss(t.earR));
      }
      // lengan (rotasi pivot bahu — satu-satunya rotasi yang legal selain
      // telinga/ekor/alis; tubuh tidak pernah dirotasi)
      if (t.armL != null) setC(".fz-arm-l", PIVOTS.armL, rotCss(t.armL));
      if (t.armR != null) setC(".fz-arm-r", PIVOTS.armR, rotCss(t.armR));
      // ekor 2 tulang
      if (t.tailB != null) setC(".fz-tail-base", PIVOTS.tailBase, rotCss(t.tailB));
      if (t.tailT != null) setC(".fz-tail-tip", PIVOTS.tailTip, rotCss(t.tailT));
      // kepala: HANYA translate (aturan mengikat P2)
      if (t.head) setT(".fz-head", trXY(t.head[0], t.head[1]));
      // kelopak parametrik & pupil (di dalam clip per-mata)
      if (t.lidUp != null) setT(".fz-lid-up", trXY(0, t.lidUp));
      if (t.lidLow != null) setT(".fz-lid-low", trXY(0, t.lidLow));
      if (t.pupil) setT(".fz-pupil", trXY(t.pupil[0], t.pupil[1]));
      // eye pop / busung dada / blush — scale di sekitar pusatnya sendiri
      if (t.pop != null) setC(".fz-eye-open", PIVOTS.eyeCenter, scCss(t.pop, t.pop));
      if (t.chest != null) setC(".fz-chest", PIVOTS.chest, scCss(t.chest, t.chest));
      if (t.blush != null) {
        const bl = this.querySelectorAll(".fz-blush");
        if (bl[0]) styleAt(bl[0], PIVOTS.blushL, scCss(t.blush, t.blush));
        if (bl[1]) styleAt(bl[1], PIVOTS.blushR, scCss(t.blush, t.blush));
      }
      // alis: grup muncul bila salah satu sisi didefinisikan; sisi [0,0] = istirahat
      // (origin = pivot alis; translate lalu rotate polos = translate + rotasi di pivot)
      if (t.browL || t.browR) {
        const g = one(".fz-brows");
        if (g) g.style.opacity = "1";
        if (t.browL) setC(".fz-brow-l", PIVOTS.browL,
          `${trCss(0, t.browL[0])} ${rotCss(t.browL[1])}`);
        if (t.browR) setC(".fz-brow-r", PIVOTS.browR,
          `${trCss(0, t.browR[0])} ${rotCss(t.browR[1])}`);
      }
      // mulut
      if (t.mouth) this._setMouth(t.mouth);
      // gaze pose → properti host yang sama dengan lookAt (P9)
      if (t.gaze) {
        this.style.setProperty("--lx", t.gaze[0] + "px");
        this.style.setProperty("--ly", t.gaze[1] + "px");
      }
      // fz-all: translate + squash/stretch di titik tanah (160,284) — TANPA
      // rotasi; animasi nafas dimatikan inline agar atribut terbaca
      if (t.all) {
        const a = one(".fz-all");
        if (a) {
          a.style.animation = "none";
          // origin inline di titik tanah menang atas 50% 88% / 95% milik kelas state
          styleAt(a, PIVOTS.ground,
            `${trCss(t.all.tx || 0, t.all.ty || 0)} ${scCss(t.all.sx ?? 1, t.all.sy ?? 1)}`);
        }
      }
      // kaki: translate + scale di pusat kaki (F1–F4; tanpa rotasi kaki)
      const foot = (sel, f, p) => {
        if (!f) return;
        setC(sel, p, `${trCss(f.tx || 0, f.ty || 0)} ${scCss(f.sx ?? 1, f.sy ?? 1)}`);
      };
      foot(".fz-foot-l", t.footL, PIVOTS.footL);
      foot(".fz-foot-r", t.footR, PIVOTS.footR);
      // bayangan lantai (mengecil saat melayang)
      if (t.shadow) {
        const sh = one(".fz-shadow");
        if (sh) {
          styleAt(sh, PIVOTS.ground, scCss(t.shadow.s ?? 1, t.shadow.s ?? 1));
          if (t.shadow.o != null) sh.style.opacity = String(t.shadow.o);
        }
      }
      // pose sleeping: layer kedip ditahan tertutup — inline mengalahkan
      // stylesheet (.fz-lid{scale(1,0)}); garis bulu mata = read "tidur"
      if (t.lidsHold) this.querySelectorAll(".fz-lid")
        .forEach(el => { el.style.transform = "scale(1,1)"; });
      // aksesori tersanksi (opacity saja)
      if (t.acc) t.acc.forEach(cls => {
        const el = one("." + cls);
        if (el) el.style.opacity = "1";
      });
    }

    /* ---------- detail ---------- */
    _mouth(state) {
      const map = { idle:"smile", greeting:"open", curious:"o", thinking:"flat",
        listening:"smile", encouraging:"open", celebrating:"open",
        confused:"wave", hinting:"smile", completion:"open",
        proud:"smile", sleepy:"o", sad:"sad", love:"open",
        /* [FASE-4] state baru — speaking mulai soft (viseme CSS menimpanya) */
        speaking:"soft", "welcome-back":"open", "lesson-start":"soft",
        "level-up":"open", milestone:"soft" };
      this._setMouth(map[state] || "smile");
    }

    /** Tepat satu bentuk fz-m-* terlihat (P13). */
    _setMouth(shape) {
      this.querySelectorAll(".fz-m").forEach(p => p.style.display = "none");
      const el = this.querySelector(".fz-m-" + shape);
      if (el) el.style.display = "";
    }

    /* [FASE-11] pintu viseme jembatan bicara (14 §1.1, impl-02 §viseme). Beat mulut
       per ~--fz-beat ditulis sebagai KELAS HOST fz-vis-* supaya aturan CSS !important
       menang atas toggle display inline _setMouth() — dan fallback rig lama
       (sp1→fz-m-o, sp2→fz-m-wave, soft→fz-m-smile) hidup di stylesheet, bukan di sini.
       shape:
         'sp1'|'sp2'|'open'|'soft' → kelas fz-vis-* (jalur beat normal);
         bentuk fz-m-* lain ('o' aksen tanda tanya dst.) → _setMouth langsung;
         null/'' → bersih: semua kelas dilepas, mulut kembali ke bentuk state kini.
       Additive murni: tanpa state, tanpa timer — irama milik jembatan bicara. */
    setViseme(shape) {
      if (!this._init) return false;
      const VIS = ["sp1", "sp2", "open", "soft"];
      VIS.forEach(s => this.classList.remove("fz-vis-" + s));
      if (!shape) { this._mouth(this._state); return true; }
      if (VIS.includes(shape)) { this.classList.add("fz-vis-" + shape); return true; }
      this._setMouth(shape);
      return true;
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
      /* [FASE-9] 17 R-5 (no-blink ketat): di bawah kurangi-gerak, loop kedip
         MATI total — bukan sekadar dinetralkan CSS backstop-nya. */
      if (matchMedia('(prefers-reduced-motion: reduce)').matches
          || document.body.classList.contains('reduce-motion')) return;
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

  /* [FASE-2/3] deskriptor rig read-only untuk tooling/gerbang (code-plan
     Fase 1: FiezelPaw.__rig). Versi moderat: pivot + nama tabel — geometri
     penuh & interpolasi antar-tuple menyusul bila dibutuhkan Wave II. */
  FiezelMascot.__rig = Object.freeze({
    pivots: Object.freeze(Object.assign({}, PIVOTS)),
    expressions: Object.freeze(Object.keys(EXPRESSIONS)),
    poses: Object.freeze(Object.keys(POSES)),
    signConvention: "literal-svg-17R3"
  });

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

  /** Konstruktor komponen (di berkas ini juga) — sumber statika __rig dkk. */
  function ctor() {
    try { return global.customElements && global.customElements.get('fiezel-mascot'); }
    catch (_) { return null; }
  }

  global.FiezelPaw = {
    /** true bila custom element benar-benar terdaftar. Dipakai pemanggil untuk
     *  memilih antara <fiezel-mascot> dan ikon paw sebagai cadangan. */
    ready: function () { return !!ctor(); },
    count: function () { return nodes().length; },
    react: function (evt, detail) { return each('react', evt, detail); },
    setState: function (name, opts) { return each('setState', name, opts); },
    lookAt: function (target) { return each('lookAt', target); },
    /* [FASE-2/3] corong pustaka ekspresi/pose — additive, tidak pernah melempar */
    applyFace: function (name) { return each('applyFace', name); },
    applyPose: function (name) { return each('applyPose', name); },
    /* [FASE-11] corong viseme jembatan bicara — SATU panggilan mengenai semua
       instance supaya mulut gelembung pembimbing dan panel Home bergerak serempak. */
    setViseme: function (shape) { return each('setViseme', shape); },
    /** [FASE-11] state instance pertama yang hidup — jembatan memakainya untuk tahu
     *  apakah 'speaking' sempat direbut selebrasi P4 (impl-05 §prioritas). */
    currentState: function () {
      var list = nodes();
      for (var i = 0; i < list.length; i++) {
        try { if (list[i] && typeof list[i].state === 'string') return list[i].state; } catch (_) { /* instance rusak dilewati */ }
      }
      return '';
    },
    /** Deskriptor rig read-only (pivot + nama tabel); null sebelum define. */
    get __rig() { var C = ctor(); return (C && C.__rig) || null; },
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
