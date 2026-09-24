// FIEZEL · Film "Satu Kelas, Dua Layar" — titik masuk halaman render.
// window.renderFrame(f, samples) menggambar frame ke-f (30 fps) ke kanvas 1080×1920.
import * as THREE from 'three';
import { Film, T, VO, SHOTS, FLIGHT_LIST } from './film.js';
import { Pipeline } from './pipeline.js';
import { W, H, FPS, DURATION } from './lib.js';

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', alpha: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const film = new Film(renderer);
const pipe = new Pipeline(renderer);
await film.init();

window.FZ = { T, VO, SHOTS: SHOTS.map((s) => ({ t0: s.t0, t1: s.t1, name: s.name })), FLIGHTS: FLIGHT_LIST, FPS, DURATION, FRAMES: Math.round(DURATION * FPS) };
window.samplesAt = (f) => film.samplesAt(f / FPS);
window.renderFrame = (f, samples) => {
  const N = samples ?? film.samplesAt(f / FPS);
  pipe.renderFrame(film, f, N);
  const gl = renderer.getContext(); gl.finish();
  return N;
};
// pratinjau di peramban: ?t=12.5 atau ?f=375, &n=sampel
const q = new URLSearchParams(location.search);
if (q.has('t') || q.has('f')) window.renderFrame(q.has('f') ? +q.get('f') : Math.round(+q.get('t') * FPS), q.has('n') ? +q.get('n') : 1);
window.__film = film; window.__pipe = pipe;
window.ready = true;
// Diagnostik: proyeksikan pusat panel ke layar (0..1) pada waktu t.
window.debugProj = (name, t) => {
  film.applyTime(t); const cam = film.camera; const shot = film.applyTime(t);
  cam.position.copy(shot.pos); cam.up.set(0, 1, 0); cam.lookAt(shot.look); cam.fov = shot.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const P = film.hero[name]; const v = P.group.position.clone().project(cam);
  return { ndc: [+(v.x * 0.5 + 0.5).toFixed(3), +(0.5 - v.y * 0.5).toFixed(3)], vis: P.group.visible, scale: P.group.scale.x.toFixed(3), shot: shot.name };
};
