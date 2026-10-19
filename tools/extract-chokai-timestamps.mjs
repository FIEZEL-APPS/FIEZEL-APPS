import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const BANK_FILE = path.join(ROOT, 'features/speaking-listening/jlpt-listening-bank-v1.json');
const TEMP_BASE = path.join(ROOT, 'scratch/chokai-pipeline');

function getDuration(p) {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${p}"`;
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return parseFloat(out) || 0;
  } catch (e) {
    return 0;
  }
}

const bank = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));

for (const item of bank.items) {
  const itemDir = path.join(TEMP_BASE, item.id);
  if (!fs.existsSync(itemDir)) continue;

  const segs = fs.readdirSync(itemDir).filter(f => f.startsWith('seg_')).sort();
  if (segs.length === 0) continue;

  let curTime = 0;
  const turnTimestamps = [];
  // Segment 0 is intro
  // Segments 1 to N-2 are dialogue lines
  // Segment N-1 is question
  for (let i = 0; i < segs.length; i++) {
    const dur = getDuration(path.join(itemDir, segs[i]));
    turnTimestamps.push(parseFloat(curTime.toFixed(2)));
    let pause = 0.4;
    if (i === 0) pause = 0.5;
    else if (i === segs.length - 2) pause = 0.8;
    curTime += dur + pause;
  }

  // Dialogue turns start from index 1 in segments
  // In Bottom Sheet, each dialogue line corresponds to seg_01, seg_02, etc.
  const dialogueTimestamps = turnTimestamps.slice(1, segs.length - 1);
  item.turnTimestamps = dialogueTimestamps.length > 0 ? dialogueTimestamps : [turnTimestamps[0]];
  item.allTurnTimestamps = turnTimestamps;
}

fs.writeFileSync(BANK_FILE, JSON.stringify(bank, null, 2) + '\n');
console.log('Successfully updated jlpt-listening-bank-v1.json with accurate turnTimestamps!');
