import FaceGuard from '../../features/class-hub/fiezel-face-guard.js';

function makeFrame(opts = {}) {
  const {
    skinR = 170, skinG = 130, skinB = 105,
    eyeR = 80, eyeG = 65, eyeB = 55,
    bgR = 80, bgG = 85, bgB = 90,
    noiseStd = 0.5,
    shiftX = 0, shiftY = 0,
    aspect = 1.0
  } = opts;

  const w = 64, h = 48;
  const data = new Uint8ClampedArray(w * h * 4);

  // Box: x: 18..46, y: 12..36
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const ax = x - shiftX;
      const ay = y - shiftY;

      let r = bgR, g = bgG, b = bgB;
      if (ax >= 18 && ax <= 46 && ay >= 12 && ay <= 36) {
        if (ay >= 20 && ay <= 26 && ax >= 22 && ax <= 42) {
          r = eyeR; g = eyeG; b = eyeB;
        } else {
          r = skinR; g = skinG; b = skinB;
        }
      }

      if (noiseStd > 0) {
        // Gaussian approximation: 3 uniform variables for bell curve sensor noise
        const n = ((Math.random() + Math.random() + Math.random()) - 1.5) * noiseStd * 2.0;
        r += n; g += n; b += n;
      }

      data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[idx + 3] = 255;
    }
  }

  const cvs = { width: w, height: h };
  const ctx = {
    drawImage() {},
    getImageData: () => ({ data })
  };
  const video = { readyState: 2 };

  return { cvs, ctx, video };
}

console.log('=== TEST 1: Wajah Manusia Normal Duduk Tenang (Real Webcam Noise std=0.5) ===');
FaceGuard.resetLiveness();
FaceGuard.resetEnrolledProfile();

let now = 1000000;
const origNow = Date.now;
Date.now = () => now;

let verifiedAt = null;
let lastRes = null;

for (let tick = 0; tick < 70; tick++) { // 70 ticks * 60ms = 4.2 seconds
  const frame = makeFrame({ noiseStd: 0.8 }); // noise std 0.8 is realistic webcam temporal noise
  lastRes = FaceGuard.checkLiveness(frame.video, frame.cvs, frame.ctx);
  if (lastRes.stage === 'verified') {
    verifiedAt = now - 1000000;
    break;
  }
  now += 60;
}

Date.now = origNow;
console.log('Test 1 (Noise std=0.8): verifiedAt =', verifiedAt, 'lastRes =', lastRes);

console.log('\n=== TEST 2: Wajah Manusia dengan Noise Halus Kamera Modern / HP (std=0.3) ===');
FaceGuard.resetLiveness();
FaceGuard.resetEnrolledProfile();

now = 1000000;
Date.now = () => now;

verifiedAt = null;
for (let tick = 0; tick < 70; tick++) {
  const frame = makeFrame({ noiseStd: 0.3 }); // webcam denoiser
  lastRes = FaceGuard.checkLiveness(frame.video, frame.cvs, frame.ctx);
  if (lastRes.stage === 'verified') {
    verifiedAt = now - 1000000;
    break;
  }
  now += 60;
}

Date.now = origNow;
console.log('Test 2 (Noise std=0.3): verifiedAt =', verifiedAt, 'lastRes =', lastRes);

console.log('\n=== TEST 3: Wajah dengan Cahaya Ruangan Lampu Putih / LED Dingin (normB ~ 0.32, crCb ~ 2) ===');
FaceGuard.resetLiveness();
const frameCool = makeFrame({ skinR: 155, skinG: 135, skinB: 125 }); // LED putih
const checkCool = FaceGuard.analyzeFrame(frameCool.video, frameCool.cvs, frameCool.ctx, null);
console.log('Test 3 (Lampu LED Putih):', checkCool);

console.log('\n=== TEST 4: Wajah di Ruangan Terang / Siang Hari (avgBr > 110, eyeDip tidak dalam) ===');
FaceGuard.resetLiveness();
// avgBr ~ 125, eye shadow softer
const frameBright = makeFrame({ skinR: 200, skinG: 165, skinB: 135, eyeR: 130, eyeG: 110, eyeB: 95 });
const checkBright = FaceGuard.analyzeFrame(frameBright.video, frameBright.cvs, frameBright.ctx, null);
console.log('Test 4 (Ruangan Terang / Siang Hari):', checkBright);

console.log('\n=== TEST 5: Wajah Orang Indonesia Kulit Sawo Matang / Kuning Langsat Sedikit Dim ===');
FaceGuard.resetLiveness();
// sawo matang / kecokelatan di ruangan biasa
const frameSawo = makeFrame({ skinR: 140, skinG: 105, skinB: 80, eyeR: 70, eyeG: 55, eyeB: 45 });
const checkSawo = FaceGuard.analyzeFrame(frameSawo.video, frameSawo.cvs, frameSawo.ctx, null);
console.log('Test 5 (Sawo Matang):', checkSawo);

console.log('\n=== TEST 6: Wajah Sedikit di Bawah / Atas Senter (cX=32, cY=18, misal HP dipegang tegak) ===');
FaceGuard.resetLiveness();
const frameShifted = makeFrame({ shiftY: -6 }); // wajah di bagian atas layar HP
const checkShifted = FaceGuard.analyzeFrame(frameShifted.video, frameShifted.cvs, frameShifted.ctx, null);
console.log('Test 6 (Wajah sedikit di atas cY=18):', checkShifted);
