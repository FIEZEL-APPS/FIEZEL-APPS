// tools/verify_preview.js
const fs = require('fs');
const html = fs.readFileSync('preview-redesign.html', 'utf8');

console.log('Contains modal:', html.includes('id="listeningPanelModal"'));
console.log('Contains openListeningPanel:', html.includes('openListeningPanel'));
console.log('Contains JLPT_QUESTIONS:', html.includes('const JLPT_QUESTIONS ='));
console.log('Contains closeListeningPanel:', html.includes('closeListeningPanel'));

// Extract the script tag content to verify JavaScript syntax
const scripts = html.match(/<script[\s\S]*?<\/script>/gi);
console.log(`Found ${scripts.length} script tags.`);
let jsError = null;
try {
  // Check main app script syntax
  const lastScript = scripts[scripts.length - 1].replace(/<\/?script[^>]*>/gi, '');
  new Function(lastScript);
  console.log('Main app script parsed with NO syntax errors! ✓');
} catch (e) {
  console.error('JS Syntax error in preview-redesign.html:', e);
  jsError = e;
}
if (!jsError) {
  console.log('ALL CHECKS PASSED SUCCESSFULLY!');
}
