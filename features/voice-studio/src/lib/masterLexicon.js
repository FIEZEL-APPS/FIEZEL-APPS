/**
 * FIEZEL Voice Studio - Master Lexicon ESM Adapter
 * Ingests lexicon_dump.json directly into Voice Studio Vite bundle & Node ESM test suites.
 */
import lexiconData from '../../../../tools/lexicon_dump.json' with { type: 'json' };

const wordsEntries = Object.entries(lexiconData.words || {});
wordsEntries.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
const WORDS = Object.fromEntries(wordsEntries);

const stemsEntries = Object.entries(lexiconData.stems || {});
stemsEntries.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
const STEMS = Object.fromEntries(stemsEntries);

const SINGLE = { ...lexiconData.single };

export const MasterLexicon = {
  WORDS,
  STEMS,
  SINGLE,
  lookupWord(w) {
    return WORDS[w] || null;
  },
  lookupStem(s) {
    return STEMS[s] || null;
  },
  lookupSingle(k) {
    return SINGLE[k] || null;
  },
};

export default MasterLexicon;
