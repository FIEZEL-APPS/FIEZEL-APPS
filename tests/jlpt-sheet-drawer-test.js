const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'features/speaking-listening/jlpt-listening.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'features/speaking-listening/fiezel-jlpt-listening.js'), 'utf8');

// 1. Verify HTML Structure
assert(html.includes('id="jlptDetailSheet"'), 'index.html must have #jlptDetailSheet');
assert(html.includes('id="jlptSheetBackdrop"'), 'index.html must have #jlptSheetBackdrop');
assert(html.includes('sheet-drag-handle'), 'index.html must have .sheet-drag-handle');
assert(html.includes('id="tabChipScript"'), 'index.html must have tabChipScript');
assert(html.includes('id="tabChipExplain"'), 'index.html must have tabChipExplain');
assert(html.includes('id="tabChipVocab"'), 'index.html must have tabChipVocab');
assert(html.includes('onclick="closeJlptDetailSheet()"'), 'index.html must have closeJlptDetailSheet handlers');

// 2. Verify CSS Styling
assert(css.includes('#jlptSheetBackdrop'), 'CSS must style #jlptSheetBackdrop');
assert(css.includes('#jlptDetailSheet') || css.includes('.jlpt-detail-sheet'), 'CSS must style #jlptDetailSheet');
assert(css.includes('.sheet-drag-handle'), 'CSS must style .sheet-drag-handle');
assert(css.includes('backdrop-filter'), 'CSS backdrop must have backdrop-filter');
assert(css.includes('transform'), 'CSS drawer must have transform transition');

// 3. Verify JS Logic & API
assert(js.includes('function openJlptDetailSheet('), 'JS must implement openJlptDetailSheet');
assert(js.includes('function closeJlptDetailSheet('), 'JS must implement closeJlptDetailSheet');
assert(js.includes('window.openJlptDetailSheet = openJlptDetailSheet'), 'JS must export window.openJlptDetailSheet');
assert(js.includes('window.closeJlptDetailSheet = closeJlptDetailSheet'), 'JS must export window.closeJlptDetailSheet');
assert(js.includes('jlptSheetBackdrop'), 'JS must reference jlptSheetBackdrop');
assert(js.includes('sheet-drag-handle'), 'JS must reference sheet-drag-handle');
assert(!js.includes('<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.5;background:#FAF8F4;'), 'JS must not have raw pre styling for dialogue');

console.log('PASS: JLPT Mobile Bottom Sheet Drawer tests completed successfully!');
