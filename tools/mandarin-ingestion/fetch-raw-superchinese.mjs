/**
 * tools/mandarin-ingestion/fetch-raw-superchinese.mjs
 *
 * Fetches raw curriculum data from SuperChinese endpoints politely:
 * - 500ms delay between calls
 * - Concurrency 1 (strictly sequential)
 * - Fetches kewen (full dialogues for 8 levels)
 * - Fetches level 1..8 lesson lists (24 lessons each = 192 lessons)
 * - Fetches lesson-view for all 192 lessons to obtain full vocabulary and grammar topics
 * - Saves complete raw dataset to Desktop research kit
 */

import fs from 'fs';
import path from 'path';

const RESEARCH_KIT = 'C:/Users/hp/Desktop/SUPERCHINESE_MANDARIN_RESEARCH_KIT';
const SLEEP_MS = 500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function main() {
  console.log('[1/4] Fetching full kewen dialogues...');
  try {
    const kewen = await fetchJson('https://www.superchinese.com/api/home/kewen');
    const kewenPath = path.join(RESEARCH_KIT, '02_kewen_dialog_dan_listening', 'kewen_full_levels.json');
    fs.writeFileSync(kewenPath, JSON.stringify(kewen, null, 2), 'utf8');
    console.log(`Saved kewen dialogues to ${kewenPath} (levels: ${Object.keys(kewen).length})`);
  } catch (err) {
    console.error('Error fetching kewen:', err.message);
  }
  await sleep(SLEEP_MS);

  console.log('[2/4] Fetching lesson lists for Levels 1 to 8...');
  const allLessonStubs = [];
  for (let lvl = 1; lvl <= 8; lvl++) {
    console.log(`  Fetching Level ${lvl}...`);
    try {
      const lessons = await fetchJson(`https://www.superchinese.com/api/home/lesson?level=${lvl}`);
      const list = Array.isArray(lessons) ? lessons : Object.values(lessons);
      console.log(`    Level ${lvl} returned ${list.length} lessons.`);
      list.forEach((item, idx) => {
        allLessonStubs.push({
          level: lvl,
          num: item.num || (idx + 1),
          id: item.id,
          title: item.title,
          image: item.image,
          durationLabel: item.durationLabel
        });
      });
    } catch (err) {
      console.error(`    Failed Level ${lvl}:`, err.message);
    }
    await sleep(SLEEP_MS);
  }

  console.log(`Total lesson stubs collected: ${allLessonStubs.length} (expected 192)`);

  console.log('[3/4] Fetching lesson-view details for each lesson (with 500ms delay)...');
  const fullLessons = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allLessonStubs.length; i++) {
    const stub = allLessonStubs[i];
    process.stdout.write(`  [${i + 1}/${allLessonStubs.length}] Lvl ${stub.level} #${stub.num} (id ${stub.id}: "${stub.title}")... `);
    try {
      const detail = await fetchJson(`https://www.superchinese.com/api/home/lesson-view?lid=${stub.id}`);
      fullLessons.push({
        ...stub,
        exp: detail.exp,
        collections: detail.collections || []
      });
      successCount++;
      process.stdout.write(`OK (${detail.collections?.length || 0} collections)\n`);
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failCount++;
      fullLessons.push({
        ...stub,
        collections: []
      });
    }
    await sleep(SLEEP_MS);
  }

  console.log(`[4/4] Writing raw dataset: ${successCount} successful, ${failCount} failed.`);
  const outputPath = path.join(RESEARCH_KIT, '01_kurikulum_dan_silabus_192_lessons', 'superchinese_raw_192_lessons_full.json');
  fs.writeFileSync(outputPath, JSON.stringify(fullLessons, null, 2), 'utf8');
  console.log(`Done! Saved to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
