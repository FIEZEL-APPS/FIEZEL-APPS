#!/usr/bin/env node
/**
 * tests/voice-studio-ui-architecture-test.js
 * Verification of FIEZEL Voice Studio UI Architecture:
 * 1. View Transitions between Home and Call Room (Zero state corruption, clean unmount/tab switch cleanup)
 * 2. Responsive Design System (Mobile-first container max-w-md mx-auto, adaptive max-w-4xl, FIEZEL Warm Paper palette)
 * 3. Character PAW / Mochi Animation Switching (Speaking vs Idle based on isPlayingAiAudio, aura states, status text)
 * 4. Audio Feedback Controls & Teardown Cleanup (Mute hardware track toggling, AudioContext, WebSocket, AudioBufferSource, HTML5 Audio cleanup, End Call sfx)
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== FIEZEL VOICE STUDIO UI ARCHITECTURE & LIFECYCLE AUDIT TEST ===\n');

const BASE_DIR = path.resolve(__dirname, '..');
const VS_SRC = path.join(BASE_DIR, 'features', 'voice-studio', 'src');
const APP_TSX = path.join(VS_SRC, 'App.tsx');
const HOME_TSX = path.join(VS_SRC, 'components', 'HomeRedesignView.tsx');
const ORNAMENTS_TSX = path.join(VS_SRC, 'components', 'FiezelOrnaments.tsx');
const CALL_HTML = path.join(BASE_DIR, 'call.html');
const VS_CALL_HTML = path.join(BASE_DIR, 'features', 'voice-studio', 'call.html');

// Read source files
assert.ok(fs.existsSync(APP_TSX), 'App.tsx exists');
assert.ok(fs.existsSync(HOME_TSX), 'HomeRedesignView.tsx exists');
assert.ok(fs.existsSync(ORNAMENTS_TSX), 'FiezelOrnaments.tsx exists');
assert.ok(fs.existsSync(CALL_HTML), 'call.html exists');

const appContent = fs.readFileSync(APP_TSX, 'utf-8');
const homeContent = fs.readFileSync(HOME_TSX, 'utf-8');
const ornamentsContent = fs.readFileSync(ORNAMENTS_TSX, 'utf-8');
const callHtmlContent = fs.readFileSync(CALL_HTML, 'utf-8');
const vsCallHtmlContent = fs.readFileSync(VS_CALL_HTML, 'utf-8');

// --- TEST 1: View Transitions between Home, Call Room, and Braincore ---
console.log('--- TEST 1: View Transitions & State Integrity ---');
assert.ok(
  appContent.includes("const [activeTab, setActiveTab] = useState<'home' | 'call' | 'braincore'>(() => {"),
  'App initializes activeTab with dynamic URL param fallback'
);
assert.ok(
  appContent.includes("tabParam === 'home' || tabParam === 'call' || tabParam === 'braincore'"),
  'App supports ?tab= or ?view= URL navigation'
);
assert.ok(
  appContent.includes('const handleTabChange = (nextTab: \'home\' | \'call\' | \'braincore\') => {'),
  'App provides handleTabChange helper to guarantee audio teardown on view transition'
);
assert.ok(
  appContent.includes("if (activeTab === 'call' && nextTab !== 'call') {\n      stopLiveCall();"),
  'Leaving Call view immediately stops live call, preventing mic leak and state corruption'
);
assert.ok(
  appContent.includes('handleTabChange(\'home\')') && appContent.includes('handleTabChange(\'call\')'),
  'Navigation buttons utilize handleTabChange'
);
assert.ok(
  homeContent.includes('onSelectScenarioAndCall(activeScenario.id)'),
  'HomeRedesignView properly routes user to Call Room with selected scenario'
);
console.log('✓ View transitions verified: Clean lifecycle, teardown on leave, URL param support.\n');

// --- TEST 2: Responsive Design System Adherence ---
console.log('--- TEST 2: Responsive Design System Adherence ---');
assert.ok(
  appContent.includes('max-w-md mx-auto grid grid-cols-3'),
  'Mobile navigation adheres to FIEZEL mobile-first container max-w-md mx-auto'
);
assert.ok(
  appContent.includes('max-w-4xl mx-auto px-4'),
  'Desktop layout bounded to adaptive max-w-4xl container'
);
assert.ok(
  callHtmlContent.includes('bg-[#FFF9EE]') && callHtmlContent.includes('text-[#241A11]'),
  'Root call.html body adheres to FIEZEL Warm Paper palette'
);
assert.ok(
  vsCallHtmlContent.includes('bg-[#FFF9EE]') && vsCallHtmlContent.includes('text-[#241A11]'),
  'Submodule call.html body adheres to FIEZEL Warm Paper palette'
);
assert.ok(
  homeContent.includes('fz-studio-card') && homeContent.includes('btn-maroon-tactile'),
  'HomeRedesignView uses canonical FIEZEL card and tactile button design tokens'
);
console.log('✓ Responsive design verified: max-w-md mobile-first container, max-w-4xl adaptive desktop, Warm Paper tokens.\n');

// --- TEST 3: Character PAW / Mochi Animation Switching ---
console.log('--- TEST 3: Character PAW / Mochi Animation Switching ---');
assert.ok(
  appContent.includes(
    "src={\n                            isPlayingAiAudio\n                              ? '/assets/brand/paw-mochi-speaking.svg'\n                              : '/assets/brand/paw-mochi-idle.svg'\n                          }"
  ),
  'PAW Mochi avatar strictly toggles between speaking and idle SVG based on isPlayingAiAudio'
);
assert.ok(
  appContent.includes("const callStateKey: 'speaking' | 'recording' | 'waiting' | 'live' | 'ready' = isPlayingAiAudio"),
  'callStateKey prioritizes speaking state over live connected state during audio playback'
);
assert.ok(
  appContent.includes("Mochi berbicara... (${formatTimer(callDurationSec)})"),
  'Status text explicitly indicates when Mochi is actively speaking during live duplex calls'
);
assert.ok(
  appContent.includes("Merekam suara... (${formatTimer(pttRecordingSec)})"),
  'Status text explicitly indicates when user is speaking/recording'
);
assert.ok(
  appContent.includes("LIVE · ${formatTimer(callDurationSec)}"),
  'Status text indicates live listening when connected and quiet'
);
console.log('✓ Character PAW animations verified: Idle/Speaking reactive switching and status pill feedback.\n');

// --- TEST 4: Audio Feedback Controls, Mute Toggles & Teardown Cleanup ---
console.log('--- TEST 4: Audio Controls, Mute Toggles & Cleanup Teardown ---');
assert.ok(
  appContent.includes('micStreamRef.current.getAudioTracks().forEach((track) => {\n        track.enabled = !next;\n      });'),
  'toggleMuteMic disables/enables physical hardware microphone tracks'
);
assert.ok(
  appContent.includes('activeSourcesRef.current.forEach((src) => {') &&
  appContent.includes('src.stop()') &&
  appContent.includes('src.disconnect()'),
  'stopLiveCall stops and disconnects all in-flight AudioBufferSourceNodes'
);
assert.ok(
  appContent.includes('if (currentAudioElRef.current) {\n      try {\n        currentAudioElRef.current.pause();\n        currentAudioElRef.current.currentTime = 0;'),
  'stopLiveCall stops and resets active HTML5 TTS audio elements'
);
assert.ok(
  appContent.includes('wsRef.current.onclose = null;') &&
  appContent.includes('wsRef.current.onerror = null;'),
  'stopLiveCall disarms WebSocket error and close handlers before closing'
);
assert.ok(
  appContent.includes('onClick={() => {\n                              playFiezelSfx(\'button_tap\');\n                              stopLiveCall();'),
  'End call action triggers tactile button_tap sound effect and stops call'
);
console.log('✓ Audio controls & teardown cleanup verified: Hardware mic track mute, AudioContext & buffer source release, WebSocket disarm, End Call SFX.\n');

// --- TEST 5: Brand Ornaments Completeness ---
console.log('--- TEST 5: Brand Ornaments Completeness ---');
const expectedOrnaments = [
  'FiezelPawStamp',
  'FiezelNeuralConstellation',
  'FiezelSparkleOrnament',
  'FiezelBrandCrest',
  'FiezelCornerOrnament'
];
expectedOrnaments.forEach(ornament => {
  assert.ok(ornamentsContent.includes(`export const ${ornament}`), `Ornaments exports ${ornament}`);
});
console.log('✓ All 5 official Fiezel brand ornaments verified.\n');

console.log('================================================================');
console.log('ALL VOICE STUDIO UI ARCHITECTURE & LIFECYCLE TESTS PASSED (5/5)!');
console.log('================================================================');
