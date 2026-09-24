// FIEZEL · Film "Satu Kelas, Dua Layar" — pipa render.
//
// Satu frame = N sub-sampel. Tiap sub-sampel memajukan waktu di dalam rana 180° (motion blur
// asli), menggeser piksel dengan jitter Halton (anti-alias), dan menggeser lensa di cakram
// Vogel lalu membidik ulang ke bidang fokus (DOF lensa tipis). Hasilnya dirata-rata di target
// HalfFloat linear, lalu: bloom lembut → eksposur → tone map netral (PBR Neutral) → lift/gain →
// vinyet → grain berbobot luminans → dither. Lapisan MEREK (splash resmi, lockup) digabung
// SESUDAH tone map supaya warna resminya keluar persis.

import * as THREE from 'three';
import { halton, vogel, W, H } from './lib.js';

const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

function quad(frag, uniforms, extra = {}) {
  const m = new THREE.ShaderMaterial(Object.assign({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false }, extra));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); mesh.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(mesh); return { m, sc };
}

const ACC_FS = `uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb * uW, 1.0); }`;
const BRIGHT_FS = `uniform sampler2D tSrc; uniform float uTh; uniform vec2 uTx; varying vec2 vUv;
void main(){ vec3 c = vec3(0.0);
  for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) c += texture2D(tSrc, vUv + vec2(float(i),float(j))*uTx).rgb;
  c /= 9.0; float l = max(max(c.r,c.g),c.b); float k = smoothstep(uTh, uTh*2.2, l); gl_FragColor = vec4(c*k, 1.0); }`;
const BLUR_FS = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
  c += texture2D(tSrc, vUv + uDir*1.3846153846).rgb * 0.3162162162; c += texture2D(tSrc, vUv - uDir*1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv + uDir*3.2307692308).rgb * 0.0702702703; c += texture2D(tSrc, vUv - uDir*3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0); }`;
const FINAL_FS = `
uniform sampler2D tAcc; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform sampler2D tBrand;
uniform float uExposure; uniform float uBloom; uniform float uVig; uniform float uGrain; uniform float uSeed; uniform float uBrand; uniform float uScene;
uniform vec3 uLift; uniform vec3 uGain; uniform float uCA; uniform vec3 uBlack;
varying vec2 vUv;
vec3 pbrNeutral(vec3 color){
  const float startCompression = 0.8 - 0.04; const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b)); float offset = x < 0.08 ? x - 6.25 * x * x : 0.04; color -= offset;
  float peak = max(color.r, max(color.g, color.b)); if (peak < startCompression) return color;
  const float d = 1.0 - startCompression; float newPeak = 1.0 - d * d / (peak + d - startCompression); color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0); return mix(color, newPeak * vec3(1.0), g); }
vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
void main(){
  vec2 d = vUv - 0.5;
  vec3 c;
  c.r = texture2D(tAcc, vUv - d * uCA).r; c.g = texture2D(tAcc, vUv).g; c.b = texture2D(tAcc, vUv + d * uCA).b;
  vec3 bl = texture2D(tB1, vUv).rgb * 0.5 + texture2D(tB2, vUv).rgb * 0.8 + texture2D(tB3, vUv).rgb * 1.1;
  c += bl * uBloom;
  c *= uExposure;
  c = pbrNeutral(c);
  c = uLift + c * (uGain - uLift);
  float v = 1.0 - uVig * dot(d * vec2(1.0, 1.35), d * vec2(1.0, 1.35)) * 2.2; c *= clamp(v, 0.0, 1.0);
  vec3 s = toSRGB(c) * uScene + uBlack * (1.0 - uScene);
  float lum = dot(s, vec3(0.299, 0.587, 0.114));
  float n = hash(vUv * vec2(1080.0, 1920.0) + uSeed) - 0.5;
  s += n * uGrain * (1.0 - lum * 0.7);
  vec4 b = texture2D(tBrand, vUv);                        // lapisan merek: premultiplied sRGB
  s = s * (1.0 - b.a * uBrand) + b.rgb * uBrand;
  s += (hash(vUv * 1733.0 + uSeed * 0.37) - 0.5) / 255.0;  // dither
  gl_FragColor = vec4(s, 1.0);
}`;

export class Pipeline {
  constructor(renderer) {
    this.r = renderer;
    const o = { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.rtS = new THREE.WebGLRenderTarget(W, H, o);
    this.rtA = new THREE.WebGLRenderTarget(W, H, Object.assign({}, o, { depthBuffer: false }));
    const mk = (w, h) => new THREE.WebGLRenderTarget(w, h, Object.assign({}, o, { depthBuffer: false }));
    this.b = [[mk(W / 4, H / 4), mk(W / 4, H / 4)], [mk(W / 8, H / 8), mk(W / 8, H / 8)], [mk(W / 16, H / 16), mk(W / 16, H / 16)]];
    this.acc = quad(ACC_FS, { tSrc: { value: null }, uW: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true });
    this.bright = quad(BRIGHT_FS, { tSrc: { value: null }, uTh: { value: 1.45 }, uTx: { value: new THREE.Vector2(1 / W, 1 / H) } });
    this.blur = quad(BLUR_FS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.brandTex = new THREE.CanvasTexture(document.createElement('canvas'));
    this.final = quad(FINAL_FS, {
      tAcc: { value: this.rtA.texture }, tB1: { value: this.b[0][0].texture }, tB2: { value: this.b[1][0].texture }, tB3: { value: this.b[2][0].texture }, tBrand: { value: this.brandTex },
      uExposure: { value: 1 }, uBloom: { value: 0.35 }, uVig: { value: 0.16 }, uGrain: { value: 0.02 }, uSeed: { value: 0 }, uBrand: { value: 0 }, uScene: { value: 1 },
      uLift: { value: new THREE.Vector3(0.004, 0.002, 0.003) }, uGain: { value: new THREE.Vector3(1, 0.995, 0.985) }, uCA: { value: 0.0012 }, uBlack: { value: new THREE.Vector3(0.071, 0.047, 0.059) },
    });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setBrandCanvas(canvas) { this.brandTex.image = canvas; this.brandTex.colorSpace = THREE.NoColorSpace; this.brandTex.premultiplyAlpha = true; this.brandTex.needsUpdate = true; }

  // film: { applyTime(t) -> shot, scene, camera }. shot = {pos, look, fov, focus, ap, roll}
  renderFrame(film, f, N, shutter = 0.5, fps = 30) {
    const r = this.r; const t0 = f / fps;
    const skipScene = film.sceneOff && film.sceneOff(t0);
    r.setRenderTarget(this.rtA); r.setClearColor(0x000000, 1); r.clear();
    if (!skipScene) {
      for (let i = 0; i < N; i++) {
        const u = N > 1 ? (i + 0.5) / N - 0.5 : 0;
        const t = t0 + u * shutter / fps;
        const shot = film.applyTime(t, i, N);
        const cam = film.camera;
        // lensa tipis: geser di cakram, bidik ulang ke titik fokus
        const fwd = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
        const focusPt = shot.pos.clone().addScaledVector(fwd, shot.focus);
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
        const [dx, dy] = N > 1 ? vogel((i * 7 + f) % N, N) : [0, 0];
        cam.position.copy(shot.pos).addScaledVector(right, dx * shot.ap).addScaledVector(up, dy * shot.ap);
        cam.up.set(0, 1, 0);
        cam.lookAt(focusPt);
        if (shot.roll) cam.rotateZ(shot.roll);
        cam.fov = shot.fov; cam.updateProjectionMatrix();
        const jx = N > 1 ? halton(i + 1 + (f % 7) * N, 2) - 0.5 : 0, jy = N > 1 ? halton(i + 1 + (f % 7) * N, 3) - 0.5 : 0;
        cam.setViewOffset(W, H, jx, jy, W, H);
        r.setRenderTarget(this.rtS); r.setClearColor(film.scene.background, 1); r.clear(); r.render(film.scene, cam);
        cam.clearViewOffset();
        this.acc.m.uniforms.tSrc.value = this.rtS.texture; this.acc.m.uniforms.uW.value = 1 / N;
        r.setRenderTarget(this.rtA); r.autoClear = false; r.render(this.acc.sc, this.cam); r.autoClear = true;
      }
    } else {
      film.applyTime(t0, 0, 1);
    }
    // bloom
    let src = this.rtA;
    for (let k = 0; k < 3; k++) {
      const [a, b] = this.b[k];
      if (k === 0) { this.bright.m.uniforms.tSrc.value = src.texture; r.setRenderTarget(a); r.render(this.bright.sc, this.cam); }
      else { this.blur.m.uniforms.tSrc.value = this.b[k - 1][0].texture; this.blur.m.uniforms.uDir.value.set(0, 0); r.setRenderTarget(a); r.render(this.blur.sc, this.cam); }
      for (let p = 0; p < 2; p++) {
        this.blur.m.uniforms.tSrc.value = a.texture; this.blur.m.uniforms.uDir.value.set(1.4 / a.width, 0); r.setRenderTarget(b); r.render(this.blur.sc, this.cam);
        this.blur.m.uniforms.tSrc.value = b.texture; this.blur.m.uniforms.uDir.value.set(0, 1.4 / a.height); r.setRenderTarget(a); r.render(this.blur.sc, this.cam);
      }
    }
    const g = film.grade(t0);
    const U = this.final.m.uniforms;
    U.uExposure.value = g.exposure; U.uBloom.value = g.bloom; U.uVig.value = g.vig; U.uGrain.value = g.grain; U.uSeed.value = (f * 13.37) % 97;
    U.uBrand.value = g.brand; U.uScene.value = g.scene;
    if (g.brand > 0 && film.brandCanvas) {
      // Tekstur dibuat SEKALI dari kanvas merek 1080×1920 (penyimpanan tekstur WebGL tidak bisa berubah ukuran).
      if (this.brandTex.image !== film.brandCanvas) { this.brandTex.dispose(); this.brandTex = new THREE.CanvasTexture(film.brandCanvas); this.brandTex.colorSpace = THREE.NoColorSpace; this.brandTex.premultiplyAlpha = true; this.brandTex.generateMipmaps = false; this.brandTex.minFilter = THREE.LinearFilter; U.tBrand.value = this.brandTex; }
      this.brandTex.needsUpdate = true;
    }
    r.setRenderTarget(null); r.render(this.final.sc, this.cam);
  }
}
