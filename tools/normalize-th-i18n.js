'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CORE = path.join(ROOT, 'features', 'i18n', 'th-bank-sanitizer.js');
const EXTRA = path.join(ROOT, 'features', 'i18n', 'th-bank-sanitizer-extra.js');
const DEFAULT_FILES = [
  'features/i18n/speaking-bank-th.json',
  'features/i18n/listening-bank-th.json',
  'features/i18n/writing-prompts-th.json',
  'features/i18n/reading-exam-th.json',
  'grammar-explanations-th.json',
  'vocabulary-th.json'
];

function loadSanitizer() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(CORE, 'utf8'), sandbox, { filename: CORE });
  vm.runInContext(fs.readFileSync(EXTRA, 'utf8'), sandbox, { filename: EXTRA });
  if (!sandbox.FiezelThBankSanitizer) throw new Error('Thai sanitizer did not initialize');
  return sandbox.FiezelThBankSanitizer;
}

function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function normalizeFile(relativePath, sanitizer, options = {}) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return { file: relativePath, skipped: true, changed: false, residues: [] };
  const source = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(source);
  const normalized = sanitizer.sanitizeTree(parsed);
  const output = stableJson(normalized);
  const residues = typeof sanitizer.findResidues === 'function' ? sanitizer.findResidues(normalized) : [];
  const changed = output !== source;
  if (changed && !options.check) fs.writeFileSync(absolutePath, output);
  return { file: relativePath, changed, skipped: false, residues };
}

function normalizeThaiI18n(options = {}) {
  const sanitizer = loadSanitizer();
  const files = options.files || DEFAULT_FILES;
  const results = files.map((file) => normalizeFile(file, sanitizer, options));
  const changed = results.filter((row) => row.changed);
  const residues = results.flatMap((row) => row.residues.map((entry) => ({ file: row.file, ...entry })));

  if (!options.quiet) {
    for (const row of results) {
      if (row.skipped) console.log(`[skip] ${row.file}`);
      else console.log(`${row.changed ? '[fix]' : '[ok] '} ${row.file}`);
    }
    console.log(`Thai i18n normalization: ${changed.length} file(s) ${options.check ? 'need changes' : 'changed'}, ${residues.length} known residue(s) after normalization.`);
  }

  if (residues.length) {
    const preview = residues.slice(0, 20).map((row) => `${row.file}:${row.path} -> ${row.text}`).join('\n');
    const error = new Error(`Known Indonesian residue remains after Thai normalization:\n${preview}${residues.length > 20 ? `\n... and ${residues.length - 20} more` : ''}`);
    error.results = results;
    throw error;
  }
  if (options.check && changed.length) {
    const error = new Error(`Thai i18n source is not normalized. Run: node tools/normalize-th-i18n.js\n${changed.map((row) => row.file).join('\n')}`);
    error.results = results;
    throw error;
  }
  return results;
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  try {
    normalizeThaiI18n({ check });
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

module.exports = { DEFAULT_FILES, loadSanitizer, normalizeFile, normalizeThaiI18n };
