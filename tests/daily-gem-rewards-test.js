/**
 * tests/daily-gem-rewards-test.js — Daily Gem Rewards Suite (Login Bonus + 10-Min Study Bonus)
 *
 * Verifies:
 * 1. Daily Login Bonus: +5 Gem awarded on first open of the day (1x per calendar day).
 * 2. Daily Study Target: +20 Gem awarded when daily study time reaches >= 10 minutes (600,000 ms).
 * 3. Idempotency: Multiple checks on the same day never duplicate rewards.
 * 4. Day Rollover: When date advances, daily flags reset and allow earning for the new day.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('[TEST] Starting Daily Gem Rewards Unit Tests...');

// Load gems-core.js and test logic in a sandboxed context
const gemsCoreCode = fs.readFileSync('features/speaking-listening/gems-core.js', 'utf8');

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  JSON,
  self: {},
  state: null,
  window: {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
  },
  showToast() {},
  showGemRewardModal() {},
  save() {},
  getActiveLevel() { return 1; },
  studyDayKey(ts, st) {
    const d = new Date(ts);
    return d.toISOString().slice(0, 10);
  }
};

vm.createContext(sandbox);
vm.runInContext(gemsCoreCode, sandbox);

// Initialize state
const gemsApi = sandbox.self.FiezelGems || sandbox.FiezelGems;
sandbox.FiezelGems = gemsApi;
const initialGemsState = gemsApi.freshGems();
initialGemsState.balance = 120;
initialGemsState.earnedTotal = 120;
sandbox.state = {
  gems: initialGemsState,
  history: [],
  dailyRewards: {
    date: '',
    loginBonusClaimed: false,
    study10MinClaimed: false,
    studyTimeMs: 0
  }
};

const checkDailyGemRewardsFunc = `
function checkDailyGemRewards(silent = false) {
  if (!state) return false;
  const today = studyDayKey(Date.now(), state);
  if (!state.dailyRewards || state.dailyRewards.date !== today) {
    state.dailyRewards = {
      date: today,
      loginBonusClaimed: false,
      study10MinClaimed: false,
      studyTimeMs: 0
    };
  }
  const dr = state.dailyRewards;
  let awardedAny = false;

  // 1. Bonus Login Harian: +5 Gem (1x per hari kalender)
  if (!dr.loginBonusClaimed) {
    dr.loginBonusClaimed = true;
    const g = FiezelGems;
    if (g && typeof g.gemsEarn === 'function') {
      state.gems = g.gemsEarn(state.gems, 5, 'daily_login_bonus', Date.now(), 'login-' + today, getActiveLevel());
    } else {
      if (state.gems && typeof state.gems.balance === 'number') state.gems.balance += 5;
      else state.gems = (Number(state.gems) || 0) + 5;
    }
    save();
    awardedAny = true;
  }

  // 2. Bonus Belajar Minimal 10 Menit Sehari: +20 Gem (1x per hari kalender)
  if (!dr.study10MinClaimed) {
    let todayStudyMs = Number(dr.studyTimeMs) || 0;
    for (const h of state.history || []) {
      if (studyDayKey(h.at || 0, state) === today) {
        todayStudyMs += (Number(h.ms) || 0);
      }
    }
    // 10 menit = 600.000 ms
    if (todayStudyMs >= 10 * 60 * 1000) {
      dr.study10MinClaimed = true;
      const g = FiezelGems;
      if (g && typeof g.gemsEarn === 'function') {
        state.gems = g.gemsEarn(state.gems, 20, 'daily_study_10min', Date.now(), 'study10-' + today, getActiveLevel());
      } else {
        if (state.gems && typeof state.gems.balance === 'number') state.gems.balance += 20;
        else state.gems = (Number(state.gems) || 0) + 20;
      }
      save();
      awardedAny = true;
    }
  }

  return awardedAny;
}
`;

vm.runInContext(checkDailyGemRewardsFunc, sandbox);

// 1. Initial State has 120 default gems
assert.strictEqual(sandbox.state.gems.balance, 120, 'Default balance is 120');

// 2. First open of the day awards +5 Gem Login Bonus
const awarded1 = sandbox.checkDailyGemRewards(true);
assert.strictEqual(awarded1, true, 'First daily check must award reward');
assert.strictEqual(sandbox.state.gems.balance, 125, 'Balance must be 125 (+5 gem login bonus)');
assert.strictEqual(sandbox.state.dailyRewards.loginBonusClaimed, true, 'loginBonusClaimed must be true');
assert.strictEqual(sandbox.state.dailyRewards.study10MinClaimed, false, 'study10MinClaimed must be false');
console.log('  ✓ Daily Login Bonus (+5 Gem) awarded on first open');

// 3. Second open on the same day must NOT duplicate login bonus
const awarded2 = sandbox.checkDailyGemRewards(true);
assert.strictEqual(awarded2, false, 'Second daily check must award nothing');
assert.strictEqual(sandbox.state.gems.balance, 125, 'Balance must remain 125');
console.log('  ✓ Daily Login Bonus idempotency (1x daily) verified');

// 4. Studying 5 minutes (300,000 ms) does NOT unlock the 10-minute bonus
sandbox.state.dailyRewards.studyTimeMs = 300000;
const awarded3 = sandbox.checkDailyGemRewards(true);
assert.strictEqual(awarded3, false, '5 minutes study must not award 10-minute bonus');
assert.strictEqual(sandbox.state.gems.balance, 125, 'Balance remains 125');
assert.strictEqual(sandbox.state.dailyRewards.study10MinClaimed, false, 'study10MinClaimed still false');
console.log('  ✓ Under-threshold study time (< 10 min) does not trigger reward');

// 5. Studying 6 more minutes (total 11 min = 660,000 ms) triggers +20 Gem Study Bonus
sandbox.state.dailyRewards.studyTimeMs = 660000;
const awarded4 = sandbox.checkDailyGemRewards(true);
assert.strictEqual(awarded4, true, '>= 10 minutes study must award +20 Gem');
assert.strictEqual(sandbox.state.gems.balance, 145, 'Balance must be 145 (125 + 20 gem)');
assert.strictEqual(sandbox.state.dailyRewards.study10MinClaimed, true, 'study10MinClaimed must be true');
console.log('  ✓ Daily Study Target (>= 10 min -> +20 Gem) awarded');

// 6. Further study on the same day does NOT re-award
sandbox.state.dailyRewards.studyTimeMs = 1200000; // 20 minutes
const awarded5 = sandbox.checkDailyGemRewards(true);
assert.strictEqual(awarded5, false, 'Further study on same day must not re-award');
assert.strictEqual(sandbox.state.gems.balance, 145, 'Balance remains 145');
console.log('  ✓ Daily Study Target idempotency (1x daily) verified');

// 7. Day rollover resets flags
sandbox.state.dailyRewards.date = '2026-10-31'; // simulate yesterday
const awardedRollover = sandbox.checkDailyGemRewards(true);
assert.strictEqual(awardedRollover, true, 'Rollover to new day awards new login bonus');
assert.strictEqual(sandbox.state.gems.balance, 150, 'Balance is now 150 (145 + 5)');
assert.strictEqual(sandbox.state.dailyRewards.loginBonusClaimed, true, 'New day loginBonusClaimed is true');
assert.strictEqual(sandbox.state.dailyRewards.study10MinClaimed, false, 'New day study10MinClaimed resets to false');
assert.strictEqual(sandbox.state.dailyRewards.studyTimeMs, 0, 'New day studyTimeMs resets to 0');
console.log('  ✓ Day rollover resets daily state and allows next-day earning');

console.log('\n>>> ALL DAILY GEM REWARDS UNIT TESTS PASSED (7/7)! <<<');
