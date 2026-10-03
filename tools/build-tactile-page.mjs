import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'scratch', 'preview-tactile-clay.html');
const cssPath = path.join(root, 'scratch', 'grammar-coach.css');
const jsPath = path.join(root, 'scratch', 'grammar-coach.js');
const targetPath = path.join(root, 'tactile-clay.html');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

let out = html.replace(
  '<link rel="stylesheet" href="grammar-coach.css">',
  `<style>\n/* --- GRAMMAR COACH CSS --- */\n${css}\n</style>`
);

out = out.replace(
  '<script src="grammar-coach.js"></script>',
  `<script>\n/* --- GRAMMAR COACH JS --- */\n${js}\n</script>`
);

// Add return to main app link in header bar
const backLink = '<a href="./" style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#0F172A;text-decoration:none;padding:5px 12px;background:#F1F5F9;border-radius:9999px;border:1.5px solid #CBD5E1;box-shadow:0 2px 0 #CBD5E1;transition:all .12s">← Kembali ke Tampilan Utama</a>';
out = out.replace('<div class="preview-header-bar">', `<div class="preview-header-bar">\n    ${backLink}`);

fs.writeFileSync(targetPath, out, 'utf8');
console.log('tactile-clay.html created, bytes:', fs.statSync(targetPath).size);
