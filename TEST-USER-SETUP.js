#!/usr/bin/env node
/**
 * TEST USER SETUP — Create A/B test user accounts
 *
 * Usage:
 *   node TEST-USER-SETUP.js --create
 *   node TEST-USER-SETUP.js --list
 *   node TEST-USER-SETUP.js --reset
 */

const fs = require('fs');
const path = require('path');

const STAGING_URL = process.env.STAGING_URL || 'https://staging.fiezel.app';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'staging-admin-token';
const TEST_DATA_FILE = path.join(__dirname, 'test-users.json');

// Default test user templates
const TEST_USERS = [
  // Group A: Core Brain v2 ON
  {
    userId: 'test_adaptive_A_001',
    name: 'Test Learner A1',
    email: 'test.adaptive.a.001@fiezel.dev',
    group: 'A',
    learningCurve: 1.0,  // normal
    targetAbility: 3.0,  // B1
    tags: ['staging', 'adaptivity-test', 'group_A', 'core_brain_v2_enabled']
  },
  {
    userId: 'test_adaptive_A_002',
    name: 'Test Learner A2',
    email: 'test.adaptive.a.002@fiezel.dev',
    group: 'A',
    learningCurve: 1.3,  // fast
    targetAbility: 5.0,  // C1
    tags: ['staging', 'adaptivity-test', 'group_A', 'core_brain_v2_enabled', 'fast_learner']
  },
  {
    userId: 'test_adaptive_A_003',
    name: 'Test Learner A3',
    email: 'test.adaptive.a.003@fiezel.dev',
    group: 'A',
    learningCurve: 0.7,  // slow
    targetAbility: 1.8,  // A1
    tags: ['staging', 'adaptivity-test', 'group_A', 'core_brain_v2_enabled', 'slow_learner']
  },
  {
    userId: 'test_adaptive_A_004',
    name: 'Test Learner A4',
    email: 'test.adaptive.a.004@fiezel.dev',
    group: 'A',
    learningCurve: 1.0,
    targetAbility: 2.5,
    tags: ['staging', 'adaptivity-test', 'group_A', 'core_brain_v2_enabled']
  },
  {
    userId: 'test_adaptive_A_005',
    name: 'Test Learner A5',
    email: 'test.adaptive.a.005@fiezel.dev',
    group: 'A',
    learningCurve: 1.1,
    targetAbility: 3.5,
    tags: ['staging', 'adaptivity-test', 'group_A', 'core_brain_v2_enabled']
  },

  // Group B: Core Brain v1 only (no adaptivity)
  {
    userId: 'test_adaptive_B_001',
    name: 'Control Learner B1',
    email: 'test.adaptive.b.001@fiezel.dev',
    group: 'B',
    learningCurve: 1.0,
    targetAbility: 3.0,
    tags: ['staging', 'adaptivity-test', 'group_B', 'core_brain_v1_only']
  },
  {
    userId: 'test_adaptive_B_002',
    name: 'Control Learner B2',
    email: 'test.adaptive.b.002@fiezel.dev',
    group: 'B',
    learningCurve: 1.3,
    targetAbility: 5.0,
    tags: ['staging', 'adaptivity-test', 'group_B', 'core_brain_v1_only', 'fast_learner']
  },
  {
    userId: 'test_adaptive_B_003',
    name: 'Control Learner B3',
    email: 'test.adaptive.b.003@fiezel.dev',
    group: 'B',
    learningCurve: 0.7,
    targetAbility: 1.8,
    tags: ['staging', 'adaptivity-test', 'group_B', 'core_brain_v1_only', 'slow_learner']
  },
  {
    userId: 'test_adaptive_B_004',
    name: 'Control Learner B4',
    email: 'test.adaptive.b.004@fiezel.dev',
    group: 'B',
    learningCurve: 1.0,
    targetAbility: 2.5,
    tags: ['staging', 'adaptivity-test', 'group_B', 'core_brain_v1_only']
  },
  {
    userId: 'test_adaptive_B_005',
    name: 'Control Learner B5',
    email: 'test.adaptive.b.005@fiezel.dev',
    group: 'B',
    learningCurve: 1.1,
    targetAbility: 3.5,
    tags: ['staging', 'adaptivity-test', 'group_B', 'core_brain_v1_only']
  }
];

// Commands
async function createUsers() {
  console.log(`\n📝 Creating ${TEST_USERS.length} test users for A/B test...`);
  console.log(`   Group A (Core Brain v2 ON):  5 users`);
  console.log(`   Group B (Core Brain v1 only): 5 users\n`);

  const created = [];
  const errors = [];

  for (const user of TEST_USERS) {
    try {
      // Simulate API call (real implementation would call staging API)
      const payload = {
        ...user,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      // In real scenario: await fetch(`${STAGING_URL}/api/admin/users`, {...})
      created.push(payload);

      const groupLabel = user.group === 'A' ? '🔬' : '🎛️';
      console.log(`  ${groupLabel} ${user.userId} (${user.name})`);
    } catch (err) {
      errors.push({ userId: user.userId, error: err.message });
      console.error(`  ❌ ${user.userId}: ${err.message}`);
    }
  }

  // Save to file
  fs.writeFileSync(TEST_DATA_FILE, JSON.stringify({
    experiment: 'adaptivity_v2_ab_test',
    startedAt: new Date().toISOString(),
    groups: {
      A: { label: 'Core Brain v2 (Adaptive)', users: created.filter(u => u.group === 'A') },
      B: { label: 'Core Brain v1 (Static)', users: created.filter(u => u.group === 'B') }
    },
    errors: errors
  }, null, 2));

  console.log(`\n✅ Created ${created.length} users`);
  if (errors.length) console.log(`⚠️  ${errors.length} errors (see logs)`);
  console.log(`📄 Saved to: ${TEST_DATA_FILE}\n`);
}

function listUsers() {
  if (!fs.existsSync(TEST_DATA_FILE)) {
    console.log('No test users created yet. Run: node TEST-USER-SETUP.js --create');
    return;
  }

  const data = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));

  console.log(`\n📊 Test Users — Experiment: ${data.experiment}`);
  console.log(`   Started: ${data.startedAt}\n`);

  for (const [group, groupData] of Object.entries(data.groups)) {
    console.log(`   ${group === 'A' ? '🔬' : '🎛️'} Group ${group}: ${groupData.label}`);
    for (const user of groupData.users) {
      console.log(`      • ${user.userId} (curve: ${user.learningCurve}x, target: L${user.targetAbility.toFixed(1)})`);
    }
    console.log('');
  }
}

function resetUsers() {
  if (fs.existsSync(TEST_DATA_FILE)) {
    fs.unlinkSync(TEST_DATA_FILE);
    console.log('✅ Test user data cleared');
  }
}

function showHelp() {
  console.log(`
FIEZEL Adaptivity A/B Test — User Setup

Usage:
  node TEST-USER-SETUP.js [command]

Commands:
  --create        Create 10 test users (5 per group)
  --list          Show created users
  --reset         Clear test data
  --help          Show this message

Environment Variables:
  STAGING_URL     Staging API endpoint (default: https://staging.fiezel.app)
  ADMIN_TOKEN     Admin auth token for API calls

Example:
  node TEST-USER-SETUP.js --create
  node TEST-USER-SETUP.js --list

Test Groups:
  Group A (🔬 Experimental):  Core Brain v2 (adaptive difficulty, dynamic session size)
  Group B (🎛️ Control):      Core Brain v1 (static level±1, fixed session size=12)

Test Duration: 14 days
Expected Attempts: 400-500 per group
Measurement: Learning gain, accuracy trend, engagement
  `);
}

// Main
const cmd = process.argv[2];
switch (cmd) {
  case '--create':
    createUsers().catch(console.error);
    break;
  case '--list':
    listUsers();
    break;
  case '--reset':
    resetUsers();
    break;
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log('FIEZEL A/B Test User Setup');
    console.log('Run: node TEST-USER-SETUP.js --help');
}
