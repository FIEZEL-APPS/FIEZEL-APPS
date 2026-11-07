/**
 * FiezelMochi - True 3D Volumetric Viscoelastic Jelly Mascot Engine
 * Built with Three.js (Offline Local Module)
 *
 * Features:
 * - Authentic 3D Marshmallow Daifuku Cushion Geometry (G2 smooth superellipsoid with weighted base)
 * - PBR Matte Velvet Clay Material with Dynamic Ambient Underglow & Subsurface Rim
 * - Disney 12 Principles Animation: Multi-Harmonic Breathing, 90° Phase Inertia Squash & Stretch
 * - Damped Harmonic Viscoelastic Jiggle & Surface Wobble on interaction
 * - 3D Crisp Expressive Facial Features (Dots with natural blink, Wink, Happy, Heart Eyes with pulse, Sleepy)
 * - Soft Rosy Blurred Cheek Blushes
 * - Dynamic 3D Stardust Orbit with Glowing Satellite Moon
 * - 3D Floating Notification Badges with Independent Spring Lag
 * - Modular Bongkar-Pasang Architecture for PWA Fiezel
 */
import * as THREE from './three.module.js';

// Universal HD Render Protocol (m025-645):
// Previously, aggressive mobile budget throttling (antialias=false, DPR capped at 1.5, 512px skin,
// 56x42 low-poly mesh) degraded Mochi into a blurry, jagged, "burik" appearance on modern phones.
// Modern mobile GPUs effortlessly render single-character PBR models at full Retina clarity.
// We now enforce universal hardware MSAA antialiasing, crisp Retina DPR (up to 2.0), full 1024px skin,
// and smooth 128x96 daifuku geometry across all mobile and desktop devices.
const IS_MOBILE = typeof window !== 'undefined' && (
  window.innerWidth <= 768 ||
  ('ontouchstart' in window) ||
  (navigator.maxTouchPoints > 0)
);
const SKIN_RES = 1024;
const BADGE_SCALE = 1;

// Real-time Formant & Viseme Analyzer (adapted from wass08/wawa-lipsync MIT)
export const VISEMES = {
  sil: 'viseme_sil',
  PP: 'viseme_PP',
  FF: 'viseme_FF',
  TH: 'viseme_TH',
  DD: 'viseme_DD',
  kk: 'viseme_kk',
  CH: 'viseme_CH',
  SS: 'viseme_SS',
  nn: 'viseme_nn',
  RR: 'viseme_RR',
  aa: 'viseme_aa',
  E: 'viseme_E',
  I: 'viseme_I',
  O: 'viseme_O',
  U: 'viseme_U'
};

const VISEMES_STATES = {
  viseme_sil: 'silence',
  viseme_PP: 'plosive',
  viseme_FF: 'fricative',
  viseme_TH: 'fricative',
  viseme_DD: 'plosive',
  viseme_kk: 'plosive',
  viseme_CH: 'fricative',
  viseme_SS: 'fricative',
  viseme_nn: 'plosive',
  viseme_RR: 'fricative',
  viseme_aa: 'vowel',
  viseme_E: 'vowel',
  viseme_I: 'vowel',
  viseme_O: 'vowel',
  viseme_U: 'vowel'
};

function avgArr(arr) {
  return arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export class WawaLipsyncAnalyzer {
  constructor({ analyser = null, sampleRate = 24000, fftSize = 2048, historySize = 10 } = {}) {
    this.analyser = null;
    this.fftSize = fftSize;
    this.historySize = historySize;
    this.sampleRate = sampleRate;
    this.binWidth = sampleRate / fftSize;
    this.dataArray = null;
    this.history = [];
    this.features = null;
    this.viseme = VISEMES.sil;
    this.state = 'silence';
    this.visemeStartTime = 0;
    this.maxVisemeDuration = 100;
    this.bands = [
      { start: 50, end: 200 },    // Band 1: Low energy
      { start: 200, end: 400 },   // Band 2: F1 lower
      { start: 400, end: 800 },   // Band 3: F1 mid
      { start: 800, end: 1500 },  // Band 4: F2 front
      { start: 1500, end: 2500 }, // Band 5: F2/F3
      { start: 2500, end: 4000 }, // Band 6: Fricatives
      { start: 4000, end: 8000 }  // Band 7: High fricatives
    ];
    if (analyser) this.setAnalyser(analyser, sampleRate);
  }

  setAnalyser(analyser, sampleRate) {
    this.analyser = analyser || null;
    if (!this.analyser) {
      this.dataArray = null;
      this.viseme = VISEMES.sil;
      this.state = 'silence';
      this.history = [];
      return;
    }
    this.fftSize = this.analyser.fftSize || 2048;
    this.sampleRate = sampleRate || (this.analyser.context && this.analyser.context.sampleRate) || 24000;
    this.binWidth = this.sampleRate / this.fftSize;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.history = [];
  }

  attachAnalyser(analyser, sampleRate) {
    this.setAnalyser(analyser, sampleRate);
  }

  detachAnalyser() {
    this.setAnalyser(null);
  }

  extractFeatures() {
    if (!this.analyser || !this.dataArray) return null;
    try {
      this.analyser.getByteFrequencyData(this.dataArray);
    } catch (_) {
      return null;
    }

    const bandEnergies = this.bands.map(({ start, end }) => {
      const startBin = Math.max(0, Math.round(start / this.binWidth));
      const endBin = Math.min(Math.round(end / this.binWidth), this.dataArray.length - 1);
      if (endBin <= startBin) return 0;
      let sum = 0;
      for (let i = startBin; i < endBin; i++) sum += this.dataArray[i];
      return (sum / (endBin - startBin)) / 255;
    });

    let sumAmplitude = 0;
    let weightedSum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const freq = i * this.binWidth;
      const amp = this.dataArray[i] / 255;
      sumAmplitude += amp;
      weightedSum += freq * amp;
    }
    const centroid = sumAmplitude > 0 ? weightedSum / sumAmplitude : 0;
    const volume = avgArr(bandEnergies);
    const deltaBands = bandEnergies.map((energy, idx) => {
      if (this.history.length < 2) return 0;
      return energy - this.history[this.history.length - 2].bands[idx];
    });

    const features = { bands: bandEnergies, deltaBands, volume, centroid };
    if (sumAmplitude > 0) {
      this.history.push(features);
      if (this.history.length > this.historySize) this.history.shift();
    }
    return features;
  }

  getAveragedFeatures() {
    const len = this.history.length || 1;
    const sum = { volume: 0, centroid: 0, bands: Array(this.bands.length).fill(0) };
    for (const f of this.history) {
      sum.volume += f.volume;
      sum.centroid += f.centroid;
      f.bands.forEach((b, i) => { sum.bands[i] += b; });
    }
    const bands = sum.bands.map((b) => b / len);
    return { volume: sum.volume / len, centroid: sum.centroid / len, bands, deltaBands: bands };
  }

  computeVisemeScores(current, avg, dVolume, dCentroid) {
    const scores = {
      viseme_sil: 0, viseme_PP: 0, viseme_FF: 0, viseme_TH: 0, viseme_DD: 0,
      viseme_kk: 0, viseme_CH: 0, viseme_SS: 0, viseme_nn: 0, viseme_RR: 0,
      viseme_aa: 0, viseme_E: 0, viseme_I: 0, viseme_O: 0, viseme_U: 0
    };
    const b7 = current.bands[6];

    if (avg.volume < 0.06 && current.volume < 0.06) {
      scores.viseme_sil = 1.0;
    }

    Object.entries(VISEMES_STATES).forEach(([v, st]) => {
      if (st === 'plosive') {
        if (dVolume < 0.01) scores[v] -= 0.5;
        if (avg.volume < 0.2) scores[v] += 0.2;
        if (dCentroid > 1000) scores[v] += 0.2;
      }
    });

    if (current.centroid > 1000 && current.centroid < 8000) {
      if (current.centroid > 7000) scores.viseme_DD += 0.6;
      else if (current.centroid > 5000) scores.viseme_kk += 0.6;
      else if (current.centroid > 4000) {
        scores.viseme_PP += 1.0;
        if (b7 > 0.25 && current.centroid < 6000) scores.viseme_DD += 1.4;
      } else scores.viseme_nn += 0.6;
    }

    if (dCentroid > 1000 && current.centroid > 6000 && avg.centroid > 5000) {
      if (current.bands[6] > 0.4 && avg.bands[6] > 0.3) scores.viseme_FF = 0.7;
    }

    if (avg.volume > 0.05 && avg.centroid < 6000 && current.centroid < 6000) {
      const [b1, b2, b3, b4, b5] = avg.bands;
      const gapB1B2 = Math.abs(b1 - b2);
      const maxGapB2B3B4 = Math.max(Math.abs(b2 - b3), Math.abs(b2 - b4), Math.abs(b3 - b4));
      if (b3 > 0.07 || b4 > 0.07) {
        if (b4 > b3) scores.viseme_aa = 0.8 + (b3 > b2 ? 0.2 : 0);
        if (b3 > b2 && b3 > b4) scores.viseme_I = 0.7;
        if (gapB1B2 < 0.25) scores.viseme_U = 0.7;
        if (maxGapB2B3B4 < 0.25) scores.viseme_O = 0.9;
        if (b2 > b3 && b3 > b4) scores.viseme_E = 1.0;
        if (b3 < 0.2 && b4 > 0.3) scores.viseme_I = 0.7;
        if (b3 > 0.25 && b5 > 0.25) scores.viseme_O = 0.7;
        if (b3 < 0.15 && b5 < 0.15) scores.viseme_U = 0.7;
      }
    }
    return scores;
  }

  processAudio() {
    const feat = this.extractFeatures();
    this.features = feat;
    if (!feat || feat.volume < 0.025) {
      this.state = 'silence';
      this.viseme = VISEMES.sil;
      return this.viseme;
    }
    const current = this.history[this.history.length - 1] || feat;
    const avg = this.getAveragedFeatures();
    const scores = this.computeVisemeScores(current, avg, current.volume - avg.volume, current.centroid - avg.centroid);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dur = now - this.visemeStartTime;
    if (this.viseme && scores[this.viseme] != null) {
      let boost = 1.0;
      if (dur <= 100) boost = 1.3;
      else boost = Math.max(0.5, 1.0 - (dur - this.maxVisemeDuration) / 1000);
      scores[this.viseme] *= boost;
    }
    let maxScore = -Infinity;
    let top = VISEMES.sil;
    for (const k in scores) {
      if (scores[k] > maxScore) { maxScore = scores[k]; top = k; }
    }
    if (top !== this.viseme) this.visemeStartTime = now;
    this.viseme = top;
    this.state = VISEMES_STATES[top] || 'silence';
    return this.viseme;
  }
}

export class FiezelMochi {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('FiezelMochi: Container element not found');

    // Voice Companion Strict 2-Motion Mode (Kawan Bicara & Mochi SOS):
    // Only permits (1) Open-eyes Idle ('dots' + hidden hands) and (2) Open-eyes Greeting ('dots' + 'wave' both hands out).
    this.voiceCompanionStrictMode = !!options.voiceCompanionStrictMode;

    // State Configuration
    this.mood = this.voiceCompanionStrictMode ? 'dots' : (options.mood || 'dots'); // 'dots', 'wink', 'happy', 'hearts', 'sleepy', 'pout'
    this.badge = options.badge || null;             // null, 'chat_purple', 'chat_blue', 'alert', 'online'
    this.fx = this.voiceCompanionStrictMode ? null : (options.fx || null); // null, 'orbit', 'stars', 'hearts'
    this.aura = options.aura || null;               // null, 'purple', 'blue', 'amber', 'green', 'pink'
    this.currentAccessory = options.accessory || null; // null, 'headset', 'glasses', 'pencil'
    this.isTalking = false;
    this.talkDuration = 0;
    this.talkTimer = 0;
    this.isThinking = false;
    this.wawaLipsync = new WawaLipsyncAnalyzer();
    this.showHands = options.showHands ?? true;
    this.showEars = options.showEars ?? true;
    this.showTail = options.showTail ?? false;

    // Dynamic Autonomous Idle Expressions
    this.autoExpressions = this.voiceCompanionStrictMode ? false : (options.autoExpressions !== false);
    this.expressionTimer = 0;
    this.nextExpression = 3.2 + Math.random() * 2.0;
    this.holdMoodUntil = 0;
    this.idleMoods = ['dots', 'wink', 'happy', 'dots', 'hearts'];
    this.idleMoodIndex = 0;

    this.width = options.width || 380;
    this.height = options.height || 360;

    // Physics & Motion State
    this.time = 0;
    this.targetRot = { x: 0, y: 0 };
    this.currentRot = { x: 0, y: 0 };
    this.floatPos = { y: 0, prevY: 0, velY: 0 };

    // Viscoelastic Damped Spring Physics (Squash & Stretch & Jiggle)
    this.squish = {
      x: 1, y: 1, z: 1,
      targetX: 1, targetY: 1, targetZ: 1,
      velX: 0, velY: 0, velZ: 0,
      jiggleTimer: 0,
      jiggleAmp: 0
    };

    // Badge spring lag
    this.badgeLag = { y: 0, velY: 0 };

    // 2-Stage Elastic Damped Spring Rig for Ears (Base Joint & Cartilage Tip)
    this.earPhys = {
      L: { rx: 0, ry: 0, rz: Math.PI * 0.15, vx: 0, vy: 0, vz: 0, tip: 0, tipVel: 0 },
      R: { rx: 0, ry: 0, rz: -Math.PI * 0.15, vx: 0, vy: 0, vz: 0, tip: 0, tipVel: 0 }
    };
    this.earFlex = { l: 0, r: 0, velL: 0, velR: 0 };

    // Dynamic Retractable Hands State (Hidden in idle, emerges on user interaction)
    this.handState = 'hidden';      // 'hidden', 'cheer', 'sad', 'wave'
    this.handProgress = 0.0;       // 0.0 (tucked inside) to 1.0 (active)
    this.handTimer = 0.0;          // Auto-retract countdown timer

    // Dynamic ear wiggle burst on question transitions or interactions
    this.earWiggleTimer = 0.0;
    this.earWiggleDuration = 0.65;
    this.earWiggleIntensity = 1.0;

    // Eye blinking
    this.blinkTimer = 0;
    this.nextBlink = 2.8;
    this.blinkFactor = 0; // 0 to 1

    // Continuous 3D Skin & Storyboard Spring Morph State (GoPrep Damped Spring)
    this.skinBlend = {
      takut: 0, takutVel: 0,
      marah: 0, marahVel: 0,
      furious: 0, furiousVel: 0,
      pout: 0, poutVel: 0
    };
    this.morphRig = {
      hornScale: 0, hornVel: 0,
      earScale: 1, earVel: 0,
      steamScale: 0, steamVel: 0,
      empatiPawScale: 0, empatiPawVel: 0
    };
    // Continuous 3D Parametric Mouth & Prosody Rig (Viscoelastic Flesh Physics, Zero Frame Swapping)
    this.mouthRig = {
      open: 0.0, openVel: 0.0,
      width: 1.0, widthVel: 0.0,
      smile: 0.28, smileVel: 0.0,
      roundness: 0.0, roundnessVel: 0.0,
      pucker: 0.0, puckerVel: 0.0,
      bilabial: 0.0, bilabialVel: 0.0,
      tongueLift: 0.0, tongueLiftVel: 0.0,
      tongueCurl: 0.0, tongueCurlVel: 0.0,
      lipTuck: 0.0, lipTuckVel: 0.0,
      presence: 0.0, presenceVel: 0.0,
      headPitch: 0.0, headPitchVel: 0.0,
      headRoll: 0.0, headRollVel: 0.0,
      headYaw: 0.0, headYawVel: 0.0,
      audioEnv: 0.0,
      holdViseme: null,
      holdTimer: 0.0
    };
    // Active Phonetic / Vowel Viseme State (Supports 12 Phonetic + 5 AIUEO x 3 Intensities, 100% Toothless)
    this.activeViseme = options.viseme || null;
    this.visemeIntensity = options.visemeIntensity ?? 1.0;

    this.initScene();
    this.createMochiMesh();
    this.createFoxEars();
    this.createDemonHorns();
    this.createEarSteam();
    this.createEmpatiPaws();
    this.createCatTail();
    this.createFaceObjects();
    this.createShadow();
    this.createOrbit();
    this.createBadge();
    this.createAccessories();
    this.createParticles();
    this.setupLighting();
    this.bindEvents();

    // Sync initial mood targets immediately so initial frame renders accurately
    this.syncMoodTargets(true);

    // Apply initial aura, accessory & visibility
    if (this.aura) this.setAura(this.aura);
    if (this.currentAccessory) this.setAccessory(this.currentAccessory);
    this.start();
  }

  initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.08, 5.38); // Balanced studio framing giving generous breathing room for floating Rayman/Mochi paws


    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // Universal hardware MSAA: silky-smooth silhouette on mobile & desktop
      alpha: true,
      preserveDrawingBuffer: false, // Set to false to eliminate mobile GPU stall due to ReadPixels
      powerPreference: 'high-performance'
    });
    // Tone mapping is strictly NoToneMapping to banish dark/black edge fringes along transparent alpha borders!
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0)); // Crystal clear Retina DPR (capped at 2.0 for 60fps thermal comfort)

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.objectFit = 'contain';
    this.renderer.domElement.style.pointerEvents = 'auto';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.userSelect = 'none';
    this.renderer.domElement.style.webkitUserSelect = 'none';
    this.renderer.domElement.style.cursor = 'grab';

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  updateSize(width, height) {
    if (!width || !height || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  setupLighting() {
    // Calibrated Studio Daifuku Lighting: warm creamy milk-white Daifuku base with zero plastic chin glare,
    // while preserving 3D form contour, rosy cheek blushes, icy-blue Takut dread, strawberry-pink Marah flush,
    // and deep charcoal-crimson Sangat Marah demon skin!
    this.ambientLight = new THREE.AmbientLight(0xFFFDFB, 1.92);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light: Pure warm white sky, soft rose-cream ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xF5DCE8, 0.72);
    this.scene.add(this.hemiLight);

    // 3. Key directional light from top-front-right (sculpts 3D curvature softly without harsh glare)
    this.keyLight = new THREE.DirectionalLight(0xFFFDF9, 0.46);
    this.keyLight.position.set(1.8, 3.0, 4.2);
    this.scene.add(this.keyLight);

    // 4. Gentle front-left fill light (zero mirror hotspots)
    this.glintLight = new THREE.DirectionalLight(0xFFF8FB, 0.14);
    this.glintLight.position.set(-1.6, 2.2, 3.8);
    this.scene.add(this.glintLight);

    // 5. Soft upward bounce light (low intensity to prevent V-glare on lower chin)
    this.bounceLight = new THREE.DirectionalLight(0xFFEFF5, 0.10);
    this.bounceLight.position.set(0, -2.4, 2.2);
    this.scene.add(this.bounceLight);

    // 6. Subtle cool fill light from side
    this.fillLight = new THREE.DirectionalLight(0xF8FAFC, 0.16);
    this.fillLight.position.set(-3.2, 0.6, 2.6);
    this.scene.add(this.fillLight);

    // 7. Soft rosy rim light from back-top (outlines ears, horns & crown)
    this.rimLight = new THREE.DirectionalLight(0xFFE0EC, 0.38);
    this.rimLight.position.set(0, 3.6, -2.8);
    this.scene.add(this.rimLight);

    // 8. Dynamic Colored Aura Point Light (bounce underglow onto belly)
    this.auraLight = new THREE.PointLight(0x9D65FF, 0, 9);
    this.auraLight.position.set(0, -1.1, 0.2);
    this.scene.add(this.auraLight);
  }

  /**
   * Builds an authentic organic Daifuku / Mochi Cushion Mesh.
   * G2 continuous curvature with chubby cheeks and weighted bottom.
   * Ultra-dense 128x96 subdivision for mathematically silky smooth antialiased contours.
   */
  createMochiMesh() {
    const geo = new THREE.SphereGeometry(1.22, 128, 96);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Base proportions: Width 1.34, Height 1.06, Depth 0.90 (Natural Canonical Daifuku)
      x *= 1.32;
      y *= 1.05;
      z *= 0.89;

      // Organic power curvature (G2 continuous curve, eliminates flat tabletop)
      const signX = Math.sign(x);
      const signY = Math.sign(y);
      const signZ = Math.sign(z);

      const ax = Math.pow(Math.abs(x / 1.32), 0.68) * 1.32 * signX;
      const ay = Math.pow(Math.abs(y / 1.05), 0.74) * 1.05 * signY;
      const az = Math.pow(Math.abs(z / 0.89), 0.74) * 0.89 * signZ;

      x = x * 0.54 + ax * 0.46;
      y = y * 0.58 + ay * 0.42;
      z = z * 0.58 + az * 0.42;

      // Gravitational sagging at bottom
      if (y < 0.25) {
        const factor = (0.25 - y) * 0.13;
        x *= (1.0 + factor);
        z *= (1.0 + factor * 0.6);
      }

      // PHYSICAL 3D CHUBBY CHEEK CONTOUR (Bulges outward on X & Z at cheek level)
      // Smooth continuous outward displacement with zero seam discontinuity
      const chDistL = Math.hypot(x - (-0.56), y - (-0.10));
      const chDistR = Math.hypot(x - (0.56), y - (-0.10));
      const chDist = Math.min(chDistL, chDistR);
      if (z > 0.05 && chDist < 0.68) {
        const chBulge = Math.cos((chDist / 0.68) * Math.PI * 0.5) ** 2 * 0.22;
        z += chBulge;
        const xDisplace = Math.min(1.0, Math.abs(x) / 0.40);
        x += (x >= 0 ? 1 : -1) * xDisplace * chBulge * 0.35;
      }

      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();

    // AUTHENTIC GLOSSY DAIFUKU MOCHI WITH AIRBRUSHED ROSY CHEEK CONTOURS
    // Paints soft, delectable rosy blushes directly onto the daifuku rice skin texture
    this.skinCanvas = document.createElement('canvas');
    this.skinCanvas.width = SKIN_RES;
    this.skinCanvas.height = SKIN_RES;
    this.sCtx = this.skinCanvas.getContext('2d');
    this.mochiSkinTexture = new THREE.CanvasTexture(this.skinCanvas);

    this.updateSkinBlush();

    // Mouth-watering velvety Daifuku rice-dough skin with soft peach-rose edge sheen (zero plastic glare!)
    this.mochiMaterial = new THREE.MeshPhysicalMaterial({
      map: this.mochiSkinTexture,
      color: 0xFFFFFF,
      roughness: 0.62,
      metalness: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.50,
      sheen: 0.55,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0xFFD6E2), // Soft rosy peach sheen along silhouette: pops on white & cream!
      ior: 1.42
    });

    this.mochiMesh = new THREE.Mesh(geo, this.mochiMaterial);

    this.mochiGroup = new THREE.Group();
    this.mochiGroup.position.x = 0.0; // Centered
    this.mochiGroup.add(this.mochiMesh);
    this.scene.add(this.mochiGroup);

    // Detached FLOATING cat paws (Rayman-style) - Articulated & Morphable 3D Expressive Hands!
    this.handMat = new THREE.MeshStandardMaterial({
      color: 0xFFFDF9,
      roughness: 0.32,
      metalness: 0.02
    });
    const handMat = this.handMat;

    // Soft strawberry-pink glossy paw pad & knuckle accent material
    this.beanMat = new THREE.MeshStandardMaterial({
      color: 0xFF7696,
      roughness: 0.22,
      metalness: 0.04
    });
    const beanMat = this.beanMat;

    // Subtle rosy-taupe contour rim material so white paws stand out crisply on white backgrounds
    this.pawContourMat = new THREE.MeshBasicMaterial({
      color: 0xD8B4C4,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });

    // Knuckle crease material for clenched punching fists (Marah / Kesal / Tegas / Sangat Marah)
    this.knuckleCreaseMat = new THREE.MeshBasicMaterial({
      color: 0x9E3B5A,
      transparent: true,
      opacity: 0.72
    });

    // Demon claw material for 'Sangat Marah' furious fists
    this.clawMat = new THREE.MeshStandardMaterial({
      color: 0xFFF4F6,
      roughness: 0.20,
      metalness: 0.10,
      emissive: new THREE.Color(0xFF2A14),
      emissiveIntensity: 0.25
    });

    const buildPaw = (side) => {
      const paw = new THREE.Group();
      const core = new THREE.Group();
      paw.add(core);

      // =========================================================================
      // 1. OPEN PAW GROUP (Canonical Kawaii Cat Paw - Senang, Kaget, Gembira)
      // =========================================================================
      const openGroup = new THREE.Group();
      core.add(openGroup);

      // 0. Soft 3D Silhouette Rim Backing
      const rimGeo = new THREE.SphereGeometry(0.206, 24, 18);
      rimGeo.scale(1.10, 1.15, 0.42);
      const rimMesh = new THREE.Mesh(rimGeo, this.pawContourMat);
      rimMesh.position.set(0, 0, -0.05);
      openGroup.add(rimMesh);

      // 1. Chubby Kawaii Cat Paw Cushion Base
      const palmGeo = new THREE.SphereGeometry(0.19, 28, 22);
      palmGeo.scale(1.08, 1.14, 0.74);
      const palmMesh = new THREE.Mesh(palmGeo, handMat);
      openGroup.add(palmMesh);

      // 2. 4 Symmetrical Articulated Cat Toes
      const toeGeo = new THREE.SphereGeometry(0.068, 20, 16);
      const beanGeo = new THREE.SphereGeometry(0.033, 16, 12);
      const clawGeo = new THREE.ConeGeometry(0.024, 0.082, 12);
      const toeBaseConfigs = [
        { x: -0.114, y: 0.144, s: 0.94, rx: 0.04, rz: 0.28 },
        { x: -0.040, y: 0.190, s: 1.04, rx: 0.02, rz: 0.08 },
        { x:  0.040, y: 0.190, s: 1.04, rx: 0.02, rz: -0.08 },
        { x:  0.114, y: 0.144, s: 0.94, rx: 0.04, rz: -0.28 }
      ];

      const toes = toeBaseConfigs.map((t, idx) => {
        const tg = new THREE.Group();
        tg.position.set(t.x, t.y, 0.0);
        tg.rotation.set(t.rx, 0, t.rz);

        const toeMesh = new THREE.Mesh(toeGeo, handMat);
        toeMesh.scale.set(t.s, t.s * 1.18, t.s * 0.88);
        tg.add(toeMesh);

        const beanMesh = new THREE.Mesh(beanGeo, beanMat);
        beanMesh.position.set(0, 0.008, 0.092);
        beanMesh.scale.set(0.96, 1.16, 0.46);
        beanMesh.rotation.set(-0.12, 0, 0);
        tg.add(beanMesh);

        const clawMesh = new THREE.Mesh(clawGeo, this.clawMat);
        clawMesh.position.set(0, 0.082, 0.025);
        clawMesh.rotation.set(0.22, 0, 0);
        clawMesh.visible = false;
        tg.add(clawMesh);

        openGroup.add(tg);
        return { group: tg, toeMesh, beanMesh, clawMesh, base: t, idx };
      });

      // 3. Plump Heart/Oval Central Pink Paw Pad
      const padGeo = new THREE.SphereGeometry(0.076, 22, 16);
      const padMesh = new THREE.Mesh(padGeo, beanMat);
      padMesh.position.set(0, -0.025, 0.128);
      padMesh.scale.set(1.42, 1.05, 0.48);
      padMesh.rotation.set(-0.12, 0, 0);
      openGroup.add(padMesh);

      // =========================================================================
      // 2. FIST GROUP (True 3D Volumetric Fleshy Clenched Fist - Marah, Kesal, Tegas)
      // Solid continuous muscular cartoon fist with thick palm, 4 rounded clenched knuckles,
      // and locked fleshy thumb. 100% fleshy volume, zero skeletal sticks or donut holes!
      // =========================================================================
      const fistGroup = new THREE.Group();
      core.add(fistGroup);

      // 1. Plump Muscular Palm Base (full-sized cushion matching open paw mass)
      const fistPalmGeo = new THREE.SphereGeometry(0.185, 32, 24);
      fistPalmGeo.scale(1.10, 1.14, 0.84);
      const fistPalm = new THREE.Mesh(fistPalmGeo, handMat);
      fistPalm.position.set(0, -0.015, 0.01);
      fistGroup.add(fistPalm);

      // 2. 4 Proud, Contiguous Rounded Curled Knuckles across top front
      const knuckleGeo = new THREE.SphereGeometry(0.068, 24, 18);
      const knuckleConfigs = [
        { x: -0.106, y: 0.126, z: 0.072, s: 0.98 },
        { x: -0.035, y: 0.158, z: 0.094, s: 1.08 },
        { x:  0.035, y: 0.158, z: 0.094, s: 1.08 },
        { x:  0.106, y: 0.126, z: 0.072, s: 0.98 }
      ];
      const knuckles = knuckleConfigs.map((kc) => {
        const km = new THREE.Mesh(knuckleGeo, handMat);
        km.position.set(kc.x, kc.y, kc.z);
        km.scale.set(kc.s, kc.s * 1.16, kc.s * 0.96);
        fistGroup.add(km);

        // Curled phalanx muscle beneath knuckle curling into palm base
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.056, 20, 16), handMat);
        seg.position.set(kc.x, 0.048, 0.112);
        seg.scale.set(kc.s * 0.98, kc.s * 1.08, kc.s * 0.90);
        fistGroup.add(seg);

        return km;
      });

      // 3. Thick Muscular Locked Thumb wrapping across front
      const thumbMuscleGeo = new THREE.SphereGeometry(0.088, 24, 18);
      thumbMuscleGeo.scale(1.42, 0.98, 0.90);
      const thumbMesh = new THREE.Mesh(thumbMuscleGeo, handMat);
      thumbMesh.position.set(-side * 0.018, 0.014, 0.136);
      thumbMesh.rotation.set(0.08, 0, -side * 0.28);
      fistGroup.add(thumbMesh);

      const thumbKnuckleGeo = new THREE.SphereGeometry(0.062, 20, 16);
      const thumbKnuckle = new THREE.Mesh(thumbKnuckleGeo, handMat);
      thumbKnuckle.position.set(-side * 0.018, 0.014, 0.175);
      fistGroup.add(thumbKnuckle);

      const thumbBeanGeo = new THREE.SphereGeometry(0.030, 16, 12);
      thumbBeanGeo.scale(1.15, 0.82, 0.40);
      const thumbBean = new THREE.Mesh(thumbBeanGeo, beanMat);
      thumbBean.position.set(-side * 0.018, 0.014, 0.188);
      thumbBean.rotation.set(0.08, 0, -side * 0.28);
      fistGroup.add(thumbBean);

      // =========================================================================
      // 3. SCRATCH GROUP (Dedicated Head-Scratching Paw - Penasaran / Bingung)
      // Plump 4-toed Daifuku paw with soft pink beans, curled into an adorable head-scratch
      // =========================================================================
      const scratchGroup = new THREE.Group();
      core.add(scratchGroup);

      const scratchPalmGeo = new THREE.SphereGeometry(0.185, 28, 22);
      scratchPalmGeo.scale(1.06, 1.12, 0.76);
      const scratchPalm = new THREE.Mesh(scratchPalmGeo, handMat);
      scratchGroup.add(scratchPalm);

      // 4 Curled scratching cat toes with soft pink beans
      const sToeConfigs = [
        { x: -0.110, y: 0.135, z: 0.04, s: 0.94, rx: 0.38, rz: 0.26 },
        { x: -0.038, y: 0.178, z: 0.06, s: 1.04, rx: 0.44, rz: 0.08 },
        { x:  0.038, y: 0.178, z: 0.06, s: 1.04, rx: 0.44, rz: -0.08 },
        { x:  0.110, y: 0.135, z: 0.04, s: 0.94, rx: 0.38, rz: -0.26 }
      ];
      sToeConfigs.forEach((t) => {
        const tg = new THREE.Group();
        tg.position.set(t.x, t.y, t.z);
        tg.rotation.set(t.rx, 0, t.rz);

        const tm = new THREE.Mesh(toeGeo, handMat);
        tm.scale.set(t.s, t.s * 1.15, t.s * 0.88);
        tg.add(tm);

        const bm = new THREE.Mesh(beanGeo, beanMat);
        bm.position.set(0, 0.006, 0.088);
        bm.scale.set(0.96, 1.14, 0.46);
        tg.add(bm);

        scratchGroup.add(tg);
      });

      const sPadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.074, 22, 16), beanMat);
      sPadMesh.position.set(0, -0.024, 0.124);
      sPadMesh.scale.set(1.40, 1.04, 0.46);
      scratchGroup.add(sPadMesh);

      // =========================================================================
      // 4. POINT GROUP (Thinking & Sassy Point Paw - Sinis, Berpikir)
      // Plump fleshy palm base with curled fingers and rounded index finger
      // =========================================================================
      const pointGroup = new THREE.Group();
      core.add(pointGroup);

      const pointPalmGeo = new THREE.SphereGeometry(0.185, 28, 22);
      pointPalmGeo.scale(1.08, 1.12, 0.78);
      const pointPalm = new THREE.Mesh(pointPalmGeo, handMat);
      pointGroup.add(pointPalm);

      // Curled finger cushions on palm
      const curledConfigs = [
        { x: -0.102, y: 0.105, z: 0.065, s: 0.92 },
        { x: -0.035, y: 0.135, z: 0.080, s: 1.02 },
        { x: -0.035, y: 0.060, z: 0.095, s: 0.92 }
      ];
      curledConfigs.forEach(cc => {
        const cm = new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 16), handMat);
        cm.position.set(side * cc.x, cc.y, cc.z);
        cm.scale.set(cc.s, cc.s * 1.15, cc.s * 0.92);
        pointGroup.add(cm);
      });

      // Fleshy thinking/pointing finger
      const indexGroup = new THREE.Group();
      indexGroup.position.set(side * 0.065, 0.095, 0.065);
      indexGroup.rotation.set(-0.12, 0, -side * 0.22);

      const baseKnuckle = new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 16), handMat);
      baseKnuckle.scale.set(1.0, 1.20, 1.0);
      indexGroup.add(baseKnuckle);

      const phalanx = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 16), handMat);
      phalanx.position.set(0, 0.090, 0);
      phalanx.scale.set(0.96, 1.25, 0.92);
      indexGroup.add(phalanx);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 16), handMat);
      tip.position.set(0, 0.165, 0);
      indexGroup.add(tip);

      const tipBean = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), beanMat);
      tipBean.scale.set(0.95, 1.18, 0.45);
      tipBean.position.set(0, 0.165, 0.046);
      indexGroup.add(tipBean);

      pointGroup.add(indexGroup);

      const pThumbMesh = new THREE.Mesh(thumbMuscleGeo, handMat);
      pThumbMesh.position.set(-side * 0.025, 0.015, 0.122);
      pThumbMesh.rotation.set(0.10, 0, -side * 0.28);
      pointGroup.add(pThumbMesh);

      // Initial state: openGroup visible, others hidden
      openGroup.visible = true;
      fistGroup.visible = false;
      scratchGroup.visible = false;
      pointGroup.visible = false;

      paw.userData = {
        side, core,
        openGroup, fistGroup, scratchGroup, pointGroup,
        palmMesh, rimMesh, toes, padMesh,
        fistPalm, knuckles, thumbMesh, thumbBean,
        shapeMode: 'open'
      };
      paw.scale.set(0.001, 0.001, 0.001);
      paw.visible = false;
      return paw;
    };

    this.handL = buildPaw(-1);
    this.handR = buildPaw(1);
    this.handL.position.set(-1.10, -0.22, 0.20);
    this.handR.position.set(1.10, -0.22, 0.20);
    this.mochiGroup.add(this.handL);
    this.mochiGroup.add(this.handR);
  }

  /**
   * Airbrushes 3D studio Daifuku form shading + rosy cheek contours directly onto the skin texture.
   * Smoothly blends across 4 body states:
   *  - Normal Creamy White Daifuku (warm alabaster center, soft rose-taupe rim/underbelly, pink blushes)
   *  - Takut (pale icy-blue dread shadow across the upper crown/forehead)
   *  - Marah Stage 2 (flushed strawberry-pink to crimson-rose body & ears)
   *  - Sangat Marah Stage 3 (velvety dark espresso-charcoal crown + glowing crimson-ruby cheeks/belly)
   */
  updateSkinBlush() {
    if (!this.sCtx || !this.skinCanvas) return;
    const sCtx = this.sCtx;
    sCtx.setTransform(SKIN_RES / 1024, 0, 0, SKIN_RES / 1024, 0, 0);

    const sb = this.skinBlend || { takut: 0, marah: 0, furious: 0, pout: 0 };
    const wTakut = Math.max(0, Math.min(1, sb.takut || 0));
    const wMarah = Math.max(0, Math.min(1, sb.marah || 0));
    const wFurious = Math.max(0, Math.min(1, sb.furious || 0));
    const isPout = (this.mood === 'pout' || this.mood === 'sleepy' || (sb.pout || 0) > 0.4);

    // 1. Base Creamy White Daifuku with warm milk-white center & soft rose-ivory rim (zero greyness!)
    const bgGrad = sCtx.createLinearGradient(0, 0, 0, 1024);
    bgGrad.addColorStop(0.00, '#FFFFFF');
    bgGrad.addColorStop(0.45, '#FFFDFB');
    bgGrad.addColorStop(0.75, '#FDF3F7');
    bgGrad.addColorStop(0.92, '#F8E6EE');
    bgGrad.addColorStop(1.00, '#F1DAE5');
    sCtx.fillStyle = bgGrad;
    sCtx.fillRect(0, 0, 1024, 1024);

    // Soft 3D radial flank shading around front face (u = 0.25 -> cx = 256, v = 0.52 -> cy = 490)
    sCtx.save();
    sCtx.translate(256, 485);
    sCtx.scale(1.0, 1.45);
    const faceDome = sCtx.createRadialGradient(0, -20, 10, 0, 0, 210);
    faceDome.addColorStop(0.00, 'rgba(255, 255, 255, 0.96)');
    faceDome.addColorStop(0.62, 'rgba(255, 253, 252, 0.72)');
    faceDome.addColorStop(0.86, 'rgba(248, 228, 236, 0.22)');
    faceDome.addColorStop(1.00, 'rgba(240, 214, 225, 0.36)');
    sCtx.fillStyle = faceDome;
    sCtx.beginPath();
    sCtx.arc(0, 0, 210, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.restore();

    const drawCheekBlush = (u, v, rX, rY, mode) => {
      const cx = u * 1024;
      const cy = (1 - v) * 1024;
      sCtx.save();
      sCtx.translate(cx, cy);
      sCtx.scale(1.0, rY / rX);
      const grad = sCtx.createRadialGradient(0, 0, 0, 0, 0, rX);
      if (mode === 'pout') {
        grad.addColorStop(0.00, 'rgba(255, 36, 86, 0.94)');
        grad.addColorStop(0.32, 'rgba(255, 72, 118, 0.82)');
        grad.addColorStop(0.65, 'rgba(255, 138, 172, 0.42)');
        grad.addColorStop(1.00, 'rgba(255, 245, 248, 0)');
      } else if (mode === 'marah') {
        grad.addColorStop(0.00, 'rgba(220, 18, 64, 0.92)');
        grad.addColorStop(0.45, 'rgba(240, 48, 92, 0.68)');
        grad.addColorStop(0.80, 'rgba(255, 110, 145, 0.28)');
        grad.addColorStop(1.00, 'rgba(255, 180, 200, 0)');
      } else if (mode === 'furious') {
        grad.addColorStop(0.00, 'rgba(235, 28, 36, 0.95)');
        grad.addColorStop(0.45, 'rgba(195, 20, 28, 0.72)');
        grad.addColorStop(0.82, 'rgba(140, 14, 20, 0.30)');
        grad.addColorStop(1.00, 'rgba(70, 12, 16, 0)');
      } else {
        grad.addColorStop(0.00, 'rgba(255, 68, 120, 0.90)');
        grad.addColorStop(0.38, 'rgba(255, 112, 154, 0.72)');
        grad.addColorStop(0.72, 'rgba(255, 168, 198, 0.32)');
        grad.addColorStop(1.00, 'rgba(255, 250, 248, 0)');
      }
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(0, 0, rX, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();
    };

    // Normal / Pout Rosy Cheek Blushes (aligned with 3D cheek bulges at u = 0.204 & 0.296, v = 0.468)
    const baseBlushAlpha = Math.max(0, 1.0 - wFurious * 0.9);
    if (baseBlushAlpha > 0.01) {
      sCtx.save();
      sCtx.globalAlpha = baseBlushAlpha;
      if (isPout) {
        drawCheekBlush(0.204, 0.468, 44, 33, 'pout');
        drawCheekBlush(0.296, 0.468, 44, 33, 'pout');
      } else {
        drawCheekBlush(0.204, 0.468, 39, 29, 'normal');
        drawCheekBlush(0.296, 0.468, 39, 29, 'normal');
      }
      sCtx.restore();
    }

    // 2. Takut Overlay: Pale Icy-Blue Dread Shadow across Upper Forehead & Crown
    if (wTakut > 0.005) {
      sCtx.save();
      sCtx.globalAlpha = wTakut;
      const dreadGrad = sCtx.createLinearGradient(0, 0, 0, 510);
      dreadGrad.addColorStop(0.00, 'rgba(138, 192, 238, 0.88)');
      dreadGrad.addColorStop(0.45, 'rgba(168, 212, 248, 0.65)');
      dreadGrad.addColorStop(0.78, 'rgba(205, 232, 255, 0.28)');
      dreadGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0)');
      sCtx.fillStyle = dreadGrad;
      sCtx.fillRect(0, 0, 1024, 510);
      sCtx.restore();
    }

    // 3. Marah Stage 2 Overlay: Flushed Strawberry-Pink / Crimson-Rose Body & Ears
    if (wMarah > 0.005) {
      sCtx.save();
      sCtx.globalAlpha = wMarah;
      const marahGrad = sCtx.createLinearGradient(0, 0, 0, 1024);
      marahGrad.addColorStop(0.00, '#FFC4D6');
      marahGrad.addColorStop(0.32, '#FF9EBA');
      marahGrad.addColorStop(0.62, '#FF6B92');
      marahGrad.addColorStop(0.86, '#E83868');
      marahGrad.addColorStop(1.00, '#C91E4A');
      sCtx.fillStyle = marahGrad;
      sCtx.fillRect(0, 0, 1024, 1024);

      // Soft lighter rose-cream center forehead glow matching Row 3 'Marah'
      sCtx.save();
      sCtx.translate(256, 460);
      sCtx.scale(1.0, 1.25);
      const centerGlow = sCtx.createRadialGradient(0, -25, 8, 0, 0, 145);
      centerGlow.addColorStop(0.00, 'rgba(255, 236, 242, 0.92)');
      centerGlow.addColorStop(0.55, 'rgba(255, 195, 212, 0.55)');
      centerGlow.addColorStop(1.00, 'rgba(255, 120, 155, 0)');
      sCtx.fillStyle = centerGlow;
      sCtx.beginPath();
      sCtx.arc(0, 0, 145, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();

      drawCheekBlush(0.202, 0.465, 44, 34, 'marah');
      drawCheekBlush(0.298, 0.465, 44, 34, 'marah');
      sCtx.restore();
    }

    // 4. Sangat Marah Stage 3 Overlay: Deep Velvety Espresso-Charcoal Crown + Glowing Crimson-Ruby Belly/Cheeks
    if (wFurious > 0.005) {
      sCtx.save();
      sCtx.globalAlpha = wFurious;
      const furGrad = sCtx.createLinearGradient(0, 0, 0, 1024);
      furGrad.addColorStop(0.00, '#040102');
      furGrad.addColorStop(0.36, '#070203');
      furGrad.addColorStop(0.54, '#110406');
      furGrad.addColorStop(0.68, '#3B070C');
      furGrad.addColorStop(0.84, '#A81018');
      furGrad.addColorStop(1.00, '#FF3218');
      sCtx.fillStyle = furGrad;
      sCtx.fillRect(0, 0, 1024, 1024);

      // Dark charcoal V-forehead shadow descending between the eyes so scarlet eyes pop
      sCtx.save();
      sCtx.translate(256, 430);
      const browShadow = sCtx.createRadialGradient(0, 0, 8, 0, 0, 125);
      browShadow.addColorStop(0.00, 'rgba(4, 1, 2, 0.98)');
      browShadow.addColorStop(0.65, 'rgba(8, 2, 4, 0.85)');
      browShadow.addColorStop(1.00, 'rgba(18, 4, 7, 0)');
      sCtx.fillStyle = browShadow;
      sCtx.beginPath();
      sCtx.arc(0, 0, 125, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();

      // Fiery ruby-crimson subsurface glow on left & right cheeks and lower chin
      drawCheekBlush(0.195, 0.465, 54, 42, 'furious');
      drawCheekBlush(0.305, 0.465, 54, 42, 'furious');
      sCtx.restore();
    }

    if (this.mochiMaterial && this.mochiMaterial.sheenColor) {
      if (wFurious > 0.5) {
        this.mochiMaterial.color.setHex(0x421218);
        this.mochiMaterial.roughness = 0.88;
        this.mochiMaterial.sheen = 0.14;
        this.mochiMaterial.sheenColor.setHex(0xB81820);
      } else if (wMarah > 0.5) {
        this.mochiMaterial.color.setHex(0xFFFFFF);
        this.mochiMaterial.roughness = 0.62;
        this.mochiMaterial.sheen = 0.48;
        this.mochiMaterial.sheenColor.setHex(0xFF8AA8);
      } else {
        this.mochiMaterial.color.setHex(0xFFFFFF);
        this.mochiMaterial.roughness = 0.62;
        this.mochiMaterial.sheen = 0.55;
        this.mochiMaterial.sheenColor.setHex(0xFFD2DE);
      }
    }

    // Synchronize 3D Expressive Hand Materials with Body Mood State (Normal / Takut / Marah / Sangat Marah)
    if (this.handMat && this.beanMat) {
      if (wFurious > 0.5) {
        this.handMat.color.setHex(0x1C0508);
        if (this.handMat.sheenColor) this.handMat.sheenColor.setHex(0xFF2E18);
        this.beanMat.color.setHex(0xFF3818);
        if (this.pawContourMat) {
          this.pawContourMat.color.setHex(0xFF3B14);
          this.pawContourMat.opacity = 0.68;
        }
        if (this.knuckleCreaseMat) this.knuckleCreaseMat.color.setHex(0xFF4518);
      } else if (wMarah > 0.5) {
        this.handMat.color.setHex(0xFF85A6);
        if (this.handMat.sheenColor) this.handMat.sheenColor.setHex(0xFFC2D4);
        this.beanMat.color.setHex(0xD91E54);
        if (this.pawContourMat) {
          this.pawContourMat.color.setHex(0xC91E4A);
          this.pawContourMat.opacity = 0.52;
        }
        if (this.knuckleCreaseMat) this.knuckleCreaseMat.color.setHex(0x8C1034);
      } else if (wTakut > 0.5) {
        this.handMat.color.setHex(0xF2F8FF);
        if (this.handMat.sheenColor) this.handMat.sheenColor.setHex(0xC8E4FF);
        this.beanMat.color.setHex(0xF082A4);
        if (this.pawContourMat) {
          this.pawContourMat.color.setHex(0x9BBAD8);
          this.pawContourMat.opacity = 0.45;
        }
        if (this.knuckleCreaseMat) this.knuckleCreaseMat.color.setHex(0x829AB8);
      } else {
        this.handMat.color.setHex(0xFFFDF9);
        if (this.handMat.sheenColor) this.handMat.sheenColor.setHex(0xFFE8EE);
        this.beanMat.color.setHex(0xFF7696);
        if (this.pawContourMat) {
          this.pawContourMat.color.setHex(0xD8B4C4);
          this.pawContourMat.opacity = 0.42;
        }
        if (this.knuckleCreaseMat) this.knuckleCreaseMat.color.setHex(0xA64B68);
      }
    }

    if (this.updateEarTextures) {
      this.updateEarTextures();
    }

    if (this.mochiSkinTexture) {
      this.mochiSkinTexture.needsUpdate = true;
    }
  }

  /**
   * Updates the 512x512 High-Resolution 2.5D Sculpted Ear Canvas Textures (`earCanvasL` & `earCanvasR`).
   * Renders the exact Master Storyboard (`media_1794052222222_3662d750.jpg`) ear anatomy:
   * 1. Thick, plump 3D creamy-white outer ear cushion with visible warm rosy-taupe outer contour & glossy inner ridge.
   * 2. Deep recessed strawberry-pink inner ear hollow (`#E0507C` -> `#FF80A6` -> `#FFA8C4`).
   * 3. Signature 3-lobed fluffy white-pink inner-ear fur tuft (`bulu telinga dalam`) rising at the base of the pink hollow!
   */
  updateEarTextures() {
    if (!this.earCanvasL || !this.earCanvasR) return;
    const wTakut = this.skinBlend ? (this.skinBlend.takut || 0) : 0;
    const wMarah = this.skinBlend ? (this.skinBlend.marah || 0) : 0;
    const wFurious = this.skinBlend ? (this.skinBlend.furious || 0) : 0;

    const renderSingleEar = (canvas, isLeft) => {
      const ctx = canvas.getContext('2d');
      const W = 512;
      const H = 512;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      if (!isLeft) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }

      // Outer Ear Cushion Silhouette (asymmetric cat/fox ear: outer edge gently curved, inner edge sweeping toward crown)
      const traceOuterEar = () => {
        ctx.beginPath();
        ctx.moveTo(64, 468);
        ctx.bezierCurveTo(42, 310, 82, 128, 204, 46);
        ctx.bezierCurveTo(234, 26, 268, 26, 298, 48);
        ctx.bezierCurveTo(412, 132, 462, 308, 444, 468);
        ctx.bezierCurveTo(340, 496, 168, 496, 64, 468);
        ctx.closePath();
      };

      // Inner Pink Hollow Silhouette (leaves a thick, plush ~72px white outer ear cushion all around!)
      const traceInnerEar = () => {
        ctx.beginPath();
        ctx.moveTo(142, 424);
        ctx.bezierCurveTo(128, 304, 158, 182, 224, 118);
        ctx.bezierCurveTo(243, 100, 263, 100, 282, 118);
        ctx.bezierCurveTo(348, 182, 378, 304, 364, 424);
        ctx.bezierCurveTo(300, 444, 206, 444, 142, 424);
        ctx.closePath();
      };

      // 1. Outer 3D Silhouette Rim Shadow (so the white outer ear stands out clearly on #FFFFFF backgrounds!)
      ctx.save();
      traceOuterEar();
      if (wFurious > 0.5) {
        ctx.strokeStyle = 'rgba(18, 3, 6, 0.95)';
        ctx.lineWidth = 12;
      } else if (wMarah > 0.5) {
        ctx.strokeStyle = 'rgba(218, 132, 158, 0.88)';
        ctx.lineWidth = 11;
      } else if (wTakut > 0.5) {
        ctx.strokeStyle = 'rgba(162, 182, 212, 0.85)';
        ctx.lineWidth = 10;
      } else {
        ctx.strokeStyle = 'rgba(206, 174, 192, 0.86)';
        ctx.lineWidth = 10;
      }
      ctx.stroke();
      ctx.restore();

      // 2. Clipped Outer Ear 3D Cushion Shading & Glossy Inner Bevel Ridge
      ctx.save();
      traceOuterEar();
      ctx.clip();

      const outGrad = ctx.createRadialGradient(252, 220, 24, 252, 265, 245);
      if (wFurious > 0.5) {
        outGrad.addColorStop(0.00, '#2B070C');
        outGrad.addColorStop(0.65, '#1A0407');
        outGrad.addColorStop(1.00, '#0E0204');
      } else if (wMarah > 0.5) {
        outGrad.addColorStop(0.00, '#FFFBFD');
        outGrad.addColorStop(0.58, '#FFE6EF');
        outGrad.addColorStop(0.86, '#F9C4D8');
        outGrad.addColorStop(1.00, '#EAA4BE');
      } else if (wTakut > 0.5) {
        outGrad.addColorStop(0.00, '#FFFFFF');
        outGrad.addColorStop(0.60, '#EEF5FC');
        outGrad.addColorStop(0.88, '#D8E7F7');
        outGrad.addColorStop(1.00, '#C2D6EC');
      } else {
        outGrad.addColorStop(0.00, '#FFFFFF');
        outGrad.addColorStop(0.58, '#FFFBFD');
        outGrad.addColorStop(0.84, '#F7E2EE');
        outGrad.addColorStop(1.00, '#E6C8D8');
      }
      ctx.fillStyle = outGrad;
      ctx.fillRect(0, 0, W, H);

      // Soft warm 3D lateral shading along the outer-left flank of the ear cushion
      if (wFurious <= 0.5) {
        const flankGrad = ctx.createLinearGradient(55, 220, 175, 250);
        flankGrad.addColorStop(0.0, wMarah > 0.5 ? 'rgba(232, 138, 168, 0.55)' : 'rgba(222, 186, 206, 0.52)');
        flankGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = flankGrad;
        ctx.fillRect(0, 0, 220, H);
      }

      // Bright 3D White Cushion Ridge framing the pink inner ear hollow
      if (wFurious <= 0.5) {
        ctx.save();
        traceInnerEar();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.lineWidth = 26;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Recessed Strawberry-Pink Inner Ear Hollow
      ctx.save();
      traceInnerEar();
      ctx.clip();

      const inGrad = ctx.createLinearGradient(252, 100, 252, 430);
      if (wFurious > 0.5) {
        inGrad.addColorStop(0.00, '#5E0810');
        inGrad.addColorStop(0.55, '#9E141E');
        inGrad.addColorStop(1.00, '#D9261E');
      } else if (wMarah > 0.5) {
        inGrad.addColorStop(0.00, '#D43B6A');
        inGrad.addColorStop(0.45, '#F56490');
        inGrad.addColorStop(1.00, '#FF98B8');
      } else {
        inGrad.addColorStop(0.00, '#DF527E');
        inGrad.addColorStop(0.42, '#FF7EA5');
        inGrad.addColorStop(1.00, '#FFACC6');
      }
      ctx.fillStyle = inGrad;
      ctx.fillRect(110, 90, 290, 360);

      // Deep recessed inner-arch shadow at top & sides of the pink hollow
      ctx.strokeStyle = wFurious > 0.5 ? 'rgba(35, 2, 6, 0.75)' : 'rgba(188, 42, 86, 0.45)';
      ctx.lineWidth = 18;
      traceInnerEar();
      ctx.stroke();

      // 4. Signature 3-Lobed Fluffy Ear Fur Tuft (`bulu telinga dalam`) at the base of the pink hollow!
      // Matches ref_marah_zoom.png & media_1794052222222_3662d750.jpg 1:1!
      const drawThreeLobedTuft = (offsetY, fillStyle) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        // Left scallop lobe
        ctx.arc(184, 352 + offsetY, 60, 0, Math.PI * 2);
        // Taller center scallop lobe
        ctx.arc(253, 310 + offsetY, 72, 0, Math.PI * 2);
        // Right scallop lobe
        ctx.arc(322, 352 + offsetY, 60, 0, Math.PI * 2);
        // Solid base fill connecting the 3 lobes
        ctx.rect(120, 340 + offsetY, 265, 135);
        ctx.fill();
      };

      if (wFurious > 0.5) {
        drawThreeLobedTuft(-12, 'rgba(65, 8, 14, 0.85)');
        drawThreeLobedTuft(0, '#28060A');
      } else {
        // Upper rose-pink scalloped rim border on the 3-lobed tuft (exact match to ref_marah_zoom.png!)
        drawThreeLobedTuft(-13, wMarah > 0.5 ? 'rgba(235, 118, 154, 0.88)' : 'rgba(238, 132, 166, 0.82)');

        // Main creamy-white & soft-blush 3-lobed fluffy ear tuft
        const tuftGrad = ctx.createLinearGradient(253, 260, 253, 435);
        tuftGrad.addColorStop(0.00, '#FFFFFF');
        tuftGrad.addColorStop(0.55, '#FFF5F9');
        tuftGrad.addColorStop(1.00, wMarah > 0.5 ? '#FFD2E2' : '#FFE4EE');
        drawThreeLobedTuft(0, tuftGrad);
      }

      ctx.restore(); // End inner ear clip

      // Crisp inner pink rim bevel line
      ctx.strokeStyle = wFurious > 0.5 ? 'rgba(180, 24, 30, 0.55)' : 'rgba(228, 112, 148, 0.55)';
      ctx.lineWidth = 4.5;
      traceInnerEar();
      ctx.stroke();

      ctx.restore(); // End outer ear clip
      ctx.restore();
    };

    renderSingleEar(this.earCanvasL, true);
    renderSingleEar(this.earCanvasR, false);
    if (this.earTexL) this.earTexL.needsUpdate = true;
    if (this.earTexR) this.earTexR.needsUpdate = true;
  }

  /**
   * 3D Organic Sculpted Cat/Fox Ears with High-Resolution 2.5D Storyboard Texture & 2-Stage Spring Flex.
   * Renders the thick white outer ear shell, recessed strawberry-pink inner hollow, and 3-lobed fluffy ear tuft
   * matching media_1794052222222_3662d750.jpg 1:1!
   */
  createFoxEars() {
    this.earsGroup = new THREE.Group();
    this.earsGroup.visible = this.showEars;
    this.mochiGroup.add(this.earsGroup);

    this.earCanvasL = document.createElement('canvas');
    this.earCanvasL.width = 512;
    this.earCanvasL.height = 512;
    this.earTexL = new THREE.CanvasTexture(this.earCanvasL);

    this.earCanvasR = document.createElement('canvas');
    this.earCanvasR.width = 512;
    this.earCanvasR.height = 512;
    this.earTexR = new THREE.CanvasTexture(this.earCanvasR);

    this.updateEarTextures();

    const makeCurvedEarGeo = () => {
      const geo = new THREE.PlaneGeometry(1.24, 1.08, 24, 24);
      // Shift pivot to the lower base of the ear so ear rotation/wiggle pivots from the skull!
      geo.translate(0, 0.36, 0);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // Smooth 3D convex pillow dome across X and gentle forward cup along Y
        const normX = x / 0.62;
        const normY = Math.max(0, (y + 0.15) / 1.02);
        const domeZ = (1.0 - normX * normX * 0.65) * 0.065 * Math.sin(normY * Math.PI);
        const cupZ = -Math.pow(normY, 1.35) * 0.05;
        pos.setZ(i, domeZ + cupZ);
      }
      geo.computeVertexNormals();
      return geo;
    };

    const earGeoL = makeCurvedEarGeo();
    const earGeoR = makeCurvedEarGeo();

    this.earMatL = new THREE.MeshBasicMaterial({
      map: this.earTexL,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide
    });
    this.earMatR = new THREE.MeshBasicMaterial({
      map: this.earTexR,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide
    });

    // Left Ear Rig (bold, tall, plush cat/fox ear framing upper head matching media_1794052222222_3662d750.jpg!)
    this.earL = new THREE.Group();
    this.earL.position.set(-0.62, 0.98, 0.40);
    this.earL.rotation.set(-0.03, -0.04, Math.PI * 0.13);

    this.earL_Flex = new THREE.Group();
    const meshL = new THREE.Mesh(earGeoL, this.earMatL);
    meshL.renderOrder = 15;
    this.earL_Flex.add(meshL);
    this.earL.add(this.earL_Flex);

    // Right Ear Rig
    this.earR = new THREE.Group();
    this.earR.position.set(0.62, 0.98, 0.40);
    this.earR.rotation.set(-0.03, 0.04, -Math.PI * 0.13);

    this.earR_Flex = new THREE.Group();
    const meshR = new THREE.Mesh(earGeoR, this.earMatR);
    meshR.renderOrder = 15;
    this.earR_Flex.add(meshR);
    this.earR.add(this.earR_Flex);

    this.earsGroup.add(this.earL);
    this.earsGroup.add(this.earR);

    this.earTwitchTimer = 3.0;
    this.nextEarTwitch = 3.5;
    this.twitchEar = 'L';
  }

  /**
   * True 3D Sculpted Curved Bull/Demon Horns for 'Sangat Marah' (Furious) transformation.
   * Built via parametric Catmull-Rom loft with 6 organic annular ridges and
   * deep glossy dark-mahogany/obsidian PBR material with warm fiery rim sheen.
   */
  createDemonHorns() {
    this.hornsGroup = new THREE.Group();
    this.hornsGroup.visible = false;
    this.mochiGroup.add(this.hornsGroup);

    const hornMat = new THREE.MeshPhysicalMaterial({
      color: 0x260E12,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.55,
      clearcoatRoughness: 0.24,
      sheen: 0.90,
      sheenRoughness: 0.25,
      sheenColor: new THREE.Color(0xC83228)
    });

    const buildHornMesh = (side) => {
      const spine = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.54, 0.78, 0.16),
        new THREE.Vector3(side * 0.82, 0.96, 0.18),
        new THREE.Vector3(side * 0.94, 1.24, 0.19),
        new THREE.Vector3(side * 0.86, 1.54, 0.17),
        new THREE.Vector3(side * 0.64, 1.78, 0.14)
      ]);

      const segs = 48;
      const radSegs = 28;
      const frames = spine.computeFrenetFrames(segs, false);
      const verts = [];
      const indices = [];

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const pt = spine.getPointAt(t);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        // Bold thick base (0.31) tapering to a sharp curved demon tip (0.008)
        const baseR = 0.31 * Math.pow(1.0 - t, 0.74) + 0.006 * (1.0 - t);
        // 6 organic annular horn growth ridges
        const ridge = 1.0 + 0.068 * Math.sin(t * Math.PI * 13.0) * Math.sin(t * Math.PI);
        const r = baseR * ridge;

        for (let j = 0; j <= radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const cosT = Math.cos(theta) * r;
          const sinT = Math.sin(theta) * r;
          verts.push(
            pt.x + N.x * cosT + B.x * sinT,
            pt.y + N.y * cosT + B.y * sinT,
            pt.z + N.z * cosT + B.z * sinT
          );
        }
      }

      const ringStride = radSegs + 1;
      for (let i = 0; i < segs; i++) {
        for (let j = 0; j < radSegs; j++) {
          const a = i * ringStride + j;
          const b = (i + 1) * ringStride + j;
          const c = (i + 1) * ringStride + (j + 1);
          const d = i * ringStride + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, hornMat);
    };

    this.hornL = buildHornMesh(-1);
    this.hornR = buildHornMesh(1);
    this.hornsGroup.add(this.hornL);
    this.hornsGroup.add(this.hornR);
  }

  /**
   * 3D Ear Steam Group for Stage 2 'Marah' (Angry).
   * Note: The inner ear canals are kept 100% clean, cute, and unblocked (zero white cauliflower balls inside the ears!).
   * The signature stylized anime steam puffs float elegantly in the air above each ear via renderFloatingStoryboardFx.
   */
  createEarSteam() {
    this.steamGroup = new THREE.Group();
    this.steamGroup.visible = false;
    this.mochiGroup.add(this.steamGroup);
  }

  /**
   * Smooth, Chubby 3D White Daifuku Mochi Paws held gently on the chest/cheeks
   * for 'Empati' (Row 1 Col 5), matching the Master Storyboard 1:1 (zero pink toe-beans facing front!).
   */
  createEmpatiPaws() {
    this.empatiPawsGroup = new THREE.Group();
    this.empatiPawsGroup.visible = false;
    this.mochiGroup.add(this.empatiPawsGroup);

    const pawMochiMat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFDFB,
      roughness: 0.58,
      metalness: 0.0,
      clearcoat: 0.0,
      sheen: 0.55,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0xFFD6E2)
    });

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xE6B8CA,
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    });

    const buildMitten = (side) => {
      const g = new THREE.Group();
      g.position.set(side * 0.34, -0.44, 1.15);
      g.rotation.set(0.22, side * 0.16, -side * 0.46);

      // Soft contact shadow on chest behind paw
      const shGeo = new THREE.SphereGeometry(0.22, 24, 18);
      shGeo.scale(1.06, 1.24, 0.35);
      const sh = new THREE.Mesh(shGeo, shadowMat);
      sh.position.set(side * 0.02, -0.04, -0.06);
      g.add(sh);

      // Smooth pillowy mochi mitten
      const mGeo = new THREE.SphereGeometry(0.205, 32, 24);
      mGeo.scale(1.02, 1.24, 0.72);
      const mMesh = new THREE.Mesh(mGeo, pawMochiMat);
      g.add(mMesh);

      return g;
    };

    this.empatiPawL = buildMitten(-1);
    this.empatiPawR = buildMitten(1);
    this.empatiPawsGroup.add(this.empatiPawL);
    this.empatiPawsGroup.add(this.empatiPawR);
  }

  /**
   * 3D Voluminous Fluffy Bushy Plume Tail with Continuous Smooth Catmull-Rom Loft.
   * Matches mochi-design-floating.jpg 1:1.
   * Originates from rear bottom, sweeps down and outward into open space,
   * then arches UP gracefully in a tall, majestic S-curve plume reaching ear height.
   * Completely seamless, organic, continuous 3D fur volume (zero caterpillar spheres).
   */
  createCatTail() {
    this.tailGroup = new THREE.Group();
    this.tailGroup.visible = this.showTail;
    this.mochiGroup.add(this.tailGroup);

    // 7 base spline control points along the plume spine (matching mochi-design-floating.jpg)
    this.tailBasePoints = [
      new THREE.Vector3(0.42, -0.72, -0.25),
      new THREE.Vector3(0.80, -0.65, -0.05),
      new THREE.Vector3(1.20, -0.36, 0.15),
      new THREE.Vector3(1.42, 0.10, 0.22),
      new THREE.Vector3(1.36, 0.54, 0.20),
      new THREE.Vector3(1.12, 0.94, 0.14),
      new THREE.Vector3(0.86, 1.24, 0.06)
    ];

    this.tailCurrentPoints = this.tailBasePoints.map(p => p.clone());

    // N rings along spine, M radial vertices per ring
    this.tailN = 28;
    this.tailM = 20;

    const numVerts = (this.tailN + 1) * this.tailM + 1; // +1 for tip cap
    this.tailPositions = new Float32Array(numVerts * 3);
    const indices = [];

    for (let i = 0; i < this.tailN; i++) {
      for (let j = 0; j < this.tailM; j++) {
        const nextJ = (j + 1) % this.tailM;
        const v0 = i * this.tailM + j;
        const v1 = i * this.tailM + nextJ;
        const v2 = (i + 1) * this.tailM + j;
        const v3 = (i + 1) * this.tailM + nextJ;
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }
    }
    // Tip fan
    const tipIdx = (this.tailN + 1) * this.tailM;
    for (let j = 0; j < this.tailM; j++) {
      const nextJ = (j + 1) % this.tailM;
      indices.push(this.tailN * this.tailM + j, tipIdx, this.tailN * this.tailM + nextJ);
    }

    this.tailGeo = new THREE.BufferGeometry();
    this.tailPosAttr = new THREE.BufferAttribute(this.tailPositions, 3);
    this.tailPosAttr.setUsage(THREE.DynamicDrawUsage);
    this.tailGeo.setAttribute('position', this.tailPosAttr);
    this.tailGeo.setIndex(indices);

    this.tailMaterial = new THREE.MeshStandardMaterial({
      color: 0xFDFAF5,
      roughness: 0.58,
      metalness: 0.0
    });

    this.tailMesh = new THREE.Mesh(this.tailGeo, this.tailMaterial);
    this.tailGroup.add(this.tailMesh);

    this.updateTailLoftMesh(0);
  }

  /**
   * Continuous Loft Mesh Generator and Harmonic Traveling Wave Kinematics.
   */
  updateTailLoftMesh(dt) {
    if (!this.showTail || !this.tailGeo) return;

    // 1. Kinematic wave along spline control points
    for (let i = 0; i < this.tailBasePoints.length; i++) {
      const base = this.tailBasePoints[i];
      const cur = this.tailCurrentPoints[i];

      if (i === 0) {
        cur.copy(base);
        continue;
      }

      if (this.mood === 'happy') {
        const wagFreq = 9.5;
        const phase = this.time * wagFreq - i * 0.40;
        const wagZ = Math.sin(phase) * (0.08 + i * 0.04);
        const wagX = Math.cos(phase * 0.5) * (0.04 + i * 0.03);
        const wagY = (i * 0.035);
        cur.set(base.x + wagX, base.y + wagY, base.z + wagZ);

      } else if (this.mood === 'sleepy') {
        const phase = this.time * 1.2 - i * 0.32;
        const droopY = -i * 0.12;
        const curlX = -i * 0.05;
        const droopZ = Math.sin(phase) * 0.04;
        cur.set(base.x + curlX, base.y + droopY, base.z + droopZ);

      } else {
        const swayFreq = 2.0;
        const phase = this.time * swayFreq - i * 0.42;
        const waveZ = Math.sin(phase) * (0.05 + i * 0.035);
        const waveX = Math.cos(phase * 0.75) * (0.03 + i * 0.02);
        const waveY = Math.sin(phase * 0.6) * 0.025;
        cur.set(base.x + waveX, base.y + waveY, base.z + waveZ);
      }
    }

    // 2. Generate smooth 3D Catmull-Rom spline & Frenet frames
    const curve = new THREE.CatmullRomCurve3(this.tailCurrentPoints, false, 'catmullrom', 0.5);
    const frames = curve.computeFrenetFrames(this.tailN, false);

    const pos = this.tailPositions;
    let ptr = 0;

    for (let i = 0; i <= this.tailN; i++) {
      const t = i / this.tailN;
      const P = curve.getPointAt(t);
      const norm = frames.normals[i];
      const binorm = frames.binormals[i];

      // Voluminous fluffy fur profile: thick mid-high plume belly
      const peakT = 0.48;
      const s = t < peakT ? (t / peakT) : ((1.0 - t) / (1.0 - peakT));
      const ease = s * s * (3 - 2 * s);
      const r = (0.22 + ease * 0.44) * (1.0 - Math.pow(t, 6) * 0.75);

      for (let j = 0; j < this.tailM; j++) {
        const angle = (j / this.tailM) * Math.PI * 2;
        const cosA = Math.cos(angle) * 1.22 * r;
        const sinA = Math.sin(angle) * 0.94 * r;
        pos[ptr++] = P.x + norm.x * cosA + binorm.x * sinA;
        pos[ptr++] = P.y + norm.y * cosA + binorm.y * sinA;
        pos[ptr++] = P.z + norm.z * cosA + binorm.z * sinA;
      }
    }

    // Tip vertex cap
    const tipP = curve.getPointAt(1.0).clone().add(curve.getTangentAt(1.0).multiplyScalar(0.08));
    pos[ptr++] = tipP.x;
    pos[ptr++] = tipP.y;
    pos[ptr++] = tipP.z;

    this.tailPosAttr.needsUpdate = true;
    this.tailGeo.computeVertexNormals();
  }

  /**
   * 3D Crisp Expressive Facial Features.
   * Matches mochi-design-floating.jpg 1:1.
   */
  /**
   * 3D Expressive Adorable Kitten Eyes & Authentic Mochi Cat Mouth.
   * Matches Option C in mochi_hand_options_1791308895920.jpg.
   */
  createFaceObjects() {
    this.faceGroup = new THREE.Group();
    this.faceGroup.position.set(0, 0, 0); // Aligned with mochiGroup center
    this.faceGroup.renderOrder = 999;
    this.mochiGroup.add(this.faceGroup);

    // Deep rich dark-espresso base for adorable kitten eyes and mouth
    const darkMat = new THREE.MeshBasicMaterial({
      color: 0x161214,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.darkMat = darkMat;

    // Brilliant sparkling white highlights
    const hiMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    // Deep liquid cat iris reflection
    const glintMat = new THREE.MeshBasicMaterial({
      color: 0x3E3036,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    // --- 1. Big Adorable Kitten Eyes (Deep iris + multi-tier sparkling glints) ---
    const irisGeo = new THREE.CircleGeometry(0.225, 48);
    irisGeo.scale(0.95, 1.08, 1); // Chubby tall kitten oval

    const glintGeo = new THREE.RingGeometry(0.11, 0.20, 32, 1, Math.PI * 1.15, Math.PI * 0.70);
    const hiBigGeo = new THREE.CircleGeometry(0.082, 32);
    const hiSmallGeo = new THREE.CircleGeometry(0.040, 24);
    const hiMicroGeo = new THREE.CircleGeometry(0.022, 16);

    const makeCatEye = (x) => {
      const g = new THREE.Group();
      g.position.set(x, 0.08, 1.285);
      g.rotation.set(-0.06, x > 0 ? 0.14 : -0.14, 0);

      // Deep iris
      const iris = new THREE.Mesh(irisGeo, darkMat);
      iris.renderOrder = 998;
      g.add(iris);

      // Bottom crescent glint (depth of feline cornea)
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(0, 0, 0.001);
      glint.renderOrder = 999;
      g.add(glint);

      // Primary brilliant highlight (upper-left)
      const hiBig = new THREE.Mesh(hiBigGeo, hiMat);
      hiBig.position.set(-0.068, 0.076, 0.002);
      hiBig.renderOrder = 1000;
      g.add(hiBig);

      // Secondary soft sparkle (lower-right)
      const hiSmall = new THREE.Mesh(hiSmallGeo, hiMat);
      hiSmall.position.set(0.068, -0.070, 0.002);
      hiSmall.renderOrder = 1000;
      g.add(hiSmall);

      // Tertiary micro catchlight
      const hiMicro = new THREE.Mesh(hiMicroGeo, hiMat);
      hiMicro.position.set(0.015, 0.088, 0.002);
      hiMicro.renderOrder = 1000;
      g.add(hiMicro);

      this.faceGroup.add(g);
      return g;
    };

    this.eyeLeftDot = makeCatEye(-0.38);
    this.eyeRightDot = makeCatEye(0.38);

    // --- 2. Happy Joyous Smiling Eye Arches (⌒ ⌒) ---
    const smileEyeGeo = new THREE.TorusGeometry(0.145, 0.030, 16, 32, Math.PI * 0.82);
    this.eyeHappyL = new THREE.Mesh(smileEyeGeo, darkMat);
    this.eyeHappyL.position.set(-0.38, 0.08, 1.285);
    this.eyeHappyL.rotation.set(-0.06, -0.14, Math.PI * 0.09);
    this.eyeHappyL.renderOrder = 1000;
    this.faceGroup.add(this.eyeHappyL);

    this.eyeHappyR = new THREE.Mesh(smileEyeGeo, darkMat);
    this.eyeHappyR.position.set(0.38, 0.08, 1.285);
    this.eyeHappyR.rotation.set(-0.06, 0.14, Math.PI * 0.09);
    this.eyeHappyR.renderOrder = 1000;
    this.faceGroup.add(this.eyeHappyR);

    // --- 3. Playful Wink Eye (Right Eye ⌒ with cute cat eyelash flick) ---
    this.eyeWink = new THREE.Group();
    this.eyeWink.position.set(0.38, 0.08, 1.285);
    this.eyeWink.rotation.set(-0.06, 0.14, 0);

    const winkArc = new THREE.Mesh(smileEyeGeo, darkMat);
    winkArc.rotation.z = Math.PI * 0.09;
    winkArc.renderOrder = 1000;
    this.eyeWink.add(winkArc);

    const lashGeo = new THREE.CapsuleGeometry(0.014, 0.065, 6, 12);
    const lash = new THREE.Mesh(lashGeo, darkMat);
    lash.position.set(0.12, 0.02, 0);
    lash.rotation.z = -0.55;
    lash.renderOrder = 1000;
    this.eyeWink.add(lash);
    this.faceGroup.add(this.eyeWink);

    // --- 4. Empathetic Worry Eyebrows (/ \) for incorrect / thinking ---
    const browGeo = new THREE.CapsuleGeometry(0.022, 0.13, 6, 12);
    this.eyeSleepyL = new THREE.Mesh(browGeo, darkMat);
    this.eyeSleepyL.position.set(-0.38, 0.38, 1.235);
    this.eyeSleepyL.rotation.set(-0.12, -0.14, -(Math.PI / 2 - 0.44));
    this.eyeSleepyL.renderOrder = 1000;
    this.faceGroup.add(this.eyeSleepyL);

    this.eyeSleepyR = new THREE.Mesh(browGeo, darkMat);
    this.eyeSleepyR.position.set(0.38, 0.38, 1.235);
    this.eyeSleepyR.rotation.set(-0.12, 0.14, Math.PI / 2 - 0.44);
    this.eyeSleepyR.renderOrder = 1000;
    this.faceGroup.add(this.eyeSleepyR);

    // --- 5. Heart Eyes (Frame 11 / Love) ---
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.05);
    heartShape.bezierCurveTo(-0.10, -0.06, -0.14, -0.16, -0.04, -0.16);
    heartShape.bezierCurveTo(0, -0.15, 0, -0.10, 0, -0.10);
    heartShape.bezierCurveTo(0, -0.10, 0, -0.15, 0.04, -0.16);
    heartShape.bezierCurveTo(0.14, -0.16, 0.10, -0.06, 0, 0.05);

    const heartGeo = new THREE.ShapeGeometry(heartShape);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xFF3568, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false });

    this.eyeHeartL = new THREE.Mesh(heartGeo, heartMat);
    this.eyeHeartL.position.set(-0.34, 0.10, 1.285);
    this.eyeHeartL.rotation.z = Math.PI;
    this.eyeHeartL.scale.set(1.4, 1.4, 1.4);
    this.eyeHeartL.renderOrder = 1000;
    this.faceGroup.add(this.eyeHeartL);

    this.eyeHeartR = new THREE.Mesh(heartGeo, heartMat);
    this.eyeHeartR.position.set(0.34, 0.10, 1.285);
    this.eyeHeartR.rotation.z = Math.PI;
    this.eyeHeartR.scale.set(1.4, 1.4, 1.4);
    this.eyeHeartR.renderOrder = 1000;
    this.faceGroup.add(this.eyeHeartR);

    // --- 6. AUTHENTIC MOCHI CAT MOUTH (ω / :3) ---
    // Double-lobed pillowy kawaii kitten smile meeting at center
    this.mouthW = new THREE.Group();
    this.mouthW.position.set(0, -0.10, 1.265);

    const lipGeo = new THREE.TorusGeometry(0.048, 0.018, 14, 28, Math.PI * 0.84);
    const lipL = new THREE.Mesh(lipGeo, darkMat);
    lipL.position.set(-0.045, 0, 0);
    lipL.rotation.set(0.04, -0.06, -Math.PI * 0.92);
    lipL.renderOrder = 1000;
    this.mouthW.add(lipL);

    const lipR = new THREE.Mesh(lipGeo, darkMat);
    lipR.position.set(0.045, 0, 0);
    lipR.rotation.set(0.04, 0.06, -Math.PI * 0.92);
    lipR.renderOrder = 1000;
    this.mouthW.add(lipR);
    this.faceGroup.add(this.mouthW);

    // --- 7. Joyous Open Smiling Mouth with Soft Pink Tongue (ᗨ) ---
    this.mouthHappy = new THREE.Group();
    this.mouthHappy.position.set(0, -0.10, 1.265);

    const happyGeo = new THREE.TorusGeometry(0.076, 0.020, 16, 32, Math.PI * 0.86);
    const happyMesh = new THREE.Mesh(happyGeo, darkMat);
    happyMesh.rotation.set(0.04, 0, -Math.PI * 0.93);
    happyMesh.renderOrder = 1000;
    this.mouthHappy.add(happyMesh);

    const tongueGeo = new THREE.CircleGeometry(0.045, 24, 0, Math.PI);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xFF8AA6, transparent: true, depthTest: false, depthWrite: false });
    const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
    tongueMesh.position.set(0, -0.038, 0.001);
    tongueMesh.scale.set(1.25, 0.82, 1);
    tongueMesh.renderOrder = 999;
    this.mouthHappy.add(tongueMesh);
    this.faceGroup.add(this.mouthHappy);

    // --- 8. Small Soft 'o' Mouth for Empathetic / Thinking ---
    const mouthOGeo = new THREE.TorusGeometry(0.038, 0.017, 14, 32);
    this.mouthO = new THREE.Mesh(mouthOGeo, darkMat);
    this.mouthO.position.set(0, -0.10, 1.265);
    this.mouthO.scale.set(0.9, 1.15, 1);
    this.mouthO.renderOrder = 1000;
    this.faceGroup.add(this.mouthO);

    // Legacy fallback smile arc
    // Legacy fallback smile arc
    const mouthGeo = new THREE.TorusGeometry(0.068, 0.020, 16, 32, Math.PI * 0.76);
    this.mouthMesh = new THREE.Mesh(mouthGeo, darkMat);
    this.mouthMesh.position.set(0, -0.08, 1.265);
    this.mouthMesh.rotation.set(0.04, 0, -Math.PI * 0.88);
    this.mouthMesh.renderOrder = 1000;
    this.faceGroup.add(this.mouthMesh);

    // =========================================================================
    // 9. ADORABLE TODDLER POUT (Pursed Jutting Lips & Melancholic Puppy Eyes)
    // Matches the uploaded toddler reference photo 1:1!
    // =========================================================================
    const poutLipMat = new THREE.MeshPhysicalMaterial({
      color: 0xFA4B73, // Luscious toddler strawberry-rose pout
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xFFA5BC),
      transparent: false
    });

    this.mouthPout = new THREE.Group();
    this.mouthPout.position.set(0, -0.11, 1.285);
    this.mouthPout.renderOrder = 1000;

    // 9a. Upper Pursed Pout Lip (Pillowy cushion angled downward & forward)
    const upperLipGeo = new THREE.SphereGeometry(0.072, 32, 24);
    upperLipGeo.scale(1.30, 0.74, 1.30);
    const upperLip = new THREE.Mesh(upperLipGeo, poutLipMat);
    upperLip.position.set(0, 0.016, 0.095);
    upperLip.rotation.set(-0.16, 0, 0);
    upperLip.renderOrder = 1000;
    this.mouthPout.add(upperLip);

    // 9b. Central Cupid's Bow Tubercle (Fleshy central pout drop resting on lower lip)
    const tubercleGeo = new THREE.SphereGeometry(0.046, 24, 18);
    tubercleGeo.scale(1.10, 0.90, 1.25);
    const tubercle = new THREE.Mesh(tubercleGeo, poutLipMat);
    tubercle.position.set(0, 0.008, 0.125);
    tubercle.rotation.set(-0.14, 0, 0);
    tubercle.renderOrder = 1001;
    this.mouthPout.add(tubercle);

    // 9c. Lower Plump Pout Cushion (Jutting forward in authentic "manyun" sulk!)
    const lowerLipGeo = new THREE.SphereGeometry(0.080, 32, 24);
    lowerLipGeo.scale(1.34, 0.80, 1.35);
    const lowerLip = new THREE.Mesh(lowerLipGeo, poutLipMat);
    lowerLip.position.set(0, -0.018, 0.105);
    lowerLip.rotation.set(0.14, 0, 0);
    lowerLip.renderOrder = 1000;
    this.mouthPout.add(lowerLip);

    // 9d. Delicate Natural Sulk Seam (Deep Wine / Rose - ZERO black mustache!)
    const sulkSeamGeo = new THREE.TorusGeometry(0.046, 0.006, 12, 28, Math.PI * 0.70);
    const sulkSeamMat = new THREE.MeshBasicMaterial({
      color: 0x6E152D, // Deep raspberry-wine shadow (NOT BLACK)
      transparent: true,
      opacity: 0.85
    });
    const poutCrease = new THREE.Mesh(sulkSeamGeo, sulkSeamMat);
    poutCrease.position.set(0, -0.003, 0.120);
    poutCrease.rotation.set(0.06, 0, Math.PI * 0.13); // Curves softly downward at mouth corners
    poutCrease.renderOrder = 1002;
    this.mouthPout.add(poutCrease);

    this.faceGroup.add(this.mouthPout);

    // Large Drooping Melancholic Puppy-Dog Eyes
    const makePuppyEye = (x, isLeft) => {
      const g = new THREE.Group();
      g.position.set(x, 0.065, 1.285);
      // Melancholic slant: outer corners droop downward
      g.rotation.set(-0.06, isLeft ? -0.14 : 0.14, isLeft ? -0.12 : 0.12);

      const iris = new THREE.Mesh(irisGeo, darkMat);
      iris.renderOrder = 998;
      g.add(iris);

      // Liquid reflective depth
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(0, 0, 0.001);
      glint.renderOrder = 999;
      g.add(glint);

      // Big glassy tears highlight (upper-inner)
      const hiBig = new THREE.Mesh(new THREE.CircleGeometry(0.088, 32), hiMat);
      hiBig.position.set(isLeft ? 0.055 : -0.055, 0.078, 0.002);
      hiBig.renderOrder = 1000;
      g.add(hiBig);

      // Watery rim shine (lower rim reflecting pools of tears)
      const hiWater = new THREE.Mesh(new THREE.CircleGeometry(0.046, 24), hiMat);
      hiWater.position.set(isLeft ? -0.058 : 0.058, -0.072, 0.002);
      hiWater.renderOrder = 1000;
      g.add(hiWater);

      // Secondary tear glint
      const hiTiny = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), hiMat);
      hiTiny.position.set(0, 0.092, 0.002);
      hiTiny.renderOrder = 1000;
      g.add(hiTiny);

      this.faceGroup.add(g);
      return g;
    };

    this.eyePoutL = makePuppyEye(-0.38, true);
    this.eyePoutR = makePuppyEye(0.38, false);

    // Subtle Furrowed Brow of Toddler Drama (/ \)
    const poutBrowGeo = new THREE.CapsuleGeometry(0.024, 0.14, 6, 12);
    this.browPoutL = new THREE.Mesh(poutBrowGeo, darkMat);
    this.browPoutL.position.set(-0.35, 0.38, 1.245);
    this.browPoutL.rotation.set(-0.12, -0.14, -(Math.PI / 2 - 0.48));
    this.browPoutL.renderOrder = 1000;
    this.faceGroup.add(this.browPoutL);

    this.browPoutR = new THREE.Mesh(poutBrowGeo, darkMat);
    this.browPoutR.position.set(0.35, 0.38, 1.245);
    this.browPoutR.rotation.set(-0.12, 0.14, Math.PI / 2 - 0.48);
    this.browPoutR.renderOrder = 1000;
    this.faceGroup.add(this.browPoutR);

    // Center forehead drama crease
    const furrowGeo = new THREE.CapsuleGeometry(0.016, 0.055, 4, 8);
    this.foreheadFurrow = new THREE.Mesh(furrowGeo, darkMat);
    this.foreheadFurrow.position.set(0, 0.41, 1.22);
    this.foreheadFurrow.rotation.set(-0.15, 0, 0);
    this.foreheadFurrow.renderOrder = 1000;
    this.faceGroup.add(this.foreheadFurrow);

    // Hide legacy low-poly primitive face meshes visually while keeping their object references
    // and .visible / .scale properties 100% intact for backward compatibility & unit tests!
    darkMat.opacity = 0;
    hiMat.opacity = 0;
    glintMat.opacity = 0;
    heartMat.opacity = 0;
    tongueMat.opacity = 0;
    poutLipMat.transparent = true;
    poutLipMat.opacity = 0;
    sulkSeamMat.opacity = 0;

    // =========================================================================
    // 10. CURVED 3D FACE SHELL (1024x768) + FLOATING 3D STORYBOARD FX LAYER
    // Raycast-wrapped directly onto the 3D Daifuku superellipsoid cushion!
    // =========================================================================
    this.createCurvedFaceShellAndFx();

    this.updateFaceVisibility();
  }

  /**
   * Projects a 56x42 high-density 3D surface shell directly onto `this.mochiMesh`
   * so that all 15 Storyboard Expressions and all 12 Phonetic / 15 AIUEO Toothless Visemes
   * hug the true 3D curvature of the Daifuku Mochi cushion with 100% Retina clarity!
   */
  createCurvedFaceShellAndFx() {
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 1024;
    this.faceCanvas.height = 768;
    this.fCtx = this.faceCanvas.getContext('2d');
    this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTexture.needsUpdate = true;

    const shellW = 2.40;
    const shellH = 1.80;
    const shellGeo = new THREE.PlaneGeometry(shellW, shellH, 60, 45);
    const pos = shellGeo.attributes.position;

    if (this.mochiMesh) {
      this.mochiMesh.updateMatrixWorld(true);
      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3();
      const dir = new THREE.Vector3(0, 0, -1);

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i) - 0.02; // Centered slightly below equator for Kawaii Baby-Schema ratio
        origin.set(vx, vy, 3.0);
        raycaster.set(origin, dir);
        const hits = raycaster.intersectObject(this.mochiMesh, false);
        if (hits && hits.length > 0) {
          pos.setXYZ(i, vx, vy, hits[0].point.z + 0.016);
        } else {
          const r2 = Math.max(0, 1.0 - (vx * vx) / (1.52 * 1.52) - (vy * vy) / (1.12 * 1.12));
          pos.setXYZ(i, vx, vy, Math.sqrt(r2) * 1.24 + 0.016);
        }
      }
      shellGeo.computeVertexNormals();
    }

    this.faceShellMat = new THREE.MeshBasicMaterial({
      map: this.faceTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    this.faceShellMesh = new THREE.Mesh(shellGeo, this.faceShellMat);
    this.faceShellMesh.renderOrder = 1010;
    this.faceGroup.add(this.faceShellMesh);

    // =========================================================================
    // 10b. TRUE BEHIND-MASCOT LIVING VOLUMETRIC FIRE & SMOKE AURA LAYER (z = -0.06)
    // Sits BEHIND mochiMesh, earsGroup, and hornsGroup with depthTest: true
    // and runs a real-time WebGL GLSL 4-octave FBM curl-advection & blackbody shader!
    // =========================================================================
    this.auraBackCanvas = document.createElement('canvas');
    this.auraBackCanvas.width = 1024;
    this.auraBackCanvas.height = 1024;
    this.auraBackCtx = this.auraBackCanvas.getContext('2d');
    this.auraBackTexture = new THREE.CanvasTexture(this.auraBackCanvas);

    const auraBackGeo = new THREE.PlaneGeometry(4.30, 4.30, 1, 1);
    this.auraBackUniforms = {
      uMap: { value: this.auraBackTexture },
      uTime: { value: 0.0 },
      uMarah: { value: 0.0 },
      uFurious: { value: 0.0 }
    };
    this.auraBackMat = new THREE.ShaderMaterial({
      uniforms: this.auraBackUniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform float uMarah;
        uniform float uFurious;
        varying vec2 vUv;

        float hash21(vec2 p) {
          p = fract(p * vec2(234.34, 435.345));
          p += dot(p, p + 34.23);
          return fract(p.x * p.y);
        }
        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
          for (int i = 0; i < 4; i++) {
            v += a * noise2D(p);
            p = rot * p * 2.02;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          float t = uTime * 2.6;
          float n1 = fbm(vUv * vec2(6.0, 4.4) + vec2(0.0, -t));
          float n2 = fbm(vUv * vec2(10.2, 7.2) + vec2(3.7, -t * 1.4) + n1 * 0.35);

          float warpAmp = 0.014 * (uMarah * 0.45 + uFurious * 1.15);
          vec2 warpedUv = vUv + vec2((n1 - 0.5) * warpAmp, (n2 - 0.5) * warpAmp * 1.35);
          vec4 texColor = texture2D(uMap, clamp(warpedUv, 0.002, 0.998));

          // Guarantee ZERO flat viewport clipping at top, bottom, left, or right borders!
          float edgeMask = smoothstep(0.005, 0.085, vUv.x) * smoothstep(0.995, 0.915, vUv.x)
                         * smoothstep(0.005, 0.075, vUv.y) * smoothstep(0.995, 0.915, vUv.y);

          float flicker = 1.0 + (n1 - 0.48) * 0.16;
          vec3 finalRgb = clamp(texColor.rgb * flicker, 0.0, 1.0);
          gl_FragColor = vec4(finalRgb, texColor.a * edgeMask);
        }
      `
    });
    this.auraBackMesh = new THREE.Mesh(auraBackGeo, this.auraBackMat);
    this.auraBackMesh.position.set(0, 0.08, -0.08);
    this.auraBackMesh.renderOrder = 1;
    this.mochiGroup.add(this.auraBackMesh);

    // Floating 3D Storyboard FX Symbol Layer (///, 💢, ✨, !!, ?, Zz, sweat drops, shiver arcs)
    this.fxCanvas = document.createElement('canvas');
    this.fxCanvas.width = 1024;
    this.fxCanvas.height = 800;
    this.fxCtx = this.fxCanvas.getContext('2d');
    this.fxTexture = new THREE.CanvasTexture(this.fxCanvas);

    const fxGeo = new THREE.PlaneGeometry(3.56, 2.78, 1, 1);
    this.fxOverlayMat = new THREE.MeshBasicMaterial({
      map: this.fxTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.fxOverlayMesh = new THREE.Mesh(fxGeo, this.fxOverlayMat);
    this.fxOverlayMesh.position.set(0, 0.20, 0.84);
    this.fxOverlayMesh.renderOrder = 1050;
    this.mochiGroup.add(this.fxOverlayMesh);
  }

  /**
   * Resolves any mood alias (Indonesian Storyboard name, English name, or legacy name)
   * into its canonical Storyboard Expression Descriptor.
   */
  resolveMoodDescriptor(moodName) {
    const m = String(moodName || 'dots').toLowerCase().trim();
    const TABLE = {
      // Row 1: From Calm to Furious
      dots: {
        id: 'netral', eyeType: 'normal', eyeScaleX: 1.0, eyeScaleY: 1.0,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 0, browY: 0, browAngleL: 0, browAngleR: 0, browArch: 0.3,
        mouthType: 'w', fxType: 'rays_green_3',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      netral: null, calm: null, neutral: null,

      netral_2: {
        id: 'netral_2', eyeType: 'normal', eyeScaleX: 1.0, eyeScaleY: 1.0,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 0, browY: 0, browAngleL: 0, browAngleR: 0, browArch: 0.3,
        mouthType: 'w', fxType: 'rays_green_2',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      neutral_2: null,

      tegas: {
        id: 'tegas', eyeType: 'normal', eyeScaleX: 1.0, eyeScaleY: 0.98,
        upperLidL: 0.24, upperLidR: 0.24, lidAngleL: 0.34, lidAngleR: -0.34,
        browAlpha: 1.0, browY: 16, browAngleL: 0.38, browAngleR: -0.38, browArch: 0.10,
        innerBrowTick: 1,
        mouthType: 'caret', fxType: 'anger_vein',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      firm: null, serious: null,

      sinis: {
        id: 'sinis', eyeType: 'normal', eyeScaleX: 0.98, eyeScaleY: 0.94,
        upperLidL: 0.46, upperLidR: 0.40, lidAngleL: 0.08, lidAngleR: -0.12,
        gazeBiasX: -14, gazeBiasY: 4,
        browAlpha: 1.0, browYL: 10, browYR: -18, browAngleL: 0.12, browAngleR: -0.18, browArch: 0.45,
        mouthType: 'smirk_tongue', fxType: 'sparkles_right',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: -0.04, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      skeptical: null, smirk: null,

      gembira: {
        id: 'gembira', eyeType: 'happy_arch', eyeScaleX: 1.0, eyeScaleY: 1.0,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 0.95, browY: -22, browAngleL: -0.14, browAngleR: 0.14, browArch: 0.85,
        mouthType: 'happy_open_tall', fxType: 'rays_gold_3',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'joy_high'
      },
      happy: null, joy: null,

      empati: {
        id: 'empati', eyeType: 'normal', eyeScaleX: 1.02, eyeScaleY: 1.02,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 1.0, browY: -12, browAngleL: -0.36, browAngleR: 0.36, browArch: 0.35,
        mouthType: 'tiny_3', fxType: 'sweat_both',
        takut: 0, marah: 0, furious: 0, pout: 0.65,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0.03, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      empathetic: null, pout: null,

      sangat_marah: {
        id: 'sangat_marah', eyeType: 'demon_red', eyeScaleX: 1.04, eyeScaleY: 0.96,
        upperLidL: 0.40, upperLidR: 0.40, lidAngleL: 0.44, lidAngleR: -0.44,
        browAlpha: 1.0, browY: 22, browAngleL: 0.46, browAngleR: -0.46, browArch: 0.08,
        bridgeCrease: 2,
        mouthType: 'furious_roar', fxType: 'anger_vein_demon',
        takut: 0, marah: 0, furious: 1.0, pout: 0,
        horns: 1, ears: 0.64, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 1.0,
        handPose: 'hidden'
      },
      furious: null, demon: null,

      // Row 2: 8 Everyday Expressions
      senang: {
        id: 'senang', eyeType: 'happy_arch', eyeScaleX: 1.0, eyeScaleY: 1.0,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 0.92, browY: -20, browAngleL: -0.14, browAngleR: 0.14, browArch: 0.85,
        mouthType: 'happy_open_wide', fxType: 'senang_combo',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'happy_wave'
      },
      happy_soft: null, glad: null,

      kaget: {
        id: 'kaget', eyeType: 'shocked', eyeScaleX: 0.94, eyeScaleY: 1.04,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 1.0, browY: -26, browAngleL: -0.22, browAngleR: 0.22, browArch: 0.78,
        mouthType: 'surprised_o', fxType: 'exclamation_double',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'shock_flail'
      },
      surprised: null, shock: null,

      sedih: {
        id: 'sedih', eyeType: 'watery', eyeScaleX: 1.02, eyeScaleY: 1.04,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 1.0, browY: -14, browAngleL: -0.38, browAngleR: 0.38, browArch: 0.32,
        mouthType: 'sad_cry', fxType: 'none',
        takut: 0, marah: 0, furious: 0, pout: 0.35,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 1.0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      sad: null, crying: null,

      kesal: {
        id: 'kesal', eyeType: 'normal', eyeScaleX: 0.98, eyeScaleY: 0.94,
        upperLidL: 0.42, upperLidR: 0.42, lidAngleL: 0.26, lidAngleR: -0.26,
        browAlpha: 1.0, browY: 14, browAngleL: 0.34, browAngleR: -0.34, browArch: 0.08,
        innerBrowTick: 1, bridgeCrease: 1,
        mouthType: 'caret', fxType: 'anger_vein',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      annoyed: null, irritated: null,

      penasaran: {
        id: 'penasaran', eyeType: 'normal', eyeScaleX: 1.0, eyeScaleY: 1.02,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        gazeBiasX: -12, gazeBiasY: -12,
        browAlpha: 1.0, browY: -18, browAngleL: -0.28, browAngleR: 0.28, browArch: 0.48,
        mouthType: 'caret_small', fxType: 'question_purple',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0.06, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      curious: null, question: null,

      lelah: {
        id: 'lelah', eyeType: 'normal', eyeScaleX: 0.98, eyeScaleY: 0.92,
        upperLidL: 0.56, upperLidR: 0.56, lidAngleL: -0.16, lidAngleR: 0.16,
        browAlpha: 1.0, browY: -6, browAngleL: -0.30, browAngleR: 0.30, browArch: 0.22,
        mouthType: 'wavy_sigh', fxType: 'zz_teal',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: -0.03, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      tired: null, sleepy: null,

      takut: {
        id: 'takut', eyeType: 'normal', eyeScaleX: 0.94, eyeScaleY: 1.02,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 1.0, browY: -20, browAngleL: -0.40, browAngleR: 0.40, browArch: 0.35,
        mouthType: 'scared_scream', fxType: 'shiver_lines',
        takut: 1.0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      scared: null, fear: null,

      // Row 3 Middle: Stage 2 Anger (Flushed Pink Body + Red Eyes + Organic Ear-Vent Steam + Punching Fists + 💢)
      marah: {
        id: 'marah', eyeType: 'angry_red', eyeScaleX: 1.0, eyeScaleY: 0.96,
        upperLidL: 0.36, upperLidR: 0.36, lidAngleL: 0.38, lidAngleR: -0.38,
        browAlpha: 1.0, browY: 18, browAngleL: 0.42, browAngleR: -0.42, browArch: 0.08,
        innerBrowTick: 1, bridgeCrease: 1,
        mouthType: 'caret', fxType: 'anger_marah_fire',
        takut: 0, marah: 1.0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 1, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0.82,
        handPose: 'hidden'
      },
      angry: null, steaming: null,

      // Legacy playful moods
      wink: {
        id: 'wink', eyeType: 'wink_right', eyeScaleX: 1.0, eyeScaleY: 1.0,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 0, browY: 0, browAngleL: 0, browAngleR: 0, browArch: 0.3,
        mouthType: 'w', fxType: 'sparkles_right',
        takut: 0, marah: 0, furious: 0, pout: 0,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0.04, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      },
      hearts: {
        id: 'hearts', eyeType: 'heart_eyes', eyeScaleX: 1.0, eyeScaleY: 1.0,
        upperLidL: 0, upperLidR: 0, lidAngleL: 0, lidAngleR: 0,
        browAlpha: 0, browY: 0, browAngleL: 0, browAngleR: 0, browArch: 0.3,
        mouthType: 'w', fxType: 'sparkles_right',
        takut: 0, marah: 0, furious: 0, pout: 0.3,
        horns: 0, ears: 1, steam: 0, empatiPaws: 0, headTilt: 0, tearFlow: 0, eyeRedGlow: 0,
        handPose: 'hidden'
      }
    };

    TABLE.netral = TABLE.dots;
    TABLE.calm = TABLE.dots;
    TABLE.neutral = TABLE.dots;
    TABLE.neutral_2 = TABLE.netral_2;
    TABLE.firm = TABLE.tegas;
    TABLE.serious = TABLE.tegas;
    TABLE.skeptical = TABLE.sinis;
    TABLE.smirk = TABLE.sinis;
    TABLE.happy = TABLE.gembira;
    TABLE.joy = TABLE.gembira;
    TABLE.empathetic = TABLE.empati;
    TABLE.pout = TABLE.empati;
    TABLE.furious = TABLE.sangat_marah;
    TABLE.demon = TABLE.sangat_marah;
    TABLE.happy_soft = TABLE.senang;
    TABLE.glad = TABLE.senang;
    TABLE.surprised = TABLE.kaget;
    TABLE.shock = TABLE.kaget;
    TABLE.sad = TABLE.sedih;
    TABLE.crying = TABLE.sedih;
    TABLE.annoyed = TABLE.kesal;
    TABLE.irritated = TABLE.kesal;
    TABLE.curious = TABLE.penasaran;
    TABLE.question = TABLE.penasaran;
    TABLE.tired = TABLE.lelah;
    TABLE.sleepy = TABLE.lelah;
    TABLE.scared = TABLE.takut;
    TABLE.fear = TABLE.takut;
    TABLE.angry = TABLE.marah;
    TABLE.steaming = TABLE.marah;

    return TABLE[m] || TABLE.dots;
  }

  /**
   * Synchronizes spring targets (or snaps immediately when `immediate === true`)
   * for skin states, 3D horns/ears/steam/empati-paws, expressive 3D hands, and curved 3D face shell.
   */
  syncMoodTargets(immediate = false) {
    const desc = this.resolveMoodDescriptor(this.mood);
    this._currentMoodDesc = desc;

    if (immediate) {
      this.skinBlend.takut = desc.takut;
      this.skinBlend.marah = desc.marah;
      this.skinBlend.furious = desc.furious;
      this.skinBlend.pout = desc.pout;
      this.morphRig.hornScale = desc.horns;
      this.morphRig.earScale = desc.ears;
      this.morphRig.steamScale = desc.steam;
      this.morphRig.empatiPawScale = desc.empatiPaws;
      this.updateSkinBlush();
      this.applyMorphRigMeshes();
      this.updatePaws(0.016, true);
    }
    this.renderCurvedFaceAndFx();
  }

  applyMorphRigMeshes() {
    const rig = this.morphRig;
    const hs = Math.max(0.0, rig.hornScale || 0);
    if (this.hornsGroup) {
      this.hornsGroup.visible = hs > 0.015;
      const s = Math.max(0.001, hs);
      this.hornsGroup.scale.set(s, s, s);
    }
    if (this.earsGroup) {
      const es = Math.max(0.001, rig.earScale);
      this.earsGroup.visible = this.showEars && (es > 0.02);
      if (this.earL && this.earR) {
        this.earL.scale.set(es, es, es);
        this.earR.scale.set(es, es, es);
        // When demon horns emerge, tuck the dark cat/demon ears right beneath the outer base of the horns!
        this.earL.position.set(-0.62 - hs * 0.30, 0.98 - hs * 0.50, 0.40 - hs * 0.20);
        this.earR.position.set(0.62 + hs * 0.30, 0.98 - hs * 0.50, 0.40 - hs * 0.20);
        this.earL.rotation.z = Math.PI * (0.13 + hs * 0.15);
        this.earR.rotation.z = -Math.PI * (0.13 + hs * 0.15);
      }
    }
    if (this.steamGroup) {
      const ss = Math.max(0.0, rig.steamScale || 0);
      this.steamGroup.visible = ss > 0.015;
      const s = Math.max(0.001, ss);
      this.steamGroup.scale.set(s, s, s);
    }
    if (this.tailGroup) {
      const hideTailForFire = ((this.skinBlend && (this.skinBlend.furious > 0.15 || this.skinBlend.marah > 0.15)) || hs > 0.15);
      this.tailGroup.visible = this.showTail && !hideTailForFire;
    }
    if (this.empatiPawsGroup) {
      this.empatiPawsGroup.visible = rig.empatiPawScale > 0.015;
      const ps = Math.max(0.001, rig.empatiPawScale);
      const breath = Math.sin(this.time * 3.2) * 0.015;
      this.empatiPawsGroup.scale.set(ps, ps, ps);
      this.empatiPawsGroup.position.y = breath;
    }
    if (this.camera) {
      const wM = (this.skinBlend && this.skinBlend.marah) ? Math.max(0, this.skinBlend.marah) : 0;
      const wF = Math.max(hs, (this.skinBlend && this.skinBlend.furious) ? this.skinBlend.furious : 0);
      this.camera.position.z = 5.05 + wM * 0.08 + wF * 0.16;
      this.camera.position.y = 0.08 + wM * 0.02 + wF * 0.04;
      if (this.ambientLight && this.hemiLight) {
        this.ambientLight.intensity = 1.92 - wF * 0.52;
        this.hemiLight.intensity = 0.72 * (1.0 - wF * 0.65);
      }
    }
  }

  /**
   * Renders the 1024x768 Curved 3D Face Shell & 1024x800 Floating Storyboard FX Overlay.
   * Implements all 15 Storyboard Expressions + all 12 Phonetic & 15 AIUEO Toothless Mouth Visemes!
   */
  renderCurvedFaceAndFx() {
    if (!this.fCtx || !this.faceCanvas) return;
    const ctx = this.fCtx;
    const w = 1024;
    const h = 768;
    ctx.clearRect(0, 0, w, h);

    const desc = this._currentMoodDesc || this.resolveMoodDescriptor(this.mood);
    const rig = this.mouthRig || { open: 0, width: 1.0, smile: 0.28, roundness: 0, pucker: 0, presence: 0, headPitch: 0, headRoll: 0, headYaw: 0 };
    const sp = (!this._isStaticChartRenderer && rig.presence) ? Math.max(0, Math.min(1, rig.presence)) : 0;
    const cheekPush = sp * Math.max(0, (rig.open || 0) * 0.52 + (rig.smile || 0) * 0.56 - (rig.roundness || 0) * 0.20);
    const roundWonder = sp * (rig.roundness || 0) * Math.min(1, (rig.open || 0) * 1.4);
    const blinkScaleY = Math.max(0.08, 1.0 - Math.sin((this.blinkFactor || 0) * Math.PI));

    // Subtle 2.5D spherical face parallax coupled to conversational head yaw/pitch so mouth, eyes & cheeks move as ONE 3D head!
    const faceParallaxX = sp * (rig.headYaw || 0) * 185;
    const faceParallaxY = sp * (rig.headPitch || 0) * 145;

    // Subtle gaze tracking from head rotation + conversational speech engagement + mood gaze bias
    const gazeX = (this.currentRot ? this.currentRot.y * 28 : 0) + (rig.headYaw || 0) * 160 * sp + (desc.gazeBiasX || 0);
    const gazeY = (this.currentRot ? this.currentRot.x * 20 : 0) + (rig.headPitch || 0) * 120 * sp + (desc.gazeBiasY || 0);

    // High-frequency micro-tremble for 'Takut' (Scared)
    const trembleX = (desc.id === 'takut' ? Math.sin(this.time * 48) * 3.2 : 0) + faceParallaxX;
    const trembleY = (desc.id === 'takut' ? Math.cos(this.time * 54) * 2.2 : 0) + faceParallaxY;

    const leftEyeX = 282 + trembleX;
    const rightEyeX = 742 + trembleX;
    const eyeY = 412 + trembleY - cheekPush * 7.5;

    // -------------------------------------------------------------------------
    // 0a. CONTAINED ELLIPTICAL BROW SHADOW FOR 'SANGAT MARAH'
    // Strictly fades to 0.0 well inside the 1024x768 faceCanvas bounds so ZERO rectangular edges ever appear!
    // -------------------------------------------------------------------------
    if (desc.id === 'sangat_marah') {
      ctx.save();
      ctx.translate(512, 365);
      ctx.scale(1.65, 1.0);
      const faceDarkGrad = ctx.createRadialGradient(0, 0, 15, 0, 0, 185);
      faceDarkGrad.addColorStop(0.00, 'rgba(8, 2, 4, 0.72)');
      faceDarkGrad.addColorStop(0.55, 'rgba(14, 3, 6, 0.38)');
      faceDarkGrad.addColorStop(1.00, 'rgba(24, 4, 8, 0.0)');
      ctx.fillStyle = faceDarkGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 185, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------------------
    // 0. KAWAII CHEEK BLUSH OVALS (Lifts & warms organically with Mochi's speech!)
    // -------------------------------------------------------------------------
    const baseBlush = desc.blushAlpha !== undefined ? desc.blushAlpha : 0.72;
    const blushA = Math.min(0.95, baseBlush + cheekPush * 0.14);
    if (blushA > 0.02) {
      const blushLiftY = cheekPush * 16 - sp * (rig.roundness || 0) * 5;
      const blushShiftX = cheekPush * 6 - sp * (rig.pucker || 0) * 8;
      const drawCheekBlush = (bx, by) => {
        ctx.save();
        ctx.translate(bx, by);
        const bGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 118);
        if (desc.id === 'sangat_marah') {
          bGrad.addColorStop(0.00, `rgba(255, 42, 24, ${blushA * 0.78})`);
          bGrad.addColorStop(0.55, `rgba(220, 20, 16, ${blushA * 0.38})`);
          bGrad.addColorStop(1.00, 'rgba(220, 20, 16, 0.0)');
        } else if (desc.id === 'marah') {
          bGrad.addColorStop(0.00, `rgba(255, 75, 105, ${blushA * 0.85})`);
          bGrad.addColorStop(0.58, `rgba(255, 105, 135, ${blushA * 0.42})`);
          bGrad.addColorStop(1.00, 'rgba(255, 105, 135, 0.0)');
        } else {
          bGrad.addColorStop(0.00, `rgba(255, 118, 156, ${blushA * 0.78})`);
          bGrad.addColorStop(0.55, `rgba(255, 148, 180, ${blushA * 0.38})`);
          bGrad.addColorStop(1.00, 'rgba(255, 168, 195, 0.0)');
        }
        ctx.scale(1.0 + cheekPush * 0.06, 0.56 + cheekPush * 0.04);
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 118, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawCheekBlush(192 - blushShiftX + trembleX * 0.5, 514 - blushLiftY + trembleY * 0.5);
      drawCheekBlush(832 + blushShiftX + trembleX * 0.5, 514 - blushLiftY + trembleY * 0.5);
    }

    // -------------------------------------------------------------------------
    // 1. WATERFALL TEARS FOR 'SEDIH' (Drawn behind eyes/mouth on lower cheeks)
    // -------------------------------------------------------------------------
    const tearFlow = desc.tearFlow || 0;
    if (tearFlow > 0.02) {
      const drawWaterfallTear = (ex, isLeft) => {
        ctx.save();
        ctx.globalAlpha = tearFlow;
        const dir = isLeft ? -1 : 1;
        const startX = ex + dir * 38;
        const startY = eyeY + 74;
        const endX = ex + dir * 68;
        const endY = 716;

        // Glossy aqua-blue waterfall stream
        const tGrad = ctx.createLinearGradient(startX, startY, endX, endY);
        tGrad.addColorStop(0.00, '#E0F2FE');
        tGrad.addColorStop(0.25, '#7DD3FC');
        tGrad.addColorStop(0.68, '#38BDF8');
        tGrad.addColorStop(1.00, '#0284C7');

        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.moveTo(startX - 32, startY);
        ctx.bezierCurveTo(startX - 48, startY + 95, endX - 54, endY - 70, endX - 44, endY);
        ctx.bezierCurveTo(endX - 22, endY + 32, endX + 32, endY + 32, endX + 46, endY);
        ctx.bezierCurveTo(endX + 54, endY - 70, startX + 44, startY + 95, startX + 28, startY);
        ctx.closePath();
        ctx.fill();

        // Tear puddle splash at bottom of cheek
        ctx.beginPath();
        ctx.ellipse(endX + dir * 6, endY + 8, 54, 22, dir * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Crisp white vertical specular reflection streaks inside tear stream
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX - 8, startY + 26);
        ctx.quadraticCurveTo(startX - 18, (startY + endY) * 0.5, endX - 14, endY - 12);
        ctx.stroke();

        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(endX + dir * 10, endY + 10, 18, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.restore();
      };
      drawWaterfallTear(leftEyeX, true);
      drawWaterfallTear(rightEyeX, false);
    }

    // -------------------------------------------------------------------------
    // 2. EYES (Balanced 122x130 Glossy 3D Feline Iris, Happy Arches, Angry & Demon Red)
    // -------------------------------------------------------------------------
    const drawSingleEye = (cx, cy, isLeft) => {
      ctx.save();
      ctx.translate(cx, cy);

      if (desc.eyeType === 'wink_right' && !isLeft) {
        // Playful wink arch on right eye
        ctx.strokeStyle = '#1E1115';
        ctx.lineWidth = 28;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 22, 104, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (desc.eyeType === 'happy_arch') {
        // Thick joyous upward-curving crescent arch (⌒ ⌒) matching Gembira & Senang 1:1
        ctx.scale(1.0, blinkScaleY);
        ctx.fillStyle = '#1E1115';
        ctx.beginPath();
        ctx.moveTo(-116, 26);
        ctx.bezierCurveTo(-84, -86, 84, -86, 116, 26);
        ctx.bezierCurveTo(122, 42, 100, 50, 88, 34);
        ctx.bezierCurveTo(58, -38, -58, -38, -88, 34);
        ctx.bezierCurveTo(-100, 50, -122, 42, -116, 26);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }

      if (desc.eyeType === 'heart_eyes') {
        const pulse = 1.0 + Math.sin(this.time * 6.5) * 0.08;
        ctx.scale(pulse * 1.28, pulse * 1.28 * blinkScaleY);
        ctx.fillStyle = '#FF2E63';
        ctx.beginPath();
        ctx.moveTo(0, 58);
        ctx.bezierCurveTo(-88, -10, -98, -78, -42, -78);
        ctx.bezierCurveTo(-12, -78, 0, -48, 0, -48);
        ctx.bezierCurveTo(0, -48, 12, -78, 42, -78);
        ctx.bezierCurveTo(98, -78, 88, -10, 0, 58);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }

      const rx = 122 * (desc.eyeScaleX || 1.0) * (1.0 + cheekPush * 0.022 + roundWonder * 0.022);
      const ry = 130 * (desc.eyeScaleY || 1.0) * (1.0 - cheekPush * 0.056 + roundWonder * 0.032) * blinkScaleY;
      const upperLid = isLeft ? (desc.upperLidL || 0) : (desc.upperLidR || 0);
      const lidAngle = isLeft ? (desc.lidAngleL || 0) : (desc.lidAngleR || 0);

      // Clip to oval eye boundary AND custom upper eyelid plane
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, isLeft ? -0.04 : 0.04, 0, Math.PI * 2);
      ctx.clip();

      if (upperLid > 0.01) {
        // Clip out everything above the angled upper eyelid line
        ctx.save();
        const lidY = -ry + upperLid * (ry * 1.62);
        ctx.beginPath();
        ctx.translate(0, lidY);
        ctx.rotate(lidAngle);
        ctx.rect(-rx * 2.4, 0, rx * 4.8, ry * 3.6);
        ctx.restore();
        ctx.clip();
      }

      // Base Iris Fill
      if (desc.eyeType === 'demon_red') {
        // Fiery glowing scarlet-orange demon eye (Sangat Marah) matching ref_row1_demon_zoom.png 1:1
        const dGrad = ctx.createRadialGradient(gazeX * 0.35, gazeY * 0.35 + 16, 6, 0, 10, ry * 1.02);
        dGrad.addColorStop(0.00, '#FFFAC2');
        dGrad.addColorStop(0.18, '#FFD438');
        dGrad.addColorStop(0.38, '#FF6A00');
        dGrad.addColorStop(0.68, '#E6141E');
        dGrad.addColorStop(0.90, '#8A040C');
        dGrad.addColorStop(1.00, '#2B0104');
        ctx.fillStyle = dGrad;
        ctx.fillRect(-rx * 1.5, -ry * 1.5, rx * 3, ry * 3);

        // Crisp white-gold upper-left catchlight tucked under angled upper lid
        ctx.fillStyle = '#FFFDF2';
        ctx.beginPath();
        ctx.ellipse(-40 + gazeX * 0.3, -24 + gazeY * 0.3, 22, 16, -0.28, 0, Math.PI * 2);
        ctx.fill();

      } else if (desc.eyeType === 'angry_red') {
        // Stage 2 Marah: Deep dark-crimson eye with glowing ruby lower crescent
        const aGrad = ctx.createRadialGradient(gazeX * 0.4, gazeY * 0.4 + 38, 10, 0, 0, ry);
        aGrad.addColorStop(0.00, '#FF1E38');
        aGrad.addColorStop(0.45, '#A80A22');
        aGrad.addColorStop(0.78, '#2B060D');
        aGrad.addColorStop(1.00, '#140307');
        ctx.fillStyle = aGrad;
        ctx.fillRect(-rx * 1.5, -ry * 1.5, rx * 3, ry * 3);

        // Primary upper-left white catchlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-36 + gazeX * 0.35, -28 + gazeY * 0.35, 34, 0, Math.PI * 2);
        ctx.fill();

        // Secondary lower-right ruby-white catchlight
        ctx.fillStyle = 'rgba(255, 215, 225, 0.92)';
        ctx.beginPath();
        ctx.arc(36 + gazeX * 0.35, 34 + gazeY * 0.35, 16, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Classic Glossy Dark-Espresso Feline Eye with Warm Bronze Lower Cornea Reflection
        const eGrad = ctx.createLinearGradient(0, -ry, 0, ry);
        eGrad.addColorStop(0.00, '#11090C');
        eGrad.addColorStop(0.60, '#1D1115');
        eGrad.addColorStop(1.00, '#4E2E35');
        ctx.fillStyle = eGrad;
        ctx.fillRect(-rx * 1.5, -ry * 1.5, rx * 3, ry * 3);

        // Warm lower crescent iris reflection
        ctx.strokeStyle = 'rgba(130, 82, 90, 0.58)';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(gazeX * 0.3, gazeY * 0.3 + 6, rx * 0.65, Math.PI * 0.18, Math.PI * 0.82);
        ctx.stroke();

        // 1. Big primary upper-left sparkling white catchlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-36 + gazeX * 0.45, -34 + gazeY * 0.45, 40, 0, Math.PI * 2);
        ctx.fill();

        // 2. Medium lower-right sparkling catchlight
        ctx.beginPath();
        ctx.arc(38 + gazeX * 0.45, 34 + gazeY * 0.45, 20, 0, Math.PI * 2);
        ctx.fill();

        // 3. Tiny upper-right pinpoint glint
        ctx.beginPath();
        ctx.arc(18 + gazeX * 0.45, -48 + gazeY * 0.45, 9, 0, Math.PI * 2);
        ctx.fill();

        // 4. Extra watery lower-edge teardrops for 'Empati' & 'Sedih'
        if (desc.eyeType === 'watery') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
          ctx.beginPath();
          ctx.ellipse(-28, 66, 18, 13, 0.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(14, 78, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw crisp upper eyelid lash line when upperLid > 0.01
      if (upperLid > 0.01) {
        const lidY = -ry + upperLid * (ry * 1.62);
        ctx.save();
        ctx.translate(0, lidY);
        ctx.rotate(lidAngle);
        ctx.strokeStyle = desc.eyeType === 'demon_red' ? '#1A070A' : '#1A0E12';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-rx * 1.2, 0);
        ctx.lineTo(rx * 1.2, 0);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    };

    drawSingleEye(leftEyeX, eyeY, true);
    drawSingleEye(rightEyeX, eyeY, false);

    // -------------------------------------------------------------------------
    // 3. EYEBROWS, INNER BROW TICKS & FOREHEAD BRIDGE CREASES
    // -------------------------------------------------------------------------
    if ((desc.browAlpha || 0) > 0.02) {
      const drawBrow = (bx, by, angle, isLeft) => {
        ctx.save();
        ctx.globalAlpha = desc.browAlpha;
        ctx.translate(bx, by);
        ctx.rotate(angle);
        ctx.strokeStyle = desc.id === 'sangat_marah' ? '#160608' : '#231317';
        const isBoldBrow = (desc.id === 'tegas' || desc.id === 'kesal' || desc.id === 'marah' || desc.id === 'sangat_marah');
        ctx.lineWidth = isBoldBrow ? 20 : 15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const archH = (desc.browArch || 0.25) * 36;
        ctx.beginPath();
        ctx.moveTo(-74, 8);
        ctx.quadraticCurveTo(0, -archH, 74, 8);
        ctx.stroke();

        // Cute inner vertical brow tick on Tegas / Kesal / Marah (matching reference!)
        if (desc.innerBrowTick) {
          const innerX = isLeft ? 72 : -72;
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.moveTo(innerX, 6);
          ctx.lineTo(innerX + (isLeft ? 8 : -8), -22);
          ctx.stroke();
        }
        ctx.restore();
      };

      const browSpeechLift = sp * ((rig.open || 0) * 11 + (rig.roundness || 0) * 5);
      const byL = 256 + (desc.browYL !== undefined ? desc.browYL : (desc.browY || 0)) - browSpeechLift + trembleY;
      const byR = 256 + (desc.browYR !== undefined ? desc.browYR : (desc.browY || 0)) - browSpeechLift + trembleY;
      drawBrow(leftEyeX + 8, byL, desc.browAngleL || 0, true);
      drawBrow(rightEyeX - 8, byR, desc.browAngleR || 0, false);
    }

    // Bridge creases between angry eyes (Kesal, Marah, Sangat Marah)
    if (desc.bridgeCrease) {
      ctx.save();
      ctx.strokeStyle = desc.id === 'sangat_marah' ? 'rgba(20, 6, 8, 0.88)' : 'rgba(165, 95, 112, 0.68)';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(486, 352);
      ctx.quadraticCurveTo(512, 344, 538, 352);
      ctx.stroke();
      if (desc.bridgeCrease >= 2) {
        ctx.beginPath();
        ctx.moveTo(494, 372);
        ctx.quadraticCurveTo(512, 366, 530, 372);
        ctx.stroke();
      }
      ctx.restore();
    }

    // -------------------------------------------------------------------------
    // 4. MOUTH RENDERER: UNIFIED 3D SCULPTED DAIFUKU VISCOELASTIC MOUTH RIG
    // -------------------------------------------------------------------------
    const mouthX = 512 + trembleX * 0.8;
    const mouthY = 482 + trembleY * 0.8;

    if (this._isStaticChartRenderer && this.activeViseme) {
      // For static showcase cards (Board 2 & 3), draw the exact static viseme chart reference
      ctx.save();
      ctx.translate(mouthX, mouthY + 34);
      ctx.scale(1.42, 1.42);
      this.drawMochiVisemeMouth3D(ctx, 0, 0, this.activeViseme, this.visemeIntensity);
      ctx.restore();
    } else {
      // Unified 3D Daifuku viscoelastic parametric mouth deformation (Zero Threshold Pops, 100% Toothless!)
      this.drawOrganicMochiMouth3D(ctx, mouthX, mouthY, rig, desc);
    }

    if (this.faceTexture) {
      this.faceTexture.needsUpdate = true;
    }

    // -------------------------------------------------------------------------
    // 5. FLOATING 3D STORYBOARD SYMBOLS OVERLAY (fxCanvas)
    // -------------------------------------------------------------------------
    this.renderFloatingStoryboardFx(desc.fxType);
  }

  /**
   * Unified 3D Sculpted Daifuku Viscoelastic Mouth Renderer (`drawOrganicMochiMouth3D`).
   * - 100% Branchless C² Parametric Bezier Topology from `open = 0.000` to `open = 1.000`:
   *   Zero `if (kOpen < 0.02)` snap and zero `if (kRound > 0.4)` frame pop!
   * - Lush 3D Marshmallow Subsurface Lip Cushion, Chin Bounce Shadow, Velvet Maroon Oral Cavity,
   *   and Living Articulated 3D Glossy Pink Tongue matching `Storyboard Mulut A,I,U,E,O` (100% Toothless!).
   */
  drawOrganicMochiMouth3D(ctx, cx, cy, rigOrOpen, widthScale = 1.0, roundness = 0.0, baseMoodType = 'w') {
    const isRigObj = rigOrOpen && typeof rigOrOpen === 'object';
    const rig = isRigObj ? rigOrOpen : {
      open: Number(rigOrOpen) || 0,
      width: widthScale,
      smile: widthScale > 1.1 ? Math.min(1, (widthScale - 1.0) * 3.0) : 0.28,
      roundness: roundness,
      pucker: roundness > 0.7 ? (roundness - 0.7) * 2.5 : 0,
      bilabial: 0,
      tongueLift: 0,
      tongueCurl: 0,
      lipTuck: 0,
      presence: (Number(rigOrOpen) || 0) > 0.005 ? 1 : 0
    };
    const desc = (isRigObj && widthScale && typeof widthScale === 'object') ? widthScale : null;
    const moodType = desc ? (desc.mouthType || 'w') : (baseMoodType || 'w');

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smoothstep = (e0, e1, x) => {
      const t = clamp((x - e0) / Math.max(1e-5, e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    };

    const presence = clamp(rig.presence ?? 0, 0, 1);
    const kOpen = clamp(rig.open ?? 0, 0, 1);

    // When completely idle (not speaking and no active viseme), preserve all 15 static storyboard mouths 1:1
    if (!this.isTalking && !this.activeViseme && presence < 0.006 && kOpen < 0.006) {
      this.drawStoryboardExpressionMouth3D(ctx, cx, cy, moodType);
      return;
    }

    const kW = clamp(rig.width ?? 1.0, 0.66, 1.40);
    const kSmile = clamp(rig.smile ?? 0.28, 0, 1);
    const kRound = clamp(rig.roundness ?? 0, 0, 1);
    const kPucker = clamp(rig.pucker ?? 0, 0, 1);
    const kBilabial = clamp(rig.bilabial ?? 0, 0, 1);
    const kTongueLift = clamp(rig.tongueLift ?? 0, -0.45, 1.0);
    const kTongueCurl = clamp(rig.tongueCurl ?? 0, 0, 1);
    const kLipTuck = clamp(rig.lipTuck ?? 0, 0, 1);

    // Generous, plush Daifuku aperture response so vowels read warmly & clearly at every screen scale
    const lipPart = Math.pow(kOpen, 0.74);
    const sForm = smoothstep(0.0, 0.20, lipPart);
    const sTop = smoothstep(0.0, 0.22, lipPart);
    const cavAlpha = smoothstep(0.012, 0.11, lipPart);
    const bPress = kBilabial * (1.0 - smoothstep(0.0, 0.22, lipPart));

    ctx.save();
    // Natural vertical jaw drop anchor shift on the face canvas
    const yShift = lipPart * 10 - kSmile * 4 + kRound * 2;
    ctx.translate(cx, cy + yShift);

    // 1. Resting Closed Seam Anchor (coincides 100% with ω smile or ^ caret when lipPart === 0!)
    const isCaretMood = (moodType === 'caret' || moodType === 'caret_small');
    const baseRestRx = isCaretMood ? (moodType === 'caret_small' ? 34 : 44) : 52;
    const baseRestCornerY = isCaretMood ? 22 : -4;
    const baseRestLobeY = isCaretMood ? -6 : 24;
    const baseRestCenterY = isCaretMood ? -10 : -2;

    const restRx = lerp(baseRestRx, 62, bPress);
    const restCornerY = lerp(baseRestCornerY, 2, bPress);
    const restLobeY = lerp(baseRestLobeY, 2, bPress);
    const restCenterY = lerp(baseRestCenterY, 3, bPress);

    // 2. Open Speaking Parametric Coordinates (100% branchless C² math across A, I, U, E, O!)
    // - Wide/Open family (A, E, I): warm dome-cup 'A' <-> upturned D-smile 'I'/'E'
    // - Rounded family (O, U, Q/W): 100% G²-symmetrical vertical oval 'O' (0) <-> round pucker circle 'U' (o)!
    const wRound = kRound;
    const wSmile = kSmile * (1.0 - wRound * 0.90);

    const nonRoundRx = (72 + lipPart * 15) * kW;
    const roundRx = lerp(47, 28, kPucker) * (0.86 + lipPart * 0.20);
    const openRx = Math.max(24, lerp(nonRoundRx, roundRx, wRound));
    const rx = lerp(restRx, openRx, sForm);

    // Non-round vertical geometry ('A' dome-cup <-> 'I'/'E' happy D-smile)
    const aTopY = -14 - lipPart * 14;
    const smTopY = -5 - lipPart * 5;
    const nonRoundTopY = lerp(aTopY, smTopY, wSmile);
    const nonRoundDrop = lipPart * lerp(114, 86, wSmile) * (1.0 - kLipTuck * 0.34);
    const nonRoundBotY = nonRoundTopY + nonRoundDrop;
    const nonRoundCornerY = lerp(nonRoundTopY + lipPart * 38, -15 - lipPart * 4, wSmile);

    // Symmetrical Rounded vertical geometry ('O' tall vertical oval <-> 'U' cute circle — ZERO upside-down frown!)
    const roundMidY = lerp(30, 22, kPucker);
    const roundRy = lipPart * lerp(62, 37, kPucker);
    const roundTopY = roundMidY - roundRy;
    const roundBotY = roundMidY + roundRy;
    const roundCornerY = roundMidY;

    const openCornerY = lerp(nonRoundCornerY, roundCornerY, wRound);
    const cornerY = lerp(restCornerY, openCornerY, sForm);

    const philtrumSoft = (1.0 - lipPart * 0.58) * (1.0 - wRound * 0.96) * (1.0 - wSmile * 0.55) * 7.5;
    const openTopCenterBase = lerp(nonRoundTopY, roundTopY, wRound);
    const openTopCenterY = openTopCenterBase + philtrumSoft * 0.70;

    // Upper Bezier control Y: smooth dome/smile for A/E/I, exact G² vertical tangent (midY - 0.58*ry) for O/U!
    const nonRoundTopLobe1Y = lerp(nonRoundTopY - 2, lerp(nonRoundCornerY, smTopY, 0.72), wSmile);
    const nonRoundTopLobe2Y = nonRoundTopY - 2 + philtrumSoft;
    const roundTopLobe1Y = roundMidY - roundRy * 0.58;
    const roundTopLobe2Y = roundTopY;

    const topLobe1Y = lerp(restLobeY, lerp(nonRoundTopLobe1Y, roundTopLobe1Y, wRound), sTop);
    const topLobe2Y = lerp(restLobeY, lerp(nonRoundTopLobe2Y, roundTopLobe2Y, wRound), sTop);
    const topCenterY = lerp(restCenterY, openTopCenterY, sTop);

    // Lower Bezier control Y: peels smoothly downward from exact upper seam at lipPart === 0!
    const openBotY = lerp(nonRoundBotY, roundBotY, wRound);
    const sBot = smoothstep(0.0, 0.14, lipPart);
    const botCenterY = lerp(topCenterY, openBotY, sBot);

    const tuckLeft = kLipTuck * lipPart * 24 * (1.0 - wRound);
    const tuckRight = -kLipTuck * lipPart * 6 * (1.0 - wRound);

    const nonRoundBotLobe1Y = nonRoundCornerY + (nonRoundBotY - nonRoundCornerY) * 0.76;
    const nonRoundBotLobe2Y = nonRoundBotY + nonRoundDrop * 0.03;
    const roundBotLobe1Y = roundMidY + roundRy * 0.58;
    const roundBotLobe2Y = roundBotY;

    const openBotLobe1Base = lerp(nonRoundBotLobe1Y, roundBotLobe1Y, wRound);
    const openBotLobe2Base = lerp(nonRoundBotLobe2Y, roundBotLobe2Y, wRound);

    const botLobe1RY = lerp(topLobe1Y, openBotLobe1Base - tuckRight, sBot);
    const botLobe2RY = lerp(topLobe2Y, openBotLobe2Base - tuckRight * 0.5, sBot);
    const botLobe1LY = lerp(topLobe1Y, openBotLobe1Base - tuckLeft, sBot);
    const botLobe2LY = lerp(topLobe2Y, openBotLobe2Base - tuckLeft * 0.7, sBot);

    // Horizontal Bezier tangents: at wRound -> 1, u1x = b1x = rx so left/right sides of 'O' and 'U' are 100% smooth curves!
    const u1x = rx * lerp(0.80, lerp(0.78, 1.00, wRound), sTop);
    const u2x = rx * lerp(0.16, lerp(0.34, 0.58, wRound), sTop);
    const b1x = rx * lerp(0.80, lerp(0.88, 1.00, wRound), sForm);
    const b2x = rx * lerp(0.16, lerp(0.42, 0.58, wRound), sForm);

    const traceMouthAperture = () => {
      ctx.beginPath();
      ctx.moveTo(-rx, cornerY);
      ctx.bezierCurveTo(-u1x, topLobe1Y, -u2x, topLobe2Y, 0, topCenterY);
      ctx.bezierCurveTo(u2x, topLobe2Y, u1x, topLobe1Y, rx, cornerY);
      ctx.bezierCurveTo(b1x, botLobe1RY, b2x, botLobe2RY, 0, botCenterY);
      ctx.bezierCurveTo(-b2x, botLobe2LY, -b1x, botLobe1LY, -rx, cornerY);
      ctx.closePath();
    };

    // -------------------------------------------------------------------------
    // LAYER A: 3D DAIFUKU SUBSURFACE LIP FLUSH & PUCKER TORUS CUSHION
    // Blends mouth organically into Mochi's creamy marshmallow face!
    // -------------------------------------------------------------------------
    const flushStrength = clamp(cavAlpha * 0.46 + kPucker * 0.38 + bPress * 0.36 + kRound * cavAlpha * 0.18, 0, 0.82);
    if (flushStrength > 0.01) {
      const midY = (topCenterY + botCenterY) * 0.5;
      const flushRx = rx * (1.42 + kPucker * 0.45);
      const flushRy = Math.max(36, (botCenterY - topCenterY) * 0.88 + 30);
      ctx.save();
      ctx.translate(0, midY);
      ctx.scale(1.0, flushRy / Math.max(1, flushRx));
      const fGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, flushRx);
      fGrad.addColorStop(0.00, `rgba(244, 136, 170, ${flushStrength})`);
      fGrad.addColorStop(0.55, `rgba(250, 172, 198, ${flushStrength * 0.46})`);
      fGrad.addColorStop(1.00, 'rgba(255, 245, 248, 0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(0, 0, flushRx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Protruding 3D marshmallow pucker torus highlight when rounding/puckering (U / O / QW)
      const torusA = clamp((kPucker * 0.85 + kRound * 0.25) * cavAlpha, 0, 0.88);
      if (torusA > 0.03) {
        ctx.save();
        ctx.translate(0, midY);
        const trRx = rx * 1.32;
        const trRy = Math.max(32, (botCenterY - topCenterY) * 0.74 + 18);
        ctx.scale(1.0, trRy / Math.max(1, trRx));
        const rGrad = ctx.createRadialGradient(-4, -5, 6, 0, 2, trRx);
        rGrad.addColorStop(0.00, `rgba(255, 246, 250, ${torusA * 0.90})`);
        rGrad.addColorStop(0.52, `rgba(248, 196, 214, ${torusA * 0.72})`);
        rGrad.addColorStop(0.82, `rgba(232, 154, 182, ${torusA * 0.36})`);
        rGrad.addColorStop(1.00, 'rgba(232, 154, 182, 0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(0, 0, trRx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // -------------------------------------------------------------------------
    // LAYER B: 3D OUTER LIP CUSHION BEVEL, CHIN BOUNCE SHADOW & ORAL CAVITY
    // -------------------------------------------------------------------------
    if (cavAlpha > 0.01) {
      // 1. Soft 3D chin drop-shadow beneath parting lower lip
      ctx.save();
      ctx.globalAlpha = cavAlpha;
      ctx.shadowColor = 'rgba(202, 110, 140, 0.56)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      traceMouthAperture();
      ctx.fillStyle = '#3B0312';
      ctx.fill();
      ctx.restore();

      // 2. Plump rosy-pink 3D outer lip cushion bevel (sculpted marshmallow lip rim, zero white teeth!)
      ctx.save();
      ctx.globalAlpha = cavAlpha;
      traceMouthAperture();
      ctx.strokeStyle = 'rgba(238, 146, 176, 0.74)';
      ctx.lineWidth = 12;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // 3. Clipped Deep Velvet Oral Cavity + Living 3D Glossy Pink Daifuku Tongue (100% Toothless!)
      ctx.save();
      traceMouthAperture();
      ctx.clip();

      const cavTop = Math.min(topCenterY, cornerY) - 10;
      const cavBot = botCenterY + 14;
      const cavGrad = ctx.createLinearGradient(0, cavTop, 0, cavBot);
      cavGrad.addColorStop(0.00, '#2C020D');
      cavGrad.addColorStop(0.52, '#5E0820');
      cavGrad.addColorStop(1.00, '#8E1234');
      ctx.fillStyle = cavGrad;
      ctx.fillRect(-rx * 1.5, cavTop - 16, rx * 3.0, (cavBot - cavTop) + 36);

      // Soft deep throat arch for spatial 3D oral depth
      const apH = Math.max(8, botCenterY - topCenterY);
      ctx.fillStyle = 'rgba(28, 1, 8, 0.52)';
      ctx.beginPath();
      ctx.ellipse(0, topCenterY + apH * 0.42, rx * 0.54, apH * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Living Articulated 3D Pink Tongue (smoothly curls for 'L', peeks for 'TH', or cushions lower bowl!)
      const tRx = rx * (0.76 - kRound * 0.06);
      const tRy = Math.max(14, apH * (0.46 + Math.max(0, kTongueLift) * 0.14));
      const baseTongueY = botCenterY - apH * (0.24 + kTongueLift * 0.28);

      if (kTongueCurl > 0.25) {
        // Smooth blendable curled 'L' tongue sweeping upward toward palate
        ctx.save();
        ctx.globalAlpha = clamp(kTongueCurl, 0, 1);
        const lGrad = ctx.createLinearGradient(-rx * 0.6, botCenterY, rx * 0.5, topCenterY);
        lGrad.addColorStop(0.00, '#D92B5E');
        lGrad.addColorStop(0.55, '#FF5C8D');
        lGrad.addColorStop(1.00, '#FFA8C5');
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.84, botCenterY + 8);
        ctx.bezierCurveTo(-rx * 0.52, topCenterY + apH * 0.45, -8, topCenterY + apH * 0.22, rx * 0.24, topCenterY + apH * 0.08);
        ctx.bezierCurveTo(rx * 0.68, topCenterY + apH * 0.06, rx * 0.80, topCenterY + apH * 0.55, rx * 0.54, botCenterY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (kTongueCurl < 0.85) {
        ctx.save();
        ctx.globalAlpha = 1.0 - clamp((kTongueCurl - 0.25) / 0.60, 0, 1);
        const tGrad = ctx.createRadialGradient(0, baseTongueY - tRy * 0.28, 4, 0, baseTongueY + tRy * 0.25, Math.max(tRx, tRy) * 1.18);
        tGrad.addColorStop(0.00, '#FFB0CB');
        tGrad.addColorStop(0.54, '#FF5E8E');
        tGrad.addColorStop(1.00, '#C91E50');
        ctx.fillStyle = tGrad;

        // Soft wavy-top 3D Mochi tongue cushion (zero dark vertical split line!)
        const waveDepth = (1.0 - kRound * 0.65) * 0.14;
        ctx.beginPath();
        ctx.moveTo(-tRx, baseTongueY + tRy * 0.48);
        ctx.bezierCurveTo(
          -tRx * 0.85, baseTongueY - tRy * (0.82 + waveDepth),
          -tRx * 0.22, baseTongueY - tRy * (0.50 - waveDepth * 0.5),
          0, baseTongueY - tRy * (0.38 - waveDepth)
        );
        ctx.bezierCurveTo(
          tRx * 0.22, baseTongueY - tRy * (0.50 - waveDepth * 0.5),
          tRx * 0.85, baseTongueY - tRy * (0.82 + waveDepth),
          tRx, baseTongueY + tRy * 0.48
        );
        ctx.bezierCurveTo(tRx, baseTongueY + tRy * 1.25, -tRx, baseTongueY + tRy * 1.25, -tRx, baseTongueY + tRy * 0.48);
        ctx.closePath();
        ctx.fill();

        // Glossy specular moisture highlight on upper-right tongue dome
        ctx.fillStyle = 'rgba(255, 255, 255, 0.46)';
        ctx.beginPath();
        ctx.ellipse(tRx * 0.25, baseTongueY - tRy * 0.26, Math.max(5, tRx * 0.18), Math.max(3.5, tRy * 0.12), 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Inner lip ambient-occlusion rim shadow for sculpted 3D cavity depth
      ctx.strokeStyle = 'rgba(38, 2, 11, 0.78)';
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      traceMouthAperture();
      ctx.stroke();

      ctx.restore(); // End oral cavity clip
    }

    // -------------------------------------------------------------------------
    // LAYER C: SEAMLESS LIP SEAM & OUTER RIM CONTOUR + ALPHA-BLENDED DIMPLES
    // Morphs smoothly from crisp closed ω line to soft sculpted warm-plum rim!
    // -------------------------------------------------------------------------
    const openRimBlend = smoothstep(0.02, 0.22, lipPart);
    const closedLineWidth = lerp(14.5, 8.5, bPress);
    const rimLineWidth = lerp(closedLineWidth, 6.2, openRimBlend);

    // Upper lip soft specular ridge on bilabial press ('B,M,P')
    if (bPress > 0.08) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${bPress * 0.72})`;
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rx + 8, restCornerY - 6);
      ctx.bezierCurveTo(-u1x * 0.6, restCenterY - 9, u1x * 0.6, restCenterY - 9, rx - 8, restCornerY - 6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    // Smooth color transition: '#261016' (rest) -> '#6E1F38' (bilabial press) / '#4D0B20' (sculpted 3D open rim)
    const rCol = Math.round(lerp(lerp(38, 110, bPress), 77, openRimBlend));
    const gCol = Math.round(lerp(lerp(16, 31, bPress), 11, openRimBlend));
    const bCol = Math.round(lerp(lerp(22, 56, bPress), 32, openRimBlend));
    const rimAlpha = lerp(1.0, 0.78, openRimBlend);
    ctx.strokeStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${rimAlpha})`;
    ctx.lineWidth = rimLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lipPart < 0.008) {
      // Exact single-stroke seam at zero aperture so line weight never doubles
      ctx.beginPath();
      ctx.moveTo(-rx, cornerY);
      ctx.bezierCurveTo(-u1x, topLobe1Y, -u2x, topLobe2Y, 0, topCenterY);
      ctx.bezierCurveTo(u2x, topLobe2Y, u1x, topLobe1Y, rx, cornerY);
      ctx.stroke();
    } else {
      traceMouthAperture();
      ctx.stroke();
    }

    // Cute sunken corner dimple dots on bilabial 'B,M,P' closure
    if (bPress > 0.15) {
      ctx.fillStyle = `rgba(107, 29, 52, ${bPress * 0.85})`;
      ctx.beginPath();
      ctx.arc(-rx - 3, cornerY, 6.0, 0, Math.PI * 2);
      ctx.arc(rx + 3, cornerY, 6.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smooth alpha-blended corner smile dimples `(   )` on wide vowels (I, E, A) — ZERO boolean pop!
    const dimpleAlpha = smoothstep(0.38, 0.76, kSmile) * smoothstep(0.10, 0.28, lipPart) * (1.0 - kRound * 0.85) * 0.62;
    if (dimpleAlpha > 0.015) {
      const dimpleSpan = Math.max(13, (botCenterY - topCenterY) * 0.28);
      const dimpleY = cornerY + 5;
      ctx.strokeStyle = `rgba(202, 115, 142, ${dimpleAlpha})`;
      ctx.lineWidth = 7.0;
      ctx.beginPath();
      ctx.arc(-rx + dimpleSpan * 0.35, dimpleY, dimpleSpan, Math.PI * 0.72, Math.PI * 1.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx - dimpleSpan * 0.35, dimpleY, dimpleSpan, -Math.PI * 0.28, Math.PI * 0.28);
      ctx.stroke();
    }

    // Delicate pucker corner creases on tight 'U' pucker — smoothly alpha-blended!
    const puckerCreaseA = smoothstep(0.45, 0.85, kPucker) * cavAlpha * 0.42;
    if (puckerCreaseA > 0.015) {
      ctx.strokeStyle = `rgba(208, 124, 152, ${puckerCreaseA})`;
      ctx.lineWidth = 4.2;
      const pyTop = topCenterY + 6;
      const pyBot = botCenterY - 6;
      [
        [-rx + 2, pyTop, -rx - 8, pyTop - 7],
        [rx - 2, pyTop, rx + 8, pyTop - 7],
        [-rx + 2, pyBot, -rx - 8, pyBot + 7],
        [rx - 2, pyBot, rx + 8, pyBot + 7]
      ].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Draws all 15 Storyboard Expression Mouths in lush 3D Daifuku style — 100% TANPA GIGI (Zero Teeth)!
   * Calibrated 1:1 to the anatomical proportions of `media_1794044280214_5080cae0.jpg`.
   */
  drawStoryboardExpressionMouth3D(ctx, cx, cy, mouthType) {
    ctx.save();
    ctx.translate(cx, cy);

    if (mouthType === 'w') {
      // Netral: Classic sweet double-lobed Mochi Cat smile (ω) sitting right between lower inner eye curves
      ctx.strokeStyle = '#231216';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-52, -4);
      ctx.bezierCurveTo(-42, 26, -8, 26, 0, -2);
      ctx.bezierCurveTo(8, 26, 42, 26, 52, -4);
      ctx.stroke();

    } else if (mouthType === 'caret' || mouthType === 'caret_small') {
      // Tegas / Kesal / Marah / Penasaran: Firm or curious inverted caret (^)
      const span = mouthType === 'caret_small' ? 31 : 43;
      const drop = mouthType === 'caret_small' ? 22 : 30;
      const yOff = mouthType === 'caret_small' ? 10 : 16;
      ctx.strokeStyle = '#231216';
      ctx.lineWidth = mouthType === 'caret_small' ? 14 : 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-span, yOff + drop * 0.5);
      ctx.quadraticCurveTo(0, yOff - drop * 0.85, span, yOff + drop * 0.5);
      ctx.stroke();

    } else if (mouthType === 'smirk_tongue') {
      // Sinis: cute ω mouth with a cheeky pink U-tongue peeking out of center-bottom
      ctx.fillStyle = '#5E0B1E';
      ctx.beginPath();
      ctx.arc(-2, 10, 24, 0, Math.PI);
      ctx.fill();

      const tGrad = ctx.createLinearGradient(0, 4, 0, 42);
      tGrad.addColorStop(0, '#FF85A6');
      tGrad.addColorStop(1, '#FF4778');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.arc(-2, 10, 21, 0.04 * Math.PI, 0.96 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#231216';
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.strokeStyle = '#231216';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-50, -4);
      ctx.bezierCurveTo(-38, 22, -8, 22, 0, -2);
      ctx.bezierCurveTo(8, 22, 38, 20, 52, -8);
      ctx.stroke();

    } else if (mouthType === 'happy_open_tall' || mouthType === 'happy_open') {
      // Gembira (Row 1 Col 4): Tall, deep U-cup laughing mouth with ω cat top lip & huge pink tongue (NO teeth!)
      const mouthPath = () => {
        ctx.beginPath();
        ctx.moveTo(-72, -38);
        ctx.bezierCurveTo(-48, -14, -14, -14, 0, -34);
        ctx.bezierCurveTo(14, -14, 48, -14, 72, -38);
        ctx.bezierCurveTo(78, 56, 52, 146, 0, 146);
        ctx.bezierCurveTo(-52, 146, -78, 56, -72, -38);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(215, 130, 155, 0.55)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      mouthPath();
      ctx.fillStyle = '#4A0618';
      ctx.fill();
      ctx.restore();

      ctx.save();
      mouthPath();
      ctx.clip();

      const cavGrad = ctx.createLinearGradient(0, -40, 0, 146);
      cavGrad.addColorStop(0.0, '#3D0412');
      cavGrad.addColorStop(0.45, '#720B26');
      cavGrad.addColorStop(1.0, '#9E1438');
      ctx.fillStyle = cavGrad;
      ctx.fillRect(-90, -50, 180, 210);

      // Huge bright pink tongue filling the lower 75% of the tall cup
      const tgGrad = ctx.createRadialGradient(0, 74, 10, 0, 88, 86);
      tgGrad.addColorStop(0.0, '#FFA6C2');
      tgGrad.addColorStop(0.65, '#FF6694');
      tgGrad.addColorStop(1.0, '#E03468');
      ctx.fillStyle = tgGrad;
      ctx.beginPath();
      ctx.ellipse(0, 78, 68, 76, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Crisp dark-wine contour around mouth and ω upper lip
      ctx.strokeStyle = '#2B0812';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      mouthPath();
      ctx.stroke();

    } else if (mouthType === 'happy_open_wide') {
      // Senang (Row 2 Col 2): Wider, rounder laughing bowl mouth with ω cat top lip & wide pink tongue (NO teeth!)
      const mouthPath = () => {
        ctx.beginPath();
        ctx.moveTo(-84, -30);
        ctx.bezierCurveTo(-54, -8, -16, -8, 0, -26);
        ctx.bezierCurveTo(16, -8, 54, -8, 84, -30);
        ctx.bezierCurveTo(92, 42, 58, 108, 0, 108);
        ctx.bezierCurveTo(-58, 108, -92, 42, -84, -30);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(215, 130, 155, 0.55)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      mouthPath();
      ctx.fillStyle = '#4A0618';
      ctx.fill();
      ctx.restore();

      ctx.save();
      mouthPath();
      ctx.clip();

      const cavGrad = ctx.createLinearGradient(0, -32, 0, 108);
      cavGrad.addColorStop(0.0, '#3D0412');
      cavGrad.addColorStop(0.5, '#720B26');
      cavGrad.addColorStop(1.0, '#9E1438');
      ctx.fillStyle = cavGrad;
      ctx.fillRect(-100, -40, 200, 160);

      // Plump wide pink tongue
      const tgGrad = ctx.createRadialGradient(0, 58, 8, 0, 68, 74);
      tgGrad.addColorStop(0.0, '#FFA6C2');
      tgGrad.addColorStop(0.65, '#FF6694');
      tgGrad.addColorStop(1.0, '#E03468');
      ctx.fillStyle = tgGrad;
      ctx.beginPath();
      ctx.ellipse(0, 62, 74, 56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#2B0812';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      mouthPath();
      ctx.stroke();

    } else if (mouthType === 'tiny_3') {
      // Empati (Row 1 Col 5): Vertical puckered '3' / ε mouth between the eyes (enlarged 1.9x for clear legibility)
      ctx.save();
      ctx.scale(1.9, 1.9);
      ctx.fillStyle = '#FF759B';
      ctx.beginPath();
      ctx.ellipse(2, 16, 14, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2B0812';
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(-4, 2, 13, -0.45 * Math.PI, 0.48 * Math.PI);
      ctx.arc(-4, 27, 14, -0.48 * Math.PI, 0.48 * Math.PI);
      ctx.stroke();
      ctx.restore();

    } else if (mouthType === 'surprised_o') {
      // Kaget (Row 2 Col 3): Large tall bell/pear-shaped surprised open mouth (100% TANPA GIGI!)
      const kagetPath = () => {
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.bezierCurveTo(38, -14, 58, 34, 62, 86);
        ctx.bezierCurveTo(64, 130, 38, 146, 0, 146);
        ctx.bezierCurveTo(-38, 146, -64, 130, -62, 86);
        ctx.bezierCurveTo(-58, 34, -38, -14, 0, -14);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(195, 115, 138, 0.50)';
      ctx.shadowBlur = 14;
      kagetPath();
      ctx.fillStyle = '#4A0618';
      ctx.fill();
      ctx.restore();

      ctx.save();
      kagetPath();
      ctx.clip();
      ctx.fillStyle = '#4A0618';
      ctx.fillRect(-80, -25, 160, 185);

      // Diagonal-curved pink tongue filling lower half (matching Kaget in reference!)
      const tgGrad = ctx.createLinearGradient(-40, 40, 40, 146);
      tgGrad.addColorStop(0.0, '#FF94B4');
      tgGrad.addColorStop(1.0, '#E03468');
      ctx.fillStyle = tgGrad;
      ctx.beginPath();
      ctx.ellipse(10, 98, 66, 58, -0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#2B0812';
      ctx.lineWidth = 10;
      kagetPath();
      ctx.stroke();

    } else if (mouthType === 'sad_cry') {
      // Sedih (Row 2 Col 4): Pinched vertical figure-8 / peanut crying mouth (100% TANPA GIGI!)
      const sadPath = () => {
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.bezierCurveTo(28, -10, 32, 16, 18, 36);
        ctx.bezierCurveTo(36, 56, 36, 94, 0, 94);
        ctx.bezierCurveTo(-36, 94, -36, 56, -18, 36);
        ctx.bezierCurveTo(-32, 16, -28, -10, 0, -10);
        ctx.closePath();
      };
      ctx.save();
      sadPath();
      ctx.clip();
      ctx.fillStyle = '#4A0618';
      ctx.fillRect(-50, -20, 100, 130);
      ctx.fillStyle = '#FF759E';
      ctx.beginPath();
      ctx.ellipse(0, 68, 34, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#2B0812';
      ctx.lineWidth = 10;
      sadPath();
      ctx.stroke();

    } else if (mouthType === 'wavy_sigh') {
      // Lelah (Row 2 Col 7): Wavy exhausted sigh line
      ctx.strokeStyle = '#231216';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-48, 18);
      ctx.bezierCurveTo(-24, -4, -8, 24, 6, 4);
      ctx.bezierCurveTo(22, -10, 34, 18, 48, 14);
      ctx.stroke();

    } else if (mouthType === 'scared_scream') {
      // Takut (Row 2 Col 8): Large wide wavy kidney-bean screaming mouth — 100% TANPA GIGI (Zero Teeth!)
      const scaredPath = () => {
        ctx.beginPath();
        ctx.moveTo(-92, 42);
        ctx.bezierCurveTo(-96, -6, -48, -18, 0, -18);
        ctx.bezierCurveTo(48, -18, 96, -6, 92, 42);
        ctx.bezierCurveTo(96, 98, 56, 114, 0, 96);
        ctx.bezierCurveTo(-56, 114, -96, 98, -92, 42);
        ctx.closePath();
      };
      ctx.save();
      ctx.shadowColor = 'rgba(195, 115, 138, 0.50)';
      ctx.shadowBlur = 14;
      scaredPath();
      ctx.fillStyle = '#4A0516';
      ctx.fill();
      ctx.restore();

      ctx.save();
      scaredPath();
      ctx.clip();
      ctx.fillStyle = '#4A0516';
      ctx.fillRect(-110, -30, 220, 160);

      // Wavy terrified pink tongue filling lower half (Zero teeth!)
      const tGrad = ctx.createLinearGradient(0, 24, 0, 114);
      tGrad.addColorStop(0, '#FF85A8');
      tGrad.addColorStop(1, '#E03468');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.moveTo(-96, 56);
      ctx.bezierCurveTo(-48, 22, 48, 22, 96, 56);
      ctx.lineTo(96, 125);
      ctx.lineTo(-96, 125);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#2B0812';
      ctx.lineWidth = 11;
      scaredPath();
      ctx.stroke();

    } else if (mouthType === 'furious_roar') {
      // Sangat Marah (Row 1 Col 6 & Row 3 Col 3): Cute cat nose (▼) + Massive roaring mouth — 100% TANPA GIGI!
      // 1. Cute dark cat nose triangle + vertical philtrum above the roaring mouth
      ctx.fillStyle = '#120306';
      ctx.beginPath();
      ctx.moveTo(-18, -34);
      ctx.quadraticCurveTo(0, -38, 18, -34);
      ctx.quadraticCurveTo(10, -18, 0, -16);
      ctx.quadraticCurveTo(-10, -18, -18, -34);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#120306';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, -2);
      ctx.stroke();

      // 2. Massive tall trapezoid/bell roaring mouth (Zero fangs, zero teeth!)
      const roarPath = () => {
        ctx.beginPath();
        ctx.moveTo(-58, -2);
        ctx.bezierCurveTo(-24, -14, 24, -14, 58, -2);
        ctx.bezierCurveTo(102, 48, 122, 138, 104, 184);
        ctx.bezierCurveTo(78, 206, -78, 206, -104, 184);
        ctx.bezierCurveTo(-122, 138, -102, 48, -58, -2);
        ctx.closePath();
      };

      ctx.save();
      ctx.shadowColor = 'rgba(25, 2, 6, 0.82)';
      ctx.shadowBlur = 18;
      roarPath();
      ctx.fillStyle = '#38040C';
      ctx.fill();
      ctx.restore();

      ctx.save();
      roarPath();
      ctx.clip();

      const rGrad = ctx.createLinearGradient(0, -14, 0, 204);
      rGrad.addColorStop(0.0, '#2B0208');
      rGrad.addColorStop(0.50, '#680818');
      rGrad.addColorStop(1.0, '#9E1228');
      ctx.fillStyle = rGrad;
      ctx.fillRect(-135, -25, 270, 240);

      // Huge wavy roaring scarlet-pink tongue at bottom
      const tgGrad = ctx.createRadialGradient(0, 135, 12, 0, 150, 110);
      tgGrad.addColorStop(0.0, '#FF7592');
      tgGrad.addColorStop(0.58, '#F02E52');
      tgGrad.addColorStop(1.0, '#A8102C');
      ctx.fillStyle = tgGrad;
      ctx.beginPath();
      ctx.moveTo(-115, 124);
      ctx.bezierCurveTo(-62, 78, -18, 108, 0, 96);
      ctx.bezierCurveTo(18, 108, 62, 78, 115, 124);
      ctx.lineTo(125, 215);
      ctx.lineTo(-125, 215);
      ctx.closePath();
      ctx.fill();

      // Inner lip bevel shadow
      ctx.strokeStyle = 'rgba(18, 1, 4, 0.88)';
      ctx.lineWidth = 14;
      roarPath();
      ctx.stroke();

      // 4 Iconic Gleaming White Canine Fangs for 'Sangat Marah' Demon Roar (2 Upper + 2 Lower)!
      // Rendered AFTER lip stroke so fangs are crisp, sharp, prominent & 100% visible!
      const drawDemonFang = (baseX, baseY, tipX, tipY, halfW, isUpper) => {
        ctx.save();
        const fGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
        fGrad.addColorStop(0.00, '#FFF5F8');
        fGrad.addColorStop(0.25, '#FFFFFF');
        fGrad.addColorStop(1.00, '#FFFFFF');
        ctx.fillStyle = fGrad;
        ctx.shadowColor = 'rgba(255, 60, 90, 0.55)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(baseX - halfW, baseY);
        ctx.quadraticCurveTo(baseX - halfW * 0.25, (baseY + tipY) * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(baseX + halfW * 0.25, (baseY + tipY) * 0.5, baseX + halfW, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(30, 2, 8, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      };
      // 2 Prominent Upper Demon Fangs hanging boldly from top-left and top-right of the roaring mouth
      drawDemonFang(-46, -4, -38, 56, 19, true);
      drawDemonFang(46, -4, 38, 56, 19, true);
      // 2 Lower Canine Fangs jutting upward from bottom-left and bottom-right corners
      drawDemonFang(-74, 186, -66, 138, 15, false);
      drawDemonFang(74, 186, 66, 138, 15, false);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 3D-Shaded Toothless Phonetic & AIUEO Mouth Viseme Renderer (`drawMochiVisemeMouth3D`).
   * Matches BOTH user-uploaded storyboards (`media_1794037248789_f03c3bc4.jpg` 12 Phonetic Visemes
   * and `media_1794037257641_8dd59bf6.jpg` 5 AIUEO Vowels x 3 Intensity Rows)
   * with 100% TANPA GIGI (STRICTLY ZERO TEETH)!
   */
  drawMochiVisemeMouth3D(ctx, cx, cy, rawCode, rawIntensity = 1.0) {
    let code = String(rawCode || 'A').trim().toUpperCase();
    let k = Math.max(0.15, Math.min(1.0, Number(rawIntensity) || 1.0));

    // Support shorthand intensity codes 'A1','A2','A3', 'I1'..'O3'
    const mMatch = /^([AIUEO])([123])$/.exec(code);
    if (mMatch) {
      code = mMatch[1];
      const tier = Number(mMatch[2]);
      k = tier === 1 ? 0.34 : (tier === 2 ? 0.68 : 1.0);
    }

    // Normalize WawaLipsync codes to phonetic viseme keys
    if (code === 'VISEME_AA' || code === 'AA') code = 'A';
    else if (code === 'VISEME_I') code = 'I';
    else if (code === 'VISEME_U') code = 'U';
    else if (code === 'VISEME_E') code = 'E';
    else if (code === 'VISEME_O') code = 'O';
    else if (code === 'VISEME_PP' || code === 'PP' || code === 'B,M,P') code = 'BMP';
    else if (code === 'VISEME_FF' || code === 'FF' || code === 'F,V') code = 'FV';
    else if (code === 'VISEME_TH') code = 'TH';
    else if (code === 'VISEME_DD' || code === 'VISEME_SS' || code === 'VISEME_NN' || code === 'C,D,N,S,T,X,Y,Z') code = 'CDNSTXYZ';
    else if (code === 'VISEME_KK' || code === 'G,K') code = 'GK';
    else if (code === 'VISEME_CH' || code === 'CH,J,SH') code = 'CHJSH';
    else if (code === 'VISEME_RR') code = 'L';
    else if (code === 'A,E,I') code = 'AEI';
    else if (code === 'Q,W') code = 'QW';

    ctx.save();
    ctx.translate(cx, cy);

    // Helper: Cute curved corner laugh-dimple parentheses `(   )` for I, E, Ee, CDNSTXYZ, TH
    const drawCornerDimples = (rx, yOffset, spanY) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(202, 118, 144, 0.62)';
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      // Left corner dimple `(`
      ctx.beginPath();
      ctx.arc(-rx - 4, yOffset, spanY, Math.PI * 0.72, Math.PI * 1.28);
      ctx.stroke();
      // Right corner dimple `)`
      ctx.beginPath();
      ctx.arc(rx + 4, yOffset, spanY, -Math.PI * 0.28, Math.PI * 0.28);
      ctx.stroke();
      ctx.restore();
    };

    const rawUpper = String(rawCode || 'A').trim().toUpperCase();

    // Helper: Plump 3D Smooth Pink Mochi Tongue (Zero Teeth, Zero Split Line!)
    const drawPlumpTongue = (tx, ty, trx, tryR, wavyTop = false) => {
      ctx.save();
      const tGrad = ctx.createRadialGradient(tx, ty - tryR * 0.28, 4, tx, ty + tryR * 0.25, Math.max(trx, tryR) * 1.18);
      tGrad.addColorStop(0.00, '#FFA8C5');
      tGrad.addColorStop(0.55, '#FF5E8E');
      tGrad.addColorStop(1.00, '#C91E50');
      ctx.fillStyle = tGrad;

      ctx.beginPath();
      if (wavyTop) {
        ctx.moveTo(tx - trx, ty + tryR * 0.5);
        ctx.bezierCurveTo(tx - trx * 0.85, ty - tryR * 0.88, tx - trx * 0.22, ty - tryR * 0.52, tx, ty - tryR * 0.36);
        ctx.bezierCurveTo(tx + trx * 0.22, ty - tryR * 0.52, tx + trx * 0.85, ty - tryR * 0.88, tx + trx, ty + tryR * 0.5);
        ctx.bezierCurveTo(tx + trx, ty + tryR * 1.2, tx - trx, ty + tryR * 1.2, tx - trx, ty + tryR * 0.5);
      } else {
        ctx.ellipse(tx, ty, trx, tryR, 0, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();

      // Soft upper-center tongue contour highlight (no vertical split line!)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.46)';
      ctx.beginPath();
      ctx.ellipse(tx + trx * 0.26, ty - tryR * 0.28, Math.max(4, trx * 0.18), Math.max(3, tryR * 0.12), 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // =========================================================================
    // CASE 1: 'BMP' (B, M, P — Pressed Closed 3D Bilabial Mochi Lips)
    // =========================================================================
    if (code === 'BMP') {
      const rx = 68;
      // Soft upper & lower lip cushion glow
      const cushionGrad = ctx.createRadialGradient(0, 4, 4, 0, 4, rx * 1.25);
      cushionGrad.addColorStop(0.0, 'rgba(235, 150, 175, 0.42)');
      cushionGrad.addColorStop(1.0, 'rgba(255, 245, 248, 0)');
      ctx.fillStyle = cushionGrad;
      ctx.beginPath();
      ctx.ellipse(0, 4, rx * 1.25, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper lip highlight ridge
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rx + 8, -5);
      ctx.bezierCurveTo(-24, -10, -8, -4, 0, -3);
      ctx.bezierCurveTo(8, -4, 24, -10, rx - 8, -5);
      ctx.stroke();

      // Lower lip underside shadow
      ctx.strokeStyle = 'rgba(198, 112, 138, 0.48)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 4, rx * 0.65, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();

      // Pressed lip seam line
      ctx.strokeStyle = '#7A2840';
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rx, 2);
      ctx.bezierCurveTo(-32, -2, -12, 5, 0, 4);
      ctx.bezierCurveTo(12, 5, 32, -2, rx, 2);
      ctx.stroke();

      // Cute sunken corner dimple dots (`• — •`)
      ctx.fillStyle = '#6B1D34';
      ctx.beginPath();
      ctx.arc(-rx - 3, 2, 6.5, 0, Math.PI * 2);
      ctx.arc(rx + 3, 2, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // =========================================================================
    // CASE 2: 'FV' (F, V — Asymmetric Lower-Lip Tuck, 100% Toothless!)
    // =========================================================================
    if (code === 'FV') {
      const rx = 64;
      // Soft rose lip flush
      const flush = ctx.createRadialGradient(0, 6, 6, 0, 6, rx * 1.25);
      flush.addColorStop(0.0, 'rgba(238, 142, 170, 0.50)');
      flush.addColorStop(1.0, 'rgba(255, 245, 248, 0)');
      ctx.fillStyle = flush;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx * 1.25, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      const fvPath = () => {
        ctx.beginPath();
        ctx.moveTo(-rx, 10);
        // Cupid's bow upper lip
        ctx.bezierCurveTo(-36, -16, -12, -18, 0, -10);
        ctx.bezierCurveTo(14, -18, 42, -14, rx, 10);
        // Right side dips open into an asymmetric crescent, left side tucked up
        ctx.bezierCurveTo(44, 28, 12, 24, -12, 8);
        ctx.bezierCurveTo(-32, 4, -48, 8, -rx, 10);
        ctx.closePath();
      };

      ctx.save();
      fvPath();
      ctx.clip();
      ctx.fillStyle = '#4A0618';
      ctx.fillRect(-80, -30, 160, 70);
      // Soft pink tongue peeking inside right crescent (NO teeth!)
      drawPlumpTongue(18, 18, 34, 18, false);
      ctx.restore();

      // Tucked lower lip cushion crease on right
      ctx.strokeStyle = 'rgba(195, 105, 132, 0.55)';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.quadraticCurveTo(28, 36, rx - 4, 16);
      ctx.stroke();

      ctx.strokeStyle = '#5E1228';
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      fvPath();
      ctx.stroke();

      ctx.restore();
      return;
    }

    // =========================================================================
    // CASE 3: 'U' (Phonetic U & AIUEO U1 — Tight 3D Puckered Mochi Cushion Lips)
    // Swapped per user feedback so 'U' has the tight 3D pucker and 'Q,W' has the arch!
    // =========================================================================
    if (rawUpper === 'U' || rawUpper === 'VISEME_U' || rawUpper === 'U1') {
      const outerRx = 46;
      const outerRy = 44;

      // Warm cheek/lip pucker flush
      const pFlush = ctx.createRadialGradient(0, 6, 4, 0, 6, outerRx * 2.1);
      pFlush.addColorStop(0.0, 'rgba(244, 142, 174, 0.62)');
      pFlush.addColorStop(0.55, 'rgba(250, 172, 198, 0.30)');
      pFlush.addColorStop(1.0, 'rgba(255, 245, 248, 0)');
      ctx.fillStyle = pFlush;
      ctx.beginPath();
      ctx.ellipse(0, 6, outerRx * 2.1, outerRy * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Protruding 3D puckered lip cushion torus (seamless soft blend)
      const ringGrad = ctx.createRadialGradient(-4, -2, 6, 0, 6, outerRy * 1.05);
      ringGrad.addColorStop(0.0, 'rgba(255, 242, 247, 0.95)');
      ringGrad.addColorStop(0.48, 'rgba(248, 196, 214, 0.88)');
      ringGrad.addColorStop(0.78, 'rgba(232, 156, 182, 0.55)');
      ringGrad.addColorStop(1.0, 'rgba(232, 156, 182, 0)');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.ellipse(0, 6, outerRx * 1.05, outerRy * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clean symmetric diamond-keyhole pucker opening (Zero teeth!)
      const innerPath = () => {
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.bezierCurveTo(15, -13, 23, -3, 23, 4);
        ctx.bezierCurveTo(23, 13, 13, 23, 0, 23);
        ctx.bezierCurveTo(-13, 23, -23, 13, -23, 4);
        ctx.bezierCurveTo(-23, -3, -15, -13, 0, -15);
        ctx.closePath();
      };

      // Soft pink lip bevel around pucker opening
      ctx.save();
      innerPath();
      ctx.strokeStyle = 'rgba(222, 128, 158, 0.72)';
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      innerPath();
      ctx.clip();
      ctx.fillStyle = '#3B0312';
      ctx.fillRect(-35, -30, 70, 70);
      drawPlumpTongue(0, 19, 17, 12, false);
      ctx.restore();

      ctx.strokeStyle = 'rgba(115, 20, 46, 0.68)';
      ctx.lineWidth = 4.5;
      innerPath();
      ctx.stroke();

      // Delicate soft pucker dimple creases
      ctx.strokeStyle = 'rgba(210, 128, 154, 0.42)';
      ctx.lineWidth = 3.8;
      ctx.lineCap = 'round';
      [[-17, -14, -24, -20], [17, -14, 24, -20], [-19, 14, -26, 19], [19, 14, 26, 19]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      ctx.restore();
      return;
    }

    // =========================================================================
    // CASE 4: 'CHJSH' (CH, J, SH — Natural Symmetric Rounded-Squircle Cushion Mouth, Zero Teeth!)
    // Fixed per user feedback: 100% symmetric aperture, soft natural Mochi lip cushion bevel,
    // zero lipstick-donut ring, zero white oval stickers!
    // =========================================================================
    if (code === 'CHJSH') {
      const rx = 58;
      const ryTop = 24;
      const ryBot = 28;

      // Soft natural rose lip flush blending seamlessly into the Daifuku Mochi cheek
      const flushGrad = ctx.createRadialGradient(0, 4, 8, 0, 4, rx * 1.45);
      flushGrad.addColorStop(0.0, 'rgba(242, 138, 172, 0.55)');
      flushGrad.addColorStop(0.6, 'rgba(248, 168, 194, 0.24)');
      flushGrad.addColorStop(1.0, 'rgba(255, 245, 248, 0)');
      ctx.fillStyle = flushGrad;
      ctx.beginPath();
      ctx.ellipse(0, 4, rx * 1.45, (ryTop + ryBot) * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      // 100% Symmetric rounded-squircle aperture with gentle Cupid's bow top curve
      const chPath = () => {
        ctx.beginPath();
        ctx.moveTo(-rx, 2);
        ctx.bezierCurveTo(-rx * 0.92, -ryTop * 1.15, -20, -ryTop * 1.18, 0, -ryTop * 0.92);
        ctx.bezierCurveTo(20, -ryTop * 1.18, rx * 0.92, -ryTop * 1.15, rx, 2);
        ctx.bezierCurveTo(rx * 0.92, ryBot * 1.18, 26, ryBot * 1.16, 0, ryBot * 1.16);
        ctx.bezierCurveTo(-26, ryBot * 1.16, -rx * 0.92, ryBot * 1.18, -rx, 2);
        ctx.closePath();
      };

      // Soft 3D Mochi Lip Cushion Bevel & Lower Chin Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(205, 118, 145, 0.50)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      chPath();
      ctx.fillStyle = '#3B0312';
      ctx.fill();
      ctx.restore();

      ctx.save();
      chPath();
      ctx.strokeStyle = 'rgba(235, 142, 172, 0.72)';
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.restore();

      // Clipped Mouth Interior: Deep Maroon Oral Cavity + Plump Symmetric Pink Tongue
      ctx.save();
      chPath();
      ctx.clip();
      const cavGrad = ctx.createLinearGradient(0, -ryTop, 0, ryBot);
      cavGrad.addColorStop(0.0, '#32020E');
      cavGrad.addColorStop(0.55, '#5E0820');
      cavGrad.addColorStop(1.0, '#8A1032');
      ctx.fillStyle = cavGrad;
      ctx.fillRect(-rx * 1.3, -ryTop * 1.4, rx * 2.6, (ryTop + ryBot) * 2.0);
      drawPlumpTongue(0, ryBot * 0.62, rx * 0.74, ryBot * 0.58, true);

      // Inner lip ambient occlusion shadow
      ctx.strokeStyle = 'rgba(42, 2, 12, 0.75)';
      ctx.lineWidth = 10;
      chPath();
      ctx.stroke();
      ctx.restore();

      // Crisp outer lip rim contour
      ctx.strokeStyle = 'rgba(115, 22, 48, 0.65)';
      ctx.lineWidth = 5;
      chPath();
      ctx.stroke();

      ctx.restore();
      return;
    }

    // =========================================================================
    // CASE 5: OPEN VOWEL & CONSONANT MOUTHS (A, I, U2/U3, QW, E, O, AEI, Ee, CDNSTXYZ, GK, L, TH)
    // All rendered with 3D Mochi Lip Cushion Bevel + Oral Cavity + 3D Pink Tongue (ZERO TEETH!)
    // =========================================================================
    let rx = 64;
    let ryTop = 36;
    let ryBot = 44;
    let shapeMode = 'dome'; // 'dome' | 'smile_d' | 'oval_o' | 'arch_u3'
    let hasDimples = false;
    let tongueMode = 'plump'; // 'plump' | 'wavy' | 'curled_l' | 'tip_th' | 'back_gk'

    if (code === 'A') {
      rx = 44 + 28 * k;
      ryTop = 30 + 28 * k;
      ryBot = 26 + 26 * k;
      shapeMode = 'dome';
      tongueMode = 'wavy';
    } else if (code === 'I') {
      rx = 72 + 16 * k;
      ryTop = 2 + 6 * k;
      ryBot = 20 + 36 * k;
      shapeMode = 'smile_d';
      hasDimples = true;
      tongueMode = 'plump';
    } else if (code === 'QW') {
      // 'Q,W' Phonetic Viseme: Horseshoe arch mouth (swapped with 'U' per user feedback!)
      rx = 60;
      ryTop = 48;
      ryBot = 34;
      shapeMode = 'arch_u3';
      tongueMode = 'wavy';
    } else if (code === 'U') {
      // AIUEO U2 & U3 (since phonetic 'U' and 'U1' are handled in CASE 3 above)
      rx = 46 + 18 * k;
      ryTop = 34 + 18 * k;
      ryBot = 22 + 14 * k;
      shapeMode = k >= 0.80 ? 'arch_u3' : 'dome';
      tongueMode = 'wavy';
    } else if (code === 'E' || code === 'EE') {
      const ek = code === 'EE' ? 0.85 : k;
      rx = 68 + 18 * ek;
      ryTop = 4 + 6 * ek;
      ryBot = 36 + 28 * ek;
      shapeMode = 'smile_d';
      hasDimples = true;
      tongueMode = 'wavy';
    } else if (code === 'O') {
      rx = 26 + 14 * k;
      ryTop = 30 + 30 * k;
      ryBot = 30 + 32 * k;
      shapeMode = 'oval_o';
      tongueMode = 'plump';
    } else if (code === 'AEI') {
      rx = 74;
      ryTop = 10;
      ryBot = 48;
      shapeMode = 'smile_d';
      tongueMode = 'wavy';
    } else if (code === 'CDNSTXYZ') {
      rx = 78;
      ryTop = 4;
      ryBot = 24;
      shapeMode = 'smile_d';
      hasDimples = true;
      tongueMode = 'plump';
    } else if (code === 'GK') {
      rx = 66;
      ryTop = 40;
      ryBot = 34;
      shapeMode = 'dome';
      tongueMode = 'back_gk';
    } else if (code === 'L') {
      rx = 62;
      ryTop = 34;
      ryBot = 40;
      shapeMode = 'dome';
      tongueMode = 'curled_l';
    } else if (code === 'TH') {
      rx = 76;
      ryTop = 8;
      ryBot = 46;
      shapeMode = 'smile_d';
      hasDimples = true;
      tongueMode = 'tip_th';
    }

    const buildAperturePath = () => {
      ctx.beginPath();
      if (shapeMode === 'smile_d') {
        // Wide upturned D-smile (I, E, Ee, AEI, CDNSTXYZ, TH)
        ctx.moveTo(-rx, -ryTop);
        ctx.quadraticCurveTo(0, ryTop * 0.8, rx, -ryTop);
        ctx.bezierCurveTo(rx * 0.92, ryBot * 1.15, -rx * 0.92, ryBot * 1.15, -rx, -ryTop);
      } else if (shapeMode === 'oval_o') {
        // Tall vertical oval (O1, O2, O3)
        ctx.ellipse(0, (ryBot - ryTop) * 0.25, rx, (ryTop + ryBot) * 0.5, 0, 0, Math.PI * 2);
      } else if (shapeMode === 'arch_u3') {
        // Horseshoe arch with downward-curving corners (U Row 3 & Phonetic Q,W)
        ctx.moveTo(-rx, ryBot * 0.65);
        ctx.bezierCurveTo(-rx * 0.95, -ryTop * 1.25, rx * 0.95, -ryTop * 1.25, rx, ryBot * 0.65);
        ctx.bezierCurveTo(rx * 0.75, ryBot * 1.15, 24, ryBot * 0.85, 0, ryBot * 0.85);
        ctx.bezierCurveTo(-24, ryBot * 0.85, -rx * 0.75, ryBot * 1.15, -rx, ryBot * 0.65);
      } else {
        // Rounded dome arch (A1..A3, U2, GK, L)
        ctx.moveTo(-rx, ryBot * 0.15);
        ctx.bezierCurveTo(-rx * 0.92, -ryTop * 1.22, rx * 0.92, -ryTop * 1.22, rx, ryBot * 0.15);
        ctx.bezierCurveTo(rx * 1.02, ryBot * 1.12, -rx * 1.02, ryBot * 1.12, -rx, ryBot * 0.15);
      }
      ctx.closePath();
    };

    // 1. Soft 3D Outer Mochi Lip Cushion Bevel & Lower Chin Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(205, 118, 145, 0.52)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 7;
    buildAperturePath();
    ctx.fillStyle = '#3B0312';
    ctx.fill();
    ctx.restore();

    // Soft rosy-pink 3D Mochi Lip Cushion Bevel (zero white top-rim line that could resemble teeth!)
    ctx.save();
    buildAperturePath();
    ctx.strokeStyle = 'rgba(235, 148, 176, 0.65)';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();

    if (hasDimples) {
      drawCornerDimples(rx, 2, Math.max(14, ryBot * 0.36));
    }

    // 2. Clipped Mouth Interior: Deep Maroon Oral Cavity + 3D Pink Tongue (ZERO TEETH!)
    ctx.save();
    buildAperturePath();
    ctx.clip();

    const cavGrad = ctx.createLinearGradient(0, -ryTop, 0, ryBot);
    cavGrad.addColorStop(0.00, '#32020E');
    cavGrad.addColorStop(0.55, '#5E0820');
    cavGrad.addColorStop(1.00, '#8A1032');
    ctx.fillStyle = cavGrad;
    ctx.fillRect(-rx * 1.4, -ryTop * 1.5, rx * 2.8, (ryTop + ryBot) * 2.0);

    // Subtle deep throat arch for dome vowels/velars (A, GK, U2, QW)
    if (shapeMode === 'dome' || shapeMode === 'arch_u3') {
      ctx.fillStyle = 'rgba(32, 1, 8, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 4, rx * 0.55, (ryTop + ryBot) * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Tongue Posture per Viseme (100% Toothless!)
    if (tongueMode === 'curled_l') {
      // 'L' Viseme: Pink tongue sweeps from bottom-left and curls its rounded tip up to upper-right palate!
      const lGrad = ctx.createLinearGradient(-rx * 0.6, ryBot, rx * 0.5, -ryTop * 0.6);
      lGrad.addColorStop(0.00, '#D92B5E');
      lGrad.addColorStop(0.55, '#FF5C8D');
      lGrad.addColorStop(1.00, '#FF9EBC');
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.85, ryBot * 0.95);
      ctx.bezierCurveTo(-rx * 0.55, ryBot * 0.05, -8, -4, rx * 0.22, -ryTop * 0.78);
      ctx.bezierCurveTo(rx * 0.68, -ryTop * 0.82, rx * 0.82, ryBot * 0.15, rx * 0.52, ryBot * 0.95);
      ctx.closePath();
      ctx.fill();

      // Underside tongue curl crease
      ctx.strokeStyle = 'rgba(165, 18, 58, 0.48)';
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rx * 0.15, ryBot * 0.65);
      ctx.quadraticCurveTo(rx * 0.32, ryBot * 0.10, rx * 0.35, -ryTop * 0.38);
      ctx.stroke();

    } else if (tongueMode === 'tip_th') {
      // 'TH' Viseme: Plump rounded pink tongue tip protrudes right under the top-center lip!
      drawPlumpTongue(0, ryBot * 0.72, rx * 0.72, ryBot * 0.52, false);
      const thGrad = ctx.createRadialGradient(0, -ryTop + 6, 4, 0, 8, 38);
      thGrad.addColorStop(0.0, '#FFB2CA');
      thGrad.addColorStop(0.6, '#FF6694');
      thGrad.addColorStop(1.0, '#D92B5E');
      ctx.fillStyle = thGrad;
      ctx.beginPath();
      ctx.moveTo(-34, -ryTop - 4);
      ctx.bezierCurveTo(-32, ryBot * 0.62, 32, ryBot * 0.62, 34, -ryTop - 4);
      ctx.closePath();
      ctx.fill();

    } else if (tongueMode === 'back_gk') {
      // 'G,K' Viseme: Raised back of tongue cushion
      drawPlumpTongue(0, ryBot * 0.56, rx * 0.78, ryBot * 0.58, true);

    } else if (shapeMode === 'oval_o') {
      // 'O' Viseme: Small rounded tongue nestled at the bottom of the vertical oval
      drawPlumpTongue(0, ryBot * 0.68, rx * 0.68, ryBot * 0.38, true);

    } else {
      // Standard plump smooth tongue (A, I, U, QW, E, Ee, AEI, CDNSTXYZ)
      drawPlumpTongue(0, ryBot * 0.62, rx * 0.76, ryBot * 0.56, tongueMode === 'wavy');
    }

    // Inner Lip Rim Ambient Occlusion Shadow (gives soft 3D mochi lip thickness over cavity & tongue)
    ctx.strokeStyle = 'rgba(42, 2, 12, 0.75)';
    ctx.lineWidth = 11;
    buildAperturePath();
    ctx.stroke();
    ctx.restore();

    // Crisp outer lip rim contour
    ctx.strokeStyle = 'rgba(115, 22, 48, 0.65)';
    ctx.lineWidth = 5;
    buildAperturePath();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders the True Behind-Mascot Living Volumetric Fire & Smoke Aura (`this.auraBackCanvas` at z = -0.06).
   * Because `this.auraBackMesh` sits physically behind `this.mochiMesh`, `this.earsGroup`, and `this.hornsGroup`
   * in 3D WebGL depth space, all flame roots originate deep behind the Mochi's body and blaze outward
   * in fluid, sinuous S-curves (100% organic, zero blocky/flat-bottomed triangles!).
   */
  renderBackAuraAndFire(fxType) {
    if (!this.auraBackCtx || !this.auraBackCanvas) return;
    const ctx = this.auraBackCtx;
    const W = 1024;
    const H = 1024;
    ctx.clearRect(0, 0, W, H);

    const desc = this._currentMoodDesc || this.resolveMoodDescriptor(this.mood);
    const isFurious = (desc && desc.id === 'sangat_marah') || (this.skinBlend && this.skinBlend.furious > 0.08) || fxType === 'anger_vein_demon';
    const isMarah = (desc && desc.id === 'marah') || (this.skinBlend && this.skinBlend.marah > 0.08) || fxType === 'anger_marah_fire';

    if (!isFurious && !isMarah) {
      if (this.auraBackMesh) this.auraBackMesh.visible = false;
      if (this.auraBackTexture) this.auraBackTexture.needsUpdate = true;
      return;
    }

    if (this.auraBackMesh) this.auraBackMesh.visible = true;

    const t = this.time || 1.15;

    // Helper: draw single layered anime flame tongue with fluid organic S-curve
    const drawAnimeFlameTongue = (cx, baseY, width, height, curl, phase) => {
      const flickerW = Math.sin(t * 7.2 + phase) * (width * 0.12);
      const flickerH = Math.cos(t * 6.5 + phase * 1.3) * (height * 0.08);
      const w = width + flickerW;
      const h = height + flickerH;
      const curlOffset = curl * (w * 1.5) + Math.sin(t * 5.8 + phase * 2.1) * (w * 0.35);
      const tipX = cx + curlOffset;
      const tipY = baseY - h;

      // 3 Layers: Outer Ruby Red -> Mid Fiery Orange -> Core Yellow-White
      const layers = [
        {
          sw: 1.00, sh: 1.00,
          grad: () => {
            const g = ctx.createLinearGradient(cx, baseY, tipX, tipY);
            g.addColorStop(0.00, 'rgba(239, 68, 68, 0.95)');
            g.addColorStop(0.45, 'rgba(220, 38, 38, 0.90)');
            g.addColorStop(0.85, 'rgba(185, 28, 28, 0.75)');
            g.addColorStop(1.00, 'rgba(153, 27, 27, 0.0)');
            return g;
          }
        },
        {
          sw: 0.70, sh: 0.82,
          grad: () => {
            const g = ctx.createLinearGradient(cx, baseY, tipX, tipY);
            g.addColorStop(0.00, 'rgba(255, 140, 0, 0.98)');
            g.addColorStop(0.50, 'rgba(255, 106, 0, 0.92)');
            g.addColorStop(0.85, 'rgba(234, 88, 12, 0.70)');
            g.addColorStop(1.00, 'rgba(194, 65, 12, 0.0)');
            return g;
          }
        },
        {
          sw: 0.40, sh: 0.58,
          grad: () => {
            const g = ctx.createLinearGradient(cx, baseY, tipX, tipY);
            g.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
            g.addColorStop(0.35, 'rgba(254, 240, 138, 0.96)');
            g.addColorStop(0.70, 'rgba(250, 204, 21, 0.85)');
            g.addColorStop(1.00, 'rgba(245, 158, 11, 0.0)');
            return g;
          }
        }
      ];

      for (const L of layers) {
        const lw = w * L.sw;
        const lh = h * L.sh;
        const ltX = cx + curlOffset * L.sh;
        const ltY = baseY - lh;
        const lmY = baseY - lh * 0.52;

        ctx.fillStyle = L.grad();
        ctx.beginPath();
        ctx.moveTo(cx - lw, baseY);
        ctx.bezierCurveTo(
          cx - lw * 1.15 + Math.sin(phase + t * 4) * 5, lmY + lh * 0.12,
          ltX - lw * 0.60, lmY - lh * 0.15,
          ltX, ltY
        );
        ctx.bezierCurveTo(
          ltX + lw * 0.60, lmY - lh * 0.15,
          cx + lw * 1.15 + Math.cos(phase + t * 4) * 5, lmY + lh * 0.12,
          cx + lw, baseY
        );
        ctx.closePath();
        ctx.fill();
      }
    };

    if (isFurious) {
      // Stage 3 Sangat Marah: Towering Demon Inferno behind horns and head!
      // 1. Massive radiant heat glow bloom
      const aura = ctx.createRadialGradient(512, 450, 80, 512, 430, 480);
      aura.addColorStop(0.00, 'rgba(255, 240, 150, 0.72)');
      aura.addColorStop(0.25, 'rgba(255, 115, 20, 0.58)');
      aura.addColorStop(0.60, 'rgba(220, 38, 38, 0.38)');
      aura.addColorStop(0.85, 'rgba(185, 28, 28, 0.18)');
      aura.addColorStop(1.00, 'rgba(127, 29, 29, 0.0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(512, 430, 480, 0, Math.PI * 2);
      ctx.fill();

      // 2. Left Horn Inferno Column (plumes rising up behind left demon horn)
      drawAnimeFlameTongue(300, 460, 110, 430, -0.26, 0.0);
      drawAnimeFlameTongue(230, 510, 95, 360, -0.42, 1.2);
      drawAnimeFlameTongue(370, 440, 85, 330, -0.10, 2.4);

      // 3. Right Horn Inferno Column (plumes rising up behind right demon horn)
      drawAnimeFlameTongue(724, 460, 110, 430, 0.26, 0.5);
      drawAnimeFlameTongue(794, 510, 95, 360, 0.42, 1.7);
      drawAnimeFlameTongue(654, 440, 85, 330, 0.10, 2.9);

      // 4. Crown Center Inferno (towering flame between horns)
      drawAnimeFlameTongue(512, 400, 90, 370, 0.04, 3.1);
      drawAnimeFlameTongue(455, 420, 75, 320, -0.12, 4.2);
      drawAnimeFlameTongue(569, 420, 75, 320, 0.12, 5.0);

      // 5. Flank Inferno (licking up from lower sides)
      drawAnimeFlameTongue(150, 640, 95, 280, -0.48, 1.8);
      drawAnimeFlameTongue(95, 710, 80, 230, -0.58, 2.6);
      drawAnimeFlameTongue(874, 640, 95, 280, 0.48, 2.1);
      drawAnimeFlameTongue(929, 710, 80, 230, 0.58, 2.9);

      // 6. Base Ground Scorching Flames
      for (let bx = 220; bx <= 804; bx += 80) {
        const h = 130 + Math.sin(bx * 0.1 + t * 5) * 40;
        drawAnimeFlameTongue(bx, 760, 45, h, (bx - 512) * 0.001, bx * 0.05);
      }

      // 7. Rising Embers & Sparks (20 sparks floating upwards)
      for (let i = 0; i < 20; i++) {
        const seed = i * 47.13;
        const sx = 120 + ((seed * 19.3) % 784);
        const rise = ((t * 85 + seed * 31) % 450);
        const sy = 680 - rise;
        const sr = 3.5 + (i % 3) * 1.5;
        const alpha = Math.sin((rise / 450) * Math.PI) * 0.85;
        ctx.fillStyle = `rgba(255, 235, 120, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isMarah) {
      // Stage 2 Marah: Vibrant glowing anime fire aura rising up past shoulders and ears (matching crop_ref_marah_stage2.png)
      // 1. Radiant luminous heat bloom halo
      const halo = ctx.createRadialGradient(512, 450, 70, 512, 430, 460);
      halo.addColorStop(0.00, 'rgba(255, 180, 80, 0.75)');
      halo.addColorStop(0.28, 'rgba(244, 63, 94, 0.55)');
      halo.addColorStop(0.60, 'rgba(225, 29, 72, 0.32)');
      halo.addColorStop(0.85, 'rgba(190, 18, 60, 0.12)');
      halo.addColorStop(1.00, 'rgba(150, 10, 40, 0.0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(512, 430, 460, 0, Math.PI * 2);
      ctx.fill();

      // 2. Left Flank & Shoulder Flame Columns (licking up past left ear)
      drawAnimeFlameTongue(260, 530, 105, 390, -0.30, 0.0);
      drawAnimeFlameTongue(180, 580, 95, 340, -0.42, 1.2);
      drawAnimeFlameTongue(340, 480, 85, 330, -0.15, 2.4);

      // 3. Right Flank & Shoulder Flame Columns (licking up past right ear)
      drawAnimeFlameTongue(764, 530, 105, 390, 0.30, 0.5);
      drawAnimeFlameTongue(844, 580, 95, 340, 0.42, 1.7);
      drawAnimeFlameTongue(684, 480, 85, 330, 0.15, 2.9);

      // 4. Center Head Crown Tongues (heat licks rising between the ears)
      drawAnimeFlameTongue(460, 440, 70, 270, -0.08, 3.8);
      drawAnimeFlameTongue(564, 440, 70, 270, 0.08, 4.5);

      // 5. Base Ground Scorching Flames
      for (let bx = 240; bx <= 784; bx += 75) {
        const h = 110 + Math.sin(bx * 0.1 + t * 4) * 30;
        drawAnimeFlameTongue(bx, 740, 40, h, (bx - 512) * 0.001, bx * 0.08);
      }

      // 6. Rising Fiery Sparks & Embers (12 floating sparks)
      for (let i = 0; i < 12; i++) {
        const seed = i * 39.41;
        const sx = 160 + ((seed * 23.7) % 704);
        const rise = ((t * 70 + seed * 27) % 400);
        const sy = 640 - rise;
        const sr = 3.0 + (i % 3) * 1.2;
        const alpha = Math.sin((rise / 400) * Math.PI) * 0.85;
        ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Authentic Anime Smoke Puffs floating in the air ABOVE & BEHIND each ear (matching crop_ref_marah_stage2.png 1:1)
      const drawAnimeSteamPuff = (cx, cy, dir, sPhase) => {
        const bobY = Math.sin(t * 4.8 + sPhase) * 6;
        const px = cx;
        const py = cy + bobY;

        ctx.save();
        const grad = ctx.createLinearGradient(px - dir * 28, py - 28, px + dir * 28, py + 28);
        grad.addColorStop(0.00, '#A0AEC0'); // Soft light slate grey
        grad.addColorStop(0.50, '#718096'); // Medium slate grey
        grad.addColorStop(1.00, '#4A5568'); // Deep slate shadow
        ctx.fillStyle = grad;

        // Draw multi-lobed anime cumulus puff head
        ctx.beginPath();
        ctx.arc(px, py, 34, 0, Math.PI * 2);
        ctx.arc(px - dir * 16, py - 12, 25, 0, Math.PI * 2);
        ctx.arc(px + dir * 16, py + 10, 23, 0, Math.PI * 2);
        ctx.arc(px - dir * 8, py + 16, 21, 0, Math.PI * 2);
        ctx.fill();

        // Tapered tail wisp pointing towards ear tip
        ctx.beginPath();
        const tailStartX = px + dir * 16;
        const tailStartY = py + 16;
        const earTargetX = dir < 0 ? px + 85 : px - 85;
        const earTargetY = py + 75;
        ctx.moveTo(px, py + 24);
        ctx.quadraticCurveTo(tailStartX, tailStartY + 28, earTargetX, earTargetY);
        ctx.quadraticCurveTo(tailStartX - dir * 14, tailStartY + 18, px - dir * 12, py + 22);
        ctx.closePath();
        ctx.fill();

        // Detached trailing wisp droplet (midway between puff and ear)
        const dropX = dir < 0 ? px + 48 : px - 48;
        const dropY = py + 46 + Math.sin(t * 5.2 + sPhase) * 3;
        ctx.beginPath();
        ctx.ellipse(dropX, dropY, 7, 11, dir * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Crisp White Specular Crescent Glint on top crest (signature anime style)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (dir < 0) {
          ctx.arc(px - 16, py - 12, 15, Math.PI * 0.85, Math.PI * 1.55);
        } else {
          ctx.arc(px + 16, py - 12, 15, -Math.PI * 0.55, -Math.PI * 0.10);
        }
        ctx.stroke();

        ctx.restore();
      };

      // Left ear floating steam puff (positioned in space behind/above left ear)
      drawAnimeSteamPuff(230, 215, -1, 0.0);

      // Right ear floating steam puff (positioned in space behind/above right ear)
      drawAnimeSteamPuff(794, 215, 1, 1.4);
    }

    if (this.auraBackTexture) {
      this.auraBackTexture.needsUpdate = true;
    }
  }

  /**
   * Renders the floating Storyboard FX symbols (///, 💢, ✨, !!, ?, Zz, sweat droplets, shiver arcs)
   * onto `this.fxCanvas` with gentle 60fps floating animation.
   */
  renderFloatingStoryboardFx(fxType) {
    // Always update the True Behind-Mascot Volumetric Fire & Smoke Layer first!
    this.renderBackAuraAndFire(fxType);

    if (!this.fxCtx || !this.fxCanvas) return;
    const ctx = this.fxCtx;
    const w = 1024;
    const h = 800;
    ctx.clearRect(0, 0, w, h);

    if (!fxType || fxType === 'none') {
      if (this.fxTexture) this.fxTexture.needsUpdate = true;
      return;
    }

    const bob = Math.sin(this.time * 4.2) * 6;
    const pulse = 1.0 + Math.sin(this.time * 5.0) * 0.05;

    const drawRayPill = (x1, y1, x2, y2, thickness, colorStart, colorEnd) => {
      ctx.save();
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      ctx.strokeStyle = grad;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    const drawSparkle4 = (sx, sy, size) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(pulse, pulse);
      const sGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, size);
      sGrad.addColorStop(0, '#FEF08A');
      sGrad.addColorStop(0.5, '#FACC15');
      sGrad.addColorStop(1, '#EA580C');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.quadraticCurveTo(0, 0, size * 0.78, 0);
      ctx.quadraticCurveTo(0, 0, 0, size);
      ctx.quadraticCurveTo(0, 0, -size * 0.78, 0);
      ctx.quadraticCurveTo(0, 0, 0, -size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawAngerVein = (vx, vy, scale, isDemon = false) => {
      ctx.save();
      ctx.translate(vx, vy + bob * 0.5);
      ctx.scale(scale * pulse, scale * pulse);
      ctx.strokeStyle = isDemon ? '#FF3B2F' : '#DC2626';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (isDemon) {
        ctx.shadowColor = 'rgba(255, 50, 30, 0.85)';
        ctx.shadowBlur = 14;
      }
      // 4 curved anger vein ticks (💢)
      const angles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      angles.forEach((ang) => {
        ctx.save();
        ctx.rotate(ang + 0.15);
        ctx.beginPath();
        ctx.moveTo(12, -38);
        ctx.quadraticCurveTo(14, -14, 38, -12);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    };

    if (fxType === 'rays_green_3' || fxType === 'rays_green_2') {
      // Emerald green attention rays on top-left
      drawRayPill(175, 195 + bob, 118, 125 + bob, 20, '#34D399', '#059669');
      drawRayPill(148, 240 + bob, 82, 195 + bob, 20, '#34D399', '#059669');
      if (fxType === 'rays_green_3') {
        drawRayPill(135, 290 + bob, 68, 272 + bob, 18, '#34D399', '#059669');
      }
    } else if (fxType === 'rays_gold_3') {
      // Gembira: 3 golden-yellow rays on top-left + sparkle
      drawRayPill(178, 190 + bob, 124, 115 + bob, 22, '#FDE047', '#F59E0B');
      drawRayPill(146, 238 + bob, 82, 188 + bob, 22, '#FDE047', '#F59E0B');
      drawRayPill(134, 286 + bob, 68, 265 + bob, 20, '#FDE047', '#F59E0B');
      drawSparkle4(182, 312 - bob, 24);
    } else if (fxType === 'sparkles_right') {
      // Sinis: 2 golden 4-point sparkles on right
      drawSparkle4(845, 255 + bob, 36);
      drawSparkle4(888, 315 - bob, 22);
    } else if (fxType === 'senang_combo') {
      // Senang (Row 2 Col 2): 2 green rays on top-left + 2 golden sparkles on top-right
      drawRayPill(172, 205 + bob, 120, 140 + bob, 18, '#34D399', '#059669');
      drawRayPill(145, 250 + bob, 86, 210 + bob, 18, '#34D399', '#059669');
      drawSparkle4(842, 225 + bob, 36);
      drawSparkle4(886, 282 - bob, 22);
    } else if (fxType === 'anger_vein') {
      // Tegas / Kesal: Red 💢 on upper-right temple
      drawAngerVein(742, 265, 0.94, false);
    } else if (fxType === 'anger_marah_fire') {
      // Stage 2 Marah: Red 💢 on upper-right temple (steam puffs & flame aura are rendered BEHIND mascot on auraBackMesh!)
      drawAngerVein(748, 258, 0.96, false);
    } else if (fxType === 'anger_vein_demon') {
      // Stage 3 Sangat Marah: 2 glowing red-orange 💢 symbols on right & left temples (inferno is BEHIND mascot on auraBackMesh!)
      drawAngerVein(775, 315, 0.92, true);
      drawAngerVein(238, 355, 0.64, true);
    } else if (fxType === 'sweat_both') {
      // Empati: Sky-blue sweat droplets on both upper-left & upper-right
      const drawDrop = (dx, dy, angle) => {
        ctx.save();
        ctx.translate(dx, dy + bob);
        ctx.rotate(angle);
        const dGrad = ctx.createLinearGradient(0, -24, 0, 24);
        dGrad.addColorStop(0, '#7DD3FC');
        dGrad.addColorStop(1, '#0284C7');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.bezierCurveTo(18, -2, 18, 22, 0, 22);
        ctx.bezierCurveTo(-18, 22, -18, -2, 0, -24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.beginPath();
        ctx.ellipse(-4, 6, 3.5, 7, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawDrop(158, 225, -0.55);
      drawDrop(135, 282, -0.75);
      drawDrop(866, 232, 0.55);
      drawDrop(888, 288, 0.75);
    } else if (fxType === 'exclamation_double') {
      // Kaget: Bold red double exclamation marks `!!` on upper-right
      const drawBang = (bx, by, rot, sc) => {
        ctx.save();
        ctx.translate(bx, by + bob);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.roundRect(-11, -48, 22, 64, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 34, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawBang(818, 212, 0.14, 0.95);
      drawBang(862, 228, 0.26, 0.85);
    } else if (fxType === 'question_purple') {
      // Penasaran: Glossy purple-violet question mark `?` on upper-left
      ctx.save();
      ctx.translate(178, 205 + bob);
      ctx.rotate(-0.14);
      const qGrad = ctx.createLinearGradient(0, -55, 0, 55);
      qGrad.addColorStop(0, '#C084FC');
      qGrad.addColorStop(0.5, '#9333EA');
      qGrad.addColorStop(1, '#6B21A8');
      ctx.strokeStyle = qGrad;
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -22, 26, Math.PI * 0.92, Math.PI * 2.15);
      ctx.quadraticCurveTo(22, 6, 0, 18);
      ctx.stroke();
      ctx.fillStyle = '#7E22CE';
      ctx.beginPath();
      ctx.arc(0, 46, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fxType === 'zz_teal') {
      // Lelah: Teal-emerald `Z z` sleep letters on upper-right
      const drawZ = (zx, zy, sz, rot) => {
        ctx.save();
        ctx.translate(zx, zy + bob);
        ctx.rotate(rot);
        ctx.strokeStyle = '#0D9488';
        ctx.lineWidth = sz * 0.28;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-sz, -sz);
        ctx.lineTo(sz, -sz);
        ctx.lineTo(-sz, sz);
        ctx.lineTo(sz, sz);
        ctx.stroke();
        ctx.restore();
      };
      drawZ(758, 222, 22, -0.08);
      drawZ(816, 195, 16, 0.08);
    } else if (fxType === 'shiver_lines') {
      // Takut: Blue double curved shiver arcs `((` on left and `))` on right
      const jitter = Math.sin(this.time * 52) * 3;
      ctx.save();
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      // Left double shiver arcs
      [-1, 1].forEach((side) => {
        const baseX = side < 0 ? 155 : 869;
        ctx.beginPath();
        ctx.arc(baseX + jitter * side, 345, 38, side < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, side < 0 ? Math.PI * 1.25 : Math.PI * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(baseX - side * 16 + jitter * side, 395, 34, side < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, side < 0 ? Math.PI * 1.25 : Math.PI * 0.25);
        ctx.stroke();
      });
      ctx.restore();
    }

    if (this.fxTexture) {
      this.fxTexture.needsUpdate = true;
    }
  }

  updateFaceVisibility() {
    this.eyeLeftDot.visible = false;
    this.eyeRightDot.visible = false;
    this.eyeWink.visible = false;
    this.eyeHappyL.visible = false;
    this.eyeHappyR.visible = false;
    this.eyeSleepyL.visible = false;
    this.eyeSleepyR.visible = false;
    this.eyeHeartL.visible = false;
    this.eyeHeartR.visible = false;
    this.eyePoutL.visible = false;
    this.eyePoutR.visible = false;
    this.browPoutL.visible = false;
    this.browPoutR.visible = false;
    this.foreheadFurrow.visible = false;

    if (this.mouthW) this.mouthW.visible = false;
    if (this.mouthHappy) this.mouthHappy.visible = false;
    if (this.mouthO) this.mouthO.visible = false;
    if (this.mouthMesh) this.mouthMesh.visible = false;
    if (this.mouthPout) this.mouthPout.visible = false;

    if (this.mood === 'dots') {
      // Classic Kawaii Mochi Kitten: Big sparkling cat eyes + sweet ω kitten mouth
      this.eyeLeftDot.visible = true;
      this.eyeRightDot.visible = true;
      if (this.mouthW) this.mouthW.visible = true;
    } else if (this.mood === 'wink') {
      // Playful wink with cute cheeky smirk
      this.eyeLeftDot.visible = true;
      this.eyeWink.visible = true;
      if (this.mouthW) this.mouthW.visible = true;
    } else if (this.mood === 'happy') {
      // Joyous celebration: Arched happy eyes (⌒ ⌒) + open laughing mouth with tongue (ᗨ)
      this.eyeHappyL.visible = true;
      this.eyeHappyR.visible = true;
      if (this.mouthHappy) this.mouthHappy.visible = true;
    } else if (this.mood === 'pout' || this.mood === 'sleepy') {
      // ADORABLE TODDLER POUT / SULK:
      // Rosy blushed cheek contours, tightly pursed jutting pout lips, drooping puppy-dog eyes, furrowed drama brow!
      this.eyePoutL.visible = true;
      this.eyePoutR.visible = true;
      this.browPoutL.visible = true;
      this.browPoutR.visible = true;
      this.foreheadFurrow.visible = true;
      if (this.mouthPout) this.mouthPout.visible = true;
    } else if (this.mood === 'hearts') {
      // Loving adoration: Bouncy hearts + sweet kitten mouth
      this.eyeHeartL.visible = true;
      this.eyeHeartR.visible = true;
      if (this.mouthW) this.mouthW.visible = true;
    }
  }

  createShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const sCtx = canvas.getContext('2d');

    const grad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 115);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.32)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(128, 128, 115, 0, Math.PI * 2);
    sCtx.fill();

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.set(0, -1.60, 0);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadowMesh);
  }

  createOrbit() {
    this.orbitGroup = new THREE.Group();
    this.orbitGroup.rotation.x = 0.28;
    this.orbitGroup.rotation.z = -0.16;
    this.orbitGroup.visible = (this.fx === 'orbit');
    this.scene.add(this.orbitGroup);

    // Stardust Points
    const pCount = 420;
    const pGeo = new THREE.BufferGeometry();
    const pPos = [];
    const pColors = [];

    const radX = 2.40;
    const radZ = 1.30;

    for (let i = 0; i < pCount; i++) {
      const theta = (i / pCount) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 0.16;
      const x = Math.cos(theta) * radX + spread;
      const z = Math.sin(theta) * radZ + spread;
      const y = (Math.random() - 0.5) * 0.10;

      pPos.push(x, y, z);
      const alpha = 0.35 + Math.random() * 0.65;
      pColors.push(alpha, alpha, alpha);
    }

    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.038,
      vertexColors: true,
      transparent: true,
      opacity: 0.90
    });

    this.orbitPoints = new THREE.Points(pGeo, pMat);
    this.orbitGroup.add(this.orbitPoints);

    // Glowing Satellite Moon / Mini-Mochi (Frame 02)
    const moonGeo = new THREE.SphereGeometry(0.18, 32, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.2,
      emissive: 0xEEF2FF,
      emissiveIntensity: 0.50
    });
    this.satelliteMoon = new THREE.Mesh(moonGeo, moonMat);
    this.orbitGroup.add(this.satelliteMoon);
  }

  createBadge() {
    this.badgeGroup = new THREE.Group();
    this.badgeGroup.position.set(-1.18, 0.95, 0.45);
    this.badgeGroup.visible = !!this.badge;
    this.mochiGroup.add(this.badgeGroup);

    this.badgeCanvas = document.createElement('canvas');
    this.badgeCanvas.width = 512 * BADGE_SCALE;
    this.badgeCanvas.height = 320 * BADGE_SCALE;
    this.badgeCtx = this.badgeCanvas.getContext('2d');
    this.badgeTex = new THREE.CanvasTexture(this.badgeCanvas);

    const badgePlaneMat = new THREE.MeshBasicMaterial({
      map: this.badgeTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const badgePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.30, 0.81), badgePlaneMat);
    badgePlane.renderOrder = 98;
    this.badgeGroup.add(badgePlane);

    this.drawBadge();
  }

  drawBadge() {
    if (!this.badge) {
      this.badgeGroup.visible = false;
      return;
    }
    this.badgeGroup.visible = true;

    const ctx = this.badgeCtx;
    // The typing badge redraws ~20x/s; it is authored at 512x320 and drawn scaled.
    ctx.setTransform(BADGE_SCALE, 0, 0, BADGE_SCALE, 0, 0);
    const w = 512;
    const h = 320;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    if (this.badge === 'chat_purple' || this.badge === 'chat_blue') {
      const isPurple = (this.badge === 'chat_purple');
      const pw = 300;
      const ph = 160;
      const pr = 80;
      const px = cx - pw / 2;
      const py = cy - ph / 2;

      // 1. Radiant Luminous Neon Backlight / Halo Glow
      const glowColor = isPurple ? 'rgba(168, 85, 247, 0.95)' : 'rgba(56, 189, 248, 0.95)';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 42;
      ctx.fillStyle = isPurple ? '#9333EA' : '#2563EB';
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, pr);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // 2. High-End Glossy Gradient Body (Bright & Saturated Amethyst / Azure)
      const baseGrad = ctx.createLinearGradient(0, py, 0, py + ph);
      if (isPurple) {
        baseGrad.addColorStop(0.00, '#C084FC'); // Radiant lavender-violet top light
        baseGrad.addColorStop(0.24, '#A855F7'); // Electric neon purple
        baseGrad.addColorStop(0.68, '#7E22CE'); // Rich royal amethyst
        baseGrad.addColorStop(1.00, '#581C87'); // Deep velvety violet base
      } else {
        baseGrad.addColorStop(0.00, '#7DD3FC');
        baseGrad.addColorStop(0.24, '#38BDF8');
        baseGrad.addColorStop(0.68, '#2563EB');
        baseGrad.addColorStop(1.00, '#1E40AF');
      }
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, pr);
      ctx.fill();

      // 3. Curved Glass Specular Highlight (Upper half only, leaving dots in high-contrast zone)
      const shineGrad = ctx.createLinearGradient(0, py + 6, 0, py + ph * 0.40);
      shineGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.88)'); // Pure crystalline white light
      shineGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.35)');
      shineGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.00)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.roundRect(px + 8, py + 6, pw - 16, (ph - 12) * 0.38, [pr - 6, pr - 6, 18, 18]);
      ctx.fill();

      // 4. Polished 3D Glass Bevel Rim (Crisp bright light catching the rounded outer perimeter)
      const rimGrad = ctx.createLinearGradient(0, py, 0, py + ph);
      rimGrad.addColorStop(0.00, 'rgba(255, 255, 255, 0.95)'); // Bright top rim specular
      rimGrad.addColorStop(0.40, 'rgba(255, 255, 255, 0.38)');
      rimGrad.addColorStop(0.75, isPurple ? 'rgba(192, 132, 252, 0.25)' : 'rgba(125, 211, 252, 0.25)');
      rimGrad.addColorStop(1.00, 'rgba(255, 255, 255, 0.60)'); // Subtle bottom refraction rim
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // 5. Delicate Bottom Internal Refraction Caustic
      ctx.strokeStyle = isPurple ? 'rgba(243, 232, 255, 0.45)' : 'rgba(224, 242, 254, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, py + ph - 16, pw * 0.32, 0.24 * Math.PI, 0.76 * Math.PI);
      ctx.stroke();

      // 6. BOLD, ALWAYS-VISIBLE TYPING WAVE DOTS (100% Solid Contrast in Motion)
      const t = this.time * 5.8;
      for (let i = -1; i <= 1; i++) {
        const phase = t - i * 0.95;
        const hop = Math.sin(phase);
        const hopY = Math.max(0, hop) * 16; // Hops upward in dynamic wave
        const dotR = 17 + hop * 1.5;
        const dx = cx + i * 54;
        const dy = cy + 12 - hopY;

        // Punchy drop shadow under each dot for guaranteed >12:1 contrast against violet
        ctx.shadowColor = 'rgba(20, 5, 45, 0.90)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
      }

    } else if (this.badge === 'alert') {
      // Golden Amber glossy crystal circle with '!'
      const r = 88;
      ctx.shadowColor = 'rgba(255, 170, 20, 0.95)';
      ctx.shadowBlur = 42;
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      const amberGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      amberGrad.addColorStop(0.00, '#FDE047');
      amberGrad.addColorStop(0.35, '#F59E0B');
      amberGrad.addColorStop(0.80, '#D97706');
      amberGrad.addColorStop(1.00, '#B45309');
      ctx.fillStyle = amberGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Top glass shine
      const shineGrad = ctx.createLinearGradient(0, cy - r + 4, 0, cy);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.45, r * 0.72, r * 0.40, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // '!' icon
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 10, cy - 45, 20, 50);
      ctx.beginPath();
      ctx.arc(cx, cy + 32, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';

    } else if (this.badge === 'online') {
      // Radiant emerald glass sphere
      const r = 68;
      ctx.shadowColor = 'rgba(16, 230, 145, 0.95)';
      ctx.shadowBlur = 38;
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      const emeraldGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      emeraldGrad.addColorStop(0.0, '#6EE7B7');
      emeraldGrad.addColorStop(0.35, '#10B981');
      emeraldGrad.addColorStop(1.0, '#047857');
      ctx.fillStyle = emeraldGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Top shine
      const shineGrad = ctx.createLinearGradient(0, cy - r + 4, 0, cy);
      shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
      shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = shineGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.45, r * 0.70, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.80)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    this.badgeTex.needsUpdate = true;
  }

  createAccessories() {
    this.accessoriesGroup = new THREE.Group();
    this.mochiGroup.add(this.accessoriesGroup);

    this.createHeadsetAccessory();
    this.createGlassesAccessory();
    this.createPencilAccessory();
    this.createCrownAccessory();
    this.createRibbonAccessory();
    this.createGradCapAccessory();
    this.createBeretAccessory();

    this.accessoryMotionOffset = { rotX: 0, rotY: 0, rotZ: 0, posY: 0 };
    this.setAccessory(this.currentAccessory);
  }

  createHeadsetAccessory() {
    this.headsetGroup = new THREE.Group();
    this.accessoriesGroup.add(this.headsetGroup);

    // High-end Kawaii Studio Over-Ear Headphones
    // Colors: Sleek Royal Indigo (#4338CA), Soft Frost Lilac (#DDD6FE), Brilliant Cyan (#00E5FF), Cream Plush Leather (#FFFDF7)
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0x4338CA, // Royal Indigo
      roughness: 0.24,
      metalness: 0.25
    });
    const cushionLeatherMat = new THREE.MeshStandardMaterial({
      color: 0xFFFDF7, // Creamy Marshmallow Plush
      roughness: 0.50,
      metalness: 0.05
    });
    const metallicChromeMat = new THREE.MeshStandardMaterial({
      color: 0xF1F5F9,
      metalness: 0.88,
      roughness: 0.18
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x38BDF8, // Glowing Cyan Metallic Rim
      metalness: 0.80,
      roughness: 0.20
    });
    this.headsetLedMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      transparent: true,
      opacity: 0.95
    });

    // 1. Arched Headband spanning across crown, seamlessly behind ears (Zero clipping/translucency anomaly)
    const headbandPoints = [
      new THREE.Vector3(-1.50, 0.18, 0.22),
      new THREE.Vector3(-1.36, 0.72, -0.04),
      new THREE.Vector3(-0.80, 1.38, -0.10),
      new THREE.Vector3( 0.00, 1.48, -0.12),
      new THREE.Vector3( 0.80, 1.38, -0.10),
      new THREE.Vector3( 1.36, 0.72, -0.04),
      new THREE.Vector3( 1.50, 0.18, 0.22)
    ];
    const headbandCurve = new THREE.CatmullRomCurve3(headbandPoints);
    const bandGeo = new THREE.TubeGeometry(headbandCurve, 48, 0.068, 16, false);
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    this.headsetGroup.add(bandMesh);

    // 1b. Underside Cushion Padding
    const cushionPoints = [
      new THREE.Vector3(-1.05, 1.10, -0.08),
      new THREE.Vector3(-0.55, 1.34, -0.10),
      new THREE.Vector3( 0.00, 1.40, -0.11),
      new THREE.Vector3( 0.55, 1.34, -0.10),
      new THREE.Vector3( 1.05, 1.10, -0.08)
    ];
    const cushionCurve = new THREE.CatmullRomCurve3(cushionPoints);
    const cushionPadGeo = new THREE.TubeGeometry(cushionCurve, 32, 0.048, 12, false);
    const cushionPadMesh = new THREE.Mesh(cushionPadGeo, cushionLeatherMat);
    this.headsetGroup.add(cushionPadMesh);

    // 1c. Metal Adjustment Sliders
    [-1, 1].forEach((side) => {
      const sliderGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.16, 20);
      const slider = new THREE.Mesh(sliderGeo, metallicChromeMat);
      slider.position.set(side * 1.44, 0.48, 0.10);
      slider.rotation.set(-0.06, 0, -side * 0.38);
      this.headsetGroup.add(slider);
    });

    // 2. Chunky, Pillowy Kawaii Earcups (Left & Right)
    const buildCup = (side) => {
      const cup = new THREE.Group();
      cup.position.set(side * 1.50, 0.14, 0.22);
      cup.rotation.set(0.08, -side * 0.52, -side * 0.10);

      // 2a. Plush Cheek Cushion Ring (Marshmallow cream)
      const cushionGeo = new THREE.SphereGeometry(0.38, 32, 24);
      cushionGeo.scale(0.42, 1.12, 1.12);
      const cushion = new THREE.Mesh(cushionGeo, cushionLeatherMat);
      cushion.position.x = side * -0.06;
      cup.add(cushion);

      // 2b. Outer Acoustic Chamber Shell (Sleek Indigo)
      const shellGeo = new THREE.CylinderGeometry(0.40, 0.43, 0.22, 32);
      const shell = new THREE.Mesh(shellGeo, bandMat);
      shell.rotation.z = Math.PI / 2;
      shell.position.x = side * 0.05;
      cup.add(shell);

      // 2c. Outer Bezel Rim (Cyan metallic)
      const rimGeo = new THREE.TorusGeometry(0.36, 0.034, 16, 32);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = side * 0.16;
      cup.add(rim);

      // 2d. Glowing Neon Cyan LED Soundwave Disc
      const ledGeo = new THREE.CircleGeometry(0.32, 32);
      const ledDisc = new THREE.Mesh(ledGeo, this.headsetLedMat);
      ledDisc.rotation.y = (side < 0 ? -Math.PI / 2 : Math.PI / 2);
      ledDisc.position.x = side * 0.165;
      ledDisc.renderOrder = 2;
      cup.add(ledDisc);

      // 2e. Stylized Musical Note / Soundwave Accent in center of earcup
      const noteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 });
      const noteStem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), noteMat);
      noteStem.position.set(side * 0.170, 0.02, 0.02);
      noteStem.rotation.x = Math.PI / 2;
      noteStem.renderOrder = 3;
      cup.add(noteStem);

      const noteHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), noteMat);
      noteHead.scale.set(0.6, 1.2, 1.4);
      noteHead.position.set(side * 0.170, -0.05, -0.04);
      noteHead.rotation.x = Math.PI / 2;
      noteHead.renderOrder = 3;
      cup.add(noteHead);

      if (side < 0) this.headsetLedL = ledDisc;
      else this.headsetLedR = ledDisc;

      return cup;
    };

    this.headsetGroup.add(buildCup(-1));
    this.headsetGroup.add(buildCup(1));

    // 3. Flexible Studio Boom Microphone
    const micPoints = [
      new THREE.Vector3(-1.50, 0.06, 0.32),
      new THREE.Vector3(-1.22, -0.04, 0.76),
      new THREE.Vector3(-0.84, -0.10, 1.18),
      new THREE.Vector3(-0.60, -0.12, 1.30)
    ];
    const micCurve = new THREE.CatmullRomCurve3(micPoints);
    const micArmGeo = new THREE.TubeGeometry(micCurve, 24, 0.018, 10, false);
    const micArm = new THREE.Mesh(micArmGeo, metallicChromeMat);
    this.headsetGroup.add(micArm);

    // Oval foam sponge filter
    const spongeGeo = new THREE.SphereGeometry(0.055, 20, 16);
    spongeGeo.scale(1.25, 0.95, 0.95);
    const spongeMat = new THREE.MeshStandardMaterial({ color: 0x1E1B4B, roughness: 0.95 });
    const sponge = new THREE.Mesh(spongeGeo, spongeMat);
    sponge.position.set(-0.58, -0.12, 1.31);
    sponge.rotation.set(0.12, 0.45, 0.18);
    this.headsetGroup.add(sponge);

    // Glowing LED recording dot on mic tip
    const micDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), this.headsetLedMat);
    micDot.position.set(-0.52, -0.12, 1.34);
    micDot.renderOrder = 2;
    this.headsetGroup.add(micDot);

    this.headsetGroup.visible = false;
  }

  createGlassesAccessory() {
    this.glassesGroup = new THREE.Group();
    this.glassesGroup.renderOrder = 2500;
    this.accessoriesGroup.add(this.glassesGroup);

    // Adorable Chunky Kawaii Scholar Glasses (Warm Glossy Honey Amber & Polished Gold)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xD97706, // Warm glowing honey amber
      roughness: 0.18,
      metalness: 0.45
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B, // Polished Gold Bridge & Accents
      metalness: 0.85,
      roughness: 0.18
    });
    const lensMat = new THREE.MeshBasicMaterial({
      color: 0xE0F2FE,
      opacity: 0.18,
      transparent: true,
      depthWrite: false
    });
    const gleamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });

    // 1. Chunky Rounded Rims (Left & Right) — Calibrated to the 3D Storyboard Eyes on faceShellMesh (±0.52, -0.05, 1.33)
    const rimRadius = 0.32;
    const rimTube = 0.024;
    const rimGeo = new THREE.TorusGeometry(rimRadius, rimTube, 16, 48);

    const rimL = new THREE.Mesh(rimGeo, frameMat);
    rimL.position.set(-0.52, -0.05, 1.34);
    rimL.rotation.set(-0.04, -0.14, 0);
    rimL.renderOrder = 2500;
    this.glassesGroup.add(rimL);

    const rimR = new THREE.Mesh(rimGeo, frameMat);
    rimR.position.set(0.52, -0.05, 1.34);
    rimR.rotation.set(-0.04, 0.14, 0);
    rimR.renderOrder = 2500;
    this.glassesGroup.add(rimR);

    // 2. Arched Gold Nose Bridge
    const bridgePoints = [
      new THREE.Vector3(-0.20, -0.03, 1.35),
      new THREE.Vector3( 0.00,  0.03, 1.37),
      new THREE.Vector3( 0.20, -0.03, 1.35)
    ];
    const bridgeCurve = new THREE.CatmullRomCurve3(bridgePoints);
    const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 16, 0.018, 12, false);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, goldMat);
    bridgeMesh.renderOrder = 2501;
    this.glassesGroup.add(bridgeMesh);

    // 3. Transparent Crystal Lenses
    const lensGeo = new THREE.CircleGeometry(rimRadius - 0.015, 32);

    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(-0.52, -0.05, 1.335);
    lensL.rotation.set(-0.04, -0.14, 0);
    lensL.renderOrder = 2500;
    this.glassesGroup.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.set(0.52, -0.05, 1.335);
    lensR.rotation.set(-0.04, 0.14, 0);
    lensR.renderOrder = 2500;
    this.glassesGroup.add(lensR);

    // 4. Iconic Anime Glasses Gleam Highlight (Upper-Left on each lens)
    const gleamGeo = new THREE.CapsuleGeometry(0.022, 0.095, 4, 12);

    const gleamL = new THREE.Mesh(gleamGeo, gleamMat);
    gleamL.position.set(-0.63, 0.06, 1.348);
    gleamL.rotation.set(-0.04, -0.14, Math.PI / 4);
    gleamL.renderOrder = 2502;
    this.glassesGroup.add(gleamL);

    const gleamR = new THREE.Mesh(gleamGeo, gleamMat);
    gleamR.position.set(0.41, 0.06, 1.348);
    gleamR.rotation.set(-0.04, 0.14, Math.PI / 4);
    gleamR.renderOrder = 2502;
    this.glassesGroup.add(gleamR);

    // 5. Chic Gold Temple Hinges (Discreet, cute, sits flush at outer rim edges)
    [-1, 1].forEach((side) => {
      const hingeGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.055, 16);
      const hinge = new THREE.Mesh(hingeGeo, goldMat);
      hinge.position.set(side * 0.85, -0.05, 1.29);
      hinge.rotation.z = Math.PI / 2;
      hinge.renderOrder = 2501;
      this.glassesGroup.add(hinge);
    });

    this.glassesGroup.visible = false;
  }

  createPencilAccessory() {
    this.pencilGroup = new THREE.Group();
    this.pencilGroup.position.set(0, 0.02, 0.12);
    this.pencilGroup.rotation.set(0.12, -0.20, -0.75);
    this.pencilGroup.renderOrder = 2500;

    // Attach directly to Right Paw (NOT core) so it moves naturally with the paw without squashing!
    if (this.handR) {
      this.handR.add(this.pencilGroup);
    } else {
      this.accessoriesGroup.add(this.pencilGroup);
    }

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.30 });
    const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, metalness: 0.95, roughness: 0.15 });
    const eraserMat = new THREE.MeshStandardMaterial({ color: 0xFB7185, roughness: 0.70 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xFEF3C7, roughness: 0.55 });
    const leadMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.35, metalness: 0.3 });

    // Hexagonal Yellow Body (Cute chibi proportion)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.38, 6), woodMat);
    shaft.renderOrder = 2500;
    this.pencilGroup.add(shaft);

    // Silver Ferrule
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.06, 16), ferruleMat);
    ferrule.position.y = 0.22;
    ferrule.renderOrder = 2500;
    this.pencilGroup.add(ferrule);

    // Pink Eraser
    const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.07, 16), eraserMat);
    eraser.position.y = 0.27;
    eraser.renderOrder = 2500;
    this.pencilGroup.add(eraser);

    // Sharpened Wooden Collar
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.11, 16), collarMat);
    cone.position.y = -0.24;
    cone.rotation.x = Math.PI;
    cone.renderOrder = 2500;
    this.pencilGroup.add(cone);

    // Graphite Tip
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 16), leadMat);
    lead.position.y = -0.28;
    lead.rotation.x = Math.PI;
    lead.renderOrder = 2500;
    this.pencilGroup.add(lead);

    this.pencilGroup.visible = false;
  }

  /**
   * 3D Royal 24K Gold Champion Crown ('crown') with Ruby, Emerald & Sapphire Cabochon Jewels
   */
  createCrownAccessory() {
    this.crownGroup = new THREE.Group();
    this.crownGroup.position.set(0, 1.15, 0.22);
    this.crownGroup.rotation.set(0.18, 0, -0.04);
    this.crownGroup.scale.set(1.42, 1.42, 1.42);
    this.crownGroup.renderOrder = 2400;
    this.accessoriesGroup.add(this.crownGroup);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xFACC15,
      metalness: 0.72,
      roughness: 0.22
    });
    const velvetMat = new THREE.MeshStandardMaterial({
      color: 0xBE123C,
      roughness: 0.62,
      metalness: 0.05
    });
    const rubyMat = new THREE.MeshStandardMaterial({ color: 0xFF1E56, roughness: 0.14, metalness: 0.2, emissive: 0x880824, emissiveIntensity: 0.35 });
    const sapphireMat = new THREE.MeshStandardMaterial({ color: 0x00B4D8, roughness: 0.14, metalness: 0.2, emissive: 0x00487C, emissiveIntensity: 0.35 });
    const pearlMat = new THREE.MeshStandardMaterial({ color: 0xFFFDF9, roughness: 0.18, metalness: 0.08 });

    // 1. Base Golden Circlet Ring + Lower Torus Trim
    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.30, 0.16, 32), goldMat);
    this.crownGroup.add(baseCyl);

    const lowerRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.032, 16, 32), goldMat);
    lowerRim.rotation.x = Math.PI / 2;
    lowerRim.position.y = -0.07;
    this.crownGroup.add(lowerRim);

    // 2. Plump Royal Crimson Velvet Inner Cushion Dome
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 18), velvetMat);
    cushion.scale.set(1.0, 0.78, 1.0);
    cushion.position.y = 0.05;
    this.crownGroup.add(cushion);

    // 3. 5 Royal Crown Spires with Pearl Tips around the perimeter
    const spireCount = 5;
    for (let i = 0; i < spireCount; i++) {
      const ang = (i / spireCount) * Math.PI * 2;
      const sx = Math.sin(ang) * 0.31;
      const sz = Math.cos(ang) * 0.31;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 16), goldMat);
      spire.position.set(sx, 0.18, sz);
      spire.rotation.set(Math.cos(ang) * 0.18, 0, -Math.sin(ang) * 0.18);
      this.crownGroup.add(spire);

      const tipPearl = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), pearlMat);
      tipPearl.position.set(Math.sin(ang) * 0.34, 0.30, Math.cos(ang) * 0.34);
      this.crownGroup.add(tipPearl);
    }

    // 4. Front Gemstones (Center Ruby + Flanking Sapphires)
    const centerRuby = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), rubyMat);
    centerRuby.scale.set(0.85, 1.15, 0.55);
    centerRuby.position.set(0, 0.0, 0.325);
    this.crownGroup.add(centerRuby);

    [-1, 1].forEach((s) => {
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), sapphireMat);
      gem.position.set(s * 0.19, 0.0, 0.265);
      this.crownGroup.add(gem);
    });

    this.crownGroup.visible = false;
  }

  /**
   * 3D Satin Strawberry-Pink Kawaii Bow ('ribbon') perched cutely by the Left Ear
   */
  createRibbonAccessory() {
    this.ribbonGroup = new THREE.Group();
    this.ribbonGroup.position.set(-0.44, 1.04, 0.64);
    this.ribbonGroup.rotation.set(0.18, -0.18, 0.24);
    this.ribbonGroup.scale.set(1.55, 1.55, 1.55);
    this.ribbonGroup.renderOrder = 2450;
    this.accessoriesGroup.add(this.ribbonGroup);

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xFF3E7F,
      roughness: 0.28,
      metalness: 0.06
    });
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0xE01E63,
      roughness: 0.24,
      metalness: 0.08
    });

    // Center pillowy knot
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.088, 24, 18), knotMat);
    knot.scale.set(0.92, 1.12, 0.85);
    this.ribbonGroup.add(knot);

    // Left & Right Puffy Satin Loops
    [-1, 1].forEach((s) => {
      const loop = new THREE.Mesh(new THREE.SphereGeometry(0.165, 28, 20), ribbonMat);
      loop.scale.set(1.32, 0.92, 0.52);
      loop.position.set(s * 0.18, 0.02, -0.02);
      loop.rotation.set(0, -s * 0.18, s * 0.16);
      this.ribbonGroup.add(loop);

      // Fluttering lower ribbon tail
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.22, 16), ribbonMat);
      tail.scale.set(1.0, 1.0, 0.42);
      tail.position.set(s * 0.11, -0.15, -0.03);
      tail.rotation.set(0, 0, s * 0.38);
      this.ribbonGroup.add(tail);
    });

    this.ribbonGroup.visible = false;
  }

  /**
   * 3D Academic Mortarboard Graduation Cap ('gradcap') with Golden Tassel
   */
  createGradCapAccessory() {
    this.gradCapGroup = new THREE.Group();
    this.gradCapGroup.position.set(0, 1.15, 0.22);
    this.gradCapGroup.rotation.set(0.24, 0.08, -0.06);
    this.gradCapGroup.scale.set(1.32, 1.32, 1.32);
    this.gradCapGroup.renderOrder = 2420;
    this.accessoriesGroup.add(this.gradCapGroup);

    const capMat = new THREE.MeshStandardMaterial({
      color: 0x1E1B4B,
      roughness: 0.42,
      metalness: 0.12
    });
    const goldTasselMat = new THREE.MeshStandardMaterial({
      color: 0xFACC15,
      metalness: 0.75,
      roughness: 0.22
    });

    // Skullcap base
    const skull = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 32), capMat);
    this.gradCapGroup.add(skull);

    // Square mortarboard top
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.045, 0.96), capMat);
    board.position.y = 0.09;
    board.rotation.y = Math.PI / 4;
    this.gradCapGroup.add(board);

    // Center gold button & draped golden tassel
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), goldTasselMat);
    btn.position.set(0, 0.12, 0);
    this.gradCapGroup.add(btn);

    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0.24, 0.11, 0.18),
      new THREE.Vector3(0.46, 0.08, 0.32),
      new THREE.Vector3(0.50, -0.14, 0.36)
    ]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 20, 0.016, 10, false), goldTasselMat);
    this.gradCapGroup.add(cord);

    const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.14, 16), goldTasselMat);
    fringe.position.set(0.50, -0.19, 0.36);
    this.gradCapGroup.add(fringe);

    this.gradCapGroup.visible = false;
  }

  /**
   * 3D Plump Sakura Artist Beret ('beret') tilted jauntily on Mochi's crown
   */
  createBeretAccessory() {
    this.beretGroup = new THREE.Group();
    this.beretGroup.position.set(0.18, 1.13, 0.22);
    this.beretGroup.rotation.set(0.18, 0, -0.24);
    this.beretGroup.scale.set(1.38, 1.38, 1.38);
    this.beretGroup.renderOrder = 2410;
    this.accessoriesGroup.add(this.beretGroup);

    const woolMat = new THREE.MeshStandardMaterial({
      color: 0xE11D48,
      roughness: 0.62,
      metalness: 0.05
    });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x4C0519, roughness: 0.45 });

    const headband = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.09, 32), bandMat);
    this.beretGroup.add(headband);

    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), woolMat);
    puff.scale.set(1.15, 0.46, 1.12);
    puff.position.set(0.04, 0.12, 0);
    this.beretGroup.add(puff);

    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.06, 6, 12), woolMat);
    stem.position.set(0.04, 0.34, 0);
    stem.rotation.z = -0.25;
    this.beretGroup.add(stem);

    this.beretGroup.visible = false;
  }

  setAccessory(name) {
    this.currentAccessory = name || null;
    const isTeacher = (name === 'teacher' || name === 'teach' || name === 'study' || name === 'sensei');
    if (this.headsetGroup) this.headsetGroup.visible = (name === 'headset' || isTeacher);
    if (this.glassesGroup) this.glassesGroup.visible = (name === 'glasses' || isTeacher || name === 'scholar');
    if (this.pencilGroup) this.pencilGroup.visible = (name === 'pencil' || isTeacher);
    if (this.crownGroup) this.crownGroup.visible = (name === 'crown' || name === 'king' || name === 'queen');
    if (this.ribbonGroup) this.ribbonGroup.visible = (name === 'ribbon' || name === 'bow');
    if (this.gradCapGroup) this.gradCapGroup.visible = (name === 'gradcap' || name === 'scholar');
    if (this.beretGroup) this.beretGroup.visible = (name === 'beret' || name === 'artist');

    if (name !== 'pencil' && !isTeacher) {
      if (this.pencilGroup && !this.pencilGroup.visible) {
        if (this.handR && !this.handGesture && this.handState === 'hidden') {
          this.handR.visible = false;
          this.handR.scale.set(0.001, 0.001, 0.001);
        }
      }
    }

    if (!name) {
      this.accessoryMotionOffset = { rotX: 0, rotY: 0, rotZ: 0, posY: 0 };
    }
  }

  setVoiceCompanionStrictMode(enabled) {
    this.voiceCompanionStrictMode = !!enabled;
    if (this.voiceCompanionStrictMode) {
      this.autoExpressions = false;
      this.setFx(null);
      this.setBadge(null);
      this.setAura(null);
      if (this.mood !== 'dots') {
        this.mood = 'dots';
        this.updateFaceVisibility();
        this.updateSkinBlush();
      }
      if (this.handState !== 'hidden' && this.handState !== 'wave') {
        this.retractHands();
      }
    }
  }

  attachAudioAnalyser(analyser, sampleRate = 48000) {
    if (this.wawaLipsync) {
      this.wawaLipsync.attachAnalyser(analyser, sampleRate);
    }
  }

  detachAudioAnalyser() {
    if (this.wawaLipsync) {
      this.wawaLipsync.detachAnalyser();
    }
  }

  setThinking(isThinking) {
    this.isThinking = !!isThinking;
    if (this.voiceCompanionStrictMode) {
      if (this.mood !== 'dots') {
        this.mood = 'dots';
        this.updateFaceVisibility();
      }
      this.setBadge(null);
      this.setAura(null);
      this.targetRot.z = 0;
      this.targetRot.y = 0;
      this.retractHands();
      return;
    }
    if (this.isThinking) {
      this.setBadge('chat_purple');
      this.setAura('purple');
      this.targetRot.z = 0.08;
      this.targetRot.y = 0.12;
      this.triggerHandGesture('wave', 3.5);
    } else {
      this.setBadge(null);
      this.setAura(null);
      this.targetRot.z = 0;
      this.targetRot.y = 0;
      this.retractHands();
    }
  }

  setTalking(isTalking, durationSeconds = 0) {
    const nextTalking = !!isTalking;
    const wasTalking = !!this.isTalking;
    this.isTalking = nextTalking;
    this.talkDuration = durationSeconds > 0 ? durationSeconds : 0;

    if (nextTalking && !wasTalking) {
      // Seed mouthRig smoothly from the active mood's natural resting aperture so start-of-speech NEVER snaps!
      const desc = this._currentMoodDesc || this.resolveMoodDescriptor(this.mood);
      if (this.mouthRig && this.mouthRig.presence < 0.05) {
        if (desc && (desc.mouthType === 'happy_open_tall' || desc.mouthType === 'happy_open_wide')) {
          this.mouthRig.open = 0.62;
          this.mouthRig.smile = 0.82;
          this.mouthRig.width = 1.16;
        } else if (desc && desc.mouthType === 'surprised_o') {
          this.mouthRig.open = 0.68;
          this.mouthRig.roundness = 0.78;
          this.mouthRig.width = 0.84;
        }
      }
      this._analyserSilentTime = 0;
    }

    if (!this.isTalking && !this._manualVisemeLock) {
      this.activeViseme = null;
      // Do NOT snap renderCurvedFaceAndFx to closed here; let mouthRig.presence & open glide softly to rest!
    }
  }

  /**
   * Maps any phonetic or AIUEO viseme code into continuous 3D viscoelastic `mouthRig` targets.
   */
  resolveVisemeTargets(rawCode, rawIntensity = 1.0) {
    let code = String(rawCode || 'A').trim().toUpperCase();
    let k = Math.max(0.15, Math.min(1.0, Number(rawIntensity) || 1.0));
    const mMatch = /^([AIUEO])([123])$/.exec(code);
    const rawUpper = code;
    if (mMatch) {
      code = mMatch[1];
      const tier = Number(mMatch[2]);
      k = tier === 1 ? 0.42 : (tier === 2 ? 0.72 : 1.0);
    }

    const T = {
      open: 0.55, width: 1.04, smile: 0.30, roundness: 0.08,
      pucker: 0.0, bilabial: 0.0, tongueLift: 0.12, tongueCurl: 0.0, lipTuck: 0.0
    };

    if (code === 'BMP' || code === 'B,M,P' || code === 'PP' || code === 'VISEME_PP') {
      T.open = 0.0; T.width = 0.98; T.smile = 0.18; T.roundness = 0.0; T.bilabial = 1.0; T.tongueLift = 0.0;
    } else if (code === 'FV' || code === 'F,V' || code === 'FF' || code === 'VISEME_FF') {
      T.open = 0.28 + k * 0.14; T.width = 1.04; T.smile = 0.34; T.lipTuck = 0.95; T.tongueLift = 0.15;
    } else if (rawUpper === 'U' || rawUpper === 'U1' || rawUpper === 'VISEME_U') {
      T.open = 0.48 + k * 0.14; T.width = 0.72; T.smile = 0.0; T.roundness = 0.98; T.pucker = 0.94; T.tongueLift = -0.14;
    } else if (code === 'U' || code === 'QW' || code === 'Q,W') {
      T.open = 0.50 + k * 0.24; T.width = 0.80; T.smile = 0.02; T.roundness = 0.96; T.pucker = 0.62; T.tongueLift = -0.10;
    } else if (code === 'O' || code === 'VISEME_O') {
      T.open = 0.46 + k * 0.46; T.width = 0.76; T.smile = 0.02; T.roundness = 0.98; T.pucker = 0.22; T.tongueLift = -0.10;
    } else if (code === 'I' || code === 'VISEME_I') {
      T.open = 0.26 + k * 0.36; T.width = 1.24 + k * 0.08; T.smile = 0.94; T.roundness = 0.0; T.tongueLift = 0.38;
    } else if (code === 'CDNSTXYZ' || code.includes('C,D') || code === 'VISEME_DD' || code === 'VISEME_SS') {
      T.open = 0.32 + k * 0.22; T.width = 1.22; T.smile = 0.86; T.roundness = 0.0; T.tongueLift = 0.42;
    } else if (code === 'E' || code === 'EE' || code === 'VISEME_E') {
      const ek = rawUpper === 'EE' ? 0.82 : k;
      T.open = 0.38 + ek * 0.42; T.width = 1.18 + ek * 0.08; T.smile = 0.84; T.roundness = 0.0; T.tongueLift = 0.28;
    } else if (code === 'AEI' || code.includes('A,E,I')) {
      T.open = 0.64 + k * 0.18; T.width = 1.18; T.smile = 0.72; T.roundness = 0.04; T.tongueLift = 0.22;
    } else if (code === 'TH' || code === 'VISEME_TH') {
      T.open = 0.44 + k * 0.18; T.width = 1.18; T.smile = 0.76; T.roundness = 0.0; T.tongueLift = 0.72;
    } else if (code === 'L' || code === 'VISEME_RR') {
      T.open = 0.54 + k * 0.20; T.width = 1.06; T.smile = 0.32; T.roundness = 0.10; T.tongueLift = 0.65; T.tongueCurl = 0.95;
    } else if (code === 'GK' || code.includes('G,K') || code === 'VISEME_KK') {
      T.open = 0.52 + k * 0.22; T.width = 1.04; T.smile = 0.22; T.roundness = 0.18; T.tongueLift = 0.32;
    } else if (code === 'CHJSH' || code.includes('CH,J') || code === 'VISEME_CH') {
      T.open = 0.44 + k * 0.18; T.width = 0.94; T.smile = 0.24; T.roundness = 0.62; T.pucker = 0.42; T.tongueLift = 0.22;
    } else {
      // 'A' / 'AA' / general open vowel
      T.open = 0.40 + k * 0.50; T.width = 1.04 + k * 0.06; T.smile = 0.34; T.roundness = 0.08; T.tongueLift = 0.14;
    }
    return T;
  }

  /**
   * Explicitly set a phonetic or vowel viseme on the 3D Curved Face Shell (100% Toothless).
   * Pass `immediate = true` when capturing static 3D Mochi showcase cards so springs converge immediately.
   */
  setViseme(code, intensity = 1.0, immediate = false) {
    this.activeViseme = code || null;
    this.visemeIntensity = intensity ?? 1.0;
    if (immediate && this.mouthRig) {
      if (this.activeViseme) {
        const T = this.resolveVisemeTargets(this.activeViseme, this.visemeIntensity);
        Object.assign(this.mouthRig, {
          open: T.open, openVel: 0,
          width: T.width, widthVel: 0,
          smile: T.smile, smileVel: 0,
          roundness: T.roundness, roundnessVel: 0,
          pucker: T.pucker, puckerVel: 0,
          bilabial: T.bilabial, bilabialVel: 0,
          tongueLift: T.tongueLift, tongueLiftVel: 0,
          tongueCurl: T.tongueCurl, tongueCurlVel: 0,
          lipTuck: T.lipTuck, lipTuckVel: 0,
          presence: 1.0, presenceVel: 0
        });
      } else {
        Object.assign(this.mouthRig, {
          open: 0, openVel: 0, width: 1.0, widthVel: 0, smile: 0.28, smileVel: 0,
          roundness: 0, roundnessVel: 0, pucker: 0, puckerVel: 0, bilabial: 0, bilabialVel: 0,
          tongueLift: 0, tongueLiftVel: 0, tongueCurl: 0, tongueCurlVel: 0, lipTuck: 0, lipTuckVel: 0,
          presence: 0, presenceVel: 0
        });
      }
      this.renderCurvedFaceAndFx();
      return;
    }
    if (this._isStaticChartRenderer) {
      this.renderCurvedFaceAndFx();
    }
  }

  updateMouthMotion(dt) {
    if (this.talkDuration > 0) {
      this.talkDuration -= dt;
      if (this.talkDuration <= 0) {
        this.isTalking = false;
        this.talkDuration = 0;
        if (!this._manualVisemeLock) this.activeViseme = null;
      }
    }

    if (!this.mouthRig || this.mouthRig.smile === undefined) {
      this.mouthRig = {
        open: 0.0, openVel: 0.0,
        width: 1.0, widthVel: 0.0,
        smile: 0.28, smileVel: 0.0,
        roundness: 0.0, roundnessVel: 0.0,
        pucker: 0.0, puckerVel: 0.0,
        bilabial: 0.0, bilabialVel: 0.0,
        tongueLift: 0.0, tongueLiftVel: 0.0,
        tongueCurl: 0.0, tongueCurlVel: 0.0,
        lipTuck: 0.0, lipTuckVel: 0.0,
        presence: 0.0, presenceVel: 0.0,
        headPitch: 0.0, headPitchVel: 0.0,
        headRoll: 0.0, headRollVel: 0.0,
        headYaw: 0.0, headYawVel: 0.0,
        audioEnv: 0.0,
        holdViseme: null,
        holdTimer: 0.0
      };
    }

    const rig = this.mouthRig;

    // Sub-stepped Critically Damped Viscoelastic Flesh Oscillator (zeta ~ 0.94 => zero robotic bounce, zero blink!)
    const stepFlesh = (val, vel, target, omega = 13.0, zeta = 0.94) => {
      val = Number.isFinite(val) ? val : target;
      vel = Number.isFinite(vel) ? vel : 0;
      const clampedDt = Math.max(0, Math.min(dt, 0.08));
      const subSteps = Math.max(1, Math.ceil(clampedDt / 0.016));
      const sDt = clampedDt / subSteps;
      for (let i = 0; i < subSteps; i++) {
        const accel = -omega * omega * (val - target) - 2 * zeta * omega * vel;
        vel += accel * sDt;
        val += vel * sDt;
      }
      if (Math.abs(val - target) < 0.0008 && Math.abs(vel) < 0.0015) {
        val = target;
        vel = 0;
      }
      return [val, vel];
    };

    const quinticEase = (x) => {
      const t = Math.max(0, Math.min(1, x));
      return t * t * t * (t * (t * 6 - 15) + 10);
    };

    let targetOpen = 0.0;
    let targetWidth = 1.0;
    let targetSmile = 0.28;
    let targetRound = 0.0;
    let targetPucker = 0.0;
    let targetBilabial = 0.0;
    let targetTongueLift = 0.0;
    let targetTongueCurl = 0.0;
    let targetLipTuck = 0.0;
    let targetPresence = 0.0;
    let targetPitch = 0.0;
    let targetRoll = 0.0;
    let targetYaw = 0.0;

    const hasLiveAnalyser = !!(this.wawaLipsync && this.wawaLipsync.analyser);
    let handledByLiveAudio = false;

    // -------------------------------------------------------------------------
    // 1. LIVE WEBAUDIO STREAMING MODE (Coarticulated Asymmetric Envelope + Formant Glide)
    // -------------------------------------------------------------------------
    if (this.isTalking && hasLiveAnalyser) {
      const rawViseme = this.wawaLipsync.processAudio();
      const feat = this.wawaLipsync.features;
      const rawVol = feat ? Math.max(0, Math.min(1, feat.volume * 2.1)) : 0;

      if (rawVol > 0.020) {
        this._analyserSilentTime = 0;
      } else {
        this._analyserSilentTime = (this._analyserSilentTime || 0) + dt;
      }

      // Only let live analyser control mouth if audio is genuinely flowing through this analyser node;
      // if an alternate TTS path is playing (analyser silent > 0.28s while isTalking === true), fall back seamlessly!
      if ((this._analyserSilentTime || 0) <= 0.28) {
        handledByLiveAudio = true;
        targetPresence = 1.0;

        // Asymmetric Speech Envelope: crisp 42ms vowel onset, warm 190ms coarticulated vowel sustain!
        // Prevents 30-70ms inter-consonant FFT dips from slamming the mouth shut like an eye blink.
        const envRate = rawVol > rig.audioEnv ? 23.0 : 5.2;
        rig.audioEnv += (rawVol - rig.audioEnv) * Math.min(1.0, dt * envRate);
        const env = rig.audioEnv;

        // Minimum 135ms viseme hysteresis so formants glide smoothly instead of flickering at 60Hz
        rig.holdTimer = Math.max(0, (rig.holdTimer || 0) - dt);
        if (rawVol > 0.035 && rawViseme !== VISEMES.sil && (rig.holdTimer <= 0 || !rig.holdViseme)) {
          rig.holdViseme = rawViseme;
          rig.holdTimer = (rawViseme === VISEMES.PP) ? 0.095 : 0.140;
        }
        const vis = rig.holdViseme || rawViseme;

        if (env > 0.028) {
          if (vis === VISEMES.PP && rawVol < 0.24) {
            // Brief natural bilabial consonant touch ('B, M, P')
            targetOpen = 0.02;
            targetBilabial = 0.88;
            targetWidth = 0.96;
            targetSmile = 0.22;
            targetPitch = 0.018;
          } else {
            // Coarticulated open vowel carrier modulated by acoustic energy
            const baseVowelOpen = Math.min(0.92, 0.30 + env * 0.88);
            targetOpen = baseVowelOpen;

            if (vis === VISEMES.I || vis === VISEMES.E || vis === VISEMES.SS || vis === VISEMES.DD) {
              targetOpen = Math.min(0.74, 0.28 + env * 0.64);
              targetWidth = 1.20 + env * 0.10;
              targetSmile = 0.86;
              targetRound = 0.0;
              targetTongueLift = 0.36;
            } else if (vis === VISEMES.O) {
              targetOpen = Math.min(0.90, 0.38 + env * 0.78);
              targetWidth = 0.78;
              targetSmile = 0.06;
              targetRound = 0.90;
              targetPucker = 0.42;
              targetTongueLift = -0.12;
            } else if (vis === VISEMES.U || vis === VISEMES.CH) {
              targetOpen = Math.min(0.62, 0.28 + env * 0.48);
              targetWidth = 0.74;
              targetSmile = 0.04;
              targetRound = 0.88;
              targetPucker = vis === VISEMES.U ? 0.80 : 0.48;
              targetTongueLift = -0.14;
            } else if (vis === VISEMES.RR || vis === VISEMES.TH) {
              targetOpen = Math.min(0.72, 0.32 + env * 0.56);
              targetWidth = 1.08;
              targetSmile = 0.52;
              targetTongueLift = 0.62;
              targetTongueCurl = vis === VISEMES.RR ? 0.72 : 0.0;
            } else if (vis === VISEMES.FF) {
              targetOpen = Math.min(0.46, 0.22 + env * 0.34);
              targetWidth = 1.04;
              targetSmile = 0.34;
              targetLipTuck = 0.75;
            } else {
              // Warm open 'A' vowel
              targetWidth = 1.06 + env * 0.06;
              targetSmile = 0.42;
              targetRound = 0.08;
              targetTongueLift = 0.16;
            }

            // Prosodic head pitch, roll & yaw coupled directly to real voice energy!
            this.talkTimer = (this.talkTimer || 0) + dt;
            const pt = this.talkTimer;
            targetPitch = -(env - 0.22) * 0.105 + Math.sin(pt * 2.4) * 0.018;
            targetRoll = Math.sin(pt * 1.55) * 0.056;
            targetYaw = Math.sin(pt * 1.12 + 0.6) * 0.058;
          }
        } else {
          // Quiet pause in live audio stream
          targetOpen = 0.0;
          targetSmile = 0.32;
          targetPitch = 0.010;
        }
      }
    }

    // -------------------------------------------------------------------------
    // 2. COARTICULATED PROCEDURAL PHONEME SEQUENCER (Natural Human/Anime Prosody!)
    // Connected vowels STAY OPEN and glide smoothly (A -> I -> O -> M -> A -> E -> U)
    // instead of slamming shut every syllable like a sine-wave eye blink!
    // -------------------------------------------------------------------------
    if (this.isTalking && !handledByLiveAudio) {
      targetPresence = 1.0;
      this.talkTimer = (this.talkTimer || 0) + dt;

      // Two melodic, unhurried conversational phrases (~5.35s loop) with lush connected vowel glides,
      // gentle breath micro-resonance, rare soft bilabials, and rich 3D head/body prosody!
      const SCRIPT = [
        // Phrase 1: Warm, joyful greeting ("Ha-looo te-man, yuk be-la-jar!")
        { dur: 0.30, open: 0.78, w: 1.08, sm: 0.44, rd: 0.04, pk: 0.00, bi: 0.00, tl: 0.16, tc: 0.00, p: -0.058, r:  0.048, y: -0.045 }, // Ha- (plush open A + upward lift)
        { dur: 0.32, open: 0.74, w: 0.78, sm: 0.04, rd: 0.94, pk: 0.28, bi: 0.00, tl: -0.10, tc: 0.25, p:  0.024, r:  0.062, y: -0.024 }, // -looo (glides smoothly into tall round O!)
        { dur: 0.26, open: 0.54, w: 1.22, sm: 0.84, rd: 0.00, pk: 0.00, bi: 0.00, tl: 0.34, tc: 0.00, p: -0.026, r:  0.036, y:  0.018 }, // te- (glides wide into happy D-smile E!)
        { dur: 0.16, open: 0.02, w: 0.96, sm: 0.26, rd: 0.00, pk: 0.00, bi: 0.92, tl: 0.00, tc: 0.00, p:  0.042, r:  0.010, y:  0.032 }, // -m- (soft marshmallow bilabial kiss + gentle nod)
        { dur: 0.34, open: 0.88, w: 1.12, sm: 0.48, rd: 0.04, pk: 0.00, bi: 0.00, tl: 0.18, tc: 0.00, p: -0.068, r: -0.038, y:  0.056 }, // -aaan (expressive open A bloom + buoyant lift!)
        { dur: 0.28, open: 0.50, w: 0.70, sm: 0.02, rd: 0.96, pk: 0.86, bi: 0.00, tl: -0.12, tc: 0.00, p:  0.022, r: -0.058, y:  0.042 }, // yuuk (cute round U pucker cushion!)
        { dur: 0.26, open: 0.62, w: 1.20, sm: 0.78, rd: 0.00, pk: 0.00, bi: 0.00, tl: 0.32, tc: 0.52, p: -0.034, r: -0.044, y:  0.012 }, // be-la- (open E + curled L tongue glide)
        { dur: 0.30, open: 0.68, w: 1.10, sm: 0.60, rd: 0.04, pk: 0.00, bi: 0.00, tl: 0.18, tc: 0.00, p: -0.024, r: -0.018, y: -0.016 }, // -jaar (warm trailing A)
        { dur: 0.52, open: 0.00, w: 1.02, sm: 0.40, rd: 0.00, pk: 0.00, bi: 0.00, tl: 0.00, tc: 0.00, p:  0.020, r:  0.000, y:  0.000 }, // [Calm smiling conversational breath]

        // Phrase 2: Curious & encouraging ("A-yooo la-giii, pas-ti bi-sa!")
        { dur: 0.28, open: 0.80, w: 1.08, sm: 0.46, rd: 0.04, pk: 0.00, bi: 0.00, tl: 0.16, tc: 0.00, p: -0.052, r: -0.056, y:  0.058 }, // A-
        { dur: 0.32, open: 0.76, w: 0.76, sm: 0.04, rd: 0.95, pk: 0.32, bi: 0.00, tl: -0.10, tc: 0.00, p:  0.028, r: -0.038, y:  0.042 }, // -yooo (tall symmetrical O!)
        { dur: 0.26, open: 0.50, w: 1.26, sm: 0.90, rd: 0.00, pk: 0.00, bi: 0.00, tl: 0.40, tc: 0.00, p: -0.024, r:  0.020, y:  0.008 }, // la-giii (wide joyful I smile!)
        { dur: 0.16, open: 0.02, w: 0.96, sm: 0.24, rd: 0.00, pk: 0.00, bi: 0.92, tl: 0.00, tc: 0.00, p:  0.044, r:  0.038, y: -0.026 }, // p- (soft bilabial P cushion)
        { dur: 0.32, open: 0.88, w: 1.12, sm: 0.54, rd: 0.04, pk: 0.00, bi: 0.00, tl: 0.18, tc: 0.00, p: -0.066, r:  0.060, y: -0.054 }, // -aas- (joyful emphasis A!)
        { dur: 0.26, open: 0.48, w: 1.28, sm: 0.92, rd: 0.00, pk: 0.00, bi: 0.00, tl: 0.42, tc: 0.00, p: -0.028, r:  0.046, y: -0.038 }, // -ti bi- (stays open in bright I smile!)
        { dur: 0.30, open: 0.66, w: 1.10, sm: 0.58, rd: 0.04, pk: 0.00, bi: 0.00, tl: 0.16, tc: 0.00, p: -0.018, r:  0.022, y: -0.014 }, // -saa!
        { dur: 0.54, open: 0.00, w: 1.02, sm: 0.42, rd: 0.00, pk: 0.00, bi: 0.00, tl: 0.00, tc: 0.00, p:  0.018, r:  0.000, y:  0.000 }  // [Warm phrase settle & gentle nod]
      ];

      let totalDur = 0;
      for (let i = 0; i < SCRIPT.length; i++) totalDur += SCRIPT[i].dur;
      let localT = this.talkTimer % totalDur;
      let idx = 0;
      while (idx < SCRIPT.length - 1 && localT >= SCRIPT[idx].dur) {
        localT -= SCRIPT[idx].dur;
        idx++;
      }

      const curr = SCRIPT[idx];
      const prev = SCRIPT[(idx - 1 + SCRIPT.length) % SCRIPT.length];
      // Fluid coarticulation glide across 68% of syllable, with warm vocal micro-resonance on held nuclei!
      const blend = quinticEase(Math.min(1.0, localT / Math.max(0.05, curr.dur * 0.68)));
      const mix = (a, b) => a + (b - a) * blend;

      const baseOpen = mix(prev.open, curr.open);
      const vocalResonance = baseOpen > 0.25 ? Math.sin(this.talkTimer * 9.2) * 0.026 : 0;
      const desc = this._currentMoodDesc || this.resolveMoodDescriptor(this.mood);
      const moodSmileBoost = (desc && (desc.id === 'gembira' || desc.id === 'senang')) ? 0.16 : 0;

      targetOpen = Math.max(0, Math.min(1, baseOpen + vocalResonance));
      targetWidth = mix(prev.w, curr.w);
      targetSmile = Math.min(1, mix(prev.sm, curr.sm) + moodSmileBoost * (1.0 - mix(prev.rd, curr.rd)));
      targetRound = mix(prev.rd, curr.rd);
      targetPucker = mix(prev.pk, curr.pk);
      targetBilabial = mix(prev.bi, curr.bi);
      targetTongueLift = mix(prev.tl, curr.tl);
      targetTongueCurl = mix(prev.tc, curr.tc);
      targetPitch = mix(prev.p, curr.p);
      targetRoll = mix(prev.r, curr.r);
      targetYaw = mix(prev.y, curr.y);
    } else if (!this.isTalking && this.activeViseme) {
      // 3. EXPLICIT VISEME PREVIEW MODE (Interactive Studio Chips)
      const T = this.resolveVisemeTargets(this.activeViseme, this.visemeIntensity || 1.0);
      targetPresence = 1.0;
      targetOpen = T.open;
      targetWidth = T.width;
      targetSmile = T.smile;
      targetRound = T.roundness;
      targetPucker = T.pucker;
      targetBilabial = T.bilabial;
      targetTongueLift = T.tongueLift;
      targetTongueCurl = T.tongueCurl;
      targetLipTuck = T.lipTuck;
      targetPitch = -(T.open - 0.3) * 0.035;
    } else if (!this.isTalking) {
      // Idle settle: smoothly release presence and return toward resting mood seam
      const desc = this._currentMoodDesc || this.resolveMoodDescriptor(this.mood);
      if (rig.presence > 0.02 && desc && (desc.mouthType === 'happy_open_tall' || desc.mouthType === 'happy_open_wide')) {
        targetOpen = 0.64;
        targetSmile = 0.84;
        targetWidth = 1.18;
      }
      rig.audioEnv = (rig.audioEnv || 0) * Math.max(0, 1 - dt * 10);
    }

    // Asymmetric plush marshmallow stepping: silky vowel glide (omega=11.6), unhurried soft closing (omega=8.6)
    const openOmega = targetOpen >= rig.open ? 11.6 : 8.6;
    [rig.open, rig.openVel] = stepFlesh(rig.open, rig.openVel, targetOpen, openOmega, 0.96);
    [rig.width, rig.widthVel] = stepFlesh(rig.width, rig.widthVel, targetWidth, 10.2, 0.96);
    [rig.smile, rig.smileVel] = stepFlesh(rig.smile, rig.smileVel, targetSmile, 10.0, 0.96);
    [rig.roundness, rig.roundnessVel] = stepFlesh(rig.roundness, rig.roundnessVel, targetRound, 10.4, 0.96);
    [rig.pucker, rig.puckerVel] = stepFlesh(rig.pucker, rig.puckerVel, targetPucker, 10.6, 0.96);
    [rig.bilabial, rig.bilabialVel] = stepFlesh(rig.bilabial, rig.bilabialVel, targetBilabial, 13.5, 0.94);
    [rig.tongueLift, rig.tongueLiftVel] = stepFlesh(rig.tongueLift, rig.tongueLiftVel, targetTongueLift, 11.8, 0.94);
    [rig.tongueCurl, rig.tongueCurlVel] = stepFlesh(rig.tongueCurl, rig.tongueCurlVel, targetTongueCurl, 11.8, 0.94);
    [rig.lipTuck, rig.lipTuckVel] = stepFlesh(rig.lipTuck, rig.lipTuckVel, targetLipTuck, 11.8, 0.94);
    [rig.presence, rig.presenceVel] = stepFlesh(rig.presence, rig.presenceVel, targetPresence, targetPresence > 0.5 ? 12.5 : 8.2, 0.96);
    [rig.headPitch, rig.headPitchVel] = stepFlesh(rig.headPitch, rig.headPitchVel, targetPitch, 8.4, 0.88);
    [rig.headRoll, rig.headRollVel] = stepFlesh(rig.headRoll, rig.headRollVel, targetRoll, 7.2, 0.88);
    [rig.headYaw, rig.headYawVel] = stepFlesh(rig.headYaw, rig.headYawVel, targetYaw, 6.8, 0.88);

    // Completely hide legacy 3D meshes so they NEVER flicker or conflict with faceCanvas!
    if (this.mouthHappy) this.mouthHappy.visible = false;
    if (this.mouthW) this.mouthW.visible = false;
    if (this.mouthO) this.mouthO.visible = false;
    if (this.mouthPout) this.mouthPout.visible = false;
  }

  updateAccessoriesMotion(dt) {
    const isTeacher = (this.currentAccessory === 'teacher' || this.currentAccessory === 'teach' || this.currentAccessory === 'study');
    if (this.currentAccessory === 'headset' || isTeacher) {
      // Gentle, cozy, relaxing lofi listening groove (Single master phase, ZERO DIZZINESS)
      const lofiTime = this.time * 1.5;

      // 1. Soft rhythmic head tilt (only +/- 1.2 degrees, smooth and cozy)
      const tiltZ = Math.sin(lofiTime) * 0.022;
      // 2. Soft micro-nod on the beat (only 0.8 degrees)
      const nodX = (Math.sin(lofiTime * 2.0) * 0.5 + 0.5) * 0.015;
      // 3. Gentle float breath
      const bobY = Math.sin(lofiTime) * 0.010;

      this.accessoryMotionOffset = { rotX: nodX, rotY: 0, rotZ: tiltZ, posY: bobY };

      // 4. Soothing Breathing LED Glow (smooth ambient light, zero aggressive strobe)
      if (this.headsetLedMat) {
        const breath = Math.sin(lofiTime) * 0.20 + 0.80;
        this.headsetLedMat.opacity = breath;
        if (this.headsetLedL && this.headsetLedR) {
          const pScale = 1.0 + breath * 0.03;
          this.headsetLedL.scale.set(pScale, pScale, 1.0);
          this.headsetLedR.scale.set(pScale, pScale, 1.0);
        }
      }
    } else if (this.currentAccessory === 'glasses') {
      // Intelligent reading focus: soft focus tilt and smooth, gentle text-scan
      const scanPeriod = 2.6;
      const scanProg = (this.time % scanPeriod) / scanPeriod;
      let scanX = 0;
      if (scanProg < 0.80) {
        scanX = ((scanProg / 0.80) - 0.5) * 0.035;
      } else {
        const retProg = (scanProg - 0.80) / 0.20;
        scanX = (0.5 - retProg) * 0.035;
      }
      if (this.eyeLeftDot && this.eyeRightDot) {
        this.eyeLeftDot.position.x = -0.38 + scanX;
        this.eyeRightDot.position.x = 0.38 + scanX;
      }
      this.accessoryMotionOffset = { rotX: 0.025, rotY: Math.sin(this.time * 1.2) * 0.018, rotZ: 0, posY: 0 };
    } else if (this.currentAccessory === 'pencil') {
      // Gentle, calm study rhythm (NO JITTER, NO RAPID SHAKE)
      const studyTime = this.time * 1.8;
      const nod = Math.sin(studyTime) * 0.015;
      this.accessoryMotionOffset = {
        rotX: 0.025 + nod,
        rotY: 0.035, // Looking slightly towards the pencil with cute focus
        rotZ: -0.015,
        posY: -0.008
      };
    } else {
      this.accessoryMotionOffset = { rotX: 0, rotY: 0, rotZ: 0, posY: 0 };
      if (this.eyeLeftDot && this.eyeRightDot && this.mood === 'dots') {
        this.eyeLeftDot.position.x = -0.38;
        this.eyeRightDot.position.x = 0.38;
      }
    }
  }

  createParticles() {
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    this.particles = [];
  }

  spawnParticle() {
    if (this.fx === 'stars' && this.particles.length < 12) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#F0F4FF';
      ctx.beginPath();
      ctx.moveTo(32, 2);
      ctx.quadraticCurveTo(32, 32, 62, 32);
      ctx.quadraticCurveTo(32, 32, 32, 62);
      ctx.quadraticCurveTo(32, 32, 2, 32);
      ctx.quadraticCurveTo(32, 32, 32, 2);
      ctx.fill();

      const mat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.95
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set((Math.random() - 0.5) * 0.8, 0.8, 0.3);
      sprite.scale.set(0.28, 0.28, 0.28);
      this.particleGroup.add(sprite);

      this.particles.push({
        sprite,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.6 + Math.random() * 0.5,
        life: 1.0,
        decay: 0.7 + Math.random() * 0.4
      });

    } else if (this.fx === 'hearts' && this.particles.length < 8) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FF3866';
      ctx.beginPath();
      ctx.moveTo(32, 45);
      ctx.bezierCurveTo(15, 26, 10, 10, 24, 10);
      ctx.bezierCurveTo(32, 10, 32, 18, 32, 18);
      ctx.bezierCurveTo(32, 18, 32, 10, 40, 10);
      ctx.bezierCurveTo(54, 10, 49, 26, 32, 45);
      ctx.fill();

      const mat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        opacity: 0.95
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set((Math.random() - 0.5) * 0.7, 0.8, 0.3);
      sprite.scale.set(0.24, 0.24, 0.24);
      this.particleGroup.add(sprite);

      this.particles.push({
        sprite,
        vx: (Math.random() - 0.5) * 0.35,
        vy: 0.5 + Math.random() * 0.45,
        life: 1.0,
        decay: 0.6 + Math.random() * 0.4
      });
    }
  }

  updateParticles(dt) {
    if (this.fx === 'stars' || this.fx === 'hearts') {
      if (Math.random() < 0.25) this.spawnParticle();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.material.opacity = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particleGroup.remove(p.sprite);
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Public Modular Controls (Bongkar-Pasang) ---
  holdMood(durationSeconds = 3.5) {
    this.holdMoodUntil = Date.now() + durationSeconds * 1000;
  }

  setMoodInstant(m) {
    this._instantMood = true;
    this.setMood(m);
    this._instantMood = false;
    this.syncMoodTargets(true);
    this.renderCurvedFaceAndFx();
  }

  setMood(m) {
    if (this.voiceCompanionStrictMode) {
      this.mood = 'dots';
      this.syncMoodTargets(false);
      this.triggerJiggle(0.14);
      if (m === 'wink' || m === 'happy' || m === 'hearts' || m === 'senang' || m === 'gembira') {
        this.triggerHandGesture('wave', 2.2);
      } else {
        this.retractHands();
      }
      return;
    }
    this.mood = m;
    this.syncMoodTargets(Boolean(this._instantMood));
    if (!this._instantMood) {
      this.triggerJiggle(0.18);
    }

    // Dynamic hand emergence matching mood!
    if (m === 'happy' || m === 'gembira') {
      this.triggerHandGesture('cheer', 4.0);
    } else if (m === 'pout' || m === 'sleepy') {
      this.triggerHandGesture('pout', 4.5);
      // Puffed-out chubby cheeks air inflation!
      this.squish.x = 1.18;
      this.squish.z = 1.14;
      this.squish.y = 0.94;
      this.triggerJiggle(0.24);
    } else if (m === 'wink' || m === 'hearts' || m === 'senang') {
      this.triggerHandGesture('wave', 2.2);
    } else {
      this.retractHands();
    }
  }

  /**
   * Trigger an expressive hand gesture with automatic timed retraction.
   * @param {'cheer'|'sad'|'wave'} type
   * @param {number} durationSeconds
   */
  triggerHandGesture(type, durationSeconds = 3.5) {
    if (this.voiceCompanionStrictMode) {
      if (!type || type === 'hidden' || type === 'pout' || type === 'sad') {
        this.retractHands();
        return;
      }
      type = 'wave';
    }
    if (this.handState !== type) this.handGestureTime = 0; // restart choreography
    this.handState = type;
    this.handTimer = durationSeconds;
  }

  /**
   * Smoothly retract hands back inside the cushion body.
   */
  retractHands() {
    this.handState = 'hidden';
  }

  setBadge(b) {
    if (this.voiceCompanionStrictMode) b = null;
    this.badge = b;
    this.drawBadge();
    this.badgeLag.velY = 0.75;
  }

  setFx(f) {
    if (this.voiceCompanionStrictMode) f = null;
    this.fx = f;
    this.orbitGroup.visible = (f === 'orbit');
    for (const p of this.particles) {
      this.particleGroup.remove(p.sprite);
    }
    this.particles = [];
  }

  setAura(a) {
    this.aura = a;
    const auraColors = {
      purple: 0x9D65FF,
      blue:   0x3296FF,
      amber:  0xFFAA24,
      gold:   0xFFD700,
      cyan:   0x00E5FF,
      green:  0x1EE58F,
      pink:   0xFF5096
    };

    if (a && auraColors[a]) {
      this.auraLight.color.setHex(auraColors[a]);
      this.auraLight.intensity = 3.6;
    } else {
      this.auraLight.intensity = 0;
    }
  }

  setHands(show) {
    this.showHands = show;
    this.handL.visible = show;
    this.handR.visible = show;
  }

  setEars(show) {
    this.showEars = show;
    if (this.earsGroup) this.earsGroup.visible = show;
  }

  setTail(show) {
    this.showTail = show;
    if (this.tailGroup) this.tailGroup.visible = show;
  }

  triggerJiggle(intensity = 0.22) {
    this.squish.jiggleAmp = intensity;
    this.squish.jiggleTimer = 0;
  }

  /**
   * Joyous cartoon animal hop with anticipation squash, airborne stretch, and landing rebound.
   */
  triggerHop(height = 0.38) {
    this.squish.y = 0.70;
    this.squish.x = 1.22;
    this.squish.z = 1.22;
    this.hopHeight = height;
    setTimeout(() => {
      this.hopTimer = 0.65;
      this.squish.y = 1.26;
      this.squish.x = 0.88;
      this.squish.z = 0.88;
      this.triggerJiggle(0.28);
    }, 110);
  }

  /**
   * Playful animal ear wiggle / flutter on question transitions or interactions.
   * Damped harmonic bounce with tip whip mimicking alert cat/bunny ears.
   */
  triggerEarWiggle(intensity = 1.0) {
    this.earWiggleTimer = 0.65;
    this.earWiggleDuration = 0.65;
    this.earWiggleIntensity = intensity;
    if (this.earPhys) {
      this.earPhys.L.vz += 4.5 * intensity;
      this.earPhys.L.vx -= 2.0 * intensity;
      this.earPhys.L.tipVel += 3.5 * intensity;
      this.earPhys.R.vz -= 4.5 * intensity;
      this.earPhys.R.vx -= 2.0 * intensity;
      this.earPhys.R.tipVel += 3.5 * intensity;
    }
  }

  /**
   * Periodic adorable ear twitching loop in idle/peeking mode.
   * Auto-pauses during voice talking or waving to avoid unnatural motion clash.
   */
  startEarTwitchLoop(intervalMs = 3200) {
    this.stopEarTwitchLoop();
    this.earTwitchTimer = setInterval(() => {
      if (this.showEars && !this.isDestroyed && !this.isTalking && this.handState !== 'wave') {
        this.triggerEarWiggle(0.85);
      }
    }, intervalMs);
  }

  stopEarTwitchLoop() {
    if (this.earTwitchTimer) {
      clearInterval(this.earTwitchTimer);
      this.earTwitchTimer = null;
    }
  }

  preset(name) {
    if (this.voiceCompanionStrictMode) {
      this.setMood('dots');
      this.setBadge(null);
      this.setFx(null);
      this.setAura(null);
      if (name === 'welcome' || name === 'celebrate' || name === 'love') {
        this.triggerHandGesture('wave', 2.2);
      } else {
        this.retractHands();
      }
      return;
    }
    switch (name) {
      case 'welcome':
        this.setMood('wink');
        this.setBadge(null);
        this.setFx(null);
        this.setAura(null);
        this.setHands(false);
        break;
      case 'thinking_purple':
        this.setMood('dots');
        this.setBadge('chat_purple');
        this.setFx(null);
        this.setAura('purple');
        this.setHands(false);
        break;
      case 'thinking_blue':
        this.setMood('dots');
        this.setBadge('chat_blue');
        this.setFx(null);
        this.setAura('blue');
        this.setHands(false);
        break;
      case 'universe':
        this.setMood('happy');
        this.setBadge(null);
        this.setFx('orbit');
        this.setAura('blue');
        this.setHands(false);
        break;
      case 'alert':
        this.setMood('dots');
        this.setBadge('alert');
        this.setFx(null);
        this.setAura('amber');
        this.setHands(false);
        break;
      case 'celebrate':
        this.setMood('happy');
        this.setBadge('online');
        this.setFx('stars');
        this.setAura('green');
        this.setHands(false);
        break;
      case 'love':
        this.setMood('hearts');
        this.setBadge('online');
        this.setFx('hearts');
        this.setAura('pink');
        this.setHands(false);
        break;
    }
  }

  bindEvents() {
    const dom = this.renderer.domElement;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.rotStartX = 0;
    this.rotStartY = 0;

    const onPointerDown = (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.rotStartX = this.targetRot.x;
      this.rotStartY = this.targetRot.y;
      dom.style.cursor = 'grabbing';
      try { dom.setPointerCapture(e.pointerId); } catch (_) {}
      // Tactile squish on press
      this.squish.y = 0.70;
      this.squish.x = 1.20;
      this.squish.z = 1.20;
      this.squish.velY = 0;
      clearTimeout(this._restoreRotTimeout);
      e.stopPropagation();
    };

    const onPointerMove = (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        // Smooth 3D yaw (rotation around Y) and pitch (tilt around X)
        this.targetRot.y = this.rotStartY + dx * 0.024;
        this.targetRot.x = Math.max(-0.65, Math.min(0.65, this.rotStartX - dy * 0.018));
        e.stopPropagation();
        return;
      }

      // Gentle cursor-following hover tilt
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      this.targetRot.y = x * 0.38;
      this.targetRot.x = -y * 0.24;
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      dom.style.cursor = 'grab';
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
      // Explosive jelly release recoil
      this.squish.y = 1.28;
      this.squish.x = 0.86;
      this.squish.z = 0.86;
      this.triggerJiggle(0.25);
      setTimeout(() => {
        this.squish.targetX = 1;
        this.squish.targetY = 1;
        this.squish.targetZ = 1;
      }, 80);

      // Interactive Tap Detection (dragged less than 12px)
      const dx = Math.abs(e.clientX - this.dragStartX);
      const dy = Math.abs(e.clientY - this.dragStartY);
      if (dx < 12 && dy < 12) {
        if (typeof this.onTap === 'function') {
          try { this.onTap(this); } catch (_) {}
        }
        try {
          dom.dispatchEvent(new CustomEvent('mochi-tap', { bubbles: true, detail: { mochi: this } }));
        } catch (_) {}
      }

      // Smoothly return to neutral forward-facing orientation after 1200ms
      clearTimeout(this._restoreRotTimeout);
      this._restoreRotTimeout = setTimeout(() => {
        if (!this.isDragging) {
          this.targetRot.x = 0;
          this.targetRot.y = 0;
        }
      }, 1200);
      e.stopPropagation();
    };

    const onPointerLeave = () => {
      if (!this.isDragging) {
        this.targetRot.x = 0;
        this.targetRot.y = 0;
        this.squish.targetX = 1;
        this.squish.targetY = 1;
        this.squish.targetZ = 1;
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    // Explicit touch event isolation to prevent browser page scrolling
    const stopTouch = (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    dom.addEventListener('touchstart', stopTouch, { passive: false });
    dom.addEventListener('touchmove', stopTouch, { passive: false });
    dom.addEventListener('touchend', (e) => { e.stopPropagation(); }, { passive: false });
  }

  update(dt) {
    this.time += dt;

    // 0. Advance Coarticulated Mouth & Speech Prosody FIRST so 3D body, head, cheeks & ears move in 100% unity!
    this.updateMouthMotion(dt);
    const rig = this.mouthRig || { open: 0, smile: 0.28, roundness: 0, pucker: 0, bilabial: 0, presence: 0, headPitch: 0, headRoll: 0, headYaw: 0 };
    const sp = rig.presence || 0;

    // 1. Organic Multi-Frequency Floating + Conversational Speech Buoyancy
    this.floatPos.prevY = this.floatPos.y;
    const baseFloat = Math.sin(this.time * 2.2) * 0.12 + Math.sin(this.time * 4.4) * 0.02 + Math.sin(this.time * 0.8) * 0.01;
    const speechBuoyancy = sp * ((rig.open || 0) * 0.056 - (rig.bilabial || 0) * 0.022);
    let hopOffset = 0;
    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
      const progress = 1 - Math.max(0, this.hopTimer / 0.65);
      hopOffset = Math.sin(progress * Math.PI) * Math.min(this.hopHeight || 0.30, 0.28);
    }
    this.floatPos.y = baseFloat * (1.0 - sp * 0.28) + speechBuoyancy + hopOffset;
    this.floatPos.velY = (this.floatPos.y - this.floatPos.prevY) / Math.max(dt, 0.001);
    this.mochiGroup.position.y = this.floatPos.y;

    // Shadow reacts to float height and width squish
    const shadowScale = 1.0 - this.floatPos.y * 0.8;
    this.shadowMesh.scale.set(shadowScale * this.squish.x, shadowScale, 1);
    this.shadowMesh.material.opacity = Math.max(0.35, 0.85 - this.floatPos.y * 1.5);

    // 2. Buttery 3D Rotational Damping + Expressive Conversational Head Pitch / Tilt / Yaw
    this.currentRot.x += (this.targetRot.x - this.currentRot.x) * 0.12;
    this.currentRot.y += (this.targetRot.y - this.currentRot.y) * 0.12;

    this.updateAccessoriesMotion(dt);

    const hasAccessoryMotion = (this.currentAccessory === 'headset' || this.currentAccessory === 'pencil');
    const ambientSway = hasAccessoryMotion ? 0 : Math.sin(this.time * 1.8) * 0.035 * (1.0 - sp * 0.45);
    const accRotX = (this.accessoryMotionOffset && this.accessoryMotionOffset.rotX) || 0;
    const accRotY = (this.accessoryMotionOffset && this.accessoryMotionOffset.rotY) || 0;
    const accRotZ = (this.accessoryMotionOffset && this.accessoryMotionOffset.rotZ) || 0;
    const accPosY = (this.accessoryMotionOffset && this.accessoryMotionOffset.posY) || 0;

    const speechPitch = sp * (rig.headPitch || 0);
    const speechRoll = sp * (rig.headRoll || 0);
    const speechYaw = sp * (rig.headYaw || 0);

    this.mochiGroup.rotation.x = this.currentRot.x + accRotX + speechPitch;
    this.mochiGroup.rotation.y = this.currentRot.y + ambientSway + accRotY + speechYaw;
    const desc = this.resolveMoodDescriptor(this.mood);
    this._currentMoodDesc = desc;
    const headTiltTarget = (desc && desc.headTilt) ? desc.headTilt : 0;
    this._currentHeadTilt = (this._currentHeadTilt || 0) + (headTiltTarget - (this._currentHeadTilt || 0)) * Math.min(1, dt * 10);
    this.mochiGroup.rotation.z = -this.currentRot.y * 0.15 + accRotZ + this._currentHeadTilt + speechRoll;
    this.mochiGroup.position.y = this.floatPos.y + accPosY;

    // 2b. Damped Spring Stepping for 3D Skin States & 3D Morph Rig (Horns / Ears / Steam / Empati Paws)
    const stepSpring = (val, vel, target, omega = 15.0, zeta = 0.62) => {
      val = Number.isFinite(val) ? val : target;
      vel = Number.isFinite(vel) ? vel : 0;
      const sDt = Math.min(dt, 1 / 30);
      const accel = -omega * omega * (val - target) - 2 * zeta * omega * vel;
      vel += accel * sDt;
      val += vel * sDt;
      if (Math.abs(val - target) < 0.001 && Math.abs(vel) < 0.002) {
        val = target;
        vel = 0;
      }
      return [val, vel];
    };
    if (this.skinBlend && desc) {
      let skinDirty = false;
      for (const kKey of ['takut', 'marah', 'furious', 'pout']) {
        const prev = this.skinBlend[kKey];
        const vKey = kKey + 'Vel';
        [this.skinBlend[kKey], this.skinBlend[vKey]] = stepSpring(
          this.skinBlend[kKey], this.skinBlend[vKey], desc[kKey] || 0, 14.0, 0.72
        );
        if (Math.abs(this.skinBlend[kKey] - prev) > 0.003) skinDirty = true;
      }
      if (skinDirty) this.updateSkinBlush();
    }
    if (this.morphRig && desc) {
      [this.morphRig.hornScale, this.morphRig.hornVel] = stepSpring(
        this.morphRig.hornScale, this.morphRig.hornVel, desc.horns || 0, 16.0, 0.52
      );
      [this.morphRig.earScale, this.morphRig.earVel] = stepSpring(
        this.morphRig.earScale, this.morphRig.earVel, desc.ears !== undefined ? desc.ears : 1, 15.0, 0.65
      );
      [this.morphRig.steamScale, this.morphRig.steamVel] = stepSpring(
        this.morphRig.steamScale, this.morphRig.steamVel, desc.steam || 0, 14.0, 0.58
      );
      [this.morphRig.empatiPawScale, this.morphRig.empatiPawVel] = stepSpring(
        this.morphRig.empatiPawScale, this.morphRig.empatiPawVel, desc.empatiPaws || 0, 16.0, 0.58
      );
      this.applyMorphRigMeshes();
    }

    // 3. Disney 90° Phase Inertia + Damped Harmonic Jiggle + 3D Viscoelastic Speech Jaw Stretch
    const idleInertial = Math.sin(this.time * 2.2 + Math.PI * 0.5) * 0.045 * (1.0 - sp * 0.48);

    // Viscoelastic Jiggle Decay
    let jiggleOffset = 0;
    if (this.squish.jiggleAmp > 0.002) {
      this.squish.jiggleAmp = Math.min(this.squish.jiggleAmp, 1.0);
      this.squish.jiggleTimer += Math.max(0, dt) * 26;
      jiggleOffset = Math.sin(this.squish.jiggleTimer) * Math.min(this.squish.jiggleAmp, 0.35);
      this.squish.jiggleAmp *= Math.pow(0.86, Math.max(0, dt) * 60); // Damped decay
    }

    const isPout = (this.mood === 'pout' || this.mood === 'sleepy');
    const baseTargetX = isPout ? 1.08 : 1.0;
    const baseTargetY = isPout ? 0.95 : 1.0;
    const baseTargetZ = isPout ? 1.06 : 1.0;

    // 3D Daifuku Jaw-Body Coupling: open vowels gently elongate Y while preserving marshmallow volume;
    // round/pucker vowels ('U', 'O') puff Z-depth forward and narrow X cheeks organically!
    const jawStretch = sp * ((rig.open || 0) * 0.070 - (rig.pucker || 0) * 0.020 - (rig.bilabial || 0) * 0.028);
    const cheekWidthMod = sp * (((rig.smile || 0.28) - 0.30) * 0.032 - (rig.roundness || 0) * 0.028);
    const puckerDepthMod = sp * ((rig.pucker || 0) * 0.038 + (rig.roundness || 0) * 0.024);

    this.squish.targetY = baseTargetY + idleInertial + jiggleOffset + jawStretch;
    this.squish.targetX = baseTargetX - (idleInertial + jiggleOffset) * 0.75 - jawStretch * 0.52 + cheekWidthMod;
    this.squish.targetZ = baseTargetZ - (idleInertial + jiggleOffset) * 0.75 - jawStretch * 0.42 + puckerDepthMod;

    const k = 0.28;
    const damp = 0.76;

    const fY = -k * (this.squish.y - this.squish.targetY);
    this.squish.velY = (this.squish.velY + fY) * damp;
    this.squish.y += this.squish.velY;

    const fX = -k * (this.squish.x - this.squish.targetX);
    this.squish.velX = (this.squish.velX + fX) * damp;
    this.squish.x += this.squish.velX;

    const fZ = -k * (this.squish.z - this.squish.targetZ);
    this.squish.velZ = (this.squish.velZ + fZ) * damp;
    this.squish.z += this.squish.velZ;

    this.mochiMesh.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // Face, Ears & Tail scale seamlessly with body squish & stretch
    this.faceGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.earsGroup) this.earsGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.tailGroup) this.tailGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.accessoriesGroup) this.accessoriesGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // Fox Ears & Cat Tail kinematics and expressive reaction
    this.updateEarsAndTail(dt);

    // 4. Heart eyes gentle pulse (Frame 11)
    if (this.mood === 'hearts') {
      const heartPulse = 1.45 + Math.sin(this.time * 6.5) * 0.12;
      this.eyeHeartL.scale.set(heartPulse, heartPulse, heartPulse);
      this.eyeHeartR.scale.set(heartPulse, heartPulse, heartPulse);
    }

    // 4b. Toddler Pout subtle mouth/chin quiver
    if (this.mood === 'pout' || this.mood === 'sleepy') {
      if (this.mouthPout) {
        const quiver = Math.sin(this.time * 9.5) * 0.008;
        this.mouthPout.position.y = -0.11 + quiver;
      }
    }

    // 5. Floating jointed paws (spring-driven, asymmetric, anticipation/follow-through)
    this.updatePaws(dt);

    // 6. Badge Floating Lag (Independent Spring)
    const targetBadgeY = 0.95 + Math.sin(this.time * 2.5 + 1.2) * 0.06;
    const fB = -0.32 * (this.badgeGroup.position.y - targetBadgeY);
    this.badgeLag.velY = (this.badgeLag.velY + fB) * 0.75;
    this.badgeGroup.position.y += this.badgeLag.velY;

    if (this.badge === 'chat_purple' || this.badge === 'chat_blue') {
      this._badgeTimer = (this._badgeTimer || 0) + dt;
      if (this._badgeTimer >= 0.05) {
        this._badgeTimer = 0;
        this.drawBadge();
      }
    }

    // 7. Natural Eye Blinking Cycle
    this.blinkTimer += dt;
    if (this.blinkTimer >= this.nextBlink) {
      this.blinkFactor += dt * 14;
      if (this.blinkFactor >= 1.0) {
        this.blinkFactor = 0;
        this.blinkTimer = 0;
        this.nextBlink = 2.5 + Math.random() * 3.5;
      }
      const bScale = Math.max(0.1, 1.0 - Math.sin(this.blinkFactor * Math.PI));
      this.eyeLeftDot.scale.y = bScale;
      this.eyeRightDot.scale.y = bScale;
      if (this.eyeHappyL) this.eyeHappyL.scale.y = bScale;
      if (this.eyeHappyR) this.eyeHappyR.scale.y = bScale;
    } else {
      if (this.eyeLeftDot.scale.y < 1.0) this.eyeLeftDot.scale.y = 1.0;
      if (this.eyeRightDot.scale.y < 1.0) this.eyeRightDot.scale.y = 1.0;
      if (this.eyeHappyL && this.eyeHappyL.scale.y < 1.0) this.eyeHappyL.scale.y = 1.0;
      if (this.eyeHappyR && this.eyeHappyR.scale.y < 1.0) this.eyeHappyR.scale.y = 1.0;
    }

    // 7b. Dynamic Autonomous Expression Cycling
    if (this.autoExpressions && Date.now() >= (this.holdMoodUntil || 0) && !this.isThinking) {
      this.expressionTimer += dt;
      if (this.expressionTimer >= this.nextExpression) {
        this.expressionTimer = 0;
        this.idleMoodIndex = (this.idleMoodIndex + 1) % this.idleMoods.length;
        const nextMood = this.idleMoods[this.idleMoodIndex];
        this.setMood(nextMood);
        if (nextMood === 'wink' && typeof this.triggerEarWiggle === 'function') {
          this.triggerEarWiggle(0.8);
        }
        this.nextExpression = (nextMood === 'wink' || nextMood === 'hearts') ? (2.2 + Math.random() * 1.0) : (4.0 + Math.random() * 2.5);
      }
    }

    // 8. Orbit Rotation
    if (this.fx === 'orbit') {
      this.orbitGroup.rotation.y = this.time * 1.4;
      const radX = 2.40;
      const radZ = 1.30;
      this.satelliteMoon.position.set(
        Math.cos(this.time * 1.4) * radX,
        0,
        Math.sin(this.time * 1.4) * radZ
      );
    }

    // 9. Particles Update
    this.updateParticles(dt);

    // 9b. Update Living Inferno & Aura Shader Uniforms
    if (this.auraBackUniforms) {
      this.auraBackUniforms.uTime.value = this.time;
      this.auraBackUniforms.uMarah.value = this.skinBlend ? this.skinBlend.marah : (desc ? (desc.marah || 0) : 0);
      this.auraBackUniforms.uFurious.value = this.skinBlend ? this.skinBlend.furious : (desc ? (desc.furious || 0) : 0);
    }

    // 10. Curved 3D Face Shell & Storyboard FX Redraw
    this.renderCurvedFaceAndFx();
  }


  /**
   * Floating cat paws — animation principles applied (research: Rayman-style detached limbs,
   * Animation Mentor "avoid twinning", squash & stretch, anticipation, overlap):
   *  - every paw is driven by damped springs (position, wrist rotation, finger curl, scale)
   *    so motion has natural overshoot and follow-through instead of stiff sine loops
   *  - the two paws NEVER mirror each other: different pose, height, curl and a time offset
   *  - fingers are jointed: open (wave) -> relaxed -> fist (cheer / ganbatte)
   *  - palms face the body in celebration (fist pump), never both palms to camera
   *    (that read as "surrender" / "high-five")
   */
  /**
   * Floating cat paws — animation principles applied (research: Rayman-style detached limbs,
   * Animation Mentor "avoid twinning", squash & stretch, anticipation, overlap):
   *  - every paw is driven by damped springs (position, wrist rotation, finger curl, scale)
   *    so motion has natural overshoot and follow-through instead of stiff sine loops
   *  - the two paws NEVER mirror each other: different pose, height, curl and a time offset
   *  - fingers are jointed: open (wave) -> relaxed -> fist (cheer / ganbatte)
   *  - palms face the body in celebration (fist pump), never both palms to camera
   *    (that read as "surrender" / "high-five")
   */
  /**
   * True 3D Volumetric Fleshy Paw Rig — 100% Three.js Mesh Articulation
   * Every hand shape is built from real 3D plush marshmallow geometry (plump palm, 4 jointed chubby fingers,
   * articulated thumb, glossy pink pads, and retractable demon talons) with full PBR shading, specular sheen,
   * and fleshy volume matching Mochi's body:
   *  - 'open'        : Plush wide-spread 3D cat paw with pink toe beans & heart palm pad (Senang, Kaget, Gembira)
   *  - 'fist_punch'  : 3D forward-thrusting muscular clenched brawler fist with 4 knuckle arches, locked thumb & kinetic shock ring (Marah)
   *  - 'fist_guard'  : 3D cocked boxer guard fist with stacked curled fingers and upright thumb (Marah left)
   *  - 'fist_clench' : Muscular tight clenched fists with 4 curled knuckles & locked thumb (Kesal)
   *  - 'hips_akimbo' : Firm 3D clenched fist angled powerfully against the waist in mid-air (Tegas & Sinis left)
   *  - 'scratch_head': Extended hooked chubby index finger scratching temple + 3 curled knuckles & thumb (Penasaran right)
   *  - 'chin_think'  : Upright thinking index finger along cheek + horizontal chin thumb + 3 curled knuckles (Penasaran left)
   *  - 'sassy_point' : Proud upright chubby index finger + curled knuckles (Sinis right)
   *  - 'empati_cup'  : Fleshy, softly cupped caring hands curved tenderly inward hugging chest/cheeks (Empati)
   *  - 'wipe_tear'   : Fleshy index finger reaching to wipe tear with 3D crystal sky-blue tear droplet on tip (Sedih right)
   *  - 'sad_droop'   : Limp, relaxed chubby fingers hanging downward from relaxed palm (Sedih left & Lelah right)
   *  - 'sleepy_rub'  : Fleshy clenched fist rubbing sleepy eye with circular motion (Lelah left)
   *  - 'scared_shiver': 5 chubby fingers splayed wide and trembling with 3D icy shiver ring (Takut)
   *  - 'demon_claw'  : Ferocious 3D obsidian-charcoal paws with 5 razor-sharp curved demon talons (Sangat Marah)
   *  - 'peace_sign'  : Celebratory V-sign with Index & Middle fingers high (Mahkota Juara)
   *  - 'thumbs_up'   : Proud upright chubby thumb with curled knuckles (Topi Wisuda)
   *  - 'pencil_grip' : Index & thumb pinching forward around the 3D pencil (Pensil Belajar)
   */
  /**
   * True 3D Volumetric Fleshy Paw Rig — 100% Three.js Mesh Articulation
   * Seamlessly switches between 3 dedicated, fully sculpted 3D geometries with full PBR plush shading:
   *  - 'open'       : Canonical plush 4-toed Kawaii cat paw with pink toe beans & heart pad (Senang, Kaget, Gembira)
   *  - 'fist'       : Solid continuous fleshy cartoon fist with 4 rounded knuckles & locked thumb (Marah, Kesal, Tegas)
   *  - 'point'      : Fleshy thinking/scratching hand with curved chubby index finger (Penasaran, Sinis)
   */
  applyPawShape(paw, shapeMode = 'open', isDemon = false) {
    if (!paw || !paw.userData) return;
    const u = paw.userData;
    u.shapeMode = shapeMode;

    if (u.openGroup) u.openGroup.visible = false;
    if (u.fistGroup) u.fistGroup.visible = false;
    if (u.scratchGroup) u.scratchGroup.visible = false;
    if (u.pointGroup) u.pointGroup.visible = false;

    if (shapeMode === 'fist_punch' || shapeMode === 'fist_guard' || shapeMode === 'fist_clench' || shapeMode === 'hips_akimbo' || shapeMode === 'sleepy_rub') {
      if (u.fistGroup) u.fistGroup.visible = true;
    } else if (shapeMode === 'scratch_head') {
      if (u.scratchGroup) u.scratchGroup.visible = true;
    } else if (shapeMode === 'chin_think' || shapeMode === 'sassy_point') {
      if (u.pointGroup) u.pointGroup.visible = true;
    } else {
      // Default: Clean, beloved 3D Kawaii Cat Paw ('open', 'empati_cup', 'scared_shiver', 'demon_claw', 'peace_sign', 'thumbs_up', 'pencil_grip')
      if (u.openGroup) {
        u.openGroup.visible = true;
        const showClaws = (shapeMode === 'demon_claw' || isDemon);
        if (u.toes) {
          u.toes.forEach(t => {
            if (t.clawMesh) t.clawMesh.visible = showClaws;
          });
        }
      }
    }
  }

  updatePaws(dt, snapImmediate = false) {
    if (!this.handL || !this.handR) return;
    dt = Math.min(dt, 1 / 30);

    if (this.handTimer > 0 && !snapImmediate) {
      this.handTimer -= dt;
      if (this.handTimer <= 0) this.handState = 'hidden';
    }
    this.handGestureTime = (this.handGestureTime || 0) + (snapImmediate ? 1.0 : dt);

    if (!this.pawSim) {
      const mk = (side) => ({
        pos: new THREE.Vector3(side * 1.68, -0.1, 0.48), vel: new THREE.Vector3(),
        rot: new THREE.Vector3(), rotVel: new THREE.Vector3(),
        s: 0, sVel: 0
      });
      this.pawSim = { L: mk(-1), R: mk(1) };
    }

    const t = this.time;
    const desc = this._currentMoodDesc || this.resolveMoodDescriptor(this.mood);
    const isDemon = (desc && desc.id === 'sangat_marah') || (this.skinBlend && this.skinBlend.furious > 0.5);
    const isTeacher = (this.currentAccessory === 'teacher' || this.currentAccessory === 'teach' || this.currentAccessory === 'study' || this.currentAccessory === 'sensei');

    // Resolve active hand choreography:
    // Per user mandate: ONLY 'gembira', 'senang', and 'kaget' show hands; all other expressions have NO hands.
    const allowedPawsMoods = ['gembira', 'senang', 'kaget'];
    const moodId = desc ? desc.id : '';
    const allowHands = allowedPawsMoods.includes(moodId) || this.currentAccessory === 'pencil' || isTeacher;

    let st = this.handState;
    if (!allowHands) {
      st = 'hidden';
    } else if ((!st || st === 'hidden') && !this.voiceCompanionStrictMode && this.showHands !== false) {
      if (this.currentAccessory === 'pencil' || isTeacher) {
        st = 'pencil_hold';
      } else if (desc && desc.handPose && desc.handPose !== 'hidden') {
        st = desc.handPose;
      }
    }

    const bump = (x, at, w) => { const d = (x - at) / w; return Math.abs(d) < 1 ? Math.cos(d * Math.PI * 0.5) ** 2 : 0; };

    const pose = (side) => {
      const lead = side === 1;
      const g = snapImmediate ? 1.2 : (this.handGestureTime - (lead ? 0 : 0.12));
      const bob = Math.sin(t * 2.5 + (lead ? 1.6 : 0)) * 0.04;
      const P = { x: side * 1.68, y: -0.1, z: 0.48, rx: 0, ry: 0, rz: 0, s: 0, shape: 'open' };
      if (g < 0 && st !== 'hidden') { P.s = 0; return P; }

      if (st === 'cheer' || st === 'joy_high') {
        // Gembira: Both open paws floating high in joyous celebration ("Hore / Yatta!")
        const wig = Math.sin(t * 9.5 + (lead ? 0 : 1.2)) * 0.10;
        if (lead) {
          const hop = (bump(g, 0.55, 0.16) + bump(g, 0.95, 0.16)) * 0.08;
          P.x = 1.70; P.y = 0.44 + hop + bob * 0.5; P.z = 0.50;
          P.rx = -0.05; P.ry = -0.12; P.rz = -0.30 + wig;
          P.s = 0.90; P.shape = 'open';
        } else {
          P.x = -1.70; P.y = 0.40 + bob * 0.5; P.z = 0.50;
          P.rx = -0.05; P.ry = 0.12; P.rz = 0.30 - wig;
          P.s = 0.88; P.shape = 'open';
        }
      } else if (st === 'happy_wave' || st === 'wave') {
        // Senang / Wave: Right open paw waving high in mid-air, Left open paw floating outside lower-left
        if (lead) {
          const w = Math.sin(t * 8.5) * 0.20;
          const hasHeadset = (this.currentAccessory === 'headset' || isTeacher);
          P.x = 1.68;
          P.y = (hasHeadset ? -0.16 : 0.38) + bob * 0.5;
          P.z = 0.50;
          P.rx = -0.04; P.ry = -0.12; P.rz = -0.26 + w;
          P.s = 0.90; P.shape = 'open';
        } else {
          P.x = -1.68; P.y = -0.18 + bob * 0.4; P.z = 0.48;
          P.rx = -0.04; P.ry = 0.12; P.rz = 0.24;
          P.s = (st === 'wave') ? 0.0 : 0.86; P.shape = 'open';
        }
      } else if (st === 'firm_hips') {
        // Tegas: Both firm fists floating outside waist in determined "Bertolak pinggang" stance!
        P.x = side * 1.72; P.y = -0.22 + bob * 0.3; P.z = 0.48;
        P.rx = 0.05; P.ry = -side * 0.25; P.rz = side * 0.35;
        P.s = 0.92; P.shape = 'hips_akimbo';
      } else if (st === 'skeptical_chin') {
        // Sinis: Right thinking paw resting under cheek, Left firm fist at waist
        if (lead) {
          P.x = 1.42; P.y = -0.24 + Math.sin(t * 3.5) * 0.02; P.z = 0.54;
          P.rx = -0.10; P.ry = -0.22; P.rz = -0.15;
          P.s = 0.90; P.shape = 'chin_think';
        } else {
          P.x = -1.70; P.y = -0.20 + bob * 0.3; P.z = 0.48;
          P.rx = 0.05; P.ry = 0.25; P.rz = -0.35;
          P.s = 0.88; P.shape = 'hips_akimbo';
        }
      } else if (st === 'empati_float' || st === 'empati_chest') {
        // Empati: Both softly cupped caring paws with pink beans resting tenderly under chin matching Master Storyboard 1:1!
        P.x = side * 0.34; P.y = -0.42 + bob * 0.2; P.z = 1.12;
        P.rx = 0.22; P.ry = side * 0.16; P.rz = -side * 0.42;
        P.s = 0.92; P.shape = 'open';
      } else if (st === 'scratch_head') {
        // Penasaran / Bingung: Right 4-toed chubby paw scratching temple/ear, Left open paw floating outside!
        if (lead) {
          const scratch = Math.sin(t * 11.0) * 0.04;
          P.x = 1.46; P.y = 0.62 + scratch * 0.3; P.z = 0.52;
          P.rx = 0.12; P.ry = -0.32; P.rz = 0.42 + scratch;
          P.s = 0.92; P.shape = 'scratch_head';
        } else {
          P.x = -1.68; P.y = -0.16 + bob * 0.3; P.z = 0.48;
          P.rx = 0.04; P.ry = 0.18; P.rz = -0.18;
          P.s = 0.88; P.shape = 'open';
        }
      } else if (st === 'shock_flail') {
        // Kaget: Both open paws flung wide outward in mid-air shock!
        const jolt = Math.sin(t * 18.0) * 0.025;
        P.x = side * 1.74; P.y = 0.24 + jolt; P.z = 0.50;
        P.rx = 0.02; P.ry = -side * 0.14; P.rz = -side * 0.45;
        P.s = 0.92; P.shape = 'open';
      } else if (st === 'wipe_tears') {
        // Sedih: Right hand wiping tear near right cheek, Left hand drooping limp
        if (lead) {
          const wipe = Math.sin(t * 6.5) * 0.035;
          P.x = 1.48; P.y = 0.12 + wipe; P.z = 0.52;
          P.rx = 0.06; P.ry = -0.22; P.rz = 0.22;
          P.s = 0.90; P.shape = 'open';
        } else {
          P.x = -1.68; P.y = -0.22 + bob * 0.3; P.z = 0.48;
          P.rx = 0.08; P.ry = 0.14; P.rz = 0.18;
          P.s = 0.88; P.shape = 'open';
        }
      } else if (st === 'annoyed_fists') {
        // Kesal: Both clenched fists floating outside lower sides, trembling with annoyance!
        const shake = Math.sin(t * 24.0) * 0.016;
        P.x = side * 1.70 + shake; P.y = -0.14 + bob * 0.3; P.z = 0.50;
        P.rx = 0.08; P.ry = -side * 0.16; P.rz = -side * 0.18;
        P.s = 0.92; P.shape = 'fist_clench';
      } else if (st === 'sleepy_rub') {
        // Lelah: Left curled hand rubbing sleepy eye, Right limp hand hanging low
        if (!lead) {
          const rub = Math.sin(t * 4.5) * 0.035;
          P.x = -1.45; P.y = 0.16 + rub; P.z = 0.52;
          P.rx = 0.08; P.ry = 0.22; P.rz = -0.24 + rub;
          P.s = 0.90; P.shape = 'fist_clench';
        } else {
          P.x = 1.68; P.y = -0.26 + bob * 0.2; P.z = 0.48;
          P.rx = 0.10; P.ry = -0.14; P.rz = -0.22;
          P.s = 0.88; P.shape = 'open';
        }
      } else if (st === 'scared_cheeks') {
        // Takut: Both open paws shivering nervously beside cheeks!
        const shiver = Math.sin(t * 48.0) * 0.022;
        P.x = side * 1.72 + shiver; P.y = 0.08; P.z = 0.50;
        P.rx = 0.04; P.ry = -side * 0.14; P.rz = side * 0.18;
        P.s = 0.90; P.shape = 'open';
      } else if (st === 'boxing_punch') {
        // Marah (Stage 2): Right forward brawler punch fist & Left cocked boxer guard fist!
        const jab = Math.sin(t * 10.0) * 0.04;
        if (lead) {
          P.x = 1.72; P.y = 0.06 + jab * 0.4; P.z = 0.65 + jab * 0.5;
          P.rx = 0.12; P.ry = -0.24; P.rz = -0.18;
          P.s = 0.96; P.shape = 'fist_punch';
        } else {
          P.x = -1.70; P.y = 0.22 - jab * 0.3; P.z = 0.52;
          P.rx = 0.08; P.ry = 0.22; P.rz = 0.24;
          P.s = 0.92; P.shape = 'fist_guard';
        }
      } else if (st === 'demon_rage_fists') {
        // Sangat Marah (Stage 3): Ferocious demon claws floating menacingly at sides!
        const tremor = Math.sin(t * 32.0) * 0.02;
        P.x = side * 1.72 + tremor; P.y = 0.12 + bob * 0.3; P.z = 0.52;
        P.rx = 0.12; P.ry = -side * 0.18; P.rz = -side * 0.24;
        P.s = 0.95; P.shape = 'demon_claw';
      } else if (st === 'pencil_hold' || this.currentAccessory === 'pencil' || isTeacher) {
        if (lead) {
          const wave = Math.sin(t * 1.8);
          P.x = 1.54;
          P.y = -0.06 + wave * 0.035;
          P.z = 0.52;
          P.rx = 0;
          P.ry = 0;
          P.rz = -0.10 + wave * 0.05;
          P.s = 0.92; P.shape = 'open';
        } else {
          P.x = -1.68;
          P.y = -0.20 + bob * 0.3;
          P.z = 0.48;
          P.rx = 0.02;
          P.ry = 0.12;
          P.rz = 0.24;
          P.s = 0.86; P.shape = 'open';
        }
      }
      return P;
    };

    const spring = (x, v, target, k, zeta) => {
      const cdamp = 2 * zeta * Math.sqrt(k);
      v += (-(x - target) * k - v * cdamp) * dt;
      return [x + v * dt, v];
    };

    const drive = (hand, S, side) => {
      if (!allowHands || st === 'hidden') {
        hand.visible = false;
        S.s = 0;
        S.sVel = 0;
        hand.scale.set(0.001, 0.001, 0.001);
        return;
      }
      const P = pose(side);
      this.applyPawShape(hand, P.shape || 'open', isDemon);

      if (snapImmediate) {
        S.pos.set(P.x, P.y, P.z);
        S.vel.set(0, 0, 0);
        S.rot.set(P.rx, P.ry, P.rz);
        S.rotVel.set(0, 0, 0);
        S.s = P.s;
        S.sVel = 0;
      } else {
        const axes = ['x', 'y', 'z'];
        for (const a of axes) {
          [S.pos[a], S.vel[a]] = spring(S.pos[a], S.vel[a], P[a], 140, 0.52);
          [S.rot[a], S.rotVel[a]] = spring(S.rot[a], S.rotVel[a], P['r' + a], 110, 0.60);
        }
        [S.s, S.sVel] = spring(S.s, S.sVel, P.s, 160, 0.56);
      }

      const sc = Math.max(0.001, S.s * 1.45);
      hand.visible = S.s > 0.02;
      hand.position.copy(S.pos);
      hand.rotation.set(S.rot.x, S.rot.y, S.rot.z);
      hand.scale.set(sc, sc, sc);

      // Subtle squash & stretch from velocity (elastic marshmallow physics)
      const speed = S.vel.length();
      const stretch = 1 + Math.min(0.22, speed * 0.035);
      const inv = 1 / Math.sqrt(stretch);
      if (hand.userData && hand.userData.core) {
        hand.userData.core.scale.set(inv, stretch, inv);
      }
    };

    drive(this.handL, this.pawSim.L, -1);
    drive(this.handR, this.pawSim.R, 1);
  }
  /**
   * Expressive Kinematics for Fox Ears & Fluffy Cat Tail
   */
  updateEarsAndTail(dt) {
    // ==========================================
    // 1. FOX EARS: 2-STAGE CARTILAGE SPRING DYNAMICS
    // ==========================================
    if (this.showEars && this.earL && this.earR) {
      let targetZ_L = Math.PI * 0.15; // ~27° natural outward angle
      let targetZ_R = -Math.PI * 0.15;
      let targetX = -0.05; // natural upright perky posture
      let targetY_L = -0.06;
      let targetY_R = 0.06;

      let tipFlexTargetL = 0;
      let tipFlexTargetR = 0;

      if (this.mood === 'happy') {
        // PERKY & CELEBRATORY: Ears stand tall & proud, lively subtle joyful flutter
        targetZ_L = Math.PI * 0.14 + Math.sin(this.time * 12.0) * 0.025;
        targetZ_R = -Math.PI * 0.14 - Math.sin(this.time * 12.0) * 0.025;
        targetX = -0.05;
        tipFlexTargetL = Math.sin(this.time * 14.0) * 0.025;
        tipFlexTargetR = Math.sin(this.time * 14.0) * 0.025;

      } else if (this.mood === 'pout' || this.mood === 'sleepy') {
        // SAD / POUT / SULK: Ears droop slightly outward (~32°), tips droop softly with mild tremor
        targetZ_L = Math.PI * 0.18 + Math.sin(this.time * 7.0) * 0.02;
        targetZ_R = -Math.PI * 0.18 - Math.sin(this.time * 7.0) * 0.02;
        targetX = -0.05;
        tipFlexTargetL = -0.08;
        tipFlexTargetR = -0.08;

      } else if (this.mood === 'wink') {
        // PLAYFUL ASYMMETRIC: One ear perkily upright, one playfully tilted outward
        targetZ_L = Math.PI * 0.12;
        targetZ_R = -Math.PI * 0.18;
        targetX = -0.05;
        tipFlexTargetL = 0.02;
        tipFlexTargetR = -0.02;

      } else if (this.mood === 'hearts') {
        // WARM & LOVING: Gentle soft flutter
        targetZ_L = Math.PI * 0.14 + Math.sin(this.time * 6.5) * 0.025;
        targetZ_R = -Math.PI * 0.14 - Math.sin(this.time * 6.5) * 0.025;
        targetX = -0.05;
        tipFlexTargetL = 0.02;
        tipFlexTargetR = 0.02;

      } else {
        // IDLE / THINKING / DOTS: Soft breathing sway + occasional cute twitch
        const earBreath = Math.sin(this.time * 2.2) * 0.025;
        targetZ_L += earBreath;
        targetZ_R -= earBreath;
        targetX = -0.05;

        // Inertial tip lag from Mochi vertical velocity (organic secondary motion)
        tipFlexTargetL = -this.floatPos.velY * 0.08;
        tipFlexTargetR = -this.floatPos.velY * 0.08;

        // Ear twitch logic
        this.earTwitchTimer -= dt;
        if (this.earTwitchTimer <= 0) {
          this.nextEarTwitch = 2.8 + Math.random() * 3.5;
          this.earTwitchTimer = this.nextEarTwitch;
          this.twitchEar = Math.random() > 0.5 ? 'L' : 'R';
        }

        const twitchAge = this.nextEarTwitch - this.earTwitchTimer;
        if (twitchAge > 0 && twitchAge < 0.22) {
          const twitchWiggle = Math.sin(twitchAge * 46) * 0.10;
          if (this.twitchEar === 'L') {
            targetZ_L += twitchWiggle;
            tipFlexTargetL += twitchWiggle * 0.6;
          } else {
            targetZ_R += twitchWiggle;
            tipFlexTargetR += twitchWiggle * 0.6;
          }
        }
      }

      // Active dynamic ear wiggle on question entrance / wake / interaction
      if (this.earWiggleTimer > 0) {
        this.earWiggleTimer -= dt;
        const prog = 1.0 - Math.max(0, this.earWiggleTimer / this.earWiggleDuration);
        const wave = Math.sin(prog * Math.PI * 6.5) * Math.exp(-prog * 3.8) * 0.18 * (this.earWiggleIntensity || 1.0);
        targetZ_L += wave;
        targetZ_R -= wave * 0.85;
        tipFlexTargetL += wave * 0.8;
        tipFlexTargetR -= wave * 0.7;
      }

      // Dynamic Inertial Lag & Rebound from mascot vertical motion & squish
      const rawVelY = this.floatPos.velY || 0;
      const velY = Math.max(-1.5, Math.min(1.5, rawVelY));
      const rawSquashVel = this.squish.velY || 0;
      const squashVel = Math.max(-1.5, Math.min(1.5, rawSquashVel));
      const inertialLagZ = Math.max(-0.08, Math.min(0.08, velY * 0.08 - squashVel * 0.06));
      const inertialLagX = Math.max(-0.06, Math.min(0.06, -velY * 0.06));
      const inertialTip = Math.max(-0.10, Math.min(0.10, -velY * 0.08 + squashVel * 0.06));

      // Subtle conversational fox-ear perk coupled to vowel emphasis!
      const earSpeechPerk = (this.mouthRig && this.mouthRig.presence)
        ? this.mouthRig.presence * Math.max(0, (this.mouthRig.open || 0) - 0.15) * 0.052
        : 0;

      targetZ_L += inertialLagZ - earSpeechPerk * 0.65;
      targetZ_R -= inertialLagZ - earSpeechPerk * 0.65;
      targetX = Math.max(-0.12, Math.min(0.04, targetX + inertialLagX + earSpeechPerk * 0.25));
      tipFlexTargetL += inertialTip + earSpeechPerk * 0.85;
      tipFlexTargetR += inertialTip + earSpeechPerk * 0.85;

      // 2-Stage Damped Harmonic Oscillator (Semi-implicit Symplectic with sub-steps for unconditionally stable physics)
      const springStep = (val, vel, target, k, zeta, minVal, maxVal) => {
        const subSteps = Math.min(6, Math.max(1, Math.ceil(dt / 0.016)));
        const sdt = dt / subSteps;
        const cdamp = 2 * zeta * Math.sqrt(k);
        for (let i = 0; i < subSteps; i++) {
          const accel = -(val - target) * k - vel * cdamp;
          vel += accel * sdt;
          vel = Math.max(-8.0, Math.min(8.0, vel));
          val += vel * sdt;
        }
        if (minVal !== undefined && maxVal !== undefined) {
          val = Math.max(minVal, Math.min(maxVal, val));
        }
        return [val, vel];
      };

      const kBase = 155;
      const zetaBase = 0.44; // ~25% bouncy overshoot on base ear
      const kTip = 180;
      const zetaTip = 0.45; // springy cartoon whip for cartilage tip

      // Left Ear Rig
      const eL = this.earPhys.L;
      [eL.rz, eL.vz] = springStep(eL.rz, eL.vz, targetZ_L, kBase, zetaBase, 0.08, 0.75);
      [eL.rx, eL.vx] = springStep(eL.rx, eL.vx, targetX, kBase, zetaBase, -0.15, 0.12);
      [eL.ry, eL.vy] = springStep(eL.ry, eL.vy, targetY_L, kBase, zetaBase, -0.20, 0.20);
      [eL.tip, eL.tipVel] = springStep(eL.tip, eL.tipVel, tipFlexTargetL, kTip, zetaTip, -0.25, 0.25);

      this.earL.rotation.set(eL.rx, eL.ry, eL.rz);
      if (this.earL_Flex) {
        this.earL_Flex.rotation.x = eL.tip * 0.95;
        this.earL_Flex.rotation.z = eL.tip * 0.65;
      }

      // Right Ear Rig
      const eR = this.earPhys.R;
      [eR.rz, eR.vz] = springStep(eR.rz, eR.vz, targetZ_R, kBase, zetaBase, -0.75, -0.08);
      [eR.rx, eR.vx] = springStep(eR.rx, eR.vx, targetX, kBase, zetaBase, -0.15, 0.12);
      [eR.ry, eR.vy] = springStep(eR.ry, eR.vy, targetY_R, kBase, zetaBase, -0.20, 0.20);
      [eR.tip, eR.tipVel] = springStep(eR.tip, eR.tipVel, tipFlexTargetR, kTip, zetaTip, -0.25, 0.25);

      this.earR.rotation.set(eR.rx, eR.ry, eR.rz);
      if (this.earR_Flex) {
        this.earR_Flex.rotation.x = eR.tip * 0.95;
        this.earR_Flex.rotation.z = -eR.tip * 0.65;
      }
    }

    // ==========================================
    // 2. BUSHY FOX TAIL: CONTINUOUS VOLUMETRIC LOFT WAVE
    // ==========================================
    if (this.showTail) {
      this.updateTailLoftMesh(dt);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    let lastTime = performance.now();
    this.isVisible = true;
    this._running = true;
    if (this.container && typeof IntersectionObserver !== 'undefined' && !this._visibilityObserver) {
      try {
        this._visibilityObserver = new IntersectionObserver((entries) => {
          this.isVisible = !!(entries[0] && entries[0].isIntersecting);
        }, { threshold: 0.02 });
        this._visibilityObserver.observe(this.container);
      } catch (_) {}
    }

    const loop = (now) => {
      this.rafId = null;
      if (!this._running) return;
      // Offscreen or parked by the companion pool: poll at 4 Hz instead of rendering at 60 fps.
      // The sleep timer is kept apart from rafId so destroy() can cancel each with its own API.
      if (this.isVisible === false || this._paused) {
        this._sleepTimer = setTimeout(() => {
          this._sleepTimer = null;
          if (this._running) this.rafId = requestAnimationFrame(loop);
        }, 250);
        return;
      }
      const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
      lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
  }

  destroy() {
    this._running = false;
    this.stopEarTwitchLoop();
    this.detachAudioAnalyser();
    if (this._visibilityObserver) {
      try { this._visibilityObserver.disconnect(); } catch (_) {}
      this._visibilityObserver = null;
    }
    if (this.rafId != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer);
      this._sleepTimer = null;
    }
    clearTimeout(this._restoreRotTimeout);
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (_) {}
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) try { m.map.dispose(); } catch (_) {}
              try { m.dispose(); } catch (_) {}
            });
          } else {
            if (obj.material.map) try { obj.material.map.dispose(); } catch (_) {}
            try { obj.material.dispose(); } catch (_) {}
          }
        }
      });
    }
    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      // dispose() alone leaves the GL context alive until GC; iOS caps live contexts and keeps
      // their memory, so release it now.
      try { this.renderer.forceContextLoss(); } catch (_) {}
      try { this.renderer.dispose(); } catch (_) {}
      this.renderer = null;
    }
  }
}

// Global attachment for drop-in PWA usage
if (typeof window !== 'undefined') {
  window.FiezelMochi = FiezelMochi;
}
