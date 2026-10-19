/**
 * tests/neural-server-tts-test.js
 * Verification of Multi-Character Neural Voice TTS Endpoints on FIEZEL Local Server
 */
const assert = require('assert');
const http = require('http');
const server = require('../server.js');

const TEST_PORT = 3199;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch (_) {
            data = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting FIEZEL Server Neural Voice TTS Endpoint Audit ---');
  await new Promise(resolve => server.listen(TEST_PORT, '127.0.0.1', resolve));

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200, 'Health endpoint should return 200');
    assert.strictEqual(health.data.status, 'healthy');
    console.log('[PASS] GET /api/health');

    // 2. GET /api/tts/personas
    const personasRes = await request('GET', '/api/tts/personas');
    assert.strictEqual(personasRes.status, 200, 'GET /api/tts/personas must return 200');
    assert.strictEqual(personasRes.data.engine, 'multi-character-neural-24khz');
    const personas = personasRes.data.personas;
    assert.ok(personas, 'personas dictionary must be present');

    // Verify all 5 required personas
    assert.strictEqual(personas.coach_alex.edgeVoice, 'en-US-GuyNeural', 'Coach Alex should use GuyNeural');
    assert.strictEqual(personas.coach_sarah.edgeVoice, 'en-US-AriaNeural', 'Coach Sarah should use AriaNeural');
    assert.strictEqual(personas.instructor.edgeVoice, 'id-ID-ArdiNeural', 'Instruktur Ujian should use ArdiNeural');
    assert.strictEqual(personas.kaiwa_male.edgeVoice, 'ja-JP-KeitaNeural', 'Mitra Kaiwa (Laki-laki) should use KeitaNeural');
    assert.strictEqual(personas.kaiwa_female.edgeVoice, 'ja-JP-NanamiNeural', 'Mitra Kaiwa (Perempuan) should use NanamiNeural');
    assert.strictEqual(personas.vocab.edgeVoice, 'en-US-AvaNeural', 'Leksikon Kosakata should use AvaNeural');
    console.log('[PASS] GET /api/tts/personas: all 6 voice personas configured accurately');

    // 3. POST /api/tts/line validation
    const invalidRes = await request('POST', '/api/tts/line', { text: '' });
    assert.strictEqual(invalidRes.status, 400, 'Empty text should return 400');
    console.log('[PASS] POST /api/tts/line: validation rejects empty input');

    // 4. POST /api/tts/line for Coach Alex
    const alexRes = await request('POST', '/api/tts/line', {
      text: 'Good job on completing your speaking drill today!',
      speaker: 'coach_alex',
      lang: 'en'
    });
    assert.strictEqual(alexRes.status, 200, 'POST /api/tts/line (Alex) should return 200');
    assert.ok(alexRes.data.audioBase64, 'audioBase64 must not be empty');
    assert.strictEqual(alexRes.data.mimeType, 'audio/mpeg');
    assert.strictEqual(alexRes.data.voiceName, 'GuyNeural');
    assert.ok(alexRes.data.personaLabel.includes('GuyNeural') || alexRes.data.personaLabel.includes('Coach Alex'));
    console.log(`[PASS] POST /api/tts/line (Coach Alex / GuyNeural) -> ${alexRes.data.audioBase64.length} chars base64`);

    // 5. POST /api/tts/line for Coach Sarah
    const sarahRes = await request('POST', '/api/tts/line', {
      text: 'Remember to practice your grammar exercises daily.',
      speaker: 'coach_sarah',
      lang: 'en'
    });
    assert.strictEqual(sarahRes.status, 200, 'POST /api/tts/line (Sarah) should return 200');
    assert.ok(sarahRes.data.audioBase64);
    assert.strictEqual(sarahRes.data.mimeType, 'audio/mpeg');
    assert.strictEqual(sarahRes.data.voiceName, 'AriaNeural');
    console.log(`[PASS] POST /api/tts/line (Coach Sarah / AriaNeural) -> ${sarahRes.data.audioBase64.length} chars base64`);

    // 6. POST /api/tts/line for Instruktur Ujian
    const ardiRes = await request('POST', '/api/tts/line', {
      text: 'Ujian mendengarkan akan segera dimulai.',
      speaker: 'instructor',
      lang: 'id'
    });
    assert.strictEqual(ardiRes.status, 200, 'POST /api/tts/line (Instructor) should return 200');
    assert.ok(ardiRes.data.audioBase64);
    assert.strictEqual(ardiRes.data.mimeType, 'audio/mpeg');
    assert.strictEqual(ardiRes.data.voiceName, 'ArdiNeural');
    console.log(`[PASS] POST /api/tts/line (Instruktur Ujian / ArdiNeural) -> ${ardiRes.data.audioBase64.length} chars base64`);

    // 7. POST /api/tts/line for Mitra Kaiwa Jepang
    const kaiwaRes = await request('POST', '/api/tts/line', {
      text: 'こんにちは、はじめまして。',
      speaker: 'kaiwa_male',
      lang: 'ja'
    });
    assert.strictEqual(kaiwaRes.status, 200, 'POST /api/tts/line (Kaiwa Male) should return 200');
    assert.ok(kaiwaRes.data.audioBase64);
    assert.strictEqual(kaiwaRes.data.mimeType, 'audio/mpeg');
    assert.strictEqual(kaiwaRes.data.voiceName, 'KeitaNeural');
    console.log(`[PASS] POST /api/tts/line (Mitra Kaiwa / KeitaNeural) -> ${kaiwaRes.data.audioBase64.length} chars base64`);

    // 8. POST /api/tts/line for Leksikon Kosakata
    const vocabRes = await request('POST', '/api/tts/line', {
      text: 'Vocabulary pronunciation reference',
      speaker: 'vocab',
      lang: 'en'
    });
    assert.strictEqual(vocabRes.status, 200, 'POST /api/tts/line (Vocab) should return 200');
    assert.ok(vocabRes.data.audioBase64);
    assert.strictEqual(vocabRes.data.mimeType, 'audio/mpeg');
    assert.strictEqual(vocabRes.data.voiceName, 'AvaNeural');
    console.log(`[PASS] POST /api/tts/line (Leksikon Kosakata / AvaNeural) -> ${vocabRes.data.audioBase64.length} chars base64`);

    // 9. POST /api/tts/dialogue
    const dialogueRes = await request('POST', '/api/tts/dialogue', {
      lines: [
        { index: 0, text: 'Pertanyaan satu.', speaker: 'instructor' },
        { index: 1, text: 'Halo Alex di sini.', speaker: 'coach_alex' }
      ]
    });
    assert.strictEqual(dialogueRes.status, 200, 'POST /api/tts/dialogue should return 200');
    assert.strictEqual(dialogueRes.data.clips.length, 2, 'Should return 2 clips');
    assert.strictEqual(dialogueRes.data.clips[0].voiceName, 'ArdiNeural');
    assert.strictEqual(dialogueRes.data.clips[1].voiceName, 'GuyNeural');
    console.log('[PASS] POST /api/tts/dialogue: successfully rendered multi-line dialogue clips');

    console.log('--- ALL NEURAL TTS ENDPOINT TESTS PASSED (100%) ---');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
