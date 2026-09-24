// FIEZEL · Film "Satu Kelas, Dua Layar" — dunia 3D.
//
// Tata ruang (satuan meter, lantai y = 0):
//   · 32 slate murid melayang di setinggi meja: 4 kolom × 8 baris, menghadap GURU (−z).
//   · Monolit KelasKu untuk Guru di z = −8,6, menghadap kelas (+z).
//   · Mulai detik 26 dasbor guru "membuka diri" menjadi amfiteater panel melengkung
//     mengelilingi depan kelas (dua tingkat × delapan kolom), monolit di tengahnya.
//   · Benang cahaya menghubungkan puncak monolit ke tiap slate — kapsul data berjalan di
//     atasnya ke dua arah. Itu inti ceritanya: dua layar, satu kelas, terhubung.
//
// Tata bahasa kamera film: melihat ke +z dari sisi monolit = mata GURU (wajah slate terlihat);
// melihat ke −z dari antara murid = mata MURID (punggung slate, monolit di kejauhan).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PANELS, G, SCALE, CLASS_NAMES, ST, TG } from './ui.js';
import { mulberry32 } from './lib.js';

export const MONO_POS = new THREE.Vector3(0, 2.2, -8.6);
export const HUB = new THREE.Vector3(0, 4.42, -8.42);          // titik berangkat benang (puncak monolit)
export const COLS = 4, ROWS = 8;
export const gridPos = (i) => new THREE.Vector3((i % COLS - 1.5) * 1.25, 1.02, (Math.floor(i / COLS) - 3.5) * 1.15);

// Amfiteater dasbor: pusat lengkung & slot panel.
export const ARC_C = new THREE.Vector3(0, 0, -2.3), ARC_R = 6.3;
export const ARC_ANG = [-68, -51, -34, -17, 17, 34, 51, 68];
export const TIER_Y = [1.45, 3.75];
// Nama panel per slot [tingkat][kolom] — urutan kiri → kanan (dilihat dari kelas).
export const WALL = [
  ['absen', 'kelompok', 'sapa', 'ringkasan', 'hasil', 'heatmap', 'remedial', 'rekap'],
  ['jurnal', 'pengumuman', 'kartusapa', 'miskonsepsi', 'ortu', 'kurikulum', 'braincore', 'tugas'],
];
export function slotPose(tier, col) {
  const a = THREE.MathUtils.degToRad(ARC_ANG[col]);
  const pos = new THREE.Vector3(ARC_C.x + ARC_R * Math.sin(a), TIER_Y[tier], ARC_C.z - ARC_R * Math.cos(a));
  const yaw = -a;                                  // muka panel menghadap pusat lengkung
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tier === 1 ? 0.1 : -0.02, yaw, 0, 'YXZ'));
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  return { pos, q, normal };
}
export function wallSlotOf(name) {
  for (let r = 0; r < 2; r++) { const c = WALL[r].indexOf(name); if (c >= 0) return [r, c]; }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Panel = badan porselen/kaca bersudut bulat + muka kanvas.
export class Panel {
  constructor(name, widthM, opt = {}) {
    const P = typeof name === 'string' ? PANELS[name] : name;
    this.name = typeof name === 'string' ? name : opt.name; this.P = P;
    const sc = P.scale || SCALE;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(P.w * sc); this.canvas.height = Math.round(P.h * sc);
    this.ctx = this.canvas.getContext('2d'); this.sc = sc;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.generateMipmaps = true;
    this.w = widthM; this.h = widthM * P.h / P.w;
    const depth = opt.depth ?? 0.045, rad = Math.min(opt.radius ?? 0.05, this.w * 0.1);
    this.group = new THREE.Group(); this.group.name = 'panel:' + this.name;
    this.inner = new THREE.Group(); this.group.add(this.inner);          // untuk flip/lipat lokal
    this.bodyMat = opt.bodyMat || new THREE.MeshPhysicalMaterial({ color: opt.body || '#F7F3EA', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    this.body = new THREE.Mesh(new RoundedBoxGeometry(this.w, this.h, depth, 3, rad), this.bodyMat);
    this.body.castShadow = true; this.body.receiveShadow = true;
    this.faceMat = new THREE.MeshStandardMaterial({ map: this.tex, emissiveMap: this.tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: opt.glow ?? 0.32, roughness: 0.58, metalness: 0, alphaTest: 0.5, transparent: false });
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(this.w, this.h), this.faceMat);
    this.face.position.z = depth / 2 + 0.0012; this.face.receiveShadow = true;
    this.inner.add(this.body, this.face);
    if (opt.back) {                                                      // muka belakang (flip)
      this.back = opt.back; this.back.group.rotation.y = Math.PI; this.back.group.position.z = -0.0001;
      this.back.body.visible = false; this.back.face.position.z = depth / 2 + 0.0012;
      this.inner.add(this.back.group);
    }
    this.key = null; this.group.visible = false;
  }
  draw(state = {}) {
    const k = JSON.stringify(state); if (k === this.key) return; this.key = k;
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.sc, 0, 0, this.sc, 0, 0); this.P.draw(new G(c), state); this.tex.needsUpdate = true;
  }
  set glow(v) { this.faceMat.emissiveIntensity = v; }
}

// ---------------------------------------------------------------------------------------------
// Benang cahaya: pita yang selalu menghadap kamera, dihitung di vertex shader dari 4 titik
// kurva Bezier (tanpa membangun ulang geometri tiap frame).
const THREAD_VS = `
uniform vec3 p0; uniform vec3 p1; uniform vec3 p2; uniform vec3 p3; uniform float uWidth;
attribute float side; varying float vU; varying float vDepth;
vec3 bez(float t){ float s=1.0-t; return s*s*s*p0 + 3.0*s*s*t*p1 + 3.0*s*t*t*p2 + t*t*t*p3; }
vec3 dbez(float t){ float s=1.0-t; return 3.0*s*s*(p1-p0) + 6.0*s*t*(p2-p1) + 3.0*t*t*(p3-p2); }
void main(){
  float t = uv.x; vU = t;
  vec4 mv = modelViewMatrix * vec4(bez(t), 1.0);
  vec3 tg = normalize((modelViewMatrix * vec4(dbez(t), 0.0)).xyz);
  vec3 sd = normalize(cross(tg, normalize(-mv.xyz)));
  float w = uWidth * (0.6 + 0.4 * sin(3.14159 * t));
  mv.xyz += sd * side * w;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const THREAD_FS = `
uniform float uReveal; uniform float uStart; uniform float uIntensity; uniform float uTime; uniform float uFlow;
uniform vec3 uColA; uniform vec3 uColB; varying float vU; varying float vDepth;
void main(){
  if (vU > uReveal || vU < uStart) discard;
  vec3 c = mix(uColA, uColB, smoothstep(0.0, 1.0, vU));
  float pulse = pow(0.5 + 0.5 * sin((vU * 9.0 - uTime * uFlow) * 6.2831853), 8.0);
  float head = smoothstep(uReveal - 0.05, uReveal, vU) * step(uReveal, 0.995);
  float I = uIntensity * (0.55 + 1.4 * pulse) + head * 3.0 * uIntensity;
  float near = smoothstep(1.4, 4.5, vDepth);
  gl_FragColor = vec4(c * (0.35 + I), clamp(I * 0.85, 0.0, 1.0) * near);
}`;
export class Thread {
  constructor(seg = 72) {
    const g = new THREE.BufferGeometry(); const pos = [], uv = [], side = [], idx = [];
    for (let i = 0; i <= seg; i++) { const u = i / seg; for (const s of [-1, 1]) { pos.push(0, 0, 0); uv.push(u, 0); side.push(s); } }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1)); g.setIndex(idx);
    this.u = { p0: { value: new THREE.Vector3() }, p1: { value: new THREE.Vector3() }, p2: { value: new THREE.Vector3() }, p3: { value: new THREE.Vector3() },
      uWidth: { value: 0.011 }, uReveal: { value: 0 }, uStart: { value: 0 }, uIntensity: { value: 1 }, uTime: { value: 0 }, uFlow: { value: 0.6 },
      uColA: { value: new THREE.Color('#1FA07A') }, uColB: { value: new THREE.Color('#F2B227') } };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: THREAD_VS, fragmentShader: THREAD_FS, transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.curve = new THREE.CubicBezierCurve3(this.u.p0.value, this.u.p1.value, this.u.p2.value, this.u.p3.value);
  }
  set(a, b, lift = 1.0) {
    const d = new THREE.Vector3().subVectors(b, a);
    this.u.p0.value.copy(a); this.u.p3.value.copy(b);
    this.u.p1.value.copy(a).addScaledVector(d, 0.3); this.u.p1.value.y += 1.6 * lift;
    this.u.p2.value.copy(b).addScaledVector(d, -0.25); this.u.p2.value.y += 1.9 * lift;
  }
  at(u, out = new THREE.Vector3()) { return this.curve.getPoint(u, out); }
}

// ---------------------------------------------------------------------------------------------
// Slate murid: plakat porselen melayang + bingkai cahaya status di belakangnya.
export class Slate {
  constructor(i, porcelain) {
    this.i = i; this.name = CLASS_NAMES[i];
    this.panel = new Panel('slate', 0.72, { depth: 0.05, radius: 0.06, bodyMat: porcelain, glow: 0.9 });
    this.group = this.panel.group; this.group.visible = true;
    this.rimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#F0C241') });
    this.rim = new THREE.Mesh(new RoundedBoxGeometry(0.765, 1.005, 0.034, 3, 0.075), this.rimMat);
    this.rim.position.z = 0; this.panel.inner.add(this.rim);
    this.home = gridPos(i); this.pos = this.home.clone();
    this.panel.draw({ name: this.name, mode: 'idle', v: 0.35 + 0.5 * mulberry32(i + 7)() });
  }
  state(s) { this.panel.draw(Object.assign({ name: this.name }, s)); }
}

// ---------------------------------------------------------------------------------------------
// Tekstur lantai: semen poles hangat (noda halus + bintik), dibuat berseed.
function floorTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
  const r = mulberry32(3104);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { const px = r() * 1024, py = r() * 1024, rad = 30 + r() * 160; const g = x.createRadialGradient(px, py, 0, px, py, rad); const v = 118 + r() * 20; g.addColorStop(0, `rgba(${v},${v},${v},${0.10 + r() * 0.10})`); g.addColorStop(1, 'rgba(128,128,128,0)'); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 9000; i++) { const v = r() < 0.5 ? 100 : 160; x.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.12})`; const s = 0.6 + r() * 1.6; x.fillRect(r() * 1024, r() * 1024, s, s); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.anisotropy = 8; return t;
}

// Kapsul data: pil kecil bercahaya yang berjalan di benang.
function capsuleGeo() { return new RoundedBoxGeometry(0.16, 0.07, 0.07, 3, 0.034); }

// ---------------------------------------------------------------------------------------------
export function buildWorld(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#120C0F');
  scene.fog = new THREE.Fog('#120C0F', 16, 46);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.05, 120);

  // Cahaya
  const sun = new THREE.DirectionalLight('#FFE9CF', 0);
  sun.position.set(-6.5, 11.5, 5.5); sun.target.position.set(0, 0, -2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 }); sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#FFF6EA', '#D8C6AD', 0.06); scene.add(hemi);
  const kk = new THREE.PointLight('#2FBF93', 0, 14, 1.6); kk.position.set(0, 3.2, -7.4); scene.add(kk);   // limpahan emerald KelasKu
  const night = new THREE.PointLight('#FFD9A8', 0.0, 18, 1.4); night.position.set(0, 5.5, -1); scene.add(night);
  // Lampu isi "softbox" yang ikut kamera: panel UI selalu terbaca bersih dari sudut mana pun.
  const camFill = new THREE.DirectionalLight('#FFF7EC', 0.0); scene.add(camFill, camFill.target);

  // Lantai
  const floorMat = new THREE.MeshStandardMaterial({ color: '#1B1418', roughness: 0.46, metalness: 0, roughnessMap: null, map: floorTexture() });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // Kolonade: pilar ramping setinggi 16 m di lingkar jauh — skala "aula megah", pudar oleh kabut.
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#E9DDCB', roughness: 0.7 });
  const pillarGeo = new RoundedBoxGeometry(0.55, 16, 0.55, 2, 0.08);
  const pillars = [];
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2; const R = 21 + (k % 2) * 1.2;
    const m = new THREE.Mesh(pillarGeo, pillarMat); m.position.set(Math.sin(a) * R, 8, -3 + Math.cos(a) * R * 1.15);
    m.castShadow = true; m.receiveShadow = true; scene.add(m); pillars.push(m);
  }
  // Genangan cahaya hangat di bawah tiap slate (malam): cakram aditif, bukan lampu (murah).
  const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color('#FFC98A'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const poolGeo = new THREE.PlaneGeometry(1.9, 1.9);

  // Monolit guru
  const inkMat = new THREE.MeshPhysicalMaterial({ color: '#12211F', roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const monolith = new Panel('monolith', 2.6, { depth: 0.22, radius: 0.12, bodyMat: inkMat, glow: 0.55 });
  monolith.group.position.copy(MONO_POS); monolith.draw({ active: 0, saved: 0 }); scene.add(monolith.group);
  // alas monolit (cincin emerald tipis di lantai)
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.56, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#2FBF93').multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.004, -8.6); scene.add(ring);
  // berkas cahaya kelahiran monolit
  const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color('#2FBF93') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uI; uniform vec3 uC; varying vec2 vUv; void main(){ float e = pow(1.0-abs(vUv.x-0.5)*2.0, 3.0) * smoothstep(1.0,0.0,vUv.y) ; gl_FragColor = vec4(uC*uI*e, 1.0); }' });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 9, 48, 1, true), beamMat);
  beam.position.set(0, 4.5, -8.6); beam.visible = false; scene.add(beam);

  // Slate murid
  const porcelain = new THREE.MeshPhysicalMaterial({ color: '#FFFBF3', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.2 });
  const slates = []; for (let i = 0; i < 32; i++) {
    const s = new Slate(i, porcelain); scene.add(s.group); slates.push(s);
    s.pool = new THREE.Mesh(poolGeo, poolMat); s.pool.rotation.x = -Math.PI / 2; s.pool.position.set(s.home.x, 0.006, s.home.z - 0.25); s.pool.renderOrder = 2; scene.add(s.pool);
  }

  // Benang + kapsul
  const threads = []; for (let i = 0; i < 32; i++) { const th = new Thread(); scene.add(th.mesh); threads.push(th); }
  const capMatG = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFD25A').multiplyScalar(3.2) });
  const capMatE = new THREE.MeshBasicMaterial({ color: new THREE.Color('#38D6A4').multiplyScalar(2.6) });
  const capGeo = capsuleGeo(); const capsules = [];
  for (let i = 0; i < 72; i++) { const m = new THREE.Mesh(capGeo, capMatG); m.visible = false; m.renderOrder = 6; scene.add(m); capsules.push(m); }

  // Panel pahlawan & dinding: dibuat malas (hanya saat dipakai) supaya memori SwiftShader aman.
  const panels = {};
  function panel(name, widthM = 1.5, opt = {}) {
    const key = opt.key || name;
    if (!panels[key]) {
      const isStudent = ['gabung', 'kerjakan', 'soal', 'selesai', 'muridhome'].includes(name);
      panels[key] = new Panel(name, widthM, Object.assign({ body: isStudent ? '#FFFFFF' : (name === 'ortu' ? '#FBF9F4' : name === 'rekap' ? '#FFFFFF' : '#F7F3EA') }, opt));
      scene.add(panels[key].group);
    }
    return panels[key];
  }
  // Panel soal-berbalik (kerjakan ↔ soal) dan kartu kecil untuk kipas soal.
  const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE7A6').multiplyScalar(6) }));
  orbCore.visible = false; scene.add(orbCore);

  return { camFill, pillars, pillarMat, poolMat, scene, camera, sun, hemi, kk, night, floor, floorMat, monolith, ring, beam, beamMat, slates, threads, capsules, capMatG, capMatE, panels, panel, orbCore, porcelain, inkMat };
}
