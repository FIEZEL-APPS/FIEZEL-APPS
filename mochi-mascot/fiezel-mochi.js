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
    this.mood = options.mood || 'dots'; // 'dots', 'wink', 'happy', 'hearts', 'sleepy', 'pout', 'firm', 'skeptical'
    this.canonicalMood = 'neutral';
    this.moodWeights = {
      neutral: 1.0,
      firm: 0.0,
      skeptical: 0.0,
      happy: 0.0,
      pout: 0.0,
      talking: 0.0
    };
    this.targetMoodWeights = {
      neutral: 1.0,
      firm: 0.0,
      skeptical: 0.0,
      happy: 0.0,
      pout: 0.0,
      talking: 0.0
    };
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
    this.idleMoods = ['neutral', 'skeptical', 'neutral', 'happy', 'neutral', 'hearts'];
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

    this.initScene();
    this.createMochiMesh();
    this.createFoxEars();
    this.createDevilHorns();
    this.createInfernoSystem();
    this.createCatTail();
    this.createFaceObjects();
    this.createShadow();
    this.createOrbit();
    this.createBadge();
    this.createAccessories();
    this.createParticles();
    this.setupLighting();
    this.bindEvents();

    // Apply initial aura, accessory & visibility
    if (this.aura) this.setAura(this.aura);
    if (this.currentAccessory) this.setAccessory(this.currentAccessory);
    this.start();
  }

  initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.08, 5.05); // Natural prominent close-up framing: pure canonical Daifuku Mochi ratio


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
    // 1. Soft warm ambient studio light (calibrated to preserve form shadows & 3D curvature)
    this.ambientLight = new THREE.AmbientLight(0xFFFDF8, 1.45);
    this.scene.add(this.ambientLight);

    // 2. Hemisphere Light: Pure white sky, warm cream ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFF0E5, 1.25);
    this.scene.add(this.hemiLight);

    // 3. Key directional light from top-front-right (soft form gradient, not blown out)
    this.keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.40);
    this.keyLight.position.set(2.4, 3.8, 3.8);
    this.scene.add(this.keyLight);

    // 4. Crisp specular glint light for authentic wet/glossy glazed mochi sheen
    this.glintLight = new THREE.DirectionalLight(0xFFFFFF, 0.45);
    this.glintLight.position.set(-1.4, 2.8, 4.2);
    this.scene.add(this.glintLight);

    // 5. Warm upward bounce light from bottom (soft creamy daifuku underbelly)
    this.bounceLight = new THREE.DirectionalLight(0xFFF2E6, 0.65);
    this.bounceLight.position.set(0, -3.2, 1.4);
    this.scene.add(this.bounceLight);

    // 6. Subtle cool fill light from side
    this.fillLight = new THREE.DirectionalLight(0xF1F5F9, 0.45);
    this.fillLight.position.set(-3.5, 0.2, 2.4);
    this.scene.add(this.fillLight);

    // 7. Soft rosy rim light from back-top (outlines ears & crown against light backgrounds!)
    this.rimLight = new THREE.DirectionalLight(0xFFD8E4, 1.35);
    this.rimLight.position.set(0, 3.8, -2.8);
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

      // Base proportions: Width 1.34, Height 1.06, Depth 0.90 (Natural Canonical Daifuku from m025-760)
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
    // =========================================================================
    // 3D VOLUMETRIC MESH MORPH TARGETS (Disney / GoPrep Continuous Morphing)
    // Physically deforms the 3D daifuku vertices into the 4 emotional silhouettes:
    // 1. Firm: Squashed down, widened grounded base, determined kettle
    // 2. Skeptical: Asymmetric 3D volumetric cock & shear
    // 3. Happy: Buoyant elongated tall dome (Squash & Stretch!)
    // 4. Pout: Chubby puffed-out cheeks (+0.36 physical outward displacement)
    // =========================================================================
    const numVerts = pos.count;
    const posFirm = new Float32Array(numVerts * 3);
    const posSkeptical = new Float32Array(numVerts * 3);
    const posHappy = new Float32Array(numVerts * 3);
    const posPout = new Float32Array(numVerts * 3);

    for (let i = 0; i < numVerts; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      // 1. Firm (Tense, squashed down, wider grounded base - smooth volume-preserving affine squash)
      const firmY = vy * 0.88;
      const firmX = vx * 1.13;
      const firmZ = vz * 1.08;
      posFirm[i * 3]     = firmX;
      posFirm[i * 3 + 1] = firmY;
      posFirm[i * 3 + 2] = firmZ;

      // 2. Skeptical (Asymmetric 3D volumetric cock & shear - sassy head tilt)
      const cockLift = (vx / 1.32) * 0.13;
      const cockPuff = vx > 0 ? (vx / 1.32) * 0.06 : 0;
      posSkeptical[i * 3]     = vx;
      posSkeptical[i * 3 + 1] = vy + cockLift;
      posSkeptical[i * 3 + 2] = vz * (1.0 + cockPuff);

      // 3. Happy (Buoyant, joyous, rounded buoyant stretch - VOLUME PRESERVED, DAIFUKU PROPORTIONS PRESERVED)
      posHappy[i * 3]     = vx * 0.98;
      posHappy[i * 3 + 1] = vy * 1.06 + 0.04;
      posHappy[i * 3 + 2] = vz * 0.98;

      // 4. Pout (Puffed-out chubby cheeks - toddler sulk! Smooth continuous Gaussian displacement)
      const chDistL = Math.hypot(vx - (-0.54), vy - (-0.08));
      const chDistR = Math.hypot(vx - (0.54), vy - (-0.08));
      const chDist = Math.min(chDistL, chDistR);
      const cheekDisplacement = 0.28 * Math.exp(-(chDist * chDist) / (0.42 * 0.42));
      let poutX = vx + (vx >= 0 ? 1 : -1) * cheekDisplacement * 0.55;
      let poutZ = vz + cheekDisplacement * 0.45;
      let poutY = vy - 0.03 * Math.exp(-(vy * vy) / 0.6);
      posPout[i * 3]     = poutX;
      posPout[i * 3 + 1] = poutY;
      posPout[i * 3 + 2] = poutZ;
    }

    geo.morphAttributes.position = [
      new THREE.BufferAttribute(posFirm, 3),
      new THREE.BufferAttribute(posSkeptical, 3),
      new THREE.BufferAttribute(posHappy, 3),
      new THREE.BufferAttribute(posPout, 3)
    ];

    geo.computeVertexNormals();

    // =========================================================================
    // CUSTOM 3D VOLUMETRIC SUBSURFACE & MOLTEN LAVA RIM GLSL SHADER
    // Transforms the 3D Daifuku Mochi continuously via GoPrep spring physics:
    // - Normal White Daifuku: Snow-white dome + warm pearlescent blush-cream 3D form shadow
    // - Takut (uDread): Pale icy-blue dread shadow across the upper forehead dome
    // - Stage 2 Marah (uFlushed): Warm strawberry-rose pink/red 3D subsurface flush
    // - Stage 3 Sangat Marah / Furious (uDemon): Charcoal-obsidian (#1a0f14) core
    //   with glowing molten red-orange Fresnel lava rim underglow & cheek heat bloom!
    // =========================================================================
    this.skinCanvas = document.createElement('canvas');
    this.skinCanvas.width = 64;
    this.skinCanvas.height = 64;
    this.sCtx = this.skinCanvas.getContext('2d');
    this.mochiSkinTexture = new THREE.CanvasTexture(this.skinCanvas);

    this.mochiShaderUniforms = {
      uFlushed: { value: 0.0 },
      uDemon: { value: 0.0 },
      uDread: { value: 0.0 },
      uBlushBoost: { value: 0.0 },
      uTime: { value: 0.0 },
      uMorph0: { value: 0.0 },
      uMorph1: { value: 0.0 },
      uMorph2: { value: 0.0 },
      uMorph3: { value: 0.0 }
    };

    // Bind morph targets as explicit vertex attributes for universal WebGL shader support
    geo.setAttribute('aMorph0', new THREE.BufferAttribute(posFirm, 3));
    geo.setAttribute('aMorph1', new THREE.BufferAttribute(posSkeptical, 3));
    geo.setAttribute('aMorph2', new THREE.BufferAttribute(posHappy, 3));
    geo.setAttribute('aMorph3', new THREE.BufferAttribute(posPout, 3));

    this.mochiMaterial = new THREE.ShaderMaterial({
      uniforms: this.mochiShaderUniforms,
      vertexShader: `
        uniform float uMorph0;
        uniform float uMorph1;
        uniform float uMorph2;
        uniform float uMorph3;
        attribute vec3 aMorph0;
        attribute vec3 aMorph1;
        attribute vec3 aMorph2;
        attribute vec3 aMorph3;
        varying vec3 vLocalPos;
        varying vec3 vViewNormal;
        void main() {
          vec3 morphed = position
            + (aMorph0 - position) * uMorph0
            + (aMorph1 - position) * uMorph1
            + (aMorph2 - position) * uMorph2
            + (aMorph3 - position) * uMorph3;
          vLocalPos = morphed;
          vViewNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(morphed, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uFlushed;
        uniform float uDemon;
        uniform float uDread;
        uniform float uBlushBoost;
        uniform float uTime;
        varying vec3 vLocalPos;
        varying vec3 vViewNormal;

        void main() {
          vec3 N = normalize(vViewNormal);
          float ndv = clamp(dot(N, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
          float fresnel = pow(1.0 - ndv, 2.15);

          // 3D STUDIO PBR LIGHTING VECTORS (Calibrated to build m025-670 / Disney PBR studio lighting)
          vec3 V = vec3(0.0, 0.0, 1.0);
          vec3 L_key = normalize(vec3(0.42, 0.72, 0.55));    // Key light from top-front-right
          vec3 L_glint = normalize(vec3(-0.35, 0.52, 0.65)); // Specular glint fill from top-front-left
          vec3 L_bounce = normalize(vec3(0.0, -0.75, 0.45)); // Warm upward bounce light from table

          // Half-vectors for Blinn-Phong specular glints
          vec3 H_key = normalize(L_key + V);
          vec3 H_glint = normalize(L_glint + V);

          float NdotL_key = max(0.0, dot(N, L_key));
          float NdotL_bounce = max(0.0, dot(N, L_bounce));

          // Physical specular highlights: Broad glossy lobe + sharp glazed clearcoat pinpoint
          float specKey = pow(max(0.0, dot(N, H_key)), 28.0) * 0.45;
          float clearcoatKey = pow(max(0.0, dot(N, H_key)), 85.0) * 0.75;
          float specGlint = pow(max(0.0, dot(N, H_glint)), 36.0) * 0.28;

          // 1. Canonical White Daifuku 3D Subsurface & Studio Lighting (Matches m025-670)
          float bottomShade = smoothstep(0.15, -1.05, vLocalPos.y);
          float sideShade = smoothstep(0.35, 1.45, abs(vLocalPos.x)) * 0.35;
          float hemiDome = mix(0.86, 1.04, NdotL_key);

          vec3 whiteCore = vec3(1.0, 0.995, 0.998);
          vec3 whiteMid  = vec3(0.965, 0.925, 0.940);
          vec3 whiteRim  = vec3(0.890, 0.810, 0.845);
          float formFactor = clamp(fresnel * 0.60 + bottomShade * 0.55 + sideShade * 0.25, 0.0, 1.0);
          vec3 colWhite = mix(whiteCore, whiteMid, smoothstep(0.0, 0.55, formFactor)) * hemiDome;
          colWhite = mix(colWhite, whiteRim, smoothstep(0.50, 1.0, formFactor));

          // Soft peach-rosy sheen along the 3D silhouette (Three.js sheen simulation)
          vec3 sheenCol = vec3(1.0, 0.85, 0.89);
          colWhite += sheenCol * fresnel * 0.32;

          // Studio table bounce reflection at bottom
          colWhite += vec3(1.0, 0.96, 0.94) * NdotL_bounce * bottomShade * 0.35;

          // Glazed mochi glossy clearcoat reflection! (Eliminates the "terlalu polos" look!)
          colWhite += vec3(1.0, 1.0, 1.0) * (specKey + clearcoatKey + specGlint);

          // Pale icy-blue forehead dread shadow for Takut (Row 2 #8)
          if (uDread > 0.001) {
            float dreadMask = smoothstep(-0.05, 0.82, vLocalPos.y) * (1.0 - fresnel * 0.30);
            vec3 dreadCol = vec3(0.52, 0.74, 0.94);
            colWhite = mix(colWhite, dreadCol, dreadMask * uDread * 0.65);
          }

          // 2. Stage 2 Marah: Flushed Strawberry-Rose Pink/Red 3D Body + Glossy Specular
          vec3 flushCore = vec3(1.0, 0.82, 0.87);
          vec3 flushMid  = vec3(1.0, 0.48, 0.60);
          vec3 flushRim  = vec3(0.88, 0.25, 0.38);
          vec3 colFlushed = mix(flushCore, flushMid, smoothstep(0.0, 0.50, formFactor)) * hemiDome;
          colFlushed = mix(colFlushed, flushRim, smoothstep(0.46, 1.0, formFactor));
          colFlushed += vec3(1.0, 0.92, 0.95) * (specKey + clearcoatKey);

          // 3. Stage 3 Sangat Marah / Furious: Volcanic Charcoal-Obsidian with Crimson Sheen & Glossy Highlight
          float topDome = smoothstep(-0.35, 0.95, vLocalPos.y);
          vec3 demonBase = vec3(0.14, 0.09, 0.11);
          vec3 demonTop  = vec3(0.24, 0.16, 0.19);
          vec3 demonCore = mix(demonBase, demonTop, topDome * ndv);
          float crimsonRimMask = pow(1.0 - ndv, 2.8);
          vec3 crimsonRimCol = vec3(0.72, 0.12, 0.18);
          vec3 colDemon = mix(demonCore, crimsonRimCol, crimsonRimMask * 0.70);
          // Glossy studio highlight on dark obsidian dome!
          colDemon += vec3(1.0, 0.65, 0.60) * specKey * 0.45 + vec3(1.0, 0.90, 0.85) * clearcoatKey * 0.65;

          // Combine body states smoothly
          vec3 baseCol = mix(colWhite, colFlushed, clamp(uFlushed, 0.0, 1.0));
          baseCol = mix(baseCol, colDemon, clamp(uDemon, 0.0, 1.0));

          // Base contact shading: guarantees the bottom perimeter of the round body is visible against white backgrounds!
          float bottomSilhouetteAO = smoothstep(-0.35, -0.70, vLocalPos.y) * 0.28;
          baseCol = mix(baseCol, baseCol * vec3(0.80, 0.70, 0.76), bottomSilhouetteAO * (1.0 - uDemon));

          // Molten Lava Base on Demon (matches master reference Image 1 1:1!)
          if (uDemon > 0.01) {
            float lavaBase = smoothstep(-0.25, -0.72, vLocalPos.y);
            vec3 lavaCol = mix(vec3(1.0, 0.18, 0.0), vec3(1.0, 0.72, 0.12), smoothstep(-0.72, -0.46, vLocalPos.y));
            baseCol += lavaCol * lavaBase * 1.45 * uDemon;

            // Glowing fiery cheeks bloom under the eyes on demon
            if (vLocalPos.z > 0.08) {
              vec2 pL = vec2((vLocalPos.x + 0.68) / 0.38, (vLocalPos.y + 0.06) / 0.22);
              vec2 pR = vec2((vLocalPos.x - 0.68) / 0.38, (vLocalPos.y + 0.06) / 0.22);
              float dCheek = min(dot(pL, pL), dot(pR, pR));
              float heatBloom = exp(-dCheek * 1.6) * smoothstep(0.08, 0.55, vLocalPos.z);
              vec3 fireCheekCol = vec3(1.0, 0.28, 0.02);
              baseCol = mix(baseCol, fireCheekCol, heatBloom * 0.85 * uDemon);
            }
          }

          // 4. 3D Volumetric Airbrushed Cheek Blushes on normal / flushed Mochi
          if (vLocalPos.z > 0.1 && uDemon < 0.95) {
            vec2 pL = vec2((vLocalPos.x + 0.74) / 0.34, (vLocalPos.y + 0.10) / 0.19);
            vec2 pR = vec2((vLocalPos.x - 0.74) / 0.34, (vLocalPos.y + 0.10) / 0.19);
            float dCheek = min(dot(pL, pL), dot(pR, pR));
            float cheekMask = exp(-dCheek * 1.55) * smoothstep(0.1, 0.6, vLocalPos.z);

            vec3 cuteBlush = mix(vec3(1.0, 0.56, 0.70), vec3(1.0, 0.44, 0.62), uBlushBoost);
            float cuteAlpha = (0.62 + 0.16 * uBlushBoost) * (1.0 - uDemon * 0.95);
            baseCol = mix(baseCol, cuteBlush, cheekMask * cuteAlpha);
          }

          gl_FragColor = vec4(baseCol, 1.0);
        }
      `
    });

    this.mochiMesh = new THREE.Mesh(geo, this.mochiMaterial);
    this.mochiMesh.morphTargetInfluences = [0, 0, 0, 0];

    // =========================================================================
    // ANIME / MANGA CEL-SHADING INVERTED HULL OUTLINE CONTOUR ("GORESAN")
    // Ensures the complete round silhouette of Mochi ("seluruh lingkaran tubuhnya")
    // is 100% visible, sharp, and beautifully delineated against light backgrounds!
    // =========================================================================
    this.outlineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMorph0: this.mochiShaderUniforms.uMorph0,
        uMorph1: this.mochiShaderUniforms.uMorph1,
        uMorph2: this.mochiShaderUniforms.uMorph2,
        uMorph3: this.mochiShaderUniforms.uMorph3,
        uFlushed: this.mochiShaderUniforms.uFlushed,
        uDemon: this.mochiShaderUniforms.uDemon,
        uOutlineThickness: { value: 0.024 }
      },
      side: THREE.BackSide,
      vertexShader: `
        uniform float uMorph0;
        uniform float uMorph1;
        uniform float uMorph2;
        uniform float uMorph3;
        uniform float uOutlineThickness;
        attribute vec3 aMorph0;
        attribute vec3 aMorph1;
        attribute vec3 aMorph2;
        attribute vec3 aMorph3;
        void main() {
          vec3 morphed = position
            + (aMorph0 - position) * uMorph0
            + (aMorph1 - position) * uMorph1
            + (aMorph2 - position) * uMorph2
            + (aMorph3 - position) * uMorph3;
          vec4 mvPos = modelViewMatrix * vec4(morphed, 1.0);
          vec3 vNormal = normalize(mat3(modelViewMatrix) * normal);
          mvPos.xyz += vNormal * uOutlineThickness;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uFlushed;
        uniform float uDemon;
        void main() {
          // Warm anime production ink contour tone: #8E7382 (soft rosy-lavender dark ink)
          vec3 colWhiteOutline = vec3(0.56, 0.45, 0.52);
          // Flushed marah outline: #A8203E (rich deep crimson rose)
          vec3 colFlushOutline = vec3(0.66, 0.13, 0.24);
          // Demon sangat marah outline: #FF3518 (vibrant molten lava flame)
          vec3 colDemonOutline = vec3(1.0, 0.21, 0.08);

          vec3 finalCol = mix(colWhiteOutline, colFlushOutline, clamp(uFlushed, 0.0, 1.0));
          finalCol = mix(finalCol, colDemonOutline, clamp(uDemon, 0.0, 1.0));
          gl_FragColor = vec4(finalCol, 0.88);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.outlineMesh = new THREE.Mesh(geo, this.outlineMaterial);
    this.outlineMesh.renderOrder = 998;

    this.mochiGroup = new THREE.Group();
    this.mochiGroup.position.x = 0.0;
    this.mochiGroup.add(this.mochiMesh);
    this.mochiGroup.add(this.outlineMesh);
    this.scene.add(this.mochiGroup);

    // =========================================================================
    // 3D PLUMP MARSHMALLOW FRONT PAWS (Matches Row 1 #5 Empati in Reference!)
    // Rests gently against the lower front cheeks in Empati with crisp 3D relief
    // =========================================================================
    this.pawShaderMat = new THREE.ShaderMaterial({
      uniforms: this.mochiShaderUniforms,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vPos = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uFlushed;
        uniform float uDemon;
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = vec3(0.0, 0.0, 1.0);
          float ndv = clamp(dot(N, V), 0.0, 1.0);
          float rim = pow(1.0 - ndv, 1.45);
          float bottomShade = smoothstep(0.10, -0.28, vPos.y) * 0.45;
          float shade = clamp(rim * 0.65 + bottomShade, 0.0, 1.0);

          vec3 colW = mix(vec3(1.0, 0.998, 1.0), vec3(0.85, 0.74, 0.79), shade);

          // Soft airbrushed pink blush on the upper-front of each paw (matching ref-empati-zoom.png!)
          float blushZone = smoothstep(-0.08, 0.15, vPos.y) * smoothstep(-0.02, 0.12, vPos.z);
          colW = mix(colW, vec3(1.0, 0.72, 0.82), blushZone * 0.68);

          // Specular glint on paw knuckles
          vec3 L_key = normalize(vec3(0.42, 0.72, 0.55));
          float spec = pow(max(0.0, dot(N, normalize(L_key + V))), 32.0) * 0.65;
          colW += vec3(1.0, 1.0, 1.0) * spec;

          vec3 colF = mix(vec3(1.0, 0.88, 0.91), vec3(0.86, 0.32, 0.45), shade);
          vec3 colD = mix(vec3(0.16, 0.10, 0.12), vec3(0.85, 0.18, 0.10), shade);
          vec3 col = mix(colW, colF, uFlushed);
          col = mix(col, colD, uDemon);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x7A5666,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });

    const buildPaw = (side) => {
      const paw = new THREE.Group();
      paw.renderOrder = 1010;
      const core = new THREE.Group();
      paw.add(core);

      // 1. Soft contact shadow cushion behind the paw where it touches the body
      const shGeo = new THREE.SphereGeometry(0.20, 24, 18);
      shGeo.scale(1.08, 1.25, 0.28);
      const shMesh = new THREE.Mesh(shGeo, shadowDiscMat);
      shMesh.position.set(0, -0.02, -0.05);
      shMesh.renderOrder = 1009;
      core.add(shMesh);

      // 2. Plump chubby marshmallow chibi mitten paw (smooth, organic, kawaii baby paw)
      // Eliminates lumpy bubble balls; matches master reference Row 1 #5 Empati 1:1!
      const palmGeo = new THREE.SphereGeometry(0.19, 32, 24);
      palmGeo.scale(1.10, 1.30, 0.68);
      const palmMesh = new THREE.Mesh(palmGeo, this.pawShaderMat);
      palmMesh.renderOrder = 1010;
      core.add(palmMesh);

      // 3. Crisp anime outline contour for the paw
      const pawOutlineMat = new THREE.MeshBasicMaterial({
        color: 0x8E7382,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.85
      });
      const pawOutlineGeo = palmGeo.clone();
      pawOutlineGeo.scale(1.06, 1.06, 1.06);
      const pawOutlineMesh = new THREE.Mesh(pawOutlineGeo, pawOutlineMat);
      pawOutlineMesh.renderOrder = 1008;
      core.add(pawOutlineMesh);

      paw.userData = { side, core };
      paw.scale.set(0.001, 0.001, 0.001);
      paw.visible = false;
      return paw;
    };

    this.handL = buildPaw(-1);
    this.handR = buildPaw(1);
    this.handL.position.set(-0.32, -0.32, 1.15);
    this.handR.position.set( 0.32, -0.32, 1.15);
    this.handL.rotation.set(-0.10, -0.25, -0.28);
    this.handR.rotation.set(-0.10,  0.25,  0.28);
    this.mochiGroup.add(this.handL);
    this.mochiGroup.add(this.handR);
  }

  updateSkinBlush() {
    if (this.mochiShaderUniforms) {
      const isPout = (this.mood === 'pout' || this.mood === 'empati' || this.mood === 'empathetic' || this.mood === 'happy' || this.mood === 'gembira');
      this.mochiShaderUniforms.uBlushBoost.value = isPout ? 1.0 : 0.0;
    }
  }

  /**
   * 3D Organic Sculpted Cat Ears with 2-Stage Cartilage Spring Flex.
   * Matches reference media_1793912961663_5f966c21.jpg 1:1 (thick plush white outer ear,
   * strawberry-pink inner hollow, and 2 cute white inner fur tufts).
   */
  createFoxEars() {
    this.earsGroup = new THREE.Group();
    this.earsGroup.visible = this.showEars;
    this.mochiGroup.add(this.earsGroup);

    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xFF829E, // Deeper, appetizing rosy strawberry inner ear: pops vividly against white!
      roughness: 0.60,
      metalness: 0.0
    });

    // 1. Organic Petal Bezier Shape for Fox Ears
    const earShape = new THREE.Shape();
    earShape.moveTo(-0.32, 0);
    earShape.bezierCurveTo(-0.44, 0.28, -0.38, 0.68, -0.12, 0.92);
    earShape.bezierCurveTo(-0.04, 0.98, 0.04, 0.98, 0.12, 0.92);
    earShape.bezierCurveTo(0.38, 0.68, 0.44, 0.28, 0.32, 0);
    earShape.bezierCurveTo(0.16, -0.06, -0.16, -0.06, -0.32, 0);

    const earExtrudeSettings = {
      depth: 0.10,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06
    };
    const earOuterGeo = new THREE.ExtrudeGeometry(earShape, earExtrudeSettings);

    const pos = earOuterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i) - 0.05;
      z -= Math.pow(Math.max(0, y) / 0.95, 1.3) * 0.14;
      if (z > 0 && Math.abs(x) < 0.26) z -= 0.030;
      pos.setXYZ(i, x, y, z);
    }
    earOuterGeo.computeVertexNormals();

    // 2. Rosy Inner Hollow
    const innerShape = new THREE.Shape();
    innerShape.moveTo(-0.20, 0.04);
    innerShape.bezierCurveTo(-0.28, 0.26, -0.24, 0.56, -0.07, 0.76);
    innerShape.bezierCurveTo(-0.02, 0.80, 0.02, 0.80, 0.07, 0.76);
    innerShape.bezierCurveTo(0.24, 0.56, 0.28, 0.26, 0.20, 0.04);
    innerShape.bezierCurveTo(0.08, -0.02, -0.08, -0.02, -0.20, 0.04);

    const earInnerGeo = new THREE.ExtrudeGeometry(innerShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04
    });
    const inPos = earInnerGeo.attributes.position;
    for (let i = 0; i < inPos.count; i++) {
      let x = inPos.getX(i);
      let y = inPos.getY(i);
      let z = inPos.getZ(i) + 0.015;
      z -= Math.pow(Math.max(0, y) / 0.75, 1.3) * 0.10;
      inPos.setXYZ(i, x, y, z);
    }
    earInnerGeo.computeVertexNormals();

    // Left Fox Ear Rig
    this.earL = new THREE.Group();
    this.earL.position.set(-0.50, 0.96, 0.14);

    this.earL_Flex = new THREE.Group();
    this.earL_Flex.add(new THREE.Mesh(earOuterGeo, this.mochiMaterial));
    this.earL_Flex.add(new THREE.Mesh(earInnerGeo, innerEarMat));

    // Ear fur tufts inside hollow
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0xFFB4C8, roughness: 0.80 });
    const tuftL1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), tuftMat);
    tuftL1.position.set(-0.07, 0.18, 0.06);
    tuftL1.scale.set(0.8, 1.3, 0.6);
    this.earL_Flex.add(tuftL1);

    const tuftL2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), tuftMat);
    tuftL2.position.set(0.05, 0.24, 0.06);
    tuftL2.scale.set(0.7, 1.2, 0.6);
    this.earL_Flex.add(tuftL2);

    this.earL.add(this.earL_Flex);

    // Right Fox Ear Rig
    this.earR = new THREE.Group();
    this.earR.position.set(0.50, 0.96, 0.14);

    this.earR_Flex = new THREE.Group();
    this.earR_Flex.add(new THREE.Mesh(earOuterGeo, this.mochiMaterial));
    this.earR_Flex.add(new THREE.Mesh(earInnerGeo, innerEarMat));

    const tuftR1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), tuftMat);
    tuftR1.position.set(0.07, 0.18, 0.06);
    tuftR1.scale.set(0.8, 1.3, 0.6);
    this.earR_Flex.add(tuftR1);

    const tuftR2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), tuftMat);
    tuftR2.position.set(-0.05, 0.24, 0.06);
    tuftR2.scale.set(0.7, 1.2, 0.6);
    this.earR_Flex.add(tuftR2);

    this.earR.add(this.earR_Flex);

    this.earsGroup.add(this.earL);
    this.earsGroup.add(this.earR);

    this.earTwitchTimer = 3.0;
    this.nextEarTwitch = 3.5;
    this.twitchEar = 'L';
  }

  createDevilHorns() {
    this.hornsGroup = new THREE.Group();
    this.hornsGroup.visible = false;
    this.mochiGroup.add(this.hornsGroup);

    this.hornMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.mochiShaderUniforms.uTime,
        uDemon: this.mochiShaderUniforms.uDemon
      },
      vertexShader: `
        attribute float aRib;
        attribute float aU;
        varying vec3 vNormal;
        varying float vRib;
        varying float vU;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vRib = aRib;
          vU = aU;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying float vRib;
        varying float vU;
        void main() {
          vec3 N = normalize(vNormal);
          float ndv = clamp(dot(N, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
          float fresnel = pow(1.0 - ndv, 1.35);

          // High-contrast obsidian-crimson ribs matching storyboard
          vec3 colCrevice = vec3(0.05, 0.01, 0.02);
          vec3 colRidge   = vec3(0.42, 0.09, 0.11);
          float ribFactor = smoothstep(-0.65, 0.75, vRib);
          vec3 baseCol = mix(colCrevice, colRidge, ribFactor);

          // Molten fiery red-orange rim lighting catching outer curve & rib crests
          float flicker = 0.92 + 0.08 * sin(uTime * 18.0 + vU * 8.0);
          float rimMask = clamp((fresnel * 0.78 + ribFactor * 0.32) * (1.0 - vU * 0.22), 0.0, 1.0) * flicker;
          vec3 colLava = mix(vec3(0.88, 0.16, 0.10), vec3(1.0, 0.42, 0.12), fresnel);
          baseCol = mix(baseCol, colLava, rimMask * 0.88);

          // Darkened razor tip & skull socket ring
          baseCol = mix(baseCol, vec3(0.06, 0.01, 0.02), smoothstep(0.80, 1.0, vU) * 0.72);
          baseCol = mix(baseCol, vec3(0.07, 0.02, 0.03), smoothstep(0.09, 0.0, vU) * 0.70);

          gl_FragColor = vec4(baseCol, 1.0);
        }
      `
    });

    const buildHornGeo = (side) => {
      // Tall, dramatic bull/demon horn curve sweeping wide outward from forehead socket,
      // then hooking high upward & inward (matching media_1793910047094_8ebc6650.jpg 1:1!)
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, -0.08, 0),
        new THREE.Vector3(side * 0.78, 0.20, 0.12),
        new THREE.Vector3(side * 0.76, 1.15, 0.08),
        new THREE.Vector3(side * 0.14, 1.66, 0.02)
      );

      const rings = 68;
      const segs = 30;
      const frames = curve.computeFrenetFrames(rings, false);
      const numVerts = (rings + 1) * segs;
      const positions = new Float32Array(numVerts * 3);
      const aRib = new Float32Array(numVerts);
      const aU = new Float32Array(numVerts);
      const indices = [];

      let ptr = 0;
      for (let i = 0; i <= rings; i++) {
        const u = i / rings;
        const P = curve.getPointAt(u);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        // Thick muscular base (0.42) tapering to a sharp hooked point
        const baseR = 0.42 * Math.pow(1.0 - u, 0.72) + 0.006 * (1.0 - u);
        // 8 deep, sculpted annular horn ridges/ribs along the shaft
        const ribEnv = Math.sin(Math.min(1.0, u / 0.90) * Math.PI);
        const ribWave = Math.sin(u * Math.PI * 16.0) * ribEnv;
        const r = baseR * (1.0 + 0.125 * ribWave);

        for (let j = 0; j < segs; j++) {
          const theta = (j / segs) * Math.PI * 2;
          const cosT = Math.cos(theta) * r;
          const sinT = Math.sin(theta) * r * 0.92;
          positions[ptr * 3]     = P.x + N.x * cosT + B.x * sinT;
          positions[ptr * 3 + 1] = P.y + N.y * cosT + B.y * sinT;
          positions[ptr * 3 + 2] = P.z + N.z * cosT + B.z * sinT;
          aRib[ptr] = ribWave;
          aU[ptr] = u;
          ptr++;
        }
      }

      for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segs; j++) {
          const nextJ = (j + 1) % segs;
          const v0 = i * segs + j;
          const v1 = i * segs + nextJ;
          const v2 = (i + 1) * segs + j;
          const v3 = (i + 1) * segs + nextJ;
          indices.push(v0, v1, v2);
          indices.push(v1, v3, v2);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aRib', new THREE.BufferAttribute(aRib, 1));
      geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    this.hornL = new THREE.Mesh(buildHornGeo(-1), this.hornMaterial);
    this.hornR = new THREE.Mesh(buildHornGeo(1), this.hornMaterial);
    this.hornL.position.set(-0.48, 0.66, 0.28);
    this.hornR.position.set(0.48, 0.66, 0.28);
    this.hornsGroup.add(this.hornL);
    this.hornsGroup.add(this.hornR);
  }

  /**
   * REAL-TIME 3D WEBGL PROCEDURAL ANIME INFERNO, VOLUMETRIC DARK SMOKE & 3D EMBERS
   * 100% Dynamic GLSL Fragment/Vertex Shader + 3D Particle System + Flickering PointLight.
   * Wraps organically around Mochi's perimeter with ZERO box clipping and ZERO gas-stove blobs!
   */
  createInfernoSystem() {
    this.infernoGroup = new THREE.Group();
    this.infernoGroup.visible = false;
    this.mochiGroup.add(this.infernoGroup);

    this.infernoUniforms = {
      uTime: { value: 0.0 },
      uFire: { value: 0.0 },
      uDemon: { value: 0.0 }
    };

    // 1. Focused Elegant Anime Flame Aura (Matches reference storyboard 1:1)
    // Sized comfortably to contour Mochi's back and horns without sprawling into a giant box
    const backGeo = new THREE.PlaneGeometry(4.40, 4.20, 32, 32);
    const bPos = backGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const x = bPos.getX(i);
      const y = bPos.getY(i);
      const z = -1.25 + (x * x) * 0.04;
      bPos.setXYZ(i, x, y + 0.45, z);
    }
    backGeo.computeVertexNormals();

    this.infernoBackMat = new THREE.ShaderMaterial({
      uniforms: this.infernoUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFire;
        uniform float uDemon;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.05;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          if (uFire <= 0.01) discard;

          // Normalized coordinates centered behind Mochi
          vec2 p = (vUv - vec2(0.5, 0.32)) * vec2(2.2, 2.2);

          // Distance from Mochi silhouette
          float dBody = length(vec2(p.x / 0.74, (p.y + 0.05) / 0.52));

          // Natural circular fade (Zero sharp rectangular edges)
          float edgeFade = smoothstep(1.35, 0.80, length(p * vec2(0.85, 0.75)));
          // Floor taper: flames rise up around flanks, no horizontal bar at bottom
          float floorCradle = smoothstep(-0.55, 0.15, p.y + abs(p.x) * 0.65);
          float boundMask = edgeFade * floorCradle;

          // Upward flame turbulence
          float tSpeed = uTime * 3.8;
          vec2 q = vec2(p.x * 2.8, p.y * 2.0 - tSpeed);
          float n1 = fbm(q);
          float n2 = fbm(q * 1.8 + vec2(n1 * 1.2, -tSpeed * 0.6));
          float turb = n1 * 0.60 + n2 * 0.40;

          // Stylized anime flame tongues
          float ang = atan(p.y + 0.10, p.x);
          float tongues = pow(clamp(0.5 + 0.5 * sin(ang * 8.0 + n1 * 4.0 - uTime * 3.5), 0.0, 1.0), 2.0);

          // Flame reach contouring Mochi's horns and shoulders
          float heightBoost = smoothstep(-0.1, 1.2, p.y) * (1.1 + uDemon * 0.85);
          float flankBoost = smoothstep(0.2, 0.8, abs(p.x)) * 0.45;
          float reach = mix(0.88 + flankBoost, 1.35 + heightBoost, uDemon) + (turb - 0.35) * 0.50 + tongues * 0.40;

          // Aura field: hollow inside Mochi body, peaks at perimeter
          float field = (reach - dBody) * boundMask * smoothstep(0.20, 0.85, dBody);
          field = clamp(field, 0.0, 1.0);

          // 3-Tier Elegant Anime Fire Palette (Pure anime: Scarlet Red -> Blazing Orange -> Gold Core)
          vec3 cCrimson = vec3(0.82, 0.08, 0.08);
          vec3 cRed     = vec3(0.98, 0.20, 0.06);
          vec3 cOrange  = vec3(1.00, 0.52, 0.06);
          vec3 cGold    = vec3(1.00, 0.88, 0.18);

          float aEdge = smoothstep(0.04, 0.20, field);
          float aMid  = smoothstep(0.20, 0.45, field);
          float aCore = smoothstep(0.45, 0.75, field);

          vec3 col = mix(cCrimson, cRed, aEdge);
          col = mix(col, cOrange, aMid);
          col = mix(col, cGold, aCore);

          float alpha = aEdge * min(1.0, uFire * 1.35);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    this.infernoBackMesh = new THREE.Mesh(backGeo, this.infernoBackMat);
    this.infernoBackMesh.renderOrder = 5;
    this.infernoGroup.add(this.infernoBackMesh);

    // 2. Front fire mesh is strictly null (Zero obstruction of Mochi's face)
    this.infernoFrontMesh = null;

    // 3. Real-Time 3D Swirling Fiery Ember Sparks
    this.emberGroup = new THREE.Group();
    this.infernoGroup.add(this.emberGroup);
    this.embers = [];
    const emberGeo = new THREE.OctahedronGeometry(0.045, 0);
    for (let i = 0; i < 32; i++) {
      const isGold = (i % 2 === 0);
      const eMat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xFFDF40 : 0xFF4518,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(emberGeo, eMat);
      const side = (i % 2 === 0) ? -1 : 1;
      const seed = i / 32;
      mesh.scale.set(0.65, 1.45, 0.65);
      this.emberGroup.add(mesh);
      this.embers.push({
        mesh,
        side,
        seed,
        radius: 1.10 + (i % 5) * 0.16,
        speed: 1.3 + (i % 4) * 0.35,
        wobble: 2.0 + (i % 3) * 1.1
      });
    }

    // 4. Fiery 3D Rim Backlight (Behind Mochi at z = -1.8 for dramatic anime rim lighting without washing out the face)
    this.infernoLight = new THREE.PointLight(0xFF4518, 0, 8);
    this.infernoLight.position.set(0, 0.8, -1.8);
    this.scene.add(this.infernoLight);
  }

  updateInferno(dt) {
    // FIRE ELIMINATED: Zero fire planes, zero ember billboard, zero inferno clutter per user mandate!
    if (this.infernoGroup) this.infernoGroup.visible = false;
    if (this.infernoLight) this.infernoLight.intensity = 0;
    if (this.emberGroup) this.emberGroup.visible = false;
    if (this.camera) {
      const baseZ = this._baseCamZ || 5.5;
      if (!this._baseCamZ) this._baseCamZ = this.camera.position.z || 5.5;
      const uDemon = (this.infernoUniforms && this.infernoUniforms.uDemon) ? this.infernoUniforms.uDemon.value : 0;
      this.camera.position.z = baseZ + uDemon * 0.45;
    }
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
   * Helper to construct individual transparent materials for independent Disney-grade opacity morphing.
   */
  makeFacialMat(color, opacity = 1.0) {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      depthTest: false,
      depthWrite: false
    });
  }

  /**
   * 3D Expressive Adorable Kitten Eyes & Authentic Mochi Cat Mouth.
   * Matches Option C in mochi_hand_options_1791308895920.jpg.
   */
  /**
   * 3D Crisp Expressive Facial Features & Disney-Grade Dynamic Vector Face Engine.
   * Matches reference sheet media_1793904869971_2f2e92b6.jpg 1:1 with ZERO anomalies.
   */
  /**
   * 3D Crisp Expressive Facial Features & Disney-Grade Dynamic Vector Face Engine.
   * Matches reference sheet media_1793904869971_2f2e92b6.jpg 1:1 with ZERO anomalies.
   */
  createFaceObjects() {
    this.faceGroup = new THREE.Group();
    this.faceGroup.position.set(0, 0, 0);
    this.faceGroup.renderOrder = 999;
    this.mochiGroup.add(this.faceGroup);

    // Dynamic Retina Vector Face & FX Canvas (1024x1024)
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 1024;
    this.faceCanvas.height = 1024;
    this.faceCtx = this.faceCanvas.getContext('2d');

    this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
    // Canvas pixels are authored in sRGB: without this the dark glossy eyes wash out to grey.
    if (THREE.SRGBColorSpace) this.faceTexture.colorSpace = THREE.SRGBColorSpace;
    this.faceTexture.generateMipmaps = true;
    this.faceTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.faceTexture.magFilter = THREE.LinearFilter;

    // Generous 3.55 x 3.55 viewport plane so floating FX badges (rays, !, ?, Zz, sweat) never clip!
    const faceGeo = new THREE.PlaneGeometry(3.55, 3.55);
    const faceMat = new THREE.MeshBasicMaterial({
      map: this.faceTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.faceMesh = new THREE.Mesh(faceGeo, faceMat);
    this.faceMesh.position.set(0, 0.04, 1.18);
    this.faceMesh.renderOrder = 1000;
    this.faceGroup.add(this.faceMesh);

    // Compatibility dummy stubs for external references/tests
    const stub = () => {
      const g = new THREE.Group();
      g.visible = false;
      return g;
    };
    this.eyeLeftDot = stub();
    this.eyeRightDot = stub();
    this.eyeHappyL = stub();
    this.eyeHappyR = stub();
    this.eyeWink = stub();
    this.eyeSleepyL = stub();
    this.eyeSleepyR = stub();
    this.eyeHeartL = stub();
    this.eyeHeartR = stub();
    this.eyePoutL = stub();
    this.eyePoutR = stub();
    this.browPoutL = stub();
    this.browPoutR = stub();
    this.foreheadFurrow = stub();
    this.mouthW = stub();
    this.mouthHappy = stub();
    this.mouthO = stub();
    this.mouthMesh = stub();
    this.mouthPout = stub();
    this.mouthFirm = stub();
    this.mouthSmirk = stub();
    this.eyebrowFirmL = stub();
    this.eyebrowFirmR = stub();
    this.eyebrowSkepticalL = stub();
    this.eyebrowSkepticalR = stub();
    this.eyelidSkepticalL = stub();
    this.fxAngerCross = stub();
    this.fxQuestionMark = stub();
    this.fxStarSparkleL = stub();
    this.fxStarSparkleR = stub();
    this.fxTearDropL = stub();
    this.fxTearDropR = stub();

    this._snapNextMorph = true;
    this.updateFaceVisibility();
    this.updateFaceMorph(0);
  }

  updateFaceVisibility() {
    if (this.faceCanvas && this.faceCtx) {
      this.updateFaceMorph(0);
    }
  }

  /**
   * Maps every public mood alias onto its canonical expression key across all 3 rows
   * of the master Character Expression Storyboard (media_1793912961663_5f966c21.jpg).
   */
  canonMood(m) {
    const raw = String(m || 'neutral').toLowerCase().trim();
    switch (raw) {
      // Row 1 (6 Main Storyboard States)
      case 'dots': case 'neutral': case 'calm': case 'netral': case 'idle': case 'attentive': case 'talking': case 'bicara':
        return 'neutral';
      case 'firm': case 'tegas': case 'mentor':
        return 'firm';
      case 'skeptical': case 'sinis': case 'smirk': case 'wink': case 'witty':
        return 'skeptical';
      case 'happy': case 'gembira': case 'celebrate':
        return 'happy';
      case 'pout': case 'empati': case 'empathetic': case 'sulk':
        return 'pout';
      case 'furious': case 'sangat_marah': case 'sangat-marah': case 'demon': case 'rage':
        return 'furious';

      // Row 2 (8 Sub-Expressions) & Row 3 (3-Stage Anger Transformation)
      case 'senang': case 'happy_soft':
        return 'senang';
      case 'neutral_clean':
        return 'neutral_clean';
      case 'surprised': case 'kaget': case 'shocked':
        return 'surprised';
      case 'sad': case 'sedih': case 'crying':
        return 'sad';
      case 'kesal': case 'annoyed':
        return 'kesal';
      case 'curious': case 'penasaran': case 'thinking':
        return 'curious';
      case 'sleepy': case 'lelah': case 'tired':
        return 'sleepy';
      case 'scared': case 'takut': case 'afraid':
        return 'scared';
      case 'angry': case 'marah':
        return 'angry';
      case 'hearts': case 'love':
        return 'hearts';
      default:
        return 'neutral';
    }
  }

  /**
   * Returns the canonical parametric pose descriptor for any expression in
   * media_1793912961663_5f966c21.jpg so GoPrep's spring solver (stiffness: 320, damping: 26)
   * continuously morphs the 3D daifuku vertices, eyes, mouth, and shaders.
   */
  getPoseTarget(canon) {
    const brows = (oX, oY, iX, iY, arch, w) => ({
      bLOX: oX, bLOY: oY, bLIX: iX, bLIY: iY, bLArch: arch,
      bROX: oX, bROY: oY, bRIX: iX, bRIY: iY, bRArch: arch, browW: w
    });
    const base = {
      // 3D Body & Shader Uniforms
      flushed: 0, demon: 0, dread: 0, fire: 0, blushBoost: 0,
      morphFirm: 0, morphSkeptical: 0, morphHappy: 0, morphPout: 0,
      headTilt: 0, headLift: 0,
      // Eyes
      eyeScaleX: 1.0, eyeScaleY: 1.0, eyeRot: 0, gazeX: 0, gazeY: 0,
      lidL: -1.35, lidR: -1.35, lidSlopeL: 0, lidSlopeR: 0,
      angryClip: 0, happyArc: 0, heartEye: 0, puppyGlint: 0, redIris: 0, demonEye: 0, eyeBags: 0,
      // Eyebrows (hidden by default, parked in a neutral arc above the eye)
      browAlpha: 0, furrow: 0,
      ...brows(-0.80, -1.30, 0.70, -1.30, 0.15, 0.16),
      // Mouth weights (smoothly blended)
      mCat: 1, mSmirk: 0, mBlep: 0, mFrown: 0, mHappy: 0, mHappyWide: 0, mPout3: 0,
      mRoar: 0, mGasp: 0, mSad: 0, mWavy: 0, mScream: 0,
      // Tears
      tears: 0,
      // Floating UI Badges
      badgeId: 'none'
    };

    switch (canon) {
      case 'neutral':
        return { ...base, badgeId: 'green_rays' };
      case 'neutral_clean':
        return { ...base, badgeId: 'none' };

      case 'firm': // Row 1 #2: Tegas - straight stern brows slicing the inner-top of round eyes, small ^ mouth
        return {
          ...base,
          morphFirm: 0.55, headLift: -0.03,
          angryClip: 1.0,
          browAlpha: 1.0, ...brows(-1.00, -0.92, 0.80, -0.28, -0.04, 0.19),
          mCat: 0, mFrown: 1.0,
          badgeId: 'anger_vein'
        };

      case 'skeptical': // Row 1 #3: Sinis - low flat left brow, high arched right brow, smirking cat mouth + pink blep tongue
        return {
          ...base,
          morphSkeptical: 0.8, headTilt: -0.04,
          lidL: -0.25, lidR: -0.32, lidSlopeL: 0.08, lidSlopeR: -0.12, gazeX: 5,
          browAlpha: 1.0,
          bLOX: -0.65, bLOY: -0.85, bLIX: 0.65, bLIY: -0.78, bLArch: 0.02,
          bROX: -0.60, bROY: -1.42, bRIX: 0.65, bRIY: -1.05, bRArch: 0.18,
          browW: 0.16,
          mCat: 0, mSmirk: 1.0, mBlep: 1.0,
          badgeId: 'sparkles_right'
        };

      case 'happy': // Row 1 #4: Gembira — thick ∩ closed eyes, tall open laughing mouth with :3 top lip
        return {
          ...base,
          morphHappy: 1.0, headLift: 0.06, blushBoost: 1.0,
          happyArc: 1.0,
          mCat: 0, mHappy: 1.0,
          badgeId: 'yellow_rays'
        };

      case 'senang': // Row 2 #2: Senang — same ∩ eyes, wider & shallower open smile
        return {
          ...base,
          morphHappy: 0.8, headLift: 0.05, blushBoost: 1.0,
          happyArc: 1.0,
          mCat: 0, mHappy: 1.0, mHappyWide: 1.0,
          badgeId: 'sparkles_top_right'
        };

      case 'pout': // Row 1 #5: Empati - puppy eyes, komari-mayu worried brows, plump 3D strawberry pout, 2 front paws
        return {
          ...base,
          morphPout: 0.6, blushBoost: 0.85,
          eyeScaleX: 1.06, eyeScaleY: 1.06, puppyGlint: 1.0,
          browAlpha: 1.0, ...brows(-0.62, -0.92, 0.55, -1.35, -0.06, 0.16),
          mCat: 0, mPout3: 1.0,
          badgeId: 'sweat_drops'
        };

      case 'furious': // Row 1 #6 & Row 3 #3: Sangat Marah (Demon Mochi - Clean Volcanic Obsidian, Zero Fire)
        return {
          ...base,
          demon: 1.0, fire: 0.0, morphFirm: 0.7,
          angryClip: 1.0, demonEye: 1.0, eyeScaleX: 1.08, eyeScaleY: 0.98,
          browAlpha: 1.0, ...brows(-1.10, -0.95, 0.85, -0.18, -0.05, 0.24), furrow: 0.6,
          mCat: 0, mRoar: 1.0,
          badgeId: 'anger_vein_demon'
        };

      case 'surprised': // Row 2 #3: Kaget — huge round eyes, no brows, tall O mouth
        return {
          ...base,
          morphHappy: 0.4, headLift: 0.05,
          eyeScaleX: 1.05, eyeScaleY: 1.08,
          mCat: 0, mGasp: 1.0,
          badgeId: 'exclaim_double'
        };

      case 'sad': // Row 2 #4: Sedih — puppy eyes + blue tear streams, worried brows, small open wobble mouth
        return {
          ...base,
          morphPout: 0.4, headLift: -0.03, blushBoost: 0.6,
          eyeScaleX: 1.04, eyeScaleY: 1.05, puppyGlint: 1.0,
          browAlpha: 1.0, ...brows(-0.45, -1.05, 0.55, -1.45, 0.12, 0.13),
          mCat: 0, mSad: 1.0,
          tears: 1.0,
          badgeId: 'none'
        };

      case 'kesal': // Row 2 #5 & Row 3 #1: Kesal — brows pressing low over flattened eyes, ︿ mouth
        return {
          ...base,
          morphFirm: 0.7, headLift: -0.03,
          angryClip: 1.0, lidL: -0.55, lidR: -0.55,
          browAlpha: 1.0, ...brows(-1.00, -0.78, 0.80, -0.30, -0.03, 0.18),
          mCat: 0, mFrown: 1.0,
          steam: 1.0,
          badgeId: 'anger_vein'
        };

      case 'curious': // Row 2 #6: Penasaran — big eyes, soft worried brows, small ︿ mouth
        return {
          ...base,
          morphSkeptical: 0.5, headTilt: 0.06,
          gazeX: -4, gazeY: -3,
          browAlpha: 1.0,
          bLOX: -0.55, bLOY: -1.15, bLIX: 0.55, bLIY: -1.42, bLArch: 0.15,
          bROX: -0.55, bROY: -1.20, bRIX: 0.55, bRIY: -1.40, bRArch: 0.15,
          browW: 0.11,
          mCat: 0, mFrown: 0.8,
          badgeId: 'question_purple'
        };

      case 'sleepy': // Row 2 #7: Lelah — heavy drooping lids (outer corners lower), thin brows, ~ sigh
        return {
          ...base,
          morphFirm: 0.4, headLift: -0.05,
          lidL: -0.12, lidR: -0.12, lidSlopeL: -0.22, lidSlopeR: -0.22,
          browAlpha: 1.0, ...brows(-0.75, -1.00, 0.55, -1.20, 0.08, 0.09),
          mCat: 0, mWavy: 1.0,
          badgeId: 'sleep_zz'
        };

      case 'scared': // Row 2 #8: Takut — watery eyes, steep worried brows, wavy open scream mouth
        return {
          ...base,
          dread: 0.55, morphPout: 0.3,
          eyeScaleX: 1.03, eyeScaleY: 1.06, puppyGlint: 0.8,
          browAlpha: 1.0, ...brows(-0.50, -1.02, 0.55, -1.48, 0.15, 0.13),
          mCat: 0, mScream: 1.0,
          badgeId: 'scared_shiver'
        };

      case 'angry': // Row 3 #2: Marah (Stage 2 flushed pink-red body, crimson eyes, dark smoke puffs above head, zero fire)
        return {
          ...base,
          flushed: 1.0, fire: 0.0, morphFirm: 0.7,
          angryClip: 1.0, redIris: 1.0,
          browAlpha: 1.0, ...brows(-1.05, -0.92, 0.82, -0.22, -0.04, 0.21), furrow: 0.4,
          mCat: 0, mFrown: 1.0,
          badgeId: 'anger_vein_steam'
        };

      case 'hearts':
        return {
          ...base,
          morphHappy: 0.6, blushBoost: 1.0, heartEye: 1.0,
          mCat: 1.0,
          badgeId: 'sparkles_right'
        };

      default:
        return base;
    }
  }

  /**
   * Continuous GoPrep-Engineered Spring Morphing Engine (stiffness: 320, damping: 26).
   * Synchronizes 3D Shader Uniforms, 3D Devil Horns, 3D WebGL Anime Inferno, and
   * 1024x1024 Facial & Floating Badge Vector Rig matching media_1793912961663_5f966c21.jpg 1:1.
   */
  updateFaceMorph(dt) {
    if (!this.faceCtx) return;
    dt = Math.min(Math.max(dt, 0), 1 / 24);

    const canon = this.canonMood(this.mood);
    this.canonicalMood = canon;
    const targetPose = this.getPoseTarget(canon);

    // Initialize or step GoPrep Spring Solver (stiffness = 320, damping = 26)
    if (!this._rig || this._snapNextMorph || dt === 0 && !this._rigInitialized) {
      this._rig = { ...targetPose };
      this._rigVel = {};
      for (const k of Object.keys(targetPose)) {
        if (typeof targetPose[k] === 'number') this._rigVel[k] = 0;
      }
      this._activeBadgeId = targetPose.badgeId;
      this._badgeScale = 1.0;
      this._badgeVel = 0.0;
      this._snapNextMorph = false;
      this._rigInitialized = true;
    } else if (dt > 0) {
      const K = 320;
      const D = 26;
      const steps = Math.min(6, Math.max(1, Math.ceil(dt / 0.008)));
      const sdt = dt / steps;
      for (const k of Object.keys(targetPose)) {
        const tgt = targetPose[k];
        if (typeof tgt !== 'number') continue;
        let x = this._rig[k] !== undefined ? this._rig[k] : tgt;
        let v = this._rigVel[k] || 0;
        for (let s = 0; s < steps; s++) {
          const a = -K * (x - tgt) - D * v;
          v += a * sdt;
          x += v * sdt;
        }
        this._rig[k] = x;
        this._rigVel[k] = v;
      }

      // Single-target badge transition (prevents multi-badge ghosting anomaly!)
      if (this._activeBadgeId !== targetPose.badgeId) {
        this._activeBadgeId = targetPose.badgeId;
        this._badgeScale = 0.25;
        this._badgeVel = 6.5;
      }
      const bA = -340 * (this._badgeScale - 1.0) - 22 * this._badgeVel;
      this._badgeVel += bA * dt;
      this._badgeScale += this._badgeVel * dt;
    }

    const R = this._rig;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    // Keep legacy moodWeights populated for external callers/tests
    this.moodWeights.neutral   = canon === 'neutral' ? 1 : 0;
    this.moodWeights.firm      = clamp01(R.morphFirm);
    this.moodWeights.skeptical = clamp01(R.morphSkeptical);
    this.moodWeights.happy     = clamp01(R.morphHappy);
    this.moodWeights.pout      = clamp01(R.morphPout);
    this.moodWeights.hearts    = clamp01(R.heartEye);

    // 1. Synchronize 3D Body Shader Uniforms & 3D Vertex Morph Targets
    if (this.mochiShaderUniforms) {
      this.mochiShaderUniforms.uFlushed.value    = clamp01(R.flushed);
      this.mochiShaderUniforms.uDemon.value      = clamp01(R.demon);
      this.mochiShaderUniforms.uDread.value      = clamp01(R.dread);
      this.mochiShaderUniforms.uBlushBoost.value = clamp01(R.blushBoost);
      this.mochiShaderUniforms.uTime.value       = this.time || 0;
      this.mochiShaderUniforms.uMorph0.value     = clamp01(R.morphFirm);
      this.mochiShaderUniforms.uMorph1.value     = clamp01(R.morphSkeptical);
      this.mochiShaderUniforms.uMorph2.value     = clamp01(R.morphHappy);
      this.mochiShaderUniforms.uMorph3.value     = clamp01(R.morphPout);
    }

    // 2. Synchronize 3D Cat Ears <-> 3D Curved Ribbed Devil Horns Morph
    const hornW = Math.max(0, R.demon);
    const earW = Math.max(0.001, 1.0 - clamp01(hornW * 1.15));
    if (this.earsGroup && this.showEars) {
      this.earsGroup.visible = (earW > 0.02);
      if (this.earL && this.earR) {
        this.earL.scale.set(earW, earW, earW);
        this.earR.scale.set(earW, earW, earW);
      }
    }
    if (this.hornsGroup) {
      this.hornsGroup.visible = (hornW > 0.02);
      if (this.hornL && this.hornR) {
        const hs = Math.max(0.001, hornW);
        this.hornL.scale.set(hs, hs, hs);
        this.hornR.scale.set(hs, hs, hs);
      }
    }

    // 3. Synchronize 3D WebGL Procedural Anime Inferno
    if (this.infernoUniforms) {
      this.infernoUniforms.uFire.value  = Math.max(0, R.fire);
      this.infernoUniforms.uDemon.value = clamp01(R.demon);
    }

    // Talking layer & Blink
    const talk = this._talk || { open: 0, round: 0 };
    const openW = clamp01(talk.open);
    const roundW = clamp01(talk.round);
    const blink = (this._blinkScale !== undefined) ? this._blinkScale : 1.0;
    const t = this.time || 0;

    // 4. Render 1024x1024 Retina Face & Unwarped Floating FX Canvas
    // Plane is 3.55 x 3.55 units at z=1.18 (1 Three.js unit = 288.45 px)
    const ctx = this.faceCtx;
    const W = 1024, H = 1024;
    ctx.clearRect(0, 0, W, H);

    const C_DARK = '#1B1115';
    const C_WHITE = '#FFFFFF';
    const C_TONGUE = '#FF7696';
    const C_MOUTH_CAVITY = '#681426';

    // Face layout measured from the reference storyboard (eye ≈ 20% of body width,
    // eye spacing ≈ 39% of body width, eyes sit ~44% down the bun, :3 between their lower halves).
    const ER = 76;                       // canonical eye radius (px)
    const eyeLX = 360 + R.gazeX;
    const eyeRX = 664 + R.gazeX;
    const eyeY  = 470 + R.gazeY;

    // =========================================================================
    // Tears moved to Section C (after eyes) so they sit boldly ON TOP of lower eyelids & cheeks!
    // B. EYES (Glossy dark chibi / puppy watery / red Marah / blazing demon / ∩ happy)
    // =========================================================================
    const happyW = clamp01(R.happyArc);
    const openEyeYScale = Math.max(0, 1.0 - happyW * 1.15);
    const browW = Math.max(0.05, R.browW) * ER;

    // Brow geometry for one side in canvas px (outer end, control point, inner end)
    const browPts = (cx, cy, side) => {
      const L = side < 0;
      const oX = L ? R.bLOX : R.bROX, oY = L ? R.bLOY : R.bROY;
      const iX = L ? R.bLIX : R.bRIX, iY = L ? R.bLIY : R.bRIY;
      const arch = L ? R.bLArch : R.bRArch;
      const p0 = { x: cx - side * oX * ER, y: cy + oY * ER };
      const p2 = { x: cx - side * iX * ER, y: cy + iY * ER };
      const len = Math.hypot(p2.x - p0.x, p2.y - p0.y) || 1;
      // Normal pointing "up" (negative y) for the arch control point
      let nx = -(p2.y - p0.y) / len, ny = (p2.x - p0.x) / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const p1 = { x: (p0.x + p2.x) / 2 + nx * arch * ER, y: (p0.y + p2.y) / 2 + ny * arch * ER };
      return [p0, p1, p2];
    };

    const drawSingleEye = (cx, cy, side) => {
      const isLeft = (side < 0);
      const lidY = isLeft ? R.lidL : R.lidR;
      const lidSlope = isLeft ? R.lidSlopeL : R.lidSlopeR;
      const ew = ER * R.eyeScaleX;
      const eh = ER * 1.04 * R.eyeScaleY;

      // 1. Tired Under-Eye Bags (Row 2 #7: Lelah)
      if (R.eyeBags > 0.05) {
        ctx.save();
        ctx.globalAlpha = clamp01(R.eyeBags) * 0.45;
        ctx.strokeStyle = '#8C6A74';
        ctx.lineWidth = 4.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy + eh * 0.2, ew * 0.9, Math.PI * 0.28, Math.PI * 0.72, false);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Open / half-lidded / glaring / demon eye
      if (openEyeYScale > 0.04) {
        const ys = Math.max(0.04, openEyeYScale * blink);
        ctx.save();

        // Clean demon eye perimeter (zero smudged fire tears across face)

        // Clip 1: upper eyelid (Sinis / Kesal / Lelah). lidSlope > 0 lowers the inner corner.
        if (lidY > -1.2) {
          const yOut = cy + (lidY - lidSlope * 0.5) * eh;
          const yIn  = cy + (lidY + lidSlope * 0.5) * eh;
          ctx.beginPath();
          const xo = cx + (isLeft ? -1.6 : 1.6) * ew;
          const xi = cx + (isLeft ? 1.6 : -1.6) * ew;
          ctx.moveTo(xo, yOut);
          ctx.lineTo(xi, yIn);
          ctx.lineTo(xi, cy + eh * 2);
          ctx.lineTo(xo, cy + eh * 2);
          ctx.closePath();
          ctx.clip();
        }
        // Clip 2: angry brow slices the inner-top of the eye (Tegas / Kesal / Marah / Demon)
        if (R.angryClip > 0.05 && R.browAlpha > 0.3) {
          const [p0, , p2] = browPts(cx, cy, side);
          const dx = p2.x - p0.x, dy = p2.y - p0.y;
          const k = 3.0;
          const off = browW * 0.35 * R.angryClip;
          ctx.beginPath();
          ctx.moveTo(p0.x - dx * k, p0.y - dy * k + off);
          ctx.lineTo(p2.x + dx * k, p2.y + dy * k + off);
          ctx.lineTo(p2.x + dx * k, cy + eh * 3);
          ctx.lineTo(p0.x - dx * k, cy + eh * 3);
          ctx.closePath();
          ctx.clip();
        }

        ctx.translate(cx, cy);
        if (R.eyeRot) ctx.rotate(side * R.eyeRot);
        ctx.scale(1, ys);

        ctx.beginPath();
        ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI * 2);

        if (R.demonEye > 0.2) {
          // Stage 3 blazing demon eye: yellow-white core → orange → red → crimson rim
          const dGrad = ctx.createRadialGradient(0, eh * 0.15, ew * 0.05, 0, eh * 0.05, ew * 1.02);
          dGrad.addColorStop(0.00, '#FFF6B0');
          dGrad.addColorStop(0.22, '#FFC23A');
          dGrad.addColorStop(0.50, '#FF5A1C');
          dGrad.addColorStop(0.80, '#D81412');
          dGrad.addColorStop(1.00, '#6A0508');
          ctx.fillStyle = dGrad;
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(70, 0, 4, 0.9)';
          ctx.stroke();
        } else if (R.redIris > 0.2) {
          // Stage 2 Marah crimson eye with glowing lower half
          const rGrad = ctx.createLinearGradient(0, -eh, 0, eh);
          rGrad.addColorStop(0.00, '#2A0507');
          rGrad.addColorStop(0.45, '#6E0A12');
          rGrad.addColorStop(0.80, '#D8161E');
          rGrad.addColorStop(1.00, '#FF4636');
          ctx.fillStyle = rGrad;
          ctx.fill();
        } else {
          // Canonical glossy near-black chibi eye with warm brown lower iris
          const base = ctx.createLinearGradient(0, -eh, 0, eh);
          base.addColorStop(0.0, '#0B0507');
          base.addColorStop(0.55, '#170B0E');
          base.addColorStop(1.0, '#2C1513');
          ctx.fillStyle = base;
          ctx.fill();
          ctx.save();
          ctx.clip();
          const irisGrad = ctx.createRadialGradient(0, eh * 0.62, ew * 0.1, 0, eh * 0.62, ew * 0.85);
          irisGrad.addColorStop(0.0, 'rgba(150, 82, 58, 0.75)');
          irisGrad.addColorStop(0.55, 'rgba(96, 46, 36, 0.45)');
          irisGrad.addColorStop(1.0, 'rgba(20, 10, 12, 0)');
          ctx.fillStyle = irisGrad;
          ctx.fillRect(-ew, -eh, ew * 2, eh * 2);
          ctx.restore();
        }

        // White catchlights (big top-left, small bottom-right; puppy adds sparkles)
        if (blink > 0.25 && R.demonEye < 0.65) {
          ctx.fillStyle = C_WHITE;
          const big = R.puppyGlint > 0.4 ? 0.30 : 0.24;
          ctx.beginPath();
          ctx.arc(-ew * 0.27, -eh * 0.38, ew * big, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ew * 0.33, eh * 0.30, ew * (R.puppyGlint > 0.4 ? 0.15 : 0.11), 0, Math.PI * 2);
          ctx.fill();
          if (R.puppyGlint > 0.4) {
            ctx.globalAlpha = clamp01(R.puppyGlint);
            ctx.beginPath();
            ctx.arc(-ew * 0.30, eh * 0.42, ew * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ew * 0.38, -eh * 0.30, ew * 0.07, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else if (R.demonEye >= 0.65) {
          ctx.fillStyle = 'rgba(255, 252, 220, 0.9)';
          ctx.beginPath();
          ctx.arc(-ew * 0.22, -eh * 0.05, ew * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Thick upper eyelid line for half-lidded states (Sinis / Kesal / Lelah)
        if (lidY > -0.95) {
          const xo = cx + (isLeft ? -1.06 : 1.06) * ew;
          const xi = cx + (isLeft ? 1.06 : -1.06) * ew;
          const yOut = cy + (lidY - lidSlope * 0.5) * eh * ys;
          const yIn  = cy + (lidY + lidSlope * 0.5) * eh * ys;
          ctx.save();
          ctx.strokeStyle = C_DARK;
          ctx.lineCap = 'round';
          ctx.lineWidth = ER * 0.15;
          ctx.beginPath();
          ctx.moveTo(xo, yOut);
          ctx.quadraticCurveTo((xo + xi) / 2, (yOut + yIn) / 2 - ER * 0.06, xi, yIn);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Joyful closed ∩ eyes (Gembira & Senang)
      if (happyW > 0.05) {
        ctx.save();
        ctx.translate(cx, cy + ER * 0.05);
        ctx.scale(happyW, happyW);
        ctx.strokeStyle = C_DARK;
        ctx.lineWidth = ER * 0.21;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-ER * 0.98, ER * 0.18);
        ctx.bezierCurveTo(-ER * 0.70, -ER * 0.62, ER * 0.70, -ER * 0.62, ER * 0.98, ER * 0.18);
        ctx.stroke();
        ctx.restore();
      }
    };

    if (R.heartEye > 0.5) {
      const hp = (0.92 + Math.sin(t * 7.5) * 0.08) * R.heartEye;
      [eyeLX, eyeRX].forEach((ex) => {
        ctx.save();
        ctx.translate(ex, eyeY);
        ctx.scale(hp * 1.5, hp * 1.5);
        ctx.fillStyle = '#FF2E63';
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.bezierCurveTo(-36, -18, -44, -48, -16, -48);
        ctx.bezierCurveTo(0, -44, 0, -28, 0, -28);
        ctx.bezierCurveTo(0, -28, 0, -44, 16, -48);
        ctx.bezierCurveTo(44, -48, 36, -18, 0, 18);
        ctx.fill();
        ctx.restore();
      });
    } else {
      drawSingleEye(eyeLX, eyeY, -1);
      drawSingleEye(eyeRX, eyeY,  1);
    // =========================================================================
    // C. VIVID GLISTENING ANIME TEAR RIVERS & POOLS (Row 2 #4: Sedih)
    // Drawn ON TOP of eyes & cheeks: vibrant anime sky blue, bold navy boundary, sparkling glints!
    // =========================================================================
    if (R.tears > 0.03) {
      ctx.save();
      ctx.globalAlpha = clamp01(R.tears);
      const drawBoldAnimeTears = (ex, side) => {
        // 1. Bright tear pool resting along the lower eye border (wide, vibrant, impossible to miss!)
        const poolY = eyeY + ER * 0.72;
        const poolGrad = ctx.createLinearGradient(ex - 48, poolY, ex + 48, poolY + 36);
        poolGrad.addColorStop(0.0, "#00E5FF");
        poolGrad.addColorStop(0.5, "#00B0FF");
        poolGrad.addColorStop(1.0, "#0080EA");

        ctx.strokeStyle = "#014A8A";
        ctx.lineWidth = 5.0;
        ctx.fillStyle = poolGrad;

        ctx.beginPath();
        ctx.ellipse(ex, poolY, ER * 0.82, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Bold dripping tear river streaming down the cheek
        const streamY = poolY + 16;
        ctx.beginPath();
        ctx.moveTo(ex - 24, streamY);
        ctx.bezierCurveTo(ex - 32, streamY + 32, ex - 28, streamY + 75, ex - 22, streamY + 95);
        ctx.bezierCurveTo(ex - 12, streamY + 115, ex + 12, streamY + 115, ex + 22, streamY + 95);
        ctx.bezierCurveTo(ex + 28, streamY + 75, ex + 32, streamY + 32, ex + 24, streamY);
        ctx.closePath();
        ctx.fillStyle = poolGrad;
        ctx.fill();
        ctx.stroke();

        // 3. Large juicy falling teardrop bead below the stream
        const dropY = streamY + 130;
        ctx.beginPath();
        ctx.moveTo(ex, dropY - 22);
        ctx.bezierCurveTo(ex - 18, dropY - 4, ex - 18, dropY + 22, ex, dropY + 22);
        ctx.bezierCurveTo(ex + 18, dropY + 22, ex + 18, dropY - 4, ex, dropY - 22);
        ctx.closePath();
        ctx.fillStyle = poolGrad;
        ctx.fill();
        ctx.stroke();

        // Second falling droplet
        ctx.beginPath();
        ctx.arc(ex + side * 6, dropY + 42, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bright white glistening specular glints on the tears!
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(ex - 12, poolY - 4, 12.0, 6.0, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex - 6, streamY + 45, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex - 3, dropY + 4, 5.0, 0, Math.PI * 2);
        ctx.fill();
      };
      drawBoldAnimeTears(eyeLX, -1);
      drawBoldAnimeTears(eyeRX, 1);
      ctx.restore();
    }
    }

    // =========================================================================
    // C. STYLIZED MANGA ANIME EYEBROWS (Matches Reference Image 1:1!)
    // =========================================================================
    if (R.browAlpha > 0.03) {
      ctx.save();
      ctx.globalAlpha = clamp01(R.browAlpha);
      ctx.fillStyle = R.demon > 0.5 ? '#0A0204' : C_DARK;
      ctx.strokeStyle = R.demon > 0.5 ? '#0A0204' : C_DARK;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const drawMangaBrow = (cx, side) => {
        const [p0, p1, p2] = browPts(cx, eyeY, side);
        ctx.save();
        const browCol = (R.demon > 0.5) ? '#0A0204' : C_DARK;
        ctx.strokeStyle = browCol;
        ctx.fillStyle = browCol;
        // Natural bold anime brush weight (16px to 22px thickness, perfectly smooth with round caps)
        const strokeW = Math.max(15.0, browW * 1.85);
        ctx.lineWidth = strokeW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      };

      drawMangaBrow(eyeLX, -1);
      drawMangaBrow(eyeRX,  1);

      // Forehead scowl furrow crease in furious/angry
      if (R.furrow > 0.15) {
        ctx.lineWidth = 5.5;
        ctx.globalAlpha = clamp01(R.furrow) * 0.75;
        ctx.beginPath();
        ctx.moveTo(502, eyeY - ER * 0.90);
        ctx.quadraticCurveTo(512, eyeY - ER * 0.65, 522, eyeY - ER * 0.90);
        ctx.stroke();
      }
      ctx.restore();
    }
    // =========================================================================
    // D. MOUTHS (1:1 Match to All 15 Storyboard States + Live Audio Visemes)
    // =========================================================================
    const mx = 512;
    const my = eyeY + ER * 0.70;  // :3 sits between the lower halves of the eyes (reference proportion)
    ctx.strokeStyle = C_DARK;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const fillOpenMouth = (definePath, tongueY, tongueRX, tongueRY, lw) => {
      definePath();
      const cav = ctx.createLinearGradient(0, -60, 0, 60);
      cav.addColorStop(0, '#4E0C1A');
      cav.addColorStop(1, C_MOUTH_CAVITY);
      ctx.fillStyle = cav;
      ctx.fill();
      ctx.save();
      definePath();
      ctx.clip();
      const tg = ctx.createLinearGradient(0, tongueY - tongueRY, 0, tongueY + tongueRY);
      tg.addColorStop(0.0, '#FF5F86');
      tg.addColorStop(1.0, '#FF9DB6');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.ellipse(0, tongueY, tongueRX, tongueRY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      definePath();
      ctx.strokeStyle = C_DARK;
      ctx.lineWidth = lw;
      ctx.stroke();
    };

    // D.1 Live Audio Viseme Speech Mouths (A, I, U, E, O - 3 Rows/Tiers from Storyboard)
    const drawVisemeMouth = (vowel, openAmount) => {
      ctx.save();
      ctx.translate(mx, my + 10);
      const s = 1.15 + clamp01(openAmount) * 0.65;
      ctx.scale(s, s);

      const fillBase = (definePath) => {
        definePath();
        const cav = ctx.createLinearGradient(0, -32, 0, 32);
        cav.addColorStop(0, '#3A0610');
        cav.addColorStop(1, '#540D1C');
        ctx.fillStyle = cav;
        ctx.fill();
      };

      const strokeOutline = (definePath, lw = 5.2) => {
        definePath();
        ctx.strokeStyle = '#24121E';
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      const v = (vowel || 'A').toUpperCase();
      if (v === 'A') {
        const w = 32, h = 26;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(-w, -h * 0.12);
          ctx.quadraticCurveTo(-w * 0.48, -h * 0.62, 0, -h * 0.16);
          ctx.quadraticCurveTo(w * 0.48, -h * 0.62, w, -h * 0.12);
          ctx.bezierCurveTo(w * 0.94, h * 0.88, 0, h, 0, h);
          ctx.bezierCurveTo(0, h, -w * 0.94, h * 0.88, -w, -h * 0.12);
          ctx.closePath();
        };
        fillBase(path);
        ctx.save();
        path();
        ctx.clip();
        const tg = ctx.createLinearGradient(0, -h * 0.1, 0, h);
        tg.addColorStop(0, '#FF4A74');
        tg.addColorStop(1, '#FF84A2');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-w * 0.85, h * 0.22);
        ctx.quadraticCurveTo(0, -h * 0.08, w * 0.85, h * 0.22);
        ctx.lineTo(w, h + 12);
        ctx.lineTo(-w, h + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFA2BA';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.12, w * 0.38, h * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        strokeOutline(path, 5.0);

      } else if (v === 'I') {
        const w = 34, h = 18;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(-w, -h * 0.22);
          ctx.quadraticCurveTo(-w * 0.46, -h * 0.52, 0, -h * 0.24);
          ctx.quadraticCurveTo(w * 0.46, -h * 0.52, w, -h * 0.22);
          ctx.bezierCurveTo(w * 0.78, h * 0.95, -w * 0.78, h * 0.95, -w, -h * 0.22);
          ctx.closePath();
        };
        fillBase(path);
        ctx.save();
        path();
        ctx.clip();
        const tg = ctx.createLinearGradient(0, -h * 0.1, 0, h);
        tg.addColorStop(0, '#FF4A74');
        tg.addColorStop(1, '#FF84A2');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-w * 0.75, h * 0.06);
        ctx.quadraticCurveTo(0, -h * 0.18, w * 0.75, h * 0.06);
        ctx.lineTo(w, h + 12);
        ctx.lineTo(-w, h + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFA2BA';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.06, w * 0.34, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        strokeOutline(path, 5.0);

      } else if (v === 'U') {
        const w = 18, h = 28;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(0, -h);
          ctx.bezierCurveTo(w * 0.65, -h * 0.95, w, -h * 0.2, w, h * 0.35);
          ctx.bezierCurveTo(w, h, -w, h, -w, h * 0.35);
          ctx.bezierCurveTo(-w, -h * 0.2, -w * 0.65, -h * 0.95, 0, -h);
          ctx.closePath();
        };
        fillBase(path);
        ctx.save();
        path();
        ctx.clip();
        const tg = ctx.createLinearGradient(0, 0, 0, h);
        tg.addColorStop(0, '#FF4A74');
        tg.addColorStop(1, '#FF84A2');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(0, h * 0.44, w * 0.82, h * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA2BA';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.16, w * 0.36, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        strokeOutline(path, 4.8);

      } else if (v === 'E') {
        const w = 34, h = 24;
        const path = () => {
          ctx.beginPath();
          ctx.moveTo(-w, -h * 0.32);
          ctx.quadraticCurveTo(0, -h * 0.16, w, -h * 0.32);
          ctx.bezierCurveTo(w * 0.88, h * 0.95, -w * 0.88, h * 0.95, -w, -h * 0.32);
          ctx.closePath();
        };
        fillBase(path);
        ctx.save();
        path();
        ctx.clip();
        const tg = ctx.createLinearGradient(0, -h * 0.1, 0, h);
        tg.addColorStop(0, '#FF4A74');
        tg.addColorStop(1, '#FF84A2');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-w * 0.78, h * 0.12);
        ctx.quadraticCurveTo(0, -h * 0.08, w * 0.78, h * 0.12);
        ctx.lineTo(w, h + 12);
        ctx.lineTo(-w, h + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFA2BA';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.08, w * 0.36, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        strokeOutline(path, 5.0);

      } else { // 'O'
        const w = 20, h = 32;
        const path = () => {
          ctx.beginPath();
          ctx.ellipse(0, 0, w * 0.65, h, 0, 0, Math.PI * 2);
          ctx.closePath();
        };
        fillBase(path);
        ctx.save();
        path();
        ctx.clip();
        const tg = ctx.createLinearGradient(0, 0, 0, h);
        tg.addColorStop(0, '#FF4A74');
        tg.addColorStop(1, '#FF84A2');
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.ellipse(0, h * 0.44, w * 0.60, h * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA2BA';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.20, w * 0.28, h * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        strokeOutline(path, 4.8);
      }
      ctx.restore();
    };

    if (openW > 0.08) {
      // Live Audio Viseme Talking Layer (A, I, U, E, O)
      drawVisemeMouth(this.currentVowel || 'A', openW);

    } else if (R.mRoar > 0.35) {
      // 1. SANGAT MARAH / FURIOUS DEMON MOUTH (Matches master reference Image 1 1:1!)
      // Wide roaring cavity, cat cupid's bow top lip, 4 sharp white vampire fangs, arched pink tongue
      ctx.save();
      ctx.translate(mx, my + 38);
      const s = Math.min(1.0, Math.max(0.4, R.mRoar));
      ctx.scale(1.42 * s, 1.35 * s);

      const roarPath = () => {
        ctx.beginPath();
        ctx.moveTo(-52, -22);
        ctx.quadraticCurveTo(-26, -34, 0, -20);
        ctx.quadraticCurveTo(26, -34, 52, -22);
        ctx.bezierCurveTo(66, -10, 68, 30, 48, 48);
        ctx.quadraticCurveTo(0, 60, -48, 48);
        ctx.bezierCurveTo(-68, 30, -66, -10, -52, -22);
        ctx.closePath();
      };

      // Dark oral cavity
      roarPath();
      ctx.fillStyle = '#1D0308';
      ctx.fill();

      // Masked contents: tongue & fangs
      ctx.save();
      roarPath();
      ctx.clip();

      // Arched pink tongue filling lower cavity
      const tGrad = ctx.createLinearGradient(0, 10, 0, 58);
      tGrad.addColorStop(0.0, '#FF4072');
      tGrad.addColorStop(1.0, '#FF80A0');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.moveTo(-54, 30);
      ctx.quadraticCurveTo(0, 10, 54, 30);
      ctx.quadraticCurveTo(56, 56, 0, 58);
      ctx.quadraticCurveTo(-56, 56, -54, 30);
      ctx.closePath();
      ctx.fill();

      // Sharp clean vampire fangs (2 top pointing DOWN, 2 bottom pointing UP)
      ctx.fillStyle = '#FFFFFF';
      const fang = (x0, y0, x1, y1, x2, y2) => {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill();
      };
      // Top vampire fangs pointing DOWN
      fang(-34, -26, -18, -23, -26, 6);
      fang( 18, -23,  34, -26,  26, 6);
      // Bottom fangs pointing UP
      fang(-46, 46, -30, 48, -38, 22);
      fang( 30, 48,  46, 46,  38, 22);

      ctx.restore();

      // Bold dark boundary stroke
      roarPath();
      ctx.strokeStyle = '#100204';
      ctx.lineWidth = 4.8;
      ctx.stroke();
      ctx.restore();

    } else if (R.mHappy > 0.35) {
      // 2. GEMBIRA / SENANG: :3 cat top lip sweeping into an open laughing mouth
      ctx.save();
      ctx.translate(mx, my - 8);
      const s = Math.min(1.0, Math.max(0.4, R.mHappy));
      const wide = clamp01(R.mHappyWide);
      ctx.scale(s * (1.0 + 0.16 * wide), s * (1.0 - 0.34 * wide));
      const happyPath = () => {
        ctx.beginPath();
        ctx.moveTo(-50, -6);
        ctx.quadraticCurveTo(-25, -24, 0, -6);
        ctx.quadraticCurveTo(25, -24, 50, -6);
        ctx.bezierCurveTo(52, 48, 30, 86, 0, 86);
        ctx.bezierCurveTo(-30, 86, -52, 48, -50, -6);
        ctx.closePath();
      };
      fillOpenMouth(happyPath, 60, 44, 36, 6.5);
      ctx.restore();

    } else if (R.mPout3 > 0.35) {
      // 3. EMPATI: Adorable vertical anime "3" pout mouth matching user reference 1:1
      ctx.save();
      ctx.translate(mx, my + 6);
      const s = Math.min(1.0, Math.max(0.4, R.mPout3));
      ctx.scale(s, s);

      // Subtle airbrushed pink blush cushion behind mouth
      const mBg = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
      mBg.addColorStop(0, 'rgba(255, 120, 150, 0.45)');
      mBg.addColorStop(1, 'rgba(255, 180, 200, 0.0)');
      ctx.fillStyle = mBg;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Outer mouth cavity (subtle vertical oval)
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 11.0, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#3E0610';
      ctx.fill();

      // Pink interior tongue
      ctx.beginPath();
      ctx.ellipse(0, 4.0, 5.5, 6.0, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FF7A96';
      ctx.fill();

      // Specular shine on tongue
      ctx.beginPath();
      ctx.arc(0, 2.5, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFA8BC';
      ctx.fill();

      // Dark cute pout outline
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 11.0, 0, 0, Math.PI * 2);
      ctx.strokeStyle = C_DARK;
      ctx.lineWidth = 4.8;
      ctx.stroke();
      ctx.restore();

    } else if (R.mGasp > 0.35) {
      // 4. KAGET: pear-shaped open gasp (narrow top, round bottom)
      ctx.save();
      ctx.translate(mx, my + 22);
      const gaspPath = () => {
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.bezierCurveTo(22, -38, 33, 8, 30, 22);
        ctx.bezierCurveTo(27, 42, -27, 42, -30, 22);
        ctx.bezierCurveTo(-33, 8, -22, -38, 0, -38);
        ctx.closePath();
      };
      fillOpenMouth(gaspPath, 26, 26, 18, 6.5);
      ctx.restore();

    } else if (R.mSad > 0.35) {
      // 5. SEDIH: small wavy-topped open crying mouth
      ctx.save();
      ctx.translate(mx, my + 12);
      const sadPath = () => {
        ctx.beginPath();
        ctx.moveTo(-20, 6);
        ctx.quadraticCurveTo(-10, -8, 0, -3);
        ctx.quadraticCurveTo(10, -8, 20, 6);
        ctx.quadraticCurveTo(16, 24, 0, 21);
        ctx.quadraticCurveTo(-16, 24, -20, 6);
        ctx.closePath();
      };
      fillOpenMouth(sadPath, 18, 15, 9, 6);
      ctx.restore();

    } else if (R.mScream > 0.35) {
      // 6. TAKUT: wide wavy kidney-bean scream mouth with small white teeth
      ctx.save();
      ctx.translate(mx, my + 20);
      const scrPath = () => {
        ctx.beginPath();
        ctx.moveTo(-36, -4);
        ctx.quadraticCurveTo(-18, -22, 0, -13);
        ctx.quadraticCurveTo(18, -22, 36, -4);
        ctx.bezierCurveTo(44, 15, 34, 30, 16, 26);
        ctx.quadraticCurveTo(0, 18, -16, 26);
        ctx.bezierCurveTo(-34, 30, -44, 15, -36, -4);
        ctx.closePath();
      };
      fillOpenMouth(scrPath, 20, 30, 12, 6.5);
      // Teeth visible along the top rim
      ctx.save();
      scrPath();
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.rect(-24, -20, 48, 8);
      ctx.fill();
      ctx.restore();
      scrPath();
      ctx.strokeStyle = C_DARK;
      ctx.lineWidth = 6.0;
      ctx.stroke();
      ctx.restore();

    } else if (R.mWavy > 0.35) {
      // 7. LELAH: small flat wavy ~ sigh
      ctx.save();
      ctx.translate(mx, my + 8);
      ctx.lineWidth = 7.0;
      ctx.beginPath();
      ctx.moveTo(-24, 4);
      ctx.bezierCurveTo(-10, -8, 8, 10, 24, -2);
      ctx.stroke();
      ctx.restore();

    } else if (R.mFrown > 0.35) {
      // 8. TEGAS / KESAL / MARAH / PENASARAN: small ︿ caret
      ctx.save();
      ctx.translate(mx, my + 8);
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(-24, 11);
      ctx.quadraticCurveTo(-12, -2, 0, -10);
      ctx.quadraticCurveTo(12, -2, 24, 11);
      ctx.stroke();
      ctx.restore();

    } else if (R.mBlep > 0.25) {
      // 8b. SINIS: Asymmetric Smirking Cat Mouth with Centered Pink Blep Tongue
      ctx.save();
      ctx.translate(mx, my + 6);
      const smirkW = clamp01(R.mSmirk);

      // 1. Plump Pink Tongue peeking out from the center cleft
      ctx.save();
      const blepScale = clamp01(R.mBlep);
      ctx.scale(1.0, blepScale);

      const tGrad = ctx.createLinearGradient(0, 4, 0, 42);
      tGrad.addColorStop(0.0, '#FF2D65');
      tGrad.addColorStop(0.6, '#FF6086');
      tGrad.addColorStop(1.0, '#FFA0B6');

      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.bezierCurveTo(-24, 38, 24, 38, 22, 4);
      ctx.closePath();
      ctx.fillStyle = tGrad;
      ctx.fill();

      // Tongue center indentation crease
      ctx.strokeStyle = '#D42050';
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, 26);
      ctx.stroke();

      // Tongue dark outline
      ctx.strokeStyle = C_DARK;
      ctx.lineWidth = 5.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.bezierCurveTo(-24, 38, 24, 38, 22, 4);
      ctx.stroke();

      // Specular highlight dot on tongue
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-6, 20, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Asymmetric Smirking Cat Lips (:3 / ω) drawn ON TOP of tongue base
      ctx.strokeStyle = C_DARK;
      ctx.lineWidth = 9.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Left cat wing (resting curve)
      ctx.beginPath();
      ctx.moveTo(-46, -4);
      ctx.quadraticCurveTo(-24, 16, 0, 4);
      ctx.stroke();

      // Right cat wing (smirking upward curl)
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(24, 18 - 5 * smirkW, 46, -9 - 7 * smirkW);
      ctx.stroke();
      ctx.restore();

    } else {
      // 9. NETRAL (Calm / Default): Standard Chibi :3 Cat Mouth
      ctx.save();
      ctx.translate(mx, my + 4);
      ctx.strokeStyle = C_DARK;
      ctx.lineWidth = 7.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(-30, -3);
      ctx.quadraticCurveTo(-15, 11, 0, 2);
      ctx.quadraticCurveTo(15, 11, 30, -3);
      ctx.stroke();
      ctx.restore();
    }

    // =========================================================================
    // E. STUDIO-POLISHED UNWARPED FLOATING FX BADGES (1:1 to Reference Image!)
    // Tapered comic-burst geometry, zero star-blob artifacts, zero UV warping!
    // =========================================================================
    const bId = this._activeBadgeId;
    const bSc = Math.max(0.01, this._badgeScale || 1.0);

    // Tapered teardrop comic ray (narrow inner base, plump rounded outer tip)
    const drawTaperedRay = (x1, y1, x2, y2, rInner, rOuter, colorHex) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.moveTo(x1 + nx * rInner, y1 + ny * rInner);
      ctx.lineTo(x2 + nx * rOuter, y2 + ny * rOuter);
      ctx.arc(x2, y2, rOuter, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
      ctx.lineTo(x1 - nx * rInner, y1 - ny * rInner);
      ctx.arc(x1, y1, rInner, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
      ctx.closePath();
      ctx.fill();
    };

    const drawRayTrio = (bx, by, colorHex) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(bSc * 1.25, bSc * 1.25);
      drawTaperedRay(-10, 26, -54,  4, 4.5, 9.5, colorHex);
      drawTaperedRay(  4,  8, -26, -38, 4.5, 9.5, colorHex);
      drawTaperedRay( 26, -4,  12, -58, 4.5, 9.5, colorHex);
      ctx.restore();
    };

    // Authentic 4-bracket anime anger vein (💢) with wide center gap so it NEVER closes into a star!
    const drawAngerVein = (bx, by, sc, mainCol, strokeCol) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(sc * bSc * 1.32, sc * bSc * 1.32);
      ctx.rotate(-0.14);
      const arms = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
      for (const a of arms) {
        ctx.save();
        ctx.rotate(a);
        if (strokeCol) {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 12.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(13, 38);
          ctx.quadraticCurveTo(13, 13, 38, 13);
          ctx.stroke();
        }
        ctx.strokeStyle = mainCol;
        ctx.lineWidth = 8.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(13, 38);
        ctx.quadraticCurveTo(13, 13, 38, 13);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };

    const drawSparkle4 = (bx, by, r, col) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(bSc * 1.25, bSc * 1.25);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r * 0.85, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r * 0.85, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawSweatDrop = (bx, by, tilt) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(tilt);
      ctx.scale(bSc * 1.25, bSc * 1.25);
      ctx.fillStyle = '#4FC3F7';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.bezierCurveTo(17, -4, 17, 19, 0, 19);
      ctx.bezierCurveTo(-17, 19, -17, -4, 0, -24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(-4, 4, 3.5, 6.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    if (!this.voiceCompanionStrictMode) {
      if (bId === 'green_rays') {
        drawRayTrio(175, 255, '#26734D');
      } else if (bId === 'yellow_rays') {
        drawRayTrio(175, 255, '#F5B818');
      } else if (bId === 'anger_vein') {
        // Kesal (Row 2 #5 & Row 3 #1): Clean crisp red anger vein on temple
        drawAngerVein(720, 365, 1.0, '#E52521', '#990F0C');
      } else if (bId === 'anger_vein_steam') {
        // Marah (Row 3 #2): Anger vein on temple + two cute dark smoke puff clouds rising above head
        drawAngerVein(720, 365, 1.0, '#E52521', '#990F0C');
        ctx.save();
        ctx.fillStyle = 'rgba(75, 70, 80, 0.88)';
        // Left dark smoke puff
        ctx.beginPath();
        ctx.arc(365, 175, 18, 0, Math.PI * 2);
        ctx.arc(352, 160, 14, 0, Math.PI * 2);
        ctx.arc(380, 162, 13, 0, Math.PI * 2);
        ctx.fill();
        // Right dark smoke puff
        ctx.beginPath();
        ctx.arc(660, 175, 18, 0, Math.PI * 2);
        ctx.arc(646, 160, 14, 0, Math.PI * 2);
        ctx.arc(674, 162, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (bId === 'anger_vein_demon') {
        // Large crisp red-orange 💢 on right temple ONLY (no fake yellow star on cheek!)
        drawAngerVein(735, 410, 1.05, '#FF3B14', '#7A0804');
      } else if (bId === 'sparkles_right') {
        drawSparkle4(840, 380, 26, '#F5B82E');
        drawSparkle4(872, 425, 16, '#F5B82E');
      } else if (bId === 'sparkles_top_right') {
        drawSparkle4(805, 235, 28, '#F9BE25');
        drawSparkle4(845, 290, 18, '#F9BE25');
      } else if (bId === 'sweat_drops' || bId === 'empati_arcs') {
        // Empati (Row 1 #5): Two soft cyan curved emote arcs (( on the left and )) on the right!
        // 100% eliminates the "apple" anomaly and matches master reference 1:1!
        ctx.save();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 6.0;
        ctx.lineCap = 'round';
        // Left arcs ((
        ctx.beginPath();
        ctx.arc(175, 275, 26, Math.PI * 0.65, Math.PI * 1.35, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(150, 275, 24, Math.PI * 0.65, Math.PI * 1.35, false);
        ctx.stroke();
        // Right arcs ))
        ctx.beginPath();
        ctx.arc(845, 275, 26, -Math.PI * 0.35, Math.PI * 0.35, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(870, 275, 24, -Math.PI * 0.35, Math.PI * 0.35, false);
        ctx.stroke();
        ctx.restore();
      } else if (bId === 'exclaim_double') {
        ctx.save();
        ctx.translate(805, 250);
        ctx.rotate(0.24);
        ctx.scale(bSc * 1.28, bSc * 1.28);
        [-15, 15].forEach((ox) => {
          drawTaperedRay(ox, 6, ox, -38, 4.5, 8.8, '#E0201C');
          ctx.fillStyle = '#E0201C';
          ctx.beginPath();
          ctx.arc(ox, 24, 7.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else if (bId === 'question_purple') {
        ctx.save();
        ctx.translate(195, 245);
        ctx.rotate(-0.14);
        ctx.scale(bSc * 1.28, bSc * 1.28);
        ctx.strokeStyle = '#9C59B6';
        ctx.fillStyle = '#9C59B6';
        ctx.lineWidth = 14.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -18, 22, Math.PI * 0.88, Math.PI * 0.16, false);
        ctx.quadraticCurveTo(22, 4, 0, 12);
        ctx.lineTo(0, 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 42, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (bId === 'sleep_zz') {
        ctx.save();
        ctx.translate(775, 215);
        ctx.scale(bSc * 1.25, bSc * 1.25);
        ctx.strokeStyle = '#1B5E3A';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Big Z
        ctx.lineWidth = 12.5;
        ctx.beginPath();
        ctx.moveTo(-18, -28); ctx.lineTo(18, -28); ctx.lineTo(-18, 12); ctx.lineTo(18, 12);
        ctx.stroke();
        // Small z
        ctx.lineWidth = 9.5;
        ctx.beginPath();
        ctx.moveTo(28, -4); ctx.lineTo(52, -4); ctx.lineTo(28, 22); ctx.lineTo(52, 22);
        ctx.stroke();
        ctx.restore();
      } else if (bId === 'scared_shiver') {
        ctx.save();
        ctx.strokeStyle = '#38A8E8';
        ctx.lineWidth = 5.2;
        ctx.lineCap = 'round';
        const shiv = Math.sin(t * 26.0) * 2.8;

        // 3 concentric vibration ripples on left temple/cheek (matching reference 1:1)
        ctx.beginPath();
        ctx.arc(205 + shiv, 410, 48, Math.PI * 0.82, Math.PI * 1.35, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(180 - shiv, 418, 42, Math.PI * 0.82, Math.PI * 1.35, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(156 + shiv, 426, 36, Math.PI * 0.82, Math.PI * 1.35, false);
        ctx.stroke();

        // 3 concentric vibration ripples on right temple/cheek
        ctx.beginPath();
        ctx.arc(819 - shiv, 410, 48, -Math.PI * 0.35, Math.PI * 0.18, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(844 + shiv, 418, 42, -Math.PI * 0.35, Math.PI * 0.18, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(868 - shiv, 426, 36, -Math.PI * 0.35, Math.PI * 0.18, false);
        ctx.stroke();

        // Shivering sweat drops on forehead
        drawSweatDrop(245 + shiv * 0.5, 310, -0.38);
        drawSweatDrop(779 - shiv * 0.5, 310, 0.38);
        ctx.restore();
      }
    }

    this.faceTexture.needsUpdate = true;
  }

  createShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const sCtx = canvas.getContext('2d');

    const grad = sCtx.createRadialGradient(128, 128, 0, 128, 128, 115);
    grad.addColorStop(0, 'rgba(40, 25, 35, 0.75)');
    grad.addColorStop(0.35, 'rgba(60, 40, 50, 0.42)');
    grad.addColorStop(0.70, 'rgba(80, 60, 70, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(128, 128, 115, 0, Math.PI * 2);
    sCtx.fill();

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 1.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.set(0, -0.94, 0.15);
    this.shadowMesh.rotation.x = -Math.PI / 2 + 0.12;
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

    this.accessoryMotionOffset = { rotX: 0, rotY: 0, rotZ: 0, posY: 0 };
    this.setAccessory(this.currentAccessory);
  }

  createHeadsetAccessory() {
    this.headsetGroup = new THREE.Group();
    this.accessoriesGroup.add(this.headsetGroup);

    // High-end Kawaii Studio Over-Ear Headphones
    // Colors: Sleek Royal Indigo (#4338CA), Soft Frost Lilac (#DDD6FE), Brilliant Cyan (#00E5FF), Cream Plush Leather (#FFFDF7)
    const bandMat = new THREE.MeshPhysicalMaterial({
      color: 0x4338CA, // Royal Indigo
      roughness: 0.22,
      metalness: 0.15,
      clearcoat: 0.90,
      clearcoatRoughness: 0.12,
      sheen: 0.60,
      sheenColor: new THREE.Color(0xA78BFA)
    });
    const cushionLeatherMat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFDF7, // Creamy Marshmallow Plush
      roughness: 0.55,
      metalness: 0.05,
      clearcoat: 0.3,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xDDD6FE)
    });
    const metallicChromeMat = new THREE.MeshStandardMaterial({
      color: 0xF1F5F9,
      metalness: 0.92,
      roughness: 0.15
    });
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0x38BDF8, // Glowing Cyan Metallic Rim
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 0.8
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
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0xD97706, // Warm glowing honey amber
      roughness: 0.15,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      sheen: 0.6,
      sheenColor: new THREE.Color(0xFBBF24)
    });
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xF59E0B, // Polished Gold Bridge & Accents
      metalness: 0.90,
      roughness: 0.15,
      clearcoat: 0.8
    });
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xF0F9FF,
      transmission: 0.94,
      opacity: 0.22,
      transparent: true,
      roughness: 0.04,
      depthWrite: false
    });
    const gleamMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    });

    // 1. Chunky Rounded Rims (Left & Right)
    const rimRadius = 0.25;
    const rimTube = 0.020;
    const rimGeo = new THREE.TorusGeometry(rimRadius, rimTube, 16, 48);

    const rimL = new THREE.Mesh(rimGeo, frameMat);
    rimL.position.set(-0.38, 0.08, 1.34);
    rimL.rotation.set(-0.06, -0.14, 0);
    rimL.renderOrder = 2500;
    this.glassesGroup.add(rimL);

    const rimR = new THREE.Mesh(rimGeo, frameMat);
    rimR.position.set(0.38, 0.08, 1.34);
    rimR.rotation.set(-0.06, 0.14, 0);
    rimR.renderOrder = 2500;
    this.glassesGroup.add(rimR);

    // 2. Arched Gold Nose Bridge
    const bridgePoints = [
      new THREE.Vector3(-0.12, 0.08, 1.35),
      new THREE.Vector3( 0.00, 0.12, 1.36),
      new THREE.Vector3( 0.12, 0.08, 1.35)
    ];
    const bridgeCurve = new THREE.CatmullRomCurve3(bridgePoints);
    const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 16, 0.016, 12, false);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, goldMat);
    bridgeMesh.renderOrder = 2501;
    this.glassesGroup.add(bridgeMesh);

    // 3. Transparent Crystal Lenses
    const lensGeo = new THREE.CircleGeometry(rimRadius - 0.015, 32);

    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(-0.38, 0.08, 1.335);
    lensL.rotation.set(-0.06, -0.14, 0);
    lensL.renderOrder = 2500;
    this.glassesGroup.add(lensL);

    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.set(0.38, 0.08, 1.335);
    lensR.rotation.set(-0.06, 0.14, 0);
    lensR.renderOrder = 2500;
    this.glassesGroup.add(lensR);

    // 4. Iconic Anime Glasses Gleam Highlight (Upper-Left on each lens)
    const gleamGeo = new THREE.CapsuleGeometry(0.020, 0.08, 4, 12);

    const gleamL = new THREE.Mesh(gleamGeo, gleamMat);
    gleamL.position.set(-0.46, 0.16, 1.345);
    gleamL.rotation.set(-0.06, -0.14, Math.PI / 4);
    gleamL.renderOrder = 2502;
    this.glassesGroup.add(gleamL);

    const gleamR = new THREE.Mesh(gleamGeo, gleamMat);
    gleamR.position.set(0.30, 0.16, 1.345);
    gleamR.rotation.set(-0.06, 0.14, Math.PI / 4);
    gleamR.renderOrder = 2502;
    this.glassesGroup.add(gleamR);

    // 5. Chic Gold Temple Hinges (Discreet, cute, sits flush at outer rim edges)
    [-1, 1].forEach((side) => {
      const hingeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.045, 16);
      const hinge = new THREE.Mesh(hingeGeo, goldMat);
      hinge.position.set(side * 0.64, 0.08, 1.31);
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

  setAccessory(name) {
    this.currentAccessory = name;
    const isTeacher = (name === 'teacher' || name === 'teach' || name === 'study');
    if (this.headsetGroup) this.headsetGroup.visible = (name === 'headset' || isTeacher);
    if (this.glassesGroup) this.glassesGroup.visible = (name === 'glasses' || isTeacher);
    if (this.pencilGroup) this.pencilGroup.visible = (name === 'pencil');

    if (name !== 'pencil') {
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
    this.isTalking = !!isTalking;
    this.talkDuration = durationSeconds > 0 ? durationSeconds : 0;
  }

  /**
   * Talking layer signal producer. It no longer toggles mesh visibility (that caused the
   * flicker / pop between ω, ᗨ and o shapes). It only computes a smoothed talking state:
   *   this._talk.open  0..1  how wide the mouth opens (live audio RMS or syllable rhythm)
   *   this._talk.round 0..1  A/O/U rounded vowel (1) vs E/I wide vowel (0)
   * updateFaceMorph turns this into continuous mouth shapes on top of the active mood.
   */
  setVowel(v, intensity = 0.8) {
    const vow = (v || '').toUpperCase();
    if (['A', 'I', 'U', 'E', 'O'].includes(vow)) {
      this.currentVowel = vow;
      this.isTalking = true;
      if (!this._talk) this._talk = { open: 0, round: 0 };
      this._talk.open = Math.max(0.12, Math.min(1.0, intensity));
    } else if (vow === 'SIL' || vow === 'SILENCE') {
      this.isTalking = false;
      if (this._talk) this._talk.open = 0;
    }
  }

  playIronmanTransformSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._audioCtx) {
        this._audioCtx = new AudioCtx();
      }
      const ctx = this._audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // 1. Servo Whine / High-tech suit-up glide (2.4kHz -> 4.8kHz)
      const oscServo = ctx.createOscillator();
      const gainServo = ctx.createGain();
      const filterServo = ctx.createBiquadFilter();
      filterServo.type = 'bandpass';
      filterServo.frequency.setValueAtTime(2600, now);
      filterServo.Q.setValueAtTime(3.5, now);

      oscServo.type = 'sine';
      oscServo.frequency.setValueAtTime(2400, now);
      oscServo.frequency.exponentialRampToValueAtTime(4600, now + 0.65);

      gainServo.gain.setValueAtTime(0.001, now);
      gainServo.gain.linearRampToValueAtTime(0.08, now + 0.15);
      gainServo.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      oscServo.connect(filterServo);
      filterServo.connect(gainServo);
      gainServo.connect(ctx.destination);

      oscServo.start(now);
      oscServo.stop(now + 0.8);

      // 2. Resonant Magnetic Power-Up Hum (50Hz -> 140Hz)
      const oscHum = ctx.createOscillator();
      const gainHum = ctx.createGain();
      const filterHum = ctx.createBiquadFilter();
      filterHum.type = 'lowpass';
      filterHum.frequency.setValueAtTime(220, now);

      oscHum.type = 'sawtooth';
      oscHum.frequency.setValueAtTime(50, now);
      oscHum.frequency.exponentialRampToValueAtTime(140, now + 0.70);

      gainHum.gain.setValueAtTime(0.001, now);
      gainHum.gain.linearRampToValueAtTime(0.12, now + 0.25);
      gainHum.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      oscHum.connect(filterHum);
      filterHum.connect(gainHum);
      gainHum.connect(ctx.destination);

      oscHum.start(now);
      oscHum.stop(now + 0.9);

      // 3. Pneumatic Mechanical Latch Click at peak lock (t = 0.72s)
      const lockTime = now + 0.72;
      const oscClick = ctx.createOscillator();
      const gainClick = ctx.createGain();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(120, lockTime);
      oscClick.frequency.exponentialRampToValueAtTime(40, lockTime + 0.08);

      gainClick.gain.setValueAtTime(0.15, lockTime);
      gainClick.gain.exponentialRampToValueAtTime(0.001, lockTime + 0.09);

      oscClick.connect(gainClick);
      gainClick.connect(ctx.destination);

      oscClick.start(lockTime);
      oscClick.stop(lockTime + 0.1);
    } catch (_) {
      // AudioContext not available in current environment
    }
  }

  updateMouthMotion(dt) {
    if (this.talkDuration > 0) {
      this.talkDuration -= dt;
      if (this.talkDuration <= 0) {
        this.isTalking = false;
        this.talkDuration = 0;
      }
    }
    if (!this._talk) this._talk = { open: 0, round: 0 };
    const T = this._talk;

    let targetOpen = 0;
    let targetRound = T.round;
    const hasLiveAnalyser = !!(this.wawaLipsync && this.wawaLipsync.analyser);

    if (this.isTalking && hasLiveAnalyser) {
      this.talkTimer = (this.talkTimer || 0) + dt;
      const viseme = this.wawaLipsync.processAudio();
      const feat = this.wawaLipsync.features;
      const vol = feat ? Math.max(0, Math.min(1, feat.volume * 1.9)) : 0;
      if (viseme === VISEMES.aa) { targetOpen = 0.55 + vol * 0.45; targetRound = 0.55; this.currentVowel = 'A'; }
      else if (viseme === VISEMES.O) { targetOpen = 0.50 + vol * 0.45; targetRound = 1.0; this.currentVowel = 'O'; }
      else if (viseme === VISEMES.U) { targetOpen = 0.35 + vol * 0.30; targetRound = 1.0; this.currentVowel = 'U'; }
      else if (viseme === VISEMES.CH || viseme === VISEMES.RR || viseme === VISEMES.SS || viseme === VISEMES.FF) {
        targetOpen = 0.35 + vol * 0.30; targetRound = 0.1; this.currentVowel = 'I';
      }
      else if (viseme === VISEMES.E) { targetOpen = 0.45 + vol * 0.40; targetRound = 0.0; this.currentVowel = 'E'; }
      else if (viseme === VISEMES.I) { targetOpen = 0.35 + vol * 0.35; targetRound = 0.0; this.currentVowel = 'I'; }
      else if (viseme === VISEMES.DD || viseme === VISEMES.kk || viseme === VISEMES.nn) {
        targetOpen = 0.28 + vol * 0.25; targetRound = 0.2; this.currentVowel = 'E';
      }
      else if (viseme === VISEMES.PP || viseme === VISEMES.sil) { targetOpen = 0.0; this.currentVowel = 'sil'; }
      else { targetOpen = 0.20 + vol * 0.25; this.currentVowel = 'A'; }
    } else if (this.isTalking) {
      // Natural speech rhythm with alternating vowels A, I, U, E, O matching live storyboard
      this.talkTimer = (this.talkTimer || 0) + dt;
      const t = this.talkTimer;
      const wave = Math.sin(t * 14.0) * 0.55 + Math.sin(t * 22.0) * 0.25 + 0.20;
      targetOpen = Math.max(0, Math.min(1, wave));
      targetRound = Math.sin(t * 3.1) > 0.2 ? 1.0 : 0.0;
      const vowels = ['A', 'I', 'U', 'E', 'O'];
      this.currentVowel = vowels[Math.floor(t * 4.2) % 5];
    } else {
      this.talkTimer = 0;
    }

    // Asymmetric smoothing: jaws open fast (attack ~45 ms) and relax softer (release ~90 ms)
    const kOpen = targetOpen > T.open ? 22 : 11;
    T.open += (targetOpen - T.open) * Math.min(1, dt * kOpen);
    T.round += (targetRound - T.round) * Math.min(1, dt * 12);
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

  /**
   * Procedural Iron Man Suit-Up / Repulsor Power-Up Sound Synthesizer (Web Audio API)
   * 1. Sub-bass energy buildup & rising repulsor hum (75Hz -> 540Hz)
   * 2. High-frequency plasma hiss / repulsor shimmer
   * 3. Crisp mechanical armor lock click at t = 0.62s
   */
  setMood(m, opts) {
    const cMood = this.canonMood(m);
    const wasPout = (this.canonicalMood === 'pout');
    this.canonicalMood = cMood;
    this.mood = m; // preserve the public string for backward compatibility (tests, companions)
    if (opts && opts.immediate) {
      this._snapNextMorph = true;
      this._snapPaws = true;
    }

    this.updateFaceVisibility();
    if (wasPout !== (cMood === 'pout')) this.updateSkinBlush();
    if (!(opts && opts.immediate)) {
      this.triggerJiggle(0.18);
    }

    // Dynamic hand emergence + body acting matching reference storyboard!
    // In the reference storyboard, ONLY Empati ('pout') displays the 2 cute front paws on the lower cheeks;
    // practice sessions that want cheering/waving call triggerHandGesture() explicitly after setMood().
    if (cMood === 'pout') {
      this.triggerHandGesture('pout', 999);
      if (!(opts && opts.immediate)) {
        this.squish.x = 1.12;
        this.squish.z = 1.10;
        this.squish.y = 0.95;
        this.triggerJiggle(0.22);
      }
    } else if (cMood === 'furious' || cMood === 'angry') {
      this.retractHands();
      if (!(opts && opts.immediate)) {
        this.squish.x = 1.14;
        this.squish.y = 0.88;
        this.squish.z = 1.12;
        this.triggerJiggle(0.28);
              }
    } else if (cMood === 'firm' || cMood === 'annoyed') {
      this.retractHands();
      if (!(opts && opts.immediate)) {
        this.squish.x = 1.12;
        this.squish.y = 0.92;
        this.squish.z = 1.06;
        this.triggerJiggle(0.20);
      }
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

    // 1. Organic Multi-Frequency Floating & Velocity Calculation
    this.floatPos.prevY = this.floatPos.y;
    const baseFloat = Math.sin(this.time * 2.2) * 0.12 + Math.sin(this.time * 4.4) * 0.02 + Math.sin(this.time * 0.8) * 0.01;
    let hopOffset = 0;
    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
      const progress = 1 - Math.max(0, this.hopTimer / 0.65);
      hopOffset = Math.sin(progress * Math.PI) * Math.min(this.hopHeight || 0.30, 0.28);
    }
    this.floatPos.y = baseFloat + hopOffset;
    this.floatPos.velY = (this.floatPos.y - this.floatPos.prevY) / Math.max(dt, 0.001);
    this.mochiGroup.position.y = this.floatPos.y;

    const moodLiftY = (this._rig && this._rig.headLift) || 0;
    const moodTiltZ = (this._rig && this._rig.headTilt) || 0;

    // Shadow reacts to float height and width squish
    if (this.shadowMesh) {
      const shadowScale = Math.max(0.68, 1.0 - (this.floatPos.y + moodLiftY) * 0.40);
      this.shadowMesh.scale.set(shadowScale * this.squish.x, shadowScale * this.squish.z, 1);
      this.shadowMesh.material.opacity = Math.max(0.35, 0.72 - (this.floatPos.y + moodLiftY) * 0.5);
    }

    // 2. Buttery 3D Rotational Damping
    this.currentRot.x += (this.targetRot.x - this.currentRot.x) * 0.12;
    this.currentRot.y += (this.targetRot.y - this.currentRot.y) * 0.12;

    this.updateAccessoriesMotion(dt);

    const hasAccessoryMotion = (this.currentAccessory === 'headset' || this.currentAccessory === 'pencil');
    const ambientSway = hasAccessoryMotion ? 0 : Math.sin(this.time * 1.8) * 0.035;
    const accRotX = (this.accessoryMotionOffset && this.accessoryMotionOffset.rotX) || 0;
    const accRotY = (this.accessoryMotionOffset && this.accessoryMotionOffset.rotY) || 0;
    const accRotZ = (this.accessoryMotionOffset && this.accessoryMotionOffset.rotZ) || 0;
    const accPosY = (this.accessoryMotionOffset && this.accessoryMotionOffset.posY) || 0;

    this.mochiGroup.rotation.x = this.currentRot.x + accRotX;
    this.mochiGroup.rotation.y = this.currentRot.y + ambientSway + accRotY;
    this.mochiGroup.rotation.z = -this.currentRot.y * 0.15 + accRotZ + moodTiltZ;
    this.mochiGroup.position.y = this.floatPos.y + accPosY + moodLiftY;

    // 3. Disney 90° Phase Inertia + Damped Harmonic Jiggle
    const inertialPhase = Math.sin(this.time * 2.2 + Math.PI * 0.5) * 0.045;

    // Viscoelastic Jiggle Decay
    let jiggleOffset = 0;
    if (this.squish.jiggleAmp > 0.002) {
      this.squish.jiggleAmp = Math.min(this.squish.jiggleAmp, 1.0);
      this.squish.jiggleTimer += Math.max(0, dt) * 26;
      jiggleOffset = Math.sin(this.squish.jiggleTimer) * Math.min(this.squish.jiggleAmp, 0.35);
      this.squish.jiggleAmp *= Math.pow(0.86, Math.max(0, dt) * 60); // Damped decay
    }

    const baseTargetX = 1.0;
    const baseTargetY = 1.0;
    const baseTargetZ = 1.0;

    this.squish.targetY = baseTargetY + inertialPhase + jiggleOffset;
    this.squish.targetX = baseTargetX - (inertialPhase + jiggleOffset) * 0.75;
    this.squish.targetZ = baseTargetZ - (inertialPhase + jiggleOffset) * 0.75;

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
    if (this.outlineMesh) this.outlineMesh.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // Face, Tail & Accessories scale seamlessly with body squish & stretch
    this.faceGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.tailGroup) this.tailGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);
    if (this.accessoriesGroup) this.accessoriesGroup.scale.set(this.squish.x, this.squish.y, this.squish.z);

    // Fox Ears & Cat Tail kinematics and expressive reaction
    this.updateEarsAndTail(dt);

    // Dynamic Mouth Motion (Talking articulation & subtle micro-breathing)
    this.updateMouthMotion(dt);

    // 15-Expression GoPrep-Spring Morphing Engine + 3D Mesh/Shader/Horn Synchronization
    this.updateFaceMorph(dt);

    // Iron Man Suit-Up Mechanical Deployment (Smooth sliding & scaling with momentum)
    const demonFactor = (this._rig && this._rig.demon) ? Math.max(0, Math.min(1, this._rig.demon)) : 0;
    const earVisScale = Math.max(0.001, 1.0 - Math.pow(demonFactor, 0.75));
    const hornVisScale = Math.max(0.001, Math.pow(demonFactor, 0.68));
    if (this.earsGroup) {
      this.earsGroup.scale.set(this.squish.x * earVisScale, this.squish.y * earVisScale, this.squish.z * earVisScale);
      // Ears smoothly sink down into the head plating
      this.earsGroup.position.y = -0.22 * (1.0 - earVisScale);
    }
    if (this.hornsGroup) {
      this.hornsGroup.scale.set(this.squish.x * hornVisScale, this.squish.y * hornVisScale, this.squish.z * hornVisScale);
      // Horns smoothly slide up out of the head with mechanical spring lock
      this.hornsGroup.position.y = -0.32 * (1.0 - hornVisScale);
    }

    // Real-time 3D WebGL GLSL Anime Inferno & Volcanic Smoke + Swirling 3D Embers
    this.updateInferno(dt);

    // 4. Heart eyes gentle pulse (Frame 11)
    if (this.mood === 'hearts') {
      const heartPulse = 1.45 + Math.sin(this.time * 6.5) * 0.12;
      this.eyeHeartL.scale.set(heartPulse, heartPulse, heartPulse);
      this.eyeHeartR.scale.set(heartPulse, heartPulse, heartPulse);
    }

    // 4b. Toddler Pout quiver is now handled continuously inside updateFaceMorph.

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
      // Blink is applied by updateFaceMorph as a multiplier so it never fights the mood shapes.
      this._blinkScale = bScale;
    } else {
      this._blinkScale = 1.0;
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
  updatePaws(dt) {
    if (!this.handL || !this.handR) return;
    dt = Math.min(dt, 1 / 30);

    if (this.handTimer > 0) {
      this.handTimer -= dt;
      if (this.handTimer <= 0) this.handState = 'hidden';
    }
    this.handGestureTime = (this.handGestureTime || 0) + dt;

    if (!this.pawSim) {
      const mk = (side) => ({
        pos: new THREE.Vector3(side * 1.35, -0.1, 0.3), vel: new THREE.Vector3(),
        rot: new THREE.Vector3(), rotVel: new THREE.Vector3(),
        s: 0, sVel: 0
      });
      this.pawSim = { L: mk(-1), R: mk(1) };
    }

    const t = this.time;
    const st = this.handState;
    const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const bump = (x, at, w) => { const d = (x - at) / w; return Math.abs(d) < 1 ? Math.cos(d * Math.PI * 0.5) ** 2 : 0; };

    const pose = (side) => {
      const lead = side === 1;
      const syncBoth = (st === 'pout' || st === 'sulk' || st === 'sad');
      const g = this.handGestureTime - (lead || syncBoth ? 0 : 0.16);
      const bob = Math.sin(t * 2.5 + (lead ? 1.6 : 0)) * 0.03;
      const P = { x: side * 1.35, y: -0.1, z: 0.3, rx: 0, ry: 0, rz: 0, s: 0 };
      if (g < 0 && st !== 'hidden') { P.s = 0; return P; }

      if (st === 'cheer') {
        if (lead) {
          // RIGHT PAW: Raised high with joy
          const hop = (bump(g, 0.55, 0.16) + bump(g, 0.95, 0.16)) * 0.10;
          const wig = Math.sin(t * 11.0) * 0.14;
          P.x = 1.54; P.y = 0.72 + hop + bob * 0.5; P.z = 0.65;
          P.rx = -0.05; P.ry = -0.10; P.rz = -0.22 + wig;
          P.s = 1.0;
        } else {
          // LEFT PAW: Resting gently down at the side
          P.x = -1.54; P.y = -0.12 + bob; P.z = 0.60;
          P.rx = 0.10; P.ry = 0.40; P.rz = 0.32;
          P.s = 0.92;
        }
      } else if (st === 'pout' || st === 'sulk' || st === 'sad') {
        // EXACT POSITIONING MATCHING ref-empati-zoom.png:
        // Two cute chubby paws resting under the cheeks, framing the chin with a clear gap in the middle!
        const breath = Math.sin(t * 3.2) * 0.010;
        if (lead) { // Right paw (side = 1)
          P.x = 0.34; P.y = -0.34 + breath; P.z = 1.15;
          P.rx = 0.22; P.ry = -0.20; P.rz = -0.22;
          P.s = 1.0;
        } else { // Left paw (side = -1)
          P.x = -0.34; P.y = -0.34 + breath; P.z = 1.15;
          P.rx = 0.22; P.ry = 0.20; P.rz = 0.22;
          P.s = 1.0;
        }
      } else if (st === 'wave') {
        if (lead) {
          // RIGHT PAW: Playful cute cat wave
          const w = Math.sin(t * 9.0) * 0.28;
          P.x = 1.54; P.y = 0.40 + bob * 0.5; P.z = 0.62;
          P.rx = 0.0; P.ry = -0.08; P.rz = -0.16 + w;
          P.s = 1.0;
        } else {
          P.s = 0.0;
        }
      } else if (this.currentAccessory === 'pencil') {
        if (lead) {
          // RIGHT PAW: Holding pencil, gentle study bobbing
          const wave = Math.sin(t * 1.8);
          P.x = 1.42;
          P.y = -0.06 + wave * 0.035;
          P.z = 0.78;
          P.rx = -0.12;
          P.ry = -0.20;
          P.rz = -0.32 + wave * 0.06;
          P.s = 1.0;
        } else {
          P.s = 0.0;
        }
      }
      return P;
    };

    const spring = (x, v, target, k, zeta) => {
      const cdamp = 2 * zeta * Math.sqrt(k);
      v += (-(x - target) * k - v * cdamp) * dt;
      return [x + v * dt, v];
    };

    const snapNow = !!this._snapPaws;
    this._snapPaws = false;

    const drive = (hand, S, side) => {
      const P = pose(side);
      const axes = ['x', 'y', 'z'];
      if (snapNow) {
        for (const a of axes) {
          S.pos[a] = P[a]; S.vel[a] = 0;
          S.rot[a] = P['r' + a]; S.rotVel[a] = 0;
        }
        S.s = P.s; S.sVel = 0;
      } else {
        for (const a of axes) {
          [S.pos[a], S.vel[a]] = spring(S.pos[a], S.vel[a], P[a], 160, 0.56);
          [S.rot[a], S.rotVel[a]] = spring(S.rot[a], S.rotVel[a], P['r' + a], 130, 0.62);
        }
        [S.s, S.sVel] = spring(S.s, S.sVel, P.s, 180, 0.58);
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
      hand.userData.core.scale.set(inv, stretch, inv);
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
      let targetZ_L = Math.PI * 0.14; // natural outward angle matching storyboard
      let targetZ_R = -Math.PI * 0.14;
      let targetX = -0.04; // natural upright perky posture
      let targetY_L = -0.05;
      let targetY_R = 0.05;

      let tipFlexTargetL = 0;
      let tipFlexTargetR = 0;
      const cm = this.canonicalMood || this.canonMood(this.mood);

      // STRICT EAR UNIFORMITY INVARIANT (Mandated by user):
      // All expressions MUST share 100% identical ear geometry, angle, posture, and color!
      // ONLY furious / demon state switches to horns!
      const demonW = (this._rig && this._rig.demon !== undefined) ? this._rig.demon : (cm === 'furious' ? 1.0 : 0.0);
      if (this.earsGroup) this.earsGroup.visible = (demonW < 0.98);
      if (this.hornsGroup) this.hornsGroup.visible = (demonW > 0.02);
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

      targetZ_L += inertialLagZ;
      targetZ_R -= inertialLagZ;
      targetX = Math.max(-0.12, Math.min(0.04, targetX + inertialLagX));
      tipFlexTargetL += inertialTip;
      tipFlexTargetR += inertialTip;

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
