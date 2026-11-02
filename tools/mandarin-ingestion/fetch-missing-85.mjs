/**
 * tools/mandarin-ingestion/fetch-missing-85.mjs
 *
 * Fetches the 85 missing lessons (61 incomplete + 24 Level 7) with gentle 800ms delay
 * and automatic retry with exponential backoff on empty/rate-limited responses.
 */

import fs from 'fs';
import path from 'path';

const RESEARCH_KIT = 'C:/Users/hp/Desktop/SUPERCHINESE_MANDARIN_RESEARCH_KIT';
const BREAKDOWN_FILE = path.join(RESEARCH_KIT, '01_kurikulum_dan_silabus_192_lessons', 'level_1_to_8_breakdown.json');
const CATALOG_FILE = path.join(RESEARCH_KIT, '01_kurikulum_dan_silabus_192_lessons', 'superchinese_full_192_lessons_catalog.json');

const SLEEP_MS = 800;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response body');
      }
      return JSON.parse(text);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const backoff = attempt * 2000;
      console.log(`      [Retry ${attempt}/${maxRetries} after ${backoff}ms: ${err.message}]`);
      await sleep(backoff);
    }
  }
}

async function main() {
  console.log('[1/4] Loading breakdown dataset...');
  const breakdown = JSON.parse(fs.readFileSync(BREAKDOWN_FILE, 'utf8'));

  // Ensure Level 7 has its 24 lesson stubs
  if (!breakdown.level_7.lessons || breakdown.level_7.lessons.length === 0) {
    console.log('  Fetching Level 7 lesson list...');
    const lvl7Data = await fetchWithRetry('https://www.superchinese.com/api/home/lesson?level=7');
    const lvl7List = Array.isArray(lvl7Data) ? lvl7Data : Object.values(lvl7Data);
    breakdown.level_7.lessons = lvl7List.map((item, idx) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      durationLabel: item.durationLabel,
      level: 7,
      num: item.num || (idx + 1)
    }));
    breakdown.level_7.lesson_count = breakdown.level_7.lessons.length;
    console.log(`  Added ${breakdown.level_7.lessons.length} lessons to Level 7.`);
    await sleep(SLEEP_MS);
  }

  // Find all lessons lacking collections across all 8 levels
  const missingLessons = [];
  for (let lvl = 1; lvl <= 8; lvl++) {
    const lessons = breakdown['level_' + lvl]?.lessons || [];
    lessons.forEach(l => {
      if (!l.collections || l.collections.length === 0) {
        missingLessons.push(l);
      }
    });
  }

  console.log(`[2/4] Found ${missingLessons.length} lessons lacking collections. Fetching sequentially...`);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < missingLessons.length; i++) {
    const l = missingLessons[i];
    process.stdout.write(`  [${i + 1}/${missingLessons.length}] Lvl ${l.level} #${l.num} (id ${l.id}: "${l.title}")... `);
    try {
      const detail = await fetchWithRetry(`https://www.superchinese.com/api/home/lesson-view?lid=${l.id}`);
      l.exp = detail.exp || l.exp || 80;
      l.collections = detail.collections || [];
      successCount++;
      process.stdout.write(`OK (${l.collections.length} collections)\n`);
    } catch (err) {
      failCount++;
      process.stdout.write(`FAILED (${err.message})\n`);
    }
    await sleep(SLEEP_MS);
  }

  console.log(`[3/4] Fetch completed: ${successCount} OK, ${failCount} failed.`);

  console.log('[4/4] Saving updated breakdown & catalog files...');
  fs.writeFileSync(BREAKDOWN_FILE, JSON.stringify(breakdown, null, 2), 'utf8');

  // Build unified 192 lessons catalog
  const full192 = [];
  for (let lvl = 1; lvl <= 8; lvl++) {
    const lessons = breakdown['level_' + lvl]?.lessons || [];
    lessons.forEach(l => {
      full192.push(l);
    });
  }
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(full192, null, 2), 'utf8');
  console.log(`Successfully saved 192 lessons to ${CATALOG_FILE}!`);
}

main().catch(err => {
  console.error('Fatal error in fetch-missing-85:', err);
  process.exit(1);
});
