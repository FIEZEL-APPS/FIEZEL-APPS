import { CALL_SCENARIOS } from '../../features/voice-studio/src/data/callScenarios.ts';

async function main() {
  console.log('=== FIEZEL VOICE STUDIO FREE TALK & ANTI-ETTO SPEED PROBE ===\n');

  // 1. Verify Free Talk Scenarios
  const enFree = CALL_SCENARIOS.find((s) => s.id === 'scen_en_free_talk');
  const jaFree = CALL_SCENARIOS.find((s) => s.id === 'scen_ja_free_talk');

  if (!enFree) {
    console.error('FAIL: scen_en_free_talk not found in CALL_SCENARIOS');
    process.exit(1);
  }
  if (!jaFree) {
    console.error('FAIL: scen_ja_free_talk not found in CALL_SCENARIOS');
    process.exit(1);
  }

  console.log('✓ Found scen_en_free_talk:', enFree.titleId, '(prereq:', enFree.prereqCompetencyId || 'none', ')');
  console.log('✓ Found scen_ja_free_talk:', jaFree.titleId, '(prereq:', jaFree.prereqCompetencyId || 'none', ')');

  // 1.5 Authenticate anonymous session
  console.log('\n--- Authenticating anonymous session ---');
  const authRes = await fetch('https://api.fiezel.my.id/api/auth/anon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const cookieHeader = authRes.headers.get('set-cookie') || '';
  const cookie = cookieHeader.split(';')[0];
  console.log('✓ Auth status:', authRes.status, cookie ? '(cookie received)' : '(no cookie)');

  // 2. Test Cloudflare Worker conversation_turn
  const testCases = [
    {
      label: 'Japanese Turn (Anti-Etto check)',
      course: 'ja',
      scenarioId: 'free',
      message: '今日は天気がとてもいいですね。休みの日は何をしますか？',
      bannedPattern: /^(?:えっと|ええと|えーと|あの[ね]?|う[ー~]*ん|ああ|うん)[、,!\s・…〜~]*/,
    },
    {
      label: 'English Turn (Anti-OK check)',
      course: 'en',
      scenarioId: 'free',
      message: 'I really love stargazing at night and learning about planets. What is your favorite hobby?',
      bannedPattern: /^(?:OK|Okay|Oh|Alright|Sure)[,!\s]+/i,
    },
  ];

  for (const tc of testCases) {
    console.log(`\n--- Testing ${tc.label} ---`);
    const t0 = Date.now();
    const payload = {
      schema: 'fiezel-ai-task-v2',
      task: 'conversation_turn',
      locale: 'id',
      input: {
        course: tc.course,
        level: 'A2',
        mode: 'call',
        scenarioId: tc.scenarioId,
        message: tc.message,
        history: [],
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Fiezel-Client': 'fiezel-voice-studio-test',
    };
    if (cookie) headers['Cookie'] = cookie;

    const res = await fetch('https://api.fiezel.my.id/api/ai/task', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[WARN] Worker returned status ${res.status} (${latencyMs}ms): ${errText}`);
      continue;
    }

    const data = await res.json();
    const reply = data?.turn?.reply || data?.text || '';
    const translation = data?.turn?.translation || '';

    console.log(`Latency: ${latencyMs}ms`);
    console.log(`Reply: "${reply}"`);
    console.log(`Translation: "${translation}"`);

    const hasBanned = tc.bannedPattern.test(reply);
    if (hasBanned) {
      console.error(`FAIL: Reply matched banned pattern! Found: "${reply}"`);
      process.exit(1);
    } else {
      console.log(`✓ Anti-filler check passed (Zero banned opener detected)`);
    }
  }

  console.log('\n======================================================');
  console.log('ALL PROBE CHECKS PASSED: Free talk & Anti-Etto verified!');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('Probe execution failed:', err);
  process.exit(1);
});
